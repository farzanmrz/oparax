import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { WorkspacePageHeader } from "@/components/dashboard/workspace-page-header"
import { PlusIcon } from "@/components/dashboard/shell-icons"
import type { Agent } from "@/lib/types"

// The agent fields the list renders.
type AgentRow = Pick<
  Agent,
  "id" | "name" | "monitored_handles" | "status" | "created_at"
>

/**
 * Agents list — the connected dashboard landing (design state 3). Lists the
 * signed-in user's saved agents (RLS-scoped) with an active "New agent" action;
 * each row links to the agent's detail page. Empty state (state 2) prompts the
 * first create. Renders into the shell provided by the dashboard layout.
 * @returns the agents list page
 */
export default async function AgentsPage() {
  const supabase = await createClient()

  // Connection gate: the agents list is only for connected users. Without X
  // linked, send them to the connect-X landing (where "New agent" is disabled) —
  // matching the index router and the sidebar's Agents link. Closes the gap where
  // a direct hit / OAuth-cancel redirect to /dashboard/agents showed an active
  // "New agent" with no connection. Fetched in parallel with the agents list.
  const [{ data: connection }, { data }] = await Promise.all([
    supabase.from("x_connections").select("id").maybeSingle<{ id: string }>(),
    supabase
      .from("agents")
      .select("id, name, monitored_handles, status, created_at")
      .order("created_at", { ascending: false }),
  ])

  if (!connection) {
    redirect("/dashboard/connect-x")
  }

  const agents = (data ?? []) as AgentRow[]

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
            const count = agent.monitored_handles.length
            return (
              <Link
                key={agent.id}
                href={`/dashboard/agents/${agent.id}`}
                className="ws-agent-card"
              >
                <div className="ws-agent-main">
                  <span className="ws-agent-name">{agent.name}</span>
                  <div className="ws-agent-handles">
                    {agent.monitored_handles.slice(0, 6).map((handle) => (
                      <span key={handle} className="wbadge">
                        @{handle.replace(/^@/, "")}
                      </span>
                    ))}
                    {count > 6 && <span className="wbadge">+{count - 6}</span>}
                  </div>
                </div>
                <span
                  className="ws-status"
                  data-active={agent.status === "active"}
                >
                  <span className="dot" />
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
