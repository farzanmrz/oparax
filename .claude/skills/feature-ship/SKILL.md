---
name: feature-ship
description: >-
  Phase 4 of the feature flow, standalone: the triage + ship gates. Use when
  the user says /feature-ship, "ship it", "close the slice", or brings
  manual-test findings on a finished branch.
argument-hint: "[issue#]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(pnpm *) Skill
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

Before the gate, read branch-scoped feature state and show the **complete** output
of `git status --short --untracked-files=all`: every modification, deletion, and
untracked file will be staged. State the saved terminal target in plain words.

GATE ✋: use the one question matching that target:

- `dev`: **"Ready to ship every listed change to dev, or more to fix first?"**
- `beta`: **"Ready to ship every listed change to dev and then promote it through beta at beta.oparax.ai, or more to fix first?"**
- `main`: **"Ready to ship every listed change to dev, then through beta, and then to production at oparax.ai, or more to fix first?"**

A green build is never permission. Only the user's explicit approval of that named
consequence advances. This is one authorization for the full saved release path;
deployment verification between hops is a safety check, not another approval gate.

## Ship

From the repo root, run the command matching the saved mode. Pass the saved target
explicitly rather than inferring it again:

```bash
# Tracked run, on ft/<issue#>
.claude/skills/feature/scripts/ship.sh --target <dev|beta|main> <issue#> "<feature summary>"

# Explicit direct run, on dev
.claude/skills/feature/scripts/ship.sh --current --target <dev|beta|main> "<feature summary>"
```

The tracked command reprints the authorized inventory, stages all of it, commits a
recovery snapshot when needed, and pushes the exact feature tip without force. It
then previews the merge without mutating refs and creates the one squash commit on
`dev` in a temporary detached worktree. That commit carries parseable
`Feature-Issue`, `Feature-Branch`, and `Feature-Source-Tip` trailers. A normal push
updates `dev`; the current checkout stays on `ft/<issue#>`, and that feature branch
is retained locally and remotely as the newest recovery generation. Direct mode
commits and normally pushes the already-current `dev` instead.

On a conflict, STOP. The script leaves refs intact and reports destination-only
commits, feature-only commits, and conflicting paths. Inspect the affected behavior
and explain in plain language whether the intentions can coexist; then ask the user
to choose one of exactly three resolutions: preserve compatible parts from both,
prefer `dev`, or prefer the feature. Never tell them merely to "rebase," and never
use a destructive reset as recovery.

## Ordered promotion and deployment checks

`ship.sh` stops after a verified `dev` ref update. Continue only as far as the saved
target, one Git hop at a time:

1. For target `beta` or `main`, run
   `.claude/skills/feature/scripts/promote.sh dev beta` and capture its sole stdout
   line (the new `beta` commit SHA). Invoke `vercel:deployments-cicd` to wait for and
   verify that **exact SHA** is READY at `https://beta.oparax.ai`. If either Git or
   deployment verification fails, STOP before `main`; retain state for a resume.
   After success, update the feature state to phase `promoted-beta` and gate
   `finalize` (target beta) or `promote-main` (target main).
2. For target `main`, only after beta passes, run
   `.claude/skills/feature/scripts/promote.sh beta main`, capture the new `main` SHA,
   and use `vercel:deployments-cicd` to verify that exact SHA is READY at
   `https://oparax.ai`. STOP on failure. After success, update state to phase
   `promoted-main`, gate `finalize`.

Promotion uses a clean detached worktree, a normal `--no-ff` merge that preserves
destination-only history, and a normal fast-forward ref update. It never skips the
ladder and never force-pushes. Treat its conflict report the same way as the dev
integration report.

After the saved target and its deployment check have succeeded, finalize:

```bash
# Tracked
.claude/skills/feature/scripts/ship.sh --finalize <issue#>

# Direct dev
.claude/skills/feature/scripts/ship.sh --finalize --current
```

Finalization first proves that the current and live recovery tips still equal the
tip recorded on `origin/dev`; only then does it close the tracked issue, clear this
branch's handoff/state, and sweep `.feature/` plus legacy `.superpowers/`. It retains
the just-shipped branch. Cleanup considers only older exact `ft/<number>` branches
and deletes one only when its issue is closed, `origin/dev` records the same source
tip in ship trailers, its local/remote tips are unchanged, and no worktree uses it.
Remote deletion uses an exact lease; every legacy, moved, open, unverifiable, or
otherwise ambiguous branch is skipped and reported.

Hard rules: never develop directly on `beta`/`main`; never skip `dev → beta → main`;
never force-push protected branches; no PRs, no CI.
