# Project Overview

Oparax is an AI agent for news reporters: it monitors their beat across X, news websites, and social platforms, catches stories as they break, drafts a post for each platform in their voice, and — once trusted — posts autonomously.

**Planned**: the reporter tells Oparax what to watch (X handles, news sites, accounts across Reddit, Bluesky, LinkedIn, and Meta's platforms), what counts as news on their beat, and how they write. It monitors in the background at the cadence they set, separates findings into atomic news items (recognizing shared stories across sources), drafts each item per destination platform in their voice, and notifies the moment something breaks (email / WhatsApp / push) — post in one tap, or let trusted agents post autonomously and notify after the fact.

**Today**: email signup → connect X (required gate) → create an agent (handles, what counts as news, drafting instructions, example tweets) → Run Agent: one Grok call scans X and drafts every story it finds → review/edit the in-memory preview → Save Agent → post or redraft per item. Setup and env vars: [README.md](README.md).

# Architecture & Conventions

Next.js App Router (TypeScript strict, `@/*` alias) on Vercel (oparax.ai); Supabase auth + Postgres with owner-scoped RLS; Grok (xAI) via the `openai` SDK at `https://api.x.ai/v1`; pnpm only. No test runner — keep `pnpm build` + `pnpm lint` green; the developer verifies flows manually (hand off a checklist).

- **Auth**: email/password is the only login; X is linked afterward purely for posting (not SSO). All auth UI lives in the landing-page modals — `/login`, `/signup`, `/forgot-password`, `/auth/reset-password` are thin redirects to `/?auth=...`; `app/auth/confirm` handles email links (verify → login modal, no auto-login; recovery token consumed only on reset submit); `app/auth/callback` is the X OAuth return.
- **X tokens**: captured once in the callback, stored AES-256-GCM encrypted in `x_connections` (key `X_TOKEN_ENC_KEY`), self-refreshed by `lib/x/tokens.ts`; never sent to the browser.
- **`proxy.ts`** is misleadingly named — it's the per-request Supabase session refresh (wraps `lib/supabase/middleware.ts`); don't touch the wrapping.
- **Grok pipeline**: one streamed scan+draft call with strict JSON schemas (`lib/scan/`, `lib/draft/`); system prompts live in code (`lib/scan/prompt.ts`, `lib/draft/prompt.ts`); run cost is read from xAI's response. Tweets are capped at 280 *weighted* chars via `twitter-text` — enforced in code, never as a DB constraint. No `zod` (plain `typeof` validation); tweet embeds use `react-tweet` against our auth-gated proxy `app/api/tweet/[id]`.
- **Data**: schema is NOT tracked in-repo (managed via Supabase dashboard/MCP); the shape is the generated types in `lib/types/database.ts`. Four owner-scoped tables: `x_connections` · `agents` (saved config; cron columns are inert placeholders) · `runs` (one row + one `cost_usd` per Run Agent) · `run_items` (story + draft + post state; `agent_id` denormalized for one-hop RLS). A run is an in-memory preview until Save Agent persists agent + run + items; posting is always manual per item. X ids are `text` (JSON numbers round past 2^53); money is `numeric`; posted items must survive any future run pruning.
- **Design system**: `app/globals.css` is the source of truth — tokens in `:root` (mirrored as Tailwind utilities) and reusable component classes in `@layer components`; check there before writing new CSS. The landing page (`components/landing/`) is the living reference. Source Sans 3 is the only font; logo = inline orbit mark (`components/logo.tsx`) with a plain-text wordmark. White = actions, accent blue = seasoning; forms: label above field, red errors on blur, submit disabled until filled; pages keep only their own layout CSS (e.g. `app/landing.css`); UI copy is plain sentence case.
- **UI redesign**: pages are redesigned one at a time in Claude Design — the look is reinvented freely, but behavior is this repo's contract: keep server-action field `name`s, the auth/connect-x guards and `?next=` redirects, and the run → preview → save → post/redraft pipeline. Never build new UI on the quarantined legacy shadcn pieces (`components/ui/`); delete legacy consumers as each page lands.

# Agentic Context

- This project is developed interchangeably in **Claude Code** and **Codex**. `AGENTS.md` is the canonical shared instruction file read by both tools. Hence you are only allowed to always edit this `AGENTS.md`
- `CLAUDE.md` imports `AGENTS.md` and contains further Claude Code-specific instructions if needed. User always edits that manually
- Whenever user asks you to check a webpage component on the frontend website, NEVER be confused on the credentials and always apply these as default unless specified otherwise: **Email:** `testuser@oparax.com`, **Password:** `hello123`.
