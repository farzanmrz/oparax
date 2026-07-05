# lib/ — logic behind the routes

- `supabase/` — the three-client pattern (skill: `supabase:supabase` for anything Supabase): `client.ts` (browser), `server.ts` (Server Components/Actions/route handlers), `middleware.ts` (session refresh, driven by root `proxy.ts`). Supabase is auth-only — no app tables, no schema until a data shape earns it.
- `auth/actions.ts` — every auth server action (login, signup, forgot/reset password); the pages in `app/(auth)/` are thin wrappers over these.
- `validation.ts` — form input validation used by the auth actions.
- `auth-errors.ts` — maps Supabase error codes to user-facing messages.
- `user.ts` — current-user helper for server components (dashboard layout, settings).
- `utils.ts` — `cn()` for shadcn class merging.
