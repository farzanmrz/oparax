# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in the reporter's voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → an agent listing, a create-agent eve chat (localhost-only), and settings.

## Stack

| Layer | Tech | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.2 |
| UI | React | 19.2 |
| Language | TypeScript strict (`@/*` → repo root) | 6 |
| Agent | eve (mounted at `/eve/v1/*` by `withEve()`) | 0.19.0 |
| AI SDK | `ai` / `@ai-sdk/react` / `@ai-sdk/xai` | 7 / 4 / 4 |
| Styling | Tailwind + stock shadcn + vendored ai-elements | 4 |
| Auth | Supabase (auth only, no app tables) | — |
| Tooling | pnpm (a preinstall guard blocks npm/yarn) + Biome | — |
| Host | Vercel — oparax.ai, `dev` → `main` promote | — |

### Commands

```bash
pnpm dev        # Next.js + eve dev worker (localhost:3000)
npx eve dev     # agent-only TUI, no frontend
pnpm build      # automated gate — never boots eve's worker, so a broken worker still builds green
pnpm lint       # Biome check
pnpm lint:fix   # Biome check --write
pnpm format     # Biome format --write
```

### Environment

`.env.local`, four keys (table below); Supabase dashboard-side config (unrelated to the other two keys): `.claude/rules/supabase.md`. Frontend test login: `testuser@oparax.com` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `XAI_API_KEY` | `@ai-sdk/xai` in the Grok scan tool (implicit) |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev; deployed = Vercel OIDC) |

## Code map

- `agent/` — the eve agent (DeepSeek orchestrator + the Grok X-search scan tool).
- `app/` — routes: landing, auth pages, `/auth/*` callbacks, `agents/` shell (listing · `new/` chat · `[id]` details · `settings/`).
- `components/`
  - `components/ui/` — stock shadcn kit.
  - `components/ai-elements/` — chat-surface kit.
  - `components/auth-shell.tsx`, `components/logo.tsx` — the only bespoke shared components.
- `lib/` — Supabase clients + auth server actions.
- `docs/` — the user's own notes: `triage.md` (deferrals), `agent-notes.md` (agent-discovery review queue), `roadmap.md` (their reference ordering of the feature flow). Never a task list and never a slice source — a slice comes only from the user's ask.
- `.claude/` — `rules/` (path-scoped guidance) · `skills/` · `agents/`.

Gitignored, regenerable (delete freely when nothing runs): `.eve/`, `.next/`, `.output/`, `.workflow-data/`, `data/`, `.vercel/`.

## Conventions

- **No persistence until a data shape earns it.** Auth is Supabase's own tables only — no app-owned schema exists. Adding the first table is a real feature slice (plan it), not a quick add mid-task.
- Building a feature slice: `/feature` (spec+plan gate → issue + branch → build → QC → ship as one squashed commit to `dev`).

### Cross-cutting skills

| Need | Skill |
| --- | --- |
| env vars (local or Vercel) | `vercel:env-vars` |
| deploys / promotes / rollbacks | `vercel:deployments-cicd` |
| repo-wide Biome findings | `lint-resolve` |

## Cross-tool

`AGENTS.md` is the canonical instruction file — Codex and other agents read it directly; `CLAUDE.md` is just `@AGENTS.md`. Path-scoped guidance lives in `.claude/rules/` (auto-loads when a matching file is read) — there is no `.claude/references/`.
