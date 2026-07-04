# Triage — persistent deferred-work backlog

The one planning file that lives in the repo. Deferred test findings, next-slice candidates, and "while we're here" ideas land here (newest on top). Each `/feature` session's preflight checks this list when choosing a slice; specs and plans themselves live in GitHub issue bodies, never here.

## Next slice candidates

- **Chat UI for the eve build** — ai-elements + `useEveAgent` on `/dashboard/rebuild`, replacing the placeholder header. The agent is exercised via the eve TUI until then. (from #39 strip-down)
- **Evals + telemetry for the agent** — eve's `evals/` at the repo root and `agent/instrumentation.ts`; both frontend-free, natural next rungs on the primitives ladder. (from #39 strip-down)
- **Scan persistence** — dropped in the strip-down; reintroduce deliberately when the run shape earns it (local files first per the hard guards, and note Vercel's ephemeral FS means deployed persistence needs a real target). (from #39)

## Later / maybe

- **Legacy runs on ai-v7 deprecation aliases** (`toUIMessageStreamResponse`, `system:`, `totalUsage`, `fullStream`, …) — ai v8 removes them; modernize legacy AI SDK call sites before any v8 bump. (from #39 migration)
- **eve 0.18.2 / 0.19.0 available** — upgrade deliberately as its own slice: re-verify bundled docs, `defineTool`/`useEveAgent` surfaces, and the `ai` peer range. (from #39)
- **Optional: re-vendor `components/ai-elements`** from the registry post-v7 — the vendored set needed only 3 type renames, but a refresh picks up upstream fixes. (from #39)
- **xSearch handle cap is 10** — enforced by the `@ai-sdk/xai` runtime schema (docs claim 20); recheck on SDK bumps. Currently inline in the tool's zod schema. (from #39)
- **Vercel two-service topology note** — `withEve()` splits the deploy into web + eve services at build time, invisible in the committed `vercel.json`; adding `experimentalServices` there later must include BOTH services or the build fails. (from #39 code review)
- **Eve channel auth for deployed environments** — the eve HTTP channel's fail-closed default (`vercelOidc` + `localDev`) is right for dev; a deployed chat UI needs a Supabase-session-aware `agent/channels/eve.ts`. (from #39)
- **Schedules, drafting leg, posting** — the rest of the rebuild roadmap, one primitive at a time per issue #38. (from #39 spec)
