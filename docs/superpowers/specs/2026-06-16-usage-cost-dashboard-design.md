# Usage & cost-analytics dashboard (issue #36)

Status: design approved pending user review
Branch: `ft/36` (worktree off `ft/35`, isolated from the parallel chat-redesign work)
Splinter of: #35 (telemetry foundation: `api_usage_events`, `lib/usage/log.ts`, `/dashboard/usage`)

## Goal

An AWS/GCP cost-explorer-style **internal** dashboard (ADMIN_EMAILS-gated) for analyzing
exactly where money goes. It turns the #35 telemetry from a flat kind×provider table into a
drill-down cost explorer: summary cards + charts + a filterable/sortable/searchable data table +
a summable cost-attribution tree, with real BYOK dollar costs (today every `cost_usd` is NULL).

Out of scope (explicitly dropped during design): the login/logout activity timeline. This is a
**cost** explorer, not an activity tracker. `auth.audit_log_entries` is empty anyway.

## Context findings (the reality this design must respect)

- `api_usage_events` columns today: `id, user_id, agent_id, run_id, kind, provider, model,
  input_tokens, output_tokens, cost_usd, metadata(jsonb), created_at`.
- Enums: `usage_kind {chat, scan, draft, redraft, x_verify, web_validate}`,
  `usage_provider {xai, gateway, x_api, internal}`.
- `logUsage()` (`lib/usage/log.ts`, service-role insert, failures swallowed) is called from:
  `app/api/agents/chat/route.ts` (×2), `app/api/agents/scan/route.ts`,
  `app/api/agents/[id]/run/route.ts`, `lib/x/verify.ts`.
- Live data: 54 events, **all `cost_usd = NULL`**, 1 user, `agent_id`/`run_id` NULL in practice.
  Chat rows have tokens; scan rows carry `metadata {elapsedMs, storyCount, xSearchCalls,
  triggeredFrom}` but NULL tokens. No session/message/tool-call linkage exists anywhere.
- UI stack: shadcn is wired (`components.json`, `components/ui/*` graphite-mapped via ft/35),
  style `radix-nova`, icons hugeicons + lucide. Missing primitives to add: `table`, `chart`
  (recharts), `@tanstack/react-table`. `collapsible`, `command`, `select`, `dropdown-menu`,
  `tooltip`, `badge` already present.

## Verified external facts (drive the cost engine)

- **AI Gateway response** (`providerMetadata.gateway`) returns per call:
  `routing.resolvedProvider` / `finalProvider` (the real biller, e.g. `deepinfra`),
  `cost` (what Vercel charges — ≈$0 for BYOK), `marketCost` (market-rate equivalent),
  `generationId`. → For gateway calls we capture `marketCost` as the BYOK cost estimate and
  `resolvedProvider` as the true biller. No hand-maintained rates needed for gateway calls.
- **`gateway.getAvailableModels()`** exposes `model.pricing.input/output` per token — a
  programmatic rate source (cache it) for any model not covered by `marketCost`.
- **`providerOptions.gateway.sort: 'cost'`** is the sort-by-cost provider ordering (additive to
  `lib/ai/providers.ts` `GATEWAY_PROVIDER_OPTIONS`).
- **Billing APIs are free to call** (account-management endpoints, unmetered) but **aggregate
  only** (never per-call), so they reconcile/calibrate, they do not attribute:
  - xAI `POST https://management-api.x.ai/v1/billing/teams/{team}/usage` → per-model/day USD;
    needs a **separate management key** (inference key cannot read billing).
  - DeepInfra `GET /payment/usage/tokens` → per-model/month units+rate+cost; reuses BYOK key.
  - DeepSeek `GET /user/balance` → current balance only (reconcile via balance-delta); reuses key.
- grok-4.3 (direct, scan): input $1.25/1M, output $2.50/1M; xSearch $0.005/call. X API: pay-per-use.

## Architecture

Three layers, each independently understandable/testable.

### 1. Telemetry spine (additive — the drill-down hierarchy)

The hierarchy the dashboard renders:

```
user → chat session → message → tool call (verifyHandles→x_verify / validateSites→web_validate / scan)
     → API call (one event row) → scan sub-metrics (xSearchCalls, storyCount) → tokens (in/out)
```

