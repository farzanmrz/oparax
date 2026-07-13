---
paths:
  - "eve/**"
---

# The eve agent

- `vercel:eve` first for anything in `eve/agent/` (all `defineAgent` / `defineTool` / `defineEval` code).
- `vercel:ai-sdk` for `agent.ts`'s `model` / `modelOptions` surface (AI SDK semantics; the tools' `execute()`s deliberately use raw fetch, not the SDK — see the scan pipeline below).
- `vercel:ai-gateway` for provider/model routing — `eve/agent/agent.ts` (DeepSeek) and the eval judge (`eve/evals/evals.config.ts`) are plain gateway strings.
- `eve-session-review` to debug a past onboarding chat/scan offline from `eve/.workflow-data/` ("why did that scan return nothing").

The agent + evals live under `eve/` (mounted via `withEve(…, { eveRoot: "eve" })`). The standalone `eve` CLI (`eve dev`, `eve eval`) resolves the app root relative to its cwd, so **run it from `eve/`** (`cd eve && npx eve eval`) — from the repo root it finds no agent/evals. `pnpm dev`/`build`/`lint` still run from the repo root. eve's own generated dirs (`eve/.eve/`, `eve/.workflow-data/`) therefore land under `eve/`; the `withEve` Next-integration cache (root `.eve/`, `.next/`) stays at the repo root. All are gitignored + Biome-ignored (`**/.eve/**`, `**/.workflow-data/**`).

## Tool scoping — the sentinel mechanism

- A file at `eve/agent/tools/<name>.ts` only ever disables/overrides a framework tool; **absence of a file means the tool is ON** — check for a tool's *absence*, not its presence.
- All framework generics are currently sentinel-disabled; the live surface is the five custom tools (`current_time`, `grok_verify_handles`, `grok_twitter_search`, `validate_cadence`, `save_agent` — the last approval-gated, validate/echo only, never writes to the DB). v1 desk is X-only by decision — `web_fetch`/`web_search` return with their own feature slice.

## `agent` (the built-in subagent tool) can't be sentinel-disabled

- `disableTool()` only validates the framework-tool registry; a sentinel file for `agent` throws only at **worker-boot graph resolution** (session creation), never at `pnpm build` or a "Ready" line — never add `eve/agent/tools/agent.ts`.

## Boot-check for ANY change under `eve/agent/` — including `instructions.md`

- A green build or "Ready" log never exercises graph resolution — validate by actually creating a session (`POST /eve/v1/session`). Prompt edits count: eve compiles `instructions.md` into authored artifacts, so a markdown-only diff is still a build input (a skipped boot-check here burned a live session on ft/46).
- Rapid bursts of `eve/agent/` edits can leave the dev watcher's compile cache stale (`UNLOADABLE_DEPENDENCY … compiled-artifacts-bootstrap.mjs` at session creation) — the remedy is the documented cache sweep: delete `eve/.eve/`, `.eve/`, `eve/.output/` with nothing running, reboot, re-smoke.

## The scan pipeline

- **grok is a verbatim executor.** DeepSeek drafts the exact x_search subtool calls; the tool relays them. All query guardrails (`from:` pinning, `since_time:` exactness, inclusion-only) live in the prompts (`instructions.md` + the tool `SYSTEM_PROMPT`), never in tool code — a guardrail regression is a prompt edit, not a code fix.
- **Raw fetch, not `@ai-sdk/xai`.** `eve/agent/lib/xai.ts` hits xAI's `/responses` endpoint directly because the SDK's xai responses provider flattens away the per-subtool trace (`subtoolCalls`) the project debugs with — don't "simplify" it to the SDK.
- **The LLM has no clock.** `fromDate` / `toDate` / `sinceUnix` come from `current_time`, passed through unchanged; a wrong window returns plausible results with no error — empty or subtly-stale scans are the only symptom.

## Cadence rate-rail (`eve/agent/lib/cadence.ts`)

- `validate_cadence` is a **stateless** setup-time check on the schedule shape only (hourly-spacing floor + 84 scans / rolling 7 days) — a cron fire-pattern check, no DB, no visibility into scans that fired. Runtime accounting, the scheduler, and the per-user budget are all Deferred (unbuilt) — it is not a live rate limiter.
- `current_time`'s since-window is cadence-derived: `sinceUnixFor` tiles back the **widest** gap between fires (not the narrowest), floored at 1h + a 2min overlap — the min gap would under-cover a clustered-fire schedule's overnight quiet stretch and silently drop posts.
- The day-window start it returns (`yesterday`) is `min(sinceUnix, now−24h)`, so a long cadence's coarse `from_date` doesn't clamp the finer `since_time:` and drop older posts.
- `firesPerWeek` for an interval is `ceil(week / interval)` — a 119-min interval fits 85 fires in a rolling week and correctly trips the budget; `floor` would false-pass it.

## Foreign-language sources

- Handled at DeepSeek synthesis (translate-then-perceive when clustering; draft in the reporter's language) — grok stays a dumb relay returning raw posts in their original language.

## `x_search` billing & web_search footgun

- Parallel search and xAI `x_search` bill per successful call **application-wide, not per-user** — cap usage before enabling at scale.
- `web_search` (currently OFF via sentinel) — if ever re-enabled: it only fires for a plain gateway-string model; a source-backed model reference makes eve's resolver return null and **silently** drop the tool.

## Deployed chat — the authored channel (`eve/agent/channels/eve.ts`)

- Route auth is an ordered walk `[supabaseUser(), vercelOidc(), localDev()]` — first match wins, all-skip → 401 (fail closed). `supabaseUser()` verifies the signed-in browser user; `vercelOidc()` keeps eve-CLI access to deployed agents; `localDev()` (loopback-only) never admits deployed traffic.
- `@supabase/ssr` can't run inside the channel's AuthFn (it expects a framework cookie adapter) — `eve/agent/lib/supabase-cookies.ts` reimplements just its read path: chunked `sb-<ref>-auth-token[.N]` reassembly (first-occurrence-wins, matching the `cookie` pkg the app reads through) + `base64-` decode → `access_token`, then eve's own `verifyOidc()` checks it against Supabase's JWKS (ES256, cached per process; needs only `NEXT_PUBLIC_SUPABASE_URL`, no secrets). That key must be set in the **eve** service too (the two-service split) — if it's missing on a Vercel deploy the AuthFn throws a coded 401 (`supabase_auth_url_missing`) rather than silently skipping.
- Scheduled/internal runtime paths never pass route auth (they carry the `eve:app` runtime principal) — gating this door cannot affect future background runs; anonymous preview access would be an explicit `none()` entry, deliberately not added.
- `withEve()` splits the Vercel deploy into two services (web + eve) at build time — new service config must list both or the build fails.

## Evals (`eve/evals/`)

- The suite is **scaffolding only today**: `evals.config.ts` (the shared judge, a plain gateway string) + `fixtures.ts` (handle fixtures) — zero live `*.eval.ts` files. When writing evals: the suite drives the **real** DeepSeek+grok pipeline over HTTP (cost + latency per run) — keep it small, run it deliberately, and assert behavior/judged quality with `t.judge.*`, never exact wording (the model rewords every run).
- Determinism belongs in the pure `eve/agent/lib/*.ts` modules, asserted directly with `t.check` and **no** model call — `eve`'s `mockModel` is baked into `defineAgent` and `defineEval` takes no per-eval `model`, so you can't mock one eval while others in the same run hit the real model.
