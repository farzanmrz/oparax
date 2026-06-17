# Usage & cost-analytics dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/dashboard/usage` into an admin-gated AWS-style cost explorer with real BYOK dollar costs, a summable user→session→message→tool→call attribution tree, four charts, and a faceted data table.

**Architecture:** Additive telemetry (nullable columns + AsyncLocalStorage request context so deep `logUsage` sites auto-attribute) → a pure cost engine (gateway `marketCost` for gateway calls, token×rate for direct-xAI scan + X API) → server-side aggregation → split client components sharing one filter state. Optional weekly/manual reconciliation against free provider billing APIs.

**Tech stack:** Next.js App Router (TS strict), Supabase (service-role for cross-user reads), AI SDK v6 + Vercel AI Gateway, shadcn/ui (graphite-mapped) + `@tanstack/react-table` + recharts, Biome.

**Verification note (repo has NO test runner — AGENTS.md):** Each task verifies via `pnpm build` (types), `pnpm lint` (Biome), targeted Supabase SQL spot-checks, and a final `browser-agent` pass. Where a pure function needs checking, we assert by querying the DB after backfill / reading rendered numbers — not a unit-test runner.

**ft/35 coordination:** Shared files (`lib/usage/log.ts`, `app/api/agents/chat/route.ts`, `scan/route.ts`, `[id]/run/route.ts`, `lib/chat/tools.ts`, `lib/scan/ui-stream.ts`, `lib/ai/providers.ts`) get **append-only** edits. Keep diffs minimal to ease the eventual ft/36→ft/35 merge.

**Working dir:** all paths are inside the worktree `/Users/farzanm4/Desktop/drive/repos/oparax-chirp-ft36`. Commit after every task.

---

## File structure

**Create**
- `lib/auth/admin.ts` — `isAdmin(email)` single source of truth.
- `lib/usage/types.ts` — shared aggregate/tree/event view types (the contract both tracks build on).
- `lib/usage/pricing.ts` — static rate table (scan/x_verify) + gateway-pricing fallback fetch.
- `lib/usage/cost.ts` — `computeCostUsd(event)` pure engine.
- `lib/usage/context.ts` — `usageContext` AsyncLocalStorage (per-request attribution).
- `lib/usage/aggregate.ts` — KPIs, time series, by-kind/provider/user rollups, attribution tree.
- `lib/usage/format.ts` — PST datetime, currency, token/number formatters.
- `lib/usage/reconcile.ts` — per-provider billing pulls + variance.
- `app/api/usage/reconcile/route.ts` — admin POST that runs reconcile + writes a snapshot.
- `components/usage/usage-dashboard.tsx` — client shell + shared filter state.
- `components/usage/kpi-cards.tsx`
- `components/usage/sync-billing-button.tsx`
- `components/usage/attribution-tree.tsx`
- `components/usage/events-table.tsx`
- `components/usage/charts/cost-over-time.tsx`
- `components/usage/charts/cost-breakdown.tsx` (by-kind, by-provider, by-user — one reusable bar/donut)
- `components/ui/table.tsx`, `components/ui/chart.tsx` (via shadcn CLI)

**Modify**
- `lib/usage/log.ts` — merge `usageContext` store + compute `cost_usd` + accept new fields.
- `lib/scan/ui-stream.ts` — capture scan token usage in `extractMetrics`.
- `app/api/agents/chat/route.ts` — wrap in usage context; capture gateway metadata; tool attribution.
- `app/api/agents/scan/route.ts`, `app/api/agents/[id]/run/route.ts` — `resolved_provider`/`tool_name`.
- `lib/chat/tools.ts` — wrap `verifyHandles`/`validateSites` execute in a tool-call context.
- `lib/sites/validate.ts` — log a free `web_validate` event (quantity only).
- `lib/ai/providers.ts` — additive `sort: 'cost'`.
- `app/dashboard/usage/page.tsx` — full rebuild (server component).
- `app/dashboard/layout.tsx` — compute + pass `isAdmin`.
- `components/dashboard/workspace-shell.tsx` — remove Insights (Soon), add admin-gated Usage link.
- `lib/types/database.ts` — regenerated after migration.

---

## Task 1: DB migrations + regenerated types

**Files:** Supabase project `pcgvpypzfwuchyfwdlwe` (MCP `apply_migration`); Modify `lib/types/database.ts`.

- [ ] **Step 1: Apply the schema migration** (MCP `apply_migration`, name `usage_cost_dashboard_telemetry`):

```sql
alter type usage_provider add value if not exists 'deepinfra';
alter type usage_provider add value if not exists 'deepseek';

alter table api_usage_events
  add column if not exists session_id text,
  add column if not exists message_id text,
  add column if not exists tool_call_id text,
  add column if not exists tool_name text,
  add column if not exists resolved_provider text,
  add column if not exists gateway_generation_id text;

create index if not exists api_usage_events_session_idx on api_usage_events (session_id);
create index if not exists api_usage_events_created_idx on api_usage_events (created_at desc);

create table if not exists usage_reconciliations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  estimated_usd numeric not null default 0,
  provider_usd numeric,
  drift_pct numeric,
  raw jsonb,
  synced_at timestamptz not null default now()
);

alter table usage_reconciliations enable row level security;
create policy "reconciliations service role" on usage_reconciliations
  for all to service_role using (true) with check (true);
```

