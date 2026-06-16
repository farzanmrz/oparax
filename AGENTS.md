# Project Overview

Oparax is an AI news desk for reporters: it monitors their beat across X, news sites, and social platforms, catches stories as they break, drafts a post per platform in their voice, and — once trusted — posts autonomously.

- **Planned**: the reporter sets what to watch (handles + sources across X, Reddit, Bluesky, LinkedIn, Meta), what counts as news, and how they write; Oparax monitors on a schedule, merges findings into atomic news items, drafts per platform, and notifies on breaking news (email / WhatsApp / push) — post in one tap, or let trusted agents post autonomously.
- **Today**: email signup → connect X (required gate) → create an agent → Run Agent (one Grok call scans X and drafts every story) → edit the in-memory preview → Save Agent → post or redraft per item. Setup + env vars: [README.md](README.md).

# Architecture & Conventions

Next.js App Router (TS strict, `@/*`) on Vercel (oparax.ai); Supabase auth + Postgres (owner-scoped RLS); Grok (xAI) via the `openai` SDK; pnpm only. No test runner — keep `pnpm build` green; the developer verifies flows manually (hand off a checklist). **Biome** (`biome.json`) is the formatter + linter (ESLint/Prettier removed): formatting auto-applies on save / via a user-level Claude hook, or run `pnpm format` (apply) or `pnpm lint` (`biome check`) manually.

- **Pages**: landing `/` (marketing + auth modals; `/login`, `/signup`, `/forgot-password`, `/auth/reset-password` just redirect to `/?auth=…`). The signed-in app is under `/dashboard`: `connect-x` (gate shown until X is linked), `agents` (list), `agents/new` (create), `agents/[id]` (detail), `settings`. Login is email/password only; X is linked afterward purely for posting (not SSO).
- **Supabase** (project `pcgvpypzfwuchyfwdlwe` — use the MCP): the schema is NOT tracked in-repo; its shape is `lib/types/database.ts`. Four owner-scoped tables: `x_connections`, `agents`, `runs`, `run_items`. A run is an in-memory preview until Save Agent persists it; posting is always manual per item.
- **Design system**: `app/globals.css` is the source of truth (tokens in `:root` + component classes in `@layer components`) — check it before writing CSS. Internal pages render inside the graphite `WorkspaceShell` (`app/dashboard/layout.tsx`; layout CSS in `app/workspace.css`); the landing (`components/landing/`, `app/landing.css`) is the marketing reference. Source Sans 3 only; white = actions, accent blue = seasoning; UI copy is sentence case.
- **Design is a constant back-and-forth with Claude Design** (claude.ai/design): an export arrives as a full bundle containing _both_ pages already built and new ones to implement — reconcile each against the current repo, which often has local changes the export lacks (the two drift). When restyling, behavior is this repo's contract: keep server-action field `name`s, the auth/connect-x guards + `?next=` redirects, and the run → preview → save → post/redraft pipeline.
- **Gotchas**: X tokens are AES-256-GCM encrypted in `x_connections` and never sent to the browser; `proxy.ts` is just the per-request Supabase session refresh (don't touch the wrapping); no `zod` (plain `typeof` validation).
- **Biome scope**: owns JS/TS/JSON only — style is semicolons, double-quote, 2-space, 100-col. CSS is **excluded** (Tailwind v4 at-rules don't parse; PostCSS owns `globals.css`/`workspace.css`).

# Agentic Context

- **`AGENTS.md` is the canonical shared instruction file** (read by both Claude Code and Codex) and the **only** instruction file you may edit. `CLAUDE.md` merely imports it and is edited by the user manually — never touch `CLAUDE.md` unless explicitly instructed by user to do so.
- Frontend login credentials, used by default unless told otherwise: **Email** `testuser@oparax.com`, **Password** `hello123`.
