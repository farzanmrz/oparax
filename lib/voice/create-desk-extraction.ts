// lib/voice/create-desk-extraction.ts
//
// attemptVoiceExtraction — best-effort voice-guide extraction, triggered from createDesk's
// `after()` callback (app/agents/new/actions.ts). SERVER-ONLY: transitively imports
// lib/sysprompts via extract-guide.ts (readFileSync at module scope) — never importable from
// a client component. /agents/new is already listed in next.config.ts's
// outputFileTracingIncludes (it reaches lib/sysprompts through the old save action's
// onboarding-result extraction), so no config change is needed here.
//
// REUSES slice-1's extractor's model/config (extractVoiceGuideStreaming, lib/voice/
// extract-guide.ts) unchanged — this module does not reimplement the extraction call itself,
// only consumes it as a stream instead of a one-shot. extractVoiceGuideStreaming does NOT write
// a model_calls row (it only returns the extraction result once the stream finishes), so this
// module is the ONE place that writes the "voice_extraction" ledger row reached via the
// create-desk path — mirroring the ledger-first insert shape scripts/extract-voice-guide.ts
// already uses for the same stage (that script remains the ledger writer for the manual/CLI
// path, via the plain extractVoiceGuide, and the two never run for the same call).
//
// D1: the corpus is now a real, billable Bright Data pull (lib/voice/corpus.ts's fetchCorpus),
// gated by `claimExtractionBudget` (lib/voice/spend-gate.ts) — the ONE spend guard in front of
// the billed extraction call, per the plan's "two mechanisms" design (verification is a
// separate gate, T2.7, irrelevant here). No claim is taken on the existing-guide no-op, the
// malformed-handle no-op, or the profile pre-flight rejection below — avoid burning a claim on
// a call that was never going to spend.
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { fetchXProfile } from "@/lib/web/brightdata";
import { fetchCorpus } from "./corpus";
import { deployGuide } from "./deploy-guide";
import {
  EXTRACTION_MODEL,
  extractVoiceGuideStreaming,
  type VoiceExtraction,
} from "./extract-guide";
import { materializeRulesFromGuide } from "./rules";
import {
  claimExtractionBudget,
  finalizeExtractionBudget,
  recordProgress,
  releaseClaimOnCorpusFailure,
} from "./spend-gate";

type AdminClient = ReturnType<typeof createAdminClient>;

/** X handles are [A-Za-z0-9_], 1-15 chars — same rail as scripts/extract-voice-guide.ts,
 *  reapplied here (not just at the createDesk boundary) since a malformed handle now flows
 *  straight into a billable Bright Data pull (fetchCorpus); validating keeps it out of that
 *  call rather than trusting every future caller to have already checked it. */
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

/** Every distinct outcome a caller (T5/T6's server actions, T7's Voice tab) needs to branch on
 *  — replaces the old `void` return. `attemptVoiceExtraction` still never throws (best-effort
 *  by design, per its own doc comment below); every terminal state, success or failure, comes
 *  back as a value instead. `errorCode` on the `"failed"` variant mirrors whatever (if
 *  anything) was written to `voice_extraction_claims.error_code` for that attempt — it's absent
 *  on outcomes that never had a claim row to stamp (preflight/malformed/already-extracted) or
 *  that deleted their claim row outright (`corpus_failed`, via `releaseClaimOnCorpusFailure`). */
export type ExtractionOutcome =
  | { status: "already_extracted" }
  | { status: "malformed_handle" }
  | { status: "preflight_rejected" }
  | { status: "capped" }
  | { status: "corpus_failed" }
  | { status: "failed"; errorCode?: string }
  | { status: "completed" };

/** The ONE model_calls row for this stage, written ledger-first (before voice_guides) per
 *  L12 — same ordering and shape as scripts/extract-voice-guide.ts's insert for this exact
 *  stage. */
