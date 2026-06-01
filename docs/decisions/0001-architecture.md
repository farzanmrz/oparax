# ADR-0001: Oparax architecture (project baseline)

## Status
Accepted

## Date
2026-05-31

## Context
**Oparax is an AI social-media automation tool for professional news reporters.**
It watches X (Twitter) for breaking stories and drafts posts in the reporter's
voice. The driving user is a football news reporter with 400k+ followers; the
developer validates first by posting to their **own** X account.

The foundational constraint is that **there is no ground truth yet** — a model's
"good draft" is unfalsifiable until a real reporter reacts to a real post. So the
whole project is **plumbing-first, correct-not-pretty, speed-to-reporter**: build
the thinnest real end-to-end loop, get a real tweet out, and iterate on signal
rather than on imagined quality.

This ADR is the **project-wide architecture record** — the decisions a new
contributor (human or agent) needs to not re-litigate. It is broader than any one
slice; "Slice 1 — the manual loop" is the current baseline it describes. When a
decision later changes, supersede it with a new ADR rather than editing this one.

## Decisions

### D1 — Stack
Next.js (App Router) + TypeScript (strict, `@/*` alias), deployed on **Vercel**.
**Supabase** for Auth + Postgres (with Row-Level Security). **Grok / xAI** for the
AI, accessed through the **`openai` SDK** pointed at `https://api.x.ai/v1`. Package
manager **pnpm**. UI = **shadcn** primitives + Tailwind. No test runner (verification
is plumbing-first; see D10).

### D2 — Auth model: email login, X linked for posting (not SSO)
Email/password is the **login** (Supabase Auth). X is **linked** to an
already-authenticated user via `linkIdentity({ provider: 'x' })` purely to enable
**posting** — it is *not* a sign-in method. Connect-X lives in a minimal
Settings → Connections block.

### D3 — X token lifecycle: Supabase handshake, app owns the tokens
Supabase runs the OAuth consent but **returns provider tokens once in the callback
and never refreshes them**. So `app/auth/callback/route.ts` captures
`provider_token` + `provider_refresh_token` immediately, and the app owns the rest:
store **encrypted (AES-256-GCM, `node:crypto`, key from `X_TOKEN_ENC_KEY`)** in
`x_connections`; `lib/x/tokens.ts` self-refreshes against `api.x.com/2/oauth2/token`
and **persists the rotated refresh token**. Tokens never reach the browser. A T0
spike proved a Supabase-issued `'x'` token can post (HTTP 201), so no self-hosted
PKCE was needed (it remains the documented fallback).

### D4 — Data model: 6 owner-scoped loop tables (additive)
`x_connections, monitors, scans, stories, drafts, posts` (migration
`supabase/migrations/20260529141319_slice1_loop_tables.sql`). RLS is owner-scoped:
direct (`user_id = auth.uid()`) on `x_connections`/`monitors`, transitive for the
rest (`post → draft → story → scan → monitor → user`). Generated types in
`lib/types/`. Added **alongside** the legacy 4 tables (no collisions).

### D5 — AI: Grok `x_search` scan → Grok draft, system prompts in code
**Scan** = Grok Responses API with the `x_search` tool, streamed (NDJSON), strict
`json_schema` of `{title, body, urls}` items (`lib/scan/*`). **Draft** = Grok with
a strict `{text}` schema + one validation/repair pass (`lib/draft/*`). **System
prompts live in code** (`lib/scan/prompt.ts`, `lib/draft/prompt.ts`) — the
engineer's knob. Cost is read from xAI's reported `cost_in_usd_ticks` (÷1e10), not
computed client-side.

### D6 — Surface: a single ephemeral Prompt-Lab page
The loop surface is one page at **`/dashboard/test`** (sidebar "Prompt lab"). It
exposes **only operator inputs** — prefilled, editable: run name, handles, scan
**user** prompt, drafting instructions. Run scan → pick one story → generate one
draft → edit (live weighted count) → post. It is **ephemeral**: scan/draft routes
(`/api/test/{scan,draft}`) persist nothing; **only `/api/test/post` writes**, and
only when a real tweet is sent (it persists the minimal `monitor→scan→story→draft→
post` chain at that moment to satisfy the FKs + RLS). The earlier per-monitor CRUD
(create/list/detail) was **set aside in git**, not the product direction.

