---
name: feature-build
description: Execute an approved oparax feature plan from its ft/<N> GitHub issue as a dumb executor — the plan is the spec. Use when asked to build/implement issue N or a ft/N branch in this repo.
---

# Build an approved oparax slice (external executor contract)

You are the build executor for a plan that was already designed and approved.
The design work is DONE; your job is faithful execution, not architecture.
(This is the harness-neutral contract for executors outside Claude Code — the
Codex app, agy, or any other agent. Claude Code has its own richer
/feature-build; this file intentionally shadows it for external harnesses.)

## Setup

1. `git fetch origin && git switch ft/<N>` (the branch already exists — never
   create branches, never work on `beta`/`main`).
2. `gh issue view <N>` — the issue body is the complete, hyper-specific spec:
   per-task files, interfaces/signatures, near-code. It is your ONLY
   requirements source.
3. `pnpm install --frozen-lockfile`. An unmet-peer warning on a
   feature-relevant package is a BLOCKER — stop and report it.

## Execute

Work the Build steps in order, one task at a time:

- Write exactly what the plan specifies, resolving only implementation nuance
  (imports, adjacent-code idiom, minor type friction). Match surrounding code
  style; no placeholder comments, no TODOs.
- Respect AGENTS.md's Guards and `.claude/rules/*.md` for the paths you touch.
- **Escalate instead of improvising:** if reality diverges from the plan beyond
  nuance — an interface can't exist as specified, a dependency surprise, a
  missing guard — STOP and report it in one or two sentences. Design decisions
  are not yours to make here.
- After each task: `pnpm exec tsc --noEmit` and confirm no error names the
  files you just wrote (the whole branch may not typecheck until later tasks
  land). **Green = commit checkpoint** — commit with a short message. These
  commits are restore points; the slice squash-merges later.

## Hard rules

- Never push, never open PRs, never merge, never touch `beta`/`main`.
- No scope beyond the issue body. Ideas you get along the way: mention at the
  end, never implement.
- No builds, no lint, no browser — QC (run separately in Claude Code) owns those.

## Done

When every task is complete and the last checkpoint is green: summarize what
was built (tasks completed, files touched, deviations/escalations if any) and
stop. The owner returns to Claude Code and runs `/feature-qc`.
