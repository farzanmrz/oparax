import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { WorkflowDraftingStudio } from "@/components/workflow-drafting-studio"
import { getWorkflowDraftingScopeId } from "@/lib/workflow-drafting"
import { ScanHistory } from "./scan-history"

export type ScanRun = {
  id: string
  status: string
  raw_output: string | null
  item_count: number | null
  started_at: string
  completed_at: string | null
}

type Trigger = {
  id: string
  type: string
  config: { handles?: string[]; description?: string }
  frequency_amount: number | null
  frequency_unit: string | null
  status: string
  last_run_at: string | null
  scan_runs: ScanRun[]
}

function formatFrequency(amount: number | null | undefined, unit: string | null | undefined) {
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

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch workflow with trigger(s) and their scan runs
  const { data: workflow } = await supabase
    .from("workflows")
    .select("*, triggers(*, scan_runs(*))")
    .eq("id", id)
    .single()

  if (!workflow) notFound()

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <DashboardPageHeader
        title={workflow.name}
        description={workflow.description ?? undefined}
        breadcrumbs={[
          { label: "Workflows", href: "/dashboard" },
          { label: workflow.name },
        ]}
      />

      <Badge
        variant={workflow.status === "active" ? "default" : "secondary"}
        className="w-fit"
      >
        {workflow.status === "active" ? "Active" : "Paused"}
      </Badge>

      {/* Trigger cards — each trigger has its own config + scan action */}
      {(workflow.triggers as Trigger[])?.map((trigger) => {
        const handles = trigger.config?.handles ?? []

        return (
          <Card key={trigger.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>X Search Trigger</CardTitle>
                  <CardDescription>
                    Scan recent X results into a structured knowledge bank, then
                    draft tweets from the headlines you choose.
                  </CardDescription>
                </div>
                <Badge variant="outline">{trigger.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">

              <div className="grid grid-cols-2 gap-6">
                <InfoItem
                  label="Frequency"
                  value={formatFrequency(
                    trigger.frequency_amount,
                    trigger.frequency_unit,
                  )}
                />
                <InfoItem label="Status" value={trigger.status === "active" ? "Active" : "Paused"} />
              </div>

              {handles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Monitored accounts</span>
                  <div className="flex flex-wrap gap-2">
                    {handles.map((handle: string) => (
                      <Badge key={handle} variant="secondary" className="font-mono text-xs">
                        @{handle}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {trigger.last_run_at && (
                <p className="text-xs text-muted-foreground">
                  Last run: {new Date(trigger.last_run_at).toLocaleString()}
                </p>
              )}

              <WorkflowDraftingStudio
                storageId={getWorkflowDraftingScopeId(workflow.id, trigger.id)}
                triggerId={trigger.id}
                initialMonitoringDescription={trigger.config?.description ?? ""}
                handles={handles}
              />

              {trigger.scan_runs?.length > 0 && (
                <ScanHistory scanRuns={trigger.scan_runs} />
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <p className="text-sm">{value}</p>
    </div>
  )
}
