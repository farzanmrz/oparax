#!/usr/bin/env bash
# Close the plan gate in one of two explicit modes:
#   tracked (default) — open an issue and cut ft/<issue> from fetched origin/dev;
#   current           — remain on a clean, up-to-date dev and record its base SHA.
#
# Usage:
#   start.sh [--target dev|beta|main] "<issue title>" [<plan-body-file>]
#   start.sh --current [--target dev|beta|main] "<feature title>" [<plan-body-file>]
#
# With no plan file (or "-"), the approved plan is read from stdin. stdout is one
# machine-readable line: the issue number in tracked mode, or "direct:dev" in
# current mode. All Git/GitHub chatter goes to stderr.
set -euo pipefail

usage() {
  echo 'usage: start.sh [--current] [--target dev|beta|main] "<title>" [<plan-body-file>]' >&2
  exit 2
}

mode="tracked"
target="dev"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --current)
      mode="current"
      shift
      ;;
    --target)
      [ "$#" -ge 2 ] || usage
      target="$2"
      shift 2
      ;;
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

case "$target" in
  dev | beta | main) ;;
  *)
    echo "start: target must be dev, beta, or main (got: $target)." >&2
    exit 2
    ;;
esac

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
state_helper="$repo_root/.claude/skills/feature-handoff/scripts/state.mjs"
[ -f "$state_helper" ] || {
  echo "start: feature state helper is missing: $state_helper" >&2
  exit 1
}

# Both modes start from a completely clean tree. `git diff` alone misses
# untracked files, which could otherwise hitchhike into the new slice.
if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  echo "start: working tree is not clean (including untracked files) — commit or stash it first." >&2
  exit 1
fi

# Refresh only the base ref. Never checkout local dev: it may legitimately be
# checked out in another worktree.
git fetch --prune origin dev >&2
git rev-parse --verify --quiet refs/remotes/origin/dev >/dev/null || {
  echo "start: origin/dev is unavailable after fetch." >&2
  exit 1
}
fetched_dev_sha="$(git rev-parse refs/remotes/origin/dev)"

if [ "$mode" = "current" ]; then
  current_branch="$(git symbolic-ref --quiet --short HEAD || true)"
  [ "$current_branch" = "dev" ] || {
    echo "start: --current is allowed only while already on dev (on: ${current_branch:-detached HEAD})." >&2
    exit 1
  }

  # A direct run must begin at the exact fetched dev tip. This avoids silently
  # absorbing older local-only commits into a new feature.
  local_sha="$(git rev-parse HEAD)"
  remote_sha="$fetched_dev_sha"
  [ "$local_sha" = "$remote_sha" ] || {
    echo "start: local dev is not exactly origin/dev." >&2
    echo "  local:  $local_sha" >&2
    echo "  remote: $remote_sha" >&2
    echo "Fast-forward/synchronize dev, then begin the direct run again." >&2
    exit 1
  }

  base_sha="$local_sha"
  mkdir -p .feature
  printf '*\n' > .feature/.gitignore
  cp "$bodyfile" .feature/approved-plan.md
  if ! node "$state_helper" init \
    --mode current \
    --branch dev \
    --base-sha "$base_sha" \
    --source-tip "$base_sha" \
    --phase plan-approved \
    --gate build \
    --target "$target" \
    --approved-plan .feature/approved-plan.md >&2; then
    rm -f .feature/approved-plan.md
    echo "start: could not initialize direct-run state; no feature work was started." >&2
    exit 1
  fi
  echo "direct:dev"
  exit 0
fi

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
original_branch="$(git symbolic-ref --quiet --short HEAD || true)"
original_head="$(git rev-parse HEAD)"
if ! git switch --create "$branch" --no-track "$fetched_dev_sha" >&2; then
  close_note="Feature kickoff could not create $branch from origin/dev. Closing this automatically-created issue so it is not orphaned."
  if ! gh issue close "$issue" --reason "not planned" --comment "$close_note" >&2; then
    echo "start: branch setup failed, and issue #$issue could not be closed automatically." >&2
  fi
  echo "start: failed to create $branch from origin/dev; issue #$issue was closed when possible." >&2
  exit 1
fi

base_sha="$fetched_dev_sha"
if ! node "$state_helper" init \
  --mode tracked \
  --branch "$branch" \
  --issue "$issue" \
  --base-sha "$base_sha" \
  --source-tip "$base_sha" \
  --phase plan-approved \
  --gate build \
  --target "$target" \
  --approved-plan "issue:#$issue" >&2; then
  if [ -n "$original_branch" ]; then
    git switch "$original_branch" >&2 || true
  else
    git switch --detach "$original_head" >&2 || true
  fi
  git branch -D "$branch" >&2 || true
  close_note="Feature kickoff could not initialize branch-scoped state. Closing this automatically-created issue so it is not orphaned."
  gh issue close "$issue" --reason "not planned" --comment "$close_note" >&2 || true
  echo "start: failed to initialize feature state; rolled back $branch and closed issue #$issue when possible." >&2
  exit 1
fi

echo "$issue"
