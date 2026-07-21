---
name: feature-ship
description: >-
  Phase 4 of the feature flow, standalone: the triage + ship gates. Use when
  the user says /feature-ship, "ship it", "close the slice", or brings
  manual-test findings on a finished branch.
argument-hint: "[issue#]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Triage ✋ then ship ✋

## Triage (the scope firewall)

For each finding the user reports, exactly one verdict:
- **fix now** — breaks the slice's written definition-of-done (the ≤2-sentence
  statement in the issue). Build it, then re-run `feature-lint` + the boot smoke.
  Not DoD-breaking → not fix-now, however tempting.
- **drop** — real, but not this slice (its own future slice, or a someday item). The
  flow doesn't track it; if it matters, the user re-plans it as its own slice later.

Loop test → triage → fix-now until no fix-nows remain.

GATE ✋: ask in plain words — **"Ready to ship, or more to fix first?"** A green
build is never permission. Only their explicit "ship it" advances.

## Ship

From the repo root, on `ft/<issue#>`:

```bash
.claude/skills/feature/scripts/ship.sh <issue#> "<feature summary>"
```

It refuses on wrong branch / stray flow worktree; folds any uncommitted tree
changes on the branch into the squash (your approved manual edits — deletions,
tweaks — belong to this same-branch slice); squash-merges to dev as ONE commit;
pushes; deletes the branch; closes the issue (the permanent record); sweeps scratch
(`.feature/`, legacy `.superpowers/`) and the empty worktree mount; leaves the repo
on `dev`.

Hard rules: never push to main/beta; ship target is dev only; no PRs, no CI.
