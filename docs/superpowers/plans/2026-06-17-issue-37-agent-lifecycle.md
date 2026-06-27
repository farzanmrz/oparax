# Issue #37 — Full Reporter Lifecycle (X-optional · monitored · autonomous) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Take the chat-first agent stack the last mile so signup → (optional) connect X → create → save → run → review drafts → post → schedule → autonomous-post works reliably end to end, where **every run reaches a terminal state independent of the client** and X is required only for posting / protected reads / auto-post.

**Architecture:** Replace the inline scan-in-route pattern with two pure primitives — `runScanStream` (already pure; now bounded by a model-call `timeout` + `abortSignal` + `onAbort`) and a new **`persistRunResult`** (source-agnostic terminal-state writer). Completion is driven **server-side** via `result.consumeStream({ onError })` so a closed tab / nav / dropped network never orphans a run. The details page becomes a 3-tab shell (`DraftsPanel` / `SchedulePanel` / `SourcesPanel`) so Stage B (Drafts) and Stage C (Schedule) edit disjoint files. An owner-explicit `postRunItem` re-asserts ownership in code so the future service-role cron path can never cross-post. Stage C adds the atomic concurrency primitives (agent lease, per-item post claim, cross-run dedupe, transactional cap) **before** any auto-post rides on them; Stage D adds opt-in protected monitoring last.

**Tech Stack:** Next.js App Router (TS strict, `@/*`), Vercel AI SDK v6 (`ai@6.0.206`, `@ai-sdk/xai@3.0.95`, AI Gateway), Supabase (Postgres + RLS + service-role, MCP migrations on project `pcgvpypzfwuchyfwdlwe`), Biome, pnpm. **No test runner** (AGENTS.md) — verification is `pnpm build`, pure-function assertion scripts run with **`node --experimental-strip-types`**, `curl`, and browser-agent checklists.

---

## Framework primitives — VERIFIED against the installed SDK (do not substitute)

These were confirmed by reading `node_modules/ai/dist/index.d.ts` at the pinned versions on 2026-06-17. The conflicting draft plans are resolved by these exact shapes:

- **`streamText` accepts `timeout?: TimeoutConfiguration`** where `TimeoutConfiguration = number | { totalMs?: number; stepMs?: number; chunkMs?: number }` (d.ts L380-383, L455). We pass `timeout: { totalMs: 240_000 }` (under `maxDuration = 300`). **There is no need for `AbortSignal.any` composition — `timeout` is a real first-class `streamText` option.**
- **`streamText` accepts `abortSignal?: AbortSignal`** (L448) **and `onAbort?: StreamTextOnAbortCallback`** (L2861) — but `onAbort` is a **`streamText` option, NOT a `toUIMessageStreamResponse` / `UIMessageStreamOptions` option** (`UIMessageStreamOptions` has only `onFinish`/`onError`, L2286/L2324). So `onAbort` must be wired through `runScanStream`/`streamText`, never through `scanToUIResponse`. `onAbort` carries no usage/output, so its handler persists a **failed** run.
- **`result.consumeStream(options?: ConsumeStreamOptions)` returns `PromiseLike<void>`** (L2512), where `ConsumeStreamOptions = { onError?: ErrorHandler }`. Its doc (L2502-2510): "Consumes the stream without processing the parts… forces the stream to finish… triggering the `onFinish` callback and the promise resolution." **This is the correctness mechanism** (spec §3.2): kick it server-side, chain `persistRunResult` after it, return `scanToUIResponse(result)` as pure UX. We do NOT rely on `toUIMessageStreamResponse`'s `onFinish` for correctness, because that fires only when the stream is drained — and a disconnected client does not guarantee a server-side drain. (This rejects the framework-idiomatic draft's onFinish-only manual-route wiring in favor of the spec's explicit `consumeStream`.)
- **Gateway market cost** is read from `event.providerMetadata?.gateway?.marketCost` (already done in `chat/route.ts:143`) — reuse for draft/redraft instrumentation (Stage B).

### Toolchain facts (verified)
- **`tsx` is NOT installed** (`pnpm exec tsx` → `Command "tsx" not found`). **Node 24.13.0 is installed and supports `node --experimental-strip-types`** (confirmed running a typed eval). All pure-function assertion scripts in this plan run via `node --experimental-strip-types <script>.ts` and import target modules by **relative path** (no `@/` alias) so no resolver is needed. (`pnpm add -D tsx` is optional and unnecessary.)
- **`@vercel/functions` is NOT installed.** The manual run route therefore does NOT use `waitUntil`. `vercel.json` has `"fluid": true`; on the fluid runtime the function stays alive while the returned streaming `Response` is open, and `consumeStream` is kicked before the `Response` is returned, so the model is driven to completion in-process. (Documented as a residual serverless caveat in Task A3; if a prod orphan is ever observed, the Stage C reaper is the backstop and `@vercel/functions` + `waitUntil` is the follow-up.)
- **CSS lives in `app/workspace.css`** for all `.workspace .ws-*` classes (PostCSS-owned, Biome-excluded). `ws-tabs`, `ws-tab`, `ws-stories`, `ws-link`, `wbadge` (globals.css L260) already exist; `ws-connect-bar` + `ws-newbadge` are NEW and go in `workspace.css`. **`--brand-soft` does NOT exist** (only `--brand` = `oklch(0.6 0.19 262)` and `--brand-ring` = `oklch(0.6 0.19 262 / 0.16)`); use the literal tint `oklch(0.6 0.19 262 / 0.06)` for the connect-bar background (matching the original inline style) and `--accent-soft`/`--accent` for the new-drafts badge. Do not invent tokens.

### Schema facts (verified against `lib/types/database.ts`)
- `agents` already has `next_run_at`, `scan_cadence_minutes`, `schedule_days`, `schedule_timezone`, `schedule_window_start/end`, `status` (`agent_status = active | paused | inactive`). **Missing → A+B migration adds:** `auto_post`, `auto_post_daily_cap`, `last_checked_at`. (`protected_monitoring` is Stage D.)
- `item_status = drafted | posted | failed` → A+B adds `'posting'` (enum `ADD VALUE`, own statement).
- `run_source = manual | cron` → **unchanged.** The finer `manual | cron | auto_post` dimension lives on the NEW `api_usage_events.source` text column, not on `runs.source` (avoids a second risky enum `ADD VALUE`).
- `usage_kind = chat | scan | draft | redraft | x_verify | web_validate` → **already has `draft` + `redraft`** (no enum change for Stage B cost logging). Stage D adds `'x_timeline'`.
- `logUsage` (`lib/usage/log.ts:30,44`) spreads `...rest` into the `Insert` row, so once `api_usage_events.source` exists in the regenerated type, passing `source` to `logUsage` works with **zero change to `logUsage`**.
- `run_items` → A+B adds `posted_via text NULL CHECK (… in ('manual','auto'))`. `UNIQUE(agent_id, dedupe_key)` + the daily-cap partial index are **deferred to Stage C** (they gate cron, not A+B, and the constraint would reject legitimate same-story-across-runs rows the manual flow currently produces — see Stage C C0).

---

## How this plan is ordered (synthesis of the six draft directives)

The canonical ordering takes **YAGNI's "de-gate ships first, smallest diff per task"** and fuses it with **risk-first's "prove the never-hang engine before features ride on it"** by interleaving them so each commit is small AND the riskiest thing is proven early:

1. **A0 schema first** — every later TS task type-checks against the real regenerated `Database` type (framework-idiomatic insight).
2. **A1–A2 de-gate (pure deletions)** — the biggest user-visible payoff at the smallest risk; the no-X create/save/run loop is walkable immediately (YAGNI + vertical-slice "Slice 1 demoable").
3. **A3–A5 the never-hang engine** — `persistRunResult` extraction + `consumeStream` server-driven completion + model timeout/onAbort + token-refresh timeout, gated by a **close-tab-mid-run kill test** (risk-first + verification-first). This is the highest-risk change, isolated into its own reviewable commits.
4. **A6 owner-explicit `postRunItem`** — the cross-account guard built and exercised on the **manual** path before the service-role cron caller exists (every plan converged here; risk-first/parallelism emphasis).
5. **A7 disconnect softening** + **A8 connect-bar CSS (D6)** + **A9 3-tab shell** — the structural move done **once** so Stage B fills `DraftsPanel` and Stage C fills `SchedulePanel` on disjoint files (every plan; spec §5.4).
6. **A10 folded cleanups** (D1/D2/D3/D4/D5) on files A already touches.
7. **Stage B** — Drafts worklist, per-item terminal state, new-drafts badge, draft/redraft cost.
8. **Stage C / D** — task-level outlines (honest scoping per writing-plans), expanded at their own stage start on the proven engine, because they ship the dangerous cron/auto-post/protected code.

**MUST vs NICE** is tagged per task (YAGNI). Cut order under time pressure: D6 connect-bar CSS extraction → new-drafts badge → humanized summary → terminal-state auto badge. The MUST path (de-gate + reliable engine + owner-safe poster + Drafts worklist) never drops.

### Optional parallel execution (if running `/feature` parallel subagents)
A+B can be split into **file-owned tracks** that run concurrently in isolated worktrees after A0 lands the schema + the stub files. Two tracks never edit the same file. The de-confliction seam is the 3-tab split (A9): `DraftsPanel.tsx` (Track B) and `SchedulePanel.tsx` (Track C) are separate files.

| Track | Owns (exclusive write) | Depends on |
|---|---|---|
| **T-schema** | Supabase migration + `lib/types/database.ts` | — (A0, serial, alone) |
| **T-engine** | `lib/scan/run.ts`, `lib/scan/persist.ts`, `lib/scan/ui-stream.ts`, `lib/x/tokens.ts`, `lib/x/post-item.ts` | A0 |
| **T-routes** | `app/api/agents/[id]/run/route.ts`, `scan/route.ts`, `save-agent/route.ts`, `run-items/[id]/post|redraft/route.ts`, `x/disconnect/route.ts` | A0, T-engine |
| **T-detail-ui** | `components/agents/agent-detail.tsx`, `panels/*`, `story-card.tsx`, `app/dashboard/agents/[id]/page.tsx` | A0 |
| **T-gate-ui** | `app/dashboard/connect-x/page.tsx`, `app/dashboard/agents/page.tsx`, `app/workspace.css`, `components/agents/connect-x-bar.tsx` | A0 |
| **T-chat-cleanup** | `lib/chat/x-context.ts`, `lib/chat/session-log.ts`, `lib/chat/discover.ts`, `lib/usage/log.ts`, `chat/route.ts`, `chat-debug/route.ts` | A0 |

