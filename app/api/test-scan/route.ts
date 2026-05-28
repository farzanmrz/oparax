// Imports
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"

// Route runtime required for the OpenAI SDK stream.
export const runtime = "nodejs"

// Grok model, sampling, date, and structured-output settings.
const MODEL = "grok-4.3"
const REASONING_EFFORT = "low"
const REASONING_SUMMARY = "detailed"
const TEMPERATURE = 0
const TOP_P = 1
const MAX_OUTPUT_TOKENS = 1_000_000
const MAX_TURNS = 5
const REQUEST_TIMEOUT_MS = 180_000
const FROM_DATE = "2026-05-20"
const TO_DATE = "2026-05-28"
const STRUCTURED_OUTPUT_FORMAT = {
  type: "json_schema",
  name: "atomic_news_items",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            urls: {
              type: "array",
              minItems: 1,
              description:
                "Direct x.com or twitter.com source post/profile URLs from x_search.",
              items: {
                type: "string",
                format: "uri",
                pattern: "https://(x|twitter)\\.com/.+",
              },
            },
          },
          required: ["title", "body", "urls"],
        },
      },
    },
    required: ["items"],
  },
}

// System instruction shared by the terminal and frontend test scans.
const SYSPROMPT = `You are a source-grounded news aggregation assistant for professional reporters. You take the user prompt and retrieve relevant news about it.

Rules:
- Build one news item per atomic angle.
- Do not merge separate quotes, claims, or developments just because they involve the same person, club, interview, press conference, or match.
- Put direct x.com or twitter.com source post/profile URLs in each item's urls array.
- Do not put external websites, article URLs, or links merely mentioned inside X posts in urls.
- If an X post links to an article, include the X post URL itself, not the article URL.
- Return all distinct, non-overlapping news items you can find in reverse chronological order. Do not cap the list to a top-N summary.`

/**
 * Checks whether an unknown value is object-like and safe to inspect.
 * @param value - the value to check before reading dynamic fields
 * @returns true when the value is a non-null object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/**
 * Reads a trimmed string field from the request body.
 * @param body - the parsed request body
 * @param key - the field to read from the body
 * @returns the trimmed string value or an empty string
 */
