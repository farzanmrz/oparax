"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Cancel01Icon,
  NoteIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  countTweetCharacters,
  TWEET_CHAR_LIMIT,
} from "@/lib/workflow-drafting"

interface DraftProfileEditorProps {
  monitoringDescription: string
  draftingInstructions: string
  exampleInputs: string[]
  exampleErrors: string[]
  onMonitoringDescriptionChange: (value: string) => void
  onDraftingInstructionsChange: (value: string) => void
  onExampleChange: (index: number, value: string) => void
  onAddExample: () => void
  onRemoveExample: (index: number) => void
}

export function DraftProfileEditor({
  monitoringDescription,
  draftingInstructions,
  exampleInputs,
  exampleErrors,
  onMonitoringDescriptionChange,
  onDraftingInstructionsChange,
  onExampleChange,
  onAddExample,
  onRemoveExample,
}: DraftProfileEditorProps) {
  return (
    <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={1.8} className="size-4" />
          Drafting Profile
        </CardTitle>
        <CardDescription>
          Define what to monitor, then shape how every drafted tweet should read.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.18em]">
                Scan Input
              </Badge>
            </div>
            <label className="mb-2 block text-sm font-semibold">
              What to monitor
            </label>
            <Textarea
              value={monitoringDescription}
              onChange={(event) => onMonitoringDescriptionChange(event.target.value)}
              placeholder="e.g. Premier League transfer movement, injury developments, and manager comments involving the top six clubs."
              rows={6}
            />
            <p className="mt-2 text-xs leading-normal text-muted-foreground">
              This guides the aggregation prompt and decides which headlines appear in the knowledge bank.
            </p>
          </section>

          <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Badge className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.18em]">
                Required
              </Badge>
            </div>
            <label className="mb-2 block text-sm font-semibold">
              Drafting instructions
            </label>
            <Textarea
              value={draftingInstructions}
              onChange={(event) =>
                onDraftingInstructionsChange(event.target.value)
              }
              placeholder="e.g. Start directly with the news, sound authoritative, avoid emojis, and keep the wording tight enough for a single tweet."
              rows={6}
            />
            <p className="mt-2 text-xs leading-normal text-muted-foreground">
              These rules shape the drafting prompt and are required before drafts can be generated.
            </p>
          </section>
        </div>

        <section className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={NoteIcon} strokeWidth={1.8} className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Example tweets</h3>
              </div>
              <p className="text-xs leading-normal text-muted-foreground">
                Add a few reference tweets so Grok can mirror your tone, structure, and cadence.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onAddExample}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={1.8} className="size-4" />
              Add Example
            </Button>
          </div>

          {exampleInputs.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
              No examples yet. Add one if you want the drafts to mimic a specific voice.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {exampleInputs.map((example, index) => {
                const charCount = countTweetCharacters(example)
                const isOverflow = charCount > TWEET_CHAR_LIMIT

                return (
                  <div
                    key={`example-${index}`}
                    className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">
                        Example {index + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs ${
                            isOverflow ? "text-destructive" : "text-muted-foreground"
                          }`}
                        >
                          {charCount}/{TWEET_CHAR_LIMIT}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveExample(index)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={`Remove example ${index + 1}`}
                        >
                          <HugeiconsIcon
                            icon={Cancel01Icon}
                            strokeWidth={1.8}
                            className="size-4"
                          />
                        </button>
                      </div>
                    </div>
                    <Textarea
                      value={example}
                      onChange={(event) => onExampleChange(index, event.target.value)}
                      placeholder="Paste an example tweet that represents your ideal voice."
                      rows={4}
                    />
                    {exampleErrors[index] && (
                      <p className="mt-2 text-xs text-destructive">
                        {exampleErrors[index]}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
