# Issue #37 — Full Reporter Lifecycle Implementation Plan (parallelism-layered)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the chat-first agent stack X-optional and make every run reach a terminal state independent of the client, then add a Drafts worklist (Stage A+B), scheduled/autonomous cron (Stage C), and protected monitoring (Stage D), staged under #37.

**Architecture:** Two pure run primitives — `runScanStream` (extended with timeout/abort) and a new `persistRunResult` — composed by three consumers (manual route, cron route, prompt-lab). Completion is server-driven via `result.consumeStream()` so a closed tab never orphans a run. The details page becomes a 3-tab shell (`DraftsPanel`/`SchedulePanel`/`SourcesPanel`) so parallel tracks own disjoint files. Service-role cron is hand-scoped; an owner-explicit `postRunItem` re-asserts ownership.

**Tech Stack:** Next.js App Router (TS strict), AI SDK v6 (`6.0.206`, `consumeStream` confirmed), `@ai-sdk/xai` direct provider for scans, Supabase (Postgres + RLS, MCP migrations on project `pcgvpypzfwuchyfwdlwe`), Biome, pnpm. No test runner — verify via `pnpm build`, `pnpm exec tsx` assertion scripts for pure functions, `curl` for routes, and browser-agent checklists for UI.

---

## How to read this plan (the parallelism model)

This plan is written for the `/feature` **parallel subagent execution model**: work is partitioned into **file-owned tracks** that run concurrently in isolated worktrees and converge back. To make that safe:

- **Task 0 (Contracts) runs first and alone.** It pins every cross-track signature (`persistRunResult`, `postRunItem`, `nextRunAt`, `buildXConnectionContext`, the cron due-predicate, the panel component props) by landing the type/stub files. After Task 0 merges, downstream tracks code against frozen interfaces and never block on each other.
- **Each task names its Files block with `(OWNER: <track>)`.** Two tracks never edit the same file. Where the spec foresaw a collision (the details page), Task 0 splits it into per-tab panel files so B and C edit disjoint files.
- **A "two tracks would touch this" flag** appears wherever a file is genuinely shared; the de-confliction is always "Task 0 created the seam; each track edits only its own panel/section."

### Track ownership map (who owns which files)

| Track | Owns (exclusive write) | Depends on |
|---|---|---|
| **T0 Contracts** | new stub files + type extensions (`lib/scan/persist.ts`, `lib/x/post-item.ts`, `lib/schedule/next-run.ts`, `lib/chat/x-context.ts`, `lib/cron/due.ts`, `DraftsPanel.tsx`/`SchedulePanel.tsx`/`SourcesPanel.tsx`, `lib/types/database.ts` regen) | — |
| **T-engine** | `lib/scan/run.ts`, `lib/scan/persist.ts`, `lib/scan/ui-stream.ts`, `lib/x/tokens.ts`, `lib/x/post-item.ts`, `lib/cron/reaper.ts` | T0 |
| **T-routes** | `app/api/agents/[id]/run/route.ts`, `app/api/agents/scan/route.ts`, `app/api/agents/run-items/[id]/post|redraft/route.ts`, `app/api/agents/save-agent/route.ts`, `app/api/x/disconnect/route.ts`, `app/api/cron/scan/route.ts` | T0, T-engine |
| **T-detail-ui** | `components/agents/agent-detail.tsx`, `DraftsPanel.tsx`, `SchedulePanel.tsx`, `SourcesPanel.tsx`, `story-card.tsx`, `app/dashboard/agents/[id]/page.tsx` | T0 |
| **T-gate-ui** | `app/dashboard/connect-x/page.tsx`, `app/dashboard/agents/page.tsx`, `app/globals.css` | T0 (connect-bar tokens) |
| **T-chat-cleanup** | `lib/chat/x-context.ts`, `lib/chat/session-log.ts`, `lib/chat/discover.ts`, `lib/usage/log.ts`, `app/api/agents/chat/route.ts`, `app/api/agents/chat-debug/route.ts`, `app/dashboard/agents/new/page.tsx` | T0 |
| **T-schema** | Supabase migrations + `lib/types/database.ts` (regen) — folded into T0 per stage | — |
| **T-cost** (C/D) | `lib/usage/cost.ts`, `lib/usage/pricing.ts`, `lib/draft/generate.ts`, `app/dashboard/usage/page.tsx` | T0 |

### Concurrency DAG

```
Stage A+B:
  T0 (contracts + A-schema migration + regen)         [serial, alone]
        │
        ├── T-engine ──────────────┐
        ├── T-gate-ui ─────────────┤  (all concurrent — disjoint files)
        ├── T-chat-cleanup ────────┤
        └── T-detail-ui (shell) ───┤
                                   │
        T-routes (needs persistRunResult + postRunItem from T-engine) ─┐
        T-detail-ui (DraftsPanel fill, needs page.tsx query) ──────────┤  concurrent
                                                                        │
                                          converge → QC → squash to dev

Stage C: T0-C (C-schema + nextRunAt/due stubs) → {T-engine-C, T-routes-C(cron), T-detail-ui-C(SchedulePanel), T-cost-C} → converge
Stage D: T0-D (D-schema) → {T-engine-D(protected reads), T-routes-D, T-detail-ui-D(toggle), T-cost-D(x_timeline)} → converge
```

---

## File Structure (Stage A+B — full detail)

**Created:**
- `lib/scan/persist.ts` — `persistRunResult(...)`: the single run-finalization body (build `run_items`, terminal `runs` update, `logUsage`). Source-agnostic. Holds the `// future: notify(...)` seam comment.
- `lib/x/post-item.ts` — `postRunItem(...)`: owner-explicit shared poster (load item → run → agent → assert ownership → `getFreshAccessToken` → `postTweet` → update). Callable by route (RLS client) and later cron (service-role client).
- `lib/chat/x-context.ts` — `buildXConnectionContext(client, userId)`: dedupes the `x_connections` + `getFreshAccessToken` block from `chat/route.ts` and `chat-debug/route.ts` (cleanup D1).
- `lib/cron/reaper.ts` — `reapStaleRuns(serviceClient, maxAgeMs)`: force-fail runs stuck `running` past the threshold. Stubbed in T0, filled in T-engine; used by cron in Stage C but lands in A so the manual route benefits too.
- `components/agents/panels/DraftsPanel.tsx` — Drafts worklist tab (B fills).
- `components/agents/panels/SchedulePanel.tsx` — Schedule & autonomy tab (C fills; A ships a placeholder).
- `components/agents/panels/SourcesPanel.tsx` — wraps the existing `ConfigForm` + Save settings button (A fills by moving the settings tab body here).

**Modified:**
- `lib/scan/run.ts:48-71` — add `timeout`, `abortSignal`, `onAbort` to the `streamText` call.
- `lib/scan/ui-stream.ts` — no functional change in A; `scanToUIResponse`/`extractMetrics`/`storiesFromOutput` reused by `persist.ts`.
- `lib/x/tokens.ts:144` — add `AbortSignal.timeout(8000)` to the `rotateAccessToken` fetch.
- `app/api/agents/[id]/run/route.ts` — thin streaming wrapper: drop the `inactive→409` block (`74-78`); `consumeStream({ onError })` + `onFinish → persistRunResult`.
- `app/api/agents/scan/route.ts:30-41` — remove the un-named `403 "Connect X..."`.
- `app/api/agents/run-items/[id]/post/route.ts` — delegate to `postRunItem`.
- `app/api/agents/save-agent/route.ts:92-108` — remove the `if (!connection) → 403`.
- `app/api/x/disconnect/route.ts:79-95` — stop marking agents `inactive`; set `auto_post=false`, return a warning count.
- `components/agents/agent-detail.tsx` — rewrite into the 3-tab shell delegating to the three panels; drop `xConnected` Run gate (`308`, `320-330`); replace inline `$${cost_usd.toFixed(4)}` (`363`) with `usd()` (cleanup A6).
- `components/agents/story-card.tsx` — per-item terminal state (posted link+timestamp / failed error / auto badge).
- `app/dashboard/agents/[id]/page.tsx` — fetch recent runs (~20) with `Promise.all` (cleanup D4); pass to `DraftsPanel`.
- `app/dashboard/agents/page.tsx` — new-drafts badge per row; reporter status labels.
- `app/dashboard/connect-x/page.tsx` — keep reachable as optional; the disabled "New agent" is gone everywhere else.
- `app/globals.css` — `@layer components` connect-bar + recent-dropdown classes tokenized (cleanup D6, done early because A reuses the connect-bar on the details page).
- `lib/chat/session-log.ts`, `lib/chat/discover.ts`, `lib/usage/log.ts`, `app/api/agents/chat/route.ts`, `app/api/agents/chat-debug/route.ts`, `app/dashboard/agents/new/page.tsx` — cleanups D2/D3/D5/D4.
- `lib/types/database.ts` — regenerated after the A migration (new `agents`/`run_items`/`api_usage_events` columns + enums).