If executing serially (subagent-driven-development), just follow the task order A0 → A10 → B1 → … below.

---

## FILE STRUCTURE MAP (Stage A+B — exact paths, one responsibility each)

### Created
- `lib/scan/persist.ts` — **`persistRunResult({ supabase, runId, agentId, userId, result, startedAt, source })`**: the body currently inline at `app/api/agents/[id]/run/route.ts:139-246` (build `run_items`, terminal `runs` update, `logUsage`). Source-agnostic; takes any `SupabaseClient`. Holds the single `// future: notify(...)` seam comment. The **only** run-completion chokepoint.
- `lib/x/post-item.ts` — **`postRunItem({ supabase, ownerUserId, itemId, requestedText?, postedVia })`**: owner-explicit shared poster. Loads `run_item → agent → user_id`, **asserts `agent.user_id === ownerUserId`** before `postTweet`, writes terminal item state incl. `posted_via`. Used by `post/route.ts` (RLS client) now; reused by cron (service-role client) in Stage C.
- `lib/chat/x-context.ts` — **`buildXConnectionContext(client, userId)`** + `XConnectionContext` type (cleanup D1): dedupes the `x_connections` + `getFreshAccessToken` block in `chat/route.ts:104-113` and `chat-debug/route.ts:124-134`.
- `components/agents/connect-x-bar.tsx` — **`ConnectXBar({ message, nextPath })`**: reusable inline connect-X bar for the details-page Post-intent (reuses `startXConnect` + `isSafeNextPath`; styled via `.ws-connect-bar`).
- `components/agents/panels/DraftsPanel.tsx` — Drafts worklist (Stage B fills it).
- `components/agents/panels/SchedulePanel.tsx` — placeholder in A; Stage C fills it.
- `components/agents/panels/SourcesPanel.tsx` — wraps the existing `ConfigForm` + Save settings, lifted from the current Settings tab.

### Modified
- `lib/scan/run.ts:8-19,48-71` — add `abortSignal` + `onAbort` to `RunScanInput`; add `timeout: { totalMs: 240_000 }` + `abortSignal` + `onAbort` to the `streamText` call.
- `lib/scan/ui-stream.ts:21` — export the `ScanResult` type (`StreamTextResult<ToolSet, any>`) so `persist.ts` imports it.
- `lib/x/tokens.ts:144` — add `signal: AbortSignal.timeout(8000)` to the `rotateAccessToken` fetch; drop the now-dead `inactive → active` reactivation in `saveConnection` (L94-97).
- `app/api/agents/[id]/run/route.ts` — delete the `status === "inactive" → 409` (L74-78); replace the inline `scanToUIResponse({ onFinish })` (L139-246) with `consumeStream`-driven completion + `persistRunResult`.
- `app/api/agents/scan/route.ts:30-41` — delete the un-named `403 "Connect X..."`; pass `abortSignal: AbortSignal.timeout(240_000)` into its `runScanStream` call.
- `app/api/agents/save-agent/route.ts:92-108` — delete the `if (!connection) → 403`.
- `app/api/agents/run-items/[id]/post/route.ts` — delegate to `postRunItem`; surface a `code: "no_x_connection"` signal so the client renders the inline connect bar (not a generic toast).
- `app/api/agents/run-items/[id]/redraft/route.ts` — log `kind: "redraft"` usage (Stage B / §11).
- `lib/draft/generate.ts` — `generateOnce`/`generateDraft` surface gateway `marketCost` so the redraft route can log it (Stage B).
- `app/api/x/disconnect/route.ts:79-95` — stop marking agents `inactive`; set `auto_post = false` for the user's `auto_post = true` agents, return the count.
- `app/dashboard/connect-x/page.tsx:75-77` — de-gate: enable the "New agent" link; keep the page as an optional connect entry; keep the `redirect(nextPath)`-when-connected contract.
- `components/agents/agent-detail.tsx` — rewrite into the thin 3-tab shell delegating to the panels; drop the `!xConnected` Run gate + "Connect X to run" hint (L308, L320-330); replace inline `$${cost_usd.toFixed(4)}` (L363) with `usd()` (A6).
- `components/agents/story-card.tsx` — per-item terminal state: posted (tweet link + timestamp), failed (error), auto badge via `posted_via`; survives refresh (Stage B).
- `app/dashboard/agents/[id]/page.tsx` — fetch recent runs (last ~20) + their items; `Promise.all` the independent awaits (D4); pass `runs` + `items` + `xConnected`.
- `app/dashboard/agents/page.tsx` — per-agent "N new drafts" badge + reporter status labels (Running/Paused/Retired) (Stage B).
- `app/api/agents/chat/route.ts` + `app/api/agents/chat-debug/route.ts` — use `buildXConnectionContext` + `collectToolCalls` (D1/D2).
- `lib/chat/session-log.ts` — add `collectToolCalls(steps)` + a shared `ToolCallLog` type (D2); module-level cached service-role client (D5).
- `lib/usage/log.ts` — module-level cached service-role client (D5).
- `lib/chat/discover.ts` — `runGroundedDiscovery(...)` private runner shared by `discoverHandles`/`discoverSites` (D3).
- `app/workspace.css` — `.ws-connect-bar` + `.ws-newbadge` classes (D6).
- `lib/types/database.ts` — regenerated after the A+B migration.

### Stage C — outline-level files (expanded at stage start)
`lib/schedule/next-run.ts` (`nextRunAt`, pure), `lib/schedule/due.ts` (`isAgentDue` + due query), `lib/schedule/dedupe.ts` (cross-run lookback), `lib/scan/reaper.ts` (`reapStaleRuns`), `lib/posting/cap.ts` (`dailyCapRemaining`, pure), `app/api/cron/scan/route.ts`, `app/api/admin/cron-trigger/route.ts`, `scripts/verify-*.ts`; modify `vercel.json` (`crons`), `SchedulePanel.tsx`, `lib/usage/*` (source breakdown + per-user cap), Stage C migration (`UNIQUE(agent_id, dedupe_key)`, daily-cap index, due index, reconcile handle cap to 10).

### Stage D — outline-level files (expanded at stage start)
`lib/scan/protected.ts`; modify `lib/scan/run.ts` (tagged protected block), `lib/usage/pricing.ts` + `cost.ts` (`x_timeline`), `SchedulePanel.tsx`/`SourcesPanel.tsx` (toggle), Stage D migration (`agents.protected_monitoring`, `usage_kind += 'x_timeline'`).

---

# STAGE A+B (FULL bite-sized detail — executed next)

> Branch: `ft/37`. Stage A+B ship together as ONE squash → `dev`; #37 stays open. **Zero net-new infra.** Every task ends with a concrete verification. The headline gate is Task A4's close-tab-mid-run kill test.

---

## Task A0 — Stage A+B schema migration + regenerate types (MUST)

**Files:** Supabase migration via MCP (project `pcgvpypzfwuchyfwdlwe`) + `lib/types/database.ts` (regenerated).

