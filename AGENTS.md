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
| Auth + DB | Supabase (auth + owner-scoped app tables — `agents`, `runs`, `drafts`) | — |
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

`.env.local`, six keys (table below); Supabase dashboard-side config (unrelated to the other two keys): `.claude/rules/supabase.md`. Frontend test login: `testuser@oparax.ai` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `XAI_API_KEY` | `lib/agent/xai.ts` — the Grok scan (chat onboarding + the headless scan runner) |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev; deployed = Vercel OIDC) |
| `CRON_SECRET` | `app/api/cron/tick/route.ts` — fail-closed `Bearer` auth for the per-minute dispatcher |
| `SUPABASE_SECRET_KEY` | `lib/supabase/admin.ts` — the service-role dispatcher client |

## Code map

- `app/` — routes: landing, auth pages, `/auth/*` callbacks, `api/chat` (the agent endpoint), `api/cron/` (the per-minute scan dispatcher), `agents/` shell (listing · `new/` chat · `[id]` desk dashboard · `settings/`).
- `components/`
    - `components/ui/` — stock shadcn kit (+ `components/hooks/`, its vendored hooks).
    - `components/ai-elements/` — chat-surface kit.
    - `components/app-sidebar.tsx`, `components/sidebar-peek.tsx`, `components/auth-shell.tsx`, `components/logo.tsx` — the bespoke shared components (app-shell chrome: sidebar + hover-peek; auth shell; brand mark).
- `lib/agent/` — the desk agent: model + tools + the save-approval gate; the headless scan runner + draft runner behind the cron dispatcher; `next-run.ts`'s timezone fire math; plus its other pure modules.
- `lib/sysprompts/` — the agent's system prompts, as markdown.
- `lib/` (root) — Supabase clients (typed by the generated `lib/supabase/database.types.ts`, including the service-role `lib/supabase/admin.ts` used only by the cron dispatcher) + auth server actions + desk render helpers (`lib/agents.ts`).
- `supabase/migrations/` — the SQL record of every applied migration (applied via the Supabase MCP, mirrored here); today's app schema is `agents`, `runs`, `drafts` (RLS owner-select; `runs` is write-only by the service-role dispatcher, `drafts` also owner-insertable).
- `docs/` — `pricing-cogs.md` is Farzan's own parked notes, not project instruction (ignore unless he points you at it); `test-handles.md` is a paste-ready handle set for manually testing the chat.
- `.claude/` — `rules/` (path-scoped guidance) · `skills/` · `agents/`.
- `.agents/skills/` — the cross-agent skills mirror (the open agent-skills ecosystem's directory; non-Claude agents read the body and ignore the Claude-only `model:` frontmatter as inert text). Symlinks **every** `.claude/skills/` entry — add a symlink when a new skill lands. Native `x-check`, `x-dm`, `lean-log`, and `stat` directories are Codex-only operational skills; Claude Code must ignore them and they must not be mirrored into `.claude/skills/`.

Gitignored, regenerable (delete freely when nothing runs): `.next/`, `data/`, `.vercel/`.

`.feature/` is the `/feature` flow's live scratch — never delete it by hand; `ship.sh` sweeps it when the slice ships.

## Conventions

- **No persistence until a data shape earns it.** App-owned schema is minimal — today `agents`, `runs`, `drafts` (RLS owner-scoped; SQL in `supabase/migrations/`). Every new table is a real feature slice (plan it), not a quick add mid-task.

### Issue labels

GitHub labels carry issue type and state — never a title prefix (no `triage:` etc.). Every `gh issue create` sets a label; every agent applies them the same way.

| Label | Meaning | Applied |
| --- | --- | --- |
| `feature` | A decided, plannable slice. | `start.sh` at the plan gate (auto). |
| `bug` | Something broken. | Whoever files it. |
| `backlog` | Marks THE single living backlog issue — the one place every deferred/"someday" item is parked. Not applied to per-item issues (there are none). | Once, on the backlog index issue. |
| `agent` | The item came from an AI agent's own analysis (a review finding, an observed defect), not a human decision. Provenance only — pairs with `bug` (agent-surfaced bugs are still their own issue), never alone. Tool-neutral (not "claude"): `gh` issues are always authored by the repo owner's token, so this label is the only machine-vs-human signal. Backlog-item provenance is instead noted inline in the backlog list (`· agent`), since backlog items are lines, not issues. | Alongside `bug` when the agent surfaced it. |

**The single living backlog (no per-item issues).** Every deferred item across all feature flows — plan Deferred (migrated at ship), mid-build out-of-scope, QC-surfaced cleanups, ship-triage backlog — is a checklist line in ONE living issue (labeled `backlog`), never its own issue. Append with `.claude/skills/feature/scripts/backlog-add.sh "<item — context; origin #<issue>; · agent if agent-surfaced>"` (it finds the issue, appends a task-list line, prints its number). When later work resolves or obsoletes an item, edit its line out of that issue's body — no opening/closing per-item issues. Farzan picks from the list; a picked item graduates into its own `/feature-plan`.

### Cross-cutting skills

| Need | Skill |
| --- | --- |
| env vars (local or Vercel) | `vercel:env-vars` |
| deploys / promotes / rollbacks | `vercel:deployments-cicd` |
| cron on Vercel | `vercel-functions` |
| repo-wide Biome findings | `feature-lint` |

## Cross-tool

- `AGENTS.md` is the canonical instruction file — non-Claude agents read it directly; `CLAUDE.md` is just `@AGENTS.md`. Path-scoped guidance lives in `.claude/rules/`.
- Proactively invoke any installed skill relevant to the current task without waiting for me to name it.
