---
paths:
  - "lib/agent/**"
  - "app/api/chat/**"
  - "app/api/cron/**"
---

# The desk agent

- `vercel:ai-sdk` for `lib/agent/agent.ts`'s `ToolLoopAgent` (`toolApproval`, `stepCountIs`, `InferAgentUIMessage`) and the `tool()` defs in `lib/agent/tools.ts`.
- `vercel:ai-gateway` for the DeepSeek model routing — `agent.ts`'s model is a plain gateway string (`"deepseek/deepseek-v4-flash"`, `providerOptions.gateway.sort: "cost"`); `scan-run.ts` and `draft-run.ts` mirror the same model + provider options for their own headless calls.

## Reasoning: DeepSeek's own default everywhere except structuring

DeepSeek V4 defaults to thinking ON and self-scales effort by problem difficulty (its native adaptive behavior; the AI SDK's `low`/`medium` both coerce to its `high`, so an explicit mid level is a no-op). So the three judgment calls — the chat agent (`agent.ts`), the scan **cluster** pass (`scan-run.ts` Pass 1), and the draft runner (`draft-run.ts`) — pass **no `reasoning` param** and let native adaptivity run. Do not re-add a level there; it buys nothing. The ONE exception is the scan **structure** pass (`scan-run.ts` Pass 2's `generateObject`), pinned `reasoning: "none"`: with thinking on, the model interleaves reasoning into the JSON and `generateObject` fails to parse it (`NoObjectGeneratedError`) on large scans — an observed production failure, so that `'none'` is load-bearing, not a cleanup target, and omitting it silently re-enables thinking.
- `supabase:supabase` for `app/api/chat/route.ts`'s auth gate (`supabase.auth.getUser()`) and `app/api/cron/tick/route.ts`'s service-role client.
- Prompt-writing conventions and drift guards for `lib/sysprompts/*.md` live in `.claude/rules/sysprompts.md`, not here — this file is the TypeScript/architecture side.

## Scan frequency is enforced in code at three points, never in the prompt

There is no scan-frequency validation *tool* — the rails (`validateScanFrequency` in `lib/agent/scan-frequency.ts`) are enforced deterministically at three points: `agent.ts`'s `toolApproval` hook auto-denies an out-of-rail `save_agent` in the chat flow so the model self-corrects; the `saveAgent` server action (`app/agents/new/actions.ts`) re-checks before the insert — it's the actual writer and directly callable, so it (not the approval gate) is the real persistence-boundary stop, and the prompt's own rail arithmetic is advisory only; and the per-minute dispatcher (`app/api/cron/tick/route.ts`) zod-parses the stored `scan_frequency` column with `scanFrequencySchema.safeParse` before claiming a due row — a malformed value (should never happen past the two write-time checks, but the column carries no DB-level schema) self-heals the agent to `status: "paused"` rather than hot-looping the tick. Drop any of the three checks and a bad scan frequency can reach the DB, or fire forever, with no compile error.

## The clock is prompt-injected, not a tool call

`current_time` is gone too. `agent.ts`'s `clockBlock()` stamps the clock into the system prompt fresh per request — **`createDeskAgent()` must be called once per request**; reusing an instance across requests serves a stale clock. The onboarding chat's since-window always uses the default onboarding interval (`DEFAULT_ONBOARDING_INTERVAL_MINUTES`) — correct there because there's no saved scan frequency yet to derive from. Once a desk is saved, `lib/agent/scan-run.ts`'s own `clockBlock` widens the since-window off the desk's actual scan frequency via `next-run.ts`'s `scanWindowFor` instead — the scheduler is BUILT, not deferred.

## The dispatcher/runner architecture

Vercel Cron fires `GET /api/cron/tick` once a minute (`vercel.json`'s `* * * * *`) — its ONLY caller, fail-closed on a `Bearer $CRON_SECRET` check. Each tick: sweeps `runs` stuck in `status: "running"` past a 10-minute timeout to `"failed"`; selects due `agents` (`status: "active"`, `next_run_at <= now`, bounded, oldest-due-first); CAS-claims each winner by advancing `next_run_at` to `nextFire()` conditioned on the row's status AND its `next_run_at` still matching what was just read — a slow in-flight scan is never re-claimed by the next tick, so this is a level-triggered advance-at-claim ledger, not a queue. Winners run in-route via `lib/agent/scan-run.ts`'s `runScan` — TWO deterministic passes: Pass 1 a headless forced-tool `generateText` against `SCAN_RUNNER_PROMPT` (reusing `oparaxXSearch` from `tools.ts`) that clusters raw posts into prose, then Pass 2 a `generateObject` (no tools) that structures that prose into `scanResultSchema` items. The split exists because a single `generateText` + `Output.object` let DeepSeek satisfy the schema with empty items WITHOUT ever calling the search tool. Pass 2 soft-fails (returns `items: []` + an `error`, preserving Pass 1's grok cost + trace) rather than throwing, so a structuring hiccup never discards the spend. The outcome persists to a `runs` row (status, cost, usage, the raw reasoning + drafted/executed-call trace). Drafting is separate and on-demand, not dispatcher-driven: `draftItems` (`lib/agent/draft-run.ts`, `DRAFT_RUNNER_PROMPT`) drafts one post per selected news item; persisting the resulting `drafts` rows is the caller's job (the `[id]` dashboard's `draftSelected` server action), not `draftItems` itself. `lib/supabase/admin.ts`'s service-role client (`createAdminClient`, bypasses RLS) is imported by the cron route, the `[id]` desk actions, and `lib/x/` (its token store + post/unlink actions) — a tick / these paths have no user session, so they can't use the cookie-scoped client the rest of the app uses.

