# Issue #37 — Reporter Lifecycle (X-optional, monitored, autonomous) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Ship the full reporter lifecycle (signup → optional connect-X → create → save → run → review → post → schedule → autonomous post) so every run reaches a terminal state independent of the client, with X required only at post-time.

**Architecture:** Two pure run primitives — `runScanStream` (streaming `StreamTextResult`) + a new `persistRunResult` (source-agnostic terminal-state writer) — composed by three consumers (manual streaming route, scheduled cron route, prompt-lab). Completion is driven **server-side** via `result.consumeStream({ onError })` so the model is fully driven regardless of whether any browser reads the response. Cron is a Vercel-cron-triggered `POST` authenticated by constant-time `Bearer CRON_SECRET`, using a service-role Supabase client with hand-scoped `user_id`/`agent_id` filters and atomic `UPDATE ... WHERE ... RETURNING` claims for the agent lease and per-item post claim.

**Tech Stack:** Next.js App Router (TS strict, `@/*`), Vercel AI SDK v6 (`ai@6.0.206`, `@ai-sdk/xai@3.0.95`, AI Gateway), Supabase (Postgres + RLS + service-role), Biome, pnpm, no test runner.

---

## Framework primitives — verified against the installed SDK (do not substitute)

These were confirmed by reading `node_modules/ai/dist/index.d.ts` at the pinned versions. Tasks below depend on these exact shapes:

- **`streamText` accepts `timeout?: TimeoutConfiguration`** where `TimeoutConfiguration = number | { totalMs?, stepMs?, chunkMs? }` (d.ts L380). We pass `{ totalMs: 240_000 }` (under `maxDuration = 300`).
- **`streamText` accepts `abortSignal?: AbortSignal`** (L448) and **`onAbort?: StreamTextOnAbortCallback`** whose event is `{ readonly steps: StepResult[] }` (L2678) — note `onAbort` carries **no usage/output**, so the abort path persists a `failed` run, not a partial-success one.
- **`result.consumeStream(options?: ConsumeStreamOptions)` returns `PromiseLike<void>`** where `ConsumeStreamOptions = { onError?: ErrorHandler }` (L2326). This drives the model to completion server-side; `onFinish`/`onError`/`onAbort` all fire during consumption regardless of any HTTP reader.
- **`result.toUIMessageStreamResponse(options?)`** still returns the live `Response` for the browser. **Key ordering fact:** for the manual route we return `toUIMessageStreamResponse(...)` (with `onFinish` wired through the options) — the SDK internally consumes the stream to fire `onFinish` even if the client disconnects, because we do **not** depend on the client's read loop. For the cron route we never build a `Response`; we `await result.consumeStream({ onError })` then call `persistRunResult` from the awaited code path.
- **Gateway market cost** is read from `event.providerMetadata?.gateway?.marketCost` (already done in `chat/route.ts:143`) — reuse for draft/redraft instrumentation.

> **Confirm-before-coding pins** (cheap doc checks during the relevant task, do not block):
> - Vercel cron `Authorization: Bearer <CRON_SECRET>` is sent by Vercel's cron runner automatically when `CRON_SECRET` is set in project env (vercel docs: "Securing cron jobs"). We verify with `mcp__vercel__search_vercel_documentation "cron secret authorization"` at Task C-cron.
> - `ft/**` branches do NOT deploy (already encoded in `vercel.json` git.deploymentEnabled) — so cron only fires from `dev`/prod. The admin-gated manual trigger (Task C) is how we verify due-logic on a deployed preview from `dev`, or locally via curl.

---

## FILE STRUCTURE MAP

Exact paths, one responsibility each. `[NEW]` = create, `[MOD]` = modify. Line refs are from the current repo at plan-time.

### Stage A+B — Foundation + Drafts worklist (FULL bite-sized below)

**Run engine (new pure primitives):**
- `[NEW] lib/scan/persist.ts` — `persistRunResult({ supabase, runId, agentId, userId, result, startedAt, source })`: holds the body currently inline at `app/api/agents/[id]/run/route.ts:154-245` (build `run_items`, terminal `runs` update, `logUsage`). Source-agnostic; takes any `SupabaseClient`. Contains the single documented `// future: notify(...)` seam.
- `[MOD] lib/scan/run.ts:48` — add `timeout: { totalMs: 240_000 }` + accept an `abortSignal` in `RunScanInput`; pass it to `streamText`. (No `onAbort` here — `onAbort`/`onError` are wired by the consumer that owns the run row.)
- `[MOD] lib/scan/ui-stream.ts:94` — `scanToUIResponse` keeps the same signature; document that `onFinish`/`onError`/`onAbort` passed via options fire during SDK-internal consumption.

**Manual run route (becomes a thin composer):**
- `[MOD] app/api/agents/[id]/run/route.ts` — delete the `status === "inactive"` 409 (L74-78); call `runScanStream` with an `AbortController` for UX; wire `onFinish`→`persistRunResult`, `onError`+`onAbort`→ run-failed. **Add the reaper call** (see reaper file) at the top.

**Reaper + lease helpers (shared, pure-ish):**
- `[NEW] lib/scan/reaper.ts` — `reapStaleRuns(supabase, olderThanMs = 360_000)`: `UPDATE runs SET status='failed' ... WHERE status='running' AND started_at < now()-interval`. Called by both the manual route (best-effort, fire-and-forget) and the cron tick.
- `[NEW] lib/x/tokens.ts` edit at L144 — add `AbortSignal.timeout(8000)` to the `rotateAccessToken` fetch.

**Owner-explicit poster (shared by route + later cron):**
- `[NEW] lib/x/post-item.ts` — `postRunItem({ supabase, ownerUserId, item, text })`: loads `run_item → run → agent → user_id`, asserts `agent.user_id === ownerUserId`, calls `getFreshAccessToken(supabase, ownerUserId)` + `postTweet`, updates the item. Used by `post/route.ts` (RLS client) now; reused by cron auto-post in Stage C (service-role client).
- `[MOD] app/api/agents/run-items/[id]/post/route.ts` — call `postRunItem`; render a no-X path as a 400 with a machine code the client turns into the inline connect bar.

**X-decoupling:**
- `[MOD] app/api/agents/save-agent/route.ts:92-108` — remove the `if (!connection) → 403`.
- `[MOD] app/api/agents/scan/route.ts:30-41` — remove the `if (!connection) → 403`.
- `[MOD] app/dashboard/connect-x/page.tsx` — de-gate: enable a working "New agent" link; keep page as an optional connect entry.
- `[MOD] app/api/x/disconnect/route.ts:79-95` — stop setting agents `inactive`; set `auto_post = false`; success message warns N agents lost auto-post.
- `[MOD] lib/x/tokens.ts:91-99` (`saveConnection`) — stop the `inactive → active` reactivation (no longer needed once disconnect stops inactivating).

**Details page → 3-tab shell + Drafts worklist:**
- `[MOD] components/agents/agent-detail.tsx` — rewrite into a 3-tab shell (Drafts default / Schedule & autonomy / Sources). Owns shared post/redraft state + the inline connect bar.
- `[NEW] components/agents/panels/DraftsPanel.tsx` — Drafts worklist (Track B fills it): Run button, run-in-progress state, reverse-chron worklist across recent runs, actionable empty state.
- `[NEW] components/agents/panels/SchedulePanel.tsx` — placeholder in A ("Scheduling — coming soon"); Track C fills it.
- `[NEW] components/agents/panels/SourcesPanel.tsx` — wraps the existing `ConfigForm` + Save (extracted from current Settings tab).
- `[MOD] components/agents/story-card.tsx` — per-item terminal state: posted (tweet link + timestamp), failed (error), auto badge via `posted_via`; survives refresh.
- `[MOD] app/dashboard/agents/[id]/page.tsx` — fetch recent runs (last ~20) + their items; `Promise.all` independent awaits (folds D4). Pass `recentRuns` + `xConnected` + agent autonomy fields.
- `[MOD] app/dashboard/agents/page.tsx` — per-agent "N new drafts" badge (pure DB count of `drafted`, non-posted items created since a last-view marker).

**Cost instrumentation (B):**
- `[MOD] app/api/agents/run-items/[id]/redraft/route.ts` + `lib/draft/generate.ts` — `generateDraft` returns gateway market cost; redraft route logs `kind:'redraft'`. (Save-agent draft logging is part of the chat flow already; the redraft path is the dead one.)

**Folded cleanups (A, same files):**
- `[NEW] lib/x/connection-context.ts` — `buildXConnectionContext(client, userId)` (D1) dedupes `chat/route.ts:104-121` + `chat-debug/route.ts:124-142`.
- `[MOD] lib/chat/session-log.ts` — add `collectToolCalls(steps)` + shared `ToolCallLog` type (D2); module-level cached service-role client (D5).
- `[MOD] lib/usage/log.ts` — module-level cached service-role client (D5).
- `[MOD] lib/chat/discover.ts` — `runGroundedDiscovery(...)` private runner shared by `discoverHandles`/`discoverSites` (D3).
- `[MOD] components/agents/agent-detail.tsx:363` — replace inline `$${cost_usd.toFixed(4)}` with `usd()` (A6).
- `[MOD] app/globals.css` — connect-bar + Recent-dropdown classes (D6), tokenized; reused by the details-page inline connect bar.

### Stage C — Scheduling + autonomy (TASK-LEVEL OUTLINE — expand at stage start)
- `[NEW] lib/schedule/next-run.ts` — `nextRunAt(agent, after)` pure fn (DST, midnight-cross, slot anchoring); `isAgentDue(agent, now)` predicate.
- `[NEW] lib/scan/dedupe.ts` — cross-run dedupe lookback query helper.
- `[NEW] app/api/cron/scan/route.ts` — POST-only, `Bearer CRON_SECRET`, batch due-loop, atomic lease, reaper, per-agent try/catch.
- `[NEW] app/api/admin/cron-trigger/route.ts` — admin-gated manual trigger (verify due-logic on preview).
- `[NEW] lib/scan/auto-post.ts` — atomic per-item claim + transactional daily cap + kill switch + token self-heal.
- `[NEW] lib/usage/spend-cap.ts` — per-user daily USD cap check.
- `[MOD] components/agents/panels/SchedulePanel.tsx` — timezone select, plain-language summary, auto_post gated toggle.
- `[MOD] vercel.json` — `crons` entry; schema deltas migration #2.

### Stage D — Protected monitoring (TASK-LEVEL OUTLINE — expand at stage start)
- `[NEW] lib/scan/protected.ts` — resolve `x_user_id` (cache → `getUserByUsername`), `fetchRecentPosts` with user token, build tagged prompt block with real per-tweet URLs.
- `[MOD] lib/scan/run.ts` / `lib/scan/prompt.ts` — accept the protected block.
- `[MOD] lib/usage/pricing.ts` + `cost.ts` — `x_timeline` branch.
- `[MOD] components/agents/panels/SchedulePanel.tsx` (or Sources) — `protected_monitoring` toggle.
- Schema deltas migration #3 (enum `usage_kind += x_timeline`, `agents.protected_monitoring`).

