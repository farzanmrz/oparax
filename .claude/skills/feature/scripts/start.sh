#!/usr/bin/env bash
# Phase 1's closing kickoff — create the issue, then cut the ONE feature branch off
# dev, handing Phase 2 (build) its working branch. Runs only after the plan-approval
# gate, so a rejected plan never leaves an orphan issue. stdout is ONLY the new issue
# number (git chatter is sent to stderr) so the caller can capture it — it names the
# branch (ft/<issue-number>, number only) and drives ship.sh in Phase 4.
#
# Usage:  start.sh "<issue title>" [<plan-body-file>]
#         With no file argument (or "-"), the plan body is read from stdin — the
#         approved plan pipes straight from the chat gate; no draft file exists.
# Run from the repo root.
set -euo pipefail

title="${1:?usage: start.sh \"<issue title>\" [<plan-body-file>]}"
body="${2:--}"
if [ "$body" = "-" ]; then
  bodyfile="$(mktemp)"
  trap 'rm -f "$bodyfile"' EXIT
  cat > "$bodyfile"
  [ -s "$bodyfile" ] || { echo "start: empty plan body on stdin" >&2; exit 1; }
else
  [ -f "$body" ] || { echo "start: plan body file not found: $body" >&2; exit 1; }
  bodyfile="$body"
fi

# Refuse on a dirty tree — Phase 2 (build) starts from a clean dev base.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "start: working tree not clean — commit or stash first." >&2
  exit 1
fi

# Base off an up-to-date dev (chatter to stderr, keeping stdout clean).
git checkout dev >&2
git pull --ff-only origin dev >&2

# Create the issue; gh prints its URL (…/issues/<number>). Take the FIRST /issues/<n>
# match's digits so extra output lines or trailing whitespace can't corrupt the number.
url="$(gh issue create --title "$title" --body-file "$bodyfile")"
issue="$(printf '%s\n' "$url" | grep -oE '/issues/[0-9]+' | head -n1 | grep -oE '[0-9]+' || true)"
[ -n "$issue" ] || { echo "start: could not parse issue number from: $url" >&2; exit 1; }

# Cut the single feature branch — named ft/<issue-number>, the number only.
git checkout -b "ft/${issue}" >&2

# The only stdout line: the issue number, for the caller to capture.
echo "$issue"
