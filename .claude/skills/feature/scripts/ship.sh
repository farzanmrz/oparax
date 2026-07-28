#!/usr/bin/env bash
# Transactional feature shipping. Lands ft/<issue> on beta through a temporary
# detached worktree. A separate --finalize invocation closes the issue and performs
# conservative old-feature cleanup only after the requested promotion/deployment
# checks have completed.
#
# Usage:
#   ship.sh <issue-number> "<commit message>"
#   ship.sh --finalize <issue-number>
set -euo pipefail

usage() {
  cat >&2 <<'USAGE'
usage:
  ship.sh <issue-number> "<commit message>"
  ship.sh --finalize <issue-number>
USAGE
  exit 2
}

finalize="false"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --finalize)
      finalize="true"
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "ship: unknown option: $1" >&2
      usage
      ;;
    *)
      break
      ;;
  esac
done

if [ "$finalize" = "true" ]; then
  [ "$#" -eq 1 ] || usage
  issue="$1"
  msg=""
else
  [ "$#" -eq 2 ] || usage
  issue="$1"
  msg="$2"
fi
case "$issue" in
  '' | *[!0-9]*)
    echo "ship: issue number must contain digits only." >&2
    exit 2
    ;;
esac
branch="ft/${issue}"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$repo_root" ] || {
  echo "ship: run from inside the repository." >&2
  exit 1
}
cd "$repo_root"

current_branch="$(git symbolic-ref --quiet --short HEAD || true)"
[ "$current_branch" = "$branch" ] || {
  echo "ship: expected to be on $branch (on: ${current_branch:-detached HEAD})." >&2
  exit 1
}

remote_ref_sha() {
  remote_name="$1"
  ref_name="$2"
  output="$(git ls-remote --heads "$remote_name" "$ref_name")" || return 1
  printf '%s\n' "$output" | awk 'NR == 1 { print $1 }'
}

show_conflict_report() {
  destination="$1"
  source="$2"
  label="$3"

  echo "ship: $label cannot be merged automatically." >&2
  echo >&2
  echo "Changes only on the destination:" >&2
  git log --oneline --max-count=30 "$source..$destination" >&2 || true
  echo >&2
  echo "Changes only on the feature:" >&2
  git log --oneline --max-count=30 "$destination..$source" >&2 || true
  echo >&2
  echo "Conflicting paths and Git's conflict messages:" >&2
  git merge-tree --write-tree --name-only "$destination" "$source" >&2 || true
  echo >&2
  echo "Non-conflicting edits are compatible and remain preservable. The paths above need intent-level review to decide whether both behaviors can coexist." >&2
  echo "Choose explicitly: preserve compatible parts from both; prefer the destination; or prefer the feature. No ref was changed by this preview." >&2
}

# Trailer lookups intentionally walk only origin/beta. Pre-Phase-1 (issue #70)
# ships recorded their Feature-Branch/Feature-Source-Tip trailers on origin/dev;
# those are out of scope for --finalize and cleanup_old_feature_branches by
# design — dev-only history predates the beta cutover and is not swept
# automatically. Nothing open today has such history (see issue #70's own
# branch-state check), so this costs no live recovery branch.
find_recorded_tip() {
  recorded_branch="$1"
  git log --first-parent refs/remotes/origin/beta \
    --format='%H%x09%(trailers:key=Feature-Branch,valueonly,separator=%x2C)%x09%(trailers:key=Feature-Source-Tip,valueonly,separator=%x2C)' \
    | awk -F '\t' -v wanted="$recorded_branch" '$2 == wanted && $3 != "" { print $3; exit }'
}

find_recorded_ship_commit() {
  recorded_branch="$1"
  recorded_issue="$2"
  recorded_source_tip="$3"
  git log --first-parent refs/remotes/origin/beta \
    --format='%H%x09%(trailers:key=Feature-Issue,valueonly,separator=%x2C)%x09%(trailers:key=Feature-Branch,valueonly,separator=%x2C)%x09%(trailers:key=Feature-Source-Tip,valueonly,separator=%x2C)' \
    | awk -F '\t' \
      -v wanted_issue="#$recorded_issue" \
      -v wanted_branch="$recorded_branch" \
      -v wanted_tip="$recorded_source_tip" \
      '$2 == wanted_issue && $3 == wanted_branch && $4 == wanted_tip { print $1; exit }'
}

