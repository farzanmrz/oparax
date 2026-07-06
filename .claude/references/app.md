# app/ — routes

Skill: `vercel:nextjs` before routing / Server Component / Server Action work.

Next.js App Router: a folder is a URL segment, and its `page.tsx`/`route.ts` is what's served there. Each distinct URL is its own folder.

- `app/page.tsx` — landing; sends signed-in users to `/agents`.
- Auth entry pages — top-level, thin wrappers over `lib/auth/actions.ts`:
  - `app/login/`
  - `app/signup/`
  - `app/forgot-password/`
- `app/auth/` — auth machinery under the `/auth/*` namespace:
  - `app/auth/confirm/route.ts` — token exchange for Supabase email links, then forwards to reset/login. `/auth/confirm` is hardcoded in the Supabase email templates, so it must never move (a hard guard in AGENTS.md).
  - `app/auth/reset-password/` — recovery landing; consumes the one-time token, deliberately unguarded.
- `app/agents/` — protected app shell (post-login home; the auth guard lives here, so every subfolder is protected and inherits the top bar):
  - `layout.tsx` — auth guard + top bar (brand, Agents/Settings nav, username, sign-out); `app-nav.tsx` and `sign-out-button.tsx` are its client islands.
  - `page.tsx` — the agents listing (where login lands).
  - `new/` — create-agent page → the eve chat (`agent-chat.tsx`).
  - `[id]/` — per-agent details (stub).
  - `settings/` — username / delete account (password change is a stub).
- `app/globals.css` — the only styling surface (shadcn theme tokens).
- Root `proxy.ts` (Next 16's renamed middleware) refreshes the Supabase session on every request; its logic lives in `lib/supabase/middleware.ts`.
