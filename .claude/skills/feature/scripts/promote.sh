#!/usr/bin/env bash
# Promote one remote branch hop without checking out or changing the caller's
# branch. The feature flow deliberately invokes one hop at a time so it can
# verify the matching Vercel deployment before beginning the next hop.
#
# Usage:
#   promote.sh dev beta
#   promote.sh beta main
#
# This script performs Git integration only. Its stdout is exactly the new
# destination commit SHA; all human-readable status is written to stderr.
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: promote.sh dev beta | promote.sh beta main" >&2
  exit 2
fi

source_branch="$1"
destination_branch="$2"

case "${source_branch}:${destination_branch}" in
  dev:beta)
    deployment_alias="beta.oparax.ai"
    ;;
  beta:main)
    deployment_alias="oparax.ai"
    ;;
  *)
    echo "promote: invalid hop ${source_branch} -> ${destination_branch}." >&2
    echo "promote: the only allowed hops are dev -> beta and beta -> main." >&2
    exit 2
    ;;
esac

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "promote: run this command inside a Git repository." >&2
  exit 1
}
cd "$repo_root"

source_ref="refs/remotes/origin/${source_branch}"
destination_ref="refs/remotes/origin/${destination_branch}"
preview_file=""
temp_parent=""
worktree_path=""
worktree_added=0
retain_worktree=0

cleanup() {
  status=$?
  trap - EXIT

  if [ "$worktree_added" -eq 1 ] && [ "$retain_worktree" -eq 0 ]; then
    if ! git -C "$repo_root" worktree remove "$worktree_path" >/dev/null 2>&1; then
      echo "promote: could not remove temporary worktree: $worktree_path" >&2
      if [ "$status" -eq 0 ]; then
        status=1
      fi
    fi
  fi

  if [ -n "$preview_file" ]; then
    rm -f "$preview_file"
  fi
  if [ -n "$temp_parent" ] && [ "$retain_worktree" -eq 0 ]; then
    rmdir "$temp_parent" 2>/dev/null || true
  fi

  exit "$status"
}
trap cleanup EXIT

echo "promote: fetching origin/${source_branch} and origin/${destination_branch}." >&2
git fetch origin \
  "refs/heads/${source_branch}:${source_ref}" \
  "refs/heads/${destination_branch}:${destination_ref}" >&2

if ! git show-ref --verify --quiet "$source_ref"; then
  echo "promote: origin/${source_branch} does not exist after fetch." >&2
  exit 1
fi
if ! git show-ref --verify --quiet "$destination_ref"; then
  echo "promote: origin/${destination_branch} does not exist after fetch." >&2
  exit 1
fi

source_sha="$(git rev-parse "${source_ref}^{commit}")"
destination_before_sha="$(git rev-parse "${destination_ref}^{commit}")"

emit_verification_contract() {
  promoted_sha="$1"
  result="$2"

  printf '%s\n' "$promoted_sha"
  echo "promote: result: ${result}; ${source_branch} ${source_sha} -> ${destination_branch} ${promoted_sha}." >&2
  echo "promote: Git hop complete. Do not begin another promotion hop until" >&2
  echo "promote: ${deployment_alias} has a READY Vercel deployment for exact Git SHA ${promoted_sha}." >&2
}

# A repeated invocation is safe. It still emits the deployment-verification
# contract because the caller must prove the destination alias serves this SHA.
if git merge-base --is-ancestor "$source_sha" "$destination_before_sha"; then
  echo "promote: origin/${destination_branch} already contains origin/${source_branch}; no Git update needed." >&2
  emit_verification_contract "$destination_before_sha" "already-contained"
  exit 0
fi

# merge-tree writes only an unreachable tree object. It does not touch a ref,
# index, or worktree, so conflicts are discovered before any integration state
# exists. Keep the full diagnostics in a temporary file for a useful report.
preview_file="$(mktemp "${TMPDIR:-/tmp}/oparax-promote-preview.XXXXXX")"
preview_status=0
git merge-tree --write-tree --messages --name-only \
  "$destination_ref" "$source_ref" >"$preview_file" 2>&1 || preview_status=$?

if [ "$preview_status" -ne 0 ]; then
  echo "promote: origin/${source_branch} cannot be merged cleanly into origin/${destination_branch}." >&2
  echo >&2
  echo "Changes only on ${source_branch}:" >&2
  git log --format='  %h %s' "${destination_ref}..${source_ref}" >&2 || true
  echo >&2
  echo "Changes only on ${destination_branch}:" >&2
  git log --format='  %h %s' "${source_ref}..${destination_ref}" >&2 || true
  echo >&2
  echo "Conflicting paths and Git diagnostics:" >&2
  sed 's/^/  /' "$preview_file" >&2
  echo >&2
  echo "Git could not combine these paths mechanically. That does not mean the" >&2
  echo "two intentions are incompatible. Review the affected behavior, then choose" >&2
  echo "one resolution: preserve compatible changes from both sides, prefer" >&2
  echo "${destination_branch}, or prefer ${source_branch}. No refs were changed." >&2
  exit 1
