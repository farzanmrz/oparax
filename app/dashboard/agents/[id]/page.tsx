// Imports
import { notFound } from "next/navigation"
import { AgentDetail, type AgentDetailRun } from "@/components/loop/agent-detail"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/types/database"
import type { Agent, Run, RunItem } from "@/lib/types"

type AgentDetailRow = Pick<
  Agent,
  | "id"
  | "name"
  | "monitored_handles"
  | "monitoring_description"
  | "drafting_instructions"
  | "status"
>

type RunRow = Pick<
  Run,
  | "id"
  | "status"
  | "started_at"
  | "completed_at"
  | "cost_usd"
  | "x_search_count"
  | "item_count"
  | "inputs"
  | "error_message"
>

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
>

function getInputDraftingInstructions(inputs: Json | null): string {
  if (typeof inputs !== "object" || inputs === null || Array.isArray(inputs)) {
    return ""
  }
  const value = inputs.draftingInstructions
  return typeof value === "string" ? value : ""
}

/**
 * Saved-agent detail page. Server-loads owner-scoped settings, run history,
 * run items, and X-connection state; client island owns actions.
 * @param props.params - dynamic agent id
 * @returns the saved-agent workbench
 */
export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from("agents")
    .select(
      "id, name, monitored_handles, monitoring_description, drafting_instructions, status",
    )
    .eq("id", id)
    .maybeSingle<AgentDetailRow>()

  if (!agent) notFound()

  const { data: runRows } = await supabase
    .from("runs")
    .select(
      "id, status, started_at, completed_at, cost_usd, x_search_count, item_count, inputs, error_message",
    )
    .eq("agent_id", id)
    .order("started_at", { ascending: false })

  const runs = (runRows ?? []) as RunRow[]
  const runIds = runs.map((run) => run.id)
  const { data: itemRows } =
    runIds.length > 0
      ? await supabase
          .from("run_items")
          .select(
            "id, run_id, story_title, story_summary, source_urls, primary_tweet_url, drafted_text, final_text, status, x_tweet_url, error_message",
          )
          .in("run_id", runIds)
          .order("created_at", { ascending: true })
      : { data: [] }

  const itemsByRun = new Map<string, ItemRow[]>()
  for (const item of (itemRows ?? []) as ItemRow[]) {
    const items = itemsByRun.get(item.run_id) ?? []
    items.push(item)
    itemsByRun.set(item.run_id, items)
  }

  const detailRuns: AgentDetailRun[] = runs.map((run) => ({
    ...run,
    input_drafting_instructions: getInputDraftingInstructions(run.inputs),
    items: itemsByRun.get(run.id) ?? [],
  }))

  const { data: connection } = await supabase
    .from("x_connections")
    .select("id")
    .maybeSingle<{ id: string }>()

  return (
    <div className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title={agent.name}
      />
      <AgentDetail
        agent={agent}
        runs={detailRuns}
        xConnected={Boolean(connection)}
      />
    </div>
  )
}
