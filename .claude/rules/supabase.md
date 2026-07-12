---
paths:
  - "lib/**"
  - "app/auth/**"
  - "app/login/**"
  - "app/signup/**"
  - "app/forgot-password/**"
  - "proxy.ts"
---

# Supabase & auth

- `supabase:supabase` for Supabase client/auth work; `vercel:routing-middleware` when changing `proxy.ts` or its matcher (it delegates to `lib/supabase/middleware.ts`'s `updateSession`).
- `supabase:supabase-postgres-best-practices` becomes relevant the moment a first app-owned table/migration lands — none exist yet (see the "no persistence" guard in `AGENTS.md`).

## Dashboard-side configuration (not in this repo at all)

- Auth → Email Templates: *Confirm signup* / *Reset password* links must route to `/auth/confirm` with `token_hash` + `type` (`signup`/`recovery`) params — a misconfigured template silently breaks signup/reset with correct app code.
- Auth → URL Configuration: Site URL + redirect allow-list must match the current environment host — a mismatch looks like an app bug but isn't one.

## Frozen route

- `/auth/confirm` (`app/auth/confirm/route.ts`) is the hardcoded redirect target of the dashboard email templates above — moving or renaming it silently breaks signup/reset even with correct app code.

## Auth-flow contracts (preserve these)

- `updateSession` (`lib/supabase/middleware.ts`) must call `auth.getUser()` — never `getSession()` — with no code between client creation and that call: `getSession()` skips JWT validation, and a stray call in between breaks cookie refresh (random logouts).
- Recovery tokens are **never** consumed on the `/auth/confirm` GET (email-client prefetch would burn the one-time token) — it forwards `token_hash` unconsumed to `/auth/reset-password`, which consumes it only on form submit.
- Re-submitting the same password on reset is treated as **success** (matches Supabase's `same_password` error) — otherwise a user who already proved ownership dead-ends.
- Email-confirm `verifyOtp` signs the user in as a side effect — the handler signs back out, so login stays a separate, deliberate step.
- `login`/`signup` pages bounce an already-authenticated user to `/agents` server-side (a per-page check, not middleware).
- `lib/supabase/env.ts` reads literal `process.env.NEXT_PUBLIC_*` (not dynamic/indexed) — required for Next's static inlining into the browser bundle; dynamic access silently breaks client-side env.
- `mapAuthError` normalizes Supabase's variable rate-limit text (regex, not exact-match) and prevents email enumeration — don't pass raw Supabase errors through.
