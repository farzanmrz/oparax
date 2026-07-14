---
paths:
  - "lib/sysprompts/**"
---

# The system prompts

`lib/sysprompts/` holds the agent's prompts as markdown — `desk-agent.md` (the DeepSeek orchestrator, the file these conventions were written for), `scan-runner.md` + `draft-runner.md` (the per-minute dispatcher's headless scan and draft runners), `scan-protocol.md` (the shared scan procedure — see Composition below), and `x-search-executor.md` (the short grok executor prompt). `index.ts` reads each once at module load — the deploy-bundling gotcha lives in `.claude/rules/agent.md`. Edit only on observed session behavior or a real capability change, never a read-through.

## Composition

`## Running a scan` and `## Clustering` (including the `jsonc` template) live ONCE in `scan-protocol.md` — `index.ts` composes them into both `DESK_AGENT_PROMPT` and `SCAN_RUNNER_PROMPT` via a `{{SCAN_PROTOCOL}}` marker in each file. Editing the scan procedure means editing `scan-protocol.md`; both prompts inherit the change. `draft-runner.md` is standalone — nothing composes into or out of it.

## Formatting conventions

- **Headers** — function-first sections (`# Scanning`, `# Drafting`, `# Scan frequency`) own their setup slots *and* run procedure; `# The conversation` is the spine. A header must earn retrieval: 1–3 lines of content collapses into its parent as a bullet.
- **Bold** — means hard limit, nothing else; rules are inline bold sentences at their point of use. `# Global hard rules` takes only document-wide ones.
- **Lists** — numbered = sequence, bullets = unordered set or branches; every bullet opens with a **bold lead** or a `backticked` identifier.
- **Lines** — one logical unit per line, soft-wrap, no manual wrapping; indentation is structural only, 4 spaces per nest level.
- **Backticks** — every tool, param, and operator; the scan call template stays a fenced `jsonc` block.
- **`<example>` tags** — all examples, blank line after the opening tag and before the closing one; content stays generic (it bleeds into live output).
- **No duplication** — a fact lives once, in the section that owns it; never narrate the hierarchy in prose.

## Drift guards (each burned a live session)

- **No quotes in the keyword query** — X's `"exact phrase"` operator is the only token that puts a raw `"` inside the tool-call's JSON string, and `deepseek-v4-flash` mis-escapes it intermittently → `AI_JSONParseError: JSON parsing failed` aborts the whole turn (a live prod session died this way; a diagnostic run captured the model emitting `\"here we go\"` correctly most times and botching it occasionally — escaping guidance alone can't make a small model 100% reliable). The fix is structural, not more escaping: the keyword query uses bare single-word `OR` terms only, and multi-word phrase intent moves to the `x_semantic_search` angles (plain text, no quotes). Keep the `jsonc` template quote-free; reintroducing a quoted phrase into the keyword leg brings the failure back.
- **Tool sync** — a diff changing `lib/agent/tools.ts` or any tool's `inputSchema` updates `desk-agent.md` in the same commit. The agent's tool set is a fixed object literal (two tools, no sentinel/registry mechanism) — the prompt's tool list must name exactly `oparax_x_search` and `save_agent`, and no others.
- **Reference sync** — renaming or removing a header updates every in-file mention of it; dangling "step N" pointers survived a past header restructure.
- **One fact, one value** — a number stated twice diverges. The X character limits (280 / 25,000) live once as the `X_CHAR_LIMITS` constant in `lib/agent/desk-config.ts`; the draft runner enforces it, and `desk-config.ts`'s zod `.describe()` + `lib/agents.ts`'s `TIER_LABELS` render it from that constant (no fresh literals). The prompts restate it in prose in exactly two files — `desk-agent.md` and `draft-runner.md` — which cannot import the constant, so keep those two in sync with it and add no third prose statement or fourth code literal.
