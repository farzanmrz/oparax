// Imports
import { createClient } from "@/lib/supabase/server"
import { createScanClient } from "@/lib/scan/client"
import { buildScanInstructions, buildScanUserPrompt } from "@/lib/scan/prompt"
import { buildScanRequest } from "@/lib/scan/request"
import { ScanStreamWriter, encodeScanEvent } from "@/lib/scan/stream"
import { parseScanItems, toStoryDraft } from "@/lib/scan/parse"

// Node runtime is required for the OpenAI SDK stream; maxDuration gives the
// streamed scan headroom over the 180s client timeout (PLAN risk R8).
export const runtime = "nodejs"
export const maxDuration = 300

// Monitor fields the scan needs (selected under RLS, so ownership is enforced)
interface ScanMonitor {
  id: string
  monitored_handles: string[]
  monitoring_description: string
  scan_from: string | null
  scan_to: string | null
}

/**
 * Run a streaming Grok x_search scan for one monitor and persist the results.
 * Streams NDJSON live events; on completion stores a scans row + its stories,
 * then emits a terminal "persisted" event (so a client refresh sees the rows).
 * @param req - the scan request
 * @param ctx - route context carrying the monitor id param
 * @returns an NDJSON streaming response
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  // Capture Supabase client + auth at entry; never re-read cookies mid-stream
  const supabase = await createClient()

  // Fetch the signed-in user; a missing user returns early
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response("Authentication required.", { status: 401 })
  }

  // Extract monitor id from route params
  const { id } = await ctx.params

  // Fetch the monitor via RLS; a missing row means not-yours/none
  const { data: maybeMonitor } = await supabase
    .from("monitors")
    .select("id, monitored_handles, monitoring_description, scan_from, scan_to")
    .eq("id", id)
    .single<ScanMonitor>()

  if (!maybeMonitor) {
    return new Response("Monitor not found.", { status: 404 })
  }

  if (maybeMonitor.monitored_handles.length === 0) {
    return new Response("Add at least one handle before scanning.", {
      status: 400,
    })
  }

  // Non-null binding so the nested stream closures keep the narrowed type
  const monitor = maybeMonitor

  // Scan wall-clock start; reused for the persisted scans.started_at
  const startedAt = new Date()

  // Text encoder for the response stream
  const encoder = new TextEncoder()

  // Grok client configured for this request
  const client = createScanClient()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Enqueue one text chunk into the response stream
      function write(value: string) {
        controller.enqueue(encoder.encode(value))
      }

      // Insert a failed scans row and emit a terminal error event
      async function failScan(message: string) {
        try {
          await supabase.from("scans").insert({
            monitor_id: monitor.id,
            status: "failed",
            started_at: startedAt.toISOString(),
            completed_at: new Date().toISOString(),
            error_message: message,
          })
        } catch {
          // Best-effort: surface the original error to the client regardless
        }

        write(encodeScanEvent({ type: "error", message }))
        controller.close()
      }

      try {
        // Writer to emit live events and accumulate the structured JSON response
        const writer = new ScanStreamWriter((event) => {
          write(encodeScanEvent(event))
        })

        // Stream the Grok response with the monitor's scan config
        const responseStream = await client.responses.create(
          buildScanRequest({
            handles: monitor.monitored_handles,
            fromDate: monitor.scan_from,
            toDate: monitor.scan_to,
            instructions: buildScanInstructions(),
            userPrompt: buildScanUserPrompt(monitor.monitoring_description),
          }),
        )

        // Consume the stream and write live events
        for await (const event of responseStream) {
          writer.handle(event)
        }

        // Parse the structured JSON into story drafts
        const items = parseScanItems(writer.getAnswerText())

        // Compute metrics from the response usage
        const metrics = writer.getMetrics()

        if (!items) {
          await failScan(
            "Scan completed, but the final JSON could not be parsed.",
          )
          return
        }

        // Dedupe stories within the scan to satisfy unique(scan_id, dedupe_key)
        const seen = new Set<string>()

        const drafts = items.map(toStoryDraft).filter((draft) => {
          if (seen.has(draft.dedupeKey)) return false
          seen.add(draft.dedupeKey)
          return true
        })

        // Insert under the captured user session; transitive RLS allows it via monitor ownership
        const { data: scan, error: scanError } = await supabase
          .from("scans")
          .insert({
            monitor_id: monitor.id,
            status: "completed",
            started_at: startedAt.toISOString(),
            completed_at: new Date().toISOString(),
            cost_usd: metrics.costUsd,
            x_search_count: metrics.xSearchCalls,
            story_count: drafts.length,
            raw_output: items,
          })
          .select("id")
          .single<{ id: string }>()

        if (scanError || !scan) {
          await failScan("Scan completed, but the scan record failed to save.")
          return
        }

        if (drafts.length > 0) {
          // Insert the story rows
          const { error: storiesError } = await supabase.from("stories").insert(
            drafts.map((draft) => ({
              scan_id: scan.id,
              monitor_id: monitor.id,
              title: draft.title,
              summary: draft.summary,
              source_urls: draft.sourceUrls,
              primary_tweet_url: draft.primaryTweetUrl,
              dedupe_key: draft.dedupeKey,
            })),
          )

          if (storiesError) {
            await failScan("Scan completed, but stories failed to save.")
            return
          }
        }

        // Emit the terminal event so the client can refresh
        write(
          encodeScanEvent({
            type: "persisted",
            scanId: scan.id,
            storyCount: drafts.length,
            metrics,
          }),
        )
        controller.close()
      } catch (error) {
        await failScan(
          error instanceof Error ? error.message : "Unknown scan error.",
        )
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
