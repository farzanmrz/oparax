#!/usr/bin/env bash
# Phase 5 ship — squash-merge the feature branch into dev locally, push, delete the
# branch, and close the issue. ONE clean commit on dev; no PR, no CI.
#
# Usage:  ship.sh <issue#> "<commit message>"
# Run from the repo root, on branch ft/<issue#>, after Phase 4 cleanup.
set -euo pipefail

issue="${1:?usage: ship.sh <issue#> \"<commit message>\"}"
msg="${2:?usage: ship.sh <issue#> \"<commit message>\"}"
branch="ft/${issue}"

# Must be on the feature branch.
cur="$(git rev-parse --abbrev-ref HEAD)"
[ "$cur" = "$branch" ] || { echo "ship: not on $branch (on $cur) — checkout $branch first." >&2; exit 1; }

# Phase 4 must have removed temp worktrees (the main checkout is the only one).
if [ "$(git worktree list | wc -l | tr -d ' ')" -ne 1 ]; then
  echo "ship: temp worktrees still exist — run Phase 4 cleanup first:" >&2
  git worktree list >&2
  exit 1
fi

# Capture any final uncommitted tweaks on the branch (only if something is staged).
git add -A
git diff --cached --quiet || git commit -m "wip"

# Squash-merge into dev as one clean commit, push.
git checkout dev
git pull --ff-only
git merge --squash "$branch"
# Append the project's Co-Authored-By trailer so the dev commit always carries it,
# regardless of what the caller passed (the skill's hard rule, self-enforced here).
git commit -m "$msg" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push origin dev

# Delete the local feature branch (squash leaves it "unmerged", so -D) and close the issue.
git branch -D "$branch"
gh issue close "$issue"

echo "Shipped $branch -> dev (one squashed commit). Branch deleted, issue #$issue closed."
