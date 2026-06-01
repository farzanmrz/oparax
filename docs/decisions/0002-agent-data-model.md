# ADR-0002: Agents data model (scan+draft cutover)

## Status
Accepted

## Date
2026-06-01

## Context

ADR-0001 (baseline) described the "prompt lab" surface (`/dashboard/test`) as a single ephemeral page: scan, pick one story, draft one tweet, post. It persisted **nothing** until post, and the 6 tables (`x_connections, monitors, scans, stories, drafts, posts`) expressed that linear chain.

Three things made that model wrong for the next step:

1. **Single Grok call for scan+draft.** The product wants one "Run Agent" button that does the search and generates all drafts in a single model call. That means cost is one number per run (not split across scan + per-draft calls), and "a run" is the natural unit of work — not a monitor + its scans + its stories + their drafts.
2. **Every story gets drafted.** The old loop was pick-one → draft-one. The new loop drafts every returned story. `drafts` hanging off individual `stories` rows via FKs no longer fits — the result set is run-scoped.
3. **Agents need to be saved and listed.** Users need to persist a named config (handles + prompts), re-run it, and eventually have it run on a cron. The old `monitors` table was never surfaced (the prompt-lab set it aside). A cleaner purpose-built `agents` table replaces it.

The old 5 tables (`monitors, scans, stories, drafts, posts`) were dropped in a clean cutover migration. `x_connections` is unchanged.

## Decision

### Surface rename
`/dashboard/test` → `/dashboard/agents`. `/api/test/*` → `/api/agents/*`. Sidebar label: "Agents" (was "Prompt lab").

### Product decisions (locked)

**P1 — One cost per run.** Cost is captured as a single `cost_usd numeric(12,6)` on the `runs` row. The model charges for the combined scan+draft call together; splitting cost per story/draft would require heuristics that have no ground truth. Exact money = `numeric`, never `float`.

**P2 — Draft every result.** All stories returned by the Grok call get a drafted tweet stored as a `run_items` row. Users review and edit before posting; there is no "pick one" gate.

**P3 — Run-as-preview, persist on Save.** Running the agent without saving is in-memory (preview). "Save Agent" persists the agent config to the `agents` table and re-associates any in-memory results. Posting to X remains a separate, manual per-item action.

### Schema (4 tables)

**`x_connections`** — unchanged from ADR-0001. X OAuth tokens (encrypted), per user.

**`agents`** — the saved config:
```
id               uuid PK (gen_random_uuid())
user_id          uuid FK→auth.users NOT NULL
name             text NOT NULL
monitored_handles text[] NOT NULL DEFAULT '{}'
monitoring_description text NOT NULL DEFAULT ''
drafting_instructions  text NOT NULL DEFAULT ''
example_tweets   text[] NOT NULL DEFAULT '{}'
scan_from        date NULL
scan_to          date NULL
status           agent_status NOT NULL DEFAULT 'active'
scan_cadence_minutes  int4 NULL    -- FUTURE cron
next_run_at      timestamptz NULL  -- FUTURE cron
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()
```
RLS: `user_id = auth.uid()`.

**`runs`** — one row per "Run Agent" invocation:
```
id               uuid PK
agent_id         uuid FK→agents NOT NULL
source           run_source NOT NULL DEFAULT 'manual'
status           run_status NOT NULL DEFAULT 'running'
started_at       timestamptz NOT NULL DEFAULT now()
completed_at     timestamptz NULL
cost_usd         numeric(12,6) NULL
x_search_count   int4 NULL CHECK (x_search_count >= 0)
item_count       int4 NULL CHECK (item_count >= 0)
inputs           jsonb NULL   -- snapshot of handles+prompts (rerun detection)
error_message    text NULL
```
RLS: transitive via `agent_id→agents.user_id = auth.uid()`.

**`run_items`** — one row per story+draft result (left card + right card + post state):
```
id               uuid PK
run_id           uuid FK→runs NOT NULL
agent_id         uuid FK→agents NOT NULL  -- denormalized, one-hop RLS
story_title      text NOT NULL DEFAULT ''
story_summary    text NOT NULL DEFAULT ''
source_urls      text[] NOT NULL DEFAULT '{}'
primary_tweet_url text NOT NULL DEFAULT ''
dedupe_key       text NOT NULL
drafted_text     text NOT NULL DEFAULT ''  -- model output
final_text       text NOT NULL DEFAULT ''  -- user-edited posted text
status           item_status NOT NULL DEFAULT 'drafted'
x_tweet_id       text NULL
x_tweet_url      text NULL
posted_at        timestamptz NULL
error_message    text NULL
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()
UNIQUE (run_id, dedupe_key)
```
RLS: transitive via `agent_id→agents.user_id = auth.uid()`. `agent_id` is denormalized to keep RLS a one-hop join (avoids `runs→agents` two-hop on every item query).

