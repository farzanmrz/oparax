---
paths:
  - AGENTS.md
  - CLAUDE.md
---

# Authoring the canonical instruction file

- `AGENTS.md` is canonical and cross-tool (Codex and others read it directly); `CLAUDE.md` is only `@AGENTS.md` importing it. Put shared project facts in `AGENTS.md`, never in `CLAUDE.md`.
- Facts, not behavior. Anything telling an agent *how to act* in an area belongs in a scoped `.claude/rules/` file — Claude Code auto-loads those, and they are the enforced layer we primarily maintain.
- If a fact is already owned by a rule or a reference, link it or omit it; don't restate it.
