// Imports
import { createClient } from "@/lib/supabase/server"
import { createScanClient } from "@/lib/scan/client"
import { buildScanRequest } from "@/lib/scan/request"
import { ScanStreamWriter, encodeScanEvent } from "@/lib/scan/stream"
import { parseScanItems, toStoryDraft } from "@/lib/scan/parse"
import {
  MONITOR_MAX_HANDLES,
  isValidHandle,
  normalizeHandle,
} from "@/lib/scan/handles"

// Node runtime for the OpenAI SDK stream; headroom over the 180s client timeout.
export const runtime = "nodejs"
export const maxDuration = 300

/**
 * Prompt-lab scan: stream a Grok x_search from the editable system + user
 * prompts and handles, and emit the parsed stories in a terminal
 * preview_complete event. Ephemeral — persists nothing (post does that).
 * @param req - the request carrying handles + scan system/user prompts
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

  // Parse + validate the editable lab fields.
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
    return new Response("Add at least one handle to scan.", { status: 400 })
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

  const systemPrompt =
    typeof body.systemPrompt === "string" ? body.systemPrompt : ""
  const userPrompt = typeof body.userPrompt === "string" ? body.userPrompt : ""
  if (!systemPrompt.trim() || !userPrompt.trim()) {
    return new Response("Scan system and user prompts are required.", {
      status: 400,
    })
  }

  const encoder = new TextEncoder()
  const client = createScanClient()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Enqueue one text chunk into the response stream.
      function write(value: string) {
        controller.enqueue(encoder.encode(value))
      }

      try {
        const writer = new ScanStreamWriter((event) => {
          write(encodeScanEvent(event))
        })

        const responseStream = await client.responses.create(
          buildScanRequest({
            handles,
            fromDate: null,
            toDate: null,
            instructions: systemPrompt,
            userPrompt,
          }),
        )

        for await (const event of responseStream) {
          writer.handle(event)
        }

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

        // Dedupe stories so each selectable item is distinct.
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
