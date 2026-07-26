#!/usr/bin/env bash
# Council member: Codex (OpenAI). One-shot, read-only, schema-bound plan author.
# Usage: plan-codex.sh <prompt-file> <schema-file> <effort> <out-file>
#   effort: low|medium|high  (ablation: medium≈5.5m valid; low is the smoke-test tier)
#   COUNCIL_CHECK_KEY (env, default "plan"): the top-level output field whose presence proves success
#   (QC's find/verify stages pass "findings" / "verdict" for their non-plan schemas).
#   COUNCIL_MODEL (env, default EMPTY): the codex model id, e.g. gpt-5.6-luna | gpt-5.6-terra |
#   gpt-5.6-sol. Unlike agy (whose single "tier" slug fuses model+effort) codex keeps them on two
#   separate flags, so model needs its own channel. EMPTY reproduces the historical behaviour
#   exactly — no -m, so codex falls back to ~/.codex/config.toml's `model`. That default is why
#   every call before this flag existed silently ran gpt-5.6-luna while comments claimed sol.
# Emits a schema-conforming JSON to <out-file>; exit 0 on success, 1 (+ CODEX_FAILED) on any failure.
# Best-effort by contract: the caller treats a non-zero exit as "this member sat out".
set -uo pipefail
SECONDS=0  # bash stopwatch: wall-seconds for this member (folded into OUT as .elapsed_s)
PF="$1"; SCHEMA="$2"; EFF="${3:-medium}"; OUT="$4"
REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"
KEY="${COUNCIL_CHECK_KEY:-plan}"
MODEL="${COUNCIL_MODEL:-}"
last="$(mktemp)"
# ${MODEL:+-m "$MODEL"} unquoted is deliberate: bash word-splits it into two argv entries when set
# and to nothing when empty (verified on bash 3.2 under set -u). Model ids never contain spaces.
codex exec --skip-git-repo-check -s read-only ${MODEL:+-m "$MODEL"} -c model_reasoning_effort="$EFF" \
      --output-schema "$SCHEMA" --output-last-message "$last" -C "$REPO" - < "$PF" >/dev/null 2>&1
if jq -e --arg k "$KEY" '.[$k]|length' "$last" >/dev/null 2>&1; then
  jq --argjson t "$SECONDS" --arg tier "$EFF" --arg model "${MODEL:-config-default}" \
     '. + {elapsed_s:$t, tier:$tier, model:$model}' "$last" > "$OUT"
  rm -f "$last"; exit 0
else echo "CODEX_FAILED (${SECONDS}s)" >&2; rm -f "$last"; exit 1; fi
