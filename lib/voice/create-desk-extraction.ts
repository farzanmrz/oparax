// lib/voice/create-desk-extraction.ts
//
// attemptVoiceExtraction — best-effort voice-guide extraction, triggered from createDesk's
// `after()` callback (app/agents/new/actions.ts). SERVER-ONLY: transitively imports
// lib/sysprompts via extract-guide.ts (readFileSync at module scope) — never importable from
// a client component. /agents/new is already listed in next.config.ts's
// outputFileTracingIncludes (it reaches lib/sysprompts through the old save action's
// onboarding-result extraction), so no config change is needed here.
//
// REUSES slice-1's extractor (extractVoiceGuide, lib/voice/extract-guide.ts) unchanged — this
// module does not reimplement extraction. extractVoiceGuide does NOT write a model_calls row
// (it only returns the extraction result), so this module is the ONE place that writes the
// "voice_extraction" ledger row reached via the create-desk path — mirroring the ledger-first
// insert shape scripts/extract-voice-guide.ts already uses for the same stage (that script
// remains the ledger writer for the manual/CLI path; the two never run for the same call).
//
// D1: the corpus is now a real, billable Bright Data pull (lib/voice/corpus.ts's fetchCorpus),
// gated by `claimExtractionBudget` (lib/voice/spend-gate.ts) — the ONE spend guard in front of
// (c) below, per the plan's "two mechanisms" design (verification is a separate gate, T2.7,
// irrelevant here). No claim is taken on the existing-guide no-op ((a) below) — avoid burning a
// claim on a call that was never going to spend.
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { fetchCorpus } from "./corpus";
import { deployGuide } from "./deploy-guide";
import { EXTRACTION_MODEL, extractVoiceGuide } from "./extract-guide";
import { materializeRulesFromGuide } from "./rules";
import { claimExtractionBudget, finalizeExtractionBudget } from "./spend-gate";

type AdminClient = ReturnType<typeof createAdminClient>;

/** X handles are [A-Za-z0-9_], 1-15 chars — same rail as scripts/extract-voice-guide.ts,
 *  reapplied here (not just at the createDesk boundary) since a malformed handle now flows
 *  straight into a billable Bright Data pull (fetchCorpus); validating keeps it out of that
 *  call rather than trusting every future caller to have already checked it. */
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

/** The ONE model_calls row for this stage, written ledger-first (before voice_guides) per
 *  L12 — same ordering and shape as scripts/extract-voice-guide.ts's insert for this exact
 *  stage. */
