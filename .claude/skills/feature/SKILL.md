---
name: feature
description: >-
  Use when the user wants to build, implement, redesign, restructure, or make any
  non-trivial multi-step change to this project's app — anything that needs design
  + planning + a real build, not a one-off edit. Do NOT use for quick questions,
  one-line fixes, pure analysis, or debugging an existing bug.
argument-hint: "[feature description]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
---

# Feature — idea to shipped

The end-to-end workflow for building a feature in this repo (oparax-chirp).

**Core principle:** parallelism is a private implementation detail, never a public
artifact. **ONE issue · ONE feature branch · ONE squashed commit on `dev`.** No
per-task branches. No PRs. No CI / GitHub Actions. The user controls integration.

## Running this skill (READ FIRST — this is what keeps cleanup from being skipped)

1. **Before anything else, create a TodoWrite list with these exact 5 items** — your
   durable anchor (do not collapse or rephrase them):
   1. `Phase 1 — Design approved by user (✋ gate)`
   2. `Phase 2 — Plan approved by user (✋ gate)`
   3. `Phase 3 — Issue + branch ft/<issue#> created (start.sh), built on that one branch`
   4. `Phase 4 — Temp worktrees/branches torn down · /simplify + /code-review · build+browser verified · checklist handed to user (✋ gate)`
   5. `Phase 5 — Squash-merged to dev, pushed, branch deleted, issue closed (✋ gate)`
   You WILL descend into sub-skills (`superpowers:brainstorming`,
   `superpowers:writing-plans`) that each end with their own "you're done / next step
   is X / open a PR" directive. **Ignore those endings.** They are *steps inside this
   workflow*, not the end of it. After each returns, come back to this list and
   continue to the next unchecked item.
2. **YOU are the orchestrator.** Phases 4 (cleanup + QC) and 5 (ship) are MANDATORY
   and owned by THIS skill — they are the steps a naive brainstorm→plan→build run
   skips. Never finish the workflow at a sub-skill's terminal state.
3. **Do NOT invoke** `superpowers:finishing-a-development-branch`,
   `superpowers:requesting-code-review`, or `superpowers:receiving-code-review` —
   those push toward PRs and per-branch structure, which this workflow avoids. The
   `/simplify` and `/code-review` commands in Phase 4 are LOCAL diff reviews and are
   NOT those skills; they must never open a PR, request external review, or create a
   review branch. Ship is the local squash-merge in Phase 5, owned here.

Stop at every ✋ gate and wait for the user. The build (Phases 3–4) is autonomous;
the three gates (design, plan, ship) are user-controlled.

---

## Phase 1 — Design ✋ (approve + iterate)

If invoked as `/feature <description>`, that text arrives as `$ARGUMENTS` — seed the
brainstorming with it. If `$ARGUMENTS` is empty, brainstorm from the conversation.

Invoke `superpowers:brainstorming` to explore intent and shape the design, going
back and forth until the user approves. Write the agreed design to
`docs/superpowers/specs/YYYY-MM-DD-<slug>.md`.

When brainstorming signals done / hands off to writing-plans, that is **Phase 1→2 of
this skill, not the end.** Tick Phase 1 on your todo list and continue.

GATE: do not proceed until the user explicitly approves the design.

## Phase 2 — Plan ✋ (approve)

Invoke `superpowers:writing-plans` to produce a bite-sized, no-placeholder plan with
a task **checklist**; save to `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`.

When writing-plans offers its execution handoff (subagent-driven vs inline), **do not
treat that as the end** — its execution belongs to Phase 3 here, on ONE branch. Tick
Phase 2 and continue.

GATE: do not proceed until the user approves the plan. The issue is created **after**
this gate (Phase 3 kickoff), so a rejected plan never leaves an orphan issue.

## Phase 3 — Parallel build (one branch)

- **Kickoff — creates the issue AND the one branch** (from the repo root):
  ```bash
  ${CLAUDE_SKILL_DIR}/scripts/start.sh "<feature name>" docs/superpowers/plans/YYYY-MM-DD-<slug>.md
  ```
  It cuts from a clean `dev`, opens the issue, and creates the branch `ft/<issue-number>`
  (the issue number only — never the title or a slug). **Capture the issue number it
  prints** (the script's only stdout line); it drives Phase 5.
  (Issues are fine — only PRs and CI are forbidden.)
- Split the plan into **independent tracks** (groups of files that don't overlap).
- If 2+ independent tracks: use `superpowers:dispatching-parallel-agents` to run
  them concurrently, each subagent in an isolated worktree off this branch
  (`superpowers:using-git-worktrees`). One track or low isolation → build inline
  with `superpowers:subagent-driven-development`.
- Every change **converges back into `ft/<issue#>`**. Subagents and worktrees
  NEVER push their own branch and NEVER open PRs.
- Keep `pnpm build` green as tracks land (Biome auto-formats edits via the global hook). Tick Phase 3 and continue.

## Phase 4 — Converge + QC ✋ (MANDATORY — the step naive runs skip)

1. Merge every track's commits into `ft/<issue#>`, then **tear down all temp worktrees
   and return to this branch in the main repo dir** by running, from the repo root:
   `${CLAUDE_SKILL_DIR}/scripts/cleanup-tracks.sh`
   It runs silently; then confirm with `git worktree list` (only the main dir) and
   `git branch`, deleting any leftover temp track branches (`git branch -D <name>`).
2. Run `/simplify`, then `/code-review`, over the feature diff. Fix real findings.
3. Run `pnpm lint` (Biome) and fix the real errors it reports — formatting is already
   applied continuously by the global Biome edit hook, so this step is only the
   judgment-level lint findings Claude must reason about. If the feature changed
   user-facing pages/components, optionally run `vercel:react-best-practices` on them
   (or delegate Core Web Vitals work to the `vercel:performance-optimizer` agent).
4. Verify with `superpowers:verification-before-completion`: `pnpm build` + a
   `browser-agent` check of the changed pages (no test runner in this repo, per
   AGENTS.md). Formatting is handled continuously by the global Biome edit hook.
5. GATE: **STOP. Post the verification checklist to the user and ask, in plain words,
   "Ready to ship, or are there bugs to fix first?"** Do NOT tick Phase 4 until the
   user answers, and **NEVER infer "ship it" from a green build** — a passing
   build/lint is not permission to ship. Iterate on bugs with them **on this one
   branch**; only the user's explicit "ship it" advances to Phase 5.

## Phase 5 — Ship ✋ (only when the user says "ship it")

From the repo root, on branch `ft/<issue#>`, run the ship script — it squash-merges
to dev as one clean commit, pushes, deletes the branch, and closes the issue:

```bash
${CLAUDE_SKILL_DIR}/scripts/ship.sh <issue#> "<feature summary>"
```

The script refuses to run if temp worktrees remain (Phase 4 must have cleaned up first)
or if you're not on `ft/<issue#>`. Tick Phase 5. The workflow is complete only after
this phase — not before.

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
- End commit messages with the trailer
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
  (or match the most recent trailer in `git log` if it differs).
