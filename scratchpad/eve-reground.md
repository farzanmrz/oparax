# Eve / AI SDK / Workflow — re-grounded analysis

This corrects several wrong or under-grounded claims from the earlier conversation. Eve facts come from the **local, version-matched** docs under `node_modules/eve/docs/` (`eve@0.15.5`); AI SDK / Workflow facts are URL-sourced. Each answer carries a source and a confidence note. Where the docs still do not support a claim, that is stated plainly.

---

## 1. Sub-tool prompting + the hourly window — and tool vs skill in Eve

**The hourly-window constraint is unchanged and not an Eve question.** Forcing the xAI `x_search` tool to a sub-day `from_date` (an hourly retrieval window) is still not reliably promptable — the documented/observed reliable path remains: **query a day-granular window, then post-filter by timestamp in your own code.** None of the read Eve docs (or the AI SDK docs) add any control that changes this; it is a property of the xAI search tool, not of the orchestration layer. *Confidence: high that this is orthogonal to Eve; medium on the xAI behavior itself since it is carried over from earlier work, not re-verified here.*

**Where that logic belongs in Eve — tool, not skill.** The two are different in kind:

- A **tool** is a typed, code-backed execution surface. "Tools run in your app runtime with full access to `process.env`, not in the sandbox" and "Running in the app runtime is what lets a tool import shared code from `lib/`, read `process.env`, and take part in eve's durable pause/resume model." So the day-window query **and** the code-side timestamp post-filter both live inside a tool's `execute()` — it can import the existing `lib/scan` code directly.
  - Source: `node_modules/eve/docs/tools/overview.mdx` (lines 6-7, 43). *Confidence: high.*
- A **skill** is *loaded instructions only* — markdown the model pulls into context via the framework-owned `load_skill` tool. "Loading a skill adds instructions, never a new execution surface… If you need typed runtime behavior, reach for a tool instead."
  - Source: `node_modules/eve/docs/skills.mdx` (lines 6, 18). *Confidence: high.*

So a skill could *describe* "scan a day window then filter to the last hour," but it cannot *do* it. The retrieval + post-filter is a tool.

---

## 2. Cron limits + Eve scheduling

**Vercel cron is per-project, so the one-fan-out-cron design stands.** Cron count is a Vercel platform constraint (a project-level limit), which is exactly why the right shape is a **single fan-out cron** that enumerates due agents (e.g. by `last_checked_at`) rather than one cron per reporter. *Confidence: high on the architectural conclusion; the precise per-plan cron count is a Vercel platform number not re-fetched here.*

**The old "git cron" pattern** (a scheduled job committing/triggering through the repo) is superseded by either a Vercel Cron Job hitting a route, or — if adopting Eve — Eve's dispatcher schedule (below). Both still bottom out on Vercel Cron.

**Eve schedules: static is the only native form; per-tenant is a documented pattern, not a primitive.**
- Authored schedules are static files: "Each one is a single file under `agent/schedules/` carrying a cron expression," discovered at build time. On Vercel "each schedule becomes a Vercel Cron Job," written into `.vercel/output/config.json` and evaluated in UTC.
  - Source: `node_modules/eve/docs/schedules.mdx` (lines 6, 30, 103). *Confidence: high.*
- **You cannot create a separate cron per reporter at runtime.** Eve's documented dynamic path is ONE authored minute-tick dispatcher over rows in **your** store: "Authored eve schedules are static files discovered at build time. You can build dynamic scheduling today by putting schedule rows in your application store and using one authored schedule as a dispatcher." The recipe: CRUD tools manage per-tenant rows → `defineSchedule({ cron: "* * * * *" })` wakes once a minute → the handler atomically claims due rows (`claimDue`) → `receive(...)` starts a durable session per row, stamping `tenantId`/`ownerId` as the session principal.
  - Source: `node_modules/eve/docs/patterns/dynamic-scheduling.md` (lines 6, 8-13, 41-68). *Confidence: high.*
- **The lease store is yours.** "The important storage capability is an atomic lease, not a particular schema"; `claimDue` must atomically lease so overlapping ticks don't double-claim, and "Delivery is at least once… side-effecting tasks need application-level idempotency." Eve gives the dispatcher + durable sessions + the `ScheduleStore` interface shape; you write the Postgres/KV lease (e.g. `SELECT … FOR UPDATE SKIP LOCKED`).
  - Source: `node_modules/eve/docs/patterns/dynamic-scheduling.md` (lines 13, 242, 246, 257). *Confidence: high; the concrete SQL is not in the docs — open item.*

