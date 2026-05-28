"use client"

// Imports
import { useEffect, useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { HandleInput } from "@/components/handle-input"
import {
  allowedXHandles,
  countScanningInstructionLines,
  defaultUserPrompt,
  getScanningInstructionsError,
  getScheduleIntervalRange,
  getTestScanScheduleError,
  limitScanningInstructions,
  maxXHandles,
  scanningInstructionsMaxChars,
  scanningInstructionsMaxLines,
  type TestScanItem,
  type TestScanMetrics,
  type TestScanSchedule,
  type TestScanStreamEvent,
  type TestScheduleFrequency,
  type WeekdayValue,
  weekdayOptions,
} from "@/lib/test-scan-config"

type ScanStatus = "idle" | "running" | "complete" | "error"

interface ToolCallView {
  id: string
  name: string
  input: string
  completed: boolean
}

/**
 * Builds a YYYY-MM-DD value for a native date input.
 * @returns today's local date in input-compatible format
 */
function getLocalDateInputValue(): string {
  // Current date adjusted to the browser's local timezone.
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)

  return localDate.toISOString().slice(0, 10)
}

/**
 * Reads the browser timezone with a stable fallback.
 * @returns the user's IANA timezone, or UTC when unavailable
 */
function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}

/**
 * Reads the browser's current weekday value.
 * @returns the current weekday as a schedule value
 */
function getCurrentWeekday(): WeekdayValue {
  return new Date().getDay() as WeekdayValue
}

/**
 * Builds the default schedule shown on the test workflow form.
 * @returns the initial schedule state
 */
function createDefaultSchedule(): TestScanSchedule {
  return {
    frequency: "hourly",
    interval: 1,
    startsOn: getLocalDateInputValue(),
    timezone: "UTC",
    windowStart: "00:00",
    windowEnd: "23:59",
    runAt: "09:00",
    weekdays: [getCurrentWeekday()],
  }
}

/**
 * Builds the timezone choices for the schedule select.
 * @param selectedTimezone - the currently selected timezone
 * @returns supported timezones with the selected timezone preserved
 */
function getTimezoneOptions(selectedTimezone: string): string[] {
  // Browser-supported timezone names, when the runtime exposes them.
  const supportedTimezones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : []

  return [
    ...new Set([selectedTimezone, getBrowserTimezone(), "UTC", ...supportedTimezones]),
  ].filter(Boolean)
}

/**
 * Formats a native HH:MM value into compact local-time copy.
 * @param value - the native time input value
 * @returns a readable time label
 */