Each `api_usage_events` row is the leaf ("API call"). Add **nullable** columns so existing rows
and inserts keep working:

- `session_id text` — the chat conversation id (read server-side from the AI SDK `body.id`; no
  chat-UI file touched).
- `message_id text` — the assistant turn id.
- `tool_call_id text` — the tool invocation id (when a message spawns a tool).
- `tool_name text` — `verifyHandles` | `validateSites` | `scan` | null.
- `resolved_provider text` — actual biller from gateway metadata (`deepinfra`/`deepseek`/`xai`),
  distinct from the routing-layer `provider`.
- `gateway_generation_id text` — for later `getGenerationInfo` lookups / dedupe.

`cost_usd` is populated at log time (see layer 2). Migration also **backfills** `cost_usd` for the
existing 54 rows using the same engine.

Coordination with ft/35: the only shared files are the `logUsage()` call sites and
`lib/usage/log.ts` (extend the `UsageEvent` type with the new optional fields). All edits are
**append-only** — new optional fields on existing payloads. No chat/agent **UI** files are touched.
`scan/route.ts` additionally starts logging scan input/output tokens from the xAI response usage.

### 2. Cost engine (`lib/usage/pricing.ts`, `lib/usage/cost.ts`)

`computeCostUsd(event)` resolves a dollar cost per leaf row:

- **Gateway calls** (chat/draft/redraft): use `providerMetadata.gateway.marketCost` captured at
  call time. (Fallback: `getAvailableModels()` pricing × tokens if marketCost absent.)
- **Direct-xAI scan**: `inputTokens×$1.25/1M + outputTokens×$2.50/1M + xSearchCalls×$0.005`.
- **X API (x_verify)**: per-request pay-per-use rate from a small constant table.
- Rate table is a typed constant seeded from pricing pages, refreshable from
  `getAvailableModels()`; kept tiny since gateway `marketCost` covers the common path.

The engine is pure (input event → number) so it is unit-reasoned and reused by both the log path
and the backfill migration.

### 3. Reconciliation (`lib/usage/reconcile.ts` + admin route + optional weekly cron)

Manual ("Sync billing" button) or weekly. For each provider: pull account-level spend (xAI usage
endpoint, DeepInfra usage/tokens, DeepSeek balance-delta), compare to our summed local estimate
for the same window, store a variance snapshot. Surfaced as "estimated $X · provider $Y · drift Z%".

- New table `usage_reconciliations (id, provider, period_start, period_end, estimated_usd,
  provider_usd, drift_pct, synced_at, raw jsonb)` — owner/admin-readable, service-role write.
- Secrets (server-side only, **optional** — dashboard runs on math alone if absent). **All three
  now set** in `.env.local` (verified) and in Vercel production (sensitive, not yet redeployed —
  redeploy not required for this work): `XAI_MANAGEMENT_KEY` (new management key),
  `DEEPINFRA_API_KEY` + `DEEPSEEK_API_KEY` (reuse BYOK keys). So live reconciliation is testable
  locally. The ft/36 worktree needs `.env.local` copied in for local build/browser checks (never
  committed; gitignored).
- No per-turn billing calls; reconciliation is on-demand/scheduled only.

### 4. Provider ordering (`lib/ai/providers.ts`, additive)

Add `sort: 'cost'` to `GATEWAY_PROVIDER_OPTIONS.gateway` so the gateway prefers the cheapest BYOK
provider. Strictly additive; coordinate the one-line change with ft/35.

## UI (`/dashboard/usage`, admin-gated, rebuilt)

Server component keeps the existing admin gate (ADMIN_EMAILS) + service-role query, loads the
period's events, computes aggregates, and hands shaped data to client components. Date-range state
lives in the URL (`?range=30d` / custom). Timestamps render in **PST** `MM/DD HH:MM:SS`
(`Intl.DateTimeFormat`, `timeZone: 'America/Los_Angeles'`).

Layout (top → bottom):

1. **Controls**: date-range segmented control (24h/7d/30d/custom) · `Sync billing` button ·
   reconcile-drift badge.
2. **KPI cards**: total cost (+Δ vs previous period) · API calls · tokens (in/out) · top cost
   driver. Each sums the period.
