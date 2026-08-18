#!/usr/bin/env bash
# lane.sh — run an external CLI lane (codex / grok / agy) without losing its
# result to a Bash-call timeout.
#
# Why this exists (2026-08-17): the /feature critique and /build QC lanes ran
# each external CLI inside ONE Bash call capped at 5 minutes. Codex's 10-agent
# high-effort fan-out and Grok's 80-turn review routinely take 6-14 minutes
# (measured on the 2026-08-13 and 2026-08-17 runs), so both lanes hit the cap.
# The harness then backgrounds the process, the dispatcher agent returned the
# literal "timeout", and a returning sub-agent's background processes are
# killed -- the review had run for 5+ minutes and was thrown away.
#
# A single Bash call can never exceed 10 minutes in this harness, so the fix
# is a two-phase pattern instead of a bigger number:
#   1. `lane.sh start <name> -- <cmd...>`  invoked via Bash run_in_background:true
#      (a backgrounded Bash call keeps running across the agent's later calls).
#   2. `lane.sh wait <name>`  invoked in the FOREGROUND, repeatedly, each call
#      at most 540s (under the 600s cap). Prints DONE or RUNNING with elapsed
#      time. The dispatcher keeps calling wait until DONE. There is NO budget:
#      lanes run to completion; wall time is measured and reported so model /
#      effort get tuned from real numbers, never capped in advance (owner
#      decision 2026-08-17). The only stop is the hung-process valve below.
#   3. `lane.sh result <name>`  prints the lane's stdout (or stderr + a FAILED
#      marker when the exit code is non-zero). Always keeps partial output.
#   4. `lane.sh kill <name>`  only when the hung-process valve fires (a lane
#      still RUNNING after LANE_HUNG_SECONDS, default 3600 = 60 min).
#
# State lives in $LANE_DIR (default <repo>/.feature/lanes, gitignored): <name>.out/.err/.exit/.pid/.start.
# Each `start` overwrites that lane's files, so the directory never needs manual cleanup.
set -uo pipefail

LANE_DIR="${LANE_DIR:-$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || pwd)/.feature/lanes}"
LANE_HUNG_SECONDS="${LANE_HUNG_SECONDS:-3600}"
mkdir -p "$LANE_DIR"

usage() {
  echo "usage: lane.sh start <name> -- <cmd...> | wait <name> [max_seconds<=540] | result <name> [FAILED_MARKER] | kill <name> | status <name>" >&2
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
    rm -f "$base.out" "$base.err" "$base.exit" "$base.pid"
    date +%s > "$base.start"
    # Run the command in THIS process (the caller backgrounded us via
    # run_in_background), record its exit code last so `.exit` existing means
    # `.out`/`.err` are complete.
    "$@" > "$base.out" 2> "$base.err" &
    child=$!
    echo "$child" > "$base.pid"
    wait "$child"; rc=$?
    echo "$rc" > "$base.exit"
    echo "lane $name finished exit=$rc after $(( $(date +%s) - $(cat "$base.start") ))s"
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
    echo "killed lane $name (pid ${pid:-?})"
    ;;
  *) usage ;;
esac
