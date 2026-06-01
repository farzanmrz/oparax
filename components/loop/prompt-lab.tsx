"use client"

// Imports
import { useRef, useState } from "react"
import {
  DEFAULT_HANDLES,
  DEFAULT_RUN_NAME,
  DEFAULT_SCAN_USER_PROMPT,
} from "@/lib/scan/defaults"
import { DEFAULT_DRAFTING_INSTRUCTIONS } from "@/lib/draft/defaults"
import { MONITOR_MAX_HANDLES } from "@/lib/scan/handles"
import { TWEET_WEIGHTED_LIMIT, weightedLength } from "@/lib/draft/count"
import { getDraftIssue } from "@/lib/draft/validate"
import { cn } from "@/lib/utils"
import { HandleInput } from "@/components/handle-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { PreviewStory, ScanStreamEvent } from "@/lib/scan/stream"

type ToolCallOutput = {
  id: string
  name: string
  input: string
}

type DraftStatus = "idle" | "drafting" | "done" | "posting" | "posted" | "error"

type DraftState = {
  text: string
  status: DraftStatus
  error: string | null
  postUrl: string | null
}

const EMPTY_DRAFT_STATE: DraftState = {
  text: "",
  status: "idle",
  error: null,
  postUrl: null,
}

/**
 * Parse one NDJSON line into a scan event, or null if invalid.
 * @param line - one NDJSON line
 * @returns the parsed event, or null
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
 * Build a stable client-side key for one story in the current scan result.
 * @param story - the preview story
 * @param index - the story's current result index
 * @returns a key unique within the current scan
 */
function getStoryKey(story: PreviewStory, index: number): string {
  return `${story.dedupeKey}:${index}`
}

/**
 * Format a scan cost for the status line.
 * @param costUsd - server-reported cost, or null when unavailable
 * @returns a compact cost label
 */
function formatScanCost(costUsd: number | null): string {
  return costUsd === null ? "Cost unavailable" : `Cost $${costUsd.toFixed(6)}`
}

/**
 * Return a usable draft state object for a selected story.
 * @param draft - stored draft state
 * @returns the stored draft state or the empty default
 */
function getDraftState(draft: DraftState | undefined): DraftState {
  return draft ?? EMPTY_DRAFT_STATE
}

/**
 * Prompt-lab: prefilled operator inputs (name, handles, scan user prompt,
 * drafting instructions) drive a scan; pick a story, generate one draft, edit
 * it, and post a real tweet. System prompts live in code. Nothing persists
 * until you post.
 * @returns the prompt-lab UI
 */
