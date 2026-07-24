// lib/agent/tools.ts
//
// The two agent tools, AI SDK `tool()` defs. grok's scan system prompt comes from
// lib/sysprompts. `oparaxXSearch` is currently unwired from the create-desk assistant's
// tool set (agent.ts) — it stays defined here for a future scanning surface, see its own
// comment. `saveAgent` needs no approval gate — it is a pure echo, see its own comment.
// SERVER-ONLY (transitively reads fs via lib/sysprompts).
//
// There is no handle-verification tool: the reporter's handles are taken as given
// and passed straight to the scan — a wrong handle simply returns nothing, no
// pre-check (fuzzy x_user_search couldn't confirm exact handles anyway; see the
// removed grok_verify_handles / closed issue #57).
import { tool } from "ai";
import { z } from "zod";
import { X_SEARCH_EXECUTOR_PROMPT } from "@/lib/sysprompts";
import { callResponses } from "./xai";

/** The create-desk form's actual field shape (app/agents/new/create-desk-form.tsx +
 *  createDesk, app/agents/new/actions.ts) — NOT deskConfigSchema (lib/agent/desk-config.ts),
 *  which is the old, unrelated onboarding-chat shape (drafting instructions, account tier,
 *  scan frequency) that this form has no columns or fields for. Kept separate on purpose:
 *  deskConfigSchema still backs the live scan-frequency rate rail (lib/agent/scan-frequency.ts)
 *  and lib/agents.ts's display formatter, so it must not be repurposed or edited here. */
const createDeskFormSchema = z.object({
  name: z
    .string()
    .trim()
    .describe("A short desk name — may be empty; the form falls back to a beat-derived label."),
  beat: z.string().trim().min(1).describe("The clarified, specific beat description."),
  trackedHandles: z
    .array(z.string().regex(/^[A-Za-z0-9_]{1,15}$/))
    .max(20)
    .describe("Bare X handles, no @, as confirmed with the reporter — never invented."),
  reporterHandle: z.string().trim().min(1).describe("The reporter's own X handle, bare, no @."),
});

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

// Pure echo — this tool must NEVER write to a database and needs no approval gate.
// Persistence happens in the app, not in chat: the create-desk form (app/agents/new/
// create-desk-form.tsx) reads this call's result off the tool part and pushes the
// clarified values into its own field state, which the reporter reviews and submits
// themselves via the existing "Create desk" button (createDesk, app/agents/new/
// actions.ts). This call doubles as the model's signal that clarification is done —
// there is no separate confirm/save step inside the chat anymore.
export const saveAgent = tool({
  description:
    "Return the clarified desk fields once the beat reads clear and specific, and the reporter's name, tracked X accounts, and own X handle are either already filled in on the form or the reporter has said they'll fill them in directly. Pass the values exactly as confirmed — never invent a handle. This call never saves anything itself; the form is the reporter's only persist path.",
  inputSchema: createDeskFormSchema,
  execute: async (config) => ({ ok: true as const, config }),
});