**What WDK (Vercel Workflow DevKit) adds — and that it is NOT a scheduler.** WDK is the durability layer: `'use workflow'` (deterministic, replayable orchestration with no direct side effects) + `'use step'` (side-effectful, auto-retried 3×, journaled) + `sleep('7 days')` (zero-compute pause) + `defineHook`/`.resume()` (HITL / external events). It survives crashes/redeploys via deterministic replay. **It does not schedule** — workflows compile to routes and are kicked off on demand via `start()` (fire-and-forget); recurring runs need an external trigger (a Vercel Cron Job calling a route that calls `start()`).
  - Sources: https://vercel.com/docs/workflows/concepts ; https://workflow-sdk.dev/docs/foundations/starting-workflows ; https://workflow-sdk.dev/docs/how-it-works/code-transform . *Confidence: high.*

**Does Eve replace the cron?** No — it replaces the **fan-out logic**, not the cron substrate. Under Eve, the single authored minute-schedule literally *is* a Vercel Cron Job (`schedules.mdx:103`). Note also that Eve's own durable runtime is built on the same Workflow SDK (Vercel Workflow when deployed on Vercel), so adopting Eve and adopting WDK are not two separate bets — Eve sits on top of WDK.
  - Source: `node_modules/eve/docs/concepts/execution-model-and-durability.md` (lines 16, 18). *Confidence: high.*

---

## 3. Eve organizing chat (DeepSeek) + scan (Grok) in one agent dir — and the Next.js chat UI

**CORRECTED: Eve ships a chat UI layer.** The earlier claim that "Eve ships no chat UI / you build the React chat entirely yourself" is **wrong.**

- Eve provides a `useChat`-equivalent React hook, `useEveAgent()` (in `eve/react`), with Vue/Svelte equivalents. It "opens a durable session, sends turns, streams the reply back, and turns the raw event stream into render-ready state." It returns `{ data, status, error, events, session, send, stop, reset }`; `data.messages` are AI-SDK `UIMessage`-shaped, with parts for user/assistant text, reasoning, tool calls, tool results, input requests, and connection authorization prompts.
  - Source: `node_modules/eve/docs/guides/frontend/overview.mdx` (lines 6, 21, 62-73, 77). *Confidence: high.*
- Next.js integration is first-class: wrap `next.config.ts` with `withEve()` and the hook auto-finds same-origin routes — no CORS, no host env var.
  - Source: `node_modules/eve/docs/guides/frontend/nextjs.mdx` (line 6). *Confidence: high.*
- Eve can even scaffold a full Next.js Web Chat app (`eve init --channel-web-nextjs`, or `eve channels add web` in an existing project).
  - Source: `node_modules/eve/docs/reference/cli.md` (lines 35, 42). *Confidence: high.*