export function PromptLab() {
  // Operator inputs (prefilled, editable). System prompts are in code.
  const [name, setName] = useState(DEFAULT_RUN_NAME)
  const [handles, setHandles] = useState<string[]>(DEFAULT_HANDLES)
  const [scanUserPrompt, setScanUserPrompt] = useState(DEFAULT_SCAN_USER_PROMPT)
  const [draftingInstructions, setDraftingInstructions] = useState(
    DEFAULT_DRAFTING_INSTRUCTIONS,
  )

  // Scan run state.
  const [scanStatus, setScanStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle")
  const [reasoning, setReasoning] = useState("")
  const [toolCalls, setToolCalls] = useState<ToolCallOutput[]>([])
  const [scanCost, setScanCost] = useState<number | null>(null)
  const [stories, setStories] = useState<PreviewStory[]>([])
  const [scanError, setScanError] = useState<string | null>(null)
  const [selectedStoryKeys, setSelectedStoryKeys] = useState<string[]>([])
  const selectedStoryKeysRef = useRef<string[]>([])

  // Draft + post state.
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})
  const draftBatchRef = useRef(0)

  function addHandle(handle: string) {
    setHandles((prev) => [...prev, handle])
  }

  function removeHandle(index: number) {
    setHandles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  function getSelectedStoryEntries() {
    const selected = new Set(selectedStoryKeys)
    return stories
      .map((story, index) => ({
        story,
        index,
        key: getStoryKey(story, index),
      }))
      .filter((entry) => selected.has(entry.key))
  }

  function toggleStory(story: PreviewStory, index: number) {
    const key = getStoryKey(story, index)
    setSelectedStoryKeys((prev) => {
      if (!prev.includes(key)) {
        const next = [...prev, key]
        selectedStoryKeysRef.current = next
        return next
      }

      setDrafts((draftsByKey) => {
        const next = { ...draftsByKey }
        delete next[key]
        return next
      })
      const next = prev.filter((item) => item !== key)
      selectedStoryKeysRef.current = next
      return next
    })
  }

  function updateDraft(
    key: string,
    updater: (draft: DraftState) => DraftState,
  ) {
    setDrafts((prev) => ({
      ...prev,
      [key]: updater(getDraftState(prev[key])),
    }))
  }

  // Apply one stream event to scan state; returns true for terminal events.
  function applyScanEvent(event: ScanStreamEvent | null): boolean {
    if (!event) return false
    switch (event.type) {
      case "reasoning_delta":
        setReasoning((prev) => prev + event.text)
        return false
      case "tool_call_started":
        setToolCalls((prev) => [
          ...prev,
          { id: event.id, name: event.name, input: "" },
        ])
        return false
      case "tool_call_input_delta":
        setToolCalls((prev) =>
          prev.some((toolCall) => toolCall.id === event.id)
            ? prev.map((toolCall) =>
                toolCall.id === event.id
                  ? { ...toolCall, input: toolCall.input + event.text }
                  : toolCall,
              )
            : [
                ...prev,
                { id: event.id, name: "tool_call", input: event.text },
              ],
        )
        return false
      case "tool_call_completed":
        setToolCalls((prev) =>
          prev.some((toolCall) => toolCall.id === event.id)
            ? prev.map((toolCall) =>
                toolCall.id === event.id
                  ? { ...toolCall, input: event.input }
                  : toolCall,
              )
            : [
                ...prev,
                { id: event.id, name: "tool_call", input: event.input },
              ],
        )
        return false
      case "persisted":
        return false
      case "preview_complete":
        setStories(event.stories)
        setScanCost(event.metrics.costUsd)
        setScanStatus("done")
        return true
      case "error":
        setScanError(event.message)
        setScanStatus("error")
        return true
    }
  }

  // Run a scan from the current handles + scan user prompt.
  async function runScan() {
    if (scanStatus === "running") return
    if (handles.length === 0) {
      setScanError("Add at least one handle to scan.")
      return
    }
    draftBatchRef.current += 1
    setScanStatus("running")
    setReasoning("")
    setToolCalls([])
    setScanCost(null)
    setStories([])
    selectedStoryKeysRef.current = []
    setSelectedStoryKeys([])
    setDrafts({})
    setScanError(null)

    try {
      const response = await fetch("/api/test/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles, userPrompt: scanUserPrompt }),
      })
      if (!response.ok) {
        throw new Error((await response.text()) || "Scan failed.")
      }
      if (!response.body) {
        throw new Error("Scan returned no stream.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let pendingLine = ""
      let sawTerminalEvent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        pendingLine += decoder.decode(value, { stream: true })
        const lines = pendingLine.split("\n")
        pendingLine = lines.pop() ?? ""
        for (const line of lines) {
          if (applyScanEvent(parseScanEvent(line))) sawTerminalEvent = true
        }
      }
      pendingLine += decoder.decode()
      if (pendingLine.trim() && applyScanEvent(parseScanEvent(pendingLine))) {
        sawTerminalEvent = true
      }
      if (!sawTerminalEvent) {
        throw new Error("Scan ended before returning output.")
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed.")
      setScanStatus("error")
    }
  }

  // Generate drafts for every selected story from the drafting instructions.
  async function generateDrafts() {
    const entries = getSelectedStoryEntries()
    if (entries.length === 0) return

    const batchId = draftBatchRef.current + 1
    draftBatchRef.current = batchId

    for (const { key } of entries) {
      updateDraft(key, (draft) => ({
        ...draft,
        status: "drafting",
        error: null,
        postUrl: null,
      }))
    }

    await Promise.all(
      entries.map(async ({ key, story }) => {
        try {
          const response = await fetch("/api/test/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              draftingInstructions,
              storyTitle: story.title,
              storySummary: story.summary,
            }),
          })
          const data = (await response.json()) as {
            text?: string
            error?: string
          }
          if (!response.ok || typeof data.text !== "string") {
            throw new Error(data.error || "Draft failed.")
          }
          const text = data.text
          if (
            batchId !== draftBatchRef.current ||
            !selectedStoryKeysRef.current.includes(key)
          ) {
            return
          }
          updateDraft(key, () => ({
            text,
            status: "done",
            error: null,
            postUrl: null,
          }))
        } catch (err) {
          if (
            batchId !== draftBatchRef.current ||
            !selectedStoryKeysRef.current.includes(key)
          ) {
            return
          }
          updateDraft(key, (draft) => ({
            ...draft,
            status: "error",
            error: err instanceof Error ? err.message : "Draft failed.",
            postUrl: null,
          }))
        }
      }),
    )
  }

  // Post one edited draft as a real tweet.
  async function postDraft(key: string, story: PreviewStory) {
    const draft = getDraftState(drafts[key])
    if (!draft.text.trim()) return

    updateDraft(key, (current) => ({
      ...current,
      status: "posting",
      error: null,
      postUrl: null,
    }))

    try {
      const response = await fetch("/api/test/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          text: draft.text,
          storyTitle: story.title,
          storySummary: story.summary,
          sourceUrls: story.sourceUrls,
        }),
      })
      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Post failed.")
      }
      if (!selectedStoryKeysRef.current.includes(key)) return
      updateDraft(key, (current) => ({
        ...current,
        status: "posted",
        error: null,
        postUrl: data.url ?? null,
      }))
    } catch (err) {
      if (!selectedStoryKeysRef.current.includes(key)) return
      updateDraft(key, (current) => ({
        ...current,
        status: "error",
        error: err instanceof Error ? err.message : "Post failed.",
        postUrl: null,
      }))
    }
  }

  const storyEntries = stories.map((story, index) => ({
    story,
    index,
    key: getStoryKey(story, index),
  }))
  const selectedStorySet = new Set(selectedStoryKeys)
  const selectedStoryEntries = storyEntries.filter((entry) =>
    selectedStorySet.has(entry.key),
  )
  const isDraftingSelectedStories = selectedStoryEntries.some(
    ({ key }) => getDraftState(drafts[key]).status === "drafting",
  )
  const hasDraftOutput = selectedStoryEntries.some(({ key }) => {
    const draft = getDraftState(drafts[key])
    return draft.text || draft.status === "drafting" || draft.error
  })
  const hasScanOutput =
    scanStatus === "running" ||
    reasoning ||
    toolCalls.length > 0 ||
    scanStatus === "done"

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-2 md:px-4">
      <Card>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 lg:grid-cols-[minmax(11rem,1fr)_minmax(0,4fr)]">
              <Field>
                <FieldLabel htmlFor="prompt-lab-name">Agent Name</FieldLabel>
                <Input
                  id="prompt-lab-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel>X accounts to monitor</FieldLabel>
                <HandleInput
                  handles={handles}
                  maxHandles={MONITOR_MAX_HANDLES}
                  showCount={false}
                  onAdd={addHandle}
                  onRemove={removeHandle}
                />
              </Field>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="prompt-lab-scanning-instructions">
                  Scanning instructions
                </FieldLabel>
                <Textarea
                  id="prompt-lab-scanning-instructions"
                  value={scanUserPrompt}
                  onChange={(event) => setScanUserPrompt(event.target.value)}
                  rows={8}
                  className="min-h-52 resize-y"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="prompt-lab-drafting-instructions">
                  Drafting instructions
                </FieldLabel>
                <Textarea
                  id="prompt-lab-drafting-instructions"
                  value={draftingInstructions}
                  onChange={(event) =>
                    setDraftingInstructions(event.target.value)
                  }
                  rows={8}
                  className="min-h-52 resize-y"
                />
              </Field>
            </div>

            {scanStatus !== "running" && (
              <div className="flex justify-start">
                <Button onClick={runScan}>
                  Run scan
                </Button>
              </div>
            )}

            {hasScanOutput && (
              <div className="flex flex-col gap-4 border-l border-border pl-4">
                <div className="flex flex-wrap items-center gap-2 text-base leading-6 text-muted-foreground">
                  {scanStatus === "running" && (
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-link animate-pulse"
                    />
                  )}
                  <span className="font-semibold text-foreground/90">
                    Reasoning
                  </span>
                  <span>·</span>
                  {scanStatus === "running" ? (
                    <span>Agents thinking</span>
                  ) : (
                    <span>
                      {toolCalls.length} tool call
                      {toolCalls.length === 1 ? "" : "s"} ·{" "}
                      {formatScanCost(scanCost)} · {stories.length} stor
                      {stories.length === 1 ? "y" : "ies"}
                    </span>
                  )}
                </div>

                {reasoning && (
                  <p className="whitespace-pre-wrap text-base leading-6">
                    {reasoning}
                  </p>
                )}

                {toolCalls.map((toolCall) => (
                  <div key={toolCall.id} className="flex flex-col gap-1 pl-4">
                    <p className="text-base leading-6">
                      <span className="font-semibold text-foreground/90">
                        {toolCall.name}
                      </span>
                      :
                    </p>
                    {toolCall.input && (
                      <p className="whitespace-pre-wrap pl-4 text-base leading-6 text-muted-foreground">
                        {toolCall.input}
                      </p>
                    )}
                  </div>
                ))}

                {stories.length > 0 && (
                  <div
                    className="grid gap-3 pt-2 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]"
                    aria-label="Scan results"
                  >
                    {storyEntries.map(({ story, index, key }) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={selectedStorySet.has(key)}
                        onClick={() => toggleStory(story, index)}
                        className={cn(
                          "min-h-20 cursor-pointer rounded-lg border border-border bg-background/35 px-3.5 py-3 text-left text-base leading-6 transition-colors outline-none hover:border-foreground/35 hover:bg-background/45 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                          selectedStorySet.has(key) &&
                            "border-ring bg-background/55",
                        )}
                      >
                        <span className="font-[525] text-foreground/90">
                          {story.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {scanError && <FieldError>{scanError}</FieldError>}
          </FieldGroup>
        </CardContent>
      </Card>

      {selectedStoryEntries.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-start">
            <Button
              onClick={generateDrafts}
              pending={isDraftingSelectedStories}
              disabled={isDraftingSelectedStories}
            >
              {hasDraftOutput ? "Regenerate drafts" : "Generate drafts"}
            </Button>
          </div>

          {hasDraftOutput && (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))]">
              {selectedStoryEntries.map(({ story, key }) => {
                const draft = getDraftState(drafts[key])
                const draftCount = draft.text ? weightedLength(draft.text) : 0
                const draftIssue = draft.text ? getDraftIssue(draft.text) : null
                const isPosting = draft.status === "posting"

                if (!draft.text && draft.status !== "drafting" && !draft.error) {
                  return null
                }

                return (
                  <Card key={key} size="sm" className="min-w-0">
                    <CardContent className="flex h-full flex-col gap-3">
                      <Field data-invalid={draftIssue ? true : undefined}>
                        <FieldLabel htmlFor={`prompt-lab-draft-${key}`}>
                          {story.title}
                        </FieldLabel>
                        {draft.status === "drafting" ? (
                          <FieldDescription>Drafting...</FieldDescription>
                        ) : (
                          <Textarea
                            id={`prompt-lab-draft-${key}`}
                            value={draft.text}
                            onChange={(event) =>
                              updateDraft(key, (current) => ({
                                ...current,
                                text: event.target.value,
                                error: null,
                                postUrl: null,
                              }))
                            }
                            rows={5}
                            className="resize-y"
                            aria-invalid={draftIssue ? true : undefined}
                            disabled={isPosting}
                          />
                        )}
                        {draft.text && (
                          <FieldDescription
                            className={
                              draftCount > TWEET_WEIGHTED_LIMIT
                                ? "text-destructive"
                                : undefined
                            }
                          >
                            {draftCount} / {TWEET_WEIGHTED_LIMIT}
                          </FieldDescription>
                        )}
                        {draftIssue && <FieldError>{draftIssue}</FieldError>}
                        {draft.error && <FieldError>{draft.error}</FieldError>}
                        {draft.postUrl && (
                          <FieldDescription>
                            Posted{" "}
                            <a
                              href={draft.postUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View tweet
                            </a>
                          </FieldDescription>
                        )}
                      </Field>
                      {draft.text && (
                        <Button
                          onClick={() => postDraft(key, story)}
                          pending={isPosting}
                          disabled={isPosting || draftIssue !== null}
                          className="mt-auto self-start"
                        >
                          Post to X
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button disabled>
          Save agent
        </Button>
      </div>
    </div>
  )
}
