// Imports
import { persistRunResult } from "@/lib/scan/persist";
import { runScanStream } from "@/lib/scan/run";
import { scanToUIResponse } from "@/lib/scan/ui-stream";
import { createClient } from "@/lib/supabase/server";
import type { Agent } from "@/lib/types";

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
      "id, user_id, name, monitored_handles, monitoring_description, drafting_instructions, scan_from, scan_to, search_x, search_web, preferred_domains, example_tweets",
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
  // Voice (drafting_instructions) is OPTIONAL — the draft leg degrades to a neutral
  // voice when empty. Do not gate the run on it (mirrors the create-chat first-scan gate).

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
    searchWeb: agent.search_web ?? false,
    preferredDomains: agent.preferred_domains ?? [],
    abortSignal: AbortSignal.timeout(240_000),
    onAbort: () => {
      // Timeout/abort fired — onFinish never runs, so close the run here. Best-effort.
      supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "Run timed out before completing.",
        })
        .eq("id", runId)
        .eq("status", "running")
        .then(undefined, (e) => console.error("onAbort run update failed", e));
    },
  });

  // SERVER-DRIVEN COMPLETION (the root never-hang fix, spec §3.2): consumeStream fully drives
  // the model and resolves regardless of whether any client reads the response. We chain
  // persistRunResult after it, so a closed tab / navigation / dropped network has ZERO
  // correctness consequence. The browser stream below is pure UX (live progress). NOT awaited.
  // We deliberately do NOT also wire scanToUIResponse's onFinish — consumeStream is the single
  // completion driver, so there is no double-persist race.
  void Promise.resolve(
    result.consumeStream({
      onError: (error) => console.error("consumeStream error (manual run):", error),
    }),
  )
    .then(() =>
      persistRunResult({
        supabase,
        runId,
        agentId: agent.id,
        userId: user.id,
        result,
        startedAt,
        source: "manual",
        draftingInstructions: agent.drafting_instructions ?? "",
        exampleTweets: agent.example_tweets ?? [],
      }),
    )
    .catch((error: unknown) => {
      console.error("manual run persistence failed:", error);
      supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Run failed.",
        })
        .eq("id", runId)
        .then(undefined, () => {});
    });

  // Pure UX: the response stream is decorative; the client may disconnect at any time.
  return scanToUIResponse(result);
}
