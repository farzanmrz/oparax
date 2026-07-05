# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in their voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → dashboard with the eve agent chat (localhost-only) and settings. Live at oparax.ai; `dev` is the working branch, `main` is production. (`README.md` is a symlink to this file — one source of truth.)

## Stack

- Next.js 16 **App Router** (never `pages/`) · React 19 · TypeScript strict (`@/*` → repo root) · deployed on Vercel
- [eve](https://github.com/vercel/eve) `0.18.1` (pinned exact, upgraded deliberately) — the agent lives in `agent/`, mounted same-origin at `/eve/v1/*` by `withEve()` in `next.config.ts`
- AI SDK v7 family (`ai ^7`, `@ai-sdk/react ^4`, `@ai-sdk/xai ^4`) — every eve release peers `ai ^7`; never downgrade (a v6 pin broke eve's worker boot)
- Supabase = auth only, no app tables · Tailwind v4 (configured solely by `postcss.config.mjs` — no tailwind.config exists) · stock shadcn + vendored ai-elements
- pnpm only (`packageManager` pin + a preinstall guard blocks npm/yarn) · Biome for lint/format

## Commands

- `pnpm dev` — Next.js + eve dev worker together (localhost:3000). Agent-only debugging: `npx eve dev` (interactive TUI, no frontend needed)
- `pnpm build` — the one automated gate. **Gotcha: build never boots eve's runtime worker — a dead worker builds green.** Anything touching eve or its deps also needs a `pnpm dev` boot check (Next "Ready", no `[env-runner]`/`[nitro]` failures)
- `pnpm lint` / `pnpm lint:fix` / `pnpm format` — Biome

## Environment

Four keys, all in `.env.local` (gitignored; fresh-clone template in `.claude/references/supabase-auth-setup.md`):

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the three `lib/supabase/` clients |
| `XAI_API_KEY` | `@ai-sdk/xai` inside the Grok scan tool (read implicitly by the SDK — no `process.env` in our code) |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev only; deployed gateway auth is Vercel OIDC) |

Keep the Vercel project env minimal — v0's sandbox auto-pulls all of it. Env work → `vercel:env-vars` skill. Frontend test login: `testuser@oparax.com` / `hello123`.

## Repo map

Each area's own `CLAUDE.md` carries its details + skills, loading automatically when you work there:

- `app/` — routes: landing, `(auth)/` group, dashboard shell → `app/CLAUDE.md`
- `agent/` — the eve agent, compiled from files on disk → `agent/CLAUDE.md`
- `components/` — `ui/` (stock shadcn) + `ai-elements/` (vendored) + two shared pieces → `components/CLAUDE.md`
- `lib/` — auth server actions, Supabase clients, helpers → `lib/CLAUDE.md`
- `docs/triage.md` — deferred-work parking lot; mid-session ideas go here, never built the same session
- `.claude/` — project agents (planner, implementer, task-reviewer), skills (`feature`, `lint-resolve`, `ai-elements`), `references/` (longer reference docs), `launch.json` (preview dev-server config)

Root files (all load-bearing — audited 2026-07-04):

- `proxy.ts` — refreshes the Supabase session on every request (Next 16's renamed middleware)
- `vercel.json` — security headers + `*.vercel.app` → oparax.ai canonical redirects (nothing else sets these)
- `components.json` — shadcn CLI config (style, aliases, css entry); the CLI reads it on every `add`
- `biome.json` · `postcss.config.mjs` (Tailwind v4's only config point) · `pnpm-workspace.yaml` (pnpm build-script allow/deny lists) · `LICENSE` (AGPL-3.0)

Runtime dirs (gitignored, regenerable, never commit; safe to delete when nothing is running): `.eve/` (dev worker state — its snapshots grow unbounded, delete periodically), `.next/`, `.output/`, `.workflow-data/` + `data/` (WDK run store), `.vercel/` (CLI link metadata).

## Rules

- **No custom design system.** Compose UI from stock shadcn + the vendored ai-elements only; theme changes via `app/globals.css` tokens — no bespoke CSS classes, no new design primitives. Design iteration happens in v0, function here; `dev` is the meeting point.
- **No persistence until a data shape earns it.** Plain local files first; Supabase stays auth-only.
- Multi-step features go through `/feature` (explicit invocation only); minor iteration directly on `dev` — small commits, boot check before push.
- Instruction files (this one, nested CLAUDE.md files, skills) change only after explain → agree → edit.

## Skills

Each nested `CLAUDE.md` names the skills for its area — invoke them BEFORE writing code there. Cross-cutting, invocable from anywhere:

| Work | Skill |
| --- | --- |
| Env vars (local or Vercel project) | `vercel:env-vars` |
| Deploys, promotes, rollbacks, domains | `vercel:deployments-cicd` |
| Repo-wide Biome lint findings | `lint-resolve` |

Longer reference docs live in `.claude/references/` — currently `supabase-auth-setup.md` (Supabase email templates, redirect URLs, fresh-clone env).

## License

AGPL-3.0 — see [LICENSE](LICENSE).
