// The desk agent: a per-request ToolLoopAgent factory. Built fresh per turn so the
// injected clock block is stamped at turn start. The DeepSeek chat leg is a plain AI
// Gateway string; grok tools do their own raw-fetch scanning. SERVER-ONLY.
import { type InferAgentUIMessage, stepCountIs, ToolLoopAgent } from "ai";
import { DESK_AGENT_PROMPT } from "@/lib/sysprompts";
import type { DeskConfig } from "./desk-config";
import {
  DEFAULT_ONBOARDING_INTERVAL_MINUTES,
  sinceUnixFor,
  validateScanFrequency,
} from "./scan-frequency";
import { grokTwitterSearch, saveAgent } from "./tools";

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
    reasoning: "medium", // v7 top-level, provider-agnostic
    providerOptions: { gateway: { sort: "cost" } }, // cheapest provider, BYOK no surcharge
    instructions: `${DESK_AGENT_PROMPT}\n\n${clockBlock(now)}`,
    tools: {
      // keys keep the names the prompt commands by name
      grok_twitter_search: grokTwitterSearch,
      save_agent: saveAgent,
    },
    // The save gate: a scan frequency that slipped past the prompt's self-check is auto-denied
    // with a reason the model self-corrects from; a valid config pauses for the reporter's
    // click. This is the ONLY deterministic scan-frequency enforcement in the agent flow.
    toolApproval: {
      save_agent: (input: DeskConfig) => {
        const verdict = validateScanFrequency(input.scanFrequency);
        return verdict.ok
          ? "user-approval"
          : {
              type: "denied" as const,
              reason: `Scan frequency violates the rate rail (${verdict.violations.join(", ")}) — correct the schedule, then offer to save again.`,
            };
      },
    },
    // The prompt chains scan+draft in one turn; give the loop headroom.
    stopWhen: stepCountIs(20),
  });
}

export type DeskAgentUIMessage = InferAgentUIMessage<ReturnType<typeof createDeskAgent>>;
