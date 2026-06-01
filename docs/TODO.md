# Slice 1 — Manual Loop · TODO

> Checkbox companion to `docs/PLAN.md` (full detail) and `docs/SPEC.md` (source of truth).
> Order: **T0 → T1 → [Track A ∥ Track B] → T8 → T9 → T10.** Stop at each **CHECKPOINT** before proceeding.

## Current state — READ FIRST (2026-05-31)
**The manual loop works end-to-end locally and posts a real tweet.** Architecture
+ rationale: **`docs/decisions/0001-architecture.md`**.

- **Surface:** ONE ephemeral **Prompt-Lab** page at `/dashboard/test` (sidebar
  "Prompt lab"). Operator inputs (name, handles, scan user prompt, drafting
  instructions) are prefilled + editable; **system prompts live in code**
  (`lib/scan/prompt.ts`, `lib/draft/prompt.ts`). Flow: Run scan → pick one story →
  Generate draft → edit → **Post to X**. Nothing persists until you post
  (`/api/test/{scan,draft}` are ephemeral; `/api/test/post` writes the chain + fires
  the real tweet). Posting needs a connected X account (Settings → Connect X).
- **Done:** T0–T8 + CP3 (real tweet posts locally). Connect-X, token refresh/rotate,
  scan, draft, post all built + working.
- **The T5–T7 checkboxes below describe the ORIGINAL monitor-CRUD build** — that UI
  was **set aside** for the prompt-lab (kept in git). The *capabilities* (scan,
  draft, post under RLS) carried over into `lib/scan/*`, `lib/draft/*`, `lib/x/*`,
  `app/api/test/*`. Don't rebuild the monitor pages.
- **Next:** CP4 deploy walk (T9) + the Backlog section below. Deferred: Test→Monitor
  rename, legacy `workflow` purge (legacy is inert — no new file imports it).
- **Gotchas:** `ts-format` skill was removed (hand-format `.ts/.tsx`); agent-browser
  is **not** used for UI checks (developer verifies manually); env present in
  `.env`/`.env.local` (`X_CLIENT_ID/SECRET`, `X_TOKEN_ENC_KEY`, `XAI_API_KEY`);
  throwaway `scripts/check-slice1.ts` (run via `tsx`, uncommitted) covers the unit logic.

## Phase 0 — De-risk
- [x] **T0 — Posting spike** *(gates everything; not parallel)*
  - [x] Developer prereqs: X dev app (Web App/confidential); Supabase "X (OAuth 2.0)" provider + client id/secret; **Manual Linking ON**; Supabase callback registered on X; pay-per-use credits; env `X_CLIENT_ID` / `X_CLIENT_SECRET`
  - [x] Scratch `linkIdentity({provider:'x',scopes:'tweet.write'})` + scratch `/auth/callback` logging both tokens + one `POST /2/tweets`
  - [x] Acceptance: both tokens captured · `tweet.write` granted · HTTP 201 — real tweet id `2060362327749447780` on @farzanmrz, refresh_token captured (2026-05-29)
  - [x] Decide **D-C**: **PASS → Supabase path** (no PKCE fallback)
  - [x] Discard scratch code (`app/dashboard/spike/` + `app/auth/spike-callback/` deleted)
- [x] **CHECKPOINT 0** — OAuth path confirmed ✅

## Phase 1 — Foundation
- [x] **T1 — Migration: 6 tables + RLS**
  - [x] `x_connections, monitors, scans, stories (trimmed), drafts, posts` — additive, owner-scoped RLS (`supabase/migrations/20260529141319_slice1_loop_tables.sql`)
  - [x] `generate_typescript_types` → `lib/types/database.ts` (+ `lib/types/index.ts` friendly aliases)
  - [x] Acceptance: cross-user RLS probe `owner_sees=1 other_sees=0` · advisors clean (only expected empty-table unused_index INFO + pre-existing auth WARN) · legacy 4 untouched · 10 tables total
- [x] **CHECKPOINT 1** — schema + RLS verified ✅ *(cross-user deny + advisors; open for your review)*

