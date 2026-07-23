#!/usr/bin/env bash
# Council member: Grok (xAI grok-4.5, SuperGrok subscription). One-shot, read-only, schema-bound.
# Usage: plan-grok.sh <prompt-file> <schema-file> <effort> <out-file>
#   effort: low|medium|high  (ablation: low≈medium≈103s; high 163s; xhigh/max ERROR — never pass them)
# grok auto-reads AGENTS.md; --json-schema returns a parsed .structuredOutput object.
# Emits the plan JSON to <out-file>; exit 0 on success, 1 (+ GROK_FAILED) otherwise. Best-effort.
set -uo pipefail
SECONDS=0  # bash stopwatch: wall-seconds for this member (folded into OUT as .elapsed_s)
PF="$1"; SCHEMA="$2"; EFF="${3:-high}"; OUT="$4"
REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"
DEPTH="${COUNCIL_DEPTH:-simple}"
KEY="${COUNCIL_CHECK_KEY:-plan}"  # QC's find/verify stages pass "findings" / "verdict"
raw="$(mktemp)"
# DEEP: let grok explore ft/68 at native depth — subagents ON (no --no-subagents), generous --max-turns,
#       and NO --disallowed-tools (that flag named a non-existent tool anyway; read-only sandbox still
#       blocks writes/network). SIMPLE: the old no-survey invocation (prompt forbids reads).
if [ "$DEPTH" = "deep" ]; then
  grok --prompt-file "$PF" --json-schema "$(cat "$SCHEMA")" --sandbox read-only --cwd "$REPO" \
       --always-approve --effort "$EFF" -m grok-4.5 --max-turns 60 \
       --output-format json > "$raw" 2>&1
else
  grok --prompt-file "$PF" --json-schema "$(cat "$SCHEMA")" --sandbox read-only --cwd "$REPO" \
       --disallowed-tools run_terminal_cmd --always-approve --effort "$EFF" -m grok-4.5 \
       --output-format json > "$raw" 2>&1
fi
if jq -e --arg k "$KEY" '.structuredOutput[$k]|length' "$raw" >/dev/null 2>&1; then
  jq --argjson t "$SECONDS" --arg tier "$EFF" '.structuredOutput + {elapsed_s:$t, tier:$tier}' "$raw" > "$OUT"
  rm -f "$raw"; exit 0
else echo "GROK_FAILED (${SECONDS}s)" >&2; rm -f "$raw"; exit 1; fi
