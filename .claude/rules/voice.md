---
paths:
  - "lib/voice/**"
---

# The voice pipeline (`lib/voice/`)

Pure, dependency-free functions ported out of the voice lab and verified against their
originals at port time, so production uses the lab's proven artifacts instead of
re-deriving them. The lab itself was deleted once every port landed; its measurements
survive in AGENTS.md's settled decisions, which is what they were for.

## `deployGuide()` — strip before a guide becomes a prompt

**Store the raw guide, draft from `deployGuide(raw)`. Never the reverse** — the raw
guide is the audit trail for what the extractor claimed to examine.

A raw guide may carry sections that exist to verify the EXTRACTOR. The drafting model
gains nothing and pays for them on every draft: **16.1% off every draft, forever, at
zero risk** (measured across 10 guides).

**`LAB_ONLY_SECTIONS` is empty today and that is correct.** Its one entry,
`## Dimension Coverage`, is no longer emitted at all — not generating a section beats
generating and stripping it, so the same 16.1% is now saved at extraction time too.
**Do not "clean up" the empty array or inline the call:** the raw/deployed split is
what `voice_guides` provenance rests on, and the rule outlives its one instance.

Stripping is not only `LAB_ONLY_SECTIONS`-driven. `deployGuide()` also strips
`## Beat & Scope` via `stripBeatScope()`, rerouting it to the pipeline's `beatSpec`
(`extractBeatSpec()` reads it back off `guide_raw`). A new lab-only section goes into
`LAB_ONLY_SECTIONS`; a new first-class-input section like Beat & Scope needs its own
extractor + strip pair instead.

## `measuredFacts()` — the measurable half, computed not read

Length distribution, line-break shares, exhaustive emoji and hashtag inventories with
counts, mention/URL/punctuation/ALL-CAPS rates, over the whole corpus. Prepended to the
extraction input, where the prompt's `## MEASURED FACTS` section makes the numbers
**binding**: rules must agree and carry rates, and a glyph absent from an inventory may
not be taught.

Reading under-counts sparse habits — the extractor called one reporter hashtag-free
when the true count was 6/80. A count cannot miss that, costs $0, and frees the model
for what code cannot measure: tone, stance, sourcing, when each habit fires.

**The `EMOJI` regex needs `target: ES2024`.** It is a plain `/\p{RGI_Emoji}/gv`
literal, and the `v` flag is what keeps ZWJ sequences and flag emoji counting as one
glyph. tsconfig's target was bumped for exactly this; downgrading it re-breaks this
file's typecheck. (Kept because it burned two write cycles: under ES2017 this had to be
a RegExp-constructor call, and Biome's `useRegexLiterals` — a **safe** fix, so the
format-on-write hook applies it — kept rewriting it back. A `biome-ignore` binds only
on the line immediately above the flagged expression, not above the declaration.)

## Guardrails

- **Keep the live extraction call streaming.** Feed and Voice poll the durable run row
  and render the shared `extraction-steps.ts` mapping. Model-step boundaries own the
  scope, not arbitrary client polls. Never introduce a second stage vocabulary or a
  separate progress path.
- **The extractor never fabricates a post.** Every example in a guide is text the
  reporter actually published. `## Anti-Examples` was removed — it was the one place
  the prompt licensed invention. `## Hard Rules — Never` stays: those are
  evidence-grounded observations of what the writer demonstrably avoids.
- **The Absence Rule and all 33 dimensions stay — never "simplify" them into a
  prohibition list.** A blocklist can never be finished: it enumerates the failures one
  ablation happened to catch and silently authorizes every one it did not. The Absence
  Rule is a general procedure — every dimension returns evidence or the exact words
  "Not present in this corpus" — so it covers unseen failure modes and is phrased
  positively. The two are a matched pair: 33 headings is a hallucination surface, and
  the Absence Rule is what makes "nothing here" a legal answer. Cutting either makes
  the other actively harmful.
