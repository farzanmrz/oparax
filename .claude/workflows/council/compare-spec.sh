#!/usr/bin/env bash
# SPEC-PHASE COMPARISON, run against a worktree at the plan's BASE commit so the
# "pre-implementation" framing is TRUE again (planned files absent, plan claims match).
#
# Seven lanes, one brief family:
#   CONTROLS  codex / grok / agy  — replay their EXACT original .in.txt. If they reproduce
#             their originals (16 / 16 / 3), the harness faithfully recreates spec
#             conditions and the cline numbers below are directly comparable.
#   CANDIDATES cline × {kimi-k3, deepseek-v4-pro, glm-5.2, minimax-m3}.
#
# Usage: WT=<base-worktree> bash compare-spec.sh
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN="$(cd "$HERE/../../.." && pwd)"
WT="${WT:?set WT to the base-commit worktree path}"
SCHEMA="$MAIN/.claude/workflows/plan-critique-schema.json"
OUT="$MAIN/.feature/compare"; mkdir -p "$OUT"

# All lanes ground against the BASE worktree; cline's profile lives only in main.
export CLAUDE_PROJECT_DIR="$WT"
export COUNCIL_CHECK_KEY=critiques
export COUNCIL_SCHEMA="$SCHEMA"
export COUNCIL_DEPTH=deep
export COUNCIL_TIMEOUT=0
export COUNCIL_CLINE_PROFILE="$MAIN/.cline/oparax-critic.md"

BRIEF_EXT="$MAIN/.feature/critique-grok.in.txt"   # the plain critic brief (cline + grok share it)

launch() { # <label> <wrapper> <in> <tier> <extra-env...>
  local label="$1" wrapper="$2" in="$3" tier="$4"; shift 4
  ( env "$@" bash "$HERE/$wrapper" "$in" "$SCHEMA" "$tier" "$OUT/$label.out.json" \
      > "$OUT/$label.log" 2>&1; echo "$? $label" > "$OUT/$label.rc" ) &
  echo "launched $label (pid $!)"
}

# --- controls: exact original briefs, spec-phase tiers ------------------------------
launch codex   plan-codex.sh "$MAIN/.feature/critique-codex.in.txt" high              COUNCIL_MODEL=gpt-5.6-sol
launch grok    plan-grok.sh  "$MAIN/.feature/critique-grok.in.txt"  high
launch agy     plan-agy.sh   "$MAIN/.feature/critique-agy.in.txt"   gemini-3.1-pro-high

# --- candidates: four cline models, same plain brief -------------------------------
for m in moonshotai/kimi-k3 deepseek/deepseek-v4-pro z-ai/glm-5.2 minimax/minimax-m3; do
  launch "cline-${m//\//_}" plan-cline.sh "$BRIEF_EXT" high COUNCIL_MODEL="$m"
done

wait
echo
echo "================ SPEC-PHASE COMPARISON (base $(git -C "$WT" rev-parse --short HEAD)) ================"
printf '%-30s %-6s %5s %7s %9s %s\n' LANE STATUS n block/imp/min elapsed cost
for f in "$OUT"/*.rc; do
  label="$(basename "$f" .rc)"; rc="$(cut -d' ' -f1 < "$f")"; o="$OUT/$label.out.json"
  if [ "$rc" = 0 ] && [ -f "$o" ]; then
    jq -r --arg l "$label" '
      "\($l)|PASS|\(.critiques|length)|" +
      "\([.critiques[]|select(.severity=="blocking")]|length)/" +
      "\([.critiques[]|select(.severity=="important")]|length)/" +
      "\([.critiques[]|select(.severity=="minor")]|length)|" +
      "\(.elapsed_s // "?")s|$\(.cost_usd // 0)"' "$o" 2>/dev/null \
      | awk -F'|' '{printf "%-30s %-6s %5s %11s %9s %s\n",$1,$2,$3,$4,$5,$6}'
  else
    printf '%-30s %-6s\n' "$label" "FAIL"
  fi
done
