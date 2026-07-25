// lib/voice/create-desk-extraction.ts
//
// Voice-guide extraction for ONE desk. SERVER-ONLY: transitively imports lib/sysprompts via
// extract-guide.ts (readFileSync at module scope) — never importable from a client component.
//
// REUSES slice-1's extractor's model/config (extractVoiceGuideStreaming, lib/voice/
// extract-guide.ts) unchanged — this module does not reimplement the extraction call itself,
// only consumes it as a stream instead of a one-shot. extractVoiceGuideStreaming does NOT write
// a model_calls row (it only returns the extraction result once the stream finishes), so this
// module is the ONE place that writes the "voice_extraction" ledger row reached via the app
// path (scripts/extract-voice-guide.ts remains the ledger writer for the manual/CLI path, via
// the plain extractVoiceGuide, and the two never run for the same call).
//
// A guide belongs to the desk that paid for it. There is no sharing, no dedup, no per-day
// claim and no per-handle lookup cap: extraction runs whenever it is asked to, and two desks on
// the same reporter each get — and each pay for — their own guide. The previous model
// (`voice_guides` keyed globally by reporter_handle, an atomic once-per-reporter-per-UTC-day
// spend claim, and a 5-lookups-per-handle-per-day pre-flight cap) was deleted outright: it
// optimized a case that does not occur, and it cost four pipeline gates, a table, and a failure
// mode that could not be diagnosed after the fact.
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { X_HANDLE_RE } from "@/lib/x/handle";
import { fetchCorpus } from "./corpus";
import { deployGuide } from "./deploy-guide";
import {
  EXTRACTION_MODEL,
  extractVoiceGuideStreaming,
  type VoiceExtraction,
} from "./extract-guide";
import { finishRun, recordProgress } from "./extraction-run";
import { materializeRulesFromGuide } from "./rules";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Every distinct terminal state a caller needs to branch on. The gates and the billable phase
 *  never throw — every failure, including an internal one, comes back as a value. */
export type ExtractionOutcome =
  | { status: "malformed_handle" }
  | { status: "corpus_failed" }
  | { status: "failed"; errorCode?: string }
  | { status: "completed" };

/** The pre-flight checks, returned individually because the create screen renders them as
 *  discrete steps: a reporter whose extraction stops needs to see WHICH check stopped it, and a
 *  single spinner could not express that.
 *
 *  Only `handle_shape` remains. `profile_lookup` (a ~1c Bright Data call) was deleted after a
 *  live probe proved it could never pass: that dataset answers the sync endpoint with
 *  `202 + snapshot_id` for a LIVE profile, which the gate read as a rejection — so it failed
 *  @FabrizioRomano exactly as it failed a dead handle, blocking every extraction in the product
 *  and charging a cent to do it. The corpus pull is the reality check instead, which is what it
 *  always was. The union stays a union so a future gate slots in without a shape change. */
export type GateId = "handle_shape";

export type GateReport = {
  gate: GateId;
  status: "passed" | "failed";
  /** Reporter-facing one-liner. Null where the pass is self-explanatory and a sentence on screen
   *  would just be noise. */
  detail: string | null;
};

export type PreflightResult =
  | { proceed: true; gates: GateReport[]; postsCount: number | null }
  | { proceed: false; gates: GateReport[]; outcome: ExtractionOutcome; message: string };

/** The ONE model_calls row for this stage, written ledger-first (before voice_guides) per
 *  AGENTS.md's model-call rule — same ordering and shape as scripts/extract-voice-guide.ts's
 *  insert for this exact stage. */
async function insertExtractionModelCall(
  admin: AdminClient,
  ownerId: string,
  experimentId: string,
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
      // forgot to capture one" (AGENTS.md's model-call rule) — a null reasoning column alone can't.
      usage: {
        ...(ext.usage as object),
        thinkingTokens: ext.thinkingTokens,
        reasoningWithheldByProvider: ext.reasoning == null,
      } as unknown as Json,
      cost_usd: ext.costUsd,
      generation_id: ext.generationId,
      ref_kind: "experiment_id",
      ref_id: experimentId,
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
 *  progress updates anyway). The first delta always flushes immediately so the run row shows
 *  `"extracting"` as soon as anything has streamed, rather than waiting a full second. */
