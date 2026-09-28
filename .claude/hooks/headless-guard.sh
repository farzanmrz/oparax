#!/usr/bin/env bash
# Blocks outward git and gh commands inside the headless QC sessions the orchestrator starts
# (they run with OPARAX_HEADLESS=1). The owner's Claude settings allow every git and gh command,
# and a prefix deny list misses `git -C <worktree> push`, so this reads the whole command.
# Interactive sessions are untouched: ship pushes beta and promote opens pull requests.
[ "${OPARAX_HEADLESS:-}" = "1" ] || exit 0
cmd="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)"
if printf '%s' "$cmd" | grep -Eq '(^|[;&|[:space:]])(git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+(push|merge|switch|checkout|reset|branch|rebase|worktree)|gh[[:space:]]+(pr|api|issue|repo|release))([[:space:]]|$)'; then
  echo "Blocked in a headless session: $cmd" >&2
  exit 2
fi
exit 0
