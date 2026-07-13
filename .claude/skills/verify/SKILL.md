---
name: verify
description: >-
  Drive this repo's app end-to-end to verify a change at its real surfaces —
  boot, the /api/chat agent route, and the browser UI. Use when a change needs
  runtime proof beyond `pnpm build` (which compiles /api/chat but never calls it).
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
3. **Browser UI**: log in at `/login` with the AGENTS.md test account, then
   `/agents` (sidebar shell) and `/agents/new` (chat — send a beat description,
   expect a streamed onboarding reply, a reasoning block, and a handle-verify
   tool call round trip). The prompt box submits via its ↵ button, not the
   Enter key. Finish with a console-error sweep (expect none).
