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
│   ├── dashboard/  # Protected area (auth guard in dashboard/layout.tsx); settings/ (tabbed) + the prompt lab
│   │   └── test/   # THE PROMPT LAB (components/loop/prompt-lab.tsx): scan → pick story → draft → post a real tweet
│   └── api/        # test/* → prompt-lab scan(stream)/draft/post · x/* → disconnect (legacy scan/draft/cron removed)
│
├── components/
│   ├── ui/         # shadcn primitives (button, card, input, table, sidebar, …)
│   ├── loop/       # prompt-lab + connect-x / disconnect-x (X linking) components
│   ├── settings/   # settings sections: profile, coming-soon placeholders, tab nav
│   └── *.tsx       # auth forms, sidebar/nav, dashboard page header
│
├── lib/            # Domain logic: supabase/ clients, scan/ + draft/ (Grok scan & draft pipeline), x/ (token
│                   # lifecycle + client), types/ (generated DB types + aliases), validation.ts, auth-errors.ts, utils.ts
│
├── docs/           # Spec, PRD & planning docs (e.g. SPEC.md) — all spec/PRD documentation lives here.
├── hooks/          # use-mobile.ts (responsive viewport helper)
├── public/         # Static assets
├── supabase/       # Repo-tracked migrations. Live tables: x_connections, monitors, scans, stories, drafts, posts
└── scripts/        # enforce-pnpm preinstall guard + grok-search.ts + prompts.ts personal scratchpad (leave alone)
```

**Current surface:** the **prompt lab** (`app/dashboard/test`) is the active product — Connect X → scan → draft → post a real tweet. The legacy `workflows` module (pages + the 4 `workflows/triggers/scan_runs/scan_items` tables) was removed 2026-05-31. Auto-scan cron is scoped to **scan-only** and deferred. Full status in `docs/`.

# Agentic Context

- This project is developed interchangeably in **Claude Code** and **Codex**. `AGENTS.md` is the canonical shared instruction file read by both tools. Hence you are only allowed to always edit this `AGENTS.md`
- `CLAUDE.md` imports `AGENTS.md` and contains further Claude Code-specific instructions if needed. User always edits that manually
- Whenever user asks you to check a webpage component on the frontend website, NEVER be confused on the credentials and always apply these as default unless specified otherwise: **Email:** `testuser@oparax.com`, **Password:** `hello123`.
