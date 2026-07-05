# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in their voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → dashboard with the eve agent chat (localhost-only) and settings. Live at oparax.ai; `dev` is the working branch, `main` is production.

## Stack

- Next.js App Router (TS strict, `@/*` imports) on Vercel; root `proxy.ts` refreshes the Supabase session on every request
- [eve](https://github.com/vercel/eve) `0.18.1` (pinned exact, upgraded deliberately) — the agent lives in `agent/`, mounted same-origin by `withEve()` in `next.config.ts`
- AI SDK v7 family (`ai ^7`, `@ai-sdk/react ^4`, `@ai-sdk/xai ^4`) — every eve release peers `ai ^7`; never downgrade (a v6 pin broke eve's worker boot)
- Supabase = auth only, no app tables; pnpm only (pinned via `packageManager`); Biome for lint/format

## Commands & env

- `pnpm dev` — Next.js + eve dev worker together. Agent-only debugging: `npx eve dev` (interactive TUI, no frontend needed)
- `pnpm build` — the one automated gate. **Gotcha: build never boots eve's runtime worker — a dead worker builds green.** Anything touching eve or its deps also needs a `pnpm dev` boot check (Next "Ready", no `[env-runner]`/`[nitro]` failures)
- `pnpm lint` — Biome

Env vars: see [README.md](README.md). Frontend test login (default unless told otherwise): `testuser@oparax.com` / `hello123`.

## Repo map

Each area's own `CLAUDE.md` has the details — read it when working there.

- `app/` — routes: landing, auth pages/callbacks, dashboard shell → `app/CLAUDE.md`
- `agent/` — the eve agent (eve compiles this dir from files on disk) → `agent/CLAUDE.md`
- `components/` — `ui/` (stock shadcn) + `ai-elements/` (vendored kit) + two shared pieces → `components/CLAUDE.md`
- `lib/` — auth server actions, Supabase clients, helpers → `lib/CLAUDE.md`
- `docs/triage.md` — deferred-work parking lot; mid-session ideas go here, never built the same session
- Runtime dirs (gitignored, regenerable, never commit; safe to delete when nothing is running): `.eve/` (dev worker state; its `dev-runtime/snapshots` grows unbounded — delete periodically), `.output/`, `.workflow-data/` + `data/`

## Rules

- **No custom design system.** Compose UI from stock shadcn + the vendored ai-elements only; theme changes go through `app/globals.css` tokens — no bespoke CSS classes, no new design primitives. Design iteration happens in v0, function in Claude Code; `dev` is the meeting point.
- **No persistence until a data shape earns it.** Plain local files first; Supabase stays auth-only.
- Multi-step features go through `/feature` (explicit invocation only); minor iteration happens directly on `dev` with small commits and a boot check before push.
- This file and the nested `CLAUDE.md` files change only after explain → agree → edit.

## Skills — invoke by trigger, BEFORE writing code in that area

Binding. Eve work starts at the `vercel:eve` row; the other rows also apply *inside* eve work (model code in a tool's `execute()` → `vercel:ai-sdk`; UI around `useEveAgent` → `ai-elements`/`vercel:shadcn`).

| When the work touches… | Invoke |
| --- | --- |
| The eve agent — agent dir, `instructions.md`, tools, skills, schedules, evals, `useEveAgent` | `vercel:eve` |
| AI SDK code — `streamText`/`generateText`, tools, or inside eve tools | `vercel:ai-sdk` |
| Provider routing, Gateway, model strings, failover | `vercel:ai-gateway` |
| AI-facing UI — chat surface, message/tool rendering, prompt input | `ai-elements` (standalone skill) |
| Any other UI — compose from stock shadcn via the CLI | `vercel:shadcn` |
| Next.js routing, Server Components/Actions, route handlers, middleware | `vercel:nextjs` |
| WDK directly (eve's durability layer) — only if we drop below eve | `vercel:workflow` |
| Anything Supabase (auth, clients; schema only once a shape earns one) | `supabase:supabase` |
