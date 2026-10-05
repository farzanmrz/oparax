#!/usr/bin/env bash
# PreToolUse guard for Bash (owner, October 5): every screenshot or render an agent takes is saved under img/ at
# the repo root. A screenshot command whose output path is not under img/ is refused with the reason.
input="$(cat)"
command="$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)"
case "$command" in
  *screenshot*)
    if ! printf '%s' "$command" | grep -qE '(^|[ /"'"'"'])img/'; then
      echo "Screenshots are saved under img/ at the repo root (owner rule, October 5). Rewrite the path as img/<name>.png." >&2
      exit 2
    fi
    ;;
esac
exit 0
