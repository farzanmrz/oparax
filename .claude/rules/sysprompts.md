---
paths:
  - "lib/sysprompts/**"
---

# The system prompts

`lib/sysprompts/` holds the agent's prompts as markdown — `desk-agent.md` (the DeepSeek orchestrator, the file these conventions were written for) plus the two short grok executor prompts. `index.ts` reads each once at module load — the deploy-bundling gotcha lives in `.claude/rules/agent.md`. Edit only on observed session behavior or a real capability change, never a read-through.

## Formatting conventions

- **Headers** — function-first sections (`# Scanning`, `# Drafting`, `# Scan frequency`) own their setup slots *and* run procedure; `# The conversation` is the spine. A header must earn retrieval: 1–3 lines of content collapses into its parent as a bullet.
- **Bold** — means hard limit, nothing else; rules are inline bold sentences at their point of use. `# Global hard rules` takes only document-wide ones.
- **Lists** — numbered = sequence, bullets = unordered set or branches; every bullet opens with a **bold lead** or a `backticked` identifier.
- **Lines** — one logical unit per line, soft-wrap, no manual wrapping; indentation is structural only, 4 spaces per nest level.
- **Backticks** — every tool, param, and operator; the scan call template stays a fenced `jsonc` block.
- **`<example>` tags** — all examples, blank line after the opening tag and before the closing one; content stays generic (it bleeds into live output).
- **No duplication** — a fact lives once, in the section that owns it; never narrate the hierarchy in prose.

## Drift guards (each burned a live session)

- **Escaped quotes in search queries** — the keyword query carries X's `"exact phrase"` operator *inside a JSON string*; unescaped, the model emits broken tool-call JSON and burns turns self-repairing. The `\"exact phrase\"` escape must stay BOTH stated in the query-language bullet AND demonstrated verbatim in the `jsonc` template — models copy templates more reliably than they follow prose, so never genericize the escape out of it.
- **Tool sync** — a diff changing `lib/agent/tools.ts` or any tool's `inputSchema` updates `desk-agent.md` in the same commit. The agent's tool set is a fixed object literal (two tools, no sentinel/registry mechanism) — the prompt's tool list must name exactly `grok_twitter_search` and `save_agent`, and no others.
- **Reference sync** — renaming or removing a header updates every in-file mention of it; dangling "step N" pointers survived a past header restructure.
- **One fact, one value** — a number stated twice diverges; the X character limits are one live example, stated once in `desk-agent.md` and once in `desk-config.ts`'s zod `.describe()` — keep both in sync, and check for a second statement (including here) before adding any new constant.
