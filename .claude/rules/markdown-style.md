---
paths:
  - "**/*.md"
---

# Markdown style

Any `.md` file:
- One directive per bullet — never club multiple rules into one bullet. Use sub-bullets or a heading for hierarchy, not inline `;`/`·`-separated rule lists.
- Commands and code go in fenced code blocks (```bash, ```ts, …), never inline in prose. Keep paths and identifiers in `backticks`.
- Prefer a short table over a long inline comparison.

Instruction files (`CLAUDE.md`, `.claude/rules/`, `.claude/skills/`, `.claude/agents/`) additionally:
- Write only directives and the orientation needed to act. A rule is something to DO or NOT do — not a description of what a file is. Cut fluff ("X is a Next.js convention", "not stray assets").
- `CLAUDE.md` holds facts (what exists); rules hold behavior (how to act). State each fact once, in one place.
- Scope each rule to the narrowest `paths:` that need it.