function throttledStreamProgress(
  experimentId: string,
): (snapshot: { text: string; reasoning: string }) => Promise<void> {
  let lastFlush = 0;
  return async ({ text, reasoning }) => {
    const now = Date.now();
    if (lastFlush !== 0 && now - lastFlush < 1000) return;
    lastFlush = now;
    await recordProgress(experimentId, {
      stage: "extracting",
      progressNote: `${text.length} chars generated`,
      reasoningPartial: reasoning,
    });
  };
}

/**
 * GATE 1 — the handle-shape check. Free and instant, so a caller can settle it on screen
 * immediately instead of holding it behind the slow profile call.
 *
 * Runs `X_HANDLE_RE`, the shared rail from lib/x/handle.ts, here (not just at the createDesk
 * boundary) since a malformed handle now flows straight into a billable Bright Data pull;
 * validating keeps it out of that call rather than trusting every future caller to have already
 * checked it. This is an INJECTION guard, not a spelling check: a stored handle is
 * string-interpolated into the ingestion worker's globally-shared X stream rule, so an
 * unvalidated one could rewrite that rule for every tenant.
 *
 * Returned rather than logged because this runs before any run row exists, so a UI polling the
 * database cannot observe it. Awaiting the result is the only channel it has.
 */
export function checkHandleShape(reporterHandle: string): PreflightResult {
  if (!X_HANDLE_RE.test(reporterHandle)) {
    return {
      proceed: false,
      gates: [
        {
          gate: "handle_shape",
          status: "failed",
          detail: `"${reporterHandle}" isn't a legal X handle.`,
        },
      ],
      outcome: { status: "malformed_handle" },
      message: "That isn't a valid X handle — letters, numbers and underscores, up to 15.",
    };
  }
  return {
    proceed: true,
    gates: [{ gate: "handle_shape", status: "passed", detail: null }],
    postsCount: null,
  };
}

/**
 * THE BILLABLE PHASE — corpus, extraction, store. Assumes the pre-flight gates already passed;
 * it deliberately does NOT re-run them, so a caller that awaited them pays for exactly one
 * profile lookup, not two.
 *
 * Also assumes the caller ALREADY HOLDS this desk's run claim: `startRun` is the caller's job,
 * awaited before it schedules this phase, because its boolean is what decides whether to spend
 * at all — and this phase is typically handed to `after()`, which runs too late for a rejected
 * claim to reach the response.
 *
 * Order:
 *   (a) the run row (opened by the caller's claim) is the channel every poll reads from here on.
 *   (b) `fetchCorpus` (billable) pulls the reporter's real X timeline.
 *   (c) the paid extraction call runs as a stream (`extractVoiceGuideStreaming`), throttled
 *       progress persisted roughly once/sec. Once the stream resolves, ledger-first: one
 *       `model_calls` row, then `voice_guides` with `provenance: { modelCallId }` (a pointer —
 *       the output/reasoning/usage/cost live exactly once, in model_calls), then materialize the
 *       guide's initial `voice_rules` split (best-effort, swallows its own errors).
 *   (d) `finishRun` stamps the terminal status either way.
 *
 * The "already-billed call must still get its ledger row" discipline (AGENTS.md's model-call
 * rule) is why `insertExtractionModelCall` runs immediately once `extractVoiceGuideStreaming`
 * resolves, BEFORE the `voice_guides` upsert or `materializeRulesFromGuide` — a throw from
 * either later step can then never discard a row that has already been paid for.
 * `extractVoiceGuideStreaming` itself either completes (having consumed the whole stream, so it
 * billed) and returns, or throws before returning anything — nothing completed, nothing to record.
 */
