// Imports
import { createClient } from "@/lib/supabase/server"
import { createScanClient } from "@/lib/scan/client"
import { buildScanRequest } from "@/lib/scan/request"
import {
  buildAgentRunUserPrompt,
  buildScanInstructions,
} from "@/lib/scan/prompt"
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
 * Prompt-lab run: stream a Grok x_search from the editable handles + tagged
 * scan/draft user prompt, and emit parsed stories with draft previews in a
 * terminal preview_complete event. Ephemeral — save persists the preview.
 * @param req - the request carrying handles + scan/draft instructions
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

  const { data: connection } = await supabase
    .from("x_connections")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>()
  if (!connection) {
    return new Response("Connect X before creating an agent.", { status: 403 })
  }

  // Parse + validate the editable lab fields.
  const rawBody = (await req.json().catch(() => null)) as unknown
  if (typeof rawBody !== "object" || rawBody === null) {
    return new Response("Invalid JSON.", { status: 400 })
  }
  const body = rawBody as Record<string, unknown>
  const name = typeof body.name === "string" ? body.name.trim() : ""

  if (!name) {
    return new Response("Agent name is required.", { status: 400 })
  }

  const { data: existingAgents, error: existingError } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", name)
    .limit(1)

  if (existingError) {
    return new Response("Failed to check existing agents.", { status: 500 })
  }
  if ((existingAgents ?? []).length > 0) {
    return new Response("An agent with this name already exists.", {
      status: 409,
    })
  }

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

  const scanningInstructions =
    typeof body.userPrompt === "string"
      ? body.userPrompt
      : typeof body.scanningInstructions === "string"
        ? body.scanningInstructions
        : ""
  const draftingInstructions =
    typeof body.draftingInstructions === "string"
      ? body.draftingInstructions
      : ""
  if (!scanningInstructions.trim()) {
    return new Response("A scan user prompt is required.", { status: 400 })
  }
  if (!draftingInstructions.trim()) {
    return new Response("Drafting instructions are required.", { status: 400 })
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
            instructions: buildScanInstructions(),
            userPrompt: buildAgentRunUserPrompt({
              scanningInstructions,
              draftingInstructions,
            }),
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
