# Plan — Oparax Slice 1: The Manual Loop

> Companion docs: `docs/SPEC.md` (source of truth) · `docs/TODO.md` (checkbox list).
> Status: **APPROVED 2026-05-29.** Build per this plan; begin at **T0**.

## Context
We're building the first **end-to-end manual loop** for Oparax — *Connect X → create monitor → scan (Grok `x_search`) → see separated stories → pick one → draft → edit → post a real tweet* — deployed and real enough that a football reporter can run it and give feedback. The driving reason: there is **no ground truth** yet; self-refining AI output is unfalsifiable, so plumbing-first is the fastest path to a real user's signal. Source of truth = `docs/SPEC.md` (v3.1). Constraints: speed-to-reporter, **zero throwaway work**, **all loop code built fresh** (no reuse of legacy first-party code), correct-not-pretty, **manual-only** (no cron/aggregation/auto — all parked).

## Locked decisions
- **Char counting → add `twitter-text`** (counting is functional: an inaccurate counter lets users attempt posts X rejects; the canonical lib gets emoji/ZWJ/URL weighting exactly right). Approved new dep.
- **Token encryption → app-layer AES-256-GCM** via `node:crypto` + `X_TOKEN_ENC_KEY`. No extra infra.
- **Unit tests → throwaway `tsx` script** (`scripts/check-slice1.ts`, not committed as a suite). No test runner added.
- X handshake via Supabase `provider:'x'` + `linkIdentity`; **we own the token lifecycle**; build fresh in `lib/scan|draft|x|types` + new components dir.

## Spec refinements (APPLIED to docs/SPEC.md on approval)
1. **§5:** `twitter-text` is an **added (approved) dep**, not a pre-existing one; **`zod` removed** (validate request bodies with `typeof` checks, as existing routes do).
2. **§4.3 `stories`:** trimmed to the scan's `{title, body→summary, urls→source_urls}` output. Columns: `id, scan_id, monitor_id, title, summary, source_urls[], primary_tweet_url, dedupe_key, created_at`. Dropped speculative `evidence_points`, `supporting_tweet_urls`, `source_handles`, `published_at`.

## Dependency graph
```
T0  POSTING SPIKE ──(gates OAuth path)── CHECKPOINT 0
      ▼
T1  Migration: 6 tables + RLS ──────────── CHECKPOINT 1
      ├───────── TRACK A (Connect-X) ─────────┐      ├──── TRACK B (Monitor→Scan→Draft) ────┐
      ▼                                        │      ▼                                      │
   T2 Connect X (callback+capture+Settings)    │   T5 Monitor CRUD (test/new + list)         │
   T3 Token refresh/rotate (lib/x/tokens)      │   T6 Streaming scan (route+lib/scan+[id])   │
   T4 lib/x/client + disconnect                │   T7 Pick+draft+edit (drafts route+lib/draft)│
      └───────────────┬─────────────────────────┘──────────────┬──────────────────────────────┘
                      ▼  (needs T4 ∧ T7 ∧ T1)
                   T8 POST to X ───────────────── CHECKPOINT 3
                      ▼
                   T9 End-to-end walk on deploy ── CHECKPOINT 4 (the falsifiable success)
                      ▼
                   T10 Destructive legacy cleanup (ASK-FIRST, post-validation)
```
**Two parallel tracks** (A and B) need only T1; they're independent until **T8 Post**. Within a track, tasks are serial.

## Proven patterns to reproduce fresh (study, do NOT import)
- **Streaming scan** — `lib/test-scan-config.ts`: `buildResponseParams()` (grok-4.3 Responses API, `x_search` tool, strict json_schema `{items:[{title,body,urls}]}`, `stream:true`), `TestScanStreamWriter` (stream→typed events), `encodeTestScanEvent()` (NDJSON); route shape + `runtime="nodejs"` + 180s in `app/api/test-scan/route.ts`. **Reproduce in `lib/scan/`, parameterizing the hardcoded `from_date`/`to_date` (`:317`) from the monitor's window.**
- **Draft validate/repair** — `app/api/draft/route.ts`: `getDraftIssue()` + `RAW_URL_RE` (`:23`) + `MARKDOWN_RE` (`:24`) + a single repair pass. **Reproduce in `lib/draft/` SIMPLER (one story → one draft, no batch reconciliation).** Replace `countTweetCharacters` with `twitter-text` `parseTweet().weightedLength`.
- **Callback handler** — `app/auth/confirm/route.ts`: `getSafeNextPath()` + server `createClient()` + `NextResponse.redirect`. **Mirror in `app/auth/callback/route.ts`** (use `exchangeCodeForSession` instead of `verifyOtp`).
- **Server client + session** — `lib/supabase/server.ts` `createClient()` (async, cookie-based) + `getUser()`; every new route follows the `app/api/draft/route.ts:193` auth-guard pattern.

