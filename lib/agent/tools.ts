// lib/agent/tools.ts
//
// The oparaxXSearch agent tool, an AI SDK `tool()` def. grok's scan system prompt comes
// from lib/sysprompts. It is currently unwired from any live tool set — it stays defined
// here for a future scanning surface, see its own comment. SERVER-ONLY (transitively
// reads fs via lib/sysprompts).
//
// There is no handle-verification tool: the reporter's handles are taken as given
// and passed straight to the scan — a wrong handle simply returns nothing, no
// pre-check (fuzzy x_user_search couldn't confirm exact handles anyway; see the
// removed grok_verify_handles / closed issue #57).
import { tool } from "ai";
import { z } from "zod";
import { X_SEARCH_EXECUTOR_PROMPT } from "@/lib/sysprompts";
import { callResponses } from "./xai";

// grok is a DUMB EXECUTOR here. An orchestrator drafts the exact x_search
// subtool calls per its own strict guardrails; this tool relays them and grok
// runs them VERBATIM. All enforcement is in the prompts — the drafter's
// guardrails + this executor prompt — never in tool code.

/** One x_search subtool call DeepSeek drafted (e.g. x_keyword_search / x_semantic_search). */
const SubtoolCall = z.object({
  tool: z.string().describe("Subtool name, e.g. x_keyword_search or x_semantic_search."),
  args: z
    .record(z.string(), z.unknown())
    .describe("The exact arguments object for that subtool (query, limit, mode, usernames, etc.)."),
});

/** Input shape for oparaxXSearch — the drafted calls plus their handle/date scoping. */
const scanInputSchema = z.object({
  calls: z
    .array(SubtoolCall)
    .describe(
      "The exact x_search subtool calls to run, in order — drafted by you per your strict guardrails (1 x_keyword_search across all handles + 3–4 x_semantic_search). the search executor runs them verbatim.",
    ),
  handles: z
    .array(z.string())
    .max(20)
    .describe("Bare X usernames the search is scoped to (no @). Max 20."),
  fromDate: z
    .string()
    .describe("Day-window start YYYY-MM-DD (UTC) — `yesterday` from current_time."),
  toDate: z.string().describe("Day-window end YYYY-MM-DD (UTC) — `today` from current_time."),
});

/** Run an ordered list of drafted x_search subtool calls in parallel and merge their raw posts,
 *  per-subtool traces, and costs. Shared by the oparaxXSearch tool (chat + drafted-path scan) and
 *  by scan-run.ts's frozen-template path, which runs stored calls directly without a tool loop. */
export async function executeSearchCalls(
  calls: Array<{ tool: string; args: Record<string, unknown> }>,
  handles: string[],
  fromDate: string,
  toDate: string,
) {
  // Fire each drafted search as its OWN grok /responses call, in PARALLEL — one search per
  // call finishes fast, so wall-clock is the slowest single search, not the sum, and no call
  // does enough agentic work to hit xai.ts's 150s abort (the bundled all-in-one call is what
  // timed out on 20-handle scans). Merge the raw posts, per-subtool traces, and costs.
  const results = await Promise.all(
    calls.map((c) =>
      callResponses({
        system: X_SEARCH_EXECUTOR_PROMPT,
        user: `Run this X search call exactly as written, and return the raw retrieved posts:\n\n${c.tool} ${JSON.stringify(c.args)}`,
        handles,
        fromDate,
        toDate,
        effort: "none",
      }),
    ),
  );
  return {
    items: results
      .map((r) => r.items)
      .filter(Boolean)
      .join("\n\n"),
    sources: results.flatMap((r) => r.sources),
    subtoolCalls: results.flatMap((r) => r.subtoolCalls),
    costUsd: results.reduce((sum, r) => sum + (r.costUsd ?? 0), 0) || null,
    usage: results.map((r) => r.usage),
  };
}

export const oparaxXSearch = tool({
  description:
    "Execute a list of X (Twitter) search subtool calls that YOU (the orchestrator) have already drafted per your guardrails, and return the raw retrieved posts for you to synthesize. the search executor runs the calls verbatim — it does no query planning.",
  inputSchema: scanInputSchema,
  async execute({ calls, handles, fromDate, toDate }) {
    return executeSearchCalls(calls, handles, fromDate, toDate);
  },
});