**NUANCE (so the correction isn't overstated): there is no styled drop-in `<Chat>` component you're forced to adopt.** Eve ships a **headless** hook (+ optional full Web Chat app), not a branded component library. You still render `data.messages` yourself. But it is explicitly NOT a locked generic chat — it exposes a custom `reducer` (`EveAgentReducer<TData>`) to reshape `data`, a raw `events` stream, per-turn `clientContext`, and `send({ outputSchema })`.
  - Source: `node_modules/eve/docs/guides/frontend/overview.mdx` (lines 75, 196-217). *Confidence: high.*

**The bespoke UX you still build** is precisely Oparax's setup-chat shape: the live "what I'll save" config card derived from tool inputs, plus suggestion/approval buttons. Both are feasible on the hook but not shipped as a single worked example:
- The config card watches `actions.requested` (tool calls surfaced **before** execution) via a custom reducer / the `events` stream.
- The suggestion/approval buttons render `input.requested` options and answer through the same session (`send({ inputResponses: [{ requestId, optionId }] })`).
  - Sources: `node_modules/eve/docs/guides/client/streaming.mdx` (line 69); `node_modules/eve/docs/guides/frontend/overview.mdx` (lines 102-118). *Confidence: high that the primitives exist; medium that mapping them onto the exact current UX is a small lift vs. a rewrite — no end-to-end example in the docs.*

**Organizing both legs in one agent dir** is the normal Eve layout: the agent's chat model is set once in `agent/agent.ts`; the Grok scan lives in a tool's `execute()` (see §5). One agent directory, two LLM providers — clean.

---

## 4. CORRECTED — Eve evals + spend-guarding + observability vs a usage dashboard

This is the most-corrected item. Three earlier claims were wrong or under-grounded.

### (a) CORRECTED: "Eve cannot guard spend." — Eve CAN guard spend at runtime.
There is an entire tutorial part for it. The mechanism is a **per-tool-call, cost-based approval gate**: the tool's `approval` field "runs before `execute`. Return `"user-approval"` and the turn parks on an approval request… The function gets the tool input, so you can make the decision cost-based." It is a hard runtime stop — the stream emits `input.requested` then `session.waiting`, and the run pauses until a human approves (resumes from that exact step) or denies (tool skipped, model told why). Each session has exactly one active continuation, so a stale approval handle is rejected — no double-resume.
- Source: `node_modules/eve/docs/tutorial/guard-the-spend.mdx` (lines 8, 54, 56). *Confidence: high.*

**NUANCE (so the correction isn't overstated):** this is **human-in-the-loop approval, not an automatic dollar budget counter.** The cost *decision* is author-supplied — the tutorial's `estimateScanGb` heuristic vs a hard-coded `THRESHOLD_GB` constant; the doc even labels its estimator "Illustrative." Eve enforces the pause/ask/resume machinery; it does not compute dollar cost or auto-stop at a budget. The only *automatic* "budget" Eve documents is a **count**, not dollars, wired by hand via `defineState` (e.g. `{ count: 0, cap: 25 }` then throw when `count >= cap`) — and the tutorial frames it as a "query budget," i.e. a query count.
- Sources: `guard-the-spend.mdx` (lines 35-36); `node_modules/eve/docs/guides/state.md` (lines 11, 24, 37-38); `node_modules/eve/docs/tutorial/first-agent.mdx` (line 6). *Confidence: high.*

### (b) CORRECTED: "Cost tracking is not an Eve feature." — Eve DOES track usage automatically (tokens, not dollars).
Every Vercel Workflow run is auto-tagged with reserved `$eve.*` attributes "to surface model and token usage without reading run bodies," emitted "whether or not an `instrumentation.ts` file is present." Per-turn tags: `$eve.model`, `$eve.input_tokens`, `$eve.output_tokens`, `$eve.cache_read_tokens` (running token counts), `$eve.tool_count` — accumulating cumulative totals. These power the Vercel **Agent Runs** tab (currently gated per team). Separately, Eve emits OpenTelemetry spans via `agent/instrumentation.ts` to any OTel backend (Braintrust, Datadog, Honeycomb, Jaeger…), with a per-turn hierarchy `ai.eve.turn → ai.streamText → ai.streamText.doStream + ai.toolCall` — so per-tool token attribution is reachable in a third-party backend.
- Source: `node_modules/eve/docs/guides/instrumentation.md` (lines 6, 47, 105-114, 120, 122, 133-141). *Confidence: high.*

**NUANCE (the honest boundary):** Eve tracks **tokens + model id only — never dollars.** A full-text search of the docs found **no** cost/pricing/USD telemetry tag and no pricing facility anywhere. Tag writes are "best-effort" (swallowed on failure), so they are not a billing-grade ledger. Therefore Eve replaces the **token-counting / trace plumbing** half of a hand-built dashboard and gives a free per-session Agent Runs view, but it does NOT replace **per-API/per-tool dollar rollups** or a **hard dollar cap** — those stay in the repo's `lib/usage/{cost,pricing,format}.ts` (pricing math) and app-level cap logic (the `agents.auto_post_daily_cap` pattern, which could be *driven off* Eve's token tags).
- Source: `node_modules/eve/docs/guides/instrumentation.md` (lines 138, 139). *Confidence: high.*

### (c) CORRECTED: any tempering of evals — Eve ships a full eval framework. (No hedging.)
- Definition + CLI: `defineEval` (one `async test(t)` per `.eval.ts`) run with `eve eval`; exit code `0` means all gates passed.
  - Source: `node_modules/eve/docs/evals/overview.mdx` (lines 26, 140).
- Deterministic, scoped assertions: `t.succeeded`, `t.calledTool`, `t.notCalledTool`, `t.toolOrder`, `t.maxToolCalls`, `t.parked`, event matchers; value assertions via `t.check` with `includes/equals/matches/similarity/satisfies` from `eve/evals/expect`.
  - Source: `node_modules/eve/docs/evals/assertions.mdx` (lines 12-28, 55-66).
- LLM-as-judge: `t.judge.autoevals.*` (Braintrust autoevals — factuality, summarizes, closedQA, sql); the judge model is resolved per-call > per-eval > project default and is **never** the model under test.
  - Source: `node_modules/eve/docs/evals/judge.mdx` (lines 22, 59).
- Datasets: default-export an array of `defineEval(...)` to fan out; fixtures via `loadJson`/`loadYaml` from `eve/evals/loaders`.
  - Source: `node_modules/eve/docs/evals/cases.mdx` (line 123).
- Reporters: Braintrust experiments + JUnit XML + a custom `EvalReporter` (`onRunStart`/`onEvalComplete`/`onRunComplete`).
  - Source: `node_modules/eve/docs/evals/reporters.mdx` (lines 13, 62-66).
- **Targets a deployed URL:** `eve eval --url <url>` runs the same eval files against a live server/deployment — "which is what makes evals usable as end-to-end tests in CI" (Vercel OIDC / automation-bypass auth when project IDs match).
  - Source: `node_modules/eve/docs/evals/targets.mdx` (line 6).

*Confidence: high across all eval facts.* This matters here: the repo carries `eve@0.15.x` **specifically** as an eval-only/never-imported dependency (per AGENTS.md), so the eval framework is the part already "in play."

### What still belongs to AI Gateway
Dollar-cost observability and provider-level spend reporting remain the **AI Gateway's** job (and the repo's `lib/usage` pricing math). Eve gives token telemetry + a runtime approval gate; the Gateway gives provider routing, failover, and its own usage/cost surface. They are complementary, not substitutes.
- *Confidence: high (boundary follows directly from Eve emitting no dollar figure).*