3. **Charts** (4): cost-over-time hero (stacked area by resolved provider, toggle to by-kind) +
   by-kind donut + by-provider donut + by-user bar. recharts via shadcn `chart`.
4. **Cost attribution tree** (`components/usage/attribution-tree.tsx`): expandable indented tree
   user→session→message→tool→call; calls/tokens/cost columns **sum into each parent**; collapsing
   rolls children up. **Click-to-focus**: clicking a node re-roots the charts + data table to that
   node's subtree (sets a focus filter shared across the page).
5. **Data table** (`components/usage/events-table.tsx`): shadcn/TanStack faceted table over leaf
   events — search + kind/provider facets + sortable columns + PST timestamps + pagination. Shares
   the focus filter with the tree.

Client components are split by responsibility (tree, table, each chart, controls) so each file
stays focused and holds in context. The shared filter state (date range + focused node + facets)
lives in one small client store/provider consumed by the table, tree, and charts.

### Sidebar & admin gating

`Usage` is **admin-only and invisible to everyone else**.

- New helper `lib/auth/admin.ts` → `isAdmin(email: string | null | undefined): boolean` parsing
  `ADMIN_EMAILS` (comma-split, trim, lowercase). Single source of truth, reused by layout + page.
  Replaces the inline parsing currently in `app/dashboard/usage/page.tsx`.
- `app/dashboard/layout.tsx` computes `isAdmin(user.email)` and passes an `isAdmin` prop into
  `WorkspaceShell`.
- `components/dashboard/workspace-shell.tsx`: remove the disabled `Insights (Soon)` span; render
  the live `Usage` nav `<Link>` to `/dashboard/usage` **only when `isAdmin`** (with route-active
  state). Non-admins never see the item.
- `app/dashboard/usage/page.tsx`: keep the hard server-side guard — non-admins (or anyone who
  manually hits the URL) are `redirect("/dashboard")`'d (the agents listing). Now uses `isAdmin`.

`ADMIN_EMAILS` (verified in `.env.local`): `farzanmrz@gmail.com,testuser@oparax.com,farzan@oparax.com`.

## Data flow

`UsagePage (server)` → service-role select events for range (+ reconciliations) → server-side
aggregation helpers (`lib/usage/aggregate.ts`: build tree, per-kind/provider/user rollups, KPI
totals, time series) → pass to `UsageDashboard (client)` → controls/tree/table/charts read shared
filter state; client-side re-rooting filters the already-loaded dataset (fine at current volume;
SQL aggregation if it grows). `Sync billing` POSTs to the admin reconcile route, which writes a
`usage_reconciliations` row and revalidates.

## Migrations

1. `ALTER TYPE usage_provider ADD VALUE 'deepinfra'; ADD VALUE 'deepseek';`
2. `ALTER TABLE api_usage_events ADD COLUMN session_id text, message_id text, tool_call_id text,
   tool_name text, resolved_provider text, gateway_generation_id text;` (all nullable)
3. `CREATE TABLE usage_reconciliations (...)` + RLS (admin/owner read, service-role write).
4. Backfill `cost_usd` for existing rows via the cost engine (one-off script/SQL).
   Regenerate `lib/types/database.ts` after.

## Testing / verification (no test runner in repo)

- `pnpm build` green; `pnpm lint` (Biome) clean.
- Cost engine reasoned over known fixtures (a chat row with marketCost, a scan row with xSearch).
- `browser-agent` check of `/dashboard/usage` as an admin: cards render real (non-NULL) costs,
  tree expands and sums, click-to-focus re-roots, table filters/sorts/searches, sidebar shows
  Usage and no longer shows Insights (Soon).
- Reconcile path exercised with keys absent (graceful "unavailable") and, if keys provided, live.

## Risks / coordination

- **ft/35 overlap**: `chat/route.ts`, `scan/route.ts`, `run/route.ts`, `lib/usage/log.ts`,
  `lib/ai/providers.ts` are touched by both. Keep all #36 edits additive (new optional fields,
  one additive providerOptions key) to minimize merge conflict when ft/36 → ft/35.
- **marketCost availability**: if a BYOK gateway response omits `marketCost`, fall back to
  `getAvailableModels()` pricing × tokens; covered by the engine.
- **xAI management key**: new key required for live xAI reconciliation; reconcile is optional so
  this never blocks the build/ship.
```
