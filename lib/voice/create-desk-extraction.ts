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
import * as Sentry from "@sentry/nextjs";
import { extractionConversationId } from "@/lib/observability/ai-conversation";
import { withAiSpan } from "@/lib/observability/ai-telemetry";
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
 *  Only `handle_shape` remains. `profile_lookup` (a ~1c scraper call) was deleted after a
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
        // Same semantic as lib/agent/reasoning-trace.ts (which classifies the drafting
        // stages): "withheld" means tokens were SPENT thinking and no trace came back —
        // not merely "the trace is null", which is also true of a call that never
        // reasoned and was this line's original tautology.
        reasoningWithheldByProvider: ext.reasoning == null && (ext.thinkingTokens ?? 0) > 0,
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
 * boundary) since a malformed handle now flows straight into a live X timeline read;
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
  // WHICH reporter hit a failure is most of the diagnostic value in an error report, and this
  // path typically runs inside `after()` — detached from the request that authenticated it — so
  // nothing else would attribute it. The owner id only; no email, no handle-as-identity.
  Sentry.setUser({ id: ownerId });

  return withAiSpan(
    {
      name: "invoke_agent voice-extraction",
      conversationId: extractionConversationId(experimentId),
      attributes: {
        "gen_ai.agent.name": "voice-extraction",
        "oparax.experiment_id": experimentId,
        "oparax.handle": reporterHandle,
      },
    },
    () => runExtractionSpendPhaseInner(experimentId, reporterHandle, ownerId),
  );
}

/** The body of the phase above, split out only so the Sentry span can wrap it without indenting
 *  every line of it. Never call this directly — the span carries the attributes and conversation
 *  id that make an extraction findable after the fact. */
