// Imports
import { createClient } from "@/lib/supabase/server"
import { createScanClient } from "@/lib/scan/client"
import { buildScanInstructions, buildScanUserPrompt } from "@/lib/scan/prompt"
import { buildScanRequest } from "@/lib/scan/request"
import { ScanStreamWriter, encodeScanEvent } from "@/lib/scan/stream"
import { parseScanItems, toStoryDraft } from "@/lib/scan/parse"
import {
  MONITOR_MAX_HANDLES,
  isValidHandle,
  normalizeHandle,
} from "@/lib/scan/handles"

// Node runtime for streaming; maxDuration headroom for xAI Responses API
export const runtime = "nodejs"
export const maxDuration = 300

/**
 * Preview scan for the create form: runs a streaming Grok x_search from RAW
 * form fields (no saved monitor) and emits the parsed stories in a terminal
 * preview_complete event. Persists NOTHING — the form persists on save.
 * @param req - the request carrying handles + monitoring description + window
 * @returns an NDJSON streaming response
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response("Authentication required.", { status: 401 })
  }

  // Parse + validate the raw form fields.
  const rawBody = (await req.json().catch(() => null)) as unknown
  if (typeof rawBody !== "object" || rawBody === null) {
    return new Response("Invalid JSON.", { status: 400 })
  }
  const body = rawBody as Record<string, unknown>

  const handles = Array.isArray(body.handles)
    ? [
        ...new Set(
          body.handles
            .filter((h): h is string => typeof h === "string")
            .map(normalizeHandle)
            .filter(Boolean),
        ),
      ]
    : []
  if (handles.length === 0) {
    return new Response("Add at least one handle to preview a scan.", {
      status: 400,
    })
  }
  if (handles.length > MONITOR_MAX_HANDLES) {
    return new Response(`Maximum ${MONITOR_MAX_HANDLES} handles allowed.`, {
      status: 400,
    })
  }
  const invalid = handles.find((handle) => !isValidHandle(handle))
  if (invalid) {
    return new Response(`"${invalid}" is not a valid X handle.`, { status: 400 })
  }

  const monitoringDescription =
    typeof body.monitoringDescription === "string"
      ? body.monitoringDescription
      : ""
  const scanFrom = typeof body.scanFrom === "string" ? body.scanFrom : null
  const scanTo = typeof body.scanTo === "string" ? body.scanTo : null

  const encoder = new TextEncoder()
  const client = createScanClient()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Enqueue one text chunk into the response stream.
      function write(value: string) {
        controller.enqueue(encoder.encode(value))
      }

      try {

        // Set up the stream writer and invoke Grok with xAI.
        const writer = new ScanStreamWriter((event) => {
          write(encodeScanEvent(event))
        })

        const responseStream = await client.responses.create(
          buildScanRequest({
            handles,
            fromDate: scanFrom,
            toDate: scanTo,
            instructions: buildScanInstructions(),
            userPrompt: buildScanUserPrompt(monitoringDescription),
          }),
        )

        // Walk the stream and record each event.
        for await (const event of responseStream) {
          writer.handle(event)
        }

        // Parse the structured JSON answer; emit error if invalid.
        const items = parseScanItems(writer.getAnswerText())
        const metrics = writer.getMetrics()
        if (!items) {
          write(
            encodeScanEvent({
              type: "error",
              message:
                "Scan completed, but the final JSON could not be parsed.",
            }),
          )
          controller.close()
          return
        }

        // Dedupe stories by dedupe_key.
        const seen = new Set<string>()
        const stories = items.map(toStoryDraft).filter((story) => {
          if (seen.has(story.dedupeKey)) return false
          seen.add(story.dedupeKey)
          return true
        })

        write(encodeScanEvent({ type: "preview_complete", stories, metrics }))
        controller.close()
      } catch (error) {
        write(
          encodeScanEvent({
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
