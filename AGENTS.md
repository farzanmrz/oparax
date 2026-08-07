# Oparax

AI news desk for reporters: monitors their beat across X, catches stories as they break, drafts a post in the reporter's voice, and posts autonomously once trusted.

## Code map

- **`app/api/ingest` is the delivery interface** — the Bearer-authed entry point every source post enters through. `poller/` (`poller/README.md`, an isolated Railway worker mirroring `ingest/`'s shape) and `ingest/`'s X stream forwarder both POST here.
- **Website deliveries keep their `source_config_id`** from poller through ingest: `draft-pipeline.ts` resolves it to exactly one desk, never rematch by hostname, so one publisher's tracked paths cannot cross-deliver.
- **Website onboarding reserves before it spends:** both entry points call `reservePendingSource`; its locked RPC counts `active` and `pending` rows, making the five-site cap and duplicate no-bill guarantee atomic.
- **`app/api/slack/interactions`** is `after()`-deferred so Slack's 3s ack deadline is met before the slow X-post work runs.
- **`lib/agent/desk-config.ts` owns `checkXPostable`**, the shared X validity gate called by `lib/x/post-core.ts`, `draft-pipeline.ts`, and `app/agents/[id]/actions.ts`'s `editDraft` before a winner persists. Any future writer of a `drafts` winner must call it too, never re-derive it.
- **`lib/agent/feed-query.ts`'s `fetchFeedPage`/`fetchFeedCounts` and lineage read take a service-role client and never check desk ownership** — every caller (`page.tsx`, `feed-actions.ts`) must prove `owner_id` match first.
- **`lib/x/timeline.ts` is the ONE designated extraction X-read** — the 50 most recent ORIGINAL posts (`MAX_POSTS`), app-only bearer, `exclude=retweets,replies`, because a reply-heavy corpus teaches `measuredFacts` a mention rate that opens every draft with an @handle. The corpus size also feeds `inferAccountTier`: a smaller corpus is likelier to miss the one >280-char post that proves premium.
- **Tokens never leave `lib/x/` and `lib/slack/`.**
- **`lib/voice/rules.ts` holds the drafting input of record:** `flattenRulesToPrompt(enabledRules) + measuredFacts` replaces the raw guide in the system prompt; the guide blob survives only as audit provenance. The translator → single-drafter delivery path passes that composition to `draft-write.ts`; it never reads the raw guide directly. `corpus-store.ts` upserts and never prunes. `extraction-run.ts`'s `startRun` is an atomic claim returning a boolean (stale-run reclaim goes through the `reclaim_extraction_run` RPC — PostgREST cannot express filter-on-a-column-the-body-writes) — callers must not spend when it returns false. That bounds one desk to ONE concurrent run; it is **not** rationing and must never grow into it. Progress reaches the browser by POLLING an ownership-proving server action, never Realtime.
- **`lib/notify/` senders neither persist nor meter** — `draft-pipeline.ts` does both. `email.ts` keeps the reply encoder and its decoder in one file so they cannot drift.
- **`lib/sysprompts/voice-extract.md` is measured, not authored.** Never tune it by read-through.
- **Frontend test login: `testuser@oparax.ai` / `hello123`** — a dummy account created solely for agentic testing; when the owner asks to check something in the browser, logging in with it is explicitly pre-authorized, so no credential safeguards apply.
- **Sentry**: keep the four root files (`instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) exactly named: the build plugin detects them. Load-bearing settings: exclude `tunnelRoute: "/monitoring"` from `proxy.ts`'s matcher; `httpBodies: []` protects unpublished drafts; production `tracesSampleRate` is 1 with 1.75s extraction polls dropped in `beforeSendTransaction`; omit `@sentry/profiling-node` to prevent dev-server memory bloat. Local AI DevTools is development-only.
- **UI:** `DESIGN.md` is the visual contract; page and card headers use Title Case.

## Data

**Columns and types: read `lib/supabase/database.types.ts`**

| Table | RLS shape |
| --- | --- |
| `agents` | owner-scoped |
| `voice_guides`, `voice_rules` | EXISTS-join, select-only |
| `stories`, `story_assignments` | EXISTS-join, select-only |
| `drafts` | EXISTS-join (**insert policy too**) |
| `usage_events` | owner-scoped, select-only |
| `source_posts`, `corpus_posts` | deny-all |
| `model_calls` | owner-scoped, select-only |
| `beat_conflicts`, `excluded_posts` | EXISTS-join, select-only |
| `x_accounts`, `slack_accounts`, `slack_delivery_receipts` | deny-all |
| `draft_claims`, `unmatched_deliveries`, `voice_extraction_runs` | deny-all |
| `source_configs`, `source_seen_items` | deny-all |

### Dormant by design — switched off, not missing

Built, working, and deliberately off so the shipped flow stays small. Each row names its lever or reactivation condition. Don't "fix" these as gaps or rebuild them.

| Capability | Lever | Where |
| --- | --- | --- |
| LinkedIn / Bluesky drafting | `PLATFORMS` plus per-platform pipeline drafting | `lib/agent/desk-config.ts` |
| Story clustering (many posts → one story) | `CLUSTERING_ENABLED` | `lib/agent/cluster.ts` |
| Email draft delivery + reply-to-correct | `EMAIL_DELIVERY_ENABLED` | `lib/agent/draft-pipeline.ts` |
| Auto-post (post without review) | `AUTO_POST_ENABLED` | `lib/agent/desk-config.ts` |
| Council history UI on draft cards | Mount `<CouncilDialog>` in `DraftBox` (currently deferred) | `app/agents/[id]/council-dialog.tsx` |