function formatTimeValue(value: string): string {
  // Native time parts from the HH:MM input value.
  const [hourPart, minutePart] = value.split(":")
  const hour = Number(hourPart)
  const minute = Number(minutePart)

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return value
  }

  // Meridiem and 12-hour display hour for user-facing schedule copy.
  const suffix = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`
}

/**
 * Returns the plural unit for the selected schedule.
 * @param schedule - the current schedule state
 * @returns the interval unit label
 */
function getScheduleUnit(schedule: TestScanSchedule): string {
  // Singular/plural unit text for the current interval.
  const units = {
    hourly: schedule.interval === 1 ? "hour" : "hours",
    daily: schedule.interval === 1 ? "day" : "days",
    weekly: schedule.interval === 1 ? "week" : "weeks",
  }

  return units[schedule.frequency]
}

/**
 * Builds a short readable summary for the schedule card.
 * @param schedule - the current schedule state
 * @returns a one-line schedule summary
 */
function describeSchedule(schedule: TestScanSchedule): string {
  // Shared opening copy for every schedule mode.
  const every = `Every ${schedule.interval || "?"} ${getScheduleUnit(schedule)}`
  const timezone = schedule.timezone || "timezone not set"

  // Map the selected schedule mode to user-facing summary copy.
  switch (schedule.frequency) {
    case "hourly":
      return `${every} between ${formatTimeValue(schedule.windowStart)} and ${formatTimeValue(schedule.windowEnd)} ${timezone}, starting ${schedule.startsOn}.`
    case "daily":
      return `${every} at ${formatTimeValue(schedule.runAt)} ${timezone}, starting ${schedule.startsOn}.`
    case "weekly": {
      // Selected weekday labels for the weekly summary.
      const days = weekdayOptions
        .filter((day) => schedule.weekdays.includes(day.value))
        .map((day) => day.shortLabel)
        .join(", ")

      return `${every} on ${days || "no days"} at ${formatTimeValue(schedule.runAt)} ${timezone}, starting ${schedule.startsOn}.`
    }
  }
}

/**
 * Parses one NDJSON stream line into a test scan event.
 * @param line - the raw stream line from the response body
 * @returns a typed stream event, or null when the line is empty/invalid
 */
function parseStreamEvent(line: string): TestScanStreamEvent | null {
  if (!line.trim()) {
    return null
  }

  try {
    // Parsed event from one NDJSON line.
    const parsed = JSON.parse(line) as unknown

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed &&
      typeof parsed.type === "string"
    ) {
      return parsed as TestScanStreamEvent
    }
  } catch {
    return null
  }

  return null
}

/**
 * Formats the model call cost for the result badge.
 * @param costUsd - the USD cost returned by xAI usage metrics
 * @returns a cost label for the UI
 */
function formatCost(costUsd: number | null): string {
  return costUsd === null ? "Cost unavailable" : `Cost $${costUsd.toFixed(6)}`
}

/**
 * Formats elapsed scan duration for the thinking summary.
 * @param elapsedMs - elapsed time in milliseconds
 * @returns a compact seconds label
 */
function formatElapsed(elapsedMs: number): string {
  // Rounded seconds, keeping very short scans readable.
  const seconds = Math.max(1, Math.round(elapsedMs / 1_000))

  return `${seconds}s`
}

/**
 * Formats a tool input string for display inside a details block.
 * @param input - the raw streamed tool input
 * @returns pretty JSON when possible, otherwise the original input
 */
function formatToolInput(input: string): string {
  try {
    // Parsed tool input, usually JSON for x_search.
    const parsed = JSON.parse(input) as unknown

    return JSON.stringify(parsed, null, 2)
  } catch {
    return input || "Waiting for input..."
  }
}

/**
 * Builds a compact label for one source URL.
 * @param url - the source URL
 * @returns a host-first source label
 */
function formatSourceLabel(url: string): string {
  try {
    // URL parser for a compact host label.
    const parsed = new URL(url)

    return parsed.hostname.replace(/^www\./, "")
  } catch {
    return "Source"
  }
}

/**
 * Renders the frequency, timezone, and mode-specific schedule fields.
 * @param props - schedule state and updater
 * @returns schedule controls for the test workflow form
 */
function ScheduleFields({
  onChange,
  schedule,
}: {
  onChange: (nextSchedule: TestScanSchedule) => void
  schedule: TestScanSchedule
}) {
  // Interval validation range for the selected frequency.
  const intervalRange = getScheduleIntervalRange(schedule.frequency)
  const scheduleError = getTestScanScheduleError(schedule)
  const timezoneOptions = getTimezoneOptions(schedule.timezone)

  /**
   * Updates a partial schedule patch.
   * @param patch - the schedule fields to replace
   * @returns nothing
   */
  function updateSchedule(patch: Partial<TestScanSchedule>) {
    onChange({ ...schedule, ...patch })
  }

  /**
   * Updates the repeat frequency and clamps the interval.
   * @param value - the selected frequency value
   * @returns nothing
   */
  function updateFrequency(value: string) {
    // Selected frequency from the shadcn select.
    const frequency = value as TestScheduleFrequency
    const nextRange = getScheduleIntervalRange(frequency)
    const interval = Math.min(
      Math.max(schedule.interval || nextRange.min, nextRange.min),
      nextRange.max,
    )

    updateSchedule({ frequency, interval })
  }

  /**
   * Updates the numeric interval field.
   * @param value - the raw input value
   * @returns nothing
   */
  function updateInterval(value: string) {
    // Digits-only interval value from the number-style text input.
    const cleaned = value.replace(/\D/g, "")

    updateSchedule({ interval: cleaned ? Number(cleaned) : 0 })
  }

  /**
   * Toggles one weekday in the weekly schedule.
   * @param weekday - the weekday value to toggle
   * @returns nothing
   */
  function toggleWeekday(weekday: WeekdayValue) {
    // Current selected weekdays before the toggle.
    const selected = schedule.weekdays.includes(weekday)
    const weekdays = selected
      ? schedule.weekdays.filter((day) => day !== weekday)
      : [...schedule.weekdays, weekday].sort((first, second) => first - second)

    updateSchedule({ weekdays })
  }

  return (
    <Field data-invalid={scheduleError ? true : undefined}>
      <FieldLabel>Schedule</FieldLabel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,10rem)_minmax(0,1fr)]">
          <Field>
            <FieldLabel htmlFor="test-schedule-frequency">Repeats</FieldLabel>
            <Select
              value={schedule.frequency}
              onValueChange={updateFrequency}
            >
              <SelectTrigger
                id="test-schedule-frequency"
                className="w-full text-foreground"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="test-schedule-interval">Every</FieldLabel>
            <Input
              id="test-schedule-interval"
              inputMode="numeric"
              max={intervalRange.max}
              min={intervalRange.min}
              pattern="[0-9]*"
              value={schedule.interval || ""}
              onChange={(event) => updateInterval(event.target.value)}
              aria-invalid={
                schedule.interval < intervalRange.min ||
                schedule.interval > intervalRange.max
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="test-schedule-starts-on">
              Starts on
            </FieldLabel>
            <Input
              id="test-schedule-starts-on"
              type="date"
              value={schedule.startsOn}
              onChange={(event) =>
                updateSchedule({ startsOn: event.target.value })
              }
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="test-schedule-timezone">Timezone</FieldLabel>
          <Select
            value={schedule.timezone}
            onValueChange={(timezone) => updateSchedule({ timezone })}
          >
            <SelectTrigger
              id="test-schedule-timezone"
              className="w-full text-foreground"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {timezoneOptions.map((timezone) => (
                  <SelectItem key={timezone} value={timezone}>
                    {timezone}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {schedule.frequency === "hourly" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
          <Field>
            <FieldLabel htmlFor="test-schedule-window-start">
              Active from
            </FieldLabel>
            <Input
              id="test-schedule-window-start"
              type="time"
              value={schedule.windowStart}
              onChange={(event) =>
                updateSchedule({ windowStart: event.target.value })
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="test-schedule-window-end">
              Active until
            </FieldLabel>
            <Input
              id="test-schedule-window-end"
              type="time"
              value={schedule.windowEnd}
              onChange={(event) =>
                updateSchedule({ windowEnd: event.target.value })
              }
            />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <Field>
            <FieldLabel htmlFor="test-schedule-run-at">Run at</FieldLabel>
            <Input
              id="test-schedule-run-at"
              type="time"
              value={schedule.runAt}
              onChange={(event) =>
                updateSchedule({ runAt: event.target.value })
              }
            />
          </Field>

          {schedule.frequency === "weekly" && (
            <Field>
              <FieldLabel>Weekdays</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {weekdayOptions.map((weekday) => {
                  // Whether this weekday is currently selected.
                  const isSelected = schedule.weekdays.includes(weekday.value)

                  return (
                    <Button
                      key={weekday.value}
                      type="button"
                      variant={isSelected ? "secondary" : "outline"}
                      size="sm"
                      aria-pressed={isSelected}
                      onClick={() => toggleWeekday(weekday.value)}
                    >
                      {weekday.shortLabel}
                    </Button>
                  )
                })}
              </div>
            </Field>
          )}
        </div>
      )}

      <FieldDescription>{describeSchedule(schedule)}</FieldDescription>
      {scheduleError && <FieldError>{scheduleError}</FieldError>}
    </Field>
  )
}

/**
 * Renders the collapsible thinking and tool-call progress panel.
 * @param props - streamed reasoning, tool calls, status, and metrics
 * @returns a thinking panel for a scan run
 */
function ThinkingPanel({
  metrics,
  reasoningText,
  status,
  toolCalls,
}: {
  metrics: TestScanMetrics | null
  reasoningText: string
  status: ScanStatus
  toolCalls: ToolCallView[]
}) {
  // Whether the scan is currently streaming.
  const isRunning = status === "running"
  const summary = isRunning
    ? "Thinking..."
    : `Thought for ${formatElapsed(metrics?.elapsedMs ?? 1_000)}`

  return (
    <details
      key={isRunning ? "thinking-open" : "thinking-closed"}
      open={isRunning || undefined}
      className="group rounded-lg border border-border bg-card text-card-foreground"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-medium marker:content-none">
        <span className="flex items-center gap-2">
          {isRunning && (
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin text-muted-foreground"
            />
          )}
          {summary}
        </span>
        <div className="flex items-center gap-2">
          {toolCalls.length > 0 && (
            <Badge variant="secondary">{toolCalls.length} tool calls</Badge>
          )}
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </div>
      </summary>

      <div className="space-y-4 border-t border-border px-4 py-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Reasoning summary
          </p>
          <p className="whitespace-pre-wrap text-base leading-7">
            {reasoningText || "Waiting for model reasoning summary..."}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Tool calls
          </p>
          {toolCalls.length > 0 ? (
            <div className="space-y-2">
              {toolCalls.map((toolCall) => (
                <details
                  key={toolCall.id}
                  className="rounded-lg border border-border bg-background/35"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 marker:content-none">
                    <span className="font-medium">{toolCall.name}</span>
                    <Badge variant={toolCall.completed ? "secondary" : "outline"}>
                      {toolCall.completed ? "Done" : "Running"}
                    </Badge>
                  </summary>
                  <pre className="overflow-x-auto whitespace-pre-wrap border-t border-border px-3 py-3 font-mono text-sm leading-6 text-muted-foreground">
                    {formatToolInput(toolCall.input)}
                  </pre>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-base text-muted-foreground">
              Waiting for tool calls...
            </p>
          )}
        </div>
      </div>
    </details>
  )
}

/**
 * Renders one final structured news item card.
 * @param props - the structured scan item to render
 * @returns a final result card
 */
function ScanItemCard({ item }: { item: TestScanItem }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base leading-7 text-muted-foreground">{item.body}</p>
        <div className="flex flex-wrap gap-2">
          {item.urls.map((url) => (
            <Badge key={url} variant="outline" asChild>
              <a href={url} target="_blank" rel="noreferrer noopener">
                {formatSourceLabel(url)}
              </a>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Renders the scan output area below the test form.
 * @param props - scan status, streamed progress, and final output
 * @returns the output surface for the current scan
 */
function ScanOutput({
  error,
  items,
  metrics,
  reasoningText,
  status,
  toolCalls,
}: {
  error: string | null
  items: TestScanItem[]
  metrics: TestScanMetrics | null
  reasoningText: string
  status: ScanStatus
  toolCalls: ToolCallView[]
}) {
  if (status === "idle") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan output</CardTitle>
          <CardDescription>
            Run a scan to see thinking, tool calls, cost, and final items here.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <section className="flex flex-col gap-4" aria-live="polite">
      <ThinkingPanel
        metrics={metrics}
        reasoningText={reasoningText}
        status={status}
        toolCalls={toolCalls}
      />

      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Scan failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {status === "complete" && (
        <div className="flex flex-col gap-3">
          <Badge variant="secondary">{formatCost(metrics?.costUsd ?? null)}</Badge>
          {items.length > 0 ? (
            <div className="grid gap-3">
              {items.map((item) => (
                <ScanItemCard key={`${item.title}-${item.urls[0]}`} item={item} />
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No items returned</CardTitle>
                <CardDescription>
                  The scan completed but did not return any structured items.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * Renders the minimal test workflow form and streamed scan output.
 * @returns the test workflow form UI
 */
export function TestWorkflowForm() {
  // Core form state for the test scan.
  const [workflowName, setWorkflowName] = useState("")
  const [schedule, setSchedule] = useState<TestScanSchedule>(
    createDefaultSchedule,
  )
  const [handles, setHandles] = useState<string[]>([...allowedXHandles])
  const [scanningInstructions, setScanningInstructions] = useState(
    defaultUserPrompt,
  )

  // Streamed scan rendering state.
  const [items, setItems] = useState<TestScanItem[]>([])
  const [metrics, setMetrics] = useState<TestScanMetrics | null>(null)
  const [reasoningText, setReasoningText] = useState("")
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle")
  const [toolCalls, setToolCalls] = useState<ToolCallView[]>([])

  // Validation state for the form controls.
  const scheduleError = getTestScanScheduleError(schedule)
  const scanningInstructionsError =
    getScanningInstructionsError(scanningInstructions)
  const instructionLineCount = countScanningInstructionLines(scanningInstructions)
  const canRunScan =
    workflowName.trim().length > 0 &&
    handles.length > 0 &&
    !scheduleError &&
    !scanningInstructionsError &&
    scanStatus !== "running"

  useEffect(() => {
    // Browser-local schedule defaults after hydration.
    const timeoutId = window.setTimeout(() => {
      const timezone = getBrowserTimezone()

      setSchedule((prev) => ({
        ...prev,
        startsOn: getLocalDateInputValue(),
        timezone,
      }))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  /**
   * Adds one normalized X handle to the form state.
   * @param handle - the handle returned by the handle input
   * @returns nothing
   */
  function addHandle(handle: string) {
    setHandles((prev) => [...prev, handle])
  }

  /**
   * Removes one X handle from the form state.
   * @param index - the handle index to remove
   * @returns nothing
   */
  function removeHandle(index: number) {
    setHandles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  /**
   * Updates scanning instructions while enforcing field limits.
   * @param value - the raw textarea value
   * @returns nothing
   */
  function updateScanningInstructions(value: string) {
    setScanningInstructions(limitScanningInstructions(value))
  }

  /**
   * Resets scan output before starting a new request.
   * @returns nothing
   */
  function resetScanOutput() {
    setItems([])
    setMetrics(null)
    setReasoningText("")
    setScanError(null)
    setToolCalls([])
  }

  /**
   * Applies one typed stream event to the output state.
   * @param event - the typed stream event from the API
   * @returns true when the event is terminal
   */
  function applyStreamEvent(event: TestScanStreamEvent): boolean {
    // Route each stream event into local render state.
    switch (event.type) {
      case "reasoning_delta":
        setReasoningText((prev) => prev + event.text)
        return false
      case "tool_call_started":
        setToolCalls((prev) => [
          ...prev,
          { id: event.id, name: event.name, input: "", completed: false },
        ])
        return false
      case "tool_call_input_delta":
        setToolCalls((prev) =>
          prev.map((toolCall) =>
            toolCall.id === event.id
              ? { ...toolCall, input: toolCall.input + event.text }
              : toolCall,
          ),
        )
        return false
      case "tool_call_completed":
        setToolCalls((prev) =>
          prev.map((toolCall) =>
            toolCall.id === event.id
              ? { ...toolCall, input: event.input, completed: true }
              : toolCall,
          ),
        )
        return false
      case "completed":
        setItems(event.items)
        setMetrics(event.metrics)
        setScanStatus("complete")
        return true
      case "error":
        setScanError(event.message)
        setScanStatus("error")
        return true
    }
  }

  /**
   * Starts the test scan and streams output into the result panels.
   * @returns a promise that settles when streaming finishes
   */
  async function runScan() {
    if (!canRunScan) return

    resetScanOutput()
    setScanStatus("running")

    try {
      // Test scan response stream from the dashboard API.
      const response = await fetch("/api/test-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowName,
          schedule,
          handles,
          scanningInstructions,
        }),
      })

      if (!response.ok) {
        // Plain-text validation or auth error from the API.
        const message = await response.text()

        throw new Error(message || "Scan failed.")
      }

      if (!response.body) {
        throw new Error("Scan did not return a readable stream.")
      }

      // Reader state for parsing newline-delimited JSON events.
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let pendingLine = ""
      let sawTerminalEvent = false

      while (true) {
        // Next chunk from the browser stream reader.
        const { done, value } = await reader.read()
        if (done) break

        pendingLine += decoder.decode(value, { stream: true })

        // Complete NDJSON lines available in the buffered chunk.
        const lines = pendingLine.split("\n")
        pendingLine = lines.pop() ?? ""

        for (const line of lines) {
          // Parsed event from one completed stream line.
          const event = parseStreamEvent(line)
          if (event && applyStreamEvent(event)) {
            sawTerminalEvent = true
          }
        }
      }

      pendingLine += decoder.decode()

      if (pendingLine.trim()) {
        // Final buffered stream event after the reader closes.
        const event = parseStreamEvent(pendingLine)
        if (event && applyStreamEvent(event)) {
          sawTerminalEvent = true
        }
      }

      if (!sawTerminalEvent) {
        throw new Error("Scan ended before returning final output.")
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Scan failed.")
      setScanStatus("error")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-2 md:px-4">
      <Card>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="test-workflow-name">Workflow name</FieldLabel>
              <Input
                id="test-workflow-name"
                value={workflowName}
                onChange={(event) => setWorkflowName(event.target.value)}
                placeholder="e.g. Barcelona transfer watch"
              />
            </Field>

            <ScheduleFields schedule={schedule} onChange={setSchedule} />

            <div className="grid gap-6 lg:grid-cols-2">
              <Field>
                <FieldLabel>X accounts to monitor (max {maxXHandles})</FieldLabel>
                <HandleInput
                  handles={handles}
                  maxHandles={maxXHandles}
                  controlClassName="min-h-72 items-start content-start"
                  onAdd={addHandle}
                  onRemove={removeHandle}
                />
              </Field>

              <Field data-invalid={scanningInstructionsError ? true : undefined}>
                <FieldLabel htmlFor="test-scanning-instructions">
                  Scanning instructions (max {scanningInstructionsMaxChars} chars
                  / {scanningInstructionsMaxLines} lines)
                </FieldLabel>
                <Textarea
                  id="test-scanning-instructions"
                  value={scanningInstructions}
                  maxLength={scanningInstructionsMaxChars}
                  onChange={(event) =>
                    updateScanningInstructions(event.target.value)
                  }
                  placeholder={defaultUserPrompt}
                  rows={12}
                  className="min-h-72 resize-y"
                  aria-invalid={scanningInstructionsError ? true : undefined}
                />
                <FieldDescription>
                  {scanningInstructions.length}/{scanningInstructionsMaxChars} chars
                  · {instructionLineCount}/{scanningInstructionsMaxLines} lines
                </FieldDescription>
                {scanningInstructionsError && (
                  <FieldError>{scanningInstructionsError}</FieldError>
                )}
              </Field>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={runScan}
                disabled={!canRunScan}
                pending={scanStatus === "running"}
              >
                {scanStatus === "running" ? "Scanning..." : "Run Scan"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <ScanOutput
        error={scanError}
        items={items}
        metrics={metrics}
        reasoningText={reasoningText}
        status={scanStatus}
        toolCalls={toolCalls}
      />
    </div>
  )
}
