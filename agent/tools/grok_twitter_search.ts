import { xai } from "@ai-sdk/xai";
import { generateText, isStepCount } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

// The scan sysprompt — all xSearch subtool nudging lives here.
const SYSTEM_PROMPT = `You are a news scanning engine for a reporter's beat. Your ONLY data source is X (Twitter) search. You are given the reporter's beat instructions; the watched X handles and the date window are already enforced by the search tool configuration.

How to search:

- Search liberally before concluding: run several narrow keyword and semantic searches with different phrasings rather than one broad query.
- When a post is ambiguous on its own, fetch its thread or look up the author so the item is understood in context.
- The window is already restricted to roughly the last day server-side; do not request or reason about older material.

What counts as news (relative to the beat instructions):

- Concrete, new developments: announcements, releases, incidents, decisions, numbers, on-the-record statements.
- NOT news: replies without substance, retweet chatter, jokes, vague hype with no new fact.

Output format — return ONLY this, as plain markdown:

# Scan results

One \`##\` section per distinct news development:

## <one-line headline you write>

- what: 1–3 sentences stating the concrete development, neutral newsroom voice
- who: the handle(s) whose post(s) this comes from
- when: the post timestamp(s) as reported by search
- posts: the post URL(s)

If nothing qualifies, return exactly:

# Scan results

No qualifying news items found in the window.

Never pad the output with commentary, methodology notes, or apologies.`;

// YYYY-MM-DD (UTC), `daysAgo` days back — one day is xSearch's date floor.
function isoDay(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export default defineTool({
  description:
    "Search X (Twitter) for news from roughly the last day matching the reporter's beat, restricted to the given handles. Returns the scanned items as markdown plus source links.",
  inputSchema: z.object({
    instructions: z.string().describe("The beat: what to look for and what counts as news."),
    handles: z
      .array(z.string())
      .max(10)
      .describe("Bare X usernames to watch (no @). Max 10 — the xai SDK's hard cap."),
  }),
  async execute({ instructions, handles }) {
    const result = await generateText({
      model: xai.responses("grok-4.3"),
      system: SYSTEM_PROMPT,
      prompt: `Beat instructions:\n${instructions}\n\nWatched handles (already enforced by the search tool): ${handles.join(", ")}`,
      // xai server-side tools carry no execute fn, so they don't satisfy
      // ToolSet's type; the provider executes them remotely at xAI.
      tools: {
        x_search: xai.tools.xSearch({
          allowedXHandles: handles,
          fromDate: isoDay(1),
          toDate: isoDay(0),
        }),
      } as unknown as Parameters<typeof generateText>[0]["tools"],
      stopWhen: isStepCount(8),
    });

    return {
      items: result.text,
      sources: result.sources.filter((s) => s.sourceType === "url").map((s) => s.url),
    };
  },
});
