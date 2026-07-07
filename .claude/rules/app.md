---
paths:
  - "app/**"
---

# app/ — routes

`vercel:nextjs` before routing, Server Component, or Server Action work.

## `/auth/confirm` is frozen — never move it

`app/auth/confirm/route.ts` is hardcoded into the Supabase dashboard's email
templates (the *Confirm signup* / *Reset password* link URLs) — renaming or
relocating this route silently breaks every outstanding email link with no
error on the app side. See `.claude/rules/supabase.md` for the dashboard-side
config.

## `app/auth/reset-password/` is deliberately unguarded

It must work for a signed-out user carrying only a one-time recovery token —
the token is the auth, consumed only on submit (not on page load), so adding
a signed-in check here would break the recovery flow.
