---
paths:
  - "app/**"
---

# app/ — routes

## `app/agents/layout.tsx` is the sole auth guard for `/agents/*`

- A server component that calls `supabase.auth.getUser()` and redirects to `/` if absent — any route added under `app/agents/**` inherits protection automatically; anything added outside that tree does not. It also fetches the reporter's own `agents` rows (owner-scoped RLS) in parallel with the auth check (neither depends on the other's result) and hands them to `SiteHeader` as the desk switcher's data.
- Root `/`, `/login`, and `/signup` run their own separate auth-bounce checks instead — see `.claude/rules/supabase.md` — a distinct mechanism from this layout guard, not the same one.
- The `/auth/*` routes and their guards live in `.claude/rules/supabase.md`.

## The way-back guarantee is a thin header, not a sidebar — there is no sidebar here

The offcanvas sidebar is gone — measured, it served exactly one nav destination and added a detour to every visit. `/agents/*` now has no offcanvas panel to hide behind, so nothing renders a sidebar trigger. One sticky `SiteHeader` shell replaces it:

- **`components/site-header.tsx`**, rendered once in `app/agents/layout.tsx`, on every `/agents/*` page: one sticky 56px row — the Oparax mark, desktop desk tabs, the desk switcher (`components/desk-switcher.tsx`, fed the parallel-fetched `agents` rows), and the account menu (`components/account-menu.tsx`) — plus persistent mobile desk tabs (`components/mobile-desk-tabs.tsx`) under a desk. It is the way-back-to-nav guarantee on desk-less pages (e.g. the empty-state listing).
- **`app/agents/[id]/layout.tsx`**, rendered for every page under a desk (`Feed`/`Voice`/`Setup`): ownership proof and feed scaffolding only; it owns no navigation.

A page without this shell silently loses the only visible way back to nav — there is no third mechanism.

## `/agents` is feed-first, not a listing

`app/agents/page.tsx` never renders a listing of its own on repeat visits: it reads the `last_desk_id` cookie (set by `proxy.ts` on every `/agents/{id}` visit), validates it against the reporter's own `agents` rows, and redirects straight into that desk; on a miss it falls back to the most recently created owned desk. Only a reporter with zero desks ever sees `<AgentsList />` — everywhere else, the site header's desk switcher IS the listing.
