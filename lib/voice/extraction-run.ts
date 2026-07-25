// lib/voice/extraction-run.ts
//
// The extraction progress record. SERVER-ONLY, admin-client-only — `voice_extraction_runs`
// carries deny-all RLS (service role writes; the browser reads it through an ownership-proving
// server action, never directly).
//
// This REPLACES lib/voice/spend-gate.ts, which is deleted. That module rationed extraction:
// an atomic UNIQUE(reporter_handle, utc_day) claim so a reporter could be extracted at most
// once per day across the whole product, a `reserved_usd` worst-case hold, a release path for
// when the corpus failed before the LLM ran, and a separate per-handle daily cap on profile
// lookups. All of it is gone by owner decision — extraction now runs whenever it is asked to,
// per desk, and pays for itself each time.
//
// What survives is the only part that was ever user-visible: one row per desk recording where
// extraction has got to. It is a progress log, not a gate — nothing here can refuse a caller.
import { createAdminClient } from "@/lib/supabase/admin";

/** The stages a run passes through, in order. `RunStage` is exported because the create screen
 *  maps each one to a step; keeping the union here means a new stage cannot be written without
 *  the UI's exhaustive map failing to compile. */
export type RunStage =
  | "starting"
  | "corpus_fetch"
  | "corpus_ready"
  | "extracting"
  | "materializing_rules"
  | "done"
  | "failed";

/**
 * Opens (or reopens) this desk's run record and marks it running.
 *
 * Upsert on `experiment_id`, not insert: a retry overwrites the previous attempt rather than
 * colliding with it. That is the whole behavioural difference from the claim it replaces —
 * where the old unique key existed to REJECT a second attempt, this one exists only to keep
 * exactly one current record per desk. Every progress field from a prior run is cleared so a
 * stale reasoning trace or error code can never be read as belonging to this attempt.
 */
export async function startRun(experimentId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("voice_extraction_runs").upsert(
      {
        experiment_id: experimentId,
        status: "running",
        stage: "starting",
        progress_note: null,
        reasoning_partial: null,
        error_code: null,
        cost_usd: null,
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "experiment_id" },
    );
    if (error) throw error;
  } catch (e) {
    console.error(`startRun: failed for experiment ${experimentId}`, e);
  }
}

/**
 * Pushes streaming status into this desk's run row. Called repeatedly through a live extraction.
 *
 * Best-effort by design: never throws out to the caller. A bookkeeping write must not be able to
 * fail an extraction that is otherwise succeeding — and by the time this is called the expensive
 * work is already paid for.
 */
export async function recordProgress(
  experimentId: string,
  patch: { stage?: RunStage; progressNote?: string; reasoningPartial?: string },
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("voice_extraction_runs")
      .update({
        ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
        ...(patch.progressNote !== undefined ? { progress_note: patch.progressNote } : {}),
        ...(patch.reasoningPartial !== undefined
          ? { reasoning_partial: patch.reasoningPartial }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("experiment_id", experimentId);
    if (error) throw error;
  } catch (e) {
    console.error(`recordProgress: failed for experiment ${experimentId}`, e);
  }
}

/**
 * Terminal stamp — success OR failure. Completed paid work stays metered either way: an
 * extraction that billed and then failed on a later step still records what it cost.
 *
 * Same best-effort discipline as the two above.
 */
export async function finishRun(
  experimentId: string,
  result: { status: "completed" | "failed"; costUsd?: number | null; errorCode?: string | null },
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("voice_extraction_runs")
      .update({
        status: result.status,
        stage: result.status === "completed" ? "done" : "failed",
        ...(result.costUsd !== undefined ? { cost_usd: result.costUsd } : {}),
        ...(result.errorCode !== undefined ? { error_code: result.errorCode } : {}),
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("experiment_id", experimentId);
    if (error) throw error;
  } catch (e) {
    console.error(`finishRun: failed for experiment ${experimentId}`, e);
  }
}
