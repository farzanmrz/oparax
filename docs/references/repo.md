# The repository

This file describes current repository source, updated September 30: its folders, routes, schema mirrors, environment-variable readers and tooling. It is not a fresh remote database, account or deployment verification. It was moved out of `AGENTS.md` on September 28 so that file stays short enough for every review and build tool to read whole; the rules stay there, the description lives here.

## Repository map

```
app/                    Next.js App Router: public pages, auth routes, the onboarding page and generated metadata
  api/                  build, waitlist, activation, contact, cron jobs, Stripe and X webhooks
  auth/                 email-link confirmation and password reset
  login/ signup/ forgot-password/   public auth screens and forms
  onboarding/           authenticated blank setup; background preparation is shown on the handle page
  [handle]/             public feed, story links and owner settings
  checkout/return/      checkout return handling
  local-preview/        development-only feed and story fixtures
  privacy/ terms/       public policy pages
  layout.tsx            root shell: fonts, global CSS, toaster, tooltip provider, Vercel analytics, metadata
  page.tsx              public landing page
  opengraph-image.tsx   the share image, drawn with the fonts in assets/fonts/
  global-error.tsx      last-resort error page
  globals.css           Tailwind v4 tokens and the only handwritten CSS
components/             auth shell, logo, theme toggle, PostHog user context
  landing/              public landing composition, illustrated pipeline, pricing and Contact dialog
  monitor/ settings/    feed, preparation, stories, settings and billing controls
  legal/                the shared privacy and terms page layout
  ui/                   stock Mira shadcn/ui primitives
lib/
  auth/                 sign-up, login, identity, OAuth destinations and password-reset actions
  landing/              landing-page content
  legal/                privacy and terms page text
  observability/        PostHog browser initialization, server error sink and telemetry policy
  onboarding/           the onboarding specification as code: engine.ts, prompts.ts, types.ts
  sources/              SSRF-safe discovery, feed and sitemap parsing, article-text extraction
  supabase/             browser, server and service-role clients, session refresh and generated types
  ai/                   Jev, model costs and runtime validation
  collect/ pipeline/    source polling and judging, grouping and writing
  billing/ alerts/      Stripe state, bot delivery and incoming commands
  contact/ digests/      persisted messages, SMTP retry, GitHub and Product Hunt
  settings/ monitor/    source edits and feed reads
  guards/               admission, leases, ledger and spending controls
  x/                    handle validation and API client
  *.ts                  small shared helpers (fetching, validation, XML, user and utilities)
supabase/migrations/    teardown, monitoring product and signup-first migration mirrors
public/                 static logo assets
assets/fonts/           font files and licenses for the share image
docs/                   roadmap, algorithms, seed, setup, references and discovery records
.claude/                Claude Code skills, scripts, agents, hooks and settings for the feature flow
.agents/                Codex stage entries (feature, amend, build, qc, ship, promote)
.codex/                 Codex hooks and the Codex supabase-runner agent
.github/workflows/      branch-name.yml, the only CI check
.feature/               git-ignored plans and review artifacts for the current slice
scratch/ data/          git-ignored scratch work (visible; never a dot-folder)
proxy.ts                refreshes the Supabase session on non-static requests
instrumentation-client.ts   boots PostHog on every page load
next.config.ts vercel.json biome.json components.json postcss.config.mjs tsconfig.json pnpm-workspace.yaml
```

## Web surface

- `/` (`app/page.tsx`): the public product landing page. It reads auth context and chooses signed-out, setup or owner entry. Contact saves a message and attempts SMTP delivery when configured; current source is not a verified live delivery or production deployment.
- `/login`, `/signup`, `/forgot-password`: public auth screens. Signup offers X, Google and native email/password. Signed-in destinations lead to onboarding when no monitor exists or the owned handle page otherwise; validated return paths may apply. Auth failures stay generic.
- `/auth/confirm`: exchanges OAuth codes or verifies supported email tokens and routes through `signedInDestination`. Recovery links continue to `/auth/reset-password` without spending their token before form submission.
- `/auth/reset-password`: the reset form carries the one-time token until the person submits it.
- `/onboarding`: requires sign-in and redirects existing owners to their monitor. Setup uses a verified X handle when available or a typed handle, plus a blank beat. `/api/build` validates auth, identity and admission, then prepares through `after()`; progress appears on the handle page. There are no preset people or localhost auth bypass.
- `/{handle}` and `/{handle}/{story}`: public monitor feed and validated story links; the owner sees controls. `/{handle}/settings` requires ownership.
- `/checkout/return` and `/api/stripe/*`: checkout return, checkout, portal and signed webhook handling. `/api/x/webhook`, `/api/activation`, `/api/contact`, `/api/waitlist`, `/api/build/retry` and `/api/cron/*` handle delivery, setup and scheduled work.
- `/local-preview` and `/local-preview/{story}`: development-only fixture pages, not production routes.
- `/privacy`, `/terms` (`app/privacy`, `app/terms`, text in `lib/legal/content.ts`): public policy pages Google's OAuth branding review requires; the homepage and footer link them. The privacy text must match what the product actually does, so a change in data handling updates it first.
- `/opengraph-image`: the file-based public image generated by Next.
- `proxy.ts`: refreshes the Supabase session cookie on non-static requests.

