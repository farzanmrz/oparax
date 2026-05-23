"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldLabel,
} from "@/components/ui/field"
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
  showMonitoringDescription?: boolean
  variant?: "card" | "embedded"
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
  showMonitoringDescription = true,
  variant = "card",
}: DraftProfileEditorProps) {
  const content = (
    <div className="space-y-6">
      <div
        className={
          showMonitoringDescription
            ? "grid gap-5 lg:grid-cols-2"
            : "grid gap-5"
        }
      >
        {showMonitoringDescription && (
          <Field>
            <FieldLabel htmlFor="monitoring-description">
              What to monitor
            </FieldLabel>
            <Textarea
              id="monitoring-description"
              value={monitoringDescription}
              onChange={(event) =>
                onMonitoringDescriptionChange(event.target.value)
              }
              placeholder="e.g. Premier League transfer movement, injury developments, and manager comments involving the top six clubs."
              rows={6}
            />
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="drafting-instructions">
            Drafting instructions
          </FieldLabel>
          <Textarea
            id="drafting-instructions"
            value={draftingInstructions}
            onChange={(event) =>
              onDraftingInstructionsChange(event.target.value)
            }
            placeholder="e.g. Start directly with the news, sound authoritative, avoid emojis, and keep the wording tight enough for a single tweet."
            rows={6}
          />
        </Field>
      </div>

      <section className="rounded-xl border border-border/80 bg-background/70 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Example tweets</h3>
          <Button type="button" variant="outline" size="sm" onClick={onAddExample}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={1.8} className="size-4" />
            Add Example
          </Button>
        </div>

        {exampleInputs.length > 0 && (
          <div className="mt-4 space-y-3">
            {exampleInputs.map((example, index) => {
              const charCount = countTweetCharacters(example)
              const isOverflow = charCount > TWEET_CHAR_LIMIT
              const exampleId = `example-tweet-${index}`

              return (
                <div
                  key={`example-${index}`}
                  className="rounded-lg border border-border/70 bg-card/80 p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <FieldLabel htmlFor={exampleId}>
                      Example {index + 1}
                    </FieldLabel>
                    <div className="flex items-center gap-2">
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
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                    id={exampleId}
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
    </div>
  )

  if (variant === "embedded") {
    return content
  }

  return (
    <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/20 py-0">
      <CardContent className="p-5 sm:p-6">
        {content}
      </CardContent>
    </Card>
  )
}
