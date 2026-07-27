#!/usr/bin/env bash
# Close the plan gate: open an issue and cut ft/<issue> from fetched origin/beta.
#
# Usage:
#   start.sh "<issue title>" [<plan-body-file>]
#
# With no plan file (or "-"), the approved plan is read from stdin. stdout is one
# machine-readable line: the issue number. All Git/GitHub chatter goes to stderr.
#
# There is no direct-mode escape hatch and no persisted run state. A slice is
# identified by its branch, which is the only marker QC needs
# (`origin/beta...ft/<N>`). ship.sh always lands on beta; the terminal release
# target (beta or main) lives only in the conversation and is applied by
# feature-ship/SKILL.md's promotion step after ship.sh returns — it is never
# passed into this script or into ship.sh.
set -euo pipefail

usage() {
  echo 'usage: start.sh "<title>" [<plan-body-file>]' >&2
  exit 2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --)
      shift
      break
      ;;
    -*)
      echo "start: unknown option: $1" >&2
      usage
      ;;
    *)
      break
      ;;
  esac
done

[ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage
title="$1"
body="${2:--}"

bodyfile_is_temp="false"
if [ "$body" = "-" ]; then
  bodyfile="$(mktemp "${TMPDIR:-/tmp}/oparax-feature-plan.XXXXXX")"
  bodyfile_is_temp="true"
  cat > "$bodyfile"
  [ -s "$bodyfile" ] || {
    rm -f "$bodyfile"
    echo "start: empty approved plan on stdin." >&2
    exit 1
  }
else
  [ -f "$body" ] || {
    echo "start: plan body file not found: $body" >&2
    exit 1
  }
  bodyfile="$body"
fi

cleanup_bodyfile() {
  if [ "$bodyfile_is_temp" = "true" ]; then
    rm -f "$bodyfile"
  fi
}
trap cleanup_bodyfile EXIT

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$repo_root" ] || {
  echo "start: run from inside the repository." >&2
  exit 1
}
cd "$repo_root"

# A slice starts from a completely clean tree. `git diff` alone misses untracked
# files, which could otherwise hitchhike into the new slice.
if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  echo "start: working tree is not clean (including untracked files) — commit or stash it first." >&2
  exit 1
fi

# Refresh only the base ref. Never checkout local beta: it may legitimately be
# checked out in another worktree.
git fetch --prune origin beta >&2
git rev-parse --verify --quiet refs/remotes/origin/beta >/dev/null || {
  echo "start: origin/beta is unavailable after fetch." >&2
  exit 1
}
fetched_beta_sha="$(git rev-parse refs/remotes/origin/beta)"

# Create the issue only after every local/base precondition passes. If branch
# setup then fails, close this newly-created issue so the failed kickoff leaves
# no orphan tracker record.
url="$(gh issue create --title "$title" --body-file "$bodyfile")"
issue="$(printf '%s\n' "$url" | grep -oE '/issues/[0-9]+' | head -n1 | grep -oE '[0-9]+' || true)"
[ -n "$issue" ] || {
  echo "start: could not parse issue number from: $url" >&2
  exit 1
}

branch="ft/${issue}"
if ! git switch --create "$branch" --no-track "$fetched_beta_sha" >&2; then
  close_note="Feature kickoff could not create $branch from origin/beta. Closing this automatically-created issue so it is not orphaned."
  if ! gh issue close "$issue" --reason "not planned" --comment "$close_note" >&2; then
    echo "start: branch setup failed, and issue #$issue could not be closed automatically." >&2
  fi
  echo "start: failed to create $branch from origin/beta; issue #$issue was closed when possible." >&2
  exit 1
fi

echo "$issue"
