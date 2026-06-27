# Issue #37 — Full reporter lifecycle (X-optional · monitored · autonomous) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make the reporter lifecycle (signup → optional connect-X → create → save → run → review drafts → post → schedule → autonomous post) work reliably end to end, where every run reaches a terminal state independent of the client and X is required only for posting.

**Architecture:** Two pure run primitives — `runScanStream` (extended with timeout + abort) and a new `persistRunResult` — composed by three consumers (manual route, scheduled cron, prompt-lab). Completion is driven server-side via `result.consumeStream()` so a closed tab never orphans a run. Scheduling/autonomy add a single POST cron endpoint with an atomic agent lease + per-item post claim + cross-run dedupe; protected monitoring reuses `lib/x/timeline.ts`.

**Tech Stack:** Next.js App Router (TS strict), Vercel AI SDK v6 (`ai`, `@ai-sdk/xai`), Supabase (Postgres + RLS, owner-scoped) via MCP migrations, Biome, pnpm. **No test runner** — verification is `pnpm build`, pure-function `tsx` assertion scripts, `curl`, and browser-agent checklists.

---

## Planning philosophy applied to this plan (YAGNI / minimal diff)

This plan is deliberately ordered and decomposed for **smallest correct diff per task** and **minimal blast radius**, not generic dependency order. Concretely:

1. **The de-gate commits ship first and alone** (Tasks A1–A2) — they are pure deletions/relaxations with the largest user-visible payoff (no-X users can work) and the smallest risk. They make the app demoable before any engine rewrite.
2. **The reliability rewrite is split from the de-gate** (Tasks A3–A6). `persistRunResult` + `consumeStream` is the highest-risk change; isolating it into its own reviewable commits means a `/code-review` pass sees only the engine, not engine+UI+gate tangled together.
3. **The 3-tab shell (A7) is a pure structural move with no behavior change** — it lands as its own commit so the B-track Drafts work and the C-track Schedule work edit *disjoint files* (`DraftsPanel.tsx` vs `SchedulePanel.tsx`), killing the worst three-way merge before it can happen.
4. **Every "polish" item is a separate, cuttable task** explicitly marked NICE: the humanized schedule summary, the new-drafts badge, terminal-state badges, the connect-bar CSS extraction. Under time pressure these drop without touching the MUST path.
5. **Reuse over abstraction:** the notification "seam" is literally one comment (no interface). D reuses `fetchRecentPosts` + `verified_x_handles` verbatim. The shared poster `postRunItem` is the *only* new abstraction in A, and it exists solely to make the cron path safe (owner assertion) — not for elegance.
6. **Schema deltas land in the stage that first needs them** — A+B migration carries only the columns A+B reads; C and D add their own. No speculative columns.

MUST vs NICE is marked per task. Cut order under pressure: D6 (CSS extraction) → new-drafts badge → humanized summary → terminal-state badges.

---

## File structure map (Stage A+B — full detail)

**Migration / types**
- Supabase migration `issue37_ab_foundation` (MCP `apply_migration`) — `agents.auto_post`, `agents.auto_post_daily_cap`, `agents.last_checked_at`; `run_items.posted_via`; `usage_kind += draft` is already present (no-op), `run_source` unchanged. Regenerate `lib/types/database.ts`.

**New files**
- `lib/scan/persist.ts` — `persistRunResult(...)` (the body currently inline at `app/api/agents/[id]/run/route.ts:154-245`), source-agnostic; the only notification seam comment lives here.
- `lib/x/post-item.ts` — `postRunItem({ supabase, ownerUserId, item, text })`: owner-asserting shared poster (extracted from `post/route.ts:58-164`).
- `lib/chat/x-context.ts` — `buildXConnectionContext(client, userId)` (D1: dedupe `chat/route.ts:104-121` + `chat-debug/route.ts:124-142`).
- `components/agents/panels/DraftsPanel.tsx` — Drafts worklist (B fills).
- `components/agents/panels/SchedulePanel.tsx` — placeholder in A; C fills.
- `components/agents/panels/SourcesPanel.tsx` — wraps existing `ConfigForm` + Save.

**Modified files**
- `app/api/agents/save-agent/route.ts` — delete the `if (!connection) → 403` block (`92-108`).
- `app/api/agents/scan/route.ts` — delete the un-named `403` block (`30-41`).
- `app/dashboard/connect-x/page.tsx` — stop forcing; no-X users get a working "New agent". (`getSafeNextPath` redirect map unchanged.)
- `app/dashboard/agents/[id]/page.tsx` — delete `inactive → 409` is in the run route; this page gains the recent-runs fetch (B) + `Promise.all` (D4).
- `app/api/agents/[id]/run/route.ts` — delete `inactive → 409` (`74-78`); rewrite to thin streaming wrapper composing `runScanStream` + `consumeStream` + `persistRunResult`.
- `app/api/agents/run-items/[id]/post/route.ts` — delegate to `postRunItem`.
- `app/api/agents/run-items/[id]/redraft/route.ts` — add `logUsage({ kind: "redraft" … })` (§11).
- `lib/draft/generate.ts` — return usage metadata so callers can log `draft`/`redraft` cost.
- `lib/scan/run.ts` — add `abortSignal`/`timeout` to `streamText` (§3.1).
- `lib/x/tokens.ts` — add `AbortSignal.timeout(8000)` to the `rotateAccessToken` fetch (`144`).
- `app/api/x/disconnect/route.ts` — stop setting agents `inactive`; set `auto_post = false`, warn (§5.1).
- `components/agents/agent-detail.tsx` — rewrite to 3-tab shell + `consumeStream`-aware run handler; `usd()` for cost (A6).
- `components/agents/story-card.tsx` — terminal-state rendering (posted link / failed error) (B, NICE).
- `app/dashboard/agents/page.tsx` — new-drafts badge per row (B, NICE).
- `app/api/agents/chat/route.ts`, `app/api/agents/chat-debug/route.ts` — use `buildXConnectionContext` (D1).

---

## Stage A+B — Tasks (FULL bite-sized detail)

### Task A0 — Branch + baseline green (MUST)

**Files:** none (verification only)

- [ ] 1. Confirm you are on `ft/37`: `git branch --show-current` → expect `ft/37`.
- [ ] 2. Baseline build: `pnpm build` → expect exit 0. If it fails, STOP — fix the baseline before starting.
- [ ] 3. Baseline lint: `pnpm lint` → record any pre-existing findings so you don't attribute them to your work.

**Verify:** `pnpm build` exits 0.

---

### Task A1 — De-gate save + scan routes (MUST · pure deletion)

**Files:**
- Modify `app/api/agents/save-agent/route.ts`
- Modify `app/api/agents/scan/route.ts`

- [ ] 1. In `app/api/agents/save-agent/route.ts`, delete the connection gate block (lines 92–108). Remove this exact block:

```ts
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

The next statement (`let body: unknown;`) becomes the first thing after the auth guard. Nothing else in the file references `connection`.

- [ ] 2. In `app/api/agents/scan/route.ts`, delete the connection gate block (lines 30–41). Remove this exact block:

```ts
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

The next statement (`// Parse + validate the editable lab fields.`) becomes the first thing after the auth guard.

- [ ] 3. `pnpm lint:fix app/api/agents/save-agent/route.ts app/api/agents/scan/route.ts`.

**Verify:** `pnpm build` exits 0. Then with `pnpm dev` running and logged in as a user with **no X connection**, `curl` the save route:

