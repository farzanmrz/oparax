---
paths:
  - app/**
  - proxy.ts
---

# App routes (Next.js App Router)

Invoke `vercel:nextjs` before routing / Server Component / Server Action work.

- `app/` IS the URL map: a folder = a URL segment, its `page.tsx`/`route.ts` = what's served there. Each distinct URL is its own folder.
- `page.tsx` = landing (sends signed-in users to `/dashboard`).
- Auth entry pages sit at the top level — `login/`, `signup/`, `forgot-password/` (→ `/login`, `/signup`, `/forgot-password`) — thin wrappers over the server actions in `lib/auth/actions.ts`.
- `auth/` namespaces the callback/machinery routes under `/auth/*`: `auth/confirm/route.ts` consumes Supabase email links (`/auth/confirm` is baked into Supabase email templates — **never move or rename it**), `auth/reset-password/` completes the reset flow, `auth/signout/` ends the session.
- `dashboard/` is the protected shell: `layout.tsx` is the auth guard + nav; `agents/` is the eve chat; `settings/` is username / delete account / sign-out; `page.tsx` redirects to `agents`.
- `apple-icon.png`, `icon.svg`, `favicon.ico` are Next.js metadata file conventions (auto-served) — not stray assets.
- `globals.css` is the only styling surface (see the design-system rule).
- Root `proxy.ts` (Next 16's renamed middleware) refreshes the Supabase session on every request; its logic lives in `lib/supabase/middleware.ts`.
