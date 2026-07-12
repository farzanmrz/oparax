---
name: verify
description: >-
  Drive this repo's app end-to-end to verify a change at its real surfaces —
  boot, eve agent API, and the browser UI. Use when a change needs runtime
  proof beyond `pnpm build` (which never boots eve's worker).
model: inherit
---

# Verify — oparax-chirp

Surfaces and the commands that reach them (all verified working):

1. **Boot**: `pnpm dev` (background, log to a file). Ready when the log has BOTH
   Next.js `Ready in` AND eve's `server listening at http://127.0.0.1:<port>/`.
   Failure signatures to sweep: `error|failed|unhandled` — expect zero on a
   clean boot. Stale-state gotcha: after an eve version change, wipe
   `eve/.eve eve/.workflow-data .eve .next` first or the local workflow world
   replays old runs and spams `Unhandled queue` (harmless locally, but noise).
2. **Agent API** (same-origin through the Next rewrite — this exercises the
   withEve seam): `curl localhost:3000/eve/v1/health` → `{"ok":true,...}`;
   `curl -X POST localhost:3000/eve/v1/session -H 'content-type: application/json'
   -d '{"message":"..."}'` → `{"ok":true,"sessionId":"wrun_..."}` (this is the
   ONLY check that exercises worker graph resolution — builds stay green on a
   broken worker); then `curl -m 20 .../session/<id>/stream` and look for
   `message.completed` + `turn.completed`. Costs one cheap DeepSeek call.
3. **Browser UI**: log in at `/login` with the AGENTS.md test account, then
   `/agents` (sidebar shell) and `/agents/new` (chat — send a beat description,
   expect a streamed onboarding reply with a reasoning header). The prompt box
   submits via its ↵ button, not the Enter key. Finish with a console-error
   sweep (expect none).
4. **Vercel packaging** (when eve/deploy config changes):
   `cd eve && rm -rf .vercel && VERCEL=1 npx eve build` must emit TOP-LEVEL
   `.vercel/output/functions/__server.func/` containing `.vc-config.json` and
   `_runtime.mjs`, plus a `services`-contract `config.json`. The prewarm-skip
   warning without `VERCEL_DEPLOYMENT_ID` is expected locally.

Known probe results (pre-existing, not regressions): empty session body → clean
`{"error":"Missing or empty 'message' field."}`; DELETE on `/eve/v1/session` →
404; streaming a nonexistent session id hangs until client timeout instead of
returning 404.
