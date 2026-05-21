import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Trigger = {
  frequency_amount: number | null
  frequency_unit: string | null
  config: { handles?: string[]; description?: string }
  last_run_at: string | null
}

type Workflow = {
  id: string
  name: string
  status: string
  triggers: Trigger[]
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
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

export function WorkflowCard({ workflow }: { workflow: Workflow }) {
  // Use the first trigger (currently each workflow has one x_search trigger)
  const trigger = workflow.triggers?.[0]
  const handles = trigger?.config?.handles ?? []
  const frequency = formatFrequency(
    trigger?.frequency_amount,
    trigger?.frequency_unit,
  )
  const lastRunAt = trigger?.last_run_at ?? null

  return (
    <Link href={`/dashboard/workflows/${workflow.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{workflow.name}</span>
              <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                {workflow.status === "active" ? "Active" : "Paused"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {frequency}
              {" · "}
              {handles.length} {handles.length === 1 ? "handle" : "handles"} monitored
              {lastRunAt && (
                <>
                  {" · "}
                  Last run: {timeAgo(lastRunAt)}
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
