# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in the reporter's voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → dashboard with an eve agent chat (localhost-only) and settings. (`README.md` is a symlink to this file.)

## Stack

- Next.js 16 App Router · React 19 · TypeScript strict (`@/*` → repo root) · Vercel (oparax.ai; git-push deploys, `dev` → `main` promote)
- eve `0.19.0` — the agent lives in `agent/`, mounted same-origin at `/eve/v1/*` by `withEve()` in `next.config.ts`
- AI SDK v7 (`ai ^7`, `@ai-sdk/react ^4`, `@ai-sdk/xai ^4`) · Supabase (auth only)
- Tailwind v4 · shadcn/ui · vendored ai-elements · Biome · pnpm (a preinstall guard blocks npm/yarn)

## Commands

- `pnpm dev` — Next.js + eve dev worker (localhost:3000) · `npx eve dev` — agent-only TUI, no frontend
- `pnpm build` — the automated gate; it never boots eve's worker, so a broken worker still builds green
- `pnpm lint` / `pnpm lint:fix` / `pnpm format` — Biome

## Environment

`.env.local`, four keys (fresh-clone template: `.claude/references/supabase-auth-setup.md`):

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the three `lib/supabase/` clients |
| `XAI_API_KEY` | `@ai-sdk/xai` inside the Grok scan tool (implicit — no `process.env` read in our code) |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev only; deployed auth is Vercel OIDC) |

Frontend test login: `testuser@oparax.com` / `hello123`.

## Code map

- `app/` — routes: landing (`page.tsx`), auth pages + `/auth/*` callbacks, `dashboard/` shell
- `agent/` — the eve agent: `agent.ts` · `instructions.md` · `tools/`
- `components/` — `ui/` · `ai-elements/` · `auth-shell.tsx` · `logo.tsx`
- `lib/` — auth server actions · Supabase clients · helpers
- `docs/triage.md` — the user's deferral notebook; the agent writes here only to capture the user's own deferrals, never reads it as tasks
- `docs/agent-notes.md` — the agent's review queue: its own actionable discoveries (announced in-session), for the user to prune/promote; never read as tasks
- Gitignored, regenerable (delete freely when nothing runs): `.eve/` (snapshots grow unbounded), `.next/`, `.output/`, `.workflow-data/`, `data/`, `.vercel/`