**Net:** Eve does NOT materially replace a hand-built per-tool/per-API **cost-and-budget** dashboard. It replaces the **usage telemetry + observability** half (tokens, model, per-tool spans, a free Agent Runs view) and provides a real runtime **spend gate** (per-call human approval) and a real **eval** framework — but dollar-cost computation and an automatic cumulative dollar cap stay hand-built.

---

## 5. Provider/model routing — and mixing providers per-tool (decisive)

**AI SDK is the underlying library; Eve sits on top of it.** Two model-binding paths, both documented:
- A **Gateway model-id string** on `defineAgent({ model })` routes the agent's turn through the Vercel AI Gateway (e.g. `deepseek/deepseek-v4-flash`).
- A **direct provider** `LanguageModel` ("To call a provider directly and configure the model in code, pass a provider-authored `LanguageModel`"), e.g. `@ai-sdk/xai`. Provider SDK packages are "regular project dependencies."
  - Source: `node_modules/eve/docs/agent-config.md` (lines 6, 14-18, 23, 31-38). *Confidence: high.*

**The scan must be direct** — this is the repo's existing constraint (server-side tools can't cross the Gateway), and Eve handles it cleanly: the `x_search`-bound scan uses `xai.responses("grok-4.3")` + `xai.tools.xSearch` via the direct `@ai-sdk/xai` provider.

**DECISIVE: Eve can mix providers within one agent — Gateway chat model + a tool that calls direct `@ai-sdk/xai`.** These are two independent layers and nothing in the docs couples them:
- The agent model is set once in `agent/agent.ts`.
- A tool's `execute()` is arbitrary app-runtime code with `process.env` + `lib/` access, so it can construct **any** provider/model it wants — including the direct `@ai-sdk/xai` provider with the server-side `x_search` tool. Eve does **not** push a tool's internal LLM call through the agent's model or the Gateway; the agent loop calls the Gateway model, and the tool's `execute()` independently calls `xai.responses(...)` direct. So `x_search` never has to "cross the Gateway."
  - Sources: `node_modules/eve/docs/tools/overview.mdx` (lines 6-7, 43); `node_modules/eve/docs/agent-config.md` (lines 23, 31-38). *Confidence: high.*

**Two clarifications on the mechanism:**
- There is **no per-tool `model` field.** `defineTool` has only `description`, `inputSchema`, optional `outputSchema`, `execute`, optional `approval`, optional `toModelOutput`. A tool uses a different provider by *calling it inside `execute()`*, not via a config knob.
  - Source: `node_modules/eve/docs/tools/overview.mdx` (lines 26-33, 68-83). *Confidence: high.*
