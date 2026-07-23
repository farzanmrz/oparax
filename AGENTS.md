# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in the reporter's voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → a feed-first desk workspace — a site header (desk switcher + account menu), each desk's Feed / Voice / Setup sections, one-click council expansion on every draft, post-to-X behind a confirm, a create-desk form, and settings. (The old create-agent chat behind `/api/chat` still compiles but is no longer linked from the UI — D10.)

## Stack

| Layer | Tech | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.2 |
| UI | React | 19.2 |
| Language | TypeScript strict (`@/*` → repo root) | 6 |
| Agent | AI SDK `ToolLoopAgent` (DeepSeek via AI Gateway) behind `POST /api/chat` | — |
| AI SDK | `ai` + `@ai-sdk/react` | 7 / 4 |
| Styling | Tailwind + stock shadcn + vendored ai-elements | 4 |
| Auth + DB | Supabase (auth + owner-scoped app tables — `experiments`, `voice_guides`, `source_posts`, `post_drafts`, `model_calls`, `usage_events`, `x_accounts`; the legacy `agents`/`runs`/`drafts` tables still exist but no live code path reads them — D15) | — |
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

`.env.local`, fifteen keys (table below); Supabase dashboard-side config (unrelated to the other two keys): `.claude/rules/supabase.md`. Frontend test login: `testuser@oparax.ai` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `XAI_API_KEY` | `lib/agent/xai.ts` — Grok, reachable only via the orphaned onboarding chat's `oparax_x_search` tool (the headless scan runner was deleted — D15) |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev; deployed = Vercel OIDC) |
| `CRON_SECRET` | **retired** — the per-minute cron dispatcher (`app/api/cron/tick`) was deleted (D15); the ingestion worker replaced polling, so no code consumes this key now |
| `SUPABASE_SECRET_KEY` | `lib/supabase/admin.ts` — the service-role client (the draft pipeline, the `[id]` desk post-outcome stamps, `lib/x/`'s token store, and the voice-extraction ledger) |
| `X_CLIENT_ID` + `X_CLIENT_SECRET` | `lib/x/api.ts` — X OAuth2 confidential-client credentials (link flow + posting) |
| `INGEST_SECRET` | `app/api/ingest/route.ts` — fail-closed `Bearer` auth on the delivery interface (the ingestion forwarder's entry point) |
| `SLACK_WEBHOOK_URL` | `lib/notify/slack.ts` — the workspace incoming webhook the draft push posts to |
| `RESEND_API_KEY` + `RESEND_FROM` + `RESEND_REPLY_DOMAIN` | `lib/notify/email.ts` — Resend REST auth, sender identity, and the plus-addressed reply domain that routes a reply back to its draft |
| `RESEND_WEBHOOK_SECRET` | `app/api/email/inbound/route.ts` — Svix signature verification (raw body, fail-closed) on inbound replies |
| `NOTIFY_EMAIL_TO` | `lib/agent/draft-pipeline.ts` — the reporter's address the draft email goes to (per-desk config is D5) |

## Code map

- `app/` — routes: landing, auth pages, `/auth/*` callbacks (including `app/auth/x/*`, the X OAuth link + callback), `api/chat` (the agent endpoint — still compiles, no longer linked from the UI, D10), `api/ingest` (**the delivery interface** — the Bearer-authed entry point a source post enters through; the ingestion worker POSTs here), `api/email/inbound` (the Svix-verified Resend webhook turning an emailed reply into a draft correction), `agents/` shell (feed-first `/agents` redirect · `new/` create-desk form · `[id]` desk with its Feed / Voice / Setup sections — the Feed's draft cards carry Connect-X + post-to-X + one-click council expansion · `settings/`). The per-minute `api/cron/` scan dispatcher was deleted (D15).
- `components/`
    - `components/ui/` — stock shadcn kit (+ `components/hooks/`, its vendored hooks).
    - `components/ai-elements/` — chat-surface kit.
    - `components/site-header.tsx`, `components/desk-switcher.tsx`, `components/account-menu.tsx`, `components/mobile-nav-sheet.tsx`, `components/auth-shell.tsx`, `components/logo.tsx` — the bespoke shared components (app-shell chrome: the always-on site header + desk switcher + account menu + the narrow-width nav sheet; auth shell; brand mark). The old offcanvas sidebar (`app-sidebar.tsx`/`sidebar-peek.tsx`) was deleted — R20.
- `lib/agent/` — the desk agent: model + tools + the save-approval gate (the orphaned onboarding chat, D10); the drafting council + judge and the delivery pipeline behind `/api/ingest` + `/api/email/inbound` (`draft-council-run.ts`, `draft-pipeline.ts`); plus its other pure modules. (The old headless scan runner, draft runner, cron dispatcher, and `next-run.ts` fire math were all deleted — D15.)
- `lib/x/` — the X integration — `api.ts` (raw-fetch OAuth2 + post client), `store.ts` (service-role token store for `x_accounts`; tokens never leave this dir), `link-state.ts` (`getXLinkState()`), `actions.ts` (`postDraftToX`/`unlinkXAccount`).
- `lib/notify/` — draft delivery, raw `fetch` only (no vendor SDKs): `compose.ts` (the message body), `slack.ts` (the incoming-webhook push), `email.ts` (Resend send + the plus-addressed reply encoding **and its decoder** — the pair lives in one file so they cannot drift). Thin senders: they neither persist nor meter — `lib/agent/draft-pipeline.ts` does both.
- `lib/voice/` — the voice pipeline's pure functions, ported from the gitignored `.voice-lab/`: `deploy-guide.ts` (strips extractor-verification sections before a guide becomes a drafting prompt — 16.1% off every draft) and `measured-facts.ts` (computes the guide's measurable half — length/emoji/hashtag/punctuation frequencies — so the extractor can't miss sparse habits).
- `lib/sysprompts/` — the agent's system prompts, as markdown.
- `lib/` (root) — Supabase clients (typed by the generated `lib/supabase/database.types.ts`, including the service-role `lib/supabase/admin.ts`, used by every path that must write rows no user session can — the draft pipeline, the `[id]` desk post-outcome stamps, the voice-extraction ledger, and `lib/x/`'s token store + post/unlink actions) + auth server actions + desk render helpers (`lib/agents.ts`) + `lib/x/handle.ts` (the shared X-handle normalize+validate rail — every write path that persists a handle uses it) + `lib/format.ts` (shared `formatCost`).
- `supabase/migrations/` — the SQL record of every applied migration (applied via the claude.ai Supabase connector — project `oparax-chirp` / `pcgvpypzfwuchyfwdlwe` — NOT the supabase plugin's MCP server; see `.claude/rules/supabase.md`; mirrored here); today's app schema is the legacy `agents`, `runs`, `drafts` (dormant — no live reader, D15), `x_accounts`, and the active set `experiments`, `voice_guides`, `source_posts`, `post_drafts`, `model_calls`, `usage_events`, plus D16's two deny-all counters `draft_claims` (UNIQUE(source_post_id, experiment_id)) and `unmatched_deliveries`. Every table has RLS enabled, in one of three shapes: **owner-scoped** (`agents`, `experiments` — full 4-policy; `usage_events` select-only), **EXISTS-join through an owner-scoped parent** (`runs`/`drafts` → `agents`; `post_drafts` → `experiments` by `experiment_id`; `voice_guides` → `experiments` by `reporter_handle`, since a guide is paid once per reporter and so carries no `owner_id`), and **deny-all — RLS on, zero policies** (`x_accounts`, `source_posts`, `model_calls`, `draft_claims`, `unmatched_deliveries`). Writes: `post_drafts` is owner-insertable and carries the post-outcome columns (`posted_at`, `posted_tweet_id`, `posted_url` — D16) stamped by the service-role client after an RLS ownership check; `voice_guides`, `source_posts`, `model_calls`, `usage_events`, `draft_claims`, and `unmatched_deliveries` have **no insert/update/delete policies at all** — service-role writes only, so a browser cannot forge a guide, a ledger row, or zero its own spend.
- `docs/` — `decisions.md` is the **canonical decision record and build plan**: a BUILD ORDER table at the top names the slices in sequence (build the one marked NEXT), followed by LOCKED / DEFERRED / REJECTED entries each carrying its why. Plan and build from it; consult it before re-litigating any architecture or model choice; `pricing-cogs.md` is Farzan's own parked notes, not project instruction (ignore unless he points you at it); `test-handles.md` is a paste-ready handle set for manually testing the desk (create-desk + the delivery pipeline).
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
- **Every model call records its output AND its reasoning trace.** One `model_calls` row per
  call — any stage (extraction, drafting, judge, scan), whether one model runs or five —
  carrying `output`, `reasoning`, `usage`, `cost_usd`, `generation_id`. Storing a token count
  without the trace is not compliance. The row is owed by **any call that completed and billed —
  including on an error path**: if a later step (a repair, a schema-parse, the judge) throws,
  capture the finished call's `output`/`usage` off the error and record it anyway. A downstream
  throw must never discard an already-paid call's row — the slice-1 miss was the happy path; the
  same invariant fails on error paths. **On Claude models the trace is a summary gated on
  `thinking.display`, which defaults to `"omitted"` — and "omitted" still returns a thinking
  block with an empty `text`, so a default call looks exactly like a model that cannot expose
  reasoning.** Pass `thinking: { type, effort, display: "summarized" }` (effort belongs inside
  that object; a top-level `reasoning` param would be silently ignored whenever
  `providerOptions` carries any reasoning key). Every call also stamps
  `usage.reasoningWithheldByProvider` to keep "withheld" distinguishable from "not captured".
  Write via the service-role client (the table has no insert policy) and never duplicate the
  output elsewhere: `voice_guides.provenance` is a `{ modelCallId }` pointer and `post_drafts`
  joins through `model_call_id`. Rationale, per-model status, and the false-impossibility
  miss: `docs/decisions.md` L12 + L9#7-8.
- **No persistence until a data shape earns it.** Every new table is a real feature slice (plan it), not a quick add mid-task; a new table also picks one of the three established RLS shapes rather than inventing a fourth. The current tables and their shapes are listed once, in the Code map's `supabase/migrations/` entry above — don't restate them here.
- **UI copy & form conventions (owner rule — enforce every time, no exceptions).** These are hard rules for ALL user-facing UI, overriding anything the imported design mock did:
    1. **Sentence case only — never ALL-CAPS.** No `uppercase` Tailwind utility, no `text-transform: uppercase`, no ALL-CAPS literal strings, anywhere — labels, section headers, badges, eyebrows, buttons, table headers. Capitalize the first word only; keep proper nouns/acronyms as written (`X`, `AI`, `Slack`). The mock's "uppercase-by-content" micro-labels are explicitly rejected.
    2. **No eyebrow/kicker headers.** Never stack a small muted category label *above* a title (e.g. "New desk" over "Create desk"). A header is one line. A title may carry a *meaningful* description **below** it (e.g. a `DialogDescription`'s helper text) — that is fine — but never a redundant category label above it, and never split one heading across a bold line + a gray subline.
    3. **Uniform form fields.** Every field in a form shares one visual treatment. A disabled / "coming soon" field is greyed (opacity) + a "Coming soon" badge — it does NOT get a special bordered/dashed container that makes it structurally different from the active fields. Grey it; don't box it.

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
