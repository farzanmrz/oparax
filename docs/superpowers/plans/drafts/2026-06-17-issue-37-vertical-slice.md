# Issue #37 Full Reporter Lifecycle — Vertical-Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Ship the X-optional, monitored, autonomous reporter lifecycle (signup → create → save → run → drafts → post → schedule → auto-post → protected monitoring) so every run reaches a terminal state independent of the client, in browser-demoable vertical slices.

**Architecture:** Two pure run primitives (`runScanStream` already pure; new `persistRunResult`) composed by three consumers (manual route, scheduled cron, prompt-lab). Server-driven completion via `result.consumeStream()` replaces the browser-drains-stream coupling. Schema deltas land per stage via the Supabase MCP; `lib/types/database.ts` is regenerated after each.

**Tech Stack:** Next.js App Router (TS strict, `@/*`), AI SDK v6 (`ai@6.0.206`, `@ai-sdk/xai@3.0.95`), Supabase (RLS + service-role), Vercel cron, Biome, pnpm. No test runner — verification is `pnpm build` + pure-function assertion scripts (`node --experimental-strip-types`) + curl + browser-agent checklists.

---

## SCOPE OF DETAIL (read first)

- **Stage A+B is written at FULL bite-sized granularity** — it is executed next, in vertical slices that are each browser-demoable.
- **Stages C and D are TASK-LEVEL OUTLINES** (task titles + files + key steps + verification approach). They are NOT fabricated code — A+B will inform their exact shape, and each is expanded to full granularity at its own stage start. This is honest staged scoping, not placeholders.
- **Verification cadence (no test runner, per AGENTS.md):** every task ends with one concrete check — (a) `pnpm build` exits 0 + `pnpm lint:fix` on touched files; (b) pure functions verified by a `node --experimental-strip-types <script>.ts` assertion script that prints PASS/FAIL (`tsx` is NOT installed — Node 24 strips types natively, confirmed); (c) routes via curl with exact status/body; (d) UI via a browser-agent click/observe checklist.

---

## FILE STRUCTURE MAP

### Stage A+B — created files
- `lib/scan/persist.ts` — **NEW.** `persistRunResult({ supabase, runId, agentId, userId, result, startedAt, source })`: the body currently inline at `app/api/agents/[id]/run/route.ts:154-245` (build `run_items`, terminal `runs` update, `logUsage`). Source-agnostic; the notification seam comment lives here.
- `app/api/agents/run-items/[id]/post/route.ts` — **MODIFIED → extracts** `lib/x/post-item.ts` `postRunItem({ supabase, ownerUserId, item, text })` (owner-explicit poster, §5.3).
- `lib/x/post-item.ts` — **NEW.** Owner-explicit shared poster + ownership assertion.
- `lib/chat/x-context.ts` — **NEW.** `buildXConnectionContext(client, userId)` (D1 dedupe of `chat/route.ts:104-121` + `chat-debug/route.ts:124-142`).
- `components/agents/panels/DraftsPanel.tsx` — **NEW.** Drafts worklist (B fills).
- `components/agents/panels/SchedulePanel.tsx` — **NEW.** Placeholder in A; C fills.
- `components/agents/panels/SourcesPanel.tsx` — **NEW.** Wraps existing `ConfigForm` + Save.
- `components/agents/connect-x-bar.tsx` — **NEW.** Reusable inline connect-X bar (extracted from `agent-chat.tsx:708-741`, tokenized into `globals.css`).

### Stage A+B — modified files (one responsibility each)
- `app/api/agents/save-agent/route.ts:92-108` — remove `if (!connection) → 403`.
- `app/api/agents/scan/route.ts:30-41` — remove the un-named `403 "Connect X..."`.
- `app/dashboard/connect-x/page.tsx` — keep reachable as optional connect entry; remove forced-redirect framing (de-gate).
- `app/dashboard/agents/page.tsx` — new-drafts badge per row; reporter status labels.
- `app/dashboard/agents/[id]/page.tsx:65-90` — fetch recent runs (last ~20) + items; `Promise.all` independent awaits (D4); compute new-drafts.
- `components/agents/agent-detail.tsx` — rewrite into 3-tab shell delegating to the three panels; server-driven run; per-item terminal state; `usd()` (A6).
- `components/agents/story-card.tsx` — persistent posted/failed/auto-posted terminal state (B).
- `app/api/agents/[id]/run/route.ts` — thin streaming wrapper: `consumeStream` server-side completion + `onFinish → persistRunResult`.
- `lib/scan/run.ts:48-71` — add `timeout` (240_000) + `abortSignal` + `onAbort`.
- `lib/x/tokens.ts:144` — `AbortSignal.timeout(8000)` on the `rotateAccessToken` fetch.
- `app/api/x/disconnect/route.ts:79-95` — set `auto_post=false` (not `inactive`); warn count.
- `lib/usage/format.ts` is reused (`usd()` already exists — no change).
- `lib/draft/generate.ts` + `app/api/agents/run-items/[id]/redraft/route.ts` — log `draft`/`redraft` usage (B / §11).
- `lib/chat/session-log.ts` + `lib/usage/log.ts` — module-level cached service-role client (D5).
- `app/globals.css` — `@layer components`: `.ws-connect-bar`, `.ws-drafts-*`, `.ws-newbadge` (D6, tokenized).
- `lib/types/database.ts` — regenerated after the A+B migration.

### Stage C — outline-level files (expanded at stage start)
- `lib/scan/schedule.ts` (NEW, `nextRunAt` + due predicate, pure), `app/api/cron/scan/route.ts` (NEW), `lib/scan/dedupe.ts` (NEW), `lib/scan/reaper.ts` (NEW), `lib/x/post-item.ts` (atomic claim added), `vercel.json` (crons), `components/agents/panels/SchedulePanel.tsx` (filled), `lib/usage/*` (source dim + caps), `app/dashboard/usage/*` (bySource).

### Stage D — outline-level files (expanded at stage start)
- `lib/scan/protected.ts` (NEW), `lib/scan/run.ts` (protected prompt block), `lib/usage/cost.ts` + `pricing.ts` (`x_timeline`), `components/agents/panels/SchedulePanel.tsx` or `SourcesPanel.tsx` (protected toggle).

---

## SCHEMA DELTA — Stage A+B migration (run BEFORE Task A0)

Applied via the Supabase MCP (`mcp__plugin_supabase_supabase__apply_migration`, project `pcgvpypzfwuchyfwdlwe`). Only the deltas Stage A+B needs (auto_post for disconnect behavior; posted_via + new enums for terminal state):

```sql
-- migration name: issue_37_stage_ab
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS auto_post boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_post_daily_cap int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz NULL;

-- run_items: audit which posts were autonomous; transient claim state; cross-run dedupe.
ALTER TYPE item_status ADD VALUE IF NOT EXISTS 'posting';
ALTER TABLE run_items
  ADD COLUMN IF NOT EXISTS posted_via text NULL
    CHECK (posted_via IN ('manual','auto'));

-- usage: source dimension + x_timeline kind (added now so logUsage type compiles once).
ALTER TYPE usage_kind ADD VALUE IF NOT EXISTS 'x_timeline';
ALTER TABLE api_usage_events
  ADD COLUMN IF NOT EXISTS source text NULL
    CHECK (source IN ('manual','cron','auto_post'));
```

> NOTE: Postgres forbids `ADD VALUE` to an enum inside the same transaction that then uses the new value. `apply_migration` runs each statement; if the MCP wraps them in one tx, split the `ALTER TYPE ... ADD VALUE` calls into their own migration call first, then the `ALTER TABLE` calls in a second. The `UNIQUE(agent_id, dedupe_key)` + scheduling index are deferred to the **Stage C** migration (they gate cron, not A+B), to keep this migration minimal.

Regen command (run after the migration):
```bash
# Writes the regenerated types; review the diff before committing.
# (Use the MCP generate_typescript_types tool, OR the CLI form below.)
pnpm dlx supabase@latest gen types typescript --project-id pcgvpypzfwuchyfwdlwe > lib/types/database.ts
```
Expected diff: `agents` gains `auto_post`, `auto_post_daily_cap`, `last_checked_at`; `run_items` gains `posted_via`; `api_usage_events` gains `source`; `item_status` enum gains `posting`; `usage_kind` enum gains `x_timeline`; `Constants` arrays updated.

---

# STAGE A+B (FULL DETAIL) — X-optional lifecycle + reliable engine + drafts worklist

**Demo philosophy:** Slice 1 makes the **no-X loop walkable** before any engine hardening lands. Each subsequent slice adds one demoable capability. Order: de-gate → reliable engine → run history/drafts → post-at-intent → terminal state + new-drafts badge → cleanups.

---

## SLICE 1 — The no-X happy path is walkable (de-gate)

