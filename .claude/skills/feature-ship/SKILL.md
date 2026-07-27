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

## Triage (owner feedback is binding)

Every finding the owner reports during manual verification is implemented on this
branch before the ship gate — no push-back, no deferral, no "not this slice," and
no measuring it against the definition-of-done first. The ONLY way an item is
deferred is the owner explicitly saying it can wait; a deferred item becomes a
future slice the flow doesn't track. After each batch of fixes, re-run
`feature-lint` + the boot smoke + feature-qc's browser sweep (step 5 — parallel
`browser-verifier` agents driving the `agent-browser` CLI headless) over the flows
the fixes touched (ship-stage fixes are usually UI fixes — the browser is the only
gate that proves them).

The scope firewall survives only for agent-self-generated ideas: unrelated work an
agent notices while fixing (a tempting refactor, a someday cleanup) stays off the
branch — surface it, then drop it. It never applies to anything the owner reported.

Loop test → implement → re-verify until the owner has nothing left to report (or
has explicitly deferred what remains).

Before the gate, show the **complete** output of `git status --short
--untracked-files=all`: every modification, deletion, and untracked file will be
staged. State the terminal target — carried in this conversation or in the handoff
this session resumed from — in plain words.

GATE ✋: use the one question matching that target:

- `beta`: **"Ready to ship every listed change to beta at beta.oparax.ai, or more to fix first?"**
- `main`: **"Ready to ship every listed change to beta, and then promote it through to production at oparax.ai, or more to fix first?"**

A green build is never permission. Only the user's explicit approval of that named
consequence advances. This is one authorization for the full authorized release path;
deployment verification between hops is a safety check, not another approval gate.

## Ship

From the repo root, run `.claude/skills/feature/scripts/ship.sh <issue#> "<feature summary>"`. It
always lands on `beta`; there is no target flag to pass. The terminal target
only decides what happens after this landing, in the ordered promotion step
below.

```bash
.claude/skills/feature/scripts/ship.sh <issue#> "<feature summary>"
```

The command reprints the authorized inventory, stages all of it, commits a
recovery snapshot when needed, and pushes the exact feature tip without force. It
then previews the merge without mutating refs and creates the one squash commit on
`beta` in a temporary detached worktree. That commit carries parseable
`Feature-Issue`, `Feature-Branch`, and `Feature-Source-Tip` trailers. A normal push
updates `beta`; the current checkout stays on `ft/<issue#>`, and that feature branch
is retained locally and remotely as the newest recovery generation. `ship.sh` no
longer takes a target flag — it always lands on `beta`; the terminal target
(`beta` or `main`) only decides what happens after this landing, in the ordered
promotion step below, and is never passed into `ship.sh` itself.

On a conflict, STOP. The script leaves refs intact and reports destination-only
commits, feature-only commits, and conflicting paths. Inspect the affected behavior
and explain in plain language whether the intentions can coexist; then ask the user
to choose one of exactly three resolutions: preserve compatible parts from both,
prefer `beta`, or prefer the feature. Never tell them merely to "rebase," and never
use a destructive reset as recovery.

## Ordered promotion and deployment checks

`ship.sh` stops after a verified `beta` ref update — that landing commit is already
the deployment source for `beta.oparax.ai`, so no `promote.sh` hop is needed to reach
it. The terminal target (`beta` or `main`) is whatever was carried in the
conversation from the plan gate onward — nothing on disk records it:

1. `ship.sh`'s final line is `Shipped <branch> -> beta. beta_sha=<sha>
   recovery_tip=<sha>` — invoke `vercel:deployments-cicd` to wait for and verify that
   **exact `beta_sha` value** (not `recovery_tip`, which is the feature branch's own
   tip and is never deployed) is READY at `https://beta.oparax.ai`. If verification
   fails, STOP; the conversation (or a `/handoff` checkpoint) is the only record to
   resume from. For target `beta`, success here means the ordered promotion is
   complete — go straight to finalize. For target `main`, continue to step 2.
2. For target `main`, only after the beta deployment check passes, run
   `.claude/skills/feature/scripts/promote.sh beta main`, capture its sole stdout
   line (the new `main` commit SHA), and use `vercel:deployments-cicd` to verify that
   exact SHA is READY at `https://oparax.ai`. STOP on failure and resume from the
   conversation. After success, gate `finalize`.

Promotion uses a clean detached worktree, a normal `--no-ff` merge that preserves
destination-only history, and a normal fast-forward ref update. It never skips the
ladder and never force-pushes. Treat its conflict report the same way as the beta
integration report.

After the authorized target and its deployment check have succeeded, finalize:

```bash
.claude/skills/feature/scripts/ship.sh --finalize <issue#>
```

Finalization first proves that the current and live recovery tips still equal the
tip recorded on `origin/beta`; only then does it close the tracked issue and sweep
`.feature/` plus legacy `.superpowers/`. It retains the just-shipped branch. Cleanup
considers only older exact `ft/<number>` branches and deletes one only when its issue
is closed, `origin/beta` records the same source tip in ship trailers, its local/remote
tips are unchanged, and no worktree uses it. Remote deletion uses an exact lease;
every legacy, moved, open, unverifiable, or otherwise ambiguous branch is skipped and
reported.

Hard rules: feature work always happens on `ft/<issue#>` — there is no
direct-mode escape hatch onto `beta` or `main`; never skip `beta → main`; never
force-push protected branches; no PRs, no CI.
