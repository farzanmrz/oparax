---
paths:
  - "app/**"
---

# app/ — routes

- `vercel:nextjs` before routing, Server Component, or Server Action work.

## `app/agents/layout.tsx` is the sole auth guard for `/agents/*`

- A server component that calls `supabase.auth.getUser()` and redirects to `/` if absent — any route added under `app/agents/**` inherits protection automatically; anything added outside that tree does not.
- The `/auth/*` routes and their guards live in `.claude/rules/supabase.md`.
