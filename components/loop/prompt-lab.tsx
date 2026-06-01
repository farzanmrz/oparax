"use client"

// Imports
import { useState } from "react"
import {
  DEFAULT_HANDLES,
  DEFAULT_SCAN_SYSTEM_PROMPT,
  DEFAULT_SCAN_USER_PROMPT,
} from "@/lib/scan/defaults"
import {
  DEFAULT_DRAFT_SYSTEM_PROMPT,
  DEFAULT_DRAFT_USER_PROMPT,
} from "@/lib/draft/defaults"
import {
  MONITOR_MAX_HANDLES,
  isValidHandle,
  normalizeHandle,
} from "@/lib/scan/handles"
import { TWEET_WEIGHTED_LIMIT, weightedLength } from "@/lib/draft/count"
import { getDraftIssue } from "@/lib/draft/validate"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { PreviewStory, ScanStreamEvent } from "@/lib/scan/stream"

// A scanned story plus its selectable index (in-memory only; nothing persisted).
type LabStory = PreviewStory

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
 * Prompt-lab: iterate the scan + draft system/user prompts on one page. Run a
 * scan, pick a story, generate a draft, edit it, and post a real tweet. Nothing
 * is persisted until you post.
 * @returns the prompt-lab UI
 */
export function PromptLab() {
  // Scan inputs (prefilled, editable).
  const [handles, setHandles] = useState<string[]>(DEFAULT_HANDLES)
  const [handleInput, setHandleInput] = useState("")
  const [handleError, setHandleError] = useState<string | null>(null)
  const [scanSystemPrompt, setScanSystemPrompt] = useState(
    DEFAULT_SCAN_SYSTEM_PROMPT,
  )
  const [scanUserPrompt, setScanUserPrompt] = useState(DEFAULT_SCAN_USER_PROMPT)

  // Scan run state.
  const [scanStatus, setScanStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle")
  const [reasoning, setReasoning] = useState("")
  const [toolCount, setToolCount] = useState(0)
  const [scanCost, setScanCost] = useState<number | null>(null)
  const [stories, setStories] = useState<LabStory[]>([])
  const [scanError, setScanError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  // Draft inputs (prefilled, editable) + draft run state.
  const [draftSystemPrompt, setDraftSystemPrompt] = useState(
    DEFAULT_DRAFT_SYSTEM_PROMPT,
  )
  const [draftUserPrompt, setDraftUserPrompt] = useState(
    DEFAULT_DRAFT_USER_PROMPT,
  )
  const [draftText, setDraftText] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  // Post state.
  const [posting, setPosting] = useState(false)
  const [postUrl, setPostUrl] = useState<string | null>(null)
  const [postError, setPostError] = useState<string | null>(null)

  // Add a handle chip, validating it locally.
  function commitHandle(raw: string) {
    const cleaned = normalizeHandle(raw)
    if (!cleaned) return
    if (handles.length >= MONITOR_MAX_HANDLES) {
      setHandleError(`Maximum ${MONITOR_MAX_HANDLES} handles allowed.`)
      return
    }
    if (handles.includes(cleaned)) {
      setHandleError(`@${cleaned} is already added.`)
      return
    }
    if (!isValidHandle(cleaned)) {
      setHandleError(`"${cleaned}" is not a valid X handle.`)
      return
    }
    setHandles((prev) => [...prev, cleaned])
    setHandleInput("")
    setHandleError(null)
  }

  // Handle Enter/comma/Backspace in the handle input.
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      commitHandle(handleInput)
    } else if (event.key === "Backspace" && !handleInput && handles.length > 0) {
      setHandles((prev) => prev.slice(0, -1))
      setHandleError(null)
    }
  }

  // Apply one stream event to scan state; returns true for terminal events.
  function applyScanEvent(event: ScanStreamEvent | null): boolean {
    if (!event) return false
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

  // Run a scan from the current editable prompts + handles.
  async function runScan() {
    if (scanStatus === "running") return
    if (handles.length === 0) {
      setScanError("Add at least one handle to scan.")
      return
    }
    setScanStatus("running")
    setReasoning("")
    setToolCount(0)
    setScanCost(null)
    setStories([])
    setSelected(null)
    setDraftText("")
    setPostUrl(null)
    setScanError(null)

    try {
      const response = await fetch("/api/test/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handles,
          systemPrompt: scanSystemPrompt,
          userPrompt: scanUserPrompt,
        }),
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

  // Generate a draft for the selected story from the editable draft prompts.
  async function generateDraft() {
    if (selected === null) return
    const story = stories[selected]
    setDrafting(true)
    setDraftError(null)
    setPostUrl(null)
    try {
      const response = await fetch("/api/test/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: draftSystemPrompt,
          userPrompt: draftUserPrompt,
          storyTitle: story.title,
          storySummary: story.summary,
        }),
      })
      const data = (await response.json()) as { text?: string; error?: string }
      if (!response.ok || typeof data.text !== "string") {
        throw new Error(data.error || "Draft failed.")
      }
      setDraftText(data.text)
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Draft failed.")
    } finally {
      setDrafting(false)
    }
  }

  // Post the edited draft as a real tweet.
  async function post() {
    if (selected === null || !draftText.trim()) return
    const story = stories[selected]
    setPosting(true)
    setPostError(null)
    setPostUrl(null)
    try {
      const response = await fetch("/api/test/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: draftText,
          storyTitle: story.title,
          storySummary: story.summary,
          sourceUrls: story.sourceUrls,
        }),
      })
      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Post failed.")
      }
      setPostUrl(data.url)
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Post failed.")
    } finally {
      setPosting(false)
    }
  }

  // Live weighted count + validation for the editable draft.
  const draftCount = draftText ? weightedLength(draftText) : 0
  const draftIssue = draftText ? getDraftIssue(draftText) : null

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-2 md:px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · Scan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Handles</span>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-input bg-background/35 px-3 py-2">
              {handles.map((handle, index) => (
                <span
                  key={handle}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                >
                  @{handle}
                  <button
                    type="button"
                    aria-label={`Remove @${handle}`}
                    onClick={() =>
                      setHandles((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="text-secondary-foreground/70 hover:text-secondary-foreground"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={handleInput}
                onChange={(event) => {
                  setHandleInput(event.target.value)
                  setHandleError(null)
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => commitHandle(handleInput)}
                disabled={handles.length >= MONITOR_MAX_HANDLES}
                placeholder="Type a handle and press Enter"
                className="min-w-[140px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
            </div>
            {handleError && (
              <span className="text-xs text-destructive">{handleError}</span>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Scan system prompt</span>
            <Textarea
              value={scanSystemPrompt}
              onChange={(event) => setScanSystemPrompt(event.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Scan user prompt</span>
            <Textarea
              value={scanUserPrompt}
              onChange={(event) => setScanUserPrompt(event.target.value)}
              rows={3}
            />
          </label>

          <Button
            onClick={runScan}
            pending={scanStatus === "running"}
            disabled={scanStatus === "running"}
            className="self-start"
          >
            {scanStatus === "running" ? "Scanning…" : "Run scan"}
          </Button>

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
          {scanCost !== null && (
            <p className="text-sm text-muted-foreground">
              {stories.length} stor{stories.length === 1 ? "y" : "ies"} · $
              {scanCost.toFixed(6)}
            </p>
          )}
          {scanError && <p className="text-sm text-destructive">{scanError}</p>}
        </CardContent>
      </Card>

      {stories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2 · Pick a story</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {stories.map((story, index) => (
              <button
                key={`${story.dedupeKey}-${index}`}
                type="button"
                onClick={() => setSelected(index)}
                className={`flex flex-col gap-1 rounded-lg border p-3 text-left ${
                  selected === index
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <span className="text-sm font-medium">{story.title}</span>
                <span className="text-sm text-muted-foreground">
                  {story.summary}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {selected !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3 · Draft</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Draft system prompt</span>
              <Textarea
                value={draftSystemPrompt}
                onChange={(event) => setDraftSystemPrompt(event.target.value)}
                rows={5}
                className="font-mono text-xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Draft user prompt</span>
              <Textarea
                value={draftUserPrompt}
                onChange={(event) => setDraftUserPrompt(event.target.value)}
                rows={3}
              />
            </label>

            <Button
              onClick={generateDraft}
              pending={drafting}
              disabled={drafting}
              className="self-start"
            >
              Generate draft
            </Button>
            {draftError && (
              <p className="text-sm text-destructive">{draftError}</p>
            )}

            {draftText && (
              <div className="flex flex-col gap-2">
                <Textarea
                  value={draftText}
                  onChange={(event) => {
                    setDraftText(event.target.value)
                    setPostUrl(null)
                  }}
                  rows={4}
                />
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={
                      draftCount > TWEET_WEIGHTED_LIMIT
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {draftCount} / {TWEET_WEIGHTED_LIMIT}
                  </span>
                  <Button
                    onClick={post}
                    pending={posting}
                    disabled={posting || draftIssue !== null}
                  >
                    Post to X
                  </Button>
                </div>
                {draftIssue && (
                  <p className="text-xs text-destructive">{draftIssue}</p>
                )}
                {postError && (
                  <p className="text-sm text-destructive">{postError}</p>
                )}
                {postUrl && (
                  <p className="text-sm">
                    Posted ✓{" "}
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link underline underline-offset-4"
                    >
                      View tweet
                    </a>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
