#!/usr/bin/env bash
# Council member: Codex (OpenAI gpt-5.6-sol). One-shot, read-only, schema-bound plan author.
# Usage: plan-codex.sh <prompt-file> <schema-file> <effort> <out-file>
#   effort: low|medium|high  (ablation: medium≈5.5m valid; low is the smoke-test tier)
#   COUNCIL_CHECK_KEY (env, default "plan"): the top-level output field whose presence proves success
#   (QC's find/verify stages pass "findings" / "verdict" for their non-plan schemas).
# Emits a schema-conforming JSON to <out-file>; exit 0 on success, 1 (+ CODEX_FAILED) on any failure.
# Best-effort by contract: the caller treats a non-zero exit as "this member sat out".
set -uo pipefail
SECONDS=0  # bash stopwatch: wall-seconds for this member (folded into OUT as .elapsed_s)
PF="$1"; SCHEMA="$2"; EFF="${3:-medium}"; OUT="$4"
REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"
KEY="${COUNCIL_CHECK_KEY:-plan}"
last="$(mktemp)"
codex exec --skip-git-repo-check -s read-only -c model_reasoning_effort="$EFF" \
      --output-schema "$SCHEMA" --output-last-message "$last" -C "$REPO" - < "$PF" >/dev/null 2>&1
if jq -e --arg k "$KEY" '.[$k]|length' "$last" >/dev/null 2>&1; then
  jq --argjson t "$SECONDS" --arg tier "$EFF" '. + {elapsed_s:$t, tier:$tier}' "$last" > "$OUT"
  rm -f "$last"; exit 0
else echo "CODEX_FAILED (${SECONDS}s)" >&2; rm -f "$last"; exit 1; fi