- **Per-subagent model override IS supported** (a declared subagent has its own `agent.ts`/`defineAgent` with its own `model` and `reasoning`). Per-tool override is a different (and non-existent-as-config) mechanism.
  - Sources: `node_modules/eve/docs/subagents.mdx` (lines 27-36); `node_modules/eve/docs/reference/project-layout.md` (line 51). *Confidence: high.*

This maps 1:1 onto Oparax's current split: Gateway for chat/draft, direct `@ai-sdk/xai` for the x_search-bound scan — inside a single Eve agent directory.

---

## 6. Grok-for-both vs DeepSeek-chat + Grok-scan — cost delta, BYOK, one-gateway flexibility

**Cost delta (not re-priced here — flagged honestly).** No Eve doc and none of the read sources contain per-token pricing for `deepseek-v4-flash` vs `grok-4.3`, so a precise dollar delta is **not grounded** in this investigation. The structural point is sound: the repo deliberately routes the **search-free** legs (setup chat + draft/redraft) through the cheaper DeepSeek Gateway model and reserves Grok for the **search-bound** scan (which "costs a search"), per AGENTS.md. Collapsing to Grok-for-both would mean paying Grok rates on the high-volume chat/draft turns that don't need search. *Confidence: high on the directional argument; the magnitude is an open item requiring current xAI/DeepSeek price sheets.*

**BYOK / one-gateway flexibility — and how it looks inside Eve.** The Gateway-string path is exactly what gives provider flexibility without code changes: the failover model (`xai/grok-4.3` behind `deepseek/deepseek-v4-flash`) and any provider swap is a model-id string in `defineAgent`. Provider-specific keys are ordinary env vars; Eve's `eve link` pulls `VERCEL_OIDC_TOKEN` or `AI_GATEWAY_API_KEY` into `.env.local`. So inside Eve: the chat model stays a Gateway string (swappable, failover-capable), and only the scan is pinned to a direct provider because it needs the server-side tool.
- Sources: `node_modules/eve/docs/agent-config.md` (lines 23, 31-38); `node_modules/eve/docs/reference/cli.md` (line 122). *Confidence: high on mechanism; the exact BYOK-vs-Gateway billing terms are a Vercel platform detail, not in these docs.*

---

## 7. Practical — Eve CLI, the bundled docs/skill, recommended next step

- **CLI is per-project, not global.** "The `eve` binary (`bin: eve`) runs from your app root, and every command first loads `.env`/`.env.local` from that root." You scaffold with `npx eve@latest init` and run via the project's dev script (`npm run dev` / `npx eve dev`). Commands: `init, info, build, start, dev, link, deploy, eval, channels add, channels list`; bare `eve` runs `eve dev`. `eve init .` adds Eve to an existing project (installs `eve`, `ai`, `zod`); `--channel-web-nextjs` is rejected in an existing project (use `eve channels add web`). `eve deploy` targets Vercel prod.
  - Source: `node_modules/eve/docs/reference/cli.md` (lines 6, 10-22, 35, 42, 122); `node_modules/eve/docs/getting-started.mdx` (lines 27-30). *Confidence: high.*
- **The bundled docs/skill are already installed.** Per AGENTS.md, `eve@0.15.x` is present as an **eval-only, never-imported** dependency precisely so `node_modules/eve/docs/` is available to the `eve` Claude-Code skill — and that is the authoritative source used throughout this analysis. The skill is a version-agnostic stub pointing at those bundled docs (always matches the installed version). The `unmet peer ai@^7` warning on install is expected and ignored because Eve is never run, only its docs are read.
  - Source: AGENTS.md (project instructions). *Confidence: high.*
- **Recommended next step:** keep using Eve in its current **eval-only** capacity — author `*.eval.ts` files (`defineEval` + `eve eval`, optionally `--url` against a deployed preview) to lock in scan/draft behavior — **without** importing any `eve/*` runtime into app code yet. This exercises the highest-value, lowest-risk slice (the eval framework) while the `ai@7` peer question is unresolved.

---

## RECOMMENDATION

**Adopt Eve's eval framework now; defer Eve's runtime (agent/tools/schedules/chat hook) until after `ai@7`.**

Eve is genuinely capable of the things earlier dismissed — it **guards spend** (per-call HITL approval), **tracks token usage** (auto `$eve.*` tags + OTel spans + a free Agent Runs view), **ships a chat UI** (`useEveAgent` hook + optional full Next.js Web Chat app), **mixes providers per-tool** (Gateway chat + direct `@ai-sdk/xai` scan), and **does per-tenant dynamic scheduling** (one minute-tick dispatcher over your lease store). But two facts gate runtime adoption today:

1. **It is preview / pre-GA and built for `ai@7`**, while this repo deliberately pins `ai@6`. Importing `eve/react` or `eve` runtime would force the `ai@7` peer relationship the repo is currently avoiding. (Source: AGENTS.md; `instrumentation.md` referencing AI-SDK-v7 runtime context.)
2. **Adopting the Eve runtime is an architecture shift, not a drop-in** — Oparax today runs scan/draft directly in `lib/` with server-driven `persistRunResult`; the docs don't address coexistence (wrap vs. replace). (Open item across the scheduling/durability investigation.)

So: use Eve **now** for evals (eval-only is already how it's installed, and `eve eval --url` gives CI-grade end-to-end checks of the scan→draft pipeline). Revisit the **runtime** (durable workflows, the dynamic-scheduling dispatcher, the `useEveAgent` chat, per-tool provider mixing) when (a) the repo is ready to move to `ai@7`, and (b) you've decided whether Eve wraps or replaces the existing `lib/` pipeline. Dollar-cost dashboards and a hard dollar cap stay hand-built (`lib/usage/*` + an app-level cap) regardless — Eve emits tokens, never dollars.

---

## Corrections to my earlier answers

1. **"Eve cannot guard spend."** — WRONG. Eve guards spend at runtime via a per-tool-call cost-based `approval` gate that hard-parks the turn (`input.requested` → `session.waiting`) until a human approves/denies. It is HITL approval, not an automatic dollar budget. (`tutorial/guard-the-spend.mdx`.)
2. **"Cost tracking is not an Eve feature."** — WRONG. Eve auto-tags every Workflow run with `$eve.input_tokens`/`output_tokens`/`cache_read_tokens`/`model`/`tool_count` and emits OTel spans, explicitly "to surface model and token usage," powering the Vercel Agent Runs tab. (`guides/instrumentation.md`.) Caveat: tokens + model only, never dollars.
3. **"Eve ships no chat UI / you build the React chat entirely yourself."** — WRONG. Eve ships the `useEveAgent()` hook (`eve/react`, plus Vue/Svelte), handling session/streaming/message projection/HITL & OAuth prompts, and can scaffold a full Next.js Web Chat app. There is no styled drop-in `<Chat>` component, but it is the `useChat` equivalent, not a from-scratch build. (`guides/frontend/overview.mdx`, `nextjs.mdx`, `reference/cli.md`.)
4. **Any tempering of evals.** — WRONG to hedge. Eve ships a complete eval framework: `defineEval` + `eve eval`, deterministic + value assertions, LLM-as-judge (Braintrust autoevals), datasets, reporters (Braintrust/JUnit/custom), and `eve eval --url` against a live deployment for CI. (`evals/*`.)
5. **"You set a model on a tool."** — WRONG. `defineTool` has no `model` field. A tool uses a different provider by calling it inside `execute()`. Per-*subagent* model override exists; per-*tool* does not. (`tools/overview.mdx`, `subagents.mdx`.)
6. **Implying Eve scheduling / WDK replaces Vercel Cron.** — WRONG. Eve's dynamic schedule compiles to a Vercel Cron Job, and WDK is explicitly not a scheduler (`start()` is on-demand). Eve replaces the fan-out *logic*, not the cron substrate. (`schedules.mdx`, `patterns/dynamic-scheduling.md`, workflow-sdk.dev.)
7. **Treating "adopt Eve" and "adopt WDK" as separate bets.** — Imprecise. Eve's durable runtime is built on the Workflow SDK (Vercel Workflow on Vercel), so adopting Eve's runtime brings WDK with it. (`concepts/execution-model-and-durability.md`.)

---

### Still NOT grounded (honest gaps)
- **Dollar cost delta** for Grok-for-both vs DeepSeek-chat+Grok-scan — no pricing in any read source; needs current xAI/DeepSeek price sheets.
- **Whether `$eve.*` usage tags are readable programmatically** (vs dashboard-only) — docs describe them as Workflow-run attributes, no read API shown.
- **Concrete atomic-lease SQL** for `claimDue` — only the `ScheduleStore` interface shape is documented.
- **`ai@7` peer compatibility** if Eve runtime is imported — flagged by the install warning; not validated.
- **xAI sub-day `from_date`** reliability — carried over from earlier work, not re-verified here.
