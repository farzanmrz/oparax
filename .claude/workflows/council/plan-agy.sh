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
EXPECTED_HEAD="$(git -C "$REPO" rev-parse HEAD 2>/dev/null || printf 'UNKNOWN')"

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

# Pin the GLOBAL persisted model to this run's target before launch. agy's /model choice
# persists in ~/.gemini/antigravity-cli/settings.json across ALL sessions (global, not
# per-project — confirmed against the CLI reference 2026-08-08), so an unrelated
# interactive session silently moves every future launch's starting model. Measured
# 2026-08-08: a stopped owner session left "Gemini 3.6 Flash (Low)" persisted, the
# picker scan started from the wrong roster position, missed the target row, and the
# lane failed twice (AGY_PICKER_MISS, then a degraded run). Pinning here makes wrapper
# runs independent of interactive-session state; the /model dance below still runs and
# still verifies the status line — this only fixes the STARTING position, the loud
# verify-or-fail contract is unchanged.
AGY_SETTINGS="$HOME/.gemini/antigravity-cli/settings.json"
case "$MODEL" in
  *-high)   AGY_EFFORT_LABEL="High" ;;
  *-medium) AGY_EFFORT_LABEL="Medium" ;;
  *)        AGY_EFFORT_LABEL="" ;;
esac
if [ -f "$AGY_SETTINGS" ] && command -v jq >/dev/null 2>&1; then
  AGY_PINNED="$MODEL_NAME${AGY_EFFORT_LABEL:+ ($AGY_EFFORT_LABEL)}"
  if agy_tmp="$(mktemp)" && jq --arg m "$AGY_PINNED" '.model = $m' "$AGY_SETTINGS" > "$agy_tmp" 2>/dev/null \
     && [ -s "$agy_tmp" ]; then
    mv "$agy_tmp" "$AGY_SETTINGS"
  else
    rm -f "$agy_tmp" 2>/dev/null || true   # never let a failed pin corrupt settings; the dance still runs
  fi
fi

SES="agy-$(basename "${OUT%.out.json}" | tr -c 'a-zA-Z0-9' '-' | cut -c1-40)$$"
OUTFILE_ABS="$(cd "$(dirname "$OUT")" && pwd)/$(basename "${OUT%.out.json}").tui.json"
PANE_LOG="${OUT%.out.json}.pane.log"
ERR_LOG="${OUT%.out.json}.err"
# A caller must use a round/HEAD-unique label, but clear the artifacts too: a
# restarted lane must never look complete merely because a prior run left OUT.
rm -f "$OUT" "$OUTFILE_ABS" "$ERR_LOG" "$PANE_LOG".attempt*

# Every failure path goes through here so a dead lane always leaves a corpse:
# the reason lands in $ERR_LOG (stderr of the calling session is routinely lost —
# the 2026-08-05 brownout could only be diagnosed from agy's own CLI logs).
fail() { echo "$1" | tee -a "$ERR_LOG" >&2; exit 1; }

cleanup() { tmux kill-session -t "$SES" 2>/dev/null || true; }
trap cleanup EXIT

# The critic contract rides in the PROMPT, not in --agent. Measured 2026-07-30:
# `--agent oparax-critic` works in `--print`, but launching the TUI with it made
# the session hang past 11 minutes — the wrapper's model-picker dance and a
# preselected agent do not compose. The subagents (oparax-critic, code-verifier)
# are still installed at ~/.gemini/config/agents/ so `invoke_subagent` can reach
# code-verifier mid-run; WORKSPACE .agents/agents/ is inert for this CLI in both
# documented layouts, so the global dir is the only discovery path that works.
CRITIC="$REPO/.agents/agents/oparax-critic.md"
# Model picker: try each row in turn, select, then VERIFY via the status line ("READY
# [<model name> …]"). The slider resets to low on row change; effort is set only after
# the model itself is confirmed. A roster we can't find the target in is a hard failure —
# a lane silently running another family is worse than a lane reported failed.
#
# The picker opens with the CURRENT (sticky) model preselected, NOT at the top — so a
# Down-only sweep can never reach rows ABOVE the current selection (2026-08-04: the
# sticky model was Opus 4.6, Gemini 3.1 Pro sat two rows above it, and the lane failed
# "not found in roster" while the roster was fine). Normalize to the top first: the
# picker CLAMPS at row 0 on repeated Up presses (measured, no wraparound), so a fixed
# Up burst makes the subsequent Down sweep position-deterministic from any start row.
#
# TWO whole-session attempts, not one: the roster itself is not stable. 2026-08-05,
# launch 14:28:42 (agy CLI log cli-20260805_142842.log): fetchAvailableModels served a
# degraded list with NO Gemini 3.1 Pro — the sticky restore fell back to 3.6 Flash and
# all 8 rows landed on just four models — while the identical wrapper passed at 14:25
# and 14:39. Auth was NOT the cause (login completed 9s before the dance). A brownout
# that short dies on a fresh session after a pause; a roster that stays wrong on both
# attempts is a real menu change and still fails loudly.
selected=""
for attempt in 1 2; do
  tmux new-session -d -s "$SES" -x 220 -y 50 -c "$REPO" 'agy' || fail "AGY_FAILED (tmux launch)"
  sleep 12
  # Trust prompt appears for a not-yet-trusted workspace; "Yes, I trust" is preselected.
  if tmux capture-pane -t "$SES" -p 2>/dev/null | grep -q "Do you trust"; then
    tmux send-keys -t "$SES" Enter; sleep 6
  fi
  for row in 0 1 2 3 4 5 6 7; do
    tmux send-keys -t "$SES" "/model" Enter; sleep 3
    i=0; while [ "$i" -lt 8 ]; do tmux send-keys -t "$SES" Up; i=$((i+1)); done
    sleep 1
    i=0; while [ "$i" -lt "$row" ]; do tmux send-keys -t "$SES" Down; i=$((i+1)); done
    sleep 1; tmux send-keys -t "$SES" Enter; sleep 3      # select candidate (lands at low effort)
    if tmux capture-pane -t "$SES" -p 2>/dev/null | grep -qi "READY \[.*${MODEL_NAME}"; then
      selected="yes"; break
    fi
  done
  [ -n "$selected" ] && break
  tmux capture-pane -t "$SES" -p > "$PANE_LOG.attempt$attempt" 2>/dev/null || true
  echo "AGY_PICKER_MISS (attempt $attempt, ${SECONDS}s): '$MODEL_NAME' not in roster; pane kept at $PANE_LOG.attempt$attempt; status line: $(tmux capture-pane -t "$SES" -p 2>/dev/null | grep READY | tail -1)" | tee -a "$ERR_LOG" >&2
  tmux kill-session -t "$SES" 2>/dev/null || true
  [ "$attempt" -eq 1 ] && sleep 60