> **Demo after this slice:** a brand-new account with **zero X connection** can reach `/dashboard/agents`, click an **enabled** "New agent", build + **Save** an agent, click **Run saved agent**, and see drafts appear. (The run still uses the old browser-drain mechanism — hardening is Slice 2. This slice proves the gate is gone.)

### Task A0 — Apply the Stage A+B migration + regenerate types

**Files:** Modify `lib/types/database.ts` (regenerated).

- [ ] 1. Apply the `ALTER TYPE ... ADD VALUE` statements (`item_status += 'posting'`, `usage_kind += 'x_timeline'`) via `mcp__plugin_supabase_supabase__apply_migration` as migration `issue_37_stage_ab_enums` (their own call — see the enum-tx note above).
- [ ] 2. Apply the `ALTER TABLE agents ...` + `ALTER TABLE run_items ...` + `ALTER TABLE api_usage_events ...` statements as migration `issue_37_stage_ab_columns`.
- [ ] 3. Regenerate `lib/types/database.ts` (MCP `generate_typescript_types` or the CLI form above). Confirm `auto_post`, `auto_post_daily_cap`, `last_checked_at` on `agents.Row/Insert/Update`; `posted_via` on `run_items`; `source` on `api_usage_events`; `posting` in `item_status`; `x_timeline` in `usage_kind`; updated `Constants`.

**Verify:** `pnpm build` exits 0 (the regenerated types compile against existing code).

```bash
pnpm build && echo "BUILD_OK"
```
Expected: `BUILD_OK`.

### Task A1 — Remove the X-required 403 from save-agent

**Files:** Modify `app/api/agents/save-agent/route.ts`.

- [ ] 1. Delete the X-connection 403 block (lines 92-108):

```ts
// DELETE this block entirely:
  const { data: connection } = await supabase
    .from("x_connections")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{
      id: string;
    }>();
  if (!connection) {
    return NextResponse.json(
      {
        error: "Connect X before creating an agent.",
      },
      {
        status: 403,
      },
    );
  }
```

(The function continues with `let body: unknown; try { body = await req.json(); } ...` — that stays.)

**Verify:** `pnpm build && echo OK`; `pnpm lint:fix app/api/agents/save-agent/route.ts`. Expected: build OK, no unused-var warnings (the deleted block was the only `connection` use).

### Task A2 — Remove the X-required 403 from the prompt-lab scan

**Files:** Modify `app/api/agents/scan/route.ts`.

- [ ] 1. Delete the un-named 403 block (lines 30-41) — the `x_connections` select + `if (!connection)`:

```ts
// DELETE this block entirely:
  const { data: connection } = await supabase
    .from("x_connections")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{
      id: string;
    }>();
  if (!connection) {
    return new Response("Connect X before creating an agent.", {
      status: 403,
    });
  }
```

(Parsing of `rawBody` continues unchanged immediately below.)

**Verify:** `pnpm build && echo OK`; `pnpm lint:fix app/api/agents/scan/route.ts`. Expected build OK.

### Task A3 — Enable the Run button without X + de-gate the connect-x page

**Files:** Modify `components/agents/agent-detail.tsx`, `app/dashboard/connect-x/page.tsx`.

- [ ] 1. In `agent-detail.tsx`, change the Run button's `disabled` to depend on `running` only and delete the "Connect X to run" hint (lines 308-330). Replace:

```tsx
              disabled={running || !xConnected}
            >
              <span className="ld" aria-hidden="true" />
              {running ? (
                <>
                  <Spinner className="size-4" />
                  Running…
                </>
              ) : (
                "Run saved agent"
              )}
            </button>
            {!xConnected && (
              <span
                style={{
                  marginLeft: 12,
                  font: "400 0.8125rem/1 var(--font-sans)",
                  color: "var(--faint)",
                }}
              >
                Connect X to run
              </span>
            )}
```

with:

```tsx
              disabled={running}
            >
              <span className="ld" aria-hidden="true" />
              {running ? (
                <>
                  <Spinner className="size-4" />
                  Running…
                </>
              ) : (
                "Run saved agent"
              )}
            </button>
```

- [ ] 2. In `connect-x/page.tsx`, leave the page reachable but stop framing it as the required gate: keep the JSX as-is (the disabled "New agent" + connect empty state is fine for the *optional* entry surface), but verify no other code force-redirects unconnected users here (Task A4). The page itself needs no functional change beyond the audit in A4 — confirm it still renders and the `ConnectXButton` works with `?next=`.

**Verify:** `pnpm build && echo OK`; `pnpm lint:fix components/agents/agent-detail.tsx`. (`xConnected` prop is still used elsewhere — keep it; if lint flags it unused after this slice, leave it: Slice 4 re-uses it for the connect-bar.)

### Task A4 — Map + neutralize every redirect into connect-x

**Files:** audit-only first, then Modify any file that force-funnels to `/dashboard/connect-x`.

- [ ] 1. Grep for every redirect/link that funnels unconnected users to connect-x:

```bash
grep -rn "connect-x" app components lib middleware.ts proxy.ts 2>/dev/null | grep -v node_modules
```
Expected hits to reason about: `app/dashboard/connect-x/page.tsx` (the page itself — keep), `components/dashboard/workspace-shell.tsx:141-143` (treats connect-x as the agents view — keep, it's nav-highlight only, not a redirect).

- [ ] 2. Confirm `proxy.ts` (per-request Supabase session refresh) does NOT gate on X (AGENTS.md: don't touch the wrapping). Read it; assert no connect-x redirect. If a redirect exists anywhere that forces unconnected users off `/dashboard/agents`, remove it so the landing is the working agents list.
- [ ] 3. Confirm `app/dashboard/agents/page.tsx` already renders an **active** `New agent` Link (it does, line 34) — the unconnected landing is correct once nothing redirects away.

**Verify (browser-agent — Slice 1 demo):**
```
1. Sign in as a NO-X account (or disconnect X first via Settings).
2. Navigate to /dashboard/agents → expect the agents list with an ENABLED "New agent" button (not the disabled connect-x gate).
3. Click "New agent" → /dashboard/agents/new chat loads (no redirect to connect-x).
4. Build a minimal agent in chat (name + scanning + drafting + web search OR one handle), Save → lands on /dashboard/agents/[id] with NO 403.
5. Click "Run saved agent" → drafts appear under "Latest run" (old drain mechanism still OK here).
EXPECT: full no-X loop walkable; no "Connect X" gate anywhere on the happy path.
```

**Commit:** `feat(agents): de-gate X — no-X create/save/run loop walkable`

---

## SLICE 2 — Every run reaches a terminal state independent of the client

> **Demo after this slice:** start a run, **close the tab mid-run**, reopen `/dashboard/agents/[id]` ~30s later → the run shows `completed` with drafts (not stuck `running`). This is the root never-hang fix.

### Task A5 — Extract `persistRunResult` (pure, source-agnostic)

**Files:** Create `lib/scan/persist.ts`.

- [ ] 1. Create `lib/scan/persist.ts` holding the body currently at `run/route.ts:154-245`, parameterized:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { SCAN_MODEL } from "@/lib/ai/providers";
import { extractMetrics, type ScanResult, storiesFromOutput } from "@/lib/scan/ui-stream";
import type { Database } from "@/lib/types/database";
import type { RunItemInsert } from "@/lib/types";
import { logUsage } from "@/lib/usage/log";

type RunSource = Database["public"]["Tables"]["runs"]["Row"]["source"];

export interface PersistRunResultInput {
  supabase: SupabaseClient<Database>;
  runId: string;
  agentId: string;
  userId: string;
  result: ScanResult;
  startedAt: number;
  source: RunSource;
}

/**
 * Drive a finished scan stream into terminal DB state: build run_items, mark the
 * run completed/failed, and log scan usage. Source-agnostic — callable from the
 * manual route's onFinish, the cron's awaited consumeStream, or anywhere else.
 * Mirrors the prior inline run/route.ts:154-245 exactly so behavior is unchanged.
 */
export async function persistRunResult(input: PersistRunResultInput): Promise<void> {
  const { supabase, runId, agentId, userId, result, startedAt, source } = input;
  try {
    const [output, metrics] = await Promise.all([
      result.output,
      extractMetrics(result, startedAt),
    ]);

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

    // future: notify(userId, run) — breaking-news channels (email/WhatsApp/push) go here. No code this milestone.

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
      source, // propagated from runs.source (§11)
      metadata: {
        elapsedMs: metrics.elapsedMs,
        xSearchCalls: metrics.xSearchCalls,
        storyCount: runItems.length,
      },
    });
  } catch (error) {
    console.error("persistRunResult error:", error);
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

- [ ] 2. Export the `ScanResult` type from `lib/scan/ui-stream.ts` so `persist.ts` can import it (it is currently a private `type ScanResult = StreamTextResult<ToolSet, any>` at line 21). Change `type ScanResult` to `export type ScanResult`.

**Verify:** `pnpm build && echo OK`; `pnpm lint:fix lib/scan/persist.ts lib/scan/ui-stream.ts`. Expected build OK. (`logUsage`'s `source` field requires the regenerated `api_usage_events.Insert` from A0 — confirm it compiles.)

### Task A6 — Add timeout + abortSignal + onAbort to the model call

**Files:** Modify `lib/scan/run.ts`.

- [ ] 1. Add an optional `abortSignal` + `onAbort` to `RunScanInput` and the `streamText` call. Change the `RunScanInput` interface to add:

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
  /** Optional external abort (UX stop / reaper). Correctness comes from onAbort, not the client. */
  abortSignal?: AbortSignal;
  /** Called when the stream aborts (timeout or external signal) — wire the run-failed path here. */
  onAbort?: () => void;
}
```

- [ ] 2. Add `timeout`, `abortSignal`, and `onAbort` to the `streamText(...)` call (after `maxOutputTokens`):

```ts
  return streamText({
    model: xai.responses(SCAN_MODEL),
    system: buildScanInstructions(),
    prompt: buildAgentRunUserPrompt({
      scanningInstructions: input.scanningInstructions,
      draftingInstructions: input.draftingInstructions,
      exampleTweets: input.exampleTweets,
    }),
    tools,
    stopWhen: stepCountIs(5),
    temperature: 0,
    topP: 1,
    maxOutputTokens: 1_000_000,
    // Bound the model call well under the route maxDuration = 300s so a hung Grok
    // call fails the run instead of riding to the 300s wall and orphaning it.
    timeout: 240_000,
    abortSignal: input.abortSignal,
    onAbort: input.onAbort,
    output: Output.object({
      schema: scanResultSchema,
    }),
    providerOptions: {
      xai: {
        reasoningEffort: "low",
      },
    },
  });
```

(`timeout` accepts a number of ms — confirmed `TimeoutConfiguration = number | { totalMs?, stepMs?, chunkMs? }` in `ai@6.0.206`.)

**Verify:** `pnpm build && echo OK`; `pnpm lint:fix lib/scan/run.ts`. The prompt-lab `scan/route.ts` calls `runScanStream` without the new optional fields — confirm it still typechecks (optional props).

### Task A7 — Rewrite the manual run route: server-driven completion

**Files:** Modify `app/api/agents/[id]/run/route.ts`.

- [ ] 1. Replace the `scanToUIResponse(...)` return (lines 139-246) with: build the result with an `AbortController`, fire `result.consumeStream({ onError })` server-side (NOT awaited — it drives the model to completion regardless of the client), call `persistRunResult` from `onFinish`, and still return the UI stream for live UX. New tail of the function (after `const runId = run.id;`):

```ts
  const startedAt = Date.now();
  // Server-side abort controller: the timeout in runScanStream drives correctness;
  // this controller is wired so onAbort can mark the run failed.
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
    onAbort: () => {
      // Best-effort: mark the run failed if aborted (timeout). Do not await.
      supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "Run timed out.",
        })
        .eq("id", runId)
        .then(undefined, (e) => console.error("onAbort run update failed", e));
    },
  });

  // SERVER-DRIVEN COMPLETION (the root never-hang fix): consumeStream drives the
  // model to completion and runs onFinish regardless of whether any client reads
  // the response. A closed tab / navigation / dropped network has ZERO correctness
  // consequence. The client read loop below is pure UX. NOT awaited.
  void result
    .consumeStream({
      onError: (error) => {
        supabase
          .from("runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : "Stream error.",
          })
          .eq("id", runId)
          .then(undefined, (e) => console.error("consumeStream onError update failed", e));
      },
    })
    .then(
      () => persistRunResult({
        supabase,
        runId,
        agentId: agent.id,
        userId: user.id,
        result,
        startedAt,
        source: "manual",
      }),
      (e) => console.error("consumeStream failed", e),
    );

  return scanToUIResponse(result);
```

- [ ] 2. Add the import at the top: `import { persistRunResult } from "@/lib/scan/persist";`. Remove now-unused imports: `extractMetrics`, `storiesFromOutput`, `logUsage`, `SCAN_MODEL`, `RunItemInsert` (verify each is unused after the rewrite — `scanToUIResponse` is still used).

> NOTE (concurrency caveat to verify in browser): `consumeStream` + the client also reading the same `result` stream — in AI SDK v6 `toUIMessageStreamResponse()` returns a teed UX stream; `consumeStream()` drives the underlying model run. If the browser-agent demo shows a doubled or empty client stream, fall back to the alternative wiring: drive completion in `onFinish` of `scanToUIResponse` (UX path) AND keep a server-side `result.consumeStream()` as the authority. The reliability invariant is: persistRunResult runs even with no client. Confirm the chosen wiring in the Slice 2 demo before committing.

**Verify (browser-agent — Slice 2 demo, the never-hang proof):**
```
1. On /dashboard/agents/[id], click "Run saved agent".
2. IMMEDIATELY close the browser tab (or navigate away) while it shows "Running…".
3. Wait ~30-60s. Reopen /dashboard/agents/[id].
EXPECT: the latest run shows status "completed" (green) with drafts — NOT stuck "running".
ALSO: a normal run (tab stays open) still streams + shows drafts as before.
```
Plus `pnpm build && echo OK`; `pnpm lint:fix app/api/agents/[id]/run/route.ts`.

**Commit:** `feat(run): server-driven completion via consumeStream + persistRunResult + model timeout`

### Task A8 — Bound the last unbounded fetch (token refresh)

**Files:** Modify `lib/x/tokens.ts`.

- [ ] 1. Add `signal: AbortSignal.timeout(8000)` to the `rotateAccessToken` fetch (line 144), matching the pattern already in `lib/x/client.ts`:

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

**Verify:** `pnpm build && echo OK`; `pnpm lint:fix lib/x/tokens.ts`. (No behavior change on the happy path; bounds the cron path added in C.)

---

## SLICE 3 — Run history is visible (3-tab shell + Drafts worklist)

> **Demo after this slice:** `/dashboard/agents/[id]` shows three tabs (Drafts / Schedule & autonomy / Sources). The **Drafts** tab lists drafted/posted/failed items across the **last ~20 runs** with run group headers, not just the latest run.

### Task B1 — Server-load recent runs + items (Promise.all)

**Files:** Modify `app/dashboard/agents/[id]/page.tsx`.

- [ ] 1. Replace the single-latest-run load (lines 65-95) with a recent-runs load (last 20), batched items, the X-connection boolean, and the new-drafts computation — all independent awaits via `Promise.all` (folds in D4 for this file). Replace from `// Load the latest run only ...` through the `const config = columnsToConfig(agent);` line:

```ts
  // Load recent runs (last ~20) for the Drafts worklist + run-history group headers.
  const { data: runRows } = await supabase
    .from("runs")
    .select(
      "id, status, started_at, completed_at, cost_usd, x_search_count, item_count, error_message, source",
    )
    .eq("agent_id", id)
    .order("started_at", { ascending: false })
    .limit(20);
  const runs = (runRows ?? []) as RunRow[];

  // Load items across those runs + the X-connection boolean concurrently (D4).
  const runIds = runs.map((r) => r.id);
  const [itemsRes, connRes] = await Promise.all([
    runIds.length
      ? supabase
          .from("run_items")
          .select(
            "id, run_id, story_title, story_summary, source_urls, primary_tweet_url, drafted_text, final_text, status, x_tweet_url, posted_at, posted_via, error_message, created_at",
          )
          .in("run_id", runIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as ItemRow[] }),
    supabase.from("x_connections").select("id").maybeSingle<{ id: string }>(),
  ]);
  const items = (itemsRes.data ?? []) as ItemRow[];

  const config = columnsToConfig(agent);
```

- [ ] 2. Update `RunRow` type (add `source`) and `ItemRow` type (add `posted_at`, `posted_via`, `created_at`) at the top of the file:

```ts
type RunRow = Pick<
  Run,
  | "id" | "status" | "started_at" | "completed_at"
  | "cost_usd" | "x_search_count" | "item_count" | "error_message" | "source"
>;

type ItemRow = Pick<
  RunItem,
  | "id" | "run_id" | "story_title" | "story_summary" | "source_urls"
  | "primary_tweet_url" | "drafted_text" | "final_text" | "status"
  | "x_tweet_url" | "posted_at" | "posted_via" | "error_message" | "created_at"
>;
```