---

# STAGE A+B (full bite-sized detail — executed next)

## Task 0 — Contracts (serial, alone; everything else codes against this)

Goal: land the A migration + every cross-track type/stub so the tracks never collide. This is the only task that touches `lib/types/database.ts` and the new stub files at once.

**Files (OWNER: T0):**
- Migration via Supabase MCP (no file)
- Regenerate: `lib/types/database.ts`
- Create: `lib/scan/persist.ts`, `lib/x/post-item.ts`, `lib/chat/x-context.ts`, `lib/cron/reaper.ts`
- Create: `components/agents/panels/DraftsPanel.tsx`, `components/agents/panels/SchedulePanel.tsx`, `components/agents/panels/SourcesPanel.tsx`

- [ ] **Step 1: Apply the A migration via the Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with name `issue37_stage_a` and this SQL:

```sql
-- agents: autonomy + heartbeat (C/D columns land here too so one regen covers A+B)
alter table public.agents
  add column if not exists auto_post boolean not null default false,
  add column if not exists auto_post_daily_cap int not null default 3,
  add column if not exists last_checked_at timestamptz null;

-- run_items: audit + atomic-claim transient state + cross-run dedupe scaffolding
alter table public.run_items
  add column if not exists posted_via text null;
alter table public.run_items
  add constraint run_items_posted_via_chk
  check (posted_via is null or posted_via in ('manual','auto')) not valid;
alter table public.run_items validate constraint run_items_posted_via_chk;

-- item_status += 'posting'  (transient claim state used in Stage C; safe to add now)
alter type public.item_status add value if not exists 'posting';

-- api_usage_events: source dimension (manual|cron|auto_post)
alter table public.api_usage_events
  add column if not exists source text null;
alter table public.api_usage_events
  add constraint api_usage_events_source_chk
  check (source is null or source in ('manual','cron','auto_post')) not valid;
alter table public.api_usage_events validate constraint api_usage_events_source_chk;

-- daily-cap count index (used in C; cheap to land now)
create index if not exists run_items_agent_posted_at_idx
  on public.run_items (agent_id, posted_at) where posted_at is not null;
```

Note: `posted_via`/`source` are modeled as `text` + CHECK rather than enums so a single forward migration adds them without an enum-extend transaction-commit hazard. `'posting'` is added to `item_status` now (Postgres requires the ADD VALUE to commit before use, which is why it lands in A not C).

- [ ] **Step 2: Regenerate the database types**

Run: `pnpm dlx supabase gen types typescript --project-id pcgvpypzfwuchyfwdlwe > lib/types/database.ts`
(or `mcp__plugin_supabase_supabase__generate_typescript_types` and write the result to `lib/types/database.ts`).
Expected: `agents.Row` gains `auto_post: boolean`, `auto_post_daily_cap: number`, `last_checked_at: string | null`; `run_items.Row` gains `posted_via: string | null`; `api_usage_events.Row` gains `source: string | null`; `Constants.public.Enums.item_status` includes `"posting"`.

- [ ] **Step 3: Create `lib/scan/persist.ts` (frozen signature; full body filled by T-engine)**

```typescript
import { SCAN_MODEL } from "@/lib/ai/providers";
import { extractMetrics, storiesFromOutput } from "@/lib/scan/ui-stream";
import type { ScanResult } from "@/lib/scan/ui-stream";
import type { RunItemInsert } from "@/lib/types";
import { logUsage } from "@/lib/usage/log";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PersistRunResultInput {
  supabase: SupabaseClient;
  runId: string;
  agentId: string;
  userId: string;
  result: ScanResult;
  startedAt: number;
  source: "manual" | "cron" | "auto_post";
}

/**
 * Finalize a streamed scan: write run_items, mark the run terminal, log usage.
 * Source-agnostic — callable from the manual route (RLS client) and cron
 * (service-role client). Never throws; converts any failure into a failed run.
 */
export async function persistRunResult(_input: PersistRunResultInput): Promise<void> {
  throw new Error("persistRunResult not implemented (T-engine Task A1)");
}
```

Also export `ScanResult` from `lib/scan/ui-stream.ts` so `persist.ts` and the routes share the type. Add to `lib/scan/ui-stream.ts` near the existing `type ScanResult`:

```typescript
// biome-ignore lint/suspicious/noExplicitAny: see existing note — OUTPUT generic only affects result.object typing.
export type ScanResult = StreamTextResult<ToolSet, any>;
```
(Change the existing `type ScanResult` line to `export type ScanResult` — one-word edit.)

- [ ] **Step 4: Create `lib/x/post-item.ts` (frozen signature; body filled by T-engine)**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PostRunItemResult {
  ok: boolean;
  url?: string;
  id?: string;
  error?: string;
  status: number;
}

/**
 * Owner-explicit poster. Loads the item via run_item → run → agent → user_id,
 * asserts agent.user_id === ownerUserId BEFORE posting, then posts with that
 * owner's fresh token. Route passes the RLS client; cron passes service-role.
 * @param via - 'manual' (route) or 'auto' (cron auto-post) → run_items.posted_via
 */
export async function postRunItem(_args: {
  supabase: SupabaseClient;
  ownerUserId: string;
  itemId: string;
  text?: string;
  via: "manual" | "auto";
}): Promise<PostRunItemResult> {
  throw new Error("postRunItem not implemented (T-engine Task A3)");
}
```

- [ ] **Step 5: Create `lib/chat/x-context.ts` (frozen; body filled by T-chat-cleanup)**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFreshAccessToken } from "@/lib/x/tokens";

export interface XConnectionContext {
  connected: boolean;
  username: string | null;
  xUserId: string | null;
  accessToken: string | null;
}

/**
 * Resolve the user's X-connection context for the chat voice step. Reads the
 * x_connections row (scope by user_id — works under RLS and service-role) and,
 * when connected, fetches a fresh access token. Never throws on a token failure
 * (falls back to accessToken: null) so the chat never hangs.
 */
export async function buildXConnectionContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<XConnectionContext> {
  const { data: xConn } = await supabase
    .from("x_connections")
    .select("x_username, x_user_id")
    .eq("user_id", userId)
    .maybeSingle<{ x_username: string; x_user_id: string }>();
  let accessToken: string | null = null;
  if (xConn) {
    try {
      accessToken = await getFreshAccessToken(supabase, userId);
    } catch (err) {
      console.warn("buildXConnectionContext: getFreshAccessToken failed", err);
    }
  }
  return {
    connected: Boolean(xConn),
    username: xConn?.x_username ?? null,
    xUserId: xConn?.x_user_id ?? null,
    accessToken,
  };
}
```