### D7 — Char counting via `twitter-text`
Drafts are validated to **280 weighted** chars (emoji/CJK = 2, URLs = 23) with
`twitter-text` `parseTweet().weightedLength`, matching X's server enforcement. The
one approved added dependency. **No `zod`** — request bodies are validated with
`typeof` checks.

### D8 — `react-tweet` removed; rich tweet embed deferred
Its server-rendered `<Tweet>` threw `entities is not iterable` and crashed the
scan page. Removed entirely; sources render as plain links; a neater embed is
deferred.

### D9 — Legacy `workflow` code is inert; rename + purge deferred
Legacy `workflows/*` pages, `lib/{workflow-*,prompts,xai,scan-constraints,
test-scan-config}.ts`, and old components are a **self-contained island** —
grep-confirmed no new loop file imports any of it. It is harmless dead weight. The
`Test → Monitor` rename and deletion of legacy code are **deferred**; the **4
legacy tables (~2.8k dev rows) are left intact** (their DROP is a separate,
irreversible, explicit-go-ahead step).

### D10 — Verification: plumbing-first + falsifiable
Build + lint stay green per change. Correctness-critical logic (weighted count,
draft validation, `dedupe_key`, AES round-trip, token refresh/rotation) is covered
by a **throwaway `scripts/check-slice1.ts`** run via `tsx` (not committed, no test
runner). RLS is checked with live cross-user SQL probes. **The real post is the
definitive proof.**

## Alternatives Considered (key forks)
- **Surface:** per-monitor CRUD (heavier, auto-drafted per story before prompts
  were locked) vs. pure-ephemeral (can't post — FK chain needs persistence) vs.
  **chosen** ephemeral-with-persist-on-post.
- **Prompt location:** all-on-page (clutters; conflates engineer vs operator) vs.
  all-in-code (operator can't steer) vs. **chosen** system-in-code / user-on-page.
- **X auth:** self-hosted PKCE (fallback, unused after the spike passed) vs.
  Supabase-managed tokens (impossible — not persisted) vs. **chosen** Supabase
  handshake + app-owned encrypted lifecycle.
- **Token encryption:** Supabase Vault vs. **chosen** app-layer AES (no extra infra).
- **Char counting:** code-point count (undercounts) vs. **chosen** weighted.

## Consequences
- Iterating prompts is fast and cheap — tune all day for the cost of scans; nothing
  persists until a real post.
- Posting requires a connected X account; otherwise `/api/test/post` returns
  "Connect your X account in Settings first."
- RLS integrity holds via the minimal-chain-at-post pattern, no migration needed.
- Legacy debt + the Test→Monitor rename are acknowledged and parked.
- **Tooling note:** the repo's `ts-format` skill was removed mid-build; `.ts/.tsx`
  are hand-formatted to the project's comment/import conventions until restored.
- **Process note (project-specific):** the developer iterates fast and can
  over-refine; keep work anchored to the falsifiable milestone (a real post +
  reporter signal). UI verification currently does **not** use agent-browser (the
  developer checks the UI manually).

## Current status (2026-05-31)
The manual loop **works end-to-end locally**: scan → pick story → draft → edit →
**post a real tweet** (CP3 achieved). Not yet done: the deploy walk (CP4) and the
backlog below.

## Future backlog (deferred — not built)
1. **Tweet-deletion → DB sync** — reconcile `posts` when a tweet is deleted on X
   (no push from X; implies polling or manual re-check).
2. **Save/persist a run ("agent")** to the DB as a reusable config (the monitor
   concept, set aside in D6).
3. **Edit a posted tweet or a saved draft / scan instructions**; re-run saved configs.
4. **X reconnect-on-logout UX** — smooth the per-user `x_connections` reconnect.
5. **Broader UI polish** — parked for slice 1.

## References
- `docs/SPEC.md` (source of truth) · `docs/PLAN.md` · `docs/TODO.md`
- Code: `app/dashboard/test/`, `app/api/test/{scan,draft,post}/`, `app/auth/callback/`,
  `lib/scan/*`, `lib/draft/*`, `lib/x/*`, `lib/types/`