## Data model

The generated `lib/supabase/database.types.ts` and local migration mirrors now describe monitoring tables and RPCs, including monitors, sources, items, stories, deliveries, billing events, contact messages, claims and the ledger. Feature 151 adds signup-first admission and identity behavior. Supabase Auth remains separate.

The earlier empty application schema was the post-148 teardown state. This description checks repository source, not a fresh live catalog. Migrations apply through the shared Supabase workflow during build and are mirrored locally; the local teardown plus newer mirrors do not prove the entire historical live migration chain is replayable. Reconcile that history deliberately before a future CLI replay.


## Environment variables

Never commit values. `.env.local` at the repo root holds the app's local values (git-ignored). Names only:

Web app (Vercel):

| Name | Public or secret | Read in | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | `lib/supabase/env.ts`, `lib/supabase/admin.ts` | Supabase project URL for every client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | `lib/supabase/env.ts` | anon key for the RLS-scoped browser and server clients |
| `SUPABASE_SECRET_KEY` | secret | `lib/supabase/admin.ts` | service-role key; bypasses RLS; server only |
| `X_CLIENT_ID`, `X_CLIENT_SECRET` | secret | Supabase provider configuration; secret also in `app/api/x/webhook/route.ts` | X sign-in credentials; webhook challenge/signature validation |
| `X_BEARER_TOKEN` | secret | `lib/x/client.ts`, `lib/guards/guards.ts` | onboarding, watched accounts and balance guards |
| `AI_GATEWAY_API_KEY` | secret | `lib/ai/jev.ts`; model calls use AI SDK Gateway | Jev evaluation and onboarding/downstream model calls |
| `X_BOT_BEARER_TOKEN` | secret | `lib/x/client.ts` | bot API calls |
| `GITHUB_TOKEN`, `PRODUCT_HUNT_TOKEN` | secret | `lib/digests/github.ts`, `lib/digests/product-hunt.ts` | digest reads |
| `STRIPE_SECRET_KEY` | secret | `lib/billing/stripe.ts`, `lib/billing/prices.ts` | server checkout, portal and prices |
| `STRIPE_WEBHOOK_SECRET` | secret | `app/api/stripe/webhook/route.ts` | webhook verification |
| `CRON_SECRET` | secret | `app/api/cron/*/route.ts` | scheduled route authorization |
| `SMTP_USER`, `SMTP_PASSWORD` | secret | `lib/contact/mail.ts` | Contact delivery when configured |
| `PRODUCT_HUNT_API_KEY`, `PRODUCT_HUNT_API_SECRET`, `POSTHOG_PERSONAL_API_KEY` | secret | no current product reader | account setup and operational tooling; see setup.md |
| `STRIPE_PUBLISHABLE_KEY` | public | no current product reader | retained account setup value |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | public | `lib/observability/posthog-client.ts`, `lib/observability/posthog-server.ts` | PostHog project; its absence cleanly disables analytics, replay and error tracking |
| `NEXT_PUBLIC_POSTHOG_HOST` | public | same | PostHog ingestion host; defaults to `https://us.i.posthog.com` |
| `VERCEL_ENV`, `NODE_ENV` | public, injected | `lib/observability/ai-telemetry.ts`, `lib/observability/posthog-client.ts` | environment gates |

Tooling only: `REACTBITS_LICENSE_KEY` is interpolated by the paid registries in `components.json`, not read by product runtime. It stays in git-ignored environment files. Shells do not load those files automatically, and fresh-process verification does not establish an already-running MCP inherited the key.

## Tooling and configuration

