---
name: feature
description: "Plan an oparax feature or bug fix slice: talk through the idea with the owner, write the plain plan, load the slice's skill bundles, run the five-lane cross-model critique, and on approval open the GitHub issue and cut the branch. Use only when the owner explicitly types $feature in Codex. Never invoke automatically during other work."
---

# Feature (Codex entry point)

The feature skill is one file shared with Claude Code (`/feature` there, `$feature` here). Read `.claude/skills/feature/SKILL.md` in this repository now, whole, and follow it exactly as written, in this session, with the owner watching. Its shell blocks are the mechanics (`git`, `gh`, `.claude/scripts/start.sh`); its critique lanes decide what the detailed plan says; the owner's approval on the plain plan is what opens the issue and cuts `ft/<N>` (or `bf/<N>`). Where it names loading a skill bundle with Claude Code's `Skill` tool, the Codex equivalent is invoking that skill by its `$name` (e.g. `$vercel:nextjs`, `$supabase`, `$posthog:instrument-llm-analytics`), exactly as the canonical file's own `Skills:` line convention already documents. Nothing else in this file: the shared skill is the whole instruction.
