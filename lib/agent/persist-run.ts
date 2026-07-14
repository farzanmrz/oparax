// lib/agent/persist-run.ts
//
// The single writer of a scan outcome to its `runs` row, shared by the two callers that run a
// scan: the per-minute dispatcher (app/api/cron/tick) and the dashboard's scanNow action
// (app/agents/[id]/actions.ts). Both write via the service-role admin client (`runs` is
// service-role-write-only) and both guard on `status: "running"` so the tick's stuck-run sweep,
// if it already failed the row, is never overwritten. Kept here so the two persist blocks — once
// byte-identical and easy to drift apart — have one home. SERVER-ONLY (admin client).
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { ScanRunResult } from "./scan-run";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Persist a completed `runScan` outcome. A soft-fail (`result.error` set — Pass-2 structuring gave
 * up after retries) still carries Pass 1's grok cost + trace, so record those alongside the failure
 * rather than dropping to a blank run; a clean run stores its `items` as the result.
 */
export async function persistScanRun(
  client: AdminClient,
  runId: string,
  result: ScanRunResult,
): Promise<void> {
  const { items, costUsd, usage, trace, error } = result;
  await client
    .from("runs")
    .update({
      status: error ? "failed" : "done",
      ...(error ? { error } : { result: { items } as Json }),
      cost_usd: costUsd,
      usage: usage as Json,
      trace: trace as Json,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("status", "running");
}

/**
 * Persist an UNEXPECTED scan failure — Pass 1 or the gateway threw, so there is nothing partial to
 * preserve (unlike a soft-fail, which goes through `persistScanRun`). Same `status: "running"` guard.
 */
export async function persistScanRunError(
  client: AdminClient,
  runId: string,
  err: unknown,
): Promise<void> {
  await client
    .from("runs")
    .update({
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("status", "running");
}
