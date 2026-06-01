"use client"

// Imports
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Play, RefreshCw, Save, Send } from "lucide-react"
import { CompactTweet } from "@/components/loop/compact-tweet"
import { MONITOR_MAX_HANDLES } from "@/lib/scan/handles"
import type { ScanMetrics, ScanStreamEvent } from "@/lib/scan/stream"
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
import { Textarea } from "@/components/ui/textarea"

type ToolCallOutput = {
  id: string
  name: string
  input: string
}

export interface AgentDetailAgent {
  id: string
  name: string
  monitored_handles: string[]
  monitoring_description: string
  drafting_instructions: string
  status: "active" | "paused" | "inactive"
}

export interface AgentDetailItem {
  id: string
  story_title: string
  story_summary: string
  source_urls: string[]
  primary_tweet_url: string
  drafted_text: string
  final_text: string | null
  status: "drafted" | "posted" | "failed"
  x_tweet_url: string | null
  error_message: string | null
}

export interface AgentDetailRun {
  id: string
  status: "running" | "completed" | "failed"
  started_at: string
  completed_at: string | null
  cost_usd: number | null
  x_search_count: number | null
  item_count: number | null
  error_message: string | null
  input_drafting_instructions: string
  items: AgentDetailItem[]
}

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

function formatCost(costUsd: number | null): string {
  return costUsd === null ? "Cost unavailable" : `$${costUsd.toFixed(6)}`
}