async function runExtractionSpendPhaseInner(
  experimentId: string,
  reporterHandle: string,
  ownerId: string,
): Promise<ExtractionOutcome> {
  try {
    const admin = createAdminClient();

    // Stamped BEFORE the pull, not after it. Recording the stage only on completion left the
    // polled row blank for the whole of the read, which is the step a watching reporter is
    // most likely to be staring at.
    await recordProgress(experimentId, {
      stage: "corpus_fetch",
      progressNote: "Pulling recent posts from X…",
    });

    // The reporter's own statement of what they want monitored. It anchors the guide's
    // `## Beat & Scope` section, whose consumer is the drafting pipeline's filter stage — without
    // it the extractor would infer scope from timeline activity alone, which widens a one-club
    // beat to include whatever else the reporter happens to post about (voice-extract.md).
    // Read here rather than threaded through every caller: this function already has the desk id.
    const { data: deskRow } = await admin
      .from("experiments")
      .select("beat")
      .eq("id", experimentId)
      .maybeSingle();
    const beat = deskRow?.beat ?? "";

    let corpus: Awaited<ReturnType<typeof fetchCorpus>>;
    try {
      corpus = await fetchCorpus(reporterHandle, ownerId);
    } catch (corpusError) {
      console.error(
        `runExtractionSpendPhase: fetchCorpus failed for @${reporterHandle}`,
        corpusError,
      );
      Sentry.captureException(corpusError, {
        tags: { stage: "voice_extraction", error_code: "corpus_failed" },
        contexts: { extraction: { experimentId, handle: reporterHandle } },
      });
      await finishRun(experimentId, { status: "failed", errorCode: "corpus_failed" });
      return { status: "corpus_failed" };
    }
    await recordProgress(experimentId, {
      stage: "corpus_ready",
      progressNote: `Read ${corpus.length} posts`,
    });
    // Stamped onto the stage span now rather than passed in, because it isn't known until the pull
    // returns. Corpus size is the leading suspect in the empty-guide failure, so being able to
    // filter Sentry by it — rather than re-deriving it from a log line — is the point.
    Sentry.getActiveSpan()?.setAttribute("oparax.corpus_posts", corpus.length);

    // The model reads the corpus and decides scope BEFORE it writes anything, so the run row
    // says so — otherwise the first ~60s of a run (measured: first text delta at 60.5s) shows a
    // reporter nothing but "extracting" while the model is actually still working out their beat.
    await recordProgress(experimentId, {
      stage: "scoping",
      progressNote: "Working out what's on your beat…",
    });

    let ext: VoiceExtraction | undefined;
    try {
      ext = await extractVoiceGuideStreaming(
        reporterHandle,
        corpus,
        beat,
        throttledStreamProgress(experimentId),
        undefined,
        async (scope) => {
          // Both the reporter and Sentry learn what the model set aside and whether the guardrail
          // let it. An exclusion the guardrail REFUSED is the interesting case after the fact, so
          // it lands as a span attribute rather than only a progress note that scrolls away.
          Sentry.getActiveSpan()?.setAttributes({
            "oparax.scope_excluded": scope.postIds.length,
            "oparax.scope_applied": scope.applied,
            "oparax.scope_reason": scope.reason,
          });
          await recordProgress(experimentId, {
            stage: "scoping",
            progressNote: scope.applied
              ? `Set aside ${scope.postIds.length} off-beat posts — ${scope.reason}`
              : `Kept all posts — ${scope.note.slice(0, 120)}`,
          });
        },
      );

      const modelCallId = await insertExtractionModelCall(admin, ownerId, experimentId, ext);

      // An extraction can finish cleanly and produce NOTHING. Observed live once, 2026-07-25: a
      // run returned `finishReason: "stop"`, 9,443 thinking tokens, 7,365 characters of reasoning,
      // $0.31 billed — and an empty guide. Token arithmetic confirms the output really was all
      // reasoning and zero text (9,443 × $25/MTok out + 15,387 × $5/MTok in ≈ the $0.31 billed).
      // WHY the model stopped without answering is still unestablished — a fully instrumented
      // rerun (scripts/diagnose-extraction.ts, which records every stream part verbatim) did NOT
      // reproduce it: 200s, 293 text-deltas, a 23,261-char guide, $0.436. One clean run against
      // one dirty run characterizes nothing; do not write "nondeterminism" or any other cause here
      // until a failing run has been CAUGHT by that instrumentation. What is established: the
      // failure exists, it bills real money, and Sentry now records every extraction's stream
      // (gen_ai spans carry the output; the run's finishReason and token split land in the ledger
      // row), so the next occurrence will be diagnosable instead of argued about.
      //
      // Without this check that empty string flowed straight into `deployGuide`, was upserted as
      // a `voice_guides` row, and the run was stamped COMPLETED — leaving a desk that looks
      // extracted, drafts from an empty voice guide, and offers no retry because a guide exists.
      // A silent empty success is strictly worse than a loud failure.
      //
      // Placed AFTER the ledger insert on purpose: the call billed, so its `model_calls` row is
      // owed regardless of whether the output was usable (AGENTS.md's model-call rule). Throwing
      // here lands in the catch below, which stamps the run failed and carries `ext.costUsd`.
      if (!ext.guideRaw.trim()) {
        throw new Error(
          `extraction produced an empty guide (finishReason ${ext.finishReason ?? "unknown"}, ` +
            `${ext.thinkingTokens ?? 0} thinking tokens, model_call ${modelCallId})`,
        );
      }

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

      // Metrics + a structured completion log. The metrics answer trend questions no single span
      // can ("is extraction cost drifting up?", "are guides shrinking?") without scanning traces;
      // the log line is the queryable per-run record (Explore > Logs, filterable by attribute)
      // that survives even if span retention ages the trace out. Cost is the one figure Sentry
      // cannot derive itself — gateway models aren't in its price table, so the dashboard's own
      // cost column reads $0 for these calls and this metric is the real number.
      Sentry.metrics.distribution("extraction.cost_usd", ext.costUsd ?? 0, {
        unit: "none",
        attributes: { handle: reporterHandle },
      });
      Sentry.metrics.distribution("extraction.guide_chars", ext.guideRaw.length, {
        attributes: { handle: reporterHandle },
      });
      Sentry.logger.info("voice extraction completed", {
        experimentId,
        handle: reporterHandle,
        guideChars: ext.guideRaw.length,
        thinkingTokens: ext.thinkingTokens ?? 0,
        finishReason: ext.finishReason ?? "unknown",
        costUsd: ext.costUsd ?? 0,
      });

      return { status: "completed" };
    } catch (e) {
      // ext is defined only once extractVoiceGuideStreaming itself has resolved and billed —
      // carry its resolved cost into the run row even when a later step (the ledger insert, the
      // voice_guides upsert) is what actually failed. If the stream never completed, nothing
      // billed on this call and costUsd stays null.
      console.error(`runExtractionSpendPhase: extraction stage failed for @${reporterHandle}`, e);
      // Raised as a real Sentry ISSUE, not left to the console-log forwarder. This phase never
      // throws to its caller by design — it catches everything and returns a value — so without an
      // explicit capture the single most expensive failure in the product (a billed extraction
      // that produced nothing) would appear only as a log line with no stack trace and no grouping.
      // `costUsd` rides along because "how much has this failure cost so far" is the first question
      // it raises, and it is not answerable from the exception alone.
      Sentry.captureException(e, {
        tags: { stage: "voice_extraction", error_code: "extraction_failed" },
        contexts: {
          extraction: {
            experimentId,
            handle: reporterHandle,
            costUsd: ext?.costUsd ?? null,
            finishReason: ext?.finishReason ?? null,
            guideChars: ext?.guideRaw.length ?? null,
            thinkingTokens: ext?.thinkingTokens ?? null,
          },
        },
      });
      await finishRun(experimentId, {
        status: "failed",
        costUsd: ext?.costUsd ?? null,
        errorCode: "extraction_failed",
      });
      return { status: "failed", errorCode: "extraction_failed" };
    }
  } catch (e) {
    console.error(`runExtractionSpendPhase: failed for @${reporterHandle}`, e);
    Sentry.captureException(e, {
      tags: { stage: "voice_extraction", error_code: "internal_error" },
      contexts: { extraction: { experimentId, handle: reporterHandle } },
    });
    await finishRun(experimentId, { status: "failed", errorCode: "internal_error" });
    return { status: "failed" };
  }
}
