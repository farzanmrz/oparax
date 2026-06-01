// Imports
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Agent } from "@/lib/types"

// The agent fields the list renders.
type AgentRow = Pick<
  Agent,
  "id" | "name" | "monitored_handles" | "status" | "created_at"
>

/**
 * Agents list — the dashboard landing view. Lists the signed-in user's saved
 * agents (RLS-scoped) with a Create-new action; each row links to the agent's
 * detail page (built later). Empty state prompts the first create.
 * @returns the agents list page
 */
export default async function AgentsPage() {
  const supabase = await createClient()

  // RLS scopes this to the signed-in user's own agents.
  const { data } = await supabase
    .from("agents")
    .select("id, name, monitored_handles, status, created_at")
    .order("created_at", { ascending: false })

  const agents = (data ?? []) as AgentRow[]

  return (
    <div className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title="Agents"
        description="Your saved agents. Open one to review its runs, or create a new one."
        action={{ href: "/dashboard/agents/new", label: "Create new agent" }}
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-2 md:px-4">
        {agents.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No agents yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/dashboard/agents/${agent.id}`}
              className="rounded-xl transition-colors hover:bg-muted/40"
            >
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-base font-medium text-foreground">
                      {agent.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {agent.monitored_handles.length} handle
                      {agent.monitored_handles.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Badge
                    variant={agent.status === "active" ? "default" : "secondary"}
                  >
                    {agent.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
