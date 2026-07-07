---
paths:
  - "app/**"
---

# app/ — routes

`vercel:nextjs` before routing, Server Component, or Server Action work.

## `/auth/confirm` is frozen

Hardcoded into the Supabase dashboard's email templates — never move it. See
`.claude/rules/supabase.md` for the dashboard-side config.

## `app/agents/layout.tsx` is the sole auth guard for `/agents/*`

Any route added under `app/agents/**` inherits protection automatically;
anything added outside that tree does not.
