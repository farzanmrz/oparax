// lib/voice/create-desk-extraction.ts
//
// Voice-guide extraction for ONE desk. SERVER-ONLY: transitively imports lib/sysprompts via
// extract-guide.ts (readFileSync at module scope) — never importable from a client component.
//
// REUSES slice-1's extractor's model/config (extractVoiceGuideStreaming, lib/voice/
// extract-guide.ts) unchanged — this module does not reimplement the extraction call itself,
// only consumes it as a stream instead of a one-shot. extractVoiceGuideStreaming does NOT write
// a model_calls row (it only returns the extraction result once the stream finishes), so this
// module is the ONE place that writes the "voice_extraction" ledger row. (A manual/CLI path
// with its own ledger writer existed alongside this; it and its non-streaming extractor were
// deleted once the slice shipped, so there is no second writer to keep in step.)
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
import { normalizeHandle, X_HANDLE_RE } from "@/lib/x/handle";
import { getXAccount, updateXAccountTier } from "@/lib/x/store";
import { fetchCorpus, resolveCorpusXUserId } from "./corpus";
import { accumulateCorpus, findReusableCorpus, markCorpusExclusions } from "./corpus-store";
import { deployGuide } from "./deploy-guide";
import {
  EXTRACTION_MODEL,
  type ExtractionStreamSnapshot,
  extractVoiceGuideStreaming,
  type ScopeExclusion,
  type VoiceExtraction,
} from "./extract-guide";
import { serializeExtractionProgress } from "./extraction-progress-reasoning";
import { finishRun, recordProgress } from "./extraction-run";
import { materializeRulesFromGuide } from "./rules";
import { inferAccountTier } from "./tier";

type AdminClient = ReturnType<typeof createAdminClient>;

/** The extraction routes both export `maxDuration = 800` (see EXTRACT_TIMEOUT_MS's comment in
 *  extract-guide.ts for the measured numbers behind it). The auto-retry below must fit inside
 *  that platform ceiling or a killed invocation leaves the run row stuck at `running`. */
const ROUTE_BUDGET_MS = 800_000;
/** Reserved for the corpus/ledger/rule writes on either side of a retried call — the same ~30s
 *  EXTRACT_TIMEOUT_MS reserves out of the route budget for the first attempt. */
const RETRY_BUFFER_MS = 30_000;
/** Don't retry into a window that cannot survive the tail: the measured clean run is ~200s, and
 *  a live run was still mid-reasoning at 280s. A floor below that tail can start a retry that
 *  aborts before its first step completes, bills real money, and writes no model_calls row. */
const RETRY_FLOOR_MS = 350_000;

/** A stream error rendered for a jsonb/text column or an error message. Errors stringify to
 *  `{}` under JSON.stringify, so they're taken via message/stack first; gateway error PARTS
 *  (e.g. the observed `gateway_stream_terminated` object) are plain objects and survive
 *  stringification with their `code`/`message`/`origin` fields intact. */
function describeStreamError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** The transient class the auto-retry targets: the stream died under the call (an `error` part
 *  arrived, or the run finished as `"error"`) AND no guide text survived. A non-empty guide with
 *  a late stream hiccup is NOT retried — the expensive output exists; let it proceed. */
function isTransientStreamDeath(ext: VoiceExtraction): boolean {
  return !ext.guideRaw.trim() && (ext.streamError !== undefined || ext.finishReason === "error");
}

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
type GateId = "handle_shape";

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
 *  AGENTS.md's model-call rule — the same ordering and shape the deleted CLI extractor's
 *  insert for this exact stage. */
async function insertExtractionModelCall(
  admin: AdminClient,
  ownerId: string,
  agentId: string,
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
        // The run's scope decision and stream failure ride on THIS row because it is the one
        // record a retry can't overwrite: voice_extraction_runs holds a single row per desk
        // (reopened in place), corpus_posts exclusion flags are reset by the next run's
        // accumulate, and the run row's progress notes go with them. Lived through 2026-08-09:
        // "which 3 posts did the failed run set aside, and why?" was unanswerable.
        scopeExclusion: (ext.scopeExclusion as unknown as Json) ?? null,
        streamError: ext.streamError !== undefined ? describeStreamError(ext.streamError) : null,
      } as unknown as Json,
      cost_usd: ext.costUsd,
      generation_id: ext.generationId,
      ref_kind: "agent_id",
      ref_id: agentId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** A billed extraction attempt has two durable records: its provenance row and its usage event.
 *  Keep them adjacent so failures cannot be retried past an attempt that was charged but not
 *  recorded in both ledgers. */
