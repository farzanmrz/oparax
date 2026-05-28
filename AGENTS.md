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
├── hooks/          # use-mobile.ts (responsive viewport helper)
├── public/         # Static assets
├── supabase/       # Repo-tracked Supabase migrations.
└── scripts/        # enforce-pnpm preinstall guard + grok-search.ts + prompts.ts personal scratchpad (leave alone)
```

# Agentic Context

- The user alternates between both **`Claude Code`** and **`Codex`** when developing this project.
- The configuration setup across markdown files and folders is therefore kept as adaptable as possible to enable both IDEs to work seamlessly.
- **`AGENTS.md`** is the canonical instruction file both tools read — therefore it is mainly edited for all rules.
- **`CLAUDE.md`** imports `@AGENTS.md` for all rules and **SPECIFIC Claude-only instructions** can be added further in `CLAUDE.md` to prevent leaking to Codex.

## Skill Invocation

It is MANDATORY you NEVER invoke the skills mentioned below and **override a skill's own description** wherever they conflict. At the start of a chat and mid-conversation, as soon as a condition is met always make sure you never invoke the following skills since they are a work in progress and hence incomplete:

- `ui-tester` — Do not invoke under any circumstances. It is a work in progress and not ready for use, even if its own description says otherwise.
