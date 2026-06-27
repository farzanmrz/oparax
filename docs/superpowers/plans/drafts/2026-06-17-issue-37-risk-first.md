# Issue #37 Full Reporter Lifecycle — Implementation Plan (Risk-First)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full reporter lifecycle (signup → optional connect-X → create → save → run → review drafts → post → schedule → autonomous) so the happy path **never hangs** and **every run reaches a terminal state regardless of client**, then layer scheduling/auto-post/protected-monitoring on the proven engine.

**Architecture:** Replace the single inline `runScanStream`-in-route pattern with two pure primitives — `runScanStream` (streaming, now bounded) + `persistRunResult` (source-agnostic terminal-state writer) — driven **server-side** via `result.consumeStream()` so completion is independent of the browser. A stale-run reaper + bounded external fetches guarantee the reliability invariants. Stage C adds atomic concurrency primitives (agent lease, per-item post claim, cross-run dedupe, transactional cap) **before** any auto-post rides on them. Stage D adds opt-in protected monitoring last.

**Tech Stack:** Next.js App Router (TS strict, `@/*`), Vercel AI SDK v6 (`ai`, `@ai-sdk/xai`), Supabase (Postgres + RLS, MCP for migrations), Biome, pnpm. **No test runner** — verification is `pnpm build`, pure-function `tsx` assertion scripts, `curl`, and browser-agent checklists.

---

## How this plan is ordered (the risk-first directive)

This plan deliberately **front-loads the scariest, least-certain infrastructure** and proves it before any feature depends on it. The ordering rule for every task: *what breaks worst if wrong, and what are we least sure of, goes first.*

- **Stage A** builds and proves the **never-hang engine** (Tasks A1–A6) — `persistRunResult` extraction, `consumeStream` server-driven completion, the model-call timeout + `onAbort`, the stale-run reaper, the token-refresh fetch timeout — with a **tab-closed-mid-run kill test** at the checkpoint **before** any X-decoupling UI (A7–A10) is touched.
- **Stage C** builds the **concurrency-safety primitives** (atomic lease, atomic per-item claim, cross-run dedupe UNIQUE + window, transactional cap) and **adversarially verifies them by simulating a double-fire** *before* auto-post is wired.
- Each high-risk task ends with an explicit **KILL-CRITERIA / CHECKPOINT**: if the proof fails, stop and fix before proceeding — do not build features on an unproven base.

Stages A+B are written at **full bite-sized granularity** (executed next). Stages C and D are a **task-level outline** (titles + files + key steps + verification approach) — they are intentionally NOT expanded into speculative code, because A+B's outcomes inform them and each is detailed at its own stage-start. This is honest scoping, not a placeholder.

---

## FILE STRUCTURE (created / modified, one responsibility each)

### Stage A — Foundation (engine + safety + X-decoupling + tab shell)

**New files**
- `lib/scan/persist.ts` — `persistRunResult(...)`: source-agnostic writer that turns a finished `StreamTextResult` into terminal `runs` + `run_items` rows + `logUsage`. The *single* run-completion chokepoint (carries the documented `notify()` seam comment). Extracted from `run/route.ts:154-245`.
- `lib/scan/reaper.ts` — `reapStaleRuns(serviceClient, olderThanMs)`: force-fail `running` runs whose `started_at` exceeds the threshold. Pure-ish (one query + one update); called per cron tick (Stage C) and exported now so Stage C imports it.
- `lib/x/connection-context.ts` — `buildXConnectionContext(client, userId)` (cleanup D1): dedupes the `x_connections` + `getFreshAccessToken` block from `chat/route.ts:104-121` and `chat-debug/route.ts:124-142`.
- `lib/chat/tool-calls.ts` — `collectToolCalls(steps)` + the shared `ToolCallLog` type (cleanup D2): dedupes the `flatMap(... toolResults.find ...)` block in `chat/route.ts:166-175` and `chat-debug/route.ts:164-173`.
- `lib/post/post-run-item.ts` — `postRunItem({ supabase, ownerUserId, item, text })` (§5.3): owner-explicit shared poster; asserts `item.agent.user_id === ownerUserId` before `postTweet`. The route passes the RLS client; Stage C cron passes a service-role client.
- `components/agents/panels/DraftsPanel.tsx` — Drafts tab body (placeholder in A; filled in B).
- `components/agents/panels/SchedulePanel.tsx` — Schedule & autonomy tab body (placeholder in A; filled in C).
- `components/agents/panels/SourcesPanel.tsx` — Sources tab body: wraps the existing `ConfigForm` + Save settings (moved out of `agent-detail.tsx`).
- `components/agents/connect-x-bar.tsx` — inline connect-X bar for the details page Post-intent (reuses `startXConnect` + `isSafeNextPath`, styled via globals).

**Modified files**
- `lib/scan/run.ts:48-71` — add `timeout` + `abortSignal` + `onAbort` to the `streamText` call.
- `app/api/agents/[id]/run/route.ts` — thin streaming wrapper: create run, call `runScanStream`, kick `result.consumeStream()` server-side, `onFinish → persistRunResult`; delete the `inactive → 409` block (74-78).
- `app/api/cron/scan/route.ts` — **created in Stage C**, but Stage A leaves `persistRunResult`/`reaper` import-ready.
- `app/api/agents/scan/route.ts:37-41` — delete the un-named `403 "Connect X..."`.
- `app/api/agents/save-agent/route.ts:92-108` — delete the `if (!connection) → 403` block.
- `app/api/agents/run-items/[id]/post/route.ts` — delegate to `postRunItem`; render-side connect-X bar handles the no-X case.
- `app/api/x/disconnect/route.ts:~95` — stop marking agents `inactive`; set `auto_post = false` + return a warning count.
- `lib/x/tokens.ts:144` — add `signal: AbortSignal.timeout(8000)` to the `rotateAccessToken` fetch.
- `components/agents/agent-detail.tsx` — rewrite into the 3-tab shell delegating to the three panels; remove the `!xConnected` Run gate + hint (308, 320-330); replace inline `$${cost_usd.toFixed(4)}` with `usd()` (363); use `consumeStream` semantics (the client read loop is pure UX).
- `app/dashboard/agents/[id]/page.tsx` — `Promise.all` the independent awaits (cleanup D4); Stage B extends the run fetch.
- `app/dashboard/connect-x/page.tsx` — keep reachable as optional; the disabled "New agent" already only lives here (the agents list already has a working button) — verify nothing else funnels here.
- `app/api/agents/chat/route.ts` + `app/api/agents/chat-debug/route.ts` — use `buildXConnectionContext` + `collectToolCalls`.
- `lib/usage/log.ts` + `lib/chat/session-log.ts` — module-level cached service-role client (cleanup D5).
- `app/globals.css` — add `@layer components` classes for the connect-X bar (cleanup D6, done early).

### Stage B — Drafts worklist / run-history (E1) — full bite-sized below
**New:** none required beyond DraftsPanel fill. **Modified:** `DraftsPanel.tsx`, `app/dashboard/agents/[id]/page.tsx`, `components/agents/story-card.tsx`, `app/dashboard/agents/page.tsx`, `lib/draft/generate.ts` + the redraft route (draft-cost logging), `lib/usage/cost.ts` (draft/redraft already gateway-priced — verify path).

### Stage C — Scheduling + autonomy (outline)
**New:** `lib/schedule/next-run.ts` (`nextRunAt`), `lib/schedule/due.ts` (due-predicate), `app/api/cron/scan/route.ts`, `app/api/agents/[id]/run-now/route.ts` (admin/manual trigger), cron auth helper. **Modified:** schema (lease, dedupe, cap, posting status), `persist.ts` (empty-run heartbeat), `post-run-item.ts` (atomic claim), `SchedulePanel.tsx`, `lib/usage/*` (source dimension, daily cap).

### Stage D — Protected monitoring (outline)
**New:** `lib/scan/protected.ts` (resolve handle → tweets → tagged prompt block). **Modified:** schema (`protected_monitoring`), `run.ts`/prompt builder (tagged block), `lib/usage/pricing.ts` + `cost.ts` (`x_timeline` kind), `SourcesPanel.tsx`/`SchedulePanel.tsx` (toggle).

---

# STAGE A — FOUNDATION (full bite-sized)

> Branch: `ft/37`. Squash-merges to `dev` with Stage B. **Build the never-hang engine and prove it before the UI work.**

## Task A1: Extract `persistRunResult` (the run-completion chokepoint)

