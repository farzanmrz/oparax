# Project Overview

Oparax is an AI agent for news reporters: it monitors their beat across X, news websites, and social platforms, catches stories as they break, drafts a post for each platform in their voice, and — once trusted — posts autonomously.

## Larger Planned functionality

Oparax is an AI agent for professional news reporters whose audience expects them to be first. A reporter tells it what to watch — X handles, news websites, and accounts across Reddit, Bluesky, LinkedIn, and Meta's platforms (Facebook, Instagram, Threads) — what counts as news on their beat, and how they write. The agent monitors those sources in the background at whatever frequency the reporter sets, separates what it finds into atomic news items (recognizing when multiple sources are carrying the same story), and drafts a ready-to-publish post for each item in the reporter's voice and beliefs, shaped to each destination platform's length and norms. The moment something breaks, the reporter is notified — email, WhatsApp, or push — with drafts attached: they post in one tap, or, for agents they have come to trust, flip on autonomous mode and Oparax selects what is worth posting, publishes, and notifies after the fact. Assistive by default, autonomous by permission.

# Project Structure

Next.js App Router app at the repo root.

Folder-level map — drill into a folder when a task touches it; the non-obvious gotchas are called out inline.

```text
├── package.json    # Deps + scripts (pnpm dev / build / lint)
├── next.config.ts  # Next.js config
├── vercel.json     # Vercel config; crons EMPTY (auto-scan cron deferred — see docs/PLAN.md)
├── components.json # shadcn config
├── tsconfig.json   # TypeScript config (strict, @/* alias)
├── proxy.ts        # Per-request hook that refreshes the Supabase session.
│                   # MISLEADINGLY NAMED — NOT Supabase middleware (that lives in lib/supabase/middleware.ts).
│
├── app/            # Next.js App Router
│   ├── globals.css # THE DESIGN SYSTEM — tokens + component classes (see "Design System" section below)
│   ├── landing.css # Landing page layout only, scoped under `.landing` (components come from globals.css)
│   ├── icon.svg / apple-icon.png / favicon.ico  # Favicon set from the brand export (public/brand/)
│   ├── login/, signup/, auth/, forgot-password/  # Auth flow; auth/callback = X OAuth (link X for posting)
│   │               # ALL auth UI lives in the landing modals (login/signup/forgot/reset) — /login, /signup,
│   │               # /forgot-password, /auth/reset-password are THIN REDIRECTS to /?auth=...;
│   │               # auth/confirm = email-link handler (signup verify → login modal notice, NO auto-login;
│   │               # recovery → reset modal, token consumed only on submit)
│   ├── dashboard/  # Protected area (auth guard in dashboard/layout.tsx); connect-x gate, settings, agents surface
│   │   ├── connect-x/ # Required X-linking gate before creating agents; redirects back via ?next=...
│   │   └── agents/ # page.tsx = LIST · new/ = create (Run Agent: scan+draft → review → Save) · [id]/ = manual run/redraft/post detail
│   └── api/        # agents/* → scan(stream preview) · save-agent (agents+runs+run_items) · [id]/run · run-items post/redraft · x/* → disconnect
│
├── components/
│   ├── landing/    # Landing page (React port of the locked design reference) + auth modal, wired to lib/auth/modal-actions.ts
│   ├── logo.tsx    # Oparax "orbit" mark (currentColor inline SVG) — wordmark is ALWAYS plain text next to it
│   ├── icons.tsx   # Shared inline SVG icons (platforms, eyes, Google) from the design system
│   ├── ui/         # LEGACY shadcn primitives — quarantined: do NOT build new UI on these; each dashboard-page
│   │               # redesign deletes its consumers, then this folder + shadcn deps + components.json go
│   ├── hooks/      # shadcn `hooks` alias target (components.json) → use-mobile.ts, REQUIRED by ui/sidebar.tsx (legacy)
│   ├── loop/       # agents UI + connect-x / disconnect-x (X linking) components (legacy styling, pending redesign)
│   ├── settings/   # settings sections: profile, coming-soon placeholders, tab nav (legacy styling, pending redesign)
│   └── *.tsx       # sidebar/nav + dashboard page header (legacy, pending redesign)
│
├── lib/            # Domain logic: supabase/ clients, auth/ (modal Server Actions), scan/ + draft/ (Grok pipeline),
│                   # x/ (token lifecycle + client), types/ (generated DB types + aliases), validation.ts, auth-errors.ts, utils.ts
│
├── docs/           # Spec, PRD & planning docs — all spec/PRD + ADRs + ideas live here. See decisions/0002-agent-data-model.md
│                   # UI revamp: docs/design-workflow.md = Claude Design ↔ Claude Code loop (design=greenfield/Claude Design, behavior=brownfield/this repo).
│                   # The `ui-standard` skill was RETIRED 2026-06-03 — it encoded the old look, replaced by the design system below.
└── public/
    └── brand/      # Exported logo set: badge (white mark on #3577B5; rounded + full-bleed square) for profile
                    # pictures / app icons, plus white & black marks for dark / light surfaces
```

