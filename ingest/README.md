# oparax-ingest

The always-on Railway forwarder for Oparax's ingestion path (slice 3, issue #68). It holds
ONE persistent connection to the X filtered stream (`GET /2/tweets/search/stream`) and
POSTs each matching tweet to the app's `POST /api/ingest`. This package is CODE ONLY — no
deployment, project creation, secret-setting, or live X connection has been done as part of
building it. Everything below is a checklist for the human operator.

## Isolation

This is a standalone Node/TypeScript package under `ingest/**`:

- Its own `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `biome.jsonc`,
  `pnpm-workspace.yaml`. Not listed under the root repo's `pnpm-workspace.yaml` (which has
  no `packages:` globs at all, so `ingest/` was never implicitly included) — deploying or
  developing this package never touches the app's install or build.
- **Zero imports from the app's `lib/`.** The one deliberate exception is `src/rules.ts`'s
  own inline `@supabase/supabase-js` client — it shares only CONFIG with the app (the same
  Supabase project URL + a service-role key, read from this package's own env vars), never
  code, never the app's generated `lib/supabase/database.types.ts`. It is read-only: rule
  sync selects `experiments.tracked_handles`, the cap alarm selects a count from
  `usage_events`. This worker never writes to Supabase — metering (`usage_events` inserts)
  happens app-side in `processDelivery`, per the plan.
- Runs via `tsx` (both `dev` and `start`) rather than a `tsc` build step, so `tsx` and its
  `esbuild` dependency are ordinary `dependencies`, not `devDependencies` — Railway's
  install must include them at runtime. `typescript` stays a `devDependency`; it's used only
  by `pnpm run typecheck`.

## Architecture (`src/`)

- `env.ts` — validates all required env vars at startup; missing/blank is a **fatal state**
  (see below) and exits immediately (`process.exit(1)`).
- `rules.ts` — the inline Supabase client; `fetchTrackedHandles` (all `experiments`, deduped
  case-insensitively, mirroring `lib/agent/draft-pipeline.ts`'s own author-routing shape);
  `buildRuleGroups` (chunks into ≤5 rules × ≤40 handles, **drops and logs** any overflow —
  never silently truncates); `syncRules` (rebuilds the X stream rules from scratch every
  call — deletes every rule this worker owns, tagged `oparax-group-*`, then re-adds the
  freshly built groups; "rebuilt", not diffed, per the plan text).
- `stream.ts` — `connectStream` holds the one persistent connection
  (`expansions=author_id&user.fields=username&tweet.fields=created_at`), parses
  newline-delimited JSON, maps each tweet to the exact `/api/ingest` body shape, and runs a
  liveness watchdog (see below).
- `deliver.ts` — `postDelivery` POSTs one delivery, classifying the response exactly per the
  app's contract (200/401/422/500 — see "Delivery response handling").
- `reconnect.ts` — `runIngestionLoop`, the outer in-process backoff loop; classifies fatal
  vs. transient (see "Reconnect / fatal-exit boundary").
- `alarm.ts` / `slack.ts` — the liveness alarm and the 80%-of-observed-cap alarm, both
  posting to `SLACK_WEBHOOK_URL`.
- `errors.ts` — `describeError`, a catch-value serializer so a thrown Supabase/PostgREST
  error object logs its `message`/`code`/`details` instead of `"[object Object]"`.
- `index.ts` — wires it all together: loads env, does an initial rule sync then re-syncs on
  an interval, runs the cap-alarm check on the same interval, and starts the ingestion loop.
  Handles `SIGTERM`/`SIGINT` for a clean shutdown on redeploy.

## Rule-sync cap handling

X's live caps on this app: **5 rules/app, ~40 `from:` handles per rule** (documented caps
say more — never trust them, see "Never trust documented caps" below). `buildRuleGroups`
enforces this in code: it takes the first `5 × 40 = 200` deduped handles and chunks them
into groups of ≤40; each group becomes one rule,
`(from:h1 OR from:h2 OR …) -is:retweet -is:quote -is:reply` — no `lang:` filter (sources post
in multiple languages; translation happens at drafting, app-side). Anything past the 200-
handle capacity is **dropped, not silently folded into the last group** — `buildRuleGroups`
logs `{ cappedAt, droppedCount, dropped }` at `error` level every time it happens, and
`index.ts`'s rule-sync log line always carries `droppedCount` so a growing overflow is
visible in every sync's log line, not just the first.

## Reconnect / fatal-exit boundary

The worker exits (non-zero) on exactly two fatal states — everything else retries
in-process:

1. **Bad env** (`env.ts`) — a required var is missing/blank at startup. Exits immediately;
   no retry, since retrying with the same bad env can't succeed.
2. **Persistent 401 from X** (`reconnect.ts`) — `StreamAuthError` (a 401 on the stream
   connect) increments a `consecutive401s` counter; only the **third consecutive** 401 is
   fatal (`PERSISTENT_401_THRESHOLD = 3`). A single 401 is treated as possibly transient and
   retried with backoff first, since a bad bearer token is the deterministic case but not
   the only one.
3. **401 from `/api/ingest` itself** (`deliver.ts`'s `FatalIngestError`) is also fatal, but
   on the *first* occurrence — this is the worker's own `INGEST_SECRET` being wrong, a
   config problem with no ambiguity, unlike the X-side case above.

Everything else is transient and retried in-process with exponential backoff + jitter
(`reconnect.ts`, base 1s, cap 60s): network errors, X 5xx, a closed stream socket, and the
worker's own liveness watchdog forcing a reconnect (reconnects immediately, no backoff, since
that's a deliberate close rather than a failure). A single delivery's `500`/network errors
retry independently inside `deliver.ts` (base 1s, cap 30s, 6 attempts) without blocking the
stream reader — a delivery is fire-and-forget from `reconnect.ts`'s perspective, so a slow
retry on one tweet never stalls draining the next chunk off the socket. A `422` (bad body per
the app's zod schema) is logged and dropped immediately — never retried.

On any fatal exit, `process.exit(1)` — Railway's `restartPolicyType=ALWAYS` is the outer
net; a bad-env crash loop is visible in the Railway dashboard until the operator fixes the
variable, rather than a worker that silently sits there doing nothing.

## Liveness + cap alarms

- **Liveness**: X sends a blank-line keepalive roughly every 20s even with no matching
  tweets. `stream.ts`'s watchdog checks every `min(15s, INGEST_LIVENESS_TIMEOUT_MS)`
  whether any activity (tweet or keepalive) has arrived within
  `INGEST_LIVENESS_TIMEOUT_MS` (default 90s); if not, it Slack-alarms (debounced by
  `INGEST_ALARM_COOLDOWN_MS`) and forces a reconnect.
- **80%-of-observed-cap**: on the same interval as rule sync
  (`INGEST_RULE_SYNC_INTERVAL_MS`), `alarm.ts`'s `checkDeliveryCap` reads a rolling 24h count
  of `usage_events` rows with `kind = "stream_delivery"` (stamped app-side by
  `processDelivery` — this worker never writes that row, only reads the count) via its own
  service-role client, and Slack-alarms (debounced) once the count reaches 80% of
  `INGEST_OBSERVED_DAILY_CAP`. X's free tier publishes **no documented delivery-volume
  cap** — this threshold is deliberately operator-tuned (default 2000/day is a conservative
  starting guess), not a caps API value; raise or lower it as real traffic teaches you where
  the actual ceiling is.

## Env vars

Read from `process.env`; never hardcoded, never committed (`.env.example` documents names
only). Set them in Railway's variable UI/CLI, never in `railway.json` (config-as-code stays
scoped to build/deploy settings, not secrets).

| Var | Required | Notes |
| --- | --- | --- |
| `X_BEARER_TOKEN` | yes | The app-only X stream credential. **Used RAW** — never URL-decode the portal's `%2B`/`%3D` escapes; decoding produces a 401. Distinct from `X_CLIENT_ID`/`X_CLIENT_SECRET`. |
| `INGEST_URL` | yes | The app's `/api/ingest` URL (e.g. `https://oparax.ai/api/ingest`). Kept as a variable, never hardcoded. |
| `INGEST_SECRET` | yes | Must be **byte-identical** to the app's `INGEST_SECRET` (Vercel). A mismatch is a 401 on every delivery — treated as fatal (see above). |
| `SUPABASE_URL` | yes | Same Supabase project as the app; a worker-local name (this package never imports `NEXT_PUBLIC_SUPABASE_URL` from the app). |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service-role key for the same project — read-only use here (rule sync + cap count). |
| `SLACK_WEBHOOK_URL` | yes | Liveness + cap alarms. |
| `INGEST_OBSERVED_DAILY_CAP` | no (default `2000`) | Operator-tuned delivery-volume threshold; the alarm fires at 80% of this. |
| `INGEST_RULE_SYNC_INTERVAL_MS` | no (default `300000` = 5 min) | Also drives the cap-check interval. |
| `INGEST_LIVENESS_TIMEOUT_MS` | no (default `90000`) | No stream activity for this long forces a reconnect + alarm. |
| `INGEST_ALARM_COOLDOWN_MS` | no (default `3600000` = 1h) | Debounce window shared by both alarms. |

