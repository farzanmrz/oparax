---
name: feature
description: "Plan an oparax feature or bug fix slice: talk through the idea with the owner, use Fable and Astra throughout planning with independent drafts and mutual review, write the plain plan, load the slice's skill bundles, run the five-lane cross-model critique, and on final approval open the GitHub issue, cut the branch and launch the selected Codex build. Use only when the owner explicitly types $feature in Codex. Never invoke automatically during other work."
---

# Feature (Codex entry point)

The feature skill is one file shared with Claude Code (`/feature` there, `$feature` here). Read `.claude/skills/feature/SKILL.md` in this repository now, whole, and follow it exactly as written, in this session, with the owner watching. Its shell blocks are the mechanics (`git`, `gh`, `.claude/scripts/start.sh`, and the fixed `.claude/scripts/review-lanes.py` runner); its critique lanes decide what the detailed plan says; the owner's approval on the plain plan is what opens the issue and cuts `ft/<N>` (or `bf/<N>`). Where it names loading a skill bundle with Claude Code's `Skill` tool, the Codex equivalent is invoking that skill by its `$name` (e.g. `$vercel:nextjs`, `$supabase`, `$posthog:instrument-llm-analytics`), exactly as the canonical file's own `Skills:` line convention already documents.

Read the canonical skill's `references/pair-planning.md`. The default Codex host is `gpt-6-astra` for every planning phase, with `claude-fable-5` as the launched peer at high effort. Pass `--host astra --pair-model astra` and the explicit phase. The application controls the host model; do not relabel a different model. An explicit Sol request uses `gpt-6-sol` for routine phases only, with Astra still required for detail and substantial redesign. This is the same planning protocol used by amend; critique, QC and build selection have their own shared instructions.
