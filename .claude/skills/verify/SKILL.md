---
name: verify
description: >-
  Drive this repo's app end-to-end to verify a change at its real surfaces —
  boot, the /api/ingest delivery interface, and the browser UI. Use when a
  change needs runtime proof beyond `pnpm build` (which compiles /api/ingest
  and /api/email/inbound but never calls either).
model: inherit
---

# Drive the app end-to-end to prove a change

Surfaces and the commands that reach them (all verified working):

1. **Boot**: `pnpm dev` (background, log to a file). Ready when the log has
   Next.js's `Ready in`. Failure signatures to sweep: `error|failed|unhandled`
   — expect zero on a clean boot.
2. **`/api/ingest` drive-through** (`app/api/ingest/route.ts` — the delivery
   interface every source post enters through, forwarder or hand-seeded demo
   alike; no browser needed):
   - `curl -i localhost:3000/api/ingest -X POST -H 'content-type:
     application/json' -d '{}'` with no `Authorization` header → expect `401`.
   - `curl -i localhost:3000/api/ingest -X POST -H 'authorization: Bearer
     wrong' -H 'content-type: application/json' -d '{}'` → expect `401`
     (fail-closed on a bad or absent `Bearer $INGEST_SECRET`, even with a
     body attached).
   - `curl -i localhost:3000/api/ingest -X POST -H "authorization: Bearer
     $INGEST_SECRET" -H 'content-type: application/json' -d
     '{"author_handle":"someone"}'` (missing `x_post_id`/`text`/`posted_at`)
     → expect `422` with a zod issues array — the body-shape check, once
     auth passes.
   - `curl -i localhost:3000/api/ingest -X POST -H "authorization: Bearer
     $INGEST_SECRET" -H 'content-type: application/json' -d
     '{"x_post_id":"<uuid-ish>","author_handle":"<a tracked handle>","text":"a
     test post","posted_at":"2026-07-22T12:00:00Z"}'` → expect `200` and a
     `ProcessDeliveryResult` JSON body (`sourcePostId`, `drafted[]`) — this is
     `processDelivery` running for real: a council drafts, a judge picks a
     winner, `model_calls`/`post_drafts`/`usage_events` rows land, and (if
     Slack/Resend env vars are set) a real notification sends.
   - **Concurrent-duplicate-delivery, proving exactly one council run**: fire
     the same authorized request body (same `x_post_id`, same matching
     `author_handle`) twice, back to back. `draft_claims`'s
     `UNIQUE(source_post_id, experiment_id)` (D16) means only the first
     request's atomic claim insert wins; the second's `processDelivery` call
     returns `drafted[].skipped: "already_drafted"` for that experiment with
     no new council run — confirm in the DB that exactly one set of
     `model_calls` rows (one council's worth) and one `post_drafts` winner
     exist for that `source_post_id`, not two.
3. **Browser UI**: log in at `/login` with the AGENTS.md test account, then:
   - **Feed-first landing**: visiting `/agents` redirects straight into a
     desk's Feed (`/agents/{id}`) — it never renders a listing for a reporter
     who already has a desk; only a zero-desk account sees the empty-state
     listing (`AgentsList`). Confirm the redirect happens, not just that the
     destination looks right.
   - **Per-page nav affordance**: every `/agents/*` page shows the sticky
     site header (Oparax mark, desk switcher, account menu — no page ever
     shows an offcanvas sidebar trigger, there is no sidebar). On a desk, the
     same header also shows Feed/Voice/Setup tabs: desktop tabs at `md:` width
     and a persistent mobile tab row below it. Confirm the shell and tabs
     render and navigate to the right URL on at least one narrow- and one
     wide-viewport pass.
   - `/agents/new` (the create-agent form — NOT a chat, no typed handle
     field): fill Beat, add a tracked X handle, Connect X (Create stays
     disabled until it's linked); submit; expect a redirect into the new
     agent with a live streaming extraction-progress view. Voice extraction
     runs in the background and survives navigation/reload.
   - **Stateful council-expansion check**: on a desk Feed with at least one
     drafted story, click a draft card's "How this draft was made" (info)
     icon — confirm the URL gains `?why=<sourcePostId>` (deep-link/reload
     safe), the dialog opens with one member card per drafting family plus a
     judge card, each `Reasoning` toggle expands to show its trace (or "not
     exposed by this model" where withheld), then close the dialog and
     confirm the query param clears. Finish with a console-error sweep
     (expect none) — this exercises `fetchCouncilDetail` end to end, a path
     `pnpm build` never calls.
   - Connect-X / Post-to-X (`PostToXControl` on a draft card): with no linked
     account, confirm the Connect X link points at `/auth/x?returnTo=...`;
     once linked, confirm Post flips to an inline Confirm/Cancel (no modal)
     before calling `postDraftToX`, and a posted draft shows "Posted to X"
     with its `posted_url` link.
