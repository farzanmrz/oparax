# Triage — persistent deferred-work backlog

The one planning file that lives in the repo. Deferred test findings, next-slice candidates, and "while we're here" ideas land here (newest on top). Each `/feature` session's preflight checks this list when choosing a slice; specs and plans themselves live in GitHub issue bodies, never here.

## Next slice candidates

- **Eve channel auth** — `agent/channels/eve.ts`, a Supabase-cookie AuthFn: nitro-side reassembly of chunked `sb-*` cookies + JWT verification (NOT drop-in `@supabase/ssr` — that stack assumes Next request plumbing). Prerequisite for any deployed chat: until it exists, deployed `/eve/v1/*` 401s browsers and `/dashboard/agents` is localhost-only. (from #41)
- **First deploy verification of the eve topology** — the eve runtime has never been exercised on Vercel. After the next `dev` push: check the deployment's build logs, then `GET /eve/v1/health` on the preview URL (public route, works pre-auth). Also confirm project defaults cover eve's long scan streams now that `vercel.json` no longer pins `fluid`/durations (both services). (from #41)
- **Evals + telemetry for the agent** — eve's `evals/` at the repo root and `agent/instrumentation.ts`; both frontend-free, natural next rungs on the primitives ladder. (from #39 strip-down)
- **Scan persistence** — dropped in the strip-down; reintroduce deliberately when the run shape earns it (local files first per the hard guards, and note Vercel's ephemeral FS means deployed persistence needs a real target). (from #39)

## Later / maybe

- **Abandoned recovery sessions stay signed in** — the deleted auth modal signed out users who consumed a recovery token but never set a password (`abandonRecoveryAction`); the routed reset page has no equivalent, so that session now lives until expiry. Low risk (the session belongs to the account owner); add a sign-out-on-leave if it ever matters. (from #41 simplify)
- **Username edits lost the unsaved-changes nav guard** — died with the old shell's `UnsavedChangesProvider`; navigating away mid-edit now silently discards. Stub-appropriate; revisit only if the v0 shell keeps inline editing. (from #41 review)
- **Function region unpinned** — `vercel.json` no longer pins regions while Supabase sits in us-west-1; default placement (typically iad1) adds ~100ms of auth round-trips per dashboard render. One-line fix if it bothers: `"regions": ["sfo1"]` (single-region pins are allowed on all plans). (from #41 review)
- **Chat session persistence/resume** — `useEveAgent`'s `initialSession`; wanted before schedules attach to the UI, otherwise a scheduled run's session is unreachable from the chat. (from #41)
- **XAI_API_KEY duplicate rows on Vercel** — a Dev row (~18d old) and a Preview/Prod row (~116d old) coexist; verify the values match and dedupe manually. (from #41)
- **v0 deploy spam guard** — consider `"git": { "deploymentEnabled": { "v0/**": false } }` in `vercel.json` if v0's auto-commit deploys get noisy. (from #41)
- **v0 workspace setup** — Project Settings → Instructions (the reuse-pin) + custom skills + a Design-Systems-page skill with GitHub sources, once design iteration starts. (from #41)
- **eve 0.18.2 / 0.19.0 available** — upgrade deliberately as its own slice: re-verify bundled docs, `defineTool`/`useEveAgent` surfaces, and the `ai` peer range. (from #39)
- **Optional: re-vendor `components/ai-elements`** from the registry post-v7 — the vendored set needed only 3 type renames, but a refresh picks up upstream fixes. (from #39)
- **xSearch handle cap is 10** — enforced by the `@ai-sdk/xai` runtime schema (docs claim 20); recheck on SDK bumps. Currently inline in the tool's zod schema. (from #39)
- **Vercel two-service topology note** — `withEve()` splits the deploy into web + eve services at build time, invisible in the committed `vercel.json`; adding `experimentalServices` there later must include BOTH services or the build fails. (from #39 code review)
- **Schedules, drafting leg, posting** — the rest of the eve build, one primitive at a time (see AGENTS.md, The eve build). (from #39 spec)
