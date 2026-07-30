# Oparax

AI news desk for reporters: monitors their beat across X, catches stories as they break, drafts a post in the reporter's voice, and — once trusted — posts autonomously.

**The shipped flow:** connect X → tracked sources scanned → drafted in the reporter's voice → Slack notification → the reporter clicks Post to X.

Around it: password-only Supabase auth, a feed-first agent workspace (site header + agent switcher + account menu), each agent's Feed / Voice / Setup sections, feed cards with in-place draft editing and one-click council provenance, live voice extraction + an editable per-rule voice guide, per-desk Slack delivery with a legacy-webhook fallback, a create-agent form gated on Connect X, and settings.

Capabilities built but deliberately switched off are listed under **Dormant by design**. **Treat them as decisions, not gaps.**

## Issue selection

Open GitHub issues are independent work candidates, not a prescribed sequence. The owner chooses which issue to plan or build; issue numbers and cross-references do not establish an execution order. Never infer or propose the next slice automatically.

## Stack

Next.js App Router + React + TypeScript strict (`@/*` → repo root) · `ai` + `@ai-sdk/react` · Tailwind + stock shadcn + vendored ai-elements · Supabase auth + owner-scoped app tables · Sentry (errors, tracing, logs, session replay) · pnpm (a preinstall guard hard-fails npm/yarn) + Biome.

- **Versions live in `package.json`** — read it rather than trusting a number here.
- **Version-matched docs ship inside the install** — consult them before non-trivial API work instead of trusting training data: Next.js at `node_modules/next/dist/docs/`, the AI SDK at `node_modules/ai/docs/`. Grep these for exact-API questions; the `vercel:ai-sdk` / `vercel:nextjs` skills stay the source for conceptual guidance, not version-pinned signatures.
- **pnpm layout:** there is no top-level `node_modules/@ai-sdk/` — scoped packages resolve under `node_modules/.pnpm/`. Probe with `pnpm list <pkg>`, and never end a compound shell command with a may-fail `ls` probe (its exit code marks the whole step failed even when the useful half succeeded).

### Commands

Ordinary `package.json` scripts (`pnpm dev` serves :3000). Never run `pnpm format` / `pnpm lint:fix` by hand — see Formatting below. The one non-obvious gate: **`pnpm build` compiles `/api/ingest` + `/api/email/inbound` but never calls them, so a broken pipeline still builds green.**

### Environment

`.env.local`, fifteen keys, plus `SENTRY_AUTH_TOKEN` in its own gitignored `.env.sentry-build-plugin` (build-time source-map upload only — without it a deployed stack trace is minified and nothing else breaks). Supabase dashboard-side config: `.claude/rules/supabase.md`. Frontend test login: `testuser@oparax.ai` / `hello123`.

| Key | Consumed by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `lib/supabase/` clients |
| `SUPABASE_SECRET_KEY` | `lib/supabase/admin.ts` — the service-role client, used by every path that writes rows no user session can |
| `AI_GATEWAY_API_KEY` | AI Gateway for local model calls (deployed = Vercel OIDC) |
| `X_CLIENT_ID` + `X_CLIENT_SECRET` | `lib/x/api.ts` — X OAuth2 confidential-client credentials (link flow + posting) |
| `X_BEARER_TOKEN` | the APP-ONLY bearer: `lib/x/timeline.ts` (the one designated extraction corpus read), the whole Railway forwarder (`ingest/src/{env,rules,stream}.ts`), and `scripts/verify-externals.ts`. Without it both the voice corpus and ingestion stop |
| `INGEST_SECRET` | `app/api/ingest/route.ts` — fail-closed `Bearer` auth on the delivery interface; Railway-side parity proven live against beta |
| `SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET` + `SLACK_SIGNING_SECRET` | `lib/slack/*` + `app/auth/slack/*` — per-desk Slack OAuth and the interactions route's raw-body HMAC |
| `SLACK_WEBHOOK_URL` | `lib/notify/slack.ts` — see the two-Slack-paths note below |
| `RESEND_API_KEY` + `RESEND_FROM` + `RESEND_REPLY_DOMAIN` + `RESEND_WEBHOOK_SECRET` | `lib/notify/email.ts` + `app/api/email/inbound/route.ts`. **Documented, not provisioned** — absent from `.env.local` and Vercel; the email leg is also off behind `EMAIL_DELIVERY_ENABLED`, so provisioning Resend alone will not turn draft emails back on |
| `NOTIFY_EMAIL_TO` | `lib/agent/draft-pipeline.ts` — the reporter's address (per-desk delivery config is not built) |

