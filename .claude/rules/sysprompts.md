---
paths:
  - "lib/sysprompts/**"
---

# The system prompts

`lib/sysprompts/` holds the agent's live prompts as markdown — `story-cluster.md` (the story-clustering classifier's prompt, `lib/agent/cluster.ts`'s `generateObject` system — names `match`/`storyIndex`/`summary` imperatively per the 4-leg recipe's leg 2), `draft-council-contract.md` (the L3 drafting contract, appended below a reporter's deployed voice guide at call time), and `draft-revise.md` (apply an emailed correction to a previous draft). `draft-judge.md` (the former council-judge prompt) was deleted once `DRAFT_JUDGE_PROMPT` lost its last reader — see `.claude/rules/agent.md`'s drafting-council section, which needs its own re-verification against the current single-call path. One prompt here is neither: `voice-extract.md` is the voice-extraction system prompt, ported from the lab's proven `prompt-fable.txt` — its wording is **measured, not authored**, so treat every edit as a deliberate divergence from the measured artifact and never tune it by read-through. It is **no longer byte-identical to the lab original**, and a future re-port from the lab must re-apply every divergence below rather than overwrite it: the `## Anti-Examples` section and the `<never_write>` tag were removed by owner decision (the extractor no longer fabricates posts), and the `## Dimension Coverage` output section, the "padding and repetition are penalized" clause, and the "judged against guides produced by rival models" framing were all removed against Anthropic's official Opus 5 prompting guidance — rationale for each in `.claude/rules/voice.md`. `## Dimension Coverage` was the sole entry in `deployGuide()`'s `LAB_ONLY_SECTIONS`, which is now empty **by design**; that file's header explains why the strip mechanism stays. `index.ts` reads each once at module load — the deploy-bundling gotcha lives in `.claude/rules/agent.md`. Edit only on observed session behavior or a real capability change, never a read-through.

The retired scan/draft-pipeline prompts (`scan-runner.md`, `scan-protocol.md`, `scan-clustering.md`, `scan-cluster-runner.md`, `draft-runner.md`, plus the dead `x-search-executor.md` and `onboarding-extract.md`) and their `{{SCAN_PROTOCOL}}`/`{{SCAN_CLUSTERING}}` composition machinery in `index.ts` were deleted once every reader of them was gone — see `.claude/rules/agent.md` for what retired the pipeline itself. `desk-agent.md` (the create-desk assistant's prompt) was deleted alongside `/api/chat` in the create-agent v2 continuation.

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
- **Tool sync** — there is no live tool-calling agent under this path today (the deleted create-desk assistant, and its `tools.ts`/`x-search-executor.md` pair, were the last one). If a new tool-calling agent is built, its prompt and its tool-call object literal need a sync guard together.
- **Reference sync** — renaming or removing a header updates every in-file mention of it; dangling "step N" pointers survived a past header restructure.
- **One fact, one value** — a number stated twice diverges. The X character limits (280 / 25,000) live once as the `X_CHAR_LIMITS` constant in `lib/agent/desk-config.ts`; the draft council enforces it (`draft-council-run.ts`, alongside `NON_X_PLATFORM_CHAR_LIMITS` for LinkedIn/Bluesky), and `desk-config.ts`'s zod `.describe()` renders it from that constant (no fresh literals). No prompt in this directory restates the X limits in prose — keep it that way rather than adding a second statement to sync.
