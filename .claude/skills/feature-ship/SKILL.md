---
name: feature-ship
description: >-
  Phases 4–5 of the feature flow, standalone: the triage + ship gates. Use when
  the user says /feature-ship, "ship it", "close the slice", or brings
  manual-test findings on a finished branch.
argument-hint: "[issue#]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Triage ✋ then ship ✋

## Triage (the scope firewall)

For each finding the user reports, exactly one label:
- **fix now** — breaks the slice's written definition-of-done (the ≤2-sentence
  statement in the issue). Build it, then re-run `feature-lint` + the boot smoke.
  Not DoD-breaking → not fix-now, however tempting.
- **backlog** — real, but not this slice (its own future slice, or a someday item)
  → append ONE line to the single living backlog issue (never a new per-item issue):
  `.claude/skills/feature/scripts/backlog-add.sh "<item> — <context>; origin
  #<issue#>; <next slice | someday>[; · agent]"`. Lead the line's context with
  whether it's a likely next slice or someday, and add `· agent` when the agent's
  own analysis surfaced it (plain when scribing the USER's own deferral).

Loop test → triage → fix-now until no fix-nows remain. See AGENTS.md → "Issue
labels" for the full taxonomy and the single-living-backlog rule.

GATE ✋: ask in plain words — **"Ready to ship, or more to fix first?"** A green
build is never permission. Only their explicit "ship it" advances.

## Ship

**First, preserve the plan's Deferred.** `ship.sh` closes the feature issue, so its
`## Deferred` section dies with it — migrate those items into the single living backlog
first. For each still-relevant Deferred item (skip any this slice ended up addressing),
append one line: `.claude/skills/feature/scripts/backlog-add.sh "<item> — <why deferred>;
origin #<issue#>"`. This is the one point where plan-Deferred graduates from the closing
feature issue into the durable backlog.

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
