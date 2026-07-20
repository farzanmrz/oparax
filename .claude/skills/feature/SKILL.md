---
name: feature
description: >-
  The end-to-end feature flow: plan → build → QC → triage+ship, run as one guided
  sequence. Use when the user wants a full slice built from idea to shipped commit.
  For a single phase, use the granular skills directly: /feature-plan,
  /feature-build, /feature-qc, /feature-ship (or /simplify, /code-review,
  /feature-lint for individual QC passes).
argument-hint: "[feature description]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
disable-model-invocation: true
---

# Idea to shipped — the orchestrator

This skill only conducts; the four phase skills do the work. **ONE issue · ONE
feature branch · ONE squashed commit on `dev`.** No PRs, no CI. Parallelism is a
private implementation detail.

**Track phases with TaskCreate** — one task each, ticked as each finishes; the flow
is complete only when the last ticks:

1. `Plan approved + issue/branch cut (✋ gate)` → invoke **`feature-plan`**
2. `Built on ft/<issue#>` → invoke **`feature-build`**
3. `QC: reviews · lint · build · boot smoke` → invoke **`feature-qc`**
4. `Feedback triaged (✋) + shipped via ship.sh (✋)` → invoke **`feature-ship`**

Stop at every ✋ gate and wait for the user's explicit words — grounding never skips
gates. Between phases, report state in one line and continue unless the user
redirects. The user may jump out at any point and drive the granular skills
themselves; when they do, this orchestrator's job is only to keep the checklist
honest.

## Global hard rules (bind every phase)

- NEVER create per-task branches or PRs; never push main/beta; ship = dev only.
- **≤10 agents TOTAL per fan-out**, whatever any sub-skill's default says.
- Scope freezes at the plan gate; mid-build ideas → the single living backlog issue
  via `.claude/skills/feature/scripts/backlog-add.sh` (never a new per-item issue),
  ONLY to scribe the user's deferrals — never self-initiated. Plan Deferred migrates
  into the same backlog at ship. See AGENTS.md → the single-living-backlog rule.
- Planning docs never enter the repo; the issue body + squashed commit message are
  the record; scratch lives in self-gitignored `.feature/` and dies at ship.
- Skill grounding is binding everywhere: the plan (from plan-synth) grounds each task
  in the stack skills its area needs; dispatched agents must be told which skills to
  invoke and which `.claude/rules/` guards to read.
- Dependency MAJOR upgrades, framework migrations, schema/data migrations → STOP
  and present options; never autonomous.
- Preserve behavior contracts (server-action field names, Supabase auth flows,
  the chat scaffold wiring) — see AGENTS.md + `.claude/rules/`.

Scripts (`start.sh`, `ship.sh`) live in `.claude/skills/feature/scripts/` and are
called by feature-plan and feature-ship respectively.
