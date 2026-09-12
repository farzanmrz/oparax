# Oparax

The owner is a technical AI engineer who is vibe-coding this entire project: he does not know TypeScript, Next.js, or the web-stack machinery underneath it. Every explanation, every surfaced decision, and every skill or doc written for him states things in plain product-and-AI terms first. Never assume he can read a diff, a type signature, or a framework idiom to figure out what something means.

Oparax is an AI news desk for people who follow the news and publish (reporters, creators, newsletter writers): connect an X account and website sources to a desk, and the app watches them, filters what lands on the desk's beat, and drafts posts in the reporter's own voice, measured from their real posting corpus and never hand-authored, surfaced in the app for review. Drafting happens when the reporter presses Draft on a story; posting is always the reporter's decision. The legacy implementation uses Next.js 16 and Supabase, with worker source packages still in the checkout. See the reset baseline below for what is actually deployed.

## Reset baseline, September 11, 2026

Read [docs/setup-status.md](docs/setup-status.md) before planning or changing infrastructure, and [docs/setup-x.md](docs/setup-x.md) before any X app or bot work. The latter records the newer project-scoped bot, its registered encryption keys, credential distinctions and remaining protocol gaps. Credentials live in Basic Memory, not in these documents.

The current intended services are Vercel, Supabase, X and PostHog. The Railway project and both workers have been deleted; old credentials and app environment variables were replaced. Production is paused during the reset. The code and schema descriptions below describe the legacy implementation still in the checkout, not the new architecture or proof of a running product. Do not recreate its workers, voice/drafting machinery or retired secrets merely to satisfy these historical descriptions. The replacement schema and code removal belong to the fresh experiment feature.

## How work moves

Work moves through owner-triggered commands, each defined only by its skill file: `/feature` (Claude Code) talks the idea through, writes the plain plan the owner approves and the detailed plan the agents read, runs the critique, and creates the GitHub issue and the `ft/<issue#>` branch cut from `beta`; `$build <N>` (Codex, or `/build <N>` in Claude Code) builds from the detailed plan; `/qc <N>` reviews; `/amend <N>` adds scope to an in-flight issue and loops back into build; `/ship <N>` (or `$ship <N>`) squashes the branch onto `beta` and closes the issue after the owner has walked the result on localhost. No stage dispatches the next, with one exception: `/qc` launches the fix build itself whenever it queues fixes, on Sol High unless the invocation named Astra or Terra (`/qc <N> astra`), and every other session ends by naming the next command. Uncommitted files under `.claude/` or `.codex/` (tool configuration written mid-flow) never block a stage: the stage that meets them commits and pushes them on the current branch as a `meta:` commit. The issue carries only what the owner reads (the plain plan and one `## Amendment R` section per approved amendment, plus a QC marker per round); everything the agents read lives in git-ignored `.feature/` files on this machine and is wiped at finalize. Bug fixes run the same commands on `bf/<issue#>` (the start script takes `--prefix bf`), starting from the exact repro, whose re-proof is the acceptance journey; a trivial owner-reported fix may skip critique at the owner's word. Meta and docs changes (skills, process, this file, documentation) go directly on `beta` at the owner's direction. `beta` reaches `main` (production) only through the weekly pull request `/promote` (or `$promote`) opens on the owner's word, reviewed by the owner's mentor; ship never pushes `main`, and no stage ever deletes a branch.