```
curl -i -X POST http://localhost:3000/api/agents/save-agent \
  -H "Content-Type: application/json" --cookie "$COOKIE" \
  -d '{"config":{"name":"degate-test","scanningInstructions":"x","draftingInstructions":"y","exampleTweets":[],"sources":{"x":{"enabled":true,"handles":[]},"web":{"enabled":false,"preferredDomains":[]}},"schedule":{"cadenceMinutes":null,"daysOfWeek":[],"windowStart":null,"windowEnd":null,"timezone":"UTC"}}}'
```
Expected: `HTTP/1.1 200` with `{"id":"<uuid>"}` (previously `403`). (Capture `$COOKIE` from a logged-in browser session's `sb-*` cookies.)

**Commit:** `feat(agents): allow save + scan without an X connection (#37)`

---

### Task A2 — De-gate the connect-X landing + run button (MUST · UI relaxation)

**Files:**
- Modify `app/dashboard/connect-x/page.tsx`
- Modify `components/agents/agent-detail.tsx` (Run button hint only — full rewrite is A7)

> Note: the run route's `inactive → 409` and `agent-detail` Run-disabled-on-`!xConnected` are addressed in A4 and A7 respectively. A2 keeps scope to the landing gate so the commit is reviewable alone.

- [ ] 1. In `app/dashboard/connect-x/page.tsx`, the page currently renders a **disabled** "New agent" button (lines 74–80) and "Please connect your X account to create agents." Since X is now optional, this page is reachable only as an *optional* connect entry (e.g. from Settings or `?next=`). Change the disabled button to an enabled link to `/dashboard/agents/new`, and soften the copy. Replace lines 70–98 (the returned JSX) with:

```tsx
  return (
    <>
      <WorkspacePageHeader
        title="Connect X"
        action={
          <Link href="/dashboard/agents/new" className="btn btn-primary">
            <PlusIcon width={16} height={16} />
            <span>New agent</span>
          </Link>
        }
      />

      <div className="ws-empty">
        <p>
          Connect your X account to post drafts, monitor protected accounts, and let trusted agents
          post on a schedule. You can create and run agents without it.
        </p>
        {connectError && (
          <p
            className="ferr show"
            style={{
              maxWidth: "42ch",
              margin: "0 auto",
            }}
          >
            {connectError}
          </p>
        )}
        <ConnectXButton nextPath={nextPath} />
      </div>
    </>
  );
```

- [ ] 2. Add `import Link from "next/link";` to the top of `app/dashboard/connect-x/page.tsx` (it already imports `redirect`, `ConnectXButton`, `PlusIcon`, `WorkspacePageHeader`).

- [ ] 3. Confirm nothing else *forces* navigation to `/dashboard/connect-x`. Run:
```
grep -rn "connect-x" app components lib | grep -i "redirect\|push\|href"
```
Expected matches are only: `connect-x-button.tsx` (the button itself), `workspace-shell.tsx:143` (active-nav highlight — leave it), and `auth/callback/route.ts:23` (`x_already_linked` error bounce — leave it; that is the duplicate-identity case, still correct). The dashboard layout (`app/dashboard/layout.tsx`) does **not** redirect to connect-x — confirm it only redirects unauthenticated users to `/`. No other forced funnel exists.

- [ ] 4. `pnpm lint:fix app/dashboard/connect-x/page.tsx`.

**Verify:** `pnpm build` exits 0. Browser-agent checklist (human runs):
- As a no-X user, visit `/dashboard/connect-x` → "New agent" is clickable and lands on `/dashboard/agents/new`.
- Visit `/dashboard/agents` directly → list renders with a working "New agent" (it already does; confirm no redirect bounce to connect-x).

**Commit:** `feat(connect-x): make the connect page an optional entry, not a gate (#37)`

---

### Task A3 — Migration: A+B schema deltas + regenerate types (MUST)

**Files:**
- Supabase migration (MCP) + `lib/types/database.ts` (regenerated)

- [ ] 1. Apply the migration via the Supabase MCP `apply_migration` (project `pcgvpypzfwuchyfwdlwe`, name `issue37_ab_foundation`):

```sql
-- Autonomy columns (defaults make existing rows safe; auto-post stays OFF).
alter table public.agents
  add column if not exists auto_post boolean not null default false,
  add column if not exists auto_post_daily_cap int not null default 3,
  add column if not exists last_checked_at timestamptz null;

-- Audit which posts were autonomous vs manual.
alter table public.run_items
  add column if not exists posted_via text null
  check (posted_via is null or posted_via in ('manual','auto'));
```

(The `usage_kind` enum already contains `draft` and `redraft` — confirmed in `lib/types/database.ts:400` — so no enum change is needed for B's draft-cost logging. `posting` enum value, `next_run_at` index, `protected_monitoring`, `UNIQUE(agent_id,dedupe_key)`, and `x_timeline` enum are **deferred to C/D migrations** since A+B does not read them.)

- [ ] 2. Regenerate types:
```
pnpm supabase gen types typescript --project-id pcgvpypzfwuchyfwdlwe --schema public > lib/types/database.ts
```
(If the project uses the MCP `generate_typescript_types` tool instead of the CLI, run that and write its output to `lib/types/database.ts`.)

- [ ] 3. Confirm the new columns appear: `grep -n "auto_post\|last_checked_at\|posted_via" lib/types/database.ts` → expect `auto_post`, `auto_post_daily_cap`, `last_checked_at` in the `agents` block and `posted_via` in `run_items`.

- [ ] 4. `pnpm lint:fix lib/types/database.ts` (the generator's style may differ from Biome).

**Verify:** `pnpm build` exits 0 (the new optional columns don't break existing inserts/selects).

**Commit:** `feat(db): add auto_post + last_checked_at + posted_via for #37 stage A+B`

---

### Task A4 — Extract `persistRunResult` (MUST · isolate the risky engine change)

**Files:**
- Create `lib/scan/persist.ts`
- Modify `app/api/agents/[id]/run/route.ts` (delete inline body + `inactive → 409`)

- [ ] 1. Create `lib/scan/persist.ts`. This holds the persistence body currently inline at `run/route.ts:154-245`, made source-agnostic. The `result` type matches what `extractMetrics`/`result.output` consume (the `ScanResult` alias in `ui-stream.ts`). Use a `SupabaseClient` param so both the RLS route client and a service-role cron client work.

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StreamTextResult, ToolSet } from "ai";
import { SCAN_MODEL } from "@/lib/ai/providers";
import { extractMetrics, storiesFromOutput } from "@/lib/scan/ui-stream";
import type { Database } from "@/lib/types/database";
import type { RunItemInsert } from "@/lib/types";
import { logUsage } from "@/lib/usage/log";

// biome-ignore lint/suspicious/noExplicitAny: mirrors the ScanResult alias in ui-stream.ts — the OUTPUT generic must stay `any` for downstream inference.
type ScanResult = StreamTextResult<ToolSet, any>;

type UsageSource = "manual" | "cron" | "auto_post";

export interface PersistRunResultInput {
  supabase: SupabaseClient<Database>;
  runId: string;
  agentId: string;
  userId: string;
  result: ScanResult;
  startedAt: number;
  source: UsageSource;
}

/**
 * Build run_items, drive the runs row to a terminal state, and log scan usage.
 * Source-agnostic and client-agnostic: the manual route passes its RLS client +
 * "manual"; the cron path passes a service-role client + "cron"/"auto_post".
 * Throws nothing the caller must handle — it always lands the run in a terminal
 * state (completed/failed) so no run is left "running".
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

    // future: notify(userId, run) — breaking-news channels (email/WhatsApp/push) go here. No code this milestone (#37 §10).

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

- [ ] 2. `pnpm lint:fix lib/scan/persist.ts`.

**Verify:** `pnpm build` exits 0 (file is created but not yet wired; build proves the types/imports resolve). The route still uses its inline body until A5 — do not delete it yet.

**Commit:** `refactor(scan): extract source-agnostic persistRunResult (#37)`

---

### Task A5 — Server-driven completion: rewrite the manual run route (MUST · the never-hang fix)

**Files:**
- Modify `lib/scan/run.ts` (add `abortSignal` + `timeout`)
- Modify `app/api/agents/[id]/run/route.ts` (delete `inactive → 409`; thin wrapper; `consumeStream`)

- [ ] 1. In `lib/scan/run.ts`, add a model-call timeout + caller-supplied abort signal so a hung Grok call fails instead of riding to the 300s wall. Extend `RunScanInput` and the `streamText` call. Change the interface (after line 18 `preferredDomains: string[];`):

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
  /** Caller abort signal (route ties to consumeStream; cron ties to a deadline). */
  abortSignal?: AbortSignal;
}
```

- [ ] 2. In the same file, add `abortSignal` to the `streamText` call. Insert it right after `maxOutputTokens: 1_000_000,` (line 60):

```ts
    maxOutputTokens: 1_000_000,
    abortSignal: input.abortSignal,
```

(The AI SDK forwards `abortSignal` to the provider call; aborting it rejects `result.output`/`result.consumeStream`, which `persistRunResult`'s try/catch turns into a `failed` run.)

- [ ] 3. Rewrite `app/api/agents/[id]/run/route.ts`. Delete the `inactive → 409` block (lines 74–78). Replace the run-creation-through-end (lines 101–247) so the route: creates the run, builds a `~240s` timeout `AbortSignal`, starts the stream, calls `result.consumeStream()` (server-drives completion) chained to `persistRunResult`, and returns the UI stream purely for live UX. New tail (from line 101):

```ts
  // Create the run record up front (status: running)
  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      agent_id: agent.id,
      source: "manual",
      status: "running",
      inputs: {
        handles: effectiveHandles,
        monitoringDescription: agent.monitoring_description,
        draftingInstructions: agent.drafting_instructions,
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (runError || !run) {
    return new Response("Failed to create run.", { status: 500 });
  }
  const runId = run.id;
  const startedAt = Date.now();

  // Bound the model call under maxDuration (300s). A hung Grok call aborts at
  // ~240s and lands the run "failed" instead of orphaning it at the wall.
  const timeout = AbortSignal.timeout(240_000);

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
    abortSignal: timeout,
  });

  // SERVER-DRIVEN COMPLETION (the never-hang fix): consumeStream fully drives the
  // model regardless of whether any client reads the response. The browser stream
  // below is pure UX — a closed tab / dropped network has ZERO correctness cost.
  result
    .consumeStream({
      onError: (error) => {
        console.error("consumeStream error in [id]/run:", error);
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
    .catch(async (error) => {
      await supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Run failed.",
        })
        .eq("id", runId)
        .then(undefined, () => {});
    });

  return result.toUIMessageStreamResponse();
```

- [ ] 4. Fix the imports at the top of `app/api/agents/[id]/run/route.ts`. Remove now-unused `extractMetrics, scanToUIResponse, storiesFromOutput`, `logUsage`, `SCAN_MODEL`, `RunItemInsert`. The new import set:

```ts
import { runScanStream } from "@/lib/scan/run";
import { persistRunResult } from "@/lib/scan/persist";
import { createClient } from "@/lib/supabase/server";
import type { Agent } from "@/lib/types";
```

(Keep the `AgentRunConfig` `Pick<Agent, …>` type and all the validation guards above line 101 unchanged except the deleted `inactive` block.)

- [ ] 5. `pnpm lint:fix lib/scan/run.ts "app/api/agents/[id]/run/route.ts"`.

**Verify:** `pnpm build` exits 0. Then the **never-hang** browser-agent test (human runs, the headline reliability invariant):
- With `pnpm dev`, open an agent detail page, click "Run saved agent", then **close the tab within 2 seconds** (before the run finishes).
- Reopen `/dashboard/agents/[id]` after ~60–120s → the latest run shows `completed` (or `failed`), **not** stuck at `running`. Confirm `run_items` exist if stories were found. (Pre-fix, closing the tab left the run `running` forever.)

**Commit:** `feat(scan): server-driven run completion via consumeStream + model timeout (#37)`

---

### Task A6 — Token-refresh fetch timeout + the prompt-lab uses shared primitives (MUST/NICE split)

**Files:**
- Modify `lib/x/tokens.ts` (MUST — the one unbounded network hop on the cron path)
- Modify `app/api/agents/scan/route.ts` (NICE — converge on shared primitives; usage-only `onFinish`)

- [ ] 1. (MUST) In `lib/x/tokens.ts`, add a timeout to the `rotateAccessToken` fetch (line 144). Change:

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
  });
```
to add `signal: AbortSignal.timeout(8000),` after the `body:` line (matching the pattern already used in `lib/x/client.ts:187,243,288`).

- [ ] 2. (NICE) In `app/api/agents/scan/route.ts`, the prompt-lab already shares `runScanStream`. Leave its persistence as **usage-only** (no `persistRunResult` — the lab is ephemeral per §3.1). The only change: pass `abortSignal: AbortSignal.timeout(240_000)` into the `runScanStream(...)` call (after `preferredDomains,` on line 146) so the lab also can't hang. No other change.

- [ ] 3. `pnpm lint:fix lib/x/tokens.ts app/api/agents/scan/route.ts`.

**Verify:** `pnpm build` exits 0. Sanity-check the timeout is a real `AbortSignal`: `grep -n "AbortSignal.timeout" lib/x/tokens.ts app/api/agents/scan/route.ts` → expect one hit each.

**Commit:** `fix(x): bound token-refresh fetch; cap prompt-lab scan duration (#37)`

---

### Task A7 — Disconnect-X stops killing agents (MUST)

**Files:**
- Modify `app/api/x/disconnect/route.ts`

- [ ] 1. In `app/api/x/disconnect/route.ts`, the current block (lines 79–95) marks **all** of the user's agents `inactive` on disconnect. X is now optional, so disconnecting must only turn off auto-posting. Replace lines 79–95:

```ts
  const { error: agentsError } = await supabase
    .from("agents")
    .update({
      status: "inactive",
    })
    .eq("user_id", user.id);

  if (agentsError) {
    return NextResponse.json(
      {
        error: "Disconnected X, but failed to mark agents inactive.",
      },
      {
        status: 500,
      },
    );
  }
```
with:

```ts
  // X is optional for create/run/draft. Disconnecting only disables AUTO-posting
  // (which needs a live token); manual + scheduled scans still work without X.
  const { error: agentsError } = await supabase
    .from("agents")
    .update({
      auto_post: false,
    })
    .eq("user_id", user.id)
    .eq("auto_post", true);

  if (agentsError) {
    return NextResponse.json(
      {
        error: "Disconnected X, but failed to turn off auto-posting for your agents.",
      },
      {
        status: 500,
      },
    );
  }
```

- [ ] 2. Note: `lib/x/tokens.ts:saveConnection` (lines 91–99) reactivates `inactive` agents on connect. Since disconnect no longer sets `inactive`, this reactivation is now a near-no-op but is harmless and still correct for any legacy `inactive` rows — **leave it** (YAGNI: don't touch a working path that has no bug). Add a one-line comment above it: `// Legacy: reactivate any agents left 'inactive' by an older disconnect. Harmless now.`

- [ ] 3. `pnpm lint:fix app/api/x/disconnect/route.ts lib/x/tokens.ts`.

**Verify:** `pnpm build` exits 0. Browser-agent: connect X, create + save an agent (status `active`), disconnect X from Settings → reopen `/dashboard/agents` and confirm the agent is **still `active`** (not `Retired`/`inactive`), and the agent's `auto_post` is `false`.

**Commit:** `feat(x): disconnect disables auto-post only, never deactivates agents (#37)`

---

### Task A8 — 3-tab shell rewrite of agent-detail (MUST · pure structural move)

**Files:**
- Create `components/agents/panels/DraftsPanel.tsx`
- Create `components/agents/panels/SchedulePanel.tsx`
- Create `components/agents/panels/SourcesPanel.tsx`
- Modify `components/agents/agent-detail.tsx`

> This is the highest-leverage YAGNI move: doing it as one structural commit (behavior unchanged) means B edits only `DraftsPanel.tsx` and C edits only `SchedulePanel.tsx` — never the same file. The Run button + posting/redrafting logic stays in `agent-detail.tsx` (shared state) and is **passed into** `DraftsPanel`.

- [ ] 1. Create `components/agents/panels/SourcesPanel.tsx` — wraps the existing `ConfigForm` + Save button (lifted verbatim from `agent-detail.tsx:454-472`):

```tsx
"use client";

import type { AgentConfig } from "@/lib/chat/config";
import { ConfigForm } from "../config-form";

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

- [ ] 2. Create `components/agents/panels/SchedulePanel.tsx` — placeholder in A (C fills it). Keep it a typed stub so the tab renders:

```tsx
"use client";

import type { Agent } from "@/lib/types";

export function SchedulePanel({ agent }: { agent: Agent }) {
  return (
    <p
      style={{
        margin: 0,
        font: "400 0.9375rem/1.5 var(--font-sans)",
        color: "var(--muted)",
      }}
    >
      Scheduling and autonomous posting for <strong>{agent.name}</strong> arrive in the next update.
    </p>
  );
}
```

- [ ] 3. Create `components/agents/panels/DraftsPanel.tsx` — the run button + latest-run results + posting/redrafting UI, lifted from `agent-detail.tsx:292-450` and parameterized via props (B will extend it to multi-run; A keeps it single-run identical to today). It receives all the state + handlers from `agent-detail.tsx` so the optimistic post/redraft logic stays in one place:

```tsx
"use client";

import { Spinner } from "@/components/ui/spinner";
import { usd } from "@/lib/usage/format";
import type { PreviewStory } from "@/lib/scan/types";
import { ScanPreview } from "../scan-preview";

export interface DraftsPanelProps {
  running: boolean;
  onRun: () => void;
  latestRun: {
    started_at: string;
    status: string;
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
  postedLinks: { id: string; title: string; url: string }[];
}

export function DraftsPanel({
  running,
  onRun,
  latestRun,
  stories,
  perItem,
  postedLinks,
}: DraftsPanelProps) {
  return (
    <div style={{ marginTop: 20 }}>
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
              Running…
            </>
          ) : (
            "Run saved agent"
          )}
        </button>
      </div>

      {running && !latestRun && (
        <p
          style={{
            margin: "0 0 14px",
            font: "400 0.9375rem/1.5 var(--font-sans)",
            color: "var(--muted)",
          }}
        >
          Scanning your beat…
        </p>
      )}

      {latestRun && (
        <div>
          <p
            style={{
              margin: "0 0 14px",
              font: "400 0.8125rem/1 var(--font-sans)",
              color: "var(--faint)",
            }}
          >
            Last run:{" "}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(latestRun.started_at))}
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
            <p
              style={{
                margin: "0 0 14px",
                font: "400 0.875rem/1.5 var(--font-sans)",
                color: "var(--err)",
              }}
            >
              {latestRun.error_message}
            </p>
          )}

          {stories.length > 0 ? (
            <ScanPreview stories={stories} perItem={perItem} />
          ) : (
            latestRun.status === "completed" && (
              <p
                style={{
                  margin: 0,
                  font: "400 0.9375rem/1.5 var(--font-sans)",
                  color: "var(--muted)",
                }}
              >
                No stories matched. Loosen your scanning instructions or widen the window in
                Sources.
              </p>
            )
          )}

          {postedLinks.length > 0 && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {postedLinks.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ws-link"
                >
                  View on X: {p.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {!latestRun && !running && (
        <p
          style={{
            margin: 0,
            font: "400 0.9375rem/1.5 var(--font-sans)",
            color: "var(--muted)",
          }}
        >
          No runs yet. Click "Run saved agent" to scan and draft stories.
        </p>
      )}
    </div>
  );
}
```

- [ ] 4. Rewrite `components/agents/agent-detail.tsx` to own state + render the three tabs. Keep `itemToStory`, `handleRun` (now uses `consumeStream`-style read but identical client code — the read loop is now pure UX), `handlePost`, `handleRedraft`, and all optimistic state. Replace the `TabValue` type and the returned JSX. New `TabValue` and tab switcher:

```tsx
type TabValue = "drafts" | "schedule" | "sources";
```

Set the default tab: `const [activeTab, setActiveTab] = useState<TabValue>("drafts");`. Replace the `return (...)` block's tab switcher + panels with:

```tsx
  const postedLinks = latestRunItems
    .filter((item) => postedUrls[item.id])
    .map((item) => ({
      id: item.id,
      title: item.story_title ?? "",
      url: postedUrls[item.id],
    }));

  return (
    <div>
      <div className="ws-tabs">
        <button
          type="button"
          className={`ws-tab${activeTab === "drafts" ? " is-active" : ""}`}
          onClick={() => setActiveTab("drafts")}
        >
          Drafts
        </button>
        <button
          type="button"
          className={`ws-tab${activeTab === "schedule" ? " is-active" : ""}`}
          onClick={() => setActiveTab("schedule")}
        >
          Schedule &amp; autonomy
        </button>
        <button
          type="button"
          className={`ws-tab${activeTab === "sources" ? " is-active" : ""}`}
          onClick={() => setActiveTab("sources")}
        >
          Sources
        </button>
      </div>

      {activeTab === "drafts" && (
        <DraftsPanel
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
          postedLinks={postedLinks}
        />
      )}

      {activeTab === "schedule" && <SchedulePanel agent={agent} />}

      {activeTab === "sources" && (
        <SourcesPanel
          config={config}
          onChange={setConfig}
          onSave={handleSaveSettings}
          saving={savingSettings}
        />
      )}
    </div>
  );
```

- [ ] 5. Update imports in `agent-detail.tsx`: remove the now-unused `ConfigForm`, `ScanPreview` (moved into panels). Add:
```ts
import { DraftsPanel } from "./panels/DraftsPanel";
import { SchedulePanel } from "./panels/SchedulePanel";
import { SourcesPanel } from "./panels/SourcesPanel";
```
Remove the `xConnected` Run-disable + "Connect X to run" hint entirely (the Run button in `DraftsPanel` is `disabled={running}` only). `xConnected` is still a prop (kept for B/C's connect-bar at Post-intent) — leave it in `AgentDetailProps` but it's now used only by the (future) connect bar; if unused in A it will trip Biome — so prefix it `_xConnected` in the destructure OR keep passing it down once the connect bar lands in A9. **Use it in A9** (next task), so for A8 keep `xConnected` in props but mark the destructure with a trailing usage: leave it destructured and referenced in A9. To keep A8's build green without A9, temporarily reference it: pass `xConnected` to `DraftsPanel` as an unused-safe prop is over-engineering — instead, in A8, simply omit `xConnected` from the destructure and read it lazily in A9. For A8: change the destructure to NOT pull `xConnected` (leave it in the type), avoiding the unused-var lint.

- [ ] 6. `pnpm lint:fix "components/agents/agent-detail.tsx" components/agents/panels/`.

**Verify:** `pnpm build` exits 0. Browser-agent: open an agent → three tabs render (Drafts default, Schedule placeholder, Sources = old settings form). Run still works from Drafts; Post/Redraft still work; Save settings still works from Sources. Behavior identical to before, just reorganized.

**Commit:** `refactor(agents): split detail page into Drafts / Schedule / Sources tabs (#37)`

---

### Task A9 — Owner-explicit shared poster + inline connect bar at Post-intent (MUST)

**Files:**
- Create `lib/x/post-item.ts`
- Modify `app/api/agents/run-items/[id]/post/route.ts`
- Modify `components/agents/agent-detail.tsx` + `components/agents/panels/DraftsPanel.tsx` (connect bar when `!xConnected`)

- [ ] 1. Create `lib/x/post-item.ts`. This is the **security-critical** extraction: it loads the item via `run_item → run → agent → user_id` and **asserts `agent.user_id === ownerUserId` before posting** so the service-role cron path (C) can never cross-post. Takes the client as a param (RLS route client now; service-role later).

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDraftIssue } from "@/lib/draft/validate";
import type { Database } from "@/lib/types/database";
import { postTweet } from "@/lib/x/client";
import { getFreshAccessToken } from "@/lib/x/tokens";

export type PostRunItemResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string; status: number };

interface ItemWithOwner {
  id: string;
  status: string;
  drafted_text: string;
  final_text: string | null;
  run: { agent: { user_id: string } | null } | null;
}

/**
 * Post one persisted run_item to X as the OWNER. Loads run_item→run→agent→user_id
 * and asserts agent.user_id === ownerUserId before posting — the cross-account
 * guard for the service-role cron path (RLS does NOT protect service-role reads).
 * @param postedVia 'manual' (route) or 'auto' (cron auto-post).
 */
export async function postRunItem(input: {
  supabase: SupabaseClient<Database>;
  ownerUserId: string;
  itemId: string;
  text?: string;
  postedVia: "manual" | "auto";
}): Promise<PostRunItemResult> {
  const { supabase, ownerUserId, itemId, text: requestedText, postedVia } = input;

  const { data: item, error: itemError } = await supabase
    .from("run_items")
    .select("id, status, drafted_text, final_text, run:runs(agent:agents(user_id))")
    .eq("id", itemId)
    .maybeSingle<ItemWithOwner>();

  if (itemError) return { ok: false, error: "Failed to load draft.", status: 500 };
  if (!item) return { ok: false, error: "Draft not found.", status: 404 };

  // CROSS-ACCOUNT GUARD: never post another owner's draft with this user's token.
  const ownerId = item.run?.agent?.user_id;
  if (ownerId !== ownerUserId) {
    return { ok: false, error: "Draft not found.", status: 404 };
  }
  if (item.status === "posted") {
    return { ok: false, error: "Draft is already posted.", status: 409 };
  }

  const finalText = (requestedText ?? "").trim() || item.final_text || item.drafted_text;
  const issue = getDraftIssue(finalText);
  if (issue) return { ok: false, error: issue, status: 400 };

  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(supabase, ownerUserId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No X connection for this user.";
    return { ok: false, error: message, status: 400 };
  }

  const result = await postTweet(accessToken, finalText);
  if (!result.ok) {
    await supabase
      .from("run_items")
      .update({ status: "failed", final_text: finalText, error_message: result.error })
      .eq("id", item.id);
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

(Confirm the embedded-resource select syntax `run:runs(agent:agents(user_id))` works against the FKs `run_items_run_id_fkey` and `runs_agent_id_fkey` — both exist per `lib/types/database.ts:227-233,276-284`. If the typed client rejects the nested maybeSingle generic, cast the select result `as unknown as ItemWithOwner` — note the cast in the commit.)

- [ ] 2. Rewrite `app/api/agents/run-items/[id]/post/route.ts` to delegate. Replace everything from the item-load (line 58) to the end with:

```ts
  const result = await postRunItem({
    supabase,
    ownerUserId: user.id,
    itemId: id,
    text: requestedText,
    postedVia: "manual",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ id: result.id, url: result.url });
```
Update imports: drop `getDraftIssue`, `RunItem`, `postTweet`, `getFreshAccessToken`; add `import { postRunItem } from "@/lib/x/post-item";`. Keep the auth guard + `requestedText` parse (lines 27–56).

- [ ] 3. Add the inline connect-X bar at Post-intent. In `DraftsPanel.tsx`, add an optional `xConnected: boolean` prop and a `connectHref: string`. When `!xConnected`, render a small bar above the run button: "Connect X to post your drafts" + a link to OAuth with `?next=` back to this agent. Use the existing `ConnectXButton` pattern or a plain link to `/dashboard/connect-x?next=/dashboard/agents/${agent.id}`. Minimal version (no new CSS — D6 extraction is deferred/NICE):

```tsx
{!xConnected && (
  <p
    style={{
      margin: "0 0 14px",
      font: "400 0.8125rem/1.4 var(--font-sans)",
      color: "var(--faint)",
    }}
  >
    Drafts post once you{" "}
    <a className="ws-link" href={connectHref}>
      connect X
    </a>
    .
  </p>
)}
```

- [ ] 4. In `agent-detail.tsx`, pass `xConnected={xConnected}` and `connectHref={\`/dashboard/connect-x?next=/dashboard/agents/${agent.id}\`}` into `DraftsPanel`. This consumes the `xConnected` prop kept from A8.

- [ ] 5. `pnpm lint:fix lib/x/post-item.ts "app/api/agents/run-items/[id]/post/route.ts" "components/agents/agent-detail.tsx" components/agents/panels/DraftsPanel.tsx`.

**Verify:** `pnpm build` exits 0. Browser-agent two-path:
- **No-X user:** open agent with a drafted item → see "Drafts post once you connect X." Clicking "Post" still returns the token error gracefully (toast), no crash.
- **X user:** Post one drafted item → `201`, tweet link appears, refresh persists `posted` + `posted_via='manual'` (check `run_items` row).

**Commit:** `feat(x): owner-asserting shared poster + connect-at-post-intent bar (#37)`

---

### Task B1 — Recent-runs fetch + Drafts worklist across runs (MUST · B core)

**Files:**
- Modify `app/dashboard/agents/[id]/page.tsx`
- Modify `components/agents/agent-detail.tsx` (accept multi-run items)
- Modify `components/agents/panels/DraftsPanel.tsx` (group by run)

- [ ] 1. In `app/dashboard/agents/[id]/page.tsx`, replace the single latest-run fetch with the last ~20 runs and their items, and run the independent awaits via `Promise.all` (folds in D4 for this file). Replace lines 64–95 (latest-run + items + connection):

```tsx
  const [{ data: runRows }, { data: connection }] = await Promise.all([
    supabase
      .from("runs")
      .select(
        "id, status, started_at, completed_at, cost_usd, x_search_count, item_count, error_message",
      )
      .eq("agent_id", id)
      .order("started_at", { ascending: false })
      .limit(20),
    supabase.from("x_connections").select("id").maybeSingle<{ id: string }>(),
  ]);

  const runs = (runRows ?? []) as RunRow[];

  // Items across all loaded runs (one query), newest run first.
  let items: ItemRow[] = [];
  if (runs.length > 0) {
    const { data: itemRows } = await supabase
      .from("run_items")
      .select(
        "id, run_id, story_title, story_summary, source_urls, primary_tweet_url, drafted_text, final_text, status, x_tweet_url, posted_at, posted_via, error_message",
      )
      .in(
        "run_id",
        runs.map((r) => r.id),
      )
      .order("created_at", { ascending: false });
    items = (itemRows ?? []) as ItemRow[];
  }
```

- [ ] 2. Extend `ItemRow` in `page.tsx` to add `posted_at`, `posted_via` to the `Pick`. Pass `runs` + `items` to `AgentDetail` (replace `latestRun`/`latestRunItems` props). Update the `<AgentDetail … />` call:

```tsx
      <AgentDetail
        agent={agent}
        config={config}
        runs={runs}
        items={items}
        xConnected={Boolean(connection)}
      />
```

- [ ] 3. In `agent-detail.tsx`, change props from `latestRun`/`latestRunItems` to `runs: RunRow[]` / `items: ItemRow[]`. Derive `latestRun = runs[0] ?? null`. The optimistic-state seeds + `stories` mapping now operate over `items` (all loaded items). Add `posted_at`/`posted_via` to the `ItemRow` `Pick`. The Drafts list groups items by `run_id`.

- [ ] 4. In `DraftsPanel.tsx`, accept `runs` + grouped `items` and render a reverse-chronological worklist: per-run group header (timestamp + status + item count + cost via `usd()`), then that run's `StoryCard`s. Post/Redraft allowed on any `drafted`, non-posted item (the existing `perItem` handlers already key off the item index — switch to keying off `itemId` directly to avoid index drift across groups; pass `onPost(itemId)`/`onRedraft(itemId)` instead of index). Update `ScanPreview`/`StoryCard` call sites accordingly, or render `StoryCard`s directly in `DraftsPanel` (preferred — avoids the index-based `PerItemHandlers` contract entirely).

> **YAGNI note:** prefer rendering `StoryCard` directly per-item in `DraftsPanel` with `itemId`-keyed handlers, rather than threading the new multi-run shape through `ScanPreview`'s index-based `perItem`. `ScanPreview` stays the create-flow component untouched; the detail page owns its own item loop.

- [ ] 5. `pnpm lint:fix "app/dashboard/agents/[id]/page.tsx" "components/agents/agent-detail.tsx" components/agents/panels/DraftsPanel.tsx`.

**Verify:** `pnpm build` exits 0. Browser-agent: an agent with ≥2 runs shows both runs' items grouped newest-first; Post/Redraft work on a draft from an older run.

**Commit:** `feat(agents): Drafts worklist across recent runs (#37)`

---

### Task B2 — Per-item terminal state in story-card (NICE)

**Files:**
- Modify `components/agents/story-card.tsx`
- Modify `components/agents/panels/DraftsPanel.tsx` (pass item status/url)

- [ ] 1. Extend `StoryCardProps` with optional `status?: "drafted" | "posted" | "failed"`, `tweetUrl?: string | null`, `postedAt?: string | null`, `postedVia?: "manual" | "auto" | null`, `errorMessage?: string | null`.
- [ ] 2. When `status === "posted"`: render a "Posted" badge + the tweet link + timestamp instead of the Post button; if `postedVia === "auto"` add an "auto" badge. When `status === "failed"`: render the `errorMessage` in `--err`. This survives refresh because it reads the DB row (today posted state is optimistic-only).
- [ ] 3. `pnpm lint:fix components/agents/story-card.tsx components/agents/panels/DraftsPanel.tsx`.

**Verify:** `pnpm build` exits 0. Browser-agent: post an item, refresh → still shows "Posted" + link (not the Post button). A failed item shows its error after refresh.

**Commit:** `feat(agents): persistent posted/failed/auto state on story cards (#37)`

---

### Task B3 — Draft + redraft cost telemetry (MUST · closes the dead usage kinds)

**Files:**
- Modify `lib/draft/generate.ts`
- Modify `app/api/agents/run-items/[id]/redraft/route.ts`

- [ ] 1. `generateDraft` currently returns only `{ ok, text }`. The `draft`/`redraft` usage kinds are dead (§11). Make `generateOnce` surface the gateway usage so callers can log it. Change `generateOnce` to also return `providerMetadata` + `usage`:

```ts
async function generateOnce(
  system: string,
  prompt: string,
): Promise<{ text: string; inputTokens: number | null; outputTokens: number | null; marketCost: number | null; resolved: string | null; generationId: string | null }> {
  const { output, usage, providerMetadata } = await generateText({
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
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    marketCost: gw.marketCost != null ? Number(gw.marketCost) : null,
    resolved: (routing.finalProvider ?? routing.resolvedProvider) as string | null,
    generationId: typeof gw.generationId === "string" ? gw.generationId : null,
  };
}
```
Thread the usage fields out of `generateDraft` on the `{ ok: true }` branch: add `usage: { inputTokens, outputTokens, marketCost, resolved, generationId }`. (Use the *first* successful generation's usage; if a repair pass ran, sum input/output tokens and prefer the repair's `marketCost` — keep it simple: report the last successful call's metadata.)

- [ ] 2. In the redraft route, after a successful `generateDraft`, call `logUsage`. Add the import `import { logUsage } from "@/lib/usage/log"; import { DRAFT_MODEL } from "@/lib/ai/providers";` and after the successful `result` (before the DB update), log:

```ts
  await logUsage({
    kind: "redraft",
    provider: "gateway",
    resolved_provider: result.usage.resolved ?? null,
    model: DRAFT_MODEL,
    user_id: user.id,
    agent_id: item.agent_id,
    run_id: undefined,
    input_tokens: result.usage.inputTokens,
    output_tokens: result.usage.outputTokens,
    gatewayMarketCost: result.usage.marketCost,
    gateway_generation_id: result.usage.generationId,
  });
```
(`run_id` is optional — the redraft route doesn't load it; omit it.)

- [ ] 3. **Draft-during-scan cost:** the scan does NOT call `generateDraft` (drafting happens inside the single Grok scan call, already logged as `kind: "scan"`). So the only place `generateDraft` runs is redraft. The `draft` kind is logged nowhere because there is no standalone draft call today — **do not invent one** (YAGNI). Document this: add a comment in `lib/draft/generate.ts` that `draft`-kind logging belongs to whatever future standalone-draft caller exists; redraft is the live path.

- [ ] 4. `pnpm lint:fix lib/draft/generate.ts "app/api/agents/run-items/[id]/redraft/route.ts"`.

**Verify:** `pnpm build` exits 0. Browser-agent + DB: redraft an item, then query `select kind, cost_usd, model from api_usage_events where kind='redraft' order by created_at desc limit 1;` (via Supabase MCP `execute_sql`) → expect one row, `cost_usd > 0`, `model = deepseek/...`.

**Commit:** `feat(usage): log redraft cost (closes the dead redraft usage kind) (#37)`

---

### Task B4 — New-drafts badge on the agents list (NICE)

**Files:**
- Modify `app/dashboard/agents/page.tsx`

- [ ] 1. The agents list currently renders status + handles. Add a per-agent count of `drafted`, non-posted items as a badge ("3 new drafts"). This is a pure DB query — no new table. After loading `agents`, fetch counts:

```tsx
  const agentIds = agents.map((a) => a.id);
  let draftCounts: Record<string, number> = {};
  if (agentIds.length > 0) {
    const { data: draftRows } = await supabase
      .from("run_items")
      .select("agent_id")
      .in("agent_id", agentIds)
      .eq("status", "drafted");
    draftCounts = (draftRows ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.agent_id] = (acc[r.agent_id] ?? 0) + 1;
      return acc;
    }, {});
  }
```
(RLS scopes `run_items` to the owner; the `.in(agent_id)` is redundant-safe.)

- [ ] 2. Render the badge in each row when `draftCounts[agent.id] > 0`: a `.wbadge` (existing class) reading `${n} new draft${n === 1 ? "" : "s"}`.

> **YAGNI:** the spec mentions "items created since last view" with a last-view flag. That needs a per-user-per-agent timestamp we don't have. Ship the simpler "count of drafted, non-posted items" now — it answers "is there something to review?" without new state. A true "since last view" is a clearly-separable follow-up; note it in the commit body.

- [ ] 3. `pnpm lint:fix app/dashboard/agents/page.tsx`.

**Verify:** `pnpm build` exits 0. Browser-agent: an agent with drafted items shows "N new drafts"; an agent with all-posted items shows no badge.

**Commit:** `feat(agents): new-drafts count badge on the agents list (#37)`

---

### Task B5 — D1 connection-context dedupe (NICE · safe cleanup)

**Files:**
- Create `lib/chat/x-context.ts`
- Modify `app/api/agents/chat/route.ts`, `app/api/agents/chat-debug/route.ts`

- [ ] 1. Create `lib/chat/x-context.ts` with `buildXConnectionContext(client, userId)` returning `{ connected, username, xUserId, accessToken }` — the exact block duplicated at `chat/route.ts:104-121` and `chat-debug/route.ts:124-142`. Takes the client (RLS or service-role) + userId; the chat route scopes by RLS (so it can pass userId for the token fetch only), chat-debug scopes by `.eq("user_id", userId)`. Parameterize the scoping with a flag or accept the pre-scoped query — simplest: accept `client` + `userId` and always `.eq("user_id", userId)` (RLS-safe redundant on the route client, required on service-role).

- [ ] 2. Replace both inline blocks with `const xConnection = await buildXConnectionContext(supabase, user.id);` (chat) and `const xConnection = await buildXConnectionContext(serviceClient, userId);` (chat-debug).

- [ ] 3. `pnpm lint:fix lib/chat/x-context.ts app/api/agents/chat/route.ts app/api/agents/chat-debug/route.ts`.

**Verify:** `pnpm build` exits 0. The chat-debug skill (`/chat-debug`) still completes a turn (run one conversation through the dev endpoint; expect a non-empty transcript).

**Commit:** `refactor(chat): share X-connection context builder across chat + debug (#37)`

---

### Stage A+B self-review checklist (run before the stage PR)

- [ ] `pnpm build` exits 0; `pnpm lint` clean for all touched files.
- [ ] `/simplify` then `/code-review` (high) on the cumulative diff — focus the reviewer on `lib/scan/persist.ts`, `lib/x/post-item.ts`, and the run-route `consumeStream` wiring.
- [ ] Browser-agent end-to-end no-X loop: signup → create in chat → Save → open detail → Run → see drafts → connect X at Post-intent → Post `201`.
- [ ] **Never-hang invariant:** run + close tab mid-run → run reaches terminal state.
- [ ] Squash-merge Stage A+B → `dev`. Keep #37 open.

---

## Stage C — Scheduling + autonomy (TASK-LEVEL OUTLINE — expand at stage start)

> These tasks are intentionally outline-level: A+B will inform exact signatures (especially how `persistRunResult` is called from a non-streaming context and the final `nextRunAt` contract). Expand to full bite-sized steps + code blocks at Stage C kickoff. C adds **prod-only cron infra**; everything is verified via pure-function assertion scripts + an admin-gated manual trigger on a preview deploy, since `ft/**` branches don't deploy and cron only fires in prod.

### Task C0 — Migration: C schema deltas + regen types (MUST)
- **Files:** Supabase migration `issue37_c_scheduling` + `lib/types/database.ts`.
- **Key steps:** `item_status += 'posting'`; `UNIQUE(agent_id, dedupe_key)` on `run_items`; partial index `agents(next_run_at) WHERE status='active' AND next_run_at IS NOT NULL`; partial index `run_items(agent_id, posted_at) WHERE posted_at IS NOT NULL`; reconcile `agents_monitored_handles_check` to `<= 10`; add `source` dimension to `api_usage_events` (column or rely on existing `metadata.source` from B — decide at kickoff; column is cleaner for the `bySource` breakdown). Regenerate types.
- **Verify:** `pnpm build` exits 0; `grep` the new enum value + types; MCP `list_migrations` shows the migration.

### Task C1 — `nextRunAt(agent, after)` pure function + inline assertions (MUST · P0 correctness)
- **Files:** Create `lib/schedule/next-run.ts`; create `lib/schedule/next-run.assert.ts` (tsx assertion script).
- **Key steps:** Pure function over `{ cadenceMinutes, daysOfWeek, windowStart, windowEnd, timezone }` returning the next ISO instant or `null` (empty `daysOfWeek` = disabled). Anchor slots to `windowStart + k·cadence` (no drift); handle midnight-crossing windows (`windowEnd < windowStart`); clamp DST spring-forward gap; take the first fall-back hour. Reuse `lib/time/timezone.ts:isValidTimeZone`.
- **Verify (pure):** `pnpm exec tsx lib/schedule/next-run.assert.ts` prints `PASS`/`FAIL` per case with explicit expected ISO values — cases: weekday-only window, every-2h anchoring, midnight-crossing window, DST spring-forward day (`America/New_York` March), empty days → `null`, `after` mid-window vs after window-end.

### Task C2 — Due-agent predicate (pure) + the cron endpoint + atomic lease (MUST)
- **Files:** Create `app/api/cron/scan/route.ts` (POST-only); create `lib/schedule/due.ts` (pure predicate); register in `vercel.json` `crons`.
- **Key steps:** Constant-time `Bearer CRON_SECRET` via `crypto.timingSafeEqual` (401 otherwise) — never trust `x-vercel-cron`. Due query: `next_run_at <= now() AND status != 'paused' AND today ∈ schedule_days AND now ∈ window(tz) AND (search_x OR search_web) ORDER BY next_run_at ASC LIMIT batch`. Atomic lease: `UPDATE agents SET next_run_at = <nextRunAt at claim time> WHERE id = $1 AND next_run_at <= now() RETURNING id` — only the row-returner owns the run. Per-agent try/catch. Run the **stale-run reaper** (force-fail `running` runs older than ~360s) each tick. Empty checks bump `last_checked_at`, do NOT persist a `runs` row (§2.7). Compose `runScanStream` (with a deadline `abortSignal`) → `await result.consumeStream()` → `persistRunResult({ source: "cron" })` using a **service-role** client. Moving window: `fromDate = last completed run start (or now − cadence)`, `toDate = now`. Add an **admin-gated manual trigger** (POST with admin auth) so the due logic is curl-verifiable on a preview deploy.
- **Verify (pure + route):** `tsx` assertion for `lib/schedule/due.ts`; `curl` the manual trigger on a preview deploy with the admin secret → expect the lease to fire once (no double-run), empty checks bump `last_checked_at`, the reaper force-fails a planted stale run. Add `CRON_SECRET` + `AUTO_POST_ENABLED` env vars.

### Task C3 — Cross-run dedupe (MUST · gates auto-post)
- **Files:** Modify `lib/scan/persist.ts` (upsert `ON CONFLICT (agent_id, dedupe_key) DO NOTHING`); modify the cron scan composition to skip already-seen stories pre-draft.
- **Key steps:** Before drafting in the cron path, skip stories whose `(agent_id, dedupe_key)` exists with status in `('drafted','posted')` within a ~14-day lookback (reuse the stable `dedupe_key`). Change the `run_items` insert in `persistRunResult` to an upsert so a race can't violate the new unique constraint.
- **Verify:** `tsx` assertion on the dedupe-key predicate (given existing keys, the filter drops repeats); manual-trigger two consecutive cron runs over the same window → second run adds no duplicate `run_items`.

### Task C4 — Auto-post: atomic claim, daily cap, kill switch, self-heal (MUST)
- **Files:** Modify `app/api/cron/scan/route.ts` (auto-post pass); reuse `lib/x/post-item.ts` (`postedVia: "auto"`, service-role client).
- **Key steps:** Only when `auto_post` AND X connected (live token) AND under the per-agent daily cap. Atomic per-item claim: `UPDATE run_items SET status='posting' WHERE id=$1 AND status='drafted' RETURNING id` — only the row-returner posts (success → `posted`+`posted_via='auto'`; failure → `failed`). Cap enforced transactionally per agent keyed to the agent's `schedule_timezone` day boundary (count inside the transaction; optional `pg_advisory_xact_lock(hashtext(agent_id))`). Global `AUTO_POST_ENABLED` checked first. Self-heal: on `400 invalid_grant` during refresh, set `auto_post=false` for that user's agents + surface a reconnect banner, stop retrying. Per-user daily USD spend cap checked before each scheduled scan (sum `api_usage_events` for the user's day; skip + mark the run when over).
- **Verify:** `tsx` assertion for the cap math (N posted today + cap → allowed count); manual-trigger with `AUTO_POST_ENABLED=false` → no posts; with it true + cap=1 and 2 drafts → exactly one auto-post, `posted_via='auto'`; planted concurrent claim → only one posts.

### Task C5 — Schedule & autonomy tab UI (NICE-leaning; toggle is MUST, polish is NICE)
- **Files:** Modify `components/agents/panels/SchedulePanel.tsx`; possibly `components/agents/config-form.tsx` for the schedule controls.
- **Key steps (MUST):** browser-defaulted timezone *select* (`Intl.DateTimeFormat().resolvedOptions().timeZone`), not free-text IANA; `auto_post` toggle visually gated behind X-connected + schedule-set + a one-time confirm naming the exact `@handle`; "N of M auto-posts used today". Block enabling cron/auto-post until ≥1 `schedule_days` chosen. PATCH recomputes `next_run_at` via the same `nextRunAt`.
- **Key steps (NICE):** plain-language summary from the same `nextRunAt` logic ("Scans every 2h on weekdays 9am–6pm ET; next run in 40 min"); `next_run_at` rendered in the agent's tz.
- **Verify:** `pnpm build`; browser-agent: enable schedule, set days/window/cadence, see `next_run_at` populate; toggle auto-post → confirm dialog names the handle; disconnect X → toggle disables.

### Task C6 — bySource usage breakdown on dashboard/usage (NICE)
- **Files:** Modify `lib/usage/aggregate.ts` + `components/usage/usage-dashboard.tsx`.
- **Key steps:** group cost by the new `source` dimension (`manual`/`cron`/`auto_post`). Cheap guard: flag token-bearing calls that logged `cost == 0`.
- **Verify:** `pnpm build`; admin opens `/dashboard/usage` → sees a per-source breakdown.

### Stage C self-review + ship
- [ ] Pure-function assertions all `PASS`; manual-trigger verifications on a preview deploy: lease (no double-run), claim (no double-post), cap, dedupe, empty-run heartbeat, kill switch.
- [ ] `/simplify` + `/code-review` (focus: service-role cross-account scoping, the lease/claim SQL, cap transaction).
- [ ] Squash-merge Stage C → `dev`. Keep #37 open.

---

## Stage D — Protected monitoring (TASK-LEVEL OUTLINE — expand at stage start)

> Opt-in, ships last on the proven engine. Reuses `lib/x/timeline.ts:fetchRecentPosts` + `verified_x_handles` verbatim — **no new fetch code**, no new OAuth scope.

### Task D0 — Migration: D schema deltas + regen types (MUST)
- **Files:** Supabase migration `issue37_d_protected`; `lib/types/database.ts`.
- **Key steps:** `agents.protected_monitoring boolean NOT NULL DEFAULT false`; `usage_kind += 'x_timeline'`. Regenerate types.
- **Verify:** `pnpm build`; grep the new column + enum value.

### Task D1 — Protected reads feed the scan (MUST)
- **Files:** Modify the cron + manual scan composition (likely a small helper `lib/scan/protected.ts`); reuse `lib/x/timeline.ts` + `lib/x/client.ts:getUserByUsername`.
- **Key steps:** when `protected_monitoring` AND X connected: per monitored handle resolve `x_user_id` (cache hit in `verified_x_handles`, else `getUserByUsername`), call `fetchRecentPosts` with the user token, pass tweets to the scan as a **new tagged prompt block with real per-tweet URLs** (`https://x.com/i/web/status/<id>`) so `scanItemSchema.urls`/`sources` stay real. Public coverage still from `xSearch`; protected reads are additive. Fall back to `xSearch` when not connected or a read fails (treat protected-not-followed as "no data").
- **Verify:** browser-agent on a followed protected account → its posts surface in a scan; disconnect → falls back to `xSearch` with no error.

### Task D2 — Cost for x_timeline (MUST)
- **Files:** Modify `lib/usage/cost.ts` + `lib/usage/pricing.ts`.
- **Key steps:** add the `x_timeline` branch to `computeCostUsd` (≈ $0.005/post read + $0.010/user lookup); log with `provider: 'x_api'`; fold into the per-user daily cap (§11). Without this these calls silently log `$0`.
- **Verify (pure):** `tsx` assertion on `computeCostUsd` for an `x_timeline` event (N reads + M lookups → expected USD); DB check that a protected scan logs a non-zero `x_timeline` row.

### Stage D self-review + close #37
- [ ] `/simplify` + `/code-review`; `pnpm build` clean; browser-agent (protected toggle, fallback, cost logged).
- [ ] Squash-merge Stage D → `dev`. **Close #37.**

---

## Deferred / explicitly out of scope (YAGNI ledger)
- D6 connect-bar/Recent-dropdown CSS extraction into `globals.css` — first thing to cut; the A9 connect bar uses inline minimal styles instead.
- True "since last view" new-drafts (needs a per-user-per-agent view timestamp) — B4 ships a simpler drafted-count badge.
- Standalone `draft`-kind logging — no standalone draft call exists; only `redraft` is live (B3).
- Notification channels — comment-only seam in `persistRunResult` (A4).
- `follows.read` scope, platform-wide circuit breaker, per-user agent-count caps, `usage_reconciliations` drift feed, cross-agent overview dashboard.

---

## Final self-review

**Spec-coverage map (every spec §) → task:**
- §2.1 X optional for create/save/run/scan/draft/redraft → A1, A2, A5, A7, A9.
- §2.2 connect-X hard gate removed (OAuth `?next=`/`?session=` preserved) → A2 (+ `isSafeNextPath` untouched).
- §2.3 notifications cut, single comment seam → A4 (`persistRunResult`).
- §2.4 auto_post default OFF + daily cap + kill switch + disconnect→auto_post=false → A3 (columns), A7 (disconnect), C4 (enforcement).
- §2.5 Section E (run-history, scheduled runs, protected) → B1 (history), C (scheduled), D (protected).
- §2.6 staged A+B→C→D, each squash to dev → stage structure throughout.
- §2.7 empty scheduled runs not persisted; `last_checked_at` heartbeat → A3 (column), C2 (heartbeat).
- §3.1 two primitives (`runScanStream` + `persistRunResult`), three consumers → A4, A5, A6, C2.
- §3.2 server-driven completion via `consumeStream` → A5.
- §3.3 stale-run reaper + bounded external calls (`rotateAccessToken` timeout) → A6 (timeout), C2 (reaper).
- §3.4 reliability invariants → A5 (terminal state), C2 (lease/bounded), C4 (no double-post).
- §4 schema deltas staged → A3, C0, D0; types regen each.
- §5.1 X-decoupling (every connect-x redirect mapped) → A1, A2 (grep audit step), A5, A7.
- §5.2 shared engine + reliability → A4–A6.
- §5.3 owner-explicit `postRunItem` + connect-at-post-intent → A9.
- §5.4 3-tab shell with disjoint panel files → A8.
- §5.5 folded cleanups: D1 → B5; D2/D3/D5 → deferred to where they naturally land (D2/D3 in chat/discover, candidates for C/D commits; D5 already partly present via `createServiceRoleClient`); A6 `usd()` → A8 (DraftsPanel) + B1; notification seam → A4.
- §6 Drafts worklist/run-history, terminal state, new-drafts signal, run-in-progress + empty states, end-to-end cost → B1, B2, B3, B4, A8 (in-progress/empty states).
- §7 scheduling/dedupe/lease/nextRunAt/auto-post/schedule UI → C1–C5.
- §8 protected monitoring → D1, D2.
- §9 cleanups → B5 (D1), B1 (D4 for `[id]/page.tsx`), deferred D6.
- §10 security invariants → A9 (owner assertion), C2 (cron auth, hand-scoped queries), C4 (containment), A2 (`isSafeNextPath` preserved).
- §11 cost/telemetry → B3 (draft/redraft), C0/C6 (source dimension + bySource), C4 (spend cap), D2 (`x_timeline`).
- §12–13 delivery + verification → stage self-review checklists; pure-fn assertions for C/D.

**Placeholder scan:** Stage A+B has no TBD/TODO/"implement later" — every code step has complete code with real signatures read from the repo. Stages C/D are explicitly outline-level (titles + files + key steps + verification), NOT speculative code — this is honest scoping per the writing-plans guide, expanded at each stage's start.

**Type/name consistency:** `persistRunResult` input shape (A4) matches its call sites (A5 manual, C2 cron). `postRunItem` (A9) matches both the manual route (A9) and the auto-post path (C4). `RunRow`/`ItemRow` `Pick`s gain `posted_at`/`posted_via` consistently across `page.tsx` (B1), `agent-detail.tsx` (B1), `story-card.tsx` (B2). `nextRunAt` (C1) is the single source called by Save/PATCH (C5) and the lease (C2). `usd()` (from `lib/usage/format.ts`) replaces the inline `toFixed(4)` in DraftsPanel (A8) and run-group headers (B1). New columns from A3 (`auto_post`, `auto_post_daily_cap`, `last_checked_at`, `posted_via`) are read by A7, A9, C2, C4 — all present before first use.
