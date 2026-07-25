# Oparax

AI news desk for reporters: monitors their beat across X, catches stories as they break, drafts a post in the reporter's voice, and — once trusted — posts autonomously.

**The shipped flow:** connect X → tracked sources scanned → drafted in the reporter's voice → Slack notification → the reporter clicks Post to X. Around it: password-only Supabase auth, a feed-first agent workspace (site header + agent switcher + account menu), each agent's Feed / Voice / Setup sections, feed cards with in-place draft editing and one-click council provenance, live voice extraction + an editable per-rule voice guide, per-desk Slack delivery with a legacy-webhook fallback, a create-agent form gated on Connect X, and settings.

Capabilities built but deliberately switched off — multi-platform drafting, clustering, email delivery, auto-post, website sources — are listed under "Dormant by design" below. **Treat them as decisions, not gaps.**

## Stack

| Layer | Tech | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.2 |
| UI | React | 19.2 |
| Language | TypeScript strict (`@/*` → repo root) | 6 |
| AI SDK | `ai` + `@ai-sdk/react` | 7 / 4 |
| Styling | Tailwind + stock shadcn + vendored ai-elements | 4 |
| Auth + DB | Supabase (auth + owner-scoped app tables — `experiments`, `voice_guides`, `voice_rules`, `stories`, `story_assignments`, `source_posts`, `post_drafts`, `model_calls`, `usage_events`, `x_accounts`, `slack_accounts`, `slack_delivery_receipts`, `voice_extraction_claims`; the legacy `agents`/`runs`/`drafts` tables still exist but no live code path reads them — deleted with the retired scan/draft pipeline) | — |
| Tooling | pnpm (a preinstall guard blocks npm/yarn) + Biome | — |
| Host | Vercel Git integration — `dev` preview; `beta` → beta.oparax.ai; `main` → oparax.ai; promote strictly `dev` → `beta` → `main` | — |

### Commands

```bash
pnpm dev        # Next.js (localhost:3000)
pnpm build      # automated gate — compiles /api/ingest + /api/email/inbound but never calls them, so a broken pipeline still builds green
pnpm lint       # Biome check
pnpm lint:fix   # Biome check --write
pnpm format     # Biome format --write
```

### Environment