**Why first:** This is the single most duplicated and most correctness-critical block (the `onFinish` body at `run/route.ts:154-245`). Every consumer (manual route, cron, prompt-lab) will compose it. Extracting it pure makes the reliability fixes (A2–A4) and Stage C trivial. Nothing rides correctly until this exists.

**Files:**
- Create: `lib/scan/persist.ts`
- Modify: `app/api/agents/[id]/run/route.ts` (replace the inline `onFinish` body)

- [ ] **Step 1: Write `lib/scan/persist.ts`** — verbatim extraction of the existing logic, generalized over the supabase client + source + a pre-created `runId`.

```typescript
// lib/scan/persist.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { SCAN_MODEL } from "@/lib/ai/providers";
import { extractMetrics, storiesFromOutput } from "@/lib/scan/ui-stream";
import type { ScanResult } from "@/lib/scan/ui-stream";
import type { RunItemInsert, RunSource } from "@/lib/types";

export interface PersistRunResultInput {
  /** RLS client (route) or service-role client (cron). */
  supabase: SupabaseClient;
  runId: string;
  agentId: string;
  userId: string;
  result: ScanResult;
  startedAt: number;
  source: RunSource;
}

/**
 * Turn a finished scan stream into terminal runs + run_items rows + usage log.
 * Source-agnostic and idempotent-safe per run (only ever writes one terminal
 * state). This is the SINGLE run-completion chokepoint.
 *
 * // future: notify(userId, run) — channels (email/WhatsApp/push) go here.
 * No emitter/registry exists yet by design (YAGNI, spec §2.3).
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
      metadata: {
        elapsedMs: metrics.elapsedMs,
        xSearchCalls: metrics.xSearchCalls,
        storyCount: runItems.length,
        source,
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

- [ ] **Step 2: Add the missing import** — `persist.ts` references `logUsage`; add it.

```typescript
import { logUsage } from "@/lib/usage/log";
```

- [ ] **Step 3: Export `ScanResult` from `lib/scan/ui-stream.ts`** — it is currently a private `type`; make it exported so `persist.ts` can reuse it.

In `lib/scan/ui-stream.ts`, change line 21 from:
```typescript
type ScanResult = StreamTextResult<ToolSet, any>;
```
to:
```typescript
// biome-ignore lint/suspicious/noExplicitAny: StreamTextResult's OUTPUT generic only affects result.object typing; `unknown` breaks inference downstream callers rely on.
export type ScanResult = StreamTextResult<ToolSet, any>;
```

- [ ] **Step 4: Rewrite the manual run route to compose `persistRunResult`.** Replace `app/api/agents/[id]/run/route.ts:139-247` (the `return scanToUIResponse(...)` block) with the version below. The new wrapper kicks `consumeStream` server-side (A2 makes this the correctness mechanism), keeps `scanToUIResponse` purely for live UX, and delegates persistence.

```typescript
  // Drive completion SERVER-SIDE — persist runs regardless of any client reading
  // the response. The browser stream below is pure UX (live progress).
  void result.consumeStream({
    onError: (error) => console.error("consumeStream error in [id]/run:", error),
  });

  return scanToUIResponse(result, {
    onError: (error) => (error instanceof Error ? error.message : "An error occurred."),
    onFinish: () =>
      persistRunResult({
        supabase,
        runId,
        agentId: agent.id,
        userId: user.id,
        result,
        startedAt,
        source: "manual",
      }),
  });
```

- [ ] **Step 5: Update imports in the run route.** Remove now-unused `extractMetrics`, `storiesFromOutput`, `logUsage`, `SCAN_MODEL`, `RunItemInsert`; add `persistRunResult`.

```typescript
import { runScanStream } from "@/lib/scan/run";
import { scanToUIResponse } from "@/lib/scan/ui-stream";
import { persistRunResult } from "@/lib/scan/persist";
import { createClient } from "@/lib/supabase/server";
import type { Agent } from "@/lib/types";
```

- [ ] **Step 6: Verify the build compiles.**

Run: `pnpm build`
Expected: exits 0, no type errors. (If `extractMetrics`/`storiesFromOutput` were the only `ui-stream` imports in the route, removing them is required — the build will name any leftover unused import.)

- [ ] **Step 7: Lint the touched files.**

Run: `pnpm exec biome check --write lib/scan/persist.ts lib/scan/ui-stream.ts "app/api/agents/[id]/run/route.ts"`
Expected: "Fixed N files" / no remaining errors.

- [ ] **Step 8: Commit.**

```bash
git add lib/scan/persist.ts lib/scan/ui-stream.ts "app/api/agents/[id]/run/route.ts"
git commit -m "refactor: extract persistRunResult as the single run-completion chokepoint"
```

---

## Task A2: Server-driven completion + bounded model call (the root never-hang fix)

**Why second:** This is THE reliability invariant. Today the run only finishes if the browser drains the stream (`agent-detail.tsx:157` unbounded `while(true) reader.read()`); a closed tab orphans the run at `running` forever, and a hung Grok call rides to the 300s `maxDuration` wall. A1 made persistence composable; A2 makes it fire independent of the client and bounds the model call.

**Files:**
- Modify: `lib/scan/run.ts:48-71` (add timeout + abortSignal + onAbort)
- Modify: `app/api/agents/[id]/run/route.ts` (wire the abort controller; consumeStream already added in A1)

- [ ] **Step 1: Add a bounded `streamText` to `runScanStream`.** Extend `RunScanInput` with an optional `abortSignal`, and add `abortSignal` + `onAbort` to the `streamText` call. The model-call timeout is the AI SDK's `abortSignal` driven by `AbortSignal.timeout`; `onAbort` is the failure hook.

Change `lib/scan/run.ts` `RunScanInput` (after line 18) to add:
```typescript
  /** Abort signal; when it fires, the stream ends and onAbort runs. */
  abortSignal?: AbortSignal;
  /** Called when the stream aborts (timeout / caller abort) — fail the run. */
  onAbort?: () => void;
```

Change the `streamText({...})` call (lines 48-71) to add the two options just before `output:`:
```typescript
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
    abortSignal: input.abortSignal,
    onAbort: () => input.onAbort?.(),
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

- [ ] **Step 2: Wire a ~240s timeout in the manual run route.** In `app/api/agents/[id]/run/route.ts`, create the timeout signal before `runScanStream` and pass `onAbort` to fail the run. Insert just before the `const result = runScanStream({` call (currently ~line 127):

```typescript
  const startedAt = Date.now();
  // Bound the model call under the 300s maxDuration wall (spec §3.1). onAbort
  // fails the run; consumeStream (below) ensures persistence regardless of client.
  const abortSignal = AbortSignal.timeout(240_000);
  const failRunOnAbort = () => {
    supabase
      .from("runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: "Run timed out before completing.",
      })
      .eq("id", runId)
      .then(undefined, (e) => console.error("onAbort run update failed", e));
  };

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
    abortSignal,
    onAbort: failRunOnAbort,
  });
```

- [ ] **Step 3: Confirm `consumeStream` is the correctness mechanism.** Verify the `void result.consumeStream(...)` line added in A1-Step4 sits BEFORE the `return scanToUIResponse(...)`. The comment must state the client stream is pure UX. (No code change if A1 was done correctly — this is a read-check.)

- [ ] **Step 4: Make the client read loop a pure-UX affordance.** In `components/agents/agent-detail.tsx` `handleRun` (lines 154-161), keep the drain loop but document that disconnecting has zero correctness consequence, and refresh on completion OR on a client-side timeout. Replace the drain block:

```typescript
      // Pure UX: read the stream for live progress. The server drives completion
      // via consumeStream, so disconnecting here has ZERO correctness consequence.
      if (res.body) {
        const reader = res.body.getReader();
        try {
          while (true) {
            const { done } = await reader.read();
            if (done) break;
          }
        } catch {
          // Client read interrupted — server still persists. Fall through to refresh.
        }
      }
```

- [ ] **Step 5: Verify the build compiles.**

Run: `pnpm build`
Expected: exits 0.

- [ ] **Step 6: KILL-CRITERIA / CHECKPOINT — prove the run reaches terminal state with the tab closed mid-run.** This is the gate for the whole stage; do not proceed to A3+ until it passes.

Browser-agent checklist (human or agent-browser runs against `pnpm dev`, logged in as `testuser@oparax.com` / `hello123`):
1. Open an existing saved agent's detail page at `/dashboard/agents/<id>`.
2. Click "Run saved agent".
3. **Within 3 seconds** (while status is `running`), close the tab / navigate away.
4. Wait ~60s, then in the DB (Supabase MCP `execute_sql`) run:
   `select id, status, completed_at, item_count from runs where agent_id = '<id>' order by started_at desc limit 1;`
