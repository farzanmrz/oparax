---
paths:
  - "lib/voice/**"
---

# The voice pipeline (`lib/voice/`)

Pure, dependency-free functions ported out of the gitignored `.voice-lab/` so the production
extraction/drafting path uses the lab's proven artifacts instead of re-deriving them. Both were
verified against their originals at port time. Full rationale and measurements:
`AGENTS.md`'s settled decisions, plus the extraction recipe below.

## `deployGuide()` — strip before a guide becomes a prompt

A raw guide may carry sections that exist to verify the EXTRACTOR. The drafting model gains
nothing and pays for them on every draft: **16.1% off every draft, forever, at zero risk**
(measured, 10 guides, when `## Dimension Coverage` was still generated). The `LAB_ONLY_SECTIONS`
strip was verified byte-identical to the Python original at port time — that no longer covers
`deployGuide()`'s full output, since it also strips `## Beat & Scope` out-of-band (below).

**`LAB_ONLY_SECTIONS` is empty today and that is correct** — its one entry, `## Dimension
Coverage`, is no longer emitted at all (see the extraction recipe below). Not generating a
section beats generating and stripping it: the same 16.1% is now saved at extraction time too.
Do not "clean up" the empty array or inline the call — the raw/deployed split is what
`voice_guides` provenance rests on, and the rule outlives its one instance.

Stripping is no longer exclusively `LAB_ONLY_SECTIONS`-driven: `deployGuide()` also strips
`## Beat & Scope` via `stripBeatScope()`, rerouting that section to the drafting pipeline's
`beatSpec` (`extractBeatSpec()` reads it back off `guide_raw`) instead of leaving it in
`voiceGuidance`. A new lab-only section still goes into `LAB_ONLY_SECTIONS`; a new
first-class-input section like Beat & Scope needs its own extractor + strip pair instead.

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

**The `EMOJI` regex needs `target: ES2024`.** It is a plain `/\p{RGI_Emoji}/gv` literal —
the `v` flag is what keeps ZWJ sequences and flag emoji counting as one glyph. tsconfig's
`target` was bumped to ES2024 for exactly this; downgrading the target re-breaks this file's
typecheck. (Historical note, kept because it burned two write cycles: under the old ES2017
target this had to be a RegExp-constructor call, and Biome's `useRegexLiterals` — whose
constructor→literal rewrite is classified **safe**, so the format-on-write hook applies it —
kept rewriting it back. A `biome-ignore` only binds when placed on the line immediately above
the flagged expression, not above the enclosing declaration.)

## Voice-guide guardrails

- **Keep the live extraction call streaming.** The Feed and Voice surfaces poll the durable run
  row and render the shared `extraction-steps.ts` mapping: recent posts → beat → voice → rules.
  Model-step boundaries, rather than arbitrary client polls, own the scope and extraction
  reasoning/text streams. Do not introduce a second stage vocabulary or a separate progress path.
- **The extractor never fabricates a post.** Every example in a guide is text the reporter actually
  published. The `## Anti-Examples` section (invented "they would never write this" posts) was
  removed: it was the one place the prompt licensed invention, it shipped into every drafting
  prompt as bloat, and corrective guidance is better sourced from real reporter feedback than from
  model invention. `## Hard Rules — Never` stays — those are evidence-grounded observations of what
  the writer demonstrably avoids, not inventions.
- **Measured facts are computed, not read.** Reading under-counts sparse habits: the extractor
  called one reporter hashtag-free when the true count was 6/80. A count cannot miss that and
  costs $0.
- **The Absence Rule and all 33 dimensions stay — do not "simplify" them into a prohibition
  list.** A blocklist ("do not invent hashtags", "do not invent slants") can never be finished:
  it enumerates the three failures the ablation happened to catch and silently authorizes every
  one it didn't. The Absence Rule is a general procedure instead — every dimension returns
  evidence or the exact words "Not present in this corpus" — which covers unseen failure modes
  and is phrased positively, matching the guidance's "positive examples beat instructions about
  what not to do." The dimension list and the Absence Rule are a matched pair: 33 headings is a
  hallucination surface, and the Absence Rule is what makes "nothing here" a legal answer.
  Cutting either one makes the other actively harmful.
- **Deploy strip:** store the raw guide (audit trail), draft from the stripped one — 16.1% off
  every draft forever, at zero risk. Now saved at extraction time instead (see above).