Note: `alter type ... add value` cannot run inside the same transaction as a use of the new value. `apply_migration` runs each statement fine here because we don't *use* the new enum values in this migration.

- [ ] **Step 2: Regenerate types** (MCP `generate_typescript_types`), write the output over `lib/types/database.ts`. Confirm the new columns + `usage_reconciliations` row/insert types + the two new `usage_provider` enum members appear.

- [ ] **Step 3: Verify** `pnpm build` passes (types compile).

- [ ] **Step 4: Commit**

```bash
git add lib/types/database.ts && git commit -m "feat(usage): additive telemetry columns + reconciliations table"
```

---

## Task 2: `isAdmin` helper

**Files:** Create `lib/auth/admin.ts`; Modify `app/dashboard/usage/page.tsx` (replace inline parse).

- [ ] **Step 1: Write the helper**

```ts
// lib/auth/admin.ts
/** True when email is in the ADMIN_EMAILS allowlist (comma-separated, trimmed, case-insensitive). */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
```

- [ ] **Step 2: Use it in the page guard** — in `app/dashboard/usage/page.tsx`, replace the inline `adminEmails` block with:

```ts
import { isAdmin } from "@/lib/auth/admin";
// ...
if (!isAdmin(user.email)) {
  redirect("/dashboard");
}
```

- [ ] **Step 3: Verify** `pnpm build` + `pnpm lint`.

- [ ] **Step 4: Commit**

```bash
git add lib/auth/admin.ts app/dashboard/usage/page.tsx && git commit -m "feat(usage): centralize isAdmin allowlist check"
```

---

## Task 3: Shared types contract

**Files:** Create `lib/usage/types.ts`. (Both tracks import from here — build this before UI.)

- [ ] **Step 1: Define the shapes**

```ts
// lib/usage/types.ts
import type { Database } from "@/lib/types/database";

export type UsageRow = Database["public"]["Tables"]["api_usage_events"]["Row"];
export type UsageKind = Database["public"]["Enums"]["usage_kind"];

export interface CostQty {
  cost: number;   // USD, summable
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface TreeNode extends CostQty {
  id: string;          // stable key (level-prefixed)
  level: "user" | "session" | "message" | "tool" | "call";
  label: string;
  kind?: UsageKind;    // present at the call level
  children: TreeNode[];
}

export interface Breakdown {
  key: string;         // kind | provider | user label
  cost: number;
  calls: number;
}

export interface TimePoint {
  date: string;        // YYYY-MM-DD (PST day)
  byProvider: Record<string, number>; // provider -> cost
  total: number;
}

export interface ReconRow {
  provider: string;
  estimatedUsd: number;
  providerUsd: number | null;
  driftPct: number | null;
  syncedAt: string;
}

export interface UsageAggregate {
  totals: CostQty & { topDriver: { kind: UsageKind | null; cost: number; pct: number } };
  prevTotalCost: number;             // previous equal-length window, for Δ
  timeSeries: TimePoint[];
  byKind: Breakdown[];
  byProvider: Breakdown[];
  byUser: Breakdown[];
  tree: TreeNode[];                  // roots = users
  events: EventView[];               // flat leaf rows for the table
  reconciliations: ReconRow[];
}

export interface EventView {
  id: string;
  createdAt: string;                 // ISO
  kind: UsageKind;
  provider: string;                  // resolved_provider ?? provider
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number;
  userId: string | null;
  sessionId: string | null;
  toolName: string | null;
}
```

- [ ] **Step 2: Verify** `pnpm build`.
- [ ] **Step 3: Commit** `git add lib/usage/types.ts && git commit -m "feat(usage): shared aggregate/tree/event types"`

---

## Task 4: Pricing table

**Files:** Create `lib/usage/pricing.ts`.

- [ ] **Step 1: Write the rates** (gateway path uses live `marketCost`, so this only covers direct-xAI scan + X API + free internal):

```ts
// lib/usage/pricing.ts
// Per-token USD rates for models that bypass the gateway (direct xAI scan).
// Gateway calls (chat/draft/redraft) use providerMetadata.gateway.marketCost instead.
export const MODEL_RATES: Record<string, { input: number; output: number }> = {
  // grok-4.3 (direct xai.responses): $1.25/1M in, $2.50/1M out
  "grok-4.3": { input: 1.25 / 1_000_000, output: 2.5 / 1_000_000 },
};

// xAI x_search server-side tool: $5.00 / 1000 calls.
export const X_SEARCH_USD = 0.005;

// X API user-lookup (handle verification), pay-per-use, per checked handle.
export const X_VERIFY_USD = 0.01;

/** Look up per-token rates for a model id; null if unknown (gateway-priced). */
export function modelRate(model: string | null): { input: number; output: number } | null {
  if (!model) return null;
  return MODEL_RATES[model] ?? null;
}
```