**Two Slack paths exist and share nothing.** (1) `SLACK_WEBHOOK_URL` → a workspace-wide incoming webhook into the owner's `#drafts` channel: a personal observation rig, and in code the legacy fallback that fires whenever a desk has no `slack_accounts` row. It always works and needs no login. (2) The per-desk OAuth app (`SLACK_CLIENT_*`) → the end user's own linked Slack, the actual product delivery path. A verification slice PROVES the delivery hop when a message lands in `#drafts` via the fallback; **a missing per-desk Slack link is not a delivery blocker and never a reason to gate a run on the owner performing OAuth** (conflating the two cost ~12% of one session). Note the Slack app's OAuth redirect allowlist has no `https://beta.oparax.ai/auth/slack/callback` entry yet — dashboard-side config, not app code.

**The Sentry DSN is deliberately NOT an env var** — it is public by design (Sentry ships it to every browser), so it is inlined in `lib/observability/sentry-shared.ts` rather than becoming a key that fails a build when absent.

Dead keys, listed so nobody rewires them: `XAI_API_KEY` (its client and only caller were deleted) and `CRON_SECRET` (the per-minute cron dispatcher was deleted; the ingestion worker replaced polling).

## Code map

Read `ls` for structure; this covers only what a directory listing cannot tell you.

