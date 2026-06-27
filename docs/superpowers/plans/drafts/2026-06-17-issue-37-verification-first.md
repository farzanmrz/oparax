# Issue #37 — Full Reporter Lifecycle (X-optional, monitored, autonomous) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Take the chat-first agent stack the last mile so signup → (optional) connect X → create → save → run → drafts → post → schedule → autonomous-post works reliably end-to-end, with every run reaching a terminal state independent of the client.
**Architecture:** Two pure run primitives (`runScanStream` + `persistRunResult`) composed by three consumers (manual route, cron route, prompt-lab), with completion driven server-side via `result.consumeStream`; a stale-run reaper; a 3-tab agent-detail shell; cross-run dedupe + an atomic agent lease + atomic per-item post claim for the prod-only cron.
**Tech Stack:** Next.js App Router (TS strict, `@/*`), Vercel AI SDK v6 (`ai@6.0.206`, `@ai-sdk/xai@3.0.95`), Supabase (RLS + service-role), Biome, pnpm. **No test runner** — verify via `pnpm build`, pure-function assertion scripts run with `node --experimental-strip-types`, `curl`, and browser-agent checklists.

---

## VERIFICATION PHILOSOPHY (read first — this plan is organized around it)

There is **no test runner** and **cron is prod-only** (`ft/**` branches do not deploy — `vercel.json:13`). So the plan is built backwards from *how each piece is proven*:

1. **Every non-trivial decision is extracted into a pure function** (`nextRunAt`, `isAgentDue`, `dedupeLookbackOk`, `dailyCapRemaining`, `reaperCutoffPassed`) that takes plain inputs and returns plain outputs — **zero Supabase/fetch/Date.now() inside**. Each ships with a sibling `scripts/verify-*.ts` assertion script that prints `PASS`/`FAIL` with explicit expected values, covering the gnarly edges (spring-forward gap, fall-back hour, midnight-crossing window, empty `schedule_days`, cap boundary, lookback boundary). Run with `node --experimental-strip-types scripts/verify-X.ts`.
2. **Routes are proven with exact `curl`** against `pnpm dev` (manual paths) or the **admin-gated manual cron trigger** (the only way to exercise cron logic off a prod deploy). Each gives the exact request incl. the `Bearer CRON_SECRET` and the expected HTTP status + body shape.
3. **UI + the never-hang invariant** are proven with **browser-agent checklists** (explicit click/fill steps + expected on-screen observations), including the load-bearing one: *start a run, close the tab mid-run, reopen → the run is `completed`/`failed`, never stuck `running`.*
4. **Schema changes** go via the Supabase MCP migration, then `lib/types/database.ts` is regenerated; the SQL + regen command are shown.

**Verification scripts are first-class artifacts.** They live in `scripts/`, are committed, and are the *point* of each pure-function task — the implementation exists to make the script pass.

> **Setup once (before Stage C uses scripts):** `pnpm add -D tsx` is **optional**. The default runner in this plan is `node --experimental-strip-types <path>` (Node 24.13 is installed and supports it — confirmed). If a script imports `.ts` modules with path aliases (`@/…`), the verify scripts here deliberately **import by relative path** so no alias resolver is needed.

---

## FILE STRUCTURE MAP

Each file has one responsibility. Paths are exact; line refs are from the real repo as read on 2026-06-17.

### Stage A — Foundation (X-decoupling + shared engine + safety primitives)

**Created:**
- `lib/scan/persist.ts` — **`persistRunResult({ supabase, runId, agentId, userId, result, startedAt, source })`**. Holds the body currently inline in `app/api/agents/[id]/run/route.ts:154-245` (build `run_items`, terminal `runs` update, `logUsage`). Source-agnostic. Holds the single `// future: notify(...)` comment seam.
- `lib/x/connection-context.ts` — **`buildXConnectionContext(client, userId)`** (cleanup D1): the `x_connections` select + `getFreshAccessToken` block duplicated in `chat/route.ts:104-121` and `chat-debug/route.ts:124-142`.
- `lib/posting/post-item.ts` — **`postRunItem({ supabase, ownerUserId, item, text })`** (§5.3): owner-explicit shared poster with the `item.agent.user_id === ownerUserId` assertion.
- `components/agents/panels/DraftsPanel.tsx` — placeholder in A, filled in B (the worklist).
- `components/agents/panels/SchedulePanel.tsx` — placeholder in A, filled in C.
- `components/agents/panels/SourcesPanel.tsx` — the existing `ConfigForm` + Save settings, lifted out of `agent-detail.tsx`.

**Modified:**
- `lib/scan/run.ts` (`runScanStream`, currently `21-72`) — add `abortSignal` (AbortSignal.timeout ~240s) + `onAbort`-friendly shape. (The actual abort→fail wiring lives at the consumer; see Task A4.)
- `app/api/agents/[id]/run/route.ts` — delete the `status==="inactive"→409` (`74-78`); replace the inline `onFinish` body with `consumeStream` + `persistRunResult`.
- `app/api/agents/scan/route.ts` — delete the un-named `403` (`30-41`); keep usage-only `onFinish`.
- `app/api/agents/save-agent/route.ts` — delete the `if (!connection)→403` (`92-108`).
- `app/api/agents/run-items/[id]/post/route.ts` — delegate to `postRunItem`; surface a connect-needed signal when no X.
- `app/api/x/disconnect/route.ts` — stop marking agents `inactive` (`79-95`); set `auto_post=false` + warn count.
- `app/dashboard/connect-x/page.tsx` — de-gate (no disabled "New agent"; reachable as optional connect entry).
- `components/dashboard/connect-x-button.tsx` / `components/loop/connect-x.tsx` — reused inline on detail page at Post-intent.
- `components/agents/agent-detail.tsx` — rewrite into the 3-tab shell; delete the `!xConnected` Run gate (`308`, `320-330`); `usd()` for cost (`363`).
- `app/dashboard/agents/[id]/page.tsx` — `Promise.all` the independent awaits (D4); pass new props.
- `lib/x/tokens.ts` (`rotateAccessToken`, `144`) — add `AbortSignal.timeout(8000)` to the refresh fetch.
- `lib/chat/session-log.ts` — module-level cached service-role client (D5) + `collectToolCalls` + `ToolCallLog` (D2).
- `lib/chat/discover.ts` — `runGroundedDiscovery` private runner (D3).
- `app/api/agents/chat/route.ts` + `app/api/agents/chat-debug/route.ts` — use `buildXConnectionContext` + `collectToolCalls`.

**Schema (Stage A migration):** `agents.auto_post`, `agents.auto_post_daily_cap`, `agents.last_checked_at`; `run_items.posted_via`; `item_status += 'posting'`; `api_usage_events` `source` + `usage_kind += 'x_timeline'`; reconcile `agents_monitored_handles_check` to 10. (We land *all* enum/column deltas in A so later stages add no schema churn beyond the dedupe index + protected col.)

### Stage B — Drafts worklist / run-history

**Modified:** `app/dashboard/agents/[id]/page.tsx` (fetch last ~20 runs), `components/agents/panels/DraftsPanel.tsx` (fill), `components/agents/story-card.tsx` (terminal state survives refresh), `app/dashboard/agents/page.tsx` (new-drafts badge), `app/api/agents/run-items/[id]/redraft/route.ts` + `lib/draft/generate.ts` (log draft/redraft usage).

### Stage C — Scheduling + autonomy (cron infra) — *task-level outline, expanded at stage start*

**Created:** `lib/schedule/next-run.ts` (`nextRunAt`), `lib/schedule/due.ts` (`isAgentDue`), `lib/schedule/dedupe.ts` (`dedupeLookbackOk`), `lib/posting/cap.ts` (`dailyCapRemaining`), `lib/scan/reaper.ts` (`reaperCutoffPassed` + `reapStaleRuns`), `app/api/cron/scan/route.ts`, `scripts/verify-next-run.ts`, `scripts/verify-due.ts`, `scripts/verify-dedupe.ts`, `scripts/verify-cap.ts`, `scripts/verify-reaper.ts`. **Modified:** `vercel.json` (`crons`), `components/agents/panels/SchedulePanel.tsx`, `lib/usage/*` (source dimension + per-user cap), `lib/chat/config.ts` (timezone select default).

### Stage D — Protected monitoring (opt-in) — *task-level outline, expanded at stage start*

**Created:** `lib/scan/protected.ts`. **Modified:** `lib/scan/run.ts` (tagged protected block), `components/agents/panels/SchedulePanel.tsx` (toggle), `lib/usage/pricing.ts` + `lib/usage/cost.ts` (`x_timeline`), schema (`agents.protected_monitoring`).

---

# STAGE A+B — full bite-sized tasks (executed next)

> Stage A+B ship together as one squash → `dev`. Order within the stage is **verification-driven**, not strictly dependency-driven: the never-hang engine fix (A4) is sequenced *before* the cosmetic de-gating because it is the highest-risk, hardest-to-verify change and everything else is cheap once it is proven.

---

## Task A0 — Stage A schema migration + type regen

