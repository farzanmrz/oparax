# Issue #37 — Full reporter lifecycle: X-optional, monitored, autonomous

- **Date:** 2026-06-17
- **Issue / branch:** #37 / `ft/37`
- **Status:** Design — finalized after an 8-lens adversarial review + synthesis. Awaiting user approval before writing the implementation plan.
- **Author:** Claude (Opus 4.8) with Farzan

## 1. Goal

Take the chat-first agent-creation stack (issue #35) the last mile so the **full reporter
flow works reliably end-to-end and a reporter can come back to monitor each agent on its
details page**:

> signup → (optional) connect X → create agent in chat → Save → `/dashboard/agents/[id]`
> → Run → review drafts → Post → set a schedule → trusted agents scan & post autonomously.

**Reliability over breadth: the happy path must never hang, and every run must reach a
terminal state regardless of the client or connection.**

## 2. Locked scope decisions

1. **X is optional everywhere.** The user's X OAuth token is required **only** for: per-item
   Post, protected-account monitoring, and auto-post. Create / save / run / scan / draft /
   redraft all work with **zero** X connection.
2. **The connect-X hard gate is removed.** No disabled "New agent" button, no forced landing.
   X is connected mid-chat via the existing connect-bar, at Post-intent on the details page,
   or from Settings. The OAuth round-trip + `?next=` / `?session=` mechanics are preserved.
3. **Notifications are cut.** No email / WhatsApp / push. The website (the agent-details page
   + an in-app new-drafts signal) is the monitoring surface. The only artifact left for the
   future is a single documented comment at the run-completion chokepoint — **no interface,
   emitter, or registry** (YAGNI).
4. **Autonomy:** scan → draft → visible-on-site → one-tap Post by default. A per-agent
   `auto_post` toggle (**default OFF**) lets trusted agents auto-post on schedule, behind a
   **per-agent daily post cap (default 3)** and a global `AUTO_POST_ENABLED` kill switch.
   Disconnecting X sets `auto_post = false`.
5. **Section E is in:** run-history UI, scheduled/autonomous runs, and protected monitoring.
6. **Delivery is staged under #37:** `A+B` → `C` → `D`, each its own squash-merge to `dev`;
   #37 stays open until D merges. (This intentionally overrides the `/feature` default of a
   single squash — staging buys per-stage browser verification + revertability, and ships the
   dangerous cron/auto-post code on an already-proven engine.)
7. **Empty scheduled runs are not persisted** — only runs with `item_count > 0` OR `failed`
   create a `runs` row; empty checks bump an `agents.last_checked_at` heartbeat instead.

## 3. Architecture — the shared run engine + reliability invariants

### 3.1 Two pure primitives (replaces a single `runAgentScan`)

The current scan execution lives inline in `app/api/agents/[id]/run/route.ts` and is duplicated
in `app/api/agents/scan/route.ts` (the prompt-lab) — both call `runScanStream` +
`extractMetrics` + `scanToUIResponse` + `storiesFromOutput`. We do **not** introduce one
`runAgentScan()` that has to be both a streaming `Response` and an awaited result (that fights
the AI SDK `onFinish`/stream model and just relocates the coupling). Instead:

- **`runScanStream(input)`** — already pure, in `lib/scan/run.ts`. Returns the streaming result.
  Extend its `streamText` call with a real **`timeout` (~240s, under `maxDuration = 300`)** +
  **`abortSignal`**, and wire **`onAbort` → the run-failed persistence path**. (Today it sets
  `maxOutputTokens` huge with no timeout, so a hung Grok call rides to the 300s wall and orphans
  the run.)
- **`persistRunResult({ supabase, runId, agentId, userId, result, startedAt, source })`** — new,
  holding the body currently at `run/route.ts:154-245`: build `run_items`, update the `runs`
  row to terminal state, `logUsage`. Source-agnostic; callable from any context.

