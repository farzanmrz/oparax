// Imports
import { createScanClient } from "@/lib/scan/client"
import { parseScanItems, toStoryDraft } from "@/lib/scan/parse"
import {
  buildAgentRunUserPrompt,
  buildScanInstructions,
} from "@/lib/scan/prompt"
import { buildScanRequest } from "@/lib/scan/request"
import { encodeScanEvent, ScanStreamWriter } from "@/lib/scan/stream"
import { createClient } from "@/lib/supabase/server"
import type { Agent, RunItemInsert } from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 300

type AgentRunConfig = Pick<
  Agent,
  | "id"
  | "user_id"
  | "name"
  | "monitored_handles"
  | "monitoring_description"
  | "drafting_instructions"
  | "scan_from"
  | "scan_to"
  | "status"
>

/**
 * Run a saved agent: one streamed Grok scan+draft call, then persisted
 * runs/run_items rows for the agent detail page.
 * @param _req - unused request body
 * @param context.params - dynamic agent id
 * @returns NDJSON stream of reasoning/tool events and a persisted terminal event
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response("Authentication required.", { status: 401 })
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select(
      "id, user_id, name, monitored_handles, monitoring_description, drafting_instructions, scan_from, scan_to, status",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<AgentRunConfig>()

  if (agentError) {
    return new Response("Failed to load agent.", { status: 500 })
  }
  if (!agent) {
    return new Response("Agent not found.", { status: 404 })
  }
  if (agent.status === "inactive") {
    return new Response("Reconnect X to reactivate this agent.", { status: 409 })
  }
  if (agent.monitored_handles.length === 0) {
    return new Response("Add at least one handle to monitor.", { status: 400 })
  }
  if (!agent.monitoring_description.trim()) {
    return new Response("Scanning instructions are required.", { status: 400 })
  }
  if (!agent.drafting_instructions.trim()) {
    return new Response("Drafting instructions are required.", { status: 400 })
  }

  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      agent_id: agent.id,
      source: "manual",
      status: "running",
      inputs: {
        handles: agent.monitored_handles,
        monitoringDescription: agent.monitoring_description,
        draftingInstructions: agent.drafting_instructions,
      },
    })
    .select("id")
    .single<{ id: string }>()

  if (runError || !run) {
    return new Response("Failed to create run.", { status: 500 })
  }
  const runId = run.id

  const encoder = new TextEncoder()
  const client = createScanClient()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function write(value: string) {
        controller.enqueue(encoder.encode(value))
      }

      async function fail(message: string) {
        await supabase
          .from("runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: message,
          })
          .eq("id", runId)
        write(encodeScanEvent({ type: "error", message }))
        controller.close()
      }

      try {
        const writer = new ScanStreamWriter((event) => {
          write(encodeScanEvent(event))
        })

        const responseStream = await client.responses.create(
          buildScanRequest({
            handles: agent.monitored_handles,
            fromDate: agent.scan_from,
            toDate: agent.scan_to,
            instructions: buildScanInstructions(),
            userPrompt: buildAgentRunUserPrompt({
              scanningInstructions: agent.monitoring_description,
              draftingInstructions: agent.drafting_instructions,
            }),
          }),
        )

        for await (const event of responseStream) {
          writer.handle(event)
        }

        const items = parseScanItems(writer.getAnswerText())
        const metrics = writer.getMetrics()
        if (!items) {
          await fail("Run completed, but the final JSON could not be parsed.")
          return
        }

        const seen = new Set<string>()
        const stories = items.map(toStoryDraft).filter((story) => {
          if (seen.has(story.dedupeKey)) return false
          seen.add(story.dedupeKey)
          return true
        })

        const runItems: RunItemInsert[] = stories.map((story) => ({
          run_id: runId,
          agent_id: agent.id,
          story_title: story.title,
          story_summary: story.summary,
          source_urls: story.sourceUrls,
          primary_tweet_url: story.primaryTweetUrl,
          dedupe_key: story.dedupeKey,
          drafted_text: story.draft,
          final_text: story.draft,
          status: "drafted",
        }))

        if (runItems.length > 0) {
          const { error: itemsError } = await supabase
            .from("run_items")
            .insert(runItems)
          if (itemsError) {
            await fail("Run completed, but its items could not be saved.")
            return
          }
        }

        const { error: updateError } = await supabase
          .from("runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            cost_usd: metrics.costUsd,
            x_search_count: metrics.xSearchCalls,
            item_count: runItems.length,
            error_message: null,
          })
          .eq("id", runId)

        if (updateError) {
          await fail("Run items saved, but the run summary could not be saved.")
          return
        }

        write(
          encodeScanEvent({
            type: "persisted",
            runId,
            storyCount: runItems.length,
            metrics,
          }),
        )
        controller.close()
      } catch (error) {
        await fail(error instanceof Error ? error.message : "Unknown run error.")
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
