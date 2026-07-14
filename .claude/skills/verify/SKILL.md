---
name: verify
description: >-
  Drive this repo's app end-to-end to verify a change at its real surfaces —
  boot, the /api/chat agent route, the /api/cron/tick dispatcher, and the
  browser UI. Use when a change needs runtime proof beyond `pnpm build`
  (which compiles /api/chat and /api/cron/tick but never calls either).
model: inherit
---

# Drive the app end-to-end to prove a change

Surfaces and the commands that reach them (all verified working):

1. **Boot**: `pnpm dev` (background, log to a file). Ready when the log has
   Next.js's `Ready in`. Failure signatures to sweep: `error|failed|unhandled`
   — expect zero on a clean boot.
2. **Agent route, anonymous** (exercises the auth gate — the ONLY check
   `pnpm build` can't see): `curl -i -X POST localhost:3000/api/chat -H
   'content-type: application/json' -d '{"messages":[]}'` with no session
   cookie → expect `401`. This is the fail-closed check; the authed happy
   path (streaming, tool calls, reasoning) is exercised via the browser below
   — curl can't easily carry a real Supabase session cookie.
3. **Cron route smoke** (`app/api/cron/tick/route.ts` — the per-minute
   dispatcher, no browser needed):
   - `curl -i localhost:3000/api/cron/tick` with no `Authorization` header →
     expect `401`.
   - `curl -i localhost:3000/api/cron/tick -H 'authorization: Bearer wrong'`
     → expect `401`.
   - With `CRON_SECRET` unset in the running dev server's env → expect `401`
     even with a bearer header (fail-closed, not fail-open).
   - `curl -i localhost:3000/api/cron/tick -H "authorization: Bearer
     $CRON_SECRET"` → expect `200` and a JSON body of counts (`due`,
     `claimed`, `done`, `failed`).
   - **No-double-fire**: fire two authorized ticks back to back while a scan
     is in flight (a due agent with a long-running run) — the second tick's
     `claimed` count for that agent must be `0`; the CAS advance-at-claim on
     `next_run_at` means only the first tick can win the row.
4. **Browser UI**: log in at `/login` with the AGENTS.md test account, then:
   - `/agents` (sidebar shell) and `/agents/new` (chat — send a beat
     description, expect a streamed onboarding reply, a reasoning block, and
     a `oparax_x_search` tool call round trip — the tool surface is only
     `oparax_x_search` and `save_agent`; there is no handle-verify step).
   - `/agents/[id]` (the desk dashboard): confirm the three tabs render as
     **Scans / Drafts / Agent runs**; Pause/Resume flips the status badge and
     clears/sets the "Next scan" label; Scan-now queues a run that (after the
     next tick) appears in the Agent runs tab, whose trace card expands to
     show the reasoning + drafted/executed search trace.
   - The prompt box submits via its ↵ button, not the Enter key. Finish with
     a console-error sweep (expect none).