- [ ] **Step 2: Verify** `pnpm build`. **Step 3: Commit** `git commit -am "feat(usage): BYOK rate table"`

---

## Task 5: Cost engine

**Files:** Create `lib/usage/cost.ts`.

- [ ] **Step 1: Write the pure engine.** Input is the data we have at log time; it returns USD.

```ts
// lib/usage/cost.ts
import { modelRate, X_SEARCH_USD, X_VERIFY_USD } from "@/lib/usage/pricing";

export interface CostInput {
  kind: string;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Gateway market-rate cost for this call, if the gateway reported it (BYOK estimate). */
  gatewayMarketCost: number | null;
  /** xSearch tool invocations (scan only). */
  xSearchCalls: number | null;
  /** Quantity for x_verify (handles checked). */
  verifyCount: number | null;
}

/** Resolve a USD cost for one leaf event. Pure + total — never throws, never null. */
export function computeCostUsd(input: CostInput): number {
  // 1) Gateway calls: trust the gateway's market-rate estimate when present.
  if (input.gatewayMarketCost != null && input.gatewayMarketCost > 0) {
    return round6(input.gatewayMarketCost);
  }
  // 2) X API verification: per-handle flat rate.
  if (input.kind === "x_verify") {
    return round6((input.verifyCount ?? 0) * X_VERIFY_USD);
  }
  // 3) web_validate + anything internal: free.
  if (input.kind === "web_validate") return 0;
  // 4) Token-priced models (direct-xAI scan, or gateway fallback when marketCost absent).
  const rate = modelRate(input.model);
  const tokenCost = rate
    ? (input.inputTokens ?? 0) * rate.input + (input.outputTokens ?? 0) * rate.output
    : 0;
  const searchCost = (input.xSearchCalls ?? 0) * X_SEARCH_USD;
  return round6(tokenCost + searchCost);
}

function round6(n: number): number {
  return Number(n.toFixed(6));
}
```

- [ ] **Step 2: Verify** `pnpm build`. **Step 3: Commit** `git commit -am "feat(usage): pure cost engine"`

---

## Task 6: Request attribution context + log.ts upgrade

**Files:** Create `lib/usage/context.ts`; Modify `lib/usage/log.ts`.

- [ ] **Step 1: Write the AsyncLocalStorage context**

```ts
// lib/usage/context.ts
import { AsyncLocalStorage } from "node:async_hooks";

export interface UsageContext {
  userId?: string | null;
  sessionId?: string | null;
  messageId?: string | null;
  toolCallId?: string | null;
  toolName?: string | null;
}

const storage = new AsyncLocalStorage<UsageContext>();

/** Run `fn` with an attribution context that logUsage() will auto-merge. */
export function withUsageContext<T>(ctx: UsageContext, fn: () => T): T {
  return storage.run({ ...currentUsageContext(), ...ctx }, fn);
}

export function currentUsageContext(): UsageContext {
  return storage.getStore() ?? {};
}
```

- [ ] **Step 2: Upgrade `logUsage`** to merge the context, compute cost, and accept new fields. Replace `lib/usage/log.ts` with:

```ts
// lib/usage/log.ts
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/types/database";
import { computeCostUsd } from "@/lib/usage/cost";
import { currentUsageContext } from "@/lib/usage/context";

type Insert = Database["public"]["Tables"]["api_usage_events"]["Insert"];
type UsageEvent = Omit<Insert, "id" | "created_at" | "cost_usd"> & {
  /** Pre-computed cost (e.g. scan/x_verify already know theirs); else the engine fills it. */
  cost_usd?: number | null;
  /** Gateway market-rate cost from providerMetadata.gateway.marketCost (BYOK estimate). */
  gatewayMarketCost?: number | null;
  /** xSearch count (scan) for the cost engine. */
  xSearchCalls?: number | null;
  /** handles checked (x_verify) for the cost engine. */
  verifyCount?: number | null;
};

/**
 * Record one model/API call's cost + usage. Merges the per-request attribution
 * context (user/session/message/tool ids), computes cost_usd if not provided,
 * and never throws (telemetry must not break a flow).
 */
export async function logUsage(event: UsageEvent): Promise<void> {
  try {
    const ctx = currentUsageContext();
    const { gatewayMarketCost, xSearchCalls, verifyCount, cost_usd, ...rest } = event;

    const cost =
      cost_usd ??
      computeCostUsd({
        kind: rest.kind,
        model: rest.model ?? null,
        inputTokens: rest.input_tokens ?? null,
        outputTokens: rest.output_tokens ?? null,
        gatewayMarketCost: gatewayMarketCost ?? null,
        xSearchCalls: xSearchCalls ?? null,
        verifyCount: verifyCount ?? null,
      });

    const row: Insert = {
      ...rest,
      user_id: rest.user_id ?? ctx.userId ?? null,
      session_id: rest.session_id ?? ctx.sessionId ?? null,
      message_id: rest.message_id ?? ctx.messageId ?? null,
      tool_call_id: rest.tool_call_id ?? ctx.toolCallId ?? null,
      tool_name: rest.tool_name ?? ctx.toolName ?? null,
      cost_usd: cost,
    };
    await createServiceRoleClient().from("api_usage_events").insert(row);
  } catch (error) {
    console.error("logUsage failed", error);
  }
}
```

