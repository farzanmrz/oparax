---
# Two audiences, and BOTH must be globbed. The auth-flow paths were here from the
# start; the service-role paths were not, and for weeks this rule matched ZERO of
# the 21 files that import `lib/supabase/admin` — every file the RLS/service-role
# half of this rule exists to govern. When a new file imports the admin client,
# add its path here or the rule silently stops applying to it.
paths:
  # auth flows
  - "lib/supabase/**"
  - "lib/auth/**"
  - "lib/auth-errors.ts"
  - "lib/validation.ts"
  - "app/auth/**"
  - "app/login/**"
  - "app/signup/**"
  - "app/forgot-password/**"
  - "proxy.ts"
  # service-role writers (RLS-bypassing) — `grep -rl supabase/admin app lib scripts`
  - "lib/agent/**"
  - "lib/voice/**"
  - "lib/x/**"
  - "lib/slack/**"
  - "app/agents/**"
  - "app/api/**"
  - "scripts/**"
  # the migration mirror
  - "supabase/migrations/**"
---

# Supabase & auth

- `vercel:routing-middleware` when changing `proxy.ts` or its matcher (it delegates to `lib/supabase/middleware.ts`'s `updateSession`).
- Any new table/migration is a real feature slice — check the "no persistence" guard in `AGENTS.md` first.

## Database-ops tooling

- **Migrations, SQL, advisors, type-gen** (anything that touches the actual project) go through the **global user-scoped Supabase MCP server** (`claude mcp get supabase` — `https://mcp.supabase.com/mcp?project_ref=pcgvpypzfwuchyfwdlwe&…`, OAuth'd at **user scope**, available in every project; owner decision 2026-07-27, superseding the claude.ai-connector wording used before). Project `oparax-chirp`, project ref `pcgvpypzfwuchyfwdlwe`. New DB-touching migrations record "Applied via the Supabase MCP server" in their header comment; pre-2026-07-27 headers say "Applied via the claude.ai Supabase connector" and stay as-is — they are historical records.
- **Never re-add a project-scoped `supabase` entry to `.mcp.json`.** OAuth tokens are stored **per endpoint URL**: a project-scope entry with a different URL (even just a narrower `features=` list) shadows the authenticated global server with an unauthenticated endpoint, and every session then sees "needs authentication" while `claude mcp list` shows the global one Connected. This exactly happened 2026-07-27 (the actions-only project entry from c86dae5) and was removed the same day. One server, user scope, one URL.
- The Supabase **skills** (`supabase`, `supabase-postgres-best-practices`) stay in use for guidance — best-practice checks, schema/RLS review, client-library patterns — independent of which tool executes the DB operation.
- **Scope DB work to the runner agents when it explores or returns bulk.** A verbatim, known query with a small result runs inline. Anything needing schema discovery, iteration/retries, seeding, or bulk output goes to `supabase-runner` (Claude Code — haiku default, override `model: sonnet` at dispatch for figure-out-the-query briefs) / `cx_supabase_runner` (Codex), which ground in `lib/supabase/database.types.ts` before authoring SQL and return distilled verdicts. Migration names via MCP are the SLUG ONLY — the version is stamped remotely; embedding the filename doubles the name in the remote history. Build sessions keep their inline default for plan-specified DB tasks and may dispatch the runner when a task forces exploration.

## Dashboard-side configuration (not in this repo at all)

- Auth → Email Templates: *Confirm signup* / *Reset password* links must route to `/auth/confirm` with `token_hash` + `type` (`signup`/`recovery`) params — a misconfigured template silently breaks signup/reset with correct app code.
- Auth → URL Configuration: Site URL + redirect allow-list must match the current environment host — a mismatch looks like an app bug but isn't one.

## Frozen route

- `/auth/confirm` (`app/auth/confirm/route.ts`) is the hardcoded redirect target of the dashboard email templates above — moving or renaming it breaks the same way.

## The voice tables are per-desk, and that closed the old cross-user read

`voice_guides` and `voice_rules` are keyed by `experiment_id`, one row per desk, joined through the owner-scoped `experiments` row by **id**. `voice_extraction_runs` is the same shape (deny-all, read via an ownership-proving server action).

This replaced a `reporter_handle`-keyed model where a guide was global and shared across every desk on that reporter. Under it, the read policy joined by handle, and any authenticated user could self-mint an `experiments` row with any `reporter_handle` — so every guide was readable by every signed-in user, found by exploit rather than by reading. That is gone: a join on the desk's own id cannot be satisfied by a row the reader doesn't own.

**There is no extraction spend RATIONING any more, deliberately.** The per-reporter/UTC-day atomic claim and the per-handle profile-lookup cap were both deleted (owner decision): extraction runs whenever a desk owner asks for it and pays each time. If that ever needs bounding again, bound it per owner — not per handle, which was never the unit anyone shared.

The one guard that remains is narrower and different in kind: `startRun` (`lib/voice/extraction-run.ts`) is an atomic claim on `voice_extraction_runs`, so ONE desk cannot have TWO extractions in flight at once. That stops a double-clicked Retry billing twice for a single user intent — it is not a quota, does not reset on a clock, and never refuses a caller whose desk is idle. Don't conflate the two when reading either file.

## Auth-flow contracts (preserve these)

- `updateSession` (`lib/supabase/middleware.ts`) must call `auth.getUser()` — never `getSession()` — with no code between client creation and that call (breaks cookie refresh → random logouts); `proxy.ts` delegates here silently.
- Recovery tokens are **never** consumed on the `/auth/confirm` GET (email-client prefetch would burn the one-time token) — forwarded unconsumed to `/auth/reset-password`, consumed only on form submit.
- Re-submitting the same password on reset is treated as **success** (matches Supabase's `same_password` error) — otherwise a user who already proved ownership dead-ends.
- Email-confirm `verifyOtp` signs the user in as a side effect — the handler signs back out, so login stays a separate, deliberate step.
- `login`/`signup` pages bounce an already-authenticated user to `/agents` server-side (a per-page check, not middleware).
- `mapAuthError` normalizes Supabase's variable rate-limit text (regex, not exact-match) and prevents email enumeration — don't pass raw Supabase errors through.
