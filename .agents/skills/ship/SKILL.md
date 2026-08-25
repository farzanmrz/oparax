---
name: ship
description: "Ship a finished oparax ft/<N> branch to beta after the owner's localhost walk: sweep meta paths, guard on the QC round marker, squash to beta, push, name what the owner does at ship. Use only when the owner explicitly types $ship <N> in Codex. Never invoke automatically during other work."
---

# Ship (Codex entry point)

The ship skill is one file shared with Claude Code (`/ship <N>` there, `$ship <N>` here). Read `.claude/skills/ship/SKILL.md` in this repository now, whole, and follow it exactly as written for issue N, in this session, with the owner watching. Its shell blocks are the mechanics (`git`, `gh`, `.claude/scripts/ship.sh`, `.claude/scripts/promote.sh`); its guards decide whether the branch may ship; the squash onto `beta` closes the issue automatically. Nothing else in this file: the shared skill is the whole instruction.
