#!/usr/bin/env bash
# Phase 6 ship — squash-merge the feature branch into dev locally, push, delete the
# branch, close the issue — then sweep session scratch and mint the NEXT slice's
# empty issue + branch, so the next /feature session takes over an existing seat
# (rolling chain). ONE clean commit on dev; no PR, no CI.
#
# Usage:  ship.sh <issue-number> "<commit message>"
# Run from the repo root, on branch ft/<issue-number>, after Phase 4 verification.
set -euo pipefail

issue="${1:?usage: ship.sh <issue-number> \"<commit message>\"}"
msg="${2:?usage: ship.sh <issue-number> \"<commit message>\"}"
branch="ft/${issue}"

# Must be on the feature branch.
cur="$(git rev-parse --abbrev-ref HEAD)"
[ "$cur" = "$branch" ] || { echo "ship: not on $branch (on $cur) — checkout $branch first." >&2; exit 1; }

# No stray worktrees (the main checkout is the only one).
if [ "$(git worktree list | wc -l | tr -d ' ')" -ne 1 ]; then
  echo "ship: stray worktrees exist — clean them up first:" >&2
  git worktree list >&2
  exit 1
fi

# Refuse on a dirty tree: ship exactly the reviewed commits on $branch. Any
# uncommitted change bypassed the Phase 4 gate, so stop rather than sweep it in.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ship: uncommitted changes on $branch — commit and re-verify (Phase 4) before shipping." >&2
  exit 1
fi

# Squash-merge into dev as one clean commit.
git checkout dev
git pull --ff-only origin dev
if ! git merge --squash "$branch"; then
  git reset --hard HEAD >&2          # discard the conflicted half-merge, restore dev
  git checkout "$branch" >&2
  echo "ship: squash merge conflicts against dev — rebase $branch on dev, then re-run." >&2
  exit 1
fi
git commit -m "$msg"

# Push BEFORE any irreversible cleanup. If it fails, the commit is safe on local dev.
if ! git push origin dev; then
  echo "ship: merged to local dev but push failed — run 'git push origin dev', then 'git branch -D $branch' and 'gh issue close $issue'." >&2
  exit 1
fi

# Only after a confirmed push: delete the branch (squash leaves it "unmerged", so -D)
# and close the issue.
git branch -D "$branch"
gh issue close "$issue"

# Sweep session scratch — the flow's working files live in .feature/ (legacy runs
# used .superpowers/); their phases are over. The empty worktree mount goes too.
rm -rf docs/feature .feature .superpowers
rmdir .claude/worktrees 2>/dev/null || true

# The repo stays on dev. The next slice creates its own issue + branch via
# start.sh once its plan is approved (Phase 1 gate).
echo "Shipped $branch -> dev (one squashed commit). Issue #$issue closed."
