---
name: feature-build
description: >-
  Phase 2 of the feature flow, standalone: implement the approved plan from the
  ft/N issue (or a directly-stated small build) with parallel implementers and
  per-task review. Use when the user says /feature-build, "build the plan",
  "implement the tasks", or "just build X" mid-flight on a feature branch.
argument-hint: "[issue# | what to build]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Build — autonomous, parallel by structure

**Source of tasks:** the current `ft/<issue#>` issue body (read via `gh issue view`)
if it exists; otherwise the user's direct instruction is the plan (small-build mode
— still one branch, still no scope creep beyond what they said).

## Preflight

- **Dependency preflight before any task:** `pnpm install`; an unmet-peer warning on
  a feature-relevant package is a BLOCKER — stop and present (proven in #39: a green
  build hid a worker crash).
- **Mirror tasks into TaskCreate**, dependencies via `addBlockedBy`; the task graph
  decides concurrency.

## Execution — implementer by default

- Every plan task → dispatch **`implementer`** (`.claude/agents/implementer.md`)
  once per task — **including a single task** (its model pin is the point: the
  session model plans and reviews, the implementer's cheaper pinned model
  writes the code). Unblocked tasks with disjoint files dispatch ALL in one
  message, same working tree. NO worktree isolation (it branches from the
  default branch).
- **Inline in this session** ONLY for trivial mechanical edits the user directly
  dictated (small-build mode one-liners where writing the brief would exceed
  the diff).
- Live mutual negotiation needed → **agent team** (disjoint file assignment; watch
  task-status lag).
- Massive mechanical sweep (rare) → **Workflow**, ≤10 agents TOTAL.

## Briefs and reports

Each dispatched task gets `.feature/task-<N>-brief.md` (plan text verbatim + prior
tasks' interfaces + report path). Thin dispatch prompt: scene line, brief path, the
`.claude/rules/` skills that task must invoke, report contract. The brief is the
implementer's ONLY requirements source. Reports are **deviations-only**: the
implementer writes `.feature/task-<N>-report.md` only when it deviated from the brief
or noticed out-of-scope work (what + why); no report file means implemented-as-briefed.

## Review

As each implementer returns, dispatch `task-reviewer` with brief path, commit range,
and the report path if one exists — it verifies the diff, never trusts the report (an
absent report is itself a claim the diff must confirm). Fix findings before dependents
unblock. Everything converges into the feature branch as ordinary commits.

## Hard rules

- Agents never push / branch / open PRs.
- Implementers write code only — no builds or lint (that's /feature-qc).
- ≤10 agents total per fan-out.
- Mid-flight new scope goes to the issue's Deferred list or a new GitHub issue
  (plain title, `--label backlog` — `backlog,agent` if the agent surfaced it),
  scribing the user's deferral, never onto the branch.
- Skill grounding is binding: name the area's `.claude/rules/` skills in every dispatch.