- [ ] **Step 1: Confirm baseline green.** `git branch --show-current` → expect `ft/37`. `pnpm build` → expect exit 0. If it fails, STOP and fix the baseline before starting (don't attribute pre-existing failures to your work).

- [ ] **Step 2: Apply the enum value FIRST, in its own migration call.** Postgres forbids using a new enum value in the same transaction that adds it, so `'posting'` lands alone. Use `mcp__plugin_supabase_supabase__apply_migration` with name `issue37_ab_enums` and SQL:

```sql
do $$ begin
  if not exists (
    select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'item_status' and e.enumlabel = 'posting'
  ) then
    alter type public.item_status add value 'posting';
  end if;
end $$;
```

- [ ] **Step 3: Apply the column deltas in a second migration call.** Name `issue37_ab_columns`, SQL:

```sql
-- agents: autonomy + heartbeat (defaults keep all existing rows valid; auto-post stays OFF)
alter table public.agents
  add column if not exists auto_post boolean not null default false,
  add column if not exists auto_post_daily_cap int not null default 3,
  add column if not exists last_checked_at timestamptz null;

-- run_items: audit which posts were autonomous vs manual
alter table public.run_items
  add column if not exists posted_via text null
    check (posted_via is null or posted_via in ('manual','auto'));

-- api_usage_events: source dimension (manual | cron | auto_post). Nullable text (not an
-- enum) so adding future sources never needs another ADD VALUE migration.
alter table public.api_usage_events
  add column if not exists source text null
    check (source is null or source in ('manual','cron','auto_post'));
```

> The `UNIQUE(agent_id, dedupe_key)`, the daily-cap partial index, the due index, and the handle-cap reconcile (`<= 20` → `<= 10`) are **deferred to the Stage C migration** — they gate cron, and the unique constraint would reject legitimate same-story-across-runs rows the manual flow currently produces. `usage_kind += 'x_timeline'` and `agents.protected_monitoring` are deferred to Stage D.

- [ ] **Step 4: Regenerate the types.** Prefer the MCP `mcp__plugin_supabase_supabase__generate_typescript_types` tool and write its payload verbatim to `lib/types/database.ts`. (CLI fallback: `pnpm dlx supabase@latest gen types typescript --project-id pcgvpypzfwuchyfwdlwe > lib/types/database.ts`.)

- [ ] **Step 5: Verify the regen picked up the deltas.**

```bash
grep -nE "auto_post|auto_post_daily_cap|last_checked_at|posted_via|\"source\"|posting" /Users/farzanm4/Desktop/drive/repos/oparax-chirp/lib/types/database.ts | head -30
```

Expected: `agents` Row/Insert/Update show `auto_post: boolean`, `auto_post_daily_cap: number`, `last_checked_at: string | null`; `run_items` shows `posted_via: string | null`; `api_usage_events` shows `source: string | null`; the `item_status` union + `Constants` array include `"posting"`.

- [ ] **Step 6: Verify build + lint the regenerated file.**

```bash
pnpm build && echo BUILD_OK
pnpm exec biome check --write lib/types/database.ts
```

Expected: `BUILD_OK` (pure type-surface widening; no existing code references the new columns yet).

- [ ] **Step 7: Commit.**

```bash
git add lib/types/database.ts
git commit -m "feat(db): add auto_post/cap/last_checked_at, posted_via, item_status+=posting, api_usage_events.source (#37 A+B)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task A1 — De-gate save-agent + prompt-lab scan (MUST · pure deletion)

**Files:** Modify `app/api/agents/save-agent/route.ts`, `app/api/agents/scan/route.ts`.

- [ ] **Step 1: Delete the save-agent 403 block (L92-108).** Remove this exact block (the `let body: unknown;` statement below it becomes the first thing after the auth guard; nothing else references `connection`):

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

- [ ] **Step 2: Delete the prompt-lab scan 403 block (L30-41).** Remove this exact block (the `// Parse + validate the editable lab fields.` continues unchanged below):

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

- [ ] **Step 3: Bound the prompt-lab scan too.** In `app/api/agents/scan/route.ts`, add `abortSignal: AbortSignal.timeout(240_000),` as the last property of the existing `runScanStream({ ... })` call (the lab keeps its **usage-only** `onFinish` — it is ephemeral, no `persistRunResult`). This depends on the `abortSignal` field added in Task A3 Step 1; if running serially, this step is fine because A3 precedes the lint/build here only if A3 runs first — **do A3's `lib/scan/run.ts` interface edit before this step** (or temporarily omit `abortSignal` here and add it after A3). Note this dependency in the commit body.

- [ ] **Step 4: Verify.** `pnpm build && echo OK`; `pnpm lint:fix app/api/agents/save-agent/route.ts app/api/agents/scan/route.ts`. Then with `pnpm dev` running and a logged-in **no-X** session cookie:

```bash
curl -i -X POST http://localhost:3000/api/agents/save-agent \
  -H "Content-Type: application/json" --cookie "$COOKIE" \
  -d '{"config":{"name":"degate-test","scanningInstructions":"AI policy","draftingInstructions":"concise, factual","exampleTweets":[],"sources":{"x":{"enabled":true,"handles":[]},"web":{"enabled":false,"preferredDomains":[]}},"schedule":{"cadenceMinutes":null,"daysOfWeek":[],"windowStart":null,"windowEnd":null,"timezone":"UTC"}}}'
```

Expected: `HTTP/1.1 200` with `{"id":"<uuid>"}` (previously `403`). (Capture `$COOKIE` from a logged-in browser session's `sb-*` cookies.)

- [ ] **Step 5: Commit.** `feat(agents): allow save + scan without an X connection (#37)`

---

## Task A2 — De-gate the connect-X landing page (MUST · UI relaxation)

**Files:** Modify `app/dashboard/connect-x/page.tsx`.

> Scope is the landing gate only, so the commit is reviewable alone. The run route's `inactive → 409` is removed in A3; the agent-detail Run-disable in A9.

- [ ] **Step 1: Enable the "New agent" link.** In `app/dashboard/connect-x/page.tsx`, the page renders a **disabled** "New agent" button (L75-77). Change it to an enabled link and soften the copy. Replace the `action={<button ... disabled>...}` with:

```tsx
        action={
          <Link href="/dashboard/agents/new" className="btn btn-primary">
            <PlusIcon width={16} height={16} />
            <span>New agent</span>
          </Link>
        }
```

Add `import Link from "next/link";` at the top. Change the empty-state copy from "Please connect your X account to create agents." to "Connect X to post drafts and use your own posts as writing samples — optional. You can create and run agents without it." **Keep the `redirect(nextPath)`-when-connected branch (L67) and `getSafeNextPath`/`isSafeNextPath`** — the OAuth `?next=` contract is preserved.

- [ ] **Step 2: Map + neutralize every redirect into connect-x (spec §5.1).**

```bash
grep -rn "connect-x\|/dashboard/connect-x" app/ components/ lib/ | grep -v node_modules
```

Expected funnel points and their post-change status (note each in the commit body): `app/auth/callback/route.ts` — the OAuth *return* target (keep); `components/dashboard/workspace-shell.tsx` — active-nav highlight pathname check (keep, not a redirect); `app/dashboard/connect-x/page.tsx` — the page itself (keep, optional entry). Confirm `app/dashboard/layout.tsx` redirects only **unauthenticated** users to `/` (not to connect-x) and that `app/dashboard/agents/new/page.tsx` has no connect-x gate. If any hard `redirect("/dashboard/connect-x")` gate remains on a normal flow, remove it.

- [ ] **Step 3: Verify.** `pnpm build && echo OK`; `pnpm lint:fix app/dashboard/connect-x/page.tsx`. Browser-agent (Slice-1 demo):

```
1. Sign in as a NO-X account (or disconnect X via Settings).
2. /dashboard/agents → the agents list with an ENABLED "New agent" button (no disabled gate).
3. Click "New agent" → /dashboard/agents/new chat loads (no redirect to connect-x).
4. Build a minimal agent (name + scanning + drafting + one X handle OR web search), Save → lands on /dashboard/agents/[id] with NO 403.
EXPECT: the no-X create/save loop is walkable; no "Connect X" gate anywhere on the happy path.
```

- [ ] **Step 4: Commit.** `feat(connect-x): make the connect page an optional entry, not a gate (#37)`

---

## Task A3 — Bound the model call (timeout + abortSignal + onAbort) + extract `persistRunResult` (MUST)

**Files:** Modify `lib/scan/run.ts`, `lib/scan/ui-stream.ts`; Create `lib/scan/persist.ts`.

- [ ] **Step 1: Add `abortSignal` + `onAbort` to `RunScanInput` and the `streamText` call.** In `lib/scan/run.ts`, change the interface (after L18 `preferredDomains: string[];`):

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
  /** UX/deadline abort (client stop, cron deadline). Correctness comes from onAbort + the
   *  consumer's consumeStream/persist wiring, never from this signal alone. */
  abortSignal?: AbortSignal;
  /** Fires when the stream aborts (timeout or external signal). The consumer wires the
   *  run-failed persistence here — onAbort carries no usage/output, so it's a failed run. */
  onAbort?: () => void;
}
```

Then add `timeout`, `abortSignal`, and `onAbort` to the `streamText({ ... })` call — insert immediately after `maxOutputTokens: 1_000_000,` (L60), before `output:`:

```ts
    maxOutputTokens: 1_000_000,
    // Bound the model call well under maxDuration = 300s so a hung Grok call fails the run
    // instead of riding to the 300s wall and orphaning it. timeout is a first-class
    // streamText option (TimeoutConfiguration); onAbort is the failure hook.
    timeout: { totalMs: 240_000 },
    abortSignal: input.abortSignal,
    onAbort: input.onAbort,
```

(Leave `stopWhen`, `temperature`, `topP`, `output`, `providerOptions`, and the `no_inline_citations` comment unchanged.)

- [ ] **Step 2: Export `ScanResult` from `lib/scan/ui-stream.ts`.** Change L20-21 from `type ScanResult = ...` to exported (keep the existing biome-ignore comment):

```ts
// biome-ignore lint/suspicious/noExplicitAny: StreamTextResult's OUTPUT generic only affects result.object typing; `unknown` breaks inference that downstream callers rely on.
export type ScanResult = StreamTextResult<ToolSet, any>;
```

- [ ] **Step 3: Create `lib/scan/persist.ts`** — the verbatim persistence logic from `run/route.ts:154-244`, generalized over the client + a pre-created `runId` + `source`, carrying the notify seam:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { SCAN_MODEL } from "@/lib/ai/providers";
import { extractMetrics, type ScanResult, storiesFromOutput } from "@/lib/scan/ui-stream";
import type { Database } from "@/lib/types/database";
import type { RunItemInsert } from "@/lib/types";
import { logUsage } from "@/lib/usage/log";

/** Usage attribution dimension (api_usage_events.source). runs.source stays manual|cron. */
export type RunUsageSource = "manual" | "cron" | "auto_post";

export interface PersistRunResultInput {
  /** RLS client (manual route) or service-role client (cron). The caller owns the choice. */
  supabase: SupabaseClient<Database>;
  /** The runs row id, created up front with status='running'. */
  runId: string;
  agentId: string;
  /** Owner of the agent — usage attribution. */
  userId: string;
  /** The streaming result from runScanStream (already being consumed by the caller). */
  result: ScanResult;
  /** Date.now() captured before runScanStream, for elapsed metrics. */
  startedAt: number;
  source: RunUsageSource;
}

/**
 * Drive a finished scan result into terminal DB state: build run_items, mark the run
 * completed/failed, and log usage. Source-agnostic and client-agnostic so the manual route
 * (RLS client) and the cron tick (service-role client, Stage C) share ONE persistence path.
 * The single run-completion chokepoint. Never throws — any failure lands the run 'failed'.
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
      source, // new api_usage_events.source dimension (A0 column; logUsage spreads it via ...rest)
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
    // channels (email / WhatsApp / push) hook in HERE, the single run-completion chokepoint.
    // No interface/emitter/registry yet (YAGNI, spec §2.3).
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

- [ ] **Step 4: Verify.** `pnpm build && echo OK` (the route still has its inline copy — that's fine until A4). If `source` is rejected by the `logUsage` type, the A0 regen missed the column — fix A0 Step 5 first. Then `pnpm exec biome check --write lib/scan/run.ts lib/scan/ui-stream.ts lib/scan/persist.ts`.

- [ ] **Step 5: Commit.** `refactor(scan): bound the model call (timeout/abort/onAbort); extract source-agnostic persistRunResult (#37)`

---

## Task A4 — Server-driven completion: rewire the manual run route (MUST · THE never-hang fix)

**Files:** Modify `app/api/agents/[id]/run/route.ts`.

> Today the run only finishes if the browser drains the stream (`agent-detail.tsx:157` `while(true) reader.read()`); a closed tab orphans the run at `running` forever. We drive completion server-side via `result.consumeStream()` and persist after it; the browser stream becomes pure UX.

- [ ] **Step 1: Replace the imports (L1-7)** with:

```ts
// Imports
import { runScanStream } from "@/lib/scan/run";
import { scanToUIResponse } from "@/lib/scan/ui-stream";
import { persistRunResult } from "@/lib/scan/persist";
import { createClient } from "@/lib/supabase/server";
import type { Agent } from "@/lib/types";
```

(Drop `SCAN_MODEL`, `extractMetrics`, `storiesFromOutput`, `RunItemInsert`, `logUsage` — they moved into `persist.ts`.)

- [ ] **Step 2: Delete the inactive→409 block (L74-78)** entirely:

```ts
  if (agent.status === "inactive") {
    return new Response("Reconnect X to reactivate this agent.", {
      status: 409,
    });
  }
```

(The `!agent.search_x && !agent.search_web` source guard and the instructions guards below it stay — they are X-independent.)

- [ ] **Step 3: Replace the `runScanStream(...)` + `return scanToUIResponse(...)` tail (L126-246)** with the `consumeStream`-driven composer:

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
    abortSignal: AbortSignal.timeout(240_000),
    onAbort: () => {
      // Timeout/abort fired — onFinish never runs, so close the run here. Best-effort.
      supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "Run timed out before completing.",
        })
        .eq("id", runId)
        .then(undefined, (e) => console.error("onAbort run update failed", e));
    },
  });

  // SERVER-DRIVEN COMPLETION (the root never-hang fix, spec §3.2): consumeStream fully drives
  // the model and resolves regardless of whether any client reads the response. We chain
  // persistRunResult after it, so a closed tab / navigation / dropped network has ZERO
  // correctness consequence. The browser stream below is pure UX (live progress). NOT awaited.
  // We deliberately do NOT also wire scanToUIResponse's onFinish — consumeStream is the single
  // completion driver, so there is no double-persist race.
  void result
    .consumeStream({
      onError: (error) => console.error("consumeStream error (manual run):", error),
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

  // Pure UX: the response stream is decorative; the client may disconnect at any time.
  return scanToUIResponse(result);
```

> **Serverless caveat (verified):** `@vercel/functions` is not installed, so we do not use `waitUntil`. `vercel.json` sets `"fluid": true`; the fluid runtime keeps the function alive while the returned streaming `Response` is open, and `consumeStream` is kicked before the `Response` is returned, so the model is driven to completion in-process. If a prod orphan is ever observed, the Stage C reaper is the backstop and `@vercel/functions` + `waitUntil` is the follow-up — note this in the commit body.

- [ ] **Step 4: Verify build + lint.** `pnpm build && echo OK`; `pnpm exec biome check --write "app/api/agents/[id]/run/route.ts"`. Confirm no leftover unused-import warnings.

- [ ] **Step 5: GATE — the never-hang kill test (browser-agent + Supabase MCP).** This is the headline reliability invariant and the gate for the whole stage. Do not proceed to A5+ until it passes.

```
A) Happy path (tab stays open): /dashboard/agents/<id> → "Run saved agent" → drafts stream + appear.
B) The orphan test (the load-bearing check): click "Run saved agent", then WITHIN 3 SECONDS
   (while status is "running") close the tab / navigate away.
