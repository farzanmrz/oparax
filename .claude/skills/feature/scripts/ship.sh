#!/usr/bin/env bash
# Transactional feature shipping. The default invocation lands a tracked
# ft/<issue> on dev through a temporary detached worktree; --current ships an
# explicitly-started direct dev run. A separate --finalize invocation closes the
# issue and performs conservative old-feature cleanup only after the requested
# promotion/deployment checks have completed.
#
# Usage:
#   ship.sh [--target dev|beta|main] <issue-number> "<commit message>"
#   ship.sh --current [--target dev|beta|main] "<commit message>"
#   ship.sh --finalize <issue-number>
#   ship.sh --finalize --current
set -euo pipefail

usage() {
  cat >&2 <<'USAGE'
usage:
  ship.sh [--target dev|beta|main] <issue-number> "<commit message>"
  ship.sh --current [--target dev|beta|main] "<commit message>"
  ship.sh --finalize <issue-number>
  ship.sh --finalize --current
USAGE
  exit 2
}

mode="tracked"
target="dev"
finalize="false"
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

case "$target" in
  dev | beta | main) ;;
  *)
    echo "ship: target must be dev, beta, or main (got: $target)." >&2
    exit 2
    ;;
esac

if [ "$mode" = "tracked" ]; then
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
else
  issue=""
  branch="dev"
  if [ "$finalize" = "true" ]; then
    [ "$#" -eq 0 ] || usage
    msg=""
  else
    [ "$#" -eq 1 ] || usage
    msg="$1"
  fi
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$repo_root" ] || {
  echo "ship: run from inside the repository." >&2
  exit 1
}
cd "$repo_root"
state_helper="$repo_root/.claude/skills/feature-handoff/scripts/state.mjs"
[ -f "$state_helper" ] || {
  echo "ship: feature state helper is missing: $state_helper" >&2
  exit 1
}

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

find_recorded_tip() {
  recorded_branch="$1"
  git log --first-parent refs/remotes/origin/dev \
    --format='%H%x09%(trailers:key=Feature-Branch,valueonly,separator=%x2C)%x09%(trailers:key=Feature-Source-Tip,valueonly,separator=%x2C)' \
    | awk -F '\t' -v wanted="$recorded_branch" '$2 == wanted && $3 != "" { print $3; exit }'
}

