# Experimental Qwen pipeline: historical 48-hour drafter replay

Run date: 2026-08-02 PDT

## Question

How closely does the branch's current experimental Qwen pipeline reproduce Reshad's historical
drafts when given the same 55 source inputs and the Sonnet high/newest-50 voice guide?

## Pipeline under test

This is the experiment pipeline, not the production grounder/judge:

1. the unchanged experimental translator prompt receives the source text;
2. Qwen 3.7 Flash runs at temperature 0 with medium reasoning and returns an English translation
   only when needed;
3. the translated text, raw Barcelona beat, source biography, and original source media are placed
   in the nested-XML user input;
4. the minimally extended XML drafter prompt retains filtration and adds English synthesis plus a
   nullable draft;
5. the complete Sonnet-50 voice guide is appended to the drafter system message;
6. Qwen 3.7 Flash runs again at temperature 0 with medium reasoning and no web search.

The cohort is the same fixed 55 sources and reference drafts from the 48 hours after Reshad's first
guide was created. Card opens or other engagement behavior play no role.

The historical payloads did not retain X's language code, so every source entered the unchanged
translator as `und`. The translator correctly returned a translation for all 42 `@sport` sources
and `null` for all 13 English `@FabrizioRomano`/`@David_Ornstein` sources. The frozen archive has no
retrieved linked-page bodies, so only source text, preserved URLs, biographies, and the 39 original
media items were available.

## Similarity result

| Measure | Experimental Qwen | Nano replay |
| --- | ---: | ---: |
| Historical inputs | 55 | 55 |
| Passed filtration / emitted | 34 | 47 |
| Filtered before delivery | 21 | 8 |
| Raw evaluator close | 23/55 (41.8%) | 37/55 (67.3%) |
| Audited close | **22/55 (40.0%)** | **35/55 (63.6%)** |
| Audited close among emitted | **22/34 (64.7%)** | **35/47 (74.5%)** |
| Byte-exact | 0 | 0 |

The raw evaluator mislabeled item 36 `exact`; it has different punctuation, wording, and line
breaks and is `near`. Item 5 was downgraded from `near` to `partial` because it sharpened an
unspecified injury into a knee issue. The audited experimental result is therefore **0 exact, 22
near, 12 partial, and 21 fail**.

Every fail is a filtration skip. There were no fundamentally incompatible emitted drafts.

## Why overall similarity fell

The historical agent's saved beat was effectively a tone instruction, and its old pipeline drafted
every tracked-source item. This experiment instead uses the current raw beat:
`I want to monitor all news around FC Barcelona.`

Of the 21 rejected sources:

- 12 are unrelated third-party transfers involving clubs such as Chelsea, PSG, Juventus, Monaco,
  Dortmund, Inter, Leeds, AEK, Roma, and Bologna;
- one is Barça basketball rather than football;
- three are adjacent former-player/Messi/Piqué items whose inclusion is debatable;
- five are strong false negatives under an "all news around FC Barcelona" beat: a Barça friendly,
  Barça player valuations, a La Masia event, a board meeting, and Laporta's health/travel update.

The first 13 rejections are defensible behavior from the new pipeline even though they necessarily
score as failures against historical drafts that should not have been produced under the current
beat. The five clear Barça misses are real filtration failures. Their shape suggests that the
voice guide's narrow `Beat & Scope` section influenced filtration despite the prompt saying the raw
beat is the boundary.

## Voice behavior among emitted drafts

| Observable | Historical, all 55 | Experimental Qwen, 34 emitted | Nano, 47 emitted |
| --- | ---: | ---: | ---: |
| Mean characters | 206.4 | 201.5 | 202.9 |
| Alert opener | 36 (65.5%) | 14 (41.2%) | 44 (93.6%) |
| Hashtag present | 33 (60.0%) | 20 (58.8%) | 44 (93.6%) |
| URL present | 22 (40.0%) | 9 (26.5%) | 4 (8.5%) |
| Over 280 weighted characters | 10 (18.2%) | 4 (11.8%) | 5 (10.6%) |

The experimental Qwen drafter uses the voice guide more proportionally than the Nano replay. It no
longer turns almost every retained item into `🚨 JUST IN` plus a hashtag; its hashtag rate nearly
matches the historical cohort, and it preserves more links. It also reliably drafts in English,
removing the Nano replay's Spanish-output failure. One comparison is intentionally scored partial
because that historical reference itself was Spanish while the current pipeline requires English.

The remaining partials are primarily information-selection or mode-selection errors: expanding a
short media caption into a detailed roster, omitting key context, exposing a quote that the
historical draft teased, substituting the wrong player name, or choosing an engagement format where
the reference used a terse alert.

## Cost

| Stage | Calls | Input tokens | Output tokens | Reasoning tokens | Gateway cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| Translation | 55 | 19,448 | 77,995 | 74,663 | $0.010723 |
| Drafting | 55 | 213,284 | 64,275 | 55,567 | $0.014336 |
| Total | 110 | 232,732 | 142,270 | 130,230 | **$0.025059** |

## Verdict

Against all historical outputs, the experimental pipeline reaches **40.0% close**, mainly because
it correctly refuses to recreate many old drafts that no longer belong under the actual Barcelona
beat. For the 34 stories it retains, it reaches **64.7% close**: below the Nano replay's 74.5% among
its retained stories, but with clearly better translation reliability and much healthier mode,
hashtag, and link frequencies.

The next clean ablation is to keep this translator, input, model, and full 55-source cohort fixed,
but remove `## Beat & Scope` from the voice guide before appending it. Filtration should receive only
the user's beat; the guide should supply only voice. That will show whether the five clear Barça
false negatives recover without changing drafting style.

## Artifacts

- Run: `runs/drafter-experimental-qwen-sonnet50-replay-01/`
- Frozen outputs: `runs/drafter-experimental-qwen-sonnet50-replay-01/results.json`
- Raw semantic judgments: `runs/drafter-experimental-qwen-sonnet50-replay-01/judgment.json`
- Compiled translator and drafter prompts: stored inside the run directory
- Drafter prompt template: `drafter-voice-nested-input-prompt.md`
- Runner: `run-experimental-qwen-replay.mjs`

