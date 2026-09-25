# Oparax

This checkout holds only the rebuild's foundation. The earlier drafting product and its application schema were removed in issue #148 before issue 1 is designed.

The owner is a technical AI engineer who is vibe-coding this entire project: he does not know TypeScript, Next.js, or the web-stack machinery underneath it. Every explanation, every surfaced decision, and every skill or doc written for him states things in plain product-and-AI terms first. Never assume he can read a diff, a type signature, or a framework idiom to figure out what something means.

Oparax watches the internet, GitHub and Product Hunt for one person, shows them only what belongs to their beat, and alerts them on X (see [docs/roadmap.md](docs/roadmap.md)).

## The plan

Oparax is being rebuilt as a monitoring-only product: onboarding by X handle and beat sentence with no account, a per-handle page with at most ten recommended sources, a daily GitHub and Product Hunt digest for tool-focused beats, alerts through the Oparax bot on X, sign-up to customize, payment after seven days, X ads for acquisition. The one document for all of it, every feature, algorithm, decision and open question, is [docs/roadmap.md](docs/roadmap.md). Read it before planning anything. The onboarding algorithm is settled (September 19): roadmap section 3 is the plain account, [docs/onboarding-algorithm.md](docs/onboarding-algorithm.md) is the exact specification the build ports (the four steps, prompts verbatim, the checker, the table's row shape, measured costs, and every rejected direction with its reason), and [docs/source-table-seed.json](docs/source-table-seed.json) is the 76-row seed of the shared source table. Every experiment script, run folder and lab page was deleted once that was written. Every cost figure (unit prices with their sources, what was measured, the arithmetic per person for watched X posts, bot alerts, judging, onboarding) lives in [docs/references/cogs.md](docs/references/cogs.md); take numbers from there, change them there first, and never restate a cost from memory. Where things stand right now, what is agreed but not yet applied, the open rulings and the owner's standing confusions are in [docs/references/state.md](docs/references/state.md): read it first in a new session. Every locked and rejected decision, one line each with its reason and evidence, lives in [docs/references/decisions.md](docs/references/decisions.md); when a question that file answers comes up again, quote its line instead of re-arguing it, and add a line there whenever the owner rules or rejects something. In the roadmap and in the issue briefs only lines that carry an owner attribution with a date are the owner's word; everything else is an assistant's design to be confirmed with him (an audit on September 19 found designs presented as his decisions). No experiment or paid discovery run is pending or authorized. Each slice of the build order is a GitHub issue whose body is its brief: `/feature <issue#>` starts from that brief with nothing restated by the owner.

## How work moves

Work moves through owner-triggered commands, each defined only by its skill file: `/feature` (Claude Code; `/feature <issue#>` starts from an existing issue's brief) talks the idea through, writes the plain plan the owner approves and the detailed plan the agents read, runs the critique, and creates the GitHub issue and the `ft/<issue#>` branch cut from `beta`; `$build <N>` (Codex, or `/build <N>` in Claude Code) builds from the detailed plan; `/qc <N>` reviews; `/amend <N>` adds scope to an in-flight issue and loops back into build; `/ship <N>` (or `$ship <N>`) squashes the branch onto `beta` and closes the issue after the owner has walked the result on localhost. Stage handoffs are defined by their skills: `/feature` launches the selected Codex build after final owner approval unless the owner requests a manual or later launch; `/qc` launches the fix build whenever it queues fixes; every launched build runs on Astra High (owner, September 24; no model question at either launch); other stages end by naming the next command. Feature and amend share independent Fable + Astra planning and mutual review, with amend scoped to an addition on its existing issue and branch. Uncommitted files under `.claude/` or `.codex/` (tool configuration written mid-flow) never block a stage: the stage that meets them commits and pushes them on the current branch as a `meta:` commit. The issue carries only what the owner reads (the plain plan and one `## Amendment R` section per approved amendment, plus a QC marker per round); everything the agents read lives in git-ignored `.feature/` files on this machine and is wiped at finalize. Bug fixes run the same commands on `bf/<issue#>` (the start script takes `--prefix bf`), starting from the exact repro, whose re-proof is the acceptance journey; a trivial owner-reported fix may skip critique at the owner's word. Meta and docs changes (skills, process, this file, documentation) go directly on `beta` at the owner's direction. `beta` reaches `main` (production) only through the weekly pull request `/promote` (or `$promote`) opens on the owner's word, reviewed by the owner's mentor; ship never pushes `main`, and no stage ever deletes a branch.

- **Review lanes:** Feature and amend critique and QC use [the fixed review profiles](.claude/skills/feature/references/review-lanes.md) through `.claude/scripts/review-lanes.py`, which calls the global critique skill's runner. They never duplicate provider commands. Invoking the stage authorizes its review step; the standalone `/critique` and `$critique` commands remain user-invoked only.
- **Visual contract:** `DESIGN.md` is the whole design contract (owner, September 23): stock shadcn from preset `bzq0WEyKe` (Mira, Zinc, Blue), dark by default with a light switch, Hanken Grotesk for text and JetBrains Mono for handles and counts, hugeicons kept, the reasons beside each choice. The repo is the source of truth and Claude Design holds a synced copy (`/design-sync`, run by the owner) that he designs screens in; the export is the plan's visual contract, from the design brief `/feature` step 1.1 writes. Every UI skill has three jobs: it shapes the plan, guides the build and checks the result.
- **Frontend test login:** No dedicated test account is currently configured. The previous dummy mailbox was removed; this does not establish that its old Supabase user record was deleted. Owner-requested browser login remains pre-authorized; do not assume a replacement test identity exists.
- **Stage execution:** No stage runs the product app: not `/feature`, `/amend`, `$build`, `/qc`, `/ship`, nor their subagents or external lanes. Never start or attach to the product dev server, run `pnpm dev`, or investigate the product at runtime. One bounded exception (owner, September 23): `/qc` step 4a may start the app off-screen on a free port for a screenshot pass of the slice's pages with `agent-browser`, no clicking, no sign-in, no paid calls, then stop it; the QC session reviews the images with `design-review` and `accessibility`. Browser use is otherwise prohibited inside stages, with one more exception: `/feature` and `/amend` discussion and design review may research public references and inspect standalone design previews as its skill defines. The host chooses its normal research tools and passes detailed observations and available artifacts to the peer; reference research does not require browser use or screenshots, while review of a generated design receives its actual images as the skill defines. The CLI peer keeps its read-only sandbox. Never attach to a personal browser profile. This research exception does not apply to plan critique, adjudication, QC, build or ship. Every stage grounds implementation in the repo's source; third-party packages are read only for public types and shipped docs, never built or minified internals. A product runtime question becomes a named build-time check and an acceptance journey the owner walks. Inside the flow, only the owner runs the product app.
- **The owner's direct word overrides the rule above, immediately.** That rule binds a stage while it executes its command; it is not a repository-wide ban on agents. When the owner, in their own words in the chat (not as the argument of `/feature`, `/amend`, `$build`, `/qc`, or `/ship`), asks the agent to start the app, open a browser, cold-test a page, or look at something running, that instruction wins on the spot: in the same session, after or between commands, with no rule change and no new session, whether or not that session ran a stage earlier. The refusal on 2026-08-18 ("the repository instruction forbids it even when you ask") was a misreading of this file; do not repeat it. The owner's existing browser-login authorizations still stand.
- **The proof bar, everywhere:** does it build, does it boot, can the owner and a user access and experience the functionality? That is the ship bar. The owner and real users are the deep test; no comprehensive suites, benchmarks, multi-case harnesses, or deployment checks, ever, unless the owner explicitly orders one. Pushing the branch is the end of the job.
- **Supabase deployment convention:** there is exactly one shared Supabase project; migrations apply to it during build through the normal workflow. A migration that retires a live signature (dropping an old RPC, tightening a column) opens an accepted transient window until the slice ships; that window is the owner's standing decision, so never block a build to ask for a preview branch, a deployment window, or migration-timing authorization.
- **Customer-discovery context** (the people ledger, per-person findings, aggregate outreach results) and the experiment design live in `docs/discovery/` (`findings.md`, `reshad.md`, `people.tsv`, `exp1.md`) in this repo, published here at the owner's explicit decision. The `$yc` cofounder skill remains in the private `admin` repo at `~/Desktop/repos/admin`.
- **Vocabulary:** "feature flow" means this whole owner-triggered stage chain, every stage defined only by its skill file (a prompt hook in both harnesses repeats this definition, with the current stage names read from `.agents/skills`, whenever the phrase appears). When the owner says "onboarder" or "extractor," that means every top-tier compiler stage, not one file. "Desk" and "agent" are retired terms for the same thing: one monitor.

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
app/                    Next.js App Router: public pages, auth routes and generated metadata
  auth/                 email-link confirmation and password reset
  login/ signup/ forgot-password/   public auth screens and forms
  preview/              static design preview
  layout.tsx            root shell: fonts, global CSS, toaster, tooltip provider, Vercel analytics, metadata
  page.tsx              public landing page
  globals.css           Tailwind v4 tokens and the only handwritten CSS
components/             landing, auth and shared product pieces
  ui/                   retained shadcn/ui primitives
lib/
  auth/                 login, sign-up and password-reset actions
  landing/              landing-page content
  observability/        PostHog browser initialization, server error sink and telemetry policy
  sources/              SSRF-safe discovery, feed and sitemap parsing, article-text extraction
  supabase/             browser, server and service-role clients, session refresh and generated types
  x/                    handle validation
  *.ts                  small shared helpers (fetching, validation, XML, user and utilities)
supabase/migrations/    the teardown migration mirrored after its live MCP application
public/                 static logo assets
design-system/          the Claude Design sync bundle and preview cards
docs/                   roadmap, algorithms, seed, setup, references and discovery records
.claude/                Claude Code skills, scripts, agents, hooks and settings for the feature flow
.agents/                Codex stage entries
.codex/                 Codex hooks and the Codex supabase-runner agent
.github/workflows/      branch-name.yml, the only CI check
.feature/               git-ignored plans and review artifacts for the current slice
proxy.ts                refreshes the Supabase session on non-static requests
instrumentation-client.ts   boots PostHog on every page load
next.config.ts vercel.json biome.json components.json postcss.config.mjs tsconfig.json pnpm-workspace.yaml
```

## Web surface

- `/` (`app/page.tsx`): public landing page. It checks the session so the header can show the right signed-in state.
- `/login`, `/signup`, `/forgot-password`: public auth screens and server actions. A signed-in visitor returns to `/`; login failures stay generic so they never reveal whether an email exists.
- `/auth/confirm`: the target of Supabase email links. Signup confirmation verifies the token, signs the visitor out and redirects to `/login`; recovery links continue to `/auth/reset-password` without spending their one-time token.
- `/auth/reset-password`: the reset form carries the one-time token until the person submits it.
- `/preview`: static font and design preview only.
- `/opengraph-image`: the file-based public image generated by Next.
- `proxy.ts`: refreshes the Supabase session cookie on non-static requests.

## Data model

The `public` schema holds no application tables; the first product tables are designed in issue 1 (#143). Supabase's own `auth` schema and its users are untouched. `lib/supabase/database.types.ts` is generated from the live catalog. `supabase/migrations/` holds only the teardown migration; the live migration history retains its prior versions, and the local migration files are not a replayable chain, so any future CLI-driven migration use needs a deliberate reconciliation first. Migrations apply live through the Supabase MCP during build and are mirrored here.

## Environment and commands

App scripts (`package.json`): `pnpm dev` runs the app on localhost:3000 (owner only inside the flow), `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm lint:write`, `pnpm format` (Biome); `tsc --noEmit` typechecks. pnpm is the only allowed package manager (`preinstall` fails under npm or yarn); `pnpm-workspace.yaml` pins transitive versions for security advisories because pnpm 10 ignores `pnpm.overrides`. The flow's own scripts are documented in the skills that call them.

Never commit values. `.env.local` at the repo root holds the app's local values (git-ignored). Names only:

Web app (Vercel):

| Name | Public or secret | Read in | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | `lib/supabase/env.ts`, `lib/supabase/admin.ts` | Supabase project URL for every client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | `lib/supabase/env.ts` | anon key for the RLS-scoped browser and server clients |
| `SUPABASE_SECRET_KEY` | secret | `lib/supabase/admin.ts` | service-role key; bypasses RLS; server only |
| `X_CLIENT_ID`, `X_CLIENT_SECRET` | secret | issue 4 | reserved for Supabase X sign-in |
| `X_BEARER_TOKEN` | secret | issue 5 | reserved for watched X accounts |
| `AI_GATEWAY_API_KEY` | secret | issue 1 | reserved for the onboarding model calls |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | public | `lib/observability/posthog-client.ts`, `lib/observability/posthog-server.ts` | PostHog project; its absence cleanly disables analytics, replay and error tracking |
| `NEXT_PUBLIC_POSTHOG_HOST` | public | same | PostHog ingestion host; defaults to `https://us.i.posthog.com` |
| `VERCEL_ENV`, `NODE_ENV` | public, injected | `lib/observability/ai-telemetry.ts`, `lib/observability/posthog-client.ts` | environment gates |

## Tooling and configuration

- **Biome** (`biome.json`) is the linter and formatter: 2-space indent, double quotes, 100-char lines, semicolons, organized imports. `components/ui/` is excluded as vendored. Every Edit/Write is auto-formatted and safe-fixed by the PostToolUse hooks (`.claude/hooks/biome-write.sh`, `.codex/hooks/biome-write-codex.sh`); unsafe fixes are never applied automatically.
- **shadcn/ui** (`components.json`): `@/` aliases, hugeicons icon set; `pnpm dlx shadcn add <component>` drops new primitives into `components/ui/`.
- **TypeScript** (`tsconfig.json`): strict, ES2024 target, `@/*` maps to the repo root.
- **Tailwind v4** via `postcss.config.mjs` with `@tailwindcss/postcss` only; tokens live in `app/globals.css`.
- **Fonts**: loaded once in `app/layout.tsx` through `next/font/google` (Nunito Sans for headings, Source Sans 3 for text, JetBrains Mono for handles and counts; DESIGN.md), self-hosted by Next at build.
- **CI**: `.github/workflows/branch-name.yml` enforces branch names `main`, `beta`, `ft/<digits>`, `bf/<digits>`; a repo ruleset blocks off-convention branches at push time.
- **Agent tooling:** `.claude/` holds the Claude Code skills, scripts, hooks and the Sonnet `supabase-runner` agent; `.agents/` holds the host-shared skills; `.codex/` mirrors the hooks and the runner for Codex. `.claude/launch.json` defines the `oparax-dev` server config that stages must not start. Each stage's behavior lives in its skill file.
- **Global external critique:** `/critique` in Claude Code and `$critique` in Codex request independent reviews of any supplied prompt, plan, decision, writing or code. The shared instructions and reusable runner live in [the global critique skill](/Users/farzanm4/.agents/skills/critique/SKILL.md); [the Claude entry point](/Users/farzanm4/.claude/skills/critique/SKILL.md) loads that same source. Read it when the owner explicitly invokes the command instead of writing a throwaway lane script. That skill defines its five default models and efforts, accepts selected lanes and exact model/effort overrides, and returns critiques without applying them. It is user-invoked only, never launched automatically. Feature/amend critique and QC retain the review steps defined by their project skills; they do not automatically invoke this global command. These global files are installed on this machine, outside the repository.
- **Shared project instructions:** Claude Code 2.1.278 loads this `AGENTS.md` natively through its default AGENTS fallback when no project `CLAUDE.md` is present; nested instructions such as `docs/AGENTS.md` apply within their directories. The former `CLAUDE.md` contained only `@AGENTS.md` and was removed. Keep project guidance here instead of recreating a duplicate wrapper.
- **Records:** `docs/roadmap.md` is the plan; `docs/onboarding-algorithm.md` and `docs/downstream-algorithm.md` are the two algorithm specifications; `docs/references/` holds cogs.md (costs), decisions.md (the ledger), state.md (the handoff) and the two September 21 lab reports; `docs/setup.md` is every external account and key in one file; `docs/discovery/` holds the customer evidence and `exp1.md`. Nothing else lives under `docs/`. Issue #131 was retired, not shipped or amended, and survives only as the local tag `archive/ft-131-monitoring-pivot`; start the next feature from `beta`.

## Coding conventions

Observed across the codebase; new code follows them without being asked.

- **Ownership first.** Every server action and route handler that touches per-user data proves ownership with the RLS-scoped client before doing anything, then may use the admin client for deny-all tables. Caller-supplied ids are never trusted raw.
- **Trust logic lives outside `"use server"` files.** Every export of a server-action file is a callable endpoint, so sensitive code lives in separate server-only modules those actions call.
- **Result shapes.** Mutations return `{ ok: true }` or `{ ok: false, error }` so client components show one inline error path. Business failures are values, not throws.
- **Background work uses `after()`.** Billable or slow work starts with Next's `after()` so the response returns fast.
- **Server-side re-validation.** Anything the client already checked is checked again on the server.
- **Server components by default.** A component is a client component only where an interaction needs it, and it receives the smallest props that interaction requires. No new component is added under `components/ui` for a single surface; existing primitives are composed with className overrides.
- **Styling is Tailwind v4 utilities on the tokens in `app/globals.css`.** No CSS modules, no new stylesheets, no inline style objects for anything a utility can express; one-off values use arbitrary-value utilities (`text-[60px]`, `grid-cols-[420px_minmax(0,1fr)]`). Responsive gates use `desk:` (700px), never `md:`. Radius, font roles and color meanings are fixed by `DESIGN.md`.
- **Fixed copy lives in one module per surface.** A marketing or demo surface keeps every displayed string, example value and count in one typed content module; components import from it and never carry string literals of their own. Illustrative counts are fixed text, never computed from product logic at runtime.
- **Depicted product UI is a picture.** When a page shows product controls as illustration, they are real primitives rendered non-interactive with their native `disabled` contracts (inputs, buttons, switch), with the primitives' disabled dimming overridden locally so they keep the approved full-contrast look; tab rows are presentational markup, not focusable widgets. Such surfaces import nothing from stateful product components; the narrative stays accessible (no blanket `aria-hidden` or `inert`).
- **Generated images carry their own assets.** Anything rendered on the server into an image (the file-based `opengraph-image` convention, any future generated graphic) reads fonts and marks from files committed in the repo (`assets/fonts/` with the license file beside them) in the Node runtime, with explicit renderer-compatible colors. Nothing is fetched from a third party at request time.
- **Brand marks are committed path data with provenance.** Third-party logos are stored as SVG path data in a typed module with each mark's source URL and license recorded beside it (simple-icons' individual SVG files for the marks it carries; the platform's official brand kit where it does not, as with LinkedIn). No runtime icon dependency, no hand-drawn approximations, no letter-glyph stand-ins; a mark without a verified source is reported as a gap.
- **Analytics: one named event per user intent.** PostHog is initialized once site-wide (`instrumentation-client.ts`) with automatic pageviews, autocapture and session replay; nothing re-initializes it. Each meaningful action gets one clearly named `snake_case` past-tense event with a fixed vocabulary of property values recorded in the plan. Demo compositions carry `ph-no-autocapture` so pictured controls never produce events. Capture never blocks or delays navigation, and capture failures are contained. Auth-page URLs are reduced to origin and path before any capture.
- **Metadata.** `app/layout.tsx` owns `metadataBase`, the default title and description, and the default `openGraph` and `twitter` blocks. A page exports its own metadata only where it genuinely differs (the homepage owns its Open Graph URL and image); preview images use the file-based convention beside the route.
- **Security posture.** Every prompt marks untrusted text as data; every outbound fetch of a user-supplied URL goes through the SSRF-hardened fetcher; return paths and handles are validated by their single source-of-truth modules; auth error copy never reveals whether an email exists; PostHog replay records product text unmasked by owner decision, passwords masked.
