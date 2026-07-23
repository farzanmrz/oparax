---
paths:
  - "app/**"
---

# app/ — routes

## `app/agents/layout.tsx` is the sole auth guard for `/agents/*`

- A server component that calls `supabase.auth.getUser()` and redirects to `/` if absent — any route added under `app/agents/**` inherits protection automatically; anything added outside that tree does not. It also fetches the reporter's own `experiments` rows (owner-scoped RLS) in parallel with the auth check (neither depends on the other's result) and hands them to `SiteHeader` as the desk switcher's data.
- Root `/`, `/login`, and `/signup` run their own separate auth-bounce checks instead — see `.claude/rules/supabase.md` — a distinct mechanism from this layout guard, not the same one.
- The `/auth/*` routes and their guards live in `.claude/rules/supabase.md`.

## The way-back guarantee is a thin header, not a sidebar — there is no sidebar here

The offcanvas sidebar is gone (R20: a single-destination nav that only added a detour). `/agents/*` now has no offcanvas panel to hide behind, so nothing renders a sidebar trigger. Two always-visible bars replace it:

- **`components/site-header.tsx`**, rendered once in `app/agents/layout.tsx`, on every `/agents/*` page: a sticky 56px topbar — the Oparax mark, the desk switcher (`components/desk-switcher.tsx`, fed the parallel-fetched `experiments` rows), and the account menu (`components/account-menu.tsx`). This bar alone is the way-back-to-nav guarantee on desk-less pages (e.g. the empty-state listing).
- **`app/agents/[id]/layout.tsx`**, rendered for every page under a desk (`Feed`/`Voice`/`Setup`): a second sticky bar directly beneath the site header carrying the desk's status pill, pause/delete controls, and the `DeskTabs` nav (`app/agents/[id]/desk-controls.tsx`) at `md:` and up; below `md:`, `components/mobile-nav-sheet.tsx` renders the same three `DESK_TABS` links (same URLs, same source of truth — no parallel nav model) inside a sheet trigger instead.

A page without one of these two bars silently loses the only visible way back to nav — there is no third mechanism.

## `/agents` is feed-first, not a listing

`app/agents/page.tsx` never renders a listing of its own on repeat visits: it reads the `last_desk_id` cookie (set by `proxy.ts` on every `/agents/{id}` visit), validates it against the reporter's own `experiments` rows, and redirects straight into that desk; on a miss it falls back to the most recently created owned desk. Only a reporter with zero desks ever sees `<AgentsList />` — everywhere else, the site header's desk switcher IS the listing (R20).
