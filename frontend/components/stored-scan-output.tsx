"use client"

import { Badge } from "@/components/ui/badge"
import { ScanResult } from "@/components/scan-result"
import { TweetUrlGrid } from "@/components/tweet-url-grid"
import { parseStoredScanRunOutput } from "@/lib/workflow-drafting"

export function StoredScanOutput({ rawOutput }: { rawOutput: string }) {
  const parsed = parseStoredScanRunOutput(rawOutput)

  if (!parsed) {
    return null
  }

  if (parsed.kind === "legacy") {
    return <ScanResult outputText={parsed.text} />
  }

  return (
    <div className="space-y-4">
      {parsed.knowledgeBank.headlines.map((headline) => {
        const supportingTweetUrls = headline.supportingTweetUrls.filter(
          (url) => url !== headline.primaryTweetUrl,
        )

        return (
          <article
            key={headline.id}
            className="rounded-[1.75rem] border border-border/70 bg-card px-4 py-4 shadow-sm sm:px-5"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {headline.sourceHandles.map((handle) => (
                  <Badge
                    key={`${headline.id}-${handle}`}
                    variant="secondary"
                    className="rounded-full px-2.5 py-0.5 font-mono text-[11px]"
                  >
                    @{handle}
                  </Badge>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                  {headline.title}
                </h3>
                <p className="text-sm leading-7 text-muted-foreground">
                  {headline.aggregatedContext}
                </p>
              </div>

              {headline.evidencePoints.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2">
                  {headline.evidencePoints.map((point) => (
                    <div
                      key={`${headline.id}-${point}`}
                      className="rounded-2xl border border-border/70 bg-background/80 px-3 py-3 text-sm leading-6 text-foreground/90"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              )}

              {headline.primaryTweetUrl && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Primary source
                  </p>
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
            </div>
          </article>
        )
      })}
    </div>
  )
}