`.env.local`, nineteen keys (table below); Supabase dashboard-side config (unrelated to the other two keys): `.claude/rules/supabase.md`. Frontend test login: `testuser@oparax.ai` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `XAI_API_KEY` | `lib/agent/xai.ts` — Grok client for the `oparax_x_search` tool executor; **fully dead code** — its only caller, the `/api/chat` create-desk assistant, was deleted in the create-agent v2 continuation, so nothing in the app reaches this path today |
| `AI_GATEWAY_API_KEY` | AI Gateway for the DeepSeek chat model (local dev; deployed = Vercel OIDC) |
| `CRON_SECRET` | **retired** — the per-minute cron dispatcher (`app/api/cron/tick`) was deleted with the retired scan/draft pipeline; the ingestion worker replaced polling, so no code consumes this key now |
| `SUPABASE_SECRET_KEY` | `lib/supabase/admin.ts` — the service-role client (the draft pipeline, the `[id]` desk post-outcome stamps, `lib/x/`'s token store, and the voice-extraction ledger) |
| `X_CLIENT_ID` + `X_CLIENT_SECRET` | `lib/x/api.ts` — X OAuth2 confidential-client credentials (link flow + posting) |
| `INGEST_SECRET` | `app/api/ingest/route.ts` — fail-closed `Bearer` auth on the delivery interface (the ingestion forwarder's entry point); Railway-side parity is a Wave 4 deploy requirement (T4.3), not yet proven live |
| `BRIGHTDATA_API_KEY` | `lib/web/brightdata.ts` — raw-fetch `scrapeUrl`/`pullXTimeline` (voice-extraction corpus + website source scrapes). `BRIGHTDATA_API_TOKEN` was a duplicate of the same value (live-verified: both names held the identical value) — dropped; Bright Data's own docs call it "API key," and the app never uses `@brightdata/sdk` |
| `SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET` + `SLACK_SIGNING_SECRET` | `lib/slack/*` + `app/auth/slack/*` — per-desk Slack OAuth (owner-provisioned, workspace `oparax`) and the interactions route's raw-body HMAC (live-verified against Slack's docs: `v0:{ts}:{rawBody}`, SHA-256, 5-minute replay window) |
| `SLACK_WEBHOOK_URL` | `lib/notify/slack.ts` — **legacy ops fallback only** as of Slice 5: the hand-rolled Slack app (`SLACK_CLIENT_*` above) is now the primary per-desk delivery path; this workspace-wide incoming webhook (verified working, slices 67/68) stays as a non-per-desk backstop |
| `RESEND_API_KEY` + `RESEND_FROM` + `RESEND_REPLY_DOMAIN` | `lib/notify/email.ts` — Resend REST auth, sender identity, and the plus-addressed reply domain that routes a reply back to its draft. **Documented, not yet provisioned** — absent from `.env.local` and Vercel as of Slice 5; the email leg is also switched off behind `EMAIL_DELIVERY_ENABLED` and greyed in Setup, so provisioning Resend alone will not turn draft emails back on |
| `RESEND_WEBHOOK_SECRET` | `app/api/email/inbound/route.ts` — Svix signature verification (raw body, fail-closed) on inbound replies. Same not-yet-provisioned status as the `RESEND_*` row above |
| `NOTIFY_EMAIL_TO` | `lib/agent/draft-pipeline.ts` — the reporter's address the draft email goes to (per-desk delivery config is not built) |

## Code map

- `app/` — routes: landing, auth pages, `/auth/*` callbacks (`app/auth/x/*` the X OAuth link + callback; `app/auth/slack/link` + `app/auth/slack/callback` the per-desk Slack OAuth install, both CSRF-nonce-cookie-protected like X's), `api/ingest` (**the delivery interface** — the Bearer-authed entry point a source post enters through, `x`/`website`-discriminated; the ingestion worker POSTs here), `api/email/inbound` (the Svix-verified Resend webhook turning an emailed reply into a draft correction), `api/slack/interactions` (the Slack interactive-button webhook — raw-body HMAC, fail-closed, `after()`-deferred so the 3s ack deadline is met before the slow X-post work runs), `agents/` shell (feed-first `/agents` redirect · `new/` create-agent form gated on Connect X — no typed handle field, `createDesk` derives `reporter_handle` from the linked `x_accounts` row and stamps `reporter_verified_at` at insert — with a live streaming extraction-progress view once created · `[id]` desk with its Feed / Voice / Setup sections — the Feed's story cards carry Connect-X + post-to-X + edit-in-place + one-click council expansion (the platform pill switcher renders whatever `PLATFORMS` lists — X only today); Voice carries a real per-rule editor, a live extraction-progress view when a run is mid-flight, and a capped-extraction retry; Setup carries live tracked X handles + real per-desk Slack Connections, with websites, auto-post, email, and the Notifications matrix greyed (see Dormant by design) · `settings/`). The per-minute `api/cron/` scan dispatcher was deleted with the retired scan/draft pipeline; `api/chat` (the create-desk assistant's endpoint) was deleted in the create-agent v2 continuation.
- `components/`
    - `components/ui/` — stock shadcn kit (+ `components/hooks/`, its vendored hooks).
    - `components/ai-elements/` — chat-surface kit.
    - `components/site-header.tsx`, `components/desk-switcher.tsx`, `components/account-menu.tsx`, `components/mobile-nav-sheet.tsx`, `components/auth-shell.tsx`, `components/logo.tsx` — the bespoke shared components (app-shell chrome: the always-on site header + desk switcher + account menu + the narrow-width nav sheet; auth shell; brand mark). The old offcanvas sidebar (`app-sidebar.tsx`/`sidebar-peek.tsx`) was deleted — it served exactly one nav destination.
- `lib/agent/` — `cluster.ts` (story clustering — attach-or-create against a desk's own recent stories, the 4-leg `generateObject` recipe, atomic per-desk claim on `story_assignments`); the multi-platform drafting council + judge and the delivery pipeline behind `/api/ingest` + `/api/email/inbound` (`draft-council-run.ts`, `draft-pipeline.ts` — clustering → per-platform `Promise.allSettled` fan-out → auto-post); `desk-config.ts` (`PLATFORMS`, `X_CHAR_LIMITS`, `NON_X_PLATFORM_CHAR_LIMITS`); plus its other pure modules. `tools.ts` (`save_agent`) and `xai.ts` (the `oparax_x_search` Grok executor) are dead code — their only caller, the `/api/chat` create-desk assistant, was deleted in the create-agent v2 continuation. (The old headless scan runner, draft runner, cron dispatcher, and `next-run.ts` fire math were all deleted — all deleted with the retired scan/draft pipeline.)
- `lib/x/` — the X integration — `api.ts` (raw-fetch OAuth2 + post client), `store.ts` (service-role token store for `x_accounts`; tokens never leave this dir), `link-state.ts` (`getXLinkState()`), `actions.ts` (`postDraftToX` for a browser caller + `postDraftToXForOwner`, the session-independent core both `postDraftToX` and the auto-post path call, + `unlinkXAccount`).
- `lib/slack/` — the hand-rolled per-desk Slack integration (mirrors `lib/x/`'s shape; Vercel Connect was evaluated and rejected — it could not carry the per-desk token model this needs): `api.ts` (raw-fetch Web API + OAuth2 + `verifySlackSignature`, the raw-body HMAC scheme), `store.ts` (service-role token store for `slack_accounts`/`slack_delivery_receipts`; tokens never leave this dir), `link-state.ts` (`getSlackLinkState()` + the shared `ownsDesk()` ownership proof), `actions.ts` (`unlinkSlack`/`sendTestSlack`).
- `lib/web/brightdata.ts` — raw-fetch Bright Data client: `scrapeUrl` (Web Unlocker; block-page detection is status-code based, not body-marker), `pullXTimeline` (Web Scraper API, async trigger/poll/download — the one designated extraction X-read, distinct from the live ingestion stream), and `fetchXProfile` (a synchronous pre-flight — resolves a handle and its post count before any `voice_extraction_claims` spend). Meters `usage_events` (`scrape_web`/`scrape_x_timeline`/`scrape_x_profile`), never `model_calls`.
- `lib/notify/` — draft delivery, raw `fetch` only (no vendor SDKs): `compose.ts` (the message body), `slack.ts` (`sendSlackMessage` — the workspace-wide incoming webhook, now the **legacy fallback** for a desk that hasn't linked `lib/slack/`'s per-desk app), `email.ts` (Resend send + the plus-addressed reply encoding **and its decoder** — the pair lives in one file so they cannot drift; a shared `sendEmail` transport helper backs both `sendDraftEmail` and `sendTestEmail`). Thin senders: they neither persist nor meter — `lib/agent/draft-pipeline.ts` does both.
- `lib/voice/` — the voice pipeline: `deploy-guide.ts` (strips extractor-verification sections before a guide becomes a drafting prompt — 16.1% off every draft) and `measured-facts.ts` (computes the guide's measurable half — length/emoji/hashtag/punctuation frequencies), both ported from the gitignored `.voice-lab/`; `corpus.ts` (wraps `pullXTimeline`, adapts to `extractVoiceGuide`'s frozen `CorpusPost` input); `spend-gate.ts` (the atomic pre-flight claim on `voice_extraction_claims` — one claim per reporter per UTC day; provisional until extraction begins, so `releaseClaimOnCorpusFailure` frees it for same-day retry if `fetchCorpus` fails, and `recordProgress` writes the streaming stage/reasoning columns; progress reaches the browser by POLLING an ownership-proving server action, never Supabase Realtime — the claims table is deny-all RLS and a browser cannot subscribe to it); `rules.ts` (`voice_rules` CRUD + `flattenRulesToPrompt`, **the drafting input of record** as of this slice — `flattenRulesToPrompt(enabledRules) + measuredFacts` replaces the raw guide's role in the system prompt; the guide blob survives as immutable audit provenance); `create-desk-extraction.ts` (`attemptVoiceExtraction` — `fetchXProfile` pre-flight → claim → live `fetchCorpus` → streaming extraction → materialize `voice_rules` → finalize; replaced the old `.voice-lab`-file-only gate now that extraction can actually spend).
- `lib/sysprompts/` — `story-cluster.md` is the clustering classifier's prompt (`generateObject` system for `lib/agent/cluster.ts`). `desk-agent.md` (the create-desk assistant's system prompt) was deleted alongside `/api/chat` in the create-agent v2 continuation.
- `lib/` (root) — Supabase clients (typed by the generated `lib/supabase/database.types.ts`, including the service-role `lib/supabase/admin.ts`, used by every path that must write rows no user session can — the draft pipeline, the `[id]` desk post-outcome stamps, the voice-extraction ledger, and `lib/x/`'s/`lib/slack/`'s token stores + post/unlink actions) + auth server actions + desk render helpers (`lib/agents.ts`) + `lib/x/handle.ts` (the shared X-handle normalize+validate rail — every write path that persists a handle uses it) + `lib/websites.ts` (the shared website-tracking cap + jsonb-narrowing helper, mirroring `lib/x/handle.ts`'s role) + `lib/format.ts` (shared `formatCost`).
- `supabase/migrations/` — the SQL record of every applied migration (applied via the claude.ai Supabase connector — project `oparax-chirp` / `pcgvpypzfwuchyfwdlwe`; see `.claude/rules/supabase.md`; mirrored here); today's app schema is the legacy `agents`, `runs`, `drafts` (dormant — no live reader), `x_accounts`, and the active set `experiments`, `voice_guides`, `voice_rules`, `stories`, `story_assignments`, `source_posts`, `post_drafts`, `model_calls`, `usage_events`, `slack_accounts`, `slack_delivery_receipts`, plus three deny-all counters `draft_claims` (UNIQUE(source_post_id, experiment_id)), `unmatched_deliveries`, and `voice_extraction_claims` (UNIQUE(reporter_handle, utc_day) — the spend gate's atomic pre-flight claim). Every table has RLS enabled, in one of three shapes: **owner-scoped** (`agents`, `experiments` — full 4-policy, now also carrying `reporter_verified_at`/`auto_post_master`/`auto_post_sources`/`websites`; `usage_events` select-only), **EXISTS-join through an owner-scoped parent** (`runs`/`drafts` → `agents`; `post_drafts` → `experiments` by `experiment_id`; `stories` → `experiments` by `experiment_id`, select-only; `voice_guides` → `experiments` by `reporter_handle` — its SELECT policy also requires `reporter_verified_at IS NOT NULL` once Connect-X made every new agent born-verified; `voice_rules` → `experiments` by `reporter_handle`, select-only, no `owner_id` — same "paid/edited once per reporter, shared across desks" reasoning as `voice_guides`), and **deny-all — RLS on, zero policies** (`x_accounts`, `source_posts`, `model_calls`, `draft_claims`, `unmatched_deliveries`, `slack_accounts` (UNIQUE `experiment_id` — per-desk, not per-user), `slack_delivery_receipts` (UNIQUE `interaction_id`), `voice_extraction_claims`). Writes: `post_drafts` carries **both** an owner-scoped INSERT policy (`post_drafts_insert_via_experiment` — item 9's edit-in-place, proving a browser caller owns the desk) **and** service-role writes (the drafting pipeline) — plus the post-outcome columns (`posted_at`, `posted_tweet_id`, `posted_url`, `platform`, `story_id`) stamped by the service-role client after an RLS ownership check; `voice_guides`, `voice_rules`, `stories`, `source_posts`, `model_calls`, `usage_events`, `draft_claims`, `unmatched_deliveries`, `slack_accounts`, `slack_delivery_receipts`, and `voice_extraction_claims` have **no insert/update/delete policies at all** — service-role writes only, so a browser cannot forge a guide, a rule, a story, a ledger row, a Slack token, or zero its own spend.
- `docs/` — Farzan's own notes, **not project instruction** — ignore unless he points you at one: `pricing-cogs.md` (parked COGS working) and `test-handles.md` (a paste-ready handle set for manually testing an agent). Settled architecture and model decisions live in this file's "Settled decisions" section and the path-scoped rules, not here.
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
  **Two epistemic rules this cost real money to learn:** a parameter accepted with HTTP 200 is not a
  parameter honored — read the effect back, never trust the status; and an absent value under
  DEFAULT configuration is not proof that no configuration produces it — find the parameter that
  governs the field and test *that* before recording an impossibility.
- **No persistence until a data shape earns it.** Every new table is a real feature slice (plan it), not a quick add mid-task; a new table also picks one of the three established RLS shapes rather than inventing a fourth. The current tables and their shapes are listed once, in the Code map's `supabase/migrations/` entry above — don't restate them here.
- **UI copy & form conventions (owner rule — enforce every time, no exceptions).** These are hard rules for ALL user-facing UI, overriding anything the imported design mock did:
    1. **Sentence case only — never ALL-CAPS.** No `uppercase` Tailwind utility, no `text-transform: uppercase`, no ALL-CAPS literal strings, anywhere — labels, section headers, badges, eyebrows, buttons, table headers. Capitalize the first word only; keep proper nouns/acronyms as written (`X`, `AI`, `Slack`). The mock's "uppercase-by-content" micro-labels are explicitly rejected.
    2. **No eyebrow/kicker headers.** Never stack a small muted category label *above* a title (e.g. "New desk" over "Create desk"). A header is one line. A title may carry a *meaningful* description **below** it (e.g. a `DialogDescription`'s helper text) — that is fine — but never a redundant category label above it, and never split one heading across a bold line + a gray subline.
    3. **Uniform form fields.** Every field in a form shares one visual treatment. A disabled / "coming soon" field is greyed (opacity) + a "Coming soon" badge — it does NOT get a special bordered/dashed container that makes it structurally different from the active fields. Grey it; don't box it.

## Settled decisions — don't re-litigate without a NEW fact

Each carries the fact that settled it. These bind **planning**, so they live here rather than in a path-scoped rule. Area-specific rejects live in that area's rule (`.claude/rules/x.md`, `voice.md`, `agent.md`, `components.md`, `supabase.md`).

- **Ingestion is a persistent stream + ONE forwarder, on Railway.** Webhook *delivery* is Enterprise-only — and registering a webhook is ungated, so the naive probe returns a false-positive success. X allows 1 concurrent stream connection per account, so per-user or per-desk forwarders are structurally pointless; routing lives in Supabase instead. Railway verified ~$5/mo flat, scaling with resources and never per user. **Rejected:** Vercel-native always-on (maxDuration ceilings; cron is documented best-effort with no retries; a suspended workflow holds no socket; Sandbox ≈$31/mo, single-region), and Fly.io (superseded by Railway at equal-or-better cost with tooling already authenticated).
- **Model picks are settled and measured — do not re-audition.** Extraction is `anthropic/claude-opus-5` — the 8-model on-task panel was won by `claude-fable-5` (verbatim-quote fidelity; measured **$0.855/reporter** across 10/10), and Opus 5 replaced it for costing half at a model that postdates the panel entirely. A model that did not exist when the panel ran is a NEW fact, which is the bar this rule sets for reopening. Drafting deliberately uses cheap models: it is **~95% input tokens**, and a 1,000-draft run showed five models spanning $1.23–$23/1k landing within 0.33–0.37 style distance while reporter-to-reporter spread was 0.22–0.64 — **the reporter matters ~8× more than the model; the guide does the work.** Pro-tier models pay where judgment lives (extraction), not where instructions are followed (drafting). **Rejected:** OpenRouter (auto-router picks one model on 7-day crowd spend; Fusion is 4–5× cost and 2–3× latency; free models train on inputs; ~5.5% credit fee).
- **Bright Data is for corpus scrapes ONLY, never realtime X ingestion.** Measured staleness: newest post 7d12h old across 347 records, reproduced 4×. Staleness is irrelevant for a voice corpus and disqualifying for a live feed. It stays the corpus source even now that Connect X supplies an OAuth token, because a user-context read still bills the app's own X tier — linking an account buys nothing here.
- **A voice guide is paid once per `reporter_handle` and shared across desks.** The unique key encodes the economics; keying by experiment would re-pay per desk. Consequence, accepted deliberately: any signed-in user can read any guide (the `experiments` join row is self-mintable). A guide is derived entirely from public posts — no private data, no PII — so a second reader is the intended product, not theft. Exposure is free-riding on extraction spend, negligible at this scale.
- **Connect X is a UI gate, not a security boundary — and the two are deliberately separable.** `createDesk` derives `reporter_handle` from the linked `x_accounts` row, so through the form a user can only extract their own voice. That is a *product* rule about what users should do, not an RLS one: `experiments` has an owner-scoped INSERT policy with no value constraint, so any signed-in user can already mint a row with any `reporter_handle` and any `reporter_verified_at` — which is exactly the self-mintable consequence the shared-guide decision above already accepts. **Never argue that relaxing the form gate widens a security boundary; there is no boundary there to widen.** Two independent facts make this safe and make the owner override below a form change rather than an architectural one: extraction reads the corpus through Bright Data and never uses the X OAuth token, and posting resolves the account via `getXAccount(ownerId)` — owner-keyed, never by the desk's `reporter_handle`. So "whose voice we draft in" and "whose account publishes" were never coupled in code, only in the form.
- **Owner-only handle override, for testing a reporter the owner cannot authenticate as.** Connect X still gates desk creation (the owner needs it to post regardless); for an allowlisted owner email the extract-from field pre-fills with the connected handle and becomes editable. **The field sets the desk's `reporter_handle`** — it does not leave the desk on the owner's handle while pulling someone else's corpus. That direction is load-bearing: `voice_guides`/`voice_rules` are keyed by `reporter_handle`, so storing a corpus under the wrong key both mislabels the guide and collides with the owner's own voice if they later extract it. `reporter_verified_at` is still stamped (the allowlist is the verification), which is what keeps the `voice_guides` SELECT join resolving.
- **UI: feed-first, no global sidebar.** The old sidebar served exactly one nav destination (measured, not felt), and the reporter arrives from a notification — a listing is a detour on every visit. **The container holds the future, not reserved blank chrome:** no greyed placeholder for an *unspecified* stage. Greying a *specified but not-yet-backed* control is fine and is what the dormant surfaces below use.
- **Metering from the first commit.** Every touch point stamps `usage_events` — stream deliveries, scrapes, every model call, every notification. Per-request model cost resolves via `getGenerationInfo()` on the gateway generation id, which works for every provider (the fix for DeepSeek/GLM's missing `inferenceCost`).

### Dormant by design — switched off, not missing

Built, working, and deliberately off so the shipped flow stays small. Each is ONE named constant; flipping it back is the whole reactivation. Don't "fix" these as gaps, and don't rebuild them.

| Capability | Lever | Where |
| --- | --- | --- |
| LinkedIn / Bluesky drafting | `PLATFORMS` (the `Platform` type stays complete) | `lib/agent/desk-config.ts` |
| Story clustering (many posts → one story) | `CLUSTERING_ENABLED` | `lib/agent/cluster.ts` |
| Email draft delivery + reply-to-correct | `EMAIL_DELIVERY_ENABLED` | `lib/agent/draft-pipeline.ts` |
| Auto-post (post without review) | `AUTO_POST_ENABLED` | `app/agents/[id]/setup/sources-card.tsx` |
| Website sources | greyed in the Sources card | `app/agents/[id]/setup/sources-card.tsx` |

The shipped flow is: connect X → tracked sources scanned → drafted in the reporter's voice → Slack notification → reporter clicks Post to X.

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
