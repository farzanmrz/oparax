// The desk agent: a per-request ToolLoopAgent factory. Built fresh per turn so the
// injected clock block is stamped at turn start. The DeepSeek chat leg is a plain AI
// Gateway string; grok tools do their own raw-fetch scanning. SERVER-ONLY.
import { type InferAgentUIMessage, stepCountIs, ToolLoopAgent } from "ai";
import { DESK_AGENT_PROMPT } from "@/lib/sysprompts";
import { DEFAULT_ONBOARDING_INTERVAL_MINUTES, sinceUnixFor } from "./scan-frequency";
import { saveAgent } from "./tools";

// The LLM has no clock. Instead of a tool it must remember to call, every turn gets a
// stamped # Clock block appended to the system prompt: nowUnix + the derived scan-window
// bounds, straight from the real server clock. The since-window uses the default onboarding
// interval — scan-frequency-derived widening is the (unbuilt) scheduler's job.
function clockBlock(now: Date): string {
  const nowUnix = Math.floor(now.getTime() / 1000);
  const sinceUnix = sinceUnixFor(nowUnix, DEFAULT_ONBOARDING_INTERVAL_MINUTES);
  const day = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  // fromDate (yesterday) must COVER the since bound so x_search's coarse from_date can't
  // clamp the fine since_time: and drop older posts.
  const windowStartUnix = Math.min(sinceUnix, nowUnix - 24 * 60 * 60);
  return [
    "# Clock",
    "",
    `nowUnix: ${nowUnix}`,
    `sinceUnix: ${sinceUnix}`,
    `today: ${day(now)}`,
    `yesterday: ${day(new Date(windowStartUnix * 1000))}`,
  ].join("\n");
}

export function createDeskAgent(now: Date = new Date()) {
  return new ToolLoopAgent({
    // DeepSeek chat leg via the Vercel AI Gateway (plain gateway string).
    model: "deepseek/deepseek-v4-flash",
    // No `reasoning`: DeepSeek V4 defaults to thinking ON and self-scales effort by
    // difficulty (see .claude/rules/agent.md). An explicit level here is a no-op at best
    // (`medium` just maps to the default `high`) — don't re-add one.
    providerOptions: { gateway: { sort: "cost" } }, // cheapest provider, BYOK no surcharge
    instructions: `${DESK_AGENT_PROMPT}\n\n${clockBlock(now)}`,
    // Just save_agent — this assistant only clarifies the create-desk form's beat and
    // confirms its other fields; it no longer scans X for stories. oparax_x_search stays
    // defined in tools.ts for a future scanning surface, just not wired into this tool
    // set (keys keep the name the prompt commands by).
    tools: {
      save_agent: saveAgent,
    },
    // No `toolApproval` entry: save_agent performs no write (a pure echo, see its own
    // comment in tools.ts), so it needs no approval gate. An unlisted tool resolves to
    // the AI SDK's `not-applicable` status and runs immediately, no pause — the old
    // scan-frequency-based gate here is gone along with the scan-frequency field itself,
    // which the create-desk form has no concept of.
    // The prompt chains scan+draft in one turn; give the loop headroom.
    stopWhen: stepCountIs(20),
  });
}

export type DeskAgentUIMessage = InferAgentUIMessage<ReturnType<typeof createDeskAgent>>;
