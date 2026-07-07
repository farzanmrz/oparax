import { xai } from "@ai-sdk/xai";
import { generateText, isStepCount } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

// The scan sysprompt — all xSearch subtool nudging lives here. Output-format
// enforcement is intentionally relaxed for now (ft/44) so we can inspect grok's
// full, unshaped output while debugging its subtool behavior; re-tighten once
// the nudging is dialed in.
const SYSTEM_PROMPT = `You are a news scanning engine for a reporter's beat. Your ONLY data source is X (Twitter) search. You are given the reporter's beat instructions; the watched X handles and the date window are already enforced by the search tool configuration.

How to search:

- Search liberally before concluding: run several narrow keyword and semantic searches with different phrasings rather than one broad query.
- When a post is ambiguous on its own, fetch its thread or look up the author so the item is understood in context.
- Stay within the enforced date window; do not request or reason about older material.

What counts as news (relative to the beat instructions):

- Concrete, new developments: announcements, releases, incidents, decisions, numbers, on-the-record statements.
- NOT news: replies without substance, retweet chatter, jokes, vague hype with no new fact.

Report each qualifying development with a one-line headline, what happened (1-3 sentences, neutral newsroom voice), the handle(s) it came from, the timestamp(s), and the post URL(s). If nothing qualifies, say so plainly. Do not pad with methodology notes or apologies.`;

export default defineTool({
  description:
    "Search X (Twitter) for news matching the reporter's beat, restricted to the given handles and date window. Returns the scanned items plus the full grok result for debugging.",
  inputSchema: z.object({
    instructions: z.string().describe("The beat: what to look for and what counts as news."),
    handles: z
      .array(z.string())
      .max(10)
      .describe("Bare X usernames to watch (no @). Max 10 — the xai SDK's hard cap."),
    fromDate: z
      .string()
      .describe("Start of the scan window as YYYY-MM-DD (UTC) — the day before today."),
    toDate: z.string().describe("End of the scan window as YYYY-MM-DD (UTC) — today's date."),
  }),
  async execute({ instructions, handles, fromDate, toDate }) {
    const result = await generateText({
      model: xai.responses("grok-4.3"),
      system: SYSTEM_PROMPT,
      prompt: `Beat instructions:\n${instructions}\n\nWatched handles (already enforced by the search tool): ${handles.join(
        ", ",
      )}\nDate window: ${fromDate} to ${toDate}`,
      // xai server-side tools carry no execute fn, so they don't satisfy
      // ToolSet's type; the provider executes them remotely at xAI.
      tools: {
        x_search: xai.tools.xSearch({
          allowedXHandles: handles,
          fromDate,
          toDate,
        }),
      } as unknown as Parameters<typeof generateText>[0]["tools"],
      stopWhen: isStepCount(8),
    });

    // DEBUG (ft/44): surface grok's FULL output so we can see and tune its
    // subtool nudging — the model text, every source/citation, provider
    // metadata (xAI's server_side_tool_usage subtool breakdown lives here),
    // token usage, and finish reason. Trim to a clean projection later.
    return {
      items: result.text,
      sources: result.sources,
      finishReason: result.finishReason,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
    };
  },
});
