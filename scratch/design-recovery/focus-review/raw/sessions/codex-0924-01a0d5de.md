# codex session 01a0d5de (0924) cwd /Users/farzanm4/Desktop/repos/oparax

## 2026-09-25T00:01:58.504Z

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

## 2026-09-25T00:01:58.745Z

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
# Adjudication phase: disposition every critique finding on the clear-the-ground plan

Read owner-input.md (passed ahead), then the plain plan at .feature/plan-owner.md and the detailed plan at .feature/plan-draft.md (the version the lanes reviewed), then the verified inventory at .feature/pair-ground/inventory.md (if that path is unreadable, its content was sent to you in the scope phase and is unchanged). The complete findings corpus from nine review lanes (Sol, Astra, Gemini Pro, Gemini Flash, Grok, Kimi K3, GLM 5.2, Muse Spark, Claude Opus) is embedded at the end of this brief as JSON; each object carries its lane name.

Assignment: independently accept or drop every finding, with a one-line reason each, grounded in the repo (verify the cited lines where a finding is contentious). Merge duplicates across lanes and mark findings raised independently by two or more lanes. For every accepted finding, state the exact plan edit (which bullet or step, what it now says). Where two lanes' suggestions conflict (for example cascade versus restrict in the teardown, or a string versus a structured return from the article-text helper), pick one with the evidence that settles it. A finding is dropped only for a reason that would convince a stranger: it misreads the code (cite where), it relitigates an owner decision, or it duplicates an accepted one. Do not show or guess the host's dispositions; you will see them at the exchange. Plain prose and a numbered list, no em dashes, under 1,500 words.