```

Then in the DB (`mcp__plugin_supabase_supabase__execute_sql`):

```sql
select id, status, completed_at, item_count, error_message
from public.runs where agent_id = '<AGENT_ID>' order by started_at desc limit 2;
```

**PASS** = the run from (B) reached `status = 'completed'` (or `'failed'`) with `completed_at` non-null **despite the client disconnecting**. **FAIL** = stuck at `running` → STOP; the `consumeStream` wiring is wrong (confirm the `void result.consumeStream(...).then(persistRunResult)` sits before the `return scanToUIResponse(result)`).

- [ ] **Step 6: Commit.** `fix(scan): server-driven run completion via consumeStream + persistRunResult (never-hang) (#37)`

---

## Task A5 — Bound the token-refresh fetch + drop dead reactivation (MUST)

**Files:** Modify `lib/x/tokens.ts`.

> `lib/x/client.ts` already has `AbortSignal.timeout(8000)` on its reads (L187/243/288). `rotateAccessToken` (`tokens.ts:144`) is the **only** remaining unbounded network hop on the eventual headless cron path.

- [ ] **Step 1: Add the timeout to the refresh fetch (L144).** Add `signal: AbortSignal.timeout(8000),` as the last property of the `fetch(X_TOKEN_ENDPOINT, { ... })` options (after `body:`):

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

- [ ] **Step 2: Neutralize the now-dead reactivation in `saveConnection` (L94-97).** Since A7 makes disconnect stop setting agents `inactive`, the `update({ status: "active" }).eq("status", "inactive")` is a near-no-op. Leave it but add a one-line comment above it (YAGNI — it's harmless and still correct for any legacy `inactive` rows):

```ts
  // Legacy: reactivate any agents left 'inactive' by an older disconnect. Harmless now
  // (disconnect no longer inactivates agents — spec §5.1). Kept for legacy rows.
```

- [ ] **Step 3: Verify.** `pnpm build && echo OK`; `pnpm exec biome check --write lib/x/tokens.ts`. `grep -n "AbortSignal.timeout" lib/x/tokens.ts` → expect one hit.

- [ ] **Step 4: Commit.** `fix(x): bound the X token-refresh fetch with an 8s timeout (#37)`

---

## Task A6 — Owner-explicit shared poster `postRunItem` + post route delegates (MUST · security-critical)

**Files:** Create `lib/x/post-item.ts`; Modify `app/api/agents/run-items/[id]/post/route.ts`.

> `post/route.ts:58-62` selects the item with **no owner filter** — safe only because the RLS request client scopes it. Stage C cron uses a service-role client that bypasses RLS; without an explicit ownership assertion, a bug in the due query could post agent A's draft with user B's token (cross-account posting, spec §5.3/§10). We assert ownership **in code** now, on the manual path, so the same guarded function is reused by cron in Stage C.

- [ ] **Step 1: Create `lib/x/post-item.ts`.** It loads the item joined to its agent's `user_id`, asserts ownership, posts, and writes terminal state incl. `posted_via`. Returns a typed result with a `code: "no_x_connection"` signal for the UI:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDraftIssue } from "@/lib/draft/validate";
import type { Database } from "@/lib/types/database";
import { postTweet } from "@/lib/x/client";
import { getFreshAccessToken } from "@/lib/x/tokens";

export type PostRunItemResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string; status: number; code?: "no_x_connection" };

interface OwnedItem {
  id: string;
  drafted_text: string;
  final_text: string | null;
  status: Database["public"]["Enums"]["item_status"];
  agents: { user_id: string } | null;
}

/**
 * Post one run_item to X as its OWNER. Loads the item joined to its agent's user_id and
 * ASSERTS agent.user_id === ownerUserId before posting with that owner's fresh token — the
 * regression guard that keeps a service-role caller (cron, Stage C) from cross-account posting.
 * The caller passes the client (RLS for the route, service-role for cron) and the ownerUserId.
 * @param postedVia 'manual' (route) or 'auto' (cron auto-post) — written to run_items.posted_via.
 */
export async function postRunItem(args: {
  supabase: SupabaseClient<Database>;
  ownerUserId: string;
  itemId: string;
  requestedText?: string;
  postedVia: "manual" | "auto";
}): Promise<PostRunItemResult> {
  const { supabase, ownerUserId, itemId, requestedText, postedVia } = args;

  const { data: item, error: itemError } = await supabase
    .from("run_items")
    .select("id, drafted_text, final_text, status, agents(user_id)")
    .eq("id", itemId)
    .maybeSingle<OwnedItem>();

  if (itemError) return { ok: false, error: "Failed to load draft.", status: 500 };
  if (!item) return { ok: false, error: "Draft not found.", status: 404 };

  // OWNERSHIP ASSERTION — the cross-account-posting guard. Never trust RLS alone here
  // (cron uses a service-role client that bypasses it).
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

> The `.select("..., agents(user_id)")` embed uses the existing `run_items_agent_id_fkey` FK; the embedded `agents` is a to-one object typed `{ user_id: string } | null`. Confirm the embed parses at build time; if the generated types reject the embed string, add a localized `// @ts-expect-error postgrest embedded-join typing` and re-verify with `pnpm build`.

- [ ] **Step 2: Rewrite `post/route.ts` to delegate.** Keep the auth guard + `requestedText` parse (L27-56), then replace the item-load-through-end (L58-169) with:

```ts
  const result = await postRunItem({
    supabase,
    ownerUserId: user.id,
    itemId: id,
    requestedText: requestedText || undefined,
    postedVia: "manual",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.code ? { code: result.code } : {}) },
      { status: result.status },
    );
  }
  return NextResponse.json({ id: result.id, url: result.url });
```

Update the imports: drop `getDraftIssue`, `RunItem`, `postTweet`, `getFreshAccessToken`; add `import { postRunItem } from "@/lib/x/post-item";`. The `PostableItem` type alias is now unused — delete it.

- [ ] **Step 3: Verify build + lint.** `pnpm build && echo OK`; `pnpm exec biome check --write lib/x/post-item.ts "app/api/agents/run-items/[id]/post/route.ts"`.

- [ ] **Step 4: Verify (curl) — ownership guard + no-X code.** With a drafted, non-posted `<ITEM_ID>` owned by the test user and a session cookie:

```bash
# Owner's item, X connected → 200 (or a 4xx from X if the draft is invalid):
curl -sS -X POST "http://localhost:3000/api/agents/run-items/<ITEM_ID>/post" \
  -H "Cookie: $COOKIE" -H "Content-Type: application/json" -d '{}' -w "\nHTTP %{http_code}\n"
# Cross-account: an item id NOT owned by the cookie's user → expect HTTP 404 (assertion):
curl -sS -X POST "http://localhost:3000/api/agents/run-items/<OTHER_USERS_ITEM_ID>/post" \
  -H "Cookie: $COOKIE" -H "Content-Type: application/json" -d '{}' -w "\nHTTP %{http_code}\n"
```

Expected: own item → 200/4xx-from-X; other user's item → `HTTP 404`. To test the no-X code, disconnect X for the test user, then POST your own item → `{"error":"No X connection for this user.","code":"no_x_connection"}` with `HTTP 400`. Re-posting an already-posted item → `HTTP 409`.

- [ ] **Step 5: Commit.** `feat(x): owner-explicit shared postRunItem with ownership assertion + posted_via; post route delegates (#37)`

---

## Task A7 — Disconnect-X stops retiring agents; turns off auto-post (MUST)

**Files:** Modify `app/api/x/disconnect/route.ts`.

- [ ] **Step 1: Replace the `agents → status: "inactive"` update (L79-95)** with an `auto_post = false` update + a count for the warning:

```ts
  // X is optional now (spec §5.1). Disconnecting only turns OFF autonomous posting (a live
  // token is required to auto-post); manual + scheduled scans still work without X. Do NOT
  // mark agents inactive. Report the count so the UI can warn "N agents lost auto-post".
  const { data: affected, error: agentsError } = await supabase
    .from("agents")
    .update({ auto_post: false })
    .eq("user_id", user.id)
    .eq("auto_post", true)
    .select("id");

  if (agentsError) {
    return NextResponse.json(
      { error: "Disconnected X, but failed to turn off auto-posting for your agents." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, autoPostDisabled: affected?.length ?? 0 });
```

Delete any old trailing `return NextResponse.json({ ok: true });`.

- [ ] **Step 2: Verify.** `pnpm build && echo OK`; `pnpm exec biome check --write app/api/x/disconnect/route.ts`. Then (X connected, with an agent forced to `auto_post=true` via MCP SQL `update public.agents set auto_post=true where user_id='<MY_USER_ID>';`):

```bash
curl -i -X POST "http://localhost:3000/api/x/disconnect" -H "Cookie: $COOKIE"
```

Expected: `200 {"ok":true,"autoPostDisabled":N}` with `N ≥ 1`. Confirm via SQL the agents stay `status='active'` and now `auto_post=false`.

- [ ] **Step 3: Commit.** `feat(x): disconnect disables auto-post only, never retires agents (#37)`

---

## Task A8 — Connect-bar CSS (D6) + reusable `ConnectXBar` (NICE — first to cut)

**Files:** Modify `app/workspace.css`; Create `components/agents/connect-x-bar.tsx`.

> Done early because A9's Post-intent fix reuses this bar on the details page. The pattern currently lives inline (raw `oklch()`) in `agent-chat.tsx`. CSS goes in `app/workspace.css` (where all `.workspace .ws-*` classes live), NOT globals.css.

- [ ] **Step 1: Add `.ws-connect-bar` to `app/workspace.css`** (alongside the other `ws-*` classes, e.g. near `.ws-tabs` at L779). Use existing tokens + the literal brand tint (`--brand-soft` does NOT exist):

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

(CSS is PostCSS-owned, Biome-excluded — do NOT run biome on it.)

- [ ] **Step 2: Create `components/agents/connect-x-bar.tsx`.** Reuse `startXConnect`; clamp `?next=` with `isSafeNextPath`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { isSafeNextPath } from "@/lib/safe-next";
import { startXConnect } from "@/lib/x/link-identity";

/**
 * Inline connect-X bar for the agent-details Post intent. Opens the OAuth round-trip with a
 * ?next= back to this agent (clamped by isSafeNextPath) so after consent the reporter lands
 * back on the draft they tried to post. NOT a toast (spec §5.3).
 */
export function ConnectXBar({ message, nextPath }: { message: string; nextPath: string }) {
  const [busy, setBusy] = useState(false);
  const safeNext = isSafeNextPath(nextPath) ? nextPath : "/dashboard/agents";

  const handleConnect = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await startXConnect(safeNext); // redirects to X; returns to ?next=safeNext
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start X connection.");
      setBusy(false);
    }
  }, [busy, safeNext]);

  return (
    <div className="ws-connect-bar">
      <span className="ws-connect-msg">{message}</span>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handleConnect}
        disabled={busy}
        style={{ flexShrink: 0 }}
      >
        {busy ? "Connecting…" : "Connect X"}
      </button>
    </div>
  );
}
```

> Confirm `isSafeNextPath` is exported from `@/lib/safe-next` during the task (`grep -rn "export.*isSafeNextPath" lib/`); if it lives elsewhere, import from there. The `agent-chat.tsx` inline bar keeps its own `handleConnectX` (it force-saves the chat session first) — only its markup may later be swapped to the `.ws-connect-bar` class; do not couple the standalone component to the session-save path.

- [ ] **Step 3: Verify.** `pnpm build && echo OK` (CSS excluded from Biome).

- [ ] **Step 4: Commit.** `feat(agents): tokenized connect-X bar + workspace.css class, reused on details page (D6, #37)`

---

## Task A9 — Rewrite agent-detail into the 3-tab shell + extract panels (MUST · structural)

**Files:** Create `components/agents/panels/{SourcesPanel,SchedulePanel,DraftsPanel}.tsx`; Modify `components/agents/agent-detail.tsx`.

> Done **once** in A so Stage B fills `DraftsPanel` and Stage C fills `SchedulePanel` on disjoint files (spec §5.4). The Run button loses its `!xConnected` gate. In A, `DraftsPanel` keeps the existing latest-run behavior (Stage B widens it to multiple runs). Keep the shared post/redraft/run state + handlers in `agent-detail.tsx` and pass them down.

- [ ] **Step 1: Create `components/agents/panels/SourcesPanel.tsx`** — lift the current Settings tab body (the `ConfigForm` + Save settings button, `agent-detail.tsx:454-472`):

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

- [ ] **Step 2: Create `components/agents/panels/SchedulePanel.tsx`** — a typed placeholder so the tab renders (Stage C fills it on this exact file):

```tsx
"use client";

import type { Agent } from "@/lib/types";

// Filled in Stage C (scheduling + autonomy). Placeholder keeps the tab shell stable so
// Stage C edits ONLY this file.
export function SchedulePanel({ agent }: { agent: Agent }) {
  return (
    <p style={{ margin: 0, font: "400 0.9375rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
      Scheduling and autonomous posting for <strong>{agent.name}</strong> arrive in the next update.
    </p>
  );
}
```

- [ ] **Step 3: Create `components/agents/panels/DraftsPanel.tsx`** — the run button + latest-run results + post/redraft UI, lifted from `agent-detail.tsx:291-450` and parameterized via props. The Run button is `disabled={running}` only; the no-X Post intent renders `ConnectXBar` instead of the old toast-only path:

```tsx
"use client";

import { ConnectXBar } from "@/components/agents/connect-x-bar";
import { ScanPreview } from "@/components/agents/scan-preview";
import { Spinner } from "@/components/ui/spinner";
import type { PreviewStory } from "@/lib/scan/types";
import { usd } from "@/lib/usage/format";

export interface DraftsPanelProps {
  agentId: string;
  running: boolean;
  xConnected: boolean;
  needsConnect: boolean;
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
  agentId,
  running,
  xConnected,
  needsConnect,
  onRun,
  latestRun,
  stories,
  perItem,
  postedLinks,
}: DraftsPanelProps) {
  return (
    <div style={{ marginTop: 20 }}>
      {(needsConnect || !xConnected) && (
        <ConnectXBar
          message={
            needsConnect
              ? "Connect your X account to post this draft."
              : "Connect X to post drafts (creating, running, and drafting all work without it)."
          }
          nextPath={`/dashboard/agents/${agentId}`}
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

          {postedLinks.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {postedLinks.map((p) => (
                <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="ws-link">
                  View on X: {p.title}
                </a>
              ))}
            </div>
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

- [ ] **Step 4: Rewrite `agent-detail.tsx`'s tabs + JSX.** Keep ALL existing state + handlers (`config`, `running`, `postingId`/`redraftingId` → expose as `postingIndex`/`redraftingIndex` derived from the existing index state, `postedUrls`, `redraftedTexts`, `handleSaveSettings`, `handleRun`, `handlePost`, `handleRedraft`, `isPosted`, `stories`). Add a `needsConnect` state defaulting `false`; in `handlePost`, if `!xConnected` set `needsConnect` true and return early (instead of falling through). Change `TabValue` and the default tab, and replace the returned JSX (L271-475) with the 3-tab switcher delegating to the panels:

```tsx
  type TabValue = "drafts" | "schedule" | "sources";
  const [activeTab, setActiveTab] = useState<TabValue>("drafts");
  const [needsConnect, setNeedsConnect] = useState(false);

  const postedLinks = latestRunItems
    .filter((item) => postedUrls[item.id])
    .map((item) => ({ id: item.id, title: item.story_title ?? "", url: postedUrls[item.id] }));

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
          xConnected={xConnected}
          needsConnect={needsConnect}
          onRun={handleRun}
          latestRun={latestRun}
          stories={stories}
          perItem={{
            onPost: (i) => {
              const item = latestRunItems[i];
              if (!item || isPosted(item)) return;
              if (!xConnected) {
                setNeedsConnect(true);
                return;
              }
              handlePost(item.id);
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
        <SourcesPanel config={config} onChange={setConfig} onSave={handleSaveSettings} saving={savingSettings} />
      )}
    </div>
  );
```

Update imports: add `import { DraftsPanel } from "./panels/DraftsPanel"; import { SchedulePanel } from "./panels/SchedulePanel"; import { SourcesPanel } from "./panels/SourcesPanel";`. Remove the now-unused `ConfigForm` and `ScanPreview` imports from `agent-detail.tsx` (they moved into panels). Delete the `!xConnected` Run-disable + "Connect X to run" hint. Replace the inline `$${latestRun.cost_usd.toFixed(4)}` with `usd()` — but that line moved into `DraftsPanel` (which already uses `usd()`), so just confirm no `.toFixed(4)` cost line remains in `agent-detail.tsx` (A6 satisfied).

> **Build-green note:** if `postingIndex`/`redraftingIndex` don't already exist as derived values, compute them from the existing `postingId`/`redraftingId` + the `latestRunItems` index (`latestRunItems.findIndex((it) => it.id === postingId)`, or `null` when none) so the `ScanPreview` index-based `perItem` contract is preserved unchanged.

- [ ] **Step 5: Verify build + lint.** `pnpm build && echo OK`; `pnpm exec biome check --write components/agents/agent-detail.tsx components/agents/panels/`.

- [ ] **Step 6: Verify UI (browser-agent — Slice-3 demo).**

```
1. Open /dashboard/agents/<id> for a saved agent.
2. EXPECT three tabs: Drafts (default), Schedule & autonomy, Sources.
3. Drafts: "Run saved agent" is ENABLED even with X disconnected (no "Connect X to run" text);
   a connect-X bar shows above it when not connected. Run → "Scanning your beat…" → drafts appear.
4. With no X, click Post on an item → an inline connect-X bar appears (NOT a toast).
5. Sources: ConfigForm + "Save settings" persists (toast "Settings saved.").
6. Schedule: renders the placeholder copy.
```

- [ ] **Step 7: Commit.** `feat(agents): 3-tab detail shell (Drafts/Schedule/Sources); de-gate Run; connect-X bar at Post intent (#37)`

---

## Task A10 — Folded cleanups: D1 X-context, D2 tool-calls, D3 discovery, D4 Promise.all, D5 cached client (NICE)

**Files:** Create `lib/chat/x-context.ts`; Modify `app/api/agents/chat/route.ts`, `app/api/agents/chat-debug/route.ts`, `lib/chat/session-log.ts`, `lib/usage/log.ts`, `lib/chat/discover.ts`, `app/dashboard/agents/[id]/page.tsx`.

> Pure DRY extractions on files A is already adjacent to. Keeps Stage B/C diffs small.

- [ ] **Step 1 (D1): Create `lib/chat/x-context.ts`.**

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

/**
 * Resolve a user's X-connection context for the chat voice step. Scopes by user_id explicitly
 * (correct under both the RLS client and a service-role client) and, when connected, fetches a
 * fresh access token. Never throws on a token failure (returns accessToken: null) so the chat
 * never hangs.
 */
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

Replace the duplicated blocks in `chat/route.ts:104-113` (RLS client `supabase`) and `chat-debug/route.ts:124-134` (service-role client) with `const xConnection = await buildXConnectionContext(<client>, <userId>);`. Drop the now-unused `getFreshAccessToken` import from both routes. **Reconcile the type:** if `lib/chat/tools.ts` already exports an `XConnectionContext`, import-and-re-export it from `x-context.ts` instead of redefining, and verify with `pnpm build` (if a duplicate-identifier conflict appears, switch `x-context.ts` to `import type { XConnectionContext } from "@/lib/chat/tools"; export type { XConnectionContext };`).

- [ ] **Step 2 (D2): `collectToolCalls` + `ToolCallLog`.** In `lib/chat/session-log.ts`, add a shared type + helper and change `ChatTurnLog.toolCalls` to `ToolCallLog[]`:

```ts
export interface ToolCallLog {
  name: string;
  input?: unknown;
  output?: unknown;
}

/** Flatten AI SDK v6 steps into a tool-call log, pairing each call with its result. */
export function collectToolCalls(
  steps: {
    toolCalls: { toolName: string; toolCallId: string; input?: unknown }[];
    toolResults: { toolCallId: string; output: unknown }[];
  }[],
): ToolCallLog[] {
  return steps.flatMap((step) =>
    step.toolCalls.map((tc) => {
      const tr = step.toolResults.find((r) => r.toolCallId === tc.toolCallId);
      return { name: tc.toolName, input: tc.input, output: tr ? tr.output : undefined };
    }),
  );
}
```

Replace the `event.steps.flatMap(...)` block in `chat/route.ts:166` and the local `ToolCallLog` + `steps.flatMap(...)` in `chat-debug/route.ts:164` with `collectToolCalls(<steps>)`, importing `collectToolCalls`/`ToolCallLog` from `@/lib/chat/session-log`.

- [ ] **Step 3 (D3): `runGroundedDiscovery`.** In `lib/chat/discover.ts`, extract the shared `streamText` + parse body of `discoverHandles`/`discoverSites` (L73-104 / L119-150) into a private `runGroundedDiscovery(...)` runner parameterized by the prompt/schema/mapping, and have both public functions call it. Keep the public signatures (`discoverHandles(topic)` / `discoverSites(topic)`) unchanged.

- [ ] **Step 4 (D5): Module-level cached service-role client.** In `lib/usage/log.ts` and `lib/chat/session-log.ts`, hoist `createServiceRoleClient()` to a lazily-cached singleton and use it at the insert sites:

```ts
import { createServiceRoleClient } from "@/lib/supabase/service-role";
let _client: ReturnType<typeof createServiceRoleClient> | null = null;
function serviceClient() {
  _client ??= createServiceRoleClient();
  return _client;
}
```

- [ ] **Step 5 (D4): `Promise.all` on the details page.** In `app/dashboard/agents/[id]/page.tsx`, parallelize the independent agent + connection loads (the agent load gates `notFound()`, so keep the run/items loads after — Stage B widens the run load):

```ts
  const [{ data: agent }, { data: connection }] = await Promise.all([
    supabase.from("agents").select("*").eq("id", id).maybeSingle<AgentDetailRow>(),
    supabase.from("x_connections").select("id").maybeSingle<{ id: string }>(),
  ]);
  if (!agent) notFound();
```

Remove the later standalone `connection` query. (The chat/route `convertToModelMessages` + new/page sessions-list `Promise.all` from spec §9 D4 ride into this cleanup if trivially adjacent; otherwise they are a 5-min optional follow-up — flagged in the self-review.)

- [ ] **Step 6: Verify.** `pnpm build && echo OK`; `pnpm lint:fix` the touched files. Then drive the chat-debug endpoint (or the `chat-debug` skill) to confirm the dedupe didn't break the chat:

```bash
curl -s -X POST http://localhost:3000/api/agents/chat-debug \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"a10-check","userMessage":"I cover Premier League transfers","reset":true}' | head -c 400
```

Expected: a JSON object with `text` and `toolCalls` (non-error).

- [ ] **Step 7: Commit.** `refactor: dedupe X-context, tool-call collection, grounded discovery, cached service client, Promise.all (D1/D2/D3/D4/D5, #37)`

---

# STAGE B — Drafts worklist / run-history (full bite-sized)

> Same branch + squash as A. Fills `DraftsPanel` with a multi-run worklist, surfaces per-item terminal state that survives refresh, adds the new-drafts badge, and closes the dead draft/redraft cost-logging gap.

## Task B1 — Fetch recent runs + items on the details page (MUST)

**Files:** Modify `app/dashboard/agents/[id]/page.tsx`, `components/agents/agent-detail.tsx`.

- [ ] **Step 1: Replace the latest-run-only fetch with the last ~20 runs + their items.** After the agent load, fetch recent runs and all their items in one `in (runIds)` query:

```ts
  const { data: runRows } = await supabase
    .from("runs")
    .select(
      "id, status, started_at, completed_at, cost_usd, x_search_count, item_count, error_message, source",
    )
    .eq("agent_id", id)
    .order("started_at", { ascending: false })
    .limit(20);
  const runs = (runRows ?? []) as RunRow[];

  let items: ItemRow[] = [];
  if (runs.length > 0) {
    const { data: itemRows } = await supabase
      .from("run_items")
      .select(
        "id, run_id, story_title, story_summary, source_urls, primary_tweet_url, drafted_text, final_text, status, x_tweet_url, posted_at, posted_via, error_message, created_at",
      )
      .in("run_id", runs.map((r) => r.id))
      .order("created_at", { ascending: false });
    items = (itemRows ?? []) as ItemRow[];
  }
```

- [ ] **Step 2: Define `RunRow`/`ItemRow` Pick types** at the top of the page AND in `agent-detail.tsx` (keep them identical):

```ts
type RunRow = Pick<
  Run,
  "id" | "status" | "started_at" | "completed_at" | "cost_usd" | "x_search_count" | "item_count" | "error_message" | "source"
>;
type ItemRow = Pick<
  RunItem,
  "id" | "run_id" | "story_title" | "story_summary" | "source_urls" | "primary_tweet_url" | "drafted_text" | "final_text" | "status" | "x_tweet_url" | "posted_at" | "posted_via" | "error_message" | "created_at"
>;
```

- [ ] **Step 3: Update `AgentDetailProps`** to accept `runs: RunRow[]` + `items: ItemRow[]` (replacing `latestRun`/`latestRunItems`); derive `latestRun = runs[0] ?? null` and `latestRunItems = items.filter((it) => it.run_id === latestRun?.id)` inside the component so A's existing handlers keep working unchanged while B2 widens the panel. Seed `postedUrls` from `items` (not just the latest run's items).

- [ ] **Step 4: Verify.** `pnpm build && echo OK`; `pnpm lint:fix "app/dashboard/agents/[id]/page.tsx" components/agents/agent-detail.tsx`.

- [ ] **Step 5: Commit.** `feat(agents): load recent runs + items for the Drafts worklist (#37)`

## Task B2 — Drafts worklist grouped by run (MUST)

**Files:** Modify `components/agents/panels/DraftsPanel.tsx`, `components/agents/agent-detail.tsx`.

- [ ] **Step 1: Widen `DraftsPanelProps`** to accept `runs: RunRow[]` + `items: ItemRow[]` and itemId-keyed handlers (`onPost(itemId, finalText?)`, `onRedraft(itemId)`, `postingId`, `redraftingId`, `redraftedTexts`) — render `StoryCard`s directly keyed by itemId rather than threading the index-based `ScanPreview` `perItem` contract (indices drift once items span multiple run groups, and `ScanPreview` is shared with the create flow — see self-review insight). Group items by `run_id`; render reverse-chron run group headers (`Intl.DateTimeFormat` date · status · `N items` · `usd(cost)` · `scheduled` when `source === "cron"`).

- [ ] **Step 2: Add the run-in-progress + actionable empty states.** "Scanning your beat…" while `running`; per-completed-run empty state ("No stories matched — loosen your scanning instructions or widen the window") for runs with `item_count === 0`. Post/Redraft enabled for any `status === "drafted"`, non-posted item.

- [ ] **Step 3: Move `agent-detail.tsx` to itemId-keyed handlers** (`postingId`/`redraftingId` strings instead of indices) and pass `runs`/`items` to `DraftsPanel`. Keep the no-X `needsConnect` short-circuit from A9.

- [ ] **Step 4: Verify.** `pnpm build && echo OK`; browser-agent: open a detail page with ≥2 runs → grouped headers, each run's drafts beneath, newest first; Post/Redraft on drafted items; running again adds a new top group after `router.refresh()`.

- [ ] **Step 5: Commit.** `feat(agents): Drafts worklist grouped by run with per-item post/redraft (#37)`

## Task B3 — Per-item terminal state in `story-card.tsx` (survives refresh) (NICE)

**Files:** Modify `components/agents/story-card.tsx`, `components/agents/panels/DraftsPanel.tsx`.

- [ ] **Step 1: Extend `StoryCardProps`** with `posted?: boolean`, `postedUrl?: string | null`, `postedAt?: string | null`, `postedVia?: "manual" | "auto" | null`, `failedError?: string | null`.

- [ ] **Step 2: Render terminal states.** When `posted`: replace the Post button with a "View on X" link + `Intl.DateTimeFormat` timestamp + (if `postedVia === "auto"`) a `wbadge` "auto-posted". When `failedError`: show the error in `--err`, keep Redraft. (Today posted state is optimistic-only at `agent-detail.tsx:100-106`; now it reads from the DB row so it survives refresh.)

- [ ] **Step 3: Thread the props from `DraftsPanel`** using each item's DB `status`/`x_tweet_url`/`posted_at`/`posted_via`/`error_message`.

- [ ] **Step 4: Verify.** `pnpm build && echo OK`; browser-agent: post an item, hard-refresh → the "View on X" link + timestamp persist (not reverted to a Post button). Curl: re-posting a posted item → `HTTP 409` (proves persistence, not optimistic-only).

- [ ] **Step 5: Commit.** `feat(agents): per-item posted/failed terminal state that survives refresh (#37)`

## Task B4 — In-app new-drafts badge + reporter status labels (NICE)

**Files:** Modify `app/dashboard/agents/page.tsx`.

- [ ] **Step 1: Count drafted, non-posted items per agent.** After loading agents, batch-count (RLS-scoped; confirm `run_items` is owner-scoped via RLS, else join through `agents`):

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

- [ ] **Step 2: Render the badge + reporter labels.** On each row, when `draftCounts.get(agent.id) > 0` render `<span className="ws-newbadge">{n} new draft{n === 1 ? "" : "s"}</span>`. Map the status span text `active → Running`, `paused → Paused`, `inactive → Retired`.

- [ ] **Step 3: Add `.ws-newbadge` to `app/workspace.css`** (alongside `ws-*`; reuse existing tokens):

```css
.workspace .ws-newbadge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font: 600 0.6875rem/1.4 var(--font-sans);
}
```

- [ ] **Step 4: Verify.** `pnpm build && echo OK`; browser-agent: an agent with drafted items shows "N new drafts"; posting all of an agent's drafts removes its badge after refresh.

> **Scope note (carried to self-review):** this is "N drafted-unposted", not a true since-last-view delta (spec §6 says no new table). A reporter who never opens the app sees a count, not an unread delta. Acceptable this milestone.

- [ ] **Step 5: Commit.** `feat(agents): new-drafts badge + reporter status labels on the agents list (#37)`

## Task B5 — Log draft/redraft Gateway cost (close the dead usage-kind gap) (NICE)

**Files:** Modify `lib/draft/generate.ts`, `app/api/agents/run-items/[id]/redraft/route.ts`.

> Spec §11: `draft`/`redraft` usage kinds exist in the enum but are dead — `generateOnce` (`generate.ts:22`) discards `providerMetadata`, and the redraft route logs nothing. `generateDraft` is called ONLY by the redraft route (the scan drafts inline in the single Grok call, logged as `kind: scan`), so the live unlogged path is **redraft** — do NOT invent a standalone `draft` caller (YAGNI).

- [ ] **Step 1: Surface gateway cost from `generateOnce`.** Change its return to `{ text, marketCost, resolved }`, reading `providerMetadata.gateway.marketCost` defensively (same shape as `chat/route.ts:143`). Thread the last call's `marketCost`/`resolved` out of `generateDraft`'s `{ ok: true, ... }` return (sum the repair-pass cost if a repair runs).

- [ ] **Step 2: Log in the redraft route.** After a successful `generateDraft`, before returning:

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

Add `import { logUsage } from "@/lib/usage/log";` and `import { DRAFT_MODEL } from "@/lib/ai/providers";`.

- [ ] **Step 3: Verify.** `pnpm build && echo OK`; redraft a draft in the browser, then query via MCP: `select kind, cost_usd from public.api_usage_events where kind='redraft' order by created_at desc limit 1;` → expect one row with non-null `cost_usd` (`cost == 0` is the regression signal for a missing `marketCost` on a token-bearing call — note it if it occurs).

- [ ] **Step 4: Commit.** `feat(usage): log redraft Gateway cost (close the dead usage-kind gap, #37)`

---

> **STAGE A+B QC + DELIVERY (✋ gate):** run `/simplify` then `/code-review` on the full A+B diff; address findings. `pnpm lint` clean (or `pnpm lint:fix` applied); `pnpm build` exit 0. Run the §13 browser-agent acceptance: the no-X loop end-to-end (signup → create → save → run → drafts → connect at Post-intent → post 201); **the run reaches terminal state with the tab closed mid-run** (A4 gate); the new-drafts badge appears/clears; the 3 tabs render. Hand the checklist to the developer. Squash-merge `ft/37` → `dev`. **#37 stays open.**

---

# STAGE C — Scheduling + autonomy (TASK-LEVEL OUTLINE — pending stage-start expansion)

> **Outline only.** A+B's outcomes (the proven engine, `persistRunResult`, `postRunItem`, the `source` dimension) inform the exact signatures; each task is expanded to full bite-sized detail at Stage C start. The ordering proves the concurrency primitives BEFORE auto-post rides on them (risk-first), and surfaces a manual/admin-triggered SCHEDULED run as a visible Drafts-tab slice BEFORE auto-post exists (vertical-slice). Cron is **prod-only** (`ft/**` doesn't deploy, `vercel.json`), so the densest logic is extracted PURE and verified via `node --experimental-strip-types` assertion scripts + an admin-gated manual trigger on a preview deploy.

