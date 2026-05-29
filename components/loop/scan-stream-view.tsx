"use client"

// Imports
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ScanStreamEvent } from "@/lib/scan/stream"

// Live state of a streamed scan run
type ScanStatus = "idle" | "running" | "done" | "error"

// A tool call (x_search) surfaced during the scan
interface ToolCallView {
  id: string
  name: string
  input: string
  completed: boolean
}

// Final metrics shown after a successful scan
interface ScanResultView {
  storyCount: number
  costUsd: number | null
  xSearchCalls: number | null
}

/**
 * Parse one NDJSON line into a scan event, or null if it is not a valid event.
 * @param line - one NDJSON line from the scan stream
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
 * Scan control + live reasoning / tool-call / cost stream view.
 * On a successful (persisted) run it refreshes the route so the server-rendered
 * story list picks up the newly stored rows.
 * @param props.monitorId - the monitor to scan
 * @returns the scan control + live stream UI
 */
export function ScanStreamView({ monitorId }: { monitorId: string }) {
  const router = useRouter()

  // Live scan state, reasoning output, tool calls, final result, and any error
  const [status, setStatus] = useState<ScanStatus>("idle")
  const [reasoning, setReasoning] = useState("")
  const [toolCalls, setToolCalls] = useState<ToolCallView[]>([])
  const [result, setResult] = useState<ScanResultView | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Apply one event to local state; returns true for terminal events
  function applyEvent(event: ScanStreamEvent): boolean {

    // Route each event type to its state update
    switch (event.type) {
      case "reasoning_delta":
        setReasoning((prev) => prev + event.text)
        return false
      case "tool_call_started":
        setToolCalls((prev) => [
          ...prev,
          { id: event.id, name: event.name, input: "", completed: false },
        ])
        return false
      case "tool_call_input_delta":
        setToolCalls((prev) =>
          prev.map((call) =>
            call.id === event.id
              ? { ...call, input: call.input + event.text }
              : call,
          ),
        )
        return false
      case "tool_call_completed":
        setToolCalls((prev) =>
          prev.map((call) =>
            call.id === event.id
              ? { ...call, input: event.input, completed: true }
              : call,
          ),
        )
        return false
      case "persisted":
        setResult({
          storyCount: event.storyCount,
          costUsd: event.metrics.costUsd,
          xSearchCalls: event.metrics.xSearchCalls,
        })
        setStatus("done")
        return true
      case "error":
        setError(event.message)
        setStatus("error")
        return true
    }
  }

  // Fetch the scan stream and process events as they arrive
  async function runScan() {
    if (status === "running") return

    // Reset state before starting a new scan
    setReasoning("")
    setToolCalls([])
    setResult(null)
    setError(null)
    setStatus("running")

    try {
      // Fetch the scan stream
      const response = await fetch(`/api/monitors/${monitorId}/scan`, {
        method: "POST",
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || "Scan failed.")
      }

      if (!response.body) {
        throw new Error("Scan did not return a readable stream.")
      }

      // Read and parse the NDJSON response stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let pendingLine = ""
      let sawTerminalEvent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        pendingLine += decoder.decode(value, { stream: true })

        // Split on newlines and process complete lines
        const lines = pendingLine.split("\n")
        pendingLine = lines.pop() ?? ""

        for (const line of lines) {
          const event = parseScanEvent(line)
          if (event && applyEvent(event)) sawTerminalEvent = true
        }
      }

      // Handle any remaining partial line
      pendingLine += decoder.decode()
      if (pendingLine.trim()) {
        const event = parseScanEvent(pendingLine)
        if (event && applyEvent(event)) sawTerminalEvent = true
      }

      if (!sawTerminalEvent) {
        throw new Error("Scan ended before returning final output.")
      }

      // Refresh so the server-rendered story list shows the new rows
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.")
      setStatus("error")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">Scan</CardTitle>
        <Button
          onClick={runScan}
          pending={status === "running"}
          disabled={status === "running"}
        >
          {status === "running" ? "Scanning…" : "Run scan"}
        </Button>
      </CardHeader>
      {(status !== "idle" || reasoning || toolCalls.length > 0) && (
        <CardContent className="flex flex-col gap-4">
          {reasoning && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Reasoning
              </span>
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                {reasoning}
              </p>
            </div>
          )}

          {toolCalls.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {toolCalls.length} tool call{toolCalls.length === 1 ? "" : "s"}
              </span>
              <ul className="flex flex-col gap-1 text-sm">
                {toolCalls.map((call) => (
                  <li key={call.id} className="text-muted-foreground">
                    {call.name} {call.completed ? "✓" : "…"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result && (
            <p className="text-sm text-muted-foreground">
              Done — {result.storyCount} stor
              {result.storyCount === 1 ? "y" : "ies"}
              {result.xSearchCalls !== null
                ? ` · ${result.xSearchCalls} x_search call${result.xSearchCalls === 1 ? "" : "s"}`
                : ""}
              {result.costUsd !== null
                ? ` · $${result.costUsd.toFixed(6)}`
                : ""}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      )}
    </Card>
  )
}
