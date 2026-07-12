---
name: feature-ship
description: >-
  Phases 4–5 of the feature flow, standalone: triage the user's manual-test
  feedback (fix-now vs defer), then squash-merge the ft/<n> branch to dev via
  ship.sh on their explicit go. Use when the user says /feature-ship, "ship it",
  "close the slice", or brings manual-test findings on a finished branch.
argument-hint: "[issue#]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
disable-model-invocation: true
---

# /feature-ship — triage ✋ then ship ✋

## Triage (the scope firewall)

For each finding the user reports, exactly one label:
- **fix now** — breaks the slice's written definition-of-done (the ≤2-sentence
  statement in the issue). Build it, then re-run `feature-lint` + the boot smoke.
  Not DoD-breaking → not fix-now, however tempting.
- **next feature / branch** — real, its own slice → capture to `docs/triage.md`
  (scribing the USER's deferral — the only reason this flow ever writes there).
- **table for later** → likewise to `docs/triage.md`.

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
sweeps scratch (`docs/feature/`); leaves the repo on `dev`.

Hard rules: never push to main/beta; ship target is dev only; no PRs, no CI.
