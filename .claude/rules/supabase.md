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

The app's email links land on `/auth/confirm`
(`app/auth/confirm/route.ts`) — for that to work, the Supabase dashboard must
have:

- **Auth → Email Templates**: *Confirm signup* and *Reset password* links
  pointed at `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...`
  (`signup` / `recovery`).
- **Auth → URL Configuration**: Site URL matching the current environment
  host (`http://localhost:3000` locally, `https://oparax.ai` in production),
  with that origin allow-listed for redirects.

None of this is discoverable by reading the repo — it lives only in the
Supabase project dashboard.

## No app tables yet — deliberate

Auth is Supabase's own tables only; there is no app-owned schema. Adding the
first table (e.g. for agent persistence) is a real feature slice, not a quick
add — see the `no persistence until a data shape earns it` guard in
`AGENTS.md`. `supabase:supabase-postgres-best-practices` becomes relevant the
moment that first table/migration lands.
