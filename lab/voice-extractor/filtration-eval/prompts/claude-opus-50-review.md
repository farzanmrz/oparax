# Claude Code prompt: 50-way Opus review

Run a 50-agent parallel fanout to independently review the existing Luna
filtration labels. The parent session is running Opus; every review agent should
use Opus as well.

Read `lab/voice-extractor/filtration-eval/review-manifest.json`. It contains 50
shards covering all 1,488 rows exactly once. Create exactly one independent
agent per manifest entry and launch all 50 in one fanout. If the harness limits
simultaneous agents, keep every available slot saturated and queue the rest;
do not combine shards or reduce the total number of agents.

For each manifest entry, give its agent:

- Target beat: all news around FC Barcelona.
- Input: the entry's `inputPath`.
- Shared review context:
  `lab/voice-extractor/filtration-eval/review-context.jsonl`, joined by
  `postId`.
- Exclusive output: the entry's `claudeOutputPath`.

Each agent must independently decide whether every story belongs on the target
beat. Treat the existing `onBeat` value only as a hypothesis: decide from the
story and available context before comparing with it. Judge story substance,
not whether the source account usually covers Barcelona. For link-only, terse,
image-led, video-led, quoted, or ambiguous posts, inspect the supplied post URL,
media, quote context, or external link when available.

Each agent writes valid JSONL with exactly one row per input row, in the same
order, and exactly these five fields:

```json
{"postId":"...","sourceHandle":"...","postContent":"...","onBeat":true,"claudeOpusOnBeat":false}
```

`claudeOpusOnBeat` is the agent's independent boolean judgment. Preserve
postId, sourceHandle, postContent, and onBeat byte-for-byte. Never mutate
`onBeat`. Do not add confidence, rationale, evidence, or other fields. Each
agent validates that its row count, order, IDs, and original four fields exactly
match its input shard before finishing.

Agents own only their assigned `claudeOutputPath`. They must never edit source
shards, Luna labels, review context, manifest, Codex review outputs, prompts, or
application code.

The parent session must not review, relabel, merge, or adjudicate posts. It only
launches the 50 agents, waits for all of them, and reports which shard outputs
completed or failed. A later session will compare Luna, Codex Sol, and Claude
Opus.
