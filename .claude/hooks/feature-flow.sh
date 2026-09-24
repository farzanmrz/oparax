#!/usr/bin/env bash
# UserPromptSubmit (Claude Code and Codex share this script). When the owner's message
# contains the phrase "feature flow", print one line defining it. The stage names are
# read from .agents/skills at run time, so a renamed or added stage never leaves this
# text stale (owner, September 24: the flow has been renamed many times; no hardcoded names).
# Silent otherwise; always exit 0 (the prompt must never be blocked by this).
set -uo pipefail
prompt="$(jq -r '.prompt // empty' 2>/dev/null)"
case "$(printf '%s' "$prompt" | tr '[:upper:]' '[:lower:]')" in
  *"feature flow"*) ;;
  *) exit 0 ;;
esac
root="${CLAUDE_PROJECT_DIR:-$PWD}"
stages="$(ls -1 "$root/.agents/skills" 2>/dev/null | tr '\n' ' ' | sed 's/ $//' | sed 's/ /, /g')"
[ -n "$stages" ] || stages="the skills under .agents/skills"
printf 'Vocabulary: "feature flow" means the whole owner-triggered stage chain, every stage defined only by its SKILL.md under .agents/skills (Codex) and .claude/skills (Claude Code): %s. AGENTS.md "How work moves" describes the handoffs between them.\n' "$stages"
exit 0
