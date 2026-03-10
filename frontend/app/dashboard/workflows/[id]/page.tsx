import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { TriggerScanPanel } from "./trigger-scan-panel"
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
  frequency: string
  status: string
  last_run_at: string | null
  scan_runs: ScanRun[]
}

const frequencyLabels: Record<string, string> = {
  "15m": "Every 15 min",
  "30m": "Every 30 min",
  "1h": "Every hour",
  "2h": "Every 2 hours",
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
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
        Back to workflows
      </Link>

      {/* Header — workflow-level info */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{workflow.name}</h1>
            <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
              {workflow.status === "active" ? "Active" : "Paused"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{workflow.description}</p>
        </div>
      </div>

      <Separator />

      {/* Trigger cards — each trigger has its own config + scan action */}
      {(workflow.triggers as Trigger[])?.map((trigger) => {
        const handles = trigger.config?.handles ?? []

        return (
          <Card key={trigger.id}>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">X Search Trigger</h2>
                <Badge variant="outline">{trigger.type}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <InfoItem label="Frequency" value={frequencyLabels[trigger.frequency] ?? trigger.frequency} />
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

              {/* Scan action — per trigger */}
              <TriggerScanPanel
                triggerId={trigger.id}
                description={trigger.config?.description ?? ""}
                handles={handles}
              />

              {/* Scan history */}
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
