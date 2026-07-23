#!/usr/bin/env bash
# SessionStart loader for exact-branch, exact-worktree feature handoffs.
# Nonblocking by design: malformed, missing, or stale state never prevents a session.
set -uo pipefail

repo="${CLAUDE_PROJECT_DIR:-.}"
helper="$repo/.claude/skills/feature-handoff/scripts/state.mjs"
[ -f "$helper" ] || exit 0
command -v node >/dev/null 2>&1 || exit 0

node "$helper" hook 2>/dev/null || true
exit 0
