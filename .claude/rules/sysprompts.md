---
paths:
  - "lib/sysprompts/**"
---

# The system prompts

The agent's live prompts as markdown, read once each at module load by `index.ts`.
The deploy-bundling gotcha (`outputFileTracingIncludes`) is in `.claude/rules/agent.md`.

| Prompt | Role |
|---|---|
| `draft-ground.md` / `draft-judge.md` | the matched Qwen 3.7 Flash grounding + verification contracts |
| `draft-council-contract.md` | the drafting contract, appended below a reporter's deployed voice guide at call time |
| `draft-revise.md` | apply an emailed correction to a previous draft |
| `story-cluster.md` | the clustering classifier's `generateObject` system (dormant) |
| `voice-extract.md` | voice extraction — **see below, it is not like the others** |

## `voice-extract.md` is measured, not authored

Ported from the lab's proven `prompt-fable.txt`. **Treat every edit as a deliberate
divergence from a measured artifact, and never tune it by read-through** — edit only
on observed session behavior or a real capability change.

It is no longer byte-identical to the original: `## Anti-Examples` and the
`<never_write>` tag were removed by owner decision, because the extractor never
fabricates posts. `## Dimension Coverage` is no longer emitted, so `deployGuide()`'s
`LAB_ONLY_SECTIONS` is empty **by design**; that file's header explains why the strip
mechanism stays anyway.

## Formatting conventions

- **Headers** — function-first, owning their setup slots *and* run procedure. A header
  must earn retrieval: 1–3 lines of content collapses into its parent as a bullet.
- **Bold** — means hard limit, nothing else. Rules are inline bold sentences at their
  point of use; `# Global hard rules` takes only document-wide ones.
- **Lists** — numbered = sequence, bullets = unordered set. Every bullet opens with a
  **bold lead** or a `backticked` identifier.
- **Lines** — one logical unit per line, soft-wrap, no manual wrapping. Indentation is
  structural only, 4 spaces per level.
- **Backticks** — every tool, param and operator.
- **`<example>` tags** — blank line after the opening tag and before the closing one;
  content stays generic, because it bleeds into live output.
- **No duplication** — a fact lives once, in the section that owns it. Never narrate
  the hierarchy in prose.

## Drift guards (each burned a live session)

- **Structured-output field names are exact** — schema, prompt and response use the
  same key, never a semantic alias. `firstDraft` names the grounder's input candidate;
  the judge returns `finalDraft`, and a correction in `correctedFields` is canonically
  `"finalDraft"`. The parser normalizes the one historically observed `"firstDraft"`
  alias, but **prompts must never teach that compatibility rail**.
- **No quotes in a keyword query.** X's `"exact phrase"` operator is the only token
  that puts a raw `"` inside a tool-call JSON string, and small models mis-escape it
  intermittently — `AI_JSONParseError` then aborts the whole turn, which killed a live
  prod session. The fix is structural, not more escaping guidance: bare single-word
  `OR` terms only, with phrase intent moved to semantic-search angles.
- **Reference sync** — renaming or removing a header updates every in-file mention of
  it. Dangling "step N" pointers survived a past restructure.
- **One fact, one value.** The X character limits live once, as `X_CHAR_LIMITS` in
  `lib/agent/desk-config.ts`, and `desk-config.ts`'s zod `.describe()` renders from
  that constant. No prompt here restates them in prose — keep it that way rather than
  adding a second statement to sync.
- **Tool sync** — no live tool-calling agent exists under this path today. If one is
  built, its prompt and its tool-call object literal need a sync guard together.
