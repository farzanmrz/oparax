# Best-Architecture Evaluation for oparax-chirp (scan → draft → post + chat UI + future autonomy)

**Scope:** Evaluate the *best target* architecture on merit, ignoring migration cost. The app is an AI news desk: it scans a reporter's beat (X via Grok + xSearch), drafts a post per item (DeepSeek via AI Gateway), and posts to X manually today — with a chat-first setup UI and a roadmap of scheduling, autonomous posting, multi-platform, and notifications.

**Installed today (verified from `node_modules`):** `ai@6.0.206`, `@ai-sdk/xai@3.0.95`, `@ai-sdk/react@3.0.208`. AI Gateway is reached via model strings through `ai` (no separate `@ai-sdk/gateway` package pinned). These versions anchor every "v6" claim below.

---

## 1. The landscape — how the pieces stack

The single most important thing to understand is that these are **layers, not competitors**. They compose top-to-bottom; adopting a higher layer does not replace a lower one. From bottom to top:

```
┌──────────────────────────────────────────────────────────────┐
│  Eve  (filesystem-first agent framework — "Next.js for agents")│  ← top-level framework
│  agent/ dir: tools, skills, subagents, channels, schedules     │
├──────────────────────────────────────────────────────────────┤
│  Vercel Workflow DevKit (WDK)  — durable execution engine      │  ← durability layer
│  'use workflow' / 'use step', sleep(), defineHook()/.resume()  │
├──────────────────────────────────────────────────────────────┤
│  AI SDK (ai@6)  — application/agent toolkit                    │  ← app logic
│   • generateText / streamText / generateObject (primitives)    │
│   • ToolLoopAgent (Agent abstraction, the tool loop)           │
│   • agentic-workflow PATTERNS (code, not a runtime)            │
├──────────────────────────────────────────────────────────────┤
│  Vercel AI Gateway  — model access / routing / failover        │  ← infrastructure
│   one credential → hundreds of models; zero markup             │
├──────────────────────────────────────────────────────────────┤
│  Providers  (xAI Grok + xSearch, DeepSeek, …)                  │  ← model + server tools
└──────────────────────────────────────────────────────────────┘
```

What each layer is, and how it relates to its neighbors:

- **AI Gateway** is the *infrastructure* layer: a single OpenAI/Anthropic-compatible endpoint that takes a `creator/model` string and routes to the provider, with automatic retries, declarative model failover, zero token markup, and spend observability ([vercel.com/docs/ai-gateway](https://vercel.com/docs/ai-gateway)). The AI SDK calls it natively, so switching providers is a model-string change ([ai-sdk.dev/providers/ai-sdk-providers/ai-gateway](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway)). **Everything above sits on it** — WDK's durable agents and Eve both still resolve model strings *through* the Gateway ([github.com/vercel/workflow](https://github.com/vercel/workflow); [vercel.com/docs/eve/concepts](https://vercel.com/docs/eve/concepts)).

- **The AI SDK (`ai@6`)** is the *application* layer. Within it there are three distinct things people conflate:
  1. **Primitives** — `generateText` / `streamText` / `generateObject`, the hand-rolled tool loop and message bookkeeping ([ai-sdk.dev/docs/agents/overview](https://ai-sdk.dev/docs/agents/overview)).
  2. **The Agent abstraction** — the `ToolLoopAgent` class (implements an `Agent` interface, `version: 'agent-v1'`), which packages model + `instructions` + `tools` and runs the loop for you, bounded by `stopWhen` (default `stepCountIs(20)`) ([ai-sdk.dev/docs/agents/building-agents](https://ai-sdk.dev/docs/agents/building-agents)).
  3. **Agentic-workflow patterns** — *code patterns* (sequential/prompt-chaining, routing, parallelization, orchestrator-worker, evaluator-optimizer) you compose yourself from the primitives. **These are not a runtime** — no persistence, no retries, no resume; a crash mid-pattern loses the work ([ai-sdk.dev/docs/agents/workflows](https://ai-sdk.dev/docs/agents/workflows)).

- **Vercel Workflow DevKit (WDK / `workflow` package)** is the *durability* layer — a genuinely different thing from the AI SDK's "workflow patterns" despite the shared name. It is a **durable execution engine**: `'use workflow'` / `'use step'` directives compile functions into routes, record every input/output in an event log, and **replay deterministically from where they stopped** after a crash or redeploy, with per-step retries, `sleep()` (pause minutes→months with zero compute), and `defineHook()` / `.resume()` for human-in-the-loop waits ([vercel.com/docs/workflows/concepts](https://vercel.com/docs/workflows/concepts)). WDK steps **call the AI SDK code inside them** — it orchestrates, the AI SDK does the LLM work. WDK is **public beta** (announced 2025-10-23) ([vercel.com/changelog/open-source-workflow-dev-kit-is-now-in-public-beta](https://vercel.com/changelog/open-source-workflow-dev-kit-is-now-in-public-beta)).

- **Eve** is the *top-level framework* ("Next.js for agents"): an agent is a directory of files (`agent/instructions.md`, `agent/tools/*.ts`, `agent/subagents/*`, `agent/schedules/*`, `agent/channels/*`) that Eve discovers and serves as durable HTTP sessions ([vercel.com/docs/eve](https://vercel.com/docs/eve)). Critically, **Eve does not replace the layers below it — it bundles them**: sessions run *on* Vercel Workflows, models resolve *through* AI Gateway, compute runs *in* Vercel Sandbox, and internally it is built on the AI SDK (traces show `ai.eve.turn` → `ai.streamText` spans) ([vercel.com/docs/eve/concepts](https://vercel.com/docs/eve/concepts)). Eve is **beta / public preview, pre-1.0** (see §4b).

**The one-line mental model:** AI Gateway answers *"which model, and how do I reach it reliably?"*; the AI SDK answers *"how do I structure the LLM calls and the tool loop?"*; WDK answers *"how does this multi-step run survive crashes, redeploys, and long waits?"*; Eve answers *"can I get all of that as one conventional framework with sessions, scheduling, channels, and approvals built in?"* They are complementary; the only genuine *overlap* is **Eve vs. (WDK + AI SDK + your own session glue)** — Eve is the batteries-included bundling of the same stack you would otherwise assemble yourself.

---

## 2. Approach-by-approach analysis

### Approach A — Stay on hand-rolled `ai@6` primitive calls (the status quo)

**What it is:** `lib/scan` calls the direct `@ai-sdk/xai` provider with server-side xSearch; `lib/draft/draft-items.ts` calls DeepSeek through the Gateway; the chat is `streamText` + `useChat` with three server tools; run completion is made crash-safe by hand (`persistRunResult` chained off `result.consumeStream()`). The scan→draft chain is the AI SDK "sequential processing" pattern; the planned critique→re-scan/re-draft is "evaluator-optimizer" ([ai-sdk.dev/docs/agents/workflows](https://ai-sdk.dev/docs/agents/workflows)).

**Pros**
- **Maximally deterministic.** scan ALWAYS runs, then draft ALWAYS runs once per item, then a manual post — fixed control flow, which the AI SDK docs explicitly say to implement with primitives/workflow patterns rather than an open-ended agent loop ([ai-sdk.dev/docs/agents/overview](https://ai-sdk.dev/docs/agents/overview)).
- **The "can't diverge" guarantee is structural.** Caller A (chat preview) and Caller B (`persistRunResult`) call the *same* `scan()` / `draftItems()` functions; plain typed functions guarantee that, an agent that decides whether/when to draft does not.
- **Per-item failure isolation and the atomic post-claim lock are trivial in a `for`-loop** — a failed draft persists as recoverable `status:'failed'` without failing the run; posting is owner-asserted, lock-guarded code the model never reaches.
- **No new dependencies, no beta surface.** Keeps `pnpm build` green, which AGENTS.md treats as the contract.

**Cons**
- **Durability is hand-rolled.** `consumeStream()` + `persistRunResult` only protects a *single online run* from a client disconnect — it is not crash-/redeploy-safe and does not survive a function restart mid-run. This is the productized gap WDK fills.
- **Boilerplate the repo "already fights"** — repeating `generateText` config and message bookkeeping across the chat route, the saved-run path, and (later) cron.
- **No first-class budget/loop guards** beyond ad-hoc step limits.

### Approach B — Adopt the AI SDK `Agent` abstraction (`ToolLoopAgent`) on v6

**What it is:** Package model + `instructions` + `tools` into a reusable `ToolLoopAgent`, call `agent.generate()` / `agent.stream()`, and for chat wire it with `createAgentUIStreamResponse({ agent, uiMessages })` + `InferAgentUIMessage` ([ai-sdk.dev/docs/agents/building-agents](https://ai-sdk.dev/docs/agents/building-agents)). Loop control via `stopWhen` (`stepCountIs`, `hasToolCall`, custom `StopCondition`) and `prepareStep` (per-step model/tool swaps, context compaction) ([ai-sdk.dev/docs/agents/loop-control](https://ai-sdk.dev/docs/agents/loop-control)).

**Pros**
- **The setup chat is the natural home.** The chat already *is* an agentic loop — the model decides scan vs draft vs updateConfig based on the reporter's critique. One typed `ToolLoopAgent({ instructions, tools: { scan, draft, updateConfig } })` collapses the bespoke route wiring into a reusable, end-to-end-typed object, and `stopWhen` / `activeTools` give cleaner guardrails than ad-hoc step limits (e.g. cap scans to bound the X-search cost AGENTS.md flags).
- **Provider split is preserved.** A tool's `execute` encapsulates its own model — the `scan` tool can call the direct `@ai-sdk/xai` xSearch leg internally while the chat agent runs on the Gateway.
- **Structured output** via `output: Output.object({ schema })` returns a typed drafted post from a tool loop in one call.
- **Sub-agents reuse the ordinary `tool()` mechanism** (no `.asTool()` API), run in isolated context windows, and `toModelOutput` compresses what the parent sees — a clean fit for the planned per-platform drafting ([ai-sdk.dev/docs/agents/sub-agents](https://ai-sdk.dev/docs/agents/sub-agents)).
- **`Agent` is a pluggable interface** (`version: 'agent-v1'`), so a durable implementation (WDK's `DurableAgent`) can drop in at the same call site later.

**Cons**
- **Wrong tool for the deterministic core.** The scan→draft→post pipeline is fixed control flow; wrapping the *whole* pipeline in one model-driven loop trades away determinism and the can't-diverge guarantee. Use the Agent for the **chat** and optionally the **draft step**, not the pipeline.
- **One agent = one model + one tools map.** The scan leg (direct xAI + server-side xSearch, cannot cross the Gateway) and draft leg (DeepSeek via Gateway) use different providers, so a single agent can't cleanly span both; `prepareStep` *can* swap models per step but mixing a server-tool provider and a Gateway provider in one loop is fragile.
- **Still `Experimental_` in this version.** In `ai@6.0.206` `ToolLoopAgent` is re-exported as `Experimental_Agent` and `ToolLoopAgentSettings` as `Experimental_AgentSettings` — surface can shift in patch releases, a real concern for a keep-build-green repo (verified in installed `ai@6.0.206` `dist/index.d.ts`).
- **Irreversible posting must never be a model-decided tool call** — the autonomy gate + ownership assertion + claim lock stay explicit code.

### Approach C — AI SDK + Vercel Workflow DevKit (durable scheduled runs)

**What it is:** Model a run as one `'use workflow'` function with `scan()`, `draftItems()`, and `postRunItem()` each a `'use step'`. The AI SDK keeps doing the LLM work *inside* the steps. Trigger from a Vercel Cron route via `start(workflow, [agentId])`; gate auto-post behind `defineHook()` / `.resume()` for one-tap approval ([vercel.com/docs/workflows/concepts](https://vercel.com/docs/workflows/concepts); [workflow-sdk.dev/docs/api-reference/workflow-api/start](https://workflow-sdk.dev/docs/api-reference/workflow-api/start)).

**Pros**
- **Directly solves "must survive restarts."** A crash after a successful scan replays *past* the completed step and resumes at draft — so the expensive Grok+xSearch leg is **not re-run or re-billed** ([vercel.com/docs/workflows/concepts](https://vercel.com/docs/workflows/concepts)). This is the productized version of today's `persistRunResult`.
- **Per-step automatic retries** isolate a transient DeepSeek/X failure to that one step instead of failing the run — a cleaner version of the recoverable `status:'failed'` handling.
- **`sleep()` and hooks are purpose-built for the roadmap:** scheduling, and the breaking-news "draft → wait for one-tap approval → post" flow, with no polling/queue/YAML ([vercel.com/docs/workflows/concepts](https://vercel.com/docs/workflows/concepts)).
- **Multi-platform fan-out** is `Promise.all` of per-platform draft steps (the AI SDK parallelization pattern) inside the durable workflow.
- **Open source, no lock-in** — deploy to Vercel or any cloud ([vercel.com/changelog/open-source-workflow-dev-kit-is-now-in-public-beta](https://vercel.com/changelog/open-source-workflow-dev-kit-is-now-in-public-beta)).

**Cons**
- **Public beta** (since 2025-10-23) — risky for autonomous money/posting paths without version pinning and stability validation.
- **Determinism + idempotency discipline.** Workflow bodies are sandboxed and must be deterministic (`Math.random`/`Date` fixed across replays); non-deterministic logic and live I/O must live inside `'use step'` ([workflow-sdk.dev/docs/foundations/workflows-and-steps](https://workflow-sdk.dev/docs/foundations/workflows-and-steps)). **Posting a tweet is non-idempotent** — replay could double-post, so the existing atomic claim lock (`drafted|failed → posting`) must stay; WDK does **not** make side effects idempotent for you.
- **Wrong tool for the streaming chat.** WDK's enqueue-and-return-immediately model fights an interactive token-streaming UX; the chat stays on the AI SDK.
- **A second managed state store** (Vercel Functions + Queues + managed persistence, usage-based pricing) layered onto the existing Supabase `runs`/`run_items` model — two stores to reason about.

### Approach D — Full Eve framework

**What it is:** Standardize the backend on Eve. `scan.ts` / `draft.ts` / `post.ts` under `agent/tools/` (filename = tool name); `post.ts` gated with `needsApproval` (`always()`/predicate); scheduling via `agent/schedules/*`; per-platform `agent/subagents/*`; notifications via `agent/channels/*`; built-in evals and Agent Runs observability ([vercel.com/docs/eve](https://vercel.com/docs/eve); [vercel.com/docs/eve/concepts](https://vercel.com/docs/eve/concepts)).

**Pros**
- **Framework-level human-in-the-loop approval** (`needsApproval` with helpers from `eve/tools/approval`) durably pauses a tool call before any tweet sends and resumes after the human answers — enforcing the "post in one tap" / atomic-claim behavior **beyond what the X/provider API can** ([github.com/vercel/eve/blob/main/docs/tools/overview.mdx](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx)). This is the single biggest concrete win.
- **Durable sessions on Vercel Workflows** natively deliver "a closed tab never orphans a run" via event-log replay, replacing bespoke `consumeStream()`/`persist` plumbing ([vercel.com/docs/eve/concepts](https://vercel.com/docs/eve/concepts)).
- **Covers the entire roadmap as first-class primitives:** native scheduling, subagents, channels (Slack/Telegram/Twilio…), Sandbox compute.
- **Built-in evals** (`defineEval`, `eve eval`) give a real test harness to an app with **no test runner** — assert "drafts in voice", "never posts without approval" before a model swap.
- **Zero-setup Agent Runs observability** (per-turn timings, reasoning, tool calls/args/results, tokens) — far richer than the current single `logUsage` trace line.
- **Idiomatic, not foreign:** built on the same AI SDK + AI Gateway + Vercel Functions stack already in the repo.

**Cons**
- **Beta / pre-GA at ~v0.15.x** with an explicit "APIs may change before GA" warning (see §4b) — risky to standardize a shipping product's backend on now.
- **Backend framework, not a browser chat convention.** Eve sessions are durable HTTP/NDJSON streams, *not* `useChat` + AI Elements — you still build the React chat yourself, and `updateConfig` (ephemeral, UI-only, no-DB) fits awkwardly into a durable-checkpoint session model.
- **The "nothing persists until Save" create-agent design clashes** with Eve's persist-every-step-as-a-checkpoint grain.
- **The xSearch scan is architectural friction** (same as everywhere): Eve routes models *through* the Gateway, so the direct-xAI xSearch call must live inside a tool's `execute`, sidestepping Eve's gateway-native model handling.
- **Tighter Vercel coupling** (Workflows, Sandbox, Connect, Observability) — leaving Vercel later means unwinding Eve, not swapping a provider.

### Approach E — AI Gateway (the substrate under all of the above)

**What it is:** Not an alternative to A–D but the layer they all sit on. The draft/redraft leg uses `gateway('deepseek/deepseek-v4-flash')` with `xai/grok-4.3` as a declared failover model.

**Pros**
- **One credential + zero token markup**, even under BYOK ([vercel.com/docs/ai-gateway](https://vercel.com/docs/ai-gateway)).
- **Declarative failover** via `providerOptions.gateway.models` — the repo already names Grok as the draft failover, so a DeepSeek outage degrades to Grok instead of failing the draft ([vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks](https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks)).
- **Spend observability** (`getSpendReport()`, tags, per-key budgets) — directly useful for attributing an autonomous fleet's cost per agent ([vercel.com/docs/ai-gateway/observability-and-spend/custom-reporting](https://vercel.com/docs/ai-gateway/observability-and-spend/custom-reporting)).
- **Forward-compatible:** WDK's `DurableAgent` and Eve both resolve models through the Gateway, so today's Gateway investment carries forward into durability and full-framework adoption.

**Cons**
- **Server-side provider tools cannot cross it** — this is the structural constraint that defines the whole architecture (see §3).
- **Adds a network hop / dependency on Vercel's routing layer** in the request path (failover mitigates *model*-side outages, not Gateway availability).
- **The Gateway's own search tools (Perplexity/Parallel) do NOT search X** and are a separate paid service — not a substitute for xSearch ([vercel.com/docs/ai-gateway/models-and-providers/web-search](https://vercel.com/docs/ai-gateway/models-and-providers/web-search)).

---

## 3. The xSearch enforcement question (critical)

**Decisive answer: NO client framework — not Eve, not the AI SDK, not WDK — can force which xSearch sub-tool Grok uses. That choice is purely xAI-server-side, and it is not even exposed as an API parameter.**

The xAI `x_search` tool exposes **exactly six caller-configurable parameters, and none of them select a search mode** ([VERDICT, high confidence; docs at developers/tools/x-search](https://docs.x.ai/developers/tools/x-search)):

1. `allowed_x_handles` (array, max 20) — restrict to these handles
2. `excluded_x_handles` (array, max 20; mutually exclusive with allowed)
3. `from_date` (ISO8601 `YYYY-MM-DD`)
4. `to_date` (ISO8601 `YYYY-MM-DD`)
5. `enable_image_understanding` (bool)
6. `enable_video_understanding` (bool)

These are **content filters** — which handles, what date window, whether to analyze media. The four internal sub-tools (`x_keyword_search`, `x_semantic_search`, `x_user_search`, `x_thread_fetch`) are chosen **autonomously by Grok** based on the prompt; they appear only in `tool_calls` telemetry and are **not selectable by the caller** ([docs.x.ai/developers/tools/tool-usage-details](https://docs.x.ai/developers/tools/tool-usage-details)). There is no `mode`, `search_type`, `sources`, or `subtool` parameter anywhere in the spec.

**Why this is framework-independent:** xSearch is a *provider-executed (server-side) tool* that runs entirely on xAI's servers via the Responses API and has no `execute` function the client controls ([ai-sdk.dev/docs/foundations/tools](https://ai-sdk.dev/docs/foundations/tools)). A framework can only pass the documented parameters down to xAI; it cannot inject control xAI does not expose. Eve specifically would resolve the model through the Gateway and call xSearch from inside a tool's `execute` against the direct `@ai-sdk/xai` provider — and even there, it can pass only those six parameters. **So "force the subtool" is impossible at every layer; it is an xAI product limitation, not a framework gap.** (This is also *why* the scan leg must stay on the direct `@ai-sdk/xai` provider: server-side tools can't cross the Gateway — see §4e and the GitHub issues #11240 / #10607 in §4.)

**The dynamic query-construction goal belongs in the prompt layer, not the tool-config layer.** The docs confirm there is **no query-operator syntax** (`AND`/`OR`/`from:`/`since:`/`filter:news`) exposed at the API level — Grok constructs the actual search query *internally* from the prompt ([docs.x.ai/developers/tools/x-search](https://docs.x.ai/developers/tools/x-search)). The only levers a caller has are: (1) the **six filter parameters** to hard-bound the search (handles + date window), and (2) **prompt engineering** — loading the beat description and handle list into the system prompt so Grok builds a good query. This is exactly what the app already does. Concretely:

- **Source pinning** → `allowed_x_handles` (deterministic, no prompt needed).
- **Incremental "since last run"** → `from_date` = last-run timestamp (the scheduling primitive autonomy needs).
- **What/how to search within those bounds** → the system prompt (Grok-internal, non-deterministic by design).

There is no architecture — including Eve's framework-level controls — that converts query construction into a deterministic, caller-controlled operation. That ceiling is set by xAI, and every candidate approach hits it identically.

---

## 4. Answers to the open questions

### (a) Is AI SDK v7 significantly different from the v6 the plugin documents? What changed?

**The repo is on `ai@6.0.206` (verified).** The Agent/tooling surface this report relies on — `ToolLoopAgent`, `stopWhen`/`stepCountIs`/`hasToolCall`, `prepareStep`, `Output.object`, `createAgentUIStreamResponse`, `InferAgentUIMessage` — is **present and usable in v6.0.206**, but several names are still **`Experimental_`-prefixed** (`Experimental_Agent`, `Experimental_AgentSettings`), per the installed `dist/index.d.ts`.

On v7 specifically: I did **not** verify a v7 release against primary sources in this research, so I will not assert its exact delta — **treat "v7 is significantly different" as unverified.** What the research *does* surface is a forward-looking signal: the live AI SDK docs describe the MCP client as `createMCPClient` from a dedicated **`@ai-sdk/mcp`** package and present `ToolLoopAgent` as a stable (non-experimental) class, whereas on `ai@6.0.206` the MCP client is `experimental_createMCPClient` and the agent is `Experimental_Agent` ([VERSION NOTE in research; ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client](https://ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client)). The honest read: **the v6→later transition is mostly de-experimentalization and package extraction (dropping `experimental_` prefixes, splitting MCP into its own package), not a conceptual rewrite of the Agent model.** The Agent *concepts* in this report are stable across the boundary; only **import paths and the `experimental_` aliases** are likely to move. Pin the version and expect minor surface churn.

### (b) Is Eve stable / production-ready?

**No — Eve is officially BETA / public preview, pre-GA** ([VERDICT, high confidence]). Specifics, cross-checked from primary sources:
- **Version `0.15.5`** (pre-1.0), **Apache-2.0** license, npm package `eve` ([registry.npmjs.org/eve/latest](https://registry.npmjs.org/eve/latest)).
- The official docs and the GitHub README carry the **verbatim disclaimer**: *"The framework, APIs, documentation, and behavior may change before general availability."* ([vercel.com/docs/eve](https://vercel.com/docs/eve); [github.com/vercel/eve](https://github.com/vercel/eve)).
- Launched ~June 17 2026 ("public preview") ([vercel.com/blog/introducing-eve](https://vercel.com/blog/introducing-eve)).
- **Important nuance:** Vercel states it runs **100+ of its own agents in production on Eve** internally — so it is dogfooded under Vercel's control, but that is **not** a frozen-API stability guarantee for external users. Building on Eve means accepting breaking-change risk at a 0.x version.

### (c) Do AI SDK agents and workflows overlap or complement — and where does AI Gateway fit?

**They complement; they do not overlap.** Two senses of "workflow" must be kept apart:
- **AI SDK agentic-workflow *patterns*** (code: chaining/routing/parallel/evaluator-optimizer) and **the AI SDK Agent** (the `ToolLoopAgent` tool loop) are the **same family** — both are *just code running inside one function invocation*, with no durability ([ai-sdk.dev/docs/agents/workflows](https://ai-sdk.dev/docs/agents/workflows)). The choice between them is determinism: use the **Agent** when the model genuinely decides which/how-many tools (open-ended, e.g. the chat); use **explicit patterns/primitives** when control flow is fixed (e.g. scan→draft→post) ([ai-sdk.dev/docs/agents/overview](https://ai-sdk.dev/docs/agents/overview)).
- **The Vercel Workflow DevKit** is a *different layer* — a durability engine that **wraps** either of the above. Its steps call AI SDK agents/patterns inside them; it adds replay, retries, `sleep`, and hooks. So Agent ↔ patterns is a *within-AI-SDK* design choice; WDK is the *orchestration layer above both*.

**AI Gateway fits underneath all three:** the Agent's model, the patterns' `generateText` calls, and WDK's steps all resolve models through the Gateway. It is orthogonal to the agent-vs-workflow question — it is the model-access substrate, not a control-flow choice ([ai-sdk.dev/providers/ai-sdk-providers/ai-gateway](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway)).

### (d) Can Eve enforce xSearch subtool selection at a framework level, and handle dynamic query construction?

**Subtool selection: No** — and no framework can (see §3). Eve's framework-level enforcement powers (`needsApproval`, `toModelOutput`, durable pauses) operate on *Eve's own tool calls* — they gate, shape, and durably pause tool execution ([github.com/vercel/eve/blob/main/docs/tools/overview.mdx](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx)). They cannot reach *inside* xAI's server-side execution to force which sub-search Grok runs, because that is decided on xAI's servers and exposed by **no** parameter ([VERDICT]). Eve's `scan` tool can pass only the six documented xSearch parameters.

**Dynamic query construction: Eve handles it no better and no worse than the AI SDK** — because it lives in the **prompt layer**, which is identical across both. Eve's `instructions.md` (system prompt) is exactly where the beat description + handle list would go, and the handle/date filters go to the tool's parameters. Eve adds *nothing* to deterministic query control here; the ceiling is xAI's prompt-driven, operator-free query construction.

### (e) Does Eve subsume AI Gateway, or stack on it?

**Eve STACKS on AI Gateway — it does not subsume or replace it** ([VERDICT, high confidence]). Model strings in an Eve agent (`model: 'openai/gpt-5.4-mini'`) are resolved and routed **through** AI Gateway; the Eve pricing page even bills AI Gateway as one of the underlying resources Eve consumes, alongside Functions (compute), Workflows (durable sessions), and Sandbox (isolation) ([vercel.com/docs/eve/concepts](https://vercel.com/docs/eve/concepts); [vercel.com/docs/eve/pricing](https://vercel.com/docs/eve/pricing)). The "Eve replaces the Gateway" framing is **not supported by the docs**. Consequence for oparax-chirp: adopting Eve would sit *above* the existing Gateway draft/redraft leg, not replace it — and the **direct-xAI xSearch constraint persists under Eve**, because Eve resolves models through that same Gateway and server-side tools still can't cross it.

### (f) Other Vercel frameworks / patterns worth considering

- **Vercel Cron Jobs** (declared in `vercel.json`) — the zero-dependency trigger for scheduled monitoring; pairs with the existing `last_checked_at` column and fans out per-agent via dynamic paths ([vercel.com/docs/cron-jobs/manage-cron-jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)). **High relevance** to the scheduling stage.
- **Vercel Queues** (the durable queue under WDK) — useful directly for per-item draft fan-out with retries/DLQ/idempotency-dedup if you want fan-out without the full workflow SDK ([vercel.com/docs/queues](https://vercel.com/docs/queues)). Consumer trigger is at `queue/v2beta` (beta). Medium relevance.
- **AI SDK MCP client** (`createMCPClient` / v6 `experimental_createMCPClient`) — exposes external systems (Reddit/Bluesky/LinkedIn/Meta APIs) as model-callable tools alongside scan/draft/updateConfig; directly serves the multi-platform roadmap ([ai-sdk.dev/docs/ai-sdk-core/mcp-tools](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools)). Note: stdio transport is local-only; production needs HTTP/SSE MCP servers. Medium-high relevance.
- **Vercel BotID** (`checkBotId()`) — near-zero-effort invisible protection for the **search-costing `scan` endpoint** and signup; Basic is free, Deep Analysis $1/1k calls ([vercel.com/docs/botid](https://vercel.com/docs/botid)). Good, cheap fit.
- **`waitUntil()` (Fluid Compute)** — the lightweight version of what the app already does for run completion; weaker than WDK (no retries/replay across crashes) ([vercel.com/docs/functions/functions-api-reference](https://vercel.com/docs/functions/functions-api-reference)). Low incremental value given WDK is the durable target.
- **Notifications have NO first-party Vercel product** — email/WhatsApp/push (Resend/Twilio/web-push) are BYO, triggered from a workflow step; Vercel only coordinates the wait via `sleep`/hooks. Worth stating plainly so it isn't assumed.
- **Vercel Sandbox / Vercel Agent** — dev/DevOps tools (isolated code execution, AI PR review), **not runtime building blocks** for this product. Low relevance; including them would be scope creep.

---

## 5. Recommendation seed

**The best *target* architecture is a layered split that uses each tool for exactly what it is built for — not a single framework for everything.** Concretely:

1. **Keep AI Gateway as the model substrate everywhere it already is** — draft/redraft on `gateway('deepseek/deepseek-v4-flash')` with `xai/grok-4.3` failover. It is GA, zero-markup, and forward-compatible with every higher layer ([vercel.com/docs/ai-gateway](https://vercel.com/docs/ai-gateway)). This is settled; nothing above changes it.

2. **Keep the scan leg on the direct `@ai-sdk/xai` provider, forever.** This is *not* tech debt — it is the documented, structural workaround for server-side tools not crossing the Gateway ([issue #11240](https://github.com/vercel/ai/issues/11240); [issue #10607](https://github.com/vercel/ai/issues/10607)). No architecture removes this constraint, so stop treating it as something to fix.

3. **Model the setup chat as an AI SDK `ToolLoopAgent`.** This is the highest-value, lowest-risk adoption: the chat genuinely *is* a model-driven tool loop, and the Agent + `createAgentUIStreamResponse` + `InferAgentUIMessage` collapse the bespoke wiring into one typed object with proper `stopWhen` guardrails for search cost. The scan tool keeps its direct-xAI `execute`. **Confidence: high** — caveat the `Experimental_` prefix and pin the version.

4. **Keep scan→draft→post as orchestrated, deterministic functions — and make the *run* durable with the Vercel Workflow DevKit** once scheduling/autonomy land: one `'use workflow'`, with `scan`/`draftItems`/`postRunItem` as `'use step'`s, triggered by a Cron route, with `defineHook()`/`.resume()` for one-tap approval before any auto-post. This productizes today's hand-rolled `persistRunResult` durability, prevents re-billing the expensive scan on replay, and is the right home for the daily-cap'd autonomous flow. **The atomic post-claim lock stays** regardless — WDK does not make posting idempotent. **Confidence: high on the design; medium on timing** — WDK is public beta, so pin versions and validate stability before trusting it with autonomous posting.

5. **Treat full Eve as a credible *future* foundation for the autonomy stage, not a present migration.** Eve is the cleanest end-state for the whole roadmap — framework-level `needsApproval` durable post-gating, native schedules, subagents per platform, channels for notifications, built-in evals (the app has *no* test runner today), and zero-setup Agent Runs observability. But it is **beta at v0.15.x with an explicit "APIs may change" warning**, it doesn't give you the `useChat` chat surface, and its persist-everything grain clashes with the "nothing persists until Save" create-agent design. **Recommendation: build the autonomy stage *toward* Eve's primitives (or directly on WDK, which Eve itself uses), and adopt Eve wholesale only after it reaches GA and the multi-platform/notification surface is actually being built.** **Confidence: medium** — the merit case is strong, the maturity case is not yet there.

**Net target architecture:**
`Providers (xAI direct for scan; DeepSeek via Gateway for draft) → AI Gateway (model substrate + failover) → AI SDK (ToolLoopAgent for the chat; deterministic orchestrated functions for the pipeline) → Vercel Workflow DevKit (durable scheduled runs + approval hooks for autonomy) → [optionally, post-GA] Eve as the unifying framework.`

**Where I am genuinely uncertain:** (i) the exact v6→v7 delta beyond de-experimentalization — **unverified**, so I have not leaned on any v7-specific behavior; (ii) whether WDK/Eve beta stability is acceptable for money-/posting-adjacent paths on *your* timeline — a judgment call that depends on how soon autonomy ships relative to those products reaching GA. Everything load-bearing in this recommendation rests on GA pieces (AI Gateway, direct-xAI scan, AI SDK primitives); the beta pieces (WDK, Eve) are positioned as the *durability/autonomy* layer where their value is highest and where you can afford to wait for GA.