**Three consumers compose them:**

| Consumer | Composition |
|---|---|
| `app/api/agents/[id]/run/route.ts` (manual) | thin streaming wrapper; `onFinish` → `persistRunResult` |
| `app/api/cron/scan/route.ts` (scheduled) | `await result.consumeStream()` → `persistRunResult` |
| `app/api/agents/scan/route.ts` (prompt-lab) | same primitives, **usage-only** `onFinish` (no persist) |

### 3.2 Server-driven completion (the root never-hang fix)

Completion is driven **server-side** via `result.consumeStream({ onError })` so the model is
fully driven and `persistRunResult` runs **regardless of whether any client reads the response**.
Today (`agent-detail.tsx:157`) the run only finishes if the browser drains the stream with an
unbounded `while (true) reader.read()` loop — a closed tab, navigation, mobile backgrounding, or
dropped network orphans the run at `status = 'running'` forever.

- The browser stream becomes **pure UX** (live progress). The client read loop may disconnect
  at any time with **zero correctness consequence**. The client `AbortController` is a UX
  affordance only (stop reading / re-enable the button) — **never** the correctness mechanism.
- (`consumeStream` is confirmed available in the installed AI SDK v6.)

### 3.3 Stale-run reaper + bounded external calls

- A **stale-run reaper** runs on every cron tick: force-fail any run with `status = 'running'`
  AND `started_at` older than ~360s (covers crashes, mid-run deploys, the 300s wall).
- Add `AbortSignal.timeout(8000)` to the `rotateAccessToken` fetch in `lib/x/tokens.ts:144` —
  the one remaining unbounded network hop on the headless cron path.

### 3.4 Reliability invariants (the bar)

> Every run reaches a terminal state (`completed`/`failed`) independent of the client.
> No double-runs (atomic agent lease, §7.2). No double-posts (atomic per-item claim, §7.3).
> The cron tick is bounded (`LIMIT batch`). Every external fetch has a timeout.

## 4. Schema deltas

Applied via the Supabase MCP (project `pcgvpypzfwuchyfwdlwe`); the schema is not in-repo, so
**regenerate `lib/types/database.ts`** after the migration. Each delta lands in the migration of
the stage that first needs it (A+B, then C, then D).

**`agents`**
- `auto_post boolean NOT NULL DEFAULT false`
- `auto_post_daily_cap int NOT NULL DEFAULT 3`
- `last_checked_at timestamptz NULL` (empty-cron heartbeat)
- `protected_monitoring boolean NOT NULL DEFAULT false` (Track D opt-in)
- partial index `agents(next_run_at) WHERE status = 'active' AND next_run_at IS NOT NULL`
- reconcile the `agents_monitored_handles_check` (currently `<= 20`) with the config cap of 10.

**`run_items`**
- `posted_via text NULL` constrained to `('manual','auto')` (audit which posts were autonomous)
- add `'posting'` to the `item_status` enum (transient claim state for the atomic post claim)
- `UNIQUE(agent_id, dedupe_key)` (cross-run dedupe — §7.1)
- partial index `run_items(agent_id, posted_at) WHERE posted_at IS NOT NULL` (daily-cap count)

**`api_usage_events`**
- add a `source` dimension (`manual` | `cron` | `auto_post`) — column or metadata key
- add `'x_timeline'` to the `usage_kind` enum (`usage_provider` already has `x_api`)

**Enums to extend:** `item_status` += `posting`; `usage_kind` += `x_timeline`.

**Env vars:** `CRON_SECRET` (cron auth), `AUTO_POST_ENABLED` (global kill switch).

## 5. Track A — Foundation (X-decoupling + shared engine + safety primitives)

Lands first; everything else builds on it.

