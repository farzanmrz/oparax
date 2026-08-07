#!/bin/bash
# Codex PostToolUse adapter for the repo's format-on-write hook.
# Codex shares Claude Code's hook payload shape (proven by the rtk PreToolUse
# adapter), so for Edit/Write-style tools this delegates straight to
# .claude/hooks/biome-write.sh. Codex's apply_patch tool, however, carries the
# whole patch instead of a file_path, so this also extracts "Update File:" /
# "Add File:" paths from a patch body and formats each.
#
# Fail-open by design: any parse error exits 0 silently — worst case a file
# stays unformatted until QC's residual-lint step, same as before this hook.
set -uo pipefail

raw="$(cat)"
[ -n "$raw" ] || exit 0

repo="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
biome="$repo/node_modules/.bin/biome"
[ -x "$biome" ] || exit 0

fmt() {
  case "$1" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json)
      "$biome" check --write --no-errors-on-unmatched "$1" >/dev/null 2>&1 ;;
  esac
}

# Edit/Write shape: tool_input.file_path
path="$(printf '%s' "$raw" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
if [ -n "$path" ]; then
  fmt "$path"
  exit 0
fi

# apply_patch shape: the patch body names its files. Accept either .tool_input
# as a string or its common wrapper keys, then scan for the patch envelope's
# file headers. ALSO accept exec-wrapped patches: Codex routes edits through
# the unified exec tool with apply_patch inside .tool_input.cmd/.command
# (measured 2026-08-06: every sampled edit arrived this way, so the original
# matcher+keys never fired once — which is how import-order trivia reached
# QC). The sed header scan below works unchanged on a heredoc-wrapped cmd
# string because the patch's file-header lines still start at column 0.
patch="$(printf '%s' "$raw" | jq -r '
  .tool_input.patch
  // .tool_input.input
  // (.tool_input.cmd | if type == "array" then join(" ") elif type == "string" then . else empty end)
  // (.tool_input.command | if type == "array" then join(" ") elif type == "string" then . else empty end)
  // (.tool_input | if type == "string" then . else empty end)
  // empty' 2>/dev/null)"
[ -n "$patch" ] || exit 0
# Two expressions, not \| alternation: BSD sed (macOS) does not support \| in
# basic regex, so the alternation form silently matched NOTHING (measured
# 2026-08-06 — the second dead layer of this hook, after the matcher gap).
printf '%s\n' "$patch" | sed -n -e 's/^\*\*\* Update File: //p' -e 's/^\*\*\* Add File: //p' | while IFS= read -r p; do
  [ -n "$p" ] || continue
  case "$p" in /*) fmt "$p" ;; *) fmt "$repo/$p" ;; esac
done

exit 0
