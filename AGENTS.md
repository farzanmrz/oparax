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
| Auth + DB | Supabase (auth + owner-scoped app tables — `agents`, `runs`, `drafts`, `x_accounts`) | — |
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

`.env.local`, eight keys (table below); Supabase dashboard-side config (unrelated to the other two keys): `.claude/rules/supabase.md`. Frontend test login: `testuser@oparax.ai` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `XAI_API_KEY` | `lib/agent/xai.ts` — the Grok scan (chat onboarding + the headless scan runner) |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev; deployed = Vercel OIDC) |
| `CRON_SECRET` | `app/api/cron/tick/route.ts` — fail-closed `Bearer` auth for the per-minute dispatcher |
| `SUPABASE_SECRET_KEY` | `lib/supabase/admin.ts` — the service-role dispatcher client |
| `X_CLIENT_ID` + `X_CLIENT_SECRET` | `lib/x/api.ts` — X OAuth2 confidential-client credentials (link flow + posting) |

## Code map

- `app/` — routes: landing, auth pages, `/auth/*` callbacks (including `app/auth/x/*`, the X OAuth link + callback), `api/chat` (the agent endpoint), `api/cron/` (the per-minute scan dispatcher), `agents/` shell (listing · `new/` chat · `[id]` desk dashboard, incl. the Drafts tab's Connect-X + post-to-X controls · `settings/`).
- `components/`
    - `components/ui/` — stock shadcn kit (+ `components/hooks/`, its vendored hooks).
    - `components/ai-elements/` — chat-surface kit.
    - `components/app-sidebar.tsx`, `components/sidebar-peek.tsx`, `components/auth-shell.tsx`, `components/logo.tsx` — the bespoke shared components (app-shell chrome: sidebar + hover-peek; auth shell; brand mark).
- `lib/agent/` — the desk agent: model + tools + the save-approval gate; the headless scan runner + draft runner behind the cron dispatcher; `next-run.ts`'s timezone fire math; plus its other pure modules.
- `lib/x/` — the X integration — `api.ts` (raw-fetch OAuth2 + post client), `store.ts` (service-role token store for `x_accounts`; tokens never leave this dir), `link-state.ts` (`getXLinkState()`), `actions.ts` (`postDraftToX`/`unlinkXAccount`).
- `lib/voice/` — the voice pipeline's pure functions, ported from the gitignored `.voice-lab/`: `deploy-guide.ts` (strips extractor-verification sections before a guide becomes a drafting prompt — 16.1% off every draft) and `measured-facts.ts` (computes the guide's measurable half — length/emoji/hashtag/punctuation frequencies — so the extractor can't miss sparse habits).
- `lib/sysprompts/` — the agent's system prompts, as markdown.
- `lib/` (root) — Supabase clients (typed by the generated `lib/supabase/database.types.ts`, including the service-role `lib/supabase/admin.ts`, used by every path that must write rows no user session can — the cron dispatcher, the `[id]` desk actions, and `lib/x/`'s token store + post/unlink actions) + auth server actions + desk render helpers (`lib/agents.ts`).
- `supabase/migrations/` — the SQL record of every applied migration (applied via the Supabase MCP, mirrored here); today's app schema is `agents`, `runs`, `drafts`, `x_accounts` (RLS owner-select; `runs` is write-only by the service-role dispatcher, `drafts` also owner-insertable and now carries post-outcome columns — `posted_at`, `posted_tweet_id`, `posted_url` — stamped by the service-role client after an RLS ownership check; `x_accounts` has RLS enabled with zero policies, deny-all — read/written only by the service-role client).
- `docs/` — `pricing-cogs.md` is Farzan's own parked notes, not project instruction (ignore unless he points you at it); `test-handles.md` is a paste-ready handle set for manually testing the chat.
- `.claude/` — `rules/` (path-scoped guidance) · `skills/` · `agents/` · `workflows/` · `hooks/` (see Formatting below).
- `.agents/skills/` — the cross-agent skills mirror (the open agent-skills ecosystem's directory; non-Claude agents read the body and ignore the Claude-only `model:` frontmatter as inert text). Symlinks **every** `.claude/skills/` entry — add a symlink when a new skill lands. Native `x-check`, `x-recheck`, `x-dm`, `x-stat`, and `lean-log` directories are separate Codex workflow skills, outside Claude Code's orchestration and push scope; Claude Code must ignore them and must not mirror or include them when pushing its own work. These five skills always execute inline in the current Codex task and must never delegate to a custom agent; select the desired model in the task before invoking them.

Gitignored, regenerable (delete freely when nothing runs): `.next/`, `data/`, `.vercel/`.

`.feature/` is the `/feature` flow's live scratch — never delete it by hand; `ship.sh` sweeps it when the slice ships.

## Conventions

- **Formatting is automatic — never run it by hand.** A `PostToolUse(Edit|Write)` hook
  (`.claude/hooks/biome-write.sh`, wired in `.claude/settings.json`) runs `biome check
  --write` on every file as it's written, in this session and in every sub-agent. Don't
  run `pnpm format` / `pnpm lint:fix` in bulk to "clean up" — it's already done, and a
  bulk pass only adds churn to the diff. `pnpm lint` stays useful as a read-only check.
  Only the residual Biome won't auto-fix (no-fix or `--unsafe` rules) needs a human or an
  agent: that's `feature-lint`'s job.
- **No persistence until a data shape earns it.** App-owned schema is minimal — today `agents`, `runs`, `drafts`, `x_accounts` (RLS owner-scoped, except `x_accounts` which is deny-all — service-role-only credential storage; SQL in `supabase/migrations/`). Every new table is a real feature slice (plan it), not a quick add mid-task.

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
