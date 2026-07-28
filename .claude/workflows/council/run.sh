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
#
# TIER IS FAMILY-SHAPED — it is NOT the same axis across families:
#   agy   : tier IS the model slug; model+effort are FUSED by the CLI itself
#           (`--model gemini-3.1-pro --effort medium` is rejected outright; the slug carries both).
#   codex : tier is EFFORT only. Model rides the separate COUNCIL_MODEL env var, forwarded to -m.
#           Leave COUNCIL_MODEL empty and codex uses ~/.codex/config.toml's `model` instead.
#   grok  : tier is EFFORT only. Model is hardcoded grok-4.5 in plan-grok.sh (single-model family).
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
# Success key: callers used to have to export COUNCIL_CHECK_KEY to match the schema
# (default "plan"), and the rebuilt skills never did — a lane returning perfect
# {critiques:[...]} would have been branded FAILED. Derive it from the schema itself:
# the first top-level property IS the payload key for every council schema.
if [ -z "${COUNCIL_CHECK_KEY:-}" ]; then
  COUNCIL_CHECK_KEY="$(jq -r '.properties | keys_unsorted[0] // "plan"' "$SCHEMA" 2>/dev/null || echo plan)"
fi
export COUNCIL_CHECK_KEY
exec bash "$HERE/plan-$FAM.sh" "$SCRATCH/$LABEL.in.txt" "$SCHEMA" "$TIER" "$SCRATCH/$LABEL.out.json"
