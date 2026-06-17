# Project Overview

Oparax is an AI news desk for reporters: it monitors their beat across X, news sites, and social platforms, catches stories as they break, drafts a post per platform in their voice, and — once trusted — posts autonomously.

- **Planned**: the reporter sets what to watch (handles + sources across X, Reddit, Bluesky, LinkedIn, Meta), what counts as news, and how they write; Oparax monitors on a schedule, merges findings into atomic news items, drafts per platform, and notifies on breaking news (email / WhatsApp / push) — post in one tap, or let trusted agents post autonomously.
- **Today**: email signup → connect X (required gate) → create an agent → Run Agent (one Grok call scans X and drafts every story) → edit the in-memory preview → Save Agent → post or redraft per item. Setup + env vars: [README.md](README.md).

# Architecture & Conventions

Next.js App Router (TS strict, `@/*`) on Vercel (oparax.ai); Supabase auth + Postgres (owner-scoped RLS); pnpm only. No test runner — keep `pnpm build` green; the developer verifies flows manually (hand off a checklist). **Biome** (`biome.json`) is the formatter + linter (ESLint/Prettier removed). There is no per-edit/on-save automation — run it explicitly: `pnpm lint:fix` (`biome check --write`: format + safe lint fixes), `pnpm format` (format only), or `pnpm lint` (`biome check`, report only).

The app uses the **Vercel AI SDK (v6)** as the single LLM convention. Search-free calls (the setup chat + draft/redraft) route through the **AI Gateway** (`deepseek/deepseek-v4-flash`, with `xai/grok-4.3` as the failover model). The `x_search`-bound scan uses the **direct `@ai-sdk/xai`** provider (`xai.responses("grok-4.3")` + `xai.tools.xSearch`) because server-side tools cannot cross the Gateway. AI Elements components live in `components/ai-elements/`.

- **Pages**: landing `/` (marketing + auth modals; `/login`, `/signup`, `/forgot-password`, `/auth/reset-password` just redirect to `/?auth=…`). The signed-in app is under `/dashboard`: `connect-x` (gate shown until X is linked), `agents` (list), `agents/new` (chat-first config compiler: `useChat` + AI Elements with a form toggle), `agents/[id]` (settings + latest run + per-item post/redraft), `settings`, `usage` (admin-gated internal cost view). Login is email/password only; X is linked afterward purely for posting (not SSO).
- **Supabase** (project `pcgvpypzfwuchyfwdlwe` — use the MCP): the schema is NOT tracked in-repo; its shape is `lib/types/database.ts`. Six tables: four owner-scoped (`x_connections`, `agents`, `runs`, `run_items`) plus **`verified_x_handles`** (site-wide X-handle cache: authenticated read, service-role write) and **`api_usage_events`** (per-call cost telemetry: owner-readable, service-role write). `agents` gained schedule + source columns; agents are capped at **10 handles** (the `@ai-sdk/xai` xSearch limit). A run is an in-memory preview until Save Agent persists it; posting is always manual per item.
- **Design system**: `app/globals.css` is the source of truth (tokens in `:root` + component classes in `@layer components`) — check it before writing CSS. Internal pages render inside the graphite `WorkspaceShell` (`app/dashboard/layout.tsx`; layout CSS in `app/workspace.css`); the landing (`components/landing/`, `app/landing.css`) is the marketing reference. Source Sans 3 only; white = actions, accent blue = seasoning; UI copy is sentence case.
- **Behavior is this repo's contract when restyling**: keep server-action field `name`s, the auth/connect-x guards + `?next=` redirects, and the run → preview → save → post/redraft pipeline.
- **Gotchas**: X tokens are AES-256-GCM encrypted in `x_connections` and never sent to the browser; `proxy.ts` is just the per-request Supabase session refresh (don't touch the wrapping); **zod** authors AI-SDK schemas + tool inputs (and the `AgentConfig` object); plain `typeof` still parses HTTP request bodies in the kept routes.
- **Env vars (new)**: `X_BEARER_TOKEN` (app-only X bearer for handle verification; pay-per-use credits), `AI_GATEWAY_API_KEY` (local dev; production uses the Vercel OIDC token), `ADMIN_EMAILS` (comma-separated allowlist for `dashboard/usage`).
- **Biome scope**: owns JS/TS/JSON only — style is semicolons, double-quote, 2-space, 100-col. CSS is **excluded** (Tailwind v4 at-rules don't parse; PostCSS owns `globals.css`/`workspace.css`).

# Agentic Context

- **`AGENTS.md` is the canonical shared instruction file** (read by both Claude Code and Codex) and the **only** instruction file you may edit. `CLAUDE.md` merely imports it and is edited by the user manually — never touch `CLAUDE.md` unless explicitly instructed by user to do so.
- Frontend login credentials, used by default unless told otherwise: **Email** `testuser@oparax.com`, **Password** `hello123`.