async function insertExtractionModelCall(
  admin: AdminClient,
  ownerId: string,
  reporterHandle: string,
  ext: VoiceExtraction,
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

/** Throttles `recordProgress` calls raised by `extractVoiceGuideStreaming`'s per-delta
 *  `onProgress` to roughly once per second — the stream can emit many deltas/sec and this is
 *  the ONE DB write in that loop, so hammering it on every delta would be a lot of update
 *  traffic against a single row for no user-visible benefit (a human can't perceive sub-second
 *  progress updates anyway). The first delta always flushes immediately so the claim row shows
 *  `"extracting"` as soon as anything has streamed, rather than waiting a full second. */
function throttledStreamProgress(
  reporterHandle: string,
): (snapshot: { text: string; reasoning: string }) => Promise<void> {
  let lastFlush = 0;
  return async ({ text, reasoning }) => {
    const now = Date.now();
    if (lastFlush !== 0 && now - lastFlush < 1000) return;
    lastFlush = now;
    await recordProgress(reporterHandle, {
      stage: "extracting",
      progressNote: `${text.length} chars generated`,
      reasoningPartial: reasoning,
    });
  };
}

/**
 * Best-effort voice-guide extraction for one reporter, run from createDesk's `after()` so it
 * never blocks or can fail the desk save (and, per T5, from a background job that survives
 * navigation). Never throws — every failure is caught and returned as a value.
 *
 * Order:
 *   (a) a `voice_guides` row already exists for this handle → `"already_extracted"` (paid once
 *       per reporter, never re-extracted by a second desk on the same reporter).
 *   (b) a malformed handle → `"malformed_handle"`, before any spend.
 *   (c: pre-flight) `fetchXProfile` (lib/web/brightdata.ts) resolves the handle against a real
 *       X profile BEFORE any claim is taken. `!resolved || postsCount === 0` →
 *       `"preflight_rejected"`, zero `voice_extraction_claims` rows written — a bad handle never
 *       burns a day's budget slot.
 *   (d: claim) `claimExtractionBudget` reserves this reporter/UTC-day's worst-case spend, now
 *       strictly after the pre-flight passes. A denied claim (today's claim for this reporter
 *       already exists) → `"capped"`, zero rows written, zero spend.
 *   (e: corpus) `fetchCorpus` (billable) pulls the reporter's real X timeline. A failure here
 *       happens BEFORE the LLM call would ever start, so the claim is still provisional —
 *       `releaseClaimOnCorpusFailure` deletes it (same-day retry becomes possible again) rather
 *       than `finalizeExtractionBudget`ing it as spent → `"corpus_failed"`.
 *   (f: extract+store+materialize) the paid extraction call now runs as a stream
 *       (`extractVoiceGuideStreaming`), throttled progress persisted via `recordProgress`
 *       roughly once/sec. Once the stream resolves, ledger-first: one `model_calls` row (this
 *       is the moment the claim stops being provisional — nothing after this point can un-spend
 *       it), then `voice_guides` with `provenance: { modelCallId }` (a pointer — the output/
 *       reasoning/usage/cost live exactly once, in model_calls), then materialize the guide's
 *       initial `voice_rules` split (best-effort, swallows its own errors). Any failure in this
 *       stage finalizes the claim as `"failed"` with `errorCode: "extraction_failed"` →
 *       `{ status: "failed", errorCode: "extraction_failed" }`.
 *   (g: finalize) on the full happy path, finalize the claim as `"completed"` with the
 *       extraction call's own resolved cost and `finishedAt` → `"completed"`.
 *
 * The "already-billed call must still get its ledger row" discipline (AGENTS.md, decisions.md
 * L12) carries over unchanged from the non-streaming version: `insertExtractionModelCall` runs
 * immediately once `extractVoiceGuideStreaming` resolves, BEFORE the `voice_guides` upsert or
 * `materializeRulesFromGuide` — so a throw from either of those later steps can never discard a
 * row that's already been written. `extractVoiceGuideStreaming` itself either completes (having
 * consumed the whole stream, so it billed) and returns, or throws before returning anything —
 * same discriminator as the old `generateText` call had: nothing completed, nothing to record.
 */
export async function attemptVoiceExtraction(
  reporterHandle: string,
  ownerId: string,
): Promise<ExtractionOutcome> {
  try {
    const admin = createAdminClient();

    const { data: existing, error: existingError } = await admin
      .from("voice_guides")
      .select("id")
      .eq("reporter_handle", reporterHandle)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return { status: "already_extracted" };
    if (!HANDLE_RE.test(reporterHandle)) return { status: "malformed_handle" }; // no-op before any spend

    const profile = await fetchXProfile(reporterHandle, ownerId);
    if (!profile.resolved || profile.postsCount === 0) {
      console.warn(
        `attemptVoiceExtraction: preflight rejected @${reporterHandle} (resolved=${profile.resolved}, postsCount=${profile.postsCount})`,
      );
      return { status: "preflight_rejected" };
    }

    const claim = await claimExtractionBudget(reporterHandle);
    if (!claim.allowed) {
      console.warn(
        `attemptVoiceExtraction: budget claim denied for @${reporterHandle} (${claim.reason})`,
      );
      return { status: "capped" };
    }

    let corpus: Awaited<ReturnType<typeof fetchCorpus>>;
    try {
      corpus = await fetchCorpus(reporterHandle, ownerId);
    } catch (corpusError) {
      console.error(
        `attemptVoiceExtraction: fetchCorpus failed for @${reporterHandle}`,
        corpusError,
      );
      await releaseClaimOnCorpusFailure(reporterHandle);
      return { status: "corpus_failed" };
    }
    await recordProgress(reporterHandle, {
      stage: "corpus_fetch",
      progressNote: `fetched ${corpus.length} posts`,
    });

    let ext: VoiceExtraction | undefined;
    try {
      ext = await extractVoiceGuideStreaming(
        reporterHandle,
        corpus,
        throttledStreamProgress(reporterHandle),
      );

      const modelCallId = await insertExtractionModelCall(admin, ownerId, reporterHandle, ext);

      await recordProgress(reporterHandle, { stage: "materializing_rules" });

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

      await recordProgress(reporterHandle, { stage: "done" });
      await finalizeExtractionBudget(reporterHandle, {
        status: "completed",
        actualUsd: ext.costUsd,
        finishedAt: new Date().toISOString(),
      });
      return { status: "completed" };
    } catch (e) {
      // ext is defined only once extractVoiceGuideStreaming itself has resolved and billed —
      // carry its resolved cost into the claim even when a later step (the ledger insert, the
      // voice_guides upsert) is what actually failed. If the stream never completed, nothing
      // billed on this call and actualUsd stays null.
      console.error(`attemptVoiceExtraction: extraction stage failed for @${reporterHandle}`, e);
      await recordProgress(reporterHandle, { stage: "failed" });
      await finalizeExtractionBudget(reporterHandle, {
        status: "failed",
        actualUsd: ext?.costUsd ?? null,
        finishedAt: new Date().toISOString(),
        errorCode: "extraction_failed",
      });
      return { status: "failed", errorCode: "extraction_failed" };
    }
  } catch (e) {
    console.error(`attemptVoiceExtraction: failed for @${reporterHandle}`, e);
    return { status: "failed" };
  }
}
