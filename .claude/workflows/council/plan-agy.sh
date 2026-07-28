#!/usr/bin/env bash
# Council member: agy (Google Antigravity) — driven through its INTERACTIVE TUI via tmux.
# Usage: plan-agy.sh <prompt-file> <schema-file> <model> <out-file>
#   model: gemini-3.1-pro-high | gemini-3.1-pro-medium | gemini-3.6-flash-high
#
# WHY TUI, NOT --print (measured 2026-07-27): `agy --print` is structurally single-shot —
# num_turns=1 in every variant tested (deep prompt, no schema, no sandbox, --mode plan,
# invoke_subagent, toolPermission always-proceed). It stuffs 150-500K tokens of retrieved
# context and generates once, so on a real brief it returns {critiques:[]} while codex/grok
# run genuine agentic loops. The TUI IS the agentic harness: the identical brief produced
# 3 grounded critiques (2 blocking) in ~3 min, with real file reads and subagent access.
#
# Mechanics: tmux session per label → accept trust prompt if shown → /model dance →
# one short prompt pointing at the brief FILE and an output FILE (the model itself writes
# the JSON — no pane scraping) → poll for the file → tolerant-parse → normalize to OUT.
# The model picker is keyboard-driven and version-sensitive; rows are searched and the
# selection is VERIFIED against the status line, so a menu change fails loudly instead
# of silently running another family (which happened 2026-07-27: Opus 4.6 ran as "agy").
set -uo pipefail
SECONDS=0
PF="$1"; SCHEMA="$2"; MODEL="${3:-gemini-3.1-pro-high}"; OUT="$4"
REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"
KEY="${COUNCIL_CHECK_KEY:-plan}"
TIMEOUT_S="${COUNCIL_AGY_TIMEOUT_S:-900}"

command -v tmux >/dev/null || { echo "AGY_FAILED (no tmux — brew install tmux)" >&2; exit 1; }

# --- model slug → the display name to VERIFY in the status line + effort presses ---
# Row positions are NOT hardcoded any more: on 2026-07-27 the picker's roster shifted and
# the old "2 rows down" dance silently selected "Claude Opus 4.6 (Thinking)" — a whole
# council round ran the wrong FAMILY and nothing failed. The picker is searched row by
# row and the status line is read back after each try; no verified match → loud failure.
case "$MODEL" in
  gemini-3.1-pro-high)   MODEL_NAME="Gemini 3.1 Pro"; EFFORT_PRESSES=2 ;;
  gemini-3.1-pro-medium) MODEL_NAME="Gemini 3.1 Pro"; EFFORT_PRESSES=1 ;;
  gemini-3.6-flash-high) MODEL_NAME="Gemini 3.6 Flash"; EFFORT_PRESSES=2 ;;
  *) echo "plan-agy: unknown model slug '$MODEL'" >&2; exit 2 ;;
esac

SES="agy-$(basename "${OUT%.out.json}" | tr -c 'a-zA-Z0-9' '-' | cut -c1-40)$$"
OUTFILE_ABS="$(cd "$(dirname "$OUT")" && pwd)/$(basename "${OUT%.out.json}").tui.json"
PANE_LOG="${OUT%.out.json}.pane.log"
rm -f "$OUTFILE_ABS"

cleanup() { tmux kill-session -t "$SES" 2>/dev/null || true; }
trap cleanup EXIT

tmux new-session -d -s "$SES" -x 220 -y 50 -c "$REPO" 'agy' || { echo "AGY_FAILED (tmux launch)" >&2; exit 1; }
sleep 12
# Trust prompt appears for a not-yet-trusted workspace; "Yes, I trust" is preselected.
if tmux capture-pane -t "$SES" -p 2>/dev/null | grep -q "Do you trust"; then
  tmux send-keys -t "$SES" Enter; sleep 6
