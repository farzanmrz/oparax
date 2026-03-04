import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Workflow = {
  id: string
  name: string
  status: string
  frequency: string
  handles: string[]
  last_run_at: string | null
}

const frequencyLabels: Record<string, string> = {
  "15m": "Every 15 min",
  "30m": "Every 30 min",
  "1h": "Every hour",
  "2h": "Every 2 hours",
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

export function WorkflowCard({ workflow }: { workflow: Workflow }) {
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
              {frequencyLabels[workflow.frequency] ?? workflow.frequency}
              {" · "}
              {workflow.handles.length} {workflow.handles.length === 1 ? "handle" : "handles"} monitored
              {workflow.last_run_at && (
                <>
                  {" · "}
                  Last run: {timeAgo(workflow.last_run_at)}
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
