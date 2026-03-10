"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  SentIcon,
} from "@hugeicons/core-free-icons"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { DraftedTweet, KnowledgeHeadline } from "@/lib/workflow-drafting"

interface DraftPreviewPanelProps {
  drafts: DraftedTweet[]
  sourceHeadlines: KnowledgeHeadline[]
  canGenerateDrafts: boolean
  isDrafting: boolean
  draftError: string | null
  selectedCount: number
  onGenerateDrafts: () => void
}

export function DraftPreviewPanel({
  drafts,
  sourceHeadlines,
  canGenerateDrafts,
  isDrafting,
  draftError,
  selectedCount,
  onGenerateDrafts,
}: DraftPreviewPanelProps) {
  const sourceHeadlineMap = new Map(
    sourceHeadlines.map((headline) => [headline.id, headline]),
  )

  async function copyDraft(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Draft copied to clipboard.")
    } catch {
      toast.error("Could not copy draft.")
    }
  }

  return (
    <Card className="border-border/70 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={SentIcon} strokeWidth={1.8} className="size-4" />
              Draft Preview
            </CardTitle>
            <CardDescription>
              Generate one directly postable tweet per selected knowledge item.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="rounded-full px-2.5 py-1">
              {selectedCount} selected
            </Badge>
            <Button
              type="button"
              onClick={onGenerateDrafts}
              disabled={!canGenerateDrafts || isDrafting}
              className="min-h-11"
            >
              <HugeiconsIcon icon={SentIcon} strokeWidth={1.8} className="size-4" />
              {isDrafting ? "Drafting..." : "Generate Drafts"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {draftError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {draftError}
          </div>
        )}

        {isDrafting && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-10 text-center text-sm text-muted-foreground">
            Grok is drafting tweet-ready posts for the selected knowledge items...
          </div>
        )}

        {!isDrafting && drafts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
            Select at least one knowledge item, then generate drafts to preview directly postable copy here.
          </div>
        )}

        {drafts.length > 0 && (
          <div className="grid gap-4">
            {drafts.map((draft) => {
              const sourceHeadline = sourceHeadlineMap.get(draft.headlineId)

              return (
                <article
                  key={draft.headlineId}
                  className={`rounded-[1.75rem] border px-4 py-4 shadow-sm sm:px-5 ${
                    draft.isOverflow
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/70 bg-card"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={draft.isOverflow ? "destructive" : "secondary"}
                        className="rounded-full px-2.5 py-1"
                      >
                        {draft.charCount} chars
                      </Badge>
                      {!draft.isOverflow && (
                        <Badge variant="outline" className="rounded-full px-2.5 py-1">
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            strokeWidth={1.8}
                            className="size-3.5"
                          />
                          Ready
                        </Badge>
                      )}
                      {draft.isOverflow && (
                        <Badge variant="destructive" className="rounded-full px-2.5 py-1">
                          <HugeiconsIcon
                            icon={Alert02Icon}
                            strokeWidth={1.8}
                            className="size-3.5"
                          />
                          Over limit
                        </Badge>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyDraft(draft.text)}
                      className="min-h-11 sm:min-h-10"
                    >
                      <Copy className="size-4" />
                      Copy draft
                    </Button>
                  </div>

                  <div className="mt-4 rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-4">
                    <p className="whitespace-pre-wrap text-base leading-8 text-foreground sm:text-[1.02rem]">
                      {draft.text}
                    </p>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Based on:</span>{" "}
                      {draft.headlineTitle}
                    </p>

                    {sourceHeadline && sourceHeadline.sourceUrls.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span className="font-medium text-foreground">Sources used:</span>
                        {sourceHeadline.sourceUrls.slice(0, 3).map((url, index) => (
                          <a
                            key={`${draft.headlineId}-${url}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline underline-offset-2"
                          >
                            Source {index + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {draft.isOverflow && (
                      <p className="text-destructive">
                        This draft is shown for review but will not be included in the saved valid-drafts state.
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
