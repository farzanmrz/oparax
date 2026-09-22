# Shared fixed review lanes

Use this reference from `/feature`, `/amend`, and `/qc`. It runs the project’s fixed review profiles. The global `/critique` and `$critique` skills remain explicit-owner-invoked only. A stage that reaches its named review step is already authorized to call this runner directly.

The stage owns the review brief. The runner owns provider delivery and recovery: the provider commands, exact models, high effort, read-only mode, output normalization, and the 15-minute deadline. Do not call provider CLIs, the global runner, `.claude/scripts/lane.sh`, or `lane-findings.py` directly.

| Stage | Profile | Original lanes |
| --- | --- | --- |
| Feature or amend critique | `critique` | `critique-codex-sol`, `critique-codex-astra`, `critique-agy-pro`, `critique-agy-flash`, `critique-grok` |
| QC | `qc` | `qc-codex-sol`, `qc-codex-astra`, `qc-codex-terra`, `qc-agy-pro`, `qc-agy-flash`, `qc-grok` |

The `critique` profile is Sol 6, Astra 6, Gemini Pro 3.1, Gemini Flash 3.8, and Grok 4.7 Build Fast. The `qc` profile adds preserved Terra 5.6. Every fixed lane runs at high effort. Do not add or remove a lane.

## Start a round

Create one unique run directory under `.feature/lanes/`. The brief remains the stage’s normal brief file. Preview the fixed profile first, then start it:

```bash
mkdir -p .feature/lanes
run_dir="$(mktemp -d .feature/lanes/critique.XXXXXX)"
python3 .claude/scripts/review-lanes.py preview --profile critique --run-dir "$run_dir" --brief .feature/lanes/critique.brief
python3 .claude/scripts/review-lanes.py start --profile critique --run-dir "$run_dir" --brief .feature/lanes/critique.brief
```

For QC, replace `critique` with `qc` in the run-directory prefix and profile, and use `.feature/lanes/qc.brief`. Record the run directory in the stage’s working notes so a compaction resumes the same round rather than starting a second one.

## Collect a round

Launch one bounded background wait per original lane. Each call is only 30 seconds, never an unbounded foreground wait:

```bash
python3 .claude/scripts/review-lanes.py wait --run-dir "$run_dir" --lane critique-codex-sol --seconds 30
```

Continue ordinary stage work between wait returns. A wait reports `RUNNING` or one of `DONE`, `FAILED`, `DIED`, or `TIMED_OUT`. When it reports a terminal lane, immediately extract it:

```bash
python3 .claude/scripts/review-lanes.py extract --run-dir "$run_dir" --lane critique-codex-sol
```

The extraction result is `OK`, `NO_FINDINGS`, `INVALID`, `EMPTY_RESULT`, `FAILED`, or `TIMED_OUT`. Read `<run-dir>/<lane>.findings.json` only after `OK` or `NO_FINDINGS`, never raw output.

For `INVALID`, `EMPTY_RESULT`, `FAILED`, or `TIMED_OUT`, run exactly one resume only when the terminal result names a real `resume_id`. Start a separate lane with the original lane name plus `-resume`:

```bash
python3 .claude/scripts/review-lanes.py resume --run-dir "$run_dir" --lane critique-grok-resume --source-lane critique-grok
```

Collect and extract the resume lane in the same bounded way. A usable resume finding file stands in for its original lane. `RESUME_UNAVAILABLE` means that original lane is dead, with no fresh fallback. Otherwise, that original lane has no findings. Never promote raw, partial, or reasoning output. Codex lanes do not resume. Grok resumes are capped at five turns. agy resumes are told to use no more than five turns because its CLI has no turn-cap flag. Both retain the same 15-minute ceiling.
