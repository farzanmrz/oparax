import { defineTool } from "eve/tools";
import { z } from "zod";
import { callResponses } from "../lib/xai";

// grok is a DUMB EXECUTOR here. DeepSeek (the reasoner) drafts the exact x_search
// subtool calls per its own strict guardrails (see agent/instructions.md); this
// tool relays them and grok runs them VERBATIM. All enforcement is in the prompts
// — DeepSeek's drafter guardrails + this executor prompt — never in tool code.
export const SYSTEM_PROMPT = `# Role

You are a search executor. You are handed an ordered list of X (Twitter) search subtool calls. Run each call EXACTLY as written, in order, with the exact arguments given — do not modify, rewrite, reorder, merge, add, or skip any call, and do not invent your own queries or apply judgment about what is relevant or newsworthy.

# Output

Return the raw retrieved posts only. For each post, give four fields verbatim: the handle, the timestamp, the **exact tweet text word-for-word** (never a headline, paraphrase, or summary of it), and the **direct post URL** (\`https://x.com/<handle>/status/<id>\`). If a call returns nothing, say so for that call. Do not summarize, rank, filter, or editorialize — the reporter's desk does that downstream.`;

/** One x_search subtool call DeepSeek drafted (e.g. x_keyword_search / x_semantic_search). */
const SubtoolCall = z.object({
  tool: z.string().describe("Subtool name, e.g. x_keyword_search or x_semantic_search."),
  args: z
    .record(z.string(), z.unknown())
    .describe("The exact arguments object for that subtool (query, limit, mode, usernames, etc.)."),
});

/**
 * Input shape for grok_twitter_search — exported so evals can assert against the
 * real type; a field rename then breaks the assertion at compile time instead of
 * silently rotting.
 */
export const scanInputSchema = z.object({
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
export type ScanInput = z.infer<typeof scanInputSchema>;

export default defineTool({
  description:
    "Execute a list of X (Twitter) search subtool calls that YOU (the orchestrator) have already drafted per your guardrails, and return the raw retrieved posts for you to synthesize. grok runs the calls verbatim — it does no query planning.",
  inputSchema: scanInputSchema,
  async execute({ calls, handles, fromDate, toDate }) {
    const user = `Run these calls in order, exactly as written:\n\n${calls
      .map((c, i) => `${i + 1}. ${c.tool} ${JSON.stringify(c.args)}`)
      .join("\n")}`;
    return callResponses({
      system: SYSTEM_PROMPT,
      user,
      handles,
      fromDate,
      toDate,
      effort: "none",
    });
  },
});
