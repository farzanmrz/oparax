# Project Overview

Oparax is an AI-powered social media automation tool for professional news reporters. It monitors X (Twitter) for breaking stories and drafts posts in the user's voice. The primary use case is a football news reporter with 400k+ followers on X.

## Project Structure

Next.js App Router app at the repo root.

Folder-level map — drill into a folder when a task touches it; the non-obvious gotchas are called out inline.

```text
.
├── package.json    # Deps + scripts (pnpm dev / build / lint)
├── next.config.ts  # Next.js config
├── vercel.json     # Vercel config; crons EMPTY (auto-scan cron deferred — see docs/PLAN.md)
├── components.json # shadcn config
├── tsconfig.json   # TypeScript config (strict, @/* alias)
├── proxy.ts        # Per-request hook that refreshes the Supabase session.
│                   # MISLEADINGLY NAMED — NOT Supabase middleware (that lives in lib/supabase/middleware.ts).
│
├── app/            # Next.js App Router
│   ├── login/, signup/, auth/, forgot-password/  # Auth flow; auth/callback = X OAuth (link X for posting)
│   ├── dashboard/  # Protected area (auth guard in dashboard/layout.tsx); settings/ (tabbed) + agents surface
│   │   └── agents/ # Agents area (was test/): page.tsx = LIST (dashboard landing) · new/ = create (Run Agent: scan+draft → review → Save → list) · [id]/ = detail (TBD)
│   └── api/        # agents/* → scan(stream) · draft · save-agent (writes the `agents` table) · x/* → disconnect  (combined run + per-item post = TBD)
│
├── components/
│   ├── ui/         # shadcn primitives (button, card, input, table, sidebar, …)
│   ├── loop/       # agents UI + connect-x / disconnect-x (X linking) components
│   ├── settings/   # settings sections: profile, coming-soon placeholders, tab nav
│   └── *.tsx       # auth forms, sidebar/nav, dashboard page header
│
├── lib/            # Domain logic: supabase/ clients, scan/ + draft/ (Grok scan & draft pipeline), x/ (token
│                   # lifecycle + client), types/ (generated DB types + aliases), validation.ts, auth-errors.ts, utils.ts
│
├── docs/           # Spec, PRD & planning docs — all spec/PRD + ADRs + ideas live here. See decisions/0002-agent-data-model.md
├── hooks/          # use-mobile.ts (responsive viewport helper)
├── public/         # Static assets
├── supabase/       # Repo-tracked migrations. Live tables: agents, runs, run_items, x_connections
│                   # (old monitors/scans/stories/drafts/posts DROPPED in the agents-model cutover)
└── scripts/        # enforce-pnpm preinstall guard + grok-search.ts + prompts.ts personal scratchpad (leave alone)
```

**Current surface:** the **Agents page** (`app/dashboard/agents`, was `test`) is the active product — Connect X → configure agent (handles + prompts) → **Run Agent** (single Grok call: scan + draft together, one cost) → every story is drafted → review + edit → **post manually per item**. Running without saving is an in-memory **preview**; **Save Agent** persists to the `agents` table and routes to the list. **Routing:** `/dashboard/agents` = saved-agents **list** (the dashboard landing; `/dashboard` redirects here) · `/dashboard/agents/new` = the create / Run-Agent page · `/dashboard/agents/[id]` = per-agent detail (TBD). The legacy `workflows` module (pages + the 4 legacy tables) was removed 2026-05-31; `monitors/scans/stories/drafts/posts` were dropped in the agents-model cutover. Live DB tables: `agents, runs, run_items, x_connections`. **Written so far: `agents` (on Save) + `x_connections` (on Connect X); `runs`/`run_items` are NOT yet populated — they await the combined Run-Agent persistence (the next build).** Auto-scan cron deferred. Full architecture + typing decisions: `docs/decisions/0002-agent-data-model.md`; original baseline: `docs/decisions/0001-architecture.md`.

# Agentic Context

- This project is developed interchangeably in **Claude Code** and **Codex**. `AGENTS.md` is the canonical shared instruction file read by both tools. Hence you are only allowed to always edit this `AGENTS.md`
- `CLAUDE.md` imports `AGENTS.md` and contains further Claude Code-specific instructions if needed. User always edits that manually
- Whenever user asks you to check a webpage component on the frontend website, NEVER be confused on the credentials and always apply these as default unless specified otherwise: **Email:** `testuser@oparax.com`, **Password:** `hello123`.
