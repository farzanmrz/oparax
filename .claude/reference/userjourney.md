# Project Handoff

## Recent work

- **Dashboard shell** — Built sidebar layout, auth guard, empty state, and `WorkflowCard` at `/dashboard`
- **Grok x_search scripting** — Switched from Vercel AI SDK to OpenAI JS SDK pointed at xAI API; confirmed x_search behavior (date filter partial, `max_turns` limits reasoning loops)
- **API route** — Created `POST /api/scan` in `frontend/app/api/scan/route.ts`; auth guard, input validation, handle normalization, full error handling (400/401/500/502)
- **Wired form to real Grok scan** — Replaced mock 3-phase wizard with real fetch to `/api/scan`; single `ScanPhase` state machine, `AbortController` race prevention, result/error cards
- **Shared constraints** — Extracted `HANDLE_RE` and `MAX_HANDLES` into `frontend/lib/scan-constraints.ts`; imported by both `route.ts` and `constants.ts`

## What's next

Manually test the full happy path at `/dashboard/workflows/new` with `pnpm dev` — fill all 4 fields, click "Run Test", verify real Grok output appears.
