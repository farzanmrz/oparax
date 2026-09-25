# Qwen 3.7 Flash vs GLM 5.3 Flash vs Ling 3.0 Flash (paid and free) for judging and writing

Date: September 21, 2026. Gateway: ai-gateway.vercel.sh, OpenAI-compatible endpoint, temperature 0, reasoning off (Qwen and Ling: `reasoning_effort: none`; GLM: `low`, its lowest, which still spent 2,308 reasoning tokens over 163 judging calls and 104 over 12 writing calls). Prompts verbatim from `lib/sysprompts/draft-filter.md` and `draft-synthesize.md`; user messages built exactly as `draft-filter.ts` and `draft-synthesize.ts` build them (XML escaping, `<beat>`, `<source lang= publisher=>`, `<title>`, `<text>`, `type="outlet-characterization"` for websites). Text only, no media. Every raw request and response is in this folder. Total Gateway spend for the whole exercise: **$0.0195** across 708 calls.

## What was run

| Set | What | Items | Ground truth |
| --- | --- | --- | --- |
| A | labeled-barca.json, Catalan and Spanish teasers against one Barca beat | 23 | hand labels supplied |
| B | titles from docs/source-table-seed.json against an AI-tools beat and the Barca beat, labeled by the row they came from | 80 (40 per beat, half on, half off) | row provenance; 15 ambiguous titles dropped (listed in setB.json). Seed titles are all English, including the Spanish outlets' rows |
| C | real August X posts from the two desks (BarcaTest3, Crypto Pulse Live), 15 on and 15 off per desk, no media | 60 | August Qwen verdict as agreement; where models disagreed (18 posts) plus one unanimous disagreement I adjudicated by reading post and beat (setC-adjudication-notes.md). Note: August verdicts were made with a beat_detail block that no longer exists, so August is not truth |
| D | 12 real articles fetched free: 4 Spanish (fcbarcelonanoticias, Mundo Deportivo), 2 Catalan (ara.cat), 6 English (football-espana, Ars Technica, The Verge), 1,022 to 2,446 characters, five cut at a paragraph boundary to stay under 2,500 | 12 x 4 models | blind scoring, outputs shuffled and labeled A to D per article, key opened after scoring (blind.md, blind-key.json, blind-scores.json) |

## Quality

Judging accuracy (false on = called on-beat when off; false off = the reverse):

| Model | A (23) | B (80) | C adjudicated (60) | C false on / false off | Agreement with August | Invalid JSON |
| --- | --- | --- | --- | --- | --- | --- |
| Qwen 3.7 Flash | 100% | 92.5% (4 on / 1 off) | 86.7% | 2 / 6 | 83.3% | 1 (trailing comma) |
| GLM 5.3 Flash | 100% | 97.5% (0 on / 2 off) | 91.7% | 4 / 0, 1 no verdict | 88.3% | 1 (unescaped quotes) |
| Ling 3.0 Flash | 91.3% | 90.0% (5 on / 3 off) | 83.3% | 6 / 4 | 83.3% | 0 |
| Ling 3.0 Flash VL free | 100% | 96.2% (0 on / 3 off) | 85.0% | 5 / 4 | 85.0% | 0 |

Qwen's misses on B are all on the AI beat (87.5% there): it called AI-policy and corporate stories on-beat. GLM and the free Ling made no false-on calls on B. On C, Qwen's misses are mostly false off (it drops Barca match commentary that does not spell out the club); GLM's are false on (it accepts crypto-adjacent items like Japan's blockchain settlement system).

Writing, blind scores 1 to 5, mean over 12 articles:

| Model | Faithful | Complete | English | Format | Total /20 | Strict JSON | Format failures | Hallucinated facts | Wrong language |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Qwen 3.7 Flash | 4.17 | 3.83 | 4.67 | 5.00 | 17.7 | 12/12 | 0 | 4 (invented "Ivan" Livakovic, inverted a goalkeeper comparison, swapped Nations League dates, "successor" for "backup") | 0 |
| GLM 5.3 Flash | 5.00 | 5.00 | 4.92 | 4.25 | 19.2 | 9/12 | 3 (newsTitle missing) | 0 | 0 |
| Ling 3.0 Flash | 4.42 | 4.67 | 4.67 | 4.42 | 18.2 | 10/12 | 2 (one output ran on into an unrelated physics problem after the JSON; one had junk after the object) | 2 (title says "Sevilla defeat" for a 3-1 win) | 0 |
| Ling 3.0 Flash VL free | 4.67 | 4.58 | 4.92 | 4.00 | 18.2 | 9/12 | 3 (two malformed JSON, one truncated without title) | 1 (Livakovic "outperformed" a keeper who did not play) | 0 |

In the product, `Output.object` rejects any of these format failures and the call yields no verdict or no synthesis, so GLM's three missing titles would be three lost writes out of twelve unless the schema or a repair step changes. Qwen's outputs were always well formed but were the least faithful: every one of its four hallucinations is a fact a reader would repeat.

## Speed and tokens

