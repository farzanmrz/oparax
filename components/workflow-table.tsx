import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type ScanRun = {
  id: string
  item_count: number | null
  new_item_count?: number | null
  status: string
}

type Trigger = {
  frequency_amount: number | null
  frequency_unit: string | null
  last_run_at: string | null
  scan_runs?: ScanRun[]
}

export type WorkflowTableWorkflow = {
  id: string
  name: string
  status: string
  triggers: Trigger[]
}

type WorkflowTableRow = {
  id: string
  name: string
  frequency: string
  lastRun: string
  scans: number
  newItems: number
  status: string
  href?: string
  isDemo?: boolean
}

const demoRows: WorkflowTableRow[] = [
  {
    id: "demo-premier-league",
    name: "Sample: Premier League Watch",
    frequency: "Every 30 min",
    lastRun: "May 6, 2026, 9:42 AM",
    scans: 18,
    newItems: 7,
    status: "active",
    isDemo: true,
  },
  {
    id: "demo-transfer-window",
    name: "Sample: Transfer Window Desk",
    frequency: "Every hour",
    lastRun: "May 6, 2026, 8:15 AM",
    scans: 12,
    newItems: 4,
    status: "active",
    isDemo: true,
  },
  {
    id: "demo-injury-alerts",
    name: "Sample: Injury Alerts",
    frequency: "Every 2 hours",
    lastRun: "May 5, 2026, 7:30 PM",
    scans: 9,
    newItems: 2,
    status: "paused",
    isDemo: true,
  },
]

function formatDate(dateString: string | null) {
  if (!dateString) return "Not run yet"

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString))
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

function titleCase(value: string) {
  if (!value) return "Unknown"

  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ")
}

function toWorkflowRows(workflows: WorkflowTableWorkflow[]) {
  return workflows.map((workflow): WorkflowTableRow => {
    const trigger = workflow.triggers?.[0]
    const scanRuns = trigger?.scan_runs ?? []
    const newItems = scanRuns.reduce(
      (total, run) => total + (run.new_item_count ?? 0),
      0,
    )

    return {
      id: workflow.id,
      name: workflow.name,
      frequency: formatFrequency(
        trigger?.frequency_amount,
        trigger?.frequency_unit,
      ),
      lastRun: formatDate(trigger?.last_run_at ?? null),
      scans: scanRuns.length,
      newItems,
      status: workflow.status,
      href: `/dashboard/workflows/${workflow.id}`,
    }
  })
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "border-foreground bg-foreground text-background"
    case "deleted":
    case "archived":
      return "border-destructive/20 bg-destructive/10 text-destructive"
    case "paused":
    case "inactive":
      return "border-border bg-secondary text-secondary-foreground"
    default:
      return "border-border bg-muted text-muted-foreground"
  }
}

export function WorkflowTable({
  showDemoRows = true,
  workflows,
}: {
  showDemoRows?: boolean
  workflows: WorkflowTableWorkflow[]
}) {
  const hasLiveRows = workflows.length > 0
  const rows = hasLiveRows ? toWorkflowRows(workflows) : showDemoRows ? demoRows : []

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-foreground/5">
      <Table>
        <TableHeader>
          <TableRow className="border-border bg-muted/35 hover:bg-muted/35">
            <TableHead className="min-w-64 px-5 py-4">
              Workflow name
            </TableHead>
            <TableHead className="min-w-44 px-5 py-4">
              Triggered frequency
            </TableHead>
            <TableHead className="min-w-52 px-5 py-4">
              Last run date
            </TableHead>
            <TableHead className="px-5 py-4 text-right">
              Scans
            </TableHead>
            <TableHead className="px-5 py-4 text-right">
              New items
            </TableHead>
            <TableHead className="px-5 py-4 text-right">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                "group h-16 border-border hover:bg-muted/45",
                row.isDemo && "text-muted-foreground"
              )}
            >
              <TableCell className="px-5 py-4">
                {row.href ? (
                  <Link
                    href={row.href}
                    className="inline-flex max-w-80 items-center gap-2 rounded-sm text-[0.98rem] font-semibold text-foreground underline-offset-4 transition-colors hover:text-foreground/75 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate">{row.name}</span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                      className="size-4 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                ) : (
                  <span className="text-[0.98rem] font-semibold">
                    {row.name}
                  </span>
                )}
              </TableCell>
              <TableCell className="px-5 py-4 text-[0.96rem] text-muted-foreground">
                {row.frequency}
              </TableCell>
              <TableCell className="px-5 py-4 text-[0.96rem] text-muted-foreground">
                {row.lastRun}
              </TableCell>
              <TableCell className="px-5 py-4 text-right text-[0.98rem] font-semibold tabular-nums">
                {row.scans}
              </TableCell>
              <TableCell className="px-5 py-4 text-right text-[0.98rem] font-semibold tabular-nums">
                {row.newItems}
              </TableCell>
              <TableCell className="px-5 py-4 text-right">
                <Badge
                  variant="outline"
                  className={cn(
                    "min-w-16 justify-center",
                    statusBadgeClass(row.status)
                  )}
                >
                  {titleCase(row.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}
