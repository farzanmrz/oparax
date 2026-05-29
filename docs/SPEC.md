# SPEC — Oparax Slice 1: The Manual Loop

> Status: **APPROVED (v3.1)** — plan approved 2026-05-29; building per `docs/PLAN.md` + `docs/TODO.md`. (v3.1 = `stories` trimmed to scan output; `twitter-text` added as an approved dep; `zod` not used.)
> Author flow: `interview-me` (intent) → `spec` (this doc) → `plan` → `build`.
> External contracts grounded against live sources on **2026-05-29**
> (xai-docs MCP, x-docs MCP, Supabase MCP project `pcgvpypzfwuchyfwdlwe`, Supabase + X docs via web, codebase read).
> When in doubt, the live doc/DB is the source of truth, not this snapshot.

---

## 1. Objective

Build **one working manual loop, deployed**, real enough that a reporter can run it and give feedback:

> **Connect X → trigger scan → see separated unique news stories → pick one → draft a tweet → edit the draft → post a real tweet.**

| Field | Value |
|---|---|
| **Outcome** | The manual loop above, end-to-end, on a real deployment. |
| **User** | Built *for* a pro football news reporter (400k followers). Validated *first* by the developer posting to their **own** X account. |
| **Why now** | No ground truth exists. Self-refining AI output is unfalsifiable; only a real user's feedback is signal. Plumbing is the fastest path to that signal. |
| **Success (falsifiable)** | A real tweet lands on a real X account *through the loop*, and the reporter gives feedback. It posts or it doesn't. |
| **Binding constraint** | **Speed-to-reporter with zero throwaway work.** Use the platform-native path (Supabase) for the OAuth handshake; do everything else by hand for user #1; touch only the tables the loop reads/writes; **correct-not-pretty.** |

### Confirmed scope decisions (interview + forks, 2026-05-29)
1. **Surface:** `app/dashboard/test/*` is the **keeper** — a clean-slate rewrite of the older `workflows/*`. The old `workflows/*` pages **and** their 4 tables are retired **after** the new loop is validated (final explicit step; §4.4).
2. **Persistence:** **Full `drafts` + `posts`** tables (not ephemeral).
3. **Posting:** **Real**, via X API. Developer connects their **own** X account first to validate.
4. **X auth model:** Email/password remains the **login**. X is **linked** to the already-authenticated user (Supabase `linkIdentity`, provider `'x'`) **to enable posting** — *not* a sign-in/SSO method. The Connect-X affordance lives in a **minimal Settings → Connections** block (the existing "coming soon" placeholder made live). Full settings buildout stays parked.
5. **No first-party code reuse:** every file the loop touches is built **fresh in its own namespace** (`lib/scan/`, `lib/draft/`, `lib/x/`, `lib/types/`, a new components dir). Legacy domain code is **left untouched** and retired in §4.4. The *only* reused first-party code is **shared infra** — `lib/supabase/{server,client,middleware}.ts` + `proxy.ts` (the kept auth depends on them). npm packages are used as-is. The working **auth flow** (`app/login|signup|auth|forgot-password`, `lib/validation.ts`, `lib/auth-errors.ts`) is left alone. *New ≠ gold-plated: fresh files still obey correct-not-pretty.*

---

## 2. The loop — acceptance criteria

Each step is falsifiable. Slice 1 is "done" when every box can be checked by hand on the deployment.