- **Visual contract:** `DESIGN.md` is the default design system. An explicitly owner-approved new direction is recorded in the feature plan with the corresponding contract update scoped to that surface. Its "Marketing Surfaces" section governs the public landing page and any future marketing page.
- **Frontend test login:** No dedicated test account is currently configured. The previous dummy mailbox was removed; this does not establish that its old Supabase user record was deleted. Owner-requested browser login remains pre-authorized; do not assume a replacement test identity exists.
- **Stage execution:** No stage runs the product app: not `/feature`, `/amend`, `$build`, `/qc`, `/ship`, nor their subagents or external lanes. Never start or attach to the product dev server, run `pnpm dev` or the poller, or investigate the product at runtime. Browser use is otherwise prohibited inside stages, with one exception: `/feature` discussion and design review may research public references and inspect standalone design previews as its skill defines. The host chooses its normal research tools and passes detailed observations and available artifacts to the peer; reference research does not require browser use or screenshots, while review of a generated design receives its actual images as the skill defines. The CLI peer keeps its read-only sandbox. Never attach to a personal browser profile. It does not apply to plan critique, QC, build, amend or ship. Every stage grounds implementation in the repo's source; third-party packages are read only for public types and shipped docs, never built or minified internals. A product runtime question becomes a named build-time check and an acceptance journey the owner walks. Inside the flow, only the owner runs the product app.
- **The owner's direct word overrides the rule above, immediately.** That rule binds a stage while it executes its command; it is not a repository-wide ban on agents. When the owner, in their own words in the chat (not as the argument of `/feature`, `/amend`, `$build`, `/qc`, or `/ship`), asks the agent to start the app, open a browser, cold-test a page, or look at something running, that instruction wins on the spot: in the same session, after or between commands, with no rule change and no new session, whether or not that session ran a stage earlier. The refusal on 2026-08-18 ("the repository instruction forbids it even when you ask") was a misreading of this file; do not repeat it. The owner's existing browser-login authorizations still stand.
- **The proof bar, everywhere:** does it build, does it boot, can the owner and a user access and experience the functionality? That is the ship bar. The owner and real users are the deep test; no comprehensive suites, benchmarks, multi-case harnesses, or deployment checks, ever, unless the owner explicitly orders one. Pushing the branch is the end of the job.
- **Supabase deployment convention:** there is exactly one shared Supabase project; migrations apply to it during build through the normal workflow. A migration that retires a live signature (dropping an old RPC, tightening a column) opens an accepted transient window until the slice ships; that window is the owner's standing decision, so never block a build to ask for a preview branch, a deployment window, or migration-timing authorization.
- **Customer-discovery context** (the people ledger, per-person findings, aggregate outreach results) lives in `docs/findings.md`, `docs/reshad.md` and `docs/people.tsv` in this repo, published here at the owner's explicit decision. The `$yc` cofounder skill remains in the private `admin` repo at `~/Desktop/repos/admin`.
- **Vocabulary:** when the owner says "onboarder" or "extractor," that means every touchpoint currently on `anthropic/claude-sonnet-5` (or `-opus-5`): `lib/agent/beat-gate.ts`, `lib/sources/onboard-source.ts`, `lib/voice/extract-guide.ts`, and any future top-tier compiler stage, not one file. The qwen-based downstream stages (filter, synthesize, translate, write) are excluded from that term. "Desk" and "agent" are the same thing: one `agents` row watching one beat for one reporter.

## Repository map

```
app/                    Next.js App Router: every page, layout and API route (see "Web surface")
  agents/               the signed-in product: /agents redirect, desk pages, settings, create-desk
  api/                  server endpoints called by the workers (ingest, ops, sources)
  auth/                 email-link confirm route, X OAuth start and callback, reset-password page
  login/ signup/ forgot-password/   public auth screens (page + form component each)
  layout.tsx            root shell: fonts, global CSS, toaster, tooltip provider, Vercel analytics, metadata
  page.tsx              public landing page; signed-in visitors redirect to /agents
  globals.css           the design tokens (Tailwind v4 @theme inline) and the only handwritten CSS
components/             hand-built product pieces (header, desk switcher, source rows, band card, logo)
  ui/                   shadcn/ui primitives (vendored; excluded from Biome)
  ai-elements/          chain-of-thought and shimmer (vendored; excluded from Biome)
  hooks/                use-mobile, use-scroll-header-stage
lib/
  agent/                the AI pipeline: filter, synthesize, translate, write, cluster, ledgers, feed queries
  sysprompts/           every model prompt as a markdown file, loaded once by index.ts
  sources/              website onboarding: SSRF-safe discovery, sitemap/RSS parsing, the onboarding orchestrator
  voice/                voice-guide extraction: corpus, extraction run, rules, measured facts
  x/                    X OAuth, posting, handle checks, timeline reads, the x_accounts store
  supabase/             client factories (browser, server-as-user, service-role admin), session refresh, generated types
  auth/                 login/signup/reset server actions and the returnTo validator
  observability/        PostHog browser init, server error sink, AI telemetry policy, $ai_generation events
  *.ts                  small shared helpers (validation, websites, http-fetch, xml, user, owner-allowlist, utils)
poller/                 Railway worker: polls website sources on a timer, delivers to POST /api/ingest
ingest/                 Railway worker: holds the X filtered-stream connection, delivers to POST /api/ingest
supabase/migrations/    mirrored SQL migrations (applied live via the Supabase MCP during build)
public/                 static assets (logo images, avatars)
scripts/                one-off maintenance scripts (not part of any flow)
docs/                   exp1.md (experiment), setup.md (external setup), findings.md, reshad.md, people.tsv (discovery)
.claude/                Claude Code skills, scripts, agents, hooks, settings for the feature flow
.agents/                host-shared skills (build, ship, promote) and their Codex metadata
.codex/                 Codex hooks and the Codex supabase-runner agent
.github/workflows/      branch-name.yml, the only CI check
.feature/               git-ignored working files of the current slice (plans, lanes, pair runs)
proxy.ts                the request interceptor (Next's renamed middleware): session refresh, last_desk_id cookie
instrumentation-client.ts   boots PostHog on every page load
next.config.ts vercel.json biome.json components.json postcss.config.mjs tsconfig.json pnpm-workspace.yaml
```

