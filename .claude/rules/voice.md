---
paths:
  - "lib/voice/**"
---

# The voice pipeline (`lib/voice/`)

Pure, dependency-free functions ported out of the gitignored `.voice-lab/` so the production
extraction/drafting path uses the lab's proven artifacts instead of re-deriving them. Both were
verified against their originals at port time. Full rationale and measurements: §11 of
`docs/push-architecture.md`.

## `deployGuide()` — strip before a guide becomes a prompt

A raw guide carries sections that exist to verify the EXTRACTOR (today `## Dimension
Coverage`). The drafting model gains nothing and pays for them on every draft: **16.1% off
every draft, forever, at zero risk** (measured, 10 guides). Verified **byte-identical to the
Python original on all 10 lab guides**.

**Store the raw guide, draft from `deployGuide(raw)`.** Never the reverse — the raw guide is
the audit trail for what the extractor claimed to examine. Adding a new lab-only section to
the extraction prompt means adding its heading to `LAB_ONLY_SECTIONS` in the same commit.

## `measuredFacts()` — the measurable half, computed not read

Length distribution, line-break shares, exhaustive emoji + hashtag inventories with counts,
mention/URL/punctuation/ALL-CAPS rates, over the whole corpus. Prepended to the extraction
input; the prompt's `## MEASURED FACTS` section makes the numbers **binding** (rules must
agree and carry rates; a glyph absent from an inventory may not be taught).

Reading under-counts sparse habits — the extractor called Sami Mokbel hashtag-free when the
true count is 6/80 (`#AFC×5 #MCFC×4 #WHUFC×4 #MUFC×1`). A count cannot miss that, costs $0,
and frees the model for what code can't measure: tone, stance, sourcing, when each habit fires.

**The `EMOJI` regex shape is load-bearing, and so is its `biome-ignore`.** It must stay a
RegExp *constructor* call: as the literal `/\p{RGI_Emoji}/gv` it fails tsc under the project's
`target: ES2017`, and on any runtime without `v` support it is a PARSE error — which the
`try`/`catch` could never catch, silently killing the fallback to
`\p{Extended_Pictographic}`.

Biome's `lint/complexity/useRegexLiterals` rewrites the constructor to a literal and Biome
classifies that fix as **safe**, so the format-on-write hook applies it with no `--unsafe`.
It did exactly that twice during the port. The suppression must sit on the line **immediately
above the `return`** — placed above the enclosing `const`, it does not bind and the rewrite
happens anyway (observed, not theorized). If you find a bare `/…/gv` here, it is that
regression: restore the constructor and re-check the comment's placement.

## Model configs are decided; don't re-choose them mid-task

Extraction and drafting model/reasoning picks are fixed in §11.9–11.10 with costs and hard
ceilings ($2 one-time extraction, $3/mo drafting). Two live-probed facts that outrank any
documentation you might read:

- **`moonshotai/kimi-k3` cannot cap reasoning.** `effort: "none"` still emitted 119 reasoning
  tokens; every variant returned HTTP 200. The param is accepted and silently ignored. Bound
  it with `max_completion_tokens` (hard ceiling over reasoning + content), and verify any
  model's cap by reading `reasoning_tokens` back — **never by trusting a 200**.
- **`deepseek-v4-flash` takes no `reasoning` param** in the judgment roles (native adaptive is
  the tested config); the judge role is the one exception, pinned `none` + temp 0.