async function insertExtractionModelCall(
  admin: AdminClient,
  ownerId: string,
  reporterHandle: string,
  ext: Awaited<ReturnType<typeof extractVoiceGuide>>,
): Promise<string> {
  const { data, error } = await admin
    .from("model_calls")
    .insert({
      owner_id: ownerId,
      stage: "voice_extraction",
      role: "primary",
      model: EXTRACTION_MODEL,
      output: ext.guideRaw,
      reasoning: ext.reasoning,
      // reasoningWithheldByProvider distinguishes "the provider gave us no trace" from "we
      // forgot to capture one" (decisions.md L12) — a null reasoning column alone can't.
      usage: {
        ...(ext.usage as object),
        thinkingTokens: ext.thinkingTokens,
        reasoningWithheldByProvider: ext.reasoning == null,
      } as unknown as Json,
      cost_usd: ext.costUsd,
      generation_id: ext.generationId,
      ref_kind: "reporter_handle",
      ref_id: reporterHandle,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Best-effort voice-guide extraction for one reporter, run from createDesk's `after()` so it
 * never blocks or can fail the desk save. Never throws — every failure is caught and logged.
 *
 * Order:
 *   (a) a `voice_guides` row already exists for this handle → return (paid once per reporter,
 *       never re-extracted by a second desk on the same reporter). A malformed handle also
 *       returns here, before any claim is taken.
 *   (b: claim) `claimExtractionBudget` reserves this reporter/UTC-day's worst-case spend. A
 *       denied claim (today's claim for this reporter already exists) → return, zero rows
 *       written, zero spend — same shape as the old "no corpus on disk" no-op, different
 *       reason.
 *   (c: fetch+extract+store+materialize) pull the reporter's real X timeline (`fetchCorpus`,
 *       billable), run the paid extraction call, then ledger-first: one `model_calls` row,
 *       then `voice_guides` with `provenance: { modelCallId }` (a pointer — the output/
 *       reasoning/usage/cost live exactly once, in model_calls), then materialize the guide's
 *       initial `voice_rules` split. Any failure in this stage finalizes the claim as "failed"
 *       before re-throwing to the outer catch below.
 *   (d: finalize) on the full happy path, finalize the claim as "completed" with the
 *       extraction call's own resolved cost.
 *
 * `extractVoiceGuide` (plain `generateText`, no schema) either completes and returns, or
 * throws before any output exists to capture — unlike the drafting council's judge
 * (`generateObject`, which can complete, bill, and still throw via `NoObjectGeneratedError`
 * with a salvageable `err.text`/`err.usage`), there is no schema-validation step here that can
 * fail a call that already billed. So a thrown extraction call gets no ledger row, by the same
 * discriminator draft-council-run.ts documents: nothing completed, nothing to record.
 */
export async function attemptVoiceExtraction(
  reporterHandle: string,
  ownerId: string,
): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: existing, error: existingError } = await admin
      .from("voice_guides")
      .select("id")
      .eq("reporter_handle", reporterHandle)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return;
    if (!HANDLE_RE.test(reporterHandle)) return; // malformed handle, no-op before any spend

    const claim = await claimExtractionBudget(reporterHandle);
    if (!claim.allowed) {
      console.warn(
        `attemptVoiceExtraction: budget claim denied for @${reporterHandle} (${claim.reason})`,
      );
      return;
    }

    let ext: Awaited<ReturnType<typeof extractVoiceGuide>> | undefined;
    try {
      const corpus = await fetchCorpus(reporterHandle, ownerId);
      ext = await extractVoiceGuide(reporterHandle, corpus);

      const modelCallId = await insertExtractionModelCall(admin, ownerId, reporterHandle, ext);

      const guideDeploy = deployGuide(ext.guideRaw);
      const { error: voiceGuideError } = await admin.from("voice_guides").upsert(
        {
          reporter_handle: reporterHandle,
          guide_raw: ext.guideRaw,
          guide_deploy: guideDeploy,
          measured_facts: ext.measuredFactsBlock,
          cost_usd: ext.costUsd,
          provenance: { modelCallId } as unknown as Json,
        },
        { onConflict: "reporter_handle" },
      );
      if (voiceGuideError) throw voiceGuideError;

      try {
        await materializeRulesFromGuide(reporterHandle, guideDeploy, modelCallId);
      } catch (rulesError) {
        // A degraded-but-recoverable state (guide saved, initial rules split missing) — never
        // a reason to roll back a real extraction that already happened and was billed.
        console.error(
          `attemptVoiceExtraction: materializeRulesFromGuide failed for @${reporterHandle}`,
          rulesError,
        );
      }

      await finalizeExtractionBudget(reporterHandle, {
        status: "completed",
        actualUsd: ext.costUsd,
      });
    } catch (e) {
      // ext is defined only once extractVoiceGuide itself has resolved and billed — carry its
      // resolved cost into the claim even when a later step (the ledger insert, the
      // voice_guides upsert) is what actually failed. If extraction never ran or never
      // completed, nothing billed on this call and actualUsd stays null.
      await finalizeExtractionBudget(reporterHandle, {
        status: "failed",
        actualUsd: ext?.costUsd ?? null,
      });
      throw e;
    }
  } catch (e) {
    console.error(`attemptVoiceExtraction: failed for @${reporterHandle}`, e);
  }
}
