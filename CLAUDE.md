# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in the reporter's voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → dashboard with an eve agent chat (localhost-only) and settings. (`README.md` is a symlink to this file.)

## Stack

- Next.js 16 App Router · React 19 · TypeScript strict (`@/*` → repo root) · Vercel (oparax.ai; git-push deploys, `dev` → `main` promote)
- eve `0.18.1` — the agent lives in `agent/`, mounted same-origin at `/eve/v1/*` by `withEve()` in `next.config.ts`
- AI SDK v7 (`ai ^7`, `@ai-sdk/react ^4`, `@ai-sdk/xai ^4`) · Supabase (auth only)
- Tailwind v4 (configured solely by `postcss.config.mjs`) · stock shadcn + vendored ai-elements
- pnpm (pinned via `packageManager`; a preinstall guard blocks npm/yarn) · Biome for lint/format

## Commands

- `pnpm dev` — Next.js + eve dev worker (localhost:3000) · `npx eve dev` — agent-only TUI, no frontend
- `pnpm build` — the automated gate (build alone never boots eve's worker — see the eve rule)
- `pnpm lint` / `pnpm lint:fix` / `pnpm format` — Biome

## Environment

`.env.local`, four keys (fresh-clone template: `.claude/references/supabase-auth-setup.md`):

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the three `lib/supabase/` clients |
| `XAI_API_KEY` | `@ai-sdk/xai` inside the Grok scan tool (implicit — no `process.env` read in our code) |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev only; deployed auth is Vercel OIDC) |

Keep the Vercel project env minimal — v0's sandbox auto-pulls all of it (env work → `vercel:env-vars`). Frontend test login: `testuser@oparax.com` / `hello123`.

## Structure

- `app/` — routes: landing, `(auth)/` group, `dashboard/` shell
- `agent/` — the eve agent: `agent.ts` · `instructions.md` · `tools/`
- `components/` — `ui/` (stock shadcn) + `ai-elements/` (vendored) + auth-shell/logo
- `lib/` — auth server actions, Supabase clients, helpers
- `docs/triage.md` — deferred-work backlog
- `.claude/` — `rules/` (per-area conventions, path-scoped) · `references/` (deep dives) · skills (`feature`, `lint-resolve`, `ai-elements`) · project agents
- Root files: `proxy.ts` (session refresh on every request) · `components.json` (shadcn CLI config) · `biome.json` · `postcss.config.mjs` · `pnpm-workspace.yaml` (pnpm build-script allow/deny) · `LICENSE` (AGPL-3.0)
- Gitignored runtime dirs (regenerable, delete freely when nothing is running): `.eve/` (snapshots grow unbounded), `.next/`, `.output/`, `.workflow-data/`, `data/`, `.vercel/` (CLI link)

Conventions and constraints live in `.claude/rules/` — `sessions.md` is always on; the others load when their `paths:` match.
