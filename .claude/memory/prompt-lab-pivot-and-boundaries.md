---
name: prompt-lab-pivot-and-boundaries
description: Current surface = the Prompt Lab; legacy workflows removed; prompt-lab is user/Codex territory; working rules
metadata: 
  node_type: memory
  type: project
  originSessionId: fc0b4baa-4049-4d45-9c99-feb36fdd33bd
---

As of 2026-05-31 the product surface is the **Prompt Lab** (`app/dashboard/test` → `components/loop/prompt-lab.tsx`): Connect X → scan → pick story → draft → post a real tweet. The end-to-end loop works and posts (CP3 done). Live tables: `x_connections, monitors, scans, stories, drafts, posts`. Authoritative state lives in-repo: **AGENTS.md** (folder map + "current surface") and **docs/TODO.md → "Current state"**.

**Done 2026-05-31 (this orchestration):** legacy `workflows` module fully removed — code (pages/components/`lib/{workflow-drafting,workflow-scans,prompts,scan-constraints,xai}`/`api/{scan,draft,test-scan,cron/workflow-scans}`) + the 4 legacy tables dropped (migration `20260601042543`, kept shared `handle_updated_at`). Real tabbed **Settings** UI shipped (`app/dashboard/settings/*` + `components/settings/*`): Profile = editable display name (via `supabase.auth.updateUser` user_metadata) + connected accounts (reuses `components/loop/connect-x`/`disconnect-x-button`); Billing/Account-security/Notifications greyed.

**BOUNDARY — prompt-lab is the user's / Codex's territory.** When doing background/parallel work, do NOT touch: `app/dashboard/test/*`, `components/loop/*`, `lib/scan/*`, `lib/draft/*`, `lib/x/*`, `lib/types/*`, `app/api/test/*`, `components/app-sidebar.tsx`, `components/nav-main.tsx`, `app/dashboard/layout.tsx`, `components/handle-input.tsx`, `app/login/actions.ts`. The user builds the lab's create/listing/detail + the "saved agents" model + its backend separately. **Commit selectively** (`git add <explicit paths>`, never `git add -A`) so their uncommitted edits aren't swept in. **Cron auto-scan = scan-only and deferred** to the agents backend (not ours to build) — contract: `CRON_SECRET`-gated route + service-role client + reuse `lib/scan/*`.

**Working rules (this repo):** the **`ts-format` skill was REMOVED** — don't invoke it; keep `.ts/.tsx` lint-clean (hand-match conventions). **agent-browser is BANNED** for UI checks (like ui-tester) — after each step, tell the user what to verify; they check the UI manually. Env present in `.env`/`.env.local` (`X_CLIENT_ID/SECRET`, `X_TOKEN_ENC_KEY`, `XAI_API_KEY`). Throwaway `scripts/check-slice1.ts` (run via `tsx`, uncommitted) covers unit logic. See [[user-rabbitholes-on-ai-output]].
