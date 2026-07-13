// lib/agent/tools.ts
//
// The three surviving eve tools, ported to AI SDK `tool()`. Descriptions,
// inputSchemas, and execute bodies are unchanged from their eve originals — they
// were already eve-free (raw fetch + pure modules). grok's system prompts come
// from lib/sysprompts instead of inline consts; save_agent's approval hook moves
// to the agent's toolApproval in agent.ts. SERVER-ONLY (transitively reads fs via
// lib/sysprompts).
import { tool } from "ai";
import { z } from "zod";
import { GROK_SCAN_PROMPT, GROK_VERIFY_PROMPT } from "@/lib/sysprompts";
import { deskConfigSchema } from "./desk-config";
import { callResponses } from "./xai";

// Handle verification is its OWN tool, separate from scanning. It runs once at
// agent setup (not per scan): confirm each watched handle maps to a real account,
// so the scan tool can later trust them. Sysprompt-enforced — grok is told to use
// ONLY x_user_search (a bare x_search, no scoping params) at count 3.
//
// TODO(db): a site-wide database of already-verified X handles will front this.
// The setup pipeline should: take the handles → check the DB → only pass the
// UNVERIFIED ones to this tool → write successful verifications back. The DB isn't
// built yet, so today this verifies whatever handles it's given.
export const grokVerifyHandles = tool({
  description:
    "Verify that watched X (Twitter) handles resolve to real accounts (one x_user_search per handle). Run this at agent setup, before scanning. Returns each handle's VERIFIED/NOT_FOUND status plus similar-username suggestions for misses.",
  inputSchema: z.object({
    handles: z.array(z.string()).max(20).describe("Bare X usernames to verify (no @). Max 20."),
  }),
  async execute({ handles }) {
    // TODO(db): check the site-wide verified-handles DB first and only verify the
    // uncached handles here; write successes back. Not built yet — verify all.
    const user = `Verify these X handles — one \`x_user_search\` (count 3) per handle:\n${handles
      .map((h) => `- ${h}`)
      .join("\n")}`;
    // Bare x_search (no allowed_x_handles / dates) so x_user_search runs unscoped.
    // maxTurns gives grok enough agentic turns to run one x_user_search per handle
    // (up to 20) + headroom, so a large handle set isn't silently truncated by
    // xAI's server-default turn cap.
    return callResponses({
      system: GROK_VERIFY_PROMPT,
      user,
      effort: "low",
      maxTurns: handles.length + 5,
    });
  },
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

/** Input shape for grokTwitterSearch — the drafted calls plus their handle/date scoping. */
const scanInputSchema = z.object({
  calls: z
    .array(SubtoolCall)
    .describe(
      "The exact x_search subtool calls to run, in order — drafted by you per your strict guardrails (1 x_keyword_search across all handles + 2 x_semantic_search). grok executes them verbatim.",
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

export const grokTwitterSearch = tool({
  description:
    "Execute a list of X (Twitter) search subtool calls that YOU (the orchestrator) have already drafted per your guardrails, and return the raw retrieved posts for you to synthesize. grok runs the calls verbatim — it does no query planning.",
  inputSchema: scanInputSchema,
  async execute({ calls, handles, fromDate, toDate }) {
    const user = `Run these calls in order, exactly as written:\n\n${calls
      .map((c, i) => `${i + 1}. ${c.tool} ${JSON.stringify(c.args)}`)
      .join("\n")}`;
    return callResponses({
      system: GROK_SCAN_PROMPT,
      user,
      handles,
      fromDate,
      toDate,
      effort: "none",
    });
  },
});

// Approval-gated echo — this tool must NEVER write to a database. Persistence
// happens in the app: the approval pause renders a Save card in the chat; the
// signed-in reporter's Save click inserts via a Next server action FIRST, then
// approves this call — so execute() running doubles as the model's proof the
// desk was really saved. "Not yet" denies, and the conversation continues. The
// cadence-based approval decision lives in the agent's toolApproval (agent.ts).
export const saveAgent = tool({
  description:
    "Present the completed desk for the reporter's final Save. Call ONLY at the save moment — after the desk is complete, read back in plain language, and the reporter has said an explicit yes. Pass the full final configuration. The call pauses on a Save card in the chat: clicking Save persists the desk and approves this call; 'Not yet' denies it — keep adjusting and offer again. Never claim the desk is saved unless this call completed.",
  inputSchema: deskConfigSchema,
  execute: async (config) => ({ ok: true as const, config }),
});
