---
name: verify
description: >-
  Drive this repo's app end-to-end to verify a change at its real surfaces:
  boot, the /api/ingest delivery interface, and the browser UI. Use when a
  change needs runtime proof beyond `pnpm build` (which compiles /api/ingest
  and /api/email/inbound but never calls either).
model: inherit
---

# Drive the app end-to-end to prove a change

## 1. Boot

* **Start:** `pnpm dev` in the background, logging to a file.
* **Ready when** the log shows Next's `Ready in`.
* **Sweep** the log for `error|failed|unhandled`; expect zero.

## 2. /api/ingest: the delivery interface, no browser needed

Every source post enters here (`app/api/ingest/route.ts`). Four calls, in
order:

| Request | Expect |
|---|---|
| no `Authorization` header, body `{}` | `401` |
| `authorization: Bearer wrong`, body `{}` | `401` (fail-closed even with a body) |
| valid Bearer, body `{"author_handle":"someone"}` | `422` + a zod issues array (body-shape check runs after auth) |
| valid Bearer, full body (below) | `200` + a `ProcessDeliveryResult` (`sourcePostId`, `drafted[]`) |

```bash
curl -i localhost:3000/api/ingest -X POST \
  -H "authorization: Bearer $INGEST_SECRET" -H 'content-type: application/json' \
  -d '{"source":"x","x_post_id":"<uuid-ish>","author_handle":"<a tracked handle>","text":"a test post","posted_at":"2026-07-22T12:00:00Z"}'
```

* **The `200` is `processDelivery` running for real:** English can skip the translator; otherwise one translator call runs before one drafter call. Their `model_calls` / `usage_events` rows land, and an on-beat result creates the `drafts` winner and sends a real notification if the env vars are set.
* **Concurrent-duplicate check:** fire that same authorized body twice, back to back. `draft_claims`'s `UNIQUE(source_post_id, agent_id)` means only the first claim wins; the second returns `drafted[].skipped: "already_drafted"`. Confirm in the DB that exactly one drafter `model_calls` row and one `drafts` winner exist for that `source_post_id`; a translation row is optional.

## 3. Browser UI

Log in at `/login` with the frontend test account (credentials are in
AGENTS.md's Code map), then:

* **Feed-first landing:** `/agents` redirects into a desk's Feed
  (`/agents/{id}`). Confirm the redirect happens, not just that the
  destination looks right. Only a zero-desk account sees the `AgentsList`
  empty state.
* **Shell + tabs:** every `/agents/*` page shows the sticky site header (mark,
  desk switcher, account menu; there is no sidebar and no offcanvas trigger).
  On a desk it also shows Feed/Voice/Setup: desktop tabs at `md:`, a
  persistent mobile row below. Check one narrow and one wide viewport.
* **`/agents/new`:** a form, not a chat, with no typed handle field. Fill
  Beat, add a tracked X handle, Connect X (Create stays disabled until
  linked), submit, then confirm the redirect into the new agent with live
  streaming extraction progress that survives navigation and reload.
* **Council expansion:** on a Feed with a drafted story, click a card's "How
  this draft was made". Confirm: URL gains `?why=<sourcePostId>` (deep-link
  safe); one member card per drafting family plus a judge card; each
  `Reasoning` toggle expands to a trace or "not exposed by this model";
  closing clears the param. Finish with a console-error sweep. This is the
  only exercise of `fetchCouncilDetail`: `pnpm build` never calls it.
* **Connect-X / Post-to-X** (`PostToXControl`): unlinked, the Connect X link
  points at `/auth/x?returnTo=...`. Linked, Post flips to an inline
  Confirm/Cancel (no modal) before `postDraftToX`, and a posted draft shows
  "Posted to X" with its `posted_url`.