### C0 — Stage C migration + type regen
- **Files:** Supabase MCP migration `issue37_c_scheduling`; regenerate `lib/types/database.ts`.
- **SQL:** `UNIQUE(agent_id, dedupe_key)` on `run_items` (**dedupe pre-existing cross-run duplicate keys FIRST** — the constraint hard-fails on existing dupes); partial index `run_items(agent_id, posted_at) WHERE posted_at IS NOT NULL` (daily-cap count); partial index `agents(next_run_at) WHERE status = 'active' AND next_run_at IS NOT NULL` (due query); reconcile `agents_monitored_handles_check` `<= 20` → `<= 10`.
- **Verify:** `list_migrations` + `get_advisors` (no new errors); types diff shows the constraint/indexes; `pnpm build` exit 0.
- **KILL-CRITERIA:** the unique constraint must add cleanly — if existing rows violate it, dedupe them first; never force-drop.

### C1 — `nextRunAt(schedule, after)` + `isAgentDue(agent, now)` as PURE functions (verify FIRST)
- **Files:** Create `lib/schedule/next-run.ts`, `lib/schedule/due.ts`. Pure: injected `now`/`tz`/`after`, zero `Date.now()`/Supabase/fetch inside.
- **Key steps:** DST (clamp the spring-forward gap; take the first fall-back hour), midnight-crossing windows (`window_end < window_start`), anchor slots to `window_start + k·cadence` (no drift; `cadence` min 60), **empty `schedule_days` ⇒ null (scheduling disabled)**.
- **Verify:** `scripts/verify-next-run.ts` run via `node --experimental-strip-types scripts/verify-next-run.ts` printing PASS/FAIL for explicit cases — weekday 9am–6pm/2h at 10:05 ET → next anchored 12:00 (or correct slot); DST 2026-03-08 America/New_York spring-forward; midnight-crossing 22:00–04:00 includes 01:00; empty days → null; anchor-no-drift across 3 successive calls. **Highest-priority gate for the track.**

