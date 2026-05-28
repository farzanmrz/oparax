// Imports
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"
import {
  TestScanStreamWriter,
  buildResponseParams,
  encodeTestScanEvent,
  getScanningInstructionsError,
  maxXHandles,
  parseTestScanSchedule,
  requestTimeoutMs,
} from "@/lib/test-scan-config"

// Route runtime required for the OpenAI SDK stream.
export const runtime = "nodejs"

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
    .slice(0, maxXHandles)
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
  if (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody)) {
    return new Response("Invalid JSON.", { status: 400 })
  }
  const body = rawBody as Record<string, unknown>

  // Minimal form fields needed to run the scan.
  const workflowName = getBodyString(body, "workflowName")
  const scanningInstructions = getBodyString(body, "scanningInstructions")
  const handles = getBodyHandles(body)
  const schedule = parseTestScanSchedule(body.schedule)

  if (!workflowName || !scanningInstructions || handles.length === 0) {
    return new Response(
      "Workflow name, scanning instructions, and at least one X account are required.",
      { status: 400 },
    )
  }

  if (!schedule) {
    return new Response("Choose a valid schedule.", { status: 400 })
  }

  // Scanning instructions must stay inside the test page prompt limits.
  const scanningInstructionsError = getScanningInstructionsError(
    scanningInstructions,
  )
  if (scanningInstructionsError) {
    return new Response(scanningInstructionsError, { status: 400 })
  }

  // Stream encoder and xAI client for this request.
  const encoder = new TextEncoder()
  const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: requestTimeoutMs,
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
        const output = new TestScanStreamWriter((event) => {
          write(encodeTestScanEvent(event))
        })
        const responseStream = await client.responses.create(
          buildResponseParams({
            handles,
            userPrompt: scanningInstructions,
          }),
        )

        for await (const event of responseStream) {
          output.handle(event)
        }

        output.finish()
        controller.close()
      } catch (error) {
        write(
          encodeTestScanEvent({
            type: "error",
            message:
              error instanceof Error ? error.message : "Unknown scan error.",
          }),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  })
}
