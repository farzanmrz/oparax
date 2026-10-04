#!/usr/bin/env bash
# Headless QC reads the issue; the supervisor owns PASS proof and pushes.
[ "${OPARAX_HEADLESS:-}" = "1" ] || exit 0
python3 -c '
import json,re,shlex,sys
cmd=json.load(sys.stdin).get("tool_input",{}).get("command", "")
blocked=bool(re.search(r"(^|[;&|\s])git(?:\s+-C\s+\S+)?\s+(push|merge|switch|checkout|reset|rebase|worktree|branch(?!\s+--show-current(?:\s|$)))(?:\s|$)",cmd))
try:
    parts=shlex.split(cmd, posix=True)
except ValueError:
    parts=[]
    blocked=True
for i,part in enumerate(parts):
    if part == "gh" and parts[i+1:i+3] != ["issue", "view"]:
        blocked=True
if blocked:
    print("Blocked in a headless session: " + cmd, file=sys.stderr)
    sys.exit(2)
'