- [ ] 3. Update the `<AgentDetail ...>` props: pass `runs={runs}` and `items={items}` (replacing `latestRun`/`latestRunItems`), keep `xConnected={Boolean(connRes.data)}`.

**Verify:** `pnpm build && echo OK` (AgentDetail prop types update in B2). `pnpm lint:fix app/dashboard/agents/[id]/page.tsx`.

### Task B2 — Rewrite agent-detail into the 3-tab shell

**Files:** Modify `components/agents/agent-detail.tsx`; Create `components/agents/panels/DraftsPanel.tsx`, `components/agents/panels/SchedulePanel.tsx`, `components/agents/panels/SourcesPanel.tsx`.

- [ ] 1. Create `components/agents/panels/SourcesPanel.tsx` (extracts the existing Settings tab body — `ConfigForm` + Save settings):

```tsx
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfigForm } from "@/components/agents/config-form";
import type { AgentConfig } from "@/lib/chat/config";

export function SourcesPanel({ agentId, config: initial }: { agentId: string; config: AgentConfig }) {
  const [config, setConfig] = useState<AgentConfig>(initial);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error ?? "Failed to save settings.");
        return;
      }
      toast.success("Settings saved.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [agentId, config]);

  return (
    <div>
      <ConfigForm value={config} onChange={setConfig} />
      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          className={`btn btn-primary${saving ? " loading" : ""}`}
          onClick={handleSave}
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

- [ ] 2. Create `components/agents/panels/SchedulePanel.tsx` as a Stage-A placeholder (C fills it). It must render real content so the tab is demoable, and not collide with C:

```tsx
"use client";

import type { AgentConfig } from "@/lib/chat/config";

export function SchedulePanel({ config }: { config: AgentConfig }) {
  const s = config.schedule;
  const summary =
    s.cadenceMinutes && s.daysOfWeek.length
      ? `Scans every ${s.cadenceMinutes} min on ${s.daysOfWeek.length} day(s) (${s.timezone}).`
      : "No schedule set — this agent runs only when you click Run.";
  return (
    <div>
      <p
        style={{
          margin: 0,
          font: "400 0.9375rem/1.5 var(--font-sans)",
          color: "var(--muted)",
        }}
      >
        {summary}
      </p>
      <p
        style={{
          marginTop: 10,
          font: "400 0.8125rem/1.5 var(--font-sans)",
          color: "var(--faint)",
        }}
      >
        Scheduled and autonomous runs arrive in a later update. Edit cadence + days on the Sources tab for now.
      </p>
    </div>
  );
}
```

- [ ] 3. Create `components/agents/panels/DraftsPanel.tsx` — the worklist (the meat of B). It owns run/post/redraft state, renders run group headers + StoryCards across runs, and includes the run-in-progress + actionable empty states. Full code:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConnectXBar } from "@/components/agents/connect-x-bar";
import { StoryCard } from "@/components/agents/story-card";
import { Spinner } from "@/components/ui/spinner";
import type { PreviewStory } from "@/lib/scan/types";
import type { Run, RunItem } from "@/lib/types";
import { usd } from "@/lib/usage/format";

type RunRow = Pick<
  Run,
  "id" | "status" | "started_at" | "completed_at" | "cost_usd" | "x_search_count" | "item_count" | "error_message" | "source"
>;
type ItemRow = Pick<
  RunItem,
  "id" | "run_id" | "story_title" | "story_summary" | "source_urls" | "primary_tweet_url" | "drafted_text" | "final_text" | "status" | "x_tweet_url" | "posted_at" | "posted_via" | "error_message" | "created_at"
>;

function itemToStory(item: ItemRow, draftOverride?: string): PreviewStory {
  return {
    title: item.story_title ?? "",
    summary: item.story_summary ?? "",
    sourceUrls: item.source_urls ?? [],
    primaryTweetUrl: item.primary_tweet_url ?? "",
    dedupeKey: item.id,
    draft: draftOverride ?? item.final_text ?? item.drafted_text ?? "",
    sources: [],
  };
}

export function DraftsPanel({
  agentId,
  agentName,
  runs,
  items,
  xConnected,
}: {
  agentId: string;
  agentName: string;
  runs: RunRow[];
  items: ItemRow[];
  xConnected: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [redraftingId, setRedraftingId] = useState<string | null>(null);
  const [redraftedTexts, setRedraftedTexts] = useState<Record<string, string>>({});
  const [needsConnect, setNeedsConnect] = useState(false);

  const handleRun = useCallback(async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
      if (!res.ok) {
        toast.error((await res.text().catch(() => "")) || "Failed to start run.");
        return;
      }
      // Drain for live UX only — server-side consumeStream owns correctness.
      if (res.body) {
        const reader = res.body.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      router.refresh();
      toast.success("Run finished.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  }, [agentId, router]);

  const handlePost = useCallback(
    async (itemId: string) => {
      if (postingId || redraftingId) return;
      if (!xConnected) {
        setNeedsConnect(true);
        return;
      }
      setPostingId(itemId);
      try {
        const finalText = redraftedTexts[itemId];
        const res = await fetch(`/api/agents/run-items/${itemId}/post`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalText !== undefined ? { finalText } : {}),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(json.error ?? "Failed to post.");
          return;
        }
        toast.success("Posted to X.");
        router.refresh(); // persistent posted state from DB
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setPostingId(null);
      }
    },
    [postingId, redraftingId, redraftedTexts, xConnected, router],
  );

  const handleRedraft = useCallback(
    async (itemId: string) => {
      if (postingId || redraftingId) return;
      setRedraftingId(itemId);
      try {
        const res = await fetch(`/api/agents/run-items/${itemId}/redraft`, { method: "POST" });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(json.error ?? "Failed to redraft.");
          return;
        }
        const { text } = (await res.json()) as { text: string };
        setRedraftedTexts((prev) => ({ ...prev, [itemId]: text }));
        toast.success("Redrafted.");
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setRedraftingId(null);
      }
    },
    [postingId, redraftingId],
  );

  const itemsByRun = new Map<string, ItemRow[]>();
  for (const it of items) {
    const list = itemsByRun.get(it.run_id) ?? [];
    list.push(it);
    itemsByRun.set(it.run_id, list);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`btn btn-primary${running ? " loading" : ""}`}
          onClick={handleRun}
          disabled={running}
        >
          <span className="ld" aria-hidden="true" />
          {running ? (
            <>
              <Spinner className="size-4" />
              Scanning your beat…
            </>
          ) : (
            "Run saved agent"
          )}
        </button>
      </div>

      {needsConnect && (
        <ConnectXBar
          message="Connect your X account to post this draft."
          nextPath={`/dashboard/agents/${agentId}`}
        />
      )}

      {running && (
        <p style={{ margin: "0 0 14px", font: "400 0.875rem/1.5 var(--font-sans)", color: "var(--faint)" }}>
          Scanning your beat… drafts will appear here when the run finishes.
        </p>
      )}

      {runs.length === 0 && !running && (
        <p style={{ margin: 0, font: "400 0.9375rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
          No runs yet. Click "Run saved agent" to scan your beat and draft stories.
        </p>
      )}

      {runs.map((run) => {
        const runItems = itemsByRun.get(run.id) ?? [];
        return (
          <div key={run.id} style={{ marginBottom: 24 }}>
            <p style={{ margin: "0 0 10px", font: "400 0.8125rem/1 var(--font-sans)", color: "var(--faint)" }}>
              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                new Date(run.started_at),
              )}
              {" · "}
              <span
                style={{
                  color:
                    run.status === "completed" ? "var(--live)" : run.status === "failed" ? "var(--err)" : "var(--faint)",
                }}
              >
                {run.status}
              </span>
              {run.item_count != null && ` · ${run.item_count} items`}
              {run.cost_usd != null && ` · ${usd(run.cost_usd)}`}
              {run.source === "cron" && " · scheduled"}
            </p>
            {run.error_message && (
              <p style={{ margin: "0 0 10px", font: "400 0.875rem/1.5 var(--font-sans)", color: "var(--err)" }}>
                {run.error_message}
              </p>
            )}
            {run.status === "completed" && runItems.length === 0 ? (
              <p style={{ margin: 0, font: "400 0.875rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
                No stories matched — loosen your scanning instructions or widen the window on the Sources tab.
              </p>
            ) : (
              <div className="ws-stories">
                {runItems.map((item) => {
                  const posted = item.status === "posted";
                  const failed = item.status === "failed";
                  return (
                    <StoryCard
                      key={item.id}
                      story={itemToStory(item, redraftedTexts[item.id])}
                      posted={posted}
                      postedUrl={item.x_tweet_url}
                      postedAt={item.posted_at}
                      postedVia={item.posted_via}
                      failedError={failed ? item.error_message : null}
                      onPost={posted ? undefined : () => handlePost(item.id)}
                      onRedraft={posted ? undefined : () => handleRedraft(item.id)}
                      posting={postingId === item.id}
                      redrafting={redraftingId === item.id}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] 4. Rewrite `components/agents/agent-detail.tsx` into the thin 3-tab shell:

```tsx
"use client";

