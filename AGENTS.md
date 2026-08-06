# Oparax

AI news desk for reporters: monitors their beat across X, catches stories as they break, drafts a post in the reporter's voice, and — once trusted — posts autonomously.

## Stack

Next.js App Router + React + TypeScript strict (`@/*` → repo root) · `ai` + `@ai-sdk/react` · Tailwind + stock shadcn + vendored ai-elements · Supabase auth + owner-scoped app tables · Sentry (errors, tracing, logs, session replay) · pnpm + Biome.

- **Versions live in `package.json`** — read it rather than trusting a number here.

## Code map

`ls` gives you structure. These are the facts it cannot.

- **`app/api/ingest` is the delivery interface** — the Bearer-authed entry point every source post enters through. Nothing polls; there is no scan dispatcher.
- **`app/api/slack/interactions`** is `after()`-deferred so Slack's 3s ack deadline is met before the slow X-post work runs.
- **`lib/agent/desk-config.ts` owns `checkXPostable`**, the shared X validity gate called by `lib/x/post-core.ts`'s posting path, the desk's `editDraft`, and `draft-pipeline.ts` before the new drafter's winner persists. Any future writer of a `drafts` winner must call it too, never re-derive it.
- **`lib/agent/feed-query.ts`'s `fetchFeedPage`/`fetchFeedCounts` take a service-role client and never check desk ownership** — every caller (`page.tsx`, `feed-actions.ts`) must prove `owner_id` match first.
- **`lib/x/timeline.ts` is the ONE designated extraction X-read** — 100 most recent ORIGINAL posts, app-only bearer, `exclude=retweets,replies`, because a reply-heavy corpus teaches `measuredFacts` a mention rate that opens every draft with an @handle.
- **Tokens never leave `lib/x/` and `lib/slack/`.**
- **`lib/voice/rules.ts` holds the drafting input of record:** `flattenRulesToPrompt(enabledRules) + measuredFacts` replaces the raw guide in the system prompt; the guide blob survives only as audit provenance. The translator → single-drafter delivery path passes that composition to `draft-write.ts`; it never reads the raw guide directly. `corpus-store.ts` upserts and never prunes. `extraction-run.ts`'s `startRun` is an atomic claim returning a boolean — callers must not spend when it returns false. That bounds one desk to ONE concurrent run; it is **not** rationing and must never grow into it. Progress reaches the browser by POLLING an ownership-proving server action, never Realtime.
- **`lib/notify/` senders neither persist nor meter** — `draft-pipeline.ts` does both. `email.ts` keeps the reply encoder and its decoder in one file so they cannot drift.
- **`lib/sysprompts/voice-extract.md` is measured, not authored.** Never tune it by read-through.
- **Frontend test login: `testuser@oparax.ai` / `hello123`** — a dummy account created solely for agentic testing; when the owner asks to check something in the browser, logging in with it is explicitly pre-authorized, so no credential safeguards apply.
- **Sentry**: the four root files (`instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) must keep those exact names — the build plugin finds them by name. Four deliberate deviations from the wizard, all load-bearing: `tunnelRoute: "/monitoring"` is **excluded from `proxy.ts`'s matcher** (catching it is the documented way to lose every client-side error report); `httpBodies: []` because a body here carries unpublished drafts; `tracesSampleRate` 1 in production with the 1.75s extraction polls dropped in `beforeSendTransaction`; and `@sentry/profiling-node` deliberately absent after it grew a dev server to 6.6 GB RSS. Local AI DevTools is development-only.

## Data

**Columns and types: read `lib/supabase/database.types.ts`**

| Table | What it holds | RLS shape |
| --- | --- | --- |
| `agents` | a desk (the unit a reporter owns) | owner-scoped |
| `voice_guides`, `voice_rules` | the extracted voice, keyed by `agent_id` | EXISTS-join, select-only |
| `stories`, `story_assignments` | clustered stories and their per-desk claim | EXISTS-join, select-only |
| `drafts` | a drafted post + its post-outcome stamps | EXISTS-join (**insert policy too**) |
| `usage_events` | metering for every billable touch point | owner-scoped, select-only |
| `source_posts` | ingested posts | deny-all |
| `model_calls` | one row per model call | owner-scoped, select-only |
| `corpus_posts` | per-desk extracted corpus, including off-beat exclusions | deny-all |
| `beat_conflicts` | historical ground-versus-judge disagreements | EXISTS-join, select-only |
| `x_accounts`, `slack_accounts`, `slack_delivery_receipts` | OAuth tokens, inferred tier, delivery receipts | deny-all |
| `draft_claims`, `unmatched_deliveries` | atomic claim counters | deny-all |
| `voice_extraction_runs` | one extraction run per desk — progress only | deny-all |
| `source_configs` | a desk's onboarded website source (feed/sitemap, path filter, retrieval mode) | deny-all |

### Dormant by design — switched off, not missing

Built, working, and deliberately off so the shipped flow stays small. Each is ONE named constant; flipping it back is the whole reactivation. Don't "fix" these as gaps, and don't rebuild them.

| Capability | Lever | Where |
| --- | --- | --- |
| LinkedIn / Bluesky drafting | `PLATFORMS` (the `Platform` type stays complete) | `lib/agent/desk-config.ts` |
| Story clustering (many posts → one story) | `CLUSTERING_ENABLED` | `lib/agent/cluster.ts` |
| Email draft delivery + reply-to-correct | `EMAIL_DELIVERY_ENABLED` | `lib/agent/draft-pipeline.ts` |
| Auto-post (post without review) | `AUTO_POST_ENABLED` | `app/agents/[id]/setup/sources-card.tsx` |
| Feed filter bar UI | `FEED_FILTERS_UI` | `lib/agent/feed-shared.ts` |
| Council history UI on draft cards | Mount `<CouncilDialog>` in `DraftBox` (currently deferred) | `app/agents/[id]/council-dialog.tsx` |
