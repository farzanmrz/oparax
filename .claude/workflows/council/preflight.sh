#!/usr/bin/env bash
# Council preflight: which external CLI planners are live + authed RIGHT NOW?
# Prints one line each: "codex=ok|down", "grok=ok|down", "agy=ok|down".
# The workflow reads this and sizes the council to whoever is up (best-effort / dynamic council).
# Uses the cheapest/fastest tier per CLI so the probe itself is quick. Never mutates the repo.
set -uo pipefail
REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"

probe_codex(){ printf 'Reply with the single word ok.' \
  | codex exec --skip-git-repo-check -s read-only -c model_reasoning_effort=low -C "$REPO" - >/dev/null 2>&1 \
  && echo ok || echo down; }

probe_grok(){ grok -p 'Reply with the single word ok.' --output-format json --effort low -m grok-4.5 \
  --sandbox read-only --cwd "$REPO" --always-approve >/dev/null 2>&1 && echo ok || echo down; }

probe_agy(){ agy --print 'Reply with ONLY this JSON: {"ok":true}. Do not use tools.' \
  --output-format json --model gemini-3.6-flash-high --print-timeout 60s >/dev/null 2>&1 && echo ok || echo down; }

echo "codex=$(probe_codex)"
echo "grok=$(probe_grok)"
echo "agy=$(probe_agy)"