=== findings corpus (JSON) ===
[
 {
  "lane": "critique-agy-flash",
  "severity": "blocking",
  "target": "lib/landing/content.ts",
  "critique": "The plan trims lib/landing/content.ts sharing object to only title, headline, and description, omitting origin, alt, and domain. Because app/layout.tsx is kept untouched without edits in the plan, its root metadata exports will fail compilation and break metadata resolution on every page.",
  "suggestion": "Retain origin: \"https://oparax.ai\", alt: \"Oparax\", and domain: \"oparax.ai\" inside landingContent.sharing in lib/landing/content.ts when trimming the illustrative copy.",
  "evidence": "Verified in app/layout.tsx lines 26 to 49: line 27 accesses landingContent.sharing.origin to construct metadataBase (new URL(landingContent.sharing.origin)), and line 43 accesses landingContent.sharing.alt for Twitter card image alt text. Meanwhile, .feature/plan-draft.md line 27 specifies the exact trimmed shape of content.ts: sharing.title, sharing.headline, and sharing.description, with no mention of origin, alt, or domain. Section 1 of the plan does not list app/layout.tsx among trimmed files. If content.ts drops these properties, TypeScript typechecking fails immediately with TS2339 (property does not exist on type) during next build or tsc --noEmit. The suggestion to retain origin, alt, and domain in content.ts was verified against app/layout.tsx lines 27 and 43 where both properties are directly read by the root metadata config."
 },
 {
  "lane": "critique-agy-flash",
  "severity": "important",
  "target": "next.config.ts",
  "critique": "The plan adds lib/sources/article-text.ts importing jsdom into the Next.js server environment, but does not configure serverExternalPackages: [\"jsdom\"] in next.config.ts, causing server bundling failures due to native and dynamic module dependencies.",
  "suggestion": "Add serverExternalPackages: [\"jsdom\"] to next.config.ts so Next.js externalizes JSDOM from the server bundle.",
  "evidence": "Verified in .feature/plan-draft.md lines 13 and 48, which add lib/sources/article-text.ts with dependencies @mozilla/readability and jsdom. In next.config.ts lines 1 to 28, the plan (line 34) trims outputFileTracingIncludes to /opengraph-image only, but does not add serverExternalPackages. As documented in .feature/lanes/skills/nextjs/references/bundling.md under Solution 2 (Externalize from Server Bundle), packages with native bindings, canvas dependencies, or circular dependencies fail during Turbopack or webpack server bundling unless listed in serverExternalPackages. The suggestion to configure serverExternalPackages was verified against .feature/lanes/skills/nextjs/references/bundling.md lines 42 to 57 and next.config.ts lines 1 to 28."
 },
 {
  "lane": "critique-agy-flash",
  "severity": "important",
  "target": "proxy.ts",
  "critique": "The plan keeps config.matcher unchanged in proxy.ts, causing every request for /opengraph-image to run proxy() and make an unneeded supabase.auth.getUser() network request for public OpenGraph images.",
  "suggestion": "Exclude opengraph-image in proxy.ts config.matcher alongside static files and favicon, using /((?!_next/static|_next/image|favicon.ico|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)/.",
  "evidence": "Verified in proxy.ts lines 25 to 36: config.matcher matches all requests except static files, _next/image, favicon.ico, and files ending with image extensions. The route app/opengraph-image.tsx produces the path /opengraph-image (referenced in app/layout.tsx:42 as /opengraph-image). Because it lacks a file extension, every incoming GET request for /opengraph-image from social crawlers executes proxy() (lines 5 to 6), which calls updateSession() in lib/supabase/middleware.ts:38 (await supabase.auth.getUser()). For an image endpoint that serves public font and mark graphics with no session requirement, triggering Auth server network latency and potential rate limits on every social preview fetch is an unneeded external dependency. The suggestion to exclude opengraph-image was verified against proxy.ts lines 25 to 36 and app/layout.tsx line 42."
 },
 {
  "lane": "critique-agy-flash",
  "severity": "minor",
  "target": "components/landing/landing-page.tsx",
  "critique": "The plan directs app/page.tsx to pass signedIn down to the header via LandingPage, but line 23 does not declare signedIn in LandingPage's prop interface, creating an interface mismatch between caller and callee.",
  "suggestion": "Explicitly update LandingPage in components/landing/landing-page.tsx to accept { signedIn }: { readonly signedIn: boolean } and forward it to <LandingHeader signedIn={signedIn} />.",
  "evidence": "Verified in components/landing/landing-page.tsx line 9: export function LandingPage() currently takes zero arguments. In .feature/plan-draft.md line 19, the plan states: render LandingPage for everyone and pass signedIn (boolean) down to the header. However, in line 23 (components/landing/landing-page.tsx: header, hero, footer only; text-text-title becomes text-foreground), the plan does not specify updating LandingPage to accept the signedIn prop. Without updating LandingPage's signature, passing signedIn from app/page.tsx fails TypeScript typecheck with TS2322. The suggestion to add the signedIn prop was verified against components/landing/landing-page.tsx line 9 and components/landing/landing-header.tsx line 6."
 },
 {
  "lane": "critique-agy-flash",
  "severity": "minor",
  "target": "app/opengraph-image.tsx",
  "critique": "The plan states that app/opengraph-image.tsx reads nothing else from content.ts besides headline and description, but the current file exports alt and renders brand and sharing.domain from content.ts, leaving those exports unspecified.",
  "suggestion": "Update app/opengraph-image.tsx to export a static alt = \"Oparax\", inline the brand name \"Oparax\", and remove the sharing.domain element or read sharing.domain if retained in content.ts.",
  "evidence": "Verified in app/opengraph-image.tsx lines 10, 45, and 74: line 10 exports alt = landingContent.sharing.alt, line 45 renders {landingContent.brand}, and line 74 renders {landingContent.sharing.domain}. In .feature/plan-draft.md line 28, the plan instructs: renders sharing.headline as its headline and sharing.description below it; reads nothing else from content.ts. If it reads nothing else from content.ts, leaving line 10's named export const alt without a value or dropping it without instruction leaves the Next.js file-based OpenGraph metadata contract ambiguous. The suggestion was verified against app/opengraph-image.tsx lines 10, 45, and 74 and app/layout.tsx line 43."
 },
 {
  "lane": "critique-agy-flash",
  "severity": "minor",
  "target": "components/landing/sign-out-button.tsx",
  "critique": "The plan names the component sign-out-button.tsx with inline error copy, but Acceptance Journey 2 explicitly tests for a header control labeled \"Log out\", creating a copy discrepancy between the button label and acceptance assertion.",
  "suggestion": "Set the idle button label to \"Log out\" in components/landing/sign-out-button.tsx to match Journey 2 and the adjacent \"Log in\" navigation link.",
  "evidence": "Verified in .feature/plan-draft.md line 15 (components/landing/sign-out-button.tsx, client: calls supabase.auth.signOut()...) and Section 3 Journey 2 line 59: arrival at / with \"Log out\" in the header... \"Log out\" returns to / with \"Log in\" and \"Sign up\" showing. The button component specification in line 15 describes error copy (Could not sign out. Try again.) but omits the button's default text. In the adjacent header (line 24), the link is \"Log in\". Explicitly setting the button label to \"Log out\" satisfies the acceptance journey assertion verbatim. The suggestion to set the idle button text to \"Log out\" was verified against .feature/plan-draft.md line 24 and line 59."
 },
 {
  "lane": "critique-agy-pro",
  "severity": "blocking",
  "target": "2. Build steps",
  "critique": "Step 2 adds `lib/sources/article-text.ts` which requires `@mozilla/readability` and `jsdom`, but the `package.json` updates and `pnpm install` for these packages are deferred until Step 5.",
  "suggestion": "Move the `package.json` additions and installation of the three new packages to Step 2, or defer adding `article-text.ts` until Step 5.",
  "evidence": "internal-consistency: The plan claims the app builds after each step (draft line 14). Draft line 48 (Step 2) instructs to 'add lib/sources/article-text.ts with its three packages', but draft line 51 (Step 5) is where package.json is edited and reinstalled. The Next.js build at the end of Step 2 will fail due to unresolvable module imports."
 },
 {
  "lane": "critique-agy-pro",
  "severity": "blocking",
  "target": "next.config.ts",
  "critique": "The plan introduces `jsdom` in a Next.js server-only module but fails to configure Webpack to exclude it from the Server Components bundle, which will cause the build to fail.",
  "suggestion": "Add `serverExternalPackages: [\"jsdom\"]` to `next.config.ts`.",
  "evidence": "external-limits: The lens card explicitly calls out 'jsdom in a Next server bundle'. Draft line 13 specifies adding `article-text.ts` as `server-only` using `jsdom`, but draft line 34 (`next.config.ts` trim) and Step 4 (draft line 50) omit configuring `serverExternalPackages` to support it. `jsdom` relies on complex Node.js dependencies that break Next.js Webpack bundling unless explicitly excluded."
 },
 {
  "lane": "critique-agy-pro",
  "severity": "important",
  "target": "components/landing/landing-page.tsx",
  "critique": "The exact changes contract for `landing-page.tsx` states what is kept but fails to explicitly name the deleted import symbols, violating the contract-completeness rule.",
  "suggestion": "Explicitly state the removal of the `landing-monitoring`, `landing-roadmap`, and `landing-voice` imports in the `landing-page.tsx` trim instructions.",
  "evidence": "contract-completeness: The lens requires every kept-but-trimmed file to name the exact symbols kept and removed. Inventory line 27 explicitly states that `landing-page.tsx` lines 5 to 7 import these three deleted files. Draft line 23 says 'header, hero, footer only' but omits the explicit removal of the imports."
 },
 {
  "lane": "critique-agy-pro",
  "severity": "minor",
  "target": "Migration, SQL intent",
  "critique": "The teardown migration intends to drop a trigger but omits the mandatory `ON table_name` clause required by Postgres syntax.",
  "suggestion": "Explicitly state `drop trigger agents_set_updated_at on agents`.",
  "evidence": "external-limits: Postgres syntax rules for `DROP TRIGGER` require specifying the table. Draft line 43 just says 'drop the trigger agents_set_updated_at', which would result in a syntax error if written verbatim as a SQL command."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "important",
  "target": "lib/landing/content.ts sharing contract and app/opengraph-image.tsx",
  "critique": "The plan names only sharing.title, sharing.headline and sharing.description and says the image reads nothing else from content.ts. The image and the root layout read alt, domain, origin and brand. sharing.alt is built from the headline tuple with .join, so it stops typechecking once the headline becomes one string. The image prints the brand at 30px, so a sharing.headline of Oparax at 84px repeats the word.",
  "suggestion": "Write out the full sharing shape: title, headline, description, alt (a fixed string), domain, origin. Keep the brand row and the domain line in the image; replace hero.headline[0]/[1] with sharing.headline.",
  "evidence": "app/opengraph-image.tsx:10 alt export, :45 brand, :58-59 hero.headline[0]/[1], :74 sharing.domain. app/layout.tsx:27 metadataBase from sharing.origin, :43 sharing.alt. lib/landing/content.ts:105-111 sharing built from headline.join; :11 headline tuple."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "important",
  "target": "Step 6 teardown verification",
  "critique": "The owner plan promises a missed object stops the build; nothing does. After step 4 no kept file names a table, so a leftover table, function or enum in the regenerated types is an unused type and tsc and next build pass.",
  "suggestion": "Add a named check to step 6: after regenerating, confirm public.Tables, Functions and Enums are the empty form, and run one catalog query for public tables, views, functions and types not owned by an extension (pg_depend deptype e) that must return zero rows; stop otherwise.",
  "evidence": "Only lib/supabase/server.ts:4, client.ts:3 and admin.ts:6 import type Database, generic only. plan-owner.md What happens when it fails; plan-draft.md section 1 expected empty."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "important",
  "target": "Teardown migration: drop the twenty tables with cascade",
  "critique": "CASCADE silently drops anything depending on these tables that the listing missed. The separate policy and trigger drops add nothing because dropping a table removes both. The expected function list names complete_claimed_no_artifact, which the inventory does not list live.",
  "suggestion": "Drop all twenty tables in one DROP TABLE IF EXISTS a, b, ... RESTRICT statement (Postgres allows foreign keys among tables dropped together); an unexpected outside dependent makes it fail loudly. Then drop functions by exact catalog signature and the enum without cascade. Remove the policy and trigger statements. Reconcile the function list with inventory C.",
  "evidence": "plan-draft.md Migration paragraph; inventory.md C lists 15 live functions; the trigger agents_set_updated_at calls extensions.moddatetime (supabase/migrations/20260722044255_experiments_voice_schema.sql)."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "important",
  "target": "lib/sources/article-text.ts contract (return type and logging)",
  "critique": "A plain string cannot tell a real body from tag-stripped chrome; the checker needs that difference (onboarding-algorithm.md:191, :193). The plan also changes the poller behavior by returning empty under 200 on the tag-strip path, which the poller never gates. JSDOM's default VirtualConsole forwards parse errors to console.error, so no logging does not hold.",
  "suggestion": "Return { text, via: json-ld | readability | tag-strip }, state the under-200 behavior deliberately, construct JSDOM with a fresh VirtualConsole not forwarded anywhere.",
  "evidence": "poller/src/fetch-body.ts:143-165 extractArticleBody; :140 bypass without minimum; :163 unconditional tag-strip return; docs/onboarding-algorithm.md:191,193; docs/downstream-algorithm.md:27 short notice under 400 characters."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "important",
  "target": "components/landing/landing-page.tsx ph-no-autocapture and the deleted landing-cta.tsx event",
  "critique": "Deleting landing-cta.tsx removes the only named landing event. The root keeps ph-no-autocapture, so the new links and Log out produce no PostHog event at all. The class existed for the pictured demo controls, which are deleted in this pass.",
  "suggestion": "Drop ph-no-autocapture from the landing root, or keep one named event per intent as AGENTS.md prescribes; decide deliberately.",
  "evidence": "components/landing/landing-page.tsx:11; components/landing/landing-cta.tsx:19 posthog.capture(landing_cta_clicked); AGENTS.md Coding conventions, Analytics."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "minor",
  "target": "Signed-in wiring: landing-page.tsx prop and the hero sign-up link",
  "critique": "LandingPage takes no props and the hero keeps an unconditional sign-up link, so a signed-in visitor sees Sign up that bounces back to /.",
  "suggestion": "LandingPage takes signedIn and forwards it to LandingHeader and LandingHero; the hero hides the sign-up link when signed in.",
  "evidence": "components/landing/landing-page.tsx:9; components/landing/landing-hero.tsx:24; app/signup/page.tsx:22."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "minor",
  "target": "app/globals.css trim list",
  "critique": "The removal list covers about a third of the legacy block; the @theme inline aliases at lines 10, 13-27 also point at removed variables; --radius-badge is used by the scrollbar.",
  "suggestion": "Delete the legacy block from line 71 to the blank line before the shadcn slots except --accent (line 91) and --radius-badge (line 122, used at line 237), and every @theme inline alias pointing at a removed variable (lines 10, 13-27, 41).",
  "evidence": "app/globals.css:70-133, :10, :13-27, :41, :237; components/ui/badge.tsx:8 rounded-badge from @theme line 63."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "minor",
  "target": "Vendored primitive deletion grep",
  "critique": "Grepping app, components, lib counts imports from inside components/ui itself, so doomed primitives keep each other alive (command imports dialog and input-group; input-group imports textarea; button-group imports separator).",
  "suggestion": "Exclude components/ui/** from the grep or iterate until stable; the explicit list stays authoritative.",
  "evidence": "components/ui/command.tsx:13-14; input-group.tsx:7; button-group.tsx:3."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "minor",
  "target": "lib/sources/discovery.ts keep list",
  "critique": "The keep set omits fetchSafeSource and isSafeDiscoveredUrl, which sitemap.ts and feed.ts import, and names fetchSafeSourceWithFinalUrl, which is not exported.",
  "suggestion": "List the retained exports explicitly: fetchSafeSource, validatePublicHostname, isPrivateHostname, isSafeDiscoveredUrl, isArticleShapedPath, extractAnchors, readHtmlWithinLimit, discoverChangeDetection; keep the private helpers private.",
  "evidence": "lib/sources/sitemap.ts:11; lib/sources/feed.ts:12; discovery.ts:39, :48, :361, :532."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "minor",
  "target": "Step 8 tooling edits: skills and the supabase-runner agent",
  "critique": "amend/SKILL.md also says or poller. The supabase-runner definitions tell the runner to read table shapes from database.types.ts first with x_accounts as the example, which conflicts with step 6 and goes stale.",
  "suggestion": "Add .claude/skills/amend/SKILL.md:40 to step 8. Reword the first step of .claude/agents/supabase-runner.md and .codex/agents/supabase-runner.toml; make the step 6 brief override it explicitly.",
  "evidence": ".claude/skills/amend/SKILL.md:40; .claude/agents/supabase-runner.md:21; .codex/agents/supabase-runner.toml:10."
 },
 {
  "lane": "critique-claude-opus",
  "severity": "minor",
  "target": "Kept-file comments that go stale",
  "critique": "lib/auth/actions.ts says the username is shown in the sidebar and editable in settings; ai-telemetry.ts keeps DRAFT_CONTENT_ALLOWED and a comment block describing the removed RECORDS_CONTENT.",
  "suggestion": "Allow the comment fix in actions.ts; for ai-telemetry.ts name what remains: aiContentAllowed, the emptied PUBLIC_LEDGER_STAGES, and a non-production flag with a neutral name and a why-comment.",
  "evidence": "lib/auth/actions.ts comment above options.data.username; lib/observability/ai-telemetry.ts:19-34, :35, :51-53."
 },
 {
  "lane": "critique-codex-astra",
  "severity": "important",
  "target": ".feature/plan-draft.md:27",
  "critique": "The headline changes from a tuple to a string, but the retained sharing.alt field still calls headline.join(\" \"). Following the specified changes leaves a compilation error, or stale drafting copy if the old tuple is retained separately.",
  "suggestion": "Specify sharing.alt explicitly using the new monitoring copy and remove its dependency on the old headline tuple.",
  "evidence": "lib/landing/content.ts:11 defines the tuple; :41 uses it for hero.headline; :187 calls its join method for sharing.alt. The plan replaces sharing.title but never specifies the corresponding alt change. app/layout.tsx:43 consumes this alt in Twitter metadata, and app/opengraph-image.tsx:10 exports it as image metadata, so it remains required after deletion. The suggested change is verified against both retained consumers: each accepts the resulting string."
 },
 {
  "lane": "critique-codex-astra",
  "severity": "important",
  "target": ".feature/plan-draft.md:37 and :52",
  "critique": "Regenerating types does not enforce the promised teardown failure condition. An overlooked application table or function can remain in the generated types while the app builds successfully, because its consumers have been deleted. Step 6 needs an explicit post-teardown check and stop condition.",
  "suggestion": "Require a post-teardown catalog query that confirms no application objects remain, excluding the explicitly retained extension objects. Stop completion on unexpected objects, then regenerate and inspect the types.",
  "evidence": ".feature/plan-owner.md:7 promises that a missed object stops the build. lib/supabase/database.types.ts:9 represents tables as ordinary type members; the retained clients at lib/supabase/client.ts:8, server.ts:11 and admin.ts:12 accept Database without asserting an empty schema. The auth execution paths use supabase.auth, for example lib/auth/actions.ts:73-77, so unused application objects do not prevent those paths from compiling. The actual QC gates at .claude/scripts/qc-gates.sh:26-41 run build and typecheck without a catalog assertion. The supplied Supabase skill's 'Verify your work' rule at .feature/lanes/skills/supabase/SKILL.md:18-19 requires a confirming query. The proposed verification is grounded in these gaps; its exact SQL has not been verified against the live catalog."
 },
 {
  "lane": "critique-codex-astra",
  "severity": "minor",
  "target": ".feature/plan-draft.md:24-25 and :48",
  "critique": "Replacing LandingCta with ordinary links deletes the named login and signup intent event without assigning it a replacement. PostHog initialization survives, but the existing landing_cta_clicked instrumentation disappears, contrary to the repository's analytics convention.",
  "suggestion": "Preserve the named event on the retained login and signup links, including their cta, placement and destination properties, while keeping the simplified appearance.",
  "evidence": "components/landing/landing-cta.tsx:18-23 captures landing_cta_clicked and contains analytics failures; :42 attaches that handler to navigation. components/landing/landing-header.tsx:16-17 and landing-hero.tsx:20 supply the retained login/signup placements. Step 2 deletes the only component performing that capture. lib/observability/posthog-client.ts:95-156 initializes analytics but provides no replacement for this named event. AGENTS.md:242 requires 'one named event per user intent' and a fixed property vocabulary. Reusing the existing capture handler and properties is verified against these source files; the replacement component placement remains an implementation choice."
 },
 {
  "lane": "critique-codex-sol",
  "severity": "important",
  "target": "PostHog identity after password recovery",
  "critique": "The new home page identifies signed-in users, but password recovery signs them out without resetting the browser's PostHog identity. Later anonymous activity can remain attached to the previous user.",
  "suggestion": "Add a browser-side identity reset for sign-outs that happen through auth routes, and include password recovery in the acceptance journey.",
  "evidence": ".feature/plan-draft.md:19 mounts PostHogUserContext on signed-in home requests. components/posthog-user-context.tsx:8-11 explicitly documents that identity persists without an explicit reset; :20-23 calls identify in the browser. lib/auth/actions.ts:239-242 signs out during a password-reset server action and redirects to /login. app/auth/confirm/route.ts:67-73 also signs out during email confirmation. The suggested reset location is an unverified implementation idea; the missing reset on these paths is verified."
 },
 {
  "lane": "critique-codex-sol",
  "severity": "important",
  "target": "Link-preview alt text contract",
  "critique": "The plan replaces the preview headline but never specifies the retained sharing.alt value. Keeping its current expression leaves the retired headline in link-preview alt text, while deleting the old headline constant without rewriting alt breaks the build.",
  "suggestion": "Specify sharing.alt alongside the other sharing fields, using the new monitoring copy.",
  "evidence": ".feature/plan-draft.md:27 removes illustrative constants and specifies sharing.title, sharing.headline and sharing.description, but omits sharing.alt. lib/landing/content.ts:11 defines the retired headline and :184-189 derives alt from it. app/opengraph-image.tsx:10 exports that alt when the image route is requested; app/layout.tsx:40-45 also puts it in Twitter image metadata. The suggested field edit is verified against those consumers."
 },
 {
  "lane": "critique-codex-sol",
  "severity": "minor",
  "target": "Public auth-page copy",
  "critique": "The retained login and signup pages will still invite people back to an agent and offer to put one on their beat, although this deletion leaves no agent product to enter or create.",
  "suggestion": "Replace those two subtitles with copy consistent with the rebuilding notice.",
  "evidence": ".feature/plan-draft.md:20 changes only the auth-page redirects and :27 changes landing copy. On a public /login request, app/login/page.tsx:30 renders 'Back to the agent.' On /signup, app/signup/page.tsx:29 renders 'Put an AI news agent on your beat.' Those pages remain in the keep list. The suggested copy change is verified as necessary by these rendered strings; its exact wording is an unverified idea."
 },
 {
  "lane": "critique-codex-sol",
  "severity": "minor",
  "target": "Process-skill trim list",
  "critique": "The four named skill files are not the complete set of retained process instructions that describe the deleted poller and Railway deployment. Future stages will keep reading stale directions.",
  "suggestion": "Include the additional skill lines in the process trim while preserving their runtime restrictions and handoffs.",
  "evidence": ".feature/plan-draft.md:40 and :54 name only four skill files. .claude/skills/amend/SKILL.md:40 still names the poller; .claude/skills/ship/SKILL.md:40 still describes Railway redeploys; .agents/skills/build/SKILL.md:106-108 still uses poller journeys as owner-facing examples. Amend, ship and build read their respective SKILL.md files when those stages run. The suggested additional trim is verified against these files."
 },
 {
  "lane": "critique-cursor-glm",
  "severity": "blocking",
  "target": "lib/landing/content.ts \u2014 sharing.alt references the removed headline tuple",
  "critique": "The plan removes the `headline` tuple (an illustrative constant) and rewrites `sharing.title` and `sharing.description` to literal strings, but never gives `sharing.alt` a new value. `sharing.alt` today is `${brand}. ${headline.join(\" \")}` (content.ts:189), so once `headline` is deleted the file fails to typecheck. Two kept files read `sharing.alt` \u2014 `app/layout.tsx:38` (`alt: landingContent.sharing.alt`) and `app/opengraph-image.tsx:9` (`export const alt = landingContent.sharing.alt`) \u2014 so it cannot be dropped either. The build stops here.",
  "suggestion": "Add a placeholder value for `sharing.alt` in the content.ts trim, e.g. `alt: \\`${brand}. ${sharing.description}\\`` or `alt: brand`, and list `sharing.alt` (and `sharing.domain`, `sharing.origin`, which the plan also leaves unspecified but which are safe string literals) explicitly in the kept `sharing` shape.",
  "evidence": "Verified: lib/landing/content.ts:6 (`const headline = [\"Follow the news.\", \"Make it your own.\"] as const`), :189 (`alt: \\`${brand}. ${headline.join(\" \")}\\``), :43 (`hero: { eyebrow: \"AI news desk\", headline, description }` \u2014 `headline` is the tuple). app/layout.tsx:38 reads `landingContent.sharing.alt`. app/opengraph-image.tsx:9 reads `landingContent.sharing.alt`. plan-draft.md section 1 content.ts trim lists new values for `sharing.title`, `sharing.headline`, `sharing.description` only; the `headline` const is in the removal set (\"illustrative constants\"). Suggestion is unverified against the build (no build run); it follows the same literal-string pattern the plan already uses for `sharing.title`."
 },
 {
  "lane": "critique-cursor-glm",
  "severity": "important",
  "target": "lib/sources/article-text.ts \u2014 return contract contradicts the poller code it is lifted from",
  "critique": "The plan says the new helper \"returns \\\"\\\" only when no path yields the minimum\" AND that the \"tag-strip fallback\" is preserved. These two statements conflict. The poller's `extractArticleBody` (poller/src/fetch-body.ts:150-165) returns the tag-stripped text UNCONDITIONALLY as the final fallback \u2014 it is not gated by `MIN_BODY_LENGTH`, so it returns a short string, not \"\". Either the fallback returns its text regardless (faithful port, never \"\"), or it is gated by the minimum (a behavior change, returns \"\"). The plan picks both and they cannot both be true. With no caller until issue 2 this does not break the build, but issue 2 will inherit an ambiguous contract.",
  "suggestion": "Decide one: either port the poller faithfully (the tag-strip fallback always returns its text, so the function never returns \"\"), or state explicitly that the tag-strip fallback is newly gated by `MIN_BODY_LENGTH` and returns \"\" below it \u2014 and note that this differs from the poller.",
  "evidence": "Verified: poller/src/fetch-body.ts:150-165 (`function extractArticleBody` \u2014 final `return stripConfiguredPhrases(stripHtml(html), stripPhrases)` has no length gate), :19-20 (`MIN_BODY_LENGTH = 200`, `MAX_BODY_LENGTH = 20_000`). plan-draft.md section 1 article-text.ts contract: \"returns \\\"\\\" only when no path yields the minimum; never throws; otherwise truncated to the maximum\" and \"the tag-strip fallback\" preserved. The two clauses are mutually exclusive given the poller's code. Suggestion is unverified against the build."
 },
 {
  "lane": "critique-cursor-glm",
  "severity": "important",
  "target": "lib/sources/discovery.ts \u2014 fetchSafeSourceWithFinalUrl is kept but not exported",
  "critique": "onboarding-algorithm.md:189 names `fetchSafeSourceWithFinalUrl` as one of the discovery functions the checker runs, and the plan keeps it. But it is a local (non-exported) function today (discovery.ts:50, no `export` keyword). The plan's discovery.ts trim never says to add `export`. Issue 2 cannot import it without the export, so the kept helper is unreachable from the rebuild it is being kept for.",
  "suggestion": "Add `export` to `fetchSafeSourceWithFinalUrl` in the discovery.ts trim (and audit the other six named functions \u2014 `readHtmlWithinLimit`, `extractAnchors`, `extractListingSample`, `isArticleShapedPath`, `discoverChangeDetection`, `validatePublicHostname` are already exported, so only this one needs the keyword added).",
  "evidence": "Verified: lib/sources/discovery.ts:50 (`async function fetchSafeSourceWithFinalUrl(` \u2014 no `export`), :39 (`export async function fetchSafeSource` \u2014 the wrapper, exported). docs/onboarding-algorithm.md:189 lists `fetchSafeSourceWithFinalUrl` among the functions the checker runs. plan-draft.md section 1 discovery.ts trim: \"Keep every function that line names (`fetchSafeSourceWithFinalUrl`, ...)\" \u2014 does not mention adding `export`. Suggestion is unverified against the build."
 },
 {
  "lane": "critique-cursor-glm",
  "severity": "important",
  "target": "lib/observability/ai-telemetry.ts \u2014 DRAFT_CONTENT_ALLOWED not named in the trim, aiContentAllowed depends on it",
  "critique": "The plan says keep `aiContentAllowed` and `PUBLIC_LEDGER_STAGES` (emptied) and remove `TelemetryOptions`, `AiStage`, `RECORDS_CONTENT`, `aiTelemetry`. It never names `DRAFT_CONTENT_ALLOWED`. But `aiContentAllowed` (ai-telemetry.ts:56-58) reads `DRAFT_CONTENT_ALLOWED` (line 38) \u2014 `return PUBLIC_LEDGER_STAGES.has(ledgerStage) || DRAFT_CONTENT_ALLOWED`. `lib/observability/posthog-ai.ts:5,86` imports `aiContentAllowed` (posthog-ai.ts is kept). If the trim removes `DRAFT_CONTENT_ALLOWED`, `aiContentAllowed` stops compiling and so does posthog-ai.ts.",
  "suggestion": "Name `DRAFT_CONTENT_ALLOWED` explicitly in the kept set for ai-telemetry.ts (it is `process.env.VERCEL_ENV !== \"production\"`, no `ai` import, so it survives the `ai` package removal), or rewrite `aiContentAllowed` to inline the check if the constant is meant to go.",
  "evidence": "Verified: lib/observability/ai-telemetry.ts:38 (`const DRAFT_CONTENT_ALLOWED = process.env.VERCEL_ENV !== \"production\";`), :56-58 (`export function aiContentAllowed(ledgerStage: string): boolean { return PUBLIC_LEDGER_STAGES.has(ledgerStage) || DRAFT_CONTENT_ALLOWED; }`). lib/observability/posthog-ai.ts:5 (`import { aiContentAllowed } from \"@/lib/observability/ai-telemetry\"`), :86 (`if (aiContentAllowed(input.stage))`). plan-draft.md section 1 ai-telemetry.ts trim lists the kept symbols as `aiContentAllowed` and `PUBLIC_LEDGER_STAGES` only. Suggestion is unverified against the build."
 },
 {
  "lane": "critique-cursor-glm",
  "severity": "minor",
  "target": "supabase/migrations teardown \u2014 expected function list has one entry the live catalog does not",
  "critique": "The plan's \"expected\" function list for the teardown includes `complete_claimed_no_artifact`, which the verified inventory says is NOT live (the live function is `complete_claimed_attachment`; the types file has neither). The plan correctly includes `complete_claimed_attachment` and omits the three types-only functions (`attach_story_draft`, `claim_story_draft`, `reclaim_extraction_run`). Because every drop uses `if exists`, the extra entry is harmless, but the \"expected\" cross-check does not match the verified live catalog, so a runner comparing its listing against this expectation would flag a mismatch that is not real.",
  "suggestion": "Drop `complete_claimed_no_artifact` from the expected list (the inventory's live catalog does not carry it), or note that the expected list is a superset and the runner should drop exactly what the catalog lists.",
  "evidence": "Verified: lib/supabase/database.types.ts:947-1068 lists 15 functions; `complete_claimed_no_artifact` and `complete_claimed_attachment` are both absent from the types. inventory.md section C: \"15 app functions (types list minus attach_story_draft, claim_story_draft, reclaim_extraction_run, plus attach_or_create_story, complete_claimed_attachment, reserve_dm_send)\" \u2014 `complete_claimed_no_artifact` is not in the live set. plan-draft.md section 1 migration SQL intent expected list includes both `complete_claimed_attachment` and `complete_claimed_no_artifact`. AGENTS.md RPC list names `complete_claimed_no_artifact` (stale doc). Suggestion is unverified against the live DB."
 },
 {
  "lane": "critique-cursor-glm",
  "severity": "minor",
  "target": "app/opengraph-image.tsx \u2014 \"reads nothing else from content.ts\" is inaccurate",
  "critique": "The plan says the opengraph image \"renders `sharing.headline` as its headline and `sharing.description` below it; reads nothing else from `content.ts`\". The file also reads `landingContent.brand` (line 41, the logo label), `landingContent.sharing.alt` (line 9, the `export const alt`), and `landingContent.sharing.domain` (line 73, the footer line). If \"reads nothing else\" is read literally, those reads would be removed and the image would lose its logo label, its alt export, and its domain footer. The intent is almost certainly \"the headline source changes from `hero.headline[0]/[1]` to `sharing.headline`; other reads stay,\" but the wording invites the wrong cut.",
  "suggestion": "Reword to: \"the headline source changes from `hero.headline[0]`/`hero.headline[1]` to `sharing.headline`; `brand`, `sharing.alt`, `sharing.description`, `sharing.domain` continue to be read as today.\"",
  "evidence": "Verified: app/opengraph-image.tsx:9 (`export const alt = landingContent.sharing.alt`), :41 (`{landingContent.brand}`), :60 (currently `landingContent.hero.headline[0]`/`[1]` \u2014 the lines the plan changes), :73 (`{landingContent.sharing.domain}`). plan-draft.md section 1 opengraph-image.tsx trim and section 1 content.ts trim. Suggestion is unverified against the build."
 },
 {
  "lane": "critique-cursor-glm",
  "severity": "minor",
  "target": "components/landing/landing-page.tsx \u2014 signedIn prop not in the stated trim contract",
  "critique": "The plan says `app/page.tsx` passes `signedIn` down to the header and `landing-header.tsx` receives `signedIn`, but the trimmed `landing-page.tsx` contract (\"header, hero, footer only\") never states that `LandingPage` must accept a `signedIn` prop and forward it to `LandingHeader`. `LandingPage` today takes no props (landing-page.tsx:9), so the build will not typecheck unless the prop is added. The contract is incomplete on the one file that bridges the page and the header.",
  "suggestion": "State the trimmed `LandingPage` signature explicitly: `export function LandingPage({ signedIn }: { readonly signedIn: boolean })` and that it forwards `signedIn` to `LandingHeader`.",
  "evidence": "Verified: components/landing/landing-page.tsx:9 (`export function LandingPage() {` \u2014 no props). components/landing/landing-header.tsx is the receiver of `signedIn` per the plan. app/page.tsx:21-25 today renders `<LandingPage />` with no props. plan-draft.md section 1 landing-page.tsx trim says \"header, hero, footer only\" with no prop mention; section 1 app/page.tsx trim says \"pass `signedIn` (boolean) down to the header\". Suggestion is unverified against the build."
 },
 {
  "lane": "critique-cursor-kimi",
  "severity": "important",
  "target": ".feature/plan-draft.md, content.ts trim bullet and opengraph-image bullet",
  "critique": "The content.ts trim names placeholder copy only for sharing.title, sharing.headline (new) and sharing.description, and says app/opengraph-image.tsx 'reads nothing else from content.ts'. Both are contradicted by kept readers the plan never mentions: sharing.alt, sharing.domain and sharing.origin are read by app/layout.tsx and app/opengraph-image.tsx today. If the builder drops those three fields, typecheck fails at four unnamed call sites; if it keeps them, the plan's 'reads nothing else' is false. The exact-symbol contract the brief requires is incomplete either way.",
  "suggestion": "State the fate of sharing.alt, sharing.domain and sharing.origin explicitly in the content.ts bullet (keep them, or name their replacements), and restate the opengraph-image bullet as reading sharing.headline, sharing.description, sharing.alt, sharing.domain and brand.",
  "evidence": "Read lib/landing/content.ts:184-190 (sharing = { title, description, alt, domain, origin }). Kept readers: app/layout.tsx:27 (metadataBase: new URL(landingContent.sharing.origin), runs server-side on every page render) and app/layout.tsx:43 (twitter image alt: landingContent.sharing.alt); app/opengraph-image.tsx:10 (export const alt = landingContent.sharing.alt) and app/opengraph-image.tsx:73 (renders landingContent.sharing.domain in the image footer), both executed on GET /opengraph-image in the Node runtime. The plan-draft opengraph-image bullet says the file 'renders sharing.headline as its headline and sharing.description below it; reads nothing else from content.ts'. Suggestion verified against the code: the four cited lines are the only non-headline/description sharing readers, confirmed by reading both files in full."
 },
 {
  "lane": "critique-cursor-kimi",
  "severity": "important",
  "target": ".feature/plan-draft.md, app/globals.css trim bullet",
  "critique": "The trim enumerates the legacy tokens to remove (--page-bg, --card-grad-*, --draft-*, the --text-* set, --header-bg, --input-bg, --live, --warning, --danger, --warn, plus aliases 'at lines 14 and 41'), but the legacy :root block spans lines 71-136 and most of it is unnamed: --card-border/--card-radius/--card-shadow (78-80), --band-bg/--band-border (81-82), --strip-x-grad/--strip-news-grad (83-84), --menu-bg (87), --chip-x-bg/--chip-web-bg (89-90), --accent-hover (92), --success (93), --warn-stale (95), --danger-text (97), --text-band-header (100), --font-ui (108), --font-draft (109), the --fs-* set (112-118), --radius-card/control/tag (119-121), --content-max (123), --gutter-* (124-125), --page-rhythm-* (126-127), --strip-h-* (128-129), --breakpoint-mobile (130), --post-h-* (131-132), --draft-footer-gap-* (133-134), --char-count-gap-mobile (135), --char-limit (136). The matching @theme inline aliases are likewise unnamed: --font-draft (10), --color-success (13), --color-warn-stale (15), --color-danger-text (16), --color-band-header-text (17), --color-draft-bg (18), --color-text-page-header (20), --color-text-draft (22), --color-text-label (23), --color-text-count (25), --color-text-handle-x (26), --color-text-handle-news (27). A literal execution leaves aliases pointing at deleted variables: dead CSS (the 'No slop' principle) and a silent unstyle if any future surface uses one, with no build error.",
  "suggestion": "Replace the enumeration with a whole-block rule: remove every :root declaration in the legacy block (lines 71-136) except the light --accent at line 91, and remove every @theme inline alias whose value references a removed variable (lines 10, 13-27 and 41).",
  "evidence": "Read app/globals.css in full: legacy comment at 72-73, block 74-136, aliases 7-68. Verified by grep (pattern text-text-|--header-bg|op-skeleton|op-scroll-region|text-warning|bg-live|text-danger|--input-bg|text-band|draft-bg|font-draft over the repo excluding app/agents, components/ui, components/ai-elements, poller, ingest) that every consumer of these tokens is in the plan's delete set (landing-examples, landing-voice, landing-roadmap, landing-monitoring, landing-close, site-header, account-menu, source-field, band-card, page-heading, scroll-container); the kept landing files use only text-text-title, text-text-muted, text-text-body and var(--header-bg), which the plan does convert. So the finding is contract completeness and slop, not a break. Suggestion verified against the cited lines."
 },
 {
  "lane": "critique-cursor-kimi",
  "severity": "minor",
  "target": ".feature/plan-draft.md, build step 8 skill-file list",
  "critique": "The step trims poller and Railway mentions from four skill files (feature, qc, ship, build) but misses .claude/skills/amend/SKILL.md, which carries the same stale restriction.",
  "suggestion": "Add .claude/skills/amend/SKILL.md to the step-8 list.",
  "evidence": "grep -rn 'poller|Railway' over .claude/skills and .agents/skills returns .claude/skills/amend/SKILL.md:40 ('Never start or attach to the product app or poller') in addition to the named files (.claude/skills/feature/SKILL.md:41 and :108, qc/SKILL.md:90, ship/SKILL.md:35 and :40, .agents/skills/build/SKILL.md:32, :43, :106, :108). Verified."
 },
 {
  "lane": "critique-cursor-kimi",
  "severity": "minor",
  "target": ".feature/plan-draft.md, lib/sources/article-text.ts contract",
  "critique": "The contract says the lifted JSON-LD path has 'parsed JSON validated as an object before fields are read'. The source it cites does no such validation: it JSON.parses each block and reads candidate?.articleBody directly. Optional chaining makes primitives safe, so this is a misdescription of the lifted code, not a defect; a builder porting verbatim would not produce the described check, and a builder trusting the description would add one.",
  "suggestion": "Drop the 'validated as an object' clause, or make it an explicit hardening note ('new: parse result is checked to be an object before fields are read').",
  "evidence": "Read poller/src/fetch-body.ts:103-134: JSON.parse at 109, candidates array at 110, candidate?.articleBody read at 112 with no typeof check; the @graph branch is guarded by Array.isArray at 119. The plan's other behavioral change (returning '' when the tag-strip fallback is below MIN_BODY_LENGTH, versus fetch-body.ts:163 returning the strip unconditionally) is stated in the plan's header-comment note, so only the validation claim is wrong. The mismatch is verified at the cited lines; the suggested object check itself is an unverified idea (not present in the source)."
 },
 {
  "lane": "critique-cursor-kimi",
  "severity": "minor",
  "target": ".feature/plan-draft.md, trim bullets for lib/auth/actions.ts, lib/sources/discovery.ts, lib/observability/posthog-server.ts",
  "critique": "Three kept files retain comments that reference deleted surfaces, and no trim bullet names them, violating 'Comments say why, never what' / 'No slop' on the diff: lib/auth/actions.ts has a comment saying the username is 'shown in the sidebar and editable later in settings (lib/user.ts)' (sidebar and settings are deleted in step 3, and the plan edits this exact file in step 2 at lines 87 and 133 only); lib/sources/discovery.ts:845 has a comment referencing lib/websites.ts's normalizeSourceUrl (a deleted file); lib/observability/posthog-server.ts:9-11 doc comment cites 'a voice extraction, a drafting run' as its examples.",
  "suggestion": "Add the three comment rewordings to the respective trim bullets.",
  "evidence": "Read lib/auth/actions.ts:107-109 (comment inside signupAction, which runs as a server action on signup submit), lib/sources/discovery.ts:845 (comment inside a kept function), lib/observability/posthog-server.ts:6-13 (module doc comment). Deletion of the referenced surfaces is in the plan's own step 3 and 4 lists. Verified."
 },
 {
  "lane": "critique-cursor-kimi",
  "severity": "minor",
  "target": ".feature/plan-draft.md, lib/observability/ai-telemetry.ts trim bullet",
  "critique": "The bullet names the removal of TelemetryOptions, AiStage, RECORDS_CONTENT and aiTelemetry and the emptying of PUBLIC_LEDGER_STAGES, but never names DRAFT_CONTENT_ALLOWED, which aiContentAllowed still ORs into its result. With the set emptied, aiContentAllowed returns true for every stage outside production; that matches today's unknown-stage behavior so nothing breaks, but the kept symbol set is incompletely specified and the required why-comment should say the constant stays and why.",
  "suggestion": "Name DRAFT_CONTENT_ALLOWED as kept in the bullet and have the why-comment state that non-production recording stays open until issue 1 names the first public stage.",
  "evidence": "Read lib/observability/ai-telemetry.ts:35 (const DRAFT_CONTENT_ALLOWED = process.env.VERCEL_ENV !== 'production') and :54-57 (aiContentAllowed returns PUBLIC_LEDGER_STAGES.has(ledgerStage) || DRAFT_CONTENT_ALLOWED). Its only remaining caller after the deletes is lib/observability/posthog-ai.ts:5 and :86 (captureAiGeneration, itself callerless once lib/agent is deleted in step 4; kept by owner decision per .feature/pair-ground/inventory.md section A). Verified."
 },
 {
  "lane": "critique-cursor-muse-resume",
  "severity": "important",
  "target": ".feature/plan-draft.md:content.ts+opengraph vs app/layout.tsx",
  "critique": "The content.ts rewrite names new values only for sharing.title, sharing.headline, sharing.description (plus hero and footer), and the opengraph spec says it reads nothing else from content.ts, but app/layout.tsx is not trimmed by any step and still reads sharing.origin, sharing.alt, sharing.brand, sharing.title and sharing.description. If the placeholder copy is implemented as the exhaustive new sharing object, layout breaks at build (missing keys on an as-const object) or at runtime (metadataBase new URL over undefined).",
  "suggestion": "Name the surviving sharing keys explicitly in the content.ts spec: keep origin, alt and domain alongside the new title/headline/description, since layout.tsx:27 and :43 and opengraph-image.tsx:10 and :74 still read them. This fix is a proposal shaped by the code trails below, not verified by execution.",
  "evidence": "Verified in code: app/layout.tsx:27 metadataBase new URL(landingContent.sharing.origin), :30-33 sharing.title/description/brand, :43 sharing.alt; app/opengraph-image.tsx:10 alt const from sharing.alt, :45 brand, :71 sharing.description, :74 sharing.domain; lib/landing/content.ts:185-190 sharing holds title/description/alt/domain/origin today. Plan trims content.ts (keep brand/hero/footer/sharing, placeholder lists only title/headline/description) and rewrites opengraph-image reads but never touches layout.tsx, so origin/alt/domain have no named fate."
 },
 {
  "lane": "critique-cursor-muse-resume",
  "severity": "important",
  "target": ".feature/plan-draft.md:discovery.ts trim vs lib/sources/feed.ts+lib/sources/sitemap.ts",
  "critique": "The discovery.ts trim names 7 kept and 7 removed symbols but never mentions fetchSafeSource or isSafeDiscoveredUrl, which two kept files import. A literal keep-only-what-is-named trim breaks feed.ts and sitemap.ts in the same step.",
  "suggestion": "Add fetchSafeSource and isSafeDiscoveredUrl to the explicit keep list for lib/sources/discovery.ts. Verified against the code trails below that both are required by kept callers; the one-line spec change itself is an unverified proposal.",
  "evidence": "Verified: lib/sources/feed.ts:12 imports fetchSafeSource from @/lib/sources/discovery and feed.ts is kept; lib/sources/sitemap.ts imports fetchSafeSource and isSafeDiscoveredUrl from ./discovery and sitemap.ts is kept. Plan keep list (fetchSafeSourceWithFinalUrl, readHtmlWithinLimit, extractAnchors, extractListingSample, isArticleShapedPath, discoverChangeDetection, validatePublicHostname, matching docs/onboarding-algorithm.md:189 which I read) omits both, and the remove list omits them too, leaving their fate undefined against the plan's own contract-completeness lens."
 },
 {
  "lane": "critique-cursor-muse-resume",
  "severity": "important",
  "target": ".feature/plan-draft.md:discovery.ts kept-private functions",
  "critique": "Two of the seven must-keep discovery functions are module-private, so issue 1's checker cannot run on them as onboarding-algorithm.md:189 requires without an export the plan never specifies.",
  "suggestion": "Specify that the trim exports fetchSafeSourceWithFinalUrl and extractListingSample (add the export keyword, no other change). Proposal only, not verified by execution.",
  "evidence": "Verified: lib/sources/discovery.ts:48 declares async function fetchSafeSourceWithFinalUrl with no export keyword; :532 declares function extractListingSample with no export; :576 isFeedShapedPath, :584 cleanResolverText and :32 RESOLVER_SUMMARY_MAX_SERIALIZED_LENGTH likewise private. docs/onboarding-algorithm.md:189 says the checker runs on the product's own fetch and parse code naming these functions, which requires importing them. Internal callers are safe (discoverChangeDetection at :899 uses fetchSafeSourceWithFinalUrl at :939 and extractListingSample at :983), so exporting breaks nothing."
 },
 {
  "lane": "critique-cursor-muse-resume",
  "severity": "important",
  "target": ".feature/plan-draft.md:step 2 vs step 5 (article-text deps install order)",
  "critique": "Step 2 adds lib/sources/article-text.ts importing @mozilla/readability and jsdom, but the install happens in step 5 (reinstall). The order claim that the app builds after each step fails at steps 2-4 with unresolvable imports.",
  "suggestion": "Install the three packages (@mozilla/readability, jsdom, @types/jsdom at poller/package.json pins, verified as ^0.6.0/^27.0.0/^27.0.0) inside step 2 alongside adding the file, or move the file creation to step 5. Proposal only, not verified by execution since no runtime is allowed.",
  "evidence": "Verified from plan text: step 2 adds article-text.ts with its three packages with no install verb; step 5 edits package.json/pnpm-workspace.yaml and reinstalls. The new module's imports cannot resolve until installed, so typecheck/build at steps 2-4 sees TS2307-style module-not-found. Pin versions confirmed in poller/package.json; app package.json today lacks all three. Whether with its three packages implies installing is exactly the ambiguity worth closing."
 },
 {
  "lane": "critique-cursor-muse-resume",
  "severity": "minor",
  "target": ".feature/plan-draft.md:article-text.ts provenance note",
  "critique": "The spec says the extractor is lifted from poller/src/fetch-body.ts lines 43-165 with parsed JSON validated as an object before fields are read. The cited range mostly holds strip-phrase machinery the new helper drops, and the poller never validates the parsed object, it optional-chains it.",
  "suggestion": "Cite the actual source functions (extractFromJsonLd, extractArticleBody, stripHtml, MIN/MAX_BODY_LENGTH, MAX_HTML_LENGTH) instead of the line range, and specify the new helper's own object check explicitly since the poller has none. Wording proposal, unverified by execution.",
  "evidence": "Verified: poller/src/fetch-body.ts:107-129 does const body = candidate?.articleBody and candidate?.[@graph] directly on JSON.parse output with try/catch for malformed blocks, no object validation; :43-73 hold stripHtml/narrowStripPhrases/strip-phrase caps which the new contract drops; :164 returns the tag-strip fallback with no MIN_BODY_LENGTH gate while the new contract returns only on meeting the minimum. MAX_HTML_LENGTH = 5_000_000 confirmed in poller/src/html.ts:3."
 },
 {
  "lane": "critique-grok",
  "severity": "blocking",
  "target": "lib/landing/content.ts sharing.alt (step 2)",
  "critique": "Step 2 replaces the headline tuple with one string and sets sharing.title to a new literal, but sharing.alt is still built with headline.join. A string has no join, so that edit does not typecheck. app/layout.tsx is not in the trim list and still reads sharing.alt and sharing.origin. Dropping alt to make content.ts compile breaks the root layout instead. Either way the app does not build after step 2.",
  "suggestion": "In the same content.ts edit, set sharing.alt to a plain string, and keep sharing.origin and sharing.domain. Leave app/layout.tsx and app/page.tsx reading the fields they already read.",
  "evidence": "content.ts:11 declares headline as a two-element tuple. content.ts:185 sets sharing.title with headline.join, and content.ts:187 sets sharing.alt the same way. content.ts:189 keeps origin. The plan (plan-draft.md:27) replaces hero.headline with one string and sharing.title with \"Oparax\", and never names sharing.alt, sharing.origin, or sharing.domain. layout.tsx:27 reads sharing.origin for metadataBase on every document request; layout.tsx:43 reads sharing.alt for the Twitter image. opengraph-image.tsx:10 also reads sharing.alt as the image alt export, and opengraph-image.tsx:58-59 indexes hero.headline[0] and [1], which step 2 does rewrite. app/page.tsx:7-13 reads sharing.title, sharing.description, and brand only. The suggestion was checked against those call sites: origin and alt have live readers the plan does not edit, so they have to stay on the sharing object as strings."
 },
 {
  "lane": "critique-grok",
  "severity": "important",
  "target": "lib/sources/discovery.ts trim (step 4)",
  "critique": "The keep list names fetchSafeSourceWithFinalUrl, which is a private function. The kept parsers import two exports the plan never names: fetchSafeSource and isSafeDiscoveredUrl. Those names are also absent from the remove list. A keep-list reading deletes the fetch sitemap.ts and feed.ts call, and step 4 does not build. checkOriginReachable is exported, unnamed, and used only by the onboarding file step 4 deletes.",
  "suggestion": "Name the exports. Keep fetchSafeSource and isSafeDiscoveredUrl (isPrivateHostname stays as the helper they call). Remove checkOriginReachable with the resolver helpers.",
  "evidence": "discovery.ts:39 exports fetchSafeSource. discovery.ts:48 declares fetchSafeSourceWithFinalUrl with no export. discovery.ts:361 exports isSafeDiscoveredUrl. discovery.ts:339 exports isPrivateHostname. discovery.ts:428 exports checkOriginReachable. sitemap.ts:11 imports fetchSafeSource and isSafeDiscoveredUrl; sitemap.ts:58, 95, and 100 call isSafeDiscoveredUrl before the server fetches a child sitemap URL. feed.ts:12 imports fetchSafeSource and feed.ts:122 calls it for the feed URL. onboard-source.ts:939 is the only call of checkOriginReachable, and that file is deleted in step 4. discoverChangeDetection (discovery.ts:899-995) calls fetchSafeSourceWithFinalUrl, readHtmlWithinLimit, and extractListingSample; it does not call the functions the plan removes. The suggestion was checked against those import and call sites. Keeping the two exports is what the surviving parsers compile against; removing checkOriginReachable matches its single caller being deleted."
 },
 {
  "lane": "critique-grok",
  "severity": "important",
  "target": "lib/sources/article-text.ts JSON-LD contract (step 2)",
  "critique": "The prose contract says the helper is lifted from poller/src/fetch-body.ts lines 43-165, then describes JSON-LD as parsed JSON validated as an object before fields are read. Those lines also accept a top-level array and read articleBody from each node's @graph array. The prose never says that. A build that follows the words and skips the array and @graph walk drops the path the poller uses for WordPress and Yoast JSON-LD, and Readability only runs after that path returns nothing.",
  "suggestion": "Write the contract so a top-level array and each object's @graph array are searched for a string articleBody, and a JSON value that is not an object is skipped. Keep the existing rule that a bad block is skipped and Readability, then the tag strip, still run.",
  "evidence": "fetch-body.ts:103-134 extractFromJsonLd loops script blocks, JSON.parse inside try/catch, and on a throw continues to the next block (lines 129-131). Line 111 sets candidates to the array itself or a one-element list. Lines 113-116 read candidate.articleBody when it is a string. Lines 117-128 read articleBody on each node of candidate[\"@graph\"] when that value is an array; the comment names WordPress/Yoast. extractArticleBody lines 144-164 then tries Readability and, on a throw or a short result, the tag strip. The plan (plan-draft.md:13) cites lines 43-165 and the sequence at 103-164, and adds the object check, without naming the array or @graph. The suggestion restates lines 111-128; it was verified by reading that function, not by running it. The plan's separate rule that a result under 200 characters becomes \"\" is explicit and is not this gap."
 },
 {
  "lane": "critique-grok",
  "severity": "important",
  "target": "components/landing/sign-out-button.tsx",
  "critique": "The new button handles a returned sign-out error and then still calls posthog.reset, router.replace(\"/\"), and router.refresh(). supabase.auth.signOut resolves with an error instead of throwing when the auth call fails. On that path the session cookies are still sent. The click runs in the browser on the home page: reset clears the PostHog identity, refresh asks the server to render again, proxy.ts runs updateSession and getUser, the user is still signed in, and the identify effect does not run again because the user id did not change. The header stays on Log out while analytics has forgotten who it was. The plan only says an analytics failure must not block a sign-out that already completed.",
  "suggestion": "If signOut returns an error, show \"Could not sign out. Try again.\" and return before posthog.reset and the router calls.",
  "evidence": "The plan (plan-draft.md:15) writes the calls in that order. The current control, account-menu.tsx:37-56, awaits supabase.auth.signOut() from the browser client (lib/supabase/client.ts:6-8, createBrowserClient) and navigates only after that await, inside the try. It does not read a returned error. proxy.ts:5-6 calls updateSession on the refresh request, and lib/supabase/middleware.ts:38 calls getUser before the response is returned, so a refresh with the old cookies re-establishes the signed-in render. posthog-user-context.tsx:20-24 identifies in an effect keyed by email and id, so a refresh of the same user does not identify again. node_modules/@supabase/ssr/CHANGELOG.md records the library default httpOnly: false, so a successful browser signOut can clear the cookies; that part of the plan matches the library. The early return was checked against account-menu's try/catch shape. It was not executed against a failing auth response."
 },
 {
  "lane": "critique-grok",
  "severity": "important",
  "target": "step 6 teardown and lib/supabase/database.types.ts",
  "critique": "The owner plan says a missed database object shows up in the regenerated types and the build stops. Step 6 regenerates the types and expects empty public Tables, Functions, and Enums, and it never checks that. After step 4 no kept file reads a table or calls a database function, so tsc and next build succeed with leftovers. A function left in public stays callable by anon and authenticated, because Postgres grants EXECUTE to PUBLIC and those roles inherit it. Who runs it: the supabase-runner, during the build, in one transaction against project pcgvpypzfwuchyfwdlwe, not during a page request.",
  "suggestion": "After regeneration, fail step 6 unless public Tables, Functions, and Enums are empty.",
  "evidence": "plan-owner.md:7 states the build stops. plan-draft.md:37 and step 6 say the file is regenerated and expected empty, with no assertion. database.types.ts:11-915 is the current table list and :947-1058 the function list; nothing in the kept auth, landing, or source-parser files imports those table types (the only kept-file table writes the inventory names are lib/x/timeline.ts and lib/x/handle-check.ts, both deleted in step 4). The Supabase skill (SKILL.md, Security checklist, \"SECURITY DEFINER functions in public are callable by all roles\") is the exposure if a function is missed. Migration 20260811025635_issue_120_bound_news_points_and_drop_dead_rpc.sql:106 already drops complete_claimed_no_artifact, which the plan still lists as expected, so the expected name list is not the catalog. The empty-check suggestion is not in the plan; it was not run against the live database. The catalog-listing instruction itself was not re-executed here."
 },
 {
  "lane": "critique-grok",
  "severity": "important",
  "target": "next.config.ts and lib/sources/article-text.ts (jsdom)",
  "critique": "Step 2 adds a server-only helper that imports jsdom, and nothing imports the helper. Next bundles a server module only when a route reaches it, so \"the app builds after each step\" never puts jsdom in a server bundle. The next.config.ts trim keeps the opengraph font trace and does not set serverExternalPackages. The Next bundling rule says a package that should run on the server but does not bundle, including native add-ons such as canvas, has to be listed there. Issue 2 is the first import, and this plan has no check that the bundle accepts jsdom.",
  "suggestion": "Add serverExternalPackages: [\"jsdom\"] in the next.config.ts edit that lands with the dependency, and name a build-time check that actually compiles the helper into the server graph.",
  "evidence": "poller/src/fetch-body.ts:1-2 imports Readability and JSDOM, and poller/package.json:16-24 pins @mozilla/readability ^0.6.0, jsdom ^27.0.0, and @types/jsdom ^27.0.0. next.config.ts:20-27 has outputFileTracingIncludes and no serverExternalPackages. The plan (plan-draft.md:13 and :34) adds the three packages and tells the helper to construct JSDOM with scripts not executed and resources not loaded; fetch-body.ts:151 is new JSDOM(html, { url }), which sets neither runScripts nor resources. The Next skill references/bundling.md:42-56 says to externalize packages that do not bundle, and the table at line 133 names canvas as a native binding that needs serverExternalPackages. The missing importer and the missing config were verified by reading those files. That jsdom 27 fails to bundle without the setting was not verified: the built package was not read, and next build was not run."
 }
]