### 5.1 X-decoupling
- `app/api/agents/save-agent/route.ts` — remove the `if (!connection) → 403` block.
- `app/api/agents/scan/route.ts:38` — remove the **second, un-named** `403 "Connect X..."`.
- `app/dashboard/connect-x/page.tsx` + every redirect into it — stop forcing it; no-X users
  land on `/dashboard/agents` with a **working** "New agent" button. Keep the page reachable as
  an *optional* connect entry. **Map every redirect to connect-x during the plan** so nothing
  still funnels there.
- `components/agents/agent-detail.tsx:308` — Run button `disabled={running}` only; delete the
  "Connect X to run" hint (`320-330`).
- `app/api/agents/[id]/run/route.ts:74` — delete the `status === "inactive" → 409` block.
- `app/api/x/disconnect/route.ts:82` — stop marking agents `inactive`; instead set
  `auto_post = false` and warn "this turns off auto-posting for N agents". Status semantics
  simplify to **`active` | `paused` (scheduling off; manual still works) | `inactive` (retired,
  likely now unreachable — simplify if so)**, surfaced with reporter labels Running/Paused/Retired.

### 5.2 Shared engine + reliability
- Extract `persistRunResult` (§3.1); add the model-call timeout + `onAbort` + `consumeStream`
  (§3.2); add the reaper hook + the token-refresh fetch timeout (§3.3).

### 5.3 Owner-explicit shared poster
- Extract `postRunItem({ supabase, ownerUserId, item, text })` (A already edits
  `post/route.ts`): load the item via `run_item → run → agent → user_id`, **assert
  `item.agent.user_id === ownerUserId` before `postTweet`**, and call `getFreshAccessToken` with
  that same `ownerUserId`. The route passes the RLS client; cron passes a service-role client.
  (Today `post/route.ts:58-62` selects the item with **no owner filter** — safe only because the
  request client applies RLS, which cron bypasses. Without the assertion, a bug in the cron due
  query could post agent A's draft with user B's token — cross-account posting.)
- On Post with no X: render an **inline connect-X bar** on the details page (reuse the
  agent-chat connect-bar pattern, moved to `globals.css` in §9) that opens OAuth with `?next=`
  back to this agent+item — **not** a toast.

### 5.4 Details page → 3-tab shell
Rewrite `agent-detail.tsx` **once** in A into three tabs, with placeholder panels extracted to
separate files so B and C edit disjoint files (kills the worst three-way collision):

- **Drafts** (default) — a reverse-chronological worklist of items across recent runs; B fills it.
- **Schedule & autonomy** — C fills it.
- **Sources** — the existing source/handle/domain controls (`config-form.tsx`, already built).

Files: `DraftsPanel.tsx`, `SchedulePanel.tsx`, `SourcesPanel.tsx`.

### 5.5 Folded-in cleanups (same files A touches)
- **D1** `buildXConnectionContext(client, userId)` — dedupe the `x_connections` + `getFreshAccessToken`
  block in `chat/route.ts:104-121` and `chat-debug/route.ts:124-142`.
- **D2** `collectToolCalls(steps)` + a shared `ToolCallLog` type (move to `lib/chat/session-log.ts`).
- **D3** `runGroundedDiscovery(...)` private runner shared by `discoverHandles`/`discoverSites`.
- **D5** module-level cached service-role client (`lib/usage/log.ts` + `lib/chat/session-log.ts`).
- **A6** replace the inline `$${cost_usd.toFixed(4)}` (`agent-detail.tsx:363`) with `usd()`.
- **Notification seam:** a single `// future: notify(userId, run) — channels go here` comment in
  `persistRunResult`. No code.

## 6. Track B — Drafts worklist / run-history (E1)

- `app/dashboard/agents/[id]/page.tsx` fetches recent runs (last ~20) beyond the latest, with the
  independent awaits run via `Promise.all` (folds in the D4 cleanup for this file).
- The **Drafts** tab lists drafted/posted/failed items across runs (run metadata as group
  headers). Post/Redraft are allowed on any `drafted`, non-posted item.
