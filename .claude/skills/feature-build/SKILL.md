---
name: feature-build
description: >-
  Phase 2 of the feature flow, standalone: implement the approved plan from the
  ft/N issue (or a directly-stated small build) with parallel implementers, a fast
  per-task typecheck gate, and deep review reserved for the foundational task. Use
  when the user says /feature-build, "build the plan", "implement the tasks", or
  "just build X" mid-flight on a feature branch.
argument-hint: "[issue# | what to build]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(pnpm *)
model: opus
effort: medium
---

# Build — autonomous, parallel by structure

**Source of tasks:** the current `ft/<issue#>` issue body (read via `gh issue view`)
if it exists; otherwise the user's direct instruction is the plan (small-build mode
— still one branch, still no scope creep beyond what they said).

## Preflight

- Read existing state for the exact current branch with `state.mjs show`. When it
  exists, update it to phase `building` and gate `implement`; never initialize
  guessed state here. A standalone small build without state may continue.
- **Dependency preflight before any task:** the SESSION runs
  `pnpm install --frozen-lockfile`; an unmet-peer warning on a feature-relevant
  package is a BLOCKER — stop and present (proven in #39: a green build hid a
  worker crash). Dependency installation is coordination, not an implementer task.
- **Mirror tasks into TaskCreate**, dependencies via `addBlockedBy`; the task graph
  decides concurrency. Before dispatch, identify every repository-mutating
  prerequisite needed by later tasks (for example, adding stock shadcn components
  or running code generation). Make each prerequisite an explicit foundational
  implementer task, assign every file it may create or update, and block all
  consumers on it. The SESSION never performs these setup writes itself.

## Execution — implementer by default

- Every plan task → dispatch **`implementer`** (`.claude/agents/implementer.md`)
  once per task — **including a single task** (its model pin is the point: the
  session model plans and reviews, the implementer's cheaper pinned model
  writes the code). Unblocked tasks with disjoint files dispatch ALL in one
  message, same working tree. NO worktree isolation (it branches from the
  default branch).
- **Inline in this session** for any trivial mechanical task where writing the brief
  would exceed the diff — a rename, a one-line signature change, a mechanical sweep of
  a few call sites — plan task or user-dictated alike. The implementer's model pin pays
  off on real code; brief + dispatch + gate around a three-line edit is pure latency.
  When genuinely unsure whether a task is trivial, dispatch the implementer.
- Live mutual negotiation needed → **agent team** (disjoint file assignment; watch
  task-status lag).
- Massive mechanical sweep (rare) → **Workflow**, ≤10 agents TOTAL.
- Do not add a second background coordinator. Dependency installation, task-graph
  updates, dispatch, and per-wave typecheck gates stay in this SESSION; implementers
  own code and repository-mutating setup.

## Briefs and reports

Each dispatched task gets `.feature/task-<N>-brief.md` (plan text verbatim + prior
tasks' interfaces + reserved report path). Thin dispatch prompt: scene line, brief
path, the skills the plan names for that task, report contract. The brief is the
implementer's ONLY requirements source. Reports are **exception-only**: the
implementer writes `.feature/task-<N>-report.md` only for a deviation, blocker,
failed check, non-obvious decision a reviewer must verify, or out-of-scope finding
(what + why). No report file means implemented-as-briefed. Its return message stays
under 10 lines: status, short commit SHAs, and at most a short summary; put necessary
detail in the exception report rather than the dispatch result.

## Review — typecheck every task, deep-review only the foundational one

As a wave's implementers return, the SESSION (not the implementer) runs a fast
**typecheck gate**: `pnpm exec tsc --noEmit`, then confirm no error line names any of
that wave's own files. This catches the interface breaks a bad task propagates to
dependents — a wrong signature, a missing export, a collapsed generic (all real; the
last was a #59 build-breaker) — in seconds, not a multi-minute review. The branch as a
whole may not typecheck until later waves land (a leaf task can reference a not-yet-
written module) — that is expected; only the wave's OWN files must be clean before its
dependents unblock.

Dispatch a full **`task-reviewer`** (brief path, commit range, report path if any) ONLY
for the **foundational task(s)** — the one or two at the root of the dependency graph
that the most downstream tasks build on. A subtle bug in a load-bearing interface is
expensive to unwind after four tasks have built on it, so it earns a deep pre-dependency
review; a leaf task does not. Every other task's deep correctness is caught by the **QC
review fan-out** (`/feature-qc`), which sees the whole branch diff and is the effective
net — per-task review of leaf tasks duplicates it more weakly while sitting on the
critical path (measured on #59: the fan-out caught 14 issues, including a HIGH bug that
every per-task review had passed). Fix any typecheck failure or foundational-review
finding before dependents unblock. Everything converges into the feature branch as
ordinary commits.

## Hard rules

- Agents never push / branch / open PRs.
- Implementers write code only — no builds or lint (that's /feature-qc).
- ≤10 agents total per fan-out.
- Mid-flight new scope stays off the branch — drop it. Don't self-initiate scope; a
  deferral the user names is a future slice, not tracked here.
- Skill grounding is binding: name the skills the plan grounds each task in, in every dispatch.

After all tasks and foundational reviews pass, update existing state to phase
`built` and gate `qc`. This intentionally marks an older prose handoff stale until
`/feature-handoff` captures the new checkpoint.