**Files:**
- Modify (via Supabase MCP migration, project `pcgvpypzfwuchyfwdlwe`): `agents`, `run_items`, `api_usage_events`, enums.
- Modify: `lib/types/database.ts` (regenerated).

**Steps:**

1. - [ ] Apply the Stage A migration via the Supabase MCP `apply_migration` tool (name: `issue_37_stage_a`). SQL:

```sql
-- agents: autonomy + heartbeat columns (Track C/cron will read these; safe defaults now)
alter table public.agents
  add column if not exists auto_post boolean not null default false,
  add column if not exists auto_post_daily_cap int not null default 3,
  add column if not exists last_checked_at timestamptz null;

-- reconcile the handle cap with the config cap of 10 (was <= 20)
alter table public.agents drop constraint if exists agents_monitored_handles_check;
alter table public.agents
  add constraint agents_monitored_handles_check
  check (array_length(monitored_handles, 1) is null or array_length(monitored_handles, 1) <= 10);

-- run_items: audit which posts were autonomous + the transient claim state
alter type public.item_status add value if not exists 'posting';
alter table public.run_items
  add column if not exists posted_via text null
  check (posted_via is null or posted_via in ('manual','auto'));

-- api_usage_events: source dimension + x_timeline kind
alter type public.usage_kind add value if not exists 'x_timeline';
alter table public.api_usage_events
  add column if not exists source text null
  check (source is null or source in ('manual','cron','auto_post'));
```

   > NOTE: Postgres requires `ALTER TYPE … ADD VALUE` to be committed before the value is usable in the same transaction in some versions. If `apply_migration` errors on the enum add, split the two `add value` statements into their own migration (`issue_37_stage_a_enums`) applied first, then the rest. The dedupe `UNIQUE(agent_id, dedupe_key)` + partial indexes are deliberately **deferred to Stage C** (they gate the cron, not A/B).

2. - [ ] Regenerate the types:

```bash
# Run from the repo; writes the generated types over the existing file.
pnpm dlx supabase@latest gen types typescript --project-id pcgvpypzfwuchyfwdlwe > lib/types/database.ts
```

   (If the MCP `generate_typescript_types` tool is preferred, capture its output and overwrite `lib/types/database.ts` verbatim.)

3. - [ ] **Verify** the regenerated types contain the new shapes:

```bash
grep -nE "auto_post|auto_post_daily_cap|last_checked_at|posted_via|'posting'|x_timeline|source" /Users/farzanm4/Desktop/drive/repos/oparax-chirp/lib/types/database.ts | head -40
```

   Expected: `agents` Row/Insert/Update show `auto_post: boolean`, `auto_post_daily_cap: number`, `last_checked_at: string | null`; `run_items` shows `posted_via: string | null`; `item_status` array includes `"posting"`; `usage_kind` includes `"x_timeline"`; `api_usage_events` shows `source: string | null`.

4. - [ ] **Verify build** — the regen must not break existing typed reads:

```bash
pnpm build
```

   Expected: exits `0`. (If the `item_status` enum widening surfaces a non-exhaustive switch, fix it in the failing file and re-run — there are no `item_status` switches today, so none is expected.)

5. - [ ] Commit: `chore(db): issue-37 stage A schema deltas + regen types`

---

## Task A1 — `lib/scan/run.ts`: bound the model call with a timeout + abort

**Files:**
- Modify: `lib/scan/run.ts`

The current call sets `maxOutputTokens: 1_000_000` with **no timeout** (`run.ts:60`), so a hung Grok call rides to the 300s `maxDuration` wall and orphans the run. We add a caller-supplied `abortSignal` so each consumer can bound the call and route the abort to its own failure path.

**Steps:**

1. - [ ] Extend `RunScanInput` with an optional abort signal. Replace the interface (`run.ts:8-19`):

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
  /** Bounds the model call; consumers pass AbortSignal.timeout(240_000). */
  abortSignal?: AbortSignal;
}
```

2. - [ ] Pass it into `streamText`. In the `return streamText({ … })` block (`run.ts:48-71`), add `abortSignal: input.abortSignal,` right after `model:`:

```ts
  return streamText({
    model: xai.responses(SCAN_MODEL),
    abortSignal: input.abortSignal,
    system: buildScanInstructions(),
```

   (Leave `maxOutputTokens`, `stopWhen`, `temperature`, `output`, `providerOptions` exactly as they are.)

3. - [ ] **Verify build:**

```bash
pnpm build && pnpm exec biome check --write lib/scan/run.ts
```

   Expected: build exits `0`; Biome reports `lib/scan/run.ts` formatted/clean. (Callers don't pass `abortSignal` yet, so this is non-breaking.)

4. - [ ] Commit: `feat(scan): accept an abortSignal to bound the model call`

---

## Task A2 — Extract `persistRunResult` (the source-agnostic persistence primitive)

**Files:**
- Create: `lib/scan/persist.ts`

This lifts the body at `run/route.ts:154-245` into a pure-of-HTTP function callable from the manual route (via `onFinish`) and the cron route (after `consumeStream`). It also carries the **notification seam comment** (no code) and the **empty-run heartbeat** decision for cron (Track C reads `last_checked_at`; A persists it as a no-op for `manual`).

**Steps:**

1. - [ ] Create `lib/scan/persist.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StreamTextResult, ToolSet } from "ai";
import { SCAN_MODEL } from "@/lib/ai/providers";
import { extractMetrics, storiesFromOutput } from "@/lib/scan/ui-stream";
import type { RunItemInsert } from "@/lib/types";
import { logUsage } from "@/lib/usage/log";

// biome-ignore lint/suspicious/noExplicitAny: mirror ui-stream.ts ScanResult — the OUTPUT generic only affects result.output typing.
type ScanResult = StreamTextResult<ToolSet, any>;

export type RunSource = "manual" | "cron" | "auto_post";

export interface PersistRunResultInput {
  supabase: SupabaseClient;
  runId: string;
  agentId: string;
  userId: string;
  result: ScanResult;
  startedAt: number;
  source: RunSource;
}

export interface PersistRunResultOutcome {
  status: "completed" | "failed";
  itemCount: number;
}

/**
 * Persist a finished scan into runs/run_items + log usage. Source-agnostic: the
 * manual route calls this from streamText.onFinish; the cron route calls it after
 * result.consumeStream(). Never throws — any failure is recorded as a failed run.
 */
export async function persistRunResult(
  input: PersistRunResultInput,
): Promise<PersistRunResultOutcome> {
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
      return { status: "failed", itemCount: 0 };
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
        return { status: "failed", itemCount: 0 };
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

    // future: notify(userId, run) — every notification channel (email/WhatsApp/push)
    // hooks in HERE, at the single run-completion chokepoint. No interface/emitter yet (YAGNI, issue #37).

    return { status: "completed", itemCount: runItems.length };
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
    return { status: "failed", itemCount: 0 };
  }
}
```

   > `source` is added to `logUsage` here. Task A0 added the `source` column; the `UsageEvent` type in `lib/usage/log.ts` derives from the regenerated `Insert`, so `source` is accepted with no extra change. Confirm in step 2.

2. - [ ] **Verify build + Biome:**

```bash
pnpm build && pnpm exec biome check --write lib/scan/persist.ts
```

   Expected: exits `0`. If `source` is rejected by the `logUsage` type, the A0 regen didn't include the column — re-run A0 step 2.

3. - [ ] Commit: `refactor(scan): extract source-agnostic persistRunResult with notify seam`

---

## Task A3 — Rewire the manual run route onto `consumeStream` + `persistRunResult` (THE never-hang fix)

**Files:**
- Modify: `app/api/agents/[id]/run/route.ts`

This is the highest-value change. Completion must run **server-side regardless of whether the browser drains the stream** (`agent-detail.tsx:157` is currently the *only* thing that finishes a run). We drive the model with `result.consumeStream()` and persist in `onFinish`; the browser stream becomes pure UX.

**Steps:**

1. - [ ] Replace the imports at the top (`run/route.ts:1-7`):

```ts
import { runScanStream } from "@/lib/scan/run";
import { scanToUIResponse } from "@/lib/scan/ui-stream";
import { persistRunResult } from "@/lib/scan/persist";
import { createClient } from "@/lib/supabase/server";
import type { Agent } from "@/lib/types";
```

   (Drop `SCAN_MODEL`, `extractMetrics`, `storiesFromOutput`, `RunItemInsert`, `logUsage` — they moved into `persist.ts`.)

2. - [ ] Delete the `inactive → 409` block (`run/route.ts:74-78`) entirely. Keep the `search_x/search_web`, `monitoring_description`, and `drafting_instructions` guards (`82-96`).

3. - [ ] Replace the run-execution block (`run/route.ts:126-246`) with the `consumeStream` driver:

```ts
  const startedAt = Date.now();
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
    // Bound the model call well under maxDuration (300s) so a hung Grok call fails
    // the run instead of orphaning it at the wall.
    abortSignal: AbortSignal.timeout(240_000),
  });

  // Drive completion SERVER-SIDE: persistRunResult runs whether or not any client
  // reads the response. The browser stream below is pure UX (live progress); a
  // closed tab / navigation / dropped network has ZERO correctness consequence.
  result
    .consumeStream({
      onError: (error) => {
        console.error("consumeStream error (manual run):", error);
      },
    })
    .then(() =>
      persistRunResult({
        supabase,
        runId,
        agentId: agent.id,
        userId: user.id,
        result,
        startedAt,
        source: "manual",
      }),
    )
    .catch((error) => {
      console.error("manual run persistence failed:", error);
      supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Run failed.",
        })
        .eq("id", runId)
        .then(undefined, () => {});
    });

  // The response stream is now decorative — the client may disconnect at any time.
  return scanToUIResponse(result);
