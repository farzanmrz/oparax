#!/usr/bin/env bash
# Codex UserPromptSubmit hook — the ONLY reliable way to make Codex delegate.
#
# Documented behaviour (learn.chatgpt.com/docs/agent-configuration/subagents):
# local Codex spawns a subagent ONLY on an explicit request in the prompt, or on
# an instruction in AGENTS.md / a SKILL.md telling it to. Unlike Claude Code, an
# agent's `description` field is NOT a router — a roster sits inert until
# something in context names it. There is no auto-delegate flag.
#
# So this injects the roster as developer context on every turn. Hooks are the
# documented injection point: `hookSpecificOutput.additionalContext` on
# UserPromptSubmit is added before the prompt is processed.
set -uo pipefail
cat >/dev/null   # consume the event JSON; nothing here depends on it
cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"Repo subagents are available and you are expected to use them rather than doing this work inline. Delegate whenever the task matches: cx_grounder (read-only evidence — grounding packs, diff stats, dead-code sweeps), cx_fixer (apply exactly ONE adjudicated finding or lint/doc brief), cx_supabase_runner (any Supabase work that explores, iterates, or returns bulk output), cx_deploy_checker (one deployment verdict for a SHA+host), pr_explorer (map and evidence code paths), reviewer (deep review against that evidence). Spawn several in parallel when the work splits cleanly across disjoint files, staying within the concurrency cap. Keep adjudication, owner-facing reports, and gate decisions in this session."}}
JSON
