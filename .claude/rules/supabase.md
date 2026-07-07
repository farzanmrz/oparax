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

`supabase:supabase` for Supabase work; `vercel:routing-middleware` when
changing `proxy.ts` or its matcher.

## Dashboard-side configuration (not in this repo at all)

- Auth → Email Templates: *Confirm signup* / *Reset password* links must
  route to `/auth/confirm` with `token_hash` + `type` (`signup`/`recovery`)
  params — a misconfigured template silently breaks signup/reset with
  correct app code.
- Auth → URL Configuration: Site URL + redirect allow-list must match the
  current environment host — a mismatch looks like an app bug but isn't one.

## No app tables yet

See the "no persistence" guard in `AGENTS.md` — `supabase:supabase-postgres-best-practices`
becomes relevant the moment a first table/migration lands.
