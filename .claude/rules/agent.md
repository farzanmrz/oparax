---
paths:
  - "lib/agent/**"
  - "app/api/chat/**"
---

# The desk agent

- `vercel:ai-sdk` for `lib/agent/agent.ts`'s `ToolLoopAgent` (`toolApproval`, `stepCountIs`, `InferAgentUIMessage`) and the `tool()` defs in `lib/agent/tools.ts`.
- `vercel:ai-gateway` for the DeepSeek model routing — `agent.ts`'s model is a plain gateway string (`"deepseek/deepseek-v4-flash"`, `providerOptions.gateway.sort: "cost"`).
- `supabase:supabase` for `app/api/chat/route.ts`'s auth gate (`supabase.auth.getUser()`).
- Prompt-writing conventions and drift guards for `lib/sysprompts/*.md` live in `.claude/rules/sysprompts.md`, not here — this file is the TypeScript/architecture side.

## Cadence is enforced in code at two points, never in the prompt

`validate_cadence` is not a tool anymore — the rails (`validateCadence` in `lib/agent/cadence.ts`) are enforced deterministically in two places: `agent.ts`'s `toolApproval` hook auto-denies an out-of-rail `save_agent` in the chat flow so the model self-corrects, and the `saveAgent` server action (`app/agents/new/actions.ts`) re-checks before the insert. The server action is the actual writer and is directly callable, so it — not the approval gate — is the real persistence-boundary stop; the prompt's own cadence-rail arithmetic is advisory only. Drop either code check and a bad cadence can reach the DB with no compile error.

## The clock is prompt-injected, not a tool call

`current_time` is gone too. `agent.ts`'s `clockBlock()` stamps the clock into the system prompt fresh per request — **`createDeskAgent()` must be called once per request**; reusing an instance across requests serves a stale clock. The since-window today always uses the default onboarding interval (`DEFAULT_ONBOARDING_INTERVAL_MINUTES`) — cadence-derived widening for a settled schedule is still the (unbuilt) scheduler's job, unchanged from before.

## The scan pipeline

- **grok is a verbatim executor.** DeepSeek drafts the exact `x_search` subtool calls entirely inside `lib/sysprompts/desk-agent.md` (`from:`/`since_time:` pinning, inclusion-only, the escaped-quote `\"exact phrase\"` operator) — no guardrail logic lives in tool code, so a guardrail regression is always a prompt edit.
- **Raw fetch, not `@ai-sdk/xai`.** `lib/agent/xai.ts` hits xAI's `/responses` endpoint directly because that SDK provider flattens away the per-subtool trace (`subtoolCalls`) this code depends on for debugging — "simplifying" to the SDK silently loses the trace with no type error. It also hard-times-out at 150s (`AbortSignal.timeout`) — without it a stalled xAI call hangs the tool indefinitely with no error, looking stuck rather than failed.
- `grok_verify_handles` has a `TODO(db)` for a site-wide verified-handle cache — not built, so every setup re-verifies all handles from scratch.

## Cadence rate-rail (`lib/agent/cadence.ts`)

- An hourly-spacing floor plus a rolling-week scan budget, checked as a static schedule property — no DB, no visibility into scans that actually fired. Runtime accounting, the scheduler, and the per-user budget are all Deferred (unbuilt).
- `sinceUnixFor` tiles back the **widest** gap between fires (not the narrowest), floored at the minimum spacing plus a small overlap buffer — the min gap would under-cover a clustered-fire schedule's overnight quiet stretch and silently drop posts.
- The day-window start (`yesterday`) is `min(sinceUnix, now−24h)`, so a long cadence's coarse day window doesn't clamp the finer since-bound and drop older posts.
- `firesPerWeek` for an interval is `ceil(week / interval)` — a 119-min interval fits 85 fires in a rolling week and correctly trips the budget; `floor` would false-pass it.
- `desk-config.ts`'s `scheduleSchema satisfies z.ZodType<Schedule>` is the compile-time guard tying the model-facing zod contract to this file's TS type — editing one without the other now fails the build, not silently at runtime.

## Foreign-language sources

Handled at DeepSeek synthesis (translate-then-perceive when clustering; draft in the reporter's language) — grok stays a dumb relay returning raw posts in their original language.

## `x_search` billing footgun

Parallel search and xAI `x_search` bill per successful call **application-wide, not per-user** — cap usage before enabling at scale.

## Bundling the prompts for deploy

`lib/agent/tools.ts` and `agent.ts` are transitively server-only (they pull in `lib/sysprompts`, which reads files at module scope) — importing either from a client component breaks the build. `next.config.ts`'s `outputFileTracingIncludes` must list any new `lib/sysprompts/*.md` file or Vercel silently drops it from the deployed function (works locally, breaks in prod).
