# Project Overview

<!-- Canonical agent instructions. CLAUDE.md is a symlink to this file — edit here, both tools see it. -->

Oparax is an AI-powered social media automation tool for professional news reporters. It monitors X (Twitter) for breaking stories and drafts posts in the user's voice. The primary use case is a football news reporter with 400k+ followers on X.

## Project Structure

Next.js App Router app at the repo root.

Folder-level map — drill into a folder when a task touches it; the non-obvious gotchas are called out inline.

```text
.
├── package.json    # Deps + scripts (pnpm dev / build / lint)
├── next.config.ts  # Next.js config
├── components.json # shadcn config
├── tsconfig.json   # TypeScript config (strict, @/* alias)
├── proxy.ts        # Per-request hook that refreshes the Supabase session.
│                   # MISLEADINGLY NAMED — NOT Supabase middleware (that lives in lib/supabase/middleware.ts).
│
├── app/            # Next.js App Router
│   ├── login/, signup/, auth/, forgot-password/  # Auth flow: sign-in, sign-up + email verify, password reset
│   ├── dashboard/  # Protected area (auth guard in dashboard/layout.tsx); settings + workflow create/detail pages
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
└── scripts/        # enforce-pnpm preinstall guard + grok-search.ts + prompts.ts personal scratchpad (leave alone)
```

## Skill Invocation

These rules are mandatory and **override a skill's own description** wherever they conflict. Apply them both at the start of a chat and mid-conversation, as soon as a condition is met.

**Invoke when the condition applies:**

- `ask-questions-if-underspecified` — Invoke whenever a request is unclear: vague scope, several tasks bundled together, or a mid-conversation shift to something new. Clarify how to proceed before acting.
- `ui-standard` — Invoke before designing or editing any frontend/web UI. It defines the styling standards every UI change must follow.

**Never invoke on your own:**

- `agent-browser` — Use only when I explicitly ask for it by name. The dev server is **always already running** at `http://localhost:3000`, so navigate straight there — never run `pnpm dev`/`build` or otherwise start the server first.
- `ui-tester` — Do not invoke under any circumstances. It is a work in progress and not ready for use, even if its own description says otherwise.