## 2026-09-25T00:05:36.538Z

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
# Critique dispositions (host, private first answer; sealed before adjudication with Astra)

Lanes: sol OK (4), astra OK (3), agy-pro OK (4), agy-flash OK (6), grok OK (6), kimi OK (6), glm OK (7), muse INVALID then resume OK (5), claude-opus OK (11; a first Opus run returned an equivalent set and is kept as a record only).

Merged findings, `accept` or `drop` with the reason. HIGH means raised independently by two or more lanes.

1. **sharing.alt, domain, origin and the headline tuple** (flash blocking, glm blocking, grok blocking, astra, sol, kimi, muse, opus). HIGH. accept. Plan gives the full `sharing` shape as literals (title, headline, description, alt, domain, origin), deletes the tuple, and states what the image and the layout read.
2. **jsdom needs serverExternalPackages** (flash, agy-pro blocking, grok). drop as a config change: jsdom is on Next's default server-external list (opus evidence: next's shipped docs serverExternalPackages.md line 61). accept grok's residual point: the helper has no importer so no build compiles it into a server graph; the helper's header says so and issue 2's plan carries the bundling check. No config edit (Laziness: no option nobody asked for).
3. **Package adds happen in step 5 but the helper lands in step 2** (agy-pro blocking, muse). HIGH. accept. The three packages and the install move to step 2.
4. **Proxy matcher should skip /opengraph-image** (flash). drop: pre-existing behavior, untouched by this pass; recorded for issue 3.
5. **LandingPage has no signedIn prop; the hero keeps Sign up when signed in** (flash, glm, opus x2, kimi). HIGH. accept. LandingPage takes `signedIn` and forwards it to header and hero; the hero hides the sign-up link when signed in; journey 2 checks no Sign up anywhere while signed in.
6. **Sign-out label, pending label, error copy belong in content.ts** (flash, opus). accept. `content.ts` gains an `auth` block: logIn, signUp, logOut with labels, destinations, pending and error copy; components import from it.
7. **landing-page.tsx trim must name the removed imports** (agy-pro). accept, wording.
8. **`drop trigger ... on agents`** (agy-pro) and **policy and trigger drops are redundant; use one DROP TABLE ... RESTRICT** (opus). accept opus's form: one `drop table if exists <20 names> restrict` (foreign keys among tables dropped together are allowed; an unexpected outside dependent fails loudly), then functions by exact catalog signature, then the enum; the policy and trigger statements go. Cross-referenced: dropping a table removes its policies and triggers (Postgres), the trigger function is `extensions.moddatetime` (opus evidence), nothing else depends on these tables (inventory C: no views).
9. **Function list names complete_claimed_no_artifact** (glm, opus). HIGH. accept. The runner drops exactly what the catalog lists; the plan's list is an expectation, corrected to the inventory's fifteen.
10. **No post-teardown check; the owner-plan sentence is false** (astra, grok, opus x2). HIGH. accept. Step 6 gains a named check: a catalog query over `public` (tables, views, sequences, functions and types not owned by an extension, policies, non-internal triggers) must return zero rows, and the regenerated types' public blocks must be the empty `[_ in never]: never` form; otherwise the step stops. plan-owner.md's failure sentence changes to say the catalog query is the guard.
11. **article-text contract** (glm, kimi, grok, opus x2, muse). HIGH. accept, composed from the lanes' consistent suggestions: returns `{ text, via }` with `via` one of json-ld, readability, tag-strip, none; the JSON-LD walk covers a top-level object, a top-level array and each node's `@graph`, reading a string `articleBody`, non-object values skipped, the candidate checked by a small zod schema (Check at the door; zod is kept and has no importer); json-ld and readability results count only at MIN_BODY_LENGTH or more, else fall through; the tag-strip path returns its text at any length with via tag-strip (faithful to the poller); the 5,000,000-character bypass goes straight to tag-strip; html that is empty after trimming returns via none; JSDOM constructed with a fresh VirtualConsole so nothing logs; provenance line names fetch-body.ts lines 103 to 165 (the extraction functions), not 43 to 165.
12. **The landing loses its only PostHog event** (astra, opus x2). HIGH. accept the lighter form: `ph-no-autocapture` leaves the landing root (the pictured demos it protected are deleted), so autocapture records the header links and the sign-out; no named landing event until issue 3 rebuilds the page; recorded in decisions.md as a deliberate gap.
13. **Sign-out error path must return before reset and the router calls** (grok). accept.
14. **PostHog identity after password recovery** (sol). drop: the recovery flow is untouched by this pass and the behavior predates it; recorded for issue 4, which redesigns auth.
15. **Login and signup subtitles still talk about agents** (sol). accept: the two subtitles become neutral placeholder copy in the auth pages' content ("Sign in to Oparax." and "Create your Oparax account."), owner may change.
16. **amend/SKILL.md:40 and the supabase-runner definitions** (kimi, opus x2, sol). HIGH. accept. amend joins step 8; the two runner definitions lose the `x_accounts` example and the types-first instruction; the step 6 brief tells the runner to read the live catalog.
17. **globals.css whole-block rule** (kimi, opus x2). HIGH. accept: delete lines 71 to 136 except `--accent` (91) and `--radius-badge` (122, scrollbar at 237); delete the aliases at 10, 13 to 27 and 41; keep `--breakpoint-desk` (68).
18. **The primitive grep counts imports inside components/ui** (opus). accept: the explicit list is authoritative; the grep excludes `components/ui/**`.
19. **discovery.ts exports** (glm, grok, opus x2, muse). HIGH. accept: the retained exports are listed (fetchSafeSource, validatePublicHostname, isPrivateHostname, isSafeDiscoveredUrl, isArticleShapedPath, extractAnchors, readHtmlWithinLimit, discoverChangeDetection); `checkOriginReachable` is removed (only onboard-source used it; `isOriginReachable` stays private for discoverChangeDetection); the private helpers stay private (glm and muse asked to export them now; dropped: issue 1 exports what its checker needs, Laziness).
20. **DRAFT_CONTENT_ALLOWED unnamed in the ai-telemetry trim** (glm, kimi, opus). HIGH. accept: kept set named; the flag renamed `NON_PRODUCTION_CONTENT_ALLOWED` with a why-comment; the RECORDS_CONTENT comment block removed.
21. **Stale comments in kept files** (kimi, opus). accept: the comment fixes in `lib/auth/actions.ts` and `discovery.ts` are part of their trims.
22. **AGENTS.md "nine names"** (opus). accept: explicit list.
23. **Teardown file timestamp equals the applied version** (opus). accept.
24. **Brand repeated in the footer and the image** (opus). accept: `sharing.headline` "Oparax watches the internet for you."; `footer` "Monitoring is being rebuilt."
25. **Kimi: the JSON-LD "validated as an object" clause misdescribes the source** (kimi, muse). accept, folded into 11 as an explicit hardening note.

