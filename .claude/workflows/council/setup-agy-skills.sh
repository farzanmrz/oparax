#!/usr/bin/env bash
# STAGED setup for the scaffold-offload arm — DO NOT run while a council/bake-off using agy is live:
# `agy plugin import claude` mutates ~/.gemini globally, and agy is a participant in the running
# experiment, so importing mid-run would change agy's behavior between calls and corrupt results.
# Run this ONLY after the in-flight D/S bake-off has landed. Read-mostly + one import; reversible via
# `agy plugin uninstall <name>` / `agy plugin disable <name>`.
#
# What it does: imports Claude Code plugins/skills into agy, then reports what landed, so we can see
# whether the plan-* / framework skills the Lenses stage uses are now available to an agy subagent.
set -uo pipefail

echo "===== BEFORE ====="
echo "-- agy plugin list --";  agy plugin list  2>&1 | head -40
echo "-- agy agents --";      agy agents        2>&1 | head -40

echo; echo "===== IMPORT (Claude → agy) ====="
# Import plugins/skills from the Claude Code config. This is the one state-changing step.
agy plugin import claude 2>&1 | head -60

echo; echo "===== AFTER ====="
echo "-- agy plugin list --"; agy plugin list 2>&1 | head -80
echo "-- agy agents --";     agy agents        2>&1 | head -80

echo; echo "===== SKILL-BODY AVAILABILITY (the cross-agent mirror the lenses rely on) ====="
# grok/codex read these bodies directly; agy uses the imported plugins. Confirm the plan/framework
# skill bodies the Lenses stage selects are present on disk for the non-import path too.
ls -1 .agents/skills/ 2>/dev/null | grep -iE 'feature-plan|feature-build|frontend|nextjs|supabase|railway' | head -20 || echo "(mirror entries not found — check .agents/skills)"

echo; echo "Setup probe done. Next: a single scoped agy lens call to confirm invocation, THEN the sweep."