## Web surface (`app/`)

Public, no login:
- `/` (`app/page.tsx`): landing page. Checks the session; a signed-in visitor is redirected to `/agents` before any marketing renders.
- `/login`, `/signup`, `/forgot-password`: each is a server page plus a client form component that submits to a server action in `lib/auth/actions.ts`. Signed-in visitors bounce to `/agents`. Login failures are folded into one generic message so the response never reveals whether an email exists.
- `/auth/confirm` (route): the target of every Supabase email link. Signup confirmation verifies the token, signs the user out again, and redirects to `/login` with a banner. Recovery links are forwarded unconsumed to `/auth/reset-password`, whose form carries the one-time token in hidden fields so it is spent on submit, not on link open.
- `/auth/x` and `/auth/x/callback` (routes): the "Connect X" OAuth flow (PKCE plus CSRF state in 10-minute httpOnly cookies). The callback stores the token set via `lib/x/store.ts` and redirects back to the desk page that started it, with `x_linked=1` or `x_error=<code>`; token material never appears in a URL. Return paths are always validated by `lib/auth/return-path.ts` (only `/agents/...` is accepted).

Signed-in product (`app/agents/`), every layer re-checks auth because Next.js layouts do not inherit a parent's guarantee:
- `app/agents/layout.tsx`: the hard login gate for the whole product (redirects to `/` without a session) and the single site header (desk switcher, Feed / Skipped / Guide / Sources tabs, needs-review counts).
- `/agents` (`page.tsx`): never lists desks. Reads the `last_desk_id` cookie (set by `proxy.ts` on every desk visit), validates ownership, and redirects into that desk; falls back to the newest desk, or to `/agents/new` for a reporter with none.
- `/agents/new`: the create-desk form (name, beat description, X handles to watch, websites to watch; owner-only voice handle override). `actions.ts` validates, runs the beat gate, creates the desk, and kicks off voice extraction and website onboarding in the background with `after()`.
- `/agents/settings`: profile (avatar, username, connected X account) and account deletion via the `delete_account` RPC.
- `/agents/[id]`: per-desk guard (404 for missing or foreign desks) and the Feed tab; `excluded/` is the Skipped tab; `sources/` the Sources tab; `voice/` the Guide tab. Server actions in this folder (`actions.ts`, `draft-actions.ts`, `feed-actions.ts`, `excluded-actions.ts`, `council-actions.ts`, `voice/actions.ts`, `sources/actions.ts`) each prove desk ownership with the RLS-scoped client first, then may switch to the admin client for deny-all tables.
- Feed card behavior: a story lands undrafted; the Draft button calls `draftStory`, which claims the story atomically (`claim_story_draft` RPC) and runs the write stage; Post to X calls `publishDraftToX` in `lib/x/actions.ts`.

Endpoints called by machines, never by a browser (all require `Authorization: Bearer <INGEST_SECRET>`):
- `POST /api/ingest`: the one delivery door. Accepts an X post or a website article (a strict Zod schema distinguishes the two), and runs `processDelivery` in `lib/agent/draft-pipeline.ts`. Both Railway workers post here; neither writes stories to Supabase directly.
- `POST /api/ops/spend-check`: read-only spend-anomaly watchdog (`detect_spend_anomalies` RPC, plus a Vercel AI Gateway credits lookup). Called once a day by the poller's tick.
- `POST /api/sources/refresh-strip-phrases`: backfills boilerplate strip phrases for website sources created before that field existed. Called by the poller, bounded to 3 attempts per source.

