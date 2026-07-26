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
(measured, 10 guides, when `## Dimension Coverage` was still generated). Verified
**byte-identical to the Python original on all 10 lab guides**.

**`LAB_ONLY_SECTIONS` is empty today and that is correct** — its one entry, `## Dimension
Coverage`, is no longer emitted at all (see the extraction recipe below). Not generating a
section beats generating and stripping it: the same 16.1% is now saved at extraction time too.
Do not "clean up" the empty array or inline the call — the raw/deployed split is what
`voice_guides` provenance rests on, and the rule outlives its one instance.

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

## The extraction recipe, and why each part is fixed

- **Model: `anthropic/claude-opus-5`, adaptive thinking @ high effort, NO web search.** The
  8-model on-task panel (verbatim-quote fidelity, unique catches) was won by `claude-fable-5` at a
  measured **$0.855/reporter**; Opus 5 replaced it because it postdates that panel entirely and
  costs **half** ($5/$25 per MTok vs $10/$50). **Rejected as primaries:** opus-4.8, sonnet-5,
  gpt-5.6-sol/terra, grok-4.5 — all tested, all lost to Fable, sol despite an 81.7 Longform Elo,
  which is exactly why writing leaderboards don't override on-task results. A model that did not
  exist at panel time is a new fact, not a re-audition — that is the bar for reopening this.
- **`maxOutputTokens` caps thinking AND output together.** Raised to 64k on the Opus 5 switch: at
  adaptive/high, thinking can eat a tight budget and truncate the guide mid-section, which reads
  as a bad extraction rather than a clipped one. It is a ceiling, not a reservation — unused
  headroom costs nothing.
- **The extractor never fabricates a post.** Every example in a guide is text the reporter actually
  published. The `## Anti-Examples` section (invented "they would never write this" posts) was
  removed: it was the one place the prompt licensed invention, it shipped into every drafting
  prompt as bloat, and corrective guidance is better sourced from real reporter feedback than from
  model invention. `## Hard Rules — Never` stays — those are evidence-grounded observations of what
  the writer demonstrably avoids, not inventions.
- **Corpus: 100 posts, split 80 train / 20 held-out** (most recent). The holdout exists so drafting
  evaluation can never score against a post the extractor read — contamination control, not sample
  size.
- **Measured facts are computed, not read.** Reading under-counts sparse habits: the extractor
  called one reporter hashtag-free when the true count was 6/80. A count cannot miss that and
  costs $0.
- **No self-verification section, and no competitive framing.** Both were removed against
  Anthropic's official Opus 5 prompting guidance, not by read-through. (1) `## Dimension
  Coverage` — the extractor's closing self-audit checklist — is gone: the guidance says explicit
  verification instructions "cause over-verification on Claude Opus 5, and removing them reduces
  wasted tokens with no loss in quality," and `deployGuide()` was already discarding it, so it
  was pure waste. (2) `Thoroughness is scored; padding and repetition are penalized` became a
  length-calibration line: the same guidance flags "be conservative"-shaped instructions as
  literally followed on Opus 5, which suppresses real findings — the replacement targets padding
  without chilling coverage, since Opus 5 also writes longer deliverables by default. (3) "judged
  against guides produced by rival models" was dropped — it was a true statement during the
  8-model ablation and is now a motivational fiction; competitive framing appears nowhere in
  Anthropic's guidance. **The four criteria themselves stay** — they define what "good" means.
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

## Model configs are decided; don't re-choose them mid-task

Extraction and drafting model/reasoning picks are fixed, with EXPECTED costs (~$0.43/reporter
one-time extraction on Opus 5, ~$3/mo drafting) — not enforced ceilings. Extraction in particular
carries no spend cap or reservation: the previous once-per-reporter-per-UTC-day claim and the
`$2` worst-case spend gate it reserved against (`lib/voice/spend-gate.ts`) were deleted outright
as an owner decision when the shared-guide model was dropped (see AGENTS.md's settled decisions)
— it optimized a case (two desks sharing one extraction) that no longer exists now that a guide
belongs to one desk. Don't re-derive a cap or claim table here; if spend ever needs bounding
again, it is bounded per OWNER, never per handle. Two live-probed facts that outrank any
documentation you might read:

- **`moonshotai/kimi-k3` cannot cap reasoning.** `effort: "none"` still emitted 119 reasoning
  tokens; every variant returned HTTP 200. The param is accepted and silently ignored. Bound
  it with `max_completion_tokens` (hard ceiling over reasoning + content), and verify any
  model's cap by reading `reasoning_tokens` back — **never by trusting a 200**.
- **`deepseek-v4-flash` takes no `reasoning` param** in the judgment roles (native adaptive is
  the tested config); the judge role is the one exception, pinned `none` + temp 0.
