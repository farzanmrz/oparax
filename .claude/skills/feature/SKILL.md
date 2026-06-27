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

**Track these six phases as a persistent, tickable checklist** — your durable anchor.
Use whatever task tool this environment exposes (`TaskCreate`/`TaskUpdate` here,
`TodoWrite` elsewhere); create one item per phase and tick it as you finish. This is
the ONLY place the task tool is called out — every "create a TodoWrite / tick the
phase" instruction elsewhere just means update this same list.

1. `Phase 1 — Design approved by user (✋ gate)`
2. `Phase 2 — Plan approved by user (✋ gate)`
3. `Phase 3 — Issue + branch ft/<issue#> created (start.sh), built on that one branch`
4. `Phase 4 — Temp worktrees torn down · /simplify + /code-review · lint-resolve (biome + residual fixes) + build verified`
5. `Phase 5 — Manual-test feedback triaged · only "fix now" items built on this branch (✋ gate)`
6. `Phase 6 — Squash-merged to dev, pushed, branch deleted, issue closed (✋ gate)`

**YOU are the orchestrator.** You WILL descend into sub-skills (`superpowers:brainstorming`,
`superpowers:writing-plans`, `subagent-driven-development`, `executing-plans`) that each
end with their own "you're done / open a PR / next step is X" directive. **Those endings
are steps inside this workflow, not the end of it.** When a sub-skill returns, come back to
this checklist and continue to the next unticked phase. Phases 4–6 (cleanup, triage, ship)
are MANDATORY and owned by THIS skill — they are exactly what a naive brainstorm→plan→build
run skips. Never finish at a sub-skill's terminal state.

**Do NOT invoke** `superpowers:finishing-a-development-branch`,
`superpowers:requesting-code-review`, or `superpowers:receiving-code-review` — those push
toward PRs and per-branch structure this workflow avoids. The `/simplify` and `/code-review`
commands in Phase 4 are LOCAL diff reviews, not those skills; they must never open a PR,
request external review, or create a review branch. Ship is the local squash-merge in Phase 6.

Stop at every ✋ gate and wait for the user. The build (Phases 3–4) is autonomous; the four
gates (design, plan, triage, ship) are user-controlled.

---

## Phase 1 — Design ✋ (approve + iterate)

If invoked as `/feature <description>`, that text arrives as `$ARGUMENTS` — seed the
brainstorming with it. If `$ARGUMENTS` is empty, brainstorm from the conversation.

