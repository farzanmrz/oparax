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
disable-model-invocation: true
---

# /feature-build — build (autonomous, parallel by structure)

**Source of tasks:** the current `ft/<issue#>` issue body (read via `gh issue view`)
if it exists; otherwise the user's direct instruction is the plan (small-build mode
— still one branch, still no scope creep beyond what they said).

- **Dependency preflight before any task:** `pnpm install`; an unmet-peer warning on
  a feature-relevant package is a BLOCKER — stop and present (proven in #39: a green
  build hid a worker crash).
- **Mirror tasks into TaskCreate**, dependencies via `addBlockedBy`; the task graph
  decides concurrency.
- **Execution — smallest shape that fits:**
  - 1–2 tasks or tightly coupled → inline in this session.
  - 3+ unblocked with disjoint files → dispatch `implementer`
    (`.claude/agents/implementer.md`) once per task, ALL in one message, same
    working tree. NO worktree isolation (it branches from the default branch).
  - Live mutual negotiation needed → agent team (disjoint file assignment; watch
    task-status lag).
  - Massive mechanical sweep (rare) → Workflow, ≤10 agents TOTAL.
- **Briefs:** each dispatched task gets `.feature/task-<N>-brief.md` (plan text
  verbatim + prior tasks' interfaces + report path). Thin dispatch prompt: scene
  line, brief path, the `.claude/rules/` skills that task must invoke, report
  contract. The brief is the implementer's ONLY requirements source.
- **As each implementer returns**, dispatch `task-reviewer` with brief path, report
  path, commit range — it verifies the diff, never trusts the report. Fix findings
  before dependents unblock.
- Everything converges into the feature branch as ordinary commits.

Hard rules: agents never push / branch / open PRs; implementers write code only (no
builds or lint — that's /feature-qc); ≤10 agents total per fan-out; mid-flight new
scope goes to the issue's Deferred list or a new `triage: <item>` GitHub issue
(scribing the user's deferral), never onto the branch. Skill grounding is binding:
name the area's `.claude/rules/` skills in every dispatch.
