# Project Overview

Oparax is an AI news desk for reporters: it monitors their beat across X, news sites, and social platforms, catches stories as they break, drafts a post per platform in their voice, and — once trusted — posts autonomously.

- **Planned**: the reporter sets what to watch (handles + sources across X, Reddit, Bluesky, LinkedIn, Meta), what counts as news, and how they write; Oparax monitors on a schedule, merges findings into atomic news items, drafts per platform, and notifies on breaking news (email / WhatsApp / push) — post in one tap, or let trusted agents post autonomously.
- **Today**: email signup → create an agent in chat (describe the beat → scan → critique to re-scan or re-draft → Save) → open it at `/dashboard/agents/[id]` → Run (a Grok scan retrieves news **items**, then a separate DeepSeek leg drafts a post per item; completion is server-driven, so a closed tab never orphans the run) → review the drafted stories → post or redraft per item. **X is optional everywhere except posting**: create / save / run / scan / draft / redraft all work with no X connection — connecting X (mid-chat, at post-intent, or from Settings) is needed only to post a tweet. Setup + env vars: [README.md](README.md).

# Architecture & Conventions

Next.js App Router (TS strict, `@/*`) on Vercel (oparax.ai); Supabase auth + Postgres (owner-scoped RLS); pnpm only (pinned via `packageManager: pnpm@10.28.2`). No test runner 

# Agentic Context

- **`AGENTS.md` is the canonical shared instruction file** (read by both Claude Code and Codex) and the **only** instruction file you may edit. `CLAUDE.md` merely imports it and is edited by the user manually. Never touch `CLAUDE.md` unless explicitly instructed by user to do so.
- Frontend login credentials, used by default unless told otherwise: **Email** `testuser@oparax.com`, **Password** `hello123`.