Composed decisions: 8 (RESTRICT form) and 11 (the via contract). Both are adoptions of one lane's stated mechanism cross-checked against the corpus and the files, not new mechanisms, so no outside-eye pass is needed.


Host reply. Joint record: your four reversals are taken (the opengraph matcher exclusion; the simplified LandingCta with landing_cta_clicked and a signed_out event, ph-no-autocapture removed; the anonymous PostHogUserContext reset; the two checker helpers exported now), plus your copy choices ("Monitoring your beat", the auth subtitles) and the in-transaction teardown check. My uncontested items stand (the teardown file named by the applied version, the explicit env list, the footer line). The revised detailed plan is written at .feature/plan-draft.md (if that path is prohibited for you, say so and I will paste it); the plain plan's failure sentence now says the database check stops completion. Verify the revised plan against the repo once more: any step that would not build, any kept file still importing a deleted one, any wrong symbol, and anything from the joint record the revision lost. Under 250 words, findings only, plain prose, no em dashes. If nothing is wrong, say "verified".

## 2026-09-25T00:06:14.288Z

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
Host reply: the revised detailed plan is pasted below in full. The plain plan's changed sentence reads: "The database teardown checks itself inside its own transaction and stops completion if anything remains." and its "What happens" paragraph now ends "...can sign out from the header; the two sign-in links and the sign-out keep their named analytics events." Verify against the repo: any step that would not build, any kept file still importing a deleted one, any wrong symbol or line, anything from the joint record the revision lost. Under 250 words, findings only, plain prose, no em dashes; "verified" if nothing is wrong.

