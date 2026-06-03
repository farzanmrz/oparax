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
│   ├── dashboard/  # Protected area (auth guard in dashboard/layout.tsx); connect-x gate, settings, agents surface
│   │   ├── connect-x/ # Required X-linking gate before creating agents; redirects back via ?next=...
│   │   └── agents/ # page.tsx = LIST · new/ = create (Run Agent: scan+draft → review → Save) · [id]/ = manual run/redraft/post detail
│   └── api/        # agents/* → scan(stream preview) · save-agent (agents+runs+run_items) · [id]/run · run-items post/redraft · x/* → disconnect
│
├── components/
│   ├── ui/         # shadcn primitives (button, card, input, table, sidebar, …)
│   ├── hooks/      # shadcn `hooks` alias target (components.json) → use-mobile.ts, REQUIRED by ui/sidebar.tsx
│   ├── loop/       # agents UI + connect-x / disconnect-x (X linking) components
│   ├── settings/   # settings sections: profile, coming-soon placeholders, tab nav
│   └── *.tsx       # auth forms, sidebar/nav, dashboard page header
│
├── lib/            # Domain logic: supabase/ clients, scan/ + draft/ (Grok scan & draft pipeline), x/ (token
│                   # lifecycle + client), types/ (generated DB types + aliases), validation.ts, auth-errors.ts, utils.ts
│
├── docs/           # Spec, PRD & planning docs — all spec/PRD + ADRs + ideas live here. See decisions/0002-agent-data-model.md
│                   # UI revamp: docs/design-workflow.md = Claude Design ↔ Claude Code loop (design=greenfield/Claude Design, behavior=brownfield/this repo).
│                   # The `ui-standard` skill was RETIRED 2026-06-03 — it encoded the old look now being replaced.
└── public/         # Static assets
```

DB schema is NOT tracked in-repo (the `supabase/migrations` folder was removed 2026-06-01) — the database is managed via the Supabase MCP/dashboard. Current shape lives in `lib/types/database.ts` (generated types) + `docs/decisions/0002-agent-data-model.md`. Live tables: `agents, runs, run_items, x_connections`. The `scripts/` scratchpad folder was also removed; the pnpm-only guard now runs inline via `preinstall: npx -y only-allow pnpm` (no committed script file).

# Agentic Context

- This project is developed interchangeably in **Claude Code** and **Codex**. `AGENTS.md` is the canonical shared instruction file read by both tools. Hence you are only allowed to always edit this `AGENTS.md`
- `CLAUDE.md` imports `AGENTS.md` and contains further Claude Code-specific instructions if needed. User always edits that manually
- Whenever user asks you to check a webpage component on the frontend website, NEVER be confused on the credentials and always apply these as default unless specified otherwise: **Email:** `testuser@oparax.com`, **Password:** `hello123`.
