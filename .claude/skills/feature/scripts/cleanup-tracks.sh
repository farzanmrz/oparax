#!/usr/bin/env bash
# Phase 4 cleanup — remove every temp git worktree (keep only the main checkout) and
# prune. Leaves you on the feature branch in the main working tree. Local branches are
# listed (not auto-deleted) so the agent can verify before removing leftover tracks.
#
# Usage:  cleanup-tracks.sh
# Run from the repo root after the parallel tracks have converged into ft/<issue#>.
set -euo pipefail

main="$(git rev-parse --show-toplevel)"

git worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r wt; do
  if [ "$wt" != "$main" ]; then
    echo "Removing temp worktree: $wt"
    git worktree remove --force "$wt"
  fi
done
git worktree prune

echo "--- worktrees after cleanup (expect only the main checkout) ---"
git worktree list
echo "--- local branches (delete any leftover temp track branches with: git branch -D <name>) ---"
git branch
