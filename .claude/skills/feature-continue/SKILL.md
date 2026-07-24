---
name: feature-continue
description: >-
  Resume the feature flow in a fresh session from the branch-scoped checkpoint —
  no user-provided context needed. Use when the user says /feature-continue,
  "continue the feature", "pick up the feature flow", or "resume the slice",
  especially as the first message of a new session on a feature branch. Not for
  "keep going" mid-conversation about work already underway — that is a normal
  instruction, and not for capturing a checkpoint — that is /feature-handoff.
argument-hint: "[optional: findings or extra steering for the recorded gate]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Read Skill
model: inherit
disable-model-invocation: true
---

# Continue — resume the feature flow from its checkpoint

A router, not a re-implementation: locate this branch's checkpoint, announce where
the flow stopped, and invoke the matching phase skill. All phase behavior lives in
those skills.

## 1. Locate the checkpoint

Read the exact current branch with `git branch --show-current`; stop on detached
HEAD. Then:

```bash
node .claude/skills/feature-handoff/scripts/state.mjs show --branch "<branch>"
node .claude/skills/feature-handoff/scripts/state.mjs path --branch "<branch>"
```

`show` prints `state.json`; read `handoff.md` from the directory `path` returns. If
no state exists for this branch, say so plainly and ask what to work on — never
guess a task, and **never load or fall back to another branch's snapshot** (the
helper already refuses a state whose `branch` field mismatches; honor the same rule
for `handoff.md`). If `handoffReady` is false or `handoff.md` is missing, the prose
checkpoint is stale — continue from `state.json` + the issue alone and say so.

## 2. Validate freshness

Compare the state's `headSha` to `git rev-parse HEAD` and its
`worktreeFingerprint` to `state.mjs fingerprint`. A mismatch is a **warning to
revalidate, not a stop**: the repo moved after the capture, so treat `handoff.md`'s
prose as possibly outdated, reconfirm the ground truth with `git log`/`git status`
and the issue before acting, and say what was stale. Matching fingerprints mean the
checkpoint is current — trust it.

## 3. Read the canonical plan

`approvedPlanRef` names it: `issue:#N` → `gh issue view N` (the issue body is the
plan of record — read it, don't reconstruct from the handoff); a file path (direct
mode) → read that file. The handoff is orientation; the issue is the spec.

## 4. Announce, then route

Give the user one orientation line — recorded `phase`, next `gate`, terminal
`releaseTarget`, and the handoff's "Next safe action" — then resume the flow at
exactly that point by invoking the matching phase skill:

| Recorded gate | Invoke |
| --- | --- |
| `build` / `implement` | **`feature-build`** |
| `qc` | **`feature-qc`** |
| `ship` | **`feature-ship`** (triage + ship) |
| `promote-main` / `finalize` | **`feature-ship`** (its promotion / finalize steps) |

If `$ARGUMENTS` carries extra input, fold it in at the recorded gate — e.g.
findings arriving at gate `ship` are owner-reported manual-verification findings
and are implemented per feature-ship's triage rule; steering at gate `build`
rides into the build dispatch. Where the checkpoint and the user's live input
disagree, the live input wins.
