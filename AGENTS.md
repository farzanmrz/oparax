# Project Overview

Oparax is an AI-powered social media automation tool for professional news reporters. It monitors X (Twitter) for breaking stories and drafts posts in the user's voice. The primary use case is a football news reporter with 400k+ followers on X.

## Project Structure

Next.js App Router app at the repo root.

Folder-level map — drill into a folder when a task touches it; the non-obvious gotchas are called out inline.

```text
.
├── package.json    # Deps + scripts (pnpm dev / build / lint)
├── next.config.ts  # Next.js config
├── vercel.json     # Vercel cron configuration.
├── components.json # shadcn config
├── tsconfig.json   # TypeScript config (strict, @/* alias)
├── proxy.ts        # Per-request hook that refreshes the Supabase session.
│                   # MISLEADINGLY NAMED — NOT Supabase middleware (that lives in lib/supabase/middleware.ts).
│
├── app/            # Next.js App Router
│   ├── login/, signup/, auth/, forgot-password/  # Auth flow: sign-in, sign-up + email verify, password reset
│   ├── dashboard/  # Protected area (auth guard in dashboard/layout.tsx); settings + workflow create/detail pages
│   │   └── test/   # Minimal Grok prompt-testing workflow pages; mirrors shell scan output for iteration.
│   └── api/        # scan/route.ts → streams Grok x_search over SSE; draft/route.ts → generates draft tweets
│
├── components/
│   ├── ui/         # shadcn primitives (button, card, input, table, sidebar, …)
│   └── *.tsx       # App components: auth forms, sidebar/nav, and the workflow drafting studio + its panels/stepper
│
├── lib/            # Domain logic: supabase/ clients, xai.ts (Grok client = openai SDK @ api.x.ai), prompts.ts,
│                   # workflow-drafting.ts, scan-constraints.ts, validation.ts, auth-errors.ts, utils.ts (cn helper)
│
├── docs/           # Spec, PRD & planning docs (e.g. SPEC.md) — all spec/PRD documentation lives here.
├── hooks/          # use-mobile.ts (responsive viewport helper)
├── public/         # Static assets
├── supabase/       # Repo-tracked Supabase migrations.
└── scripts/        # enforce-pnpm preinstall guard + grok-search.ts + prompts.ts personal scratchpad (leave alone)
```

# Agentic Context

- This project is developed interchangeably in **Claude Code** and **Codex**. `AGENTS.md` is the canonical shared instruction file read by both tools. Hence you are only allowed to always edit this `AGENTS.md`
- `CLAUDE.md` imports `AGENTS.md` and contains further Claude Code-specific instructions if needed. User always edits that manually
- Whenever user asks you to check a webpage component on the frontend website, NEVER be confused on the credentials and always apply these as default unless specified otherwise: **Email:** `testuser@oparax.com`, **Password:** `hello123`.