```

   > `consumeStream` is confirmed available in `ai@6.0.206` (spec §3.2). It returns a Promise that resolves when the model is fully driven; chaining `persistRunResult` after it guarantees terminal state. We deliberately do **not** use `scanToUIResponse`'s `onFinish` here — `consumeStream` is the single completion driver, so there's no double-persist race.

4. - [ ] **Verify build + Biome:**

```bash
pnpm build && pnpm exec biome check --write "app/api/agents/[id]/run/route.ts"
```

   Expected: exits `0`.

5. - [ ] **Verify route (manual, happy path)** against `pnpm dev`. In one terminal: `pnpm dev`. Then (replace `<COOKIE>` with a logged-in session cookie from the browser devtools, and `<AGENT_ID>` with a saved agent):

```bash
curl -i -X POST "http://localhost:3000/api/agents/<AGENT_ID>/run" \
  -H "Cookie: <COOKIE>" --max-time 280 -o /tmp/run_stream.txt
echo "HTTP done; tail of stream:"; tail -c 400 /tmp/run_stream.txt
```

   Expected: `HTTP/1.1 200` with a streamed body. Then confirm terminal state in the DB (via Supabase MCP `execute_sql`):

```sql
select status, item_count, error_message from public.runs
where agent_id = '<AGENT_ID>' order by started_at desc limit 1;
```

   Expected: `status = 'completed'` (or `'failed'` with a message) — **never `running`** after the curl returns.

6. - [ ] **Verify the never-hang invariant (the load-bearing check)** — server-side completion with the client gone. Start a run and kill the client read after 2 seconds (simulating a closed tab):

```bash
curl -N -X POST "http://localhost:3000/api/agents/<AGENT_ID>/run" \
  -H "Cookie: <COOKIE>" --max-time 2 -o /dev/null || echo "client disconnected at 2s (expected)"
# Wait for the server to finish driving the model (cron-free; just poll the DB).
sleep 120
```

   Then re-run the SQL from step 5. Expected: the run reached `completed`/`failed` **despite the client disconnecting at 2s**. This proves `consumeStream` (not the browser) drives completion. Record the result in the stage checklist.

7. - [ ] Commit: `fix(run): drive run completion server-side via consumeStream (never-hang)`

---

## Task A4 — Prompt-lab + chat scan: confirm engine reuse (scan route de-gate)

**Files:**
- Modify: `app/api/agents/scan/route.ts`

The prompt-lab keeps **usage-only** `onFinish` (no persist — it's ephemeral). We only de-gate it (remove the un-named X 403) and leave its `onFinish` as is. `lib/chat/run-chat.ts`'s `runScan` tool already awaits to completion inside `execute` and logs usage — no change needed there.

**Steps:**

1. - [ ] Delete the X-connection 403 block in `scan/route.ts:30-41` (the `const { data: connection } = …` select and the `if (!connection) → 403`). The prompt-lab now runs X-free; `runScanStream` already handles describe-only X search.

2. - [ ] **Verify build + Biome:**

```bash
pnpm build && pnpm exec biome check --write "app/api/agents/scan/route.ts"
```

   Expected: exits `0`.

3. - [ ] **Verify de-gate** with a logged-in but X-disconnected session (disconnect X via Settings first, or use a fresh account):

```bash
curl -i -X POST "http://localhost:3000/api/agents/scan" \
  -H "Cookie: <COOKIE>" -H "Content-Type: application/json" \
  -d '{"name":"degatetest","searchWeb":true,"userPrompt":"AI policy news","draftingInstructions":"Concise, factual","handles":[]}' --max-time 280 -o /tmp/scan.txt
head -c 300 /tmp/scan.txt
```

   Expected: `HTTP/1.1 200` (a stream) — **not** `403 Connect X…`. (Web-only scan with no handles is now allowed.)

4. - [ ] Commit: `fix(scan): drop the X-connection gate from the prompt-lab route`

---

## Task A5 — Owner-explicit shared poster + inline connect-X at Post-intent (route side)

**Files:**
- Create: `lib/posting/post-item.ts`
- Modify: `app/api/agents/run-items/[id]/post/route.ts`

Today `post/route.ts:58-62` selects the item with **no owner filter** — safe only because the RLS request client scopes it, which cron will bypass. We extract an owner-explicit poster that asserts ownership before `postTweet`, and have the route delegate to it. (UI connect-bar at Post-intent is Task A8.)

**Steps:**

1. - [ ] Create `lib/posting/post-item.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDraftIssue } from "@/lib/draft/validate";
import { postTweet } from "@/lib/x/client";
import { getFreshAccessToken } from "@/lib/x/tokens";

export interface PostRunItemInput {
  supabase: SupabaseClient;
  /** The user whose X token we post with AND whose ownership we assert. */
  ownerUserId: string;
  /** The run_item id to post. */
  itemId: string;
  /** Final text override (already-trimmed); falls back to final_text / drafted_text. */
  text?: string;
  /** Audit dimension: who triggered the post. */
  postedVia: "manual" | "auto";
}

export type PostRunItemResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string; status: number };

/**
 * Post one run_item to X with an EXPLICIT owner assertion. Loads run_item → run →
 * agent → user_id and verifies agent.user_id === ownerUserId BEFORE posting, then
 * posts with that owner's fresh token. Callers: the manual route (RLS client) and
 * the cron auto-poster (service-role client — which is why the assertion matters).
 */