=== .feature/plan-draft.md ===
Skills: web, data (nextjs, supabase)

Combined detailed plan (Fable and Astra, detail-01, revised after the nine-lane critique and the joint adjudication in `.feature/critique-dispositions.md`). The plain plan is `.feature/plan-owner.md`; the verified inventory is `.feature/pair-ground/inventory.md`.

## 1. Files and contracts

**Tag.** `archive/legacy-drafting` on the commit before the first deletion, pushed, never moved.

**Deleted whole (with manifests, lockfiles and configuration):** `app/agents/`, `app/api/`, `app/auth/x/`, `lib/agent/`, `lib/voice/`, `lib/sysprompts/`, `components/ai-elements/`, `components/hooks/`, `poller/`, `ingest/`, `scripts/`, `public/avatars/`, and all 70 files under `supabase/migrations/` (replaced by the teardown migration).

**Deleted files:** `components/account-menu.tsx`, `site-header.tsx`, `desk-switcher.tsx`, `mobile-desk-tabs.tsx`, `page-heading.tsx`, `scroll-container.tsx`, `band-card.tsx`, `extraction-chain.tsx`, `source-field.tsx`, `site-favicon.tsx`, `x-entity-text.tsx`; `components/landing/landing-voice.tsx`, `landing-examples.tsx`, `landing-monitoring.tsx`, `landing-roadmap.tsx`, `platform-logo.tsx`, `landing-close.tsx`; `lib/sources/onboard-source.ts`, `site-guidance.ts`, `use-website-onboarding-status.ts`; `lib/x/actions.ts`, `api.ts`, `post-core.ts`, `store.ts`, `link-state.ts`, `handle-input.ts`, `handle-check.ts`, `timeline.ts`; `lib/auth/return-path.ts`, `lib/landing/platform-marks.ts`, `lib/websites.ts`, `lib/format.ts`, `lib/owner-allowlist.ts`, `lib/split-list.ts`. Vendored primitives: every `components/ui/*.tsx` unreachable from the retained non-vendored files (`app/**`, `components/*.tsx`, `components/landing/**`, `lib/**`) following imports transitively through retained primitives; expected deletions accordion, alert, alert-dialog, avatar, button-group, carousel, collapsible, command, dialog, dropdown-menu, hover-card, input-group, label, popover, progress, scroll-area, select, separator, sheet, skeleton, tabs, textarea; expected kept button, input, spinner, badge, card, switch, sonner, tooltip (the explicit lists are authoritative; the reachability walk confirms them).

