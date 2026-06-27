# Grounded Findings — Eve + cron + provider routing

Factual basis for advising on the Oparax scheduling/agent-framework stage. Every non-obvious claim carries a source. Items no investigation covered are marked **unverified**. Contradictions and undocumented gaps are flagged inline.

---

## 1. Eve "skills" — real distinct primitive? Right abstraction for dynamic query-construction logic?

**Decisive fact: "skill" IS a first-class Eve primitive, explicitly distinct from a "tool."** Eve's `agent/` layout has separate sibling directories: `tools/` ("typed functions the model can call") and `skills/` ("procedures loaded on demand"). A skill is "a model-loadable procedure that follows the SKILL.md convention" — a markdown document (or packaged directory with `references/`, `assets/`, `scripts/`) pulled into context **on demand** rather than carried every turn.
- Source: https://eve.dev/docs/skills ; https://eve.dev/docs (docs index lists Skills, Tools, Instructions, Subagents, Channels, Hooks as separate primitives) ; https://github.com/vercel/eve (README tree: `tools/` vs `skills/`, examples `get_weather.ts` vs `plan_a_trip.md`)
- Confidence: **HIGH** — three independent official sources agree.

**Three authoring formats for a skill:** (1) flat markdown (single `.md` in `agent/skills/` with optional frontmatter `description`, e.g. `plan_a_trip.md`); (2) a packaged directory with `SKILL.md` + supporting files; (3) TypeScript via `defineSkill` from `eve/skills` for generated/complex content. Loading is on-demand: when a request matches a skill's frontmatter `description` (or you name it), the model calls `load_skill` and Eve appends that skill's markdown to the active turn.
- Source: https://eve.dev/docs/skills
- Confidence: **HIGH**

**The tool/skill line, verbatim:** "Loading a skill adds instructions, never a new execution surface. Tools stay visible whether a skill is loaded or not. If you need typed runtime behavior, reach for a tool instead."
- Source: https://eve.dev/docs/skills
- Confidence: **HIGH**

**Right abstraction for Oparax's dynamic query-construction logic — implication (not a documented Eve recommendation, this is reasoning from the primitives above):**
- A **skill** carries *instructions/procedure* (markdown, on-demand). It cannot execute typed runtime behavior or construct/return data deterministically — it only adds guidance to the model's context.
- A **tool** is the always-visible, typed, callable function — the place for deterministic runtime logic (e.g. computing a scan window, post-filtering items, calling x_search).
- `instructions.md` is the always-on system prompt (every turn); a subagent is a separate primitive again.
- **Therefore:** if "dynamic query-construction" means *deterministic logic that builds/validates a query and runs it* → that is a **tool**. If it means *guidance on how the model should phrase/approach a query when it composes one* → that is a **skill** (loaded on demand) or `instructions.md` (if it must apply every turn). This maps directly onto Finding #2's conclusion: the deterministic part (windowing, post-filter) must be code/tool, because a prompt cannot reliably steer x_search internals.
- Confidence: **MEDIUM** — the primitive definitions are HIGH-confidence/documented; the *mapping to Oparax's use case* is synthesis, not a quoted Eve doc.

**Minor inconsistency flagged:** the raw GitHub README fetch did **not** surface the literal strings `SKILL.md` / `load_skill` (it shows the flat-markdown `plan_a_trip.md` example only); those terms are confirmed on the dedicated https://eve.dev/docs/skills page. Distinction is well-grounded, not invented.

---

## 2. xAI x_search time granularity + can a prompt steer sub-tool choice + reliable hourly-tight scan

**Decisive fact: `from_date` / `to_date` are DATE-only (YYYY-MM-DD), day-granular. An hourly window CANNOT be expressed through these two params.** Docs state verbatim: "Both fields need to be in ISO8601 format, e.g., 'YYYY-MM-DD'." All examples use `"from_date": "2025-10-01"`, `"to_date": "2025-10-10"`. No sub-day / hourly / minutely / UNIX-timestamp variant appears anywhere. The Python SDK accepts `datetime.datetime` objects but resolves to day-level (examples show `datetime(2025, 10, 1)` with no time component; wire value is `"2025-10-01"`).
- Source: https://docs.x.ai/developers/tools/x-search
- Confidence: **HIGH**