export async function postRunItem(input: PostRunItemInput): Promise<PostRunItemResult> {
  const { supabase, ownerUserId, itemId, postedVia } = input;

  const { data: item, error: itemError } = await supabase
    .from("run_items")
    .select("id, drafted_text, final_text, status, agent:agents!inner(user_id)")
    .eq("id", itemId)
    .maybeSingle<{
      id: string;
      drafted_text: string;
      final_text: string | null;
      status: string;
      agent: { user_id: string };
    }>();

  if (itemError) return { ok: false, error: "Failed to load draft.", status: 500 };
  if (!item) return { ok: false, error: "Draft not found.", status: 404 };
  // OWNER ASSERTION — the cross-account-posting guard. A missed cron filter would
  // otherwise post agent A's draft with user B's token.
  if (item.agent.user_id !== ownerUserId) {
    return { ok: false, error: "Draft not found.", status: 404 };
  }
  if (item.status === "posted") {
    return { ok: false, error: "Draft is already posted.", status: 409 };
  }

  const text = (input.text || item.final_text || item.drafted_text || "").trim();
  const issue = getDraftIssue(text);
  if (issue) return { ok: false, error: issue, status: 400 };

  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(supabase, ownerUserId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No X connection for this user.",
      status: 400,
    };
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

   > The `agent:agents!inner(user_id)` embed requires the existing `run_items_agent_id_fkey` FK (present, `database.ts:221`). Confirm the embed parses at build time.

2. - [ ] Rewrite `app/api/agents/run-items/[id]/post/route.ts` to delegate. Replace the body from the item-load (line 58) through the end with:

```ts
  const result = await postRunItem({
    supabase,
    ownerUserId: user.id,
    itemId: id,
    text: requestedText || undefined,
    postedVia: "manual",
  });

  if (!result.ok) {
    // Signal "no X connection" distinctly so the client can render the inline
    // connect-X bar (vs a generic toast). getFreshAccessToken throws this exact text.
    const needsConnect = result.status === 400 && /no x connection/i.test(result.error);
    return NextResponse.json(
      { error: result.error, ...(needsConnect ? { needsConnect: true } : {}) },
      { status: result.status },
    );
  }
  return NextResponse.json({ id: result.id, url: result.url });
```

   Update the imports: drop `getDraftIssue`, `postTweet`, `getFreshAccessToken`, `RunItem`; add `import { postRunItem } from "@/lib/posting/post-item";`. Keep auth + `requestedText` parsing (`27-56`).

3. - [ ] **Verify build + Biome:**

```bash
pnpm build && pnpm exec biome check --write lib/posting/post-item.ts "app/api/agents/run-items/[id]/post/route.ts"
```

   Expected: exits `0`.

4. - [ ] **Verify owner assertion (negative path)** — try to post another user's item id with your cookie:

```bash
curl -i -X POST "http://localhost:3000/api/agents/run-items/<OTHER_USERS_ITEM_ID>/post" \
  -H "Cookie: <COOKIE>" -H "Content-Type: application/json" -d '{}'
```

   Expected: `404` `{"error":"Draft not found."}` (RLS would also hide it, but the assertion is the defense for the cron path). Then **happy path** with your own drafted item:

```bash
curl -i -X POST "http://localhost:3000/api/agents/run-items/<MY_ITEM_ID>/post" \
  -H "Cookie: <COOKIE>" -H "Content-Type: application/json" -d '{}'
```

   Expected (X connected): `200 {"id":"…","url":"https://x.com/i/web/status/…"}`. Expected (X disconnected): `400 {"error":"No X connection for this user.","needsConnect":true}`.

5. - [ ] Commit: `feat(posting): owner-explicit shared postRunItem + needsConnect signal`

---

## Task A6 — `disconnect`: stop retiring agents; turn off auto-post instead

**Files:**
- Modify: `app/api/x/disconnect/route.ts`
- Modify: `lib/x/tokens.ts` (drop the `inactive → active` reactivation in `saveConnection`)

Disconnecting X must no longer set agents `inactive` (X is optional now). Instead set `auto_post = false` and report the count so the UI can warn.

**Steps:**

1. - [ ] In `app/api/x/disconnect/route.ts`, replace the `agents … status: "inactive"` update (`79-95`) with:

```ts
  // X is optional now — disconnecting only turns OFF autonomous posting (manual
  // posting needs a live token at post time anyway). Report the count so the UI warns.
  const { data: affected, error: agentsError } = await supabase
    .from("agents")
    .update({ auto_post: false })
    .eq("user_id", user.id)
    .eq("auto_post", true)
    .select("id");

  if (agentsError) {
    return NextResponse.json(
      { error: "Disconnected X, but failed to update agent autonomy." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, autoPostDisabled: (affected ?? []).length });
```

2. - [ ] In `lib/x/tokens.ts`, delete the agents `inactive → active` reactivation in `saveConnection` (`91-99`) — there is no longer an `inactive`-on-disconnect to reverse. Replace the trailing block so `saveConnection` returns after the upsert:

```ts
  const { error } = await supabase.from("x_connections").upsert(
    {
      user_id: input.userId,
      x_user_id: input.xUserId,
      x_username: input.xUsername,
      access_token: encrypt(input.accessToken),
      refresh_token: encrypt(input.refreshToken),
      scopes: input.scopes,
      expires_at: input.expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return error;
```

3. - [ ] **Verify build + Biome:**

```bash
pnpm build && pnpm exec biome check --write "app/api/x/disconnect/route.ts" lib/x/tokens.ts
```

   Expected: exits `0`.

4. - [ ] **Verify** (X connected + an agent with `auto_post=true` set via SQL):

```sql
update public.agents set auto_post = true where user_id = '<MY_USER_ID>';
```

```bash
curl -i -X POST "http://localhost:3000/api/x/disconnect" -H "Cookie: <COOKIE>"
```

   Expected: `200 {"ok":true,"autoPostDisabled":N}` with `N ≥ 1`. Confirm via SQL that the agents are still `status='active'` and now `auto_post=false`.

5. - [ ] Commit: `fix(x): disconnect turns off auto-post, no longer retires agents`

---

## Task A7 — Rewrite agent-detail into the 3-tab shell (Drafts / Schedule / Sources)

**Files:**
- Create: `components/agents/panels/DraftsPanel.tsx`, `components/agents/panels/SchedulePanel.tsx`, `components/agents/panels/SourcesPanel.tsx`
- Modify: `components/agents/agent-detail.tsx`, `app/dashboard/agents/[id]/page.tsx`

The 3-tab split (spec §5.4) is done **once in A** so B fills `DraftsPanel` and C fills `SchedulePanel` on **disjoint files** (no three-way collision). A puts the existing run/post/redraft logic into `DraftsPanel` as the default tab, lifts `ConfigForm`+Save into `SourcesPanel`, and stubs `SchedulePanel`.

**Steps:**

1. - [ ] Create `components/agents/panels/SourcesPanel.tsx` — lift the Settings tab from `agent-detail.tsx:454-473` verbatim (the `ConfigForm` + Save settings button + `handleSaveSettings`). Props: `{ agentId: string; config: AgentConfig }`; it owns its own `config`/`savingSettings` state and the PATCH call (copied from `agent-detail.tsx:115-140`). Keep the existing `/api/agents/${agentId}` PATCH contract.

2. - [ ] Create `components/agents/panels/SchedulePanel.tsx` — **placeholder for C**:

```tsx
"use client";

import type { Agent } from "@/lib/types";

export interface SchedulePanelProps {
  agent: Pick<Agent, "id" | "scan_cadence_minutes" | "schedule_days" | "schedule_window_start" | "schedule_window_end" | "schedule_timezone" | "next_run_at" | "auto_post" | "auto_post_daily_cap">;
  xConnected: boolean;
}

// Filled in Stage C (scheduling + autonomy). Placeholder keeps the tab shell stable
// so Stage C edits ONLY this file.
export function SchedulePanel(_props: SchedulePanelProps) {
  return (
    <p style={{ margin: 0, font: "400 0.9375rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
      Scheduling and autonomous posting arrive in the next update.
    </p>
  );
}
```

3. - [ ] Create `components/agents/panels/DraftsPanel.tsx` — **A delivers the working run + per-item post/redraft worklist** for the *latest run only* (B widens it to multiple runs). Move the run/post/redraft handlers + `ScanPreview` rendering from `agent-detail.tsx` here. Critically, the Run button is `disabled={running}` only (no `!xConnected`), and the "Connect X to run" hint is **deleted**. Props: `{ agent, latestRun, latestRunItems, xConnected }` (same row types currently in `agent-detail.tsx:21-48`). Render the inline connect-X bar at Post-intent (Task A8 supplies the component) instead of the old toast-only path.

   Run button (replace `agent-detail.tsx:304-330`):

```tsx
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
      Running…
    </>
  ) : (
    "Run saved agent"
  )}
</button>
```

   Cost render (replace `agent-detail.tsx:363`): import `usd` from `@/lib/usage/format` and use `` ` · ${usd(latestRun.cost_usd)}` `` instead of `$${latestRun.cost_usd.toFixed(4)}`.

4. - [ ] Rewrite `components/agents/agent-detail.tsx` to the 3-tab switcher composing the three panels. Tabs: `drafts` (default) | `schedule` | `sources`. The component becomes a thin shell:

```tsx
"use client";

import { useState } from "react";
import type { AgentConfig } from "@/lib/chat/config";
import type { Agent, Run, RunItem } from "@/lib/types";
import { DraftsPanel } from "./panels/DraftsPanel";
import { SchedulePanel } from "./panels/SchedulePanel";
import { SourcesPanel } from "./panels/SourcesPanel";

type TabValue = "drafts" | "schedule" | "sources";

export interface AgentDetailProps {
  agent: Agent;
  config: AgentConfig;
  latestRun: Pick<Run, "id" | "status" | "started_at" | "completed_at" | "cost_usd" | "x_search_count" | "item_count" | "error_message"> | null;
  latestRunItems: Pick<RunItem, "id" | "run_id" | "story_title" | "story_summary" | "source_urls" | "primary_tweet_url" | "drafted_text" | "final_text" | "status" | "x_tweet_url" | "posted_at" | "posted_via" | "error_message">[];
  xConnected: boolean;
}

export function AgentDetail({ agent, config, latestRun, latestRunItems, xConnected }: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("drafts");
  return (
    <div>
      <div className="ws-tabs">
        <button type="button" className={`ws-tab${activeTab === "drafts" ? " is-active" : ""}`} onClick={() => setActiveTab("drafts")}>Drafts</button>
        <button type="button" className={`ws-tab${activeTab === "schedule" ? " is-active" : ""}`} onClick={() => setActiveTab("schedule")}>Schedule & autonomy</button>
        <button type="button" className={`ws-tab${activeTab === "sources" ? " is-active" : ""}`} onClick={() => setActiveTab("sources")}>Sources</button>
      </div>
      <div style={{ marginTop: 20 }}>
        {activeTab === "drafts" && (
          <DraftsPanel agent={agent} latestRun={latestRun} latestRunItems={latestRunItems} xConnected={xConnected} />
        )}
        {activeTab === "schedule" && <SchedulePanel agent={agent} xConnected={xConnected} />}
        {activeTab === "sources" && <SourcesPanel agentId={agent.id} config={config} />}
      </div>
    </div>
  );
}
```

5. - [ ] Update `app/dashboard/agents/[id]/page.tsx`: add `posted_at, posted_via` to the run-items select (`82-83`); `Promise.all` the independent latest-run + connection awaits (D4). The agent + latest-run are sequential (items depend on the run id), but the connection + items can parallelize:

```ts
  const [{ data: latestRunRow }, { data: connection }] = await Promise.all([
    supabase
      .from("runs")
      .select("id, status, started_at, completed_at, cost_usd, x_search_count, item_count, error_message")
      .eq("agent_id", id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<RunRow>(),
    supabase.from("x_connections").select("id").maybeSingle<{ id: string }>(),
  ]);
```

   (Keep the `agent` load first since `notFound()` short-circuits; keep the items load after `latestRunRow` resolves.)

6. - [ ] **Verify build + Biome:**

```bash
pnpm build && pnpm exec biome check --write components/agents/ "app/dashboard/agents/[id]/page.tsx"
```

   Expected: exits `0`.

7. - [ ] **Verify UI (browser-agent checklist).** Use the `agent-browser` skill. Log in (`testuser@oparax.com` / `hello123`), open a saved agent at `/dashboard/agents/<id>`:
   - [ ] Three tabs render: **Drafts** (active by default), **Schedule & autonomy**, **Sources**.
   - [ ] Drafts tab: "Run saved agent" button is **enabled even with X disconnected** (no "Connect X to run" text).
   - [ ] Sources tab: the config form renders with all fields; "Save settings" persists (toast "Settings saved.").
   - [ ] Schedule tab: shows the placeholder copy.

8. - [ ] Commit: `feat(agents): 3-tab detail shell (Drafts/Schedule/Sources); X-optional run`

---

## Task A8 — Inline connect-X bar at Post-intent + de-gate connect-x landing (D6 connect-bar to globals.css)

**Files:**
- Modify: `app/globals.css` (move the connect-bar styles to `@layer components`, tokenized)
- Modify: `components/agents/agent-chat.tsx` (use the new class), `components/agents/panels/DraftsPanel.tsx` (render the bar on `needsConnect`)
- Modify: `app/dashboard/connect-x/page.tsx` (de-gate)

D6 is done **early** because A reuses the connect-bar on the detail page. The connect-bar currently lives inline in `agent-chat.tsx:708-740` with raw `oklch()`.

**Steps:**

1. - [ ] Add a `.ws-connect-bar` component class to `app/globals.css` `@layer components`, replacing the inline `oklch()` with existing tokens (`--brand`, `--brand-ring` if present, else `--accent`/`--accent-line`/`--accent-soft`). Confirm which tokens exist first:

```bash
grep -nE "\-\-brand|\-\-accent|\-\-inset|\-\-line|\-\-faint|\-\-live|\-\-err" /Users/farzanm4/Desktop/drive/repos/oparax-chirp/app/globals.css | head -30
```

   Then add (adjust token names to whatever the grep shows):

```css
@layer components {
  .ws-connect-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border: 1px solid var(--accent-line);
    background: var(--accent-soft);
    border-radius: var(--radius);
    color: var(--muted);
    font: 400 0.875rem/1.4 var(--font-sans);
  }
}
```

2. - [ ] In `agent-chat.tsx:708-740`, replace the inline-styled connect block with `<div className="ws-connect-bar">…<button onClick={handleConnectX}>Connect X</button></div>`. The `handleConnectX` logic (force-save session + `startXConnect(?session=…)`, `366-377`) stays.

3. - [ ] In `DraftsPanel.tsx`, when a Post attempt returns `{ needsConnect: true }`, render a `.ws-connect-bar` with a Connect X button whose `onClick` calls `startXConnect` with `?next=/dashboard/agents/<agentId>` (so OAuth returns to this agent). Import `startXConnect` from `@/lib/x/link-identity`. Confirm `next` is run through `isSafeNextPath` upstream (the connect flow already clamps it — `connect-x/page.tsx:10-15`, `auth/callback/route.ts:52-57`).

4. - [ ] De-gate `app/dashboard/connect-x/page.tsx`: keep the page reachable (optional connect entry) but the disabled "New agent" button (`73-80`) is no longer the contract. Since the spec says no-X users land on `/dashboard/agents` with a working button, confirm nothing forces this page: the layout (`app/dashboard/layout.tsx`) does **not** redirect to connect-x (confirmed — it only guards auth). The only connect-x redirect is the duplicate-identity case in `auth/callback/route.ts:23` which is correct. So the page change is cosmetic: leave it as an optional connect surface, but **map every redirect** with the grep below to be sure none funnel users here as a gate.

5. - [ ] **Verify no residual gate:**

```bash
grep -rn "connect-x" /Users/farzanm4/Desktop/drive/repos/oparax-chirp/app /Users/farzanm4/Desktop/drive/repos/oparax-chirp/components /Users/farzanm4/Desktop/drive/repos/oparax-chirp/proxy.ts 2>/dev/null | grep -iE "redirect|next"
```

   Expected: the only matches are the duplicate-identity case in `auth/callback` and the safe-next clamps — **no unconditional redirect** to connect-x from a signed-in landing.

6. - [ ] **Verify build + CSS sanity** (CSS is excluded from Biome; build catches class typos only at usage):

```bash
pnpm build
```

   Expected: exits `0`. Biome only on the JS/TS touched: `pnpm exec biome check --write components/agents/agent-chat.tsx components/agents/panels/DraftsPanel.tsx`.

7. - [ ] **Verify UI (browser-agent).** With X disconnected: open an agent, run it, click **Post** on a drafted item → expect the inline connect-X bar (not just a toast). Click **Connect X** → OAuth round-trip → returns to `/dashboard/agents/<id>`. Confirm the `?next=` survived.

8. - [ ] Commit: `feat(ui): inline connect-X bar at Post-intent; connect-bar styles to globals.css`

---

## Task A9 — Cleanups D1/D2/D3/D5 in the chat + discover + session-log files

**Files:**
- Create: `lib/x/connection-context.ts` (D1)
- Modify: `lib/chat/session-log.ts` (D2 `collectToolCalls` + `ToolCallLog`; D5 cached service client), `lib/chat/discover.ts` (D3 `runGroundedDiscovery`), `app/api/agents/chat/route.ts` + `app/api/agents/chat-debug/route.ts` (use D1 + D2)

These ride in A because they touch files A already opens; they have **no behavior change**, so they're verified by build + a chat smoke test.

**Steps:**

1. - [ ] **D1** — create `lib/x/connection-context.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFreshAccessToken } from "@/lib/x/tokens";

export interface XConnectionContext {
  connected: boolean;
  username: string | null;
  xUserId: string | null;
  accessToken: string | null;
}

/**
 * Load the user's X-connection context (identity + a fresh token when connected).
 * Shared by the live chat route and the dev debug harness. Never throws — a token
 * failure degrades to accessToken: null so the chat continues.
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
      console.warn("buildXConnectionContext token fetch failed", err);
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

   > NOTE: the live route currently selects without `.eq("user_id", …)` (RLS scopes it) while the debug route uses `.eq("user_id", userId)`. The shared helper uses the explicit `.eq` — correct for both (RLS makes it a no-op for the request client, required for the service-role debug client). Replace `chat/route.ts:104-121` and `chat-debug/route.ts:124-142` with calls to it, re-exporting the `XConnectionContext` type from `lib/chat/tools.ts` if it's imported there (check the import in `run-chat.ts:37`).

2. - [ ] **D2** — move `ToolCallLog` + a `collectToolCalls(steps)` into `lib/chat/session-log.ts`; both `chat/route.ts:166-175` and `chat-debug/route.ts:163-173` use it.

```ts
export type ToolCallLog = { name: string; input?: unknown; output?: unknown };

/** Pair each step's tool calls with their results into a flat ToolCallLog[]. */
export function collectToolCalls(
  steps: { toolCalls: { toolName: string; toolCallId: string; input?: unknown }[]; toolResults: { toolCallId: string; output?: unknown }[] }[],
): ToolCallLog[] {
  return steps.flatMap((step) =>
    step.toolCalls.map((tc) => {
      const tr = step.toolResults.find((r) => r.toolCallId === tc.toolCallId);
      return { name: tc.toolName, input: tc.input, output: tr ? tr.output : undefined };
    }),
  );
}
```

3. - [ ] **D5** — module-level cached service-role client in `lib/chat/session-log.ts` and `lib/usage/log.ts` (lazy singleton; don't construct at import time so env-missing tests still load):

```ts
let cached: ReturnType<typeof createServiceRoleClient> | null = null;
function serviceClient() {
  if (!cached) cached = createServiceRoleClient();
  return cached;
}
```

   Use `serviceClient()` in place of `createServiceRoleClient()` in both files.

4. - [ ] **D3** — in `lib/chat/discover.ts`, extract the shared body of `discoverHandles`/`discoverSites` (the `streamText` + `extractMetrics` + `logUsage` dance, identical except tool, schema, prompt, purpose) into a private `runGroundedDiscovery<T>({ tool, schema, system, prompt, purpose })`. Both public fns become thin wrappers.

5. - [ ] **Verify build + Biome:**

```bash
pnpm build && pnpm exec biome check --write lib/x/connection-context.ts lib/chat/ lib/usage/log.ts "app/api/agents/chat/route.ts" "app/api/agents/chat-debug/route.ts"
```

   Expected: exits `0`.

6. - [ ] **Verify behavior unchanged (chat smoke test)** via the `chat-debug` skill / endpoint (dev only):

```bash
curl -s -X POST "http://localhost:3000/api/agents/chat-debug" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"a9-smoke","userMessage":"I cover AI policy. Suggest handles.","reset":true}' | head -c 600
```

   Expected: `200` JSON with `text` + a `toolCalls` array containing a discovery/verify tool — proves D1/D2/D3 didn't break the chat. Verify a usage row landed:

```sql
select kind, count(*) from public.api_usage_events where created_at > now() - interval '5 minutes' group by kind;
```

7. - [ ] Commit: `refactor(chat): share X-connection context, tool-call collector, grounded discovery, cached service client`

---

# STAGE B — Drafts worklist / run-history (fills DraftsPanel + telemetry)

> B edits `DraftsPanel.tsx`, `story-card.tsx`, the detail page, the agents list, the redraft route, and `lib/draft/generate.ts`. It rides on the proven A engine.

---

## Task B1 — Log draft + redraft usage (the dead `draft`/`redraft` kinds)

**Files:**
- Modify: `lib/draft/generate.ts`, `app/api/agents/run-items/[id]/redraft/route.ts`

`generateDraft` (and the redraft route that calls it) never logs usage, so the `draft`/`redraft` `usage_kind`s are dead and end-to-end run cost is understated. We capture `providerMetadata.gateway.marketCost`.

**Steps:**

1. - [ ] In `lib/draft/generate.ts`, change `generateOnce` to return the provider metadata too, and have `generateDraft` log usage. `generateText` returns `{ output, usage, providerMetadata }`. Add an optional attribution param so the caller passes `agent_id`/`run_id`:

```ts
async function generateOnce(system: string, prompt: string): Promise<{
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  marketCost: number | null;
}> {
  const { output, usage, providerMetadata } = await generateText({
    model: DRAFT_MODEL,
    output: Output.object({ schema: draftSchema }),
    system,
    prompt,
    providerOptions: { ...GATEWAY_PROVIDER_OPTIONS },
  });
  const gw = (providerMetadata?.gateway ?? {}) as Record<string, unknown>;
  return {
    text: output.text,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    marketCost: gw.marketCost != null ? Number(gw.marketCost) : null,
  };
}
```

   Then in `generateDraft`, accept `attribution?: { kind: "draft" | "redraft"; userId: string; agentId: string; runId?: string | null; source?: "manual" | "cron" | "auto_post" }`, and after a successful generation call `logUsage({ kind, provider: "gateway", model: DRAFT_MODEL, user_id, agent_id, run_id, source, input_tokens, output_tokens, gatewayMarketCost })` for each `generateOnce` invocation (the first draft + the repair pass if it ran). Import `logUsage` + `DRAFT_MODEL` (already imported).

2. - [ ] In `app/api/agents/run-items/[id]/redraft/route.ts`, pass attribution to `generateDraft` (the route already has `user.id` and `item.agent_id`; load the item's `run_id` in the existing select at `46-47`):

```ts
  const result = await generateDraft({
    draftingInstructions: agent.drafting_instructions,
    story: { title: item.story_title, summary: item.story_summary },
    exampleTweets: agent.example_tweets,
    attribution: { kind: "redraft", userId: user.id, agentId: item.agent_id, runId: item.run_id, source: "manual" },
  });
