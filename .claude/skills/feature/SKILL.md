---
name: feature
description: >-
  Take a non-trivial feature or change from idea to shipped in THIS project.
  Orchestrates the full lifecycle: brainstorm the design (you approve) → write
  and approve a plan → build it in parallel on ONE feature branch off dev →
  /simplify + /code-review → converge for your verification and bug back-and-forth
  → on "ship it", squash-merge to dev locally and close the issue. Use when the
  user wants to build, implement, redesign, restructure, or make any multi-step
  change to the app. Do NOT use for quick questions, one-line fixes, pure
  analysis, or debugging an existing bug.
---

# Feature — idea to shipped

The end-to-end workflow for building a feature in this repo (oparax-chirp).

**Core principle:** parallelism is a private implementation detail, never a public
artifact. **ONE issue · ONE feature branch · ONE squashed commit on `dev`.** No
per-task branches. No PRs. No CI / GitHub Actions. The user controls integration.

## Running this skill (READ FIRST — this is what keeps cleanup from being skipped)

1. **Before anything else, create a TodoWrite list of all 5 phases below.** This is
   your durable anchor. You WILL descend into sub-skills (`brainstorming`,
   `writing-plans`) that each end with their own "you're done / next step is X /
   open a PR" directive. **Ignore those endings.** They are *steps inside this
   workflow*, not the end of it. After each one returns, come back to this todo
   list and continue to the next unchecked phase.
2. **YOU are the orchestrator.** Phases 4 (cleanup + QC) and 5 (ship) are MANDATORY
   and owned by THIS skill — they are the steps a naive brainstorm→plan→build run
   skips. Never finish the workflow at a sub-skill's terminal state.
3. **Do NOT invoke** `superpowers:finishing-a-development-branch`,
   `requesting-code-review`, or `receiving-code-review` — those push toward PRs and
   per-branch structure, which this workflow explicitly avoids. Ship is the local
   squash-merge in Phase 5, owned here.

Stop at every ✋ gate and wait for the user. The build (Phases 3–4) is autonomous;
the three gates (design, plan, ship) are user-controlled.

---

## Phase 1 — Design ✋ (approve + iterate)

Invoke `superpowers:brainstorming` to explore intent and shape the design, going
back and forth until the user approves. Write the agreed design to
`docs/superpowers/specs/YYYY-MM-DD-<slug>.md`.

When brainstorming signals done / hands off to writing-plans, that is **Phase 1→2 of
this skill, not the end.** Tick Phase 1 on your todo list and continue.

GATE: do not proceed until the user explicitly approves the design.

## Phase 2 — Plan ✋ (approve)

Invoke `superpowers:writing-plans` to produce a bite-sized, no-placeholder plan with
a task **checklist**; save to `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`. Create
**ONE** GitHub issue (the epic) whose body is the plan + checklist.

When writing-plans offers its execution handoff (subagent-driven vs inline), **do not
treat that as the end** — its execution belongs to Phase 3 here, on ONE branch. Tick
Phase 2 and continue.

GATE: do not proceed until the user approves the plan.

## Phase 3 — Parallel build (one branch)

- Create ONE branch off dev:
  `git checkout dev && git pull --ff-only && git checkout -b ft/<issue#>-<slug>`
- Split the plan into **independent tracks** (groups of files that don't overlap).
- If 2+ independent tracks: use `superpowers:dispatching-parallel-agents` to run
  them concurrently, each subagent in an isolated worktree off this branch
  (`superpowers:using-git-worktrees`). One track or low isolation → build inline
  with `superpowers:subagent-driven-development`.
- Every change **converges back into `ft/<issue#>-<slug>`**. Subagents and worktrees
  NEVER push their own branch and NEVER open PRs.
- Keep `pnpm build` + `pnpm lint` green as tracks land. Tick Phase 3 and continue.

## Phase 4 — Converge + QC ✋ (MANDATORY — the step naive runs skip)

1. Merge every track's commits into `ft/<issue#>-<slug>`, then **tear down all temp
   worktrees and temp branches and return to this branch in the main repo dir**:
   `git worktree remove <path>` for each, `git branch -D <temp>` for each,
   then `git worktree prune`. Confirm `git worktree list` shows only the main dir
   and `git branch` shows no leftover temp branches.
2. Run `/simplify`, then `/code-review`, over the feature diff. Fix real findings.
3. Verify with `superpowers:verification-before-completion`: `pnpm build` +
   `pnpm lint` + a `browser-agent` check of the changed pages (no test runner in
   this repo, per AGENTS.md).
4. GATE: **STOP.** Hand the user a verification checklist. Iterate on bugs with them
   **on this one branch** until they say "ship it." Tick Phase 4.

## Phase 5 — Ship ✋ (only when the user says "ship it")

Squash the branch onto dev as one clean commit, push, delete the branch, close issue:

```bash
git add -A && git commit -m "wip" || true          # capture any final tweaks
git checkout dev && git pull --ff-only
git merge --squash ft/<issue#>-<slug>              # fold all work into one staged change
git commit -m "<feature summary>"                  # ONE clean commit on dev (user's message)
git push origin dev
git branch -D ft/<issue#>-<slug>                   # delete the local feature branch
gh issue close <issue#>
```

Tick Phase 5. The workflow is complete only after this phase — not before.

---

## Hard rules (never break)

- NEVER create per-task branches or PRs. ONE feature branch only.
- NEVER open a PR or rely on GitHub Actions / CI. Quality = local `/simplify` +
  `/code-review` in Phase 4.
- NEVER push to `main` or `beta`. Ship target is `dev` only.
- ALWAYS keep the TodoWrite phase list as your anchor; never end at a sub-skill's
  terminal state. Cleanup (Phase 4) and ship (Phase 5) are non-skippable.
- Preserve the repo's behavior contracts (server-action field `name`s, the
  auth/connect-x guards + `?next=`, the run → preview → save → post/redraft
  pipeline) — see AGENTS.md.
- End commit messages with the Co-Authored-By trailer the user uses.
