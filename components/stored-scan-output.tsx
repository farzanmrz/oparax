import { ScanResult } from "@/components/scan-result"
import type { KnowledgeHeadline } from "@/lib/workflow-drafting"
import { parseStoredScanRunOutput } from "@/lib/workflow-drafting"

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
        const sourceUrls = getHeadlineSourceUrls(headline)

        return (
          <article
            key={headline.id}
            className="rounded-[1.75rem] border border-border/70 bg-card px-4 py-4 shadow-sm sm:px-5"
          >
            <div className="space-y-4">
              <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                {headline.title}
              </h3>
              <p className="text-sm leading-7 text-muted-foreground">
                {headline.aggregatedContext}
              </p>
              <SourceLinks urls={sourceUrls} />
            </div>
          </article>
        )
      })}
    </div>
  )
}