```

   (Add `run_id` to the `RedraftItem` select + type.)

3. - [ ] **Verify build + Biome:**

```bash
pnpm build && pnpm exec biome check --write lib/draft/generate.ts "app/api/agents/run-items/[id]/redraft/route.ts"
```

4. - [ ] **Verify usage logged** — redraft an item, then:

```bash
curl -i -X POST "http://localhost:3000/api/agents/run-items/<MY_ITEM_ID>/redraft" -H "Cookie: <COOKIE>"
```

```sql
select kind, model, cost_usd, source from public.api_usage_events
where kind in ('draft','redraft') order by created_at desc limit 3;
```

   Expected: a `redraft` row with a non-null `cost_usd` (or `0` if the gateway returned no `marketCost` — note that for the cost==0 guard in §11) and `source='manual'`.

5. - [ ] Commit: `feat(usage): log draft + redraft gateway cost (dead kinds revived)`

---

## Task B2 — Per-item terminal state in `story-card.tsx` (survives refresh)

**Files:**
- Modify: `components/agents/story-card.tsx`

Today posted state is optimistic-only (`agent-detail.tsx:100-106` seeds from `x_tweet_url`, but a failed item shows nothing persistent). The card must show: posted → tweet link + timestamp + `auto`/`manual` badge; failed → the error.

**Steps:**

1. - [ ] Extend `StoryCardProps` with `status?: "drafted" | "posted" | "failed"`, `tweetUrl?: string | null`, `postedAt?: string | null`, `postedVia?: "manual" | "auto" | null`, `errorMessage?: string | null`.

2. - [ ] In the card header/actions region: when `status === "posted"`, render a "View on X" link (`tweetUrl`) + the formatted `postedAt` + a `wbadge` reading `Auto` when `postedVia === "auto"`; hide the Post button (keep Redraft hidden too — posted is terminal). When `status === "failed"`, render the `errorMessage` in `var(--err)` and keep Post/Redraft enabled (retry). Use `Intl.DateTimeFormat` for the timestamp (mirror `agent-detail.tsx:345-348`).

3. - [ ] **Verify build + Biome:** `pnpm build && pnpm exec biome check --write components/agents/story-card.tsx` → exits `0`.

4. - [ ] **Verify UI (browser-agent)**: post an item, **refresh the page** → the posted state (link + timestamp) persists (not optimistic). Force a failure (disconnect X, attempt post via a stale tab, reconnect) → failed error persists across refresh.

5. - [ ] Commit: `feat(drafts): persistent per-item posted/failed terminal state + auto badge`

---

## Task B3 — DraftsPanel: multi-run worklist + run-in-progress + actionable empty state

**Files:**
- Modify: `app/dashboard/agents/[id]/page.tsx` (fetch last ~20 runs + their items), `components/agents/panels/DraftsPanel.tsx`

**Steps:**

1. - [ ] In `page.tsx`, after the latest run, fetch the **last ~20 runs** and **all their items** in two queries (`Promise.all`), grouping items by `run_id` client-side. Pass `runs: RunRow[]` + `itemsByRun: Record<string, ItemRow[]>` to `AgentDetail` → `DraftsPanel`. Keep the select column lists in sync with B2's new fields (`posted_at`, `posted_via`).

2. - [ ] In `DraftsPanel.tsx`, render a **reverse-chronological worklist**: run metadata as group headers (started-at, status, item count, `usd(cost)`), each group's items as `StoryCard`s with per-item Post/Redraft on any `drafted`, non-posted item. The handlers (Post/Redraft) operate by item id (already the case via `postRunItem`).

3. - [ ] **Run-in-progress state**: when the most-recent run is `running`, show "Scanning your beat…" (mirror the chat's `ThinkingRow` if cheap, else a simple spinner row). **Actionable empty state**: when the latest run completed with 0 items, show "No stories matched — loosen your scanning instructions or widen the window" linking to the Sources/Schedule tabs.

4. - [ ] **Show true end-to-end run cost**: sum the run's scan cost + its drafts' cost. Simplest correct approach: render `runs.cost_usd` (scan) and, if drafts were logged (B1), add a note. For B, render `usd(run.cost_usd ?? 0)` per run header; a precise scan+draft rollup query is a Stage-C usage concern.

5. - [ ] **Verify build + Biome:** `pnpm build && pnpm exec biome check --write "app/dashboard/agents/[id]/page.tsx" components/agents/panels/DraftsPanel.tsx`.

6. - [ ] **Verify UI (browser-agent)**: an agent with ≥2 runs shows both runs as groups, newest first, with per-item actions; a 0-item completed run shows the actionable empty state with working tab links; a `running` run shows the in-progress row. (To create a `running` row for the test, insert one via SQL with `status='running'`.)

7. - [ ] Commit: `feat(drafts): multi-run worklist with in-progress + actionable empty states`

---

## Task B4 — In-app new-drafts badge on the agents list

**Files:**
- Modify: `app/dashboard/agents/page.tsx`

Replaces cut notifications: a per-agent count of `drafted`, non-posted `run_items` rendered as a badge ("3 new drafts"). Pure DB query, no new table.

**Steps:**

1. - [ ] In `page.tsx`, after loading agents, run one grouped query for drafted-non-posted counts. Supabase has no GROUP BY in the JS client, so either (a) select `agent_id` for `status='drafted'` items the user owns and tally in JS, or (b) add a tiny SQL view/RPC. For B, use (a) — RLS scopes `run_items` to the owner:

```ts
  const { data: draftRows } = await supabase
    .from("run_items")
    .select("agent_id")
    .eq("status", "drafted");
  const draftCounts = new Map<string, number>();
  for (const r of (draftRows ?? []) as { agent_id: string }[]) {
    draftCounts.set(r.agent_id, (draftCounts.get(r.agent_id) ?? 0) + 1);
  }
