---
name: feature-build
description: >-
  Phase 2 of the feature flow, standalone: implement the approved plan from the
  ft/N issue (or a directly-stated small build) inline, dispatching implementers
  only when the task graph offers real concurrency. Use when the user says
  /feature-build, "build the plan", "implement the tasks", or "just build X"
  mid-flight on a feature branch.
argument-hint: "[issue# | what to build]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(pnpm *)
# inherit, not a pin: this phase now writes code in the session, so the session's model IS the
# implementation model and the owner sets it deliberately (drop to sonnet or haiku for a
# mechanical slice). A pin here would silently override that choice.
model: inherit
effort: medium
---

# Build — inline by default, parallel when the graph earns it

**Source of tasks:** the current `ft/<issue#>` issue body (read via `gh issue view`)
if it exists; otherwise the user's direct instruction is the plan (small-build mode
— still one branch, still no scope creep beyond what they said).

## Preflight

- **Dependency preflight before any task:** run `pnpm install --frozen-lockfile`; an
  unmet-peer warning on a feature-relevant package is a BLOCKER — stop and present
  (proven in #39: a green build hid a worker crash).
- **Mirror tasks into TaskCreate**, dependencies via `addBlockedBy`. The graph is what
  decides concurrency below, so get the edges right. Identify every repository-mutating
  prerequisite later tasks need (stock shadcn components, code generation, a migration)
  and make it its own task with its consumers blocked on it. That ordering matters
  regardless of who executes it — a consumer that runs before its prerequisite fails the
  same way whether a session or an agent wrote it.

## Execution — inline first

**Default: implement the task yourself, in this session.** The plan is the spec, the
session already holds the full context of it, and a subagent cannot see any of that —
its brief has to carry everything, which is why real runs produced **204KB of briefs
across 27 tasks** (7.5KB average, one at 19.8KB). That is the cost of the subagent
boundary, and it is only worth paying when something genuinely crosses it in parallel.

**Dispatch `implementer` only when the graph offers real concurrency: three or more
tasks unblocked RIGHT NOW with disjoint file sets.** Then send them in one message,
same working tree, no worktree isolation. Below that threshold there is no wall-clock
to win, and briefing costs more than doing.

Measured, so it is not a matter of taste: across three runs, dispatch was irregular
rather than cleanly parallel — five tasks once fired within 34 seconds, but others went
out serially 5–15 minutes apart, with a 38-minute gap between two consecutive
dispatches. Per-task wall time was 5, 7, and 13 minutes. The concurrency the brief tax
was buying often was not there.

Other routes:

- **Massive mechanical sweep** (rare) → Workflow, ≤10 agents TOTAL.
- **Not agent teams.** No isolation of any kind — the documented guidance is to
  partition files by hand, which the task graph already does — and they are uncapped.
  Disjoint tasks have nothing to negotiate.

**A task needing MCP is still an ordinary task.** `implementer` carries no `tools:`
allowlist, so Supabase migrations, type regeneration, and Vercel env/config are normal
work whether you do them inline or dispatch them. A `BLOCKED` return naming a missing
tool is a re-dispatch signal, never a reason to silently absorb the task.

## Committing — checkpoints, not one per task

**Commit when a typecheck gate goes green**, not after every task. That is a known-good
restore point; a per-task commit is ceremony.

Feature branches are **squash-merged at ship** (`ship.sh` runs `git merge --squash`), so
none of these commits reach `dev`/`beta`/`main` — the whole slice lands as one commit.
They are working state for in-flight recovery, not history for future readers, so
optimise them for "somewhere to fall back to" and nothing else. Expect a handful per
slice.

**When you do dispatch a batch, the SESSION commits — never the implementers.** `git add`
stages by PATH from one shared index, so two agents committing concurrently interleave
and one sweeps the other's files into its commit. That happened on a real run between two
tasks with verifiably disjoint files: **disjoint files do not protect you, because the
index is global.** Working inline this cannot arise — one process, one index — which is
why the discipline only binds the dispatch path.

## Briefs and reports — dispatch only

A dispatched task gets `.feature/task-<N>-brief.md` (plan text verbatim + prior tasks'
interfaces + reserved report path) and a thin dispatch prompt: scene line, brief path,
the skills the plan names for that task, report contract. The brief is the implementer's
ONLY requirements source. Working inline, skip all of it — you already have the context
the brief exists to reconstruct.

Reports are **exception-only**: a deviation, blocker, failed check, non-obvious decision
a reviewer must verify, or out-of-scope finding. No report file means
implemented-as-briefed. (Real runs produced 27 reports for 27 tasks, so this contract has
not been holding — hold it.) Return messages stay under 10 lines: status, the paths
changed, a short summary.

## Review — typecheck always, deep review only where it propagates

After each task or batch, run `pnpm exec tsc --noEmit` and confirm no error line names
the files just written. This catches the interface breaks a bad task propagates to
dependents — a wrong signature, a missing export, a collapsed generic (all real; the last
was a #59 build-breaker) — in seconds. The branch as a whole may not typecheck until
later tasks land (a leaf can reference a not-yet-written module); only the files just
touched must be clean. **Green here is also the commit checkpoint above.**

Dispatch **`task-reviewer`** only when a finished task has tasks **still unbuilt that
depend on it** and its interface is load-bearing for them.

What it buys over QC is **timing, not detection**. QC's fan-out is far more thorough and
will find a foundational bug regardless — but it runs after the whole branch is built, by
which point N tasks have been written against the broken interface and one fix becomes
N+1. The reviewer's only job is catching it while the blast radius is one task; on the run
that used it, it caught a missing `revalidatePath` scope two dependents had already
imported verbatim.

If nothing downstream consumes the task, **skip it and let QC work**. A reviewer there is
per-task review by another name, which this flow already measured and rejected (on #59 the
QC fan-out caught 14 issues including a HIGH bug every per-task review had passed, while
sitting on the critical path).

## Hard rules

- Never push, never branch, never open PRs.
- No builds or lint here — that is `/feature-qc`.
- ≤10 agents total per fan-out.
- Mid-flight new scope stays off the branch — drop it. Don't self-initiate scope; a
  deferral the user names is a future slice, not tracked here.
- Skill grounding is binding: name the skills the plan grounds each task in — in the
  dispatch prompt when dispatching, and by actually invoking them when working inline.

After all tasks and any foundational reviews pass, the branch is ready for QC. If the
session is stopping here rather than continuing into `/feature-qc`, run `/handoff` so a
fresh session can resume with `/continue <session-id>`.
