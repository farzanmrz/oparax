# Codex prompt: 50-way Sol review

Review the existing Luna filtration labels with exactly 50 independent Codex
subagents.

Read `lab/voice-extractor/filtration-eval/review-manifest.json`. It contains 50
shards covering all 1,488 rows exactly once. Spawn one fresh project custom
agent named `filtration_label_reviewer` for every manifest entry, with no
full-history/context fork. Launch all 50 immediately. If this session has a
lower simultaneous-agent cap, keep every slot saturated and queue the remaining
agents; do not combine shards or reduce the total agent count.

Every subagent receives:

- Target beat: all news around FC Barcelona.
- Input: that manifest entry's `inputPath`.
- Shared review context:
  `lab/voice-extractor/filtration-eval/review-context.jsonl`, joined by
  `postId`.
- Exclusive output: that entry's `codexOutputPath`.

Each agent owns only its output file. The 50 agents must never edit the source
shards, Luna labels, review context, manifest, another agent's output, prompts,
or application code. They must follow the custom agent's five-field output
contract, preserving the existing four fields and adding only
`codexSolOnBeat`.

The parent session must not review or relabel posts. Its only responsibilities
are spawning all 50 agents, keeping the fanout saturated, waiting for every
agent, and reporting which shard outputs completed or failed. Do not merge or
adjudicate their results; a later session will compare the review lanes.

