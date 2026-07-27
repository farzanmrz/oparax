#!/usr/bin/env bash
# Deterministic test-user login for a headless agent-browser session.
#
# Usage: qc-login.sh <session-name> [base-url]
#
# The QC browser agents call this instead of ever reasoning about the login
# form themselves: the fields and credentials are fixed (testuser@oparax.ai —
# the documented frontend test login, see AGENTS.md), so authentication is a
# script action, not a judgment. On success the shared state file is refreshed
# so `--state` stays a valid fast path for later sessions.
#
# Exit 0: the session is authenticated (either it already was, or login
# succeeded). Exit 1: login failed — THAT is the auth finding to report.
set -euo pipefail

session="${1:?usage: qc-login.sh <session-name> [base-url]}"
base="${2:-http://localhost:3000}"
state_file="$HOME/.agent-browser/oparax-qc-authenticated.json"

ab() { agent-browser --session "$session" "$@"; }

ab open "$base/login" >/dev/null
ab wait --load networkidle >/dev/null

# /login server-side-bounces an already-authenticated user to /agents.
path="$(ab eval 'location.pathname' 2>/dev/null || true)"
case "$path" in
  *agents*)
    echo "already-authenticated"
    exit 0
    ;;
esac

ab fill '#email' 'testuser@oparax.ai' >/dev/null
ab fill '#password' 'hello123' >/dev/null
ab click 'button[type="submit"]' >/dev/null
ab wait --load networkidle >/dev/null

path="$(ab eval 'location.pathname' 2>/dev/null || true)"
case "$path" in
  *agents*) ;;
  *)
    echo "login-failed: still on ${path:-unknown} after submit" >&2
    exit 1
    ;;
esac

# Refresh the shared snapshot so --state keeps working for parallel sessions.
ab state save "$state_file" >/dev/null 2>&1 || true
echo "authenticated"
