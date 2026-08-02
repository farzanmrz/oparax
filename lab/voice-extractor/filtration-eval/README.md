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

## Experiment record

Read [`docs/issue-99-filtration-experiments.md`](../../../docs/issue-99-filtration-experiments.md) for the baseline, completed ablations, costs, and decisions. Keep future human-readable conclusions there. Structured files in this directory are benchmark inputs or executable snapshots, not an experiment diary.

## Next iteration

Start with extractor-produced filtration guidance. Do not change the downstream prompt, translation routing, source profile, link enrichment, media handling, model, parameters, or benchmark in the same experiment. A treatment is useful only if it beats 1,252/1,336 without trading a large number of correct baseline decisions for different errors.

## Run the frozen baseline

```bash
pnpm lab:filtration-eval -- \
  --run <new-run-name> \
  --no-guidance \
  --beat-placement user \
  --prompt-mode profile \
  --translations lab/voice-extractor/filtration-eval/translation-runs/shared-qwen-independent/translations.jsonl \
  --link-context lab/voice-extractor/filtration-eval/external-link-context-snapshot.jsonl \
  --source-profiles lab/voice-extractor/filtration-eval/source-profiles.jsonl \
  --reasoning medium \
  --concurrency 1336
```

Successful predictions are appended immediately. Repeating the same compatible command resumes missing rows without paying for completed rows again.

Qwen runs at temperature zero. The Gateway catalog does not advertise `seed` support for this model, so the harness does not send one. Temperature zero reduces variance but cannot guarantee identical reruns across provider infrastructure.

No X API request is made by this lab. The benchmark, translations, link context, media URLs, and Bright Data-derived source profiles are all local snapshots.