## Tasks

### T0 — Posting verification spike  ·  *gates everything* · not parallel
**Prereqs (developer, §10):** X dev app (Web App/confidential), Supabase `X/Twitter (OAuth 2.0)` provider enabled w/ client id+secret, **Manual Linking enabled**, callback `https://<ref>.supabase.co/auth/v1/callback` registered, pay-per-use credits, env `X_CLIENT_ID/SECRET`.
**Build (throwaway):** minimal `linkIdentity({provider:'x',options:{scopes:'tweet.write'}})` trigger + a scratch `/auth/callback` that logs `provider_token`+`provider_refresh_token` + one `POST /2/tweets`.
**Acceptance:** link returns a session; callback reads BOTH tokens; granted scopes include `tweet.write`; one POST → HTTP 201 (a real tweet on your own account).
**Decision (D-C):** PASS → Supabase handshake as specced. FAIL → self-hosted PKCE for the handshake only (downstream identical). **Discard the scratch code.**

### T1 — Migration: 6 tables + RLS  ·  foundation · parallel with T0 prereqs
**Files:** `supabase/migrations/<ts>_slice1_loop_tables.sql` (apply via Supabase MCP `apply_migration`; then `generate_typescript_types` → `lib/types/`).
**Build:** `x_connections, monitors, scans, stories (trimmed), drafts, posts` per §4 (additive; no legacy collision). Owner RLS: direct `user_id=auth.uid()` (x_connections, monitors); transitive via `monitors.user_id` (scans/stories/drafts/posts). `monitors` collapses workflows+triggers (no schedule fields).
**Acceptance:** 10 tables total; RLS on all 6; a cross-user select returns 0 rows; `get_advisors` (security+perf) clean; legacy 4 untouched.
**Verify:** MCP `execute_sql` — insert a monitor as user A, confirm user B can't read it.

### TRACK A — Connect-X

### T2 — Connect X (handshake + capture + Settings)  ·  needs T1 · parallel with Track B
**Files:** BUILD `app/auth/callback/route.ts` (mirror `auth/confirm`: `exchangeCodeForSession(code)` → **immediately** read `session.provider_token`+`provider_refresh_token` → verify `tweet.write` granted → AES-encrypt → upsert `x_connections` → safe redirect to `next`). BUILD `lib/x/tokens.ts` (AES-256-GCM `encrypt`/`decrypt`, `saveConnection`). EXTEND `app/dashboard/settings/page.tsx:44` (replace "Coming soon" Card). BUILD `components/loop/connect-x.tsx` (client; `createClient().auth.linkIdentity`).
**Acceptance:** click Connect X → consent → Settings shows "Connected as @handle"; `x_connections` row with **encrypted** tokens + `tweet.write` in scopes; no token in any client payload/network response.
**Risk R3:** capture tokens *inside the callback* before `proxy.ts`'s next `getUser()` nulls `provider_token`. **R7:** `X_CLIENT_ID/SECRET` in BOTH Supabase config AND our env.

### T3 — Token refresh/rotation  ·  needs T2
**Files:** EXTEND `lib/x/tokens.ts` → `getFreshAccessToken(userId)`: decrypt; if `expires_at` past, `POST https://api.x.com/2/oauth2/token` (`grant_type=refresh_token`, Basic `client_id:client_secret`); **persist the rotated refresh token**; re-encrypt; return access token.
**Acceptance:** with an expired `expires_at`, a refresh yields a new access token AND a new stored refresh token. **Unit target** (throwaway script).

### T4 — `lib/x/client` + disconnect  ·  needs T3 · Track A converges
**Files:** BUILD `lib/x/client.ts` (`postTweet(token,text)`→201 `{id,url}`, parse RFC-7807 errors; `getMe(token)`→`{id,username}`). BUILD `app/api/x/disconnect/route.ts` (delete `x_connections` row; optional revoke). Wire disconnect button into the Settings block.
**Acceptance:** `getMe` returns your handle from a stored token; disconnect clears the row and the Settings UI.

### TRACK B — Monitor → Scan → Draft

### T5 — Monitor CRUD  ·  needs T1 · parallel with Track A
**Files:** REWRITE `app/dashboard/test/page.tsx` (list monitors) + `app/dashboard/test/new/page.tsx` (create form). BUILD `components/loop/monitor-form.tsx` (reproduce handle-chip UX + regex `^[A-Za-z0-9_]{1,15}$`; **no schedule fields**), a server action inserting `monitors`.
**Acceptance:** create a monitor → row in `monitors` → appears in the list; ≤20 handles enforced; RLS scopes it to you.

