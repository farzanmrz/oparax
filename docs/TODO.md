# Slice 1 — Manual Loop · TODO

> Checkbox companion to `docs/PLAN.md` (full detail) and `docs/SPEC.md` (source of truth).
> Order: **T0 → T1 → [Track A ∥ Track B] → T8 → T9 → T10.** Stop at each **CHECKPOINT** before proceeding.

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
- [x] **T6** — Streaming scan: built `lib/scan/{client,prompt,request,stream,parse}.ts` (reproduced test-scan, parameterized window/handles, +`no_inline_citations`/"search posts" steer) + `app/api/monitors/[id]/scan/route.ts` (NDJSON stream, R1 client-at-entry, scans+stories on completion, persist-then-signal) + `test/[id]/page.tsx` + `scan-stream-view` + `story-list` (react-tweet). R2 transitive-write probe ✅ (a=1/1, b=0/0); detail page browser-verified up to boundary (Run scan NOT triggered — real paid scan deferred to CP2). *(needs T1, T5; risks R1, R2, R8)*
- [x] **T7** — Pick + draft + edit: built `lib/draft/{count,validate,prompt}.ts` (twitter-text weighted count; getDraftIssue: empty/>280 weighted/RAW_URL/MARKDOWN) + `app/api/drafts/route.ts` (grok-4.3 strict json {text}, one repair pass, insert under RLS) + `components/loop/draft-editor.tsx` (Generate → inline edit + live weighted count → saveDraft action, status edited) wired into `test/[id]`. Throwaway tsx checks (count/validate/dedupe) 11/11 ✅; R2 drafts probe ✅ (a=1 edited, b=0). Live generate→edit deferred to CP2. *(needs T6)*
- [ ] **CHECKPOINT 2** — both tracks work independently *(Track B ✅ T5–T7; awaiting Track A T2–T4)*

## Phase 3 — Convergence
- [ ] **T8 — Post to X**: `app/api/x/post/route.ts` + `post-button` *(needs T4 ∧ T7 ∧ T1)*
- [ ] **CHECKPOINT 3** — a real tweet posts locally

## Phase 4 — Validate
- [ ] **T9 — End-to-end walk on deploy** (Vercel env + prod callback in Supabase & X; own X; reporter feedback)
- [ ] **CHECKPOINT 4** — real tweet via the full loop + reporter feedback *(= SUCCESS)*

## Phase 5 — Cleanup *(ASK-FIRST)*
- [ ] **T10 — Destructive legacy cleanup**: delete `workflows/*` + `DROP` the 4 legacy tables (~2.8k dev rows) — explicit go-ahead only

## Cross-cutting (every task)
- [ ] `pnpm build` + `pnpm lint` green · run `ts-format` on touched `.ts/.tsx`
- [ ] Honor §9 boundaries: encrypt tokens always · ask-first on destructive drops / new deps / test runner