`proxy.ts` runs on every non-static request: refreshes the Supabase session cookie through `lib/supabase/middleware.ts`, then stamps `last_desk_id` on `/agents/{id}` visits. `vercel.json` enables Fluid Compute, limits git-triggered deploys to `main`, adds security headers (`X-Frame-Options: SAMEORIGIN`, not DENY), and redirects the two fixed `*.vercel.app` project aliases to oparax.ai (per-branch preview URLs are not covered). `next.config.ts` tree-shakes icon libraries and lists the prompt markdown files for output tracing so they ship with the server bundle.

## The AI pipeline (`lib/agent/`, `lib/sysprompts/`)

Nothing here runs on a schedule; it runs per delivered post from `/api/ingest`, and per Draft press from the UI. Order of the live path in `draft-pipeline.ts`:

1. `processDelivery` upserts the `source_posts` row, runs a deterministic low-signal check, and matches the post to every active desk that tracks its handle or website (unmatched X posts are counted in `unmatched_deliveries`).
2. Per desk: claim the (desk, post) slot with the `claim_draft` RPC before any paid step; resolve the desk's beat text and voice guide.
3. `draft-filter.ts` (Qwen): on-beat or off-beat. Off-beat records an `excluded_posts` row via `upsert_claimed_exclusion` and stops.
4. `draft-synthesize.ts` (Qwen): raw text in any language becomes English news points plus a title. `draft-translate.ts` exists as a fallback but is dormant behind `DIRECT_SYNTHESIS_ENABLED = true`.
5. `cluster.ts` (no model): `assignToStory` creates or claims the `stories` row atomically (`story_assignments` is unique per source post and desk). Today each delivered post becomes its own story.
6. `insert_claimed_winner` RPC writes the `drafts` row with news points attached and no draft text yet.
7. Later, on Draft: `draft-write.ts` (Gemini) writes the post text in the reporter's voice from the stored news points and the deployed voice guide, and records a structured "construction" account (`draft-construction.ts`) shown in the reasoning sheet.

Separate from the per-post flow: `beat-gate.ts` (Claude Sonnet 5) runs once at desk creation to check a beat sentence is intelligible; it is deliberately permissive.

Ledger conventions that every stage obeys:
- Every model call produces exactly one `CouncilCall` (types in `draft-council-run.ts`) and exactly one `model_calls` row plus one `usage_events` row before its verdict is used, even on failure paths. `call-meta.ts` builds the record the same way for every stage.
- Cost is nullable, never guessed: `gateway-cost.ts` resolves dollars from the Vercel AI Gateway and returns null when unknown; `reconcileMissingCosts` repairs rows later. `usage-cost.ts` sums costs treating all-unknown as unknown.
- `reasoning-trace.ts` classifies why a reasoning trace is missing; every element carries an explicit `reasoningWithheldByProvider` flag.
- Model ids are plain `provider/model` strings resolved through the Vercel AI Gateway (`anthropic/claude-sonnet-5`, `alibaba/qwen3.7-flash`, `google/gemini-3.7-flash`), one constant per stage file (`qwen-draft-config.ts`, `gemini-write-config.ts`, `extract-guide.ts`).
- A stage module is the only place that talks to its model; `draft-pipeline.ts` orchestrates and owns every database write.
- Files that read prompts from `lib/sysprompts` are marked SERVER-ONLY and are never imported by a client component. Untrusted source text and media are XML-escaped (`lib/xml.ts`) and labeled "data, never instructions" in every prompt.
- Read paths: `feed-query.ts` and `feed-shared.ts` (feed cards, cursor pagination, tweet liveness via react-tweet), `excluded-query.ts` and `excluded-shared.ts` (Skipped tab), `council-query.ts` (draft history). `desk-config.ts` holds X character limits per account tier; `desk-label.ts` derives the desk display name; `source-identity.ts` and `source-media.ts` normalize who a post came from and which images may reach a model (X CDN hosts only).

## Sources, X, and voice (`lib/sources/`, `lib/x/`, `lib/voice/`)