import { useState } from "react";
import { DraftsPanel } from "@/components/agents/panels/DraftsPanel";
import { SchedulePanel } from "@/components/agents/panels/SchedulePanel";
import { SourcesPanel } from "@/components/agents/panels/SourcesPanel";
import type { AgentConfig } from "@/lib/chat/config";
import type { Agent, Run, RunItem } from "@/lib/types";

type RunRow = Pick<
  Run,
  "id" | "status" | "started_at" | "completed_at" | "cost_usd" | "x_search_count" | "item_count" | "error_message" | "source"
>;
type ItemRow = Pick<
  RunItem,
  "id" | "run_id" | "story_title" | "story_summary" | "source_urls" | "primary_tweet_url" | "drafted_text" | "final_text" | "status" | "x_tweet_url" | "posted_at" | "posted_via" | "error_message" | "created_at"
>;

export interface AgentDetailProps {
  agent: Agent;
  config: AgentConfig;
  runs: RunRow[];
  items: ItemRow[];
  xConnected: boolean;
}

type TabValue = "drafts" | "schedule" | "sources";

export function AgentDetail({ agent, config, runs, items, xConnected }: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("drafts");

  return (
    <div>
      <div className="ws-tabs">
        <button type="button" className={`ws-tab${activeTab === "drafts" ? " is-active" : ""}`} onClick={() => setActiveTab("drafts")}>
          Drafts
        </button>
        <button type="button" className={`ws-tab${activeTab === "schedule" ? " is-active" : ""}`} onClick={() => setActiveTab("schedule")}>
          Schedule &amp; autonomy
        </button>
        <button type="button" className={`ws-tab${activeTab === "sources" ? " is-active" : ""}`} onClick={() => setActiveTab("sources")}>
          Sources
        </button>
      </div>

      {activeTab === "drafts" && (
        <DraftsPanel agentId={agent.id} agentName={agent.name} runs={runs} items={items} xConnected={xConnected} />
      )}
      {activeTab === "schedule" && <SchedulePanel config={config} />}
      {activeTab === "sources" && <SourcesPanel agentId={agent.id} config={config} />}
    </div>
  );
}
```

- [ ] 5. Note `ConnectXBar` is created in Slice 4 (Task A9). For Slice 3, temporarily stub `needsConnect`/`ConnectXBar` usage in DraftsPanel: render nothing when `needsConnect` (the post path falls through to the post route, which returns a 400 the toast surfaces). Slice 4 wires the real bar. Mark this as a known follow-up in the commit body.

**Verify (browser-agent — Slice 3 demo):**
```
1. Open /dashboard/agents/[id] for an agent with ≥1 prior run.
2. EXPECT three tabs: Drafts (default), Schedule & autonomy, Sources.
3. Drafts tab: items grouped under run headers (date · status · N items · cost), newest run first.
4. Run again → after finish, a NEW run group appears at the top with its drafts (router.refresh).
5. Sources tab → ConfigForm + Save settings still works (toast "Settings saved").
6. Schedule tab → renders the plain-language summary placeholder.
```
Plus `pnpm build && echo OK`; `pnpm lint:fix` on the four files.

**Commit:** `feat(agents): 3-tab detail shell + drafts worklist across recent runs`

---

## SLICE 4 — Post-at-intent connect + persistent terminal state

> **Demo after this slice:** with no X, clicking **Post** shows an inline connect-X bar (not a toast) that OAuths back to this agent; after connecting, Post returns 201, and the posted/failed/auto badge **survives a refresh**.

### Task A9 — Extract the reusable inline connect-X bar (D6)

**Files:** Create `components/agents/connect-x-bar.tsx`; Modify `app/globals.css`; Modify `components/agents/agent-chat.tsx`.

- [ ] 1. Add a `.workspace`-scoped class to `app/workspace.css` (NOT `globals.css` — AGENTS.md: the `WorkspaceShell` layout CSS lives in `workspace.css`; the `ws-*` classes are all there, e.g. `.workspace .ws-item` at line 682). This replaces the inline `oklch()` from `agent-chat.tsx:708-741`. CONFIRMED tokens in `app/globals.css :root`: `--brand` (line 51), `--brand-ring` (line 52, `oklch(0.6 0.19 262 / 0.16)`), `--radius` (line 47), `--accent-soft` (line 38). NOTE: `--brand-soft` does NOT exist — use the inline tint `oklch(0.6 0.19 262 / 0.06)` (matching the original) or reuse `--accent-soft`; do not invent a token. CSS:

```css
.workspace .ws-connect-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin: 0 0 14px;
  padding: 10px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--brand-ring);
  background: oklch(0.6 0.19 262 / 0.06);
}
.workspace .ws-connect-bar .ws-connect-msg {
  color: var(--faint);
  font: 400 0.8125rem/1.35 var(--font-sans);
}
```
> CSS is PostCSS-owned and Biome-excluded (AGENTS.md), so this is a manual edit, no lint pass.

- [ ] 2. Create `components/agents/connect-x-bar.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { startXConnect } from "@/lib/x/link-identity";

