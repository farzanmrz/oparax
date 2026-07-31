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

**Two Slack paths share nothing.** `SLACK_WEBHOOK_URL` is a workspace-wide webhook into the owner's `#drafts` — a personal observation rig that always works with no login, and in code the legacy fallback when a desk has no `slack_accounts` row. The per-desk OAuth app (`SLACK_CLIENT_*`) is the real product delivery path. **A missing per-desk link is not a delivery blocker and never a reason to gate a run on the owner doing OAuth** — conflating the two cost ~12% of one session. A message landing in `#drafts` via the fallback PROVES the delivery hop. The Slack app's redirect allowlist still lacks the beta callback: dashboard config, not app code.

**The Sentry DSN is deliberately not an env var** — it is public by design, so it is inlined in `lib/observability/sentry-shared.ts` rather than becoming a key that fails a build when absent.

Dead keys, so nobody rewires them: `XAI_API_KEY` and `CRON_SECRET` — both their consumers were deleted.

## Code map

`ls` gives you structure. These are the facts it cannot.

- **`app/api/ingest` is the delivery interface** — the Bearer-authed entry point every source post enters through. Nothing polls; there is no scan dispatcher.
- **`app/api/slack/interactions`** is `after()`-deferred so Slack's 3s ack deadline is met before the slow X-post work runs.
- **`lib/agent/desk-config.ts` owns `checkXPostable`**, the shared X validity gate called by both `lib/x/post-core.ts`'s posting path and the desk's `editDraft`. A draft that passes at edit time is therefore guaranteed to pass at post time. A third writer of a `drafts` winner must call it too, never re-derive it.
- **`lib/x/timeline.ts` is the ONE designated extraction X-read** — 100 most recent ORIGINAL posts, app-only bearer, `exclude=retweets,replies`, because a reply-heavy corpus teaches `measuredFacts` a mention rate that opens every draft with an @handle.
- **Tokens never leave `lib/x/` and `lib/slack/`.** Both stores are service-role only.
- **`lib/voice/rules.ts` holds the drafting input of record:** `flattenRulesToPrompt(enabledRules) + measuredFacts` replaces the raw guide in the system prompt; the guide blob survives only as audit provenance. `corpus-store.ts` upserts and never prunes. `extraction-run.ts`'s `startRun` is an atomic claim returning a boolean — callers must not spend when it returns false. That bounds one desk to ONE concurrent run; it is **not** rationing and must never grow into it. Progress reaches the browser by POLLING an ownership-proving server action, never Realtime — the table is deny-all RLS.
- **`lib/notify/` senders neither persist nor meter** — `draft-pipeline.ts` does both. `email.ts` keeps the reply encoder and its decoder in one file so they cannot drift.
- **`lib/sysprompts/voice-extract.md` is measured, not authored.** Never tune it by read-through.
- **Sentry**: the four root files (`instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) must keep those exact names — the build plugin finds them by name. Four deliberate deviations from the wizard, all load-bearing: `tunnelRoute: "/monitoring"` is **excluded from `proxy.ts`'s matcher** (catching it is the documented way to lose every client-side error report); `httpBodies: []` because a body here carries unpublished drafts; `tracesSampleRate` 1 in production with the 1.75s extraction polls dropped in `beforeSendTransaction`; and `@sentry/profiling-node` deliberately absent after it grew a dev server to 6.6 GB RSS. Local AI DevTools is development-only.

Gitignored and regenerable: `.next/`, `data/`, `.vercel/`. `.feature/` is the flow's scratch — `ship.sh` sweeps it; never delete it by hand.

## Data

**Columns and types: read `lib/supabase/database.types.ts`** — it is generated from the live database, so it is always current and the migrations never need reading for shape. What generated types cannot carry is RLS, which is why this table exists. `supabase/migrations/` is the mirror of every applied migration; migrations are applied through the Supabase MCP (`.claude/rules/supabase.md`).

| Table | What it holds | RLS shape |
| --- | --- | --- |
| `agents` | a desk (the unit a reporter owns) | owner-scoped |
| `voice_guides`, `voice_rules` | the extracted voice, keyed by `agent_id` | EXISTS-join, select-only, no `owner_id` |
| `stories`, `story_assignments` | clustered stories and their per-desk claim | EXISTS-join, select-only |
| `drafts` | a drafted post + its post-outcome stamps | EXISTS-join (**insert policy too**) |
| `usage_events` | metering for every billable touch point | owner-scoped, select-only |
| `source_posts`, `model_calls` | ingested posts; one row per model call | deny-all |
| `corpus_posts` | per-desk extracted corpus, including off-beat exclusions | deny-all |
| `beat_conflicts` | ground-versus-judge disagreements awaiting resolution | EXISTS-join, select-only |
| `x_accounts`, `slack_accounts`, `slack_delivery_receipts` | OAuth tokens, inferred tier, delivery receipts | deny-all |
| `draft_claims`, `unmatched_deliveries` | atomic claim counters | deny-all |
| `voice_extraction_runs` | one extraction run per desk — progress only | deny-all |

Every table has RLS enabled in one of **three shapes**, and a new table picks one rather than inventing a fourth:

- **Owner-scoped** — full 4-policy on `owner_id` (`agents`), some select-only (`usage_events`).
- **EXISTS-join through an owner-scoped parent** — children joining `agents` **by `agent_id`**, including `voice_guides`/`voice_rules`, which carry no `owner_id` of their own. (Those two joined by `reporter_handle` until the shared-guide model was deleted; the id join is what closed the cross-user read it allowed.)
- **Deny-all — RLS on, zero policies** — token stores, ledgers, the atomic claim counters, `voice_extraction_runs`.

**Writes:** the pipeline tables have **no insert/update/delete policies at all**, service-role only, so a browser cannot forge a guide, a rule, a story, a ledger row, a Slack token, or zero its own spend. `drafts` is the one exception, carrying **both** an owner-scoped INSERT policy (`drafts_insert_via_agent`, the edit-in-place path) **and** service-role writes, with post-outcome columns stamped service-role after an RLS ownership check.

## Conventions

- **Delegation, with a floor.** Current models reach for subagents readily, so the useful instruction is where NOT to: don't delegate work you'd finish in a handful of tool calls, and don't spawn one to check your own work. When you do delegate, give each agent disjoint file ownership and keep shared or write-heavy coordination in the primary session.
- **Formatting is automatic — never run it by hand.** A `PostToolUse(Edit|Write)` hook (`.claude/hooks/biome-write.sh`) runs `biome check --write` on every file as it's written, in this session and in every subagent. Don't run `pnpm format` / `pnpm lint:fix` in bulk to "clean up" — it's already done, and a bulk pass only adds churn to the diff. `pnpm lint` stays useful as a read-only check. Only the residual Biome won't auto-fix (no-fix or `--unsafe` rules) needs an agent: that's `feature-lint`'s job.
- **Codex network commands are fail-loud.** Its pre-tool hook rejects silent `curl` without failure/error flags, and `curl` pipelines without `pipefail`: an empty result must never mask a DNS or HTTP failure. Use `curl -fsS` and enable `pipefail` before a pipeline.
- **No persistence until a data shape earns it.** Every new table is a real feature slice (plan it), not a quick add mid-task, and it picks one of the three RLS shapes above.
- **Justify a decision, not a step.** A decision gets re-litigated, so it carries the fact that settled it — that is why "Settled decisions" is dense and stays dense. A procedure step never gets argued with, so an incident narrative attached to one is pure per-load cost: put it in the commit message and keep the step. **Ceiling: 120 words per paragraph or list item**, enforced by `doc-census.sh` and cut by every QC round's doc step. This exists because AGENTS.md ratcheted 1,898 B → 40,816 B on 84 growing commits against 25 shrinking ones, and nothing in the flow was ever scoped to look at the file as a whole.

### Every model call records its output AND its reasoning trace

One `model_calls` row per call — any stage (extraction, drafting, judge, scan), whether one model runs or five — carrying `output`, `reasoning`, `usage`, `cost_usd`, `generation_id`. Storing a token count without the trace is not compliance.

The row is owed by **any call that completed and billed, including on an error path**: if a later step (a repair, a schema-parse, the judge) throws, capture the finished call's `output`/`usage` off the error and record it anyway. A downstream throw must never discard an already-paid call's row.

**On Claude models the trace is a summary gated on `thinking.display`, which defaults to `"omitted"` — and "omitted" still returns a thinking block with an empty `text`, so a default call looks exactly like a model that cannot expose reasoning.** Pass flat `reasoning` for effort plus `thinking: { type, display: "summarized" }` for Anthropic's visible summary. In AI SDK v7 an effort-free provider object and flat reasoning coexist. Provider-specific effort/budget overrides flat reasoning rather than merging with it, and `type` remains required once a `thinking` object is present (display-only provider options return 400). Every call also stamps `usage.reasoningWithheldByProvider` to keep "withheld" distinguishable from "not captured".

Write via the service-role client (the table has no insert policy) and never duplicate the output elsewhere: `voice_guides.provenance` is a `{ modelCallId }` pointer and `drafts` joins through `model_call_id`.

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

Each carries the fact that settled it, because that is what stops it being
re-argued. These bind **planning**. Area-specific rejects live in that area's rule.

- **Ingestion is a persistent stream + ONE forwarder, on Railway (~$5/mo flat).** Webhook delivery is Enterprise-only, and registering a webhook is ungated — so the naive probe returns a false-positive success. X allows 1 concurrent stream per account, making per-user forwarders structurally pointless; routing lives in Supabase. **Rejected:** Vercel-native always-on (maxDuration ceilings, cron documented best-effort with no retries, Sandbox ≈$31/mo) and Fly.io.
- **Model picks.** Extraction on `anthropic/claude-sonnet-5`; grounding and verification on `alibaba/qwen3.7-flash` with original media on both calls. The 8-model extraction panel was won by `claude-fable-5` at a measured **$0.855/reporter** across 10/10; later changes are new-model trials, not a rewrite of that evidence. A 1,000-draft run found the reporter guide mattered far more than the draft model. Model-routing architecture is a new feature, never a silent change here. **Rejected:** OpenRouter (crowd-spend routing, Fusion 4–5× cost, free models train on inputs, ~5.5% fee).
- **The voice corpus comes from X's API, not a scraper.** Bright Data returns ZERO records for every profile because X serves logged-out clients a signup wall. The API returns 100 posts minutes old, within 2,000,000/month. The old "a user-context read bills our tier" objection was about USER-context reads; this uses the app-only bearer, which also lets the owner override read any public timeline without impersonation.
- **A voice guide belongs to ONE desk. Extraction is never deduped, shared, or rationed.** Two desks on the same reporter each extract and each pay. The shared-per-handle model was **deleted outright, not reduced**: it optimized a case that does not occur and cost four pipeline gates, a table, a cross-user read hole, and an undiagnosable failure mode. **Never reintroduce sharing, per-day claims, or lookup caps.** If spend needs bounding, bound it per OWNER.
- **Connect X is a UI gate, not a security boundary.** `createDesk` derives `reporter_handle` from the linked `x_accounts` row — a product rule, not an RLS one, since `agents`' INSERT policy has no value constraint. **Never argue that relaxing the form gate widens a security boundary; there is none there.** Extraction uses the app-only bearer and never the reporter's token, and posting resolves via `getXAccount(ownerId)`. Voice and publishing were only ever coupled in the form.
- **Handle casing is stored exactly as typed.** Matching is case-insensitive at compare time and x.com resolves either casing; the one real reason to lowercase died with the shared-guide model.
- **UI is feed-first, no global sidebar.** The sidebar served exactly one nav destination (measured), and the reporter arrives from a notification. **The container holds the future, not reserved blank chrome:** no greyed placeholder for an unspecified stage; greying a specified-but-unbacked control is fine.
- **Metering from the first commit.** Every touch point stamps `usage_events`. Per-request cost resolves via `getGenerationInfo()` on the gateway generation id, which works for every provider.

### Dormant by design — switched off, not missing

Built, working, and deliberately off so the shipped flow stays small. Each is ONE named constant; flipping it back is the whole reactivation. Don't "fix" these as gaps, and don't rebuild them.

| Capability | Lever | Where |
| --- | --- | --- |
| LinkedIn / Bluesky drafting | `PLATFORMS` (the `Platform` type stays complete) | `lib/agent/desk-config.ts` |
| Story clustering (many posts → one story) | `CLUSTERING_ENABLED` | `lib/agent/cluster.ts` |
| Email draft delivery + reply-to-correct | `EMAIL_DELIVERY_ENABLED` | `lib/agent/draft-pipeline.ts` |
| Auto-post (post without review) | `AUTO_POST_ENABLED` | `app/agents/[id]/setup/sources-card.tsx` |
| Website sources | greyed in the Sources card | `app/agents/[id]/setup/sources-card.tsx` |

## Cross-tool

`AGENTS.md` is canonical — non-Claude agents read it directly; `CLAUDE.md` is just `@AGENTS.md`. Path-scoped guidance is in `.claude/rules/` (Claude Code only; the four guards other harnesses provably never see are promoted above).

**Branches.** `.githooks/` is the versioned guardrail (`core.hooksPath=.githooks`). **`main` and `beta` are the only permanent refs** — never delete or force-update them, and the GitHub ruleset enforces the same pair. `dev` was retired 2026-07-30 (issue #70 Phase 3) once its soak proved nothing still cut from it. Feature slices live on `ft/<issue#>` and are deleted after they ship; a repo with only `main` and `beta` is the normal resting state. Vercel maps `beta` → beta.oparax.ai and `main` → oparax.ai; promote strictly `beta` → `main`. App code never lands directly on `beta`/`main` — the one carve-out is owner-directed instruction-file and doc micro-edits.

**Session continuity is global and branch-agnostic:** `/handoff` writes one checkpoint per session to `~/.claude/handoffs/<session-id>.md`; `/continue <session-id>` resumes it from anywhere. The flow itself persists nothing.

### The feature flow

`/feature` → `/feature-plan` → `/feature-build` → `/feature-qc` → `/feature-ship`
in `.claude/skills/`, mirrored into `.agents/skills/` so Codex invokes the same
files as `$feature-plan` etc. **The skills are the contract — read the one you are
running.** Each carries a dials table for what differs per harness; a per-harness
difference belongs in a dials row, never in a second copy of the skill.

Every phase starts from durable state only — issue body, branch,
`origin/beta...ft/<N>`, the `## QC round <R>` comments — so a slice may switch
harness at any phase boundary in either direction.

Two health checks, and they answer different questions. `bash
.claude/skills/feature/scripts/doctor.sh` is the four-CLI equivalent of Claude
Code's `/doctor` — every config parses, every hook script exists, every agent
definition is well-formed, across all four harnesses. It proves CONFIGURATION
only.

The external review council is `codex` + `grok` + `agy`, launched by
`.claude/workflows/council/run.sh`. **Prove it FUNCTIONS before trusting it:**
`bash .claude/workflows/council/selftest.sh` drives every lane through the real
wrapper and schema on cheap dials in ~90s. A failed lane is FAILED, never a clean
pass.

**Per-harness setup facts — which directory each CLI really scans, why a subagent
will not spawn, the dead ends already tested — live in the global
`harness-nuances` skill. Read it before researching any of that again.**

`docs/` holds Farzan's own notes, **not project instruction** — ignore unless he points you at one. `voice-extraction-learning-dossier.md` is 130 KB: never read it wholesale, grep it.
