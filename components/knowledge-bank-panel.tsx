"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  NewsIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { KnowledgeBank, KnowledgeHeadline } from "@/lib/workflow-drafting"

interface KnowledgeBankPanelProps {
  knowledgeBank: KnowledgeBank | null
  selectedHeadlineIds: string[]
  canRunScan: boolean
  isScanning: boolean
  scanError: string | null
  onRunScan: () => void
  onToggleHeadline: (headlineId: string) => void
  variant?: "card" | "embedded"
}

function getHeadlineSourceUrls(headline: KnowledgeHeadline) {
  return [
    ...new Set(
      [
        headline.primaryTweetUrl,
        ...headline.supportingTweetUrls,
        ...headline.sourceUrls,
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

export function KnowledgeBankPanel({
  knowledgeBank,
  selectedHeadlineIds,
  canRunScan,
  isScanning,
  scanError,
  onRunScan,
  onToggleHeadline,
  variant = "card",
}: KnowledgeBankPanelProps) {
  const selectedCount = selectedHeadlineIds.length

  const content = (
    <>
      {scanError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive">
          {scanError}
        </div>
      )}

      {!knowledgeBank && !isScanning && variant === "card" && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-base text-muted-foreground">
          Run a scan to turn X results into a source-grounded research bank of selectable angles.
        </div>
      )}

      {isScanning && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-10 text-center text-base text-muted-foreground">
          Oparax is searching recent X results and clustering them into atomic knowledge items...
        </div>
      )}

      {knowledgeBank?.headlines.length === 0 && !isScanning && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-8 text-center text-base text-muted-foreground">
          No relevant knowledge items were found in the current scan window.
        </div>
      )}

      {knowledgeBank && knowledgeBank.headlines.length > 0 && (
        <div className="grid gap-4">
          {knowledgeBank.headlines.map((headline) => {
            const isSelected = selectedHeadlineIds.includes(headline.id)
            const sourceUrls = getHeadlineSourceUrls(headline)

            return (
              <article
                key={headline.id}
                className={`rounded-xl border px-4 py-4 shadow-sm transition-all sm:px-5 ${
                  isSelected
                    ? "border-primary/40 bg-primary/6 ring-1 ring-primary/15"
                    : "border-border/70 bg-card hover:border-primary/20 hover:bg-muted/20"
                }`}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">
                        {headline.title}
                      </h3>
                      {isSelected && (
                        <Badge className="w-fit rounded-full px-2.5 py-0.5">
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            strokeWidth={1.8}
                            className="size-3.5"
                          />
                          Selected
                        </Badge>
                      )}
                    </div>

                    <p className="max-w-4xl text-base leading-7 text-foreground/90">
                      {headline.aggregatedContext}
                    </p>

                    <SourceLinks urls={sourceUrls} />
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 xl:w-40">
                    <Button
                      type="button"
                      variant={isSelected ? "secondary" : "outline"}
                      onClick={() => onToggleHeadline(headline.id)}
                      className="min-h-11"
                    >
                      {isSelected ? "Deselect" : "Select angle"}
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )

  if (variant === "embedded") {
    return <div className="space-y-4">{content}</div>
  }

  return (
    <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/25">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-end gap-3">
            {knowledgeBank && (
              <Badge variant="outline" className="rounded-full px-2.5 py-1">
                {knowledgeBank.headlines.length} knowledge item
                {knowledgeBank.headlines.length === 1 ? "" : "s"}
              </Badge>
            )}
            {selectedCount > 0 && (
              <Badge className="rounded-full px-2.5 py-1">
                {selectedCount} selected
              </Badge>
            )}
            <Button
              type="button"
              onClick={onRunScan}
              disabled={!canRunScan || isScanning}
              pending={isScanning}
            >
              <HugeiconsIcon
                icon={NewsIcon}
                strokeWidth={1.8}
                data-icon="inline-start"
              />
              {isScanning ? "Scanning..." : "Run Scan"}
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  )
}