| Model | Judge latency median / p95 | Judge tokens in / out | Write latency median / p95 | Write tokens in / out |
| --- | --- | --- | --- | --- |
| Qwen 3.7 Flash | 2.1 s / 3.0 s | 624 / 50 | 7.2 s / 8.9 s | 1,107 / 465 |
| GLM 5.3 Flash | 3.2 s / 14.6 s | 597 / 62 | 28.6 s / 47.9 s | 1,087 / 585 |
| Ling 3.0 Flash | 1.0 s / 1.5 s | 643 / 50 | 2.3 s / 6.8 s | 1,169 / 801 |
| Ling 3.0 Flash VL free | 1.3 s / 1.9 s | 640 / 50 | 5.5 s / 13.2 s | 1,166 / 556 |

GLM is slow: judge p95 of 14.6 s against the product's 30 s filter timeout, and writes of up to 48 s. Free Ling tier: no 429s, no 5xx, no retries, no errors in any of the 350 Ling calls.

## Cost

Billed price is the Gateway's own figure on our calls (`usage.market_cost` in the body, confirmed by `/v1/generation` lookups, the same call `lib/agent/gateway-cost.ts` makes; generation-lookups.json). Catalog price from `/v1/models` (catalog-four.json).

| Model | Catalog $/M in / out | What the Gateway actually charged | Judge, per call | Write, per call | Per person a month (2,000 judged + 500 written) | 100 people a month |
| --- | --- | --- | --- | --- | --- | --- |
| Qwen 3.7 Flash | 0.03 / 0.13 | Vercel bills it; cache reads bring it slightly under catalog | $0.0000218 | $0.0000936 | **$0.090** (catalog: $0.097) | $9.04 |
| GLM 5.3 Flash | 0.15 / 0.50, "varies by provider" | **BYOK**: `is_byok: true`, `total_cost: 0`, `upstream_inference_cost` set, provider_name deepinfra. Vercel bills $0; the attached DeepInfra key pays, and the Gateway's estimate of that charge works out to exactly $0.075 in / $0.25 out per million, the public page's price | $0.0000602 | $0.000228 | **$0.234** at the BYOK price (would be $0.469 at the catalog price if the BYOK key were removed) | $23.43 |
| Ling 3.0 Flash | 0.021 / 0.063 | Vercel bills it; implicit cache reads make it about half of catalog on judging | $0.0000081 | $0.0000718 | **$0.052** (catalog: $0.071) | $5.21 |
| Ling 3.0 Flash VL free | 0 / 0 | $0 | $0 | $0 | **$0** | $0 |

Catalog data fields: Qwen `zdr: all`, `no_training: all`. GLM `zdr: some`, `no_training: some` (depends on the provider it lands on). Both Ling models `zdr: none`, `no_training: all`.

These per-call figures are lower than the August numbers in cogs.md ($0.000116 judging, $0.00025 writing) because this test ran with reasoning off, the beat sentence only and no media, whereas the product runs Qwen at reasoning low (filter) and medium (synthesis). Any adoption should re-measure at the settings that ship.

## Recommendation

Measured: GLM 5.3 Flash is the most accurate judge on every set and the only writer with zero hallucinations and full completeness, but it is 2.6x Qwen's monthly cost at its BYOK price (5x at catalog), it is far slower (writes of 30 to 48 s, judge p95 near half the filter timeout), it dropped the title on 3 of 12 writes, and its price and data terms are "varies by provider". Qwen is cheap, fast and always well formed, but it invented or inverted a fact in 4 of 12 writes and misses Barca match posts that do not name the club. The paid Ling is the cheapest paid option and the fastest, with middling accuracy and one alarming runaway output. The free Ling matched GLM on sets A and B, cost nothing, never rate-limited, and had 3 format failures on writing.

Judgment: for judging alone, GLM or the free Ling both beat Qwen on quality, and the free Ling is the better trade at this volume if the owner accepts `zdr: none` and the risk that a free tier changes or vanishes. For writing, GLM's faithfulness is the standout and hallucinations are the failure that damages a monitoring product most, so GLM is worth its 14 cents a month per person if the missing-title problem is handled (a repair prompt or a relaxed schema) and the latency is acceptable for a daily digest, which it is. The single-model answer, if one model must do both, is GLM at the BYOK price with a title fix; the cheaper split is free Ling for judging and GLM for writing (about $0.114 a person a month). Twelve articles and 163 judgments are a small sample; the hallucination counts in particular could move with another dozen articles.

## Files

gw.py (client), probe*.py, run_judge*.py, run_write.py, analyze_judge.py, prep_blind.py, compute_cost.py; setB.json, setC.json, setC-adjudicated.json, setC-adjudication-notes.md, setD.json; judge-results.json, judge-results-ling.json, write-results.json (raw outputs with tokens, cost fields, generation ids); judge-summary.json, write-summary.json, cost-summary.json; blind.md, blind-key.json, blind-scores.json; catalog-four.json, generation-lookups.json; articles/, feeds/.
