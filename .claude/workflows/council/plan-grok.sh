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
raw_out="$(mktemp)"
raw_err="$(mktemp)"
raw_failure="${OUT%.out.json}.raw.err"
# A restarted lane must never look complete because a previous run left a result.
rm -f "$OUT"
# DEEP: let grok explore ft/68 at native depth — subagents ON (no --no-subagents), generous --max-turns,
#       and NO --disallowed-tools (that flag named a non-existent tool anyway; read-only sandbox still
#       blocks writes/network). SIMPLE: the old no-survey invocation (prompt forbids reads).
if [ "$DEPTH" = "deep" ]; then
  # GROK_SUBAGENTS=1: experimental (2026-07-27) — enables grok's native subagent
  # types (explore/plan/general-purpose) so a deep run may fan out; undocumented
  # for headless, harmless if ignored. Set GROK_SUBAGENTS=0 to switch off.
  GROK_SUBAGENTS="${GROK_SUBAGENTS:-1}" \
  grok --prompt-file "$PF" --json-schema "$(cat "$SCHEMA")" --sandbox read-only --cwd "$REPO" \
       --always-approve --effort "$EFF" -m grok-4.5 --max-turns 150 \
       --output-format json > "$raw_out" 2> "$raw_err"
else
  grok --prompt-file "$PF" --json-schema "$(cat "$SCHEMA")" --sandbox read-only --cwd "$REPO" \
       --disallowed-tools run_terminal_cmd --always-approve --effort "$EFF" -m grok-4.5 \
       --output-format json > "$raw_out" 2> "$raw_err"
fi
if jq -e --arg k "$KEY" '
  (.structuredOutput | type == "object") and
  (.structuredOutput[$k] | type == "string" or type == "array" or type == "object")
' "$raw_out" >/dev/null 2>&1; then
  jq --argjson t "$SECONDS" --arg tier "$EFF" '.structuredOutput + {elapsed_s:$t, tier:$tier}' "$raw_out" > "$OUT"
  rm -f "$raw_out" "$raw_err"; exit 0
else
  {
    printf '%s\n' '--- grok stderr ---'
    cat "$raw_err"
    printf '%s\n' '--- grok stdout ---'
    cat "$raw_out"
  } > "$raw_failure" 2>/dev/null || true
  rm -f "$raw_out" "$raw_err"
  echo "GROK_FAILED (${SECONDS}s) — raw kept at $raw_failure" >&2; exit 1
fi