## The scan pipeline

- **grok is a verbatim executor.** DeepSeek drafts the exact `x_search` subtool calls entirely inside `lib/sysprompts/desk-agent.md` (`from:`/`since_time:` pinning, inclusion-only, bare single-word keyword terms — no quoted phrases, which mis-escape into broken tool-call JSON; see `.claude/rules/sysprompts.md`) — no guardrail logic lives in tool code, so a guardrail regression is always a prompt edit.
- **Raw fetch, not `@ai-sdk/xai`.** `lib/agent/xai.ts` hits xAI's `/responses` endpoint directly because that SDK provider flattens away the per-subtool trace (`subtoolCalls`) this code depends on for debugging — "simplifying" to the SDK silently loses the trace with no type error. It also hard-times-out at 150s (`AbortSignal.timeout`) — without it a stalled xAI call hangs the tool indefinitely with no error, looking stuck rather than failed.
- **No handle verification.** The reporter's handles are taken as given and passed straight to the scan — a wrong handle just returns nothing for that source. There is no pre-check tool: fuzzy `x_user_search` couldn't confirm exact handles (it drops valid accounts outranked by popular near-matches), so it was removed (closed #57). The live tool surface is two: `oparax_x_search`, `save_agent`.

## Scan-frequency rate-rail (`lib/agent/scan-frequency.ts`)

- The shape is grouped, not an interval/weekly union: `{ timezone, groups: [{ days, start, end, everyHours }] }` (`scanFrequencySchema`) — a desk's schedule is one or more local-time windows, each firing every `everyHours` across a set of weekdays.
- `validateScanFrequency` checks three static rails against the deduped week of local fire-minutes — no DB, no visibility into scans that actually fired: `WINDOW_INVERTED` (a group's `end < start`; overnight windows are DEFERRED — represent as two groups), `SUB_HOURLY` (the minimum gap between distinct weekly fires, including the week-wrap gap, is under `MIN_SPACING_MINUTES` = 60), and `OVER_DAILY_BUDGET` (more than 12 fires land on one local day of the week).
- `sinceUnixFor` tiles back the given interval, floored at the minimum spacing plus a small overlap buffer — used directly for the onboarding-chat clock, and as `next-run.ts`'s fallback interval when a desk has no prior fire yet.
- `lib/agent/next-run.ts` owns the actual timezone fire math for a settled desk — `wallClockToInstant` / `firesBetween` / `nextFire` / `prevFire` / `scanWindowFor`, all Intl-only (two-pass local-wall-clock-to-instant, DST-aware; no `@js-temporal` or other date library). `firesBetween` walks the desk's IANA calendar days and emits each group's fires as UTC instants; `nextFire`/`prevFire` search an 8-day span around a given instant; `scanWindowFor` derives the since-window for an actual scan trigger the same way `agent.ts`'s `clockBlock` does for onboarding, but off the desk's real scan frequency instead of the onboarding default. This is the runtime dispatcher's fire math — the scheduler is BUILT, not a deferred stub.

## Foreign-language sources

Handled at DeepSeek synthesis (translate-then-perceive when clustering; draft in the reporter's language) — grok stays a dumb relay returning raw posts in their original language.

## `x_search` billing footgun

Parallel search and xAI `x_search` bill per successful call **application-wide, not per-user** — cap usage before enabling at scale.

## Bundling the prompts for deploy

`lib/agent/tools.ts`, `agent.ts`, `scan-run.ts`, and `draft-run.ts` are transitively server-only (they pull in `lib/sysprompts`, which reads files at module scope) — importing any of them from a client component breaks the build. `next.config.ts`'s `outputFileTracingIncludes` must list every serverless function that transitively imports `lib/sysprompts` — today `/api/chat`, `/api/cron/tick`, and `/agents/[id]` (the `[id]` page's draft server action) — or Vercel silently drops the markdown from that deployed function (works locally, breaks in prod). A new function that imports `lib/sysprompts` needs its own entry added here.
