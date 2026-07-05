---
paths:
  - lib/**
---

# Supabase & auth logic

Invoke `supabase:supabase` for anything Supabase; add `vercel:routing-middleware` when changing proxy/matcher behavior.

- `lib/supabase/` is the three-client pattern: `client.ts` (browser), `server.ts` (Server Components / Actions / route handlers), `middleware.ts` (session refresh, driven by root `proxy.ts`).
- Supabase is auth-only: no app tables, no schema until a data shape earns it.
- `lib/auth/actions.ts` holds every auth server action (login, signup, forgot/reset password); `validation.ts` and `auth-errors.ts` support it; `user.ts` is the current-user helper; `utils.ts` is `cn()`.
- Dashboard-side configuration (email templates, redirect URLs, fresh-clone env template): `.claude/references/supabase-auth-setup.md`.