- [ ] **Step 3: Verify** `pnpm build` (existing call sites still typecheck — all new fields optional). `pnpm lint`.
- [ ] **Step 4: Commit** `git add lib/usage/context.ts lib/usage/log.ts && git commit -m "feat(usage): request attribution context + cost-on-log"`

---

## Task 7: Capture scan tokens

**Files:** Modify `lib/scan/ui-stream.ts` (`extractMetrics`) and `lib/scan/types.ts` (ScanMetrics).

- [ ] **Step 1: Add token fields to `ScanMetrics`** in `lib/scan/types.ts` (append optional fields):

```ts
// add to ScanMetrics interface:
  inputTokens?: number | null;
  outputTokens?: number | null;
```

- [ ] **Step 2: Capture usage in `extractMetrics`** — after the existing `steps` computation, read `result.usage` (AI SDK exposes total token usage even when providerMetadata is absent):

```ts
const usage = await result.usage;
// ...in the return object add:
  inputTokens: usage?.inputTokens ?? null,
  outputTokens: usage?.outputTokens ?? null,
```

- [ ] **Step 3: Verify** `pnpm build`. If `result.usage` field names differ in the installed SDK, confirm via hover/LSP on `result.usage` and adjust (`inputTokens`/`promptTokens`).
- [ ] **Step 4: Commit** `git commit -am "feat(usage): capture scan token usage"`

---

## Task 8: Wire chat route attribution + gateway metadata

**Files:** Modify `app/api/agents/chat/route.ts`.

- [ ] **Step 1: Wrap the handler body in the usage context.** Just after the `messages` validation and `user`/`connection` guards, read the session id and wrap the rest:

```ts
import { withUsageContext } from "@/lib/usage/context";
// session id: AI SDK useChat sends the chat id in the body; fall back to a per-request id.
const sessionId = typeof body.id === "string" ? body.id : null;
const messageId = typeof body.messageId === "string" ? body.messageId : null;
```

Wrap from `convertToModelMessages` through `return result.toUIMessageStreamResponse()` inside:

```ts
return withUsageContext({ userId: user.id, sessionId, messageId }, async () => {
  // ...existing modelMessages + runScan + streamText + return...
});
```

(The streaming continues to run within the ALS context because `withUsageContext` wraps the synchronous setup and the returned stream promise.)

- [ ] **Step 2: Set scan tool attribution.** In `runScan.execute`, take the 2nd arg for `toolCallId` and pass attribution + cost inputs into its `logUsage`:

```ts
execute: async (input, { toolCallId }) => {
  // ...existing...
  await logUsage({
    kind: "scan",
    provider: "xai",
    resolved_provider: "xai",
    model: SCAN_MODEL,
    user_id: user.id,
    tool_call_id: toolCallId,
    tool_name: "scan",
    input_tokens: metrics.inputTokens ?? null,
    output_tokens: metrics.outputTokens ?? null,
    xSearchCalls: metrics.xSearchCalls,           // engine computes cost
    metadata: { elapsedMs: metrics.elapsedMs, xSearchCalls: metrics.xSearchCalls, storyCount: stories.length, triggeredFrom: "chat" },
  });
  // ...
}
```

(Drop the old `cost_usd: metrics.costUsd` — it was always null; the engine now computes from tokens + xSearchCalls.)

- [ ] **Step 3: Capture gateway metadata in `onFinish`.** Replace the chat `logUsage` with:

```ts
onFinish: async (event) => {
  try {
    const { inputTokens, outputTokens } = event.totalUsage;
    const gw = (event.providerMetadata?.gateway ?? {}) as Record<string, unknown>;
    const routing = (gw.routing ?? {}) as Record<string, unknown>;
    const resolved = (routing.finalProvider ?? routing.resolvedProvider) as string | undefined;
    const marketCost = gw.marketCost != null ? Number(gw.marketCost) : null;
    await logUsage({
      kind: "chat",
      provider: "gateway",
      resolved_provider: resolved ?? null,
      model: CHAT_MODEL,
      user_id: user.id,
      input_tokens: inputTokens ?? null,
      output_tokens: outputTokens ?? null,
      gatewayMarketCost: marketCost,
      gateway_generation_id: typeof gw.generationId === "string" ? gw.generationId : null,
    });
  } catch (err) {
    console.error("logUsage (chat) failed", err);
  }
},
```

