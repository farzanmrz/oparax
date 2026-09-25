# Downstream lab, September 21, 2026

What ran: [downstream-algorithm.md](../downstream-algorithm.md) as revised after the five-lane critique, end to end, on Liam ("AI developments and practical tools") and Nihan (the assistant's sentence from his words), ten sources each by Jev's ranking of the 76-row seed, the last 48 hours of items, every step recorded, four writers on identical inputs with reasoning on and the explicit hallucination warning. No X posts were pulled. Total Gateway spend for the whole lab including the smoke test: **$0.030**. The step-by-step page lives in the git-ignored lab folder (`.lab/downstream`, served on localhost:3000 by `python3 -m http.server 3000 --bind 127.0.0.1 --directory viewer`); the run files are `viewer/data/liam.json` and `nihan.json`.

## The pipeline itself

| | Liam | Nihan |
| --- | --- | --- |
| Items in 48 hours from ten sources | 22 (0 unreadable, 6 truncated at 6,000) | 25 (1 unreadable teaser, 3 truncated) |
| Fit (R7 lines 0.75 / 0.35) | 19 on, 3 unsure, 0 off | 13 on, 8 unsure, 4 off |
| Stories | 19 (0 joins) | 12 (1 join, 1 rewrite) |
| Wall time | 39 minutes | 35 minutes (the writers, run four ways, are the time) |

Grouping (R11) worked cleanly: the one true duplicate in the data (Qwen-Image-2.1 reported by two sources) scored 0.90 and joined; every other pair scored 0.01 to 0.08. The adds step then said the second report added something (on), and the rewrite ran.

Fit: Liam's broad sentence puts everything on. Nihan's unsure band held 8 of 25 items, several plainly relevant to him (Cloudflare Python Workers 0.70, OpenAI's math advisory group 0.73, Meta's agent blocked from Amazon 0.73, OpenAI Academy 0.65). Under R8 ("unsure counts as off") a third of his feed would be skipped. The 0.75 line was set for ranking sources, not judging items; the data says the item line belongs lower, or the unsure band needs a different rule. Owner's call; nothing changed.

Jev cost: a fit request averages 1,270 input tokens, $0.000053 at list; every Jev call was again charged $0 by the Gateway.

## The four writers

Counts are for both people together. "Facts written" is what the model produced; "code drops" are R17 (span not found verbatim, a number in the fact missing from its spans, or a span containing an ellipsis); "Jev drops" are R18 at 0.75.

| Writer | Writes | Cards | Write failed (JSON or shape, after one retry) | Facts written | Code drops: not found / numbers / ellipsis | Jev drops at 0.75 | Median latency | Tokens in / out / reasoning (mean) | Cost for 32 writes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Qwen 3.7 Flash, effort medium | 32 | 27 | 0 | 129 | 2 / 6 / 4 | 55 of 120 | 34 to 43 s | 1,500 / 3,300 / 2,700 | $0.016 |
| GLM 5.3 Flash, effort high | 32 | 25 | 3 | 132 | 2 / 17 / 7 | 51 of 110 | 33 to 36 s (p95 109 s) | 1,500 / 1,000 / 300 | $0.013 |
| Ling 3.0 Flash VL free, reasoning on | 32 | 31 | 0 | 149 | 6 / 31 / 18 | 38 of 113 | 15 to 21 s | 1,600 / 1,800 / 1,100 | $0 |
| Laguna S 2.1 free, reasoning on | 32 | 25 | 4 | 118 | 5 / 28 / 34 | 18 of 78 | 9 to 19 s | 1,500 / 1,000 / 2,800 | $0 |

What the code check says about hallucination: Qwen copies spans faithfully (2 not found, 6 number mismatches in 129 facts). GLM, Ling and Laguna break the span rule often (ellipses inside spans, numbers in the fact that are not in the span); some of the number drops are the check being literal ("10 percent" against "10%"), so the count overstates invention for them, but the not-found and ellipsis columns are clean signals.

## The support check (R18) is too strict at 0.75

Jev rejected 40 to 55 percent of facts that had passed the verbatim check. Reading the rejected ones: most are correct paraphrases, and what Jev penalizes is attribution the fact adds from the article's authorship ("according to Simon Willison" when the span does not say "says"), a fact that combines two spans, or exact numbers restated ("latency dropped from 156.595 seconds on one GPU to 34.183 on eight" scored 0.53 against a span saying exactly that). The genuinely embellished ones scored lower: "suggesting strong cross-platform integration" 0.35, "raising bias concerns" 0.25, a price comparison that upgraded the article's claim 0.36. The same scores re-read at other lines:

| Writer | Facts scored | Kept at 0.75 | at 0.60 | at 0.50 | at 0.40 | Median |
| --- | --- | --- | --- | --- | --- | --- |
| Qwen | 120 | 65 | 98 | 108 | 113 | 0.76 |
| GLM | 110 | 59 | 90 | 98 | 104 | 0.78 |
| Ling | 113 | 75 | 93 | 101 | 107 | 0.84 |
| Laguna | 78 | 60 | 71 | 73 | 74 | 0.85 |

A line near 0.5 keeps the paraphrases and still drops the embellishments seen here. Two changes to try before moving the line: give Jev the item's publisher and author in the state so attribution is supportable, and ask "does the evidence support every claim in the fact" rather than "does it state what the fact states". Proposal, not decided.

The headline check (R19) at 0.75 replaced the headline on 60 to 100 percent of cards. Partly a cascade (facts dropped at 0.75 leave a headline that mentions things no surviving fact states), partly the same strictness; the medians were 0.07 to 0.40. It needs the same rethink; the "first surviving fact becomes the headline" fallback produced readable cards throughout.

## Cost per person per month, measured settings

Writer at 300 writes a month: Qwen about $0.15, GLM about $0.12, Ling and Laguna $0. Jev: 2,000 fit requests about $0.11 at list, grouping and adds requests for the third that fit about $0.05, support and headline checks per card under $0.05; all charged $0 so far. Whole pipeline under $0.40 a person a month on a paid writer, under $0.25 on a free one, before the reasoning tokens are tuned.

## Not measured here

R4 (refetching open-story items for corrections) and R13 (serial processing under concurrency) cannot be exercised by a backfill. Day zero is a lab choice. Two people and 47 items is a small sample; the grouping result rests on one true duplicate.