### Postgres enums
```sql
CREATE TYPE agent_status AS ENUM ('active', 'paused');
CREATE TYPE run_source   AS ENUM ('manual', 'cron');
CREATE TYPE run_status   AS ENUM ('running', 'completed', 'failed');
CREATE TYPE item_status  AS ENUM ('drafted', 'posted', 'failed');
```

### Typing rulings

| Concern | Choice | Rationale | Source |
|---|---|---|---|
| X user / tweet IDs | `text` | PostgREST emits bigint as JSON number → JS rounds IDs > 2^53. X docs say "always use string IDs". | https://docs.x.com/fundamentals/x-ids |
| Tweet text | `text`, NO length CHECK | 280 is a *weighted* count via `twitter-text`, not raw chars; longform posts can exceed 280 raw bytes. DB stores what the model returns + what the user types. | https://docs.x.com/fundamentals/counting-characters |
| `cost_usd` | `numeric(12,6)` | Exact money representation; IEEE float rounds sub-cent values. | https://www.postgresql.org/docs/current/datatype-numeric.html |
| Counts (`x_search_count`, `item_count`) | `int4 CHECK (>= 0)` | Postgres has no unsigned int; CHECK enforces non-negative. | — |
| `@handle` (in `monitored_handles[]`) | `citext` (extension) | Case-insensitive storage + comparison; `@Foo` and `@foo` are the same handle. | https://www.postgresql.org/docs/current/citext.html |
| `scopes` (in `x_connections`) | `text[]` | X OAuth 2.0 has 22 scopes and keeps adding them; enums can't `DROP VALUE` and `ADD VALUE` is not transactional. | https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code#scopes |
| `agent_status`, `run_source`, `run_status`, `item_status` | Postgres enums | Stable, closed sets; Supabase `gen types` turns them into TS string-literal unions automatically. | https://supabase.com/docs/guides/database/postgres/enums |
| Handle validation `^[A-Za-z0-9_]{1,15}$` | Enforced in **code** | Regex not cheaply expressible as a PG constraint on an array element; validated in `lib/scan/handles.ts`. | — |
| Weighted ≤ 280 chars, ≤ 1 cashtag | Enforced in **code** | Twitter-text `parseTweet().weightedLength`; DB stores raw text regardless. | — |

## Consequences

**Gained:**
- A single `runs` row is the audit record for one invocation: cost, item count, status, inputs snapshot. Cheap to query "how much did this run cost?" or "what did the agent look like when it ran?".
- `run_items` is the dual-card model: story (left) + draft (right) + post state in one row. No join needed to render the UI.
- `agent_id` on `run_items` makes RLS a one-hop check; a two-hop `run→agent→user` join on every list query is avoided.
- Enums give TS string-literal types for free via `gen types`.

**Deferred / watch-outs:**
- **Aging / retention policy must protect posted items.** If runs are pruned (e.g. DELETE old runs), `run_items` rows with `status='posted'` must be preserved or migrated — posted tweets are the user's audit trail. No retention policy is defined yet; add one before any automated cleanup.
- **Cron is scan-only / future.** `scan_cadence_minutes` and `next_run_at` columns exist on `agents` as placeholders. The `run_source='cron'` enum value is reserved. Nothing triggers cron yet; `vercel.json` crons are empty.
- **`inputs` JSONB is a snapshot, not a normalized config.** It records handles+prompts at the moment of the run for rerun-detection. Do not move product logic into this blob — it is an opaque audit field.
- **No per-draft cost split.** Cost is one number on `runs`. If per-story cost attribution is needed later, the model API would need to expose per-output token counts that are currently not returned separately.

## References
- `docs/SPEC.md` · `docs/PLAN.md` · `docs/TODO.md`
- `docs/decisions/0001-architecture.md` (superseded baseline for the data model; still authoritative for D1–D3, D5, D7–D10)
- Code (post-cutover): `app/dashboard/agents/`, `app/api/agents/*`, `lib/scan/*`, `lib/draft/*`, `lib/x/*`, `lib/types/`
- `supabase/` migrations