- [ ] **Step 4: Verify** `pnpm build` + `pnpm lint`. Confirm `event.providerMetadata` exists on the onFinish event type via LSP hover; if the gateway nests differently, adjust the field reads (keep them defensive/optional).
- [ ] **Step 5: Commit** `git commit -am "feat(usage): attribute chat + scan calls, capture gateway market cost"`

---

## Task 9: Wire scan route, run route, tools, validate

**Files:** Modify `app/api/agents/scan/route.ts`, `app/api/agents/[id]/run/route.ts`, `lib/chat/tools.ts`, `lib/sites/validate.ts`.

- [ ] **Step 1: scan route** — in the `onFinish` `logUsage`, add `resolved_provider: "xai"`, `tool_name: "scan"`, pass `input_tokens`/`output_tokens` from metrics and `xSearchCalls: metrics.xSearchCalls`; drop `cost_usd: metrics.costUsd`.

- [ ] **Step 2: run route** — same additions to its `logUsage` (`resolved_provider: "xai"`, `tool_name: "scan"`, tokens, `xSearchCalls`). Keep existing `agent_id`/`run_id`.

- [ ] **Step 3: tool-call context for verify/validate** — in `lib/chat/tools.ts`, wrap the two server tools so their downstream `logUsage` picks up the tool ids:

```ts
import { withUsageContext } from "@/lib/usage/context";

const verifyHandlesTool = tool({
  description: "...",
  inputSchema: z.object({ handles: z.array(z.string()) }),
  execute: async (input, { toolCallId }) =>
    withUsageContext({ toolCallId, toolName: "verifyHandles" }, () => verifyHandles(input.handles)),
});

const validateSitesTool = tool({
  description: "...",
  inputSchema: z.object({ domains: z.array(z.string()) }),
  execute: async (input, { toolCallId }) =>
    withUsageContext({ toolCallId, toolName: "validateSites" }, async () => {
      const results = await validateSites(input.domains);
      const { logUsage } = await import("@/lib/usage/log");
      await logUsage({ kind: "web_validate", provider: "internal", tool_name: "validateSites", metadata: { checked: input.domains.length } });
      return results;
    }),
});
```

(`verifyHandles` already calls `logUsage` internally; the context now supplies user/session/tool ids. Pass `verifyCount` there — Step 4.)

- [ ] **Step 4: verify.ts cost input** — in `lib/x/verify.ts`, change its existing `logUsage` to let the engine price it and attribute via context:

```ts
logUsage({
  kind: "x_verify",
  provider: "x_api",
  tool_name: "verifyHandles",
  verifyCount: cacheMisses.length,             // engine: count * $0.01
  metadata: { checked: cacheMisses.length },
}),
```

(Drop the hardcoded `cost_usd: 0.01 * cacheMisses.length`; `verifyCount` produces the same number via `X_VERIFY_USD` and keeps one source of truth.)

- [ ] **Step 5: Verify** `pnpm build` + `pnpm lint`.
- [ ] **Step 6: Commit** `git commit -am "feat(usage): attribute scan/run/x_verify/web_validate tool calls"`

---

## Task 10: Provider cost-ordering

**Files:** Modify `lib/ai/providers.ts`.

- [ ] **Step 1: Add `sort: 'cost'`** to the gateway options (additive):

```ts
export const GATEWAY_PROVIDER_OPTIONS = {
  gateway: {
    models: ["xai/grok-4.3"],
    sort: "cost", // prefer the cheapest BYOK provider for the requested model
  },
};
```

- [ ] **Step 2: Verify** `pnpm build`. **Step 3: Commit** `git commit -am "feat(ai): order gateway providers by cost"`

---

## Task 11: Backfill historical cost_usd

**Files:** Supabase SQL (MCP `execute_sql`). One-off, idempotent.

- [ ] **Step 1: Backfill** the 54 existing NULL-cost rows from tokens/metadata (historical gateway rows have no captured marketCost, so price chat/draft/redraft via a conservative deepseek-v4-flash rate; scan via xSearch; x_verify via metadata.checked):

```sql
-- chat/draft/redraft (deepseek-v4-flash) — approx BYOK rate $0.27/1M in, $0.27/1M out
update api_usage_events set cost_usd = round(
  (coalesce(input_tokens,0) * 0.27 / 1000000 + coalesce(output_tokens,0) * 0.27 / 1000000)::numeric, 6)
where cost_usd is null and kind in ('chat','draft','redraft');

-- scan: xSearch calls * $0.005 (+ tokens when present at grok rate)
update api_usage_events set cost_usd = round(
  (coalesce((metadata->>'xSearchCalls')::int,0) * 0.005
   + coalesce(input_tokens,0) * 1.25/1000000 + coalesce(output_tokens,0) * 2.5/1000000)::numeric, 6)
where cost_usd is null and kind = 'scan';

-- x_verify: checked * $0.01
update api_usage_events set cost_usd = round(
  (coalesce((metadata->>'checked')::int,0) * 0.01)::numeric, 6)
where cost_usd is null and kind = 'x_verify';

update api_usage_events set cost_usd = 0 where cost_usd is null;
```