```

   Render `{count} new draft{count === 1 ? "" : "s"}` as a `wbadge` on each row when `count > 0`. (Spec mentions "since last view"; for B the count is all-drafted-unposted — the "since last view" refinement is deferred unless cheap.)

2. - [ ] Also reconcile the status label: spec wants reporter labels Running/Paused/Retired. Update the `ws-status` text mapping (`page.tsx:62-65`) to map `active→Running`, `paused→Paused`, `inactive→Retired`.

3. - [ ] **Verify build + Biome:** `pnpm build && pnpm exec biome check --write "app/dashboard/agents/page.tsx"`.

4. - [ ] **Verify UI (browser-agent)**: the agents list shows "N new drafts" on agents with drafted items; status reads "Running"/"Paused"/"Retired".

5. - [ ] Commit: `feat(agents): in-app new-drafts badge + reporter status labels`

---

## STAGE A+B verification checklist (first-class artifact — the human runs this before squash)

> Run all against `pnpm dev` (or a Vercel **preview** for `dev`-targeted QA). `ft/**` does not deploy, so cron is NOT exercised here.

**Never-hang invariant (load-bearing):**
- [ ] Start a run on an agent, **close the browser tab within 2s**. Reopen the agent after ~2 min → the latest run is `completed`/`failed`, **never stuck `running`**. (Repeat with airplane-mode toggle mid-run.)
- [ ] Confirm via SQL that no `runs` row sits at `status='running'` older than ~6 min after the run started.

**X-optional lifecycle (no-X loop):**
- [ ] Fresh account, never connect X: signup → create agent in chat → Save → land on `/dashboard/agents` with a **working** "New agent" button (no disabled gate) → open agent → Run → drafts appear → click Post → **inline connect-X bar** appears (not a toast) → Connect X → OAuth returns to the same agent → Post → `201`.

**#35 fixes (C1–C6 from the issue) regression:**
- [ ] Chat creates an agent end-to-end; discovery/verify tools fire; Save persists; preview stories carry over.

**Drafts worklist:**
- [ ] Multi-run history renders newest-first; posted items show link+timestamp+badge and **survive refresh**; failed items show the error and survive refresh; 0-item run shows actionable empty state; new-drafts badge on the list.

**Telemetry:**
- [ ] `api_usage_events` shows `scan` (source `manual`), `draft`/`redraft` rows with non-null cost; flag any token-bearing row with `cost==0`.

**Gates green:** `pnpm build` exits 0; `pnpm lint` clean on touched files; `/simplify` + `/code-review` run.

---

# STAGE C — Scheduling + autonomy (TASK-LEVEL OUTLINE — expand at stage start)

> C is detailed at task-title + files + key-steps + verification-approach level. It is **not** fabricated code now — A+B will inform the exact signatures (e.g. the final `persistRunResult` shape, the `source` plumbing, the panel props). Expand to full bite-sized granularity at the start of Stage C, following the same pure-function-first method as A+B. Cron is **prod-only**, so the entire stage is engineered to be verifiable via **pure-function assertion scripts** + an **admin-gated manual trigger** on a preview deploy.

### Task C0 — Stage C schema migration + regen
- **Files:** Supabase MCP migration `issue_37_stage_c`; `lib/types/database.ts`.
- **Key steps:** `UNIQUE(agent_id, dedupe_key)` on `run_items`; partial index `agents(next_run_at) WHERE status='active' AND next_run_at IS NOT NULL`; partial index `run_items(agent_id, posted_at) WHERE posted_at IS NOT NULL`; add `run_source += 'auto_post'` if auto-posted runs are distinguished (or reuse `cron`). `run_items` upsert relies on the new unique constraint — backfill/dedupe existing rows first (there may be duplicate `(agent_id, dedupe_key)` across runs; collapse to the earliest before adding the constraint).
- **Verify:** regen + `grep` the new index/constraint; `pnpm build` 0. Run the dedupe-backfill SQL and assert no duplicates remain before adding the unique constraint.

### Task C1 — `nextRunAt(agent, after)` pure function + `scripts/verify-next-run.ts` (HIGHEST verification priority)
- **Files:** create `lib/schedule/next-run.ts`, `scripts/verify-next-run.ts`.
- **Key steps:** pure `nextRunAt(agent: { scan_cadence_minutes, schedule_days, schedule_window_start, schedule_window_end, schedule_timezone }, after: Date): Date | null`. Anchor slots to `windowStart + k·cadence` (no drift); handle **DST** (clamp spring-forward gap → next valid instant; take the first fall-back hour), **midnight-crossing windows** (`windowEnd < windowStart`), and **empty `schedule_days` → null** (scheduling disabled). Use `Intl.DateTimeFormat` with the agent tz for wall-clock→instant mapping (no external tz lib). Keep it free of `Date.now()` — `after` is injected.
- **Verify:** `node --experimental-strip-types scripts/verify-next-run.ts` printing PASS/FAIL with explicit expected ISO instants for: (a) normal weekday window, (b) **spring-forward** (e.g. `America/New_York` 2026-03-08 02:00 gap — a 2:30 slot maps forward), (c) **fall-back** (2026-11-01 — pick the first 01:30 occurrence), (d) **midnight-crossing** window 22:00–04:00, (e) **empty schedule_days → null**, (f) cadence anchoring (09:00 + 120min → 11:00, not "now+120"). This script is the gate for the whole track.

### Task C2 — `isAgentDue(agent, now)` pure predicate + `scripts/verify-due.ts`
- **Files:** create `lib/schedule/due.ts`, `scripts/verify-due.ts`.
- **Key steps:** pure predicate mirroring the SQL due query so the in-memory lease check and the DB query agree: `next_run_at <= now AND status != 'paused' AND todayInTz ∈ schedule_days AND nowInTz ∈ window AND (search_x OR search_web)`. Injected `now`.
- **Verify:** `node --experimental-strip-types scripts/verify-due.ts` — PASS/FAIL for: paused agent (not due), wrong day (not due), outside window (not due), no sources (not due), midnight-crossing window inclusion, exactly-at-`next_run_at` (due).

### Task C3 — Cross-run dedupe: `dedupeLookbackOk` + upsert + moving window + `scripts/verify-dedupe.ts`
- **Files:** create `lib/schedule/dedupe.ts`, `scripts/verify-dedupe.ts`; modify `persistRunResult` (upsert `ON CONFLICT (agent_id, dedupe_key) DO NOTHING`) and the cron scan window computation.
- **Key steps:** pure `dedupeLookbackOk(existing: { dedupe_key, status, created_at }[], candidateKey, now, lookbackDays=14): boolean` — skip a candidate whose `(agent_id, dedupe_key)` exists with status in `('drafted','posted')` within the rolling 14-day lookback. Moving window for cron: `fromDate = lastCompletedRunStart ?? now − cadence`, `toDate = now`; `scan_from`/`scan_to` become manual-only overrides.
- **Verify:** `node --experimental-strip-types scripts/verify-dedupe.ts` — PASS/FAIL for: same key within 13 days (suppressed), same key 15 days ago (allowed), `failed` prior status (allowed to retry), boundary exactly 14 days.

### Task C4 — Daily-cap math: `dailyCapRemaining` + `scripts/verify-cap.ts`
- **Files:** create `lib/posting/cap.ts`, `scripts/verify-cap.ts`.
- **Key steps:** pure `dailyCapRemaining(postedTimestamps: string[], cap: number, now: Date, tz: string): number` — count posts within the agent's **tz day** boundary, return `cap − count` clamped ≥0. Injected `now`+`tz`.
- **Verify:** `node --experimental-strip-types scripts/verify-cap.ts` — PASS/FAIL for: 0 posts (full cap), at-cap (0 remaining), posts from yesterday-in-tz (don't count), tz-boundary edge (a post at 23:30 local vs UTC rollover).

### Task C5 — Stale-run reaper: `reaperCutoffPassed` + `reapStaleRuns` + `scripts/verify-reaper.ts`
- **Files:** create `lib/scan/reaper.ts`, `scripts/verify-reaper.ts`.
- **Key steps:** pure `reaperCutoffPassed(startedAt: Date, now: Date, cutoffMs=360_000): boolean`; impure `reapStaleRuns(supabase, now)` force-fails `status='running' AND started_at < now − 360s`. Runs every cron tick.
- **Verify:** `node --experimental-strip-types scripts/verify-reaper.ts` for the predicate (359s → false, 361s → true). Route-level: insert a `running` run with old `started_at`, hit the manual trigger, confirm it flips to `failed`.

### Task C6 — Cron endpoint + atomic agent lease + admin manual trigger
- **Files:** create `app/api/cron/scan/route.ts`; modify `vercel.json` (`crons`).
- **Key steps:** **POST-only**, constant-time `Authorization === Bearer ${CRON_SECRET}` via `crypto.timingSafeEqual` (401 otherwise); **never** trust `x-vercel-cron`. Due query (C2's SQL) `ORDER BY next_run_at ASC LIMIT <batch>`. **Atomic lease:** `UPDATE agents SET next_run_at = <nextRunAt at claim> WHERE id=$1 AND next_run_at <= now() RETURNING id` — only the row-returner owns the run. Per-agent try/catch. Run the reaper each tick. Empty results bump `last_checked_at` (no `runs` row). Add an **admin-gated manual trigger** (e.g. accept `Authorization: Bearer ${CRON_SECRET}` OR an admin session) so it's curl-verifiable on a preview deploy. Register in `vercel.json` `crons` (~`*/15 * * * *`).
- **Verify:** `curl` the manual trigger with the `Bearer CRON_SECRET` on a **preview deploy** (commit to `dev` or a deploying branch): expect `200` with a summary `{ claimed, completed, failed, skipped }`. **Lease (no double-run):** fire two concurrent triggers, assert only one run row per agent per tick. **Empty heartbeat:** an agent with no new stories bumps `last_checked_at`, creates no `runs` row.

### Task C7 — Auto-post (atomic per-item claim + cap + kill switch + self-heal)
- **Files:** modify `app/api/cron/scan/route.ts` (the post phase); reuse `postRunItem` with `postedVia:'auto'`.
- **Key steps:** only when `auto_post` AND X connected (live token) AND `AUTO_POST_ENABLED` AND under cap. **Atomic per-item claim:** `UPDATE run_items SET status='posting' WHERE id=$1 AND status='drafted' RETURNING id` — only the row-returner posts (success → `posted`+`posted_via='auto'`; failure → `failed`). Cap enforced transactionally per agent (count within the tx, optional `pg_advisory_xact_lock(hashtext(agent_id))`), keyed to the tz-day boundary (C4). Global `AUTO_POST_ENABLED` checked first. **Self-heal:** on `400 invalid_grant` during refresh, set `auto_post=false` for that user's agents + surface a reconnect banner, stop retrying. Per-user daily USD cap checked before each scheduled scan (skip+mark when over).
- **Verify:** manual trigger on preview with a capped agent: assert no more than `cap` auto-posts/day; concurrent triggers post each item at most once (claim); flip `AUTO_POST_ENABLED=false` → no auto-posts; revoke the token → `auto_post` self-heals to false.

### Task C8 — Schedule & autonomy tab UI + timezone select + source dimension on usage
- **Files:** fill `components/agents/panels/SchedulePanel.tsx`; modify `lib/chat/config.ts` (tz default from `Intl…resolvedOptions().timeZone`), `components/agents/config-form.tsx` (tz select not free-text), `lib/usage/aggregate.ts` + `app/dashboard/usage/page.tsx` + the usage dashboard (a `bySource` breakdown).
- **Key steps:** browser-defaulted timezone **select**; plain-language summary computed from the **same** `nextRunAt` ("Scans every 2h on weekdays 9am–6pm ET; next run in 40 min"); `auto_post` toggle **visually gated** behind X-connected + schedule-set + a **one-time confirm naming the @handle**; "N of M auto-posts used today". Add `bySource` to `aggregate()` (a `breakdown(rows, r => r.source ?? 'manual')`).
- **Verify:** browser-agent — enabling cron is blocked until ≥1 day chosen; the summary string matches `nextRunAt`; auto-post toggle gated + confirm names the handle; usage page shows the bySource breakdown.

---

# STAGE D — Protected monitoring (TASK-LEVEL OUTLINE — expand at stage start)

> D ships last, on the proven engine. Reuses `lib/x/timeline.ts:fetchRecentPosts` (prefers the user OAuth token, app-bearer fallback) + `verified_x_handles` cache. Detailed at its own stage start.

### Task D0 — Stage D schema migration + regen
- **Files:** Supabase MCP migration `issue_37_stage_d`; `lib/types/database.ts`.
- **Key steps:** `agents.protected_monitoring boolean NOT NULL DEFAULT false`.
- **Verify:** regen + grep; `pnpm build` 0.

### Task D1 — `lib/scan/protected.ts`: resolve handles → fetch protected tweets → tagged prompt block
- **Files:** create `lib/scan/protected.ts`; modify `lib/scan/run.ts` (accept an optional tagged protected block), the cron + manual scan callers.
- **Key steps:** when `protected_monitoring` on AND X connected: for each monitored handle resolve `x_user_id` (cache hit in `verified_x_handles`, else `getUserByUsername`), call `fetchRecentPosts` with the user token, pass tweets as a **new tagged prompt block with real per-tweet URLs** (`https://x.com/i/web/status/<id>`) so `scanItemSchema.urls`/`sources` stay real. Public coverage still via `xSearch`; protected reads additive. **Fall back to `xSearch`** when not connected or a read fails. No new OAuth scope.
- **Verify:** unit-ish: a pure `buildProtectedBlock(tweets)` formatter verified via `node --experimental-strip-types scripts/verify-protected-block.ts` (URLs well-formed, no fabricated ids). Integration (browser/curl on preview): toggle on for a followed protected account → drafts cite real protected tweet URLs; disconnect → falls back to xSearch silently.