### C2 — Cross-run dedupe + moving window (P0 — gates the track)
- **Files:** Create `lib/schedule/dedupe.ts`; modify `lib/scan/persist.ts` (upsert `run_items ON CONFLICT (agent_id, dedupe_key) DO NOTHING`).
- **Key steps:** before drafting, skip stories whose `(agent_id, dedupe_key)` already exists with status in `('drafted','posted')` within a ~14-day rolling lookback (reuse the stable `dedupe_key`). For cron, compute a moving window: `fromDate = last completed run start (or now − cadence)`, `toDate = now`; `scan_from`/`scan_to` become manual-run overrides only.
- **Verify:** pure dedupe-key filter assertion script (existing keys + candidates → expected survivors); DB-level — insert the same `(agent_id, dedupe_key)` twice → one row.

### C3 — Cron endpoint + atomic agent lease + stale-run reaper (manual-trigger demo slice)
- **Files:** Create `app/api/cron/scan/route.ts` (POST-only), `lib/scan/reaper.ts` (`reapStaleRuns(client, olderThanMs=360_000)` — pure cutoff math verifiable via `node --experimental-strip-types`), `app/api/admin/cron-trigger/route.ts` (admin-gated, reuse `ADMIN_EMAILS`). Register `vercel.json` `crons` (~15 min). Auth: constant-time `Bearer ${CRON_SECRET}` via `crypto.timingSafeEqual`; **never** the forgeable `x-vercel-cron` header.
- **Key steps:** due query (`next_run_at <= now() AND status != 'paused' AND today ∈ schedule_days AND now ∈ window(tz) AND (search_x OR search_web) ORDER BY next_run_at ASC LIMIT batch`); atomic lease `UPDATE agents SET next_run_at = nextRunAt(...) WHERE id = $1 AND next_run_at <= now() RETURNING id` — only the row-returner owns the run; per-agent `try/catch`; `await result.consumeStream()` → `persistRunResult({ source: 'cron' })`; empty checks bump `agents.last_checked_at` and do NOT create a `runs` row (spec §2.7); run `reapStaleRuns` (service-role) each tick.
- **Verify (adversarial):** on a preview deploy via the admin trigger — double-fire concurrently for one due agent → exactly ONE run (lease holds); wrong `Authorization` → 401; no due agents → 200 + `last_checked_at` bumped, no `runs` row; a `cron`-source run appears on the agent's Drafts tab.
- **KILL-CRITERIA:** two runs from a double-fire ⇒ the lease is broken; stop before auto-post.

