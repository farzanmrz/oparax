#!/usr/bin/env bash
# lane.sh: run an external CLI lane (codex / grok / agy) without losing its
# result to a Bash-call timeout.
#
# Why this exists (2026-08-17): the /feature critique lanes (its only caller now) ran
# each external CLI inside ONE Bash call capped at 5 minutes. Codex's 10-agent
# high-effort fan-out and Grok's 80-turn review routinely take 6-14 minutes
# (measured on the 2026-08-13 and 2026-08-17 runs), so both lanes hit the cap.
# The harness then backgrounds the process, the dispatcher agent returned the
# literal "timeout", and a returning sub-agent's background processes are
# killed -- the review had run for 5+ minutes and was thrown away.
#
# A single Bash call can never exceed 10 minutes in this harness, so the fix
# is a two-phase pattern instead of a bigger number:
#   1. `lane.sh start <name> -- <cmd...>`  invoked in the FOREGROUND. It
#      detaches the command into its own session (setsid via perl, nohup, all
#      fds redirected) and returns immediately, so no dispatcher ever needs
#      Bash run_in_background.
#   2. `lane.sh wait <name>`  invoked in the FOREGROUND, repeatedly, each call
#      at most 540s (under the 600s cap). Prints DONE, RUNNING, DIED, or HUNG
#      with elapsed time. The dispatcher keeps calling wait until it is not
#      RUNNING. There is NO budget: lanes run to completion; wall time is
#      measured and reported so model / effort get tuned from real numbers,
#      never capped in advance (owner decision 2026-08-17). DIED means the
#      lane's process vanished without writing an exit code (killed from
#      outside): fail fast instead of waiting for the hung valve.
#   2b. `lane.sh waitall <name...>`  for a caller (the /feature, /amend, or /qc
#      skill session itself, run with Bash run_in_background: true, no dispatcher
#      agent in between) that wants to block on one or more lanes until none is
#      RUNNING. The skills call it once PER LANE, in separate background calls,
#      so the session is re-invoked as each lane finishes and the owner sees one
#      named task per lane (owner decision 2026-08-18). Loops `wait` above
#      per lane still RUNNING until none are; reuses wait's own DONE/DIED/HUNG
#      detection and hung-process valve rather than re-implementing them, then
#      prints each lane's final line, one per line, prefixed with its name.
#   3. `lane.sh result <name>`  prints the lane's stdout (or stderr + a FAILED
#      marker when the exit code is non-zero). Always keeps partial output.
#   4. `lane.sh kill <name>`  only when the hung-process valve fires (a lane
#      still RUNNING after LANE_HUNG_SECONDS, default 1500 = 25 min; owner 2026-08-17: no lane should need more than ~20).
#
# Never edit this file while any lane or wait is running: bash reads a script
# lazily, so a line-count change under a running `waitall` shifts its offsets
# and it dies with a spurious syntax error (happened 2026-08-18; harmless, the
# DONE lines had printed, but do not repeat it).
#
# State lives in $LANE_DIR (default <repo>/.feature/lanes, gitignored): <name>.out/.err/.exit/.pid/.start.
# Each `start` overwrites that lane's files, so the directory never needs manual cleanup.
set -uo pipefail

LANE_DIR="${LANE_DIR:-$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || pwd)/.feature/lanes}"
LANE_HUNG_SECONDS="${LANE_HUNG_SECONDS:-1500}"
mkdir -p "$LANE_DIR"

usage() {
  echo "usage: lane.sh start <name> -- <cmd...> | wait <name> [max_seconds<=540] | waitall <name...> | findings <name> | result <name> [FAILED_MARKER] | kill <name> | status <name>" >&2
  exit 2
}

cmd="${1:-}"; name="${2:-}"
[ -n "$cmd" ] && [ -n "$name" ] || usage
base="$LANE_DIR/$name"

