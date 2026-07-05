---
paths:
  - "**/*.md"
---

# Markdown style

Structure only to expose hierarchy that is really there. Don't manufacture levels: no heading for one line, no sub-bullet for a single item, no code block for a bare word, no bold on a whole sentence. **Under-structure beats over-structure.**

## Formatting

- **Headings** (`#` → `####`) for document → section → subsection depth; go only as deep as the content needs, and never skip a level.
- **Bullets** (`-`) for unordered points; **numbered** (`1.`) only for real sequences — steps or ranked items.
- **Bold** the keyword a line turns on; *italics* rarely, for a single emphasized word.
- **Backticks** for every path, filename, identifier, and short inline command — `pnpm dev`, `app/page.tsx`.
- **Code blocks** (```bash, ```ts, …) for any multi-line command or snippet; never put those in prose.
- **Tables** when several items share the same fields; a list otherwise.

## In rules / skills / agents

- Write directives, not descriptions — a line stays only if it says to DO or NOT do something. Cut "X is a convention" trivia.
- State each fact once, in its one owning file.
- Scope each rule to the narrowest `paths:` that need it.