- **Per-item terminal state in `story-card.tsx`:** posted → tweet link + timestamp; failed →
  error (survives refresh — today posted state is optimistic-only). Auto-posted items badged via
  `posted_via`.
- **In-app new-drafts signal** (replaces cut notifications): a per-agent count of drafted,
  non-posted items rendered as a badge on each `agents/page.tsx` row ("3 new drafts"); flag
  `run_items` created since last view. Pure DB query, no new table.
- **Run-in-progress state** on the Drafts tab (mirror the chat's `ThinkingRow`, or at minimum
  "Scanning your beat…"); **actionable empty state** ("No stories matched — loosen your scanning
  instructions or widen the window", linking to Sources/Schedule).
- Show **true end-to-end run cost** (scan + drafts) via `usd()` once drafts are logged (§11).

## 7. Track C — Scheduling + autonomy (prod-only cron infra)

### 7.1 Cross-run dedupe (P0 — gates the whole track)
Without this, a cron re-finds the same breaking story every cycle and (with `auto_post`)
re-posts it. Today uniqueness is only `UNIQUE(run_id, dedupe_key)` and the dedupe Set is per-call;
`scan_from`/`scan_to` are **static** columns nothing advances.

- `UNIQUE(agent_id, dedupe_key)`; upsert `run_items` `ON CONFLICT (agent_id, dedupe_key) DO NOTHING`.
- Before drafting, **skip stories whose `(agent_id, dedupe_key)` already exists with status in
  `('drafted','posted')` within a ~14-day rolling lookback** (reuse the existing stable
  `dedupe_key`).
- For cron, compute a **moving window**: `fromDate = last completed run start (or now − cadence)`,
  `toDate = now`. `scan_from`/`scan_to` become **manual-run overrides only**.

### 7.2 The cron endpoint + atomic agent lease
- `app/api/cron/scan/route.ts` — **POST-only**, authenticated by constant-time
  `Authorization === \`Bearer ${CRON_SECRET}\`` via `crypto.timingSafeEqual` (401 otherwise).
  **Do not** trust the forgeable `x-vercel-cron` header. Register in `vercel.json` `crons`
  (currently `[]`), ~every 15 min. Add a **manual/admin-gated trigger** so the due logic is
  curl/browser-verifiable on a preview deploy (cron only fires in prod — `ft/**` branches don't deploy).
- **Due-agent query:** `next_run_at <= now() AND status != 'paused' AND today ∈ schedule_days AND
  now ∈ window (schedule_timezone) AND (search_x OR search_web) ORDER BY next_run_at ASC
  LIMIT <batch_size>` (bounded per tick; the next tick drains the rest — respects `maxDuration`).
- **Atomic lease:** `UPDATE agents SET next_run_at = <recomputed at claim time> WHERE id = $1 AND
  next_run_at <= now() RETURNING id` — only the row-returning invocation owns the run. Per-agent
  `try/catch` isolates failures. Run the reaper (§3.3) each tick.

### 7.3 `nextRunAt(agent, after)` — one pure function
Called on Save/PATCH (when schedule fields change) **and** at lease/claim time. Handles **DST**
(clamp the spring-forward gap; take the first fall-back hour), **midnight-crossing windows**
(`window_end < window_start`), and **anchors slots to `window_start + k·cadence`** (no drift;
`cadence` min 60). **Empty `schedule_days` = scheduling disabled** — the UI blocks enabling
cron/auto_post until at least one day is chosen.

### 7.4 Auto-post (atomic, capped, kill-switched)
Only when `auto_post` AND X connected (live token) AND under the per-agent daily cap.
- **Atomic per-item claim:** `UPDATE run_items SET status = 'posting' WHERE id = $1 AND
  status = 'drafted' RETURNING id` — only the row-returner posts (success → `posted` +
  `posted_via = 'auto'`; failure → `failed`). Closes the double-post window at `post/route.ts:84`.
- **Cap enforced transactionally per agent** (count inside the same transaction, optionally
  `pg_advisory_xact_lock(hashtext(agent_id))`), keyed to the agent's **`schedule_timezone` day**
  boundary — not a racy pre-check.
- Global **`AUTO_POST_ENABLED`** checked first in the cron poster.
- **Self-heal on token death:** on `400 invalid_grant` during refresh, set `auto_post = false` for
  that user's agents, surface a "reconnect X" banner, stop retrying.
- **Per-user daily USD spend cap** checked before each scheduled scan (skip + mark the run when
  over) — protects the bill, not just the X account (§11).

### 7.5 Schedule & autonomy tab UI
- Browser-defaulted timezone **select** (`Intl.DateTimeFormat().resolvedOptions().timeZone`), not
  the free-text IANA input.
- Plain-language summary computed from the **same** `nextRunAt` logic the cron uses ("Scans every
  2h on weekdays 9am–6pm ET; next run in 40 min"); `next_run_at` rendered in the agent's tz.
- `auto_post` toggle **visually gated** behind X-connected + schedule-set + a **one-time confirm
  naming the exact @handle**; "N of M auto-posts used today".

## 8. Track D — Protected monitoring (opt-in; ships last, on the proven engine)

Reuses existing primitives — `lib/x/timeline.ts:fetchRecentPosts` already prefers the user's OAuth
token (covering their own protected account **and** protected accounts they follow) with an
app-bearer fallback, and `verified_x_handles` already caches `username → x_user_id` + `protected`.

- Per-agent **`protected_monitoring` toggle (default OFF)**, only meaningful when X is connected.
- When on, for each monitored handle: resolve `x_user_id` (cache hit in `verified_x_handles`,
  else `getUserByUsername`), call `fetchRecentPosts` with the user token, and pass the tweets to
  the scan as a **new tagged prompt block with real per-tweet URLs** (`https://x.com/i/web/status/<id>`)
  so `scanItemSchema.urls`/`sources` stay real (no fabricated URLs). Public coverage still comes
  from `xSearch`; protected reads are additive. **Fall back to `xSearch` when not connected or a
  read fails** (treat protected-not-followed as "no data").
- **No new OAuth scope** (`tweet.read` + `users.read` suffice; adding `follows.read` would force
  every existing user to re-consent).
- **Cost:** add the `x_timeline` `usage_kind` branch to `computeCostUsd`/`pricing.ts`
  (≈ $0.005/post read + $0.010/user lookup) — without it these calls silently log $0 — and fold
  the cost into the **per-user daily cap** (§11). Log with `provider: 'x_api'`.

## 9. Cleanup (former Track E — dissolved into owning tracks)

- **D4** `Promise.all` the independent awaits: `agents/[id]/page.tsx` (rides with A/B),
  `chat/route.ts` `convertToModelMessages` + x_connections (standalone first commit),
  `agents/new/page.tsx` sessions list.
- **D6** move the connect-bar + Recent-dropdown inline styles/`oklch()` out of `agent-chat.tsx`
  into `globals.css` `@layer components`, tokenized with the existing `--brand` /`--brand-ring`/
  `--inset`/`--line`/`--faint`/`--live`/`--err`. Done **early** since A reuses the connect-bar on
  the details page (the Post-intent fix). If time slips, this is the first thing to cut.

## 10. Security & safety invariants

- **Cron auth:** constant-time `Bearer CRON_SECRET`; never the `x-vercel-cron` header.
- **Service-role bypasses RLS:** every cron query is hand-scoped by `user_id`/`agent_id`; the
  owner-explicit poster (§5.3) re-asserts ownership; the due-loop + run inserts get a regression
  check. A single missed filter is a cross-account leak.
- **Auto-post containment:** default-off + per-agent daily cap + global `AUTO_POST_ENABLED` +
  `posted_via` audit + first-enable confirm naming the @handle + self-heal on token death.
- **No open redirect:** keep `isSafeNextPath` on all `?next=` paths through the de-gated connect-x flow.
- **Protected-tweet privacy:** RLS on stored story content; never expose another user's protected
  reads.

## 11. Cost & telemetry

- **Instrument the unlogged paths:** `generateDraft` (and the redraft route, which calls it but
  never logs) → `logUsage({ kind: 'draft'|'redraft', provider: 'gateway', model: DRAFT_MODEL, …,
  agent_id, run_id })` capturing `providerMetadata.gateway.marketCost`. (Today the `draft`/`redraft`
  usage kinds are dead.)
- **`source` dimension** (`manual`|`cron`|`auto_post`) on `logUsage`, propagated from `runs.source`;
  a **bySource breakdown** on `dashboard/usage`.
- **Per-user daily USD spend cap** checked in the shared scan path (sum `api_usage_events` for the
  user's day; skip + mark the run when over) + a per-tick batch cap.
- Cheap guard: alert when token-bearing calls log `cost == 0` (catches a missing `marketCost`).

## 12. Delivery plan (staged under #37)

1. **Stage A+B** — X-optional lifecycle + the reliable run engine + run-history/Drafts worklist +
   the new-drafts badge. Independently browser-verifiable; **zero net-new infra**. Squash → `dev`.
2. **Stage C** — scheduling + atomic lease + cross-run dedupe + capped/kill-switched auto-post +
   schedule UI + cost telemetry/caps. Adds prod-only cron infra. Squash → `dev`.
3. **Stage D** — protected monitoring (opt-in). Squash → `dev`. **Close #37.**

Build each stage on `ft/37` via parallel subagent tracks in isolated worktrees, converging back;
QC (`/simplify`, `/code-review`, Biome, `pnpm build`, browser-agent) runs per stage.

## 13. Verification approach (no test runner — manual per AGENTS.md)

- **Stage A+B:** the no-X loop end-to-end (signup → create → save → run → drafts → connect at
  Post-intent → post 201); run reaches terminal state with the tab closed mid-run; the #35 fixes
  (C1–C6 from the issue).
- **Stage C:** build `nextRunAt` + the due-predicate as **pure functions with inline sanity
  assertions**; drive the cron via the manual/admin trigger on a preview deploy; verify
  lease (no double-run), per-item claim (no double-post), cap, dedupe (no repeat stories),
  empty-run heartbeat, kill switch.
- **Stage D:** protected toggle on a followed protected account; cost logged under `x_timeline`;
  fallback to `xSearch` when disconnected.

## 14. Risks remaining

- Cron is **prod-only** + no test runner → the densest logic (DST/window math, lease, atomic cap)
  is verifiable only via the manual trigger; mitigated by pure functions + inline assertions.
- Auto-post writes to **real public accounts** off adversarial `xSearch` input (prompt injection);
  mitigated but residual reputational risk until the audit surface is exercised.
- **Service-role cron bypasses RLS** — discipline + the owner-explicit poster + a regression check.
- Cross-run dedupe (14-day lookback) could suppress a genuinely-evolved follow-up if the
  `dedupe_key` collides; the key is tweet-id-first, so distinct tweets surface — tune if reporters
  report misses.
- The in-app new-drafts badge is the **only** discovery mechanism now; a reporter who rarely opens
  the app accumulates unseen drafts/auto-posts. Acceptable this milestone; the `notify()` seam is
  the first follow-up.

## 15. Out of scope

- Any notification channel (email/WhatsApp/push) — comment-only seam.
- `follows.read` scope / pre-filtering followed handles (avoids a re-consent wave).
- A platform-wide posts/hour circuit breaker, per-user agent-count caps, and the
  `usage_reconciliations` drift feed (future hardening).
- A cross-agent home/overview dashboard (nice-to-have; deferred).
