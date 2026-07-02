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
4. `Phase 4 — Convergence verified (one branch, no strays) · /simplify + /code-review · lint-resolve (biome + residual fixes) + build verified`
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

**Skill grounding (binding, every phase):** before working in any area, invoke the matching
skill from AGENTS.md's Skills table (`eve`, `vercel:ai-sdk`, `vercel:shadcn`,
`vercel:nextjs`, …). Dispatched subagents do NOT inherit this discipline — every dispatch
prompt must explicitly name the skills that track must invoke before writing code.

---

## Phase 1 — Design ✋ (approve + iterate)

If invoked as `/feature <description>`, that text arrives as `$ARGUMENTS` — seed the
brainstorming with it. If `$ARGUMENTS` is empty, brainstorm from the conversation.

**Preflight — ground in current scope first.** Before brainstorming, read AGENTS.md's
Rebuild section (decision, hard guards, open questions) and state back which frame this
feature lives in — the eve rebuild, or the untouched legacy flow. The spec records that
frame at the top. Also check `docs/triage.md` (the persistent deferred-work backlog) for
candidates when choosing the slice, and for rebuild-frame work read the rebuild's running
log — `gh issue view 38` — whose "Current slice" section, when present, is the slice's
frame and definition of done: adopt it rather than re-deriving scope in brainstorming.

Invoke `superpowers:brainstorming` to explore intent, weigh approaches, and agree the
direction with the user — the human-in-the-loop part: the questions, the trade-offs, the
WHAT. Brainstorming writes and saves the spec itself (you don't restate its path); present
it and iterate.

The spec MUST end with an explicit **In scope (this slice)** / **Deferred (not now)** split
— brainstorming should actively route every "while we're here" / snowball idea to *Deferred*
rather than absorbing it. A short, well-cut scope section now is what stops the build from
sprawling later.

**Slice sizing (binding):** the spec opens with a definition-of-done stated in ≤2 sentences;
if it can't be, the slice is too big — cut it before the gate.

**The spec is never a repo file.** Have brainstorming save it to the session scratchpad (or
any temp path) — nothing under `docs/`. It becomes the GitHub issue body at Phase 3 kickoff,
which is its durable home.

When brainstorming hands off to writing-plans, that is **Phase 1→2 of this skill, not the
end.** Tick Phase 1 and continue.

GATE: do not proceed until the user explicitly approves the design. Make the scope cut part
of that approval — show the In-scope / Deferred split and confirm it's right, so scope is a
deliberate decision, not a default.

## Phase 2 — Plan ✋ (approve)

Feed the approved design through `superpowers:writing-plans` to produce the canonical
bite-sized, no-placeholder plan with a task **checklist**. Writing-plans saves the plan
itself (you don't restate its path).

**The plan is never a repo file either.** Save it beside the spec in the scratchpad; at
Phase 3 kickoff the combined spec + plan file becomes the issue body via `start.sh`.

When writing-plans offers its execution handoff (subagent-driven vs inline), **that is not
the end** — its execution belongs to Phase 3 here, on ONE branch. Tick Phase 2 and continue.

GATE: do not proceed until the user approves the plan. The issue is created **after** this
gate (Phase 3 kickoff), so a rejected plan never leaves an orphan issue.

## Phase 3 — Parallel build (one branch)

- **Kickoff — creates the issue AND the one branch** (from the repo root):
  ```bash
  ${CLAUDE_SKILL_DIR}/scripts/start.sh "<feature name>" <scratchpad>/spec-plan.md
  ```
  Concatenate the approved spec + plan into one temp markdown file first — it becomes the
  **issue body**, the paperwork's durable home. The script cuts from a clean `dev`, opens
  the issue, and creates the branch `ft/<issue-number>` (the issue number only — never a
  slug). **Capture the issue number it prints** (the script's only stdout line); it drives
  Phase 6. (Issues are fine — only PRs and CI are forbidden.)
- **No planning docs in the repo — ever.** Spec and plan live in the issue; `docs/triage.md`
  is the only persistent planning file in the tree.
- Split the plan into **independent tracks** (groups of files that don't overlap).
- **Inline is the default; parallel is the exception.** One track → build inline with
  `superpowers:subagent-driven-development`. Genuinely independent tracks → dispatch
  parallel subagents (or a Workflow) directly; when a track needs file isolation, use the
  harness's auto-cleaned worktree isolation — NEVER `superpowers:using-git-worktrees`,
  never hand-made worktrees or temp branches. `git branch` must never show anything beyond
  `ft/<issue#>` (plus dev/main).
- Every change **converges back into `ft/<issue#>`** as ordinary commits. Subagents NEVER
  push branches and NEVER open PRs.
- **Tracks only write code.** They do NOT build, lint, or format — all verification and
  formatting is centralized in Phase 4, so code lands unformatted and is normalized once.
- **Ignore mid-session LSP diagnostics** (`<new-diagnostics>` blocks) while tracks are in
  flight: a subagent's in-progress edit produces stale "cannot find module" / type errors
  that are NOT ground truth. The only authority is a clean `pnpm build` on the committed
  tree, checked once in Phase 4. Tick Phase 3 and continue.

## Phase 4 — Converge + QC (MANDATORY — the step naive runs skip)

1. Confirm convergence is clean: all track changes are commits on `ft/<issue#>`,
   `git worktree list` shows only the main checkout, and `git branch` shows no temp
   branches. Harness-managed isolation cleans up after itself; if anything leaked, remove
   it now (`git worktree remove <path>`, `git branch -D <name>`).
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

- **fix now** — it breaks the slice's written definition-of-done (the ≤2-sentence statement
  from Phase 1). Build it on this branch. If it doesn't break the DoD, it is not a fix-now,
  however tempting.
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

The script refuses to run if stray worktrees remain or if you're not on `ft/<issue#>`. Its
legacy doc-strip step is now a no-op — planning docs live in the issue, never the repo.
Tick Phase 6. The workflow is complete only after this phase.

---

## Hard rules (never break)

- NEVER create per-task branches or PRs. ONE feature branch only.
- NEVER open a PR or rely on GitHub Actions / CI. Quality = local `/simplify` + `/code-review`
  in Phase 4.
- NEVER push to `main` or `beta`. Ship target is `dev` only.
- Planning docs never enter the repo: the spec + plan live in the GitHub issue body, and
  deferred work lives in `docs/triage.md`. The durable record is the squashed commit
  message + the issue — never AGENTS.md/CLAUDE.md.
- ALWAYS keep the six-phase checklist as your anchor; never end at a sub-skill's terminal
  state. Cleanup (Phase 4), triage (Phase 5), and ship (Phase 6) are non-skippable.
- SCOPE IS FROZEN AT THE PHASE 1 GATE. A new feature/scope idea that surfaces mid-build
  (Phases 3–5) goes to the spec's **Deferred** list or `docs/triage.md` — it is NOT built on
  the current branch. Expanding scope mid-build is the snowball this workflow exists to
  prevent; Phase 5 triage is the firewall.
- Preserve the repo's behavior contracts (server-action field `name`s, the auth/connect-x
  guards + `?next=`, the run → preview → save → post/redraft pipeline) — see AGENTS.md.