| # | Step | Acceptance criteria |
|---|---|---|
| 1 | **Connect X** | From **Settings → Connections**, user clicks Connect X → Supabase `linkIdentity({provider:'x'})` consent → returns connected. The connected `@handle` is shown; Disconnect works. The X **refresh token** is captured in the callback and stored encrypted server-side (never sent to the browser). |
| 2 | **Create a monitor** | User creates a monitor: name, monitoring description, monitored handles (≤20), drafting instructions, example tweets, scan date window. Persists and opens its detail page. |
| 3 | **Trigger scan** | On the monitor detail page, Scan runs a Grok `x_search` (streaming progress visible — reasoning/tool-call/cost events, via a **new** streaming scan endpoint + display). On completion a `scans` row is stored. |
| 4 | **See separated stories** | The scan's distinct stories are stored as `stories` rows and listed (title, summary, source links). *(Rich tweet embedding via `react-tweet` was removed 2026-05-29 — server-render `entities is not iterable` crash; plain source links for now, neater embed parked in §9.)* |
| 5 | **Pick + draft** | User selects one story → generates a draft via a **new** draft endpoint (≤280 weighted chars, no raw URLs, no markdown — new validation/repair step). Persists as a `drafts` row. |
| 6 | **Edit draft** | User edits the draft text inline; live weighted char count (`twitter-text` weighting: emoji/CJK = 2, URLs = 23). Edited text persists; status → `edited`. |
| 7 | **Post** | Post button → ensure access token fresh (refresh if expired) → `POST /2/tweets` → on HTTP 201 a `posts` row stores the returned tweet id + URL; details page shows it posted. Failures surface a readable error; draft → `failed`. |

### 2.5 User flow (screen by screen)
**Bold = new/extended work; rest exists.**