async function recordExtractionAttempt(
  admin: AdminClient,
  ownerId: string,
  agentId: string,
  reporterHandle: string,
  ext: VoiceExtraction,
): Promise<string> {
  const modelCallId = await insertExtractionModelCall(admin, ownerId, agentId, ext);
  const { error } = await admin.from("usage_events").insert({
    owner_id: ownerId,
    kind: "voice_extraction",
    units: 1,
    cost_usd: ext.costUsd,
    ref_id: reporterHandle,
  });
  if (error) throw error;
  return modelCallId;
}

/** Throttles `recordProgress` calls raised by `extractVoiceGuideStreaming`'s stream-event
 *  `onProgress` to roughly once per second — the stream can emit many parts/sec and this is
 *  the ONE DB write in that loop, so hammering it on every delta would be a lot of update
 *  traffic against a single row for no user-visible benefit (a human can't perceive sub-second
 *  progress updates anyway). The first text-bearing delta always flushes immediately so the run
 *  row shows `"extracting"` as soon as the guide starts streaming, rather than waiting a full
 *  second. */
function throttledStreamProgress(
  agentId: string,
): (snapshot: ExtractionStreamSnapshot) => Promise<void> {
  let lastFlush = 0;
  let hasFlushedText = false;
  let lastFlushedStage: ExtractionStreamSnapshot["activeStage"] | null = null;
  let lastToolState = "";
  return async ({ text, reasoningByStage, textByStage, toolActivities, activeStage }) => {
    const hasText = text.length > 0;
    const toolState = toolActivities
      .map((activity) => `${activity.id}:${activity.state}`)
      .join("|");
    const bypassThrottle =
      (hasText && !hasFlushedText) ||
      activeStage !== lastFlushedStage ||
      toolState !== lastToolState;
    const now = Date.now();
    if (lastFlush !== 0 && !bypassThrottle && now - lastFlush < 1000) return;
    lastFlush = now;
    lastFlushedStage = activeStage;
    lastToolState = toolState;
    if (hasText) hasFlushedText = true;
    await recordProgress(agentId, {
      stage: activeStage === "scope" ? "scoping" : "extracting",
      ...(hasText ? { progressNote: `${text.length} chars generated` } : {}),
      reasoningPartial: serializeExtractionProgress({
        reasoningByStage,
        textByStage,
        toolActivities,
      }),
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
 * timeline read (`fetchCorpus`), not two. (There is no profile-lookup gate any more — that was
 * part of the deleted per-handle spend-gate model; the only pre-flight left is `checkHandleShape`.)
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
 *       guide's initial `voice_rules` split.
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
  agentId: string,
  reporterHandle: string,
  ownerId: string,
  requestStartedAtMs = Date.now(),
): Promise<ExtractionOutcome> {
  return runExtractionSpendPhaseInner(agentId, reporterHandle, ownerId, requestStartedAtMs);
}

/** The extraction body stays split out so the public entry point remains a small boundary. */
async function runExtractionSpendPhaseInner(
  agentId: string,
  reporterHandle: string,
  ownerId: string,
  requestStartedAtMs: number,
): Promise<ExtractionOutcome> {
  try {
    const admin = createAdminClient();

    // Stamped BEFORE the pull, not after it. Recording the stage only on completion left the
    // polled row blank for the whole of the read, which is the step a watching reporter is
    // most likely to be staring at.
    await recordProgress(agentId, {
      stage: "corpus_fetch",
      progressNote: "Pulling recent posts from X…",
    });

    // The reporter's own statement of what they want monitored. It anchors the guide's
    // `## Beat & Scope` section, whose consumer is the drafting pipeline's filter stage — without
    // it the extractor would infer scope from timeline activity alone, which widens a one-club
    // beat to include whatever else the reporter happens to post about (voice-extract.md).
    // Read here rather than threaded through every caller: this function already has the desk id.
    const { data: deskRow } = await admin
      .from("agents")
      .select("beat")
      .eq("id", agentId)
      .maybeSingle();
    const beat = deskRow?.beat ?? "";

    // A corpus this product already holds for this reporter, recent enough to stand in for a
    // fresh read (see findReusableCorpus). The X timeline read is rate-limited and metered, and
    // re-reading the same handle teaches the extraction nothing new — so the read happens only
    // when there is no usable corpus already.
    let corpus: Awaited<ReturnType<typeof fetchCorpus>>["posts"];
    let corpusXUserId: string;
    let reusedCreatedAtByPostId: ReadonlyMap<string, string> | undefined;
    let reused: Awaited<ReturnType<typeof findReusableCorpus>>;
    try {
      corpusXUserId = await resolveCorpusXUserId(reporterHandle);
      reused = await findReusableCorpus(corpusXUserId);
      if (reused) {
        corpus = reused.posts;
        reusedCreatedAtByPostId = reused.createdAtByPostId;
        console.log(
          `runExtractionSpendPhase: reusing ${corpus.length} stored posts for @${reporterHandle} ` +
            `(pulled ${reused.pulledAt}) — skipping the X timeline read`,
        );
      } else {
        const freshCorpus = await fetchCorpus(reporterHandle, ownerId, corpusXUserId);
        corpus = freshCorpus.posts;
      }
    } catch (corpusError) {
      console.error(
        `runExtractionSpendPhase: fetchCorpus failed for @${reporterHandle}`,
        corpusError,
        { agentId },
      );
      await finishRun(agentId, { status: "failed", errorCode: "corpus_failed" });
      return { status: "corpus_failed" };
    }
    await recordProgress(agentId, {
      stage: "corpus_ready",
      progressNote: `Read ${corpus.length} posts`,
    });
    // A corpus with zero posts carrying real text (a brand-new or inactive reporter, or every
    // post being media-only) has nothing for the extractor to measure or quote from. Refuse to
    // bill the extraction call on a prompt that would embed literal "undefined"s into
    // its MEASURED FACTS block (see measured-facts.ts) — fail here, honestly and for free,
    // rather than after the extraction already ran.
    const representativePosts = corpus.filter((p) => (p.text ?? "").trim()).length;
    if (representativePosts === 0) {
      console.error(
        `runExtractionSpendPhase: @${reporterHandle}'s corpus has ${corpus.length} raw posts ` +
          `but zero with usable text — refusing to bill a malformed extraction`,
      );
      await finishRun(agentId, { status: "failed", errorCode: "empty_corpus" });
      return { status: "corpus_failed" };
    }

    // These analysis side-writes happen only after the usable-corpus guard. A failed or empty
    // pull must never wipe a known corpus or overwrite a linked account's tier inference.
    try {
      await accumulateCorpus(agentId, corpusXUserId, corpus, reusedCreatedAtByPostId);
    } catch (corpusStoreError) {
      console.error(
        `runExtractionSpendPhase: accumulateCorpus failed for @${reporterHandle}`,
        corpusStoreError,
        { agentId },
      );
    }

    try {
      const inferred = inferAccountTier(corpus);
      // The DESK always records its reporter's corpus-proven tier — this is what the drafting
      // ceiling, feed counter, and gates resolve first (resolveDeskTier), so an owner-override
      // desk drafting a premium reporter's voice isn't capped at 280 by the posting account.
      // Same never-downgrade rule as x_accounts below: premium evidence is proof; a corpus
      // that happens to lack long posts proves nothing and must not undo prior proof.
      const deskTierUpdate = admin
        .from("agents")
        .update({ reporter_tier: inferred })
        .eq("id", agentId);
      const { error: deskTierError } =
        inferred === "premium"
          ? await deskTierUpdate
          : await deskTierUpdate.is("reporter_tier", null);
      if (deskTierError) throw deskTierError;

      const account = await getXAccount(ownerId);
      const sameReporter =
        account &&
        normalizeHandle(account.handle).toLowerCase() ===
          normalizeHandle(reporterHandle).toLowerCase();
      if (sameReporter) {
        // Premium evidence is proof; absence of long posts proves nothing. A manually seeded
        // premium account is therefore never downgraded by a standard inference.
        if (inferred === "premium" || account.tier === null) {
          // Guard the write by the exact linked X account observed above. If relinking happens
          // between the read and this update, PostgREST matches zero rows rather than applying
          // the old account's inference to the new account.
          await updateXAccountTier(ownerId, account.x_user_id, inferred);
        }
      }
    } catch (tierError) {
      console.error(
        `runExtractionSpendPhase: tier inference write failed for @${reporterHandle}`,
        tierError,
        { agentId },
      );
    }

    // The model reads the corpus and decides scope BEFORE it writes anything, so the run row
    // says so — otherwise the first ~60s of a run (measured: first text-bearing delta at 60.5s)
    // shows a reporter nothing but "extracting" while the model is still working out their beat.
    await recordProgress(agentId, {
      stage: "scoping",
      progressNote: "Working out what's on your beat…",
    });

    let ext: VoiceExtraction | undefined;
    try {
      const onScope = async (scope: ScopeExclusion) => {
        await recordProgress(agentId, {
          progressNote: scope.applied
            ? `Set aside ${scope.postIds.length} off-beat posts — ${scope.reason}`
            : `Kept all posts — ${scope.note.slice(0, 120)}`,
        });
        if (scope.applied && scope.postIds.length > 0) {
          try {
            await markCorpusExclusions(agentId, scope.postIds, scope.reason);
          } catch (exclusionError) {
            console.error(
              `runExtractionSpendPhase: markCorpusExclusions failed for @${reporterHandle}`,
              exclusionError,
              { agentId },
            );
          }
        }
      };
      const runExtraction = (timeoutMs?: number) =>
        extractVoiceGuideStreaming(
          reporterHandle,
          corpus,
          beat,
          throttledStreamProgress(agentId),
          undefined,
          onScope,
          timeoutMs,
        );
      ext = await runExtraction();
      let modelCallId: string | undefined;

      // ONE automatic retry for a transient stream death (the 2026-08-09 production case: the
      // gateway reported `gateway_stream_terminated` — Anthropic's stream cut off mid-generation
      // — and the reporter was made to click Retry for an infrastructure blip that was nobody's
      // decision). Guarded three ways: the failure must match the transient class (see
      // isTransientStreamDeath — a run with real guide text is never re-billed), the dead
      // attempt's billed call is ledgered FIRST (the model-call rule doesn't care that the money
      // bought nothing), and the second attempt must fit the route's remaining budget or it
      // doesn't run — a platform-killed invocation would leave the run row stuck at `running`,
      // which is strictly worse than an honest failed state with a Retry button.
      if (isTransientStreamDeath(ext)) {
        try {
          modelCallId = await recordExtractionAttempt(admin, ownerId, agentId, reporterHandle, ext);
        } catch (ledgerError) {
          console.error(
            `runExtractionSpendPhase: failed to ledger or meter dead first attempt for @${reporterHandle}`,
            ledgerError,
          );
          throw ledgerError;
        }
        console.error("voice extraction: transient stream failure, retrying", {
          error:
            ext.streamError instanceof Error
              ? ext.streamError
              : new Error(`extraction stream died: ${describeStreamError(ext.streamError)}`),
          agentId,
          handle: reporterHandle,
          costUsd: ext.costUsd ?? null,
          finishReason: ext.finishReason ?? null,
        });
        const remainingMs = ROUTE_BUDGET_MS - RETRY_BUFFER_MS - (Date.now() - requestStartedAtMs);
        if (remainingMs >= RETRY_FLOOR_MS) {
          await recordProgress(agentId, {
            stage: "scoping",
            progressNote: "The connection to the model dropped — retrying automatically…",
          });
          // Re-reset this corpus's exclusion flags before the fresh attempt: the dead attempt's
          // scope tool may have marked exclusions the retry's model won't re-choose, and
          // accumulateCorpus's reset-then-reapply contract is exactly the tool for that
          // (idempotent by design — see its header).
          try {
            await accumulateCorpus(agentId, corpusXUserId, corpus, reusedCreatedAtByPostId);
          } catch (resetError) {
            console.error(
              `runExtractionSpendPhase: exclusion reset before retry failed for @${reporterHandle}`,
              resetError,
            );
            throw resetError;
          }
          ext = await runExtraction(remainingMs);
          modelCallId = undefined;
        }
      }

      modelCallId ??= await recordExtractionAttempt(admin, ownerId, agentId, reporterHandle, ext);

      // An extraction can finish cleanly and produce NOTHING. Observed live once, 2026-07-25: a
      // run returned `finishReason: "stop"`, 9,443 thinking tokens, 7,365 characters of reasoning,
      // $0.31 billed — and an empty guide. Token arithmetic confirms the output really was all
      // reasoning and zero text (9,443 × $25/MTok out + 15,387 × $5/MTok in ≈ the $0.31 billed).
      // WHY the model stopped without answering is still unestablished — a fully instrumented
      // rerun (a recorder attached to onRawPart, capturing every stream part verbatim) did NOT
      // reproduce it: 200s, 293 text-deltas, a 23,261-char guide, $0.436. One clean run against
      // one dirty run characterizes nothing; do not write "nondeterminism" or any other cause here
      // until a failing run has been CAUGHT by that instrumentation. What is established: the
      // failure exists, it bills real money, and the run's finishReason and token split land in
      // the ledger row so the next occurrence has durable evidence.
      //
      // A SECOND empty-guide class was caught live 2026-08-09 and is now fully characterized:
      // `finishReason: "error"` — the stream died under the call ($0.059 billed, reasoning cut
      // mid-word; the gateway reported `gateway_stream_terminated`, upstream finish never
      // received). That class is handled ABOVE this check (isTransientStreamDeath → one budgeted
      // retry), and its error part now persists on the ledger row and rides the throw below as
      // `cause` — the 07-25 `"stop"` case remains the mystery this comment refuses to name.
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
            `${ext.thinkingTokens ?? 0} thinking tokens, model_call ${modelCallId}` +
            (ext.streamError !== undefined
              ? `, stream error: ${describeStreamError(ext.streamError)}`
              : "") +
            `)`,
          // Preserve the stream error as `cause` so server logs show the provider or gateway
          // failure itself, not only this wrapper.
          ext.streamError !== undefined ? { cause: ext.streamError } : undefined,
        );
      }

      await recordProgress(agentId, { stage: "materializing_rules" });

      const guideDeploy = deployGuide(ext.guideRaw);
      const { error: voiceGuideError } = await admin.from("voice_guides").upsert(
        {
          agent_id: agentId,
          guide_raw: ext.guideRaw,
          guide_deploy: guideDeploy,
          measured_facts: ext.measuredFactsBlock,
          cost_usd: ext.costUsd,
          provenance: { modelCallId } as unknown as Json,
        },
        { onConflict: "agent_id" },
      );
      if (voiceGuideError) throw voiceGuideError;

      // A guide without its editable rules is not ready: drafting reads voice_rules, not the
      // guide blob. Let a failure reach the terminal catch so this run remains visibly failed
      // at the materializing_rules stage and Retry can run a fresh, idempotent materialization.
      // The guide and its billed model-call provenance intentionally remain durable for audit.
      await materializeRulesFromGuide(agentId, guideDeploy, modelCallId);

      await finishRun(agentId, { status: "completed", costUsd: ext.costUsd });

      return { status: "completed" };
    } catch (e) {
      // ext is defined only once extractVoiceGuideStreaming itself has resolved and billed —
      // carry its resolved cost into the run row even when a later step (the ledger insert, the
      // voice_guides upsert) is what actually failed. If the stream never completed, nothing
      // billed on this call and costUsd stays null.
      console.error(`runExtractionSpendPhase: extraction stage failed for @${reporterHandle}`, {
        error: e,
        agentId,
        handle: reporterHandle,
        costUsd: ext?.costUsd ?? null,
        finishReason: ext?.finishReason ?? null,
        guideChars: ext?.guideRaw.length ?? null,
        thinkingTokens: ext?.thinkingTokens ?? null,
        streamError: ext?.streamError !== undefined ? describeStreamError(ext.streamError) : null,
      });
      await finishRun(agentId, {
        status: "failed",
        costUsd: ext?.costUsd ?? null,
        errorCode: "extraction_failed",
      });
      return { status: "failed", errorCode: "extraction_failed" };
    }
  } catch (e) {
    console.error(`runExtractionSpendPhase: failed for @${reporterHandle}`, e, { agentId });
    await finishRun(agentId, { status: "failed", errorCode: "internal_error" });
    return { status: "failed" };
  }
}
