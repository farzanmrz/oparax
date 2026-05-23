import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getHeadlineTweetUrls,
  parseStoredScanRunOutput,
} from "@/lib/workflow-drafting"
import { ScanHistory } from "./scan-history"
import { DeleteWorkflowButton } from "./delete-workflow-button"
import { RunScanButton } from "./run-scan-button"

export type ScanItem = {
  id: string
  title: string
  aggregated_context: string
  evidence_points: string[]
  primary_tweet_url: string
  supporting_tweet_urls: string[]
  source_handles: string[]
  source_urls: string[]
  published_at: string | null
  first_seen_at: string | null
}

export type ScanRun = {
  id: string
  trigger_id: string
  status: string
  raw_output: string | null
  item_count: number | null
  new_item_count: number
  source: string
  error_message: string | null
  started_at: string
  completed_at: string | null
  newItems: ScanItem[]
  scanItems: ScanItem[]
}

type TriggerConfig = {
  handles?: string[]
  description?: string
}

type Trigger = {
  id: string
  type: string
  config: TriggerConfig | null
  frequency_amount: number | null
  frequency_unit: string | null
  status: string
  last_run_at: string | null
  next_run_at: string | null
}

function formatFrequency(
  amount: number | null | undefined,
  unit: string | null | undefined,
) {
  if (!amount || !unit) return "Not scheduled"

  const unitLabels: Record<string, [string, string]> = {
    m: ["minute", "minutes"],
    h: ["hour", "hours"],
    d: ["day", "days"],
    w: ["week", "weeks"],
  }
  const labels = unitLabels[unit]
  if (!labels) return "Not scheduled"

  return `Every ${amount} ${amount === 1 ? labels[0] : labels[1]}`
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "Not set"
  return new Date(dateString).toLocaleString()
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function getRawOutputScanItems(
  run: Omit<ScanRun, "newItems" | "scanItems">,
): ScanItem[] {
  const parsed = parseStoredScanRunOutput(run.raw_output)

  if (!parsed || parsed.kind !== "knowledge_bank") {
    return []
  }

  return parsed.knowledgeBank.headlines.map((headline, index) => ({
    id: `${run.id}-${headline.id || index}`,
    title: headline.title,
    aggregated_context: headline.aggregatedContext,
    evidence_points: headline.evidencePoints,
    primary_tweet_url: headline.primaryTweetUrl,
    supporting_tweet_urls: getHeadlineTweetUrls(headline).filter(
      (url) => url !== headline.primaryTweetUrl,
    ),
    source_handles: headline.sourceHandles,
    source_urls: headline.sourceUrls,
    published_at: headline.publishedAt ?? null,
    first_seen_at: null,
  }))
}

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: workflow } = await supabase
    .from("workflows")
    .select(
      "id, name, description, status, drafting_instructions, example_tweets, triggers(id, type, config, frequency_amount, frequency_unit, status, last_run_at, next_run_at)",
    )
    .eq("id", id)
    .single()

  if (!workflow) notFound()

  const triggers = ((workflow.triggers ?? []) as Trigger[]).map((trigger) => ({
    ...trigger,
    config: trigger.config ?? {},
  }))
  const triggerIds = triggers.map((trigger) => trigger.id)
  const { data: scanRunRows } =
    triggerIds.length > 0
      ? await supabase
          .from("scan_runs")
          .select(
            "id, trigger_id, status, raw_output, item_count, new_item_count, source, error_message, started_at, completed_at",
          )
          .in("trigger_id", triggerIds)
          .order("started_at", { ascending: false })
      : { data: [] }

  const scanRuns = (scanRunRows ?? []) as Omit<
    ScanRun,
    "newItems" | "scanItems"
  >[]
  const scanRunIds = scanRuns.map((run) => run.id)
  const { data: scanItemRows } =
    scanRunIds.length > 0
      ? await supabase
          .from("scan_items")
          .select(
            "id, title, aggregated_context, evidence_points, primary_tweet_url, supporting_tweet_urls, source_handles, source_urls, published_at, first_seen_at, first_scan_run_id",
          )
          .eq("workflow_id", workflow.id)
          .in("first_scan_run_id", scanRunIds)
          .order("first_seen_at", { ascending: false })
      : { data: [] }

  const itemsByRun = new Map<string, ScanItem[]>()
  for (const row of scanItemRows ?? []) {
    const firstScanRunId =
      typeof row.first_scan_run_id === "string" ? row.first_scan_run_id : null
    if (!firstScanRunId) continue

    const items = itemsByRun.get(firstScanRunId) ?? []
    items.push({
      id: row.id,
      title: row.title,
      aggregated_context: row.aggregated_context,
      evidence_points: getStringArray(row.evidence_points),
      primary_tweet_url: row.primary_tweet_url,
      supporting_tweet_urls: getStringArray(row.supporting_tweet_urls),
      source_handles: getStringArray(row.source_handles),
      source_urls: getStringArray(row.source_urls),
      published_at: row.published_at,
      first_seen_at: row.first_seen_at,
    })
    itemsByRun.set(firstScanRunId, items)
  }

  const runsWithItems: ScanRun[] = scanRuns.map((run) => {
    const newItems = itemsByRun.get(run.id) ?? []
    const rawItems = getRawOutputScanItems(run)

    return {
      ...run,
      newItems,
      scanItems: run.raw_output ? rawItems : newItems,
    }
  })
  const exampleTweets = getStringArray(workflow.example_tweets)

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-2 md:px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="truncate text-3xl font-semibold tracking-tight text-heading">
          {workflow.name}
        </h1>
        <DeleteWorkflowButton
          workflowId={workflow.id}
          workflowName={workflow.name}
        />
      </div>

      {triggers.map((trigger) => {
        const handles = getStringArray(trigger.config?.handles)
        const triggerRuns = runsWithItems.filter(
          (run) => run.trigger_id === trigger.id,
        )

        return (
          <div key={trigger.id} className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow settings</CardTitle>
                <CardAction>
                  <RunScanButton triggerId={trigger.id} />
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem
                    label="Status"
                    value={workflow.status === "active" ? "Active" : "Paused"}
                  />
                  <InfoItem
                    label="Frequency"
                    value={formatFrequency(
                      trigger.frequency_amount,
                      trigger.frequency_unit,
                    )}
                  />
                  <InfoItem
                    label="Last run"
                    value={formatDate(trigger.last_run_at)}
                  />
                  <InfoItem
                    label="Next run"
                    value={formatDate(trigger.next_run_at)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Monitored accounts
                  </span>
                  {handles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {handles.map((handle) => (
                        <Badge
                          key={handle}
                          variant="secondary"
                          className="font-mono"
                        >
                          @{handle}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No account filter.
                    </p>
                  )}
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      What to monitor
                    </span>
                    <p className="rounded-lg border border-border bg-muted/25 p-3 text-sm leading-6 text-foreground/90">
                      {trigger.config?.description ??
                        workflow.description ??
                        "No monitoring brief saved."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Drafting instructions
                    </span>
                    <p className="rounded-lg border border-border bg-muted/25 p-3 text-sm leading-6 text-foreground/90">
                      {workflow.drafting_instructions ||
                        "No instructions saved."}
                    </p>
                  </div>
                </div>

                {exampleTweets.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Example tweets
                    </span>
                    <div className="grid gap-2 md:grid-cols-2">
                      {exampleTweets.map((example, index) => (
                        <p
                          key={`${index}-${example}`}
                          className="rounded-lg border border-border bg-muted/25 p-3 text-sm leading-6 text-foreground/90"
                        >
                          {example}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <ScanHistory scanRuns={triggerRuns} />
          </div>
        )
      })}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-muted/25 p-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <p className="break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
