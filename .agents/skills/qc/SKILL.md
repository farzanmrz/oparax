---
name: qc
description: "Review an oparax ft/<N> branch that $build has already built and committed: check plan coverage, run the gates, launch five review lanes plus a holistic pass in this session, and fold every finding into one fix list for $build's fix mode (or clear the round for $ship). Use only when the owner explicitly types $qc <N> in Codex. Never invoke automatically during other work."
argument-hint: "[issue #]"
---

# QC (Codex entry point)

The qc skill is one file shared with Claude Code (`/qc <N>` there, `$qc <N>` here). Read `.claude/skills/qc/SKILL.md` in this repository now, whole, and follow it exactly as written for issue N, in this session, autonomously. Its shell blocks are the mechanics (`git`, `gh`, `.claude/scripts/qc-gates.sh`, `.claude/scripts/lane.sh`); its review lanes decide what lands on the fix list; the fix list (or the round-done marker, if there is nothing to fix) is what the session hands back. Where it names loading a skill bundle with Claude Code's `Skill` tool, the Codex equivalent is invoking that skill by its `$name` (e.g. `$vercel:nextjs`, `$supabase`, `$posthog:instrument-llm-analytics`), exactly as the canonical file's own `Skills:` line convention already documents. Nothing else in this file: the shared skill is the whole instruction.
