# Design Workflow: Claude Design ↔ Claude Code

How we revamp Oparax's UI. The whole site is being redesigned page by page off a new
landing-page aesthetic built in **Claude Design**. This doc is the operating guide for Claude
Design *and* the integration contract for Claude Code, so the workflow is repeatable instead of
re-decided each page.

> Supersedes the retired `ui-standard` skill. That skill encoded the *old* token/shadcn look we
> are intentionally replacing — do not reach for it.

## The two axes

Split every page into two independent concerns with **opposite** sources of truth.

| Axis | Mode | Source of truth | Owned by |
|------|------|-----------------|----------|
| **Design** — look, layout, UX structure, which components exist | Greenfield. Reinvent freely. | The **published Claude Design system** (seeded from the landing page) | Claude Design |
| **Behavior** — what the page does | Brownfield. **Must not break.** | This repo | Claude Code |

The arrow for the visual layer is **design → code**: Claude Design defines the look, and Claude
Code rewrites `globals.css` tokens / components to match it as each page lands. The arrow for
behavior is the reverse — **code is the contract**; a redesign must preserve it (or change it in
lockstep with the backend).

### The behavior contract (the immovable seams)

A redesign may move, restyle, add, or remove *presentational* elements, but these seams must keep
working:

- **Supabase session refresh** — `proxy.ts`, `lib/supabase/middleware.ts`. Don't touch the wrapping.
- **Server actions + their field `name`s** — e.g. `login`/`signup` read `email`/`password`
  (+ `confirm-password`), the agent-create form posts handles + prompts. Renaming or dropping a
  field that an action reads breaks it.
- **Auth guards & routing** — `app/dashboard/layout.tsx` guard, the connect-x gate, `?next=`
  redirects, `/` → `/dashboard` → `/dashboard/agents` | `/dashboard/connect-x`.
- **The agents pipeline** — Run Agent (single Grok scan+draft) → in-memory preview → Save Agent
  (persists `agents` + `runs` + `run_items`) → agent detail (redraft / post per item).
- **Next.js App Router boundaries** — `"use client"` vs server components, server-action forms.

## Step 1 — Set up & publish the design system (once)

Do this before designing individual pages so every later page inherits the look automatically.

1. Claude Design → org settings → **Design System** → onboarding / Remix.
2. **Seed it from the landing page, NOT from this repo.** Seeding from the repo would drag in the
   old OKLCH/shadcn look we're replacing. Export the landing page to standalone HTML or a few
   full-page screenshots, add the logo, and upload those. Let Claude extract the palette,
   typography, spacing, and components.
3. Run a test prompt ("design a settings page"), confirm it feels like the same family.
4. Flip **Published** on. From then on, every new project created from the org home inherits it.

## Step 2 — Design a page (repeat per page: dashboard first, then agents, settings, connect-x, auth)

Create a new Claude Design project (it inherits the published system). Attach exactly three inputs:

1. **The inherited design system** → handles the look. Nothing to upload.
2. **A screenshot of the *current* page** → tells it *what the page does and what's on it*.
   Say explicitly: "this is the current UI and its purpose — redesign freely, don't preserve this look."
3. **A written purpose brief** → each component's job, the action it triggers, and where the UX is
   uncertain. This is where the value is: it lets Claude Design rationalize a better layout, change
   how fields are arranged, or add/remove components.

**Do NOT attach raw codebase files at design time.** Claude Design doesn't ingest them usefully and
it should be designing, not wiring. Code stays with Claude Code for integration.

Iterate in the project until the high-fidelity prototype is right, then export it.

## Step 3 — Hand off to Claude Code (integration)

Give Claude Code the exported design **plus the page's behavior contract** (fill in the template
below). Claude Code then:

- Re-attaches behavior to the new markup — wires forms to the existing server actions, preserving
  required field `name`s; keeps guards/redirects/data intact.
- **Decides substrate per page**: reuse/restyle existing shadcn primitives where they fit (keeps
  accessibility + faster, safer wiring) or hand-roll a bespoke component where no Radix equivalent
  fits — whichever best realizes the design. No blanket rule.
- Regenerates `globals.css` tokens and components to match the new system as pages land. Over time
  the code side becomes the faithful reflection of the published design system.

### Per-page functional contract template

```
Page: <route>
Server action(s): <names + file> — required field names: <...>
Redirects / guards: <auth guard? connect-x gate? ?next=? success/error redirect>
Data rendered: <what the page must show, and where it comes from>
Client/server boundaries: <which parts are "use client" / server-action forms>
Must-keep behaviors: <e.g. Run→preview→Save→run_items, post/redraft per item>
```

## Step 4 — Verify

After each page is integrated, run the app and exercise the real flow with the **agent-browser**
skill using the project test creds (`testuser@oparax.com` / `hello123`):

- Form submits hit the right action and redirect correctly.
- Guards/redirects still route as expected.
- The agents flow (run → preview → save → post/redraft) still works against the new UI.

Functionality regressions are the only true failures here — the look is expected to change.