- `app/` — `api/ingest` is **the delivery interface**, the Bearer-authed entry point a source post enters through (`x`/`website`-discriminated). `api/email/inbound` is the Svix-verified Resend webhook turning an emailed reply into a draft correction. `api/slack/interactions` is the Slack interactive-button webhook — raw-body HMAC, fail-closed, `after()`-deferred so the 3s ack deadline is met before the slow X-post work runs. `agents/new` gates on Connect X: `createDesk` derives `reporter_handle` from the linked `x_accounts` row rather than a typed field. `agents/[id]` is the desk (Feed / Voice / Setup).
- `components/` — `ui/` is the stock shadcn kit and `ai-elements/` the chat-surface kit; everything at the top level is bespoke app chrome. Both kits are vendored: **wrap or extend, never hand-edit in place** — a re-add from the registry silently overwrites it (`.claude/rules/components.md`).
- `lib/agent/` — `cluster.ts` (story clustering), `draft-ground.ts` / `draft-judge.ts` / `draft-pipeline.ts` (the multimodal Qwen 3.7 Flash grounder + verification judge and the delivery pipeline behind `/api/ingest`), `draft-council-run.ts` (correction revision), and `desk-config.ts` — which owns `PLATFORMS`, `X_CHAR_LIMITS`, and **`checkXPostable`, the shared X validity gate** that both `lib/x/post-core.ts`'s posting path and the desk's `editDraft` action call, so a draft that passes at edit time is guaranteed to pass at post time. A future third writer of a `post_drafts` winner must call it too rather than re-deriving the check.
- `lib/x/` — the X integration. `api.ts` (raw-fetch OAuth2 + post client), `store.ts` (service-role token store; **tokens never leave this dir**), `link-state.ts`, `actions.ts` (`postDraftToX` for a browser caller + `postDraftToXForOwner`, the session-independent core the auto-post path shares).
- `lib/x/timeline.ts` — **the ONE designated extraction X-read.** `fetchUserTimeline` pulls the 100 most recent ORIGINAL posts, app-only bearer, `exclude=retweets,replies` — because a reply-heavy corpus teaches `measuredFacts` a mention rate that would open every generated draft with an @handle. Meters `usage_events`.
- `lib/slack/` — mirrors `lib/x/`'s shape (Vercel Connect was evaluated and rejected: it could not carry the per-desk token model). Tokens never leave this dir.
- `lib/observability/sentry-shared.ts` + the four root-level Sentry files (`instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) + `app/global-error.tsx`. **The four root files must keep those exact names and locations** (Sentry's build plugin finds them by name); anything the three runtimes must agree on lives in `sentry-shared.ts` so it cannot drift three ways. Four decisions there are load-bearing and differ from the wizard's defaults:
  - **`tunnelRoute: "/monitoring"` is excluded from `proxy.ts`'s matcher.** The wizard's matcher caught it, which is the documented way to lose every client-side error report.
  - **`httpBodies: []`** — a request body here routinely carries a reporter's unpublished draft, which has no place in a third-party error report.
  - **`tracesSampleRate` is 1 in production**, with Feed/Voice's 1.75s extraction-progress polls dropped explicitly by `beforeSendTransaction`. Error capture is unsampled regardless.
  - **`@sentry/profiling-node` is deliberately absent** — at 100% it grew a local dev server to 6.6 GB RSS and wedged it. Sentry's AI spans, replay, logs, metrics, alerts, and user tagging need none of it.

  Local AI DevTools records complete prompts, outputs, and provider payloads in development only; it must never be enabled in production.
- `lib/notify/` — draft delivery, raw `fetch` only, no vendor SDKs. `email.ts` holds the plus-addressed reply encoder **and its decoder** in one file so they cannot drift. These are thin senders: they neither persist nor meter — `lib/agent/draft-pipeline.ts` does both.
- `lib/voice/` — the voice pipeline. `deploy-guide.ts` strips extractor-verification sections before a guide becomes a drafting prompt (16.1% off every draft) and reroutes `## Beat & Scope` out-of-band to the drafter's `beatSpec`. `measured-facts.ts` computes the guide's measurable half. `corpus-store.ts` accumulates per-desk corpus by upsert and **never prunes** — a re-extraction only adds and refreshes. `rules.ts` holds `voice_rules` CRUD + `flattenRulesToPrompt`, **the drafting input of record**: `flattenRulesToPrompt(enabledRules) + measuredFacts` replaces the raw guide's role in the system prompt, and the guide blob survives only as immutable audit provenance.
  - `extraction-run.ts` — `startRun` is an **atomic claim returning a boolean** (insert; on `23505` conflict, update guarded by `.neq("status","running")`), and callers must not spend when it returns false. That bounds one desk to ONE concurrent run, so a double-clicked Retry bills once. It is emphatically **not** per-reporter/per-day rationing, and must never grow into it; `recordProgress`/`finishRun` are pure bookkeeping and refuse nobody. **Progress reaches the browser by POLLING an ownership-proving server action, never Supabase Realtime** — the table is deny-all RLS and a browser cannot subscribe to it.
- `lib/sysprompts/` — the live prompts as markdown. `voice-extract.md`'s wording is **measured, not authored**: treat every edit as a deliberate divergence and never tune it by read-through.
- `lib/` (root) — Supabase clients typed by the generated `lib/supabase/database.types.ts`; auth server actions; `lib/agents.ts` (desk render helpers); `lib/x/handle.ts` (the shared normalize+validate rail every handle-persisting write path uses); `lib/websites.ts`; `lib/format.ts`.

Gitignored and regenerable — delete freely when nothing runs: `.next/`, `data/`, `.vercel/`. `.feature/` is the feature flow's live scratch; never delete it by hand, `ship.sh` sweeps it.

## Data

**Columns and types: read `lib/supabase/database.types.ts`** — it is generated from the live database, so it is always current and the migrations never need reading for shape. What generated types cannot carry is RLS, which is why this table exists. `supabase/migrations/` is the mirror of every applied migration; migrations are applied through the Supabase MCP (`.claude/rules/supabase.md`).

| Table | What it holds | RLS shape |
| --- | --- | --- |
| `experiments` | a desk (the unit a reporter owns) | owner-scoped |
| `agents`, `runs`, `drafts` | **legacy, dormant — no live reader** | owner-scoped / EXISTS-join |
| `voice_guides`, `voice_rules` | the extracted voice, keyed by `experiment_id` | EXISTS-join, select-only, no `owner_id` |
| `stories`, `story_assignments` | clustered stories and their per-desk claim | EXISTS-join, select-only |
| `post_drafts` | a drafted post + its post-outcome stamps | EXISTS-join (**insert policy too**) |
| `usage_events` | metering for every billable touch point | owner-scoped, select-only |
| `source_posts`, `model_calls` | ingested posts; one row per model call | deny-all |
| `corpus_posts` | per-desk extracted corpus, including off-beat exclusions | deny-all |
| `beat_conflicts` | ground-versus-judge disagreements awaiting resolution | EXISTS-join, select-only |
| `x_accounts`, `slack_accounts`, `slack_delivery_receipts` | OAuth tokens, inferred tier, delivery receipts | deny-all |
| `draft_claims`, `unmatched_deliveries` | atomic claim counters | deny-all |
| `voice_extraction_runs` | one extraction run per desk — progress only | deny-all |

Every table has RLS enabled in one of **three shapes**, and a new table picks one rather than inventing a fourth:

- **Owner-scoped** — full 4-policy on `owner_id` (`agents`, `experiments`), some select-only (`usage_events`).
- **EXISTS-join through an owner-scoped parent** — children joining `experiments`/`agents` **by `experiment_id`**, including `voice_guides`/`voice_rules`, which carry no `owner_id` of their own. (Those two joined by `reporter_handle` until the shared-guide model was deleted; the id join is what closed the cross-user read it allowed.)
- **Deny-all — RLS on, zero policies** — token stores, ledgers, the atomic claim counters, `voice_extraction_runs`.

**Writes:** the pipeline tables have **no insert/update/delete policies at all**, service-role only, so a browser cannot forge a guide, a rule, a story, a ledger row, a Slack token, or zero its own spend. `post_drafts` is the one exception, carrying **both** an owner-scoped INSERT policy (`post_drafts_insert_via_experiment`, the edit-in-place path) **and** service-role writes, with post-outcome columns stamped service-role after an RLS ownership check.

## Conventions

- **Parallel delegation.** Proactively use subagents for two or more independent, bounded workstreams; assign disjoint file ownership and keep shared/write-heavy coordination in the primary session.
- **Formatting is automatic — never run it by hand.** A `PostToolUse(Edit|Write)` hook (`.claude/hooks/biome-write.sh`) runs `biome check --write` on every file as it's written, in this session and in every subagent. Don't run `pnpm format` / `pnpm lint:fix` in bulk to "clean up" — it's already done, and a bulk pass only adds churn to the diff. `pnpm lint` stays useful as a read-only check. Only the residual Biome won't auto-fix (no-fix or `--unsafe` rules) needs an agent: that's `feature-lint`'s job.
- **Codex network commands are fail-loud.** Its pre-tool hook rejects silent `curl` without failure/error flags, and `curl` pipelines without `pipefail`: an empty result must never mask a DNS or HTTP failure. Use `curl -fsS` and enable `pipefail` before a pipeline.
- **No persistence until a data shape earns it.** Every new table is a real feature slice (plan it), not a quick add mid-task, and it picks one of the three RLS shapes above.

### Every model call records its output AND its reasoning trace

One `model_calls` row per call — any stage (extraction, drafting, judge, scan), whether one model runs or five — carrying `output`, `reasoning`, `usage`, `cost_usd`, `generation_id`. Storing a token count without the trace is not compliance.

The row is owed by **any call that completed and billed, including on an error path**: if a later step (a repair, a schema-parse, the judge) throws, capture the finished call's `output`/`usage` off the error and record it anyway. A downstream throw must never discard an already-paid call's row.

**On Claude models the trace is a summary gated on `thinking.display`, which defaults to `"omitted"` — and "omitted" still returns a thinking block with an empty `text`, so a default call looks exactly like a model that cannot expose reasoning.** Pass flat `reasoning` for effort plus `thinking: { type, display: "summarized" }` for Anthropic's visible summary. In AI SDK v7 an effort-free provider object and flat reasoning coexist. Provider-specific effort/budget overrides flat reasoning rather than merging with it, and `type` remains required once a `thinking` object is present (display-only provider options return 400). Every call also stamps `usage.reasoningWithheldByProvider` to keep "withheld" distinguishable from "not captured".

Write via the service-role client (the table has no insert policy) and never duplicate the output elsewhere: `voice_guides.provenance` is a `{ modelCallId }` pointer and `post_drafts` joins through `model_call_id`.

**Two epistemic rules this cost real money to learn:** a parameter accepted with HTTP 200 is not a parameter honored — read the effect back, never trust the status. And an absent value under DEFAULT configuration is not proof that no configuration produces it — find the parameter that governs the field and test *that* before recording an impossibility.

### UI copy & form conventions — owner rule, enforce every time

Hard rules for ALL user-facing UI, overriding anything the imported design mock did:

1. **Sentence case only — never ALL-CAPS.** No `uppercase` Tailwind utility, no `text-transform: uppercase`, no ALL-CAPS literal strings, anywhere — labels, section headers, badges, eyebrows, buttons, table headers. Capitalize the first word only; keep proper nouns and acronyms as written (`X`, `AI`, `Slack`).
2. **No eyebrow/kicker headers.** Never stack a small muted category label *above* a title. A header is one line. A title may carry a *meaningful* description below it (a `DialogDescription`'s helper text is fine), but never a redundant category label above it, and never one heading split across a bold line plus a gray subline.
3. **Uniform form fields.** Every field in a form shares one visual treatment. A disabled / "coming soon" field is greyed (opacity) plus a "Coming soon" badge — it does NOT get a special bordered or dashed container that makes it structurally different from the active fields. Grey it; don't box it.

## Guards non-Claude harnesses cannot see

`.claude/rules/*.md` are path-scoped and load only in Claude Code. Codex has **no rules-file concept at all**, so these four bite hardest when they go unseen — full text still lives in the named rule:

- **Never re-add a project-scoped `supabase` entry to `.mcp.json`.** OAuth tokens are stored per endpoint URL, so a project-scope entry with a different URL (even just a narrower `features=` list) shadows the authenticated global server with an unauthenticated one — every session then reports "needs authentication" while `claude mcp list` shows the global server Connected. This happened once and cost a session. One server, user scope, one URL. (`supabase.md`)
- **Vendored kits are never hand-edited in place** — wrap or extend `components/ui` and `components/ai-elements`; a registry re-add silently overwrites edits. (`components.md`)
- **X's live caps are not the documented ones:** 5 rules per app and 15 per project, not 1,000. Design ingestion rules against the live caps. (`x.md`)
- **`app/agents/layout.tsx` is the sole auth guard for `/agents/*`.** Anything added under that tree inherits protection; anything added outside it does not. (`app.md`)

## Settled decisions — don't re-litigate without a NEW fact

Each carries the fact that settled it. These bind **planning**. Area-specific rejects live in that area's rule.

- **Ingestion is a persistent stream + ONE forwarder, on Railway.** Webhook delivery is Enterprise-only — and registering a webhook is ungated, so the naive probe returns a false-positive success. X allows 1 concurrent stream connection per account, so per-user or per-desk forwarders are structurally pointless; routing lives in Supabase instead. Railway verified ~$5/mo flat. **Rejected:** Vercel-native always-on (maxDuration ceilings; cron is documented best-effort with no retries; Sandbox ≈$31/mo single-region) and Fly.io (superseded by Railway at equal-or-better cost).
- **Current model picks.** Voice extraction temporarily uses `anthropic/claude-sonnet-5` with adaptive medium thinking while live streaming is exercised. Draft grounding and verification use `alibaba/qwen3.7-flash` with the original media on both calls. The 8-model extraction panel was won by `claude-fable-5` at a measured **$0.855/reporter** across 10/10; later Opus/Sonnet changes are new-model trials, not a rewrite of that evidence. Drafting remains input-dominated, and a 1,000-draft run found the reporter guide mattered much more than the draft model. Evidence-first or model-routing architecture work belongs in a new feature, not a silent change to this pipeline. **Rejected:** OpenRouter (auto-router picks by 7-day crowd spend; Fusion is 4–5× cost and 2–3× latency; free models train on inputs; ~5.5% credit fee).
- **The voice corpus comes from X's own API, not a scraper.** Live-probed: Bright Data's X posts dataset returns ZERO records for every profile, because X serves logged-out clients a signup wall — their own Web Unlocker fetch shows the bio and no posts. The X API returns 100 posts for the same handle, minutes old, within a project cap of 2,000,000 posts/month. The old objection ("a user-context read still bills the app's own X tier") was about USER-context reads; this uses the APP-ONLY bearer, which also lets the owner-handle override read any public timeline without impersonating anyone. Bright Data's key, module, skills and docs agent are all removed.
- **A voice guide belongs to ONE desk, and extraction is never deduped, shared, or rationed.** `voice_guides`/`voice_rules` are keyed by `experiment_id`; two desks on the same reporter each extract and each pay. The previous shared-per-handle model with an atomic once-per-reporter-per-day spend claim was **deleted outright, not reduced**: it optimized a case that does not occur, and cost four pipeline gates, a table, a cross-user read hole, and a failure mode that could not be diagnosed after the fact. **Do not reintroduce sharing, per-day claims, or lookup caps.** If spend ever needs bounding, bound it per OWNER — never per handle, which was never the unit anyone shared.
- **Connect X is a UI gate, not a security boundary — and the two are deliberately separable.** `createDesk` derives `reporter_handle` from the linked `x_accounts` row, so through the form a user can only extract their own voice. That is a *product* rule, not an RLS one: `experiments` has an owner-scoped INSERT policy with no value constraint, so any signed-in user can mint a row with any `reporter_handle`. **Never argue that relaxing the form gate widens a security boundary; there is no boundary there to widen.** Two facts make this safe: extraction reads the public corpus with the app-only bearer and never touches the reporter's OAuth token, and posting resolves the account via `getXAccount(ownerId)` — owner-keyed, never by the desk's `reporter_handle`. "Whose voice we draft in" and "whose account publishes" were never coupled in code, only in the form.
- **Owner-only handle override.** For an allowlisted owner email the extract-from field pre-fills with the connected handle and becomes editable, for testing a reporter the owner cannot authenticate as. The field sets the desk's `reporter_handle`, which is what the corpus is pulled for. Connect X still gates desk creation (the owner needs it to post regardless).
- **Handle casing is stored exactly as typed.** `normalizeHandle` trims and strips a leading `@`, nothing else. Matching is case-insensitive at compare time, x.com resolves either casing to the same profile, and the one real reason to lowercase — global unique keys billing two casings as two reporters — died with the shared-guide model.
- **UI: feed-first, no global sidebar.** The old sidebar served exactly one nav destination (measured, not felt), and the reporter arrives from a notification, so a listing is a detour on every visit. **The container holds the future, not reserved blank chrome:** no greyed placeholder for an *unspecified* stage. Greying a *specified but not-yet-backed* control is fine, and is what the dormant surfaces below use.
- **Metering from the first commit.** Every touch point stamps `usage_events` — stream deliveries, scrapes, every model call, every notification. Per-request model cost resolves via `getGenerationInfo()` on the gateway generation id, which works for every provider.

### Dormant by design — switched off, not missing

Built, working, and deliberately off so the shipped flow stays small. Each is ONE named constant; flipping it back is the whole reactivation. Don't "fix" these as gaps, and don't rebuild them.

| Capability | Lever | Where |
| --- | --- | --- |
| LinkedIn / Bluesky drafting | `PLATFORMS` (the `Platform` type stays complete) | `lib/agent/desk-config.ts` |
| Story clustering (many posts → one story) | `CLUSTERING_ENABLED` | `lib/agent/cluster.ts` |
| Email draft delivery + reply-to-correct | `EMAIL_DELIVERY_ENABLED` | `lib/agent/draft-pipeline.ts` |
| Auto-post (post without review) | `AUTO_POST_ENABLED` | `app/agents/[id]/setup/sources-card.tsx` |
| Website sources | greyed in the Sources card | `app/agents/[id]/setup/sources-card.tsx` |

### Cross-cutting skills

| Need | Reach for |
| --- | --- |
| env vars (local or Vercel) | `vercel:env-vars` |
| deploys / promotes / rollbacks | `vercel:deployments-cicd` |
| cron on Vercel | `vercel-functions` |
| repo-wide Biome findings | `feature-lint` |
| Sentry issues, releases, alerts | the authed **`sentry` CLI** — `sentry issue list`, `sentry issue explain <id>`, `sentry release view`, `sentry alert issues`, `sentry explore`. The Sentry plugin and its MCP were removed 2026-07-30: the CLI is a strict superset (it also creates alert rules, which the MCP could not) |
| Railway (the ingestion forwarder) | the Railway MCP for now. The `railway` CLI is installed and logged in but **not linked to a project in this repo** — one `railway link` makes the CLI sufficient and the MCP removable |

## Cross-tool

`AGENTS.md` is the canonical instruction file — non-Claude agents read it directly; `CLAUDE.md` is just `@AGENTS.md`. Path-scoped guidance lives in `.claude/rules/` (Claude Code only — see "Guards non-Claude harnesses cannot see" above).

**Branches.** `.githooks/` is the versioned local guardrail (`core.hooksPath=.githooks`). `main`, `dev`, and `beta` are permanent refs: never delete or force-update them. GitHub's ruleset is the canonical protection; ordinary fast-forward release pushes remain allowed. The feature flow cuts from and lands on `beta`; `dev` stays protected through a soak period with no automated pushes targeting it.

**Host.** Vercel Git integration — `beta` → beta.oparax.ai, `main` → oparax.ai; promote strictly `beta` → `main`.

**Session continuity is global and branch-agnostic:** `/handoff` writes one checkpoint per Claude Code session to `~/.claude/handoffs/<session-id>.md`, and `/continue <session-id>` resumes it from any session, in this project or another. The feature flow itself persists nothing — the branch identifies the slice, the issue is its spec, and QC's diff boundary is plain `origin/beta...ft/<N>`. App code never lands directly on `beta`/`main`; the one carve-out is owner-directed instruction-file and doc micro-edits.

### The feature flow — one set of skills, two harnesses

`/feature` → `/feature-plan` → `/feature-build` → `/feature-qc` → `/feature-ship` in `.claude/skills/`, mirrored into `.agents/skills/` as symlinks so Codex invokes **the same files** (`$feature-plan`, …). **The skills are the contract — read the one you're running**; each carries a dials table for what differs per harness (session model, the `.codex/agents/` roster, which council lanes run). Nothing else differs, and the parallel `cx-feature*` family was deleted 2026-07-30 because a second copy drifts: the Codex plan skill had become a measurably weaker spec-writer than the Claude one. **A per-harness difference belongs in a dials row, never in a second file.**

Every phase starts from durable state only — issue body, branch, `origin/beta...ft/<N>`, the `## QC round <R>` comments — so a slice may switch harness at any phase boundary in either direction.

The external review council is **`codex` + `grok`**. `agy` was retired 2026-07-30: `agy --print` is structurally single-shot, its only agentic path was tmux keyboard puppetry, and that model picker once silently ran Claude Opus 4.6 as the "agy" lane — a cross-model council cannot use a lane that may quietly become another family.

Two Codex facts that live nowhere else: `.codex/hooks.json` gives format-on-write parity via a thin adapter over `.claude/hooks/biome-write.sh` (needs one-time hook trust), and `.codex/config.toml` raises `project_doc_max_bytes` because Codex's 32,768-byte default silently truncated this file's tail and provably hid "Settled decisions" from every Codex session.

`.agents/skills/` also holds native Codex workflow skills that are **not** part of this flow and must never be mirrored or pushed by Claude Code: `x-check`, `x-recheck`, `x-dm`, `x-stat`, `lean-log`.

**Other harnesses.** Grok reads `AGENTS.md` natively and finds skills through `.grok/skills → .agents/skills`; its Claude-compat import of rules/agents/hooks is deliberately off, so its context is this file plus whatever a brief hands it. agy discovers essentially nothing here (flat-file skills only, no agents, no rules mechanism) — treat it as a bare model that gets `AGENTS.md` and nothing else.

`docs/` holds Farzan's own notes, **not project instruction** — ignore unless he points you at one. `voice-extraction-learning-dossier.md` is 130 KB: never read it wholesale, grep it.