## Deploy checklist (operator — not executed as part of building this package)

This section documents the Railway config shape from the `railway:use-railway` skill for
the operator to apply; nothing here was run.

1. **Never trust documented X caps.** Before doing anything else, re-probe
   `GET /2/tweets/search/stream/rules/counts` and a bare stream connect with the real
   `X_BEARER_TOKEN`, and repeat this after ANY account/app/tier/billing change — the live
   app returned 5 rules/app when the docs said 1,000.
2. Verify `INGEST_SECRET` is **byte-identical** between Railway and Vercel before the first
   deploy — copy it directly, don't retype it.
3. Create the Railway project `oparax-ingest` (workspace "Oparax") and a service pointed at
   this repo with **`source.rootDirectory = /ingest`** — `ingest/railway.json` (this
   package's service-level config-as-code, per the `railway:use-railway` skill's
   `railway.json` fallback model, since this repo has no `.railway/railway.ts` project-wide
   IaC) then applies automatically on deploy: `builder: RAILPACK`,
   `startCommand: pnpm start`, `restartPolicyType: ALWAYS`.
4. Set the remaining service/project-level settings, which live outside `railway.json`'s
   scope (that file only controls one service's build/deploy settings, not project
   resources) — via the Railway dashboard or CLI (`railway service`/`railway environment`
   commands):
   - `numReplicas = 1` — X allows exactly one concurrent filtered-stream connection per
     account; more than one replica would fight over it.
   - `prDeploys = false` — no PR preview environments for an always-on worker with one live
     stream slot.
   - Single production environment only.
   - `sleepApplication = false` — this must never idle; sleeping drops the stream.
   - No `healthcheckPath` — this is a worker, not an HTTP service; it has no HTTP surface to
     healthcheck (its liveness is the in-process watchdog + Slack alarm above).
5. Set the env vars from the table above in Railway (never in source).
6. Deploy, then verify: `railway logs` should show `"stream: connected"` and periodic
   `"rule-sync: complete"` / `"cap-check"` lines with no `fatal` entries. Confirm a real
   tracked handle's post reaches `/api/ingest` end to end (the delivery log line + a
   corresponding row via the app's own observability, not this worker's logs alone).
7. Confirm the restart net: a deliberate bad-env redeploy (temporarily blank one required
   var) should crash-loop visibly in the Railway dashboard rather than run silently broken;
   revert immediately after confirming.

## Local development

```bash
cd ingest
cp .env.example .env.local   # fill in real values, never commit
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run dev                 # tsx watch — reads .env.local if you export it into the shell
```

`pnpm run dev`/`pnpm start` do not auto-load `.env.local` (no dotenv dependency, deliberately
— keeps the package dependency-light); export the vars into the shell or use
`env $(cat .env.local | xargs) pnpm run dev` locally.
