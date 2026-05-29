"use client"

// Imports
import { useState } from "react"
import { TWEET_WEIGHTED_LIMIT, weightedLength } from "@/lib/draft/count"
import { getDraftIssue } from "@/lib/draft/validate"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PreviewStory, ScanStreamEvent } from "@/lib/scan/stream"

// Metrics lifted to the parent so the saved scan can record them
export interface PreviewMetricsView {
  costUsd: number | null
  xSearchCalls: number | null
}

// The current monitor-form field values the preview runs against
export interface PreviewFields {
  handles: string[]
  monitoringDescription: string
  draftingInstructions: string
  exampleTweets: string[]
  scanFrom: string
  scanTo: string
}

// A previewed story plus its (ephemeral) draft-preview state
interface PreviewStoryView extends PreviewStory {
  draftText?: string
  drafting?: boolean
  draftError?: string | null
}

/**
 * Parse one NDJSON line into a scan event, or null if invalid.
 * @param line - one NDJSON line
 * @returns the parsed event or null
 */
function parseScanEvent(line: string): ScanStreamEvent | null {
  if (!line.trim()) return null
  try {
    const parsed = JSON.parse(line) as unknown
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed &&
      typeof (parsed as { type: unknown }).type === "string"
    ) {
      return parsed as ScanStreamEvent
    }
  } catch {
    return null
  }
  return null
}

/**
 * Optional preview before saving a monitor: runs a scan from the current form
 * fields (no save), shows the stories + per-story draft preview, and lifts the
 * final stories + metrics to the parent so they persist on save.
 * @param props.fields - the current monitor-form values
 * @param props.onPreview - called with the previewed stories + metrics on completion
 * @returns the preview panel UI
 */