### T6 — Streaming scan + stories  ·  needs T1, T5
**Files:** BUILD `lib/scan/{client,request,stream,parse,prompt}.ts` (reproduce `buildResponseParams`/`TestScanStreamWriter`, **dates from `monitor.scan_from/scan_to`**, `prompt` adds "search posts, not profiles" + `include:['no_inline_citations']`; `parse` → story rows + `dedupe_key` from primary X url). BUILD `app/api/monitors/[id]/scan/route.ts` (NDJSON `ReadableStream`, `runtime="nodejs"`; capture cookie `createClient()` at entry; on completion insert `scans` + `stories`). BUILD `app/dashboard/test/[id]/page.tsx` **skeleton** + `components/loop/{scan-stream-view,story-list}.tsx` (source links; `react-tweet` removed 2026-05-29, embed parked).
**Acceptance:** Run Scan on a monitor → live reasoning/tool/cost stream → `scans` row + `stories` rows → stories render with title/summary + source links.
**Risk R1:** don't re-read cookies mid-stream. **R2:** verify a transitive-RLS insert works under the user session (fallback: service-role for writes + in-code `monitor.user_id===user.id`). **R8:** mind Vercel function timeout.

### T7 — Pick + draft + edit  ·  needs T1, T6
**Files:** BUILD `lib/draft/{prompt,validate,count}.ts` (`count` wraps `twitter-text`; `validate` = `getDraftIssue` logic: empty / >280 weighted / `RAW_URL_RE` / `MARKDOWN_RE`). BUILD `app/api/drafts/route.ts` (single story → single draft via grok-4.3 strict json; one repair pass; insert `drafts`). EXTEND `test/[id]/page.tsx` + BUILD `components/loop/draft-editor.tsx` (select a story → Generate → inline edit + live weighted count → persist text+status).
**Acceptance:** generate a draft for a story → `drafts` row ≤280 weighted, no URLs/markdown; edit it → persists, status `edited`, count updates live.

### CONVERGENCE

### T8 — Post to X  ·  needs T4 ∧ T7 ∧ T1 · CHECKPOINT 3
**Files:** BUILD `app/api/x/post/route.ts` (`getFreshAccessToken` → `postTweet`; 201 → insert `posts` + draft→`posted`; failure → draft→`failed` + readable error). EXTEND `test/[id]/page.tsx` + BUILD `components/loop/post-button.tsx`.
**Acceptance:** post an edited draft → real tweet on X → `posts` row with tweet id+url → UI shows "Posted ✓" + link; a forced failure shows a readable error and `failed` status.

### T9 — End-to-end walk on the deploy  ·  CHECKPOINT 4 (success)
Set Vercel env (`X_CLIENT_ID/SECRET`, `X_TOKEN_ENC_KEY`, `XAI_API_KEY`) + register the **prod** callback in Supabase + X. Walk §2 on the live deploy with your own X, then hand to the reporter for feedback. **This is the falsifiable success criterion.**

### T10 — Destructive legacy cleanup  ·  ASK-FIRST · only after T9
Delete `app/dashboard/workflows/*` + legacy components; migration to `DROP` the 4 legacy tables (~2.8k dev rows). **Explicit go-ahead required, never silent (§4.4/§9).**

## Phase checkpoints (human gates)
- **CP0** after T0 — OAuth path confirmed (no UI until the spike passes).
- **CP1** after T1 — schema + RLS reviewed before code reads/writes it.
- **CP2** after T2–T4 ∥ T5–T7 — Connect-X works AND scan→stories→draft→edit works, independently.
- **CP3** after T8 — a real tweet posts locally.
- **CP4** after T9 — real tweet on real account through the full loop + reporter feedback.

## Verification (end-to-end)
1. Per-task acceptance above (mostly manual + falsifiable).
2. **Throwaway script** `scripts/check-slice1.ts` (run via `tsx`, not committed): token refresh/rotation, `dedupe_key` builder, draft `validate`/weighted count.
3. `pnpm build` + `pnpm lint` green before each task lands; `ts-format` on touched `.ts/.tsx`.
4. The CP4 walk on the real deploy is the definitive proof.

## Risks (carry into build)
R1 capture supabase client at handler entry, never re-read cookies mid-stream · R2 confirm transitive RLS under user session (fallback service-role writes + in-code owner check) · R3 capture provider tokens inside callback before session refresh nulls them · R7 X creds in both Supabase + our env · R8 Vercel function timeout for streaming scan.