- [ ] **Step 2: Verify** (MCP `execute_sql`): `select count(*) filter (where cost_usd is null) as nulls, round(sum(cost_usd),4) as total from api_usage_events;` → expect `nulls = 0`, a small positive `total`.
- [ ] **Step 3: Commit** (doc the backfill) `git commit --allow-empty -m "chore(usage): backfill historical cost_usd"`

---

## Task 12: Aggregation + formatters

**Files:** Create `lib/usage/aggregate.ts`, `lib/usage/format.ts`.

- [ ] **Step 1: Formatters** (`lib/usage/format.ts`):

```ts
const PST = "America/Los_Angeles";
const dt = new Intl.DateTimeFormat("en-US", { timeZone: PST, month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
/** "MM/DD HH:MM:SS" in PST. */
export function pstStamp(iso: string): string {
  const p = Object.fromEntries(dt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.month}/${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
/** PST calendar day YYYY-MM-DD for bucketing. */
export function pstDay(iso: string): string {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: PST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  return d; // en-CA yields YYYY-MM-DD
}
export function usd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}
export function compactTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
```

- [ ] **Step 2: Aggregator** (`lib/usage/aggregate.ts`) — pure function `aggregate(rows, prevRows, recon, rangeDays)` returning `UsageAggregate`. Build:
  - `events`: map each row → `EventView` (`provider = resolved_provider ?? provider`, `cost = Number(cost_usd ?? 0)`).
  - `totals`: sum cost/calls/tokens; `topDriver` = max byKind.
  - `byKind` / `byProvider` / `byUser`: group + sum cost & calls (user label = userId short).
  - `timeSeries`: bucket by `pstDay`, per-provider cost map + total.
  - `tree`: group rows user→session→message→tool→call; each node sums `CostQty` of its descendants; `call` leaves carry `kind`. Use `session_id`/`message_id`/`tool_call_id`/`tool_name`; nulls fall into an "(unattributed)" bucket so totals always reconcile.
  - `reconciliations`: map `recon` rows → `ReconRow`.

```ts
// signature
export function aggregate(rows: UsageRow[], prevRows: UsageRow[], recon: ReconRow[]): UsageAggregate;
```

  Implement with plain `Map` grouping (no deps). Each grouping level builds children then rolls `CostQty` up via a shared `addCost(acc, row)` helper. Keep the function under ~150 lines; if longer, split helpers into the same file.

- [ ] **Step 3: Verify** `pnpm build` + `pnpm lint`.
- [ ] **Step 4: Commit** `git add lib/usage/format.ts lib/usage/aggregate.ts && git commit -m "feat(usage): PST formatters + server-side aggregation"`

---

## Task 13: Reconciliation lib + admin route

**Files:** Create `lib/usage/reconcile.ts`, `app/api/usage/reconcile/route.ts`.

- [ ] **Step 1: Reconcile lib** — one async fn per provider, each guarded by its env key, returning `{ provider, providerUsd } | null`. Concrete endpoints:
  - xAI: `POST https://management-api.x.ai/v1/billing/teams/{team}/usage` with `Authorization: Bearer ${XAI_MANAGEMENT_KEY}`, body `{ timeRange, timeUnit: "TIME_UNIT_DAY", values:[{name:"usd",aggregation:"AGGREGATION_SUM"}] }`; sum `timeSeries[].dataPoints[].values`. (Team id: read from a `getTeams` call or env `XAI_TEAM_ID`; if absent, skip with a logged note.)
  - DeepInfra: `GET https://api.deepinfra.com/v1/me/...` usage — `GET /payment/usage/tokens?from=YYYY.MM` with header `Authorization: Bearer ${DEEPINFRA_API_KEY}`; sum `months[].total_cost` (cents → USD).
  - DeepSeek: `GET https://api.deepseek.com/user/balance` with `Authorization: Bearer ${DEEPSEEK_API_KEY}`; record `total_balance` and compute spend as a balance delta vs the previous snapshot (store balance in `raw`).
  - Each call is wrapped in try/catch → returns null on failure (reconcile is best-effort).

```ts
// lib/usage/reconcile.ts
export interface ProviderSpend { provider: string; providerUsd: number | null; raw: unknown; }
export async function reconcileProviders(periodStart: Date, periodEnd: Date): Promise<ProviderSpend[]>;
```

