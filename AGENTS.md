# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in the reporter's voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → an agent listing, a create-agent eve chat (localhost-only), and settings.

## Stack

| Layer | Tech | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.2 |
| UI | React | 19.2 |
| Language | TypeScript strict (`@/*` → repo root) | 6 |
| Agent | eve (mounted at `/eve/v1/*` by `withEve()`) | 0.19.0 |
| AI SDK | `ai` + `@ai-sdk/react` | 7 / 4 |
| Styling | Tailwind + stock shadcn + vendored ai-elements | 4 |
| Auth | Supabase (auth only, no app tables) | — |
| Tooling | pnpm (a preinstall guard blocks npm/yarn) + Biome | — |
| Host | Vercel — oparax.ai, `dev` → `main` promote | — |

### Commands

```bash
# repo root — the Next.js app (eve mounts in; one dev server, same-origin /eve/v1/*)
pnpm dev        # Next.js + eve dev worker (localhost:3000)
pnpm build      # automated gate — never boots eve's worker, so a broken worker still builds green
pnpm lint       # Biome check
pnpm lint:fix   # Biome check --write
pnpm format     # Biome format --write

# from eve/ — the standalone eve CLI (agent + evals resolve relative to eve/)
cd eve && npx eve dev     # agent-only TUI, no frontend
cd eve && npx eve eval    # run evals against the real pipeline
```

### Environment

`.env.local`, four keys (table below); Supabase dashboard-side config (unrelated to the other two keys): `.claude/rules/supabase.md`. Frontend test login: `testuser@oparax.com` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `XAI_API_KEY` | the xAI client in `eve/agent/` — Grok scan + handle-verify |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev; deployed = Vercel OIDC) |

## Code map

- `eve/agent/` — the eve agent: DeepSeek orchestrator + Grok X-scan/verify tools, with pure shared modules under `eve/agent/lib/`.
- `eve/evals/` — eval scaffolding (judge config + fixtures).
- `app/` — routes: landing, auth pages, `/auth/*` callbacks, `agents/` shell (listing · `new/` chat · `[id]` details · `settings/`).
- `components/`
  - `components/ui/` — stock shadcn kit (+ `components/hooks/`, its vendored hooks).
  - `components/ai-elements/` — chat-surface kit.
  - `components/auth-shell.tsx`, `components/logo.tsx` — the only bespoke shared components.
- `lib/` — Supabase clients + auth server actions.
- `docs/feature/` — gitignored working specs from the `/feature` flow.
- `.claude/` — `rules/` (path-scoped guidance) · `skills/` · `agents/`.

Gitignored, regenerable (delete freely when nothing runs): `eve/.eve/`, `.next/`, `eve/.output/`, `eve/.workflow-data/`, `data/`, `.vercel/`.

## Conventions

- **No persistence until a data shape earns it.** Auth is Supabase's own tables only — no app-owned schema exists. Adding the first table is a real feature slice (plan it), not a quick add mid-task.
- Building a feature slice: `/feature` orchestrates the full flow, or drive the phases individually — `/feature-plan` (spec+plan gate → issue + branch) → `/feature-build` → `/feature-qc` (or single passes: `/simplify`, `/code-review`, `/feature-lint`) → `/feature-ship` (triage gate → one squashed commit to `dev`).

### Cross-cutting skills

| Need | Skill |
| --- | --- |
| env vars (local or Vercel) | `vercel:env-vars` |
| deploys / promotes / rollbacks | `vercel:deployments-cicd` |
| repo-wide Biome findings | `feature-lint` |

## Cross-tool

`AGENTS.md` is the canonical instruction file — Codex and other agents read it directly; `CLAUDE.md` is just `@AGENTS.md`. Path-scoped guidance lives in `.claude/rules/`.
