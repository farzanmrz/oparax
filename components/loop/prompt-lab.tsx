"use client"

// Imports
import { useEffect, useRef, useState } from "react"
import { ChevronRight, HelpCircle } from "lucide-react"
import {
  DEFAULT_HANDLES,
  DEFAULT_RUN_NAME,
  DEFAULT_SCAN_USER_PROMPT,
} from "@/lib/scan/defaults"
import { DEFAULT_DRAFTING_INSTRUCTIONS } from "@/lib/draft/defaults"
import { MONITOR_MAX_HANDLES } from "@/lib/scan/handles"
import { cn } from "@/lib/utils"
import { HandleInput } from "@/components/handle-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
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

type HelpTopicName = "scan" | "draft"
type HelpTopic = HelpTopicName | null
type SaveStatus = "idle" | "saving" | "saved" | "error"

const HELP_COPY: Record<HelpTopicName, { title: string; body: string }> = {
  scan: {
    title: "Scanning instructions",
    body: "Use this to define what the agent should monitor, how strict it should be about story quality, and which kinds of posts should be ignored during the scan.",
  },
  draft: {
    title: "Drafting instructions",
    body: "Use this to describe the voice, formatting, angle, and posting style the agent should apply when it turns each scanned story into an X-ready draft.",
  },
}
const UNSAVED_WARNING =
  "Your prompt lab changes will be lost if you leave this page."

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

function getAgentFingerprint({
  handles,
  scanInstructions,
  draftingInstructions,
}: {
  handles: string[]
  scanInstructions: string
  draftingInstructions: string
}): string {
  return JSON.stringify({ handles, scanInstructions, draftingInstructions })
}