fi

preview_tree="$(sed -n '1p' "$preview_file")"
case "$preview_tree" in
  '' | *[!0-9a-f]*)
    echo "promote: merge preview returned an invalid tree id: ${preview_tree:-<empty>}" >&2
    exit 1
    ;;
esac
if ! git cat-file -e "${preview_tree}^{tree}" 2>/dev/null; then
  echo "promote: merge preview tree is not available: $preview_tree" >&2
  exit 1
fi

temp_parent="$(mktemp -d "${TMPDIR:-/tmp}/oparax-promote-${destination_branch}.XXXXXX")"
worktree_path="${temp_parent}/worktree"
git worktree add --detach "$worktree_path" "$destination_ref" >&2
worktree_added=1

# Use a normal two-parent merge commit so destination-only history is retained.
# A failure here is unexpected after merge-tree; retain the worktree so nothing
# potentially useful is destroyed while the conflict is investigated.
if ! git -C "$worktree_path" merge --no-ff \
  -m "promote: ${source_branch} -> ${destination_branch}" "$source_ref" >&2; then
  retain_worktree=1
  echo "promote: integration failed after a clean preview." >&2
  echo "promote: retained diagnostic worktree: $worktree_path" >&2
  echo "promote: no remote ref was changed." >&2
  exit 1
fi

promoted_sha="$(git -C "$worktree_path" rev-parse HEAD)"
promoted_tree="$(git -C "$worktree_path" rev-parse 'HEAD^{tree}')"
first_parent="$(git -C "$worktree_path" rev-parse 'HEAD^1')"
second_parent="$(git -C "$worktree_path" rev-parse 'HEAD^2')"

if [ "$first_parent" != "$destination_before_sha" ] || [ "$second_parent" != "$source_sha" ]; then
  retain_worktree=1
  echo "promote: refusing to push an unexpected merge parent set." >&2
  echo "promote: retained recovery worktree: $worktree_path" >&2
  exit 1
fi
if [ "$promoted_tree" != "$preview_tree" ]; then
  retain_worktree=1
  echo "promote: merge result differs from the non-mutating preview." >&2
  echo "promote: retained recovery worktree: $worktree_path" >&2
  exit 1
fi

# From this point onward a recovery commit exists. Retain its worktree until the
# exact remote ref has been confirmed; any push or verification failure leaves
# the commit immediately inspectable.
retain_worktree=1

read_remote_sha() {
  local branch="$1"
  local line
  line="$(git ls-remote --exit-code origin "refs/heads/${branch}")" || return 1
  printf '%s' "${line%%[[:space:]]*}"
}

# Refuse to publish a merge of stale inputs. A destination race is also
# rejected by the normal non-force push below; checking both refs here gives a
# direct explanation and catches a source advance that the push cannot see.
live_source_sha="$(read_remote_sha "$source_branch")" || {
  echo "promote: could not re-read origin/${source_branch} before push." >&2
  echo "promote: retained recovery worktree: $worktree_path" >&2
  exit 1
}
live_destination_sha="$(read_remote_sha "$destination_branch")" || {
  echo "promote: could not re-read origin/${destination_branch} before push." >&2
  echo "promote: retained recovery worktree: $worktree_path" >&2
  exit 1
}
if [ "$live_source_sha" != "$source_sha" ]; then
  echo "promote: origin/${source_branch} moved during promotion; refusing a stale merge." >&2
  echo "promote: expected $source_sha but found $live_source_sha." >&2
  echo "promote: retained recovery worktree: $worktree_path" >&2
  exit 1
fi
if [ "$live_destination_sha" != "$destination_before_sha" ]; then
  echo "promote: origin/${destination_branch} moved during promotion; refusing to overwrite it." >&2
  echo "promote: expected $destination_before_sha but found $live_destination_sha." >&2
  echo "promote: retained recovery worktree: $worktree_path" >&2
  exit 1
fi

if ! git push origin "${promoted_sha}:refs/heads/${destination_branch}" >&2; then
  echo "promote: push was rejected; origin/${destination_branch} may have moved." >&2
  echo "promote: retained recovery worktree: $worktree_path" >&2
  echo "promote: expected commit: $promoted_sha" >&2
  exit 1
fi

remote_line="$(git ls-remote --exit-code origin "refs/heads/${destination_branch}")" || {
  echo "promote: push returned success, but the remote ref could not be read back." >&2
  echo "promote: retained recovery worktree: $worktree_path" >&2
  exit 1
}
remote_sha="${remote_line%%[[:space:]]*}"
if [ "$remote_sha" != "$promoted_sha" ]; then
  echo "promote: remote verification mismatch for origin/${destination_branch}." >&2
  echo "promote: expected $promoted_sha but found ${remote_sha:-<empty>}." >&2
  echo "promote: retained recovery worktree: $worktree_path" >&2
  exit 1
fi

retain_worktree=0
emit_verification_contract "$promoted_sha" "promoted"