export async function runExtractionSpendPhase(
  experimentId: string,
  reporterHandle: string,
  ownerId: string,
): Promise<ExtractionOutcome> {
  try {
    const admin = createAdminClient();

    // Stamped BEFORE the pull, not after it. The Bright Data timeline pull is an async
    // trigger/poll/download cycle that can run for minutes; recording the stage only on
    // completion left the polled row blank for the single longest step in the pipeline.
    await recordProgress(experimentId, {
      stage: "corpus_fetch",
      progressNote: "Pulling recent posts from X…",
    });

    let corpus: Awaited<ReturnType<typeof fetchCorpus>>;
    try {
      corpus = await fetchCorpus(reporterHandle, ownerId);
    } catch (corpusError) {
      console.error(
        `runExtractionSpendPhase: fetchCorpus failed for @${reporterHandle}`,
        corpusError,
      );
      await finishRun(experimentId, { status: "failed", errorCode: "corpus_failed" });
      return { status: "corpus_failed" };
    }
    await recordProgress(experimentId, {
      stage: "corpus_ready",
      progressNote: `Read ${corpus.length} posts`,
    });

    let ext: VoiceExtraction | undefined;
    try {
      ext = await extractVoiceGuideStreaming(
        reporterHandle,
        corpus,
        throttledStreamProgress(experimentId),
      );

      const modelCallId = await insertExtractionModelCall(admin, ownerId, experimentId, ext);

      // Meter the extraction call itself (AGENTS.md: every touch point stamps usage_events —
      // "every model call" included). Best-effort: the call is already paid and its model_calls
      // row is durable, so a ledger-stamp failure must not fail the extraction. The failure is
      // INSPECTED rather than caught — supabase-js's builder resolves with `{ data, error }` and
      // only rejects under `.throwOnError()`, so a try/catch around it would never fire and
      // unmetered spend would leave no trace at all.
      const { error: meterError } = await admin.from("usage_events").insert({
        owner_id: ownerId,
        kind: "voice_extraction",
        units: 1,
        cost_usd: ext.costUsd,
        ref_id: reporterHandle,
      });
      if (meterError) {
        console.error(
          `runExtractionSpendPhase: usage_events stamp failed for @${reporterHandle}`,
          meterError,
        );
      }

      await recordProgress(experimentId, { stage: "materializing_rules" });

      const guideDeploy = deployGuide(ext.guideRaw);
      const { error: voiceGuideError } = await admin.from("voice_guides").upsert(
        {
          experiment_id: experimentId,
          guide_raw: ext.guideRaw,
          guide_deploy: guideDeploy,
          measured_facts: ext.measuredFactsBlock,
          cost_usd: ext.costUsd,
          provenance: { modelCallId } as unknown as Json,
        },
        { onConflict: "experiment_id" },
      );
      if (voiceGuideError) throw voiceGuideError;

      try {
        await materializeRulesFromGuide(experimentId, guideDeploy, modelCallId);
      } catch (rulesError) {
        // A degraded-but-recoverable state (guide saved, initial rules split missing) — never
        // a reason to roll back a real extraction that already happened and was billed.
        console.error(
          `runExtractionSpendPhase: materializeRulesFromGuide failed for @${reporterHandle}`,
          rulesError,
        );
      }

      await finishRun(experimentId, { status: "completed", costUsd: ext.costUsd });
      return { status: "completed" };
    } catch (e) {
      // ext is defined only once extractVoiceGuideStreaming itself has resolved and billed —
      // carry its resolved cost into the run row even when a later step (the ledger insert, the
      // voice_guides upsert) is what actually failed. If the stream never completed, nothing
      // billed on this call and costUsd stays null.
      console.error(`runExtractionSpendPhase: extraction stage failed for @${reporterHandle}`, e);
      await finishRun(experimentId, {
        status: "failed",
        costUsd: ext?.costUsd ?? null,
        errorCode: "extraction_failed",
      });
      return { status: "failed", errorCode: "extraction_failed" };
    }
  } catch (e) {
    console.error(`runExtractionSpendPhase: failed for @${reporterHandle}`, e);
    await finishRun(experimentId, { status: "failed", errorCode: "internal_error" });
    return { status: "failed" };
  }
}
