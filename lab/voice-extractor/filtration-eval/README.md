# Filtration evaluation lab

This lab evaluates Qwen 3.7 Flash against the 1,336-post unanimous FC Barcelona benchmark. It is isolated from the production voice-extraction prompt.

## Current pipeline

The frozen no-extractor filtration path is:

1. Reuse the shared English translation for a non-English source post; English posts pass through unchanged.
2. Preserve URLs from the original source post.
3. Add any production-feasible content already retrieved from those links.
4. Add the source account's profile as context, with an explicit warning that the profile does not prove an individual post is on-beat.
5. Send the raw beat in the user message together with the normalized post, source media, linked evidence, and source profile to Qwen 3.7 Flash at temperature zero and medium reasoning.
6. Require one structured result: `on_beat` plus concise English reasoning.

`drafter-filter-profile-prompt.md` is the frozen downstream prompt of record. `drafter-filter-prompt.md` is retained as the earlier no-profile control.

The 93.71% result contains no extractor output or filtration guidance. The extractor prompt under iteration remains the single separate file `extractor-prompt.md`; each iteration must inject its output into this unchanged downstream setup and compare paired labels against the same benchmark.

## Canonical measurements

- `runs/link-enriched-baseline/`: link-enriched control, 1,243/1,336 correct (93.04%).
- `runs/full-link-enriched-bio/`: the same pipeline plus source bio, 1,252/1,336 correct (93.71%).
- `runs/full-link-enriched-bio-high-reasoning/`: the same complete pipeline with both translation and filtration reasoning raised to high, 1,247/1,336 correct (93.34%). It fixed 14 baseline errors and regressed 19 correct baseline decisions, so medium reasoning remains the control.
- `high-reasoning-ablation.json`: paired metrics, language breakdown, usage, and cost for that reasoning ablation.
- `bio-link-enrichment-comparison.json`: paired bio improvements and regressions.
- `search-trigger-study.json`: five difficult media examples run with optional and forced web search.
- `single-search-budget-study.json`: the same five examples using a code-enforced Qwen gate, at most one Sonar grounding request, and a final Qwen verdict.
- `search-gate-full-corpus-analysis.json`: full-corpus gate rate and query-neutrality audit.
- `grounded-search-provider-comparison.json`: complete matched Perplexity-versus-Parallel grounded treatment.
- `grounded-search-query-bias-ablation.json`: source-only Perplexity query treatment and enforcement audit.

Older experimental run outputs and prompt variants were removed after link enrichment became the fixed baseline.

## Next iteration

Start with extractor-produced filtration guidance. Do not change the downstream prompt, translation routing, source profile, link enrichment, media handling, model, parameters, or benchmark in the same experiment. A treatment is useful only if it beats 1,252/1,336 without trading a large number of correct baseline decisions for different errors.

## Run the fixed baseline

```bash
pnpm lab:filtration-eval -- \
  --run <new-run-name> \
  --no-guidance \
  --beat-placement user \
  --prompt-mode baseline \
  --translations lab/voice-extractor/filtration-eval/translation-runs/shared-qwen-independent/translations.jsonl \
  --link-context lab/voice-extractor/filtration-eval/external-link-context-snapshot.jsonl \
  --concurrency 1336
```

## Run the bio treatment

```bash
pnpm lab:filtration-eval -- \
  --run <new-run-name> \
  --no-guidance \
  --beat-placement user \
  --prompt-mode profile \
  --translations lab/voice-extractor/filtration-eval/translation-runs/shared-qwen-independent/translations.jsonl \
  --link-context lab/voice-extractor/filtration-eval/external-link-context-snapshot.jsonl \
  --source-profiles lab/voice-extractor/filtration-eval/source-profiles.jsonl \
  --concurrency 1336
```

Successful predictions are appended immediately. Repeating the same compatible command resumes missing rows without paying for completed rows again.

Qwen runs at temperature zero. The Gateway catalog does not advertise `seed` support for this model, so the harness does not send one. Temperature zero reduces variance but cannot guarantee identical reruns across provider infrastructure.

No X API request is made by this lab. The benchmark, translations, link context, media URLs, and Bright Data-derived source profiles are all local snapshots.

## Bounded search result

The application-level search budget scored 4/5 on the deliberately difficult media set, matching the earlier optional and forced search variants while issuing exactly five grounded requests. It cost $0.02754 total, compared with at least $0.06188 for the earlier optional provider-tool run.

Across the full corpus, the first gate requested search for 624/1,336 rows (46.71%). It captured 52/84 errors from the current bio baseline, but also requested search on 572/1,252 already-correct baseline rows. Media presence dominated the decision: 65.33% of rows with media were gated versus 1.54% without media. The query instruction also failed its neutrality constraint: 471/624 queries inserted Barcelona/Barça/FCB even though those terms were absent from the source-post text.

The completed grounded comparison executed search for all 624 requested rows and retained the baseline verdict for the other 712. Neither provider improved the 93.71% baseline: Perplexity scored 92.89% (29 improvements, 40 regressions) and Parallel scored 92.74% (28 improvements, 41 regressions). Perplexity issued 856 search calls for $4.28 in search fees; Parallel issued 1,333 for $6.665. The model sometimes emitted multiple parallel tool calls despite the one-search instruction, and every actual provider call is included in those totals.

The follow-up query-bias ablation supplied only the original source-post text as Perplexity's search goal while preserving the same 624 selected rows. It scored 91.92% (25 improvements, 49 regressions), worse than both the baseline and original Perplexity treatment, and issued 1,110 searches for $5.55. Because Gateway search is provider-executed, the dispatch model still constructs the final tool arguments: despite receiving no beat or profile, it inserted Barcelona into arguments for 42 rows. A prompt instruction alone therefore cannot guarantee literal search arguments, and query bias was not the dominant source of the accuracy loss.