### Task D2 — Cost: `x_timeline` usage kind
- **Files:** modify `lib/usage/pricing.ts` + `lib/usage/cost.ts`.
- **Key steps:** add the `x_timeline` branch (≈ $0.005/post read + $0.010/user lookup); fold into the per-user daily cap (§11); log with `provider:'x_api'`. Without it these calls log $0.
- **Verify:** `node --experimental-strip-types scripts/verify-cost-xtimeline.ts` asserting the per-call cost for N reads + M lookups; confirm a real protected scan logs a non-zero `x_timeline` row (the cost==0 guard from §11 catches regressions).

### Stage D verification checklist
- [ ] Protected toggle on a **followed protected account** surfaces its posts with real URLs; cost logged under `x_timeline`; disconnect → silent `xSearch` fallback; no other user's protected reads ever leak (RLS on stored content).

---

## SELF-REVIEW

### Spec-coverage map (every spec section → task)
- §2 locked decisions → A (X-optional A3/A4/A5/A6/A7/A8; notifications cut = `persistRunResult` comment A2; autonomy C7; staging = this doc's stage structure; empty-runs-not-persisted = C6 heartbeat).
- §3.1 two primitives → A1 (`runScanStream` timeout/abort) + A2 (`persistRunResult`); three consumers → A3 (manual), C6 (cron), A4 (prompt-lab).
- §3.2 server-driven completion → A3 (`consumeStream`).
- §3.3 reaper + bounded calls → C5 (reaper) + A1/A6 (token-refresh timeout in `rotateAccessToken`). **NOTE:** the `rotateAccessToken` `AbortSignal.timeout(8000)` (spec §3.3, `tokens.ts:144`) is folded into Task A6 step 2 region — add it there explicitly when editing `tokens.ts`. *(Add an explicit sub-step in A6: wrap the `fetch(X_TOKEN_ENDPOINT, …)` with `signal: AbortSignal.timeout(8000)`.)*
- §3.4 invariants → A3 (terminal state), C6 (lease), C7 (claim), C6 (bounded batch), A1/A6/timeline (timeouts).
- §4 schema deltas → A0 (most), C0 (dedupe/indexes), D0 (protected col).
- §5 Track A → A1–A9.
- §6 Track B → B1–B4.
- §7 Track C → C0–C8.
- §8 Track D → D0–D2.
- §9 cleanups D1/D2/D3/D5 → A9; D4 → A7 step 5 (detail page) + (chat/route D4 already lives via A9's touch) + agents/new sessions list (note: **agents/new/page.tsx `Promise.all` is NOT yet assigned a task — add it to A9 as a small step**); D6 → A8.
- §10 security → A5 (owner assertion), C6 (cron auth), C7 (containment), A8 (no open redirect), D1 (privacy).
- §11 cost → B1 (draft/redraft), C8 (source dimension + bySource), C7 (per-user cap), D2 (`x_timeline`), §11 cost==0 guard noted in B1/D2.
- §12 delivery → stage structure. §13 verification → every task's verify step + the per-stage checklists. §14 risks → addressed by the pure-function scripts + manual trigger.

### Gaps flagged honestly (fix during expansion)
- **D4 for `agents/new/page.tsx`** (sessions list `Promise.all`) is not its own task — fold a one-line step into A9.
- **`rotateAccessToken` 8s timeout** is mentioned in the coverage map but should be an explicit step inside A6 (added as a note above) — make it a checkbox when executing.
- The **new-drafts "since last view"** refinement (§6) is simplified to all-drafted-unposted in B4; revisit if the badge feels noisy.
- The **true end-to-end run cost** (scan+drafts rollup, §6) is partial in B3 (per-run scan cost shown); a precise rollup query is deferred to C8's usage work.

### Placeholder scan
- No TBD/"implement later"/"add error handling" in Stage A+B. C/D are explicitly **task-level outlines pending stage-start expansion** (honest scoping per the directive), not placeholders — each names files, key steps, and a concrete verification approach.

### Type/name consistency
- `persistRunResult` signature (A2) is consumed by A3 (manual) + referenced by C6/C7 (cron) — same shape.
- `RunSource = "manual" | "cron" | "auto_post"` defined in A2 (`persist.ts`) matches the `api_usage_events.source` check (A0) and `logUsage`'s derived type.
- `postRunItem` (A5) is reused by C7 with `postedVia:'auto'` — same signature.
- `XConnectionContext` (A9 `connection-context.ts`) matches the shape consumed by `lib/chat/run-chat.ts` + `tools.ts` (re-export to avoid drift — flagged in A9 step 1).
- `nextRunAt` (C1) is the single source for the cron lease (C6) AND the UI summary (C8) — no duplicate scheduling math.
- New `run_items` fields (`posted_via`, `posted_at`) flow A0 (schema) → A5 (write) → page selects (A7/B3) → `story-card.tsx` (B2) consistently.