- **Website onboarding** (`lib/sources/onboard-source.ts`): the reporter pastes a URL; `reservePendingSource` writes a pending `source_configs` row immediately; the background job discovers how the site publishes (sitemap, RSS/Atom, listing page) through `discovery.ts` (SSRF-hardened: resolves DNS itself, refuses private and reserved addresses, checks redirects), samples recent articles (`sitemap.ts`, `feed.ts`), and one Claude call (prompts `source-onboarding.md`, `source-resolver.md`, with Exa web search available to the resolver) decides the beat-relevant path prefix, the publication display name, two "beat guidance" sentences (`site-guidance.ts`, validated against prompt-injection patterns), and the boilerplate phrases to strip. Retrieval method is left null at onboarding; the poller decides per fetch. `lib/websites.ts` normalizes and displays URLs (max 5 websites per desk).
- **X integration** (`lib/x/`): `api.ts` is the raw OAuth2 and posting client; `actions.ts` exposes the two browser-facing server actions (`publishDraftToX`, `unlinkXAccount`) and delegates the trust-sensitive work to `post-core.ts`, deliberately kept out of any `"use server"` file. `store.ts` is the only module allowed to touch `x_accounts`, always on the admin client. `handle.ts` is the single source of truth for handle format (letters, digits, underscore, 1 to 15 chars; max 20 tracked handles); `handle-check.ts` verifies handles exist via X's bulk lookup with a cache table; `timeline.ts` reads a reporter's recent original posts (max 50) with the app-level bearer token for voice extraction.
- **Voice extraction** (`lib/voice/`): `create-desk-extraction.ts` orchestrates one desk end to end: check the handle shape, pull or reuse the corpus (`corpus.ts`, `corpus-store.ts`; `corpus_posts` accumulates and is never deleted), compute hard style statistics in code (`measured-facts.ts`, binding on the model), run the one big streaming Claude call (`extract-guide.ts`, prompt `voice-extract.md`) that writes a markdown voice guide, deploy it (`deploy-guide.ts` strips audit-only sections and extracts the beat scope), and split it into editable `voice_rules` (`rules.ts`). `extraction-run.ts` tracks live progress in `voice_extraction_runs`; `extraction-steps.ts` maps that row to the four on-screen steps; `use-extraction-progress.ts` polls from the browser. `tier.ts` infers premium X accounts from post lengths.

Conventions in this area: business failures (unreachable site, empty corpus, schema mismatch) are returned as typed outcomes, never thrown; server-only modules that use the admin client say so in a header comment; any text that will be replayed into a future prompt is validated in code first.

## Data model (Supabase Postgres)

One shared project (ref `pcgvpypzfwuchyfwdlwe`). `lib/supabase/database.types.ts` is the generated source of truth for every table, column, and RPC signature; the supabase-runner agent reads it before writing SQL. Migrations live in `supabase/migrations/<utc-timestamp>_<slug>.sql`, mirrored after being applied live.

Three clients: `lib/supabase/client.ts` (browser, acts as the signed-in reporter), `lib/supabase/server.ts` (server components, actions and routes, same identity via cookies), `lib/supabase/admin.ts` (service role, bypasses RLS, server-only). `lib/supabase/middleware.ts` refreshes the session on every request from `proxy.ts`.

Tables and their access shape:

| Table | Holds | RLS shape |
| --- | --- | --- |
| `agents` | one desk per row: name, beat text, status active/paused, tracked_handles, websites, reporter_tier | owner-scoped 4-policy CRUD on `owner_id` |
| `source_posts` | deduplicated raw posts and articles from tracked sources | deny-all, service-role only |
| `source_configs` | one website source per desk: url, discovery method, path prefix, beat guidance, strip phrases, status | deny-all; all writes via RPCs |
| `source_seen_items` | dedup keys of items the poller already delivered per source | deny-all (poller) |
| `stories` | one landed story card per desk | select via EXISTS-join on agents; service-role writes |
| `story_assignments` | atomic claim linking a source post to a story per desk | deny-all |
| `draft_claims` | atomic per-(post, desk) claim taken before any paid stage | deny-all |
| `drafts` | the winning draft per story: news points, title, draft text, is_winner, parent chain for corrections, posted_at and posted_url | select and insert via EXISTS-join; no browser update policy |
| `excluded_posts` | posts skipped as off-beat, oversized or unusable, with the reason | select via EXISTS-join |
| `beat_conflicts` | posts flagged as disputed on-beat/off-beat | select via EXISTS-join |
| `unmatched_deliveries` | counter of X deliveries no desk tracks | deny-all |
| `voice_guides` | the raw and deployed voice guide plus measured facts per desk | select via EXISTS-join |
| `voice_rules` | editable style rules per reporter | select via EXISTS-join |
| `voice_extraction_runs` | live progress of one extraction per desk | deny-all; read through server actions |
| `corpus_posts` | the reporter's own past posts used to measure voice | deny-all |
| `model_calls` | every model call: stage, model, output, reasoning trace, usage, cost_usd, generation_id | owner select only |
| `usage_events` | billing and metering ledger: kind, units, cost_usd, ref | owner select only, zero write policies |
| `x_accounts` | each reporter's X OAuth tokens and inferred tier | deny-all (credentials) |
| `x_handle_checks` | cache of handle validity lookups | deny-all |

