#!/usr/bin/env bash
# Append a deferred item to the single living backlog issue — the one place every
# feature flow parks "not this slice" work, instead of a sprawl of per-item issues.
#
# The backlog issue is the OLDEST open issue labeled `backlog` (min issue number —
# robust against a stray). Appends a GitHub task-list line to its body so the item is
# editable/checkable in place; later work that resolves an item edits the line out.
#
# Usage:  backlog-add.sh "<item text, one line — include origin #<issue> and · agent if agent-surfaced>"
# stdout: the backlog issue number the item landed in.
set -euo pipefail

item="${1:?usage: backlog-add.sh \"<item text>\"}"

num=$(gh issue list --label backlog --state open --json number --jq 'min_by(.number).number')
if [ -z "$num" ] || [ "$num" = "null" ]; then
  echo "backlog-add: no open issue labeled 'backlog' found — create the living backlog issue first." >&2
  exit 1
fi

body=$(gh issue view "$num" --json body --jq .body)
printf '%s\n- [ ] %s\n' "$body" "$item" | gh issue edit "$num" --body-file - >/dev/null
echo "$num"