- **Biome** (`biome.json`) is the linter and formatter: 2-space indent, double quotes, 100-char lines, semicolons, organized imports. `components/ui/` is excluded as vendored. Every Edit/Write is auto-formatted and safe-fixed by the PostToolUse hooks (`.claude/hooks/biome-write.sh`, `.codex/hooks/biome-write-codex.sh`); unsafe fixes are never applied automatically.
- **shadcn/ui** (`components.json`): Mira style (`radix-mira`), `@/` aliases, lucide icon set; existing registries remain alongside free and licensed React Bits entries; `pnpm dlx shadcn add <component>` drops new primitives into `components/ui/`, which stay stock and are never hand-edited (engineering.md).
- **TypeScript** (`tsconfig.json`): strict, ES2024 target, `@/*` maps to the repo root.
- **Tailwind v4** via `postcss.config.mjs` with `@tailwindcss/postcss` only; tokens live in `app/globals.css`.
- **Fonts and theme**: `app/layout.tsx` loads the runtime font and theme provider; tokens live in `app/globals.css`; `assets/fonts/` holds the share-image fonts and licenses.
- **CI**: `.github/workflows/branch-name.yml` enforces branch names `main`, `beta`, `ft/<digits>`, `bf/<digits>`; a repo ruleset blocks off-convention branches at push time.
- **Agent tooling:** `.claude/` holds the Claude Code skills, scripts, hooks and two agents (the Sonnet `supabase-runner` and the `critic`); `.agents/` holds the Codex stage skills; `.codex/` mirrors the hooks and the runner for Codex (on `gpt-6-luna`). `.claude/launch.json` defines the `oparax-dev` server config that stages must not start. Each stage's behavior lives in its skill file.
- **Global outside council:** `/council` in Claude Code and `$council` in Codex ask a fixed set of outside models, each through its own command-line tool, for independent advice on any question (Astra 6, Gemini Pro, Grok, Kimi, GLM and Muse from Claude Code; Opus, Gemini Pro, Grok, Kimi, GLM and Muse from Codex by default) or, with `critique` as the first word, an independent defect review of supplied material (Sol 6.1, Astra 6, Gemini Pro, Gemini Flash, Grok, Kimi, GLM, Opus, Fable and Sonnet by default, owner, September 29); advice excludes the host's own vendor as before, while critique runs all ten CLI lanes from either host; other models by name, exact overrides allowed; owner-invoked only, never launched automatically; installed at `~/.agents/skills/council` outside the repository. The separate critique skill was folded into it (owner, September 24). Its `scripts/providers.py` holds every outside model id and the Codex and Claude launch commands, and its `scripts/lanes.py` is the lane runner; Claude uses the `opus`, `fable` and `sonnet` aliases for automatic upgrades within each family. Feature/amend critique runs eight reviewers from either host: Gemini Pro, Gemini Flash, Grok, Kimi, GLM, Muse Spark, Opus and Astra. QC runs those eight plus Sol 6.1, for nine reviewers. There is no extra Opus subagent. Automatic QC coordination uses the `sonnet` alias at medium effort; the feature flow's review lanes (`.claude/scripts/review-lanes.py`) and planning partner helper (`.claude/scripts/planning-peer.py`) share the provider definitions, so model ids and launch flags stay centralized. Fable handles discussion and the plain plan in Claude Code; after approval, Fable and Astra independently draft the detail, then jointly adjudicate the fixed critique. An explicit Codex host coordinates the exact models under its actual identity. There are no automatic paired scope or plain-plan calls (owner, September 29 correction); the paired design-review phase was removed with the generic design skills (October 2). The flow calls these scripts directly; the owner-only rule governs only whether an agent may start `/council` on its own.
- **Instruction size and loading:** AGENTS.md keeps the owner-locked named principles and core security gates. Read `docs/references/engineering.md` before product planning, edits, build or review for detailed conventions. Its mandatory loading keeps the always-loaded file within participating clients' limits. Prior full guidance is preserved in `state-history-2026-09-30.md`.
- **Shared project instructions:** Claude Code 2.1.278 loads `AGENTS.md` natively through its default AGENTS fallback when no project `CLAUDE.md` is present; nested instructions such as `docs/discovery/AGENTS.md` apply within their directories. The former `CLAUDE.md` contained only `@AGENTS.md` and was removed. Keep project guidance in `AGENTS.md` instead of recreating a duplicate wrapper.
- **Retired issue:** Issue #131 was retired, not shipped or amended, and survives only as the local tag `archive/ft-131-monitoring-pivot`; start the next feature from `beta`.
