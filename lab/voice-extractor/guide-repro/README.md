# Reshad voice-guide reproducibility

This lab isolates voice extraction from drafting. Its fixed reference is the exact request and
guide from Reshad's first successful extraction on 2026-07-27.

## Historical control

- Agent: `ed384080-9adb-4f75-9953-c9496b88f045`
- Model: `anthropic/claude-opus-5`
- Thinking: adaptive, high, summarized display
- Corpus: 100 original posts, newest first
- Input: 100 original July post texts and engagement counters plus 47 images/poster frames
- System prompt SHA-256: `9321d5eacd6aa7bfb3689b9b5054145a8e5553150a26c0371e02f19e89ec41bb`
- Historical raw-guide SHA-256: `ca0848439427dd34dffafcca23f9f47d7956a6548c4d097aee1368478d078ac3`

`historical-input.json` was recovered from Sentry trace
`15c075a4a4244992be83ccea857788e2`, span `8ebecf3e2954eea2`. The guide was recovered from the
same trace and verified against the Supabase provenance row. The markdown file has one final
newline, matching `guide_deploy`; removing that newline gives the raw-guide hash above.

## Run an extraction

```sh
node lab/voice-extractor/guide-repro/run-opus100.mjs --run opus100-replay-01

node lab/voice-extractor/guide-repro/run-opus100.mjs \
  --run sonnet100-high-02 \
  --model anthropic/claude-sonnet-5 \
  --effort high \
  --corpus-size 100

node lab/voice-extractor/guide-repro/run-opus100.mjs \
  --run sonnet50-high-01 \
  --model anthropic/claude-sonnet-5 \
  --effort high \
  --corpus-size 50
```

The runner validates every frozen hash before spending. The 100-post arm sends the historical
message unchanged. The 50-post arm selects posts 1–50 from the same newest-first corpus, recomputes
its measured facts, and retains only media attached to those selected posts. Every run writes its
guide plus metadata under `runs/<run>/`. It never reads or writes Reshad's live agent.

See `comparison.md` for the accepted Sonnet 100-versus-50 result. `sonnet100-high-01` ended with a
gateway stream error and is retained only as a failed-run artifact; it is not an experiment result.

## Replay the historical drafter cohort

The fixed drafter cohort contains all 55 source inputs and reference drafts created during the 48
hours after Reshad's first guide was created. The replay preserves the recovered historical
GPT-5 Nano pipeline and changes only the voice guidance to the Sonnet/newest-50 guide.

```sh
node lab/voice-extractor/guide-repro/run-drafter-replay.mjs \
  --run drafter-sonnet50-replay-01 \
  --guide-run sonnet50-high-01

node lab/voice-extractor/guide-repro/judge-drafter-replay.mjs \
  --run drafter-sonnet50-replay-01
```

See `drafter-replay-comparison.md` for the result and audited interpretation.

## Replay the experimental Qwen translator + drafter

This arm uses the branch's experimental pipeline: the unchanged separate translator, nested-XML
input, Qwen 3.7 Flash at temperature zero/medium reasoning, source profiles and media, the raw
Barcelona beat, and the Sonnet/newest-50 voice guide. It is distinct from the production
grounder/judge path.

```sh
node lab/voice-extractor/guide-repro/run-experimental-qwen-replay.mjs \
  --run drafter-experimental-qwen-sonnet50-replay-01

node lab/voice-extractor/guide-repro/judge-drafter-replay.mjs \
  --run drafter-experimental-qwen-sonnet50-replay-01
```

See `experimental-qwen-replay-comparison.md` for the result and comparison with the Nano replay.
