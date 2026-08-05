# Oparax

AI news desk for reporters: monitors their beat across X, catches stories as they break, drafts a post in the reporter's voice, and posts autonomously once trusted.

## Stack

Next.js App Router + React + TypeScript strict (`@/*` → repo root) · `ai` + `@ai-sdk/react` · Tailwind + stock shadcn + vendored ai-elements · Supabase auth + owner-scoped app tables · Sentry (errors, tracing, logs, replay) · pnpm + Biome.

- **Versions live in `package.json`** — read it rather than trusting a number here.

## Code map

`ls` gives you structure. These are the facts it cannot.

- **`app/api/ingest` is the delivery interface** — the Bearer-authed entry point every source post enters through. `poller/` is the polling dispatcher (see `poller/README.md`); it POSTs here, same as `ingest/`'s X stream forwarder.
- **`app/api/slack/interactions`** is `after()`-deferred to beat Slack's 3s ack deadline before the slow X-post work runs.
- **`lib/agent/desk-config.ts` owns `checkXPostable`**, the shared X validity gate called by both `lib/x/post-core.ts`'s posting path and the desk's `editDraft`. A third writer of a `drafts` winner must call it too, never re-derive it.
- **`lib/x/timeline.ts` is the ONE designated extraction X-read** — 100 most recent ORIGINAL posts, app-only bearer, `exclude=retweets,replies`: a reply-heavy corpus teaches `measuredFacts` a mention rate that opens every draft with an @handle.
- **Tokens never leave `lib/x/` and `lib/slack/`.**
- **`lib/voice/rules.ts` holds the drafting input of record:** `flattenRulesToPrompt(enabledRules) + measuredFacts` replaces the raw guide in the prompt; the guide survives only as audit provenance. `corpus-store.ts` upserts, never prunes. `extraction-run.ts`'s `startRun` is an atomic claim (boolean) — don't spend on false. Bounds one desk to ONE concurrent run; **not** rationing, must never grow into it. Progress reaches the browser via POLLING an ownership-proving server action, never Realtime.
- **`lib/notify/` senders neither persist nor meter** — `draft-pipeline.ts` does both. `email.ts` keeps the reply encoder and decoder in one file to prevent drift.
- **`lib/sysprompts/voice-extract.md` is measured, not authored.** Never tune it by read-through.
- **Frontend test login: `testuser@oparax.ai` / `hello123`** — a dummy account for agentic testing; logging in with it to check the browser is pre-authorized, no credential safeguards apply.
- **Sentry**: the four root files (`instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) keep those exact names. Four deviations from the wizard: `tunnelRoute: "/monitoring"` is **excluded from `proxy.ts`'s matcher** (else every client-side error report is lost); `httpBodies: []` since a body here carries unpublished drafts; `tracesSampleRate` 1 in prod, 1.75s extraction polls dropped in `beforeSendTransaction`; `@sentry/profiling-node` absent after it grew a dev server to 6.6 GB RSS. Local AI DevTools: development-only.

## Data

**Columns and types: read `lib/supabase/database.types.ts`**

| Table | What it holds | RLS shape |
| --- | --- | --- |
| `agents` | a desk (the unit a reporter owns) | owner-scoped |
| `voice_guides`, `voice_rules` | the extracted voice | EXISTS-join, select-only |
| `stories`, `story_assignments` | clustered stories, per-desk claim | EXISTS-join, select-only |
| `drafts` | a draft + post-outcome stamps | EXISTS-join (**insert policy too**) |
| `usage_events` | metering for every billable touchpoint | owner-scoped, select-only |
| `source_posts`, `model_calls` | ingested posts; one row/call | deny-all |
| `corpus_posts` | per-desk extracted corpus, including off-beat exclusions | deny-all |
| `beat_conflicts` | ground-vs-judge disagreements awaiting resolution | EXISTS-join, select-only |
| `excluded_posts` | every off-beat drafting verdict | EXISTS-join, select-only — read needs the service-role client (joins deny-all `source_posts`) |
| `x_accounts`, `slack_accounts`, `slack_delivery_receipts` | OAuth tokens, inferred tier, receipts | deny-all |
| `draft_claims`, `unmatched_deliveries` | atomic claim counters | deny-all |
| `voice_extraction_runs` | extraction progress only | deny-all |
| `source_configs` | a desk's onboarded website source | deny-all |
| `source_seen_items` | per-source dedup of poller-delivered items | deny-all |

### Dormant by design — switched off, not missing

Built, working, and off so the shipped flow stays small. One named constant each — flip it back to reactivate. Don't treat these as gaps or rebuild them.

| Capability | Lever | Where |
| --- | --- | --- |
| LinkedIn / Bluesky drafting | `PLATFORMS` (the `Platform` type stays complete) | `lib/agent/desk-config.ts` |
| Story clustering (many posts → one story) | `CLUSTERING_ENABLED` | `lib/agent/cluster.ts` |
| Email draft delivery + reply-to-correct | `EMAIL_DELIVERY_ENABLED` | `lib/agent/draft-pipeline.ts` |
| Auto-post (post without review) | `AUTO_POST_ENABLED` | `app/agents/[id]/setup/sources-card.tsx` |
