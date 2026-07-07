---
paths:
  - "agent/**"
  - "evals/**"
---

# The eve agent

`vercel:eve` first for anything in `agent/`; `vercel:ai-sdk` when a tool's
`execute()` needs model-code guidance (e.g. `grok_twitter_search.ts`);
`vercel:ai-gateway` for provider/model routing (`agent/agent.ts`).

## Tool scoping — the sentinel mechanism

eve has no central disable list: each `agent/tools/<name>.ts` file is a
sentinel — `export default disableTool()` turns a framework tool OFF; **an
enabled default tool has no file at all** (a file only disables or overrides,
never enables). This absence-means-enabled convention is invisible from
reading `agent/tools/` alone — e.g. `web_fetch` and `ask_question` are ON
precisely because neither has a file here.

**The built-in `agent` (subagent) tool cannot be disabled** — `disableTool()`
only validates against the framework-tool registry; `agent` sits on a separate
subagent-lowering path, so a sentinel file for it throws `"agent" is not a
framework tool"` at **worker-boot graph resolution**. That crashes the
deployed eve worker while `pnpm build` / `eve build` / `eve info` all stay
green — it only surfaces when a **session is created**, not at server "Ready".
Leaving it on is safe (a subagent inherits the parent's already-disabled
shell/FS surface) — just never add `agent/tools/agent.ts`.

**Boot-check lesson:** to validate any tool/agent-graph change, create a
session (`npx eve dev`, or `POST /eve/v1/session`) — a green build or a
server-Ready line does not exercise graph resolution.

## The scan tool's date window — the model has no clock

`grok_twitter_search`'s `fromDate`/`toDate` are supplied by DeepSeek (not
computed in the tool), and `instructions.md` asks it for "today's date" — but
an LLM cannot know the current date. Traced live (2026-07-07 session): the
model's reasoning explicitly stalled ("I don't know the exact date... let me
just proceed") before guessing a wrong window, which still returned plausible
results — the failure is **silent**, not an error. If scans come back empty
(or subtly stale), a guessed date window is the likely cause. Fix by injecting
the live UTC date via dynamic instructions (interpolate it into the system
prompt) rather than asking the model to derive it, or — since the window is
today+yesterday and fixed — compute both dates back in the tool and drop
`fromDate`/`toDate` from its input schema entirely.

## Deployed chat (not built yet)

When wiring `agent/channels/eve.ts` for the deployed browser chat:
`@supabase/ssr` will not drop in — it assumes Next request plumbing. The
AuthFn needs nitro-side reassembly of chunked `sb-*` cookies + JWT verify.
`withEve()` also splits the Vercel deploy into two services (web + eve) at
build time — any service config added later must list **both** or the build
fails.

## Web search — off by default, a footgun if re-enabled

`web_search` routes through the Vercel AI Gateway to Parallel AI's
server-side search — but only when the model is referenced as a **plain
gateway string** (`"deepseek/deepseek-v4-flash"`). A source-backed model
reference makes eve's resolver return `null` for the `deepseek` prefix and
**silently drops** `web_search` — no error, the tool just never fires. Parallel
search and xAI `x_search` both bill ~$5/1,000 successful calls,
**application-wide across all users**, not per-user — cap searches per-user
before enabling either at scale.

## Evals (`evals/`)

Assert on **behavior + judged quality**, never exact wording — the model
rewords every run, so a string match on the reply fails a harmless rewording.
Two kinds: structural (`t.calledTool(...)`, `t.notCalledTool(...)`,
`t.maxToolCalls(1)`) and judge (`t.judge.autoevals.*`, graded with
`.atLeast(threshold)`). Each eval run makes real model + tool calls (DeepSeek
turns, xAI search) — keep the suite small (2–3 flows) and use `mockModel`
where you're testing flow, not model quality. Read
`node_modules/eve/docs/evals/*.mdx` before authoring the first one.

`agent/agent.ts` ships `reasoning: "medium"` (DeepSeek maps this to effort
`high`) — decide the default empirically once evals exist (watch tool-arg
correctness, flow adherence, latency, verbosity across `reasoning: "none"` vs
on), not by guessing.