**Decisive fact: the caller CANNOT steer sub-tool selection or sub-tool query construction.** `x_search` is a **server-side tool** — xAI executes it automatically/internally. The caller supplies only **six top-level params**: `allowed_x_handles`, `excluded_x_handles`, `from_date`, `to_date`, `enable_image_understanding`, `enable_video_understanding`. There is **no** parameter, field, or documented prompt mechanism to select a sub-tool (`x_keyword_search`, `x_semantic_search`, `x_user_search`, `x_thread_fetch`) or dictate how Grok composes those sub-tool queries.
- Source: https://docs.x.ai/developers/tools/x-search
- Confidence: **HIGH**

**No query-operator syntax is documented.** No `since:` / `until:` / `from:` / `filter:` / `min_faves`, etc. The only caller-exposed time controls are the two day-granular date params; query syntax is absent from all six parameters.
- Source: https://docs.x.ai/developers/tools/x-search
- Confidence: **HIGH**

**Reliable hourly-tight scan strategy (the documented-facts-driven recommendation):** Set `from_date`/`to_date` to bracket the target day (or surrounding day window), then **post-filter each returned item by its own timestamp in application code.** This is deterministic and independent of how Grok interprets any prompt. Prompting Grok with a target hour is **nondeterministic** — Grok controls sub-tool query construction internally and there is no documented guarantee it honors a prompt-level time hint.
- Source: https://docs.x.ai/developers/tools/x-search
- Confidence: **HIGH** (the strategy follows directly from the day-granular + opaque-internals facts)

**Flagged as undocumented / open:**
- Whether the backend clips at midnight UTC vs. some other timezone for a `YYYY-MM-DD` boundary is **not documented** — post-filtering in code is the only safe approach regardless. **Unverified.**
- Whether prompting an explicit hour has *any measurable statistical* effect on sub-tool query construction is **not documented**. The docs don't address prompt influence on sub-tool internals at all. **Unverified.**
- The internal gist describing the four sub-tools is **not part of public xAI docs** and is therefore outside what xAI confirms as a stable, caller-controlled contract. Treat it as Grok's private implementation, not an API surface.

---

## 3. Vercel cron limits vs Workflow DevKit (WDK) — count is per-project; one cron fans out; what WDK adds/gives up

**Decisive fact: you do NOT need N×M cron jobs.** A Vercel cron job is a static `{path, schedule}` entry in `vercel.json`/`vercel.ts`; Vercel triggers it via an HTTP GET to that path on the production deployment (user-agent `vercel-cron/1.0`). The cron-job *count* equals the number of `{path, schedule}` entries — **not** the number of records the route processes. **ONE** route that reads a Supabase table of due agents and fans out internally is **ONE** cron job, independent of N users / M agents. Cron jobs are NOT registered per-user/per-agent at runtime.
- Source: https://vercel.com/docs/cron-jobs ; https://vercel.com/docs/cron-jobs/manage-cron-jobs (dynamic-route fan-out example) ; https://vercel.com/docs/project-configuration/vercel-json
- Confidence: **HIGH**

**Decisive fact: the cron ceiling is 100 cron jobs per project on EVERY plan** (Hobby, Pro, Enterprise alike — same number in the "cron jobs per project" column). The per-plan difference is **FREQUENCY, not count**: Hobby caps at once-per-day with ±59 min imprecision (sub-daily cron expressions **fail at deploy time**); Pro and Enterprise allow once-per-minute with per-minute precision. **Hourly scheduling therefore requires Pro/Enterprise**, but the 100-count ceiling is plan-independent and irrelevant to the one-cron fan-out design.
- Source: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Confidence: **HIGH**

**Cron billing:** cron jobs invoke Vercel Functions (Fluid Compute), billed at standard Function usage — **no separate per-invocation cron fee**; cron jobs themselves are included on all plans.
- Source: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Confidence: **HIGH**

