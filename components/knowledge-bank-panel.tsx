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
import type { KnowledgeBank } from "@/lib/workflow-drafting"
import { TweetUrlGrid } from "@/components/tweet-url-grid"

const workflowActionButtonClass =
  "h-10 bg-teal-600 px-4 text-white shadow-sm shadow-teal-950/20 hover:-translate-y-px hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-950/25 active:translate-y-0 active:scale-[0.99] active:bg-teal-700 active:shadow-inner dark:bg-teal-300 dark:text-zinc-950 dark:hover:bg-teal-200 dark:active:bg-teal-400"

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

function ExternalLinks({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-xs text-muted-foreground">
      <p className="mb-2 font-medium text-foreground">Source links</p>
      <div className="space-y-2">
        {urls.slice(0, 4).map((url, index) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="block truncate text-primary underline underline-offset-2"
          >
            Source {index + 1}
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
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {scanError}
        </div>
      )}

      {!knowledgeBank && !isScanning && variant === "card" && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          Run a scan to turn X results into a source-grounded research bank of selectable angles.
        </div>
      )}

      {isScanning && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-10 text-center text-sm text-muted-foreground">
          Oparax is searching recent X results and clustering them into atomic knowledge items...
        </div>
      )}

      {knowledgeBank?.headlines.length === 0 && !isScanning && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          No relevant knowledge items were found in the current scan window.
        </div>
      )}

      {knowledgeBank && knowledgeBank.headlines.length > 0 && (
        <div className="grid gap-4">
          {knowledgeBank.headlines.map((headline) => {
            const isSelected = selectedHeadlineIds.includes(headline.id)
            const supportingTweetUrls = headline.supportingTweetUrls.filter(
              (url) => url !== headline.primaryTweetUrl,
            )

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
                      <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
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

                    <p className="max-w-4xl text-sm leading-6 text-foreground/90">
                      {headline.aggregatedContext}
                    </p>

                    {(headline.primaryTweetUrl || supportingTweetUrls.length > 0) && (
                      <section className="space-y-3">
                        {headline.primaryTweetUrl && (
                          <div>
                            <TweetUrlGrid urls={[headline.primaryTweetUrl]} limit={1} />
                          </div>
                        )}

                        {supportingTweetUrls.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              Supporting sources
                            </p>
                            <TweetUrlGrid urls={supportingTweetUrls} />
                          </div>
                        )}
                      </section>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 xl:w-52">
                    <Button
                      type="button"
                      variant={isSelected ? "secondary" : "outline"}
                      onClick={() => onToggleHeadline(headline.id)}
                      className="min-h-11"
                    >
                      {isSelected ? "Deselect" : "Select angle"}
                    </Button>

                    <ExternalLinks urls={headline.sourceUrls} />
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
              className={workflowActionButtonClass}
            >
              <HugeiconsIcon icon={NewsIcon} strokeWidth={1.8} className="size-4" />
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
