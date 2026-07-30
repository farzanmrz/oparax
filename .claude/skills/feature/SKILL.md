---
name: feature
description: >-
  The end-to-end feature flow: plan → build → QC → triage+ship, run as one guided
  sequence. Use when the user wants a full slice built from idea to shipped commit.
  For a single phase, use the granular skills directly: /feature-plan,
  /feature-build, /feature-qc, /feature-ship (or /simplify, /code-review,
  /feature-lint for individual QC passes). To resume in a fresh session, use the
  global /handoff and /continue skills.
argument-hint: "[feature description]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
disable-model-invocation: true
---

# Idea to shipped — the orchestrator

## Resume detection — run on EVERY invocation, before anything else

The flow's state lives entirely in durable markers, so this orchestrator must
locate the slice before conducting: `git branch -a | grep ft/` + the current
branch, then for an existing `ft/<N>`: `gh issue view N --comments`. Decide
the entry point from the FIRST missing marker, in order:

| Marker present? | Meaning | Next |
|---|---|---|
| no ft branch / open ft issue for this ask | nothing started | `feature-plan` |
| ft/N + issue, no commits beyond the branch cut | planned, not built | build (owner picks harness) |
| build commits, no `## QC round` comments | built | `feature-find` |
| `— findings` without matching `— fixes` | adjudicated | `feature-fix` |
| `— fixes` without `— docs` | fixed | `feature-docs` |
| `— docs` without `— verified` | synced | `feature-verify` |
| `— verified` present | verified | triage/`feature-ship` (✋) |

State the detected position in one line ("ft/73 has round-1 findings but no
fixes — resuming at feature-fix") and continue from there. Never re-run a
completed phase, and never skip forward past a missing marker — in
particular, NEVER enter ship while the latest round lacks `— verified`.

This skill only conducts; the four phase skills do the work. A run is **ONE issue ·
ONE feature branch · ONE squashed commit on `beta`.** `beta` and `main` are
integration and promotion destinations, never feature-development branches. No PRs,
no CI. Parallelism is a private implementation detail.

**One flow, two harnesses.** Codex invokes these same skills through the
`.agents/skills/` symlinks — `$feature`, `$feature-plan`, `$feature-build`,
`$feature-qc`, `$feature-ship` — reading the Codex column of each skill's dials
table. The parallel `cx-feature*` family was deleted 2026-07-30: duplication had
made the Codex plan skill a measurably weaker spec-writer than the Claude one
for no intended reason, which is the failure mode a second copy always drifts
into. A genuine per-harness difference (session dial, subagent names, which
council lanes run) belongs in a dials row; nothing else differs. Because each
phase starts from durable state only — the issue body, the branch,
`origin/beta...ft/<N>`, the `## QC round` comments — a slice may switch harness
at any phase boundary, in either direction.

**Track phases with TaskCreate** — one task each, ticked as each finishes; the flow
is complete only when the last ticks:

1. `Plan approved (✋ gate) + issue opened + ft/<issue#> cut` → invoke **`feature-plan`**
   — **the session STOPS here (owner decision 2026-07-27).** The issue body is the
   complete spec, so the owner chooses where build runs: `/feature-build N` in a
   Claude session on their build dial, or a **Codex chat on a cheap dial**
   (`$feature-build`; AGENTS.md's External build executors contract). Later
   phases are owner-triggered.
2. `Built on ft/<issue#>` → invoke **`feature-build`** (Claude path) — **stops
   when built** with a compact build summary; the owner triggers QC. A Codex
   build stops the same way in its own app.
3. `QC: cross-model reviews · lint · build · doc sync` → invoke **`feature-qc`**, ending at the verification ✋ — QC is four hoppable
   sub-steps (`feature-find` → `feature-fix` → `feature-docs` →
   `feature-verify`), each runnable standalone in either app; under this
   orchestrator they chain in one session
4. `Owner feedback implemented + shipped via ship.sh (✋)` → invoke **`feature-ship`**

**A run pauses at every phase boundary (owner decision 2026-07-27, superseding
the 2026-07-26 two-gate rule):**

1. **The plan gate (✋)** — plan approved/denied; on approval the issue + branch
   are cut and the session stops. Build runs wherever the owner chooses.
2. **The build stop** — build ends with a compact summary and waits; the owner
   decides when/where QC runs.
3. **The verification gate (✋)** — after `feature-qc`, presenting what was
   implemented and what the owner must manually verify before shipping.
4. **The ship gate (✋)** — feature-ship's triage + authorization (with its
   standing pre-approval carve-out when the invocation itself says ship).

Between these stops nothing else pauses or narrates: within a phase the owner
watches the reasoning trace — interim narration is forbidden output (see the
`Flow` output style). The stops are checkpoints, not conversations.

The user may jump out at any point and drive the granular skills themselves; when
they do, this orchestrator's job is only to keep the checklist honest.

## Global hard rules (bind every phase)

- NEVER create per-task branches or PRs. Feature slices always run on
  `ft/<issue#>` — app code is never developed directly on `beta` or `main`.
  ONE carve-out (owner decision 2026-07-26): owner-directed micro-edits to
  instruction files and docs (`.claude/**`, `AGENTS.md`, `docs/**` — nothing the
  deployed app executes) may land directly on `beta` as ordinary fast-forward
  commits, skipping the flow. `main` moves only through the ordered
  `beta → main` promotion path after the target-specific final gate; never
  force-push protected branches.
- Carry the terminal release target (`beta` or `main`) in the conversation across
  Build → QC → Ship — nothing persists it to disk. One explicit final
  authorization names the entire consequence; successful target deployment
  checks do not create extra approval gates.
- **≤10 agents TOTAL per fan-out**, whatever any sub-skill's default says.
- Scope freezes at the plan gate **for agent-self-generated ideas only**: mid-build
  work an agent notices on its own is out of scope — drop it, never onto this branch;
  if it matters, the user re-plans it as its own slice later. Findings the owner
  reports during manual verification are NEVER scope creep: implement every one on
  the branch before the ship gate, deferring an item only when the owner explicitly
  says it can wait.
- Planning docs never enter the repo; the issue body + squashed commit message are
  the record; scratch lives in self-gitignored `.feature/` and dies at ship.
- Skill grounding is binding everywhere: the plan grounds each task in the stack skills
  its area needs (via feature-plan's grounding-pack agent); the build session invokes
  those skills as it implements each task.
- Dependency MAJOR upgrades, framework migrations, schema/data migrations → STOP
  and present options; never autonomous.
- Preserve behavior contracts (server-action field names, Supabase auth flows,
  the chat scaffold wiring).

Nothing about a run is persisted: the branch identifies the slice, the issue is its
spec, and the terminal target rides in the conversation. To stop mid-flow, run the
global `/handoff` and resume in a fresh session with `/continue <session-id>`.
Scripts
(`start.sh`, `ship.sh`, `promote.sh`) live in
`.claude/skills/feature/scripts/` and are called by feature-plan and feature-ship.
