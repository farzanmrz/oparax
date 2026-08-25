---
name: amend
description: "Add scope to an in-flight oparax issue N on its existing branch, no new issue or branch: talk through the addition as a delta, write the plain amendment and get it approved, run the critique, and on approval append it to the issue. Use only when the owner explicitly types $amend <N> (or $amend <plain description> while on the issue's branch) in Codex. Never invoke automatically during other work."
argument-hint: "[issue # | plain description of the addition]"
---

# Amend (Codex entry point)

The amend skill is one file shared with Claude Code (`/amend <N>` there, `$amend <N>` here). Read `.claude/skills/amend/SKILL.md` in this repository now, whole, and follow it exactly as written for issue N, in this session, with the owner watching. Its shell blocks are the mechanics (`git`, `gh`); its critique lanes decide what the detailed amendment says; the owner's approval on the plain amendment is what appends it to the issue. Where it names loading a skill bundle with Claude Code's `Skill` tool, the Codex equivalent is invoking that skill by its `$name` (e.g. `$vercel:nextjs`, `$supabase`, `$posthog:instrument-llm-analytics`), exactly as the canonical file's own `Skills:` line convention already documents. Nothing else in this file: the shared skill is the whole instruction.