find_recorded_ship_commit() {
  recorded_branch="$1"
  recorded_issue="$2"
  recorded_source_tip="$3"
  git log --first-parent refs/remotes/origin/dev \
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

  git fetch --prune origin dev >&2
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
      echo "ship: skip $candidate (origin/dev has no matching Feature-Branch and Feature-Source-Tip trailers)." >&2
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
  git fetch --prune origin dev >&2
  if [ "$mode" = "tracked" ]; then
    shipped_tip="$(find_recorded_tip "$branch" || true)"
    [ -n "$shipped_tip" ] || {
      echo "ship: cannot finalize $branch — origin/dev lacks its ship trailers." >&2
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
    gh issue close "$issue" --comment "Shipped to dev and completed the authorized release path." >&2
  else
    remote_dev="$(remote_ref_sha origin refs/heads/dev)" || {
      echo "ship: cannot verify origin/dev before finalizing the direct run." >&2
      exit 1
    }
    [ "$remote_dev" = "$(git rev-parse HEAD)" ] || {
      echo "ship: direct dev HEAD is not the live origin/dev tip; refusing finalization." >&2
      exit 1
    }
  fi

  cleanup_old_feature_branches "$branch"

  node "$state_helper" clear --branch "$branch" >&2
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
    if [ "$mode" = "tracked" ]; then
      git commit -m "ship: recovery snapshot for $branch" >&2
    else
      git commit -m "$msg" >&2
    fi
  fi
fi

if [ "$mode" = "current" ]; then
  source_tip="$(git rev-parse HEAD)"
  node "$state_helper" update \
    --branch "$branch" \
    --source-tip "$source_tip" \
    --phase shipping \
    --gate integrate-dev \
    --target "$target" >&2
  git fetch origin dev >&2
  remote_dev="$(git rev-parse refs/remotes/origin/dev)"
  if ! git merge-base --is-ancestor "$remote_dev" HEAD; then
    echo "ship: direct dev no longer descends from origin/dev; no push attempted." >&2
    exit 1
  fi
  dev_tip="$(git rev-parse HEAD)"
  if ! git push origin "$dev_tip:refs/heads/dev" >&2; then
    echo "ship: direct dev push was rejected. Local commit $dev_tip remains recoverable." >&2
    exit 1
  fi
  live_dev="$(remote_ref_sha origin refs/heads/dev)" || {
    echo "ship: pushed dev but could not verify its live remote ref." >&2
    exit 1
  }
  [ "$live_dev" = "$dev_tip" ] || {
    echo "ship: live origin/dev ($live_dev) does not match the pushed commit ($dev_tip)." >&2
    exit 1
  }
  if [ "$target" = "dev" ]; then
    next_gate="finalize"
  else
    next_gate="promote-beta"
  fi
  node "$state_helper" update \
    --branch "$branch" \
    --source-tip "$dev_tip" \
    --phase shipped-dev \
    --gate "$next_gate" \
    --target "$target" >&2
  echo "Shipped direct dev commit $dev_tip. Authorized terminal target: $target."
  exit 0
fi

source_tip="$(git rev-parse HEAD)"
node "$state_helper" update \
  --branch "$branch" \
  --source-tip "$source_tip" \
  --phase shipping \
  --gate integrate-dev \
  --target "$target" >&2

# Publish the exact feature tip first. A normal non-force push supplies a remote
# recovery copy and rejects if somebody moved the branch unexpectedly.
if ! git push origin "$source_tip:refs/heads/$branch" >&2; then
  echo "ship: feature recovery push was rejected; dev was not changed." >&2
  exit 1
fi
live_feature="$(remote_ref_sha origin "refs/heads/$branch")" || {
  echo "ship: could not verify the live recovery branch; dev was not changed." >&2
  exit 1
}
[ "$live_feature" = "$source_tip" ] || {
  echo "ship: live $branch moved after push; dev was not changed." >&2
  exit 1
}

git fetch origin dev >&2
dev_base="$(git rev-parse refs/remotes/origin/dev)"

# Preview the exact two commits without touching the index, working tree, or a
# branch ref. A conflict exits before the integration worktree exists.
if ! git merge-tree --write-tree --quiet "$dev_base" "$source_tip"; then
  show_conflict_report "$dev_base" "$source_tip" "$branch -> dev"
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

git worktree add --detach "$integration_dir" "$dev_base" >&2
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
dev_commit="$(git -C "$integration_dir" rev-parse HEAD)"

# The new commit's parent is the fetched dev tip, so this is a normal
# fast-forward update. Remote movement is rejected; no force option is used.
if ! git -C "$integration_dir" push origin "$dev_commit:refs/heads/dev" >&2; then
  keep_integration="true"
  echo "ship: origin/dev moved or the push failed. Recovery commit $dev_commit and worktree $integration_dir were kept; the feature branch is also safe on origin." >&2
  exit 1
fi

live_dev="$(remote_ref_sha origin refs/heads/dev)" || {
  keep_integration="true"
  echo "ship: dev push returned success but its live ref could not be verified. Recovery worktree kept at $integration_dir." >&2
  exit 1
}
[ "$live_dev" = "$dev_commit" ] || {
  keep_integration="true"
  echo "ship: live origin/dev ($live_dev) differs from the pushed integration commit ($dev_commit). Recovery worktree kept at $integration_dir." >&2
  exit 1
}

git worktree remove "$integration_dir" >&2
integration_dir=""
trap - EXIT

if [ "$target" = "dev" ]; then
  next_gate="finalize"
else
  next_gate="promote-beta"
fi
node "$state_helper" update \
  --branch "$branch" \
  --source-tip "$source_tip" \
  --phase shipped-dev \
  --gate "$next_gate" \
  --target "$target" >&2

echo "Shipped $branch -> dev as $dev_commit; recovery tip $source_tip retained locally and on origin. Authorized terminal target: $target."
