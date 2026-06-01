# Idea: Agent data model for Oparax

> Status: **Adopted** — locked into `docs/decisions/0002-agent-data-model.md` (2026-06-01).
> This one-pager captures the thinking before the decision was finalized.

---

## Problem statement — How Might We

**HMW** let a reporter save a named "agent" (handles + prompts), run scan+draft in one action, review all drafted stories, and post manually — without tangling the run history with the agent config, and without paying twice?

The prompt-lab surface proved the core loop (scan → draft → post) but left three problems open:
1. Scan and draft were separate calls and separate persisted rows — the cost was split and unaccountable.
2. Only one story could be drafted per session; the rest were discarded.
3. The "agent" (the named config) couldn't be saved, listed, or re-run.

---

## Recommended direction

**Four tables:** `x_connections` (unchanged) + `agents` + `runs` + `run_items`.

- `agents` = the saved config (handles, prompts, scan window, status). One row per named agent per user.
- `runs` = one invocation of "Run Agent". Captures the combined cost, item count, status, and a JSONB snapshot of the inputs as they were at run time.
- `run_items` = one row per story+draft result. Holds both the story data (left card) and the draft + edit + post state (right card). `agent_id` is denormalized on this table for a one-hop RLS join.

**JSONB only inside a run's `inputs` field.** The `inputs` blob is an opaque audit snapshot (handles+prompts at invocation time) for rerun detection. No product logic reads keys out of it. Everything structural is a proper column.

---

## Key assumptions

1. The combined scan+draft call returns all stories already drafted — there is no "pick one" step.
2. Cost from the xAI API is one number for the whole call; per-story attribution is not available and not needed.
3. Agents will eventually run on a cron; the schema reserves columns (`scan_cadence_minutes`, `next_run_at`) but does not build the trigger yet.
4. Posting to X stays manual per item — no auto-post.
5. `run_items.agent_id` (denormalized) is worth the redundancy to keep RLS a single join.

---

## MVP scope

- Save agent config → `agents` row.
- Run Agent (unsaved = in-memory preview; saved = writes `runs` + `run_items`).
- All returned stories drafted and shown as `run_items`.
- One `cost_usd` on the `runs` row (exact, `numeric(12,6)`).
- Post per item (manual) updates `run_items.status`, stores tweet id/url.
- RLS: agents by `user_id`; runs + run_items via `agent_id→agents.user_id`.

---

## Not doing (explicit out-of-scope)

- No `stories`, `drafts`, or `posts` tables — the old 5-table chain is dropped entirely.
- No cron / auto-run — `scan_cadence_minutes` and `next_run_at` exist as reserved columns only.
- No per-draft cost split — cost is one number per run.
- No cross-run story deduplication — `dedupe_key` is unique per run, not globally.
- No automated cleanup / retention policy — must be designed before any DELETE sweep (posted items are the user's audit trail).

---

## Open questions

1. **Retention / aging policy.** How long should runs be kept? What happens to `run_items` with `status='posted'` if a run is pruned? No policy defined yet — block any automated cleanup on this decision.
2. **Preview → save handoff.** When a user runs in-memory and then saves, do the in-memory results persist as the first run, or does saving just persist the config and require a fresh run?
3. **Multi-agent listing UX.** How should the agents list surface past runs — inline counts only, or a drill-down per agent?
4. **Cron run attribution.** When cron runs an agent, what user context does the DB write under? Needs a service-role insert with `agent.user_id` threaded through.