/**
 * Prompt-lab: prefilled operator inputs drive one agent run. The current API
 * still streams scan output; the UI is shaped for the combined scan+draft flow.
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

  // Agent run state.
  const [scanStatus, setScanStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle")
  const [reasoning, setReasoning] = useState("")
  const [toolCalls, setToolCalls] = useState<ToolCallOutput[]>([])
  const [scanCost, setScanCost] = useState<number | null>(null)
  const [stories, setStories] = useState<PreviewStory[]>([])
  const [scanError, setScanError] = useState<string | null>(null)
  const [selectedStoryKeys, setSelectedStoryKeys] = useState<string[]>([])

  // Page interaction state.
  const [helpTopic, setHelpTopic] = useState<HelpTopic>(null)
  const [isReasoningOpen, setIsReasoningOpen] = useState(false)
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastRunFingerprint, setLastRunFingerprint] = useState<string | null>(
    null,
  )
  const runFingerprintRef = useRef("")
  const allowHistoryNavigationRef = useRef(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasUnsavedChanges) return
    allowHistoryNavigationRef.current = false
    window.history.pushState(
      { promptLabUnsavedGuard: true },
      "",
      window.location.href,
    )

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (allowHistoryNavigationRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null
      if (!target || target.target || target.download) return

      const rawHref = target.getAttribute("href")
      if (
        !rawHref ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:")
      ) {
        return
      }

      const destination = new URL(target.href, window.location.href)
      const current = new URL(window.location.href)
      const isSamePage =
        destination.origin === current.origin &&
        destination.pathname === current.pathname &&
        destination.search === current.search
      if (isSamePage) return

      if (!window.confirm(UNSAVED_WARNING)) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      allowHistoryNavigationRef.current = true
      setHasUnsavedChanges(false)
    }

    function handlePopState() {
      if (allowHistoryNavigationRef.current) return

      if (window.confirm(UNSAVED_WARNING)) {
        allowHistoryNavigationRef.current = true
        setHasUnsavedChanges(false)
        window.setTimeout(() => window.history.back(), 0)
        return
      }

      window.history.pushState(
        { promptLabUnsavedGuard: true },
        "",
        window.location.href,
      )
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("popstate", handlePopState)
    document.addEventListener("click", handleDocumentClick, true)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("popstate", handlePopState)
      document.removeEventListener("click", handleDocumentClick, true)
    }
  }, [hasUnsavedChanges])

  function markDirty() {
    setHasUnsavedChanges(true)
    setSaveError(null)
    setSaveStatus((status) => (status === "saving" ? status : "idle"))
  }

  function addHandle(handle: string) {
    markDirty()
    setHandles((prev) => [...prev, handle])
  }

  function removeHandle(index: number) {
    markDirty()
    setHandles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  function toggleStory(story: PreviewStory, index: number) {
    const key = getStoryKey(story, index)
    setSelectedStoryKeys((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key],
    )
  }

  // Apply one stream event to scan state; returns true for terminal events.
  function applyScanEvent(event: ScanStreamEvent | null): boolean {
    if (!event) return false
    switch (event.type) {
      case "reasoning_delta":
        setIsReasoningOpen(true)
        setReasoning((prev) => prev + event.text)
        return false
      case "tool_call_started":
        setIsReasoningOpen(true)
        setIsToolsOpen(true)
        setToolCalls((prev) => [
          ...prev,
          { id: event.id, name: event.name, input: "" },
        ])
        return false
      case "tool_call_input_delta":
        setIsReasoningOpen(true)
        setIsToolsOpen(true)
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
        setLastRunFingerprint(runFingerprintRef.current)
        return true
      case "error":
        setScanError(event.message)
        setScanStatus("error")
        return true
    }
  }

  // Run the agent from the current handles + scan/draft instructions.
  async function runAgent() {
    if (scanStatus === "running") return

    const runFingerprint = getAgentFingerprint({
      handles,
      scanInstructions: scanUserPrompt,
      draftingInstructions,
    })
    if (lastRunFingerprint === runFingerprint) return
    if (handles.length === 0) {
      setScanError("Add at least one handle to monitor.")
      return
    }
    if (!scanUserPrompt.trim() || !draftingInstructions.trim()) {
      setScanError("Add scanning and drafting instructions before running.")
      return
    }

    markDirty()
    runFingerprintRef.current = runFingerprint
    setScanStatus("running")
    setIsReasoningOpen(true)
    setIsToolsOpen(false)
    setReasoning("")
    setToolCalls([])
    setScanCost(null)
    setStories([])
    setSelectedStoryKeys([])
    setScanError(null)

    try {
      const response = await fetch("/api/test/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles, userPrompt: scanUserPrompt }),
      })
      if (!response.ok) {
        throw new Error((await response.text()) || "Agent run failed.")
      }
      if (!response.body) {
        throw new Error("Agent run returned no stream.")
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
        throw new Error("Agent run ended before returning output.")
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Agent run failed.")
      setScanStatus("error")
    }
  }

  async function saveAgent() {
    if (saveStatus === "saving") return

    setSaveStatus("saving")
    setSaveError(null)
    try {
      const response = await fetch("/api/test/save-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          handles,
          monitoringDescription: scanUserPrompt,
          draftingInstructions,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "Failed to save agent.")
      }
      setSaveStatus("saved")
      setHasUnsavedChanges(false)
    } catch (err) {
      setSaveStatus("error")
      setSaveError(err instanceof Error ? err.message : "Failed to save.")
    }
  }

  const storyEntries = stories.map((story, index) => ({
    story,
    index,
    key: getStoryKey(story, index),
  }))
  const selectedStorySet = new Set(selectedStoryKeys)
  const currentRunFingerprint = getAgentFingerprint({
    handles,
    scanInstructions: scanUserPrompt,
    draftingInstructions,
  })
  const hasRunAgent = lastRunFingerprint !== null
  const isRunCurrent =
    hasRunAgent && lastRunFingerprint === currentRunFingerprint
  const canRunAgent =
    scanStatus !== "running" &&
    handles.length > 0 &&
    scanUserPrompt.trim().length > 0 &&
    draftingInstructions.trim().length > 0 &&
    !isRunCurrent
  const runButtonLabel = hasRunAgent ? "Rerun Agent" : "Run Agent"
  const canSaveAgent =
    scanStatus === "done" &&
    stories.length > 0 &&
    isRunCurrent &&
    name.trim().length > 0 &&
    handles.length > 0 &&
    saveStatus !== "saving" &&
    saveStatus !== "saved"
  const hasScanOutput =
    scanStatus === "running" ||
    reasoning ||
    toolCalls.length > 0 ||
    scanStatus === "done"

  function renderHelpButton(topic: HelpTopicName) {
    const copy = HELP_COPY[topic]

    return (
      <button
        type="button"
        aria-label={`Show ${copy.title.toLowerCase()} help`}
        onClick={() => setHelpTopic(topic)}
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <HelpCircle aria-hidden="true" className="size-4" />
      </button>
    )
  }

  function renderHelpDialog() {
    if (!helpTopic) return null
    const copy = HELP_COPY[helpTopic]

    return (
      <div
        role="presentation"
        className="fixed inset-0 z-50 flex items-start justify-center bg-background/75 px-4 py-16 backdrop-blur-sm"
        onClick={() => setHelpTopic(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-lab-help-title"
          className="w-full max-w-lg rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h2
                id="prompt-lab-help-title"
                className="text-lg font-semibold leading-6 text-foreground"
              >
                {copy.title}
              </h2>
              <p className="text-base leading-6 text-muted-foreground">
                {copy.body}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="form-action"
              onClick={() => setHelpTopic(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  }

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
                  onChange={(event) => {
                    markDirty()
                    setName(event.target.value)
                  }}
                />
              </Field>

              <Field>
                <FieldLabel>
                  X accounts to monitor{" "}
                  <span className="text-muted-foreground">
                    ({handles.length} of {MONITOR_MAX_HANDLES})
                  </span>
                </FieldLabel>
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
                <div className="flex items-start gap-1.5">
                  <FieldLabel htmlFor="prompt-lab-scanning-instructions">
                    Scanning instructions
                  </FieldLabel>
                  {renderHelpButton("scan")}
                </div>
                <Textarea
                  id="prompt-lab-scanning-instructions"
                  value={scanUserPrompt}
                  onChange={(event) => {
                    markDirty()
                    setScanUserPrompt(event.target.value)
                  }}
                  rows={8}
                  className="min-h-52 resize-y"
                />
              </Field>

              <Field>
                <div className="flex items-start gap-1.5">
                  <FieldLabel htmlFor="prompt-lab-drafting-instructions">
                    Drafting instructions
                  </FieldLabel>
                  {renderHelpButton("draft")}
                </div>
                <Textarea
                  id="prompt-lab-drafting-instructions"
                  value={draftingInstructions}
                  onChange={(event) => {
                    markDirty()
                    setDraftingInstructions(event.target.value)
                  }}
                  rows={8}
                  className="min-h-52 resize-y"
                />
              </Field>
            </div>

            <div className="flex justify-start">
              <Button
                onClick={runAgent}
                pending={scanStatus === "running"}
                disabled={!canRunAgent}
                variant={isRunCurrent ? "outline" : "default"}
                size="form-action"
              >
                {scanStatus === "running" ? "Running" : runButtonLabel}
              </Button>
            </div>

            {hasScanOutput && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  aria-expanded={isReasoningOpen}
                  onClick={() => setIsReasoningOpen((open) => !open)}
                  className="flex w-full items-center gap-3 py-1 text-left outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 rounded-full",
                      scanStatus === "running"
                        ? "size-3 animate-spin border-2 border-success/25 border-t-success"
                        : "size-2.5 bg-success",
                    )}
                  />
                  <span className="font-semibold text-foreground/90">
                    Reasoning
                    {scanStatus === "done" && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        ({toolCalls.length} tool call
                        {toolCalls.length === 1 ? "" : "s"} ·{" "}
                        {formatScanCost(scanCost)} · {stories.length} item
                        {stories.length === 1 ? "" : "s"})
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className={cn(
                      "ml-auto size-4 shrink-0 text-muted-foreground transition-transform",
                      isReasoningOpen && "rotate-90",
                    )}
                  />
                </button>

                {isReasoningOpen && (
                  <div className="flex flex-col gap-2 pl-10">
                    {reasoning && (
                      <p className="flex items-start gap-2 whitespace-pre-wrap text-base leading-6 text-foreground/90">
                        <span
                          aria-hidden="true"
                          className="mt-2 size-2 shrink-0 rounded-full bg-success/55"
                        />
                        <span>{reasoning}</span>
                      </p>
                    )}

                    {toolCalls.length > 0 && (
                      <div>
                        <button
                          type="button"
                          aria-expanded={isToolsOpen}
                          onClick={() => setIsToolsOpen((open) => !open)}
                          className="flex w-full items-start gap-2 py-1 text-left text-base leading-6 text-foreground/90 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-2 size-2 shrink-0 rounded-full bg-success/55"
                          />
                          <span>Calling tools: {toolCalls.length}</span>
                          <ChevronRight
                            aria-hidden="true"
                            className={cn(
                              "ml-auto size-4 shrink-0 text-muted-foreground transition-transform",
                              isToolsOpen && "rotate-90",
                            )}
                          />
                        </button>

                        {isToolsOpen && (
                          <div className="flex flex-col gap-1.5 pl-5">
                            {toolCalls.map((toolCall) => (
                              <p
                                key={toolCall.id}
                                className="text-sm leading-6 text-muted-foreground"
                              >
                                <span className="font-semibold">
                                  {toolCall.name}:
                                </span>{" "}
                                <span className="whitespace-pre-wrap break-words">
                                  {toolCall.input || "Waiting for input."}
                                </span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {stories.length > 0 && (
              <div className="flex flex-col gap-3" aria-label="Agent results">
                <p className="text-base font-[525] leading-6 text-foreground/90">
                  Review the generated news and draft previews below before
                  posting on X.
                </p>
                {storyEntries.map(({ story, index, key }) => {
                  const isSelected = selectedStorySet.has(key)

                  return (
                    <div
                      key={key}
                      className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]"
                    >
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleStory(story, index)}
                        className={cn(
                          "min-w-0 rounded-lg border border-border bg-muted/25 px-3 py-2.5 text-left text-sm leading-5 transition-colors outline-none hover:border-foreground/35 hover:bg-muted/45 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                          isSelected && "border-success/60 bg-success-bg/45",
                        )}
                      >
                        <span className="text-foreground/82">
                          {story.title}
                        </span>
                        {story.sourceUrls.length > 0 ? (
                          story.sourceUrls.map((url) => (
                            <span
                              key={url}
                              className="ml-2 break-all text-link"
                            >
                              {url}
                            </span>
                          ))
                        ) : (
                          <span className="ml-2 text-muted-foreground">
                            No source URLs returned.
                          </span>
                        )}
                      </button>

                      <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-background/30 px-3 py-2.5 text-sm leading-5">
                        <p className="font-[525] text-foreground/90">
                          Draft preview
                        </p>
                        <p className="text-muted-foreground">
                          Draft output will appear here when the combined agent
                          run is connected.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="form-action"
                          disabled
                          className="self-start"
                        >
                          Post to X
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {scanError && <FieldError>{scanError}</FieldError>}
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col items-start gap-2">
        <Button
          onClick={saveAgent}
          pending={saveStatus === "saving"}
          disabled={!canSaveAgent}
          variant="success"
        >
          {saveStatus === "saving"
            ? "Saving"
            : saveStatus === "saved"
              ? "Saved"
              : "Save Agent"}
        </Button>
        {saveError && <FieldError>{saveError}</FieldError>}
      </div>

      {renderHelpDialog()}
    </div>
  )
}
