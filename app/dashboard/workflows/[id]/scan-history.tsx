"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { ScanItem, ScanRun } from "./page"

function titleCase(value: string) {
  if (!value) return "Unknown"

  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ")
}

function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString))
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "border-foreground bg-foreground text-background"
    case "failed":
      return "border-destructive/20 bg-destructive/10 text-destructive"
    case "running":
      return "border-border bg-secondary text-secondary-foreground"
    default:
      return "border-border bg-muted text-muted-foreground"
  }
}

function getItemSourceUrls(item: ScanItem) {
  return [
    ...new Set(
      [
        item.primary_tweet_url,
        ...item.supporting_tweet_urls,
        ...item.source_urls,
      ]
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ]
}

function SourceLinks({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-medium text-muted-foreground">Sources</p>
      <div className="flex flex-col gap-1.5">
        {urls.map((url) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="break-all text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            {url}
          </a>
        ))}
      </div>
    </div>
  )
}

export function ScanHistory({ scanRuns }: { scanRuns: ScanRun[] }) {
  const sorted = useMemo(
    () =>
      [...scanRuns].sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      ),
    [scanRuns],
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (sorted.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No scan runs yet.
          </div>
        </CardContent>
      </Card>
    )
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const expandedRun = expandedId
    ? sorted.find((run) => run.id === expandedId)
    : null

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Scan history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-foreground/5">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/35 hover:bg-muted/35">
                  <TableHead className="min-w-64 px-5 py-4">
                    Run time
                  </TableHead>
                  <TableHead className="min-w-32 px-5 py-4">
                    Status
                  </TableHead>
                  <TableHead className="min-w-36 px-5 py-4">
                    Source
                  </TableHead>
                  <TableHead className="px-5 py-4 text-right">
                    Total
                  </TableHead>
                  <TableHead className="px-5 py-4 text-right">New</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((run) => {
                  const isSelected = expandedId === run.id

                  return (
                    <TableRow
                      key={run.id}
                      data-state={isSelected ? "selected" : undefined}
                      className="group h-16 cursor-pointer border-border hover:bg-muted/45"
                      role="button"
                      tabIndex={0}
                      aria-expanded={isSelected}
                      onClick={() => toggleExpand(run.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          toggleExpand(run.id)
                        }
                      }}
                    >
                      <TableCell className="px-5 py-4">
                        <span className="block text-[0.98rem] font-semibold">
                          {formatDateTime(run.started_at)}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "min-w-20 justify-center",
                            statusBadgeClass(run.status),
                          )}
                        >
                          {titleCase(run.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-[0.96rem] text-muted-foreground">
                        {titleCase(run.source)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right text-[0.98rem] font-semibold tabular-nums">
                        {run.item_count ?? 0}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right text-[0.98rem] font-semibold tabular-nums">
                        {run.new_item_count ?? 0}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {expandedRun && (
        <Card>
          <CardHeader>
            <CardTitle>
              Scan results: {formatDateTime(expandedRun.started_at)}
            </CardTitle>
            <CardAction>
              <Badge
                variant="outline"
                className={cn(
                  "min-w-20 justify-center",
                  statusBadgeClass(expandedRun.status),
                )}
              >
                {titleCase(expandedRun.status)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {expandedRun.error_message ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {expandedRun.error_message}
              </p>
            ) : (
              <ScanRunItems items={expandedRun.scanItems} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ScanRunItems({ items }: { items: ScanItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
        No scan items returned for this run.
      </p>
    )
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const sourceUrls = getItemSourceUrls(item)

        return (
          <article
            key={item.id}
            className="rounded-xl border border-border/70 bg-card px-4 py-4 shadow-sm transition-all sm:px-5"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <div className="text-right text-xs leading-5 text-muted-foreground">
                  {item.published_at && (
                    <p>Published {formatDateTime(item.published_at)}</p>
                  )}
                  {item.first_seen_at && (
                    <p>First seen {formatDateTime(item.first_seen_at)}</p>
                  )}
                </div>
              </div>

              <p className="max-w-4xl text-base leading-7 text-foreground/90">
                {item.aggregated_context}
              </p>

              <SourceLinks urls={sourceUrls} />
            </div>
          </article>
        )
      })}
    </div>
  )
}
