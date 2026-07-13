---
paths:
  - "eve/agent/instructions.md"
---

# The desk sysprompt

The runtime system prompt — eve loads it by filename. Edit only on observed session behavior or a real capability change, never a read-through.

## Formatting conventions

- **Headers** — function-first sections (`# Scanning`, `# Drafting`, `# Cadence`) own their setup slots *and* run procedure; `# The conversation` is the spine. A header must earn retrieval: 1–3 lines of content collapses into its parent as a bullet.
- **Bold** — means hard limit, nothing else; rules are inline bold sentences at their point of use. `# Global hard rules` takes only document-wide ones.
- **Lists** — numbered = sequence, bullets = unordered set or branches; every bullet opens with a **bold lead** or a `backticked` identifier.
- **Lines** — one logical unit per line, soft-wrap, no manual wrapping; indentation is structural only, 4 spaces per nest level.
- **Backticks** — every tool, param, and operator; the scan call template stays a fenced `jsonc` block.
- **`<example>` tags** — all examples, blank line after the opening tag and before the closing one; content stays generic (it bleeds into live output).
- **No duplication** — a fact lives once, in the section that owns it; never narrate the hierarchy in prose.

## Drift guards (each burned a live session)

- **Escaped quotes in search queries** — the keyword query carries X's `"exact phrase"` operator *inside a JSON string*; unescaped, the model emits broken tool-call JSON and burns turns self-repairing (observed as a parse-error retry loop in DeepSeek's reasoning). The `\"exact phrase\"` escape must stay BOTH stated in the query-language bullet AND demonstrated verbatim in the `jsonc` template — models copy templates more reliably than they follow prose, so never genericize the escape out of it.
- **Tool sync** — a diff changing `eve/agent/tools/` or any tool's `inputSchema` updates this file in the same commit; the prompt once kept commanding `web_fetch`/`web_search` after their sentinels disabled them.
- **Reference sync** — renaming or removing a header updates every in-file mention of it; dangling "step N" pointers survived a past header restructure.
- **One fact, one value** — a number stated twice diverges (the X character limits once read 250/4500 in one section and 280/25,000 in another); check for a second statement before adding any constant.
