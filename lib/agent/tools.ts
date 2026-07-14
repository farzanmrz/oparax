// lib/agent/tools.ts
//
// The two agent tools, AI SDK `tool()` defs. grok's scan system prompt comes from
// lib/sysprompts; save_agent's approval hook lives in the agent's toolApproval
// (agent.ts). SERVER-ONLY (transitively reads fs via lib/sysprompts).
//
// There is no handle-verification tool: the reporter's handles are taken as given
// and passed straight to the scan — a wrong handle simply returns nothing, no
// pre-check (fuzzy x_user_search couldn't confirm exact handles anyway; see the
// removed grok_verify_handles / closed issue #57).
import { tool } from "ai";
import { z } from "zod";
import { X_SEARCH_EXECUTOR_PROMPT } from "@/lib/sysprompts";
import { deskConfigSchema } from "./desk-config";
import { callResponses } from "./xai";

// grok is a DUMB EXECUTOR here. DeepSeek (the reasoner) drafts the exact x_search
// subtool calls per its own strict guardrails (see lib/sysprompts/desk-agent.md);
// this tool relays them and grok runs them VERBATIM. All enforcement is in the
// prompts — DeepSeek's drafter guardrails + this executor prompt — never in tool
// code.

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
      "The exact x_search subtool calls to run, in order — drafted by you per your strict guardrails (1 x_keyword_search across all handles + 2 x_semantic_search). the search executor runs them verbatim.",
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

export const oparaxXSearch = tool({
  description:
    "Execute a list of X (Twitter) search subtool calls that YOU (the orchestrator) have already drafted per your guardrails, and return the raw retrieved posts for you to synthesize. the search executor runs the calls verbatim — it does no query planning.",
  inputSchema: scanInputSchema,
  async execute({ calls, handles, fromDate, toDate }) {
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
  },
});

// Approval-gated echo — this tool must NEVER write to a database. Persistence
// happens in the app: the approval pause renders a Save card in the chat; the
// signed-in reporter's Save click inserts via a Next server action FIRST, then
// approves this call — so execute() running doubles as the model's proof the
// desk was really saved. "Not yet" denies, and the conversation continues. The
// scan frequency-based approval decision lives in the agent's toolApproval (agent.ts).
export const saveAgent = tool({
  description:
    "Present the completed desk for the reporter's final Save. Call ONLY at the save moment — after the desk is complete, read back in plain language, and the reporter has said an explicit yes. Pass the full final configuration. The call pauses on a Save card in the chat: clicking Save persists the desk and approves this call; 'Not yet' denies it — keep adjusting and offer again. Never claim the desk is saved unless this call completed.",
  inputSchema: deskConfigSchema,
  execute: async (config) => ({ ok: true as const, config }),
});