DB schema is NOT tracked in-repo (the `supabase/migrations` folder was removed 2026-06-01) — the database is managed via the Supabase MCP/dashboard. Current shape lives in `lib/types/database.ts` (generated types) + `docs/decisions/0002-agent-data-model.md`. Live tables: `agents, runs, run_items, x_connections`. The `scripts/` scratchpad folder was also removed (including the old `derive:logo` pipeline, obsolete since the 2026-06-10 design-system port); the pnpm-only guard now runs inline via `preinstall: npx -y only-allow pnpm` (no committed script file).

# Design System

Ported 2026-06-10 from the Claude Design "Check System" handoff bundle (the `check-system/` folder was deleted after the port — `app/globals.css` + this section are now the source of truth). The landing page (`components/landing/`) is the living reference for how the pieces compose. Dark, quiet, and fast.

- **Tokens** (`:root` in `app/globals.css`) — absolute-dark, blue-tinted (hue 250) surfaces:
  - Surfaces: `--bg` (page) · `--chrome` (header/footer, separated by 1.5px `--chrome-line`) · `--card` (panels/modals) · `--inset` (output wells) · `--field-bg`/`--field-line`/`--field-focus` (form surfaces) · `--line`/`--line-strong` (hairlines)
  - Ink: `--fg` / `--muted` / `--faint` — kept bright for readability
  - Accent: light blue, **used sparingly** — `--accent` (text/badges), `--accent-vivid` (dots, caret, loadbar), `--accent-soft`/`--accent-line` (fills/borders)
  - Interactive: **white** (`--action` + `--action-ink`) — buttons must stand out from the dark bg
  - Status: `--live` (green, scanning/live), `--err` (validation red)
  - Shape: `--radius: 6px` rectangular controls (cards/modals 14px, badges 4px); `--ctl-h: 36px` control height — buttons and inputs always match heights
  - All tokens are also registered as Tailwind utilities (`bg-card`, `text-accent`, …) via `@theme inline`
- **Font** — Source Sans 3 (variable, via `next/font/google` in `app/layout.tsx` → `--font-source-sans`), the ONLY family
- **Logo** — the "orbit" mark, drawn inline with `currentColor` (`components/logo.tsx`); wordmark is always plain text next to the mark, never an image. Brand export set in `public/brand/`
- **Component classes** (`@layer components` in `app/globals.css`): `.btn` (+ `-primary` white / `-secondary` accent / `-danger` err / `-sm` / `-block` / `.loading` with in-button `.ld` spinner) · `.field` (stacked label+input) · `.hl-input` (inline/header input) · `.pw-box`+`.eye` (password visibility — toggles all password fields in a form together) · `.ferr`/`.form-err`/`.form-ok`+`.invalid` (validation) · `.wbadge` · `.dot` (+`.blink`,`.green`) · `.label-sm` · `.draft-divider`+`.chip` · `.ffield-wrap`/`.flabel`/`.ffield`/`.badge-row`+`.top-row`/`.ffield-row` (read-only form display) · `.desk-card`+`.card-chrome`/`.card-body`/`.card-soon` (agent card) · `.news-item`(+`.srcs`/`.when`) · `.xpost`+`.xpost-foot`/`.caret` (draft post) · `.modal`/`.overlay` suite (incl. disabled `.sso-btn`) · `.loadbar`
- **Convention**: pages keep ONLY their own layout CSS (e.g. `app/landing.css` scoped under `.landing`); reusable components live in `globals.css`. UI copy is plain sentence case — direct, first-person, no jargon.
- **Rules of thumb**: (1) one headline, one sub, one primary action; (2) accent blue is seasoning, not paint — white is for actions; (3) every form: label above field, errors below in red on blur, submit disabled until all fields filled, loaders on press; (4) animation only where it carries meaning (blinking dot = live, caret = drafting, spinner = loading), slow and `prefers-reduced-motion` safe; (5) keep pages to a single viewport where possible — header fixed, footer in flow.
- **Legacy quarantine**: `components/ui/` (shadcn) and the dashboard/loop/settings components styled on the OLD theme still compile but look rough — their old tokens were hard-cut. Do NOT build new UI on shadcn; each page gets redesigned via Claude Design (see `docs/design-workflow.md`), deleting its shadcn consumers as it goes.

# Agentic Context

- This project is developed interchangeably in **Claude Code** and **Codex**. `AGENTS.md` is the canonical shared instruction file read by both tools. Hence you are only allowed to always edit this `AGENTS.md`
- `CLAUDE.md` imports `AGENTS.md` and contains further Claude Code-specific instructions if needed. User always edits that manually
- Whenever user asks you to check a webpage component on the frontend website, NEVER be confused on the credentials and always apply these as default unless specified otherwise: **Email:** `testuser@oparax.com`, **Password:** `hello123`.
