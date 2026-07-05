# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in the reporter's voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → dashboard with an eve agent chat (localhost-only) and settings.

## Stack

| Layer | Tech | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.2 |
| UI | React | 19.2 |
| Language | TypeScript strict (`@/*` → repo root) | 5 |
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

`.env.local`, four keys — fresh-clone setup in `.claude/references/supabase-auth-setup.md`. Frontend test login: `testuser@oparax.com` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `XAI_API_KEY` | `@ai-sdk/xai` in the Grok scan tool (implicit) |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev; deployed = Vercel OIDC) |

### Code map

Top-level folders; deeper structure lives in the linked reference.

- `agent/` — the eve agent (three files). Details: `.claude/references/agent.md`.
- `app/` — routes: landing, auth pages, `/auth/*` callbacks, `dashboard/` shell. Details: `.claude/references/app.md`.
- `components/`
  - `components/ui/` — stock shadcn kit.
  - `components/ai-elements/` — chat-surface kit.
  - `components/auth-shell.tsx`, `components/logo.tsx` — the only bespoke shared components.
- `lib/` — Supabase clients + auth server actions. Details: `.claude/references/lib.md`.
- `docs/` — `triage.md` (my deferrals), `agent-notes.md` (the agent's review queue).
- `.claude/` — `rules/` · `references/` · `skills/` · `agents/`.

- **Rules** (`.claude/rules/`) are always enforced, path-scoped — the behavioral layer.
- **References** (`.claude/references/`) are progressive deep-dives, pulled only when needed.
- Gitignored, regenerable (delete freely when nothing runs): `.eve/`, `.next/`, `.output/`, `.workflow-data/`, `data/`, `.vercel/`.

## Cross-tool

`AGENTS.md` is the canonical instruction file — Codex and other agents read it directly; `CLAUDE.md` is just `@AGENTS.md`. Claude Code is primary: its `.claude/rules/` are the enforced conventions other tools don't load.
