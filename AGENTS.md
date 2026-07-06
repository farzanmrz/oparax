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

`.env.local`, four keys — fresh-clone setup in `.claude/references/supabase-auth-setup.md`. Frontend test login: `testuser@oparax.com` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `XAI_API_KEY` | `@ai-sdk/xai` in the Grok scan tool (implicit) |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev; deployed = Vercel OIDC) |

## Code map

Top-level folders; deeper structure lives in the linked reference, read on demand.

- `agent/` — the eve agent (three files). → `.claude/references/agent.md`
- `app/` — routes: landing, auth pages, `/auth/*` callbacks, `agents/` shell (listing · `new/` chat · `[id]` details · `settings/`). → `.claude/references/app.md`
- `components/`
  - `components/ui/` — stock shadcn kit.
  - `components/ai-elements/` — chat-surface kit.
  - `components/auth-shell.tsx`, `components/logo.tsx` — the only bespoke shared components.
- `lib/` — Supabase clients + auth server actions. → `.claude/references/lib.md`
- `docs/` — `triage.md`, `agent-notes.md`, `roadmap.md` (the ordered feature flow, for reference — the one docs file that IS a slice source).
- `.claude/` — `references/` (progressive info) · `skills` · `agents`.

Gitignored, regenerable (delete freely when nothing runs): `.eve/`, `.next/`, `.output/`, `.workflow-data/`, `data/`, `.vercel/`.

## Conventions

### Skills — invoke before working in an area

| Area | Skill |
| --- | --- |
| `app/` routing, Server Components / Actions | `vercel:nextjs` |
| `components/` and any UI | `vercel:shadcn`; `ai-elements` for the chat surface |
| `lib/` Supabase & auth | `supabase:supabase` (+ `vercel:routing-middleware` for proxy/matcher changes) |
| `agent/` the eve agent | `vercel:eve` (+ `vercel:ai-sdk` for tool model code, `vercel:ai-gateway` for routing) |
| env vars (local or Vercel) | `vercel:env-vars` |
| deploys / promotes / rollbacks | `vercel:deployments-cicd` |
| repo-wide Biome findings | `lint-resolve` |

### Guards — never break

- No custom design system: compose UI only from `components/ui/` (shadcn) + `components/ai-elements/`, theme via `app/globals.css` tokens, and don't prune either kit.
- No app tables: Supabase is auth-only; local files before any schema.
- Never downgrade the AI SDK below `ai ^7` — an earlier v6 pin broke the worker boot. eve is pinned exact; upgrade deliberately, verifying by boot check.
- Boot-check any eve/dependency change (`pnpm build` never boots the worker): `pnpm dev`, Next "Ready", no `[env-runner]`/`[nitro]` failures.
- Never move or rename `app/auth/confirm/` — `/auth/confirm` is hardcoded in the Supabase email templates.

### Working

- Instruction files (this file, references) aren't changed unilaterally — but a change the user explicitly asks for IS the agreement: make it and explain the what/why; don't pause for a separate go-ahead.
- Two record files, never read as tasks and never a slice source:
  - `docs/triage.md` — capture only the user's own deferrals (scribe their words).
  - `docs/agent-notes.md` — the agent's own actionable finds, appended only when they'd otherwise be lost and announced in-session; the user prunes.

### Writing markdown

- Structure only to expose real hierarchy — under-structure beats over-structure.
- One directive per bullet; headings `#`→`####` for depth; commands/code in fenced blocks; backticks for paths; a table when items share fields.
- In this file: keep it to always-true facts and rules. Folder/file detail goes to `.claude/references/`, pulled on demand.

## Cross-tool

`AGENTS.md` is the canonical instruction file — Codex and other agents read it directly; `CLAUDE.md` is just `@AGENTS.md`. There is no `.claude/rules/`: everything that must always apply lives here, and `.claude/references/` holds progressive detail loaded only when a task needs it.
