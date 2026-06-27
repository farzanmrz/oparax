import Link from "next/link";
import { PlusIcon } from "@/components/dashboard/shell-icons";
import { WorkspacePageHeader } from "@/components/dashboard/workspace-page-header";
import { createClient } from "@/lib/supabase/server";
import type { Agent } from "@/lib/types";

// The agent fields the list renders.
type AgentRow = Pick<Agent, "id" | "name" | "monitored_handles" | "status" | "created_at">;

// Reporter-facing status labels (the stored enum stays active/paused/inactive).
const STATUS_LABELS: Record<string, string> = {
  active: "Running",
  paused: "Paused",
  inactive: "Retired",
};

/**
 * Agents list — the connected dashboard landing (design state 3). Lists the
 * signed-in user's saved agents (RLS-scoped) with an active "New agent" action;
 * each row links to the agent's detail page. Empty state (state 2) prompts the
 * first create. Renders into the shell provided by the dashboard layout.
 * @returns the agents list page
 */
export default async function AgentsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("agents")
    .select("id, name, monitored_handles, status, created_at")
    .order("created_at", {
      ascending: false,
    });

  const agents = (data ?? []) as AgentRow[];

  // Count drafted, non-posted run_items per agent so each row can surface a
  // "N new drafts" badge. Owner-scoped: agentIds come from the RLS-scoped agents
  // query, so the .in() can only match the signed-in reporter's items. This is
  // "N drafted-unposted" (not a since-last-view delta) — no new table (spec §6).
  const agentIds = agents.map((a) => a.id);
  const draftCounts = new Map<string, number>();
  if (agentIds.length) {
    const { data: draftRows } = await supabase
      .from("run_items")
      .select("agent_id")
      .in("agent_id", agentIds)
      .eq("status", "drafted");
    for (const row of (draftRows ?? []) as { agent_id: string }[]) {
      draftCounts.set(row.agent_id, (draftCounts.get(row.agent_id) ?? 0) + 1);
    }
  }

  return (
    <>
      <WorkspacePageHeader
        title="Agents"
        action={
          <Link href="/dashboard/agents/new" className="btn btn-primary">
            <PlusIcon width={16} height={16} />
            <span>New agent</span>
          </Link>
        }
      />

      {agents.length === 0 ? (
        <div className="ws-empty">
          <p>No agents yet. Create your first one to start scanning X.</p>
        </div>
      ) : (
        <div className="ws-list">
          {agents.map((agent) => {
            const count = agent.monitored_handles.length;
            const newDrafts = draftCounts.get(agent.id) ?? 0;
            return (
              <Link key={agent.id} href={`/dashboard/agents/${agent.id}`} className="ws-agent-card">
                <div className="ws-agent-main">
                  <span className="ws-agent-name">
                    {agent.name}
                    {newDrafts > 0 && (
                      <span className="ws-newbadge">
                        {newDrafts} new draft{newDrafts === 1 ? "" : "s"}
                      </span>
                    )}
                  </span>
                  <div className="ws-agent-handles">
                    {agent.monitored_handles.slice(0, 6).map((handle) => (
                      <span key={handle} className="wbadge">
                        @{handle.replace(/^@/, "")}
                      </span>
                    ))}
                    {count > 6 && <span className="wbadge">+{count - 6}</span>}
                  </div>
                </div>
                <span className="ws-status" data-active={agent.status === "active"}>
                  <span className="dot" />
                  {STATUS_LABELS[agent.status] ??
                    agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