export function ConnectXBar({ message, nextPath }: { message: string; nextPath: string }) {
  const [busy, setBusy] = useState(false);
  const handleConnect = useCallback(async () => {
    setBusy(true);
    try {
      await startXConnect(nextPath); // browser redirects to X on success; returns to ?next=nextPath
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start X connection.");
      setBusy(false);
    }
  }, [nextPath]);

  return (
    <div className="ws-connect-bar">
      <span className="ws-connect-msg">{message}</span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={handleConnect} disabled={busy} style={{ flexShrink: 0 }}>
        {busy ? "Connecting…" : "Connect X"}
      </button>
    </div>
  );
}
```

- [ ] 3. In `agent-chat.tsx`, replace the inline-styled connect bar block (lines 708-741) with `<ConnectXBar message="Connect your X account to post drafts and use your own posts as writing samples." nextPath={\`/dashboard/agents/new?session=${sessionIdRef.current}\`} />` — but keep the existing `handleConnectX` (it force-saves the session first). Simplest: keep `agent-chat.tsx` using its own `handleConnectX` and just swap the markup to the `.ws-connect-bar` class (don't reuse the component here if the session-save coupling makes it awkward; the CSS extraction is the D6 win). The standalone `ConnectXBar` is for the details page.

- [ ] 4. In `DraftsPanel.tsx`, replace the Slice-3 stub with the real `<ConnectXBar message="Connect your X account to post this draft." nextPath={\`/dashboard/agents/${agentId}\`} />` when `needsConnect`.

**Verify (browser-agent — Slice 4 demo, post-at-intent):**
```
1. As a NO-X account, open an agent with drafts → Drafts tab → click "Post" on an item.
2. EXPECT an inline connect-X bar appears (NOT a toast), with "Connect X" button.
3. Click "Connect X" → OAuth round-trip → returns to /dashboard/agents/[id] connected.
4. Click "Post" again → 201, "Posted to X" toast.
```
Plus `pnpm build && echo OK`; `pnpm lint:fix` touched files.

### Task B3 — Owner-explicit shared poster + persistent terminal state

**Files:** Create `lib/x/post-item.ts`; Modify `app/api/agents/run-items/[id]/post/route.ts`, `components/agents/story-card.tsx`.

- [ ] 1. Create `lib/x/post-item.ts` with the owner-explicit poster (the §5.3 cross-account guard). It loads the item via `run_item → agent → user_id`, asserts ownership, posts, and writes terminal state with `posted_via`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDraftIssue } from "@/lib/draft/validate";
import type { Database } from "@/lib/types/database";
import { postTweet } from "@/lib/x/client";
import { getFreshAccessToken } from "@/lib/x/tokens";

export interface PostRunItemResult {
  ok: boolean;
  status: number;
  error?: string;
  id?: string;
  url?: string;
}

/**
 * Post one run_item to X with an EXPLICIT owner assertion (do not rely on RLS —
 * the cron path uses a service-role client that bypasses it). Loads the item +
 * its agent's user_id, asserts agent.user_id === ownerUserId, then posts as that
 * owner. posted_via records whether the post was manual or autonomous.
 */
export async function postRunItem(args: {
  supabase: SupabaseClient<Database>;
  ownerUserId: string;
  itemId: string;
  textOverride?: string;
  postedVia: "manual" | "auto";
}): Promise<PostRunItemResult> {
  const { supabase, ownerUserId, itemId, textOverride, postedVia } = args;

  const { data: item, error: itemError } = await supabase
    .from("run_items")
    .select("id, agent_id, drafted_text, final_text, status, agents!inner(user_id)")
    .eq("id", itemId)
    .maybeSingle<{
      id: string;
      agent_id: string;
      drafted_text: string;
      final_text: string | null;
      status: Database["public"]["Enums"]["item_status"];
      agents: { user_id: string };
    }>();

  if (itemError) return { ok: false, status: 500, error: "Failed to load draft." };
  if (!item) return { ok: false, status: 404, error: "Draft not found." };
  // CROSS-ACCOUNT GUARD: never post agent A's draft with user B's token.
  if (item.agents.user_id !== ownerUserId) return { ok: false, status: 404, error: "Draft not found." };
  if (item.status === "posted") return { ok: false, status: 409, error: "Draft is already posted." };

  const text = (textOverride?.trim() || item.final_text || item.drafted_text) ?? "";
  const issue = getDraftIssue(text);
  if (issue) return { ok: false, status: 400, error: issue };

  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(supabase, ownerUserId);
  } catch (error) {
    return { ok: false, status: 400, error: error instanceof Error ? error.message : "No X connection for this user." };
  }

  const result = await postTweet(accessToken, text);
  if (!result.ok) {
    await supabase
      .from("run_items")
      .update({ status: "failed", final_text: text, error_message: result.error })
      .eq("id", item.id);
    return { ok: false, status: result.status, error: result.error };
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
  if (updateError) return { ok: false, status: 500, error: "Tweet posted, but the item could not be updated." };

  return { ok: true, status: 200, id: result.id, url: result.url };
}
```

- [ ] 2. Rewrite `post/route.ts` to delegate to `postRunItem` (pass the RLS client + the authed user as owner; `postedVia: "manual"`). Replace the body after the auth guard + `requestedText` parse with:

```ts
  const out = await postRunItem({
    supabase,
    ownerUserId: user.id,
    itemId: id,
    textOverride: requestedText || undefined,
    postedVia: "manual",
  });
  if (!out.ok) {
    return NextResponse.json({ error: out.error }, { status: out.status });
  }
  return NextResponse.json({ id: out.id, url: out.url });
```
Remove now-unused imports (`getDraftIssue`, `postTweet`, `getFreshAccessToken`, `RunItem`/`PostableItem` type).

- [ ] 3. Update `story-card.tsx` to render persistent terminal state. Add props `posted`, `postedUrl`, `postedAt`, `postedVia`, `failedError` and render: a posted item shows the tweet link + timestamp + (if `postedVia==='auto'`) an "auto-posted" badge, with the Post button hidden; a failed item shows the error. Add to the props interface and, in the action area, replace the Post button when `posted`:

```tsx
export interface StoryCardProps {
  story: PreviewStory;
  onDraftChange?: (text: string) => void;
  onPost?: () => void;
  onRedraft?: () => void;
  posting?: boolean;
  redrafting?: boolean;
  posted?: boolean;
  postedUrl?: string | null;
  postedAt?: string | null;
  postedVia?: "manual" | "auto" | null;
  failedError?: string | null;
}
```
And in the render (after the draft textarea, before/within the actions block):

```tsx
      {posted ? (
        <div className="ws-item-actions" style={{ alignItems: "center" }}>
          {postedUrl && (
            <a href={postedUrl} target="_blank" rel="noopener noreferrer" className="ws-link">
              View on X
            </a>
          )}
          {postedAt && (
            <span style={{ font: "400 0.75rem/1 var(--font-sans)", color: "var(--faint)" }}>
              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(postedAt))}
            </span>
          )}
          {postedVia === "auto" && <span className="wbadge">auto-posted</span>}
        </div>
      ) : (
        hasActions && (
          <div className="ws-item-actions">
            {/* existing Post + Redraft buttons unchanged */}
          </div>
        )
      )}
      {failedError && (
        <p style={{ margin: "8px 0 0", font: "400 0.8125rem/1.4 var(--font-sans)", color: "var(--err)" }}>
          {failedError}
        </p>
      )}
```

**Verify (curl — owner-guard + persistence):**
```bash
# With a posted item id from the DB and a valid session cookie, re-posting returns 409.
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/agents/run-items/<POSTED_ITEM_ID>/post -H "Content-Type: application/json" -d '{}' -b cookies.txt
# EXPECT: 409 (already posted) — proves persistent terminal state, not optimistic-only.
```
Plus browser-agent: post an item, hard-refresh → the posted link + timestamp persist (not lost). `pnpm build && echo OK`; `pnpm lint:fix` touched files.

**Commit:** `feat(post): owner-explicit shared poster + persistent posted/failed terminal state`

---

## SLICE 5 — New-drafts signal + disconnect behavior + telemetry cleanups

> **Demo after this slice:** the agents list shows a "N new drafts" badge per agent; disconnecting X turns off auto-post (doesn't retire agents); draft/redraft calls log cost.

### Task B4 — New-drafts badge on the agents list

**Files:** Modify `app/dashboard/agents/page.tsx`.

- [ ] 1. Add a per-agent count of `drafted`, non-posted items as a badge. After loading agents, batch-count drafted items per agent (pure DB query, no new table). Add:

```ts
  const agentIds = agents.map((a) => a.id);
  const draftCounts = new Map<string, number>();
  if (agentIds.length) {
    const { data: draftRows } = await supabase
      .from("run_items")
      .select("agent_id")
      .in("agent_id", agentIds)
      .eq("status", "drafted");
    for (const row of (draftRows ?? []) as { agent_id: string }[]) {
      draftCounts.set(row.agent_id, (draftCounts.get(row.agent_id) ?? 0) + 1);
    }
  }
```

- [ ] 2. Render the badge in each card (next to the status), and switch the status label to reporter terms (Running/Paused/Retired):

```tsx
                {(() => {
                  const n = draftCounts.get(agent.id) ?? 0;
                  return n > 0 ? <span className="ws-newbadge">{n} new draft{n === 1 ? "" : "s"}</span> : null;
                })()}
```
And map `active→Running`, `paused→Paused`, `inactive→Retired` in the existing status span text.

- [ ] 3. Add `.ws-newbadge` to `app/workspace.css` (`.workspace`-scoped, alongside the other `ws-*` classes; reuse the confirmed `--accent-soft`/`--accent` tokens):

```css
.workspace .ws-newbadge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font: 600 0.6875rem/1.4 var(--font-sans);
}
```

**Verify (browser-agent):** agents list shows "N new drafts" on agents with un-posted drafts; posting all of an agent's drafts removes its badge after refresh. `pnpm build && echo OK`.

### Task A10 — Disconnect sets auto_post=false, not inactive

**Files:** Modify `app/api/x/disconnect/route.ts`; Modify `lib/x/tokens.ts` (`saveConnection` reactivation).

- [ ] 1. In `disconnect/route.ts`, replace the `status: "inactive"` agents update (lines 79-95) with an `auto_post: false` update + a count for the warning:

```ts
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

- [ ] 2. In `lib/x/tokens.ts` `saveConnection` (lines 91-99), the reactivation `update({ status: "active" }).eq("status","inactive")` becomes a no-op now (agents are never set inactive on disconnect). Leave it (harmless, preserves the legacy inactive→active path) OR delete it if lint flags the unused `agentError`. Prefer leaving it with a comment; the status semantics simplify in C.

**Verify (browser-agent):**
```
1. Connect X, set an agent's auto_post on (once the toggle exists in C — for A+B, set auto_post=true directly via Supabase MCP on one agent).
2. Settings → Disconnect X.
3. EXPECT: agents stay Running (not Retired); the auto_post agent now has auto_post=false (check via Supabase MCP).
```
Plus `pnpm build && echo OK`.

### Task B5 — Log draft + redraft usage (instrument the dead kinds)

**Files:** Modify `lib/draft/generate.ts`, `app/api/agents/run-items/[id]/redraft/route.ts`.

- [ ] 1. `generateDraft` returns text but logs nothing. Add a `kind` + attribution so callers log it. Simplest non-invasive approach: have `generateOnce` read `providerMetadata.gateway.marketCost` and return it, and have the redraft route + persistRunResult's draft step call `logUsage`. Because the run-route drafts happen inside the scan (single Grok call, already logged as `scan`), the unlogged paths are specifically the **redraft route** and any standalone draft generation. Update `generate.ts` `generateOnce` to surface gateway cost:

```ts
async function generateOnce(system: string, prompt: string): Promise<{ text: string; marketCost: number | null; resolved: string | null }> {
  const { output, providerMetadata } = await generateText({
    model: DRAFT_MODEL,
    output: Output.object({ schema: draftSchema }),
    system,
    prompt,
    providerOptions: { ...GATEWAY_PROVIDER_OPTIONS },
  });
  const gw = (providerMetadata?.gateway ?? {}) as Record<string, unknown>;
  const routing = (gw.routing ?? {}) as Record<string, unknown>;
  return {
    text: output.text,
    marketCost: gw.marketCost != null ? Number(gw.marketCost) : null,
    resolved: (routing.finalProvider ?? routing.resolvedProvider) as string | null,
  };
}
```
Update `generateDraft` to thread `marketCost`/`resolved` out in its return (add to the `{ ok: true }` shape) so the route can log it. (Keep the repair-pass cost summed.)

- [ ] 2. In `redraft/route.ts`, after a successful redraft, call:

```ts
  await logUsage({
    kind: "redraft",
    provider: "gateway",
    resolved_provider: result.resolved ?? null,
    model: DRAFT_MODEL,
    user_id: user.id,
    agent_id: agent.id,
    gatewayMarketCost: result.marketCost ?? null,
    source: "manual",
  });
```
(Import `logUsage` + `DRAFT_MODEL`.)

**Verify (browser-agent + Supabase MCP):** redraft a draft → query `api_usage_events` where `kind='redraft'` → a row exists with `cost_usd > 0` (or, if marketCost absent, the `cost==0` guard fires — note it). `pnpm build && echo OK`.

### Task D5 — Module-level cached service-role client

**Files:** Modify `lib/usage/log.ts`, `lib/chat/session-log.ts`.

- [ ] 1. In both files, hoist `createServiceRoleClient()` to a module-level lazily-cached singleton (avoid creating a new client per call):

```ts
import { createServiceRoleClient } from "@/lib/supabase/service-role";
let _client: ReturnType<typeof createServiceRoleClient> | null = null;
function serviceClient() {
  _client ??= createServiceRoleClient();
  return _client;
}
```
Use `serviceClient()` in place of `createServiceRoleClient()` inside the insert calls.

**Verify:** `pnpm build && echo OK`; `pnpm lint:fix lib/usage/log.ts lib/chat/session-log.ts`. (Behavior unchanged; one fewer client construction per telemetry call.)

### Task D1 — `buildXConnectionContext` dedupe

**Files:** Create `lib/chat/x-context.ts`; Modify `app/api/agents/chat/route.ts`, `app/api/agents/chat-debug/route.ts`.

