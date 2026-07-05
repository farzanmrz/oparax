# lib/ — Supabase & auth logic

- `lib/supabase/` — the three-client pattern:
  - `client.ts` — browser client.
  - `server.ts` — Server Components / Actions / route handlers.
  - `middleware.ts` — session refresh, driven by root `proxy.ts`.
- `lib/auth/actions.ts` — every auth server action (login, signup, forgot/reset password).
- `lib/validation.ts` — form-input validation for the auth actions.
- `lib/auth-errors.ts` — maps Supabase error codes to user-facing messages.
- `lib/user.ts` — current-user helper for server components.
- `lib/utils.ts` — `cn()` for shadcn class merging.

Dashboard-side setup (email templates, redirect URLs, fresh-clone env template): `.claude/references/supabase-auth-setup.md`.
