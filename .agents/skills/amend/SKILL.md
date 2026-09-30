---
name: amend
description: "Add scope to an in-flight oparax issue N on its existing branch, no new issue or branch: the planning host writes the plain amendment, Fable and Astra independently draft the detail after approval and jointly adjudicate the eight-lane CLI critique, then the host appends the approved amendment to the issue. Use only when the owner explicitly types $amend <N> (or $amend <plain description> while on the issue's branch) in Codex. Never invoke automatically during other work."
argument-hint: "[issue # | plain description of the addition]"
---

# Amend (Codex entry point)

Read `.claude/skills/amend/SKILL.md` and the linked `../feature/references/planning-protocol.md` whole, then follow them in this Codex session. When the owner invokes `$amend` here, this session is the planning host under its actual model. Do not call it Fable or Astra unless it actually is that model. It discusses the addition, writes the plain amendment and loads skill bundles without early peer calls. After approval, Fable and Astra independently draft the detail and jointly adjudicate the fixed eight-lane critique, using exact-model read-only calls when this host is another model. The canonical skill's existing issue, branch and amendment formats apply. Invoke Codex skills by their `$name` where the canonical skill names Claude Code's Skill tool.