- [ ] **Step 2: Admin route** (`app/api/usage/reconcile/route.ts`, `runtime = "nodejs"`):
  - Auth: `createClient().auth.getUser()`; `isAdmin(user.email)` else 403.
  - Compute our estimate per provider over the period (service-role sum of `cost_usd` grouped by `resolved_provider ?? provider`).
  - Call `reconcileProviders`; for each provider insert a `usage_reconciliations` row (`estimated_usd`, `provider_usd`, `drift_pct = providerUsd ? (estimated-provider)/provider*100 : null`, `raw`).
  - Return `{ ok: true, rows }`. Never expose secrets.

- [ ] **Step 3: Verify** `pnpm build` + `pnpm lint`. With keys present, `curl -XPOST` the route while signed in is a manual check (deferred to Phase 4 browser pass via the Sync button).
- [ ] **Step 4: Commit** `git add lib/usage/reconcile.ts app/api/usage/reconcile && git commit -m "feat(usage): provider billing reconciliation (optional, key-gated)"`

---

## Task 14: UI deps

**Files:** `components/ui/table.tsx`, `components/ui/chart.tsx`, `package.json`.

- [ ] **Step 1: Add shadcn primitives** (CLI, matches existing graphite theme):

```bash
pnpm dlx shadcn@latest add table chart --yes
pnpm add @tanstack/react-table recharts
```

- [ ] **Step 2: Verify** `pnpm build`. **Step 3: Commit** `git add -A && git commit -m "chore(usage): add table + chart primitives and deps"`

---

## Task 15: KPI cards + Sync button

**Files:** Create `components/usage/kpi-cards.tsx`, `components/usage/sync-billing-button.tsx`.

- [ ] **Step 1:** `kpi-cards.tsx` — client component taking `totals`, `prevTotalCost`, top `ReconRow` drift. Render four cards (total cost +Δ, calls, tokens, top driver) using the graphite `ws-` classes / shadcn `Card`. Use `usd`, `compactTokens`. Δ = `(cost - prev)/prev`.
- [ ] **Step 2:** `sync-billing-button.tsx` — client button POSTing `/api/usage/reconcile`, showing a spinner + on success `router.refresh()`; render the latest `drift_pct` as a badge (`success` < 5%, `warning` else; "reconcile unavailable" when no rows).
- [ ] **Step 3: Verify** `pnpm build` + `pnpm lint`. **Step 4: Commit** `git commit -am "feat(usage): KPI cards + sync billing button"`

---

## Task 16: Charts

**Files:** Create `components/usage/charts/cost-over-time.tsx`, `components/usage/charts/cost-breakdown.tsx`.

