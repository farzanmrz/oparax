---
name: feature
description: "Plan the whole oparax product (or a bug fix) as one feature: the planning host talks it through with the owner and writes the plain plan, Fable and Astra independently draft the detail after approval and jointly adjudicate the eight-lane CLI critique, then the host opens the GitHub issue, cuts the branch, writes the plan files and launches /run-plan <N>. Use only when the owner explicitly types $feature in Codex. Never invoke automatically during other work."
---

# Feature (Codex entry point)

Read `.claude/skills/feature/SKILL.md` and its `references/planning-protocol.md` whole, then follow them in this Codex session. When the owner invokes `$feature` here, this session is the planning host under its actual model. Do not call it Fable or Astra unless it actually is that model. It discusses scope, writes the plain plan and loads skill bundles without early peer calls. After approval, Fable and Astra independently draft the detailed plan and jointly adjudicate the fixed eight-lane critique, using exact-model read-only calls when this host is another model. The canonical skill's issue, branch and `/run-plan <N>` handoff apply. Invoke Codex skills by their `$name` where the canonical skill names Claude Code's Skill tool; check free skill names against the installed Codex skills.