RPCs (all write-side functions are revoked from public/anon/authenticated and granted to service_role, except `delete_account`, which runs as the signed-in user): `claim_draft`, `insert_claimed_winner`, `upsert_claimed_exclusion`, `complete_claimed_no_artifact`, `claim_story_draft`, `attach_story_draft`, `add_source_config`, `remove_source_config`, `reserve_pending_source_config`, `refresh_source_strip_phrases`, `claim_strip_phrase_refresh_attempt`, `record_seen_item`, `unseen_item_keys`, `reclaim_extraction_run`, `detect_spend_anomalies`, `delete_account`. There are no database views.

RLS conventions: policies compare `(select auth.uid())` (subselect, evaluated once per statement); three recurring shapes are named in migration comments (owner-scoped CRUD, EXISTS-join through `agents.owner_id`, deny-all for service-role-only tables).

## Workers (`poller/`, `ingest/`)

Each is a standalone TypeScript package with its own `package.json`, lockfile, `tsconfig.json`, Biome config, `railway.json` (RAILPACK builder, `pnpm start`, restart ALWAYS, exactly one replica) and `.env.example` (names only). They run via `tsx` straight from source with no build step, never import app code (the app's `@/` aliases do not resolve outside it; small helpers are duplicated on purpose), read every setting from environment variables at startup, and exit fatally on a missing required variable. Both deliver through `POST /api/ingest` with the same bearer secret and classify responses the same way (401 is fatal, meaning the secrets drifted).

- **poller** (`poller/src/`): `index.ts` runs one pass immediately, then every `POLLER_TICK_INTERVAL_MS` (default 45s), skipping a tick if the previous one is still running. `tick.ts` iterates active `source_configs`, picks sitemap (`sitemap.ts`), RSS/Atom (`feed.ts`) or listing page (`listing.ts`) with conditional GET, filters by path prefix, asks `unseen_item_keys` which items are new, fetches article bodies (`fetch-body.ts`: direct first, then Bright Data Web Unlocker, then Bright Data SERP as last resort; strips the measured boilerplate phrases), delivers (`deliver.ts`), and records `record_seen_item` after delivery (why one replica). A new source's first tick is a silent priming pass. The same tick runs the daily `spend-check.ts` and the best-effort `refresh-strip-phrases.ts`. `discovery-safety.ts` rejects private or off-site URLs found in sitemaps and feeds.
- **ingest** (`ingest/src/`): `index.ts` syncs X stream rules from active desks' `tracked_handles` (`rules.ts`, up to 5 rules) on start and every `INGEST_RULE_SYNC_INTERVAL_MS` (default 5 min), then `stream.ts` holds one persistent connection to `GET /2/tweets/search/stream`, converts each tweet to the ingest shape (preferring the untruncated long-post text), and `deliver.ts` posts it. `reconnect.ts` reconnects with backoff; a silent connection past `INGEST_LIVENESS_TIMEOUT_MS` (default 90s) is treated as dead.

Local run per worker, from its directory: copy `.env.example` to `.env.local` and fill values by hand; `pnpm install`; `pnpm run typecheck`; `pnpm run lint` (or `lint:fix`); `pnpm run dev` with the variables exported into the shell (it does not auto-load `.env.local`). Operators tail with `railway logs`.

## Environment and commands

App scripts (`package.json`): `pnpm dev` runs the app on localhost:3000 (owner only inside the flow), `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm lint:write`, `pnpm format` (Biome); `tsc --noEmit` typechecks. pnpm is the only allowed package manager (`preinstall` fails under npm or yarn); `pnpm-workspace.yaml` pins transitive versions for security advisories because pnpm 10 ignores `pnpm.overrides`. The flow's own scripts are documented in the skills that call them.

Never commit values. `.env.local` at the repo root holds the app's local values (git-ignored); the workers keep their own. Names only:

Web app (Vercel):

| Name | Public or secret | Read in | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | `lib/supabase/env.ts`, `lib/supabase/admin.ts` | Supabase project URL for every client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | `lib/supabase/env.ts` | anon key for the RLS-scoped browser and server clients |
| `SUPABASE_SECRET_KEY` | secret | `lib/supabase/admin.ts` | service-role key; bypasses RLS; server only |
| `X_CLIENT_ID`, `X_CLIENT_SECRET` | secret | `lib/x/api.ts` | X OAuth2 confidential client for connecting and posting |
| `X_BEARER_TOKEN` | secret | `lib/x/timeline.ts`, `lib/x/handle-check.ts` | app-level token to read public post history and verify handles |
| `INGEST_SECRET` | secret | `app/api/ingest`, `app/api/ops/spend-check`, `app/api/sources/refresh-strip-phrases` | shared bearer secret the workers present; must match the workers byte for byte |
| `AI_GATEWAY_API_KEY` | secret | `lib/agent/gateway-cost.ts`, `app/api/ops/spend-check/route.ts` | Vercel AI Gateway auth for cost lookups and the credits check; in production `VERCEL_OIDC_TOKEN` (Vercel-injected) is the fallback |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | public | `lib/observability/posthog-client.ts`, `posthog-server.ts` | PostHog project; its absence cleanly disables analytics, replay and error tracking |
| `NEXT_PUBLIC_POSTHOG_HOST` | public | same | PostHog ingestion host; defaults to `https://us.i.posthog.com` |
| `VERCEL_ENV`, `NODE_ENV` | public, injected | `lib/observability/ai-telemetry.ts`, `posthog-client.ts`, `app/auth/x/route.ts` | environment gates (draft text is never sent to telemetry in production; cookie `secure` flag) |
| `SUPABASE_DB_URL`, `DATABASE_URL` | secret | `scripts/cleanup-model-calls-126.ts` | one-off maintenance script only |

poller (Railway): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INGEST_URL`, `INGEST_SECRET`, `OPARAX_POLLER_USER_AGENT` (required, an honest identifying UA with a contact URL), `BRIGHTDATA_API_KEY`, `BRIGHTDATA_ZONE`, `BRIGHTDATA_SERP_ZONE` (optional fallbacks), `POLLER_TICK_INTERVAL_MS` (default 45000), `POLLER_MAX_NEW_ITEMS_PER_TICK` (default 20).

ingest (Railway): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INGEST_URL`, `INGEST_SECRET`, `X_BEARER_TOKEN`, `INGEST_RULE_SYNC_INTERVAL_MS` (default 300000), `INGEST_LIVENESS_TIMEOUT_MS` (default 90000).

## Tooling and configuration

- **Biome** (`biome.json`) is the linter and formatter: 2-space indent, double quotes, 100-char lines, semicolons, organized imports. `components/ui/` and `components/ai-elements/` are excluded as vendored. Every Edit/Write is auto-formatted and safe-fixed by the PostToolUse hooks (`.claude/hooks/biome-write.sh`, `.codex/hooks/biome-write-codex.sh`); unsafe fixes are never applied automatically.
- **shadcn/ui** (`components.json`): `@/` aliases, hugeicons icon set; `pnpm dlx shadcn add <component>` drops new primitives into `components/ui/`.
- **TypeScript** (`tsconfig.json`): strict, ES2024 target, `@/*` maps to the repo root.
- **Tailwind v4** via `postcss.config.mjs` with `@tailwindcss/postcss` only; tokens live in `app/globals.css`.
- **Fonts**: loaded once in `app/layout.tsx` through `next/font/google` (Hanken Grotesk 400 to 700, Space Grotesk 400/500, JetBrains Mono 400/500), self-hosted by Next at build.
- **CI**: `.github/workflows/branch-name.yml` enforces branch names `main`, `beta`, `ft/<digits>`, `bf/<digits>`; a repo ruleset blocks off-convention branches at push time.
- **Agent tooling:** `.claude/` holds the Claude Code skills, scripts, hooks and the Sonnet `supabase-runner` agent; `.agents/` holds the host-shared skills; `.codex/` mirrors the hooks and the runner for Codex. `.claude/launch.json` defines the `oparax-dev` server config that stages must not start. Each stage's behavior lives in its skill file.
- **Records:** `docs/exp1.md` is the current experiment; `docs/setup.md` records verified external setup and the fresh-start handoff. Discovery lives in `docs/findings.md`, `docs/reshad.md` and `docs/people.tsv`. Issue #131 was retired, not shipped or amended; start the next feature from `beta`.

## Coding conventions

Observed across the codebase; new code follows them without being asked.

- **Ownership first.** Every server action and route handler that touches per-desk data proves ownership with the RLS-scoped client before doing anything, then may use the admin client for deny-all tables. Caller-supplied ids are never trusted raw.
- **Trust logic lives outside `"use server"` files.** Every export of a server-action file is a callable endpoint, so the sensitive code (X posting, token storage) lives in separate server-only modules those actions call.
- **Result shapes.** Mutations return `{ ok: true }` or `{ ok: false, error }` so client components show one inline error path. Business failures are values, not throws.
- **Background work uses `after()`.** Billable or slow work (voice extraction, onboarding, drafting) starts with Next's `after()` so the response returns fast.
- **Server-side re-validation.** Anything the client already checked (handle existence, character limits, beat intelligibility) is checked again on the server.
- **Server components by default.** A component is a client component only where an interaction needs it, and it receives the smallest props that interaction requires. No new component is added under `components/ui` for a single surface; existing primitives are composed with className overrides.
- **Styling is Tailwind v4 utilities on the tokens in `app/globals.css`.** No CSS modules, no new stylesheets, no inline style objects for anything a utility can express; one-off values use arbitrary-value utilities (`text-[60px]`, `grid-cols-[420px_minmax(0,1fr)]`). Responsive gates use `desk:` (700px), never `md:`. Radius, font roles and color meanings are fixed by `DESIGN.md`.
- **Fixed copy lives in one module per surface.** A marketing or demo surface keeps every displayed string, example value and count in one typed content module; components import from it and never carry string literals of their own. Illustrative counts are fixed text, never computed from product logic at runtime.
- **Depicted product UI is a picture.** When a page shows product controls as illustration, they are real primitives rendered non-interactive with their native `disabled` contracts (inputs, buttons, switch), with the primitives' disabled dimming overridden locally so they keep the approved full-contrast look; tab rows are presentational markup, not focusable widgets. Such surfaces import nothing from product routes (`app/agents/**`) or stateful product components; the narrative stays accessible (no blanket `aria-hidden` or `inert`).
- **Generated images carry their own assets.** Anything rendered on the server into an image (the file-based `opengraph-image` convention, any future generated graphic) reads fonts and marks from files committed in the repo (`assets/fonts/` with the license file beside them) in the Node runtime, with explicit renderer-compatible colors. Nothing is fetched from a third party at request time.
- **Brand marks are committed path data with provenance.** Third-party logos are stored as SVG path data in a typed module with each mark's source URL and license recorded beside it (simple-icons' individual SVG files for the marks it carries; the platform's official brand kit where it does not, as with LinkedIn). No runtime icon dependency, no hand-drawn approximations, no letter-glyph stand-ins; a mark without a verified source is reported as a gap.
- **Analytics: one named event per user intent.** PostHog is initialized once site-wide (`instrumentation-client.ts`) with automatic pageviews, autocapture and session replay; nothing re-initializes it. Each meaningful action gets one clearly named `snake_case` past-tense event with a fixed vocabulary of property values recorded in the plan. Demo compositions carry `ph-no-autocapture` so pictured controls never produce events. Capture never blocks or delays navigation, and capture failures are contained. Auth-page URLs are reduced to origin and path before any capture.
- **Metadata.** `app/layout.tsx` owns `metadataBase`, the default title and description, and the default `openGraph` and `twitter` blocks. A page exports its own metadata only where it genuinely differs (the homepage owns its Open Graph URL and image); preview images use the file-based convention beside the route.
- **Security posture.** Every prompt marks untrusted text as data; every outbound fetch of a user-supplied URL goes through the SSRF-hardened fetcher; return paths and handles are validated by their single source-of-truth modules; auth error copy never reveals whether an email exists; PostHog replay records product text unmasked by owner decision, passwords masked.
