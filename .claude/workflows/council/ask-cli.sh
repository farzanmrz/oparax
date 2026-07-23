#!/usr/bin/env bash
# Generic one-shot CLI caller for ANY JSON schema (not just the plan schema) — used for cross-model
# blind QC judges in the bake-off (ranking/scoring outputs, not plans). Read-only, best-effort.
# Usage: ask-cli.sh <family> <prompt-file> <schema-file> <tier> <out-file>
#   family: codex | grok | agy    tier: codex/grok effort OR agy model slug
# Emits the schema-conforming JSON (+ .elapsed_s) to <out-file>; exit 0 ok, 1 (+ ASK_FAILED) otherwise.
set -uo pipefail
SECONDS=0
FAM="${1:?family}"; PF="${2:?prompt-file}"; SCHEMA="${3:?schema}"; TIER="${4:?tier}"; OUT="${5:?out}"
REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"
raw="$(mktemp)"
case "$FAM" in
  codex)
    codex exec --skip-git-repo-check -s read-only -c model_reasoning_effort="$TIER" \
      --output-schema "$SCHEMA" --output-last-message "$raw" -C "$REPO" - < "$PF" >/dev/null 2>&1 ;;
  grok)
    grok --prompt-file "$PF" --json-schema "$(cat "$SCHEMA")" --sandbox read-only --cwd "$REPO" \
      --disallowed-tools run_terminal_cmd --always-approve --effort "$TIER" -m grok-4.5 --output-format json 2>/dev/null \
      | jq '.structuredOutput' > "$raw" 2>/dev/null ;;
  agy)
    agy --print "$(cat "$PF")

Respond with ONLY the JSON object matching the schema. Do NOT use tools, do NOT read files." \
      --sandbox --print-timeout 5m --json-schema "$SCHEMA" --output-format json --model "$TIER" --add-dir "$REPO" 2>/dev/null \
      | jq '.structured_output' > "$raw" 2>/dev/null ;;
  *) echo "ASK_FAILED: unknown family '$FAM'" >&2; rm -f "$raw"; exit 1 ;;
esac
if jq -e 'type=="object"' "$raw" >/dev/null 2>&1; then
  jq --argjson t "$SECONDS" --arg fam "$FAM" '. + {elapsed_s:$t, judge:$fam}' "$raw" > "$OUT"; rm -f "$raw"; exit 0
else echo "ASK_FAILED ($FAM ${SECONDS}s)" >&2; rm -f "$raw"; exit 1; fi