// react-tweet takes a numeric tweet id, but we store full status URLs
// (https://x.com/<user>/status/<id>). Pull the trailing id out.
function getTweetId(url: string): string | null {
  const match = url.match(/status(?:es)?\/(\d+)/)
  return match ? match[1] : null
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function settingsFingerprint({
  handles,
  monitoringDescription,
  draftingInstructions,
}: {
  handles: string[]
  monitoringDescription: string
  draftingInstructions: string
}) {
  return JSON.stringify({
    handles,
    monitoringDescription,
    draftingInstructions,
  })
}

/**
 * Agent detail workbench: update prompts/handles, run saved scans, redraft
 * individual items only after draft instructions change, and post manually.
 * @param props.agent - saved agent settings
 * @param props.runs - run history with items
 * @param props.xConnected - whether posting is available
 * @returns the interactive detail surface
 */
export function AgentDetail({
  agent,
  runs,
  xConnected,
}: {
  agent: AgentDetailAgent
  runs: AgentDetailRun[]
  xConnected: boolean
}) {
  const router = useRouter()
  const [handles, setHandles] = useState(agent.monitored_handles)
  const [monitoringDescription, setMonitoringDescription] = useState(
    agent.monitoring_description,
  )
  const [draftingInstructions, setDraftingInstructions] = useState(
    agent.drafting_instructions,
  )
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [runMessage, setRunMessage] = useState<string | null>(null)
  const [reasoning, setReasoning] = useState("")
  const [toolCalls, setToolCalls] = useState<ToolCallOutput[]>([])
  const [isReasoningOpen, setIsReasoningOpen] = useState(false)
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [latestMetrics, setLatestMetrics] = useState<ScanMetrics | null>(null)
  const [latestStoryCount, setLatestStoryCount] = useState<number | null>(null)
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({})
  const [itemStatus, setItemStatus] = useState<
    Record<string, AgentDetailItem["status"]>
  >({})
  const [tweetUrls, setTweetUrls] = useState<Record<string, string | null>>({})
  const [itemErrors, setItemErrors] = useState<Record<string, string | null>>({})
  const [pendingItem, setPendingItem] = useState<string | null>(null)
  const [expandedRunIds, setExpandedRunIds] = useState<string[]>(() =>
    runs[0]?.id ? [runs[0].id] : [],
  )

  useEffect(() => {
    const nextDrafts: Record<string, string> = {}
    const nextStatuses: Record<string, AgentDetailItem["status"]> = {}
    const nextTweetUrls: Record<string, string | null> = {}
    const nextErrors: Record<string, string | null> = {}

    for (const run of runs) {
      for (const item of run.items) {
        nextDrafts[item.id] = item.final_text || item.drafted_text
        nextStatuses[item.id] = item.status
        nextTweetUrls[item.id] = item.x_tweet_url
        nextErrors[item.id] = item.error_message
      }
    }

    setDraftTexts(nextDrafts)
    setItemStatus(nextStatuses)
    setTweetUrls(nextTweetUrls)
    setItemErrors(nextErrors)
    setExpandedRunIds((current) =>
      current.length === 0 && runs[0]?.id ? [runs[0].id] : current,
    )
  }, [runs])

  const initialFingerprint = settingsFingerprint({
    handles: agent.monitored_handles,
    monitoringDescription: agent.monitoring_description,
    draftingInstructions: agent.drafting_instructions,
  })
  const currentFingerprint = settingsFingerprint({
    handles,
    monitoringDescription,
    draftingInstructions,
  })
  const settingsDirty = currentFingerprint !== initialFingerprint
  const totalCost = runs.reduce((sum, run) => sum + (run.cost_usd ?? 0), 0)
  const totalItems = runs.reduce((sum, run) => sum + run.items.length, 0)
  const postedItems = useMemo(
    () =>
      runs.reduce(
        (sum, run) =>
          sum +
          run.items.filter((item) => {
            const status = itemStatus[item.id] ?? item.status
            return status === "posted"
          }).length,
        0,
      ),
    [itemStatus, runs],
  )
  const canRun =
    agent.status !== "inactive" &&
    !running &&
    handles.length > 0 &&
    monitoringDescription.trim().length > 0 &&
    draftingInstructions.trim().length > 0
  const hasRunOutput =
    running ||
    reasoning ||
    toolCalls.length > 0 ||
    latestMetrics !== null ||
    runMessage !== null

  function markSettingsChanged() {
    setSettingsError(null)
    setSettingsSaved(false)
  }

  function toggleRun(runId: string) {
    setExpandedRunIds((current) =>
      current.includes(runId)
        ? current.filter((id) => id !== runId)
        : [...current, runId],
    )
  }

  async function saveSettings({ refresh = true } = {}) {
    if (savingSettings) return false
    setSavingSettings(true)
    setSettingsError(null)
    setSettingsSaved(false)

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agent.name,
          handles,
          monitoringDescription,
          draftingInstructions,
        }),
      })
      const data = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save agent.")
      }
      setSettingsSaved(true)
      if (refresh) router.refresh()
      return true
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : "Failed to save agent.",
      )
      return false
    } finally {
      setSavingSettings(false)
    }
  }

  function applyRunEvent(event: ScanStreamEvent | null): boolean {
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
      case "preview_complete":
        return false
      case "persisted":
        setLatestMetrics(event.metrics)
        setLatestStoryCount(event.storyCount)
        setRunMessage(
          `Saved ${event.storyCount} item${event.storyCount === 1 ? "" : "s"}.`,
        )
        setRunning(false)
        setExpandedRunIds((current) =>
          current.includes(event.runId) ? current : [event.runId, ...current],
        )
        router.refresh()
        return true
      case "error":
        setRunError(event.message)
        setRunning(false)
        router.refresh()
        return true
    }
  }

  async function runAgent() {
    if (!canRun) return
    if (settingsDirty) {
      const saved = await saveSettings({ refresh: false })
      if (!saved) return
    }

    setRunning(true)
    setRunError(null)
    setRunMessage("Running agent.")
    setReasoning("")
    setToolCalls([])
    setLatestMetrics(null)
    setLatestStoryCount(null)
    setIsReasoningOpen(true)
    setIsToolsOpen(false)

    try {
      const response = await fetch(`/api/agents/${agent.id}/run`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error((await response.text()) || "Agent run failed.")
      }
      if (!response.body) throw new Error("Agent run returned no stream.")

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
          if (applyRunEvent(parseScanEvent(line))) sawTerminalEvent = true
        }
      }
      pendingLine += decoder.decode()
      if (pendingLine.trim() && applyRunEvent(parseScanEvent(pendingLine))) {
        sawTerminalEvent = true
      }
      if (!sawTerminalEvent) {
        throw new Error("Agent run ended before saving output.")
      }
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Agent run failed.")
      setRunning(false)
    }
  }

  async function redraftItem(item: AgentDetailItem, canRedraftRun: boolean) {
    if (!canRedraftRun) return
    if (settingsDirty) {
      const saved = await saveSettings({ refresh: false })
      if (!saved) return
    }

    setPendingItem(item.id)
    setItemErrors((prev) => ({ ...prev, [item.id]: null }))
    try {
      const response = await fetch(`/api/agents/run-items/${item.id}/redraft`, {
        method: "POST",
      })
      const data = (await response.json()) as { text?: string; error?: string }
      if (!response.ok || !data.text) {
        throw new Error(data.error || "Failed to redraft.")
      }
      setDraftTexts((prev) => ({ ...prev, [item.id]: data.text ?? "" }))
      setItemStatus((prev) => ({ ...prev, [item.id]: "drafted" }))
      setTweetUrls((prev) => ({ ...prev, [item.id]: null }))
      router.refresh()
    } catch (error) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: error instanceof Error ? error.message : "Failed to redraft.",
      }))
    } finally {
      setPendingItem(null)
    }
  }

  async function postItem(item: AgentDetailItem) {
    if (!xConnected) return
    const finalText = draftTexts[item.id] ?? item.final_text ?? item.drafted_text
    setPendingItem(item.id)
    setItemErrors((prev) => ({ ...prev, [item.id]: null }))

    try {
      const response = await fetch(`/api/agents/run-items/${item.id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalText }),
      })
      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Failed to post.")
      }
      setItemStatus((prev) => ({ ...prev, [item.id]: "posted" }))
      setTweetUrls((prev) => ({ ...prev, [item.id]: data.url ?? null }))
      router.refresh()
    } catch (error) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: error instanceof Error ? error.message : "Failed to post.",
      }))
    } finally {
      setPendingItem(null)
    }
  }

  function addHandle(handle: string) {
    markSettingsChanged()
    setHandles((prev) => [...prev, handle])
  }

  function removeHandle(index: number) {
    markSettingsChanged()
    setHandles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  function renderRunOutput() {
    if (!hasRunOutput) return null

    return (
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
              running
                ? "size-3 animate-spin border-2 border-success/25 border-t-success"
                : "size-2.5 bg-success",
            )}
          />
          <span className="font-semibold text-foreground/90">
            Reasoning
            {latestMetrics && (
              <span className="ml-2 font-normal text-muted-foreground">
                ({toolCalls.length} tool call
                {toolCalls.length === 1 ? "" : "s"} ·{" "}
                {formatCost(latestMetrics.costUsd)} · {latestStoryCount ?? 0}{" "}
                item{latestStoryCount === 1 ? "" : "s"})
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
                        <span className="font-semibold">{toolCall.name}:</span>{" "}
                        <span className="whitespace-pre-wrap break-words">
                          {toolCall.input || "Waiting for input."}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {runMessage && !running && (
              <p className="text-sm text-muted-foreground">{runMessage}</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-2 md:px-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{runs.length}</span>{" "}
          scans
        </span>
        <span>
          <span className="font-semibold text-foreground">{totalItems}</span>{" "}
          drafts
        </span>
        <span>
          <span className="font-semibold text-foreground">{postedItems}</span>{" "}
          posted
        </span>
        <span>
          <span className="font-semibold text-foreground">
            {formatCost(totalCost)}
          </span>{" "}
          total cost
        </span>
      </div>

      <Card>
        <CardContent>
          <FieldGroup>
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

            <div className="grid gap-6 lg:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="agent-scan-instructions">
                  Scanning instructions
                </FieldLabel>
                <Textarea
                  id="agent-scan-instructions"
                  value={monitoringDescription}
                  onChange={(event) => {
                    markSettingsChanged()
                    setMonitoringDescription(event.target.value)
                  }}
                  rows={8}
                  className="min-h-52 resize-y"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="agent-drafting-instructions">
                  Drafting instructions
                </FieldLabel>
                <Textarea
                  id="agent-drafting-instructions"
                  value={draftingInstructions}
                  onChange={(event) => {
                    markSettingsChanged()
                    setDraftingInstructions(event.target.value)
                  }}
                  rows={8}
                  className="min-h-52 resize-y"
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="form-action"
                pending={savingSettings}
                disabled={!settingsDirty || savingSettings}
                onClick={() => void saveSettings()}
              >
                <Save aria-hidden="true" />
                Save settings
              </Button>
              <Button
                type="button"
                size="form-action"
                pending={running}
                disabled={!canRun}
                onClick={runAgent}
              >
                <Play aria-hidden="true" />
                {running ? "Running" : "Run Agent"}
              </Button>
              {settingsSaved && (
                <span className="text-sm text-muted-foreground">Saved.</span>
              )}
            </div>

            {agent.status === "inactive" && (
              <FieldError>
                This agent is inactive because X is disconnected. Reconnect X to
                post and run it again.
              </FieldError>
            )}
            {settingsError && <FieldError>{settingsError}</FieldError>}
            {runError && <FieldError>{runError}</FieldError>}
            {renderRunOutput()}
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border border-border">
        {runs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No scans yet. Run the agent to create scanned items and drafts.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {runs.map((run) => {
              const isExpanded = expandedRunIds.includes(run.id)
              const canRedraftRun =
                draftingInstructions.trim() !==
                run.input_drafting_instructions.trim()

              return (
                <section key={run.id}>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => toggleRun(run.id)}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 bg-background px-4 py-3 text-left transition-colors hover:bg-muted/35 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <ChevronRight
                      aria-hidden="true"
                      className={cn(
                        "size-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-90",
                      )}
                    />
                    <span className="font-medium text-foreground">
                      {formatDate(run.started_at)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {run.items.length} item{run.items.length === 1 ? "" : "s"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatCost(run.cost_usd)}
                    </span>
                    {run.x_search_count !== null && (
                      <span className="text-sm text-muted-foreground">
                        {run.x_search_count} x_search
                      </span>
                    )}
                    {run.status === "failed" && (
                      <span className="text-sm text-destructive">Failed</span>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/15">
                      {run.error_message && (
                        <div className="px-4 pt-3">
                          <FieldError>{run.error_message}</FieldError>
                        </div>
                      )}
                      <div className="flex flex-col gap-3 p-4">
                        {run.items.map((item) => {
                          const status = itemStatus[item.id] ?? item.status
                          const tweetUrl = tweetUrls[item.id] ?? item.x_tweet_url
                          const draftText =
                            draftTexts[item.id] ??
                            item.final_text ??
                            item.drafted_text
                          const itemPending = pendingItem === item.id
                          const isPosted = status === "posted"
                          const primaryTweetId = getTweetId(
                            item.primary_tweet_url || item.source_urls[0] || "",
                          )

                          return (
                            <Card key={item.id}>
                              <CardContent className="flex flex-col gap-4">
                                <p className="text-lg font-semibold leading-7 text-foreground">
                                  {item.story_summary}
                                </p>

                                <div className="flex flex-col gap-2">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                    <Textarea
                                      value={draftText}
                                      onChange={(event) =>
                                        setDraftTexts((prev) => ({
                                          ...prev,
                                          [item.id]: event.target.value,
                                        }))
                                      }
                                      rows={4}
                                      className={cn(
                                        "min-h-28 flex-1 resize-y text-sm leading-6",
                                        isPosted && "opacity-80",
                                      )}
                                      disabled={isPosted}
                                    />
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          pending={itemPending}
                                          disabled={
                                            itemPending ||
                                            isPosted ||
                                            !canRedraftRun
                                          }
                                          onClick={() =>
                                            void redraftItem(item, canRedraftRun)
                                          }
                                        >
                                          <RefreshCw aria-hidden="true" />
                                          Redraft
                                        </Button>
                                        <Button
                                          type="button"
                                          pending={itemPending}
                                          disabled={
                                            itemPending || !xConnected || isPosted
                                          }
                                          onClick={() => void postItem(item)}
                                        >
                                          <Send aria-hidden="true" />
                                          Post to X
                                        </Button>
                                      </div>
                                      {tweetUrl && (
                                        <a
                                          href={tweetUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-sm text-link hover:text-link-hover"
                                        >
                                          View post
                                        </a>
                                      )}
                                      {!xConnected && (
                                        <p className="max-w-52 text-right text-sm text-muted-foreground">
                                          Connect X in Settings to post drafts.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {itemErrors[item.id] && (
                                    <FieldError>{itemErrors[item.id]}</FieldError>
                                  )}
                                </div>

                                {primaryTweetId ? (
                                  <CompactTweet
                                    id={primaryTweetId}
                                    apiUrl={`/api/tweet/${primaryTweetId}`}
                                  />
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    {item.source_urls.map((url, index) => (
                                      <a
                                        key={url}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="break-all text-sm text-link hover:text-link-hover"
                                      >
                                        Source {index + 1}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
