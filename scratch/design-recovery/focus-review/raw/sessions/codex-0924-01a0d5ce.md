# codex session 01a0d5ce (0924) cwd /Users/farzanm4/Desktop/repos/oparax

## 2026-09-24T23:44:45.024Z

<recommended_plugins>
Here is a list of plugins that are available but not installed.

- Dropbox (app-69b31dc2110c8191b8b47dc98fe5a052@openai-curated-remote)
- Box (box@openai-curated-remote)
- Codex Security (codex-security@openai-curated-remote)
- Figma (figma@openai-curated-remote)
- Linear (linear@openai-curated-remote)
- Notion (notion@openai-curated-remote)
- OpenAI Developers (openai-developers@openai-curated-remote)
- Outlook Calendar (outlook-calendar@openai-curated-remote)
- Outlook Email (outlook-email@openai-curated-remote)
- SharePoint (sharepoint@openai-curated-remote)
- Teams (teams@openai-curated-remote)
</recommended_plugins>
# AGENTS.md instructions for /Users/farzanm4/Desktop/repos/oparax

<INSTRUCTIONS>
- **Prompts may be dictated and contain mishearings.** Infer the intended word from context, proceed, and briefly flag a correction only when it changes what you did.
- **Search routing:** Use `rg` for exact text, filenames, known identifiers, and exhaustive literal or regex matches. Use `ast-grep` for syntax-shaped code searches and structural rewrites. Always invoke `ast-grep`, never `sg`.
- **Structural search limits:** `ast-grep` understands syntax, not types or symbol resolution. Check imports, aliases, dynamic calls, and enough surrounding code before treating results as complete. Start with matched ranges and expand only as needed.
- **Structural rewrites:** After `ast-grep --rewrite` or an `ast-grep scan` modifies files, run the project formatter on the touched files and review the resulting diff.
- **RTK:** Run normal commands. When an RTK hook is active, it compresses supported command output automatically. Do not add an `rtk` prefix merely because of this instruction. Use `rtk --help` only to inspect or troubleshoot RTK.
- **Never use em-dashes.** Not in chat, not in files, no exceptions. Use a comma, period, or parentheses instead.
- **Email and calendar:** always use Spark for both email accounts and calendars. Invoke the Spark skill or integration exposed by the current agent; if none is available, report that instead of silently switching systems.
- **Browsers stay off my screen.** An agent may use a browser for its own checks, but only in the background: never front a tab or pane, never open a page on my display. When something is ready for me to look at, give me the path or URL and I open it in Chrome myself.

--- project-doc ---

# Oparax

The owner is a technical AI engineer who is vibe-coding this entire project: he does not know TypeScript, Next.js, or the web-stack machinery underneath it. Every explanation, every surfaced decision, and every skill or doc written for him states things in plain product-and-AI terms first. Never assume he can read a diff, a type signature, or a framework idiom to figure out what something means.

Oparax watches the internet, GitHub and Product Hunt for one person, shows them only what belongs to their beat, and alerts them on X (see [docs/roadmap.md](docs/roadmap.md)). The legacy implementation in this checkout, described from "Repository map" onward, is the earlier drafting product built on Next.js 16 and Supabase with worker packages; its monitoring pieces (source detection, feed and sitemap parsing, filter and synthesis stages, X integration) carry forward, the drafting pieces do not.

## The plan