branch_in_worktree() {
  candidate="$1"
  git worktree list --porcelain | grep -Fqx "branch refs/heads/$candidate"
}

cleanup_old_feature_branches() {
  active_branch="$1"
  echo "ship: checking older ft/<number> recovery branches conservatively." >&2

  git fetch --prune origin beta >&2
  candidates="$({
    git for-each-ref --format='%(refname:short)' refs/heads/ft/
    git for-each-ref --format='%(refname:short)' refs/remotes/origin/ft/
  } | sed 's#^origin/##' | grep -E '^ft/[0-9]+$' | sort -u || true)"

  [ -n "$candidates" ] || {
    echo "ship: no older feature recovery branches found." >&2
    return 0
  }

  while IFS= read -r candidate; do
    [ -n "$candidate" ] || continue
    if [ "$candidate" = "$active_branch" ]; then
      echo "ship: retain $candidate (the just-shipped recovery generation)." >&2
      continue
    fi
    case "$candidate" in
      main | dev | beta)
        echo "ship: skip protected branch name $candidate." >&2
        continue
        ;;
    esac
    if branch_in_worktree "$candidate"; then
      echo "ship: skip $candidate (checked out in a worktree)." >&2
      continue
    fi

    candidate_issue="${candidate#ft/}"
    if ! issue_state="$(gh issue view "$candidate_issue" --json state --jq .state 2>/dev/null)"; then
      echo "ship: skip $candidate (could not verify GitHub issue state)." >&2
      continue
    fi
    if [ "$issue_state" != "CLOSED" ]; then
      echo "ship: skip $candidate (issue #$candidate_issue is not closed)." >&2
      continue
    fi

    recorded_tip="$(find_recorded_tip "$candidate" || true)"
    if [ -z "$recorded_tip" ]; then
      echo "ship: skip $candidate (origin/beta has no matching Feature-Branch and Feature-Source-Tip trailers)." >&2
      continue
    fi

    local_tip="$(git rev-parse --verify --quiet "refs/heads/$candidate" 2>/dev/null || true)"
    if ! remote_tip="$(remote_ref_sha origin "refs/heads/$candidate")"; then
      echo "ship: skip $candidate (could not query its live remote ref)." >&2
      continue
    fi
    if [ -n "$local_tip" ] && [ -n "$remote_tip" ] && [ "$local_tip" != "$remote_tip" ]; then
      echo "ship: skip $candidate (local and remote tips differ)." >&2
      continue
    fi
    actual_tip="${remote_tip:-$local_tip}"
    if [ -z "$actual_tip" ]; then
      echo "ship: skip $candidate (only a stale tracking ref remains)." >&2
      continue
    fi
    if [ "$actual_tip" != "$recorded_tip" ]; then
      echo "ship: skip $candidate (its tip changed after the recorded ship)." >&2
      continue
    fi

    # Delete the remote first with an exact lease so a concurrent branch update
    # turns cleanup into a harmless rejection rather than lost work.
    if [ -n "$remote_tip" ]; then
      if ! git push --force-with-lease="refs/heads/$candidate:$remote_tip" origin ":refs/heads/$candidate" >&2; then
        echo "ship: skip local deletion of $candidate (leased remote deletion was rejected)." >&2
        continue
      fi
    fi
    if [ -n "$local_tip" ]; then
      if ! git update-ref -d "refs/heads/$candidate" "$local_tip"; then
        echo "ship: local $candidate moved during cleanup; its ref was retained." >&2
        continue
      fi
    fi
    echo "ship: removed verified old recovery branch $candidate." >&2
  done <<EOF
$candidates
EOF
}

if [ "$finalize" = "true" ]; then
  git fetch --prune origin beta >&2
  shipped_tip="$(find_recorded_tip "$branch" || true)"
  [ -n "$shipped_tip" ] || {
    echo "ship: cannot finalize $branch — origin/beta lacks its ship trailers." >&2
    exit 1
  }
  current_tip="$(git rev-parse HEAD)"
  [ "$current_tip" = "$shipped_tip" ] || {
    echo "ship: cannot finalize $branch — its local tip changed after the recorded ship." >&2
    exit 1
  }
  live_feature="$(remote_ref_sha origin "refs/heads/$branch")" || {
    echo "ship: cannot finalize $branch — its live remote ref could not be queried." >&2
    exit 1
  }
  [ -n "$live_feature" ] && [ "$live_feature" = "$shipped_tip" ] || {
    echo "ship: cannot finalize $branch — its live remote tip no longer matches the recorded Feature-Source-Tip." >&2
    exit 1
  }
  gh issue close "$issue" --comment "Shipped to beta and completed the authorized release path." >&2

  cleanup_old_feature_branches "$branch"

  rm -rf .feature .superpowers
  rmdir .claude/worktrees 2>/dev/null || true
  echo "Finalized $branch; retained it as the current recovery generation."
  exit 0
