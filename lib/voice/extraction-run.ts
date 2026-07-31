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
// extraction has got to. It carries no cap, no quota and no reservation — the one thing it can
// refuse is a SECOND concurrent run for the SAME desk (see `startRun`), which bounds a
// double-click to one paid extraction rather than rationing how often a reporter may extract.
import { createAdminClient } from "@/lib/supabase/admin";

/** The stages a run passes through, in order. `RunStage` is exported because the create screen
 *  maps each one to a step; keeping the union here means a new stage cannot be written without
 *  the UI's exhaustive map failing to compile. */
export type RunStage =
  | "starting"
  | "corpus_fetch"
  | "corpus_ready"
  | "scoping"
  | "extracting"
  | "materializing_rules"
  | "done"
  | "failed";

/**
 * A `running` row older than this is treated as dead, not in-flight, and becomes reclaimable.
 * The real-world ceiling is the route's own `maxDuration = 800` (see `extract-guide.ts`'s
 * `EXTRACT_TIMEOUT_MS = 770_000` comment for the measured numbers behind that figure) — a
 * killed invocation (Vercel's hard timeout, a crash) leaves the row stuck at `running` forever
 * with no cleanup, since there is no process left to reach `finishRun`. 15 minutes is beyond the
 * route ceiling, including a run killed right at the deadline, while still recovering a genuinely
 * dead row in a bounded time rather than never. This is
 * reclaiming a dead row, NOT the deleted per-reporter/per-day rationing — it does not shorten
 * or ration how often a healthy desk may run; it only unsticks one that provably can't still be
 * running.
 */
export const STALE_RUN_MS = 15 * 60 * 1000;

export function isExtractionRunStale(updatedAt: string, now = Date.now()): boolean {
  return now - new Date(updatedAt).getTime() > STALE_RUN_MS;
}

/**
 * Opens (or reopens) this desk's run record, marks it running, and reports whether THIS caller
 * is the one that claimed it. `true` means claim held — go spend; `false` means a run is already
 * in flight for this desk (or the claim could not be written), so the caller must not spend.
 *
 * The database decides, not the process: a plain INSERT wins against `UNIQUE(agent_id)`
 * when no row exists, and a 23505 conflict falls through to an UPDATE guarded by
 * `.neq("status", "running")` OR'd with `updated_at` older than `STALE_RUN_MS` — a row stuck at
 * `running` past that ceiling is reclaimable too. Both conditions are evaluated by Postgres
 * inside the single UPDATE's WHERE clause, so this stays one atomic statement, not a
 * read-then-write: under READ COMMITTED the loser of two concurrent updates re-evaluates the
 * WHERE clause after the winner commits, sees a row that is now `running` with a fresh
 * `updated_at`, matches neither condition, and updates zero rows — so a double-click (or a
 * double-click racing a stale reclaim) still bills once. This is NOT the rationing the owner
 * deleted: nothing here is per-reporter, per-day, or a spend reservation. It bounds one desk to
 * one concurrent run, and now also bounds a dead run to a 15-minute recovery window instead of
 * forever.
 *
 * Every progress field from a prior run is cleared on reopen so a stale reasoning trace or error
 * code can never be read as belonging to this attempt.
 *
 * Logging stays best-effort, but the RETURN VALUE is load-bearing — a caller spends real money
 * on it — so an unexpected write failure resolves to `false` (don't spend) rather than being
 * swallowed into an optimistic `true`.
 */
export async function startRun(agentId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const staleCutoff = new Date(Date.now() - STALE_RUN_MS).toISOString();
  const fresh = {
    status: "running",
    stage: "starting",
    progress_note: null,
    reasoning_partial: null,
    error_code: null,
    cost_usd: null,
    started_at: now,
    finished_at: null,
    updated_at: now,
  };

  try {
    const admin = createAdminClient();
    const { error: insertError } = await admin
      .from("voice_extraction_runs")
      .insert({ agent_id: agentId, ...fresh });
    if (!insertError) return true;
    // 23505 = unique_violation: this desk has run before, so reopen its one row instead.
    if (insertError.code !== "23505") throw insertError;

    const { data, error: updateError } = await admin
      .from("voice_extraction_runs")
      .update(fresh)
      .eq("agent_id", agentId)
      .or(`status.neq.running,updated_at.lt.${staleCutoff}`)
      .select("id");
    if (updateError) throw updateError;
    return (data ?? []).length > 0;
  } catch (e) {
    console.error(`startRun: failed for agent ${agentId}`, e);
    return false;
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
  agentId: string,
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
      .eq("agent_id", agentId);
    if (error) throw error;
  } catch (e) {
    console.error(`recordProgress: failed for agent ${agentId}`, e);
  }
}

/**
 * Terminal stamp — success OR failure. Completed paid work stays metered either way: an
 * extraction that billed and then failed on a later step still records what it cost.
 *
 * Same best-effort discipline as the two above.
 */
export async function finishRun(
  agentId: string,
  result: { status: "completed" | "failed"; costUsd?: number | null; errorCode?: string | null },
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("voice_extraction_runs")
      .update({
        status: result.status,
        // A failed status already carries the terminal fact. Retain the last real stage so the
        // UI can identify which semantic step failed instead of guessing from a broad error code.
        ...(result.status === "completed" ? { stage: "done" as const } : {}),
        ...(result.costUsd !== undefined ? { cost_usd: result.costUsd } : {}),
        ...(result.errorCode !== undefined ? { error_code: result.errorCode } : {}),
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", agentId);
    if (error) throw error;
  } catch (e) {
    console.error(`finishRun: failed for agent ${agentId}`, e);
  }
}