fi
# Model picker: try each row in turn, select, then VERIFY via the status line ("READY
# [<model name> …]"). The slider resets to low on row change; effort is set only after
# the model itself is confirmed. A roster we can't find the target in is a hard failure —
# a lane silently running another family is worse than a lane reported failed.
selected=""
for row in 0 1 2 3 4 5 6 7; do
  tmux send-keys -t "$SES" "/model" Enter; sleep 3
  i=0; while [ "$i" -lt "$row" ]; do tmux send-keys -t "$SES" Down; i=$((i+1)); done
  sleep 1; tmux send-keys -t "$SES" Enter; sleep 3        # select candidate (lands at low effort)
  if tmux capture-pane -t "$SES" -p 2>/dev/null | grep -qi "READY \[.*${MODEL_NAME}"; then
    selected="yes"; break
  fi
done
if [ -z "$selected" ]; then
  echo "AGY_FAILED (model picker: '$MODEL_NAME' not found in roster — menu changed again; status line: $(tmux capture-pane -t "$SES" -p 2>/dev/null | grep READY | tail -1))" >&2
  exit 1
fi
if [ "$EFFORT_PRESSES" -gt 0 ]; then
  tmux send-keys -t "$SES" "/model" Enter; sleep 3        # reopen: current model preselected
  i=0; while [ "$i" -lt "$EFFORT_PRESSES" ]; do tmux send-keys -t "$SES" Right; i=$((i+1)); done
  sleep 1; tmux send-keys -t "$SES" Enter; sleep 3
fi

PF_ABS="$(cd "$(dirname "$PF")" && pwd)/$(basename "$PF")"
SCHEMA_ABS="$(cd "$(dirname "$SCHEMA")" && pwd)/$(basename "$SCHEMA")"
tmux send-keys -t "$SES" "Read the file $PF_ABS in full — it is a council brief with its own instructions (review, design, or verification). Execute it faithfully, grounding everything in the actual repository code by reading the real files (use your subagents where useful — .agents/agents/ defines a read-only code-verifier). Then write your result as ONE valid JSON object matching the schema in $SCHEMA_ABS (top-level key: $KEY) to the file $OUTFILE_ABS. In JSON strings avoid backslash escapes other than standard JSON ones (write template literals as plain text). Do not print the JSON in chat; write the file." Enter

# Poll for the model-written file, then require it stable (agy may write incrementally).
waited=0; last=-1
while [ "$waited" -lt "$TIMEOUT_S" ]; do
  sleep 10; waited=$((waited+10))
  if [ -s "$OUTFILE_ABS" ]; then
    sz="$(wc -c < "$OUTFILE_ABS")"
    if [ "$sz" = "$last" ] && tmux capture-pane -t "$SES" -p 2>/dev/null | grep -q "READY"; then break; fi
    last="$sz"
  fi
  tmux has-session -t "$SES" 2>/dev/null || break
done
tmux capture-pane -t "$SES" -p > "$PANE_LOG" 2>/dev/null || true
cleanup; trap - EXIT

# Tolerant parse (Gemini emits \$ and similar non-JSON escapes inside code samples),
# then normalize to the standard council envelope.
if python3 - "$OUTFILE_ABS" "$OUT" "$KEY" "$SECONDS" "$MODEL" <<'PYEOF'
import json, re, sys
src, out, key, elapsed, tier = sys.argv[1:6]
try:
    raw = open(src).read()
except OSError:
    sys.exit(1)
try:
    d = json.loads(raw)
except json.JSONDecodeError:
    fixed = re.sub(r'\\(?!["\\/bfnrtu])', '', raw)
    try:
        d = json.loads(fixed)
    except json.JSONDecodeError:
        sys.exit(1)
# The payload may be a list (critiques, findings) OR an object (board, verdict) —
# mirror the jq `length` check the codex/grok wrappers use. A list-only assumption
# here branded two complete, valid board runs AGY_FAILED (2026-07-27).
if not isinstance(d, dict) or key not in d or not isinstance(d[key], (list, dict)):
    sys.exit(1)
d.update(elapsed_s=int(elapsed), tier=tier)
json.dump(d, open(out, "w"), indent=1)
n = len(d[key])
print(f"AGY_EMPTY ({elapsed}s) — valid but zero {key}; treat as no-signal" if n == 0 else f"agy ok: {n} {key} in {elapsed}s", file=sys.stderr)
PYEOF
then
  rm -f "$OUTFILE_ABS"; exit 0
else
  echo "AGY_FAILED (${SECONDS}s) — no valid output file; pane log kept at $PANE_LOG" >&2
  exit 1
fi