fi

echo "ship: complete branch inventory authorized by the final gate:" >&2
if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  git status --short --untracked-files=all >&2
else
  echo "  (working tree clean)" >&2
fi

# The final gate authorizes every modification, deletion, and untracked file on
# this branch. Fold them into a recoverable source commit before any integration.
if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "ship: recovery snapshot for $branch" >&2
  fi
fi

source_tip="$(git rev-parse HEAD)"

# Publish the exact feature tip first. A normal non-force push supplies a remote
# recovery copy and rejects if somebody moved the branch unexpectedly.
if ! git push origin "$source_tip:refs/heads/$branch" >&2; then
  echo "ship: feature recovery push was rejected; beta was not changed." >&2
  exit 1
fi
live_feature="$(remote_ref_sha origin "refs/heads/$branch")" || {
  echo "ship: could not verify the live recovery branch; beta was not changed." >&2
  exit 1
}
[ "$live_feature" = "$source_tip" ] || {
  echo "ship: live $branch moved after push; beta was not changed." >&2
  exit 1
}

git fetch origin beta >&2
beta_base="$(git rev-parse refs/remotes/origin/beta)"

# Preview the exact two commits without touching the index, working tree, or a
# branch ref. A conflict exits before the integration worktree exists.
if ! git merge-tree --write-tree --quiet "$beta_base" "$source_tip"; then
  show_conflict_report "$beta_base" "$source_tip" "$branch -> beta"
  exit 1
fi

integration_dir="$(mktemp -d "${TMPDIR:-/tmp}/oparax-ship-${issue}.XXXXXX")"
rmdir "$integration_dir"
keep_integration="false"
cleanup_integration() {
  if [ -n "${integration_dir:-}" ] && [ -d "$integration_dir" ] && [ "$keep_integration" = "false" ]; then
    git worktree remove "$integration_dir" >/dev/null 2>&1 || true
  fi
}
trap cleanup_integration EXIT

git worktree add --detach "$integration_dir" "$beta_base" >&2
if ! git -C "$integration_dir" merge --squash "$source_tip" >&2; then
  keep_integration="true"
  echo "ship: the clean preview and real squash disagreed. Recovery worktree kept at $integration_dir; no ref was pushed." >&2
  exit 1
fi

git -C "$integration_dir" commit \
  -m "$msg" \
  --trailer "Feature-Issue: #$issue" \
  --trailer "Feature-Branch: $branch" \
  --trailer "Feature-Source-Tip: $source_tip" >&2
beta_commit="$(git -C "$integration_dir" rev-parse HEAD)"

# The new commit's parent is the fetched beta tip, so this is a normal
# fast-forward update. Remote movement is rejected; no force option is used.
if ! git -C "$integration_dir" push origin "$beta_commit:refs/heads/beta" >&2; then
  keep_integration="true"
  echo "ship: origin/beta moved or the push failed. Recovery commit $beta_commit and worktree $integration_dir were kept; the feature branch is also safe on origin." >&2
  exit 1
fi

live_beta="$(remote_ref_sha origin refs/heads/beta)" || {
  keep_integration="true"
  echo "ship: beta push returned success but its live ref could not be verified. Recovery worktree kept at $integration_dir." >&2
  exit 1
}
[ "$live_beta" = "$beta_commit" ] || {
  keep_integration="true"
  echo "ship: live origin/beta ($live_beta) differs from the pushed integration commit ($beta_commit). Recovery worktree kept at $integration_dir." >&2
  exit 1
}

git worktree remove "$integration_dir" >&2
integration_dir=""
trap - EXIT

echo "Shipped $branch -> beta. beta_sha=$beta_commit recovery_tip=$source_tip"
