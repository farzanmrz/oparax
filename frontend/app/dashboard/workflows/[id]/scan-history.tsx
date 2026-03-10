"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScanResult } from "@/components/scan-result"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ScanRun } from "./page"

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

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  completed: "default",
  running: "secondary",
  failed: "destructive",
}

export function ScanHistory({ scanRuns }: { scanRuns: ScanRun[] }) {
  // Sort most recent first
  const sorted = [...scanRuns].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )

  // Most recent scan auto-expanded
  const [expandedId, setExpandedId] = useState<string | null>(sorted[0]?.id ?? null)

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-3">
      <Separator />
      <h3 className="text-sm font-semibold">Scan History</h3>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((run) => (
              <TableRow
                key={run.id}
                className="cursor-pointer"
                onClick={() => toggleExpand(run.id)}
              >
                <TableCell className="text-sm">
                  {timeAgo(run.started_at)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(run.started_at).toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[run.status] ?? "secondary"} className="text-xs">
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {run.item_count ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Expanded scan result */}
      {expandedId && (() => {
        const run = sorted.find((r) => r.id === expandedId)
        if (!run?.raw_output) return null

        return (
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Scan from {new Date(run.started_at).toLocaleString()}
              </span>
              <Badge variant={statusVariant[run.status] ?? "secondary"} className="text-xs">
                {run.status}
              </Badge>
            </div>
            <ScanResult outputText={run.raw_output} />
          </div>
        )
      })()}
    </div>
  )
}