done
if [ -z "$selected" ]; then
  fail "AGY_FAILED (model picker: '$MODEL_NAME' not found in roster on 2 attempts — degraded roster or menu changed; see $ERR_LOG)"
fi
if [ "$EFFORT_PRESSES" -gt 0 ]; then
  tmux send-keys -t "$SES" "/model" Enter; sleep 3        # reopen: current model preselected
  i=0; while [ "$i" -lt "$EFFORT_PRESSES" ]; do tmux send-keys -t "$SES" Right; i=$((i+1)); done
  sleep 1; tmux send-keys -t "$SES" Enter; sleep 3
fi

PF_ABS="$(cd "$(dirname "$PF")" && pwd)/$(basename "$PF")"
CRITIC_ABS="$CRITIC"
SCHEMA_ABS="$(cd "$(dirname "$SCHEMA")" && pwd)/$(basename "$SCHEMA")"
tmux send-keys -t "$SES" "First read $CRITIC_ABS — it is your standing critic contract for this repo (how to judge, the evidence bar, what counts as a veto). Then read the file $PF_ABS in full — it is a council brief with its own instructions (review, design, or verification). Before analysis, run git rev-parse HEAD in $REPO and require exactly $EXPECTED_HEAD; if it differs, write no findings and report the mismatch. Execute the brief faithfully against the live working tree, never remembered or cached code. Before reporting any file:line finding, confirm the path currently exists and reread that exact current range; a deleted path or stale line invalidates the finding. Ground everything in the actual repository code (invoke_subagent code-verifier is available and read-only — use it to confirm a claim before reporting a finding against it). Then write your result as ONE valid JSON object matching the schema in $SCHEMA_ABS (top-level key: $KEY) to the file $OUTFILE_ABS. In JSON strings avoid backslash escapes other than standard JSON ones (write template literals as plain text). Do not print the JSON in chat; write the file." Enter

# Poll for the model-written file, then require it stable (agy may write incrementally).
# ACCEPT $OUT AS A FALLBACK TARGET: on 2026-08-06 (QC round 5) agy compacted its own
# conversation mid-run (386k in), lost the exact .tui.json path from the prompt, and
# "reconstructed" the label-obvious <label>.out.json instead — a complete valid
# 2-finding review sat on disk while the poll watched .tui.json to timeout and the
# lane was branded FAILED. $OUT is rm'd at start (line above the fail() def), so any
# $OUT that appears mid-run is model-written raw output, never a stale artifact.
waited=0; last=-1
while [ "$waited" -lt "$TIMEOUT_S" ]; do
  sleep 10; waited=$((waited+10))
  SRC=""; [ -s "$OUTFILE_ABS" ] && SRC="$OUTFILE_ABS"
  [ -z "$SRC" ] && [ -s "$OUT" ] && SRC="$OUT"
  if [ -n "$SRC" ]; then
    sz="$(wc -c < "$SRC")"
    if [ "$sz" = "$last" ] && tmux capture-pane -t "$SES" -p 2>/dev/null | grep -q "READY"; then break; fi
    last="$sz"
  fi
  tmux has-session -t "$SES" 2>/dev/null || break
done
tmux capture-pane -t "$SES" -p > "$PANE_LOG" 2>/dev/null || true
cleanup; trap - EXIT

# Tolerant parse (Gemini emits \$ and similar non-JSON escapes inside code samples),
# then normalize to the standard council envelope. Parse whichever file the model
# actually wrote (.tui.json preferred; $OUT accepted per the compaction incident above —
# the normalizer overwrites $OUT in place, which is safe: it only adds envelope keys).
PARSE_SRC="$OUTFILE_ABS"; [ -s "$PARSE_SRC" ] || PARSE_SRC="$OUT"
if python3 - "$PARSE_SRC" "$OUT" "$KEY" "$SECONDS" "$MODEL" <<'PYEOF'
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
  fail "AGY_FAILED (${SECONDS}s) — no valid output file; pane log kept at $PANE_LOG"
fi