- [ ] 1. Create `lib/chat/x-context.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getFreshAccessToken } from "@/lib/x/tokens";

export interface XConnectionContext {
  connected: boolean;
  username: string | null;
  xUserId: string | null;
  accessToken: string | null;
}

/** Resolve a user's X-connection context for the chat voice step. Never throws. */
export async function buildXConnectionContext(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<XConnectionContext> {
  const { data: xConn } = await client
    .from("x_connections")
    .select("x_username, x_user_id")
    .eq("user_id", userId)
    .maybeSingle<{ x_username: string; x_user_id: string }>();
  let accessToken: string | null = null;
  if (xConn) {
    try {
      accessToken = await getFreshAccessToken(client, userId);
    } catch (err) {
      console.warn("getFreshAccessToken (chat ctx) failed", err);
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

- [ ] 2. Replace the duplicated blocks in `chat/route.ts` (104-121) and `chat-debug/route.ts` (124-142) with `const xConnection = await buildXConnectionContext(<client>, userId);`. Note `chat/route.ts` uses the RLS client (`supabase`) where the original select had no `.eq("user_id")` (RLS scoped it) — the new helper adds the explicit `.eq` which is correct for both RLS and service-role clients.

**Verify:** `pnpm build && echo OK`; `pnpm lint:fix` the three files. Functional: run the chat once (browser or `/chat-debug` skill) → voice step still reflects connection state.

**Commit:** `feat(agents): new-drafts badge, auto_post-off on disconnect, draft/redraft telemetry, shared X-context + cached service client`

---

## STAGE A+B — exit checklist (run before the squash to dev)

- [ ] `pnpm build` exits 0; `pnpm lint` clean (or `pnpm lint:fix` applied).
- [ ] `/simplify` then `/code-review` on the A+B diff; address findings.
- [ ] Browser-agent A+B acceptance run (the §13 list): no-X loop end-to-end (signup → create → save → run → drafts → connect at Post-intent → post 201); run reaches terminal state with the tab closed mid-run; new-drafts badge appears/clears; 3 tabs render.
- [ ] Squash-merge to `dev`. #37 stays open.

---

# STAGE C (TASK-LEVEL OUTLINE) — scheduling + autonomy

> Expanded to full bite-sized detail at Stage C start (A+B informs the exact engine seams). Vertical-slice ordering preserved: a **manual/admin-triggered scheduled run** must be browser-verifiable BEFORE auto-post is enabled. Stage C is **prod-only cron infra** but every piece is verifiable on a preview deploy via the manual trigger.

### Task C0 — Stage C migration + type regen
- Files: `lib/types/database.ts`. SQL: `UNIQUE(agent_id, dedupe_key)` on `run_items`; partial index `agents(next_run_at) WHERE status='active' AND next_run_at IS NOT NULL`; partial index `run_items(agent_id, posted_at) WHERE posted_at IS NOT NULL`; reconcile `agents_monitored_handles_check` from `<=20` to `<=10`; add `'auto_post'`/`'cron'` to any `run_source`/source check as needed. Verify: build OK + the unique constraint exists (Supabase MCP `list_tables`).

### Task C1 — `nextRunAt(agent, after)` + due predicate as PURE functions (verify FIRST)
- Files: `lib/scan/schedule.ts` (NEW). Pure `nextRunAt(schedule, after: Date): Date | null` (DST spring-forward clamp; fall-back first hour; midnight-crossing windows `window_end < window_start`; anchor slots to `window_start + k·cadence`; empty `schedule_days` = disabled → null). Plus `isDue(agent, now): boolean`.
- **Verification (pure-function, the densest logic):** ship a `lib/scan/__verify__/schedule.verify.ts` assertion script run via `node --experimental-strip-types lib/scan/__verify__/schedule.verify.ts` printing PASS/FAIL for explicit cases: (a) weekday 9am-6pm ET every 2h, after 10:05 → next anchored slot 11:00 ET; (b) DST spring-forward 2026-03-08 in America/New_York skips 02:00-03:00; (c) midnight-crossing 22:00-04:00 window includes 01:00; (d) empty days → null; (e) cadence drift: 3 successive calls stay anchored to `window_start + k·cadence`, not `prev + cadence`. This is the (b) verification mode the directive mandates — extract pure, assert with expected values.

### Task C2 — Cross-run dedupe + moving window (P0, gates the track)
- Files: `lib/scan/dedupe.ts` (NEW), `lib/scan/persist.ts` (upsert `ON CONFLICT (agent_id, dedupe_key) DO NOTHING`), the scan input builder. Skip stories whose `(agent_id, dedupe_key)` already exists with status in `('drafted','posted')` within a 14-day lookback. For cron: `fromDate = last completed run start (or now − cadence)`, `toDate = now`; `scan_from`/`scan_to` become manual-run overrides only.
- Verify: pure dedupe-key filter function via `node --experimental-strip-types` (given existing keys + candidate stories → expected survivors); plus the unique constraint blocks a duplicate insert (curl the manual trigger twice, second adds 0 items).

### Task C3 — Cron endpoint + atomic agent lease + reaper (manual-trigger demo slice)
- Files: `app/api/cron/scan/route.ts` (NEW), `lib/scan/reaper.ts` (NEW), `vercel.json` (`crons` ~every 15 min), an admin-gated manual trigger (reuse `isAdmin`). POST-only; constant-time `Bearer CRON_SECRET` via `crypto.timingSafeEqual` (401 otherwise; never trust `x-vercel-cron`). Due query with `LIMIT batch`; atomic lease `UPDATE agents SET next_run_at=<recomputed> WHERE id=$1 AND next_run_at<=now() RETURNING id`; per-agent try/catch; reaper force-fails `running` runs older than ~360s; empty checks bump `last_checked_at` (no runs row). Uses `await result.consumeStream()` → `persistRunResult(..., source:'cron')`.
- **Verify (route, the directive's "scheduled run visible BEFORE auto-post" slice):** on a preview deploy, curl the admin/manual trigger; confirm a `cron`-source run appears on the agent's Drafts tab; run the trigger twice concurrently → exactly one run (lease holds, no double-run); empty result → `last_checked_at` bumped, no runs row; bad/missing `CRON_SECRET` → 401.

### Task C4 — Auto-post (atomic, capped, kill-switched) — LAST slice in C
- Files: `lib/x/post-item.ts` (atomic claim), the cron poster, `lib/usage/*` (per-user daily USD cap). `AUTO_POST_ENABLED` checked first. Atomic per-item claim `UPDATE run_items SET status='posting' WHERE id=$1 AND status='drafted' RETURNING id`; only the row-returner posts → `posted`+`posted_via='auto'` or `failed`. Cap enforced transactionally per agent keyed to the agent's `schedule_timezone` day (optionally `pg_advisory_xact_lock`). Self-heal on `400 invalid_grant`: set `auto_post=false` for that user's agents + reconnect banner. Per-user daily USD cap checked before each scheduled scan.
- Verify: pure cap math via `node --experimental-strip-types` (count vs cap → allowed/blocked); curl the manual trigger with auto_post on → no double-post under concurrent triggers (claim holds); cap blocks the (cap+1)th; kill switch off → zero posts.

### Task C5 — Schedule & autonomy tab UI (fills SchedulePanel)
- Files: `components/agents/panels/SchedulePanel.tsx`. Browser-defaulted tz **select** (`Intl.DateTimeFormat().resolvedOptions().timeZone`); plain-language summary from the SAME `nextRunAt`; `auto_post` toggle visually gated behind X-connected + schedule-set + a one-time confirm naming the exact @handle; "N of M auto-posts used today".
- Verify: browser-agent — set a schedule, see "next run in ~X"; toggle gated until X connected + days chosen; confirm dialog names the handle.

### Task C6 — Cost telemetry: source dimension + bySource on usage
- Files: `lib/usage/aggregate.ts`, `app/dashboard/usage/*`. Propagate `runs.source` → `logUsage.source`; add a bySource breakdown; cost==0 guard alert on token-bearing calls.
- Verify: usage page shows manual vs cron vs auto_post split after a few runs.

**Stage C exit:** pure-function assertions PASS; manual-trigger checks on preview (lease, claim, cap, dedupe, heartbeat, kill switch); `/simplify`+`/code-review`+build+browser. Squash → `dev`.

---

# STAGE D (TASK-LEVEL OUTLINE) — protected monitoring (opt-in, ships last)

> Expanded at Stage D start. Reuses `lib/x/timeline.ts:fetchRecentPosts` (already prefers the user OAuth token) + `verified_x_handles` cache. No new OAuth scope (`tweet.read`+`users.read` suffice; `follows.read` would force re-consent).

### Task D0 — Stage D migration + regen
- `agents.protected_monitoring boolean NOT NULL DEFAULT false`. Verify build OK.

### Task D1 — Protected-read scan augmentation
- Files: `lib/scan/protected.ts` (NEW), `lib/scan/run.ts` (new tagged prompt block with real per-tweet URLs `https://x.com/i/web/status/<id>`). When `protected_monitoring` on + X connected: per monitored handle resolve `x_user_id` (cache hit in `verified_x_handles`, else `getUserByUsername`), `fetchRecentPosts` with the user token, feed tweets to the scan as an additive block (public coverage still via `xSearch`). Fall back to `xSearch` when disconnected or a read fails.
- Verify: browser-agent — toggle on for a followed protected account; drafts cite real `status/<id>` URLs; disconnect → falls back to xSearch (no error).

### Task D2 — `x_timeline` cost wiring
- Files: `lib/usage/pricing.ts` (`X_TIMELINE_*`), `lib/usage/cost.ts` (`x_timeline` branch ≈ $0.005/post read + $0.010/user lookup), the protected reader logs `kind:'x_timeline', provider:'x_api'`. Fold into the per-user daily cap. Verify: pure cost-branch assertion via `node --experimental-strip-types`; usage row appears with cost>0.

### Task D3 — Protected toggle UI
- Files: `SchedulePanel.tsx` or `SourcesPanel.tsx`. Per-agent toggle, only meaningful when X connected. Verify: browser-agent toggle persists; disabled/hint when no X.

**Stage D exit:** protected toggle works on a followed protected account; cost logged under `x_timeline`; xSearch fallback when disconnected; `/simplify`+`/code-review`+build+browser. Squash → `dev`. **Close #37.**

---

## SECURITY & SAFETY (carried through all stages)
- Cron auth: constant-time `Bearer CRON_SECRET`; never `x-vercel-cron` (C3).
- Service-role bypasses RLS: every cron query hand-scoped by `user_id`/`agent_id`; the owner-explicit poster re-asserts ownership (B3, reused in C4). A single missed filter is a cross-account leak — the `postRunItem` ownership assertion is the guard.
- Auto-post containment: default-off + per-agent daily cap + global `AUTO_POST_ENABLED` + `posted_via` audit + first-enable confirm + self-heal on token death (C4).
- No open redirect: `isSafeNextPath` on all `?next=` paths through the de-gated connect-x flow (A4, A9).
- Protected-tweet privacy: RLS on stored content; never expose another user's protected reads (D).

---

## SELF-REVIEW

### Spec-coverage map (every spec section → task)
- §2.1 X optional everywhere → A1, A2, A3, A9, B3.
- §2.2 connect-X hard gate removed → A3, A4; `?next=`/`?session=` preserved (A9 reuses `startXConnect`).
- §2.3 notifications cut, single seam comment → seam in `persistRunResult` (A5).
- §2.4 autonomy default-OFF + cap + kill switch + disconnect→auto_post=false → A10 (disconnect), C4 (cap/kill), schema A0.
- §2.5 Section E in (run-history, scheduled runs, protected) → B1/B2/B3 (history), C (scheduled), D (protected).
- §2.6 staged A+B→C→D → Stage structure + exit checklists.
- §2.7 empty runs not persisted, last_checked_at heartbeat → schema A0, C3.
- §3.1 two primitives, three consumers → A5 (persistRunResult), A6 (runScanStream timeout), A7 (manual), C3 (cron), scan/route stays usage-only.
- §3.2 server-driven completion → A7 (consumeStream, with the concurrency caveat documented).
- §3.3 reaper + bounded fetch → A8 (token fetch), C3 (reaper).
- §3.4 invariants → §13 demos + C verification.
- §4 schema deltas → A0 (A+B subset), C0, D0; type regen each.
- §5.1 X-decoupling map → A1,A2,A3,A4,A7,A10.
- §5.2 shared engine → A5,A6,A7,A8.
- §5.3 owner-explicit poster + inline connect-bar → B3, A9.
- §5.4 3-tab shell → B2.
- §5.5 folded cleanups: D1 (A9? — D1 in B5 group), D2 (collectToolCalls — folded into C/cleanup or noted: see gap below), D3 (runGroundedDiscovery — gap below), D5 (B5/D5 task), A6 usd() → DraftsPanel uses `usd()`.
- §6 Track B → B1,B2,B3,B4 (new-drafts badge), run-in-progress + empty states (DraftsPanel), end-to-end cost (B5 + usd()).
- §7 Track C → C1–C6.
- §8 Track D → D0–D3.
- §9 cleanup: D4 (Promise.all) → B1 (this file), chat/route + new/page noted as standalone first commit (gap: see below); D6 connect-bar CSS → A9.
- §10 security → dedicated section.
- §11 cost → B5 (draft/redraft), C6 (source dim), C4 (per-user cap), cost==0 guard (C6).

### Placeholder scan
- No TBD/TODO left as deliverables. Stage C/D are explicitly OUTLINE-level by directive, not placeholders — each names files + key steps + a concrete verification mode.
- Two HONEST GAPS flagged for stage-start expansion (not silent): **D2 (`collectToolCalls`)** and **D3 (`runGroundedDiscovery`)** from spec §5.5 are NOT yet assigned a Stage A+B task — they are pure refactors of `chat/route.ts`/`discover.ts` with no behavior change, low-risk, and best folded into the Stage-C cleanup commit or a dedicated "A+B cleanups" task if time allows. Also the **D4 standalone commits** for `chat/route.ts convertToModelMessages + x_connections` and `agents/new/page.tsx sessions list` are only partially covered (B1 covers `agents/[id]/page.tsx`); add a small "D4 Promise.all" task at A+B start if batching those two is desired.

### Type/name consistency
- `persistRunResult` signature is identical everywhere (A5 def; A7 + C3 callers).
- `ScanResult` exported from `ui-stream.ts` (A5 step 2) and imported by `persist.ts`.
- `RunRow`/`ItemRow` Pick types match between `page.tsx` (B1), `AgentDetail` (B2), `DraftsPanel` (B2) — all include `source`, `posted_at`, `posted_via`, `created_at`.
- `postRunItem` (B3) returns `{ ok, status, error?, id?, url? }`; the route maps it; C4 reuses it with `postedVia:'auto'`.
- `logUsage` `source` field requires the regenerated `api_usage_events.Insert` (A0) before B5/A5 compile — A0 is the first task.
- Tokens: all new fetches use `AbortSignal.timeout(8000)` matching `lib/x/client.ts`; the model call uses `timeout: 240_000` (number form, confirmed valid).
