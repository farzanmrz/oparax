---
paths:
  - "lib/supabase/**"
  - "lib/auth/**"
  - "lib/auth-errors.ts"
  - "lib/validation.ts"
  - "app/auth/**"
  - "app/login/**"
  - "app/signup/**"
  - "app/forgot-password/**"
  - "proxy.ts"
---

# Supabase & auth

- `vercel:routing-middleware` when changing `proxy.ts` or its matcher (it delegates to `lib/supabase/middleware.ts`'s `updateSession`).
- Any new table/migration is a real feature slice — check the "no persistence" guard in `AGENTS.md` first.

## Database-ops tooling: the claude.ai Supabase connector, not the plugin's MCP server

- **Migrations, SQL, advisors, type-gen** (anything that touches the actual project) go through the **claude.ai Supabase connector** — project `oparax-chirp`, project ref `pcgvpypzfwuchyfwdlwe`. This is the durable path; every DB-touching migration since 2026-07-22 records "Applied via the claude.ai Supabase connector" in its own header comment (e.g. `supabase/migrations/20260722234500_d16_dedup_and_post_outcome.sql`).
- **NOT the `supabase:supabase` plugin's MCP server** — that server is interactive-auth only and 401s headless (no service-role or PAT path this repo's agents can drive non-interactively). Do not reach for it expecting it to apply a migration or run SQL.
- The plugin's **skills** (`supabase:supabase`, `supabase:supabase-postgres-best-practices`) stay in use for guidance — best-practice checks, schema/RLS review, client-library patterns — this split is about the *tool* that executes DB operations, not the skills that inform them.

## Dashboard-side configuration (not in this repo at all)

- Auth → Email Templates: *Confirm signup* / *Reset password* links must route to `/auth/confirm` with `token_hash` + `type` (`signup`/`recovery`) params — a misconfigured template silently breaks signup/reset with correct app code.
- Auth → URL Configuration: Site URL + redirect allow-list must match the current environment host — a mismatch looks like an app bug but isn't one.

## Frozen route

- `/auth/confirm` (`app/auth/confirm/route.ts`) is the hardcoded redirect target of the dashboard email templates above — moving or renaming it breaks the same way.

## Auth-flow contracts (preserve these)

- `updateSession` (`lib/supabase/middleware.ts`) must call `auth.getUser()` — never `getSession()` — with no code between client creation and that call (breaks cookie refresh → random logouts); `proxy.ts` delegates here silently.
- Recovery tokens are **never** consumed on the `/auth/confirm` GET (email-client prefetch would burn the one-time token) — forwarded unconsumed to `/auth/reset-password`, consumed only on form submit.
- Re-submitting the same password on reset is treated as **success** (matches Supabase's `same_password` error) — otherwise a user who already proved ownership dead-ends.
- Email-confirm `verifyOtp` signs the user in as a side effect — the handler signs back out, so login stays a separate, deliberate step.
- `login`/`signup` pages bounce an already-authenticated user to `/agents` server-side (a per-page check, not middleware).
- `mapAuthError` normalizes Supabase's variable rate-limit text (regex, not exact-match) and prevents email enumeration — don't pass raw Supabase errors through.
