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
  → capture as a new GitHub issue with a plain title (NO `triage:` prefix — the
  label carries that now):
  `gh issue create --title "<item>" --label backlog --body "<context + origin
  issue#>; <next slice | someday>"`. Add `--label backlog,agent` when the agent's
  own analysis surfaced it; plain `--label backlog` when scribing the USER's own
  deferral. Body's first clause says whether it's a likely next slice or someday.

Loop test → triage → fix-now until no fix-nows remain. See AGENTS.md → "Issue
labels" for the full taxonomy.

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
