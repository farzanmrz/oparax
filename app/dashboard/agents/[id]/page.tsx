// Imports
import { notFound } from "next/navigation";
import { AgentDetail } from "@/components/agents/agent-detail";
import { WorkspacePageHeader } from "@/components/dashboard/workspace-page-header";
import { columnsToConfig } from "@/lib/chat/config";
import { createClient } from "@/lib/supabase/server";
import type { Agent, Run, RunItem } from "@/lib/types";

type AgentDetailRow = Agent;

type RunRow = Pick<
  Run,
  | "id"
  | "status"
  | "started_at"
  | "completed_at"
  | "cost_usd"
  | "x_search_count"
  | "item_count"
  | "error_message"
>;

type ItemRow = Pick<
  RunItem,
  | "id"
  | "run_id"
  | "story_title"
  | "story_summary"
  | "source_urls"
  | "primary_tweet_url"
  | "drafted_text"
  | "final_text"
  | "status"
  | "x_tweet_url"
  | "error_message"
>;

/**
 * Saved-agent detail page. Server-loads owner-scoped agent settings, the latest
 * run + its run items, and X-connection state; passes them to the client island.
 * X tokens are never loaded here — only `xConnected` boolean is forwarded.
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

  // Load agent (all columns — columnsToConfig needs the full row).
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle<AgentDetailRow>();

  if (!agent) notFound();

  // Load the latest run only (run-history list is deferred to a later track).
  const { data: latestRunRow } = await supabase
    .from("runs")
    .select(
      "id, status, started_at, completed_at, cost_usd, x_search_count, item_count, error_message",
    )
    .eq("agent_id", id)
    .order("started_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle<RunRow>();

  // Load run items for that run (if it exists).
  let latestRunItems: ItemRow[] = [];
  if (latestRunRow) {
    const { data: itemRows } = await supabase
      .from("run_items")
      .select(
        "id, run_id, story_title, story_summary, source_urls, primary_tweet_url, drafted_text, final_text, status, x_tweet_url, error_message",
      )
      .eq("run_id", latestRunRow.id)
      .order("created_at", {
        ascending: true,
      });
    latestRunItems = (itemRows ?? []) as ItemRow[];
  }

  // X connection — boolean only, never expose tokens.
  const { data: connection } = await supabase.from("x_connections").select("id").maybeSingle<{
    id: string;
  }>();

  const config = columnsToConfig(agent);

  return (
    <>
      <WorkspacePageHeader title={agent.name} />
      <AgentDetail
        agent={agent}
        config={config}
        latestRun={latestRunRow ?? null}
        latestRunItems={latestRunItems}
        xConnected={Boolean(connection)}
      />
    </>
  );
}
