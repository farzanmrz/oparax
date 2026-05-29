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
- [ ] **T2** — Connect X: `app/auth/callback/route.ts` + `lib/x/tokens.ts` (AES) + Settings block + `components/loop/connect-x.tsx` *(needs T1; risks R3, R7)*
- [ ] **T3** — Token refresh/rotation in `lib/x/tokens.ts` *(needs T2; unit target)*
- [ ] **T4** — `lib/x/client.ts` (`postTweet`/`getMe`) + `app/api/x/disconnect/route.ts` *(needs T3)*
### Track B — Monitor → Scan → Draft
- [x] **T5** — Monitor CRUD: rewrote `test/page.tsx` (list) + `test/new/page.tsx` (create) + built `components/loop/monitor-form.tsx` (fresh handle-chip UX) + `lib/scan/handles.ts` + `test/new/actions.ts` (server action, server-side redirect). Browser-verified 6/6 (login, fields, chip add/validate/remove, create→list under RLS). *(needs T1)*
- [ ] **T6** — Streaming scan: `lib/scan/*` + `app/api/monitors/[id]/scan/route.ts` + `test/[id]` skeleton + `scan-stream-view` + `story-list` *(needs T1, T5; risks R1, R2, R8)*
- [ ] **T7** — Pick + draft + edit: `lib/draft/*` + `app/api/drafts/route.ts` + `draft-editor` *(needs T6)*
- [ ] **CHECKPOINT 2** — both tracks work independently

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
