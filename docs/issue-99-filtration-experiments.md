# Issue 99 filtration experiments

This is the human-readable experiment ledger for the isolated voice-extractor lab. Structured JSONL and snapshot files under `lab/voice-extractor/filtration-eval/` exist only when the runner consumes them. Add future results here rather than creating another result-summary JSON.

## Current decision

The frozen downstream control is the no-extractor pipeline at **1,252/1,336 correct (93.71%)**. Start iterating the extractor now. Each treatment may change only `extractor-prompt.md` and the filtration guidance it produces; the downstream prompt, evidence, model, parameters, and benchmark stay fixed.

The 93.71% score is a control, not evidence that the extractor is unnecessary. It establishes how well the downstream model performs with only the reporter's raw beat and source evidence. Extractor guidance is useful only when it improves this result without creating more regressions than fixes.

## Benchmark

- Reporter: `@ReshadRahman`
- Beat: `I want to monitor all news around FC Barcelona.`
- Rows: 1,336 X posts from the 15 sources represented in the unanimous benchmark.
- Golden label: unanimous agreement between the Luna labeling lane, Claude Opus review, and Codex Sol review.
- Output measured: binary `on_beat` plus reasoning; accuracy uses only the binary verdict.

## Frozen no-extractor pipeline

1. English posts pass through unchanged. Posts tagged with another language receive a separate faithful English translation first.
2. The original post text and URLs are preserved.
3. Production-feasible linked content already retrieved from those URLs is included.
4. The source account's handle and profile are included as context, with an instruction that the profile alone does not make a post on-beat.
5. Original images and available video poster frames are attached.
6. The raw beat is included in the user message.
7. Qwen 3.7 Flash runs at temperature `0`, medium reasoning, with no web search, and returns structured `{on_beat, reasoning}`.

The shared translation pass and all 1,336 filtration calls cost approximately **$0.1741** in the measured control run.

## Results

| Experiment | Correct | Accuracy | Paired effect versus current control | Decision |
| --- | ---: | ---: | --- | --- |
| Link enrichment without source profile | 1,243/1,336 | 93.04% | 9 fewer correct | Superseded |
| Add source profile to link-enriched input | 1,252/1,336 | 93.71% | Established current control | Keep |
| High reasoning for translation and filtration | 1,247/1,336 | 93.34% | 14 fixes, 19 regressions, net −5 | Reject; keep medium |
| Perplexity grounding on the 624 gated rows | 1,241/1,336 | 92.89% | 29 fixes, 40 regressions, net −11 | Reject |
| Parallel grounding on the 624 gated rows | 1,239/1,336 | 92.74% | 28 fixes, 41 regressions, net −13 | Reject |
| Source-text-only Perplexity queries | 1,228/1,336 | 91.92% | 25 fixes, 49 regressions, net −24 | Reject |

## High-reasoning ablation

Both translation and filtration were raised from medium to high while every prompt, input, and other parameter remained unchanged. Accuracy fell by 0.37 percentage points. The 458 non-English or undefined-language rows remained exactly 443/458 correct even though 223 translation strings changed; the entire net loss came from English rows. Combined cost increased about 1.68%. There is no measured reason to pay for high reasoning in this pipeline.

## Search experiments

A five-row diagnostic suggested grounding could help difficult media posts: optional and forced search each reached 4/5, while the same rows without search reached 1/5. The full corpus contradicted that small-sample impression.

The first full-corpus gate requested search for 624/1,336 rows (46.71%). It captured 52 of the control's 84 errors but also selected 572 already-correct rows. Media presence dominated the gate, and 471/624 proposed queries inserted Barcelona-related wording absent from the source post.

Executing those searches did not improve accuracy. Perplexity issued 856 search calls with $4.28 in search fees; Parallel issued 1,333 calls with $6.665 in fees. A source-text-only Perplexity follow-up issued 1,110 searches for $5.55 and performed worse. Provider-executed search could still insert Barcelona into 42 queries even when the dispatch model received no beat or profile. Web search is therefore excluded from the control.

## Next experiment

1. Edit only `lab/voice-extractor/filtration-eval/extractor-prompt.md`.
2. Run the extractor over Reshad's stated beat and corpus to produce filtration guidance.
3. Inject that guidance into the unchanged downstream control.
4. Evaluate all 1,336 rows.
5. Record accuracy, fixes, regressions, and the decision in this file.