export function MonitorScanPreview({
  fields,
  onPreview,
}: {
  fields: PreviewFields
  onPreview: (stories: PreviewStory[], metrics: PreviewMetricsView) => void
}) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  )
  const [reasoning, setReasoning] = useState("")
  const [toolCount, setToolCount] = useState(0)
  const [stories, setStories] = useState<PreviewStoryView[]>([])
  const [metrics, setMetrics] = useState<PreviewMetricsView | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Apply one event to local state; returns true for terminal events
  function applyEvent(event: ScanStreamEvent | null): boolean {
    if (!event) return false

    // Route each event type to its state update.
    switch (event.type) {
      case "reasoning_delta":
        setReasoning((prev) => prev + event.text)
        return false
      case "tool_call_started":
        setToolCount((count) => count + 1)
        return false
      case "tool_call_input_delta":
      case "tool_call_completed":
      case "persisted":
        return false
      case "preview_complete": {
        const view = event.stories.map((story) => ({ ...story }))
        const next: PreviewMetricsView = {
          costUsd: event.metrics.costUsd,
          xSearchCalls: event.metrics.xSearchCalls,
        }
        setStories(view)
        setMetrics(next)
        setStatus("done")
        onPreview(event.stories, next)
        return true
      }
      case "error":
        setError(event.message)
        setStatus("error")
        return true
    }
  }

  // Run a preview scan from current form field values.
  async function runPreview() {
    if (status === "running") return
    if (fields.handles.length === 0) {
      setError("Add at least one handle to preview a scan.")
      return
    }
    setStatus("running")
    setReasoning("")
    setToolCount(0)
    setStories([])
    setMetrics(null)
    setError(null)

    try {

      // Fetch the scan stream from the API.
      const response = await fetch("/api/scan-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handles: fields.handles,
          monitoringDescription: fields.monitoringDescription,
          scanFrom: fields.scanFrom || null,
          scanTo: fields.scanTo || null,
        }),
      })
      if (!response.ok) {
        throw new Error((await response.text()) || "Preview scan failed.")
      }
      if (!response.body) {
        throw new Error("Preview scan returned no stream.")
      }

      // Read + parse the NDJSON stream line by line.
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let pendingLine = ""
      let sawTerminalEvent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        pendingLine += decoder.decode(value, { stream: true })

        // Split on newlines and process complete lines.
        const lines = pendingLine.split("\n")
        pendingLine = lines.pop() ?? ""

        for (const line of lines) {
          if (applyEvent(parseScanEvent(line))) sawTerminalEvent = true
        }
      }

      // Handle any remaining partial line.
      pendingLine += decoder.decode()
      if (pendingLine.trim() && applyEvent(parseScanEvent(pendingLine))) {
        sawTerminalEvent = true
      }
      if (!sawTerminalEvent) {
        throw new Error("Preview scan ended before returning output.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview scan failed.")
      setStatus("error")
    }
  }

  // Generate a draft preview for one of the scanned stories.
  async function generateDraftPreview(index: number) {
    const story = stories[index]
    setStories((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, drafting: true, draftError: null } : item,
      ),
    )

    try {

      // Fetch the draft from the API.
      const response = await fetch("/api/draft-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: story.title,
          storySummary: story.summary,
          monitoringDescription: fields.monitoringDescription,
          draftingInstructions: fields.draftingInstructions,
          exampleTweets: fields.exampleTweets,
        }),
      })
      const data = (await response.json()) as { text?: string; error?: string }
      if (!response.ok || typeof data.text !== "string") {
        throw new Error(data.error || "Draft preview failed.")
      }

      setStories((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, drafting: false, draftText: data.text } : item,
        ),
      )
    } catch (err) {
      setStories((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                drafting: false,
                draftError:
                  err instanceof Error ? err.message : "Draft preview failed.",
              }
            : item,
        ),
      )
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">Preview (optional)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test your handles + instructions before saving. The previewed scan
            is kept when you create the monitor.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={runPreview}
          pending={status === "running"}
          disabled={status === "running"}
        >
          {status === "running" ? "Scanning…" : "Run preview scan"}
        </Button>
      </CardHeader>

      {(status !== "idle" || reasoning) && (
        <CardContent className="flex flex-col gap-4">
          {reasoning && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Reasoning · {toolCount} tool call{toolCount === 1 ? "" : "s"}
              </span>
              <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                {reasoning}
              </p>
            </div>
          )}

          {metrics && (
            <p className="text-sm text-muted-foreground">
              {stories.length} stor{stories.length === 1 ? "y" : "ies"}
              {metrics.xSearchCalls !== null
                ? ` · ${metrics.xSearchCalls} x_search`
                : ""}
              {metrics.costUsd !== null
                ? ` · $${metrics.costUsd.toFixed(6)}`
                : ""}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {stories.map((story, index) => {
            const count = story.draftText ? weightedLength(story.draftText) : 0
            const issue = story.draftText
              ? getDraftIssue(story.draftText)
              : null
            return (
              <div
                key={`${story.dedupeKey}-${index}`}
                className="flex flex-col gap-2 rounded-lg border border-border p-3"
              >
                <span className="text-sm font-medium">{story.title}</span>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {story.summary}
                </p>
                {story.draftText ? (
                  <div className="flex flex-col gap-1 rounded-md bg-muted/40 p-2">
                    <p className="whitespace-pre-wrap text-sm">
                      {story.draftText}
                    </p>
                    <span
                      className={
                        count > TWEET_WEIGHTED_LIMIT
                          ? "text-xs text-destructive"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {count} / {TWEET_WEIGHTED_LIMIT}
                    </span>
                    {issue && (
                      <span className="text-xs text-destructive">{issue}</span>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => generateDraftPreview(index)}
                    pending={story.drafting}
                    disabled={story.drafting}
                  >
                    Preview draft
                  </Button>
                )}
                {story.draftError && (
                  <span className="text-xs text-destructive">
                    {story.draftError}
                  </span>
                )}
              </div>
            )
          })}
        </CardContent>
      )}
    </Card>
  )
}
