import { notFound } from "next/navigation";
import { scanFrequencySchema } from "@/lib/agent/scan-frequency";
import { newsItemSchema, scanResultSchema } from "@/lib/agent/scan-result";
import { createClient } from "@/lib/supabase/server";
import {
  AgentDashboard,
  type DeskDraft,
  type DeskRun,
  type UsageRollup,
  type UsageWindow,
} from "./agent-dashboard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sum non-null cost across every row in `rows` (grok + DeepSeek, ft/63's split), but
 * count only `done` runs as "runs" — a run's spend is incurred whether or not it
 * finished cleanly (xAI/DeepSeek are already billed by the time a run fails), but a
 * completed-work count crediting a still-running or failed attempt would overstate what
 * the desk actually delivered.
 */
function rollupWindow(
  rows: readonly { cost_grok: number | null; cost_deepseek: number | null; status: string }[],
): UsageWindow {
  return rows.reduce<UsageWindow>(
    (acc, row) => ({
      runs: acc.runs + (row.status === "done" ? 1 : 0),
      costUsd: acc.costUsd + (row.cost_grok ?? 0) + (row.cost_deepseek ?? 0),
    }),
    { runs: 0, costUsd: 0 },
  );
}

/**
 * Agent details page — the per-desk dashboard. Fetches the signed-in reporter's own
 * desk by `id` plus its runs, drafts, and a usage rollup; RLS scopes every query to
 * rows they own, so an absent row and another user's row are indistinguishable and
 * both 404. A malformed persisted scan frequency, run result, or draft item degrades
 * to fallback text/null rather than crashing the page.
 */
export default async function AgentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound(); // pre-empt a Postgres uuid cast error
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select(
      "name, beat, handles, drafting_instructions, account_tier, scan_frequency, status, next_run_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  // A failed query is NOT a 404 — a transient error must not tell the reporter
  // their desk is gone. Throw to the error boundary instead.
  if (error) throw new Error("Failed to load the desk. Please try again.");
  if (!data) notFound(); // absent OR another user's row — RLS makes them identical

  const scanFrequency = scanFrequencySchema.safeParse(data.scan_frequency);

  const [runsResult, draftsResult, usageResult] = await Promise.all([
    supabase
      .from("runs")
      .select("id, status, started_at, finished_at, cost_grok, cost_deepseek, result, trace")
      .eq("agent_id", id)
      .order("started_at", { ascending: false })
      .limit(50),
    supabase
      .from("drafts")
      .select("id, text, item, created_at")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    // Everything the usage rollup needs, unbounded (unlike the display query above) —
    // "all time" must see every run, not just the latest 50.
    supabase.from("runs").select("started_at, cost_grok, cost_deepseek, status").eq("agent_id", id),
  ]);

  if (runsResult.error) throw new Error("Failed to load the desk's runs. Please try again.");
  if (draftsResult.error) throw new Error("Failed to load the desk's drafts. Please try again.");
  if (usageResult.error) throw new Error("Failed to load the desk's usage. Please try again.");

  const runs: DeskRun[] = (runsResult.data ?? []).map((run) => {
    const result = scanResultSchema.safeParse(run.result);
    // DeskRun.costUsd stays TOTAL run cost (the dashboard, #65's territory, is unchanged):
    // grok + DeepSeek, but null when BOTH are null so "unknown cost" still renders as such
    // rather than a misleading $0.00.
    const costUsd =
      run.cost_grok == null && run.cost_deepseek == null
        ? null
        : (run.cost_grok ?? 0) + (run.cost_deepseek ?? 0);
    return {
      id: run.id,
      status: run.status,
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      costUsd,
      result: result.success ? result.data : null,
      trace: run.trace,
    };
  });

  const drafts: DeskDraft[] = (draftsResult.data ?? []).map((draft) => {
    const item = newsItemSchema.safeParse(draft.item);
    return {
      id: draft.id,
      text: draft.text,
      item: item.success ? item.data : null,
      createdAt: draft.created_at,
    };
  });

  const now = Date.now();
  const usageRows = usageResult.data ?? [];
  const within = (days: number) =>
    usageRows.filter((row) => now - new Date(row.started_at).getTime() <= days * DAY_MS);
  const usage: UsageRollup = {
    allTime: rollupWindow(usageRows),
    last30d: rollupWindow(within(30)),
    last7d: rollupWindow(within(7)),
  };

  return (
    <AgentDashboard
      agent={{
        id,
        name: data.name,
        beat: data.beat,
        handles: data.handles,
        draftingInstructions: data.drafting_instructions,
        accountTier: data.account_tier === "premium" ? "premium" : "standard",
        scanFrequency: scanFrequency.success ? scanFrequency.data : null,
        createdAt: data.created_at,
        status: data.status === "paused" ? "paused" : "active",
        nextRunAt: data.next_run_at,
      }}
      drafts={drafts}
      runs={runs}
      usage={usage}
    />
  );
}
