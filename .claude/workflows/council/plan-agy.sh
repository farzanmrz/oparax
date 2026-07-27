#!/usr/bin/env bash
# Council member: agy (Google Antigravity, routed to gemini-3.1-pro / 3.6-flash). Read-only, schema-bound.
# Usage: plan-agy.sh <prompt-file> <schema-file> <model> <out-file>
#   model: gemini-3.1-pro-high | gemini-3.6-flash-high | gemini-3.6-flash-medium (flash = smoke-test tier)
# CRITICAL nuances (learned by iteration):
#   - prompt MUST be passed as the --print ARGUMENT, not piped stdin (piped stdin is ignored → agy explores).
#   - --output-format json yields a clean envelope; the plan is .structured_output (no fence/escape issues).
#   - the global RTK ~/.gemini/GEMINI.md was REMOVED (it derailed agy); no per-run mutation, parallel-safe.
# Emits the plan JSON to <out-file>; exit 0 on success, 1 (+ AGY_FAILED) otherwise. Best-effort.
set -uo pipefail
SECONDS=0  # bash stopwatch: wall-seconds for this member (folded into OUT as .elapsed_s)
PF="$1"; SCHEMA="$2"; MODEL="${3:-gemini-3.1-pro-high}"; OUT="$4"
REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"
DEPTH="${COUNCIL_DEPTH:-simple}"
KEY="${COUNCIL_CHECK_KEY:-plan}"  # QC's find/verify stages pass "findings" / "verdict"
# DEEP: invite agy to explore the working tree (--add-dir already exposes it) at its own depth.
# SIMPLE: the old anti-exploration suffix — answer from the fed context only.
if [ "$DEPTH" = "deep" ]; then
  SUFFIX="Explore the repository at the working directory as deeply as you need — read the real files, search, use your own subagents — to ground your response in the actual code. Then respond with ONLY the JSON object matching the schema."
else
  SUFFIX="Respond with ONLY the JSON object matching the schema. Do NOT use tools, do NOT read files, do NOT explore the filesystem."
fi
PROMPT="$(cat "$PF")

$SUFFIX"
raw="$(mktemp)"
agy --print "$PROMPT" --sandbox --print-timeout 45m --json-schema "$SCHEMA" --output-format json \
    --model "$MODEL" --add-dir "$REPO" > "$raw" 2>&1
if jq -e --arg k "$KEY" '.structured_output[$k]|length' "$raw" >/dev/null 2>&1; then
  jq --argjson t "$SECONDS" --arg tier "$MODEL" '.structured_output + {elapsed_s:$t, tier:$tier}' "$raw" > "$OUT"
  # Empty payload is technically valid but has been agy's silent-punt signature
  # (measured 2026-07-27: 0 items in 11-57s on inputs codex/grok worked minutes on).
  # Surface it so the caller can weigh the lane accordingly.
  n="$(jq -r --arg k "$KEY" '.structured_output[$k]|length' "$raw")"
  [ "$n" = "0" ] && echo "AGY_EMPTY (${SECONDS}s) — valid envelope, zero ${KEY}; treat as no-signal, not clean pass" >&2
  rm -f "$raw"; exit 0
else
  # Keep the raw envelope on failure — deleting it made every past failure undiagnosable.
  mv -f "$raw" "${OUT%.out.json}.raw.err" 2>/dev/null || true
  echo "AGY_FAILED (${SECONDS}s) — raw envelope kept at ${OUT%.out.json}.raw.err" >&2; exit 1
fi
