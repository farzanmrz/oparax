# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in the reporter's voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → an agent listing, a create-agent eve chat (localhost-only), and settings.

## Current Focus

Active slice: **issue #44 on `ft/44`** — get the create-agent chat conversation working end-to-end on the **local chat only**. No persistence, no schema, no channel auth this slice. (Remove/replace this section when #44 ships.)

Already pre-set on `dev` (verify, then build on — do NOT redo): grok tool returns its full output for debugging; DeepSeek `reasoning` explicitly ON + cheapest-cost gateway routing; DeepSeek passes `fromDate`/`toDate` to the grok tool (dates no longer computed in the tool); `web_fetch` enabled and the shell/FS default tools disabled.

To do in `ft/44`:

- Expand `agent/instructions.md` from scan-only to the full flow — understand the beat → scan setup (web + X handles) → drafting (voice, per-platform format) → scan frequency. System prompt, not a state machine.
- Add explicit output-format rules to the system prompt (short sentences, no em-dash rambling, a fixed structure for listing found tweets and for showing drafts) with a concrete example. → `.claude/references/prompt-authoring.md`.
- **Foreign-language sources**: detect and translate/understand non-English tweets AND pasted articles (real user ask — paste a Spanish link → formatted English draft).
- Tune the grok tool `SYSTEM_PROMPT` for on-beat results after inspecting its full output.
- Decide the reasoning default empirically (on vs `none` vs adaptive) once evals exist — measure, don't guess. → `.claude/references/eval-notes.md`.
- Stand up 2–3 flow evals in `evals/` (they need no persistence).

Facts to build on:

- `web_search` works with `deepseek-v4-flash`: eve routes it to Parallel AI via the gateway (gateway-executed, ~$5/1k) — available for web scanning. Footgun: keep the `agent/agent.ts` model a **plain gateway string**; a source-backed model reference makes eve silently drop `web_search`.
- Verify DeepSeek passes a **correct** `toDate`/`fromDate` — it may not know "today"; if scans come back empty, that's the likely cause, so inject the live date (dynamic instructions).

Out of scope (later slices, in order): Save persistence + Supabase schema (wire the listing/details pages to real data) → eve channel-auth for the deployed chat (currently 401s) → notifications → scheduled scans.

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

## Cross-tool

`AGENTS.md` is the canonical instruction file — Codex and other agents read it directly; `CLAUDE.md` is just `@AGENTS.md`. There is no `.claude/rules/`: everything that must always apply lives here, and `.claude/references/` holds progressive detail loaded only when a task needs it.
