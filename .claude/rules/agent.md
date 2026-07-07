---
paths:
  - "agent/**"
  - "evals/**"
---

# The eve agent

`vercel:eve` first for anything in `agent/`; `vercel:ai-sdk` for `execute()`
model-code in a tool (e.g. `grok_twitter_search.ts`); `vercel:ai-gateway` for
provider/model routing (`agent/agent.ts`).

## Tool scoping — the sentinel mechanism

- A file at `agent/tools/<name>.ts` only ever disables/overrides a framework
  tool; **absence of a file means the tool is ON** — invisible from just
  reading `agent/tools/`.
- `web_fetch` and `ask_question` are enabled precisely because neither has a
  file here.

## The built-in `agent` (subagent) tool can't be sentinel-disabled

- `disableTool()` only validates the framework-tool registry; `agent` sits on
  a separate subagent-lowering path — a sentinel file for it throws only at
  **worker-boot graph resolution** (session creation), never at `pnpm build`
  or a server-Ready line.
- Never add `agent/tools/agent.ts`.

## Boot-check for any tool/graph change

- A green build or "Ready" log does not exercise graph resolution.
- Validate by actually creating a session (`POST /eve/v1/session`).

## Scan tool's date window

- `grok_twitter_search`'s `fromDate`/`toDate` are supplied by the model, not
  computed in the tool — an LLM has no clock.
- A guessed/wrong window still returns plausible results with no error; empty
  or subtly stale scans are the symptom, not an error message.

## Deployed chat (not built yet)

- `@supabase/ssr` won't drop into `agent/channels/eve.ts`'s AuthFn — it needs
  nitro-side reassembly of chunked `sb-*` cookies + JWT verify.
- `withEve()` splits the Vercel deploy into two services (web + eve) at build
  time — new service config must list both or the build fails.

## Web search — footgun if re-enabled

- `web_search` only fires when the model is a plain gateway string; a
  source-backed model reference makes eve's resolver return null and
  **silently** drops the tool.
- Parallel search and xAI `x_search` bill per successful call
  application-wide, not per-user — cap usage before enabling at scale.

## Evals (`evals/`, not built yet)

- Assert on behavior/judged quality, never exact wording — the model rewords
  every run.
- Each run makes real model + tool calls (cost, latency) — keep the suite
  small; use `mockModel` when testing flow, not model quality.