function getBodyString(body: Record<string, unknown>, key: string): string {

  // Raw body field being normalized into a string.
  const value = body[key]
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Normalizes requested X handles into xAI's accepted handle format.
 * @param body - the parsed request body
 * @returns up to 20 valid handles without leading `@`
 */
function getBodyHandles(body: Record<string, unknown>): string[] {

  // Raw handles field submitted by the test form.
  const value = body.handles
  if (!Array.isArray(value)) return []

  return value
    .filter((handle): handle is string => typeof handle === "string")
    .map((handle) => handle.trim().replace(/^@/, ""))
    .filter((handle) => /^[A-Za-z0-9_]{1,15}$/.test(handle))
    .slice(0, 20)
}

/**
 * Returns the scan telemetry useful for comparing test runs.
 * @param response - the completed response object returned by xAI
 * @returns x_search call count and USD cost
 */
function responseTelemetry(response: unknown) {
  if (!isRecord(response)) {
    return { x_search_calls: null, cost_usd: null }
  }

  // Usage object that holds tool counts and billed cost ticks.
  const usage = response.usage
  if (!isRecord(usage)) {
    return { x_search_calls: null, cost_usd: null }
  }

  // Tool call count and cost fields exposed after streaming.
  const toolUsage = usage.server_side_tool_usage_details
  const costTicks = usage.cost_in_usd_ticks

  return {
    x_search_calls:
      isRecord(toolUsage) && typeof toolUsage.x_search_calls === "number"
        ? toolUsage.x_search_calls
        : null,
    cost_usd:
      typeof costTicks === "number"
        ? Number((costTicks / 1e10).toFixed(6))
        : null,
  }
}

/**
 * Builds a stable key for one reasoning-summary part.
 * @param itemId - the response output item id for the summary
 * @param summaryIndex - the summary part index inside that item
 * @returns a key suitable for buffering and de-duplicating summary parts
 */
function reasoningSummaryKey(itemId: string, summaryIndex: number): string {
  return `${itemId}:${summaryIndex}`
}

/**
 * Streams one test Grok scan back to the frontend console block.
 * @param req - the incoming test scan request
 * @returns a streaming text response for the test workflow page
 */
export async function POST(req: Request) {

  // Supabase auth gates the dashboard-only test endpoint.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response("Authentication required.", { status: 401 })
  }

  // Parsed request body submitted by the test workflow form.
  const rawBody = (await req.json().catch(() => null)) as unknown
  if (!isRecord(rawBody)) {
    return new Response("Invalid JSON.", { status: 400 })
  }

  // Minimal form fields needed to run the scan.
  const workflowName = getBodyString(rawBody, "workflowName")
  const scanningInstructions = getBodyString(rawBody, "scanningInstructions")
  const handles = getBodyHandles(rawBody)

  if (!workflowName || !scanningInstructions || handles.length === 0) {
    return new Response(
      "Workflow name, scanning instructions, and at least one X account are required.",
      { status: 400 },
    )
  }

  // Stream encoder and xAI client for this request.
  const encoder = new TextEncoder()
  const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: REQUEST_TIMEOUT_MS,
  })

  // Browser-readable stream that mirrors the terminal test output.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {

      /**
       * Writes one text chunk into the response stream.
       * @param value - the text chunk to send to the browser
       * @returns nothing
       */
      function write(value: string) {
        controller.enqueue(encoder.encode(value))
      }

      try {

        // xAI response stream for the current test scan.
        const responseStream = await client.responses.create({
          model: MODEL,
          instructions: SYSPROMPT,
          temperature: TEMPERATURE,
          top_p: TOP_P,
          max_output_tokens: MAX_OUTPUT_TOKENS,
          max_turns: MAX_TURNS,
          reasoning: { effort: REASONING_EFFORT, summary: REASONING_SUMMARY },
          tools: [
            {
              type: "x_search",
              allowed_x_handles: handles,
              from_date: FROM_DATE,
              to_date: TO_DATE,
            },
          ],
          text: { format: STRUCTURED_OUTPUT_FORMAT },
          stream: true,
          input: [{ role: "user", content: scanningInstructions }],
        } as unknown as OpenAI.Responses.ResponseCreateParamsStreaming)

        // Accumulate response state while the stream closes.
        let finalResponse: OpenAI.Responses.Response | undefined
        let printedReasoningSummaryHeader = false
        let printedReasoningPartCount = 0
        let printedAnswerHeader = false
        let printedToolCallsHeader = false
        let printedToolCallItem = false
        let closedToolCallsJson = false
        let currentToolName = ""
        let currentToolInput = ""
        const reasoningSummaryBuffers = new Map<string, string>()
        const printedReasoningSummaryKeys = new Set<string>()

        /**
         * Prints one completed reasoning-summary part with clear boundaries.
         * @param key - the stable key for the reasoning-summary part
         * @param text - the completed reasoning-summary text
         * @returns nothing
         */
        function printReasoningSummaryPart(key: string, text: string) {
          if (printedReasoningSummaryKeys.has(key)) return

          if (!printedReasoningSummaryHeader) {
            write("\n\n=== REASONING SUMMARY ===\n")
            printedReasoningSummaryHeader = true
          }

          printedReasoningPartCount += 1
          if (printedReasoningPartCount > 1) {
            write("\n")
          }

          write(`--- part ${printedReasoningPartCount} ---\n`)
          write(`${text.trimEnd()}\n`)
          printedReasoningSummaryKeys.add(key)
        }

        /**
         * Prints any buffered reasoning summaries missing done events.
         * @returns nothing
         */
        function flushPendingReasoningSummaries() {

          // Print each unfinished reasoning-summary buffer once.
          for (const [key, text] of reasoningSummaryBuffers) {
            if (text.trim()) {
              printReasoningSummaryPart(key, text)
            }
          }
        }

        // Walk each stream event and dispatch on its type.
        for await (const event of responseStream) {

          // Route each event type to its handler.
          switch (event.type) {
            case "response.output_item.added":
              if (event.item.type === "custom_tool_call") {
                currentToolName = event.item.name
                currentToolInput = ""
              }
              break
            case "response.reasoning_summary_text.delta":
              {

                // Buffer the streamed delta until xAI sends the completed summary part.
                const key = reasoningSummaryKey(event.item_id, event.summary_index)
                const previousText = reasoningSummaryBuffers.get(key) ?? ""
                reasoningSummaryBuffers.set(key, previousText + event.delta)
              }
              break
            case "response.reasoning_summary_text.done":
              {

                // Prefer xAI's completed summary text over our assembled delta buffer.
                const key = reasoningSummaryKey(event.item_id, event.summary_index)
                reasoningSummaryBuffers.set(key, event.text)
                printReasoningSummaryPart(key, event.text)
              }
              break
            case "response.reasoning_summary_part.done":
              {

                // Some streams complete the summary part object before text.done.
                const key = reasoningSummaryKey(event.item_id, event.summary_index)
                reasoningSummaryBuffers.set(key, event.part.text)
                printReasoningSummaryPart(key, event.part.text)
              }
              break
            case "response.custom_tool_call_input.delta":
              currentToolInput += event.delta
              break
            case "response.custom_tool_call_input.done":
              if (!printedToolCallsHeader) {
                write("\n\n=== TOOL CALLS ===\n")
                write("[\n")
                printedToolCallsHeader = true
              }
              if (printedToolCallItem) {
                write(",\n")
              }
              write(
                JSON.stringify(
                  {
                    tool_name: currentToolName || "unknown",
                    input: currentToolInput || "(no input)",
                  },
                  null,
                  2,
                )
                  .split("\n")
                  .map((line) => `  ${line}`)
                  .join("\n"),
              )
              printedToolCallItem = true
              break
            case "response.output_text.delta":
              if (printedToolCallsHeader && !closedToolCallsJson) {
                write("\n]\n")
                closedToolCallsJson = true
              }
              if (!printedAnswerHeader) {
                write("\n\n=== STRUCTURED JSON ===\n")
                printedAnswerHeader = true
              }
              write(event.delta)
              break
            case "response.completed":
              finalResponse = event.response
              break
          }
        }

        flushPendingReasoningSummaries()

        if (printedToolCallsHeader && !closedToolCallsJson) {
          write("\n]\n")
        }

        write("\n\n=== RESPONSE METRICS ===\n")
        write(`${JSON.stringify(responseTelemetry(finalResponse), null, 2)}\n`)

        controller.close()
      } catch (error) {
        write("\n\n=== ERROR ===\n")
        write(error instanceof Error ? error.message : "Unknown scan error.")
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
