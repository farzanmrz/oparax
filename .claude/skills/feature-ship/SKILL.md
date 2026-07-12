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

# /feature-ship — triage ✋ then ship ✋

## Triage (the scope firewall)

For each finding the user reports, exactly one label:
- **fix now** — breaks the slice's written definition-of-done (the ≤2-sentence
  statement in the issue). Build it, then re-run `feature-lint` + the boot smoke.
  Not DoD-breaking → not fix-now, however tempting.
- **next feature / branch** — real, its own slice → capture as a new GitHub issue,
  `gh issue create --title "triage: <item>" --body "bucket: next slice — <context +
  origin issue#>"` (scribing the USER's deferral — the only reason this flow ever
  creates one).
- **table for later** → same command, body opening `bucket: someday`.

Loop test → triage → fix-now until no fix-nows remain.

GATE ✋: ask in plain words — **"Ready to ship, or more to fix first?"** A green
build is never permission. Only their explicit "ship it" advances.

## Ship

From the repo root, on `ft/<issue#>`:

```bash
.claude/skills/feature/scripts/ship.sh <issue#> "<feature summary>"
```

It refuses on wrong branch / stray flow worktree / dirty tree; squash-merges to dev
as ONE commit; pushes; deletes the branch; closes the issue (the permanent record);
sweeps scratch (`.feature/`, legacy `.superpowers/`) and the empty worktree mount;
leaves the repo on `dev`.

Hard rules: never push to main/beta; ship target is dev only; no PRs, no CI.
