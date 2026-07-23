#!/bin/sh

set -eu

record_path=".codex/outreach/records.json"
commit_message="chore(outreach): sync records"

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

if [ ! -f "$record_path" ]; then
  echo "Missing outreach record store: $record_path" >&2
  exit 1
fi

branch=$(git symbolic-ref --quiet --short HEAD) || {
  echo "Cannot sync outreach records from a detached HEAD." >&2
  exit 1
}

if [ -n "$(git diff --name-only --diff-filter=U -- "$record_path")" ]; then
  echo "Cannot sync outreach records while $record_path has merge conflicts." >&2
  exit 1
fi

if git diff --quiet -- "$record_path" && git diff --cached --quiet -- "$record_path"; then
  echo "No outreach record changes to sync."
  exit 0
fi

remote=$(git config --get "branch.$branch.remote" || true)
if [ -z "$remote" ] || [ "$remote" = "." ]; then
  echo "Current branch '$branch' has no configured push remote." >&2
  exit 1
fi

remote_ref="refs/remotes/$remote/$branch"
if ! git fetch --quiet "$remote" "refs/heads/$branch:$remote_ref"; then
  echo "Cannot sync records until '$branch' already exists on '$remote'." >&2
  exit 1
fi

local_commit=$(git rev-parse HEAD)
remote_commit=$(git rev-parse "$remote_ref")
if [ "$local_commit" != "$remote_commit" ]; then
  echo "Refusing to mix the record sync with other unpushed or incoming commits on '$branch'." >&2
  echo "Make HEAD match $remote/$branch, then rerun this helper." >&2
  exit 1
fi

# --only makes the path boundary independent of any unrelated staged changes.
git commit --only -m "$commit_message" -- "$record_path"

committed_files=$(git diff-tree --no-commit-id --name-only -r HEAD)
if [ "$committed_files" != "$record_path" ]; then
  echo "Outreach sync commit contained an unexpected path; refusing to push." >&2
  exit 1
fi

git push "$remote" "HEAD:refs/heads/$branch"
echo "Synced $record_path to $remote/$branch at $(git rev-parse --short HEAD)."