---

# STAGE A+B — Foundation + reliable engine + Drafts worklist (FULL DETAIL)

> Ordering rationale (directive: framework-idiomatic correctness over generic dependency order):
> 1. **Schema first**, then **regenerate types** — every later TS task type-checks against the real generated `Database` type, so a wrong column name fails `pnpm build` immediately rather than at runtime.
> 2. **Pure-function / pure-module extractions before route rewrites** — `persistRunResult`, `postRunItem`, `reaper` are extracted and their *logic* verified (build + a tiny tsx assertion where pure) before any route depends on them. This is the no-test-runner adaptation of TDD: prove the unit, then wire it.
> 3. **The reliability fix (`consumeStream` + timeout + onAbort) lands in the engine, not the UI** — so it is correct independent of which consumer calls it. We verify the manual route still streams to the browser AND persists with the tab closed (the headline invariant) before building any UI on top.
> 4. **X-decoupling guards are removed in the same commit as the inline-connect-bar replacement** — never leave a window where Post has no path to connect.

## Task A0 — Schema migration #1 (A+B columns/enums) + regenerate types

**Files:**
- Migration applied via Supabase MCP (project `pcgvpypzfwuchyfwdlwe`) — not in-repo.
- Modify: `lib/types/database.ts` (regenerated, do not hand-edit).

Steps:

- [ ] 1. Apply migration `issue37_ab_schema` via the Supabase MCP `apply_migration` tool with this SQL (each delta is the minimum A+B needs; C/D deltas land in their own migrations):

```sql
-- agents: autonomy + heartbeat columns (defaults keep existing rows valid)
alter table public.agents
  add column if not exists auto_post boolean not null default false,
  add column if not exists auto_post_daily_cap int not null default 3,
  add column if not exists last_checked_at timestamptz null;

-- run_items: audit which posts were autonomous + transient claim state
do $$ begin
  if not exists (select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid
                 where t.typname = 'item_status' and e.enumlabel = 'posting') then
    alter type public.item_status add value 'posting';
  end if;
end $$;

alter table public.run_items
  add column if not exists posted_via text null
    check (posted_via is null or posted_via in ('manual','auto'));

-- daily-cap count index (Stage C uses it; cheap to land now)
create index if not exists run_items_agent_posted_at_idx
  on public.run_items (agent_id, posted_at) where posted_at is not null;

-- reconcile the handle cap with the config cap of 10 (was <= 20)
alter table public.agents drop constraint if exists agents_monitored_handles_check;
alter table public.agents add constraint agents_monitored_handles_check
  check (coalesce(array_length(monitored_handles, 1), 0) <= 10);

-- api_usage_events: source dimension (manual | cron | auto_post). Nullable text,
-- not an enum, so new sources never need a migration.
alter table public.api_usage_events
  add column if not exists source text null;
```

  **Note (Postgres enum gotcha):** `ALTER TYPE ... ADD VALUE 'posting'` cannot run in the same transaction as a statement that *uses* the new value. The MCP `apply_migration` runs each statement; keep the enum add in its own `do $$` block (above) and do NOT reference `'posting'` elsewhere in this migration. Stage C's auto-post is the first user of `'posting'`.

  **Note (`UNIQUE(agent_id, dedupe_key)`):** deferred to Stage C's migration on purpose — adding it now would reject legitimate same-story-across-runs rows that the manual flow currently produces, and cross-run dedupe (the consumer of that constraint) is a Stage C feature. The spec assigns it to C (§7.1).

- [ ] 2. Regenerate the types file (overwrites by hand-running the generator output into the file):

```bash
# From repo root. Writes the fresh generated types over the tracked file.
pnpm dlx supabase@latest gen types typescript --project-id pcgvpypzfwuchyfwdlwe > lib/types/database.ts
```

  If the CLI is unavailable, use the MCP `generate_typescript_types` tool and write its `types` payload to `lib/types/database.ts` verbatim.

- [ ] 3. Verify the regen picked up the deltas:

```bash
grep -nE "auto_post|auto_post_daily_cap|last_checked_at|posted_via|\"source\"" lib/types/database.ts | head
```

  Expected: lines showing `auto_post: boolean`, `auto_post_daily_cap: number`, `last_checked_at: string | null`, `posted_via: string | null`, and `source: string | null` in the `agents` / `run_items` / `api_usage_events` Row+Insert+Update blocks. Confirm `item_status` enum union now includes `"posting"`.

- [ ] 4. Verify the project still builds against the new types:

```bash
pnpm build
```

  Expected: exit 0 (existing code does not reference the new columns yet, so this is a pure type-surface widening).

- [ ] 5. Commit:

```bash
git add lib/types/database.ts && git commit -m "feat(db): add auto_post/cap/last_checked_at, posted_via, item_status+=posting, usage.source; reconcile handle cap to 10

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task A1 — Extract `persistRunResult` (the source-agnostic terminal-state writer)

This lifts the body currently inline at `app/api/agents/[id]/run/route.ts:154-245` into a pure module that any consumer (manual route, cron) can call. It takes the `SupabaseClient` so the caller decides RLS vs service-role.

**Files:**
- Create: `lib/scan/persist.ts`

Steps:

- [ ] 1. Create `lib/scan/persist.ts` with the full function (note: it accepts the already-created `runId` + the `result` from `runScanStream`, awaits `result.output` + `extractMetrics`, and writes the terminal state). The `source` parameter feeds the new `api_usage_events.source` dimension:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StreamTextResult, ToolSet } from "ai";
import { SCAN_MODEL } from "@/lib/ai/providers";
import { extractMetrics, storiesFromOutput } from "@/lib/scan/ui-stream";
import type { Database } from "@/lib/types/database";
import type { RunItemInsert } from "@/lib/types";
import { logUsage } from "@/lib/usage/log";

// biome-ignore lint/suspicious/noExplicitAny: mirrors ui-stream.ts ScanResult — OUTPUT generic only affects result.output typing.
type ScanResult = StreamTextResult<ToolSet, any>;

export interface PersistRunResultInput {
  /** RLS client (manual route) or service-role client (cron). The caller owns the choice. */
  supabase: SupabaseClient<Database>;
  /** The runs row id, created up front with status='running'. */
  runId: string;
  agentId: string;
  /** Owner of the agent — used for usage attribution. */
  userId: string;
  /** The streaming result from runScanStream (already being consumed by the caller). */
  result: ScanResult;
  /** Date.now() captured before runScanStream, for elapsed metrics. */
  startedAt: number;
  /** Attribution dimension for api_usage_events.source. */
  source: "manual" | "cron" | "auto_post";
}

/**
 * Drive a finished scan result into terminal DB state: build run_items, update the
 * runs row to completed/failed, and log usage. Source-agnostic and client-agnostic
 * so the manual route (RLS client, onFinish) and the cron tick (service-role client,
 * after consumeStream) share one persistence path. Never throws — all failures land
 * the run in a terminal 'failed' state.
 */
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
      source,
      input_tokens: metrics.inputTokens,
      output_tokens: metrics.outputTokens,
      xSearchCalls: metrics.xSearchCalls,
      metadata: {
        elapsedMs: metrics.elapsedMs,
        xSearchCalls: metrics.xSearchCalls,
        storyCount: runItems.length,
      },
    });

    // future: notify(userId, { runId, agentId, itemCount: runItems.length }) — breaking-news
    // channels (email / WhatsApp / push) go here. No interface/emitter/registry yet (YAGNI, spec §2.3).
  } catch (error) {
    console.error("persistRunResult failed", error);
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

  **Framework note:** `source` is a new field on `UsageEvent` — it flows straight to the `Insert` row because Task A0 added the `api_usage_events.source` column and regenerated the type. `logUsage` spreads `...rest`, so once the column exists the field passes through with no edit to `logUsage`. (Confirm by inspecting `lib/usage/log.ts:44` — `const row: Insert = { ...rest, ... }`.)

- [ ] 2. Verify it type-checks (the route still has its own inline copy at this point — that's fine; we wire the route in A2):

```bash
pnpm build
```

  Expected: exit 0. If `source` errors as "not assignable", the A0 regen missed the column — fix A0 step 3 first.

- [ ] 3. Lint the new file:

```bash
pnpm exec biome check --write lib/scan/persist.ts
```

  Expected: "Checked 1 file" with no remaining errors.

- [ ] 4. Commit:

```bash
git add lib/scan/persist.ts && git commit -m "feat(scan): extract persistRunResult — source-agnostic terminal-state writer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task A2 — Engine reliability: timeout + abortSignal in `runScanStream`; reaper module

**Files:**
- Modify: `lib/scan/run.ts` (L8-19 interface, L48 streamText)
- Modify: `lib/x/tokens.ts` (L144 fetch — add timeout)
- Create: `lib/scan/reaper.ts`

Steps:

- [ ] 1. In `lib/scan/run.ts`, add an optional `abortSignal` to `RunScanInput` and pass `timeout` + `abortSignal` to `streamText`. Replace the interface and the `streamText({ ... })` call. The full interface:

```ts
export interface RunScanInput {
  /** Whether to monitor X at all (binds the xSearch tool). */
  searchX: boolean;
  handles: string[];
  fromDate: string | null;
  toDate: string | null;
  scanningInstructions: string;
  draftingInstructions: string;
  exampleTweets: string[];
  searchWeb: boolean;
  preferredDomains: string[];
  /** UX abort (client stop button / cron deadline). Correctness still comes from the
   *  consumer's onAbort/onError → run-failed wiring, never from this signal alone. */
  abortSignal?: AbortSignal;
}
```

  And add these two options to the existing `streamText({ ... })` call (insert after `maxOutputTokens: 1_000_000,`, before `output:`):

```ts
    // Bound the model call so a hung Grok response fails the run instead of riding
    // to the 300s maxDuration wall and orphaning it. 240s leaves headroom under maxDuration.
    timeout: { totalMs: 240_000 },
    abortSignal: input.abortSignal,
```

  Leave the existing `maxOutputTokens`, `output`, `providerOptions`, and the `no_inline_citations` comment unchanged.

- [ ] 2. In `lib/x/tokens.ts`, bound the token-refresh fetch. Change the `fetch(X_TOKEN_ENDPOINT, { ... })` call (currently L144) to add a signal — insert `signal: AbortSignal.timeout(8000),` as the last property of the options object (after `body: ...`):

```ts
  const response = await fetch(X_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
    signal: AbortSignal.timeout(8000),
  });
```

  (This matches the existing `AbortSignal.timeout(8000)` convention already used in `lib/x/client.ts:187,243,288`.)

