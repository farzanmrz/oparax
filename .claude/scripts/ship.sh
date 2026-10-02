#!/usr/bin/env bash
# Ship a feature/bug branch to beta as one squash commit built from Git objects, so no
# second checkout is ever created. Production advances only through the /promote pull
# request. Branches stay intact.
#
# Usage:
#   ship.sh [--onto beta] <issue-number> "<commit message>"
set -euo pipefail
original_args=("$@")

usage() {
  echo 'usage: ship.sh [--onto beta] <issue-number> "<commit message>"' >&2
  exit 2
}

onto="beta"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --onto)
      shift
      onto="${1:-}"
      case "$onto" in
        beta) ;;
        main)
          echo "ship: direct production shipping is retired. Ship to beta, then use /promote to open the production pull request." >&2
          exit 2
          ;;
        *)
          echo "ship: --onto must be beta; production uses /promote." >&2
          exit 2
          ;;
      esac
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

[ "$#" -eq 2 ] || usage
issue="$1"
msg="$2"
case "$issue" in
  '' | *[!0-9]*)
    echo "ship: issue number must contain digits only." >&2
    exit 2
    ;;
esac
# ft/<N> unless HEAD already sits on bf/<N>: the bugfix flow shares these
# mechanics, and the trailers keep their Feature-* keys for history parsing.
branch="ft/${issue}"
if [ "$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)" = "bf/${issue}" ]; then
  branch="bf/${issue}"
fi

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

# Re-exec under the same repository-wide lease before any Git or record writes.
if [ -z "${OPARAX_WRITER_FD:-}" ]; then
  exec python3 .claude/scripts/writer-lease.py run --repo "$repo_root" --run-id "ship-${issue}" -- \
    bash "$repo_root/.claude/scripts/ship.sh" "${original_args[@]}"
fi
python3 .claude/scripts/writer-lease.py verify --repo "$repo_root" \
  --run-id "${OPARAX_RUN_ID:-}" --token "${OPARAX_WRITER_TOKEN:-}" || {
  echo "ship: missing or stale writer lease; no integration started." >&2
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
# A fix commit, generic done comment, or earlier PASS is never shipping proof.
gh issue view "$issue" --json comments | python3 .claude/scripts/qc-proof.py --commit "$source_tip"

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

git fetch origin "$onto" >&2
beta_base="$(git rev-parse "refs/remotes/origin/${onto}")"

# Merge the two commits into a tree without touching the index, working tree or any
# branch ref, then make the squash commit on top of the fetched target tip.
if ! merge_out="$(git merge-tree --write-tree "$beta_base" "$source_tip")"; then
  show_conflict_report "$beta_base" "$source_tip" "$branch -> $onto"
  exit 1
fi
tree="${merge_out%%$'\n'*}"
message="$(printf '%s\n' "$msg" | git interpret-trailers \
  --trailer "Feature-Issue: #$issue" \
  --trailer "Feature-Branch: $branch" \
  --trailer "Feature-Source-Tip: $source_tip")"
beta_commit="$(git commit-tree "$tree" -p "$beta_base" -m "$message")"

# The new commit's parent is the fetched target tip, so this is a normal
# fast-forward update. Remote movement is rejected; no force option is used.
if ! git push origin "$beta_commit:refs/heads/${onto}" >&2; then
  echo "ship: origin/${onto} moved or the push failed. Recovery commit $beta_commit is kept locally; the source branch is also safe on origin." >&2
  exit 1
fi

live_beta="$(remote_ref_sha origin "refs/heads/${onto}")" || {
  echo "ship: ${onto} push returned success but its live ref could not be verified. Recovery commit: $beta_commit." >&2
  exit 1
}
[ "$live_beta" = "$beta_commit" ] || {
  echo "ship: live origin/${onto} ($live_beta) differs from the pushed squash commit ($beta_commit)." >&2
  exit 1
}

# The slice is on ${onto} and verified, so the issue is done, close it here
# rather than deferring to a separate step. Never fatal: the push already
# succeeded and nothing about a failed gh call can un-ship it, so a hiccup
# prints the manual fallback instead of making a good ship look like a failure.
if gh issue close "$issue" --comment "Shipped to ${onto} as ${beta_commit}." >&2; then
  echo "ship: closed issue #$issue." >&2
else
  echo "ship: WARNING: ${onto} has the slice but issue #$issue could not be closed. Close it yourself: gh issue close $issue" >&2
fi

echo "Shipped $branch -> ${onto}. ${onto}_sha=$beta_commit recovery_tip=$source_tip"