## Phase 2 — Track A (Connect-X) ∥ Track B (Monitor→Scan→Draft)
### Track A — Connect-X
- [x] **T2** — Connect X: built `app/auth/callback/route.ts` (exchange → capture provider tokens R3 → /2/users/me → AES-encrypt → upsert x_connections → redirect) + `lib/x/tokens.ts` (AES-256-GCM encrypt/decrypt + saveConnection) + Settings now server-rendered (reads only x_username, no tokens to client) + `components/loop/connect-x.tsx` (unlink-stale-then-linkIdentity) + extracted `sign-out-button.tsx`. AES roundtrip ✅ (throwaway tsx); Settings renders Connect X (browser, boundary). **Live connect (real OAuth + x_connections write) is yours to run** — needs `X_TOKEN_ENC_KEY` in `.env.local`. *(needs T1; risks R3, R7)*
- [x] **T3** — Token refresh/rotation in `lib/x/tokens.ts`: `getFreshAccessToken(supabase, userId)` — reuse if fresh, else POST api.x.com/2/oauth2/token (Basic client creds), persist the rotated refresh token + new expiry (re-encrypted). Throwaway tsx unit tests ✅ (expired → new access + rotated refresh stored + future expiry; fresh → reused, no network, no update). *(needs T2; unit target)*
- [x] **T4** — built `lib/x/client.ts` (`postTweet`→201 {id,url} + RFC-7807 error parse; `getMe`→{id,username}) + `app/api/x/disconnect/route.ts` (delete x_connections row; revoke skipped/optional) + `components/loop/disconnect-x-button.tsx` wired into Settings. Disconnect verified end-to-end via seeded probe row (route 200 {ok:true} → row gone → Settings flips to Connect X). getMe/postTweet built per the proven spike calls; live-verified at CP2/CP3. *(needs T3)*
### Track B — Monitor → Scan → Draft
- [x] **T5** — Monitor CRUD: rewrote `test/page.tsx` (list) + `test/new/page.tsx` (create) + built `components/loop/monitor-form.tsx` (fresh handle-chip UX) + `lib/scan/handles.ts` + `test/new/actions.ts` (server action, server-side redirect). Browser-verified 6/6 (login, fields, chip add/validate/remove, create→list under RLS). *(needs T1)*
- [x] **T6** — Streaming scan: built `lib/scan/{client,prompt,request,stream,parse}.ts` (reproduced test-scan, parameterized window/handles, +`no_inline_citations`/"search posts" steer) + `app/api/monitors/[id]/scan/route.ts` (NDJSON stream, R1 client-at-entry, scans+stories on completion, persist-then-signal) + `test/[id]/page.tsx` + `scan-stream-view` + `story-list` (source links — react-tweet removed 2026-05-29 after a server-render crash; embed parked §9). R2 transitive-write probe ✅ (a=1/1, b=0/0); detail page browser-verified up to boundary (Run scan NOT triggered — real paid scan deferred to CP2). *(needs T1, T5; risks R1, R2, R8)*
- [x] **T7** — Pick + draft + edit: built `lib/draft/{count,validate,prompt}.ts` (twitter-text weighted count; getDraftIssue: empty/>280 weighted/RAW_URL/MARKDOWN) + `app/api/drafts/route.ts` (grok-4.3 strict json {text}, one repair pass, insert under RLS) + `components/loop/draft-editor.tsx` (Generate → inline edit + live weighted count → saveDraft action, status edited) wired into `test/[id]`. Throwaway tsx checks (count/validate/dedupe) 11/11 ✅; R2 drafts probe ✅ (a=1 edited, b=0). Live generate→edit deferred to CP2. *(needs T6)*
- [x] **CHECKPOINT 2** — Connect-X works AND scan→draft→edit works ✅ (validated live on the prompt-lab during the 2026-05-31 walk)

## Phase 3 — Convergence
- [x] **T8 — Post to X**: built as `app/api/test/post/route.ts` (validate → persist `monitor→scan→story→draft` chain → `getFreshAccessToken` → `postTweet` → record `posts`) + Post button in `components/loop/prompt-lab.tsx`. *(intent of the original `app/api/x/post` task, via the prompt-lab surface)*
- [x] **CHECKPOINT 3** — a real tweet posts locally ✅ (developer confirmed via the prompt-lab Post button, 2026-05-31)

## Phase 4 — Validate
- [ ] **T9 — End-to-end walk on deploy** (Vercel env + prod callback in Supabase & X; own X; reporter feedback)
- [ ] **CHECKPOINT 4** — real tweet via the full loop + reporter feedback *(= SUCCESS)*

## Phase 5 — Cleanup *(ASK-FIRST)*
- [ ] **T10 — Destructive legacy cleanup**: delete `workflows/*` + `DROP` the 4 legacy tables (~2.8k dev rows) — explicit go-ahead only
- [ ] **Test → Monitor rename** (routes/files/sidebar/docs) — deferred cosmetic pass (ADR-0001 D6)

## Backlog — deferred, not built *(see `docs/decisions/0001-architecture.md`)*
- [ ] Tweet-deletion → DB sync (reconcile `posts` when a tweet is deleted on X)
- [ ] Save/persist a lab run ("agent") to the DB as a reusable config
- [ ] Edit a posted tweet or a saved draft / scan instructions; re-run saved configs
- [ ] X reconnect-on-logout UX (smooth the per-user `x_connections` reconnect)
- [ ] Broader UI polish (parked for slice 1 — correct-not-pretty)

## Cross-cutting (every task)
- [ ] `pnpm build` + `pnpm lint` green · hand-format `.ts/.tsx` to conventions (the `ts-format` skill was removed)
- [ ] Honor §9 boundaries: encrypt tokens always · ask-first on destructive drops / new deps / test runner