- [ ] 3. Create `lib/scan/reaper.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/** Default stale threshold: covers the 300s maxDuration wall + crash/deploy slack. */
export const STALE_RUN_MS = 360_000;

/**
 * Force-fail any run stuck at status='running' whose started_at is older than the
 * threshold. Covers crashes, mid-run deploys, and the maxDuration wall — the cases
 * where neither onFinish nor onAbort ever fires. Non-throwing; returns the count
 * reaped (0 on any error). The caller passes the client (RLS for the manual route
 * scopes to the owner's runs; service-role for cron sweeps all users).
 */
export async function reapStaleRuns(
  supabase: SupabaseClient<Database>,
  olderThanMs: number = STALE_RUN_MS,
): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - olderThanMs).toISOString();
    const { data, error } = await supabase
      .from("runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: "Run exceeded the maximum duration and was marked failed.",
      })
      .eq("status", "running")
      .lt("started_at", cutoff)
      .select("id");
    if (error) {
      console.error("reapStaleRuns failed", error);
      return 0;
    }
    return data?.length ?? 0;
  } catch (error) {
    console.error("reapStaleRuns threw", error);
    return 0;
  }
}
```

  **Framework note (why this is safe under RLS):** the manual route calls this with the RLS client, so the `UPDATE` only touches the current user's `running` runs (RLS owner scope on `runs`). The cron tick (Stage C) calls it with the service-role client to sweep all users. The same code, two scopes — exactly the engine-not-UI discipline.

- [ ] 4. Verify build + lint:

```bash
pnpm build && pnpm exec biome check --write lib/scan/run.ts lib/x/tokens.ts lib/scan/reaper.ts
```

  Expected: build exit 0; biome reports the three files checked, no errors.

- [ ] 5. Commit:

```bash
git add lib/scan/run.ts lib/x/tokens.ts lib/scan/reaper.ts && git commit -m "feat(scan): bound the model call (timeout+abortSignal), bound token refresh, add stale-run reaper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task A3 — Manual run route: server-driven completion + de-gate inactive

**The headline reliability fix.** Today the run only finishes if the browser drains the stream (`agent-detail.tsx:157` `while (true) reader.read()`). We make completion server-side so a closed tab never orphans a run, while keeping the browser stream as pure UX progress.

**The framework-correct way:** `toUIMessageStreamResponse({ onFinish, onError })` already drives the model server-side to fire `onFinish` even if the client disconnects (the SDK consumes the stream to resolve `onFinish`). We do NOT need a separate `consumeStream` call for the manual route — wiring `onFinish` → `persistRunResult` is sufficient and is the idiomatic streaming-route pattern. We add `onAbort` for the timeout/abort path (which `onFinish` does NOT cover) and keep `onError` for stream errors. (`consumeStream` is the right tool for the cron route, Stage C, where there is no `Response`.)

**Files:**
- Modify: `app/api/agents/[id]/run/route.ts`

Steps:

- [ ] 1. Replace the imports block at the top of `app/api/agents/[id]/run/route.ts` (currently L1-7) with:

```ts
// Imports
import { runScanStream } from "@/lib/scan/run";
import { scanToUIResponse } from "@/lib/scan/ui-stream";
import { persistRunResult } from "@/lib/scan/persist";
import { reapStaleRuns } from "@/lib/scan/reaper";
import { createClient } from "@/lib/supabase/server";
import type { Agent } from "@/lib/types";
```

  (We drop `SCAN_MODEL`, `extractMetrics`, `storiesFromOutput`, `RunItemInsert`, and `logUsage` — they now live in `persist.ts`.)

- [ ] 2. Delete the inactive-status 409 block (currently L74-78):

```ts
  if (agent.status === "inactive") {
    return new Response("Reconnect X to reactivate this agent.", {
      status: 409,
    });
  }
```

  Rationale (spec §5.1): X-decoupling means a saved agent runs with zero X connection; `inactive` no longer gates running. The `search_x || search_web` guard (L82-86) stays — that's the real "needs a source" check.

- [ ] 3. Immediately after `const supabase = await createClient();` (L45) and the auth guard, add a best-effort reaper sweep (fire-and-forget so it never delays the run):

```ts
  // Best-effort: sweep this owner's orphaned runs before starting a new one.
  // RLS scopes the reaper to the current user's runs. Do not await — never block the run.
  void reapStaleRuns(supabase);
```

- [ ] 4. Replace the entire `runScanStream(...)` + `return scanToUIResponse(...)` tail (currently L126-247) with the new composer. Note: an `AbortController` is created for UX symmetry (so a future client "stop" can abort the model), and `onFinish`/`onError`/`onAbort` all route to the shared persistence:

```ts
  const startedAt = Date.now();
  // UX-only abort controller — wired to the model so a client stop (future) or the
  // SDK timeout can abort cleanly. Correctness comes from onFinish/onAbort persistence,
  // NOT from any client read loop.
  const controller = new AbortController();

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
    abortSignal: controller.signal,
  });

  return scanToUIResponse(result, {
    // onFinish fires during SDK-internal stream consumption — runs even if the browser
    // disconnects (closed tab / nav / mobile background). This is the never-hang fix.
    onFinish: async () => {
      await persistRunResult({
        supabase,
        runId,
        agentId: agent.id,
        userId: user.id,
        result,
        startedAt,
        source: "manual",
      });
    },
    // Stream error before completion — mark the run failed (best-effort, do not await).
    onError: (error) => {
      supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Stream error.",
        })
        .eq("id", runId)
        .then(undefined, (e) => console.error("onError run update failed", e));
      return error instanceof Error ? error.message : "An error occurred.";
    },
    // Timeout / abort — onFinish does NOT fire on abort, so close the run here.
    onAbort: () => {
      supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "Run was aborted (timeout or stop).",
        })
        .eq("id", runId)
        .then(undefined, (e) => console.error("onAbort run update failed", e));
    },
  });
```

  **Framework note (`scanToUIResponse` options typing):** the current signature is `scanToUIResponse(result, options?: UIMessageStreamOptions<never>)`. `UIMessageStreamOptions` includes `onFinish`/`onError` but **not** `onAbort` — `onAbort` is a `streamText` option, not a `toUIMessageStreamResponse` option. So `onAbort` must be passed to **`runScanStream`/`streamText`**, not to `scanToUIResponse`. Correct wiring: pass `onAbort` through `runScanStream`. **Adjust Task A2** to also accept an `onAbort` callback OR (cleaner) have the route own the run-failed update by passing `onAbort` into `streamText` via a new optional `RunScanInput.onAbort`. Implement it as: add `onAbort?: () => void` to `RunScanInput`, pass it to `streamText`, and move the `onAbort` block above into the `runScanStream({ ..., onAbort: () => { ...run-failed update... } })` call. Keep only `onFinish` + `onError` in the `scanToUIResponse` options. (This is the one place the generic-plan ordering would silently put `onAbort` in the wrong options bag — verify against the d.ts: `UIMessageStreamOptions` has no `onAbort`.)

- [ ] 5. Apply the A2 adjustment: in `lib/scan/run.ts` add `onAbort?: () => void;` to `RunScanInput` and pass `onAbort: input.onAbort,` to `streamText` (alongside `timeout`/`abortSignal`). Re-commit A2's file or fold into this commit.

- [ ] 6. Verify build + lint:

```bash
pnpm build && pnpm exec biome check --write "app/api/agents/[id]/run/route.ts" lib/scan/run.ts
```

  Expected: exit 0; no biome errors. Confirm no unused-import warnings (the dropped imports must be gone).

- [ ] 7. **Route verification (curl against `pnpm dev`)** — the never-hang invariant. Start dev, log in as the test user in a browser to get a session cookie, copy it, then:

```bash
# Replace <AGENT_ID> with a saved agent owned by the test user, and <COOKIE> with the
# sb-* auth cookie from the logged-in browser session.
# A) Normal completion — drain the stream:
curl -sS -N -X POST "http://localhost:3000/api/agents/<AGENT_ID>/run" \
  -H "Cookie: <COOKIE>" | head -c 400; echo

# B) The orphan test — start the run, then KILL the client mid-stream:
timeout 3 curl -sS -N -X POST "http://localhost:3000/api/agents/<AGENT_ID>/run" \
  -H "Cookie: <COOKIE>" >/dev/null; echo "client killed at 3s"
```

  Then verify in the DB (Supabase MCP `execute_sql`) that BOTH runs reached a terminal state:

```sql
select id, status, item_count, error_message,
       extract(epoch from (completed_at - started_at)) as secs
from public.runs
where agent_id = '<AGENT_ID>'
order by started_at desc limit 4;
```

  Expected: the killed-client run (B) still becomes `completed` (or `failed`), NOT stuck at `running` — proving server-driven completion. (Allow up to ~the scan duration before checking B.)

- [ ] 8. Commit:

```bash
git add "app/api/agents/[id]/run/route.ts" lib/scan/run.ts && git commit -m "feat(scan): server-driven run completion via persistRunResult; de-gate inactive; onAbort run-failed

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task A4 — Owner-explicit shared poster (`postRunItem`) + post route rewrite

**Security-critical (spec §5.3 / §10):** today `post/route.ts:58-62` selects the item with **no owner filter** — safe only because the RLS request client scopes it. Cron (Stage C) uses a service-role client that bypasses RLS, so without an explicit ownership assertion a buggy cron due-query could post agent A's draft with user B's token (cross-account posting). We extract a poster that asserts ownership **in code** and is client-agnostic.

**Files:**
- Create: `lib/x/post-item.ts`
- Modify: `app/api/agents/run-items/[id]/post/route.ts`

Steps:

- [ ] 1. Create `lib/x/post-item.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDraftIssue } from "@/lib/draft/validate";
import type { Database } from "@/lib/types/database";
import { postTweet } from "@/lib/x/client";
import { getFreshAccessToken } from "@/lib/x/tokens";

export type PostItemResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string; status: number; code?: "no_x_connection" };

interface OwnedItem {
  id: string;
  agent_id: string;
  drafted_text: string;
  final_text: string | null;
  status: Database["public"]["Enums"]["item_status"];
  agents: { user_id: string } | null;
}

/**
 * Post one run item to X as its owner. Loads the item joined to its agent's user_id and
 * ASSERTS agent.user_id === ownerUserId before posting — the regression guard that keeps a
 * service-role caller (cron) from cross-account posting. The caller passes the client (RLS
 * for the route, service-role for cron) and the ownerUserId whose token to use.
 *
 * @param postedVia 'manual' (route) or 'auto' (cron) — written to run_items.posted_via.
 */
export async function postRunItem(args: {
  supabase: SupabaseClient<Database>;
  ownerUserId: string;
  itemId: string;
  requestedText?: string;
  postedVia: "manual" | "auto";
}): Promise<PostItemResult> {
  const { supabase, ownerUserId, itemId, requestedText, postedVia } = args;

  const { data: item, error: itemError } = await supabase
    .from("run_items")
    .select("id, agent_id, drafted_text, final_text, status, agents(user_id)")
    .eq("id", itemId)
    .maybeSingle<OwnedItem>();

  if (itemError) return { ok: false, error: "Failed to load draft.", status: 500 };
  if (!item) return { ok: false, error: "Draft not found.", status: 404 };

  // Ownership assertion — the cross-account-posting guard. Never trust RLS alone here.
  if (!item.agents || item.agents.user_id !== ownerUserId) {
    return { ok: false, error: "Draft not found.", status: 404 };
  }
  if (item.status === "posted") {
    return { ok: false, error: "Draft is already posted.", status: 409 };
  }

  const text = (requestedText && requestedText.trim()) || item.final_text || item.drafted_text;
  const issue = getDraftIssue(text);
  if (issue) return { ok: false, error: issue, status: 400 };

  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(supabase, ownerUserId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No X connection for this user.";
    return { ok: false, error: message, status: 400, code: "no_x_connection" };
  }

  const result = await postTweet(accessToken, text);
  if (!result.ok) {
    await supabase
      .from("run_items")
      .update({ status: "failed", final_text: text, error_message: result.error })
      .eq("id", item.id);
    return { ok: false, error: result.error, status: result.status };
  }

  const { error: updateError } = await supabase
    .from("run_items")
    .update({
      status: "posted",
      final_text: text,
      x_tweet_id: result.id,
      x_tweet_url: result.url,
      posted_at: new Date().toISOString(),
      posted_via: postedVia,
      error_message: null,
    })
    .eq("id", item.id);

  if (updateError) {
    return { ok: false, error: "Tweet posted, but the item could not be updated.", status: 500 };
  }
  return { ok: true, id: result.id, url: result.url };
}
```

  **Framework note (Supabase embedded select):** `.select("..., agents(user_id)")` uses the FK `run_items_agent_id_fkey` (verified present) to embed the parent. The result row's `agents` is an object (to-one) — typed `{ user_id: string } | null`. This works under both the RLS client and service-role.

- [ ] 2. Rewrite `app/api/agents/run-items/[id]/post/route.ts` to delegate to `postRunItem`. Keep auth + body parsing; the no-X path returns the 400 with a `code` the client uses to show the inline connect bar:

```ts
// Imports
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postRunItem } from "@/lib/x/post-item";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const rawBody = (await req.json().catch(() => null)) as unknown;
  const body = typeof rawBody === "object" && rawBody !== null ? rawBody : {};
  const requestedText =
    typeof (body as { finalText?: unknown }).finalText === "string"
      ? (body as { finalText: string }).finalText
      : undefined;

  const result = await postRunItem({
    supabase,
    ownerUserId: user.id,
    itemId: id,
    requestedText,
    postedVia: "manual",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.code ? { code: result.code } : {}) },
      { status: result.status },
    );
  }
  return NextResponse.json({ id: result.id, url: result.url });
}
```

- [ ] 3. Verify build + lint:

```bash
pnpm build && pnpm exec biome check --write lib/x/post-item.ts "app/api/agents/run-items/[id]/post/route.ts"
```

  Expected: exit 0; no errors.

- [ ] 4. **Route verification (curl)** — ownership guard + no-X code. With a posted-eligible `<ITEM_ID>` and the test user cookie:

```bash
# Owner with X connected → 200 (or 4xx from X if the draft is invalid):
curl -sS -X POST "http://localhost:3000/api/agents/run-items/<ITEM_ID>/post" \
  -H "Cookie: <COOKIE>" -H "Content-Type: application/json" -d '{}' -w "\nHTTP %{http_code}\n"

# Cross-account: an item id NOT owned by the cookie's user → expect HTTP 404 (ownership assert):
curl -sS -X POST "http://localhost:3000/api/agents/run-items/<OTHER_USERS_ITEM_ID>/post" \
  -H "Cookie: <COOKIE>" -H "Content-Type: application/json" -d '{}' -w "\nHTTP %{http_code}\n"
```

  Expected: own item → 200/4xx-from-X; other user's item → `HTTP 404`. To test the no-X code, disconnect X for the test user, then POST own item → `{"error":"No X connection for this user.","code":"no_x_connection"}` with `HTTP 400`.

- [ ] 5. Commit:

```bash
git add lib/x/post-item.ts "app/api/agents/run-items/[id]/post/route.ts" && git commit -m "feat(x): owner-explicit shared poster with ownership assertion + posted_via; post route delegates

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task A5 — X-decoupling: remove gates, de-gate connect-x, soften disconnect

**Files:**
- Modify: `app/api/agents/save-agent/route.ts` (L92-108)
- Modify: `app/api/agents/scan/route.ts` (L30-41)
- Modify: `app/api/x/disconnect/route.ts` (L79-95)
- Modify: `lib/x/tokens.ts` `saveConnection` (L91-99)
- Modify: `app/dashboard/connect-x/page.tsx`

Steps:

- [ ] 1. In `app/api/agents/save-agent/route.ts`, delete the connection 403 block (L92-108): the `const { data: connection } = ...` through the `if (!connection) { return ... 403 }`. Save must work with zero X.

- [ ] 2. In `app/api/agents/scan/route.ts`, delete the connection 403 block (L30-41) — the prompt-lab scan does not need X to be connected (it scans via the app-level xAI provider).

- [ ] 3. In `app/api/x/disconnect/route.ts`, replace the `agents` update block (L79-95) so disconnecting turns OFF auto-post instead of marking agents inactive, and reports the count:

```ts
  // Disconnecting X turns off autonomous posting (a live token is required for auto-post),
  // but agents keep running manually + scanning. Do NOT mark agents inactive (X is optional).
  const { data: affected, error: agentsError } = await supabase
    .from("agents")
    .update({ auto_post: false })
    .eq("user_id", user.id)
    .eq("auto_post", true)
    .select("id");

  if (agentsError) {
    return NextResponse.json(
      { error: "Disconnected X, but failed to update agent auto-posting." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    autoPostDisabledCount: affected?.length ?? 0,
  });
```

  Delete the old final `return NextResponse.json({ ok: true });`.

- [ ] 4. In `lib/x/tokens.ts` `saveConnection`, delete the `agents` reactivation block (L91-99 — the `update({ status: "active" }).eq("status", "inactive")`) and just `return null` after the `x_connections` upsert (since disconnect no longer inactivates agents, there is nothing to reactivate). Update the JSDoc to drop the reactivation mention.

- [ ] 5. De-gate `app/dashboard/connect-x/page.tsx`: change the disabled "New agent" button to a working `Link` to `/dashboard/agents/new`, and reword the empty state so X is optional. Replace the `action={<button ... disabled>...}` with:

```tsx
        action={
          <Link href="/dashboard/agents/new" className="btn btn-primary">
            <PlusIcon width={16} height={16} />
            <span>New agent</span>
          </Link>
        }
```

  Add `import Link from "next/link";` at the top, and change the empty-state copy from "Please connect your X account to create agents." to "Connect X to post drafts and use your own posts as writing samples — optional, you can create and run agents without it." Keep the `connectError` block and `ConnectXButton`. **Keep the `redirect(nextPath)` when already connected** (the OAuth `?next=` contract) and keep `getSafeNextPath`/`isSafeNextPath`.

- [ ] 6. **Redirect audit (spec §5.1 "map every redirect to connect-x"):** grep and confirm nothing still force-funnels users to connect-x:

```bash
grep -rn "connect-x\|/dashboard/connect-x" app/ components/ lib/ | grep -v node_modules
```

  Expected funnel points and their post-change status (note each in the commit body):
  - `app/auth/callback/route.ts` `CONNECT_X_PATH` — this is the OAuth *return* target; keep (it's where the connect flow lands, not a gate).
  - `components/dashboard/workspace-shell.tsx:143` — pathname check for active-nav highlighting; harmless, keep.
  - No `redirect("/dashboard/connect-x")` should remain as a hard gate from agents/new or save. Confirm `app/dashboard/agents/new/page.tsx` and the layout do NOT redirect to connect-x.

- [ ] 7. Verify build + lint:

```bash
pnpm build && pnpm exec biome check --write app/api/agents/save-agent/route.ts app/api/agents/scan/route.ts app/api/x/disconnect/route.ts lib/x/tokens.ts app/dashboard/connect-x/page.tsx
```

- [ ] 8. Commit:

```bash
git add app/api/agents/save-agent/route.ts app/api/agents/scan/route.ts app/api/x/disconnect/route.ts lib/x/tokens.ts app/dashboard/connect-x/page.tsx && git commit -m "feat(x): make X optional — drop save/scan 403 gates, de-gate connect-x, disconnect disables auto_post (not inactive)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task A6 — Connect-bar CSS to globals (D6); details-page inline connect bar

The Post-with-no-X path (spec §5.3) renders an inline connect-X bar on the details page — reusing the `agent-chat.tsx` connect-bar pattern. First move that pattern's inline `oklch()` styles into `globals.css` `@layer components`, tokenized.

**Files:**
- Modify: `app/globals.css` (CSS is PostCSS-owned, excluded from Biome — do not run biome on it)
- Modify: `components/agents/agent-chat.tsx` (replace the inline-styled connect bar + Recent dropdown with the new classes)

Steps:

- [ ] 1. In `app/globals.css`, inside the existing `@layer components { ... }` block, add the connect-bar + recent-dropdown classes using existing tokens (`--brand`, `--brand-ring`, `--inset`, `--line`, `--faint`):

```css
  .x-connect-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid var(--brand-ring);
    background: color-mix(in oklch, var(--brand) 6%, transparent);
  }
  .x-connect-bar > span {
    color: var(--faint);
    font: 400 0.8125rem/1.35 var(--font-sans);
  }
  /* Recent-dropdown surface (moved from agent-chat inline oklch) */
  .ws-recent-menu {
    background: var(--inset);
    border: 1px solid var(--line);
    box-shadow: 0 8px 24px oklch(0 0 0 / 0.5);
  }
```

  (Confirm `--brand`/`--brand-ring`/`--inset`/`--line`/`--faint` exist — they do, at `app/globals.css:51,52,19,21,33`.)

- [ ] 2. In `components/agents/agent-chat.tsx`, replace the inline-styled connect bar (L709-740, the `<div style={{ ... oklch(...) ...}}>`) with `<div className="x-connect-bar">`, keeping the inner `<span>` text and the `Connect X` button (drop the per-element inline styles now covered by the class). Replace the Recent-dropdown inline `oklch` styles (L555-558) with `className="ws-recent-menu"`.

- [ ] 3. Verify build (CSS is not Biome-linted; only TS files):

```bash
pnpm build && pnpm exec biome check --write components/agents/agent-chat.tsx
```

  Expected: exit 0. (Biome must NOT be pointed at globals.css — Tailwind v4 at-rules don't parse.)

- [ ] 4. Commit:

```bash
git add app/globals.css components/agents/agent-chat.tsx && git commit -m "refactor(ui): move connect-bar + recent-dropdown styles to globals.css (tokenized)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task A7 — Details page server load: recent runs + Promise.all (D4) + autonomy fields

**Files:**
- Modify: `app/dashboard/agents/[id]/page.tsx`

Steps:

- [ ] 1. Replace the sequential awaits (agent → latestRun → items → connection, L52-97) with a recent-runs fetch + parallelized loads. The page now loads the last ~20 runs and ALL their items (the Drafts worklist groups across runs):

```ts
  const { id } = await params;
  const supabase = await createClient();

  // Agent first (notFound short-circuits the rest).
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle<AgentDetailRow>();
  if (!agent) notFound();

  // Recent runs (last 20) + X connection in parallel (D4).
  const [runsRes, connRes] = await Promise.all([
    supabase
      .from("runs")
      .select("id, status, started_at, completed_at, cost_usd, x_search_count, item_count, error_message, source")
      .eq("agent_id", id)
      .order("started_at", { ascending: false })
      .limit(20),
    supabase.from("x_connections").select("id").maybeSingle<{ id: string }>(),
  ]);

  const recentRuns = (runsRes.data ?? []) as RunRow[];

  // Items across those runs (one query, IN the run ids), newest first.
  let items: ItemRow[] = [];
  if (recentRuns.length > 0) {
    const { data: itemRows } = await supabase
      .from("run_items")
      .select(
        "id, run_id, agent_id, story_title, story_summary, source_urls, primary_tweet_url, drafted_text, final_text, status, x_tweet_url, x_tweet_id, posted_at, posted_via, error_message, created_at",
      )
      .in(
        "run_id",
        recentRuns.map((r) => r.id),
      )
      .order("created_at", { ascending: false });
    items = (itemRows ?? []) as ItemRow[];
  }

  const config = columnsToConfig(agent);
```

- [ ] 2. Extend the `RunRow` and `ItemRow` `Pick<...>` types at the top of the file to include the new fields used above (`source` on Run; `agent_id, x_tweet_id, posted_at, posted_via, created_at` on Item). Update the `<AgentDetail .../>` props to pass `recentRuns={recentRuns}`, `items={items}`, `xConnected={Boolean(connRes.data)}`, and the agent row (which now carries `auto_post`, `auto_post_daily_cap`, `last_checked_at` from A0).

- [ ] 3. Verify build + lint:

```bash
pnpm build && pnpm exec biome check --write "app/dashboard/agents/[id]/page.tsx"
```

  (Build will fail until `AgentDetail`'s prop types are updated in A8 — that's expected; complete A8 before re-running, OR temporarily widen props. Note this coupling: A7 + A8 land in one commit.)

## Task A8 — `agent-detail.tsx` → 3-tab shell + DraftsPanel/SchedulePanel/SourcesPanel

**Files:**
- Modify: `components/agents/agent-detail.tsx` (rewrite to a thin tab shell + shared state)
- Create: `components/agents/panels/DraftsPanel.tsx`
- Create: `components/agents/panels/SchedulePanel.tsx`
- Create: `components/agents/panels/SourcesPanel.tsx`

Steps:

- [ ] 1. Rewrite `agent-detail.tsx` so it: holds the shared per-item state (postingId, redraftingId, redraftedTexts, postedUrls seeded from `x_tweet_url`), the inline-connect-bar trigger (when a Post returns `code:"no_x_connection"`, render `<div className="x-connect-bar">` with a Connect button that calls `startXConnect('/dashboard/agents/<id>?item=<itemId>')`), the Run handler (KEEP the response-drain loop but document it as pure UX — the route now persists server-side regardless), and three tabs:

```tsx
type TabValue = "drafts" | "schedule" | "sources";
// default tab: "drafts"
```

  The Run handler keeps the existing fetch + drain loop from `handleRun` (L143-170), but the comment changes to: "Drain is pure UX progress — the route persists via onFinish even if this loop never runs (closed tab safe)." Replace `disabled={running || !xConnected}` with `disabled={running}` and DELETE the "Connect X to run" hint (current L320-330). Replace the inline `$${latestRun.cost_usd.toFixed(4)}` (L363) with `usd(latestRun.cost_usd)` (import `usd` from `@/lib/usage/format`) — this is cleanup A6.

- [ ] 2. Create `components/agents/panels/SourcesPanel.tsx` — extract the current Settings tab (ConfigForm + Save settings button). Props: `{ config, onChange, onSave, saving }`. Move the `handleSaveSettings` PATCH logic up to `agent-detail.tsx` and pass `onSave` down (the panel is presentational).

- [ ] 3. Create `components/agents/panels/SchedulePanel.tsx` — Stage-A placeholder:

```tsx
export function SchedulePanel() {
  return (
    <p style={{ margin: 0, font: "400 0.9375rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
      Scheduling &amp; autonomous posting are coming soon. For now, run this agent manually from
      the Drafts tab.
    </p>
  );
}
```

  (Track C replaces this body — A creates the file so C edits a disjoint file from B's DraftsPanel, killing the three-way collision per spec §5.4.)

- [ ] 4. Create `components/agents/panels/DraftsPanel.tsx` — the Drafts worklist (Track B fills this; A gives it the working scaffold). It receives `recentRuns`, `items` (already across runs), the per-item handlers, `running`, `onRun`, `xConnected`, and the inline-connect-bar trigger. Render: the Run button, a run-in-progress row when `running` (mirror the chat ThinkingRow or at minimum "Scanning your beat…"), then items grouped by run (run metadata as a group header via `usd()` cost + relative time), each as a `StoryCard`. Empty state (no items, latest run completed): actionable copy "No stories matched — loosen your scanning instructions or widen the window" linking to the Sources tab.

- [ ] 5. Verify build + lint (A7 + A8 together now type-check):

```bash
pnpm build && pnpm exec biome check --write components/agents/agent-detail.tsx components/agents/panels/*.tsx "app/dashboard/agents/[id]/page.tsx"
```

  Expected: exit 0; no errors.

- [ ] 6. **UI verification (browser-agent checklist):**
  - Navigate to `/dashboard/agents/<id>`. Expected: three tabs visible — "Drafts" (active), "Schedule & autonomy", "Sources".
  - Click "Run saved agent" on Drafts. Expected: a run-in-progress indicator appears; after completion the worklist shows the new run's stories grouped under a run header with cost.
  - Click "Sources". Expected: the ConfigForm renders with Save settings.
  - Click "Schedule & autonomy". Expected: the "coming soon" placeholder.
  - With X NOT connected, click Post on a draft. Expected: an inline connect-X bar appears beneath the item (NOT a toast), with a Connect X button.

- [ ] 7. Commit:

```bash
git add components/agents/agent-detail.tsx components/agents/panels/ "app/dashboard/agents/[id]/page.tsx" && git commit -m "feat(agents): 3-tab details shell (Drafts/Schedule/Sources); recent-runs worklist load; usd() cost

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task B1 — Per-item terminal state in `story-card.tsx` (survives refresh)

Today posted state is optimistic-only (`agent-detail.tsx:99-106` seeds from `x_tweet_url` but the card shows no posted/failed badge). Render real terminal state from the DB so it survives a refresh, and badge auto-posted items.

**Files:**
- Modify: `components/agents/story-card.tsx`

Steps:

- [ ] 1. Extend `StoryCardProps` with the DB-derived terminal fields (the panel passes these from the `ItemRow`):

```ts
export interface StoryCardProps {
  story: PreviewStory;
  onDraftChange?: (text: string) => void;
  onPost?: () => void;
  onRedraft?: () => void;
  posting?: boolean;
  redrafting?: boolean;
  /** Terminal state from the DB (detail page) — survives refresh. */
  status?: "drafted" | "posted" | "failed" | "posting";
  postedUrl?: string | null;
  postedAt?: string | null;
  postedVia?: "manual" | "auto" | null;
  errorMessage?: string | null;
}
```

- [ ] 2. In the render, when `status === "posted"` (or `postedUrl` is set), replace the Post button with a tweet link + timestamp + an "Auto" badge when `postedVia === "auto"`:

```tsx
      {/* Posted terminal state */}
      {postedUrl ? (
        <div className="ws-item-posted">
          <a href={postedUrl} target="_blank" rel="noopener noreferrer" className="ws-link">
            View on X
          </a>
          {postedAt && (
            <span style={{ color: "var(--faint)", font: "400 0.75rem/1 var(--font-sans)" }}>
              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(postedAt))}
            </span>
          )}
          {postedVia === "auto" && <span className="wbadge">Auto</span>}
        </div>
      ) : (
        /* ...existing action buttons (Post / Redraft) ... */
      )}
      {/* Failed terminal state */}
      {status === "failed" && errorMessage && (
        <p style={{ margin: "8px 0 0", color: "var(--err)", font: "400 0.8125rem/1.4 var(--font-sans)" }}>
          {errorMessage}
        </p>
      )}
```

  Wrap the existing `{hasActions && (...)}` action block in the `postedUrl ? (...) : (...)` ternary's else branch.

- [ ] 3. In `DraftsPanel.tsx`, pass each item's DB fields to its `StoryCard` (`status={item.status}`, `postedUrl={postedUrls[item.id] ?? item.x_tweet_url}`, `postedAt={item.posted_at}`, `postedVia={item.posted_via}`, `errorMessage={item.error_message}`).

- [ ] 4. Add a `.ws-item-posted` class to `app/globals.css` `@layer components` (flex row, gap, align center).

- [ ] 5. Verify build + lint + browser:

```bash
pnpm build && pnpm exec biome check --write components/agents/story-card.tsx components/agents/panels/DraftsPanel.tsx
```

  Browser: post a draft, then hard-refresh the page. Expected: the item still shows "View on X" + timestamp (NOT the Post button) — proving it reads DB terminal state, not optimistic-only.

- [ ] 6. Commit:

```bash
git add components/agents/story-card.tsx components/agents/panels/DraftsPanel.tsx app/globals.css && git commit -m "feat(agents): per-item terminal state (posted link/time, failed error, auto badge) survives refresh

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task B2 — In-app "N new drafts" badge on the agents list

Replaces cut notifications (spec §6). A per-agent count of drafted, non-posted items rendered as a badge on each `agents/page.tsx` row. Pure DB query, no new table. "New" = `drafted` items the user hasn't viewed; absent a per-view table we use the agent's `last_checked_at` heartbeat is the cron's, not the user's — so for A+B "new drafts" = **count of `status='drafted'` items** (actionable count), labeled "N drafts to review".

**Files:**
- Modify: `app/dashboard/agents/page.tsx`

Steps:

- [ ] 1. In `AgentsPage`, after loading agents, fetch the per-agent drafted-count in one grouped query and map it. Supabase has no GROUP BY in PostgREST select, so use a single `run_items` query filtered to the user's agents and reduce client-side:

```ts
  const agentIds = agents.map((a) => a.id);
  let draftCounts = new Map<string, number>();
  if (agentIds.length > 0) {
    const { data: draftRows } = await supabase
      .from("run_items")
      .select("agent_id")
      .in("agent_id", agentIds)
      .eq("status", "drafted");
    draftCounts = (draftRows ?? []).reduce((m, r) => {
      m.set(r.agent_id, (m.get(r.agent_id) ?? 0) + 1);
      return m;
    }, new Map<string, number>());
  }
```

  (RLS scopes `run_items` to the owner, so the `.in(agentIds)` is owner-safe.)

- [ ] 2. In the agent-card render, add the badge when `draftCounts.get(agent.id)` > 0:

```tsx
                  {(() => {
                    const n = draftCounts.get(agent.id) ?? 0;
                    return n > 0 ? <span className="wbadge wbadge-accent">{n} to review</span> : null;
                  })()}
```

  Add a `.wbadge-accent` class to `globals.css` if a visual accent is wanted (brand-tinted), else reuse `.wbadge`.

- [ ] 3. Verify build + browser: run an agent that produces drafts, return to `/dashboard/agents`. Expected: the agent's row shows "N to review". Post all drafts → the badge disappears on refresh.

```bash
pnpm build && pnpm exec biome check --write app/dashboard/agents/page.tsx
```

- [ ] 4. Commit:

```bash
git add app/dashboard/agents/page.tsx app/globals.css && git commit -m "feat(agents): per-agent 'N to review' drafted-item badge on the list (replaces notifications)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task B3 — Instrument the redraft cost path (dead `redraft` usage kind)

Today `redraft/route.ts` calls `generateDraft` but never logs usage, so `kind:'redraft'` is dead. Capture the gateway market cost and log it.

**Files:**
- Modify: `lib/draft/generate.ts` (return cost from the gateway providerMetadata)
- Modify: `app/api/agents/run-items/[id]/redraft/route.ts` (logUsage)

Steps:

- [ ] 1. In `lib/draft/generate.ts`, change `generateOnce` to also return the gateway market cost from `providerMetadata`, and have `generateDraft` return it. `generateText` returns `{ output, providerMetadata, usage }`:

```ts
async function generateOnce(
  system: string,
  prompt: string,
): Promise<{ text: string; marketCost: number | null; inputTokens: number | null; outputTokens: number | null }> {
  const { output, providerMetadata, usage } = await generateText({
    model: DRAFT_MODEL,
    output: Output.object({ schema: draftSchema }),
    system,
    prompt,
    providerOptions: { ...GATEWAY_PROVIDER_OPTIONS },
  });
  const gw = (providerMetadata?.gateway ?? {}) as Record<string, unknown>;
  const marketCost = gw.marketCost != null ? Number(gw.marketCost) : null;
  return {
    text: output.text,
    marketCost,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
  };
}
```

  Change `generateDraft`'s success return to `{ ok: true, text, marketCost, inputTokens, outputTokens }` (accumulate across the repair pass — sum marketCosts; use the last pass's tokens or sum them). Update the success type accordingly.

- [ ] 2. In `app/api/agents/run-items/[id]/redraft/route.ts`, after a successful `generateDraft`, log usage (import `logUsage`, `DRAFT_MODEL`):

```ts
  await logUsage({
    kind: "redraft",
    provider: "gateway",
    model: DRAFT_MODEL,
    user_id: user.id,
    agent_id: item.agent_id,
    tool_name: "redraft",
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    gatewayMarketCost: result.marketCost,
  });
```

  Place it after the run_items update succeeds, before the JSON response. (Telemetry is non-throwing inside `logUsage`.)

- [ ] 3. **Framework note (gateway BYOK cost):** `computeCostUsd` (`lib/usage/cost.ts:19`) trusts `gatewayMarketCost` when present and > 0. The gateway's own `cost` is ~$0 for BYOK, so `marketCost` is the real estimate — exactly what `chat/route.ts:143` already reads. The cheap guard in spec §11 (alert when token-bearing calls log cost==0) catches a missing `marketCost`.

- [ ] 4. Verify build + lint:

```bash
pnpm build && pnpm exec biome check --write lib/draft/generate.ts "app/api/agents/run-items/[id]/redraft/route.ts"
```

- [ ] 5. **Route verification:** redraft an item, then check the usage row:

```sql
select kind, provider, model, cost_usd, input_tokens, output_tokens
from public.api_usage_events where kind = 'redraft' order by created_at desc limit 1;
```

  Expected: one `redraft` row with a non-null `cost_usd` (> 0) — proving the dead kind is now live.

- [ ] 6. Commit:

```bash
git add lib/draft/generate.ts "app/api/agents/run-items/[id]/redraft/route.ts" && git commit -m "feat(usage): instrument redraft cost (gateway marketCost) — was a dead usage kind

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task A9 — Folded cleanups (D1, D2, D3, D5) — same files A touches

These are dedupe/caching cleanups the spec folds into A (§5.5). They are independent of each other; do them in one commit (or split if a step fails).

**Files:**
- Create: `lib/x/connection-context.ts` (D1)
- Modify: `app/api/agents/chat/route.ts` (D1) + `app/api/agents/chat-debug/route.ts` (D1)
- Modify: `lib/chat/session-log.ts` (D2 `collectToolCalls` + `ToolCallLog`; D5 cached client)
- Modify: `app/api/agents/chat/route.ts` (D2: use `collectToolCalls`)
- Modify: `lib/chat/discover.ts` (D3 `runGroundedDiscovery`)
- Modify: `lib/usage/log.ts` (D5 cached client)

Steps:

- [ ] 1. **D1** — Create `lib/x/connection-context.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { XConnectionContext } from "@/lib/chat/tools";
import { getFreshAccessToken } from "@/lib/x/tokens";

/**
 * Resolve a user's X-connection context (connected flag, username, id, fresh token)
 * for the chat voice step. Scopes by user_id explicitly so it works under both the RLS
 * client (route) and a service-role client (debug harness). Never throws — a token
 * failure falls back to a connected-but-tokenless context (the chat must not break).
 */
export async function buildXConnectionContext(
  supabase: SupabaseClient<Database>,
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
      console.warn("getFreshAccessToken (connection-context) failed", err);
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

  Replace the inline blocks in `chat/route.ts:104-121` and `chat-debug/route.ts:124-142` with `const xConnection = await buildXConnectionContext(supabase, user.id);` (chat) and `const xConnection = await buildXConnectionContext(serviceClient, userId);` (debug). **Note:** chat/route currently scopes by RLS (no `.eq("user_id")`); the helper adds the explicit `.eq("user_id", userId)` which is harmless under RLS and required under service-role — a strict improvement.

- [ ] 2. **D2** — In `lib/chat/session-log.ts`, export the shared type + collector:

```ts
export type ToolCallLog = { name: string; input?: unknown; output?: unknown };

import type { StepResult, ToolSet } from "ai";
/** Flatten steps → tool calls paired with their results. Shared by route + harness. */
export function collectToolCalls(steps: StepResult<ToolSet>[]): ToolCallLog[] {
  return steps.flatMap((step) =>
    step.toolCalls.map((tc) => {
      const tr = step.toolResults.find((r) => r.toolCallId === tc.toolCallId);
      return { name: tc.toolName, input: tc.input, output: tr ? tr.output : undefined };
    }),
  );
}
```

  Replace the inline `toolCallLog` flatMap in `chat/route.ts:166-175` with `const toolCallLog = collectToolCalls(event.steps);`. (Leave `chat-debug/route.ts`'s local `ToolCallLog` as-is or swap to the shared one — both fine; swapping reduces drift.)

- [ ] 3. **D3** — In `lib/chat/discover.ts`, extract the shared grounded-discovery runner so `discoverHandles`/`discoverSites` differ only by tool + schema + prompt:

```ts
async function runGroundedDiscovery<T>(opts: {
  system: string;
  prompt: string;
  toolName: "x_search" | "web_search";
  tool: unknown;
  schema: z.ZodType<T>;
  purpose: string;
  count: (out: T | undefined) => number;
}): Promise<T | null> {
  const startedAt = Date.now();
  try {
    const tools: ToolSet = {} as ToolSet;
    (tools as Record<string, unknown>)[opts.toolName] = opts.tool;
    const result = streamText({
      model: xai.responses(SCAN_MODEL),
      system: opts.system,
      prompt: opts.prompt,
      tools,
      stopWhen: stepCountIs(4),
      temperature: 0,
      maxOutputTokens: 8000,
      output: Output.object({ schema: opts.schema }),
      providerOptions: { xai: { reasoningEffort: "low" } },
    });
    const [output, metrics] = await Promise.all([result.output, extractMetrics(result, startedAt)]);
    await logUsage({
      kind: "scan",
      provider: "xai",
      resolved_provider: "xai",
      model: SCAN_MODEL,
      input_tokens: metrics.inputTokens,
      output_tokens: metrics.outputTokens,
      xSearchCalls: metrics.xSearchCalls,
      metadata: { purpose: opts.purpose, elapsedMs: metrics.elapsedMs, found: opts.count(output ?? undefined) },
    });
    return output ?? null;
  } catch (err) {
    console.error(`${opts.purpose} failed`, err);
    return null;
  }
}
```

  Rewrite `discoverHandles`/`discoverSites` to call it (handles → `xai.tools.xSearch({})`, `handlesSchema`, `out?.handles ?? []`; sites → `xai.tools.webSearch({})`, `sitesSchema`, `out?.sites ?? []`).

- [ ] 4. **D5** — Module-level cached service-role client in `lib/usage/log.ts` and `lib/chat/session-log.ts`. In each, replace per-call `createServiceRoleClient()` with a cached singleton:

```ts
let cachedClient: ReturnType<typeof createServiceRoleClient> | null = null;
function serviceClient() {
  if (!cachedClient) cachedClient = createServiceRoleClient();
  return cachedClient;
}
```

  Use `serviceClient()` at the insert site. (The service-role client holds no per-request state — `persistSession:false`, `autoRefreshToken:false` — so caching at module scope is safe and avoids re-instantiating per log call.)

- [ ] 5. Verify build + lint across all touched files:

```bash
pnpm build && pnpm exec biome check --write lib/x/connection-context.ts app/api/agents/chat/route.ts app/api/agents/chat-debug/route.ts lib/chat/session-log.ts lib/chat/discover.ts lib/usage/log.ts
```

  Expected: exit 0; no errors.

- [ ] 6. **Behavior check (chat-debug skill):** run the `/chat-debug` flow (or curl `POST /api/agents/chat-debug` in dev) for one turn to confirm the chat still streams, tools resolve, and usage logs — the D1/D2 refactor must not change behavior.

- [ ] 7. Commit:

```bash
git add lib/x/connection-context.ts app/api/agents/chat/route.ts app/api/agents/chat-debug/route.ts lib/chat/session-log.ts lib/chat/discover.ts lib/usage/log.ts && git commit -m "refactor: dedupe X-connection context (D1), tool-call collector (D2), grounded discovery (D3); cache service-role client (D5)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Task A+B-FINAL — Stage A+B QC + manual verification checklist

**Files:** none (verification only).

Steps:

- [ ] 1. Run the full QC gate:

```bash
pnpm lint && pnpm build
```

  Expected: Biome reports 0 errors; build exits 0.

- [ ] 2. Run `/simplify` then `/code-review` on the Stage A+B diff (`git diff dev...HEAD`). Address findings or note why deferred.

- [ ] 3. **Hand the human this browser checklist (the no-X loop end-to-end + the reliability invariant):**
  - **No-X create→run:** Sign up a fresh user (or disconnect X for the test user). Land on `/dashboard/agents` with a WORKING "New agent" button (no gate). Create an agent in chat, Save (no 403). Open it, Run from Drafts. Expected: drafts appear, run reaches a terminal state.
  - **Post-intent connect:** With no X, click Post on a draft. Expected: inline connect-X bar (not a toast); clicking Connect runs OAuth with `?next` back to this agent; after connecting, Post succeeds (201) and the item shows "View on X" + timestamp.
  - **Never-hang:** Start a Run, then immediately close the tab / navigate away. Reopen the agent after the scan duration. Expected: the run shows `completed` (or `failed`) — NOT stuck running. (Confirm in DB if needed.)
  - **Refresh durability:** Post a draft, hard-refresh. Expected: still shows posted terminal state.
  - **Disconnect semantics:** Connect X, enable nothing autonomous (A has no toggle yet), Disconnect. Expected: agents stay runnable (not "inactive"); the disconnect response reports `autoPostDisabledCount` (0 in A).
  - **New-drafts badge:** After a run with drafts, `/dashboard/agents` shows "N to review" on that agent; posting all drafts clears it.
  - **#35 regressions (C1–C6 from the issue):** chat still streams + tools resolve (chat-debug), redraft works + logs cost, usage dashboard renders.

- [ ] 4. On sign-off, squash-merge Stage A+B → `dev` (the staged-delivery decision, spec §12). #37 stays open for C and D.

---

# STAGE C — Scheduling + autonomy (TASK-LEVEL OUTLINE)

> **This stage is outline-level on purpose.** A+B is executed first and will inform C's exact wiring (the engine primitives `persistRunResult`/`reaper`/`postRunItem` are proven before the dangerous cron/auto-post code rides on them). Each task below is expanded to full bite-sized code at C's stage-start, following the same Files-block + numbered-steps + concrete-verification shape as A+B. The directive-specific framework pins are stated now so the expansion stays correct.

## Task C0 — Schema migration #2 + regen
- **Files:** Supabase MCP migration; `lib/types/database.ts`.
- **Key SQL:** `UNIQUE(run_items.agent_id, dedupe_key)` (drop the per-run unique if it conflicts with cross-run dedupe — keep both only if they don't collide; the spec wants cross-run uniqueness §7.1); partial index `agents(next_run_at) WHERE status='active' AND next_run_at IS NOT NULL`; `run_source += 'auto_post'` (if cron auto-post runs are distinct) — confirm whether `runs.source` enum needs `auto_post` or whether it stays `cron` with `api_usage_events.source` carrying the finer dimension (spec §4 lists source as a usage dimension, and `runs.source` enum is `manual|cron` — decide: **keep `runs.source='cron'`, use `api_usage_events.source='auto_post'`** to avoid a second enum migration).
- **Enum gotcha:** any `ALTER TYPE ADD VALUE` in its own statement, not referenced in the same migration.
- **Verify:** regen, `grep` the new columns, `pnpm build` exit 0.

## Task C1 — `nextRunAt` + `isAgentDue` PURE functions (with tsx assertion harness)
- **Files:** `lib/schedule/next-run.ts`.
- **Steps:** implement `nextRunAt(agent, after: Date): Date | null` handling: empty `schedule_days` → null (scheduling disabled); slot anchoring to `windowStart + k·cadence` (no drift; cadence min 60); midnight-crossing windows (`windowEnd < windowStart`); DST (clamp spring-forward gap, take first fall-back hour) using `Intl.DateTimeFormat` with the agent's `schedule_timezone` to compute wall-clock-in-tz. Implement `isAgentDue(agent, now)` as the predicate mirror (`next_run_at <= now AND status != 'paused' AND today ∈ schedule_days AND now ∈ window AND (search_x OR search_web)`).
- **Verification (directive: PURE FUNCTIONS → tsx assertion script):** write `lib/schedule/next-run.assert.ts` with inline `assert(actual === expected)` cases printing PASS/FAIL, run via `pnpm exec tsx lib/schedule/next-run.assert.ts`. Cases MUST include: weekday-only window mid-week; window not yet open today → first slot today; window closed today → first slot next eligible day; cadence anchoring (09:00 + 2h → 11:00, not now+2h); DST spring-forward (America/New_York 2026-03-08 02:30 gap); fall-back (2026-11-01 duplicate 01:30); midnight-cross window (22:00–02:00); empty days → null. Show every expected value explicitly.

## Task C2 — Cross-run dedupe helper
- **Files:** `lib/scan/dedupe.ts`; integrate into `persistRunResult` (or a pre-draft filter in the cron path).
- **Steps:** before drafting (cron), skip stories whose `(agent_id, dedupe_key)` already exists with status in `('drafted','posted')` within a 14-day lookback; upsert run_items `ON CONFLICT (agent_id, dedupe_key) DO NOTHING`. For cron, compute the moving window: `fromDate = last completed run start (or now − cadence)`, `toDate = now`; `scan_from`/`scan_to` become manual-only overrides.
- **Framework note:** PostgREST upsert with `onConflict: 'agent_id,dedupe_key'` and `ignoreDuplicates: true` for the DO NOTHING semantics.
- **Verify:** pure dedupe-key filter unit via tsx; route-level: run cron twice on the same window → second run inserts 0 new items (DB check).

## Task C3 — Cron endpoint + atomic agent lease + reaper tick
- **Files:** `app/api/cron/scan/route.ts`; `app/api/admin/cron-trigger/route.ts`.
- **Framework pins (directive-critical):**
  - **POST-only**, `export const runtime = "nodejs"; export const maxDuration = 300;`.
  - Auth: read `Authorization` header, compare to `` `Bearer ${process.env.CRON_SECRET}` `` with `crypto.timingSafeEqual` (equal-length buffers; guard length first). Return 401 otherwise. **Never** trust `x-vercel-cron` (forgeable). Confirm via `mcp__vercel__search_vercel_documentation "cron authorization secret"` that Vercel's runner sends `Authorization: Bearer $CRON_SECRET` automatically.
  - **Atomic lease:** `UPDATE agents SET next_run_at = <nextRunAt(agent, now)> WHERE id = $1 AND next_run_at <= now() RETURNING id` — only the row-returning call owns the run. Use the service-role client; the `RETURNING id` is the lease token. (Supabase: `.update({...}).eq('id',id).lte('next_run_at', nowISO).select('id')` — empty array = lost the race.)
  - **Due query:** `next_run_at <= now() AND status != 'paused' AND (search_x OR search_web) ORDER BY next_run_at ASC LIMIT <batch>`; refine `today ∈ schedule_days AND now ∈ window` via `isAgentDue` in code after the DB filter (timezone math is per-agent). Bounded batch → next tick drains the rest (respects maxDuration).
  - Per-agent `try/catch` isolation. Run `reapStaleRuns(serviceRole)` once per tick. **Empty scan → do NOT persist a run**; bump `agents.last_checked_at = now()` instead (spec §2.7).
  - **Run execution under cron:** create the `runs` row (status running), call `runScanStream`, then **`await result.consumeStream({ onError })`** (NOT `toUIMessageStreamResponse` — there is no client), then `persistRunResult({ supabase: serviceRole, ..., source: 'cron' })`. This is the second consumer of the engine and the reason `consumeStream` exists in the design.
- **Admin trigger:** `app/api/admin/cron-trigger/route.ts` — `isAdmin(user.email)` gate, calls the same due-loop function (extract the loop into `lib/scan/cron-tick.ts` so both the cron route and the admin route call it). This is how the due-logic is verified on a deployed `dev` preview (cron only fires in prod; `ft/**` doesn't deploy).
- **Verify (directive: ROUTES → curl):** `curl -X POST .../api/cron/scan` with wrong/no bearer → 401; with correct bearer → 200 + JSON `{ processed, reaped, skipped }`. Admin trigger as admin → runs the tick on a preview; check DB for new runs / `last_checked_at` bumps / no double-runs (run two concurrent triggers → exactly one run per due agent via the lease).

## Task C4 — Auto-post (atomic claim, capped, kill-switched, self-heal)
- **Files:** `lib/scan/auto-post.ts`; `lib/usage/spend-cap.ts`; integrate into `cron-tick`.
- **Framework pins:**
  - Global `AUTO_POST_ENABLED` checked first.
  - Only when `agent.auto_post AND X connected (live token) AND under daily cap`.
  - **Atomic per-item claim:** `UPDATE run_items SET status='posting' WHERE id=$1 AND status='drafted' RETURNING id` — only the row-returner posts (success → `postRunItem({ postedVia:'auto' })` which sets `posted`+`posted_via='auto'`; failure → `failed`). Closes the double-post window. (`'posting'` enum value added in A0.)
  - **Cap transactionally per agent:** count `run_items WHERE agent_id=$1 AND posted_at >= <tz-day-start> AND posted_via='auto'` inside the claim transaction; optionally `pg_advisory_xact_lock(hashtext(agent_id))` to serialize concurrent ticks. Cap keyed to the agent's `schedule_timezone` day boundary (compute via `Intl`).
  - **Self-heal on token death:** on `400 invalid_grant` during refresh, set `auto_post=false` for that user's agents, surface a reconnect banner, stop retrying.
  - **Per-user daily USD spend cap** (`lib/usage/spend-cap.ts`): sum `api_usage_events.cost_usd` for the user's day; if over, skip + mark the run (checked in the shared scan path before scanning).
- **Verify:** pure cap-math + tz-day-boundary via tsx; route: enable auto_post on a test agent with X connected, trigger cron, verify ≤ cap posts/day, `posted_via='auto'`, kill switch off → zero posts, concurrent triggers → no double-post (claim).

## Task C5 — Schedule & autonomy tab UI (fills SchedulePanel)
- **Files:** `components/agents/panels/SchedulePanel.tsx`; `lib/chat/config.ts` (PATCH already persists schedule cols); `app/api/agents/[id]/route.ts` (recompute `next_run_at` on schedule change).
- **Steps:** browser-defaulted timezone select (`Intl.DateTimeFormat().resolvedOptions().timeZone`) not free-text; plain-language summary computed from the SAME `nextRunAt` (e.g. "Scans every 2h on weekdays 9am–6pm ET; next run in 40 min"); `next_run_at` rendered in the agent's tz; `auto_post` toggle visually gated behind X-connected + schedule-set + a one-time confirm naming the exact @handle; "N of M auto-posts used today". On Save/PATCH when schedule fields change, recompute `next_run_at = nextRunAt(agent, now)` server-side (block enabling cron/auto_post until ≥1 day chosen).
- **Verify:** browser checklist — set a schedule, see the summary + next-run; toggle auto_post (confirm dialog names @handle); disconnect X → toggle disables.

## Task C6 — Cost telemetry: source breakdown + per-user cap surface
- **Files:** `lib/usage/aggregate.ts` (bySource breakdown), `components/usage/usage-dashboard.tsx`, `lib/usage/spend-cap.ts`.
- **Steps:** add a `bySource` breakdown to `aggregate` (group by `api_usage_events.source`); render it on `dashboard/usage`; cheap guard alert when token-bearing calls log `cost==0`.
- **Verify:** usage dashboard shows manual/cron/auto_post split after a cron run.

## Task C-FINAL — Stage C QC + verification
- `/simplify`, `/code-review`, `pnpm lint`, `pnpm build`; the cron verification matrix (lease/no-double-run, claim/no-double-post, cap, dedupe/no-repeat-stories, empty-run heartbeat, kill switch) via the admin trigger on a `dev` preview deploy. Squash → `dev`.

---

# STAGE D — Protected monitoring (TASK-LEVEL OUTLINE)

> Outline-level; expanded at D's stage-start on the proven engine. Reuses existing primitives — `lib/x/timeline.ts:fetchRecentPosts` already prefers the user OAuth token; `verified_x_handles` already caches `username → x_user_id + protected`.

## Task D0 — Schema migration #3 + regen
- `agents.protected_monitoring boolean NOT NULL DEFAULT false`; `usage_kind += 'x_timeline'` (own statement, enum gotcha). Regen types; `pnpm build`.

## Task D1 — Protected reads → tagged prompt block
- **Files:** `lib/scan/protected.ts`; integrate into `lib/scan/run.ts` + `lib/scan/prompt.ts`.
- **Steps:** when `protected_monitoring` AND X connected, for each monitored handle resolve `x_user_id` (cache hit in `verified_x_handles`, else `getUserByUsername` with the user token), call `fetchRecentPosts({ xUserId, accessToken })`, build a new tagged prompt block with REAL per-tweet URLs (`https://x.com/i/web/status/<id>`) so `scanItemSchema.urls`/`sources` stay real (no fabricated URLs). Public coverage still comes from `xSearch`; protected reads are additive. Fall back to `xSearch` when not connected or a read fails (treat protected-not-followed as "no data"). **No new OAuth scope** (`tweet.read`+`users.read` suffice).
- **Verify:** toggle on a followed protected account; confirm protected tweets appear in scan input with real URLs; disconnect → falls back to xSearch.

## Task D2 — Cost branch for `x_timeline`
- **Files:** `lib/usage/pricing.ts` + `lib/usage/cost.ts`.
- **Steps:** add `x_timeline` branch (≈ $0.005/post read + $0.010/user lookup); log with `provider:'x_api'`, `kind:'x_timeline'`; fold into the per-user daily cap (C4).
- **Verify (PURE):** tsx assertion on `computeCostUsd({ kind:'x_timeline', ... })` with explicit expected USD.

## Task D3 — Protected toggle UI + privacy
- **Files:** `SchedulePanel.tsx` (or SourcesPanel); RLS on stored story content.
- **Steps:** `protected_monitoring` toggle (default off), only meaningful when X connected; ensure stored protected reads never expose another user's content (RLS regression check).
- **Verify:** browser — toggle visible only when connected; cost logged under `x_timeline`.

## Task D-FINAL — Stage D QC + close #37
- `/simplify`, `/code-review`, lint, build; protected-account verification; cost under `x_timeline`; fallback when disconnected. Squash → `dev`. **Close #37.**

---
# Self-review

## Spec-coverage map (every spec section → task)

| Spec section | Covered by |
|---|---|
| §2.1 X optional everywhere | A5 (save/scan gates removed), A3 (run de-gate), A4 (post no-X code) |
| §2.2 connect-X hard gate removed | A5 step 5 (de-gate page), A5 step 6 (redirect audit) |
| §2.3 notifications cut + seam | A1 (single `// future: notify` comment in persistRunResult) |
| §2.4 auto_post default-off + cap + kill switch | A0 (columns), C4 (enforcement) |
| §2.5 Section E in | B (run history/Drafts), C (schedule/autonomous), D (protected) |
| §2.6 staged delivery A+B→C→D | A+B-FINAL / C-FINAL / D-FINAL squash steps |
| §2.7 empty scheduled runs not persisted | C3 (last_checked_at heartbeat) |
| §3.1 two primitives + 3 consumers | A1 (persistRunResult), A2 (runScanStream timeout), A3 (manual), C3 (cron consumeStream), scan/route stays usage-only |
| §3.2 server-driven completion | A3 (onFinish via toUIMessageStreamResponse + onAbort), C3 (consumeStream) |
| §3.3 reaper + bounded calls | A2 (reaper.ts, token-refresh timeout), C3 (reaper tick) |
| §3.4 reliability invariants | A3 verify (never-hang), C3 (lease), C4 (claim) |
| §4 schema deltas | A0 (A+B deltas), C0, D0 (per-stage) |
| §5.1 X-decoupling list | A5 (each bullet), A3 (run inactive) |
| §5.2 shared engine + reliability | A1, A2, A3 |
| §5.3 owner-explicit poster + inline connect bar | A4 (postRunItem assertion), A6+A8 (inline bar) |
| §5.4 3-tab shell | A8 (Drafts/Schedule/Sources panels) |
| §5.5 folded cleanups D1/D2/D3/D5/A6 + notify seam | A9 (D1/D2/D3/D5), A8 (A6 usd()), A1 (seam) |
| §6 Drafts worklist / run-history | A7 (recent-runs load), A8 (DraftsPanel), B1 (terminal state), B2 (badge), B3 (true cost via redraft logging) |
| §7.1 cross-run dedupe | C2, C0 (UNIQUE constraint) |
| §7.2 cron + lease | C3 |
| §7.3 nextRunAt | C1 |
| §7.4 auto-post atomic/capped/kill | C4 |
| §7.5 schedule UI | C5 |
| §8 protected monitoring | D1/D2/D3 |
| §9 cleanup D4/D6 | A7 (D4 for [id]/page), A6 (D6 CSS); D4 chat/new-page remainder noted below |
| §10 security invariants | A4 (ownership assert), C3 (timingSafeEqual, no x-vercel-cron), C4 (containment), A5 (isSafeNextPath kept) |
| §11 cost & telemetry | B3 (redraft instrument), A1 (source dim), C6 (bySource + cap), D2 (x_timeline) |
| §12 delivery | each stage FINAL task |
| §13 verification | per-task concrete verify + per-stage browser checklist |

**Gap noted honestly:** §9 D4 also lists `chat/route.ts convertToModelMessages+x_connections` and `agents/new/page.tsx sessions list` as `Promise.all` candidates. The chat-route one partially dissolves via A9-D1 (the x_connections fetch moves into `buildXConnectionContext`); the remaining `convertToModelMessages` + `agents/new` parallelization is a 5-minute cleanup — fold into A9 as an optional step 8 ("Promise.all the two remaining independent awaits in chat/route.ts and agents/new/page.tsx") or defer to C; it is not load-bearing.

## Placeholder scan
- No TBD/TODO/"implement later" in Stage A+B. Every A+B code step shows complete code with real signatures read from the repo (`persistRunResult`, `postRunItem`, `reaper`, route bodies, `generateOnce` return shape, `buildXConnectionContext`, `collectToolCalls`, `runGroundedDiscovery`).
- Stages C/D are explicitly OUTLINE-level with the rationale stated ("expanded at stage-start"); this is honest scoping per the writing-plans guide, not a placeholder — each C/D task still names exact files, the framework primitive to use, and a concrete verification approach.
- The one `// future: notify(...)` is an intentional documented seam (spec §2.3), not a deferred task.

## Type/name consistency across tasks
- `persistRunResult` signature (A1) is consumed identically in A3 (`source:'manual'`) and C3 (`source:'cron'`); the `source` field exists because A0 added the column + regenerated types.
- `postRunItem` (A4) returns `PostItemResult` with `code?:'no_x_connection'`, consumed by the post route (A4) and the client inline-bar trigger (A8).
- `reapStaleRuns` (A2) takes a `SupabaseClient<Database>`; called RLS-scoped (A3) and service-role (C3) with the same code.
- `ToolCallLog`/`collectToolCalls` (A9-D2) live in `lib/chat/session-log.ts`; `XConnectionContext` is imported from the existing `lib/chat/tools` (not re-declared).
- `usd()` from `lib/usage/format.ts` (verified exported) used in A8 + DraftsPanel; no new formatter invented.
- `MONITOR_MAX_HANDLES = 10` (existing) now matches the DB CHECK reconciled in A0.
- Enum additions (`item_status += posting` A0; `usage_kind += x_timeline` D0) are each in their own migration statement per the Postgres `ADD VALUE` transaction rule, and `'posting'` is first *used* only in C4 — never in the same migration that adds it.

## Directive-specific correctness notes (framework-idiomatic)
- The plan deliberately uses `toUIMessageStreamResponse({ onFinish, onError })` for the manual route (the SDK consumes the stream to fire `onFinish` independent of the client) and reserves `consumeStream({ onError })` for the cron route (no `Response`). A generic plan often conflates these or routes the manual run through `consumeStream` and then can't return a live stream — A3 keeps both.
- `onAbort` is correctly placed on `streamText`/`runScanStream` (NOT `toUIMessageStreamResponse`, whose `UIMessageStreamOptions` has no `onAbort`) — A3 step 4 flags this exact trap.
- Cron auth uses `crypto.timingSafeEqual` against `Bearer $CRON_SECRET`, explicitly rejecting the forgeable `x-vercel-cron` header (C3) — the platform-correct Vercel pattern.
- The ownership assertion in `postRunItem` (A4) is the concrete guard that makes a future service-role cron caller safe; placed in shared code so both consumers inherit it.
- Schema changes go through the Supabase MCP migration + a regen of `lib/types/database.ts` (A0/C0/D0), and the Postgres enum-`ADD VALUE` transaction gotcha is called out so a migration doesn't fail mid-apply.
