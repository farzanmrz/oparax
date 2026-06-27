// Imports
import { notFound } from "next/navigation";
import { AgentDetail } from "@/components/agents/agent-detail";
import { WorkspacePageHeader } from "@/components/dashboard/workspace-page-header";
import { columnsToConfig } from "@/lib/chat/config";
import { createClient } from "@/lib/supabase/server";
import type { Agent, DetailItemRow as ItemRow, DetailRunRow as RunRow } from "@/lib/types";

type AgentDetailRow = Agent;

/**
 * Saved-agent detail page. Server-loads owner-scoped agent settings, the recent
 * runs (last ~20) + their run items, and X-connection state; passes them to the
 * client island. X tokens are never loaded here — only `xConnected` boolean is
 * forwarded.
 * @param props.params - dynamic agent id
 * @returns the saved-agent workbench
 */
export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // These three loads are independent — fire them concurrently (D4).
  const [agentRes, runsRes, connectionRes] = await Promise.all([
    // Load agent (all columns — columnsToConfig needs the full row).
    supabase.from("agents").select("*").eq("id", id).maybeSingle<AgentDetailRow>(),
    // Load the recent runs (last ~20) for the Drafts worklist.
    supabase
      .from("runs")
      .select(
        "id, status, started_at, completed_at, cost_usd, x_search_count, item_count, error_message, source",
      )
      .eq("agent_id", id)
      .order("started_at", { ascending: false })
      .limit(20),
    // X connection — boolean only, never expose tokens.
    supabase.from("x_connections").select("id").maybeSingle<{ id: string }>(),
  ]);

  const agent = agentRes.data;
  if (!agent) notFound();

  const runs = (runsRes.data ?? []) as RunRow[];

  // Load all items for the recent runs in a single `in (runIds)` query.
  let items: ItemRow[] = [];
  if (runs.length > 0) {
    const { data: itemRows } = await supabase
      .from("run_items")
      .select(
        "id, run_id, story_title, story_summary, source_urls, primary_tweet_url, drafted_text, final_text, status, x_tweet_url, posted_at, posted_via, error_message, created_at",
      )
      .in(
        "run_id",
        runs.map((r) => r.id),
      )
      .order("created_at", { ascending: false });
    items = (itemRows ?? []) as ItemRow[];
  }

  const config = columnsToConfig(agent);

  return (
    <>
      <WorkspacePageHeader title={agent.name} />
      <AgentDetail
        agent={agent}
        config={config}
        runs={runs}
        items={items}
        xConnected={Boolean(connectionRes.data)}
      />
    </>
  );
}
