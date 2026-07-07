# eve evals — notes for the create-agent chat (ft/44)

Purpose: make iterating the system prompt cheap. Instead of re-typing a conversation by hand after every prompt tweak, an eval drives a scripted conversation against the real agent and asserts on what happened. Run `eve eval` after each change.

Read `node_modules/eve/docs/evals/*.mdx` before authoring; this is the working shape, not the full API.

## Where they live

`evals/**/*.eval.ts` + one `evals.config.ts`. Each file is `defineEval({ async test(t) { ... } })`, driving the agent over its real HTTP surface (local dev by default). No persistence, no Supabase — the eval spins up its own fresh session, asserts, and discards it.

## The one rule: assert on behavior + graded qualities, NOT on exact wording

The messages you `t.send(...)` are your scripted inputs — use exact text. The **assertions** must not check the model's exact reply string (it rewords every run, so a harmless rewording fails a green test). Two kinds:

- **Structural / deterministic** — did the right thing happen:
  - `t.calledTool("grok_twitter_search", { input: { handles: ["FabrizioRomano"] } })`
  - `t.notCalledTool("bash")`, `t.toolOrder(...)`, `t.maxToolCalls(1)`, `t.succeeded()`
- **Judge (fuzzy quality)** — `t.judge.autoevals.*` grades a quality without pinning words: "did the reply ask for X handles?", "are the scan items on-beat?", "is the draft casual?". Use `.atLeast(threshold)`; `--strict` gates in CI.

So for "the agent should ask for handles" → don't assert `reply === "Which handles…"`; judge-assert "the reply requests handles." Survives rewording, still catches regressions.

## Example flow shapes (illustrative — you'll define the real ones)

These are NOT decided flows; they only show the *shape* an eval takes. Pick and script your own when you decide to build evals.

1. **Beat + handles given** — user states a beat and names handles → agent scans → presents items. Assert: `grok_twitter_search` called once with those handles; items presented.
2. **No handles** — user gives a beat but no handles → agent asks → user says "you pick" → agent proceeds. Assert: agent asked before calling the tool; tool called only after handles resolved.
3. **Off-topic** — user asks something off-beat → agent steers back. Assert: `grok_twitter_search` NOT called; judge "reply redirects to the beat."

Keep assertions on structure + judged qualities. Grow the set as you learn; don't over-assert (brittle).

## Cost awareness

Each eval run starts a fresh session and makes real model + tool calls (DeepSeek turns + any `grok_twitter_search` = grok tokens + xAI search at ~$5/1k successful calls; `web_search` = Parallel at ~$5/1k). Automated runs on every tweak accumulate. Mitigate: keep the suite small (2–3 flows), use `mockModel` for deterministic fixtures where you're testing flow not model quality, and don't run the full grok scan in every eval unless that's what you're checking. Track spend on the AI Gateway dashboard.

## Reasoning default — decide here, not by guess

`agent/agent.ts` ships with `reasoning: "medium"` (thinking ON; DeepSeek maps "medium" → effort `high`). To compare, flip to `reasoning: "none"` and run the same flows: watch tool-arg correctness, flow adherence, latency, and output verbosity. Let the eval delta pick the default. (DeepSeek collapses low/medium→high, so only `none` vs on is a meaningful comparison; `"adaptive"` is unverified for V4-flash.)

## web_search — it works with DeepSeek (technical note)

eve's built-in `web_search` is live for `deepseek/deepseek-v4-flash`: eve routes a plain-string gateway model to Parallel AI's search, executed server-side by the Vercel AI Gateway (model-agnostic), ~$5/1k. **Footgun:** keep the `agent/agent.ts` model a plain gateway string — if it's ever re-authored as a source-backed model reference, eve's resolver returns `null` for the `deepseek` prefix and silently drops `web_search`. To pin/control it (domain or recency filters), override `agent/tools/web_search.ts` with a `defineTool` wrapping `gateway.tools.parallelSearch()` / `perplexitySearch()`.
