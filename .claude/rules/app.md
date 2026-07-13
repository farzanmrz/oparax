---
paths:
  - "app/**"
---

# app/ — routes

- `vercel:nextjs` before routing, Server Component, or Server Action work.

## `app/agents/layout.tsx` is the sole auth guard for `/agents/*`

- A server component that calls `supabase.auth.getUser()` and redirects to `/` if absent — any route added under `app/agents/**` inherits protection automatically; anything added outside that tree does not.
- Root `/`, `/login`, and `/signup` run their own separate auth-bounce checks instead — see `.claude/rules/supabase.md` — a distinct mechanism from this layout guard, not the same one.
- The `/auth/*` routes and their guards live in `.claude/rules/supabase.md`.

## Every `/agents/*` page header leads with the sidebar trigger

- The sidebar is offcanvas (fully hidden when collapsed), so each page's header must open with `<AppSidebarTrigger />` (`<AppSidebarBackRow />` on the `[id]` and settings back-link headers) — a page without one silently loses the only visible way to reopen navigation.
