#!/bin/bash
# PreToolUse guard for the ts-formatter subagent: only allow Edit/Write on .ts/.tsx files.
# Reads the hook JSON from stdin, pulls tool_input.file_path, and exits 2 to block any non-.ts/.tsx target.

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')

# No file path on this call — nothing to guard.
if [ -z "$FILE" ]; then
  exit 0
fi

case "$FILE" in
  *.ts | *.tsx)
    exit 0
    ;;
  *)
    echo "Blocked: ts-formatter may only edit .ts/.tsx files (attempted: $FILE)" >&2
    exit 2
    ;;
esac
