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
// The no-spend-cap override (docs/decisions.md, owner waiver 2026-07-22) is safe THIS slice
// for a checkable reason: loadCorpus only ever resolves a file under the gitignored
// `.voice-lab/corpora/`, which does not exist in any deployed environment — so (b) below
// always returns null there, and the paid call in (c) never runs from a self-serve create-desk
// request in production today. Widening this lookup to a real corpus fetch (D1) is the first
// commit where user-triggered extraction can actually spend, and that commit owes its own
// guard or a fresh, explicit waiver.
import { existsSync, readFileSync } from "node:fs";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { deployGuide } from "./deploy-guide";
import { type CorpusPost, EXTRACTION_MODEL, extractVoiceGuide } from "./extract-guide";

type AdminClient = ReturnType<typeof createAdminClient>;

/** X handles are [A-Za-z0-9_], 1-15 chars — same rail as scripts/extract-voice-guide.ts,
 *  reapplied here (not just at the createDesk boundary) since this function builds a
 *  filesystem path straight out of `handle`; validating keeps a malformed handle out of
 *  that path rather than trusting every future caller to have already checked it. */
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

/**
 * Load a reporter's lab corpus, if one exists on disk. Returns `null` — never throws — when
 * the handle is malformed, the file is absent, or it doesn't parse to a non-empty array. This
 * is not an error path: in every deployed environment `.voice-lab/` is gitignored and never
 * present, so this always returns null there, and `attemptVoiceExtraction` returns with ZERO
 * rows written before any model call runs.
 */
function loadCorpus(handle: string): CorpusPost[] | null {
  if (!HANDLE_RE.test(handle)) return null;
  const path = `.voice-lab/corpora/${handle}.json`;
  if (!existsSync(path)) return null;
  try {
    const posts = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return Array.isArray(posts) && posts.length > 0 ? (posts as CorpusPost[]) : null;
  } catch {
    return null;
  }
}

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
 *       never re-extracted by a second desk on the same reporter).
 *   (b) `loadCorpus` returns null (no lab corpus on disk — the only path in any deployed
 *       environment) → return, zero rows written. `draftForExperiment` already returns
 *       `skipped: "no_guide"` for this desk, and Voice renders T7's empty state.
 *   (c) run the paid extraction call, then ledger-first: one `model_calls` row, then
 *       `voice_guides` with `provenance: { modelCallId }` (a pointer — the output/reasoning/
 *       usage/cost live exactly once, in model_calls).
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

    const corpus = loadCorpus(reporterHandle);
    if (!corpus) return; // no corpus on disk — the production no-op path, zero spend

    const ext = await extractVoiceGuide(reporterHandle, corpus);

    const modelCallId = await insertExtractionModelCall(admin, ownerId, reporterHandle, ext);

    const { error: voiceGuideError } = await admin.from("voice_guides").upsert(
      {
        reporter_handle: reporterHandle,
        guide_raw: ext.guideRaw,
        guide_deploy: deployGuide(ext.guideRaw),
        measured_facts: ext.measuredFactsBlock,
        cost_usd: ext.costUsd,
        provenance: { modelCallId } as unknown as Json,
      },
      { onConflict: "reporter_handle" },
    );
    if (voiceGuideError) throw voiceGuideError;
  } catch (e) {
    console.error(`attemptVoiceExtraction: failed for @${reporterHandle}`, e);
  }
}
