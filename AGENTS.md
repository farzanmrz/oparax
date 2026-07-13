# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in the reporter's voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → an agent listing, a create-agent chat (an AI SDK agent behind `/api/chat`, Supabase-authed, streaming), and settings.

## Stack

| Layer | Tech | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.2 |
| UI | React | 19.2 |
| Language | TypeScript strict (`@/*` → repo root) | 6 |
| Agent | AI SDK `ToolLoopAgent` (DeepSeek via AI Gateway) behind `POST /api/chat` | — |
| AI SDK | `ai` + `@ai-sdk/react` | 7 / 4 |
| Styling | Tailwind + stock shadcn + vendored ai-elements | 4 |
| Auth + DB | Supabase (auth + owner-scoped app tables — today just `agents`) | — |
| Tooling | pnpm (a preinstall guard blocks npm/yarn) + Biome | — |
| Host | Vercel — oparax.ai, `dev` → `main` promote | — |

### Commands

```bash
pnpm dev        # Next.js (localhost:3000)
pnpm build      # automated gate — compiles /api/chat but never calls it, so a broken agent still builds green
pnpm lint       # Biome check
pnpm lint:fix   # Biome check --write
pnpm format     # Biome format --write
```

### Environment

`.env.local`, four keys (table below); Supabase dashboard-side config (unrelated to the other two keys): `.claude/rules/supabase.md`. Frontend test login: `testuser@oparax.com` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `XAI_API_KEY` | `lib/agent/xai.ts` — Grok scan + handle-verify |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev; deployed = Vercel OIDC) |

## Code map

- `app/` — routes: landing, auth pages, `/auth/*` callbacks, `api/chat` (the agent endpoint), `agents/` shell (listing · `new/` chat · `[id]` details · `settings/`).
- `components/`
  - `components/ui/` — stock shadcn kit (+ `components/hooks/`, its vendored hooks).
  - `components/ai-elements/` — chat-surface kit.
  - `components/app-sidebar.tsx`, `components/sidebar-peek.tsx`, `components/auth-shell.tsx`, `components/logo.tsx` — the bespoke shared components (app-shell chrome: sidebar + hover-peek; auth shell; brand mark).
- `lib/agent/` — the desk agent: model + tools + the save-approval gate, plus its pure modules.
- `lib/sysprompts/` — the agent's system prompts, as markdown.
- `lib/` (root) — Supabase clients (typed by the generated `lib/supabase/database.types.ts`) + auth server actions + desk render helpers (`lib/agents.ts`).
- `supabase/migrations/` — the SQL record of every applied migration (applied via the Supabase MCP, mirrored here).
- `docs/` — `pricing-cogs.md` is Farzan's own parked notes, not project instruction (ignore unless he points you at it); `test-handles.md` is a paste-ready handle set for manually testing the chat.
- `.claude/` — `rules/` (path-scoped guidance) · `skills/` · `agents/`.
- `.agents/skills/` + `.codex/agents/` — the Codex-side mirrors. `.agents/skills/` symlinks **every** `.claude/skills/` entry (Codex reads the body and ignores the Claude-only `model:` frontmatter as inert text) — add a symlink when a new skill lands. `.codex/agents/` holds TOML ports of the six `.claude/agents/` workers (kept in behavioral sync — edit both or neither). Flow skills (`feature*`) are worded in Claude's tool vocabulary; Codex maps their agent references onto its own TOML workers and adapts the tool-call layer.

Gitignored, regenerable (delete freely when nothing runs): `.next/`, `data/`, `.vercel/`.

`.feature/` is the `/feature` flow's live scratch — never delete it by hand; `ship.sh` sweeps it when the slice ships.

## Conventions

- **No persistence until a data shape earns it.** App-owned schema is minimal — today a single `agents` table (RLS owner-only; SQL in `supabase/migrations/`). Every new table is a real feature slice (plan it), not a quick add mid-task.
- Building a feature slice: `/feature` orchestrates the full flow, or drive the phases individually — `/feature-plan` (the plan gate — plan is the spec — → issue + branch) → `/feature-build` → `/feature-qc` (or single passes: `/simplify`, `/code-review`, `/feature-lint`) → `/feature-ship` (triage gate → one squashed commit to `dev`).

### Issue labels

GitHub labels carry issue type and state — never a title prefix (no `triage:` etc.). Every `gh issue create` sets a label; every agent applies them the same way (this is the tool-neutral record — Codex reads it here too).

| Label | Meaning | Applied |
| --- | --- | --- |
| `feature` | A decided, plannable slice. | `start.sh` at the plan gate (auto). |
| `bug` | Something broken. | Whoever files it. |
| `backlog` | Surfaced but not yet triaged into a plan — a future slice or a someday item; the body says which. | `/feature-ship`'s triage step, or by hand. |
| `agent` | The item came from an AI agent's own analysis (a review finding, an observed defect), not a human decision. Provenance only — pairs with `backlog`/`bug`, never alone. Tool-neutral (not "claude"): `gh` issues are always authored by the repo owner's token, so this label is the only machine-vs-human signal. | Alongside another label when the agent surfaced it. |

### Cross-cutting skills

| Need | Skill |
| --- | --- |
| env vars (local or Vercel) | `vercel:env-vars` |
| deploys / promotes / rollbacks | `vercel:deployments-cicd` |
| repo-wide Biome findings | `feature-lint` |

**Inspecting Vercel state — MCP tools first, not the raw CLI.** For deployment
status, logs, project/env inspection, and even triggering a deploy, reach for the
Vercel MCP tools (`list_deployments`, `get_deployment`, `get_deployment_build_logs`,
`get_runtime_logs`, `get_runtime_errors`, `deploy_to_vercel`) — they're API calls
with no local-filesystem cost.

## Cross-tool

`AGENTS.md` is the canonical instruction file — Codex and other agents read it directly; `CLAUDE.md` is just `@AGENTS.md`. Path-scoped guidance lives in `.claude/rules/`.