Oparax is being rebuilt as a monitoring-only product: onboarding by X handle and beat sentence with no account, a per-handle page with at most ten recommended sources, a daily GitHub and Product Hunt digest for tool-focused beats, alerts through the Oparax bot on X, sign-up to customize, payment after seven days, X ads for acquisition. The one document for all of it, every feature, algorithm, decision and open question, is [docs/roadmap.md](docs/roadmap.md). Read it before planning anything. The onboarding algorithm is settled (September 19): roadmap section 3 is the plain account, [docs/onboarding-algorithm.md](docs/onboarding-algorithm.md) is the exact specification the build ports (the four steps, prompts verbatim, the checker, the table's row shape, measured costs, and every rejected direction with its reason), and [docs/source-table-seed.json](docs/source-table-seed.json) is the 76-row seed of the shared source table. Every experiment script, run folder and lab page was deleted once that was written. Every cost figure (unit prices with their sources, what was measured, the arithmetic per person for watched X posts, bot alerts, judging, onboarding) lives in [docs/references/cogs.md](docs/references/cogs.md); take numbers from there, change them there first, and never restate a cost from memory. Where things stand right now, what is agreed but not yet applied, the open rulings and the owner's standing confusions are in [docs/references/state.md](docs/references/state.md): read it first in a new session. Every locked and rejected decision, one line each with its reason and evidence, lives in [docs/references/decisions.md](docs/references/decisions.md); when a question that file answers comes up again, quote its line instead of re-arguing it, and add a line there whenever the owner rules or rejects something. In the roadmap and in the issue briefs only lines that carry an owner attribution with a date are the owner's word; everything else is an assistant's design to be confirmed with him (an audit on September 19 found designs presented as his decisions). No experiment or paid discovery run is pending or authorized. Each slice of the build order is a GitHub issue whose body is its brief: `/feature <issue#>` starts from that brief with nothing restated by the owner. Everything below this section describes the legacy implementation as it exists in the checkout; the drafting, voice and posting parts of it are not part of the product going forward.

## How work moves

Work moves through owner-triggered commands, each defined only by its skill file: `/feature` (Claude Code; `/feature <issue#>` starts from an existing issue's brief) talks the idea through, writes the plain plan the owner approves and the detailed plan the agents read, runs the critique, and creates the GitHub issue and the `ft/<issue#>` branch cut from `beta`; `$build <N>` (Codex, or `/build <N>` in Claude Code) builds from the detailed plan; `/qc <N>` reviews; `/amend <N>` adds scope to an in-flight issue and loops back into build; `/ship <N>` (or `$ship <N>`) squashes the branch onto `beta` and closes the issue after the owner has walked the result on localhost. Stage handoffs are defined by their skills: `/feature` launches the selected Codex build after final owner approval unless the owner requests a manual or later launch; `/qc` launches the fix build whenever it queues fixes; every launched build runs on Astra High (owner, September 24; no model question at either launch); other stages end by naming the next command. Feature and amend share independent Fable + Astra planning and mutual review, with amend scoped to an addition on its existing issue and branch. Uncommitted files under `.claude/` or `.codex/` (tool configuration written mid-flow) never block a stage: the stage that meets them commits and pushes them on the current branch as a `meta:` commit. The issue carries only what the owner reads (the plain plan and one `## Amendment R` section per approved amendment, plus a QC marker per round); everything the agents read lives in git-ignored `.feature/` files on this machine and is wiped at finalize. Bug fixes run the same commands on `bf/<issue#>` (the start script takes `--prefix bf`), starting from the exact repro, whose re-proof is the acceptance journey; a trivial owner-reported fix may skip critique at the owner's word. Meta and docs changes (skills, process, this file, documentation) go directly on `beta` at the owner's direction. `beta` reaches `main` (production) only through the weekly pull request `/promote` (or `$promote`) opens on the owner's word, reviewed by the owner's mentor; ship never pushes `main`, and no stage ever deletes a branch.

- **Review lanes:** Feature and amend critique and QC use [the fixed review profiles](.claude/skills/feature/references/review-lanes.md) through `.claude/scripts/review-lanes.py`, which calls the global critique skill's runner. They never duplicate provider commands. Invoking the stage authorizes its review step; the standalone `/critique` and `$critique` commands remain user-invoked only.
- **Visual contract:** `DESIGN.md` is the whole design contract (owner, September 23): stock shadcn from preset `bzq0WEyKe` (Mira, Zinc, Blue), dark by default with a light switch, Hanken Grotesk for text and JetBrains Mono for handles and counts, hugeicons kept, the reasons beside each choice. The legacy `:root` tokens in `app/globals.css` belong to the retired drafting screens and leave with them; nothing new uses them. The repo is the source of truth and Claude Design holds a synced copy (`/design-sync`, run by the owner) that he designs screens in; the export is the plan's visual contract, from the design brief `/feature` step 1.1 writes. Every ui skill has three jobs: it shapes the plan, guides the build and checks the result.
- **Frontend test login:** No dedicated test account is currently configured. The previous dummy mailbox was removed; this does not establish that its old Supabase user record was deleted. Owner-requested browser login remains pre-authorized; do not assume a replacement test identity exists.
- **Stage execution:** No stage runs the product app: not `/feature`, `/amend`, `$build`, `/qc`, `/ship`, nor their subagents or external lanes. Never start or attach to the product dev server, run `pnpm dev` or the poller, or investigate the product at runtime. One bounded exception (owner, September 23): `/qc` step 4a may start the app off-screen on a free port for a screenshot pass of the slice's pages with `agent-browser`, no clicking, no sign-in, no paid calls, then stop it; the QC session reviews the images with `design-review` and `accessibility`. Browser use is otherwise prohibited inside stages, with one more exception: `/feature` and `/amend` discussion and design review may research public references and inspect standalone design previews as its skill defines. The host chooses its normal research tools and passes detailed observations and available artifacts to the peer; reference research does not require browser use or screenshots, while review of a generated design receives its actual images as the skill defines. The CLI peer keeps its read-only sandbox. Never attach to a personal browser profile. This research exception does not apply to plan critique, adjudication, QC, build or ship. Every stage grounds implementation in the repo's source; third-party packages are read only for public types and shipped docs, never built or minified internals. A product runtime question becomes a named build-time check and an acceptance journey the owner walks. Inside the flow, only the owner runs the product app.
- **The owner's direct word overrides the rule above, immediately.** That rule binds a stage while it executes its command; it is not a repository-wide ban on agents. When the owner, in their own words in the chat (not as the argument of `/feature`, `/amend`, `$build`, `/qc`, or `/ship`), asks the agent to start the app, open a browser, cold-test a page, or look at something running, that instruction wins on the spot: in the same session, after or between commands, with no rule change and no new session, whether or not that session ran a stage earlier. The refusal on 2026-08-18 ("the repository instruction forbids it even when you ask") was a misreading of this file; do not repeat it. The owner's existing browser-login authorizations still stand.
- **The proof bar, everywhere:** does it build, does it boot, can the owner and a user access and experience the functionality? That is the ship bar. The owner and real users are the deep test; no comprehensive suites, benchmarks, multi-case harnesses, or deployment checks, ever, unless the owner explicitly orders one. Pushing the branch is the end of the job.
- **Supabase deployment convention:** there is exactly one shared Supabase project; migrations apply to it during build through the normal workflow. A migration that retires a live signature (dropping an old RPC, tightening a column) opens an accepted transient window until the slice ships; that window is the owner's standing decision, so never block a build to ask for a preview branch, a deployment window, or migration-timing authorization.
- **Customer-discovery context** (the people ledger, per-person findings, aggregate outreach results) and the experiment design live in `docs/discovery/` (`findings.md`, `reshad.md`, `people.tsv`, `exp1.md`) in this repo, published here at the owner's explicit decision. The `$yc` cofounder skill remains in the private `admin` repo at `~/Desktop/repos/admin`.
- **Vocabulary:** "feature flow" means this whole owner-triggered stage chain, every stage defined only by its skill file (a prompt hook in both harnesses repeats this definition, with the current stage names read from `.agents/skills`, whenever the phrase appears). When the owner says "onboarder" or "extractor," that means every touchpoint currently on `anthropic/claude-sonnet-5` (or `-opus-5`): `lib/agent/beat-gate.ts`, `lib/sources/onboard-source.ts`, `lib/voice/extract-guide.ts`, and any future top-tier compiler stage, not one file. The qwen-based downstream stages (filter, synthesize, translate, write) are excluded from that term. "Desk" and "agent" are the same thing: one `agents` row watching one beat for one reporter.

## Engineering principles

Owner, September 23: these are locked down here so both harnesses read them at every stage; the wording is the assistant's September 23 draft and the owner may change any line. Planning applies the first group, build the second and third; plan critique and QC grade all of them under the "principles" lens, citing the rule's name. They were distilled from the cstack principle skills, which are not installed.

Planning
- **Compare before choosing.** The plan names two or three real approaches and why the chosen one wins.
- **Model the domain first.** Data shapes and contracts are settled before screens or steps; a state that must never happen cannot be stored.
- **Redesign over bolt-on.** When an addition would be simpler as a redesign, the plan says so to the owner instead of stacking it on.
- **Name the proof.** Every build step says how it is shown to work: build and typecheck, and a named acceptance journey.

Building
- **Laziness.** Reuse an existing helper before writing one; no abstraction with a single caller; no option nobody asked for.
- **Subtract first.** Code, flags and files the change makes dead are deleted in the same change, not left dormant.
- **Low reader load.** A new file stays under about 400 lines (the assistant's number) and a longer one is split along a real seam; the existing large files are known debt, not fixed on sight.
- **Check at the door.** Data from outside (X, fetched pages, model output, request bodies) passes a schema before use; no cast in place of a check.
- **Honest types.** No `as any`; `as unknown as` only to fit the database's loose JSON type, never to skip a check.
- **Safe to repeat.** Any write a retry or a duplicate delivery can reach is idempotent, through a claim or a unique key.
- **Root causes.** A fix changes what caused the failure; no retry loop, sleep or special case that hides it.

Hygiene, on the diff against `beta`
- **Comments say why, never what.** Delete comments that restate the code; keep why-comments, server-only header comments and the RLS-shape comments in migrations.
- **No slop.** No defensive try/catch or null check the surrounding code never needs, no leftover debug output, no style that differs from the file around it.
- **No slop words.** Copy, docs and commit messages carry no em dashes, filler openers or hype words.

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
design-system/          the Claude Design sync bundle: tokens.css exported from app/globals.css, light-and-dark preview cards, README (re-export after any change to DESIGN.md)
docs/                   roadmap.md (the plan), onboarding-algorithm.md and downstream-algorithm.md (the two algorithms), source-table-seed.json (the shared table's seed), setup.md (every external account and key), references/ (cogs.md costs, decisions.md ledger, state.md handoff, two lab reports), discovery/ (findings.md, reshad.md, people.tsv, exp1.md)
.claude/                Claude Code skills, scripts, agents, hooks, settings for the feature flow
.agents/                Codex entries for feature, amend, build, QC, ship and promote
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
- Model ids are plain `provider/model` strings resolved through the Vercel AI Gateway (`anthropic/claude-sonnet-5`, `alibaba/qwen3.7-flash`, `google/gemini-3.7-flash`; the new product uses `spacexai/grok-4.7` for onboarding and `typesafe-ai/jev` through the Gateway's evaluate endpoint for ranking and judging, owner, September 21), one constant per stage file (`qwen-draft-config.ts`, `gemini-write-config.ts`, `extract-guide.ts`).
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

- **poller** (`poller/src/`): `index.ts` runs one pass immediately, then every `POLLER_TICK_INTERVAL_MS` (default 45s), skipping a tick if the previous one is still running. `tick.ts` iterates active `source_configs`, picks sitemap (`sitemap.ts`), RSS/Atom (`feed.ts`) or listing page (`listing.ts`) with conditional GET, filters by path prefix, asks `unseen_item_keys` which items are new, fetches article bodies (`fetch-body.ts`: direct first, then Bright Data Web Unlocker, then Bright Da
</INSTRUCTIONS>
<environment_context>
  <cwd>/Users/farzanm4/Desktop/repos/oparax</cwd>
  <shell>zsh</shell>
  <current_date>2026-09-24</current_date>
  <timezone>America/Los_Angeles</timezone>
  <filesystem><workspace_roots><root>/Users/farzanm4/Desktop/repos/oparax</root><root>/Users/farzanm4/.codex</root><root>/Users/farzanm4/.claude</root><root>/Users/farzanm4/.agents</root><root>/Users/farzanm4/.grok</root><root>/Users/farzanm4/.gemini</root><root>/Users/farzanm4/.cursor</root></workspace_roots><permission_profile type="managed"><file_system type="restricted"><entry access="read"><special>:root</special></entry></file_system></permission_profile></filesystem>
</environment_context>

## 2026-09-24T23:44:45.226Z

You are the independent planning peer in /feature or /amend, not its coordinator.
Do only the assignment below. Do not invoke /feature, /amend or another workflow.
Read repository source as needed, but do not change repository files, git,
external services or product data.
Do not run the product app, tests or builds. No subagents or external writes.
Only read third-party public types and docs, never built package internals.
Do not inspect .feature/, other agent sessions, logs, transcripts or drafts.
All authorized planning inputs are supplied below; only explicitly named shared
reference files may be read in addition to source. Do not search for your peer's
answer. Until the EXCHANGE message, form your own answer without seeing theirs.
Owner decisions are binding; assistant proposals are not owner decisions.
Return the requested work in the `answer` field of the output JSON schema.
Use no em dashes. Cite source paths, URLs or observed visual states for facts.
Do not run browsers or previews in this phase.

ORIGINAL OWNER INPUT
# Owner input, verbatim (September 24, 2026)

Earlier in the day, asked whether to wipe the legacy code and database:

> Part of me wonders: should we not get rid of all the pages and all databases now so that any new session is not biased by them and begins anew? Part of me also thinks, well, there are some repeatable portions and logics, right?

The assistant recommended a "clear the ground" pass before issue 1, keeping: the auth pages and server actions, the Supabase clients and session refresh (proxy.ts), the SSRF-safe fetcher and the sitemap and feed parsers, the design system and landing shell, PostHog observability, the X handle and timeline helpers, the logo; deleting everything else and dropping every product table (auth users untouched). (Assistant proposal, not an owner decision, until the line below.)

The owner's ruling:

> Do a complete discussion with Astra, as you do in feature flow, of exactly what code to remove and what code to keep, and then launch the external critique for it also. Once you've adjudicated that, then proceed with wiping the legacy code in the database. I'm giving you authority to do it, but once you discuss it and get it critiqued and adjudicated, screw the skill setup.

Also from the same message, on Railway:

> Railways arrow stack cool. Maybe we get rid of all the code related to it and all skills or whatever, so that doesn't cause confusion.

(Dictation reading, assistant's note: "Railways arrow stack cool" is "Railway is out of our stack, cool".)

Standing owner constraints that apply: the proof bar is "does it build, does it boot, can the owner and a user experience it"; no comprehensive test suites; nothing invented and presented as his decision; no em dashes anywhere; browsers stay off his screen.

INDEPENDENT ASSIGNMENT
# Detail phase: the detailed plan for the clear-the-ground pass

Read owner-input.md (passed ahead), then scope-settled.md and inventory.md beside this brief (the joint scope from the previous phase and the verified inventory), then plan-owner.md at .feature/plan-owner.md (the plain plan). Ground everything in the repo itself.

Write your own complete detailed plan for the build stage in EXACTLY this shape, because the build reads specific parts: a `Skills:` line at the top (bundles and bare skill names; this slice leans on `nextjs` and `supabase` only); `## 1. Files and contracts` (every file deleted, trimmed or added, with the exact symbols kept or removed; the teardown migration as SQL intent, not SQL; the new article-text helper's contract: input html and url, output text bounded to the existing MIN and MAX lengths, failure returns an empty string, server-only); `## 2. Build steps` (ordered code changes only, each naming the Codex skills it invokes as `$vercel:nextjs` or `$supabase:supabase`; the app must build after each step; a build step never runs gates, journeys, servers, env edits or dashboard operations; the first step is the git tag `archive/legacy-drafting` on the pre-cleanup commit; the database teardown step is written from the live catalog through the project's supabase-runner agent and mirrored into `supabase/migrations/<timestamp>_teardown_legacy_schema.sql`, then `database.types.ts` is regenerated); `## 3. Acceptance journeys` (for the owner on localhost: the home page, sign-in and sign-out, the font preview page, the link preview image, with real inputs); `## 4. Owner does at ship` (nothing in Vercel or dashboards is expected; list only what is genuinely his).

Constraints: no em dashes anywhere (commas or periods); plain prose; under 1,800 words; every deleted path named (grouped by folder is fine where a whole folder goes); every trimmed file names the exact lines or symbols; the AGENTS.md rewrite is a build step with the section list from scope-settled.md and the exact sentence for the data section; DESIGN.md line 32 and design-system/tokens.css re-export are steps; docs/roadmap.md section 12 and the section 5 sentence about the poller's fetcher are steps. You will then see the host's independent plan and the two are merged into one.

## 2026-09-24T23:48:47.391Z

You are the independent planning peer in /feature or /amend, not its coordinator.
Do only the assignment below. Do not invoke /feature, /amend or another workflow.
Read repository source as needed, but do not change repository files, git,
external services or product data.
Do not run the product app, tests or builds. No subagents or external writes.
Only read third-party public types and docs, never built package internals.
Do not inspect .feature/, other agent sessions, logs, transcripts or drafts.
All authorized planning inputs are supplied below; only explicitly named shared
reference files may be read in addition to source. Do not search for your peer's
answer. Until the EXCHANGE message, form your own answer without seeing theirs.
Owner decisions are binding; assistant proposals are not owner decisions.
Return the requested work in the `answer` field of the output JSON schema.
Use no em dashes. Cite source paths, URLs or observed visual states for facts.
Do not run browsers or previews in this phase.

EXCHANGE
Your peer independently wrote:
Skills: web, data (nextjs, supabase)

## 1. Files and contracts

Tag: `archive/legacy-drafting` on the commit before the first deletion, pushed.

Deleted whole: `app/agents/**` (39 files), `app/api/**` (3 routes), `app/auth/x/**` (2 routes), `components/landing/landing-voice.tsx`, `landing-examples.tsx`, `landing-monitoring.tsx`, `landing-roadmap.tsx`, `landing-cta.tsx`, `landing-close.tsx`, `platform-logo.tsx`, `components/account-menu.tsx`, `site-header.tsx`, `desk-switcher.tsx`, `mobile-desk-tabs.tsx`, `page-heading.tsx`, `scroll-container.tsx`, `hooks/**`, `band-card.tsx`, `extraction-chain.tsx`, `ai-elements/**`, `source-field.tsx`, `site-favicon.tsx`, `x-entity-text.tsx`, `lib/agent/**` (24), `lib/voice/**` (12), `lib/sysprompts/**` (10), `lib/sources/onboard-source.ts`, `site-guidance.ts`, `use-website-onboarding-status.ts`, `lib/landing/platform-marks.ts`, `lib/x/handle-check.ts`, `timeline.ts`, `handle-input.ts`, `api.ts`, `actions.ts`, `post-core.ts`, `store.ts`, `link-state.ts`, `lib/split-list.ts`, `lib/websites.ts`, `lib/format.ts`, `lib/owner-allowlist.ts`, `lib/auth/return-path.ts`, `poller/**`, `ingest/**`, `scripts/**`, `supabase/migrations/*.sql` (70), `public/avatars/**` (12), and every `components/ui/*.tsx` with no importer among kept files after the deletes (recomputed by grep at build time; expected: accordion, alert-dialog, alert, avatar, button-group, carousel, collapsible, command, dialog, dropdown-menu, hover-card, input-group, label, popover, progress, scroll-area, select, separator, sheet, skeleton, tabs, textarea; kept: button, input, spinner, badge, card, switch, sonner, tooltip).

Added: `lib/sources/article-text.ts` (server-only): `extractArticleText(html: string, url: string): string`, the JSON-LD articleBody path, then Readability over a JSDOM document, then the tag-strip fallback, exactly as `poller/src/fetch-body.ts` lines 43 to 165 do it today, minus the strip-phrase configuration (the new product has none yet; the parameter is dropped); output trimmed and cut at `MAX_BODY_LENGTH` (20,000); returns "" when nothing reaches `MIN_BODY_LENGTH` (200); never throws (a parse failure returns ""). Dependencies `@mozilla/readability` and `jsdom` (plus `@types/jsdom`) added at the versions the poller pins. The header comment says: no caller until issue 2; the roadmap section 5 names it as the reused extractor; the tag-strip fallback is not evidence of a readable article.

Trimmed, with the exact change:
- `proxy.ts`: lines 8 to 21 (the `last_desk_id` block) removed; session refresh and the matcher stay.
- `app/page.tsx`: the `getUser` call and `redirect("/agents")` (lines 19 to 24) removed; the page renders `LandingPage` for everyone.
- `app/login/page.tsx:23`, `app/signup/page.tsx:22`, `app/forgot-password/page.tsx:25`: `redirect("/agents")` becomes `redirect("/")`.
- `lib/auth/actions.ts:87` and `:133`: `redirect("/agents")` becomes `redirect("/")`; a new exported server action `signOut()` calls `supabase.auth.signOut()` and redirects to `/`.
- `app/global-error.tsx:52`: href `/agents` becomes `/`, label "Back home".
- `components/landing/landing-header.tsx`: the `LandingCta` import and element go; in their place a server-side check of the session renders either a "Log in" link (`/login`) or a "Log out" button that submits the new `signOut` action, plus the existing ThemeToggle. `posthog.reset()` on sign-out moves into a tiny client component wrapping that button (the only client piece), as `account-menu.tsx:43` does today.
- `components/landing/landing-hero.tsx`: the `LandingCta` import and element go; eyebrow, headline and description read from `content.ts`; `text-text-muted` becomes `text-muted-foreground`, `text-text-body` becomes `text-foreground`.
- `components/landing/landing-page.tsx`: renders header, hero, footer only; `text-text-title` becomes `text-foreground`.
- `components/landing/landing-footer.tsx` and `landing-header.tsx`: `bg-[var(--header-bg)]` becomes `bg-background`.
- `lib/landing/content.ts`: keeps `brand`, `hero`, `footer`, `sharing`; drops `landingCtas`, `platformNames`, `monitoring`, `setup`, `feed`, `voice`, `guide`, `draft`, `roadmap`, `close` and the sample constants. New strings (assistant placeholder copy, owner may change): eyebrow "Oparax", headline ["Oparax watches the internet for one person", "and shows them only what belongs to their beat."], description "Monitoring is being rebuilt. Existing accounts can still sign in."; `sharing.title` "Oparax", `sharing.description` the same two sentences, `sharing.alt` unchanged pattern; `footer` "Oparax".
- `app/opengraph-image.tsx`: reads only `landingContent.sharing` and `brand`; any reference to removed keys goes.
- `app/globals.css`: the legacy `:root` tokens (`--page-bg`, `--card-grad-*`, `--draft-*`, the `--text-*` set, `--header-bg`, `--input-bg`) and their `@theme inline` aliases removed; `--breakpoint-desk` stays; the autofill rule at lines 202 to 203 switches from `--input-bg` to `--background`; the "legacy tokens" comment goes.
- `lib/x/handle.ts`: `MAX_TRACKED_HANDLES` and the stream-rule comment removed; the regex, `normalizeHandle` and `isValidHandle` stay.
- `lib/sources/discovery.ts`: `summarizePageForResolver`, `fetchPageForResolver`, `isResolverAllowedHost` and their private helpers removed; every function named in onboarding-algorithm.md line 189 stays; the user-agent string is untouched (issue 1's decision).
- `lib/observability/ai-telemetry.ts`: `AiStage`, `RECORDS_CONTENT`, `aiTelemetry` and the AI SDK block removed; `aiContentAllowed` and `PUBLIC_LEDGER_STAGES` stay with `PUBLIC_LEDGER_STAGES` emptied to a `new Set<string>()` and a comment that issue 1 names the first public stage; `posthog-ai.ts` unchanged.
- `lib/user.ts`: only `deriveUsernameFromEmail` stays.
- `next.config.ts`: `outputFileTracingIncludes` keeps only the `/opengraph-image` entry; the comment block at lines 8 to 19 goes.
- `tsconfig.json`: exclude becomes `["node_modules"]`. `biome.json`: the `!ingest/**`, `!poller/**`, `!components/ai-elements/**` entries go.
- `package.json`: remove `lucide-react`, `motion`, `react-tweet`, `streamdown`, `twitter-text`, `@types/twitter-text`, `@vercel/oidc`, `@radix-ui/react-use-controllable-state`, `cmdk`, `embla-carousel-react`, `tsx`; add `@mozilla/readability`, `jsdom`, `@types/jsdom`; `pnpm-workspace.yaml` drops the `dompurify` and `mermaid` pins once `pnpm audit` no longer needs them (build checks: if audit flags a transitive path that still needs a pin, the pin stays and the plan says so).
- `lib/supabase/database.types.ts`: regenerated after the teardown (expect an empty `public.Tables`).
- `DESIGN.md:32` (Legacy section) removed; `design-system/tokens.css` re-exported from the trimmed `globals.css`.
- `docs/roadmap.md`: section 12 rewritten to "what exists after the clearing" (the kept list); section 5's sentence about the poller's fetcher points at `lib/sources/article-text.ts` and the tag for the conditional-fetch details. `docs/references/state.md` and `decisions.md` get the completion lines.
- `AGENTS.md`: rewritten (build step 8).
- Skill files: `.claude/skills/qc/SKILL.md:90`, `feature/SKILL.md:41`, `.agents/skills/build/SKILL.md:43`, `ship/SKILL.md:35`: the poller mentions removed.

Migration (SQL intent): `supabase/migrations/<ts>_teardown_legacy_schema.sql` drops, in dependency order and each `if exists`: every policy on the twenty public tables; the trigger `agents_set_updated_at`; the fifteen app functions in the live catalog (`add_source_config`, `attach_or_create_story`, `claim_draft`, `claim_strip_phrase_refresh_attempt`, `complete_claimed_attachment`, `complete_claimed_no_artifact`, `delete_account`, `detect_spend_anomalies`, `insert_claimed_winner`, `record_seen_item`, `refresh_source_strip_phrases`, `remove_source_config`, `reserve_dm_send`, `reserve_pending_source_config`, `unseen_item_keys`, `upsert_claimed_exclusion`, plus any overload the catalog lists) with their signatures as the catalog reports them; the twenty tables (`agents`, `alerts`, `beat_conflicts`, `dm_connections`, `dm_send_ledger`, `draft_claims`, `drafts`, `excluded_posts`, `model_calls`, `onboard_attempts`, `source_configs`, `source_posts`, `source_seen_items`, `stories`, `story_assignments`, `unmatched_deliveries`, `usage_events`, `x_accounts`, `x_handle_checks`, `x_webhook_events`) with `cascade`; the type `publisher_claim_kind`; the `moddatetime` trigger function only if it is an app-owned function in `public` (the catalog decides). Not dropped: anything in `auth`, `storage`, `extensions`, the `citext` extension. The file is written from the runner's live listing, not from the types file.

## 2. Build steps

1. Tag and push `archive/legacy-drafting` at the current commit. No skill.
2. Landing and auth destinations, and the extraction helper: the trims to `proxy.ts`, `app/page.tsx`, the three auth pages, `lib/auth/actions.ts` (redirects and `signOut`), `app/global-error.tsx`, the four landing files, `content.ts`, `opengraph-image.tsx`; delete `landing-voice`, `landing-examples`, `landing-monitoring`, `landing-roadmap`, `landing-cta`, `landing-close`, `platform-logo`, `platform-marks`; add `lib/sources/article-text.ts` and its packages. `$vercel:nextjs`.
3. Product routes and their exclusive components: delete `app/agents/**`, `site-header`, `desk-switcher`, `mobile-desk-tabs`, `account-menu`, `page-heading`, `scroll-container`, `hooks`, `band-card`, `source-field`, `site-favicon`, `x-entity-text`, `use-website-onboarding-status`, `lib/voice/use-extraction-progress.ts`, `format.ts`, `owner-allowlist.ts`, `handle-input.ts`, `split-list.ts`, `link-state.ts`, `public/avatars`; trim `lib/user.ts`, `lib/x/handle.ts`. `$vercel:nextjs`.
4. Pipeline and entry points: delete `app/api`, `app/auth/x`, `lib/agent`, `lib/voice`, `lib/sysprompts`, `onboard-source`, `site-guidance`, `lib/x/api`, `actions`, `post-core`, `store`, `handle-check`, `timeline`, `websites`, `return-path`, `extraction-chain`, `ai-elements`, `scripts`; trim `next.config.ts`, `discovery.ts`, `ai-telemetry.ts`. `$vercel:nextjs`.
5. Workers, packages, config: delete `poller` and `ingest`; edit `tsconfig.json`, `biome.json`, `package.json`, `pnpm-workspace.yaml`; reinstall; delete the vendored primitives with no importer (grep `from "@/components/ui/<name>"` across `app`, `components`, `lib`). No skill.
6. Database teardown through the `supabase-runner` agent: list the live catalog (tables, functions with arguments, policies, triggers, types, extensions in `public`), write the drop script from that listing, apply it, mirror it as the migration file, regenerate `database.types.ts`. `$supabase:supabase`.
7. Tokens and design: `globals.css` trim, `design-system/tokens.css` re-export, `DESIGN.md` Legacy section removed. No skill.
8. Docs: rewrite `AGENTS.md`: keep "Oparax" (first paragraph rewritten: the checkout now holds only the rebuild's foundation), "The plan" (unchanged except the last sentence goes), "How work moves" (Stage execution loses "or the poller"; Vocabulary loses the three file names and the qwen sentence, keeps "desk and agent are the same thing" as a retired term), "Engineering principles" (unchanged), a new short "Repository map" listing only what exists, a new "Web surface" with the four public pages, `/preview`, the opengraph image and `proxy.ts`, a new "Data model" reading exactly: "The `public` schema holds no tables; the first product tables are designed in issue 1 (#143). Supabase's own `auth` schema and its users are untouched. `supabase/migrations/` holds only the teardown migration; the live `supabase_migrations.schema_migrations` table still records the prior versions, which no local file describes, so the local folder is not a replayable chain and any future CLI-driven migration use needs a deliberate reconciliation first. Migrations apply live through the Supabase MCP during build and are mirrored here.", "Environment and commands" with the nine Vercel names only (the `read in` column pointing at kept files or "reserved for issue N"), "Tooling and configuration" (Biome excludes trimmed, `.claude/launch.json` unchanged), "Coding conventions" (every rule kept; examples that cite deleted files reworded to name kept files or the rule alone). Then `docs/roadmap.md` sections 5 and 12, the four skill files' poller mentions, `docs/references/state.md` and `decisions.md`. No skill.

## 3. Acceptance journeys

1. Home: open `http://localhost:3000/`; the header shows the mark, "Oparax", the theme toggle and "Log in"; the hero shows the two-sentence product line and the rebuilding note; the footer shows "Oparax"; dark by default, the toggle switches to light.
2. Sign-in and sign-out: `/login` with the owner's existing account; after sign-in the browser lands on `/`, the header shows "Log out"; clicking it returns to `/` with "Log in" showing; `/login` while signed in redirects to `/`.
3. Password reset: `/forgot-password` with the owner's email sends the email (proven September 11); the link opens `/auth/reset-password`.
4. Preview: `/preview` renders as before (fonts, gutters, cards).
5. Link preview: `/opengraph-image` returns an image with the product line in Nunito Sans (the fonts entry survived).
6. Database: the Supabase dashboard's Table Editor shows no tables in `public`; Authentication shows the existing users.

## 4. Owner does at ship

Nothing in Vercel, Supabase or X is required. Optional, at his convenience: remove `/auth/x/callback` from the X app's callback list (it no longer exists).


Host reply. The combined plan is written at .feature/plan-draft.md; read it now. It is your plan and mine merged: your additions taken (the `ai` package removed, since only deleted files and the removed TelemetryOptions import use it; `validateSectionCandidate` and `isFeedShapedPath` removed, their only external caller is onboard-source.ts; the extra legacy CSS classes; the sign-out button as its own client component with the error copy; PostHogUserContext mounted from the signed-in home page; JSON-LD validation and the DOM bypass in the extractor; your headline sentence, which is AGENTS.md's own first line; the preview journey inputs; the design re-sync at ship). Two places where I kept mine: `PUBLIC_LEDGER_STAGES` is emptied rather than kept with the legacy stage names, with a why-comment (Subtract first); the article-text helper drops the strip-phrase parameter entirely rather than keeping it unconfigured. Verify the combined plan against the repo: name any step that would not build, any kept file that still imports a deleted one, any wrong line number or symbol, and anything your plan had that the merge lost. Under 300 words, findings only, plain prose, no em dashes. If nothing is wrong, say "verified".

## 2026-09-24T23:48:47.393Z

<skill>
<name>supabase:supabase</name>
<path>/Users/farzanm4/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills/supabase/SKILL.md</path>
---
name: supabase
description: "Use when doing ANY task involving Supabase. Triggers: Supabase products (Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues); client libraries and SSR integrations (supabase-js, @supabase/ssr) in Next.js, React, SvelteKit, Astro, Remix; auth issues (login, logout, sessions, JWT, cookies, getSession, getUser, getClaims, RLS); Supabase CLI or MCP server; schema changes, migrations, security audits, Postgres extensions (pg_graphql, pg_cron, pg_vector)."
metadata:
  author: supabase
  version: "0.1.2"
---

# Supabase

## Core Principles

**1. Supabase changes frequently — verify against changelog and current docs before implementing.**
Do not rely on training data for Supabase features. Function signatures, config.toml settings, and API conventions change between versions.

First, fetch `https://supabase.com/changelog.md` (a lightweight summary index — not a heavy pull), scan for `breaking-change` tags relevant to your task, and follow the linked page for any that apply. Then look up the relevant topic using the documentation access methods below.

**2. Verify your work.**
After implementing any fix, run a test query to confirm the change works. A fix without verification is incomplete.

**3. Recover from errors, don't loop.**
If an approach fails after 2-3 attempts, stop and reconsider. Try a different method, check documentation, inspect the error more carefully, and review relevant logs when available. Supabase issues are not always solved by retrying the same command, and the answer is not always in the logs, but logs are often worth checking before proceeding.

**4. Exposing tables to the Data API:** Depending on the user's [Data API settings](https://supabase.com/dashboard/project/<ref>/integrations/data_api/settings), newly created tables may not be automatically exposed via the Data (REST) API. If this is the case, `anon` and `authenticated` roles will need to be explicitly granted access.

> Note that this is separate from RLS, which controls which _rows_ are visible once a table is accessible, not whether the table is accessible at all.

When a user reports a SQL-created table is unexpectedly inaccessible, check their Data API settings and whether the roles have been granted access via explicit `GRANT` SQL. When granting public (`anon`/`authenticated`) access, always enable RLS too. See [Exposing a Table to the Data API](https://supabase.com/docs/guides/api/securing-your-api.md) for the full setup workflow.

**5. RLS in exposed schemas.**
Enable RLS on every table in any exposed schema, which includes `public` by default. This is critical in Supabase because tables in exposed schemas can be reachable through the Data API when the `anon`/`authenticated` roles have access (see [Exposing a Table to the Data API](https://supabase.com/docs/guides/api/securing-your-api.md)). For private schemas, prefer RLS as defense in depth. After enabling RLS, create policies that match the actual access model rather than defaulting every table to the same `auth.uid()` pattern.

**6. Security checklist.**
When working on any Supabase task that touches auth, RLS, views, storage, or user data, run through this checklist. These are Supabase-specific security traps that silently create vulnerabilities:

- **Auth and session security**
  - **Never use `user_metadata` claims in JWT-based authorization decisions.** In Supabase, `raw_user_meta_data` is user-editable and can appear in `auth.jwt()`, so it is unsafe for RLS policies or any other authorization logic. Store authorization data in `raw_app_meta_data` / `app_metadata` instead.
  - **Deleting a user does not invalidate existing access tokens.** Sign out or revoke sessions first, keep JWT expiry short for sensitive apps, and for strict guarantees validate `session_id` against `auth.sessions` on sensitive operations.
  - **If you use `app_metadata` or `auth.jwt()` for authorization, remember JWT claims are not always fresh until the user's token is refreshed.**

- **API key and client exposure**
  - **Never expose the `service_role` or secret key in public clients.** Prefer publishable keys for frontend code. Legacy `anon` keys are only for compatibility. In Next.js, any `NEXT_PUBLIC_` env var is sent to the browser.

- **RLS, views, and privileged database code**
  - **Views bypass RLS by default.** In Postgres 15 and above, use `CREATE VIEW ... WITH (security_invoker = true)`. In older versions of Postgres, protect your views by revoking access from the `anon` and `authenticated` roles, or by putting them in an unexposed schema.
  - **UPDATE requires a SELECT policy.** In Postgres RLS, an UPDATE needs to first SELECT the row. Without a SELECT policy, updates silently return 0 rows — no error, just no change.
  - **`auth.role()` is deprecated — use the `TO` clause instead.** Supabase has deprecated `auth.role()` in favour of specifying the target role directly on the policy with `TO authenticated` or `TO anon`. Beyond deprecation, `auth.role() = 'authenticated'` breaks silently when anonymous sign-ins are enabled, because anonymous users carry the `authenticated` Postgres role and pass the check regardless of whether the user is genuinely signed in.
    ```sql
    -- Deprecated (do not use)
    create policy "example" on table_name for select
    using ( auth.role() = 'authenticated' );
    ```
  - **`TO authenticated` alone is authentication without authorization (BOLA / IDOR).** Using `TO authenticated` only checks the role — it does not restrict which rows a user can access. The correct pattern combines `TO authenticated` with an ownership predicate in `USING`:
    ```sql
    create policy "example" on table_name for select
    to authenticated
    using ( (select auth.uid()) = user_id );
    ```
  - **UPDATE policies require both `USING` and `WITH CHECK`.** Without `WITH CHECK`, a user can reassign a row's `user_id` to another user:
    ```sql
    create policy "example" on table_name for update
    to authenticated
    using ( (select auth.uid()) = user_id )
    with check ( (select auth.uid()) = user_id );
    ```
  - **`SECURITY DEFINER` functions bypass RLS.** A `SECURITY DEFINER` function runs with its creator's privileges — typically a role with `bypassrls` (e.g., `postgres`). Never add `SECURITY DEFINER` to resolve a permission error; it silently removes access control without fixing the underlying cause. Prefer `SECURITY INVOKER`.
  - **`SECURITY DEFINER` functions in `public` are callable by all roles.** Postgres grants `EXECUTE` to `PUBLIC` by default for every new function, so any `SECURITY DEFINER` function in `public` is a public API endpoint callable by `anon` and `authenticated` (which inherit from `PUBLIC`) without any additional grant. When `SECURITY DEFINER` is genuinely needed (e.g., bypassing RLS on an internal lookup table), keep the function in a non-exposed schema, always include an `auth.uid()` check in the function body, and run `supabase db advisors` after making changes.

- **Storage access control**
  - **Storage upsert requires INSERT + SELECT + UPDATE.** Granting only INSERT allows new uploads but file replacement (upsert) silently fails. You need all three.

- **Dependency and supply-chain security**
  - **Always pin package versions and commit lockfiles** when installing Supabase packages (`supabase-js`, `@supabase/ssr`, `supabase-py`, etc.). See the [npm security guide](https://supabase.com/docs/guides/security/npm-security.md) for the full checklist.

For any security concern not covered above, fetch the Supabase product security index: `https://supabase.com/docs/guides/security/product-security.md`

## Supabase CLI

Always discover commands via `--help` — never guess. The CLI structure changes between versions.

```bash
supabase --help                    # All top-level commands
supabase <group> --help            # Subcommands (e.g., supabase db --help)
supabase <group> <command> --help  # Flags for a specific command
```

**Supabase CLI Known gotchas:**

- `supabase db query` requires **CLI v2.79.0+** → use MCP `execute_sql` or `psql` as fallback
- `supabase db advisors` requires **CLI v2.81.3+** → use MCP `get_advisors` as fallback
- When you need a new migration SQL file, **always** create it with `supabase migration new <name>` first. Never invent a migration filename or rely on memory for the expected format.

**Version check and upgrade:** Run `supabase --version` to check. For CLI changelogs and version-specific features, consult the [CLI documentation](https://supabase.com/docs/reference/cli/introduction) or [GitHub releases](https://github.com/supabase/cli/releases).

## Supabase MCP Server

For setup instructions, server URL, and configuration, see the [MCP setup guide](https://supabase.com/docs/guides/getting-started/mcp).

**Troubleshooting connection issues** — follow these steps in order:

1. **Check if the server is reachable:**
   `curl -so /dev/null -w "%{http_code}" https://mcp.supabase.com/mcp`
   A `401` is expected (no token) and means the server is up. Timeout or "connection refused" means it may be down.

2. **Check `.mcp.json` configuration:**
   Verify the project root has a valid `.mcp.json` with the correct server URL. If missing, create one pointing to `https://mcp.supabase.com/mcp`.

3. **Authenticate the MCP server:**
   If the server is reachable and `.mcp.json` is correct but tools aren't visible, the user needs to authenticate. The Supabase MCP server uses OAuth 2.1 — tell the user to trigger the auth flow in their agent, complete it in the browser, and reload the session.

## Supabase Documentation

Before implementing any Supabase feature, find the relevant documentation. Use these methods in priority order:

1. **MCP `search_docs` tool** (preferred — returns relevant snippets directly)
2. **Fetch docs pages as markdown** — any docs page can be fetched by appending `.md` to the URL path.
3. **Web search** for Supabase-specific topics when you don't know which page to look at.

## Making and Committing Schema Changes

**To make schema changes, use `execute_sql` (MCP) or `supabase db query` (CLI).** These run SQL directly on the database without creating migration history entries, so you can iterate freely and generate a clean migration when ready.

Do NOT use `apply_migration` to change a local database schema — it writes a migration history entry on every call, which means you can't iterate, and `supabase db diff` / `supabase db pull` will produce empty or conflicting diffs. If you use it, you'll be stuck with whatever SQL you passed on the first try.

**When ready to commit** your changes to a migration file:

1. **Run advisors** → `supabase db advisors` (CLI v2.81.3+) or MCP `get_advisors`. Fix any issues.
2. **Review the Security Checklist above** if your changes involve views, functions, triggers, or storage.
3. **Generate the migration** → `supabase db pull <descriptive-name> --local --yes`
4. **Verify** → `supabase migration list --local`

## Reference Guides

- **Skill Feedback** → [references/skill-feedback.md](references/skill-feedback.md)
  **MUST read when** the user reports that this skill gave incorrect guidance or is missing information.

</skill>

## 2026-09-24T23:48:47.393Z

<skill>
<name>vercel:nextjs</name>
<path>/Users/farzanm4/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/nextjs/SKILL.md</path>
---
name: nextjs
description: Next.js App Router expert guidance. Use when building, debugging, or architecting Next.js applications — routing, Server Components, Server Actions, Cache Components, layouts, middleware/proxy, data fetching, rendering strategies, and deployment on Vercel.
metadata:
  priority: 5
  docs:
    - "https://nextjs.org/docs"
    - "https://nextjs.org/docs/app"
  sitemap: "https://nextjs.org/sitemap.xml"
  pathPatterns:
    - 'next.config.*'
    - 'next-env.d.ts'
    - 'app/**'
    - 'pages/**'
    - 'src/app/**'
    - 'src/pages/**'
    - 'tailwind.config.*'
    - 'postcss.config.*'
    - 'tsconfig.json'
    - 'tsconfig.*.json'
    - 'apps/*/app/**'
    - 'apps/*/pages/**'
    - 'apps/*/src/app/**'
    - 'apps/*/src/pages/**'
    - 'apps/*/next.config.*'
  bashPatterns:
    - '\bnext\s+(dev|build|start|lint)\b'
    - '\bnext\s+experimental-analyze\b'
    - '\bnpx\s+create-next-app\b'
    - '\bbunx\s+create-next-app\b'
    - '\bnpm\s+run\s+(dev|build|start)\b'
    - '\bpnpm\s+(dev|build)\b'
    - '\bbun\s+run\s+(dev|build)\b'
  promptSignals:
    phrases:
      - "next.js"
      - "nextjs"
      - "app router"
      - "server component"
      - "server action"
    allOf:
      - [middleware, next]
      - [layout, route]
    anyOf:
      - "pages router"
      - "getserversideprops"
      - "use server"
    noneOf: []
    minScore: 6
---

# Next.js Best Practices

Apply these rules when writing or reviewing Next.js code.

## File Conventions

See [file-conventions.md](references/file-conventions.md) for:
- Project structure and special files
- Route segments (dynamic, catch-all, groups)
- Parallel and intercepting routes
- Middleware rename in v16 (middleware → proxy)

## RSC Boundaries

Detect invalid React Server Component patterns.

See [rsc-boundaries.md](references/rsc-boundaries.md) for:
- Async client component detection (invalid)
- Non-serializable props detection
- Server Action exceptions

## Async Patterns

Next.js 15+ async API changes.

See [async-patterns.md](references/async-patterns.md) for:
- Async `params` and `searchParams`
- Async `cookies()` and `headers()`
- Migration codemod

## Runtime Selection

See [runtime-selection.md](references/runtime-selection.md) for:
- Default to Node.js runtime
- When Edge runtime is appropriate

## Directives

See [directives.md](references/directives.md) for:
- `'use client'`, `'use server'` (React)
- `'use cache'` (Next.js)

## Functions

See [functions.md](references/functions.md) for:
- Navigation hooks: `useRouter`, `usePathname`, `useSearchParams`, `useParams`
- Server functions: `cookies`, `headers`, `draftMode`, `after`
- Generate functions: `generateStaticParams`, `generateMetadata`

## Error Handling

See [error-handling.md](references/error-handling.md) for:
- `error.tsx`, `global-error.tsx`, `not-found.tsx`
- `redirect`, `permanentRedirect`, `notFound`
- `forbidden`, `unauthorized` (auth errors)
- `unstable_rethrow` for catch blocks

## Data Patterns

See [data-patterns.md](references/data-patterns.md) for:
- Server Components vs Server Actions vs Route Handlers
- Avoiding data waterfalls (`Promise.all`, Suspense, preload)
- Client component data fetching

## Route Handlers

See [route-handlers.md](references/route-handlers.md) for:
- `route.ts` basics
- GET handler conflicts with `page.tsx`
- Environment behavior (no React DOM)
- When to use vs Server Actions

## Metadata & OG Images

See [metadata.md](references/metadata.md) for:
- Static and dynamic metadata
- `generateMetadata` function
- OG image generation with `next/og`
- File-based metadata conventions

## Image Optimization

See [image.md](references/image.md) for:
- Always use `next/image` over `<img>`
- Remote images configuration
- Responsive `sizes` attribute
- Blur placeholders
- Priority loading for LCP

## Font Optimization

See [font.md](references/font.md) for:
- `next/font` setup
- Google Fonts, local fonts
- Tailwind CSS integration
- Preloading subsets

## Bundling

See [bundling.md](references/bundling.md) for:
- Server-incompatible packages
- CSS imports (not link tags)
- Polyfills (already included)
- ESM/CommonJS issues
- Bundle analysis

## Scripts

See [scripts.md](references/scripts.md) for:
- `next/script` vs native script tags
- Inline scripts need `id`
- Loading strategies
- Google Analytics with `@next/third-parties`

## Hydration Errors

See [hydration-error.md](references/hydration-error.md) for:
- Common causes (browser APIs, dates, invalid HTML)
- Debugging with error overlay
- Fixes for each cause

## Suspense Boundaries

See [suspense-boundaries.md](references/suspense-boundaries.md) for:
- CSR bailout with `useSearchParams` and `usePathname`
- Which hooks require Suspense boundaries

## Parallel & Intercepting Routes

See [parallel-routes.md](references/parallel-routes.md) for:
- Modal patterns with `@slot` and `(.)` interceptors
- `default.tsx` for fallbacks
- Closing modals correctly with `router.back()`

## Self-Hosting

See [self-hosting.md](references/self-hosting.md) for:
- `output: 'standalone'` for Docker
- Cache handlers for multi-instance ISR
- What works vs needs extra setup

## Debug Tricks

See [debug-tricks.md](references/debug-tricks.md) for:
- MCP endpoint for AI-assisted debugging
- Rebuild specific routes with `--debug-build-paths`

</skill>

