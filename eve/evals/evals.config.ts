import { defineEvalConfig } from "eve/evals";

// Shared defaults for the Oparax eval suite. `judge` sets the LLM-as-judge model
// for t.judge.* assertions (behavioral/quality checks that can't be exact-matched
// — the agent rewords every run). Kept reporter-less for now; add Braintrust here
// when we want shared result review.
//
// NOTE: every eval below drives the REAL DeepSeek + grok pipeline over the HTTP
// surface, so `eve eval` makes real model + tool calls (cost + latency). Keep the
// suite lean and run it deliberately, not on every commit.
export default defineEvalConfig({
  // Judge for the behavioral closedQA checks. gemini-3.1-flash-lite has enough
  // reasoning to grade our yes/no criteria ("did the agent ask for handles?",
  // "is the draft ≤280 and dry?") without the cost of a full frontier model —
  // and it's BYOK-cheap through our own gateway key. Routed through the AI Gateway
  // (plain provider/model string) exactly like the agent's own model, so it needs
  // only AI_GATEWAY_API_KEY (already set). Bump to gemini-3.1-pro per-eval if a
  // specific criterion turns out to need heavier judgment.
  judge: { model: "google/gemini-3.1-flash-lite" },
});
