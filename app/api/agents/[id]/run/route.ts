// Imports
import { SCAN_MODEL } from "@/lib/ai/providers";
import { runScanStream } from "@/lib/scan/run";
import { extractMetrics, scanToUIResponse, storiesFromOutput } from "@/lib/scan/ui-stream";
import { createClient } from "@/lib/supabase/server";
import type { Agent, RunItemInsert } from "@/lib/types";
import { logUsage } from "@/lib/usage/log";

export const runtime = "nodejs";
export const maxDuration = 300;

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
  | "search_x"
  | "search_web"
  | "preferred_domains"
  | "example_tweets"
>;

/**
 * Run a saved agent: one streamed AI SDK scan+draft call, then persisted
 * runs/run_items rows for the agent detail page.
 * @param _req - unused request body
 * @param context.params - dynamic agent id
 * @returns AI SDK UI message stream response
 */
export async function POST(
  _req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Authentication required.", {
      status: 401,
    });
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select(
      "id, user_id, name, monitored_handles, monitoring_description, drafting_instructions, scan_from, scan_to, status, search_x, search_web, preferred_domains, example_tweets",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<AgentRunConfig>();

  if (agentError) {
    return new Response("Failed to load agent.", {
      status: 500,
    });
  }
  if (!agent) {
    return new Response("Agent not found.", {
      status: 404,
    });
  }
  if (agent.status === "inactive") {
    return new Response("Reconnect X to reactivate this agent.", {
      status: 409,
    });
  }
  // Require at least one active source. X is active when search_x is on (handles are
  // optional — empty handles means describe-only X search). Web is active when
  // search_web is on. Honor search_x: stale handles must not force an X scan.
  if (!agent.search_x && !agent.search_web) {
    return new Response("Enable at least one source: turn on X or web search.", {
      status: 400,
    });
  }
  if (!agent.monitoring_description.trim()) {
    return new Response("Scanning instructions are required.", {
      status: 400,
    });
  }
  if (!agent.drafting_instructions.trim()) {
    return new Response("Drafting instructions are required.", {
      status: 400,
    });
  }

  // Only scan the configured handles when X is enabled; otherwise X is off entirely.
  const effectiveHandles = agent.search_x ? agent.monitored_handles : [];

  // Create the run record up front (status: running)
  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      agent_id: agent.id,
      source: "manual",
      status: "running",
      inputs: {
        handles: effectiveHandles,
        monitoringDescription: agent.monitoring_description,
        draftingInstructions: agent.drafting_instructions,
      },
    })
    .select("id")
    .single<{
      id: string;
    }>();

  if (runError || !run) {
    return new Response("Failed to create run.", {
      status: 500,
    });
  }
  const runId = run.id;

  const startedAt = Date.now();
  const result = runScanStream({
    searchX: agent.search_x,
    handles: effectiveHandles,
    fromDate: agent.scan_from,
    toDate: agent.scan_to,
    scanningInstructions: agent.monitoring_description,
    draftingInstructions: agent.drafting_instructions,
    exampleTweets: agent.example_tweets ?? [],
    searchWeb: agent.search_web ?? false,
    preferredDomains: agent.preferred_domains ?? [],
  });

  return scanToUIResponse(result, {
    onError: (error) => {
      // Mark the run failed if the stream errors before onFinish can run.
      // Best-effort — do not await so we don't block the error response.
      supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Stream error.",
        })
        .eq("id", runId)
        .then(undefined, (e) => console.error("onError run update failed", e));
      return error instanceof Error ? error.message : "An error occurred.";
    },
    onFinish: async () => {
      try {
        const [output, metrics] = await Promise.all([
          result.output,
          extractMetrics(result, startedAt),
        ]);

        if (!output) {
          await supabase
            .from("runs")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error_message: "Run completed, but structured output was missing.",
            })
            .eq("id", runId);
          return;
        }

        const stories = storiesFromOutput(output);

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
        }));

        if (runItems.length > 0) {
          const { error: itemsError } = await supabase.from("run_items").insert(runItems);
          if (itemsError) {
            await supabase
              .from("runs")
              .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                error_message: "Run completed, but its items could not be saved.",
              })
              .eq("id", runId);
            return;
          }
        }

        await supabase
          .from("runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            cost_usd: metrics.costUsd,
            x_search_count: metrics.xSearchCalls,
            item_count: runItems.length,
            error_message: null,
          })
          .eq("id", runId);

        await logUsage({
          kind: "scan",
          provider: "xai",
          resolved_provider: "xai",
          tool_name: "scan",
          model: SCAN_MODEL,
          user_id: user.id,
          agent_id: agent.id,
          run_id: runId,
          input_tokens: metrics.inputTokens,
          output_tokens: metrics.outputTokens,
          xSearchCalls: metrics.xSearchCalls,
          metadata: {
            elapsedMs: metrics.elapsedMs,
            xSearchCalls: metrics.xSearchCalls,
            storyCount: runItems.length,
          },
        });
      } catch (error) {
        console.error("onFinish error in [id]/run:", error);
        await supabase
          .from("runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : "Unknown run error.",
          })
          .eq("id", runId)
          .then(undefined, () => {});
      }
    },
  });
}
