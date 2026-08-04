# Sonnet-50 guide: historical 48-hour drafter replay

Run date: 2026-08-02 PDT

## Question

If Reshad's historical drafting pipeline receives the same source inputs it saw immediately after
his first voice guide was created, how closely does it reproduce the drafts he saw when only the
voice guidance is replaced with the guide extracted by Sonnet high from his newest 50 posts?

## Fixed cohort

The cohort is deliberately simple: every distinct source input that produced Reshad's reference
drafts during the 48 hours after his first voice guide was created.

| Field | Value |
| --- | --- |
| Window start | `2026-07-27T09:53:49.984782Z` |
| Window end | `2026-07-29T09:53:49.984782Z` |
| Source inputs and reference drafts | 55 |
| Sources with media | 29 |
| Media items | 39 |
| Reference drafter | `openai/gpt-5-nano`, low reasoning |
| Replay drafter | `openai/gpt-5-nano`, low reasoning |

Card opens, reactions, and later user behavior are not selection criteria.

The replay preserved the recovered historical drafter system prompt, output contract, source text,
source media, model setting, and reasoning setting. Its sole intended treatment was the voice
guidance: the historical Opus/100 guidance was replaced by `sonnet50-high-01`, extracted from the
newest 50 posts. The extractor excluded one off-beat gaming GIF, so the guide's measured facts use
49 binding posts.

## Result

| Measure | Result |
| --- | ---: |
| Byte-for-byte identical | 0/55 (0.0%) |
| Raw evaluator: exact or near | 37/55 (67.3%) |
| Audited: exact or near | **35/55 (63.6%)** |
| Partial | 12/55 (21.8%) |
| Failed | 8/55 (14.5%) |

The raw evaluator labeled one draft `exact` despite non-identical wording, and called two visibly
material mode/language changes `near`. The audit corrected those three classifications:

- item 3: `exact` → `near`; same meaning and form, but not the same text;
- item 23: `near` → `partial`; an emotional hometown tribute became a breaking transfer-style
  alert ending in `#Transfers`;
- item 40: `near` → `partial`; the English reference became substantially Spanish.

These corrections leave **0 exact, 35 near, 12 partial, and 8 fail**. The hoped-for 90% threshold
is therefore not met under either the raw or audited grading.

## Main failure modes

### 1. The guide changes whether drafting happens

The replay classified 8 of the 55 historical inputs as off-beat. The historical pipeline would
stop at that decision and emit no draft, setting an absolute retention ceiling of 47/55 (85.5%)
before voice similarity is considered.

The rejected set includes Messi interview/tribute items, Cubarsí World Cup and hometown-tribute
items, a basketball item, a non-Barça transfer item, and one Barça fitness update. Several of these
are explained by evidence missing from the newer half of the corpus; at least the fitness rejection
also shows ordinary model judgment error.

### 2. The required output language is lost

Nine otherwise emitted candidates materially remained in Spanish where the historical draft was
English. The historical Opus guide explicitly said to write in English; the Sonnet-50 guide does
not. The recovered drafter contract asks for the reporter's language but does not independently
declare that language, so this guide omission becomes a drafting failure.

### 3. One current style mode becomes the default

| Observable | Historical drafts | Sonnet-50 replay |
| --- | ---: | ---: |
| Mean characters | 203.6 | 194.8 |
| Alert opener | 37 | 48 |
| Hashtag present | 33 | 47 |
| URL present | 22 | 6 |
| Over X's 280 weighted-character ceiling | 10 | 6 |

The Sonnet-50 guide over-applies `🚨 JUST IN` and `#Transfers` to routine news, training posts, and
tributes. It also removes most source links. One media-heavy replay expanded a short squad-list
caption into a 425-weight-character roster, illustrating that more extracted detail can make the
draft less like the validated reference.

### 4. Some items do reproduce well

There are strong near matches, especially formulaic transfer updates. For example, the Santiago
Castro arrival and Julián Álvarez striker-target drafts preserve almost the same fact ordering,
alert syntax, source attribution, hashtag use, and closing emoji. This explains why the guide can
still feel convincingly Reshad-like on its dominant current mode while failing the broader cohort.

## Verdict

Sonnet high over the newest 50 posts retains Reshad's dominant transfer-news voice, but this replay
does **not** establish parity with the historical experience he praised. The defensible close rate
is 63.6%, not 90%, and eight historical inputs would not produce a draft at all.

The clean next ablation is to keep the 50-post corpus and remove three responsibilities from fragile
voice inference:

1. declare the reporter's output language explicitly in the drafting contract;
2. decide story relevance from the user's beat, not from transient voice-guide coverage;
3. make breaking-alert and hashtag modes conditional, with their measured trigger frequency, rather
   than allowing the most common recent mode to become universal.

Then re-extract the 50-post guide and rerun this same frozen 55-item cohort. That isolates whether a
smaller corpus can work once language, relevance, and mode selection are made stable.

## Artifacts

- Cohort: `runs/drafter-sonnet50-replay-01/cohort.json`
- Replay outputs: `runs/drafter-sonnet50-replay-01/results.json`
- Run metadata and prompt hashes: `runs/drafter-sonnet50-replay-01/metadata.json`
- Raw semantic judgments: `runs/drafter-sonnet50-replay-01/judgment.json`
- Replay runner: `run-drafter-replay.mjs`
- Judge runner: `judge-drafter-replay.mjs`