### C4 — Auto-post (atomic claim, transactional cap, kill switch, self-heal) — LAST in C
- **Files:** modify `lib/x/post-item.ts` (atomic claim path) + `app/api/cron/scan/route.ts` (poster); create `lib/posting/cap.ts` (`dailyCapRemaining`, pure); `lib/usage/*` (per-user daily USD cap). `AUTO_POST_ENABLED` checked first.
- **Key steps:** atomic per-item claim `UPDATE run_items SET status = 'posting' WHERE id = $1 AND status = 'drafted' RETURNING id` — only the row-returner posts via `postRunItem({ postedVia: 'auto' })` (success → `posted`; failure → `failed`); cap enforced transactionally per agent keyed to the agent's `schedule_timezone` day (optionally `pg_advisory_xact_lock(hashtext(agent_id))`); self-heal on `400 invalid_grant` (set `auto_post = false` for the user's agents + reconnect banner, stop retrying); per-user daily USD spend cap before each scheduled scan.
- **Verify (adversarial):** pure cap math (count vs cap → allowed/blocked); double-fire the claim → exactly one `posted`; cap=1 with 3 queued → exactly 1 posts; `AUTO_POST_ENABLED=false` → zero posts; simulated `invalid_grant` → `auto_post` flips off, no retry storm.
- **KILL-CRITERIA:** any double-post, cap overshoot, or kill-switch leak blocks merge — this writes to real public accounts.

### C5 — Schedule & autonomy tab UI (fills `SchedulePanel`)
- **Files:** `components/agents/panels/SchedulePanel.tsx`; the timezone **select** (`Intl.DateTimeFormat().resolvedOptions().timeZone`) replacing the free-text IANA input in `config-form.tsx`.
- **Key steps:** plain-language summary computed from the SAME `nextRunAt` the cron uses ("Scans every 2h on weekdays 9am–6pm ET; next run in 40 min"); `auto_post` toggle visually gated behind X-connected + schedule-set + a **one-time confirm naming the exact @handle** (thread the connected username down); "N of M auto-posts used today".
- **Verify:** browser-agent — cannot enable cron/auto_post with empty `schedule_days`; the confirm names the handle; the summary matches `nextRunAt`.

