#!/usr/bin/env bash
# Five Cline lanes, same brief, in parallel — a real plan critique, not a smoke test.
# Every lane gets the IDENTICAL brief the grok lane got (.feature/critique-grok.in.txt),
# so the comparison against codex/grok/agy is apples-to-apples.
#
#   bash .claude/workflows/council/bakeoff-cline.sh [<in-file>]
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$HERE/../../.." && pwd)}"
export CLAUDE_PROJECT_DIR
cd "$CLAUDE_PROJECT_DIR" || exit 1

IN="${1:-$CLAUDE_PROJECT_DIR/.feature/critique-grok.in.txt}"
SCHEMA="$CLAUDE_PROJECT_DIR/.claude/workflows/plan-critique-schema.json"
OUTDIR="$CLAUDE_PROJECT_DIR/.feature/clinetest"
mkdir -p "$OUTDIR"

[ -f "$IN" ]     || { echo "missing brief: $IN" >&2; exit 1; }
[ -f "$SCHEMA" ] || { echo "missing schema: $SCHEMA" >&2; exit 1; }
echo "brief: $IN ($(wc -c < "$IN") bytes)"

# Five frontier models, none from Anthropic / OpenAI / Google / xAI.
MODELS="${MODELS:-moonshotai/kimi-k3 deepseek/deepseek-v4-pro z-ai/glm-5.2 minimax/minimax-m3}"

pids=()
for m in $MODELS; do
  slug="${m////_}"
  cp "$IN" "$OUTDIR/$slug.in.txt"
  (
    COUNCIL_MODEL="$m" \
    COUNCIL_CHECK_KEY=critiques \
    COUNCIL_TIMEOUT="${COUNCIL_TIMEOUT:-1500}" \
    bash "$HERE/plan-cline.sh" \
      "$OUTDIR/$slug.in.txt" "$SCHEMA" "${COUNCIL_TIER:-high}" "$OUTDIR/$slug.out.json" \
      > "$OUTDIR/$slug.lane.log" 2>&1
    echo "$? $m" > "$OUTDIR/$slug.rc"
  ) &
  # Capture $! FIRST: macOS ships bash 3.2, where `${pids[-1]}` is a "bad array
  # subscript" and, under `set -u`, kills the script mid-launch.
  lane_pid=$!
  pids+=("$lane_pid")
  echo "launched $m (pid $lane_pid)"
done

for p in "${pids[@]}"; do wait "$p"; done

echo
echo "================ RESULTS ================"
for m in $MODELS; do
  slug="${m////_}"
  rc="$(cut -d' ' -f1 < "$OUTDIR/$slug.rc" 2>/dev/null || echo 99)"
  if [ "$rc" = "0" ]; then
    jq -r --arg m "$m" '
      "\($m)  PASS  \(.elapsed_s)s  $\(.cost_usd)  critiques=\(.critiques|length)  " +
      "(blocking=\([.critiques[]|select(.severity=="blocking")]|length) " +
      "important=\([.critiques[]|select(.severity=="important")]|length) " +
      "minor=\([.critiques[]|select(.severity=="minor")]|length))"
    ' "$OUTDIR/$slug.out.json" 2>/dev/null || echo "$m  PASS (unparseable summary)"
  else
    echo "$m  FAIL (rc=$rc) — $OUTDIR/$slug.lane.log"
  fi
done
