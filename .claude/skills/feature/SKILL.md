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

This skill only conducts; the four phase skills do the work. A run is **ONE issue ·
ONE feature branch · ONE squashed commit on `beta`.** `beta` and `main` are
integration and promotion destinations, never feature-development branches. No PRs,
no CI. Parallelism is a private implementation detail.

**Track phases with TaskCreate** — one task each, ticked as each finishes; the flow
is complete only when the last ticks:

1. `Plan approved (✋ gate) + issue opened + ft/<issue#> cut` → invoke **`feature-plan`**
2. `Built on ft/<issue#>` → invoke **`feature-build`**
3. `QC: cross-model reviews + browser journeys · lint · build · doc sync` → invoke **`feature-qc`**
4. `Owner feedback implemented + shipped via ship.sh (✋)` → invoke **`feature-ship`**

Stop at every ✋ gate and wait for the user's explicit words — grounding never skips
gates. Between phases, report state in one line and continue unless the user
redirects. The user may jump out at any point and drive the granular skills
themselves; when they do, this orchestrator's job is only to keep the checklist
honest.

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
- Skill grounding is binding everywhere: the plan (from plan-synth) grounds each task
  in the stack skills its area needs; dispatched agents must be told which skills to
  invoke.
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