**Decisive fact: WDK does NOT change the cron-job count and is NOT a scheduler.** Vercel Workflows is a managed durability platform (Functions execute step code, Vercel Queues enqueue/execute routes reliably, managed persistence stores state + event logs). It has **no built-in scheduler** — a run is started by calling `start(workflowFn, [args])` from server code (an API route, Server Action, **or the cron handler**). So you still need **exactly ONE cron tick**; the cron route can then `start()` one durable workflow per due agent (or one fan-out workflow). Net cron count with or without WDK: **still one**.
- Source: https://vercel.com/docs/workflows ; https://vercel.com/docs/workflows/concepts ; https://workflow-sdk.dev/docs/foundations/starting-workflows ; https://workflow-sdk.dev/docs/getting-started/next
- Confidence: **HIGH**

**What WDK ADDS (and what you GIVE UP by skipping it):**
- Per-step durability via `use step`: built-in automatic retries; the step survives network errors / process crashes; while a step runs the workflow suspends **without consuming resources**, then resumes where it left off. `sleep()` pauses for a duration consuming **NO compute**. A deploy/crash triggers **deterministic replay** from the event log. Workflows keep running on the deployment they were created on (**Skew Protection**) — in-flight runs are unaffected by new deploys. Resumable (pause minutes→months), Durable, Observable.
- Source: https://vercel.com/docs/workflows/concepts
- Confidence: **HIGH**
- **Skipping WDK is viable for an MVP.** What you give up: crash-safety across redeploys/crashes (deterministic replay), automatic per-step retries, sleep/wait-without-burning-compute, and built-in run observability — all of which you'd otherwise hand-roll in Postgres + your own retry/idempotency logic.
- Confidence: **HIGH** (this is the direct corollary of the durability facts)

**Repo-specific note (grounded in this codebase):** `lib/scan/persist.ts:persistRunResult` already gives Oparax **server-driven run completion** (chained off `result.consumeStream()`), the single most important durability property — a closed tab never orphans a run. WDK would *generalize* this with replay + retries, but the core "every run reaches a terminal state" guarantee already exists. Per AGENTS.md, do **not** reintroduce a client-drain dependency.
- Source: AGENTS.md (repo) ; lib/scan/persist.ts (repo)
- Confidence: **HIGH** (repo contract)

**WDK billing (usage-based, on top of normal Fluid Compute + Queues):**
- Workflow Events: $0.02/1K events (50,000 events/month included on Hobby). A normal step = **3 events** (created/started/completed), plus `step_retrying` per retry.
- Workflow Data Written: $0.50/GB (1 GB included on Hobby).
- Workflow Data Retained: $0.50/GB-month — **not available on Hobby**.
- Functions invoked by workflows bill at normal compute rates; Queues at standard rates.
- Source: https://vercel.com/docs/workflows/pricing
- Confidence: **HIGH**

**WDK scaling — NO per-project/per-plan cap "N×M hourly" would eat into:** "Projects: Unlimited", "Queued runs: No limit", "Schedules/cron: No limit", "Maximum run duration: No limit", "Maximum sleep duration: No limit", Concurrency up to 100,000. Per-**run** limits do exist: 10,000 steps/run, 25,000 events/run, 1,000 run creations/sec, 2 GB entity storage/run, 240s max replay duration.
- Source: https://vercel.com/docs/workflows/pricing
- Confidence: **HIGH**

**Managed-persistence retention after run completion** (plan-scoped): Hobby 1 day, Pro 7 days, Enterprise 30 days (configurable only via support).
- Source: https://vercel.com/docs/workflows/pricing
- Confidence: **HIGH**

