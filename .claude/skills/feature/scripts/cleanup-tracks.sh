#!/usr/bin/env bash
# Phase 4 cleanup — remove every temp git worktree (keep only the main checkout) and
# prune. Leaves you on the feature branch in the main working tree. Silent on success;
# the skill verifies with `git worktree list` / `git branch` afterward.
#
# Usage:  cleanup-tracks.sh
# Run from the repo root after the parallel tracks have converged into ft/<issue-number>.
set -euo pipefail

main="$(git rev-parse --show-toplevel)"

git worktree list --porcelain | sed -n 's/^worktree //p' | while read -r wt; do
  [ "$wt" = "$main" ] || git worktree remove --force "$wt"
done
git worktree prune