case "$cmd" in
  start)
    shift 2
    [ "${1:-}" = "--" ] && shift
    [ $# -gt 0 ] || usage
    rm -f "$base.out" "$base.err" "$base.exit" "$base.pid" "$base.runner"
    date +%s > "$base.start"
    # Detach: a fresh session (perl POSIX::setsid; macOS ships no setsid
    # binary), nohup, every fd off the caller's pipes, so the harness's
    # foreground Bash call returns at once and cannot reap or hang on the lane.
    # The detached runner is `lane.sh _run`, which records pid and exit code.
    if command -v perl >/dev/null 2>&1; then
      nohup perl -MPOSIX -e 'POSIX::setsid(); exec @ARGV or die "exec: $!"' -- \
        bash "$0" _run "$name" -- "$@" </dev/null >/dev/null 2>&1 &
    else
      nohup bash "$0" _run "$name" -- "$@" </dev/null >/dev/null 2>&1 &
    fi
    echo $! > "$base.runner"
    disown 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do [ -f "$base.pid" ] && break; sleep 0.2; done
    echo "started lane $name runner=$(cat "$base.runner") pid=$(cat "$base.pid" 2>/dev/null || echo pending)"
    exit 0
    ;;
  _run)
    shift 2
    [ "${1:-}" = "--" ] && shift
    "$@" > "$base.out" 2> "$base.err" &
    child=$!
    echo "$child" > "$base.pid"
    wait "$child"; rc=$?
    echo "$rc" > "$base.exit"
    exit "$rc"
    ;;
  wait)
    max="${3:-540}"
    [ "$max" -le 540 ] || max=540
    t0=$(date +%s)
    if [ ! -f "$base.start" ] && [ ! -f "$base.exit" ]; then
      # The start command never ran lane.sh at all (shell quoting/glob error,
      # bad path). Fail fast instead of polling a lane that does not exist.
      echo "NOT_STARTED no start record for lane $name (the start command itself failed before lane.sh ran; check that command's own output)"
      exit 5
    fi
    until [ -f "$base.exit" ]; do
      started=$(cat "$base.start" 2>/dev/null || echo "$t0")
      pid=$(cat "$base.pid" 2>/dev/null || true)
      if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
        sleep 1
        if [ ! -f "$base.exit" ]; then
          echo "DIED pid=$pid elapsed=$(( $(date +%s) - started ))s (lane process gone with no exit code; killed from outside) out_bytes=$(wc -c < "$base.out" 2>/dev/null | tr -d ' ')"
          exit 6
        fi
        break
      fi
      if [ $(( $(date +%s) - started )) -ge "$LANE_HUNG_SECONDS" ]; then
        echo "HUNG elapsed=$(( $(date +%s) - started ))s (over LANE_HUNG_SECONDS=$LANE_HUNG_SECONDS) out_bytes=$(wc -c < "$base.out" 2>/dev/null | tr -d ' ')"
        exit 4
      fi
      if [ $(( $(date +%s) - t0 )) -ge "$max" ]; then
        echo "RUNNING elapsed=$(( $(date +%s) - started ))s out_bytes=$(wc -c < "$base.out" 2>/dev/null | tr -d ' ')"
        exit 3
      fi
      sleep 10
    done
    started=$(cat "$base.start" 2>/dev/null || echo "$t0")
    fin=$(stat -f %m "$base.exit" 2>/dev/null || date +%s)
    echo "DONE exit=$(cat "$base.exit") elapsed=$(( fin - started ))s out_bytes=$(wc -c < "$base.out" 2>/dev/null | tr -d ' ')"
    exit 0
    ;;
  waitall)
    # Block on every named lane in one call, so the caller spends no turns
    # polling: repeatedly calls `wait` (above) on each lane still RUNNING
    # until none are, reusing its DONE/DIED/HUNG detection and hung-process
    # valve rather than re-implementing them. Each `wait` call still caps at
    # 540s, so this just loops that call per lane; there is no overall budget.
    shift 1
    [ $# -gt 0 ] || usage
    names=("$@")
    n="${#names[@]}"
    i=0
    while [ "$i" -lt "$n" ]; do lines[i]=""; i=$((i + 1)); done
    pending=()
    i=0
    while [ "$i" -lt "$n" ]; do pending+=("$i"); i=$((i + 1)); done
    while [ "${#pending[@]}" -gt 0 ]; do
      next=()
      for idx in "${pending[@]}"; do
        line="$(bash "$0" wait "${names[$idx]}")"
        case "$line" in
          RUNNING*) next+=("$idx") ;;
          *) lines[idx]="$line" ;;
        esac
      done
      pending=("${next[@]+"${next[@]}"}")
    done
    i=0
    while [ "$i" -lt "$n" ]; do
      echo "${names[$i]}: ${lines[$i]}"
      i=$((i + 1))
    done
    ;;
  findings)
    # Pull ONLY the findings JSON array out of the lane's raw .out into
    # <lane>.findings.json, so a consumer never has to read a codex --json
    # lane's full JSONL event stream (hundreds of KB) to get the few KB of
    # actual findings, and print the lane's STATE line (OK / NO_FINDINGS /
    # INVALID / FAILED / TIMED_OUT). See lane-findings.py for the logic.
    # `findings <name> --timed-out` is for a lane killed at the wall cap: a
    # killed-from-outside lane often has no exit code, and without the flag
    # that reads as INVALID instead of TIMED_OUT (found live 2026-08-23).
    dest="$base.findings.json"
    if [ "${3:-}" = "--timed-out" ]; then
      python3 "$(dirname "$0")/lane-findings.py" --timed-out "$base.out" "$name" "$dest"
    else
      python3 "$(dirname "$0")/lane-findings.py" "$base.out" "$name" "$dest"
    fi
    ;;
  status)
    if [ -f "$base.exit" ]; then echo "DONE exit=$(cat "$base.exit")"; else echo "RUNNING pid=$(cat "$base.pid" 2>/dev/null || echo ?)"; fi
    ;;
  result)
    marker="${3:-LANE_FAILED}"
    if [ ! -f "$base.exit" ]; then
      echo "$marker not-finished"; exit 1
    fi
    rc=$(cat "$base.exit")
    started=$(cat "$base.start" 2>/dev/null || echo 0)
    fin=$(stat -f %m "$base.exit" 2>/dev/null || date +%s)
    echo "LANE_ELAPSED name=$name seconds=$(( fin - started )) exit=$rc" >&2
    if [ "$rc" -eq 0 ] && [ -s "$base.out" ]; then
      cat "$base.out"
    else
      echo "$marker exit=$rc"
      echo "--- stderr ---"; cat "$base.err" 2>/dev/null
      echo "--- stdout (partial) ---"; tail -c 4000 "$base.out" 2>/dev/null
      exit 1
    fi
    ;;
  kill)
    pid=$(cat "$base.pid" 2>/dev/null || true)
    if [ -n "$pid" ]; then pkill -P "$pid" 2>/dev/null; kill "$pid" 2>/dev/null; fi
    runner=$(cat "$base.runner" 2>/dev/null || true)
    if [ -n "$runner" ]; then kill "$runner" 2>/dev/null; fi
    echo "killed lane $name (pid ${pid:-?})"
    ;;
  *) usage ;;
esac