Invoke `superpowers:brainstorming` to explore intent, weigh approaches, and agree the
direction with the user — the human-in-the-loop part: the questions, the trade-offs, the
WHAT. Brainstorming writes and saves the spec itself (you don't restate its path); present
it and iterate.

The spec MUST end with an explicit **In scope (this slice)** / **Deferred (not now)** split
— brainstorming should actively route every "while we're here" / snowball idea to *Deferred*
rather than absorbing it. A short, well-cut scope section now is what stops the build from
sprawling later.

**One active spec per folder.** The specs folder holds exactly one file at a time. When the
new spec lands, delete any older spec in that folder, or fold its still-relevant content
into the new one — never leave two. This is what keeps the folder from bloating.

When brainstorming hands off to writing-plans, that is **Phase 1→2 of this skill, not the
end.** Tick Phase 1 and continue.

GATE: do not proceed until the user explicitly approves the design. Make the scope cut part
of that approval — show the In-scope / Deferred split and confirm it's right, so scope is a
deliberate decision, not a default.

## Phase 2 — Plan ✋ (approve)

Feed the approved design through `superpowers:writing-plans` to produce the canonical
bite-sized, no-placeholder plan with a task **checklist**. Writing-plans saves the plan
itself (you don't restate its path).

**One active plan per folder.** Same rule as the spec: when the new plan lands, delete any
older plan in that folder or merge its still-relevant content in — only one file survives.

When writing-plans offers its execution handoff (subagent-driven vs inline), **that is not
the end** — its execution belongs to Phase 3 here, on ONE branch. Tick Phase 2 and continue.

GATE: do not proceed until the user approves the plan. The issue is created **after** this
gate (Phase 3 kickoff), so a rejected plan never leaves an orphan issue.

## Phase 3 — Parallel build (one branch)

- **Kickoff — creates the issue AND the one branch** (from the repo root):
  ```bash
  ${CLAUDE_SKILL_DIR}/scripts/start.sh "<feature name>" docs/superpowers/plans/<plan-file>.md
  ```
  It cuts from a clean `dev`, opens the issue, and creates the branch `ft/<issue-number>`
  (the issue number only — never the title or a slug). **Capture the issue number it prints**
  (the script's only stdout line); it drives Phase 6. (Issues are fine — only PRs and CI are
  forbidden.)
- **Commit the planning docs first.** The spec + plan are still *untracked* when `start.sh`
  cuts the branch (so they slip past its clean-tree check and ride along); once on
  `ft/<issue#>`, commit them as the branch's first commit so they're version-controlled and
  visibly evolve across the build. They are **branch-local scaffolding** — Phase 6's `ship.sh`
  strips them, so they never land on `dev`.
- Split the plan into **independent tracks** (groups of files that don't overlap).
- If 2+ independent tracks: use `superpowers:dispatching-parallel-agents` to run them
  concurrently, each subagent in an isolated worktree off this branch
  (`superpowers:using-git-worktrees`). One track or low isolation → build inline with
  `superpowers:subagent-driven-development`.
- Every change **converges back into `ft/<issue#>`**. Subagents and worktrees NEVER push
  their own branch and NEVER open PRs.
- **Tracks only write code.** They do NOT build, lint, or format — all verification and
  formatting is centralized in Phase 4, so code lands unformatted and is normalized once.
- **Ignore mid-session LSP diagnostics** (`<new-diagnostics>` blocks) while tracks are in
  flight: a subagent's in-progress edit produces stale "cannot find module" / type errors
  that are NOT ground truth. The only authority is a clean `pnpm build` on the committed
  tree, checked once in Phase 4. Tick Phase 3 and continue.

## Phase 4 — Converge + QC (MANDATORY — the step naive runs skip)

1. Merge every track's commits into `ft/<issue#>`, then **tear down all temp worktrees and
   return to this branch in the main repo dir**, from the repo root:
   `${CLAUDE_SKILL_DIR}/scripts/cleanup-tracks.sh`
   It runs silently; confirm with `git worktree list` (only the main dir) and `git branch`,
   deleting any leftover temp track branches (`git branch -D <name>`).
2. **Now — and only now — run the full-diff QC once, over every track's combined changes on
   `ft/<issue#>`.** This is a final gate on purpose, not per-track: `/simplify` and
   `/code-review` read the *whole* feature diff, so a track that finished first is reviewed
   together with the last. In order:
   - a. `/simplify`, then `/code-review` — fix real findings.
   - b. Invoke the **`lint-resolve`** skill (scoped to this feature's changed files). It
     runs `biome check --write` (format + safe fixes), then resolves the residual lint
     findings in isolated parallel sub-agents — high-risk behavior-changing fixes (e.g.
     hook-dependency edits) are applied with a stronger model **and flagged for your
     review** — and gates on a clean `pnpm build`. This is the single place Biome and the
     build run; that `pnpm build`, on the committed tree, is the only authority on
     correctness, so disregard any earlier mid-session diagnostic that disagrees. (No test
     runner and no browser-agent checks in this repo, per AGENTS.md.)
3. **Update AGENTS.md if the feature changed anything it documents** — pages/routes,
   architecture, the Supabase schema shape, env vars, conventions, or gotchas. Edit it as
   part of this feature's diff (it ships in the same commit). **Never touch CLAUDE.md** — it
   only imports AGENTS.md and is the user's to edit. If nothing AGENTS.md covers changed,
   skip this step.

This phase produces a green, runnable branch — the thing the user manually tests in Phase 5.
Tick Phase 4 and continue.

## Phase 5 — Feedback triage ✋ (the scope firewall)

The branch now builds and runs, so hand it to the user to **manually test**. They'll report
bugs, observations, and new ideas informally as they exercise the app. This phase decides
what is acted on — it exists so a single branch can't endlessly absorb new scope (the FT37
trap).

Maintain a **triage doc at `docs/triage.md`** (a single persistent backlog that survives
ship — `ship.sh` strips only the specs/plans scaffolding, not this). For every item the user
surfaces, classify it as exactly one of:

- **fix now** — a genuine defect or gap in *this slice's* committed scope. Build it on this
  branch.
- **next feature / branch** — real and worth doing, but its own slice. Append to `docs/triage.md`.
- **table for later** — maybe someday. Append to `docs/triage.md`.

**Only "fix now" items continue on this branch.** Implement them here, then re-run the
**`lint-resolve`** skill to re-verify (it re-formats, resolves any new lint findings, and
gates on a clean `pnpm build`). Everything classified next-branch or later is *captured in
the triage doc and NOT built* — that capture is what lets you defer without losing the
idea. Loop testing → triage → fix-now until the user has no more fix-now items.

GATE: **STOP and ask, in plain words, "Ready to ship, or more to fix first?"** Never infer
"ship it" from a green build — a passing build is not permission to ship. Only the user's
explicit "ship it" advances to Phase 6. Tick Phase 5 when they say so.

## Phase 6 — Ship ✋ (only when the user says "ship it")

From the repo root, on branch `ft/<issue#>`, run the ship script — it squash-merges to dev
as one clean commit, pushes, deletes the branch, and closes the issue:

```bash
${CLAUDE_SKILL_DIR}/scripts/ship.sh <issue#> "<feature summary>"
```

The script refuses to run if temp worktrees remain (Phase 4 must have cleaned up first) or if
you're not on `ft/<issue#>`. As part of the squash it **strips the planning docs**
(`docs/superpowers/specs|plans`) — including any stale ones from earlier runs — so the dev
commit is code-only and the docs never accumulate. Tick Phase 6. The workflow is complete
only after this phase.

---

## Hard rules (never break)

- NEVER create per-task branches or PRs. ONE feature branch only.
- NEVER open a PR or rely on GitHub Actions / CI. Quality = local `/simplify` + `/code-review`
  in Phase 4.
- NEVER push to `main` or `beta`. Ship target is `dev` only.
- Planning docs (`docs/superpowers/specs|plans`) are **branch-local scaffolding**: committed
  on `ft/<issue#>` so they're tracked through the build, then stripped by `ship.sh` so they
  never persist on `dev`. The durable record is the squashed commit message + the closed
  issue — never AGENTS.md/CLAUDE.md.
- ALWAYS keep the six-phase checklist as your anchor; never end at a sub-skill's terminal
  state. Cleanup (Phase 4), triage (Phase 5), and ship (Phase 6) are non-skippable.
- SCOPE IS FROZEN AT THE PHASE 1 GATE. A new feature/scope idea that surfaces mid-build
  (Phases 3–5) goes to the spec's **Deferred** list or `docs/triage.md` — it is NOT built on
  the current branch. Expanding scope mid-build is the snowball this workflow exists to
  prevent; Phase 5 triage is the firewall.
- Preserve the repo's behavior contracts (server-action field `name`s, the auth/connect-x
  guards + `?next=`, the run → preview → save → post/redraft pipeline) — see AGENTS.md.