5. **Expected:** the latest run row has `status = 'completed'` (or `failed`), `completed_at` non-null. **PASS** = terminal state reached with no client reading. **FAIL** = `status` stuck at `running` → stop; the `consumeStream` wiring is wrong.

- [ ] **Step 7: Commit.**

```bash
git add lib/scan/run.ts "app/api/agents/[id]/run/route.ts" components/agents/agent-detail.tsx
git commit -m "fix: server-driven run completion via consumeStream + bounded model call (never-hang)"
```

---

## Task A3: Stale-run reaper

**Why third:** Even with A2, a process crash, a mid-run deploy, or a bug between `consumeStream` start and `onFinish` can leave a `running` row. The reaper is the backstop that makes "every run reaches a terminal state" unconditionally true. It is exported now and called per cron tick in Stage C, and is independently verifiable now.

**Files:**
- Create: `lib/scan/reaper.ts`

- [ ] **Step 1: Write `lib/scan/reaper.ts`.**

```typescript
// lib/scan/reaper.ts
import type { SupabaseClient } from "@supabase/supabase-js";

/** Default staleness threshold: 360s (covers the 300s wall + slack). */
export const STALE_RUN_MS = 360_000;

/**
 * Force-fail any run stuck in `running` past the staleness threshold. Covers
 * crashes, mid-run deploys, and the maxDuration wall. Returns the failed count.
 * Pass a SERVICE-ROLE client (cron context) so it sees all owners' rows.
 */
export async function reapStaleRuns(
  supabase: SupabaseClient,
  olderThanMs = STALE_RUN_MS,
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const { data, error } = await supabase
    .from("runs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: "Run did not complete in time (reaped).",
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

- [ ] **Step 2: Verify the build compiles.**

Run: `pnpm build`
Expected: exits 0. (No caller yet — Stage C wires it into the cron tick; exporting now keeps the import surface stable.)

- [ ] **Step 3: Verify the cutoff math with a pure assertion script.** The risky part is the `cutoff` ISO computation. Prove it.

Create a throwaway script and run it:
```bash
cat > /tmp/reaper-check.ts <<'EOF'
import { STALE_RUN_MS } from "@/lib/scan/reaper";
const now = Date.now();
const cutoff = new Date(now - STALE_RUN_MS).toISOString();
const ageOfCutoffSec = (now - new Date(cutoff).getTime()) / 1000;
const pass = STALE_RUN_MS === 360_000 && Math.abs(ageOfCutoffSec - 360) < 1;
console.log(pass ? "PASS cutoff=360s ago" : `FAIL cutoff age=${ageOfCutoffSec}s`);
EOF
pnpm exec tsx /tmp/reaper-check.ts
```
Expected output: `PASS cutoff=360s ago`

- [ ] **Step 4: Commit.**

```bash
git add lib/scan/reaper.ts
git commit -m "feat: stale-run reaper (force-fail runs past the staleness threshold)"
```

---

## Task A4: Bound the token-refresh fetch

**Why fourth:** The last unbounded network hop on the eventual headless cron path. `lib/x/client.ts` already added `AbortSignal.timeout(8000)` to its reads; `rotateAccessToken` (`tokens.ts:144`) has none. On the cron path a hung X token endpoint would block the whole tick.

**Files:**
- Modify: `lib/x/tokens.ts:144`

- [ ] **Step 1: Add the timeout signal to the refresh fetch.** In `lib/x/tokens.ts`, change the `fetch(X_TOKEN_ENDPOINT, {...})` call to add `signal: AbortSignal.timeout(8000)`:

```typescript
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

- [ ] **Step 2: Verify the build compiles.**

Run: `pnpm build`
Expected: exits 0.

- [ ] **Step 3: Commit.**

```bash
git add lib/x/tokens.ts
git commit -m "fix: bound the X token-refresh fetch with an 8s timeout"
```

> **CHECKPOINT (engine + safety complete):** A1–A4 establish the reliability invariants. The kill test in A2-Step6 passed. From here, feature/UI work rides on a proven base.

---

## Task A5: Owner-explicit shared poster `postRunItem`

**Why now (still high-risk):** `post/route.ts:58-62` selects the item with **no owner filter** — safe only because the RLS client scopes it. Stage C cron uses a service-role client that bypasses RLS; without an explicit ownership assertion, a bug in the due query could post agent A's draft with user B's token (cross-account posting). Extracting + asserting now retires that danger before the cron exists.

**Files:**
- Create: `lib/post/post-run-item.ts`
- Modify: `app/api/agents/run-items/[id]/post/route.ts`

- [ ] **Step 1: Write `lib/post/post-run-item.ts`.** It loads the item joined to its agent's `user_id`, asserts ownership, posts, and writes the terminal item state. (`posted_via` is added in Stage C's migration; in A this function does not set it — Stage C extends the update.)

```typescript
// lib/post/post-run-item.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDraftIssue } from "@/lib/draft/validate";
import { postTweet } from "@/lib/x/client";
import { getFreshAccessToken } from "@/lib/x/tokens";

export interface PostRunItemResult {
  ok: boolean;
  status: number;
  url?: string;
  id?: string;
  error?: string;
}

/**
 * Post one run item to X under an EXPLICIT owner. Asserts the item's agent is
 * owned by `ownerUserId` before posting with that owner's token — this holds
 * even under a service-role client that bypasses RLS (the cron path, Stage C).
 *
 * @param supabase - RLS client (route) or service-role client (cron)
 * @param ownerUserId - the asserted owner; token + ownership are keyed to this
 * @param itemId - the run_item to post
 * @param requestedText - optional editor override (trimmed by caller)
 */
export async function postRunItem(input: {
  supabase: SupabaseClient;
  ownerUserId: string;
  itemId: string;
  requestedText?: string;
}): Promise<PostRunItemResult> {
  const { supabase, ownerUserId, itemId, requestedText } = input;

  // Load the item + its agent's owner in one join.
  const { data: item, error: itemError } = await supabase
    .from("run_items")
    .select("id, status, drafted_text, final_text, agents(user_id)")
    .eq("id", itemId)
    .maybeSingle<{
      id: string;
      status: string;
      drafted_text: string;
      final_text: string | null;
      agents: { user_id: string } | null;
    }>();

  if (itemError) return { ok: false, status: 500, error: "Failed to load draft." };
  if (!item) return { ok: false, status: 404, error: "Draft not found." };

  // OWNERSHIP ASSERTION — never post another account's draft with this token.
  if (!item.agents || item.agents.user_id !== ownerUserId) {
    return { ok: false, status: 403, error: "Not authorized to post this draft." };
  }
  if (item.status === "posted") {
    return { ok: false, status: 409, error: "Draft is already posted." };
  }

  const text = (requestedText && requestedText.length > 0 ? requestedText : null) ??
    item.final_text ??
    item.drafted_text;
  const issue = getDraftIssue(text);
  if (issue) return { ok: false, status: 400, error: issue };

  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(supabase, ownerUserId);
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : "No X connection for this user.",
    };
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
      error_message: null,
    })
    .eq("id", item.id);

  if (updateError) {
    return { ok: false, status: 500, error: "Tweet posted, but the item could not be updated." };
  }

  return { ok: true, status: 200, url: result.url, id: result.id };
}
```

- [ ] **Step 2: Rewrite the post route to delegate.** Replace the body of `app/api/agents/run-items/[id]/post/route.ts` after the auth + body-parse block with a `postRunItem` call:

```typescript
  const result = await postRunItem({
    supabase,
    ownerUserId: user.id,
    itemId: id,
    requestedText,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ id: result.id, url: result.url });
```

- [ ] **Step 3: Update the post route imports.** Remove `getDraftIssue`, `RunItem`, `postTweet`, `getFreshAccessToken`; add `postRunItem`.

```typescript
import { NextResponse } from "next/server";
import { postRunItem } from "@/lib/post/post-run-item";
import { createClient } from "@/lib/supabase/server";
```

- [ ] **Step 4: Verify the build compiles.**

Run: `pnpm build`
Expected: exits 0. (The `agents(user_id)` embedded select requires the `run_items_agent_id_fkey` relationship, which exists in `database.ts:221`.)

- [ ] **Step 5: Verify the post route still works (curl).** With `pnpm dev` running and a session cookie for a drafted, non-posted item id `<ITEM>`:

```bash
curl -i -X POST http://localhost:3000/api/agents/run-items/<ITEM>/post \
  -H 'Content-Type: application/json' -H 'Cookie: <session>' -d '{}'
```
Expected: `200` with `{"id":...,"url":"https://x.com/i/web/status/..."}` when X is connected; `{"error":"No X connection for this user."}` with `400` when not. (Use the browser instead if cookie capture is awkward — post a draft, expect the toast + link.)

- [ ] **Step 6: Commit.**

```bash
git add lib/post/post-run-item.ts "app/api/agents/run-items/[id]/post/route.ts"
git commit -m "refactor: owner-explicit postRunItem (assert ownership before posting; cron-safe)"
```

---

## Task A6: X-decoupling (remove the gates)

**Why now:** With the engine + poster proven, removing the X requirement is low-risk and unblocks the whole no-X happy path. Spec §5.1.

**Files:**
- Modify: `app/api/agents/save-agent/route.ts:92-108`
- Modify: `app/api/agents/scan/route.ts:30-41`
- Modify: `app/api/agents/[id]/run/route.ts:74-78` (delete `inactive → 409`)
- Modify: `app/api/x/disconnect/route.ts`

- [ ] **Step 1: Remove the save-agent 403.** Delete the entire `const { data: connection } = ...` block and the `if (!connection) { return ... 403 }` at `save-agent/route.ts:92-108`. (The duplicate-name check below it stays.)

- [ ] **Step 2: Remove the scan-route 403.** Delete the `const { data: connection } = ...` block and the `if (!connection) { return ... 403 }` at `scan/route.ts:30-41`.

- [ ] **Step 3: Delete the `inactive → 409` block in the run route.** Remove `run/route.ts:74-78`:
```typescript
  if (agent.status === "inactive") {
    return new Response("Reconnect X to reactivate this agent.", { status: 409 });
  }
```
(The `search_x || search_web` and instructions checks below it stay — they are X-independent.)

- [ ] **Step 4: Change disconnect to disable auto-post instead of marking inactive.** In `app/api/x/disconnect/route.ts`, replace the `agents → status: "inactive"` update with an `auto_post = false` update returning the affected count. (`auto_post` column is added in Stage C's migration; in Stage A it does not yet exist, so this step writes the code but the column write is a no-op until C — gate it.) **Decision:** to avoid referencing a not-yet-existing column in Stage A, keep this step minimal: stop setting `inactive`, and leave a comment that Stage C adds the `auto_post = false` write. Replace the `agentsError` block with:

```typescript
  // X is optional (spec §2.1): disconnecting no longer deactivates agents.
  // Stage C adds: set auto_post=false for this user's agents + warn the count.
  // Manual run/save/scan/draft all keep working with zero X connection.
```
Remove the `const { error: agentsError } = ...` update and its error branch entirely; return `{ ok: true }` directly after the `x_connections` delete.

- [ ] **Step 5: Verify the build compiles.**

Run: `pnpm build`
Expected: exits 0.

- [ ] **Step 6: Lint touched files.**

Run: `pnpm exec biome check --write app/api/agents/save-agent/route.ts app/api/agents/scan/route.ts "app/api/agents/[id]/run/route.ts" app/api/x/disconnect/route.ts`
Expected: clean.

- [ ] **Step 7: Commit.**

```bash
git add app/api/agents/save-agent/route.ts app/api/agents/scan/route.ts "app/api/agents/[id]/run/route.ts" app/api/x/disconnect/route.ts
git commit -m "feat: X is optional — remove connect-X gates from save/scan/run/disconnect"
```

---

## Task A7: Cleanup folded into the files A touches (D1, D2, D5, A6/usd)

**Why bundled here:** These are pure DRY extractions on files A is already editing; doing them now keeps B/C diffs small and avoids re-touching the chat routes.

**Files:**
- Create: `lib/x/connection-context.ts`, `lib/chat/tool-calls.ts`
- Modify: `app/api/agents/chat/route.ts`, `app/api/agents/chat-debug/route.ts`, `lib/usage/log.ts`, `lib/chat/session-log.ts`

- [ ] **Step 1: Write `buildXConnectionContext` (D1).**

```typescript
// lib/x/connection-context.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { XConnectionContext } from "@/lib/chat/tools";
import { getFreshAccessToken } from "@/lib/x/tokens";

/**
 * Resolve a user's X-connection state for the chat voice step. Scopes by
 * user_id explicitly so it is correct under BOTH the RLS client (route) and a
 * service-role client (debug harness). Never throws on token failure — returns
 * a not-connected/no-token context so the chat never hangs.
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

- [ ] **Step 2: Use it in `chat/route.ts`.** Replace lines 104-121 (the `xConn` query + token + `xConnection` object) with:
```typescript
  const xConnection = await buildXConnectionContext(supabase, user.id);
```
Add the import; remove the now-unused `getFreshAccessToken` import if no longer referenced.

- [ ] **Step 3: Use it in `chat-debug/route.ts`.** Replace lines 123-142 (the `serviceClient`/`xConn`/token/`xConnection` block) with:
```typescript
  const serviceClient = createServiceRoleClient();
  const xConnection = await buildXConnectionContext(serviceClient, userId);
```
Remove the now-unused `getFreshAccessToken` import.

- [ ] **Step 4: Write `collectToolCalls` (D2).**

```typescript
// lib/chat/tool-calls.ts
export interface ToolCallLog {
  name: string;
  input?: unknown;
  output?: unknown;
}

/** Flatten AI SDK v6 steps into a tool-call log, pairing each call with its result. */
export function collectToolCalls(
  steps: { toolCalls: { toolName: string; toolCallId: string; input?: unknown }[]; toolResults: { toolCallId: string; output: unknown }[] }[],
): ToolCallLog[] {
  return steps.flatMap((step) =>
    step.toolCalls.map((tc) => {
      const tr = step.toolResults.find((r) => r.toolCallId === tc.toolCallId);
      return { name: tc.toolName, input: tc.input, output: tr ? tr.output : undefined };
    }),
  );
}
```

- [ ] **Step 5: Use `collectToolCalls` in both chat routes.** In `chat/route.ts` replace the `event.steps.flatMap(...)` block (166-175) with `collectToolCalls(event.steps)`; in `chat-debug/route.ts` replace the local `ToolCallLog` type + `steps.flatMap(...)` (163-173) with `collectToolCalls(steps)`. Update `session-log.ts`'s `ChatTurnLog.toolCalls` type to `ToolCallLog[]` imported from the new module (drop the inline shape).

- [ ] **Step 6: Module-level cached service-role client (D5).** In `lib/usage/log.ts` and `lib/chat/session-log.ts`, hoist the client to a module-level lazy singleton:
```typescript
let _client: ReturnType<typeof createServiceRoleClient> | null = null;
function serviceClient() {
  if (!_client) _client = createServiceRoleClient();
  return _client;
}
```
and replace `createServiceRoleClient()` call sites with `serviceClient()`.

- [ ] **Step 7: Replace inline cost format with `usd()` (A6).** In `components/agents/agent-detail.tsx:363`, replace ` · $${latestRun.cost_usd.toFixed(4)}` with the `usd()` helper:
```typescript
{latestRun.cost_usd != null && ` · ${usd(latestRun.cost_usd)}`}
```
and add `import { usd } from "@/lib/usage/format";`. (This file is fully rewritten in A8 — if A8 is done first, fold this in there instead. Track it once.)

- [ ] **Step 8: Verify the build + chat-debug still works.**

Run: `pnpm build`
Expected: exits 0.

Then drive the chat-debug endpoint to confirm the dedupe didn't break the chat:
```bash
curl -s -X POST http://localhost:3000/api/agents/chat-debug \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"a7-check","userMessage":"I cover Premier League transfers","reset":true}' | head -c 400
```
Expected: a JSON object with `text` and `toolCalls` (non-error). (Or invoke the `chat-debug` skill.)

- [ ] **Step 9: Commit.**

```bash
git add lib/x/connection-context.ts lib/chat/tool-calls.ts app/api/agents/chat/route.ts app/api/agents/chat-debug/route.ts lib/usage/log.ts lib/chat/session-log.ts components/agents/agent-detail.tsx
git commit -m "refactor: dedupe X-connection context, tool-call collection, cached service client (D1/D2/D5/usd)"
```

---

## Task A8: Connect-X bar component + globals styles (D6, done early)

**Why now:** A reuses this bar on the details page (the Post-intent fix in A9). Moving the inline `oklch()` connect-bar styles out of `agent-chat.tsx` into `globals.css` first means A9 and the chat both consume one tokenized class.

**Files:**
- Create: `components/agents/connect-x-bar.tsx`
- Modify: `app/globals.css` (add `@layer components` classes)

- [ ] **Step 1: Add the connect-bar classes to `app/globals.css`** inside the existing `@layer components` block (after line 132). Use the existing tokens (`--brand`, `--brand-ring`, `--inset`, `--line`, `--faint`):

```css
  .ws-connect-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--brand-ring);
    border-radius: var(--radius);
    background: color-mix(in oklch, var(--brand) 6%, transparent);
    margin: 0 0 16px;
  }
  .ws-connect-bar p {
    margin: 0;
    font: 400 0.8125rem/1.4 var(--font-sans);
    color: var(--faint);
  }
