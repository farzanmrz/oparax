# app/ — routes (App Router: this folder IS the URL map)

Skill: invoke `vercel:nextjs` before routing / Server Component / Server Action work.

- `page.tsx` — landing; sends signed-in users to `/dashboard`
- `(auth)/` — route group (the `(auth)` segment never appears in URLs):
  - `login/`, `signup/`, `forgot-password/` — pages; thin wrappers over the server actions in `lib/auth/actions.ts`
  - `auth/` — **URL-bearing**: `confirm/route.ts` consumes Supabase email links (`/auth/confirm` is baked into Supabase email templates — never move or rename), `reset-password/` completes the reset flow
- `dashboard/` — protected shell; `layout.tsx` is the auth guard + nav; `agents/` is the eve chat (`useEveAgent` + ai-elements — see `agent/CLAUDE.md`, `components/CLAUDE.md`); `settings/` is username / delete account / sign-out; `page.tsx` just redirects to `agents`
- `apple-icon.png`, `icon.svg`, `favicon.ico` — Next.js metadata file conventions (auto-served favicon/touch icon); not stray assets
- `globals.css` — the only styling surface (shadcn theme tokens); no custom CSS anywhere else
- Session refresh lives outside this dir, in root `proxy.ts`
