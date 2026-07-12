// agent/tools/current_time.ts
import { defineTool } from "eve/tools";
import { z } from "zod";
import { DEFAULT_ONBOARDING_INTERVAL_MINUTES, sinceUnixFor } from "../lib/cadence";

// Real-time clock + derived scan-window bounds for the orchestrator. The chat
// model (DeepSeek) has no clock (see .claude/rules/agent.md), so it calls this to
// get accurate bounds and hands them straight to grok_twitter_search. Timing
// enters the pipeline from OUTSIDE the search tool at this one boundary: a future
// eve schedule or Vercel cron overrides the reference here without touching the
// search tool. The since-window is CADENCE-DERIVED — it tiles back one scan
// interval (floored at the 1h minimum, plus a boundary overlap) instead of a
// fixed 1h. During onboarding, before any cadence is saved, `intervalMinutes` is
// omitted and the default onboarding window applies.
export default defineTool({
  description:
    "Return the current UTC time and the derived scan-window bounds. Call this before grok_twitter_search and pass the values straight through — they come from the real server clock, so never guess the date or time yourself. Pass `intervalMinutes` only when a scan cadence has already been settled (validate_cadence.intervalMinutes); omit it for the onboarding scan and the default window applies.",
  inputSchema: z.object({
    intervalMinutes: z
      .number()
      .optional()
      .describe(
        "Minutes between scans for the settled cadence (validate_cadence.intervalMinutes). Omit during onboarding — the default onboarding window is used. Floored at the 1h minimum.",
      ),
  }),
  async execute({ intervalMinutes }) {
    const now = new Date();
    const nowUnix = Math.floor(now.getTime() / 1000);
    const day = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const sinceUnix = sinceUnixFor(nowUnix, intervalMinutes ?? DEFAULT_ONBOARDING_INTERVAL_MINUTES);
    // The day-window start (fromDate) must COVER the since bound: at least
    // yesterday, but earlier when a long cadence pushes sinceUnix further back —
    // otherwise x_search's coarse from_date would clamp the fine since_time: and
    // silently drop the older posts the since-window was meant to reach.
    const windowStartUnix = Math.min(sinceUnix, nowUnix - 24 * 60 * 60);
    return {
      nowUnix, // current time, unix seconds
      // freshness floor → grok_twitter_search keyword since_time: (cadence-derived, 1h floor + overlap)
      sinceUnix,
      today: day(now), // → grok_twitter_search.toDate
      // day-window start (covers sinceUnix) → grok_twitter_search.fromDate
      yesterday: day(new Date(windowStartUnix * 1000)),
    };
  },
});