### C6 — Cost telemetry: source breakdown + caps
- **Files:** `lib/usage/aggregate.ts`, `app/dashboard/usage/page.tsx`. Add a `bySource` (manual/cron/auto_post) breakdown; alert when token-bearing calls log `cost == 0`.
- **Verify:** usage page shows the manual vs cron vs auto_post split after a few runs.

> **STAGE C exit (✋ gate):** pure-function assertions PASS; adversarial double-fire/cap/kill-switch on a preview deploy via the admin trigger; `/simplify` + `/code-review`; `pnpm build`; browser. Squash → `dev`. #37 stays open.

---

# STAGE D — Protected monitoring (TASK-LEVEL OUTLINE — pending stage-start expansion)

> **Outline only.** Ships last on the proven engine. Reuses `lib/x/timeline.ts:fetchRecentPosts` (already prefers the user's OAuth token, app-bearer fallback) + the `verified_x_handles` cache. No new OAuth scope (`tweet.read` + `users.read` suffice; `follows.read` would force a re-consent wave).

### D0 — Stage D migration + regen
- `agents.protected_monitoring boolean NOT NULL DEFAULT false`; `usage_kind += 'x_timeline'` (own statement — enum ADD VALUE commit-ordering). Regenerate `lib/types/database.ts`. Verify `list_migrations` + types diff + `pnpm build`.

### D1 — Protected reads → tagged prompt block
- **Files:** Create `lib/scan/protected.ts`; modify `lib/scan/run.ts` / the prompt builder to accept an additive tagged block; thread `protected_monitoring` + the user token through the run/cron composition.
- **Key steps:** when `protected_monitoring` AND X connected, per monitored handle resolve `x_user_id` (cache hit in `verified_x_handles`, else `getUserByUsername`), `fetchRecentPosts` with the user token, pass tweets as a tagged block with **real** per-tweet URLs (`https://x.com/i/web/status/<id>`) so `scanItemSchema.urls`/`sources` stay real. Public coverage still via `xSearch`; protected reads additive. Fall back to `xSearch` when disconnected or a read fails (treat protected-not-followed as "no data").
- **Verify:** browser/curl with a followed protected account → posts appear with real status URLs; disconnect → falls back to `xSearch`, no error.

### D2 — `x_timeline` cost wiring
- **Files:** `lib/usage/pricing.ts` (≈ $0.005/post read + $0.010/user lookup), `lib/usage/cost.ts` (`x_timeline` branch); the reader logs `kind: 'x_timeline', provider: 'x_api'`; fold into the per-user daily cap (§11).
- **Verify:** pure cost-branch assertion via `node --experimental-strip-types`; a protected read logs a non-zero `x_timeline` row.

### D3 — Protected toggle UI
- **Files:** `SourcesPanel.tsx` / `SchedulePanel.tsx` — per-agent toggle (default OFF), only meaningful when X connected.
- **Verify:** browser-agent — toggle persists; disabled/explained when X not connected.

> **STAGE D exit (✋ gate):** protected toggle works on a followed protected account; cost logged under `x_timeline`; `xSearch` fallback when disconnected; `/simplify` + `/code-review`; `pnpm build`; browser. Squash → `dev`. **Close #37.**

---

## SECURITY & SAFETY (carried through all stages)
- **Cron auth:** constant-time `Bearer CRON_SECRET`; never the forgeable `x-vercel-cron` header (C3).
- **Service-role bypasses RLS:** every cron query hand-scoped by `user_id`/`agent_id`; `postRunItem`'s ownership assertion (built + exercised on the manual path in A6) is the cross-account guard reused by C4. A single missed filter is a leak.
- **Auto-post containment:** default-off + per-agent daily cap + global `AUTO_POST_ENABLED` + `posted_via` audit + first-enable confirm naming the @handle + self-heal on token death (C4).
- **No open redirect:** `isSafeNextPath` on all `?next=` paths through the de-gated connect-x flow (A2, A8 `ConnectXBar`).
- **Protected-tweet privacy:** RLS on stored content; never expose another user's protected reads (D).

---

# SELF-REVIEW

## 1. Spec-coverage map (every spec section → task)
- **§2.1 X optional everywhere** → A1 (save/scan 403s), A2 (connect-x gate), A4 (inactive→409), A6 (Post), A7 (disconnect).
- **§2.2 connect-X hard gate removed; OAuth `?next=`/`?session=` preserved** → A2, A8 (`ConnectXBar` reuses `startXConnect` + `isSafeNextPath`).
- **§2.3 notifications cut; single seam comment** → A3 (`persistRunResult` comment), no code.
- **§2.4 autonomy default-OFF + cap + kill switch + disconnect→auto_post=false** → A0 (columns), A7 (disconnect), C4 (cap/kill/self-heal).
- **§2.5 Section E in** → B (run-history/Drafts), C (scheduled/autonomous), D (protected).
- **§2.6 staged A+B → C → D** → stage headers + per-stage QC/delivery gates.
- **§2.7 empty runs not persisted; `last_checked_at` heartbeat** → A0 (`last_checked_at` column), C3 (heartbeat write).
- **§3.1 two primitives, three consumers** → A3 (`persistRunResult` + `runScanStream` timeout/onAbort); manual (A4), cron (C3), prompt-lab usage-only (A1 keeps its `onFinish` usage-only).
- **§3.2 server-driven completion via `consumeStream`** → A4 (explicit `void result.consumeStream().then(persistRunResult)`; verified the SDK shape; rejected onFinish-only).
- **§3.3 reaper + bounded token fetch** → A5 (token fetch 8s timeout); reaper in C3 (`reapStaleRuns`). (A's manual path is covered by the model `timeout` + `onAbort`; the cross-run reaper backstop lands with cron in C3, as the spec scopes "runs on every cron tick".)
- **§3.4 reliability invariants** → A4 kill-test gate; C3/C4 adversarial double-fire.
- **§4 schema deltas** → A0 (A+B subset), C0 (dedupe/index/handle-cap), D0 (`protected_monitoring`, `x_timeline`); type regen each. Env vars `CRON_SECRET`/`AUTO_POST_ENABLED` → C3/C4.
- **§5.1 X-decoupling map** → A1, A2, A4, A7; redirect audit in A2 Step 2.
- **§5.2 shared engine + reliability** → A3, A4, A5.
- **§5.3 owner-explicit poster + inline connect-bar (not toast)** → A6 (`postRunItem`), A8/A9 (`ConnectXBar` + `needsConnect`).
- **§5.4 details → 3-tab shell, disjoint panel files** → A9.
- **§5.5 folded cleanups** → A10: D1 (`buildXConnectionContext`), D2 (`collectToolCalls`/`ToolCallLog`), D3 (`runGroundedDiscovery`), D5 (cached service client); A6/usd → DraftsPanel uses `usd()`; notify seam → A3.
- **§6 Track B** → B1–B5 (worklist, terminal state, new-drafts badge, run-in-progress + empty states, end-to-end cost via `usd()` + B5).
- **§7 Track C** → C1 (`nextRunAt`/due), C2 (dedupe/window), C3 (cron/lease/reaper), C4 (auto-post/cap/kill/self-heal), C5 (schedule UI).
- **§8 Track D** → D0–D3.
- **§9 cleanups** → D4 (`Promise.all`) in A10 (details page; chat/route + new/page noted below), D6 (connect-bar CSS) in A8.
- **§10 security** → dedicated section + A6 (ownership), C3 (cron auth), C4 (containment), A2/A8 (`isSafeNextPath`).
- **§11 cost/telemetry** → B5 (redraft cost), A3 (`source` propagation), C6 (bySource + cost==0 guard), C4 (per-user cap), D2 (`x_timeline`).
- **§12 delivery** → stage structure + squash/gate notes.
- **§13 verification** → per-task concrete checks + the A4 kill-test + pure-function assertion scripts (C1/C2/C4/D2) + admin-trigger curls (C3/C4) + stage QC.
- **§14/§15 risks/out-of-scope** → carried in the security section + the open-questions below.

## 2. Placeholder scan
No "TBD/TODO/implement later" as a deliverable. Stage A+B steps each carry complete code or an exact command + expected output. Stages C/D are explicitly **task-level outline** by directive (titles + files + key steps + verification mode), not fabricated speculative code — honest scoping per writing-plans, to be expanded at their own stage start.

## 3. Type/name consistency
`persistRunResult`/`PersistRunResultInput`/`RunUsageSource` (A3) referenced identically by A4 + C3. `ScanResult` exported from `ui-stream.ts` (A3 Step 2), imported by `persist.ts`. `postRunItem`/`PostRunItemResult` (A6) reused by C4 with `postedVia: 'auto'`. `buildXConnectionContext`/`XConnectionContext` (A10) — reconciled against the existing `lib/chat/tools.ts` export. `collectToolCalls`/`ToolCallLog` (A10). `ConnectXBar` (A8) consumed by `DraftsPanel` (A9). `RunRow`/`ItemRow` Pick types identical across `page.tsx`/`agent-detail.tsx`/`DraftsPanel.tsx` (B1/B2) — all include `source`, `posted_at`, `posted_via`, `created_at`. `usd()` from `lib/usage/format`. `source` field on `logUsage` rides the `...rest` spread (verified `lib/usage/log.ts:30,44`) — A0 is the first task so the regenerated `Insert` includes `source` before any consumer compiles.

## 4. Honest gaps / notes flagged for execution
- **§9 D4 remainder:** `chat/route.ts` `convertToModelMessages` + `agents/new/page.tsx` sessions-list `Promise.all` are NOT load-bearing and ride into A10 only if trivially adjacent; otherwise a 5-min optional follow-up. Not on the critical path.
- **B4 new-drafts signal** is "N drafted-unposted", not a true since-last-view delta (spec §6 says no new table). Acceptable this milestone.
- **A3 serverless caveat:** no `@vercel/functions` `waitUntil`; relies on `fluid: true` + the open streaming Response. The Stage C reaper is the backstop. `@vercel/functions` is the follow-up if a prod orphan is ever observed.
- **C0 UNIQUE(agent_id, dedupe_key)** must dedupe pre-existing cross-run duplicate rows BEFORE adding the constraint (it hard-fails otherwise).
- **`postRunItem` embedded join** may need a localized `@ts-expect-error` if the generated types reject the embed string — confirmed by `pnpm build` in A6.
