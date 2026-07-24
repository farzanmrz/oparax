# Oparax

AI news desk for reporters: monitors their beat across X and social platforms, catches stories as they break, drafts a post per platform in the reporter's voice, and — once trusted — posts autonomously. Today: password-only Supabase auth → a feed-first desk workspace — a site header (desk switcher + account menu), each desk's Feed / Voice / Setup sections, story-clustered feed cards with a per-platform (X/LinkedIn/Bluesky) draft switcher and in-place editing, X-only post/auto-post behind a confirm, live voice extraction + an editable per-rule voice guide, per-desk Slack delivery (interactive "Post to X" button) with a legacy-webhook fallback, a create-desk form with an assistant that clarifies a fuzzy beat, and settings. (D10 closed — the `/api/chat` agent is re-linked into the create-desk form's assistant, `save_agent` now returns structured form values instead of the old onboarding schema.)

## Stack

| Layer | Tech | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.2 |
| UI | React | 19.2 |
| Language | TypeScript strict (`@/*` → repo root) | 6 |
| Agent | AI SDK `ToolLoopAgent` (DeepSeek via AI Gateway) behind `POST /api/chat` | — |
| AI SDK | `ai` + `@ai-sdk/react` | 7 / 4 |
| Styling | Tailwind + stock shadcn + vendored ai-elements | 4 |
| Auth + DB | Supabase (auth + owner-scoped app tables — `experiments`, `voice_guides`, `voice_rules`, `stories`, `story_assignments`, `source_posts`, `post_drafts`, `model_calls`, `usage_events`, `x_accounts`, `slack_accounts`, `slack_delivery_receipts`, `voice_extraction_claims`; the legacy `agents`/`runs`/`drafts` tables still exist but no live code path reads them — D15) | — |
| Tooling | pnpm (a preinstall guard blocks npm/yarn) + Biome | — |
| Host | Vercel Git integration — `dev` preview; `beta` → beta.oparax.ai; `main` → oparax.ai; promote strictly `dev` → `beta` → `main` | — |

### Commands

```bash
pnpm dev        # Next.js (localhost:3000)
pnpm build      # automated gate — compiles /api/chat but never calls it, so a broken agent still builds green
pnpm lint       # Biome check
pnpm lint:fix   # Biome check --write
pnpm format     # Biome format --write
```

### Environment

`.env.local`, nineteen keys (table below); Supabase dashboard-side config (unrelated to the other two keys): `.claude/rules/supabase.md`. Frontend test login: `testuser@oparax.ai` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `XAI_API_KEY` | `lib/agent/xai.ts` — Grok, reachable only via the orphaned onboarding chat's `oparax_x_search` tool (the headless scan runner was deleted — D15) |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev; deployed = Vercel OIDC) |
| `CRON_SECRET` | **retired** — the per-minute cron dispatcher (`app/api/cron/tick`) was deleted (D15); the ingestion worker replaced polling, so no code consumes this key now |
| `SUPABASE_SECRET_KEY` | `lib/supabase/admin.ts` — the service-role client (the draft pipeline, the `[id]` desk post-outcome stamps, `lib/x/`'s token store, and the voice-extraction ledger) |
| `X_CLIENT_ID` + `X_CLIENT_SECRET` | `lib/x/api.ts` — X OAuth2 confidential-client credentials (link flow + posting) |
| `INGEST_SECRET` | `app/api/ingest/route.ts` — fail-closed `Bearer` auth on the delivery interface (the ingestion forwarder's entry point); Railway-side parity is a Wave 4 deploy requirement (T4.3), not yet proven live |
| `BRIGHTDATA_API_KEY` | `lib/web/brightdata.ts` — raw-fetch `scrapeUrl`/`pullXTimeline` (voice-extraction corpus + website source scrapes). `BRIGHTDATA_API_TOKEN` was a duplicate of the same value (G3, Slice 5 Wave 1) — dropped; Bright Data's own docs call it "API key," and the app never uses `@brightdata/sdk` |
| `SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET` + `SLACK_SIGNING_SECRET` | `lib/slack/*` + `app/auth/slack/*` — per-desk Slack OAuth (owner-provisioned, workspace `oparax`) and the interactions route's raw-body HMAC (G2, Slice 5 Wave 1: `v0:{ts}:{rawBody}`, SHA-256, 5-minute replay window) |
| `SLACK_WEBHOOK_URL` | `lib/notify/slack.ts` — **legacy ops fallback only** as of Slice 5: the hand-rolled Slack app (`SLACK_CLIENT_*` above) is now the primary per-desk delivery path; this workspace-wide incoming webhook (verified working, slices 67/68) stays as a non-per-desk backstop |
| `RESEND_API_KEY` + `RESEND_FROM` + `RESEND_REPLY_DOMAIN` | `lib/notify/email.ts` — Resend REST auth, sender identity, and the plus-addressed reply domain that routes a reply back to its draft. **Documented, not yet provisioned** — absent from `.env.local` and Vercel as of Slice 5; the per-desk email config/Notifications-matrix/Send-test ship fully wired regardless, Send-test simply fails cleanly until the owner provisions Resend |
| `RESEND_WEBHOOK_SECRET` | `app/api/email/inbound/route.ts` — Svix signature verification (raw body, fail-closed) on inbound replies. Same not-yet-provisioned status as the `RESEND_*` row above |
| `NOTIFY_EMAIL_TO` | `lib/agent/draft-pipeline.ts` — the reporter's address the draft email goes to (per-desk config is D5) |

## Code map

- `app/` — routes: landing, auth pages, `/auth/*` callbacks (`app/auth/x/*` the X OAuth link + callback; `app/auth/slack/link` + `app/auth/slack/callback` the per-desk Slack OAuth install, both CSRF-nonce-cookie-protected like X's), `api/chat` (the agent endpoint — re-linked into the create-desk assistant, D10 closed), `api/ingest` (**the delivery interface** — the Bearer-authed entry point a source post enters through, `x`/`website`-discriminated; the ingestion worker POSTs here), `api/email/inbound` (the Svix-verified Resend webhook turning an emailed reply into a draft correction), `api/slack/interactions` (the Slack interactive-button webhook — raw-body HMAC, fail-closed, `after()`-deferred so the 3s ack deadline is met before the slow X-post work runs), `agents/` shell (feed-first `/agents` redirect · `new/` create-desk form with its beat-clarifying assistant panel · `[id]` desk with its Feed / Voice / Setup sections — the Feed's story cards carry a platform pill switcher (X/LinkedIn/Bluesky), Connect-X + post-to-X + edit-in-place + one-click council expansion; Voice carries a real per-rule editor + a verify-handle gate (D14) + a capped-extraction retry; Setup carries live websites + auto-post toggles + real per-desk Slack/email Connections · `settings/`). The per-minute `api/cron/` scan dispatcher was deleted (D15).
- `components/`
    - `components/ui/` — stock shadcn kit (+ `components/hooks/`, its vendored hooks).
    - `components/ai-elements/` — chat-surface kit.
    - `components/site-header.tsx`, `components/desk-switcher.tsx`, `components/account-menu.tsx`, `components/mobile-nav-sheet.tsx`, `components/auth-shell.tsx`, `components/logo.tsx` — the bespoke shared components (app-shell chrome: the always-on site header + desk switcher + account menu + the narrow-width nav sheet; auth shell; brand mark). The old offcanvas sidebar (`app-sidebar.tsx`/`sidebar-peek.tsx`) was deleted — R20.
- `lib/agent/` — the desk agent: model + `save_agent` tool (no approval gate — it's a pure echo into the create-desk form's own state, never a write; `oparax_x_search` stays defined but unwired from the current tool set); `cluster.ts` (story clustering — attach-or-create against a desk's own recent stories, the 4-leg `generateObject` recipe, atomic per-desk claim on `story_assignments`); the multi-platform drafting council + judge and the delivery pipeline behind `/api/ingest` + `/api/email/inbound` (`draft-council-run.ts`, `draft-pipeline.ts` — clustering → per-platform `Promise.allSettled` fan-out → auto-post); `desk-config.ts` (`PLATFORMS`, `X_CHAR_LIMITS`, `NON_X_PLATFORM_CHAR_LIMITS`); plus its other pure modules. (The old headless scan runner, draft runner, cron dispatcher, and `next-run.ts` fire math were all deleted — D15.)
- `lib/x/` — the X integration — `api.ts` (raw-fetch OAuth2 + post client), `store.ts` (service-role token store for `x_accounts`; tokens never leave this dir), `link-state.ts` (`getXLinkState()`), `actions.ts` (`postDraftToX` for a browser caller + `postDraftToXForOwner`, the session-independent core both `postDraftToX` and the auto-post path call, + `unlinkXAccount`).
- `lib/slack/` — the hand-rolled per-desk Slack integration (mirrors `lib/x/`'s shape; Vercel Connect rejected — see decisions.md): `api.ts` (raw-fetch Web API + OAuth2 + `verifySlackSignature`, the raw-body HMAC scheme), `store.ts` (service-role token store for `slack_accounts`/`slack_delivery_receipts`; tokens never leave this dir), `link-state.ts` (`getSlackLinkState()` + the shared `ownsDesk()` ownership proof), `actions.ts` (`unlinkSlack`/`sendTestSlack`).
- `lib/verify/handle.ts` — D14's reporter-handle verification: `verifyReporterHandle` (linked-X-OAuth-handle match, via `x_accounts.handle`) + `attestReporterHandle` (the owner-attest fallback). Sets `experiments.reporter_verified_at`, which the `voice_guides` SELECT policy now requires.
- `lib/web/brightdata.ts` — raw-fetch Bright Data client: `scrapeUrl` (Web Unlocker; block-page detection is status-code based, not body-marker) and `pullXTimeline` (Web Scraper API, async trigger/poll/download — the one designated extraction X-read, distinct from the live ingestion stream and the onboarding chat's `oparax_x_search`). Meters `usage_events` (`scrape_web`/`scrape_x_timeline`), never `model_calls`.
- `lib/notify/` — draft delivery, raw `fetch` only (no vendor SDKs): `compose.ts` (the message body), `slack.ts` (`sendSlackMessage` — the workspace-wide incoming webhook, now the **legacy fallback** for a desk that hasn't linked `lib/slack/`'s per-desk app), `email.ts` (Resend send + the plus-addressed reply encoding **and its decoder** — the pair lives in one file so they cannot drift; a shared `sendEmail` transport helper backs both `sendDraftEmail` and `sendTestEmail`). Thin senders: they neither persist nor meter — `lib/agent/draft-pipeline.ts` does both.
- `lib/voice/` — the voice pipeline: `deploy-guide.ts` (strips extractor-verification sections before a guide becomes a drafting prompt — 16.1% off every draft) and `measured-facts.ts` (computes the guide's measurable half — length/emoji/hashtag/punctuation frequencies), both ported from the gitignored `.voice-lab/`; `corpus.ts` (wraps `pullXTimeline`, adapts to `extractVoiceGuide`'s frozen `CorpusPost` input); `spend-gate.ts` (the D16 atomic pre-flight claim on `voice_extraction_claims` — one claim per reporter per UTC day, no same-day retry); `rules.ts` (`voice_rules` CRUD + `flattenRulesToPrompt`, **the drafting input of record** as of this slice — `flattenRulesToPrompt(enabledRules) + measuredFacts` replaces the raw guide's role in the system prompt; the guide blob survives as immutable audit provenance); `create-desk-extraction.ts` (`attemptVoiceExtraction` — claim → live `fetchCorpus` → extraction → materialize `voice_rules` → finalize; replaced the old `.voice-lab`-file-only gate now that extraction can actually spend).
- `lib/sysprompts/` — the agent's system prompts, as markdown: `desk-agent.md` now covers only the narrow create-desk beat-clarifying job (no scan/draft/schedule negotiation — those concepts left with D10's old onboarding flow) and `story-cluster.md` is the clustering classifier's prompt.
- `lib/` (root) — Supabase clients (typed by the generated `lib/supabase/database.types.ts`, including the service-role `lib/supabase/admin.ts`, used by every path that must write rows no user session can — the draft pipeline, the `[id]` desk post-outcome stamps, the voice-extraction ledger, and `lib/x/`'s/`lib/slack/`'s token stores + post/unlink actions) + auth server actions + desk render helpers (`lib/agents.ts`) + `lib/x/handle.ts` (the shared X-handle normalize+validate rail — every write path that persists a handle uses it) + `lib/websites.ts` (the shared website-tracking cap + jsonb-narrowing helper, mirroring `lib/x/handle.ts`'s role) + `lib/format.ts` (shared `formatCost`).
- `supabase/migrations/` — the SQL record of every applied migration (applied via the claude.ai Supabase connector — project `oparax-chirp` / `pcgvpypzfwuchyfwdlwe`; see `.claude/rules/supabase.md`; mirrored here); today's app schema is the legacy `agents`, `runs`, `drafts` (dormant — no live reader, D15), `x_accounts`, and the active set `experiments`, `voice_guides`, `voice_rules`, `stories`, `story_assignments`, `source_posts`, `post_drafts`, `model_calls`, `usage_events`, `slack_accounts`, `slack_delivery_receipts`, plus D16's three deny-all counters `draft_claims` (UNIQUE(source_post_id, experiment_id)), `unmatched_deliveries`, and `voice_extraction_claims` (UNIQUE(reporter_handle, utc_day) — the spend gate's atomic pre-flight claim). Every table has RLS enabled, in one of three shapes: **owner-scoped** (`agents`, `experiments` — full 4-policy, now also carrying `reporter_verified_at`/`auto_post_master`/`auto_post_sources`/`websites`; `usage_events` select-only), **EXISTS-join through an owner-scoped parent** (`runs`/`drafts` → `agents`; `post_drafts` → `experiments` by `experiment_id`; `stories` → `experiments` by `experiment_id`, select-only; `voice_guides` → `experiments` by `reporter_handle` — its SELECT policy also requires `reporter_verified_at IS NOT NULL` as of D14; `voice_rules` → `experiments` by `reporter_handle`, select-only, no `owner_id` — same "paid/edited once per reporter, shared across desks" reasoning as `voice_guides`), and **deny-all — RLS on, zero policies** (`x_accounts`, `source_posts`, `model_calls`, `draft_claims`, `unmatched_deliveries`, `slack_accounts` (UNIQUE `experiment_id` — per-desk, not per-user), `slack_delivery_receipts` (UNIQUE `interaction_id`), `voice_extraction_claims`). Writes: `post_drafts` carries **both** an owner-scoped INSERT policy (`post_drafts_insert_via_experiment` — item 9's edit-in-place, proving a browser caller owns the desk) **and** service-role writes (the drafting pipeline) — plus the post-outcome columns (`posted_at`, `posted_tweet_id`, `posted_url` — D16, now also `platform`/`story_id`) stamped by the service-role client after an RLS ownership check; `voice_guides`, `voice_rules`, `stories`, `source_posts`, `model_calls`, `usage_events`, `draft_claims`, `unmatched_deliveries`, `slack_accounts`, `slack_delivery_receipts`, and `voice_extraction_claims` have **no insert/update/delete policies at all** — service-role writes only, so a browser cannot forge a guide, a rule, a story, a ledger row, a Slack token, or zero its own spend.
- `docs/` — `decisions.md` is the **canonical decision record and build plan**: a BUILD ORDER table at the top names the slices in sequence (build the one marked NEXT), followed by LOCKED / DEFERRED / REJECTED entries each carrying its why. Plan and build from it; consult it before re-litigating any architecture or model choice; `pricing-cogs.md` is Farzan's own parked notes, not project instruction (ignore unless he points you at it); `test-handles.md` is a paste-ready handle set for manually testing the desk (create-desk + the delivery pipeline).
- `.claude/` — `rules/` (path-scoped guidance) · `skills/` · `agents/` · `workflows/` · `hooks/` (see Formatting below).
- `.agents/skills/` — the cross-agent skills mirror (the open agent-skills ecosystem's directory; non-Claude agents read the body and ignore the Claude-only `model:` frontmatter as inert text). Symlinks **every** `.claude/skills/` entry — add a symlink when a new skill lands. Native `x-check`, `x-recheck`, `x-dm`, `x-stat`, and `lean-log` directories are separate Codex workflow skills, outside Claude Code's orchestration and push scope; Claude Code must ignore them and must not mirror or include them when pushing its own work. These five skills always execute inline in the current Codex task and must never delegate to a custom agent; select the desired model in the task before invoking them.

Gitignored, regenerable (delete freely when nothing runs): `.next/`, `data/`, `.vercel/`.

`.feature/` is the `/feature` flow's live scratch — never delete it by hand; `ship.sh` sweeps it when the slice ships.

`.context/features/<branch>/` is ignored, branch-scoped continuity state for the feature flow. `state.json` carries the run contract and `handoff.md` is the bounded `/feature-handoff` checkpoint. Never load a different branch's snapshot or treat a stale HEAD/worktree fingerprint as current; shipping removes only the shipped branch's state.

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
- `.githooks/` is the versioned local Git guardrail (`core.hooksPath=.githooks`). `main`, `dev`, and `beta` are permanent refs: never delete or force-update them. GitHub's active ruleset is the canonical protection; ordinary fast-forward release pushes remain allowed.
- Proactively invoke any installed skill relevant to the current task without waiting for me to name it.