**Flagged as undocumented / open:**
- No documented path to raise the 100-cron-per-project cap; Enterprise custom limits may exist but are **not** on the public page. **Unverified.**
- Workflow pricing page lists Hobby included allowances + "Pro usage billed on demand" but does **not** publish an explicit Pro/Enterprise *included* Workflow-Events allowance separate from on-demand rates. **Unverified.**
- The canonical `start()` "no built-in scheduler" statement was confirmed on **workflow-sdk.dev**, not vercel.com (the vercel.com concepts page shows `resume()`/hooks, not the canonical `start()` example). Cross-source but worth noting.
- Whether WDK *requires* Fluid Compute is phrased as a **recommendation** ("We recommend using Fluid compute with Workflow"), not a hard requirement.
- Exact Pro-plan included Function/Fluid-Compute Active-CPU allowance (the compute both the cron fan-out AND workflow steps consume) was **not pulled** — lives at /docs/functions/usage-and-pricing and /pricing. **Unverified here.**

---

## 4. The OLD cron implementation in git — mechanism, routes, commit hashes

**It WAS fully built and shipped, then deleted.** This is not "never built." The legacy scheduling lived under a **workflows** module and was removed wholesale on **2026-05-31** in favor of the prompt-lab/agents loop.

**Mechanism (grounded in git history + the route source itself):**
- **Cron route:** `app/api/cron/workflow-scans/route.ts`. `export const runtime = "nodejs"`, `export const maxDuration = 800`. Auth via `CRON_SECRET`: the route checks `request.headers.get("authorization") === \`Bearer ${cronSecret}\``.
- **Schedule:** `vercel.json` carried `"crons": [{ "path": "/api/cron/workflow-scans", "schedule": "* * * * *" }]` (every minute — the Pro per-minute trigger, then the route decides what is *due*).
- **Fan-out / claim model (exactly the pattern Finding #3 endorses):** the route called a Postgres RPC `supabase.rpc("claim_due_workflow_trigger")` against a service-role client (`lib/supabase/service-role.ts`). The claim RPC was later updated to return `last_run_at` for server-side freshness filtering. Overlap protection + stale-row reaping were added: `SCHEDULED_SCAN_TIMEOUT_MS = 10 min`, `STALE_SCHEDULED_SCAN_AFTER_MS = 15 min`; orphaned `scan_runs` rows with `source='scheduled'`, `status='running'` older than the stale window were force-failed.
- **Shared logic:** `lib/workflow-scans.ts` (435 LOC when first tracked) held `runWorkflowScan`, `persistScanRunResults`, `failScanRun`, `normalizeScanHandles`, `WorkflowScanError`. Drafting was `lib/workflow-drafting.ts`; prompts `lib/prompts.ts`.
- **Data model (now dropped):** tables `scan_runs`, `scan_items`, `workflows`, `triggers`; functions `claim_due_workflow_trigger`, `trigger_frequency_interval`; enum `trigger_frequency_unit`. Scan items stored a decoded X **publish time** (`published_at`) so history could distinguish "when published" vs "when Oparax first saw it," and the previous run time filtered fresh-vs-baseline discoveries.

**Commit hashes:**
- `66221fd` — "Track scheduled scan server helpers" (first tracks `lib/workflow-scans.ts` + `lib/supabase/service-role.ts`; removes stale `/lib/` gitignore rule).
- `3d27d65` — "Tighten scheduled scan freshness" (adds `published_at`, prev-run-time filtering, cron claim RPC returns `last_run_at`; migration `20260523134504_add_scan_item_published_at.sql`).
- `78f01b9` — "Fix scheduled scan timeouts" (raises `maxDuration`, adds cleanup + overlap protection; last working version of the route).
- `8bc3c89` — "Remove legacy workflows module (code + tables)" — **deletes the whole surface**: `app/api/cron/workflow-scans/route.ts` (245 LOC), `app/api/{scan,draft,test-scan}`, all `app/dashboard/workflows/*`, `lib/workflow-{scans,drafting}`, `lib/prompts.ts`, `lib/scan-constraints.ts`, `lib/xai.ts`; empties `vercel.json` `"crons"`; migration `20260601042543_drop_legacy_tables` drops the legacy tables/functions/enum (CASCADE, FK-safe). Current `vercel.json` confirms `"crons": []`.
- Source: repo git history (hashes above) ; `git show 78f01b9:app/api/cron/workflow-scans/route.ts` ; current `vercel.json` (`"crons": []`)
- Confidence: **HIGH** — read directly from this repo's history and working tree.

**Takeaway for the advice:** the *exact* "1 cron (`* * * * *`) → service-role claim RPC selects due rows → fan-out → terminal-state persistence + stale-row reaping" architecture Findings #3 recommends **was already implemented and battle-tested in this repo**, then removed in the pivot. The current scheduling stage is a placeholder (`components/agents/panels/SchedulePanel.tsx`, per AGENTS.md). Rebuilding can lean on this proven shape rather than inventing it.

---

## 5. Eve evals / observability / COST — what it can and cannot replace vs a hand-built usage dashboard

**Unverified — the Eve investigation returned a placeholder.** The "Vercel Eve agent framework capability audit" investigation summary claims "Eve identity confirmed and six questions answered," but its `keyFacts` and `openItems` are literal `"test"` stubs with source `"test"` and a single source URL `https://vercel.com/docs/eve`. **No substantive facts on Eve evals, observability, or cost-tracking capability were delivered.** I will not fabricate them.

What IS grounded elsewhere and bears on this heading:
- Eve **skills** (Finding #1) add *instructions*, not an execution/telemetry surface — so a skill is **not** a cost dashboard.
- This repo's usage telemetry (`api_usage_events` + `usage_reconciliations`) and the admin usage dashboard were **removed**, "to be rebuilt from scratch." Today `lib/usage/log.ts:logUsage` only prints one trace line per call (tool → API/model → tokens → cost); the cost calc lives in `lib/usage/{cost,pricing,format}.ts`.
  - Source: AGENTS.md (repo)
  - Confidence: **HIGH** (repo state)

**Recommendation for the advisor:** treat "can Eve replace a hand-built usage dashboard?" as an **open question requiring a fresh docs check** (https://vercel.com/docs/eve and Eve observability docs) — the investigation did not answer it. Do not assert either way.

---

## 6. Provider/model routing — AI SDK as the library; gateway-string vs direct `@ai-sdk/xai`; why scan must be direct; can Eve mix both per-tool

**Decisive fact (repo contract): the AI SDK is the single LLM convention, and routing splits by whether the call needs a server-side tool.**
- **Search-free calls** (setup chat + draft/redraft) route through the **AI Gateway**, model `deepseek/deepseek-v4-flash` with `xai/grok-4.3` as failover.
- **The `x_search`-bound scan uses the DIRECT `@ai-sdk/xai` provider**: `xai.responses("grok-4.3")` + `xai.tools.xSearch`.
- Source: AGENTS.md (repo)
- Confidence: **HIGH** (repo state)

**Why scan MUST be direct — the load-bearing reason, verbatim from AGENTS.md:** "because **server-side tools cannot cross the Gateway**." `x_search` is a server-side tool (Finding #2: xAI executes it internally), so the Gateway's gateway-string routing cannot carry it — the scan leg has to bind the tool through the direct xAI provider.
- Source: AGENTS.md (repo) ; corroborated by https://docs.x.ai/developers/tools/x-search (x_search is server-side)
- Confidence: **HIGH**

**Can Eve mix both (gateway-string for some tools, direct provider for others) per-tool? — partially unverified.**
- What's grounded: the AI SDK itself already supports mixing — this repo *does* exactly that today (Gateway for chat/draft, direct `@ai-sdk/xai` for scan). That is an AI-SDK capability, independent of Eve.
  - Source: AGENTS.md (repo)
  - Confidence: **HIGH** for "the AI SDK supports per-call provider choice."
- What's NOT grounded: whether **Eve specifically** lets you assign a different provider/model per *tool* within one agent. The Eve investigation delivered no facts (Finding #5). **Unverified** — needs a check against Eve's model/provider-config docs.

**Practical implication:** any Eve adoption must preserve the direct-`@ai-sdk/xai` path for the scan tool; routing scan through a gateway-string would break `x_search`. This is a hard constraint regardless of framework.
- Confidence: **HIGH**

---

## 7. Grok-for-both vs DeepSeek-chat + Grok-scan — cost delta + BYOK / one-gateway flexibility

**Decisive price points (cross-confirmed across THREE independent sources: repo constants, xAI docs, live Gateway `/v1/models`):**
- `grok-4.3`: **$1.25 / 1M input, $2.50 / 1M output** (tiers to $2.50/$5.00 above 200,001 tokens).
- `deepseek-v4-flash`: **$0.14 / 1M input, $0.28 / 1M output** ($0.0028/1M cached-input read).
- `x_search`: **$5 per 1,000 calls = $0.005/call**, fixed regardless of model.
- Source: `lib/usage/pricing.ts:5` and `:8-9` (repo) ; https://ai-gateway.vercel.sh/v1/models (live) ; https://docs.x.ai/developers/pricing ; cross-check https://openrouter.ai/deepseek/deepseek-v4-flash
- Confidence: **HIGH** — three sources agree exactly.

**Repo pricing nuance (grounded):** `deepseek-v4-flash` is **NOT** in the repo `MODEL_RATES` table — it's Gateway-priced, so `computeCostUsd` returns the **gateway-reported `marketCost`** when present rather than a hardcoded per-token rate. Only `grok-4.3` and `x_search` are hardcoded in `lib/usage/pricing.ts`.
- Source: `lib/usage/cost.ts:18-21` ; `lib/usage/pricing.ts` (repo)
- Confidence: **HIGH**

**The cost delta (rough numbers):** For a typical ~10-turn setup chat (~3k avg context/turn ⇒ ~30k total input; ~300 output/turn ⇒ ~3k total output):
- Grok ≈ 30k·$1.25/1M + 3k·$2.50/1M = $0.0375 + $0.0075 = **~$0.045/chat**.
- DeepSeek ≈ 30k·$0.14/1M + 3k·$0.28/1M = $0.0042 + $0.00084 = **~$0.005/chat**.
- **Delta ≈ $0.040/chat; Grok ≈ ~9× DeepSeek on chat tokens.**
- "Grok for BOTH chat and scan" vs "DeepSeek chat + Grok scan" differ **only in the chat leg** (scan is Grok either way) ⇒ that ~$0.040/chat *is* the whole difference.
- Per-chat it's cents ("peanuts" at low volume), but it's ~9× the DeepSeek chat cost and ≈ **8 scan-search invocations** ($0.005 each), and **~$400 per 10,000 setup chats** at scale ⇒ **material, not peanuts.**
- Source: computed from `lib/usage/pricing.ts:5`, `lib/usage/cost.ts:18-34`, https://ai-gateway.vercel.sh/v1/models
- Confidence: **HIGH** on the rates; **MEDIUM** on the absolute delta (depends on the token-per-turn assumptions below).

**Scan-leg cost driver (grounded):** one `x_search` call is a **fixed $0.005** floor regardless of model; a typical few-k-token scan (e.g. 10k in + 2k out at Grok rates ≈ $0.0175) is the same order as — and often dominated by — that fixed per-search floor. This is the cost the repo flags as "costs a search."
- Source: `lib/usage/pricing.ts:8-9` (repo)
- Confidence: **HIGH**

**BYOK / one-gateway flexibility argument (grounded reasoning):** Today the chat leg is **Gateway-priced** (`cost.ts` trusts the Gateway-reported `marketCost`, not a hardcoded DeepSeek rate). The Gateway gives provider failover (`deepseek` → `xai/grok-4.3`) and a single integration surface, at the cost of potential BYOK/markup on the reported price. Routing chat through Grok is *possible via the same Gateway string* (no new integration) — so the flexibility argument is: keeping chat on the Gateway lets you swap chat models (DeepSeek ↔ Grok) by changing a model string, while the scan leg is **locked to direct `@ai-sdk/xai`** because `x_search` can't cross the Gateway (Finding #6). You cannot get "one gateway for everything" — the scan tool forces a second, direct path no matter what.
- Source: AGENTS.md (repo) ; `lib/usage/cost.ts:18-21` (repo)
- Confidence: **HIGH** for the routing constraint; **MEDIUM** for the BYOK-markup magnitude (see below).

**Flagged as undocumented / open:**
- If the Gateway applies a **BYOK markup**, actual billed DeepSeek cost could differ slightly from the raw $0.14/$0.28. **Unverified** (the repo trusts the Gateway's reported `marketCost`).
- Per-turn token estimates (3k context, 300 output) are **assumptions, not measured** from the real setup-chat system prompt + `AgentConfig` zod schema overhead — which likely pushes per-turn input **above** 3k, *widening* the absolute Grok-vs-DeepSeek delta proportionally. **Unverified magnitude.**
- `grok-4.3` tiered pricing doubles above 200,001 total tokens; a normal chat stays under, but a pathologically long chat crosses into 2×. 
- Reasoning tokens **not** separately priced: if Grok emits reasoning tokens in chat they bill at the same rates and increase the Grok side further; DeepSeek V4 Flash is the non-reasoning variant. **Unverified** whether Grok emits them here.

---

## 8. Practical — Eve CLI global install? Installable Eve agent-skill / SKILL.md worth adding?

**Unverified — no investigation delivered facts on the Eve CLI install model or a published Eve agent-skill.** The Eve audit investigation returned `"test"` stubs (see Finding #5), and none of the other investigations touched CLI installation or a shippable `SKILL.md` for Eve context.

What IS grounded and relevant:
- Eve's source/docs exist at https://github.com/vercel/eve, https://eve.dev/docs, and the SDK at https://workflow-sdk.dev — so a real CLI and skill convention plausibly exist, but the **specifics (global vs local install, whether an installable Eve SKILL.md exists) are not in any investigation result.**
- The `SKILL.md` convention is real (Finding #1) — so authoring a *local* Eve-context skill for a coding agent is mechanically supported by Eve itself, but whether Vercel **publishes** an installable one is unconfirmed.

**Recommendation for the advisor:** answer both sub-questions only after a fresh check of the Eve CLI docs (install/quickstart page) — do **not** assert a global-install recommendation or the existence of a published Eve agent-skill from current evidence. Both are **open**.

---

## Source ledger (deduplicated)

**Repo (this codebase):** `AGENTS.md`; `lib/usage/pricing.ts` (`:5`, `:8-9`); `lib/usage/cost.ts` (`:18-34`); `lib/scan/persist.ts`; `vercel.json`; git commits `66221fd`, `3d27d65`, `78f01b9`, `8bc3c89`; `app/api/cron/workflow-scans/route.ts` (historical).

**xAI:** https://docs.x.ai/developers/tools/x-search ; https://docs.x.ai/developers/tools/advanced-usage ; https://docs.x.ai/developers/pricing

**Vercel cron / workflows:** https://vercel.com/docs/cron-jobs ; https://vercel.com/docs/cron-jobs/usage-and-pricing ; https://vercel.com/docs/cron-jobs/manage-cron-jobs ; https://vercel.com/docs/project-configuration/vercel-json ; https://vercel.com/docs/project-configuration/vercel-ts ; https://vercel.com/docs/workflows ; https://vercel.com/docs/workflows/concepts ; https://vercel.com/docs/workflows/pricing ; https://vercel.com/docs/queues ; https://workflow-sdk.dev/docs/foundations/starting-workflows ; https://workflow-sdk.dev/docs/getting-started/next

**Eve:** https://eve.dev/docs/skills ; https://eve.dev/docs ; https://github.com/vercel/eve ; https://raw.githubusercontent.com/vercel/eve/main/README.md ; https://vercel.com/docs/eve *(Eve capability audit returned placeholder data — Findings #5 and #8 unverified)*

**Pricing cross-checks:** https://ai-gateway.vercel.sh/v1/models ; https://openrouter.ai/deepseek/deepseek-v4-flash ; https://pricepertoken.com/pricing-page/model/deepseek-deepseek-v4-flash ; https://openrouter.ai/x-ai/grok-4.3 ; https://vercel.com/docs/ai-gateway/models-and-providers
