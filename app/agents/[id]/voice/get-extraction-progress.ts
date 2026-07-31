import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  type ExtractionReasoningByStage,
  type ExtractionTextByStage,
  type ExtractionToolActivity,
  parseExtractionProgress,
} from "@/lib/voice/extraction-progress-reasoning";
import { isExtractionRunStale } from "@/lib/voice/extraction-run";

export type ExtractionProgressResult =
  | {
      ok: true;
      stage: string | null;
      progressNote: string | null;
      reasoningByStage: ExtractionReasoningByStage;
      textByStage: ExtractionTextByStage;
      toolActivities: ExtractionToolActivity[];
      status: string;
      errorCode: string | null;
      /** Counts from the persisted, accumulating corpus — not a per-run fetch total. */
      corpusPostCount?: number;
      scopeExcludedCount?: number;
    }
  | { ok: false; error: string };

/**
 * Server-only progress read. The cookie/RLS read proves the current user owns this desk before
 * the deny-all extraction ledger is read through the service-role client.
 */
export async function getOwnedExtractionProgress(
  deskId: string,
): Promise<ExtractionProgressResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) return { ok: false, error: "Could not load this agent." };
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: desk, error: deskError } = await supabase
    .from("agents")
    .select("id")
    .eq("id", deskId)
    .maybeSingle();
  if (deskError) return { ok: false, error: "Could not load this agent." };
  if (!desk) return { ok: false, error: "Could not load this agent." };

  const admin = createAdminClient();
  const { data, error: progressError } = await admin
    .from("voice_extraction_runs")
    .select("stage, progress_note, reasoning_partial, status, error_code, updated_at")
    .eq("agent_id", deskId)
    .maybeSingle();
  if (progressError) return { ok: false, error: "Could not load this agent." };

  if (!data) {
    return {
      ok: true,
      stage: null,
      progressNote: null,
      reasoningByStage: {},
      textByStage: {},
      toolActivities: [],
      status: "none",
      errorCode: null,
    };
  }

  // `corpus_posts` is the durable evidence for these completed steps. It accumulates across
  // retries, so expose only facts the table can prove rather than reconstructing a transient
  // progress note that a poll may have missed.
  const [corpusCountResult, excludedCountResult] = await Promise.all([
    admin.from("corpus_posts").select("*", { count: "exact", head: true }).eq("agent_id", deskId),
    admin
      .from("corpus_posts")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", deskId)
      .eq("excluded_off_beat", true),
  ]);
  if (corpusCountResult.error || excludedCountResult.error) {
    return { ok: false, error: "Could not load this agent." };
  }

  // A killed invocation has nobody left to stamp a terminal state. Read it with the same
  // fifteen-minute ceiling startRun uses for reclamation so Feed stops polling and exposes Retry
  // instead of displaying a dead run forever. The row itself stays reclaimable by startRun.
  const stale = data.status === "running" && isExtractionRunStale(data.updated_at);

  const streamProgress = parseExtractionProgress(data.reasoning_partial, data.stage);

  return {
    ok: true,
    stage: data.stage,
    progressNote: data.progress_note,
    reasoningByStage: streamProgress.reasoningByStage,
    textByStage: streamProgress.textByStage,
    toolActivities: streamProgress.toolActivities,
    status: stale ? "failed" : data.status,
    errorCode: stale ? "stale_run" : data.error_code,
    corpusPostCount: corpusCountResult.count ?? 0,
    scopeExcludedCount: excludedCountResult.count ?? 0,
  };
}
