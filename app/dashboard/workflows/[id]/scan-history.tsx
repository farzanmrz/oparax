"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { TweetUrlGrid } from "@/components/tweet-url-grid"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ScanItem, ScanRun } from "./page"

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

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ")
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  completed: "default",
  running: "secondary",
  failed: "destructive",
}

export function ScanHistory({ scanRuns }: { scanRuns: ScanRun[] }) {
  const sorted = [...scanRuns].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  )
  const [expandedId, setExpandedId] = useState<string | null>(sorted[0]?.id ?? null)

  if (sorted.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        No scan runs yet.
      </div>
    )
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const expandedRun = expandedId
    ? sorted.find((run) => run.id === expandedId)
    : null

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">New</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((run) => (
              <TableRow
                key={run.id}
                className="cursor-pointer"
                onClick={() => toggleExpand(run.id)}
              >
                <TableCell>
                  <span className="font-medium">{timeAgo(run.started_at)}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {new Date(run.started_at).toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[run.status] ?? "secondary"}>
                    {titleCase(run.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {titleCase(run.source)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {run.item_count ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {run.new_item_count ?? 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {expandedRun && (
        <div className="rounded-md border p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {new Date(expandedRun.started_at).toLocaleString()}
              </p>
              {expandedRun.completed_at && (
                <p className="text-sm text-muted-foreground">
                  Completed {new Date(expandedRun.completed_at).toLocaleString()}
                </p>
              )}
            </div>
            <Badge variant={statusVariant[expandedRun.status] ?? "secondary"}>
              {titleCase(expandedRun.status)}
            </Badge>
          </div>

          {expandedRun.error_message ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {expandedRun.error_message}
            </p>
          ) : (
            <ScanRunItems items={expandedRun.newItems} />
          )}
        </div>
      )}
    </div>
  )
}

function ScanRunItems({ items }: { items: ScanItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
        No new items added.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const supportingTweetUrls = item.supporting_tweet_urls.filter(
          (url) => url !== item.primary_tweet_url,
        )

        return (
          <article
            key={item.id}
            className="rounded-md border bg-card p-4 shadow-sm shadow-foreground/5"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  {item.source_handles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.source_handles.map((handle) => (
                        <Badge
                          key={`${item.id}-${handle}`}
                          variant="secondary"
                          className="font-mono text-[11px]"
                        >
                          @{handle}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.first_seen_at).toLocaleString()}
                </span>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                {item.aggregated_context}
              </p>

              {item.evidence_points.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2">
                  {item.evidence_points.map((point) => (
                    <p
                      key={`${item.id}-${point}`}
                      className="rounded-md border bg-muted/25 p-3 text-sm leading-6"
                    >
                      {point}
                    </p>
                  ))}
                </div>
              )}

              {item.primary_tweet_url && (
                <TweetUrlGrid urls={[item.primary_tweet_url]} limit={1} />
              )}
              {supportingTweetUrls.length > 0 && (
                <TweetUrlGrid urls={supportingTweetUrls} />
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
