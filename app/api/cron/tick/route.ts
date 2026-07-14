// The per-minute dispatcher — Vercel Cron's only caller (see vercel.json). Sweeps stuck
// `runs`, selects due agents (bounded, oldest-due-first), CAS-claims each by advancing its
// `next_run_at` to the NEXT fire before running (so a slow in-flight scan is never re-claimed
// by the next tick), then runs the winners in-route via `runScan` and persists the outcome.
// SERVER-ONLY: uses the service-role client (no RLS, no user session — a tick isn't a request
// from a signed-in reporter).
import { nextFire } from "@/lib/agent/next-run";
import {
  type ScanFrequency,
  scanFrequencySchema,
  validateScanFrequency,
} from "@/lib/agent/scan-frequency";
import { runScan } from "@/lib/agent/scan-run";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export const maxDuration = 300;

type Winner = {
  id: string;
  beat: string;
  handles: string[];
  freq: ScanFrequency;
  /** The scheduled fire this run services (the claimed `next_run_at`) — the scan window looks
   *  back to the fire before it, so a run started seconds after the fire covers the right span. */
  firedAt: string;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = createAdminClient();

  // (2) Sweep stuck runs — never touches agent ledgers.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await db
    .from("runs")
    .update({ status: "failed", error: "timed out", finished_at: new Date().toISOString() })
    .eq("status", "running")
    .lt("started_at", tenMinAgo);

  // (3) Select due, bounded.
  const { data: due } = await db
    .from("agents")
    .select("id, beat, handles, scan_frequency, next_run_at")
    .eq("status", "active")
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .limit(10);

  // (4) Per candidate: parse then CAS-claim.
  const winners: Winner[] = [];
  for (const agent of due ?? []) {
    // The due select filters `next_run_at <= now`, so it is never null here — narrow the
    // nullable column type so the CAS claim below can compare against it.
    if (agent.next_run_at == null) continue;

    const parsed = scanFrequencySchema.safeParse(agent.scan_frequency);
    if (!parsed.success) {
      // Malformed — self-heal, no hot-loop.
      await db.from("agents").update({ status: "paused", next_run_at: null }).eq("id", agent.id);
      console.error(
        `cron/tick: agent ${agent.id} has an invalid scan_frequency; paused`,
        parsed.error,
      );
      continue;
    }

    const freq = parsed.data;
    // Schema-valid but rail-invalid (e.g. an inverted end<start window) → `nextFire` would find
    // no fire and throw, and that throw is outside any try/catch, so it would reject the whole GET
    // handler and — because the ledger never advances — re-poison every subsequent tick. Self-heal
    // to paused, same as a malformed row. (Write paths already validate; this is defense in depth.)
    if (!validateScanFrequency(freq).ok) {
      await db.from("agents").update({ status: "paused", next_run_at: null }).eq("id", agent.id);
      console.error(`cron/tick: agent ${agent.id} scan_frequency fails the rate rails; paused`);
      continue;
    }

    const firedAt = agent.next_run_at;
    // CAS: only the tick that still sees this due time wins the claim.
    const { data: claimed } = await db
      .from("agents")
      .update({ next_run_at: nextFire(freq, new Date()).toISOString() })
      .eq("id", agent.id)
      .eq("status", "active")
      .eq("next_run_at", firedAt)
      .select("id");
    if (!claimed?.length) continue; // lost the race — another tick already advanced it

    winners.push({ id: agent.id, beat: agent.beat, handles: agent.handles, freq, firedAt });
  }

  // (5) Run winners, awaited in-route. Each winner RETURNS its own outcome ("done"/"failed")
  // so the response counts mirror actual scan results — the catch records the failure to the
  // `runs` row but does not rethrow, so allSettled alone would count every handled scan as
  // fulfilled. `rejected` is reserved for the unexpected (the run-insert throw below).
  const settled = await Promise.allSettled(
    winners.map(async (agent): Promise<"done" | "failed"> => {
      const { data: run } = await db
        .from("runs")
        .insert({ agent_id: agent.id })
        .select("id")
        .single();
      if (!run) throw new Error(`cron/tick: failed to insert run row for agent ${agent.id}`);

      try {
        const { items, costUsd, usage, trace } = await runScan(
          { beat: agent.beat, handles: agent.handles, scanFrequency: agent.freq },
          new Date(),
          new Date(agent.firedAt),
        );
        await db
          .from("runs")
          .update({
            status: "done",
            result: { items } as Json,
            cost_usd: costUsd,
            usage: usage as Json,
            trace: trace as Json,
            finished_at: new Date().toISOString(),
          })
          .eq("id", run.id)
          .eq("status", "running"); // guard: sweep may have failed it
        return "done";
      } catch (e) {
        await db
          .from("runs")
          .update({
            status: "failed",
            error: e instanceof Error ? e.message : String(e),
            finished_at: new Date().toISOString(),
          })
          .eq("id", run.id)
          .eq("status", "running");
        return "failed";
      }
    }),
  );

  const done = settled.filter((r) => r.status === "fulfilled" && r.value === "done").length;
  const failed = settled.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value === "failed"),
  ).length;

  return Response.json({ due: due?.length ?? 0, claimed: winners.length, done, failed });
}
