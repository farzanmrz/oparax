---
paths:
  - app/**
  - proxy.ts
---

# App routes (Next.js App Router)

Invoke `vercel:nextjs` before routing / Server Component / Server Action work.

- `app/` IS the URL map. `page.tsx` = landing (sends signed-in users to `/dashboard`).
- `(auth)/` is a route group (invisible in URLs): `login/`, `signup/`, `forgot-password/` pages — thin wrappers over the server actions in `lib/auth/actions.ts` — plus `auth/`, which is URL-bearing: `auth/confirm/route.ts` consumes Supabase email links (`/auth/confirm` is baked into Supabase email templates — **never move or rename it**) and `auth/reset-password/` completes the reset flow.
- `dashboard/` is the protected shell: `layout.tsx` is the auth guard + nav; `agents/` is the eve chat; `settings/` is username / delete account / sign-out; `page.tsx` just redirects to `agents`.
- `apple-icon.png`, `icon.svg`, `favicon.ico` are Next.js metadata file conventions (auto-served favicon/touch icon) — not stray assets.
- `globals.css` is the only styling surface (see the design-system rule).
- Root `proxy.ts` (Next 16's renamed middleware) refreshes the Supabase session on every request; its logic lives in `lib/supabase/middleware.ts`.
