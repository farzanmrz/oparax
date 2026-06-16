#!/usr/bin/env bash
# Phase 5 ship — squash-merge the feature branch into dev locally, push, delete the
# branch, and close the issue. ONE clean commit on dev; no PR, no CI.
#
# Usage:  ship.sh <issue-number> "<commit message>"
# Run from the repo root, on branch ft/<issue-number>, after Phase 4 cleanup.
set -euo pipefail

issue="${1:?usage: ship.sh <issue-number> \"<commit message>\"}"
msg="${2:?usage: ship.sh <issue-number> \"<commit message>\"}"
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

# Refuse on a dirty tree: Phase 5 ships exactly the reviewed commits on $branch. Any
# uncommitted change bypassed the Phase 4 gate (/simplify + /code-review + verify), so
# stop rather than sweep it into the squash commit.
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
# Append the project's Co-Authored-By trailer so the dev commit always carries it,
# regardless of what the caller passed (the skill's hard rule, self-enforced here).
git commit -m "$msg" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"

# Push BEFORE any irreversible cleanup. If it fails, the commit is safe on local dev.
if ! git push origin dev; then
  echo "ship: merged to local dev but push failed — run 'git push origin dev', then 'git branch -D $branch' and 'gh issue close $issue'." >&2
  exit 1
fi

# Only after a confirmed push: delete the branch (squash leaves it "unmerged", so -D)
# and close the issue.
git branch -D "$branch"
gh issue close "$issue"

echo "Shipped $branch -> dev (one squashed commit). Branch deleted, issue #$issue closed."
