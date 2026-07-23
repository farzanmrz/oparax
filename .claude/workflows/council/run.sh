#!/usr/bin/env bash
# Thin council dispatcher — ONLY exists to keep the bash display short.
# It changes NOTHING about execution: it resolves the boilerplate paths from a label +
# conventions, then exec's the SAME per-family wrapper (plan-<family>.sh) with the SAME
# arguments the workflow would have passed directly. If this layer ever misbehaves, the
# workflow can fall back to calling plan-<family>.sh directly (unchanged, proven).
#
# Usage:  run.sh <family> <label>
#   family : codex | grok | agy
#   label  : worker label; also the scratch filename stem (<label>.in.txt / .out.json)
# The caller writes "<scratch>/<label>.in.txt" first, then runs this.
#
# Grounding repo comes from CLAUDE_PROJECT_DIR (shown once in the display — useful).
# Fixed by convention so they DON'T bloat the command:
#   - schema   : ../plan-codex-schema.json (next to this dir), override with COUNCIL_SCHEMA
#                (e.g. QC's verify stage points this at ../verify-schema.json)
#   - scratch  : $COUNCIL_SCRATCH, else <repo>/.feature/council
#   - tier     : the LOCKED production tier per family (override with COUNCIL_TIER)
set -uo pipefail
FAM="${1:?family}"; LABEL="${2:?label}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA="${COUNCIL_SCHEMA:-$HERE/../plan-codex-schema.json}"
SCRATCH="${COUNCIL_SCRATCH:-${CLAUDE_PROJECT_DIR:-$(pwd)}/.feature/council}"
mkdir -p "$SCRATCH"
case "$FAM" in
  codex) TIER="${COUNCIL_TIER:-high}" ;;                # reference-tier default; strict no-survey makes high land (311s). Bake-off tests medium (186s).
  grok)  TIER="${COUNCIL_TIER:-high}" ;;                # subscription; high is fine (xhigh/max error). Bake-off tests medium.
  agy)   TIER="${COUNCIL_TIER:-gemini-3.1-pro-high}" ;; # reference tier. Bake-off tests gemini-3.6-flash-high.
  *) echo "run.sh: unknown family '$FAM'" >&2; exit 2 ;;
esac
exec bash "$HERE/plan-$FAM.sh" "$SCRATCH/$LABEL.in.txt" "$SCHEMA" "$TIER" "$SCRATCH/$LABEL.out.json"