- [ ] **Step 1:** `cost-over-time.tsx` — recharts stacked `AreaChart` over `TimePoint[]`, one stack per provider, a kind/provider toggle. Use shadcn `ChartContainer`/`ChartTooltip`. Hardcode hex per provider (canvas can't read CSS vars): xai `#534AB7`, deepinfra `#1D9E75`, deepseek `#378ADD`, x_api `#888780`, gateway `#BA7517`.
- [ ] **Step 2:** `cost-breakdown.tsx` — reusable component `<CostBreakdown title data={Breakdown[]} variant="donut"|"bar" />`. Render by-kind (donut), by-provider (donut), by-user (horizontal bar) by passing the three aggregate arrays. Accept an `onSelect(key)` to push a focus filter.
- [ ] **Step 3: Verify** `pnpm build` + `pnpm lint`. **Step 4: Commit** `git commit -am "feat(usage): cost-over-time + breakdown charts"`

---

## Task 17: Attribution tree

**Files:** Create `components/usage/attribution-tree.tsx`.

- [ ] **Step 1:** Client component over `TreeNode[]`. Recursive `<Row>` with `shadcn` `Collapsible`: indent by depth, chevron when `children.length`, columns calls/tokens/cost (right-aligned, `usd`/`compactTokens`). Expanded state in a `Set<string>` of node ids. Clicking a node calls `onFocus(node)` (re-roots the page). A small breadcrumb shows the focused path with a "clear" action.
- [ ] **Step 2:** Sorting: children sorted by `cost` desc so the biggest spender is on top.
- [ ] **Step 3: Verify** `pnpm build` + `pnpm lint`. **Step 4: Commit** `git commit -am "feat(usage): expandable cost-attribution tree with focus"`

---

## Task 18: Events data table

**Files:** Create `components/usage/events-table.tsx`.

- [ ] **Step 1:** TanStack `useReactTable` over `EventView[]` with: columns time (`pstStamp`, default sort desc), kind (badge), provider, model, tokens (`in/out`), cost (`usd`). `getSortedRowModel` + `getFilteredRowModel` + `getPaginationRowModel`. Toolbar: a search `Input` (global filter over model/provider/user), and `Select` facets for kind + provider. Respect the shared `focus` filter (subset to the focused node's user/session) and breakdown `onSelect` (filter to a kind/provider).
- [ ] **Step 2:** Use shadcn `Table`, `Input`, `Select`, `Badge`, `Button` (pagination). Render PST timestamps.
- [ ] **Step 3: Verify** `pnpm build` + `pnpm lint`. **Step 4: Commit** `git commit -am "feat(usage): faceted sortable searchable events table"`

---

## Task 19: Dashboard shell + page rebuild

**Files:** Create `components/usage/usage-dashboard.tsx`; Modify `app/dashboard/usage/page.tsx`.

- [ ] **Step 1:** `usage-dashboard.tsx` (client) takes `UsageAggregate` + the current range. Holds shared filter state: `range` (drives a server re-fetch via `router.push(?range=)`), `focus: TreeNode | null`, `facet: {kind?, provider?}`. Lays out: controls row (range segmented control + `SyncBillingButton`), `KpiCards`, `CostOverTime`, the three `CostBreakdown`s, `AttributionTree`, `EventsTable`. Passes `focus`/`facet` setters down; charts+table+tree read them. Client-side re-rooting filters the already-loaded `events`/`tree` (no refetch needed for focus).
- [ ] **Step 2:** Rebuild `app/dashboard/usage/page.tsx` (server): keep `isAdmin` guard; parse `?range` (24h/7d/30d/custom → `sinceISO`); service-role select events for the window AND the previous equal window AND latest `usage_reconciliations`; call `aggregate(...)`; render `<UsageDashboard aggregate={...} range={...} />` inside the existing `WorkspacePageHeader`. Remove the old aggregate/table code.
- [ ] **Step 3: Verify** `pnpm build` + `pnpm lint`.
- [ ] **Step 4: Commit** `git add components/usage/usage-dashboard.tsx app/dashboard/usage/page.tsx && git commit -m "feat(usage): assemble cost-explorer dashboard page"`

---

## Task 20: Sidebar (admin-gated Usage, remove Insights)

**Files:** Modify `app/dashboard/layout.tsx`, `components/dashboard/workspace-shell.tsx`; add a `UsageIcon` to `components/dashboard/shell-icons.tsx` (or reuse a chart glyph).

- [ ] **Step 1:** In `app/dashboard/layout.tsx`, compute `const admin = isAdmin(user.email);` and pass `isAdmin={admin}` into `<WorkspaceShell>`.
- [ ] **Step 2:** In `workspace-shell.tsx`, add `isAdmin: boolean` to props. Remove the `nav-soon`/Insights `<span>`. Add (only when `isAdmin`) a `Usage` `<Link href="/dashboard/usage">` with `data-active` on `pathname.startsWith("/dashboard/usage")`, using a chart icon.
- [ ] **Step 3: Verify** `pnpm build` + `pnpm lint`.
- [ ] **Step 4: Commit** `git add app/dashboard/layout.tsx components/dashboard/workspace-shell.tsx components/dashboard/shell-icons.tsx && git commit -m "feat(usage): admin-gated Usage nav, remove Insights placeholder"`

---

## Task 21: Final verification (Phase 4 entry)

**Files:** none (verification only).

- [ ] **Step 1:** Copy env for local run: `cp /Users/farzanm4/Desktop/drive/repos/oparax-chirp/.env.local /Users/farzanm4/Desktop/drive/repos/oparax-chirp-ft36/.env.local` (gitignored; never committed).
- [ ] **Step 2:** `pnpm build` green; `pnpm lint` clean.
- [ ] **Step 3:** `pnpm dev` + `browser-agent` as `testuser@oparax.com`: `/dashboard/usage` renders non-NULL costs in KPI cards; tree expands and sums; clicking a node re-roots charts+table; table filters/sorts/searches; PST timestamps; Sync billing runs (or shows "unavailable"); sidebar shows Usage and no Insights. Then sign in as a non-admin (or temporarily drop the email from ADMIN_EMAILS) → confirm the nav hides and `/dashboard/usage` redirects to `/dashboard`.
- [ ] **Step 4:** Supabase spot-check: `select count(*) filter (where cost_usd is null) from api_usage_events;` → 0.

---

## Self-review (done while writing)

- **Spec coverage:** sidebar (T20), summary cards (T15), 4 charts (T16), faceted table (T18), attribution tree + click-to-focus (T17/T19), additive telemetry (T1/T6/T8/T9), cost engine + marketCost/resolvedProvider (T4/T8), reconcile + secrets (T13), providers sort:cost (T10), backfill (T11), PST timestamps (T12), admin-only visibility + redirect (T2/T20). Activity timeline intentionally absent (dropped in design).
- **Placeholders:** none — code given for all logic tasks; UI tasks specify exact components/props/columns.
- **Type consistency:** `UsageAggregate`/`TreeNode`/`EventView`/`Breakdown`/`TimePoint`/`ReconRow` defined once in T3 and consumed unchanged; `computeCostUsd(CostInput)` signature matches its caller in `logUsage`; `withUsageContext`/`currentUsageContext` names consistent across T6/T8/T9.
- **Risk:** AI SDK field names (`event.providerMetadata`, `result.usage.inputTokens`) verified at build time via LSP in T7/T8 with documented fallbacks.
