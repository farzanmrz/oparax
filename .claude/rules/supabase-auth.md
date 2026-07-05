---
paths:
  - lib/**
---

# Supabase & auth logic

- Invoke `supabase:supabase` for anything Supabase; add `vercel:routing-middleware` when changing proxy/matcher behavior.
- Use the right `lib/supabase/` client: `client.ts` (browser), `server.ts` (Server Components / Actions / route handlers), `middleware.ts` (session refresh, via root `proxy.ts`).
- Supabase is auth-only: no app tables. When persistence is eventually needed, plain local files before any schema.
- Dashboard-side config (email templates, redirect URLs, fresh-clone env template): `.claude/references/supabase-auth-setup.md`.
