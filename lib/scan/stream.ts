// Imports
import type OpenAI from "openai"

// Stream event types and scan output parsing
// One atomic news item from the scan's structured JSON output
export interface ScanItem {
  title: string
  body: string
  urls: string[]
}

// Server-reported scan metrics (xAI returns authoritative cost + tool counts)
export interface ScanMetrics {
  costUsd: number | null
  elapsedMs: number
  xSearchCalls: number | null
}

// NDJSON events streamed to the browser: live events from the writer + terminal persisted event
export type ScanStreamEvent =
  | { type: "reasoning_delta"; text: string }
  | { type: "tool_call_started"; id: string; name: string }
  | { type: "tool_call_input_delta"; id: string; text: string }
  | { type: "tool_call_completed"; id: string; input: string }
  | {
      type: "persisted"
      scanId: string
      storyCount: number
      metrics: ScanMetrics
    }
  | { type: "error"; message: string }

/**
 * Encode one scan event as an NDJSON line (one JSON object + newline).
 * @param event - the scan stream event to encode
 * @returns the newline-terminated JSON string
 */
export function encodeScanEvent(event: ScanStreamEvent): string {
  return `${JSON.stringify(event)}\n`
}

/**
 * Narrow an unknown value to a plain record.
 * @param value - the value to test
 * @returns true if value is a non-null, non-array object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Consume the xAI Responses stream, emit live NDJSON events, and accumulate
 * the final structured-JSON answer + usage. Reproduced fresh from the proven
 * TestScanStreamWriter; the route owns persistence and the terminal event.
 */
export class ScanStreamWriter {
  private answerText = ""
  private finalResponse: OpenAI.Responses.Response | undefined
  private readonly startedAt: number
  private readonly toolInputs = new Map<string, string>()
  private readonly write: (event: ScanStreamEvent) => void

  /**
   * @param write - callback that writes one event into the response stream
   */
  constructor(write: (event: ScanStreamEvent) => void) {
    this.startedAt = Date.now()
    this.write = write
  }

  /**
   * Route one xAI Responses stream event into a typed browser event.
   * @param event - one event from the Responses API stream
   */
  handle(event: OpenAI.Responses.ResponseStreamEvent) {
    switch (event.type) {
      case "response.output_item.added":
        if (event.item.type === "custom_tool_call") {
          // Stable id linking later input deltas to this tool call.
          const toolCallId = event.item.id ?? event.item.call_id
          this.toolInputs.set(toolCallId, "")
          this.write({
            type: "tool_call_started",
            id: toolCallId,
            name: event.item.name,
          })
        }
        break
      case "response.reasoning_summary_text.delta":
      case "response.reasoning_text.delta":
        this.write({ type: "reasoning_delta", text: event.delta })
        break
      case "response.custom_tool_call_input.delta":
        this.appendToolInput(event.item_id, event.delta)
        this.write({
          type: "tool_call_input_delta",
          id: event.item_id,
          text: event.delta,
        })
        break
      case "response.custom_tool_call_input.done":
        this.toolInputs.set(event.item_id, event.input)
        this.write({
          type: "tool_call_completed",
          id: event.item_id,
          input: event.input,
        })
        break
      case "response.output_text.delta":
        this.answerText += event.delta
        break
      case "response.completed":
        this.finalResponse = event.response
        if (!this.answerText && event.response.output_text) {
          this.answerText = event.response.output_text
        }
        break
      case "error":
        this.write({ type: "error", message: event.message })
        break
      case "response.failed":
        this.write({
          type: "error",
          message: event.response.error?.message ?? "Scan response failed.",
        })
        break
      case "response.incomplete":
        this.write({
          type: "error",
          message: "Scan response ended before completion.",
        })
        break
    }
  }

  /**
   * The accumulated structured-JSON answer text after the stream ends.
   * @returns the raw answer text to be parsed into items
   */
  getAnswerText(): string {
    return this.answerText
  }

  /**
   * Build server-reported metrics from the final response usage.
   * @returns cost (ticks/1e10), elapsed ms, and x_search call count
   */
  getMetrics(): ScanMetrics {
    const usage = isRecord(this.finalResponse?.usage)
      ? this.finalResponse.usage
      : null
    const toolUsage = isRecord(usage?.server_side_tool_usage_details)
      ? usage.server_side_tool_usage_details
      : null
    const costTicks = usage?.cost_in_usd_ticks

    return {
      elapsedMs: Date.now() - this.startedAt,
      xSearchCalls:
        typeof toolUsage?.x_search_calls === "number"
          ? toolUsage.x_search_calls
          : null,
      costUsd:
        typeof costTicks === "number"
          ? Number((costTicks / 1e10).toFixed(6))
          : null,
    }
  }

  /**
   * Append one tool-input delta to the per-tool buffer.
   * @param id - the streamed tool call item id
   * @param delta - the latest tool input delta
   */
  private appendToolInput(id: string, delta: string) {
    const previous = this.toolInputs.get(id) ?? ""
    this.toolInputs.set(id, previous + delta)
  }
}
