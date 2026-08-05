# oparax-poller

The Railway worker for Oparax's website-source ingestion path (issue #101). Every
`POLLER_TICK_INTERVAL_MS` (default 45s) it reads every `active` row in `source_configs` (the
desks' onboarded website sources from #100), checks that source's sitemap or RSS feed via
conditional GET, finds items it has never delivered before, fetches each new item's body via
the adaptive retrieval chain (#105 — see `fetch-body.ts` below), and POSTs a `"website"`-shaped
delivery to the app's
`POST /api/ingest`. No model call anywhere in this worker — deliberately dumb, per the issue's
decision of record.

## Isolation

Standalone Node/TypeScript package under `poller/**`, same shape as the sibling `ingest/`
package:

- Own `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `biome.jsonc`, `pnpm-workspace.yaml`.
  Not listed under the root repo's `pnpm-workspace.yaml` (no `packages:` globs there), so this
  package's install/build never touches the app's.
- **Zero imports from the app's `lib/`.** The sitemap/feed parsing and SSRF-safety checks
  #100 built in `lib/sources/*` are duplicated here in trimmed form rather than imported —
  those modules use the Next.js `@/*` path alias (doesn't resolve outside the app's
  `tsconfig.json`) and `ingest/`'s own README already establishes the "isolated package, zero
  app `lib/` imports" convention this worker follows.
- Runs via `tsx` (both `dev` and `start`), so `tsx` is an ordinary `dependency`, not a
  `devDependency` — Railway's install must include it at runtime.

## Architecture (`src/`)

- `env.ts` — validates required env vars at startup; missing/blank is fatal
  (`process.exit(1)`), same posture as `ingest/src/env.ts`.
- `logger.ts` / `errors.ts` / `backoff.ts` / `slack.ts` — copied verbatim from `ingest/src/`
  (structured JSON logging, catch-value serialization, half-jitter exponential backoff, raw
  Slack webhook POST).
- `discovery-safety.ts` — `isPrivateHostname` / `isSafeDiscoveredUrl`, duplicated from #100's
  `lib/sources/discovery.ts`. Every URL pulled out of a sitemap/feed is untrusted third-party
  content and gets checked before being fetched.
- `sitemap.ts` / `feed.ts` — trimmed re-implementations of #100's sitemap/feed parsing,
  returning only `{ url, itemKey, title, publishedAt, bodyFromFeed }` per item, with
  conditional-GET support (ETag + Last-Modified) so an unchanged feed short-circuits on a
  `304` without re-parsing.
- `fetch-body.ts` — `fetchArticleBody` is adaptive by default (#105): direct fetch first, then
  Bright Data Web Unlocker if that fails or comes back suspiciously short and
  `BRIGHTDATA_API_KEY`/`BRIGHTDATA_ZONE` are set, then a feed/sitemap-derived teaser as the
  last resort. `source_configs.retrieval` is now an optional operator override (`"feed"` /
  `"none"` / `"unlocker"`) that skips straight to that tier — null (the default) runs the
  adaptive chain.
- `db.ts` — the poller's own service-role Supabase client; reads `active` `source_configs`
  rows, calls the `record_seen_item` RPC (atomic check-and-mark dedup).
- `deliver.ts` / `types.ts` — `postDelivery` (adapted from `ingest/src/deliver.ts`'s
  200/401/422/500 handling) and `buildExternalId` (`sha256(canonicalUrl + "\n" +
  (publishedAt ?? ""))`, matching `/api/ingest`'s own schema comment — reused as both the
  delivery's `external_id` and the seen-items dedup key).
- `tick.ts` — `pollAllSources`, the per-tick orchestration: per-source try/catch (one feed
  erroring never stalls another), prefilter, a one-time "priming" pass on a source's first
  ever tick (seeds `source_seen_items` without delivering, so a freshly-onboarded source with
  ~100 sampled URLs doesn't fire a delivery storm), steady-state new-item delivery capped at
  `POLLER_MAX_NEW_ITEMS_PER_TICK`, and a staleness alarm when a source stops matching.
- `alarm.ts` — the staleness alarm (above) and `checkDeliveryCap`, mirroring `ingest/`'s own
  80%-of-observed-cap alarm: a rolling 24h count of website articles ingested (across every
  desk), Slack-alarmed once it crosses 80% of `POLLER_OBSERVED_DAILY_CAP` — a safety net for a
  runaway (broken dedup, an unstable item identity), not a hard stop.
- `index.ts` — wires it together: loads env, runs an initial tick, then `setInterval` on
  `POLLER_TICK_INTERVAL_MS` (guarded so ticks never overlap) plus a separate, much slower
  `setInterval` on `POLLER_CAP_CHECK_INTERVAL_MS` for the delivery-cap check. Handles
  `SIGTERM`/`SIGINT` for clean shutdown on redeploy.

## Fatal-exit boundary

The worker exits (non-zero) on exactly two fatal states — everything else is caught per-source
and logged:

1. **Bad env** (`env.ts`) — a required var missing/blank at startup.
2. **401 from `/api/ingest`** (`deliver.ts`'s `FatalIngestError`) — a wrong `INGEST_SECRET` is
   a config problem with no ambiguity.

On any fatal exit, `process.exit(1)` — Railway's `restartPolicyType=ALWAYS` is the outer net.

## Env vars

Read from `process.env`; never hardcoded, never committed (`.env.example` documents names
only). Set them in Railway's variable UI/CLI, never in `railway.json`.

| Var | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Same Supabase project as the app; a worker-local name. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service-role key for the same project. |
| `INGEST_URL` | yes | The app's `/api/ingest` URL. |
| `INGEST_SECRET` | yes | Must be byte-identical to the app's `INGEST_SECRET` (Vercel) and to `ingest/`'s own copy of the same value. |
| `SLACK_WEBHOOK_URL` | yes | Staleness alarm + the delivery-cap alarm. |
| `OPARAX_POLLER_USER_AGENT` | yes | e.g. `OparaxBot/0.1 (+https://oparax.ai/bot)` — a real, honest UA + contact URL, never a browser string. No default: a fabricated contact URL is worse than a required var. |
| `BRIGHTDATA_API_KEY` | no | The adaptive chain's real Tier 2 fallback — used automatically whenever a direct fetch fails or looks blocked, for every source, not just ones with an explicit `retrieval` override. Unset means Tier 2 is skipped and a failed direct fetch falls straight to the teaser. |
| `BRIGHTDATA_ZONE` | no | The Bright Data Web Unlocker zone name to request through. Required alongside `BRIGHTDATA_API_KEY` for Tier 2 to actually run. |
| `POLLER_TICK_INTERVAL_MS` | no (default `45000`) | 30-60s window per the issue's amendment. |
| `POLLER_STALE_THRESHOLD_MS` | no (default `432000000` = 5 days) | No new matches for this long alarms Slack. |
| `POLLER_ALARM_COOLDOWN_MS` | no (default `3600000` = 1h) | Debounce for the staleness alarm. |
| `POLLER_MAX_NEW_ITEMS_PER_TICK` | no (default `20`) | Caps deliveries per source per tick; excess items are retried next tick. |
| `POLLER_OBSERVED_DAILY_CAP` | no (default `300`) | Operator-tuned delivery-volume threshold (across every desk); the alarm fires at 80% of this over a rolling 24h window. |
| `POLLER_CAP_CHECK_INTERVAL_MS` | no (default `300000` = 5 min) | How often the delivery-cap check runs — deliberately much slower than the tick loop. |

## Deploy checklist (operator)

1. Railway → the existing "Oparax" workspace → New Service → point
   `source.rootDirectory` at `/poller` — `poller/railway.json` then applies automatically:
   `builder: RAILPACK`, `startCommand: pnpm start`, `restartPolicyType: ALWAYS`.
2. Set `numReplicas = 1` (this worker's `source_seen_items` writes assume a single instance;
   two replicas would double-process every tick), single production environment, no
   `healthcheckPath` (no HTTP surface).
3. Set the env vars above in Railway. `INGEST_SECRET` must match `ingest/`'s copy exactly.
4. Deploy, then verify: `railway logs` should show periodic tick lines with source counts and
   no `fatal` entries. Confirm a real onboarded source's next tick reaches `/api/ingest` (a
   delivery log line + the corresponding `source_posts` row via the app's own observability).

## Local development

```bash
cd poller
cp .env.example .env.local   # fill in real values, never commit
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run dev                 # tsx watch
```

`pnpm run dev`/`pnpm start` do not auto-load `.env.local`; export the vars into the shell or
use `env $(cat .env.local | xargs) pnpm run dev` locally.