Note: `lib/chat/tools.ts` already exports an `XConnectionContext` type. Re-export it from here for a single source of truth: at the top of `lib/chat/tools.ts` keep the interface, and in `x-context.ts` import-and-re-export instead of redefining if a duplicate-identifier conflict appears. Verify with `pnpm build` in T-chat-cleanup; if it conflicts, change `x-context.ts` to `import type { XConnectionContext } from "@/lib/chat/tools"; export type { XConnectionContext };`.

- [ ] **Step 6: Create `lib/cron/reaper.ts` (frozen; body filled by T-engine)**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

/** Default stale threshold: 360s (covers the 300s wall + deploy/crash slack). */
export const STALE_RUN_MS = 360_000;

/**
 * Force-fail runs stuck in 'running' past maxAgeMs. Service-role client.
 * @returns number of runs reaped.
 */
export async function reapStaleRuns(
  _supabase: SupabaseClient,
  _maxAgeMs: number = STALE_RUN_MS,
): Promise<number> {
  throw new Error("reapStaleRuns not implemented (T-engine Task A5)");
}
```

- [ ] **Step 7: Create the three panel files with frozen props (bodies filled by their tracks)**

`components/agents/panels/SourcesPanel.tsx`:
```typescript
"use client";
import type { AgentConfig } from "@/lib/chat/config";

export interface SourcesPanelProps {
  config: AgentConfig;
  onChange: (next: AgentConfig) => void;
  onSave: () => void;
  saving: boolean;
}

export function SourcesPanel(_props: SourcesPanelProps) {
  return null; // filled by T-detail-ui Task B1
}
```

`components/agents/panels/DraftsPanel.tsx`:
```typescript
"use client";
import type { PreviewStory } from "@/lib/scan/types";

/** One run grouped with its items, newest first. */
export interface DraftsRunGroup {
  runId: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  costUsd: number | null;
  itemCount: number | null;
  errorMessage: string | null;
  items: DraftsItem[];
}

export interface DraftsItem {
  id: string;
  story: PreviewStory;
  status: "drafted" | "posting" | "posted" | "failed";
  xTweetUrl: string | null;
  postedAt: string | null;
  postedVia: "manual" | "auto" | null;
  errorMessage: string | null;
}

export interface DraftsPanelProps {
  groups: DraftsRunGroup[];
  running: boolean;
  xConnected: boolean;
  onRun: () => void;
  onPost: (itemId: string, finalText?: string) => void;
  onRedraft: (itemId: string) => void;
  postingId: string | null;
  redraftingId: string | null;
  postedUrls: Record<string, string>;
  redraftedTexts: Record<string, string>;
  onConnectX: () => void;
}

export function DraftsPanel(_props: DraftsPanelProps) {
  return null; // filled by T-detail-ui Task B2
}
```

`components/agents/panels/SchedulePanel.tsx`:
```typescript
"use client";
import type { AgentConfig } from "@/lib/chat/config";

export interface SchedulePanelProps {
  config: AgentConfig;
  onChange: (next: AgentConfig) => void;
  onSave: () => void;
  saving: boolean;
  xConnected: boolean;
  autoPost: boolean;
  autoPostDailyCap: number;
  nextRunAt: string | null;
  postsUsedToday: number;
  xUsername: string | null;
}

export function SchedulePanel(_props: SchedulePanelProps) {
  // Stage A ships a placeholder; Stage C fills it.
  return (
    <p style={{ margin: 0, color: "var(--muted)", font: "400 0.9375rem/1.5 var(--font-sans)" }}>
      Scheduling and autonomous posting arrive in the next update.
    </p>
  );
}
```

- [ ] **Step 8: Verify Task 0 compiles**

Run: `pnpm build`
Expected: exits 0. The three stubs that `throw` are unreferenced so far, so the build passes. Then `pnpm lint:fix lib/scan/persist.ts lib/x/post-item.ts lib/chat/x-context.ts lib/cron/reaper.ts components/agents/panels/*.tsx`.

- [ ] **Step 9: Commit**

```bash
git add lib/types/database.ts lib/scan/persist.ts lib/x/post-item.ts lib/chat/x-context.ts lib/cron/reaper.ts lib/scan/ui-stream.ts components/agents/panels/
git commit -m "feat(#37): freeze stage A contracts + apply A migration

Adds run engine + poster + x-context + reaper stubs and the 3 detail
panels with frozen props so parallel tracks code against fixed interfaces.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Track T-engine (concurrent after T0) — run engine + reliability + poster

### Task A1: `persistRunResult` body

**Files (OWNER: T-engine):**
- Modify: `lib/scan/persist.ts`

- [ ] **Step 1: Implement the body** (lifts `run/route.ts:154-245`, source-agnostic, adds the notify seam)

```typescript
export async function persistRunResult(input: PersistRunResultInput): Promise<void> {
  const { supabase, runId, agentId, userId, result, startedAt, source } = input;
  try {
    const [output, metrics] = await Promise.all([result.output, extractMetrics(result, startedAt)]);

    if (!output) {
      await supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "Run completed, but structured output was missing.",
        })
        .eq("id", runId);
      return;
    }

    const stories = storiesFromOutput(output);
    const runItems: RunItemInsert[] = stories.map((story) => ({
      run_id: runId,
      agent_id: agentId,
      story_title: story.title,
      story_summary: story.summary,
      source_urls: story.sourceUrls,
      primary_tweet_url: story.primaryTweetUrl,
      dedupe_key: story.dedupeKey,
      drafted_text: story.draft,
      final_text: story.draft,
      status: "drafted",
    }));

    if (runItems.length > 0) {
      const { error: itemsError } = await supabase.from("run_items").insert(runItems);
      if (itemsError) {
        await supabase
          .from("runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: "Run completed, but its items could not be saved.",
          })
          .eq("id", runId);
        return;
      }
    }

    await supabase
      .from("runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        cost_usd: metrics.costUsd,
        x_search_count: metrics.xSearchCalls,
        item_count: runItems.length,
        error_message: null,
      })
      .eq("id", runId);

    await logUsage({
      kind: "scan",
      provider: "xai",
      resolved_provider: "xai",
      tool_name: "scan",
      model: SCAN_MODEL,
      user_id: userId,
      agent_id: agentId,
      run_id: runId,
      input_tokens: metrics.inputTokens,
      output_tokens: metrics.outputTokens,
      xSearchCalls: metrics.xSearchCalls,
      source, // new source dimension (Stage A column)
      metadata: { elapsedMs: metrics.elapsedMs, xSearchCalls: metrics.xSearchCalls, storyCount: runItems.length },
    });

    // future: notify(userId, runId) — breaking-news channels (email/WhatsApp/push)
    // would be triggered here. No interface/emitter yet (YAGNI, spec §2.3).
  } catch (error) {
    console.error("persistRunResult failed:", error);
    await supabase
      .from("runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Unknown run error.",
      })
      .eq("id", runId)
      .then(undefined, () => {});
  }
}
```

Note: `logUsage` accepts the new `source` field once `UsageEvent` allows it (Stage A column → regenerated `Insert` type already includes `source?: string | null`, so `...rest` in `logUsage` carries it). No change to `logUsage` needed for this field.

- [ ] **Step 2: Verify** — `pnpm build` exits 0; `pnpm lint:fix lib/scan/persist.ts`. Commit `feat(#37): implement persistRunResult`.

### Task A2: `runScanStream` timeout + abort

**Files (OWNER: T-engine):** Modify `lib/scan/run.ts:21-71`

- [ ] **Step 1: Extend the input + `streamText` call**

Change the signature to accept an optional abort signal + timeout and wire `onAbort`:

```typescript
export interface RunScanInput {
  searchX: boolean;
  handles: string[];
  fromDate: string | null;
  toDate: string | null;
  scanningInstructions: string;
  draftingInstructions: string;
  exampleTweets: string[];
  searchWeb: boolean;
  preferredDomains: string[];
  /** Abort signal for client-disconnect / reaper; UX-only on the manual path. */
  abortSignal?: AbortSignal;
  /** Model-call wall (ms); default 240_000 (under maxDuration=300). */
  timeoutMs?: number;
}
```

In the `streamText({...})` call add (alongside `temperature`, `topP`):
```typescript
    abortSignal: input.abortSignal,
    // Bound the model call well under maxDuration so a hung Grok call fails fast
    // instead of riding to the 300s wall and orphaning the run.
    ...(input.timeoutMs !== false ? {} : {}),