| # | Screen | What the user does |
|---|---|---|
| A | **Login** (exists) | Sign up / log in with **email + password** → dashboard. X is *not* a login method. |
| B | **Settings → Connections** (extend) | Sees **Connect X** (existing "coming soon" placeholder made live). Clicks → X consent → back to Settings showing **"Connected as @handle · Disconnect."** Only "settings" work in scope — one connections block, not the full page. |
| C | **`/dashboard/test/new`** (extend) | Create a monitor (name, what to monitor, handles, drafting instructions, example tweets, scan window) → saves → routes to its detail page. |
| D–G | **`/dashboard/test/[id]`** (build — your item #9 details page) | **Run scan** (streaming) → **stories list** → click a story → **Generate draft** → **edit inline** (live char count) → **Post to X** → **"Posted ✓"** + link to the live tweet. Also shows this monitor's past scans + posted tweets. |

Sidebar nav: Login → Dashboard (`test/` list) → Settings (Connect X) and Monitor detail (`test/[id]`) are the only surfaces touched.

---

## 3. External integrations (grounded contracts)

### 3.1 X auth + posting — Supabase does the handshake, **we** own the token lifecycle
Sources: Supabase Auth docs (social-login, identity-linking), GoTrue `x.go`, x-docs MCP. The single most important fact: **Supabase returns the X tokens once in the callback and never stores or refreshes them** — so the consent flow is Supabase's, but the token lifecycle is ours.

**(a) Connect (Supabase-managed handshake)**
- Provider key is **`'x'`** (OAuth 2.0). **Not** `'twitter'` (legacy OAuth 1.0a, deprecated).
- Connect path: `supabase.auth.linkIdentity({ provider: 'x', options: { scopes: 'tweet.write', redirectTo: '<app>/auth/callback?next=/dashboard/settings' } })`.
  - **Manual Linking must be enabled** in the project's Auth config (`GOTRUE_SECURITY_MANUAL_LINKING_ENABLED`).
  - The `'x'` provider already requests `users.email tweet.read users.read offline.access` by default and **appends** what you pass, so you only add **`tweet.write`**.
  - **Gotcha:** GoTrue splits `scopes` on **commas**, not spaces. Pass a single scope (`'tweet.write'`); if ever multiple, comma-separate.
- Supabase performs PKCE + the redirect to `https://x.com/i/oauth2/authorize` and back to **its own** callback `https://<project-ref>.supabase.co/auth/v1/callback`, then to our `redirectTo`.

**(b) Token lifecycle (we own — Supabase will not keep these alive)**
- In our `app/auth/callback/route.ts`: after `exchangeCodeForSession(code)`, **immediately** read `session.provider_token` (access) and **`session.provider_refresh_token`** — Supabase nulls `provider_token` on its next session refresh, so capture-or-lose.
- Store in our own `x_connections` table (§4.1), **encrypted** (Supabase Vault recommended).
- Refresh ourselves when the ~2h access token expires: `POST https://api.x.com/2/oauth2/token` (`application/x-www-form-urlencoded`) with `grant_type=refresh_token`, `refresh_token`, and **confidential-client** `Authorization: Basic base64(client_id:client_secret)`. **Refresh tokens rotate — persist the new one each time.**

**(c) Post a tweet** — `POST https://api.x.com/2/tweets`
- Header `Authorization: Bearer <provider access token>`, `Content-Type: application/json`. Body `{ "text": "..." }`. Success **201**: `{ "data": { "id", "text" } }`.
- Errors: RFC-7807 `{ "errors": [{ "type","title","status","detail" }] }`; 429 carries `x-rate-limit-*`.
- Self-serve limits to respect: no programmatic quote-posts/likes/follows (Enterprise only); unsolicited replies rejected; ≤1 cashtag.

**(d) Identity** — `GET https://api.x.com/2/users/me` (user context) → `data.id`, `data.username` (shown as the connected handle).

**(e) Char limit + cost**
- **280 weighted** (Latin = 1; emoji/CJK = 2; any URL = 23). Validate client-side with `twitter-text` `parseTweet().weightedLength`. X enforces server-side.
- **$0.015 / text post**; **$0.20 / post with a URL (13×)** → our draft validation strips raw URLs, keeping us at $0.015. `GET /2/users/me` ≈ $0.010. Rate: 100 posts/15 min per user. No free posting tier — provision credits.

**(f) Verification gate (see §12):** No authoritative proof yet exists that posting works end-to-end through a Supabase-`'x'`-issued token, and there's a live SSO-path bug. **First build task is a spike** to prove it; documented fallback is a fully self-hosted X OAuth 2.0 PKCE flow (same `api.x.com` endpoints) — our token table + refresh + post code is identical either way, so the fallback costs only the handshake, nothing downstream.

### 3.2 Grok — `x_search` scan
Source: xai-docs MCP. Client = a **new** Grok wrapper in `lib/scan/` (wraps the `openai` SDK @ `https://api.x.ai/v1`, `XAI_API_KEY`) — *not* the legacy `lib/xai.ts`.

- **Endpoint:** Responses API `POST /v1/responses`. Model `grok-4.3`.
- **Tool:** `{ "type": "x_search", "allowed_x_handles": [...≤20], "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD" }`. `allowed_x_handles`/`excluded_x_handles` mutually exclusive.
- **Sub-tool control:** model-driven. No param blocks `x_user_search`; steer via one prompt line ("search posts, not profiles").
- **Citations:** `include: ["no_inline_citations"]`; sources in `response.citations`.
- **Streaming:** `stream: true` (deferred not available on Responses API).
- **Cost:** $5 / 1,000 `x_search` calls + tokens ($1.25/1M in, $2.50/1M out).
- **Date precision — PARKED EXPLORATION (not impossible):** the explicit `from_date`/`to_date` *params* are date-granularity only. Finer time-window control by **prompt-steering the sub-tools** is a real lever (developer-observed) but unverified here — deferred, not dropped.

---

## 4. Data model — 6 new clean tables

Rule: **one table per loop concern, correct types, RLS owner-scoped, nothing speculative.** Created **additively** alongside the legacy 4 tables (no name collisions). New migration: `supabase/migrations/<ts>_slice1_loop_tables.sql`.

### 4.1 `x_connections` — the X token lifecycle Supabase won't manage (SENSITIVE)
The linked X *identity* lives in Supabase `auth.identities`; **this table exists only because Supabase does not persist/refresh provider tokens.** It holds what we must keep to post later.
| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | uuid PK | no | `gen_random_uuid()` |
| `user_id` | uuid | no | FK → `auth.users.id`; **UNIQUE** (one X account per user, slice 1) |
| `x_user_id` | text | no | from `/2/users/me` `data.id` |
| `x_username` | text | no | display handle |
| `access_token` | text | no | **encrypted at rest**; cached provider access token |
| `refresh_token` | text | no | **encrypted**; rotates on every refresh — persist newest |
| `scopes` | text[] | no | granted scopes (verify `tweet.write` present after link) |
| `expires_at` | timestamptz | no | access-token expiry (~now + 2h) |
| `created_at` / `updated_at` | timestamptz | no | `now()` |
RLS: owner-only, `user_id = auth.uid()`.

### 4.2 `monitors` — the configured scanner (collapses old `workflows`+`triggers`)
`id` uuid PK · `user_id` uuid FK→`auth.users` · `name` text · `monitoring_description` text · `monitored_handles` text[] default `'{}'` (≤20, `HANDLE_RE`) · `drafting_instructions` text default `''` · `example_tweets` text[] default `'{}'` · `scan_from`/`scan_to` date null · `status` text default `'active'` CHECK in (`active`,`paused`) · `created_at`/`updated_at` tstz. RLS owner-only.

### 4.3 `scans`, `stories`, `drafts`, `posts`
- **`scans`**: `id` PK · `monitor_id` FK→monitors · `status` text CHECK(`running`,`completed`,`failed`) default `running` · `started_at` tstz · `completed_at` tstz null · `cost_usd` numeric null · `x_search_count` int null · `story_count` int null · `raw_output` jsonb null · `error_message` text null.
- **`stories`** *(trimmed to the scan's `{title, body→summary, urls→source_urls}` output)*: `id` PK · `scan_id` FK→scans · `monitor_id` FK→monitors · `title` text · `summary` text · `source_urls` text[] default `'{}'` · `primary_tweet_url` text default `''` *(first X url)* · `dedupe_key` text · `created_at` tstz. Unique `(scan_id, dedupe_key)`. *Dropped speculative `evidence_points`/`supporting_tweet_urls`/`source_handles`/`published_at` — add later only if a future scan schema populates them. Cross-scan aggregation parked.*
- **`drafts`**: `id` PK · **`story_id`** FK→`stories.id` *(renamed from `scan_item_id` for table-name consistency — judgment call #2)* · `text` text · `status` text CHECK(`draft`,`edited`,`posted`,`failed`) default `draft` · `created_at`/`updated_at` tstz.
- **`posts`**: `id` PK · `draft_id` FK→drafts · `x_tweet_id` text · `x_tweet_url` text · `posted_at` tstz · `status` text default `posted` · `error_message` text null.

RLS on all four: owner-only, transitively via `monitors.user_id = auth.uid()`.

### 4.4 Legacy retirement (final, explicit, destructive)
- During slice 1: legacy `workflows`/`triggers`/`scan_runs`/`scan_items` tables and `app/dashboard/workflows/*` pages are **left untouched**.
- **Only after** the new loop is validated end-to-end: a final task deletes the `workflows/*` pages and a separate migration `DROP`s the 4 legacy tables (~2.8k dev rows). **This DROP requires explicit go-ahead at that time — never silent.**

---

## 5. Project structure — files to add / change

**Rule (scope decision #5): all loop first-party code is built fresh in its own namespace.** Legacy files are left untouched (retired in §4.4); only shared infra + npm deps are reused.

```
app/
  auth/callback/route.ts            # BUILD — OAuth code exchange + capture provider_refresh_token → x_connections
  api/
    monitors/[id]/scan/route.ts     # BUILD — new streaming x_search scan; persists scan + stories
    drafts/route.ts                 # BUILD — generate a draft for a story (NEW; not the old /api/draft)
    x/post/route.ts                 # BUILD — refresh-if-needed + POST /2/tweets; write posts row
    x/disconnect/route.ts           # BUILD — revoke + delete x_connections row
  dashboard/
    settings/page.tsx               # EXTEND — make "Connect X" live (linkIdentity) + handle + disconnect
    test/page.tsx                   # REWRITE — list monitors (new code + new tables)
    test/new/page.tsx               # REWRITE — create monitor + run streaming scan
    test/[id]/page.tsx              # BUILD — details: stories + draft + edit + POST + posted tweets
lib/                                # all BUILD-NEW except supabase/*
  scan/                             # BUILD — Grok wrapper, x_search request builder + handle constraints, result→stories parser, scan prompt
  draft/                            # BUILD — draft generation + prompt, validation/repair, twitter-text weighted counting
  x/                                # BUILD — tokens.ts (capture/refresh/rotate), client.ts (postTweet, getMe)
  types/                            # BUILD — new loop types (monitor, scan, story, draft, post)
  supabase/{server,client,middleware}.ts   # REUSE — shared SSR infra (kept auth depends on these)
components/
  <loop dir>/                       # BUILD — monitor form, story list, draft editor, connect-X, post button, scan-stream view
  ui/                               # REUSE — shadcn primitives
proxy.ts                            # REUSE — shared Supabase session refresh
supabase/migrations/
  <ts>_slice1_loop_tables.sql       # BUILD — the 6 tables + RLS
```
**Left to rot (untouched, retired in §4.4):** `lib/xai.ts`, `lib/workflow-drafting.ts`, `lib/scan-constraints.ts`, `lib/prompts.ts`, `app/api/scan`, `app/api/draft`, old components (`knowledge-bank-panel`, `draft-preview-panel`, `draft-profile-editor`, `scan-result`, `stored-scan-output`, `workflow-*`), `app/dashboard/workflows/*`.
**Left alone (kept auth, not loop code):** `app/login|signup|auth|forgot-password`, `lib/validation.ts`, `lib/auth-errors.ts`.
**Reused as-is:** npm deps (`openai`, `@supabase/*`), shadcn `components/ui/`, `lib/supabase/*`, `proxy.ts`. **Added (approved) dep:** `twitter-text` (weighted char counting). **Removed dep:** `react-tweet` (2026-05-29 — server-render crash; story sources render as plain links, richer embed parked §9). **No `zod`** — request bodies validated manually with `typeof` checks, as existing routes do.
*No hand-rolled OAuth/PKCE (Supabase's `'x'` provider does the handshake). Exact paths/folder names finalized in `plan`.*

---

## 6. Commands & environment

```bash
pnpm dev / pnpm build / pnpm lint        # build + lint must stay green
# migrations applied via Supabase MCP / CLI against project pcgvpypzfwuchyfwdlwe
```
**Env vars** — existing: `XAI_API_KEY`, Supabase URL/keys. New: `X_CLIENT_ID`, `X_CLIENT_SECRET` (needed by **our** self-refresh call's Basic auth — *also* entered in the Supabase dashboard for the provider), and a token-encryption secret `X_TOKEN_ENC_KEY` (or use Supabase Vault). No `X_OAUTH_REDIRECT_URI` — Supabase owns the OAuth callback.

---

## 7. Code style
- TypeScript **strict**; `@/*` alias. Run the **`ts-format`** skill on any new/edited `.ts/.tsx`.
- shadcn primitives (`components/ui/`) + **new** loop components; match current Tailwind/theme usage. **No UI polish pass** (parked) — functional + consistent only.
- Server Actions / Route Handlers use `lib/supabase/server.ts`; client components use `lib/supabase/client.ts`. Auth enforced by `app/dashboard/layout.tsx`.
- Define **new** loop types in `lib/types/` — do **not** import the legacy `KnowledgeBank`/`KnowledgeHeadline`/`DraftedTweet` (they retire with the old code).

## 8. Testing / verification strategy
Plumbing-first → **mostly manual + falsifiable**, unit tests only where correctness is non-obvious:
- **Unit:** token refresh/rotation logic, weighted char counting, `dedupe_key` builder.
- **Manual end-to-end (the real proof):** walk §2 on a deploy — connect own X, scan, stories, draft, edit, **post a real tweet**, confirm on X.
- **Spike first (§12):** prove posting works through the Supabase token before building the UI around it.
- Build + lint green before merge. No heavy test infra (none exists; out of scope).

---

## 9. Boundaries

### Always
- **Treat X tokens as secrets:** capture `provider_refresh_token` in the callback, store **encrypted**, never expose to the client, RLS owner-only. Persist the **rotated** refresh token after each refresh.
- **Verify granted scopes** include `tweet.write` after `linkIdentity` (community reports of scopes occasionally dropped on the link path).
- Validate drafts to 280 **weighted** chars and strip raw URLs before posting (cost + correctness).
- New tables additive; correct types + constraints + RLS on all 6.
- Run `ts-format` on touched TS; keep build + lint green.

### Ask first
- **Dropping the legacy 4 tables / deleting `workflows/*` pages** (§4.4) — destructive (~2.8k dev rows), explicit go-ahead only.
- Any spend-affecting default (scan frequency, auto-anything) — slice 1 is **manual only**.
- Adding a dependency or a test runner.
- Editing `scripts/prompts.ts` or anything under `roughmd/` / `test_sc/` (intentional WIP scratch — leave alone).

### Never (parked — out of scope for slice 1)
Aggregation/dedup across scans · cron auto-scan · auto-select/auto-post · email alerts · pricing/payment · landing page · **full** settings-page buildout (minimal Connect-X block *is* in scope) · X-as-login/SSO (X is link-only) · Google SSO · multi-platform · extra scan sources · delete/restore flows · relevance-feedback · AI-output/prompt refinement · schema cleanup of unused/legacy tables (beyond §4.4) · UI polish · per-account long-tweet limits (#20) · **rich/embedded tweet display** (react-tweet removed 2026-05-29 after a server-render crash; stories show plain source links — revisit a neater embed later).

---

## 10. External setup checklist (developer's to-dos)
1. **X Developer Portal:** create an **OAuth 2.0 app**, type **Web App (confidential client)**; set **App permissions = Read and Write**; turn on **Request email**. Copy **Client ID + Client Secret**.
2. **Register callback on X = the Supabase callback:** `https://<project-ref>.supabase.co/auth/v1/callback` (NOT our own route).
3. **Supabase dashboard → Auth → Providers → "X / Twitter (OAuth 2.0)":** enable; paste Client ID + Secret.
4. **Supabase dashboard → Auth:** enable **Manual Linking**; add our app's `redirectTo` (`/auth/callback`) to the **Redirect URLs** allow-list (incl. `http://127.0.0.1:3000/...` for dev).
5. **Add X API pay-per-use credits** + a spending limit (posting has no free tier).
6. Set env vars (§6) locally and in Vercel: `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_TOKEN_ENC_KEY`.
7. (Optional, advisor) Enable Supabase leaked-password protection.

---

## 11. Deferred to `plan`/build (not blockers)
- Token encryption: Supabase Vault vs app-layer AES (`X_TOKEN_ENC_KEY`) — decide at build; both satisfy §9.

## 12. First build task — the posting verification spike (de-risk before UI)
**Riskiest assumption:** that a tweet can actually post through a Supabase-`'x'`-issued provider token.
**Spike:** enable the provider + Manual Linking → `linkIdentity({provider:'x',options:{scopes:'tweet.write'}})` → capture token in callback → call `POST /2/tweets` once. 
- **Pass** → proceed with the Supabase path as specced.
- **Fail** (token can't post / scope dropped / state-JWT bug) → **fallback:** self-hosted X OAuth 2.0 PKCE flow (authorize `https://x.com/i/oauth2/authorize`, token `https://api.x.com/2/oauth2/token`), skipping Supabase for the X handshake only. **Everything downstream — `x_connections`, refresh, `lib/x/*`, post route — is unchanged.**
This is task #0 in `plan`: prove the falsifiable thing first.

---

*End of SPEC v2 — slice 1. Confirm or refine before `plan`.*
