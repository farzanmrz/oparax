# Project Overview

Oparax is an AI news desk for reporters: it monitors their beat across X, news sites, and social platforms, catches stories as they break, drafts a post per platform in their voice, and — once trusted — posts autonomously.

- **Planned**: the reporter sets what to watch (handles + sources across X, Reddit, Bluesky, LinkedIn, Meta), what counts as news, and how they write; Oparax monitors on a schedule, merges findings into atomic news items, drafts per platform, and notifies on breaking news — post in one tap, or let trusted agents post autonomously.
- **Today (legacy flow — being replaced piece by piece, see The eve build)**: signup → create an agent in chat (scan → critique → Save) → `/dashboard/agents/[id]` → Run (a Grok scan retrieves news items, a DeepSeek leg drafts a post per item; completion is server-driven, so a closed tab never orphans a run) → review → post or redraft per item. **X connection is needed only to post** — everything else works without it. Setup + env vars: [README.md](README.md).

# Architecture & Conventions

Next.js App Router (TS strict, `@/*`) on Vercel (oparax.ai); Supabase auth + Postgres (owner-scoped RLS); pnpm only (pinned via `packageManager`). No test runner — `pnpm build` is the one automated gate (`pnpm lint` = Biome). **Gotcha:** `pnpm build` never boots eve's runtime worker — a dead worker builds green. Anything touching eve or its dependencies also needs a `pnpm dev` boot check (Next "Ready" + eve's dev server up, no `[env-runner]`/`[nitro]` failures).

# The eve build — read before any agent work

**We build iteratively on [eve](https://github.com/vercel/eve)** (decided 2026-07-01): one primitive at a time (instructions → tools → skills → schedules → evals), each understood before the next, with real craft going into the sysprompts. Eve is beta: pin and upgrade deliberately. The legacy flow keeps working in `dev`, untouched; nothing migrates — slices replace it piece by piece.

**Hard guards — the old system's failure modes; never break these:**

- **Never adapt to legacy code.** `lib/`, `app/` agent routes, `components/agents/` are read-only reference — never a pattern to extend, an interface to adapt to, or an import. New code lives in its own folders.
- **Never scope to the existing Supabase schema** (`agents`, `runs`, `run_items`, …). Persist the new build's data locally (plain files) until its shape earns a schema. Supabase auth/session stays as-is.
- **No roadmap lives in this file.** Plans are session-sized (see Working agreement).

**Durable facts:**

- **What exists (baseline, landed via #39):** the eve agent is exactly three files in `agent/` — `agent.ts` (DeepSeek via gateway), native `instructions.md` (chat orchestrator sysprompt), and `tools/grok_twitter_search.ts` (Grok `grok-4.3` xSearch scan, dynamic yesterday→today UTC window, scan sysprompt inline in the tool). Stock harness tools are enabled; no persistence — scan results flow back into the conversation. `withEve()` in `next.config.ts` mounts it same-origin. **The agent is built/debugged frontend-free**: `npx eve dev` (interactive TUI) or the `/eve/v1/*` HTTP API. UI: a placeholder page at `/dashboard/rebuild` ("New Agent" header) inside the dashboard shell + auth, reached via the sidebar "Rebuild" entry; the chat UI (ai-elements + `useEveAgent`) comes later.
- **AI stack (decision 2026-07-03): the AI SDK v7 family** — `ai ^7`, `@ai-sdk/react ^4`, `@ai-sdk/xai ^4` — landed as a dedicated commit on `dev`. Why: **every eve release peers `ai ^7.0.0`**; the repo's v6 pin left eve's dev worker unable to boot (missing `ai` export at `[env-runner]` init) — latent since eve was first added, surfaced the first time the runtime ran. Legacy compiles on v7 **deprecation aliases** (`toUIMessageStreamResponse`, `system:`, `totalUsage`, …); the only legacy source edit was the hard rename `stepCountIs`→`isStepCount`. The v8 alias-removal cliff and the eve 0.19 upgrade are tracked in `docs/triage.md`.
- Wiring is open for investigation — e.g. direct `@ai-sdk/xai` vs AI Gateway routing is a hypothesis to re-verify via skills/docs, not settled fact. Don't carry inherited constraints forward.
- Two sysprompts minimum: the Grok scan and the DeepSeek chat. Craft inspiration: [system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks) (e.g. [the Grok 4.3 sysprompt](https://github.com/asgeirtj/system_prompts_leaks/blob/main/xAI/grok-4.3-beta.md)).
- xSearch (verified vs docs.x.ai, 2026-07-01): the subtools (`x_keyword_search`, `x_semantic_search`, `x_user_search`, `x_thread_fetch`) run server-side at xAI with model-chosen, undocumented inputs — the sysprompt is the only lever to nudge them. Our config is only `allowedXHandles`/`excludedXHandles` (**≤10 — the `@ai-sdk/xai` schema enforces 10 even though xAI docs claim 20**; mutually exclusive, bare usernames) + day-granularity `fromDate`/`toDate`; no documented sub-day filtering.

**Open questions — explore while building, do not pre-answer:**

- How do the two legs map onto the eve agent dir — Grok scan inside a tool's `execute()`, DeepSeek chat as the agent model? Where does each sysprompt live (`instructions.md` vs tool prompt vs an eve skill)?
- When does eve's dispatcher-schedule pattern come in; what stays manual-only at first?
- Eve runs on WDK for durability — do we ever touch that layer directly?

# Working agreement — how sessions run

Known failure loop (this repo's history): scope grows mid-session → complexity disgust → a teardown that becomes its own over-scoped project. Counter it:

- One small slice per session; say what "done" means at kickoff in a sentence or two.
- Mid-session ideas are written down (issue comment or note), never built the same session. "While we're here" means stop.
- Stop-and-ship signals: adding and removing the same thing within one session; a third rework of the same surface; drafting next session's kickoff prompt.
- Instruction files (this file, skills) change only after explain → agree → edit.

# Skills — invoke by trigger, BEFORE writing code in that area

Binding. Rebuild work starts at the `eve` row; the other rows also apply *inside* eve work (model code in a tool's `execute()` → `vercel:ai-sdk`; UI around `useEveAgent` → `ai-elements`/`vercel:shadcn`).

| When the work touches… | Invoke |
| --- | --- |
| The eve agent — agent dir, `instructions.md`, tools, skills, schedules, evals, `useEveAgent` | `eve` |
| AI SDK code — `streamText`/`generateText`, tools, `useChat` (legacy, or inside eve tools) | `vercel:ai-sdk` |
| Provider routing, Gateway, model strings, failover | `vercel:ai-gateway` |
| AI-facing UI — chat surface, message/tool rendering, prompt input | `ai-elements` (standalone skill, outside the Vercel plugin) |
| Any other UI — compose from shadcn via the CLI; never reuse `components/agents/` | `vercel:shadcn` |
| Next.js routing, Server Components/Actions, route handlers, middleware | `vercel:nextjs` |
| WDK directly (eve's durability layer) — only if we drop below eve | `vercel:workflow` |
| Anything Supabase (auth, RLS, clients; schema only once the new shape earns one) | `supabase:supabase` |

# Agentic Context

- **`AGENTS.md` is the canonical shared instruction file** (read by both Claude Code and Codex) and the **only** instruction file you may edit — after discussion, per the Working agreement. `CLAUDE.md` merely imports it and is edited by the user manually; never touch it unless explicitly instructed.
- Frontend login for testing, used by default unless told otherwise: **Email** `testuser@oparax.com`, **Password** `hello123`.