```

Implementation note: AI SDK v6 `streamText` does not take a top-level `timeout`. Implement the wall by composing an `AbortSignal.timeout(input.timeoutMs ?? 240_000)` with the caller's signal:

```typescript
export function runScanStream(input: RunScanInput) {
  const handles = input.handles.slice(0, MONITOR_MAX_HANDLES);
  const signals = [AbortSignal.timeout(input.timeoutMs ?? 240_000)];
  if (input.abortSignal) signals.push(input.abortSignal);
  const abortSignal = AbortSignal.any(signals);
  // ... existing tools block unchanged ...
  return streamText({
    model: xai.responses(SCAN_MODEL),
    system: buildScanInstructions(),
    prompt: buildAgentRunUserPrompt({ ... }),
    tools,
    stopWhen: stepCountIs(5),
    temperature: 0,
    topP: 1,
    maxOutputTokens: 1_000_000,
    abortSignal,
    output: Output.object({ schema: scanResultSchema }),
    providerOptions: { xai: { reasoningEffort: "low" } },
  });
}
```

(`onAbort` is handled at the consumer via `consumeStream({ onError })` + the run-failed path; the timeout fires through `abortSignal`, surfacing as a stream error the consumer persists as `failed`.)

- [ ] **Step 2: Verify** — `pnpm build` exits 0. The existing `discover.ts` callers of `streamText` are untouched (they build their own `streamText`, not `runScanStream`). Commit `feat(#37): bound runScanStream with a model-call timeout + abort`.

### Task A3: `postRunItem` body (owner-explicit, atomic-claim-ready)

**Files (OWNER: T-engine):** Modify `lib/x/post-item.ts`

- [ ] **Step 1: Implement** (folds in the `getDraftIssue` validation + the ownership assertion the spec §5.3 demands)

```typescript
import { getDraftIssue } from "@/lib/draft/validate";
import { postTweet } from "@/lib/x/client";
import { getFreshAccessToken } from "@/lib/x/tokens";

type ItemJoin = {
  id: string;
  drafted_text: string;
  final_text: string | null;
  status: string;
  run: { agent: { user_id: string } | null } | null;
};

export async function postRunItem(args: {
  supabase: SupabaseClient;
  ownerUserId: string;
  itemId: string;
  text?: string;
  via: "manual" | "auto";
}): Promise<PostRunItemResult> {
  const { supabase, ownerUserId, itemId, text: requested, via } = args;

  const { data: item, error: itemError } = await supabase
    .from("run_items")
    .select("id, drafted_text, final_text, status, run:runs!inner ( agent:agents!inner ( user_id ) )")
    .eq("id", itemId)
    .maybeSingle<ItemJoin>();

  if (itemError) return { ok: false, error: "Failed to load draft.", status: 500 };
  if (!item) return { ok: false, error: "Draft not found.", status: 404 };

  // OWNERSHIP ASSERTION — cron uses a service-role client that bypasses RLS.
  const ownerId = item.run?.agent?.user_id ?? null;
  if (ownerId !== ownerUserId) return { ok: false, error: "Not authorized.", status: 403 };

  if (item.status === "posted") return { ok: false, error: "Draft is already posted.", status: 409 };

  const finalText = (requested ?? "").trim() || item.final_text || item.drafted_text;
  const issue = getDraftIssue(finalText);
  if (issue) return { ok: false, error: issue, status: 400 };

  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(supabase, ownerUserId);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No X connection.", status: 400 };
  }

  const result = await postTweet(accessToken, finalText);
  if (!result.ok) {
    await supabase
      .from("run_items")
      .update({ status: "failed", final_text: finalText, error_message: result.error })
      .eq("id", itemId);
    return { ok: false, error: result.error, status: result.status };
  }

  const { error: updateError } = await supabase
    .from("run_items")
    .update({
      status: "posted",
      final_text: finalText,
      x_tweet_id: result.id,
      x_tweet_url: result.url,
      posted_at: new Date().toISOString(),
      posted_via: via,
      error_message: null,
    })
    .eq("id", itemId);
  if (updateError) return { ok: false, error: "Tweet posted, but the item could not be updated.", status: 500 };

  return { ok: true, id: result.id, url: result.url, status: 200 };
}
```

Note: the embedded join (`run:runs!inner ( agent:agents!inner ( user_id ) )`) lets the RLS route AND service-role cron resolve the owner without a separate query. If the generated types reject the join string, add a localized `// @ts-expect-error postgrest embedded-join string typing` — verify which with `pnpm build`.

- [ ] **Step 2: Verify** — `pnpm build` exits 0; `pnpm lint:fix lib/x/post-item.ts`. Commit `feat(#37): owner-explicit postRunItem with ownership assertion`.

### Task A4: token-refresh fetch timeout

**Files (OWNER: T-engine):** Modify `lib/x/tokens.ts:144-154`

- [ ] **Step 1:** add `signal: AbortSignal.timeout(8000)` to the `fetch(X_TOKEN_ENDPOINT, {...})` options (after `body:`).
- [ ] **Step 2: Verify** — `pnpm build` exits 0. Commit `fix(#37): bound the X token-refresh fetch (8s timeout)`.

### Task A5: `reapStaleRuns` body

**Files (OWNER: T-engine):** Modify `lib/cron/reaper.ts`

- [ ] **Step 1: Implement**

```typescript
export async function reapStaleRuns(
  supabase: SupabaseClient,
  maxAgeMs: number = STALE_RUN_MS,
): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const { data, error } = await supabase
    .from("runs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: "Run exceeded the time limit and was force-failed.",
    })
    .eq("status", "running")
    .lt("started_at", cutoff)
    .select("id");
  if (error) {
    console.error("reapStaleRuns failed", error);
    return 0;
  }
  return (data ?? []).length;
}
```

- [ ] **Step 2: Verify with a pure-ish assertion script** (cutoff math is the load-bearing pure part):

Create `scripts/verify-reaper-cutoff.ts`:
```typescript
import { STALE_RUN_MS } from "@/lib/cron/reaper";
const now = Date.parse("2026-06-17T12:00:00.000Z");
const cutoff = new Date(now - STALE_RUN_MS).toISOString();
const expected = "2026-06-17T11:54:00.000Z"; // 360s earlier
console.log(cutoff === expected ? "PASS cutoff" : `FAIL cutoff: ${cutoff} != ${expected}`);
```
Run: `pnpm exec tsx scripts/verify-reaper-cutoff.ts` → Expected: `PASS cutoff`. Delete the script after. Commit `feat(#37): stale-run reaper`.

---

## Track T-routes (after T-engine merges its libs) — compose the primitives

### Task A6: manual run route → server-driven completion

**Files (OWNER: T-routes):** Modify `app/api/agents/[id]/run/route.ts`

- [ ] **Step 1: Delete the `inactive→409` block** (`74-78`).
- [ ] **Step 2: Replace the `scanToUIResponse({onFinish...})` block (`139-246`)** with `consumeStream` server-driven completion. The route stays a streaming `Response` for live UX, but completion no longer depends on the client:

```typescript
  const startedAt = Date.now();
  const clientAbort = new AbortController();
  const result = runScanStream({
    searchX: agent.search_x,
    handles: effectiveHandles,
    fromDate: agent.scan_from,
    toDate: agent.scan_to,
    scanningInstructions: agent.monitoring_description,
    draftingInstructions: agent.drafting_instructions,
    exampleTweets: agent.example_tweets ?? [],
    searchWeb: agent.search_web ?? false,
    preferredDomains: agent.preferred_domains ?? [],
    // No abortSignal from the client: completion must NOT depend on the browser.
  });

  // Server-driven completion: drive the model to the end regardless of whether
  // the browser drains the response. consumeStream resolves result.output/.steps
  // so persistRunResult runs even if the tab closes mid-run. (waitUntil keeps the
  // function alive on Vercel after the Response is returned.)
  const finalize = (async () => {
    try {
      await result.consumeStream({
        onError: (error) => console.error("consumeStream error", error),
      });
    } finally {
      await persistRunResult({
        supabase, runId, agentId: agent.id, userId: user.id, result, startedAt, source: "manual",
      });
    }
  })();

  // Keep the serverless function alive until finalize settles even after the
  // streamed Response is fully sent (Vercel fluid runtime).
  const { waitUntil } = await import("@vercel/functions").catch(() => ({ waitUntil: undefined }));
  if (waitUntil) waitUntil(finalize);
  else void finalize;

  return result.toUIMessageStreamResponse();
```

Imports to add: `import { persistRunResult } from "@/lib/scan/persist";`. Remove now-unused imports (`extractMetrics`, `scanToUIResponse`, `storiesFromOutput`, `logUsage`, `SCAN_MODEL`, `RunItemInsert`) if no longer referenced — `pnpm build` will flag unused.

Note on `waitUntil`: if `@vercel/functions` is not installed, fall back to `void finalize` (the `consumeStream` promise still drives completion in-process; the dynamic import keeps the build green). Confirm availability with `grep '@vercel/functions' package.json` during the task; if absent, just `void finalize` and document that local dev relies on the request staying open until `consumeStream` resolves, while prod relies on fluid keep-alive.

- [ ] **Step 3: Verify (route, curl against `pnpm dev`)**

Start `pnpm dev`. Authenticated POST (use the dev session cookie or the chat-debug pattern for a known user). Expected: `200` streaming response. Then query the run row:
```bash
# After the run, the latest run for the agent must be terminal even if you Ctrl-C the curl mid-stream:
curl -sN -X POST "http://localhost:3000/api/agents/<AGENT_ID>/run" --cookie "<session>" | head -c 200
```
Browser-agent confirmation in Task B6. Commit `feat(#37): server-driven run completion via consumeStream`.

### Task A7: prompt-lab + save-agent + disconnect X-decoupling

**Files (OWNER: T-routes):** Modify `app/api/agents/scan/route.ts`, `app/api/agents/save-agent/route.ts`, `app/api/x/disconnect/route.ts`

- [ ] **Step 1:** In `scan/route.ts`, delete the `x_connections` lookup + `403` block (`30-41`). The lab no longer requires X.
- [ ] **Step 2:** In `save-agent/route.ts`, delete the `x_connections` lookup + `403` block (`92-108`).
- [ ] **Step 3:** In `disconnect/route.ts`, replace the agents `inactive` update (`79-95`) with auto-post disable + warning count:

```typescript
  const { data: affected, error: agentsError } = await supabase
    .from("agents")
    .update({ auto_post: false })
    .eq("user_id", user.id)
    .eq("auto_post", true)
    .select("id");
  if (agentsError) {
    return NextResponse.json(
      { error: "Disconnected X, but failed to turn off auto-posting." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, autoPostDisabled: (affected ?? []).length });
```

- [ ] **Step 4: Verify (curl)** — POST `/api/agents/scan` with no X connection now returns the scan stream (or a `400` for missing fields), never `403 "Connect X..."`. POST `/api/agents/save-agent` with a valid config + no X returns `{ id }`. Commit `feat(#37): make scan/save/disconnect X-optional`.

### Task A8: post route delegates to `postRunItem`

**Files (OWNER: T-routes):** Modify `app/api/agents/run-items/[id]/post/route.ts`

- [ ] **Step 1:** Replace the body after auth with a `postRunItem` call:

```typescript
  const rawBody = (await req.json().catch(() => null)) as unknown;
  const body = typeof rawBody === "object" && rawBody !== null ? rawBody : {};
  const finalText =
    typeof (body as { finalText?: unknown }).finalText === "string"
      ? (body as { finalText: string }).finalText
      : undefined;

  const result = await postRunItem({
    supabase, ownerUserId: user.id, itemId: id, text: finalText, via: "manual",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id: result.id, url: result.url });
```

Add `import { postRunItem } from "@/lib/x/post-item";`; remove now-unused imports (`getDraftIssue`, `postTweet`, `getFreshAccessToken`, `RunItem`).

- [ ] **Step 2: Verify (curl)** — POST with a valid `final_text` and an X-connected user returns `{ url }` `200`; a foreign item id returns `403`. Commit `refactor(#37): post route delegates to owner-explicit postRunItem`.

---

## Track T-detail-ui (concurrent after T0) — 3-tab shell + Drafts worklist

### Task B1: `SourcesPanel` body + rewrite `agent-detail.tsx` into the shell

**Files (OWNER: T-detail-ui):** Modify `components/agents/panels/SourcesPanel.tsx`, `components/agents/agent-detail.tsx`

- [ ] **Step 1: Fill `SourcesPanel`** — move the current Settings tab body (the `ConfigForm` + Save settings button, `agent-detail.tsx:454-472`):

```typescript
import { ConfigForm } from "../config-form";

export function SourcesPanel({ config, onChange, onSave, saving }: SourcesPanelProps) {
  return (
    <div>
      <ConfigForm value={config} onChange={onChange} />
      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          className={`btn btn-primary${saving ? " loading" : ""}`}
          onClick={onSave}
          disabled={saving}
        >
          <span className="ld" aria-hidden="true" />
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `agent-detail.tsx`** into a 3-tab shell. Tabs: `drafts` (default) | `schedule` | `sources`. Keep the existing handlers (`handleSaveSettings`, `handleRun`, `handlePost`, `handleRedraft`) but:
  - delete the `xConnected` Run gate (no `disabled={!xConnected}`, no "Connect X to run" hint);
  - replace `$${cost_usd.toFixed(4)}` with `usd(cost)` (import `usd` from `@/lib/usage/format`) — this lives in `DraftsPanel` now;
  - add a `handleConnectX` that force-saves nothing (no chat session) and calls `startXConnect` with `?next=/dashboard/agents/${agent.id}` (reuse the helper the chat uses; import from its module);
  - delegate rendering to `<DraftsPanel .../>`, `<SchedulePanel .../>`, `<SourcesPanel .../>`.
  - new prop: accept `runGroups: DraftsRunGroup[]` from the page (B3) instead of `latestRun`/`latestRunItems`.

Tab switcher (reuse `ws-tabs`/`ws-tab`):
```typescript
type TabValue = "drafts" | "schedule" | "sources";
// ...
<div className="ws-tabs">
  <button type="button" className={`ws-tab${activeTab === "drafts" ? " is-active" : ""}`} onClick={() => setActiveTab("drafts")}>Drafts</button>
  <button type="button" className={`ws-tab${activeTab === "schedule" ? " is-active" : ""}`} onClick={() => setActiveTab("schedule")}>Schedule & autonomy</button>
  <button type="button" className={`ws-tab${activeTab === "sources" ? " is-active" : ""}`} onClick={() => setActiveTab("sources")}>Sources</button>
</div>
```

- [ ] **Step 3: Verify** — `pnpm build` exits 0; `pnpm lint:fix components/agents/agent-detail.tsx components/agents/panels/SourcesPanel.tsx`. Commit `feat(#37): 3-tab agent-detail shell + SourcesPanel`.

### Task B2: `DraftsPanel` body (worklist across runs)

**Files (OWNER: T-detail-ui):** Modify `components/agents/panels/DraftsPanel.tsx`

- [ ] **Step 1: Implement** the run-button + run-in-progress + actionable empty state + reverse-chron run groups, each rendering `StoryCard`s with per-item terminal state. Use the `DraftsPanelProps`/`DraftsRunGroup`/`DraftsItem` types from T0. Run button is `disabled={running}` only (X-optional). When `!xConnected`, render the tokenized connect-bar (class `ws-connect-bar`, from T-gate-ui) above the worklist with `onClick={onConnectX}`. Empty state copy: "No stories matched — loosen your scanning instructions or widen the window" linking to the Sources/Schedule tabs. Run-in-progress: a "Scanning your beat…" row mirroring the chat `ThinkingRow`.

(Full JSX is mechanical reuse of the existing `agent-detail.tsx:291-450` block, restructured to iterate `groups` and read terminal state from `DraftsItem.status`/`xTweetUrl`/`postedAt`/`postedVia`. Cost via `usd(group.costUsd)`.)

- [ ] **Step 2: Verify** — `pnpm build` exits 0; lint-fix. Commit `feat(#37): DraftsPanel worklist with per-run groups`.

### Task B3: page query — recent runs + items, Promise.all (cleanup D4)

**Files (OWNER: T-detail-ui):** Modify `app/dashboard/agents/[id]/page.tsx`

- [ ] **Step 1:** Replace the single-latest-run query with a recent-runs (last 20) query + their items, joined into `DraftsRunGroup[]`, and parallelize the independent agent/runs/connection awaits with `Promise.all`:

```typescript
  const [{ data: agent }, { data: runRows }, { data: connection }] = await Promise.all([
    supabase.from("agents").select("*").eq("id", id).maybeSingle<AgentDetailRow>(),
    supabase
      .from("runs")
      .select("id, status, started_at, completed_at, cost_usd, x_search_count, item_count, error_message")
      .eq("agent_id", id)
      .order("started_at", { ascending: false })
      .limit(20),
    supabase.from("x_connections").select("id").maybeSingle<{ id: string }>(),
  ]);
  if (!agent) notFound();

  const runs = (runRows ?? []) as RunRow[];
  const runIds = runs.map((r) => r.id);
  const { data: itemRows } = runIds.length
    ? await supabase
        .from("run_items")
        .select("id, run_id, story_title, story_summary, source_urls, primary_tweet_url, drafted_text, final_text, status, x_tweet_url, posted_at, posted_via, error_message")
        .in("run_id", runIds)
        .order("created_at", { ascending: true })
    : { data: [] as ItemRow[] };
```

Group items by `run_id` into `DraftsRunGroup[]` (map each item to `DraftsItem` via a small `itemToStory`-style helper) and pass to `<AgentDetail runGroups={groups} ... />`.

- [ ] **Step 2: Verify** — `pnpm build` exits 0. Commit `feat(#37): load recent runs + items for the Drafts worklist`.

### Task B4: per-item terminal state in `story-card.tsx`

**Files (OWNER: T-detail-ui):** Modify `components/agents/story-card.tsx`

- [ ] **Step 1:** Add optional props `status?`, `xTweetUrl?`, `postedAt?`, `postedVia?`, `errorMessage?`. When `status === "posted"`, render a tweet link + formatted `postedAt` and an "Auto-posted" badge if `postedVia === "auto"` instead of the Post button. When `status === "failed"`, render `errorMessage` in `var(--err)`. Otherwise render the existing actions.
- [ ] **Step 2: Verify** — `pnpm build` exits 0; lint-fix. Commit `feat(#37): per-item terminal state in story-card`.

### Task B5: new-drafts badge + reporter status labels on the agents list

**Files (OWNER: T-gate-ui & T-detail-ui shared read — assign to T-detail-ui):** Modify `app/dashboard/agents/page.tsx`

- [ ] **Step 1:** Add a per-agent count of `drafted`, non-posted items via one grouped query, render as a `wbadge` ("N new drafts"). Map status to reporter labels: `active → Running`, `paused → Paused`, `inactive → Retired`.

```typescript
  const { data: agentsData } = await supabase
    .from("agents")
    .select("id, name, monitored_handles, status, created_at")
    .order("created_at", { ascending: false });
  const agents = (agentsData ?? []) as AgentRow[];
  const ids = agents.map((a) => a.id);
  const { data: draftRows } = ids.length
    ? await supabase.from("run_items").select("agent_id").eq("status", "drafted").in("agent_id", ids)
    : { data: [] as { agent_id: string }[] };
  const draftCounts = new Map<string, number>();
  for (const r of draftRows ?? []) draftCounts.set(r.agent_id, (draftCounts.get(r.agent_id) ?? 0) + 1);
  const statusLabel = (s: string) => (s === "active" ? "Running" : s === "paused" ? "Paused" : "Retired");
```

- [ ] **Step 2: Verify** — `pnpm build` exits 0. Browser confirmation in B6. Commit `feat(#37): new-drafts badge + reporter status labels`.

### Task B6: Stage A+B browser-agent verification (human-run checklist)

**Files:** none (verification only).

- [ ] **Step 1:** Run `pnpm build` — exits 0. `pnpm lint` — no new errors.
- [ ] **Step 2: Browser-agent checklist** (using the agent-browser skill, logged in as `testuser@oparax.com` / `hello123`, **with X NOT connected**):
  1. Navigate `/dashboard/agents`. **Expect:** "New agent" button is enabled (not disabled).
  2. Create an agent in chat → Save. **Expect:** redirect to `/dashboard/agents/[id]`, no `403`.
  3. On the detail page, **Expect:** three tabs (Drafts default, Schedule & autonomy, Sources). The Run button is enabled with no "Connect X to run" hint.
  4. Click Run. **Expect:** a "Scanning your beat…" row, then drafts appear under a run-group header with a cost shown via `usd()`.
  5. **Close the tab mid-run** (start a fresh run, then navigate away within ~5s). Re-open the detail page after ~60s. **Expect:** the run shows `completed` or `failed` — never stuck `running`.
  6. Click Post on a draft. **Expect:** an inline connect-X bar (not a toast); clicking it opens OAuth with `?next=` back to this agent. After connecting, Post returns `201` and the card shows the tweet link + timestamp.
  7. Back on `/dashboard/agents`, **Expect:** a "N new drafts" badge and a "Running" status label.
- [ ] **Step 3:** Hand the checklist + results to the developer. This is the Stage A+B gate.

---

## Track T-gate-ui (concurrent after T0) — de-gate + connect-bar tokens

### Task A9: connect-x page + connect-bar CSS tokens (cleanup D6)

**Files (OWNER: T-gate-ui):** Modify `app/dashboard/connect-x/page.tsx`, `app/globals.css`

- [ ] **Step 1:** Move the inline connect-bar styles + `oklch()` from `agent-chat.tsx:708-741` into `app/globals.css` `@layer components` as `.ws-connect-bar` / `.ws-connect-bar-text`, tokenized with `--brand`/`--brand-ring`/`--faint`. Update `agent-chat.tsx` to use the class (this is the one T-gate-ui edit in `agent-chat.tsx`; flag: T-chat-cleanup does NOT touch this block — de-conflicted by section).
- [ ] **Step 2:** In `connect-x/page.tsx`, keep the page reachable but it is no longer a forced gate (the disabled "New agent" stays only here as the explicit connect entry; `agents/page.tsx` always shows the enabled button). No redirect changes beyond confirming `isSafeNextPath` still clamps `?next=`.
- [ ] **Step 3: Verify** — `pnpm build` exits 0; `pnpm lint:fix app/dashboard/connect-x/page.tsx`. CSS is Biome-excluded; eyeball the `@layer components` block. Commit `refactor(#37): tokenize connect-bar; keep connect-x optional`.

---

## Track T-chat-cleanup (concurrent after T0) — folded-in DRY cleanups

### Task A10: use `buildXConnectionContext` in both chat routes (D1)

**Files (OWNER: T-chat-cleanup):** Modify `app/api/agents/chat/route.ts`, `app/api/agents/chat-debug/route.ts`, `lib/chat/x-context.ts`

- [ ] **Step 1:** In `chat/route.ts`, replace lines `104-121` with `const xConnection = await buildXConnectionContext(supabase, user.id);` (it returns the same `{connected, username, xUserId, accessToken}` shape).
- [ ] **Step 2:** In `chat-debug/route.ts`, replace lines `123-142` with `const xConnection = await buildXConnectionContext(serviceClient, userId);`.
- [ ] **Step 3: Verify** — `pnpm build` exits 0. Optional: drive the chat-debug skill once to confirm a connected user still gets the "offer to pull recent posts" voice step. Commit `refactor(#37): dedupe X-connection context across chat routes`.

### Task A11: `collectToolCalls` + `ToolCallLog` (D2), shared service client (D5), `runGroundedDiscovery` (D3), Promise.all (D4)

**Files (OWNER: T-chat-cleanup):** Modify `lib/chat/session-log.ts`, `lib/chat/discover.ts`, `lib/usage/log.ts`, `app/api/agents/chat/route.ts`, `app/api/agents/chat-debug/route.ts`, `app/dashboard/agents/new/page.tsx`

- [ ] **Step 1 (D2):** In `session-log.ts` export `interface ToolCallLog { name: string; input?: unknown; output?: unknown }` and `collectToolCalls(steps)` (the `flatMap(step => step.toolCalls.map(...))` body duplicated in both chat routes). Import in both routes.
- [ ] **Step 2 (D3):** In `discover.ts`, extract `runGroundedDiscovery({ system, prompt, tool, schema, purpose })` private runner shared by `discoverHandles`/`discoverSites` (the two near-identical `streamText` + `logUsage` bodies).
- [ ] **Step 3 (D5):** In `lib/usage/log.ts` and `lib/chat/session-log.ts`, cache the service-role client at module scope (`let _client; const getClient = () => (_client ??= createServiceRoleClient())`).
- [ ] **Step 4 (D4):** In `chat/route.ts`, `Promise.all` the independent `convertToModelMessages(messages)` + `buildXConnectionContext(...)`. In `agents/new/page.tsx`, `Promise.all` the sessions list with any sibling await.
- [ ] **Step 5: Verify** — `pnpm build` exits 0; `pnpm lint:fix` the touched files. Commit `refactor(#37): DRY chat tool-call logging, discovery runner, service client, parallel awaits`.

---

## Stage A+B convergence + QC

- [ ] Merge all A+B track branches back onto `ft/37`.
- [ ] Run `/simplify` then `/code-review` on the diff.
- [ ] `pnpm lint:fix` (touched files) + `pnpm build` exits 0.
- [ ] Run the Task B6 browser checklist; hand results to the developer.
- [ ] Squash-merge Stage A+B to `dev` (per spec §12). #37 stays open.

---

# STAGE C — Scheduling + autonomy (TASK-LEVEL OUTLINE — expand at stage start)

> **Scoping note:** Stage C is intentionally outline-level. A+B will inform the exact cron loop shape, the `nextRunAt` edge handling, and the auto-post claim. Expand each task to full bite-sized granularity (code blocks, exact curl/assertion outputs) when Stage C begins, mirroring the Stage A+B detail above. The DAG: **T0-C (schema + pure-fn stubs) → {T-engine-C, T-routes-C, T-detail-ui-C, T-cost-C} → converge.**

### Task C0 — Contracts (serial): C migration + pure-fn stubs
- **Files:** Supabase migration `issue37_stage_c` + regen `lib/types/database.ts`; create `lib/schedule/next-run.ts` (stub `nextRunAt`) and `lib/cron/due.ts` (stub `isAgentDue`/`dueAgentsQuery`).
- **Key steps:** `UNIQUE(agent_id, dedupe_key)` on `run_items`; partial index `agents(next_run_at) WHERE status='active' AND next_run_at IS NOT NULL`; reconcile `agents_monitored_handles_check` to `<= 10`; add `usage_kind += 'x_timeline'` (commit-before-use, lands here for D); add env vars `CRON_SECRET`, `AUTO_POST_ENABLED` to `.env` docs + `README`. Freeze `nextRunAt(agent, after): string | null` and the due-predicate signature.
- **Verification:** `pnpm build` exits 0; regen diff shows the unique constraint + enum value.

### Task C1 — `nextRunAt` pure function (PURE-FN verification)
- **Files:** `lib/schedule/next-run.ts`.
- **Key steps:** anchor slots to `window_start + k·cadence` (no drift); handle DST spring-forward gap (clamp) + fall-back (first occurrence); midnight-crossing windows (`window_end < window_start`); empty `schedule_days` ⇒ `null` (scheduling disabled).
- **Verification:** `scripts/verify-next-run.ts` run via `pnpm exec tsx` with explicit `console.log(actual === expected ? "PASS" : "FAIL …")` for: a weekday 9–18 ET every-120m agent (next slot), a Sunday-excluded agent (skips to Monday), a DST-transition date (America/New_York 2026-03-08), and a midnight-crossing window (22:00–02:00). Expected: all PASS.

### Task C2 — Cross-run dedupe (P0 — gates the track)
- **Files:** `lib/scan/persist.ts` (upsert `ON CONFLICT (agent_id, dedupe_key) DO NOTHING`), a pre-draft skip query in the cron path.
- **Key steps:** before drafting, skip stories whose `(agent_id, dedupe_key)` exists with status in `('drafted','posted')` within a 14-day lookback; cron computes a moving window `fromDate = last completed run start (or now − cadence)`, `toDate = now`; `scan_from`/`scan_to` become manual-only overrides.
- **Verification:** PURE-FN assertion script for the dedupe-key filter (given a set of existing keys + new stories → expected surviving subset); route-level no-repeat confirmed via the manual cron trigger (C4).

### Task C3 — `nextRunAt` wired on Save/PATCH
- **Files:** `app/api/agents/save-agent/route.ts`, `app/api/agents/[id]/route.ts` (PATCH).
- **Key steps:** compute + persist `next_run_at` when schedule fields change; UI blocks enabling cron/auto_post until ≥1 day chosen.
- **Verification:** curl PATCH with a schedule → row's `next_run_at` matches the `nextRunAt` assertion expectation.

### Task C4 — Cron endpoint + atomic lease + reaper + manual trigger (ROUTE verification)
- **Files:** `app/api/cron/scan/route.ts` (new), `vercel.json` (`crons` ~15 min), reuse `lib/cron/reaper.ts`.
- **Key steps:** POST-only; constant-time `Bearer CRON_SECRET` via `crypto.timingSafeEqual` (401 otherwise; never trust `x-vercel-cron`); due-query bounded `LIMIT batch ORDER BY next_run_at ASC`; atomic lease `UPDATE agents SET next_run_at=<recomputed> WHERE id=$1 AND next_run_at<=now() RETURNING id`; per-agent try/catch; `await result.consumeStream()` → `persistRunResult(source:'cron')`; empty runs bump `last_checked_at` instead of inserting a `runs` row (spec §2.7); run `reapStaleRuns` each tick; an admin-gated manual trigger (reuse `isAdmin`) so it is curl-verifiable on a preview deploy.
- **Verification:** curl the manual trigger on a preview deploy; assert no double-run (lease), empty-run heartbeat (no row, `last_checked_at` advanced), kill-switch honored, batch bound respected.

### Task C5 — Auto-post (atomic, capped, kill-switched) (ROUTE verification)
- **Files:** `app/api/cron/scan/route.ts` (poster section), reuse `lib/x/post-item.ts` with `via:'auto'`.
- **Key steps:** only when `auto_post` AND X live token AND under cap AND `AUTO_POST_ENABLED`; atomic per-item claim `UPDATE run_items SET status='posting' WHERE id=$1 AND status='drafted' RETURNING id`; cap enforced transactionally per agent keyed to `schedule_timezone` day (optionally `pg_advisory_xact_lock(hashtext(agent_id))`); self-heal on `400 invalid_grant` (set `auto_post=false`, surface reconnect banner, stop retrying); per-user daily USD cap checked before each scheduled scan.
- **Verification:** manual-trigger run confirms single claim wins (no double-post), cap stops at N, kill switch blocks all, token-death disables auto_post.

### Task C6 — Schedule & autonomy tab UI (UI verification)
- **Files:** `components/agents/panels/SchedulePanel.tsx` (fill the A placeholder), `config-form.tsx` (timezone → select).
- **Key steps:** browser-defaulted timezone select (`Intl.DateTimeFormat().resolvedOptions().timeZone`); plain-language summary from the same `nextRunAt` logic ("Scans every 2h on weekdays 9am–6pm ET; next run in 40 min"); `auto_post` toggle visually gated behind X-connected + schedule-set + a one-time confirm naming the exact @handle; "N of M auto-posts used today".
- **Verification:** browser checklist — toggle gating, summary correctness vs the pure fn, confirm dialog names the handle.

### Task C7 — Cost telemetry + caps (D-shared)
- **Files:** `lib/draft/generate.ts` + redraft route (log `draft`/`redraft` usage with `gateway.marketCost`), `lib/usage/log.ts` (`source` propagation), `app/dashboard/usage/page.tsx` (bySource breakdown), per-user daily cap helper.
- **Verification:** PURE-FN for the daily-sum cap predicate; usage page shows a bySource column; alert when a token-bearing call logs `cost == 0`.

### Stage C convergence + QC
- Merge tracks → `/simplify` + `/code-review` → `pnpm build` → manual-trigger verification on a preview deploy → squash to `dev`. #37 stays open.

---

# STAGE D — Protected monitoring (TASK-LEVEL OUTLINE — expand at stage start)

> **Scoping note:** outline-level; ships last on the proven engine. DAG: **T0-D (schema/cost) → {T-engine-D, T-routes-D, T-detail-ui-D} → converge.** Reuses `lib/x/timeline.ts:fetchRecentPosts` (already prefers the user token, app-bearer fallback) and `verified_x_handles` (caches `username → x_user_id` + `protected`).

### Task D0 — Contracts: `protected_monitoring` column + cost branch
- **Files:** migration adds `agents.protected_monitoring boolean NOT NULL DEFAULT false`; regen types; freeze the protected-reads helper signature.
- **Verification:** `pnpm build` exits 0; regen diff shows the column.

### Task D1 — Protected reads feed the scan
- **Files:** `lib/scan/run.ts` / a new `lib/scan/protected.ts`, cron path.
- **Key steps:** when `protected_monitoring` AND X connected: per monitored handle resolve `x_user_id` (cache hit in `verified_x_handles`, else `getUserByUsername`), call `fetchRecentPosts` with the user token, pass tweets to the scan as a new tagged prompt block with real per-tweet URLs (`https://x.com/i/web/status/<id>`) so `scanItemSchema.urls`/`sources` stay real; fall back to `xSearch` when not connected or a read fails; no new OAuth scope.
- **Verification:** browser/manual on a followed protected account; confirm real URLs, fallback when disconnected.

### Task D2 — Cost for protected reads (`x_timeline`)
- **Files:** `lib/usage/cost.ts`, `lib/usage/pricing.ts`.
- **Key steps:** add the `x_timeline` `usage_kind` branch (≈ $0.005/post read + $0.010/user lookup), `provider:'x_api'`, fold into the per-user daily cap.
- **Verification:** PURE-FN assertion for the new cost branch (given N reads + M lookups → expected USD); confirm calls no longer log `cost == 0`.

### Task D3 — Protected toggle UI
- **Files:** `SourcesPanel.tsx` or `SchedulePanel.tsx`.
- **Key steps:** per-agent toggle default OFF, only meaningful when X connected; copy explaining it covers their own + followed protected accounts.
- **Verification:** browser checklist — toggle visible only when connected.

### Stage D convergence + QC + close #37
- Merge → `/simplify` + `/code-review` → `pnpm build` → manual verification → squash to `dev` → **close #37**.

---

## Self-Review

**1. Spec coverage (every section → task):**
- §2 locked decisions: X-optional (A7, A6, A9), gate removed (A9, B5), notifications cut (A1 seam comment), autonomy default-OFF+cap+kill (C5), Section E in (B-track + C4/C5), staged delivery (the three stage headers + convergence steps), empty runs not persisted (C4 heartbeat). ✓
- §3 engine: two primitives (T0 stubs + A1/A2), server-driven completion (A6 `consumeStream`+`waitUntil`), reaper (A5/C4), token-refresh timeout (A4), invariants (lease C4, claim C5, batch C4, timeouts A2/A4). ✓
- §4 schema deltas: A migration (Task 0) covers `auto_post`/`auto_post_daily_cap`/`last_checked_at`/`posted_via`/`item_status+=posting`/`api_usage_events.source`; C0 covers `UNIQUE(agent_id,dedupe_key)`/next_run_at index/handle-check reconcile/`usage_kind+=x_timeline`; D0 covers `protected_monitoring`. Env vars in C0. ✓
- §5 Track A: X-decoupling (A6/A7/A9), shared engine (A1/A2/A4/A5), owner-explicit poster (A3/A8), 3-tab shell (B1), folded cleanups D1/D2/D3/D5/A6/notify-seam (A10/A11/A1). ✓
- §6 Track B: page query (B3), Drafts worklist (B2), per-item terminal state (B4), new-drafts badge (B5), run-in-progress + empty state (B2), true cost via `usd()` (B1/B2). ✓
- §7 Track C: dedupe (C2), cron+lease (C4), `nextRunAt` (C1/C3), auto-post (C5), schedule UI (C6). ✓
- §8 Track D: D1/D2/D3. ✓
- §9 cleanups: D4 (B3/A11), D6 (A9). ✓
- §10 security: cron auth (C4), service-role hand-scoping + owner assertion (A3), auto-post containment (C5), no-open-redirect (A9 confirms `isSafeNextPath`), protected privacy (D RLS). ✓
- §11 cost: draft/redraft logging + source dim + per-user cap + zero-cost alert (C7), x_timeline (D2). ✓
- §13 verification approach honored per stage (pure-fn scripts for nextRunAt/dedupe/cost; curl for routes; browser checklist B6). ✓

**2. Placeholder scan:** Stage A+B steps all carry concrete code or exact commands. Stages C/D are explicitly declared outline-level (honest scoping per the directive), not hidden TODOs. The only deferred-detail markers are the per-tab JSX in B1/B2 described as "mechanical reuse of existing lines X–Y" with the exact source ranges given — acceptable because the code already exists in the repo and is being relocated, not invented.

**3. Type/name consistency:** `persistRunResult`/`PersistRunResultInput`, `postRunItem`/`PostRunItemResult`, `buildXConnectionContext`/`XConnectionContext`, `reapStaleRuns`/`STALE_RUN_MS`, `DraftsPanelProps`/`DraftsRunGroup`/`DraftsItem`, `SchedulePanelProps`, `SourcesPanelProps`, `nextRunAt`, `ScanResult` (now exported) are defined once in Task 0 and referenced unchanged downstream. `source: "manual"|"cron"|"auto_post"` and `via: "manual"|"auto"` are distinct on purpose (run-source vs post-source) and used consistently. `usd()` imported from `@/lib/usage/format`.

**Known risk flagged for the executor:** `waitUntil` from `@vercel/functions` (A6 Step 2) — confirm the package is installed; if not, the dynamic-import fallback keeps the build green and `consumeStream` still drives completion in-process. This is the one place where local-dev behavior (request stays open until `consumeStream` resolves) differs from prod (fluid keep-alive).