```

- [ ] **Step 2: Write `components/agents/connect-x-bar.tsx`.** Reuse `startXConnect` and clamp `?next=` with `isSafeNextPath`.

```typescript
"use client";

import { useState } from "react";
import { XIcon } from "@/components/icons";
import { isSafeNextPath } from "@/lib/safe-next";
import { startXConnect } from "@/lib/x/link-identity";

/**
 * Inline connect-X bar for the agent-details Post intent. Opens the OAuth
 * round-trip with a ?next= back to this agent (clamped by isSafeNextPath), so
 * after consent the reporter lands back on the draft they tried to post.
 */
export function ConnectXBar({ nextPath, message }: { nextPath: string; message?: string }) {
  const [pending, setPending] = useState(false);
  const safeNext = isSafeNextPath(nextPath) ? nextPath : "/dashboard/agents";

  async function connect() {
    if (pending) return;
    setPending(true);
    try {
      await startXConnect(safeNext);
    } catch {
      setPending(false);
    }
  }

  return (
    <div className="ws-connect-bar">
      <p>{message ?? "Connect X to post this draft."}</p>
      <button
        type="button"
        className={`btn btn-primary btn-sm${pending ? " loading" : ""}`}
        onClick={connect}
      >
        <span className="ld" aria-hidden="true" />
        <XIcon width={14} height={14} />
        <span>Connect X</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify the build compiles.**

Run: `pnpm build`
Expected: exits 0. (CSS is excluded from Biome per AGENTS.md — do NOT run `biome` on `globals.css`.)

- [ ] **Step 4: Commit.**

```bash
git add components/agents/connect-x-bar.tsx app/globals.css
git commit -m "feat: tokenized connect-X bar component + globals styles (D6, reused on details page)"
```

---

## Task A9: Rewrite agent-detail into the 3-tab shell + extract panels

**Why now:** Done **once** in A so B (Drafts) and C (Schedule) edit disjoint files — killing the worst three-way merge collision (spec §5.4). The Run button loses its `!xConnected` gate; the Post-intent uses the A8 connect-bar.

**Files:**
- Create: `components/agents/panels/DraftsPanel.tsx`, `components/agents/panels/SchedulePanel.tsx`, `components/agents/panels/SourcesPanel.tsx`
- Modify: `components/agents/agent-detail.tsx`

- [ ] **Step 1: Create `SourcesPanel.tsx`** — wraps `ConfigForm` + Save settings (lifted verbatim from `agent-detail.tsx:454-472`).

```typescript
"use client";

import { ConfigForm } from "@/components/agents/config-form";
import type { AgentConfig } from "@/lib/chat/config";

export function SourcesPanel({
  config,
  onChange,
  onSave,
  saving,
}: {
  config: AgentConfig;
  onChange: (next: AgentConfig) => void;
  onSave: () => void;
  saving: boolean;
}) {
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

- [ ] **Step 2: Create `SchedulePanel.tsx`** — placeholder body in A (filled in C).

```typescript
"use client";

export function SchedulePanel() {
  return (
    <p style={{ margin: 0, font: "400 0.9375rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
      Scheduling and autonomy controls are coming soon.
    </p>
  );
}
```

- [ ] **Step 3: Create `DraftsPanel.tsx`** — placeholder body in A (B fills it). It receives the Run handler + latest-run props so A's behavior is preserved; B extends to multi-run.

```typescript
"use client";

import { Spinner } from "@/components/ui/spinner";
import { ScanPreview } from "@/components/agents/scan-preview";
import { ConnectXBar } from "@/components/agents/connect-x-bar";
import type { PreviewStory } from "@/lib/scan/types";
import { usd } from "@/lib/usage/format";

export interface DraftsPanelProps {
  agentId: string;
  running: boolean;
  onRun: () => void;
  latestRun: {
    status: string;
    started_at: string;
    item_count: number | null;
    cost_usd: number | null;
    error_message: string | null;
  } | null;
  stories: PreviewStory[];
  perItem: {
    onPost: (i: number) => void;
    onRedraft: (i: number) => void;
    posting: number | null;
    redrafting: number | null;
  };
  xConnected: boolean;
}

export function DraftsPanel({
  agentId,
  running,
  onRun,
  latestRun,
  stories,
  perItem,
  xConnected,
}: DraftsPanelProps) {
  return (
    <div style={{ marginTop: 20 }}>
      {!xConnected && (
        <ConnectXBar
          nextPath={`/dashboard/agents/${agentId}`}
          message="Connect X to post drafts (creating, running, and drafting all work without it)."
        />
      )}
      <div style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`btn btn-primary${running ? " loading" : ""}`}
          onClick={onRun}
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

      {latestRun && (
        <div>
          <p style={{ margin: "0 0 14px", font: "400 0.8125rem/1 var(--font-sans)", color: "var(--faint)" }}>
            Last run:{" "}
            {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(latestRun.started_at),
            )}
            {" · "}
            <span
              style={{
                color:
                  latestRun.status === "completed"
                    ? "var(--live)"
                    : latestRun.status === "failed"
                      ? "var(--err)"
                      : "var(--faint)",
              }}
            >
              {latestRun.status}
            </span>
            {latestRun.item_count != null && ` · ${latestRun.item_count} items`}
            {latestRun.cost_usd != null && ` · ${usd(latestRun.cost_usd)}`}
          </p>

          {latestRun.error_message && (
            <p style={{ margin: "0 0 14px", font: "400 0.875rem/1.5 var(--font-sans)", color: "var(--err)" }}>
              {latestRun.error_message}
            </p>
          )}

          {stories.length > 0 ? (
            <ScanPreview stories={stories} perItem={perItem} />
          ) : (
            latestRun.status === "completed" && (
              <p style={{ margin: 0, font: "400 0.9375rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
                No stories matched — loosen your scanning instructions or widen the window in Sources.
              </p>
            )
          )}
        </div>
      )}

      {!latestRun && !running && (
        <p style={{ margin: 0, font: "400 0.9375rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
          No runs yet. Click "Run saved agent" to scan your beat and draft stories.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `agent-detail.tsx` to the 3-tab shell.** Keep all the existing state + handlers (`handleRun`, `handlePost`, `handleRedraft`, `handleSaveSettings`, `stories`, `postingIndex`, `redraftingIndex`); replace the JSX `return` (271-475) with a 3-tab switcher delegating to the panels. The Run button NO LONGER checks `xConnected` (gate removed). `TabValue` becomes `"drafts" | "schedule" | "sources"`, default `"drafts"`.

```tsx
  type TabValue = "drafts" | "schedule" | "sources";
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
        <DraftsPanel
          agentId={agent.id}
          running={running}
          onRun={handleRun}
          latestRun={latestRun}
          stories={stories}
          perItem={{
            onPost: (i) => {
              const item = latestRunItems[i];
              if (item && !isPosted(item)) handlePost(item.id);
            },
            onRedraft: (i) => {
              const item = latestRunItems[i];
              if (item) handleRedraft(item.id);
            },
            posting: postingIndex,
            redrafting: redraftingIndex,
          }}
          xConnected={xConnected}
        />
      )}

      {activeTab === "schedule" && <SchedulePanel />}

      {activeTab === "sources" && (
        <SourcesPanel config={config} onChange={setConfig} onSave={handleSaveSettings} saving={savingSettings} />
      )}
    </div>
  );
```

Add the three panel imports at the top; remove now-unused `ScanPreview`, `ConfigForm`, `Spinner` imports from `agent-detail.tsx` (they moved into panels). Keep `itemToStory` and the optimistic state.

- [ ] **Step 5: Verify the build compiles.**

Run: `pnpm build`
Expected: exits 0.

- [ ] **Step 6: Lint touched files.**

Run: `pnpm exec biome check --write components/agents/agent-detail.tsx components/agents/panels/DraftsPanel.tsx components/agents/panels/SchedulePanel.tsx components/agents/panels/SourcesPanel.tsx`
Expected: clean.

- [ ] **Step 7: Browser-agent checklist — the 3 tabs render and Run works without X.**
1. Log in, open `/dashboard/agents/<id>`.
2. Expected: three tabs (Drafts default, Schedule & autonomy, Sources). The Run button is **enabled** even with no X connected; a connect-X bar shows above it.
3. Click "Run saved agent"; expect "Scanning your beat…" then a populated Drafts list.
4. Switch to Sources; expect the ConfigForm + "Save settings". Switch to Schedule; expect the placeholder.

- [ ] **Step 8: Commit.**

```bash
git add components/agents/agent-detail.tsx components/agents/panels/
git commit -m "feat: 3-tab agent details (Drafts/Schedule/Sources); de-gate Run; connect-X bar at Post intent"
```

---

## Task A10: `Promise.all` independent awaits on the details page (D4) + verify no orphan connect-x funnels

**Files:**
- Modify: `app/dashboard/agents/[id]/page.tsx`

- [ ] **Step 1: Parallelize the independent awaits.** The agent fetch must precede the run/items fetch (it gates `notFound`), but the `x_connections` read is independent. Restructure so agent + connection load together, then run, then items:

```typescript
  const [{ data: agent }, { data: connection }] = await Promise.all([
    supabase.from("agents").select("*").eq("id", id).maybeSingle<AgentDetailRow>(),
    supabase.from("x_connections").select("id").maybeSingle<{ id: string }>(),
  ]);

  if (!agent) notFound();
```
(Leave the latest-run + items sequential — items depend on the run id. Remove the later standalone `connection` query.)

- [ ] **Step 2: Confirm no remaining forced redirect to connect-x.** Grep and read each hit (the gate is page-level only; the agents list already has a working button):

Run: `grep -rn "connect-x" app components lib | grep -v "connect-x/page.tsx\|connect-x-button.tsx\|connect-x-bar.tsx"`
Expected: only `auth/callback` (duplicate-identity error case — keep), shell/layout comments, and Settings (keep). **No** layout-level redirect that forces connect-x for normal flows.

- [ ] **Step 3: Verify the build compiles.**

Run: `pnpm build`
Expected: exits 0.

- [ ] **Step 4: Commit.**

```bash
git add "app/dashboard/agents/[id]/page.tsx"
git commit -m "perf: parallelize agent + x_connections loads on details page (D4)"
```

> **CHECKPOINT (Stage A complete):** no-X create→save→run→draft works; runs reach terminal state with the tab closed; Post intent shows the connect-X bar. Proceed to Stage B.

---

# STAGE B — DRAFTS WORKLIST / RUN-HISTORY (full bite-sized)

> Same branch/squash as A. Fills `DraftsPanel`, surfaces per-item terminal state, adds the new-drafts badge, and closes the dead draft/redraft cost-logging gap.

## Task B1: Fetch recent runs + items on the details page

**Files:**
- Modify: `app/dashboard/agents/[id]/page.tsx`
- Modify: `components/agents/agent-detail.tsx` (accept the recent-runs prop)

- [ ] **Step 1: Replace the latest-run-only fetch with the last ~20 runs + their items.** After the agent load, fetch recent runs and all their items in a single items query (`in (runIds)`), via `Promise.all`:

```typescript
  const { data: runRows } = await supabase
    .from("runs")
    .select("id, status, started_at, completed_at, cost_usd, x_search_count, item_count, error_message")
    .eq("agent_id", id)
    .order("started_at", { ascending: false })
    .limit(20);
  const runs = (runRows ?? []) as RunRow[];

  let items: ItemRow[] = [];
  if (runs.length > 0) {
    const { data: itemRows } = await supabase
      .from("run_items")
      .select(
        "id, run_id, story_title, story_summary, source_urls, primary_tweet_url, drafted_text, final_text, status, x_tweet_url, posted_at, error_message",
      )
      .in("run_id", runs.map((r) => r.id))
      .order("created_at", { ascending: false });
    items = (itemRows ?? []) as ItemRow[];
  }
```
Add `posted_at` to the `ItemRow` Pick (page + component). Pass `runs` + `items` to `<AgentDetail>` (replace `latestRun` / `latestRunItems` props with `runs` / `items`; keep `latestRun = runs[0] ?? null` derived inside the component for the Run-meta line, or pass both).

- [ ] **Step 2: Update `AgentDetailProps`** in `agent-detail.tsx` to accept `runs: RunRow[]` and `items: ItemRow[]`; derive `latestRun = runs[0] ?? null`. Seed `postedUrls` from `items` (not `latestRunItems`).

- [ ] **Step 3: Verify the build compiles.**

Run: `pnpm build`
Expected: exits 0.

- [ ] **Step 4: Commit.**

```bash
git add "app/dashboard/agents/[id]/page.tsx" components/agents/agent-detail.tsx
git commit -m "feat: load recent runs + items for the Drafts worklist"
```

## Task B2: Drafts worklist UI (group by run; post/redraft any non-posted drafted item)

**Files:**
- Modify: `components/agents/panels/DraftsPanel.tsx`

- [ ] **Step 1: Render a reverse-chronological worklist.** Replace the single-run rendering with: map each run to a group header (`Intl.DateTimeFormat` date + status + item count + `usd(cost)`), and under it the run's items as `StoryCard`s. Build the `stories` + per-item index mapping across the flattened item list (the parent already passes `perItem` indexed against the flat `items` array — keep indices flat). Post/Redraft enabled for any `status === "drafted"` non-posted item; posted items show the terminal state (B3).

- [ ] **Step 2: Add the run-in-progress + actionable-empty states** (the placeholder strings from A9 stay; ensure the empty state links to Sources via a tab-switch callback or copy). Verify "Scanning your beat…" shows while `running`.

- [ ] **Step 3: Verify the build compiles + browser check.**

Run: `pnpm build` (expect 0), then open a detail page with ≥2 runs: expect grouped headers, each run's drafts beneath, Post/Redraft on drafted items.

- [ ] **Step 4: Commit.**

```bash
git add components/agents/panels/DraftsPanel.tsx
git commit -m "feat: Drafts worklist grouped by run with per-item post/redraft"
```

## Task B3: Per-item terminal state in `story-card.tsx` (survives refresh)

**Files:**
- Modify: `components/agents/story-card.tsx`, `components/agents/scan-preview.tsx` (pass through the terminal props)

- [ ] **Step 1: Extend `StoryCardProps`** with `postedUrl?: string | null`, `postedAt?: string | null`, `failedError?: string | null`, `postedVia?: "manual" | "auto" | null` (the `posted_via` column lands in Stage C; in B it is always null/manual — render the badge only when present).

- [ ] **Step 2: Render terminal states.** When `postedUrl`: replace the Post button with a tweet link + `Intl.DateTimeFormat` timestamp (and an "Auto-posted" badge when `postedVia === "auto"`). When `failedError`: show the error in `--err`, keep Redraft available. Today posted state is optimistic-only (`agent-detail.tsx:100-106`); now it reads from the DB row so it survives refresh.

- [ ] **Step 3: Thread the props** through `scan-preview.tsx` `perItem` / a parallel array, and from `DraftsPanel` using each item's DB `x_tweet_url`/`posted_at`/`error_message`/`status`.

- [ ] **Step 4: Verify build + browser refresh.** Post a draft, refresh the page, expect the posted link + timestamp to persist (not revert to a Post button).

- [ ] **Step 5: Commit.**

```bash
git add components/agents/story-card.tsx components/agents/scan-preview.tsx components/agents/panels/DraftsPanel.tsx
git commit -m "feat: per-item posted/failed terminal state that survives refresh"
```

## Task B4: In-app new-drafts badge on the agents list

**Files:**
- Modify: `app/dashboard/agents/page.tsx`

- [ ] **Step 1: Count drafted, non-posted items per agent.** Extend the agents query with a per-agent count of `run_items` where `status = 'drafted'`. Since the generated client has no aggregate helper here, run a second query grouping in JS: fetch `run_items(agent_id, status)` for the user's agents (RLS-scoped) and count `status === 'drafted'` per `agent_id`. Render `"{n} new drafts"` as a `.wbadge` on each row when `n > 0`.

```typescript
  const { data: draftRows } = await supabase
    .from("run_items")
    .select("agent_id, status")
    .eq("status", "drafted");
  const draftCounts = new Map<string, number>();
  for (const r of (draftRows ?? []) as { agent_id: string; status: string }[]) {
    draftCounts.set(r.agent_id, (draftCounts.get(r.agent_id) ?? 0) + 1);
  }
```
(RLS on `run_items` scopes this to the owner's agents — confirm `run_items` has owner-scoped RLS; if not, join through agents.)

- [ ] **Step 2: Verify build + browser.** An agent with drafted items shows "N new drafts"; zero drafts shows none.

- [ ] **Step 3: Commit.**

```bash
git add app/dashboard/agents/page.tsx
git commit -m "feat: new-drafts badge on the agents list (in-app monitoring signal)"
```

## Task B5: Close the dead draft/redraft cost-logging gap

**Why:** Spec §11 — `draft`/`redraft` usage kinds are dead today; `generateDraft` runs a Gateway call but never logs it. The redraft route calls `generateDraft` and logs nothing. This makes "true end-to-end run cost" wrong.

**Files:**
- Modify: `lib/draft/generate.ts` (return providerMetadata/usage), `app/api/agents/run-items/[id]/redraft/route.ts` (log it)

- [ ] **Step 1: Surface usage from `generateOnce`.** Change `generateOnce` to return `{ text, usage, providerMetadata }` (the `generateText` result already carries these — currently discarded at line 23-34). Thread the LAST call's usage out of `generateDraft` so the caller can log.

- [ ] **Step 2: Log in the redraft route.** After a successful `generateDraft`, call `logUsage({ kind: "redraft", provider: "gateway", resolved_provider, model: DRAFT_MODEL, user_id, agent_id: item.agent_id, gatewayMarketCost: <from providerMetadata.gateway.marketCost> })`. Read `marketCost` defensively exactly as `chat/route.ts:143` does.

- [ ] **Step 3: Log in the run/drafting path if drafts are generated there.** (Scan currently drafts inline via the model; the `draft` kind logs when a separate `generateDraft` is invoked — wire wherever `generateDraft` is called in the save/run path. If none in A/B, the `draft` kind remains exercised only by future per-story drafting; document that.)

- [ ] **Step 4: Verify build + a redraft logs a row.** After a redraft, query `api_usage_events` for `kind = 'redraft'`; expect one row with non-null `cost_usd`.

- [ ] **Step 5: Commit.**

```bash
git add lib/draft/generate.ts "app/api/agents/run-items/[id]/redraft/route.ts"
git commit -m "feat: log draft/redraft Gateway cost (close the dead usage-kind gap)"
```

> **STAGE A+B QC + DELIVERY:** run `/simplify` then `/code-review` on the diff; `pnpm lint:fix` repo-wide; `pnpm build` green; run the full browser checklist (spec §13 Stage A+B: no-X loop end-to-end, tab-closed-mid-run terminal state, the #35 C1–C6 fixes). Hand the checklist to the developer. Squash-merge `ft/37` → `dev`. #37 stays open.

---

# STAGE C — SCHEDULING + AUTONOMY (TASK-LEVEL OUTLINE)

> **Outline only — pending stage-start expansion.** A+B's outcomes (the proven engine, `persistRunResult`, `postRunItem`, `reapStaleRuns`) inform the exact code. Each task below gives title + files + key steps + verification approach. The risk-first ordering: build + adversarially verify the concurrency primitives BEFORE wiring auto-post.

## C0: Schema migration (Stage C deltas) — Supabase MCP
- **Files:** migration via `mcp__plugin_supabase_supabase__apply_migration`; regenerate `lib/types/database.ts` via `mcp__plugin_supabase_supabase__generate_typescript_types`.
- **SQL (key deltas):**
  - `alter type item_status add value 'posting';`
  - `alter table run_items add column posted_via text check (posted_via in ('manual','auto'));`
  - `alter table run_items add constraint run_items_agent_dedupe_uniq unique (agent_id, dedupe_key);`
  - `create index run_items_agent_posted_idx on run_items (agent_id, posted_at) where posted_at is not null;`
  - `alter table agents add column auto_post boolean not null default false, add column auto_post_daily_cap int not null default 3, add column last_checked_at timestamptz;`
  - `create index agents_due_idx on agents (next_run_at) where status = 'active' and next_run_at is not null;`
  - reconcile `agents_monitored_handles_check` to `<= 10`.
  - `alter type usage_kind add value 'x_timeline';` (used in D; safe to add now); add a `source` text/metadata dimension to `api_usage_events`.
- **Verify:** `mcp__plugin_supabase_supabase__list_migrations`; `get_advisors` (security/perf) shows no new errors; `database.ts` diff shows the new columns/enum members. Commit the regenerated types.
- **KILL-CRITERIA:** the unique constraint must add cleanly — if existing rows violate `(agent_id, dedupe_key)`, dedupe them first; do not force-drop the constraint.

## C1: `nextRunAt(agent, after)` — one pure function (P0 math)
- **Files:** Create `lib/schedule/next-run.ts`.
- **Key steps:** implement DST handling (clamp spring-forward gap; first fall-back hour), midnight-crossing windows (`window_end < window_start`), slot anchoring to `window_start + k·cadence` (no drift; cadence min 60), and **empty `schedule_days` ⇒ returns null (scheduling disabled)**. Pure: `(agentScheduleFields, after: Date) → Date | null`.
- **Verify (pure-function assertions, NO test runner):** write `scripts/check-next-run.ts` with explicit cases — a weekday 9am–6pm/2h agent at 9:40 ET → next at 11:00 ET; a Sunday-excluded agent on Sat 23:00 → skips to the next allowed day; a DST spring-forward boundary; a midnight-crossing window; empty days → null. Run `pnpm exec tsx scripts/check-next-run.ts`; each prints `PASS`/`FAIL` with expected vs actual. This is the densest logic and is verifiable ONLY this way (cron is prod-only).
- **KILL-CRITERIA:** any DST/window assertion FAIL blocks the rest of C.

## C2: Cross-run dedupe (P0 — gates the track)
- **Files:** Modify `lib/scan/persist.ts` (upsert `ON CONFLICT (agent_id, dedupe_key) DO NOTHING`), add a pre-draft skip in the scan composition path; reuse the stable `dedupe_key`.
- **Key steps:** before drafting, skip stories whose `(agent_id, dedupe_key)` already exists with status in `('drafted','posted')` within a ~14-day rolling lookback. Change the `run_items` insert to an upsert. Make `scan_from`/`scan_to` manual-run overrides only; compute the cron moving window (`fromDate = last completed run start | now − cadence`, `toDate = now`).
- **Verify:** pure dedupe-key/window helper assertion script; then a DB-level check — insert the same `(agent_id, dedupe_key)` twice, expect one row (constraint) and the second upsert a no-op.
- **KILL-CRITERIA:** if a cron re-find produces a duplicate row, stop — auto-post on top of this would double-post.

## C3: Atomic agent lease + due query + the cron endpoint
- **Files:** Create `app/api/cron/scan/route.ts` (POST-only), `lib/schedule/due.ts` (due-predicate), a cron-auth helper (`crypto.timingSafeEqual` on `Bearer ${CRON_SECRET}`), `app/api/agents/[id]/run-now/route.ts` (admin-gated manual trigger). Register `vercel.json` `crons` (~15 min). Wire `reapStaleRuns` per tick.
- **Key steps:** due query (`next_run_at <= now() AND status != 'paused' AND today ∈ days AND now ∈ window(tz) AND (search_x OR search_web) ORDER BY next_run_at ASC LIMIT batch`); **atomic lease** `UPDATE agents SET next_run_at = nextRunAt(...) WHERE id = $1 AND next_run_at <= now() RETURNING id` — only the row-returner owns the run. Per-agent `try/catch`. Compose `runScanStream` + `await result.consumeStream()` + `persistRunResult({ source: "cron" })`. Empty checks bump `last_checked_at` and do NOT create a `runs` row (spec §2.7).
- **Verify (adversarial — simulate double-fire):** on a preview deploy (or local with a forged secret), call the run-now/cron trigger **twice concurrently** for the same due agent; expect exactly ONE run created (the lease serializes). Curl the cron with a wrong `Authorization` → expect `401`. Curl with the right secret, no due agents → expect `200` + `last_checked_at` bumped, no `runs` row.
- **KILL-CRITERIA:** two runs from a double-fire ⇒ the lease is broken; stop before auto-post.

## C4: Auto-post (atomic per-item claim, transactional cap, kill switch, self-heal)
- **Files:** Modify `lib/post/post-run-item.ts` (atomic claim path + `posted_via = 'auto'`), the cron poster in `app/api/cron/scan/route.ts`, `lib/usage/*` (per-user daily USD cap), disconnect route (`auto_post = false` write now that the column exists).
- **Key steps:** **atomic claim** `UPDATE run_items SET status = 'posting' WHERE id = $1 AND status = 'drafted' RETURNING id` — only the row-returner posts (success → `posted` + `posted_via='auto'`; failure → `failed`). **Cap** enforced transactionally per agent (count posted-today inside the txn, keyed to the agent's `schedule_timezone` day; optional `pg_advisory_xact_lock(hashtext(agent_id))`). Global `AUTO_POST_ENABLED` checked first. **Self-heal:** on `400 invalid_grant` during refresh, set `auto_post=false` for that user's agents + surface a reconnect banner, stop retrying. **Per-user daily USD cap** checked before each scheduled scan (sum `api_usage_events` for the user's tz-day; skip + mark the run when over).
- **Verify (adversarial):** double-fire the claim for one drafted item ⇒ exactly one `posted`. Set the cap to 1, queue 3 auto-posts ⇒ exactly 1 posts. Flip `AUTO_POST_ENABLED=false` ⇒ zero posts. Simulate `invalid_grant` ⇒ `auto_post` flips off + no retry storm.
- **KILL-CRITERIA:** any double-post, cap overshoot, or kill-switch leak blocks merge — this writes to real public accounts.

## C5: Schedule & autonomy tab UI + source-dimension telemetry
- **Files:** Fill `components/agents/panels/SchedulePanel.tsx`; browser-defaulted timezone **select** (`Intl.DateTimeFormat().resolvedOptions().timeZone`) replacing the free-text IANA input in `config-form.tsx`; `auto_post` toggle visually gated behind X-connected + schedule-set + a one-time confirm naming the exact `@handle`; "N of M auto-posts used today". Add a `bySource` breakdown to `dashboard/usage`; propagate `source` from `runs.source` into `logUsage`.
- **Verify:** plain-language summary computed from the SAME `nextRunAt` logic the cron uses ("Scans every 2h on weekdays 9am–6pm ET; next run in 40 min"). Browser checklist: cannot enable cron/auto_post with empty days; toggling auto-post shows the @handle confirm; usage page shows manual vs cron vs auto_post.

> **STAGE C QC + DELIVERY:** pure-function assertions green; adversarial double-fire/cap/kill-switch verified on a preview deploy via the admin trigger; `/simplify` + `/code-review`; `pnpm build`; squash → `dev`. #37 stays open.

---

# STAGE D — PROTECTED MONITORING (TASK-LEVEL OUTLINE)

> **Outline only — pending stage-start expansion.** Ships last on the proven engine. Reuses `fetchRecentPosts` (prefers the user's OAuth token) + the `verified_x_handles` cache.

## D0: Schema delta
- `alter table agents add column protected_monitoring boolean not null default false;` — migration via MCP; regenerate `database.ts`. Verify via `list_migrations` + types diff.

## D1: Protected reads → tagged prompt block
- **Files:** Create `lib/scan/protected.ts`; modify `lib/scan/run.ts` / the prompt builder to accept an additive tagged block; thread `protected_monitoring` + the user token through the run/cron composition.
- **Key steps:** when `protected_monitoring` AND X connected, for each monitored handle resolve `x_user_id` (cache hit in `verified_x_handles`, else `getUserByUsername`), call `fetchRecentPosts` with the user token, and pass tweets as a tagged block with **real** per-tweet URLs (`https://x.com/i/web/status/<id>`) so `scanItemSchema.urls`/`sources` stay real. Public coverage still via `xSearch`; protected reads additive. **Fallback to `xSearch`** when disconnected or a read fails (treat protected-not-followed as "no data"). No new OAuth scope.
- **Verify:** browser/curl with a followed protected account → its posts appear with real status URLs; disconnect → falls back to `xSearch` with no error.

## D2: Cost for `x_timeline`
- **Files:** `lib/usage/pricing.ts` (+ `x_timeline` rate: ≈ $0.005/post read + $0.010/user lookup), `lib/usage/cost.ts` (branch), log with `provider: 'x_api'`; fold into the per-user daily cap (§11).
- **Verify:** pure cost assertion (`computeCostUsd({ kind: 'x_timeline', ... })` → expected USD); a protected read logs a non-zero `x_timeline` row (the cheap zero-cost guard from §11 catches a missing branch).

## D3: UI toggle
- **Files:** `SourcesPanel.tsx` / `SchedulePanel.tsx` — per-agent protected-monitoring toggle (default OFF), only meaningful when X connected.
- **Verify:** browser — toggle persists; disabled/explained when X not connected.

> **STAGE D QC + DELIVERY:** `/simplify` + `/code-review`; `pnpm build`; browser checklist (spec §13 Stage D); squash → `dev`; **close #37**.

---

# SELF-REVIEW

**1. Spec coverage (every spec section → a task):**
- §2.1 X optional → A6. §2.2 gate removed → A6/A9/A10. §2.3 notifications cut + seam comment → A1 (`persistRunResult` comment). §2.4 autonomy/auto_post/cap/kill switch → C4. §2.5 Section E in → B (history/drafts), C (scheduled/auto), D (protected). §2.6 staged delivery → stage headers + QC/delivery notes. §2.7 empty runs not persisted → C3/C0 (`last_checked_at`).
- §3.1 two primitives → A1 (`persistRunResult`) + A2 (`runScanStream` timeout/onAbort); three consumers → A2 (manual), C3 (cron), scan-route prompt-lab (usage-only onFinish unchanged — note: A leaves scan-route's `onFinish` usage-only as-is). §3.2 consumeStream → A2. §3.3 reaper + token fetch timeout → A3 + A4. §3.4 invariants → A2 checkpoint + C3/C4 adversarial.
- §4 schema deltas → C0 (A+B-needed deltas are none new; all schema lands in C0/D0). §5.1 X-decoupling → A6. §5.2 engine → A1–A4. §5.3 owner-explicit poster → A5. §5.4 3-tab shell → A9. §5.5 cleanups D1/D2/D3/D5/A6/seam → A7 (D3 `runGroundedDiscovery` — see GAP below). §6 Drafts/history → B1–B5. §7 scheduling/lease/dedupe/auto-post/UI → C1–C5. §8 protected → D1–D3. §9 cleanups D4/D6 → A10/A8. §10 security → A5 (ownership), C3 (cron auth), C4 (containment), A10 (no open redirect via `isSafeNextPath`). §11 cost/telemetry → B5 (draft/redraft), C5 (source dim/cap), D2 (x_timeline). §13 verification → per-task verify steps + stage QC.

**2. Placeholder scan:** No "TBD/implement later". Stage A+B steps each carry complete code or an exact command + expected output. Stages C/D are explicitly labeled task-level outline (titles/files/key steps/verification), not fabricated code — honest scoping per the directive, not a placeholder.

**3. Type/name consistency:** `persistRunResult` / `PersistRunResultInput`, `ScanResult` (now exported from `ui-stream.ts`), `reapStaleRuns`/`STALE_RUN_MS`, `postRunItem`/`PostRunItemResult`, `buildXConnectionContext`, `collectToolCalls`/`ToolCallLog`, `ConnectXBar`, `DraftsPanel`/`SchedulePanel`/`SourcesPanel`, `nextRunAt` — each defined once and referenced consistently. `RunSource` reused from `lib/types`. `usd()` from `lib/usage/format`.

**GAPS / open concerns flagged for stage-start:**
- **D3 `runGroundedDiscovery` (spec §5.5):** the shared private runner for `discoverHandles`/`discoverSites` (`lib/chat/discover.ts`) is a folded-in cleanup. It is low-risk DRY and not on the critical path; fold into A7 OR defer to a Stage A cleanup commit. Add it as an A7 sub-step at execution if time allows; otherwise track as a follow-up — it does not gate any feature.
- **`run_items` RLS for B4's count query** must be confirmed owner-scoped (or joined through `agents`) before relying on it client-side.
- **Stage A scan-route `onFinish`** stays usage-only (no persist) per spec §3.1 table — confirmed unchanged; only its 403 is removed (A6-Step2).
- **`agents_monitored_handles_check`** reconcile to `<= 10` (C0) — confirm current value is `<= 20` against the live DB before altering.
