# Oparax

AI news desk: monitors X, catches stories, drafts in a reporter's voice, and posts autonomously once trusted.

## Code map

- **`app/api/ingest` is the delivery interface** — the Bearer-authed entry point every source post enters through. `poller/` and `ingest/`'s X stream forwarder both POST here.
- **Website deliveries keep their `source_config_id`** from poller through ingest: `draft-pipeline.ts` resolves it to one desk, never rematch by hostname, so tracked paths cannot cross-deliver.
- **Website onboarding reserves before spending:** both entry points call `reservePendingSource`; its locked RPC atomically counts `active` and `pending` rows for the five-site cap and duplicate no-bill guarantee.
- **`app/api/slack/interactions`** is `after()`-deferred to meet Slack's 3s ack deadline before slow X-post work.
- **`agents.reporter_tier` is corpus-proven; `resolveDeskTier` is the only desk-tier resolver** — premium when either reporter or posting-account tier is premium — for drafting, feed count, edit, and post gates. **`checkXPostable` owns X validity**; every writer of a `drafts` winner must call it, never re-derive it.
- **`lib/agent/feed-query.ts`'s `fetchFeedPage`/`fetchFeedCounts` and lineage read take a service-role client and never check desk ownership** — every caller (`page.tsx`, `feed-actions.ts`) must prove `owner_id` match first.
- **`lib/x/timeline.ts` is the extraction X-read** — original posts only; its size also feeds `inferAccountTier`, so a smaller corpus can miss premium evidence. Handle validation reads X separately.
- **Tokens never leave `lib/x/` and `lib/slack/`.**
- **`lib/voice/rules.ts` owns the drafting input:** `flattenRulesToPrompt(enabledRules) + measuredFacts`, not the raw guide (audit only), goes through translator → single drafter → `draft-write.ts`. `corpus-store.ts` upserts, never prunes. `extraction-run.ts`'s atomic boolean claim prevents false spend; stale reclaim uses `reclaim_extraction_run` because PostgREST cannot filter a body-written column. It bounds one desk to ONE concurrent run, **not** rationing. Progress polls an ownership-proving server action, never Realtime.
- **`lib/notify/` senders neither persist nor meter** — `draft-pipeline.ts` does both. `email.ts` keeps the reply encoder and its decoder in one file so they cannot drift.
- **`lib/sysprompts/voice-extract.md` is measured, not authored.** Never tune it by read-through.
- **Frontend test login: `testuser@oparax.ai` / `hello123`** — an agentic-test-only dummy account; owner-requested browser login is pre-authorized.
- **Sentry**: keep the four root files (`instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) exactly named for the build plugin. Keep `tunnelRoute: "/monitoring"` outside `proxy.ts`'s matcher, `httpBodies: []`, production `tracesSampleRate: 1` with 1.75s extraction polls dropped in `beforeSendTransaction`, and no `@sentry/profiling-node`; local AI DevTools is development-only.
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
| `x_handle_checks` | deny-all |
| `draft_claims`, `unmatched_deliveries`, `voice_extraction_runs` | deny-all |
| `source_configs`, `source_seen_items` | deny-all |

### Dormant by design — switched off, not missing

Don't fix or rebuild them; each row names its lever or reactivation condition.

| Capability | Lever | Where |
| --- | --- | --- |
| LinkedIn / Bluesky drafting | `PLATFORMS` plus per-platform pipeline drafting | `lib/agent/desk-config.ts` |
| Story clustering (many posts → one story) | `CLUSTERING_ENABLED` | `lib/agent/cluster.ts` |
| Email draft delivery + reply-to-correct | `EMAIL_DELIVERY_ENABLED` | `lib/agent/draft-pipeline.ts` |
| Auto-post (post without review) | `AUTO_POST_ENABLED` | `lib/agent/desk-config.ts` |
| Council history UI on draft cards | Mount `<CouncilDialog>` in `DraftBox` (currently deferred) | `app/agents/[id]/council-dialog.tsx` |
