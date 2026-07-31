#!/usr/bin/env bash
# Council member: Grok (xAI grok-4.5, SuperGrok subscription). One-shot, read-only, schema-bound.
# Usage: plan-grok.sh <prompt-file> <schema-file> <effort> <out-file>
#   effort: low|medium|high  (ablation: low≈medium≈103s; high 163s; xhigh/max ERROR — never pass them)
# grok auto-reads AGENTS.md; --json-schema returns a parsed .structuredOutput object.
# Emits the plan JSON to <out-file>; exit 0 on success, 1 (+ GROK_FAILED) otherwise. Best-effort.
set -uo pipefail
SECONDS=0  # bash stopwatch: wall-seconds for this member (folded into OUT as .elapsed_s)
PF="$1"; SCHEMA="$2"; EFF="${3:-high}"; OUT="$4"
REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"
DEPTH="${COUNCIL_DEPTH:-simple}"
KEY="${COUNCIL_CHECK_KEY:-plan}"  # QC's find/verify stages pass "findings" / "verdict"
raw_out="$(mktemp)"
raw_err="$(mktemp)"
raw_failure="${OUT%.out.json}.raw.err"
# A restarted lane must never look complete because a previous run left a result.
rm -f "$OUT"
# DEEP: let grok explore ft/68 at native depth — subagents ON (no --no-subagents), generous --max-turns,
#       and NO --disallowed-tools (that flag named a non-existent tool anyway; read-only sandbox still
#       blocks writes/network). SIMPLE: the old no-survey invocation (prompt forbids reads).
# The lane's ROLE is scoped by an agent profile, not by starving its toolset:
# .grok/agents/oparax-critic.md sets the critic system prompt, permission_mode:
# plan (read-only), and agents_md: true. It is passed explicitly rather than
# left to name-discovery so a rename fails loudly instead of silently falling
# back to grok's default build agent. Missing file → run without it.
# The flag is `--agent`, which takes "Agent name or definition file path".
# NOT `--agent-profile`: the bundled README documents that name, the installed
# binary (0.2.112) rejects it outright — caught by council/selftest.sh the first
# time it ran. Pass the path, not the name, so a rename fails loudly instead of
# silently falling back to grok's default build agent.
PROFILE="$REPO/.grok/agents/oparax-critic.md"
PROFILE_ARG=()
if [ -f "$PROFILE" ]; then PROFILE_ARG=(--agent "$PROFILE"); fi

# Grok still sees Claude's vercel + railway MCP servers: they arrive through the
# PLUGIN path, which `[compat.claude] mcps = false` does not cover (that cell only
# governs `.claude.json` entries — supabase/openpets are correctly disabled by it).
# A read-only critic never deploys or queries infrastructure, so drop those tool
# schemas per-invocation. `--disallowed-tools` is headless-only, which is exactly
# where this lane runs.
# ONE flag, comma-separated: grok rejects a repeated --disallowed-tools outright.
NO_INFRA_LIST="mcp__vercel__*,mcp__railway__*"

if [ "$DEPTH" = "deep" ]; then
  # GROK_SUBAGENTS=1 enables grok's native explore/plan/general-purpose types so
  # a deep run can fan out across subsystems; the profile tells it when to.
  GROK_SUBAGENTS="${GROK_SUBAGENTS:-1}" \
  grok --prompt-file "$PF" --json-schema "$(cat "$SCHEMA")" --sandbox read-only --cwd "$REPO" \
       "${PROFILE_ARG[@]}" --disallowed-tools "$NO_INFRA_LIST" \
       --always-approve --effort "$EFF" -m grok-4.5 --max-turns 150 \
       --output-format json > "$raw_out" 2> "$raw_err"
else
  grok --prompt-file "$PF" --json-schema "$(cat "$SCHEMA")" --sandbox read-only --cwd "$REPO" \
       "${PROFILE_ARG[@]}" --disallowed-tools "$NO_INFRA_LIST,run_terminal_cmd" --always-approve --effort "$EFF" -m grok-4.5 \
       --output-format json > "$raw_out" 2> "$raw_err"
fi
if jq -e --arg k "$KEY" '
  (.structuredOutput | type == "object") and
  (.structuredOutput[$k] | type == "string" or type == "array" or type == "object")
' "$raw_out" >/dev/null 2>&1; then
  jq --argjson t "$SECONDS" --arg tier "$EFF" '.structuredOutput + {elapsed_s:$t, tier:$tier}' "$raw_out" > "$OUT"
  rm -f "$raw_out" "$raw_err"; exit 0
else
  {
    printf '%s\n' '--- grok stderr ---'
    cat "$raw_err"
    printf '%s\n' '--- grok stdout ---'
    cat "$raw_out"
  } > "$raw_failure" 2>/dev/null || true
  rm -f "$raw_out" "$raw_err"
  echo "GROK_FAILED (${SECONDS}s) — raw kept at $raw_failure" >&2; exit 1
fi