**Added.**
- `lib/sources/article-text.ts`, server-only (`import "server-only"`): `extractArticleText(html: string, url: string): { text: string; via: "json-ld" | "readability" | "tag-strip" }`. Lifted from the extraction functions in `poller/src/fetch-body.ts` (`extractFromJsonLd`, `extractArticleBody`, `stripHtml`, lines 43 to 165), not the fetch or delivery code. Order: JSON-LD, then Readability over a JSDOM document, then the tag-strip fallback. JSON-LD: every `application/ld+json` block is parsed; a malformed block is skipped; a top-level object, a top-level array, and each node's `@graph` array are searched for a string `articleBody`; each candidate node is checked by a small zod schema before its field is read (new hardening, not poller behavior; zod is kept and has no other importer). JSON-LD and Readability results count only at `MIN_BODY_LENGTH` (200) or more, otherwise the next path is tried; the tag-strip path returns its text at any length (the poller's behavior); html above the 5,000,000-character bypass goes straight to tag-strip; all output is whitespace-normalized and cut at `MAX_BODY_LENGTH` (20,000); empty `text` means nothing was extracted. JSDOM is constructed with `runScripts` off, resources not loaded, and a fresh `VirtualConsole` forwarded nowhere, so nothing logs. No fetching, no strip-phrase configuration, no Bright Data, no worker configuration. Header comment: no caller until issue 2; roadmap section 5 names it as the reused extractor; `via` exists because tag-stripped text is not evidence of a readable article (onboarding-algorithm.md line 193); only typechecking covers it until its first caller compiles it into a server graph (jsdom is on Next's default server-external list, so no config is added). Dependencies `@mozilla/readability`, `jsdom` and dev `@types/jsdom` at the ranges `poller/package.json` pins.
- `components/landing/sign-out-button.tsx`, client: label and copy from `content.ts` (idle "Log out", pending "Signing out", error "Could not sign out. Try again."); calls `supabase.auth.signOut()` from the browser client; on a returned or thrown error shows the error copy and returns before anything else; on success captures `signed_out`, then `posthog.reset()` if loaded, then `router.replace("/")` and `router.refresh()`; an analytics failure never blocks the navigation.

**Trimmed, exact changes:**
- `proxy.ts`: remove `deskMatch` and the `last_desk_id` cookie block (lines 8 to 21); keep `proxy`, `updateSession`; the matcher additionally excludes `opengraph-image` (the public image needs no session refresh).
- `app/page.tsx`: remove `redirect("/agents")`; keep `getUser`; render `<LandingPage signedIn={Boolean(user)} />`; mount `PostHogUserContext` with `id={user?.id ?? null}` and `email={user?.email}`.
- `components/posthog-user-context.tsx`: `id` becomes `string | null`; with a string it identifies as today; with `null` it calls `posthog.reset()` once only if the browser is currently identified (so anonymous visitors are not reset on every render); its comment names the home page instead of `account-menu.tsx`.
- `app/login/page.tsx:23`, `app/signup/page.tsx:22`, `app/forgot-password/page.tsx:25`: `redirect("/agents")` becomes `redirect("/")`; the login and signup subtitles (login:30, signup:29) become the placeholder "Oparax is being rebuilt. Your account remains available."
- `lib/auth/actions.ts:87` and `:133`: `/agents` becomes `/`; the comment near line 107 about the sidebar and settings is reworded to why the username is derived at sign-up.
- `app/global-error.tsx:52`: href `/`, label "Back home".
- `components/landing/landing-page.tsx`: `export function LandingPage({ signedIn }: { readonly signedIn: boolean })`; the `LandingMonitoring`, `LandingRoadmap`, `LandingVoice` and `LandingClose` imports and elements removed; renders header, hero, footer, forwarding `signedIn` to header and hero; `ph-no-autocapture` removed from the root (the pictured demos it protected are deleted); `text-text-title` becomes `text-foreground`.
- `components/landing/landing-cta.tsx`: kept, simplified to a client link that captures `landing_cta_clicked` with the existing `cta`, `placement`, `destination` vocabulary (placements now `header` and `hero`); its `Button` styling stays.
- `components/landing/landing-header.tsx`: receives `signedIn`; signed out renders the two `LandingCta` links (log in, sign up); signed in renders the sign-out button; ThemeToggle stays; `bg-[var(--header-bg)]` becomes `bg-background`.
- `components/landing/landing-hero.tsx`: receives `signedIn`; the anchor button and the eyebrow removed (DESIGN.md: no eyebrow); the headline expression at line 14 (tuple `[0]`/`[1]`) replaced by the single `hero.headline` string; the sign-up `LandingCta` shown only when signed out; `text-text-muted` becomes `text-muted-foreground`, `text-text-body` becomes `text-foreground`.
- `components/landing/landing-footer.tsx`: `bg-[var(--header-bg)]` becomes `bg-background`; `text-text-muted` at line 7 becomes `text-muted-foreground`.
- `lib/landing/content.ts`: keep `brand`, `landingCtas` (log in, sign up with labels and destinations), `hero`, `footer`, `sharing`; add `auth` (logOut label, pending, error; the two auth subtitles); remove the illustrative constants including the `headline` tuple, `platformNames`, `see_how_it_works`, `monitoring`, `setup`, `feed`, `voice`, `guide`, `draft`, `roadmap`, `close`. Placeholder copy (assistant's, owner may change): `hero.headline` "Oparax watches the internet, GitHub and Product Hunt for you, and brings what matters to you on X."; `hero.description` "Monitoring is being rebuilt. Existing accounts can still sign in."; `footer` "Monitoring is being rebuilt."; `sharing` as literals: `title` "Oparax", `headline` "Monitoring your beat", `description` "Oparax watches the internet, GitHub and Product Hunt for you. Monitoring is being rebuilt.", `alt` "Oparax. Monitoring is being rebuilt.", `domain` "oparax.ai", `origin` "https://oparax.ai".
- `app/opengraph-image.tsx`: keeps the brand row, the `alt` export, the domain line and `sharing.description`; the headline block reads `sharing.headline` instead of `hero.headline[0]`/`[1]`; fonts and tracing untouched. `app/layout.tsx` keeps reading `sharing.origin` and `sharing.alt`; no edit.
- `app/globals.css`: delete the whole legacy block (lines 71 to 136) except `--accent` (line 91) and `--radius-badge` (line 122, used by the scrollbar at line 237), which move beside the surviving semantic tokens; delete every `@theme inline` alias that points into the removed block (lines 10, 13 to 27, 41, including `--font-draft`); delete the `op-pulse` and `op-skeleton` keyframes, `.op-skeleton + .op-skeleton`, `.op-scroll-region` and its mobile rule, and the "legacy tokens" comment; keep the semantic light and dark tokens, fonts, radii, `--breakpoint-desk` (line 68), the scrollbar rules, and the autofill rule with `--input-bg` replaced by `--background`.
- `lib/user.ts`: keep `deriveUsernameFromEmail` only.
- `lib/x/handle.ts`: keep `X_HANDLE_RE`, `normalizeHandle`, `normalizeValidHandle`; remove `MAX_TRACKED_HANDLES` and the stream and drafting commentary.
- `lib/sources/discovery.ts`: retained exports `fetchSafeSource`, `validatePublicHostname`, `isPrivateHostname`, `isSafeDiscoveredUrl`, `isArticleShapedPath`, `extractAnchors`, `readHtmlWithinLimit`, `discoverChangeDetection`, plus `fetchSafeSourceWithFinalUrl` and `extractListingSample` newly exported (onboarding-algorithm.md line 189 names them as what the checker runs on); private helpers they need stay (`isOriginReachable`, `resolveReachableInputUrl` and the rest). Removed: `summarizePageForResolver`, `fetchPageForResolver`, `isResolverAllowedHost`, `cleanResolverText`, `RESOLVER_SUMMARY_MAX_SERIALIZED_LENGTH`, `validateSectionCandidate`, `isFeedShapedPath`, `checkOriginReachable` (only the deleted orchestrator used them). The comment near line 845 that describes removed behavior is reworded. The user-agent string is untouched (issue 1's decision).
- `lib/observability/ai-telemetry.ts`: remove `TelemetryOptions` (the `ai` import), `AiStage`, `RECORDS_CONTENT`, `aiTelemetry` and the comment block at lines 19 to 34; keep `aiContentAllowed` and `PUBLIC_LEDGER_STAGES` emptied to `new Set<string>()`; rename `DRAFT_CONTENT_ALLOWED` to `NON_PRODUCTION_CONTENT_ALLOWED` with the same value and a why-comment (non-production recording stays open until issue 1 names the first public stage). `posthog-ai.ts` unchanged; the comment at `posthog-server.ts:6` that names a deleted file is reworded.
- `next.config.ts`: `outputFileTracingIncludes` keeps only `/opengraph-image`; the comment at lines 8 to 19 goes; icon optimization stays; no `serverExternalPackages` entry.
- `tsconfig.json`: exclude `["node_modules"]`. `biome.json`: remove `!ingest/**`, `!poller/**`, `!components/ai-elements/**`.
- `package.json` and lockfile: step 2 adds `@mozilla/readability`, `jsdom`, dev `@types/jsdom`; step 5 removes `ai`, `lucide-react`, `motion`, `react-tweet`, `streamdown`, `twitter-text`, `@types/twitter-text`, `@vercel/oidc`, `@radix-ui/react-use-controllable-state`, `cmdk`, `embla-carousel-react`, `tsx`; keeps `zod`, `@vercel/functions`, `@vercel/analytics`, `@vercel/speed-insights`, `fast-xml-parser`, `posthog-*`, `next-themes`, `radix-ui`, `sonner`. `pnpm-workspace.yaml`: the `dompurify` and `mermaid` pins and their comment go (they exist only for `streamdown`); a pin stays only if `pnpm audit` still needs it, and the build notes that.
- `lib/supabase/database.types.ts`: regenerated from the live catalog after the teardown; its `Tables`, `Views`, `Functions`, `Enums` and `CompositeTypes` blocks for `public` must be the empty `[_ in never]: never` form.
- `.claude/agents/supabase-runner.md:21` and `.codex/agents/supabase-runner.toml:10`: generated types described as possibly stale, catalog grounding required for a teardown, the `x_accounts` example removed.
- `DESIGN.md`: the Legacy section (lines 30 to 32) removed. `design-system/tokens.css`: re-exported from the trimmed `globals.css`.
- `docs/roadmap.md`: section 12 rewritten to the retained foundation and the empty application schema; section 5's poller-reuse sentence names `lib/sources/discovery.ts`, the parsers, `lib/sources/article-text.ts`, and the tag `archive/legacy-drafting` for the retired conditional-fetch and Bright Data code. `docs/references/state.md` and `decisions.md`: completion lines (including that the landing keeps `landing_cta_clicked` and `signed_out` as its named events; that the recovery flow's identity reset is handled by the anonymous `PostHogUserContext`).
- Skill files: the poller and Railway mentions in `.claude/skills/feature/SKILL.md`, `.claude/skills/qc/SKILL.md`, `.claude/skills/ship/SKILL.md` (including its redeploy wording and the `poller/`, `ingest/` paths), `.claude/skills/amend/SKILL.md:40`, `.agents/skills/build/SKILL.md` (its poller examples) removed, restrictions and handoffs preserved.
- `AGENTS.md`: rewritten (step 7).

**Migration, SQL intent** (`supabase/migrations/<version>_teardown_legacy_schema.sql`, where `<version>` is exactly the version the MCP records for the applied migration; written by the supabase-runner agent from the live catalog of project `pcgvpypzfwuchyfwdlwe`, never from the types file; one transaction): drop the twenty application tables in one schema-qualified `drop table if exists ... restrict` statement (`agents`, `alerts`, `beat_conflicts`, `dm_connections`, `dm_send_ledger`, `draft_claims`, `drafts`, `excluded_posts`, `model_calls`, `onboard_attempts`, `source_configs`, `source_posts`, `source_seen_items`, `stories`, `story_assignments`, `unmatched_deliveries`, `usage_events`, `x_accounts`, `x_handle_checks`, `x_webhook_events`; foreign keys among tables dropped together are allowed, an unexpected outside dependent fails the transaction loudly; dropping a table removes its policies and triggers, so no separate policy or trigger statements); then drop the application functions by exact catalog signature, restrict, in dependency order (expected from the inventory: `add_source_config`, `attach_or_create_story`, `claim_draft`, `claim_strip_phrase_refresh_attempt`, `complete_claimed_attachment`, `delete_account`, `detect_spend_anomalies`, `insert_claimed_winner`, `record_seen_item`, `refresh_source_strip_phrases`, `remove_source_config`, `reserve_dm_send`, `reserve_pending_source_config`, `unseen_item_keys`, `upsert_claimed_exclusion`; the runner drops exactly what the catalog lists); then the type `publisher_claim_kind`, restrict; then, inside the same transaction, the named check: a catalog query over `public` for tables, views, sequences, routines and user-defined types not owned by an extension, policies and non-internal triggers must return zero rows, otherwise the transaction aborts. Not touched: the `public` schema itself, `auth`, `storage`, `extensions`, extension-owned objects, the `citext` extension, the migration history table.

## 2. Build steps

1. Tag: create and push `archive/legacy-drafting` on the current commit before any deletion; never move an existing tag. No skill.
2. `$vercel:nextjs`: add `@mozilla/readability`, `jsdom` and `@types/jsdom` and install; add `lib/sources/article-text.ts`; home and auth destinations (`proxy.ts` including the matcher, `app/page.tsx`, `components/posthog-user-context.tsx`, the three auth pages with their subtitles, `lib/auth/actions.ts` with its comment, `app/global-error.tsx`); landing composition and copy (`landing-page`, `landing-header`, `landing-hero`, `landing-footer`, `landing-cta`, `content.ts`, `opengraph-image.tsx`); add `sign-out-button.tsx`; delete the six obsolete landing files and `platform-marks.ts`.
3. `$vercel:nextjs`: delete `app/agents/` and its exclusive components and helpers (`site-header`, `desk-switcher`, `mobile-desk-tabs`, `account-menu`, `page-heading`, `scroll-container`, `components/hooks`, `band-card`, `source-field`, `site-favicon`, `x-entity-text`, `use-website-onboarding-status.ts`, `lib/voice/use-extraction-progress.ts`, `format.ts`, `owner-allowlist.ts`, `handle-input.ts`, `split-list.ts`, `link-state.ts`, `public/avatars`); trim `lib/user.ts`, `lib/x/handle.ts`. `extraction-chain.tsx` stays until step 4 because `lib/voice/extraction-steps.ts` imports its type.
4. `$vercel:nextjs`: delete `lib/agent/`, `lib/voice/`, `lib/sysprompts/`, `extraction-chain.tsx`, `components/ai-elements/`, `app/api/`, `app/auth/x/`, `lib/x/api.ts`, `actions.ts`, `post-core.ts`, `store.ts`, `handle-check.ts`, `timeline.ts`, `onboard-source.ts`, `site-guidance.ts`, `websites.ts`, `return-path.ts`, `scripts/`, `poller/`, `ingest/`; trim `next.config.ts`, `discovery.ts` (including the two new exports), `ai-telemetry.ts`, the `posthog-server.ts` comment.
5. `$vercel:nextjs`: delete the unreachable vendored primitives (reachability walk from the retained non-vendored files); edit `tsconfig.json`, `biome.json`, `package.json` (removals), `pnpm-workspace.yaml`; reinstall; then trim `app/globals.css` (the retained consumers use semantic tokens after step 2).
6. `$supabase:supabase`: through the project's `supabase-runner` agent, with the explicit instruction that the generated types are stale and the live catalog is the source: list the catalog (tables, functions with argument signatures, policies, triggers, types, extensions in `public`), write the teardown from that listing with the in-transaction check, apply it, mirror it as the migration file named by the applied version, delete the 70 old files, regenerate `lib/supabase/database.types.ts` and confirm its five `public` blocks are empty; the step stops on any survivor. No migration-history repair. Also apply the two runner-definition edits.
7. `$vercel:nextjs`: rewrite `AGENTS.md` with exactly these sections: "Oparax" (first paragraph: the checkout holds only the rebuild's foundation; the owner paragraph unchanged), "The plan" (unchanged except the last sentence about the legacy goes), "How work moves" (Stage execution loses "or the poller"; Vocabulary loses the three deleted file names and the qwen sentence, keeps "desk and agent are the same thing" as a retired term), "Engineering principles" (unchanged), "Repository map" (only what exists), "Web surface" (`/`, `/login`, `/signup`, `/forgot-password`, `/auth/confirm`, `/auth/reset-password`, `/preview`, `/opengraph-image`, `proxy.ts`), "Data model" reading exactly: "The `public` schema holds no application tables; the first product tables are designed in issue 1 (#143). Supabase's own `auth` schema and its users are untouched. `lib/supabase/database.types.ts` is generated from the live catalog. `supabase/migrations/` holds only the teardown migration; the live migration history retains its prior versions, and the local migration files are not a replayable chain, so any future CLI-driven migration use needs a deliberate reconciliation first. Migrations apply live through the Supabase MCP during build and are mirrored here.", "Environment and commands" (the rows `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `X_CLIENT_ID` and `X_CLIENT_SECRET` (reserved: Supabase's X sign-in, issue 4), `X_BEARER_TOKEN` (reserved: issue 5), `AI_GATEWAY_API_KEY` (reserved: issue 1), `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, `VERCEL_ENV` and `NODE_ENV`; each "read in" pointing at a kept file or the reserving issue; the worker rows, `INGEST_SECRET` and `SUPABASE_DB_URL` gone), "Tooling and configuration" (Biome excludes trimmed), "Coding conventions" (every rule kept; examples naming deleted files reworded to the rule alone or a kept file).
8. `$vercel:nextjs`: `DESIGN.md` Legacy section removed; `design-system/tokens.css` re-exported; `docs/roadmap.md` sections 5 and 12; the five skill files' poller and Railway mentions; `docs/references/state.md` and `decisions.md` completion lines.

## 3. Acceptance journeys

1. Home: open `http://localhost:3000/`. The header shows the mark, "Oparax", the theme toggle, "Log in" and "Sign up"; the hero shows the product sentence, the rebuilding note and a sign-up link; the footer shows "Oparax" and "Monitoring is being rebuilt." Dark by default; the toggle switches to light and back. No drafting claim and no dead control anywhere.
2. Sign-in and sign-out: `/login` with the owner's real account and password; arrival at `/` with "Log out" in the header and no "Sign up" anywhere; reload stays at `/`; `/login`, `/signup` and `/forgot-password` while signed in return to `/`; "Log out" returns to `/` with "Log in" and "Sign up" showing, and a reload keeps it that way.
3. Recovery then anonymous: `/forgot-password` with the owner's email; the link opens `/auth/reset-password`; after the reset the browser is signed out; opening `/` afterwards shows the signed-out header.
4. Preview: `/preview`, enter `@farzanm4` and "AI coding tools" in its form; headings, text, controls and both themes render as before. It is a font and design preview, nothing runs.
5. Link preview: `/opengraph-image` renders the mark, "Monitoring your beat", the description and the domain in Hanken Grotesk (the image's own committed fonts) without clipping.

## 4. Owner does at ship

Walk the journeys on localhost and give the ship word. Nothing in Vercel, Supabase Auth, Railway or the X console is required. Run `/design-sync` (or ask the session to push the bundle, as on September 24) so the Claude Design copy carries the re-exported tokens.

