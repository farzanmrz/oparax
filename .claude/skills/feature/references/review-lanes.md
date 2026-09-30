# Shared fixed review lanes

Use this reference from `/feature`, `/amend`, and `/qc`. It runs the project’s fixed review profiles. The global `/council` and `$council` skill (whose lane runner this uses) remains explicit-owner-invoked only. A stage that reaches its named review step is already authorized to call this runner directly.

The stage owns the review brief. The runner owns provider delivery and recovery: the provider commands, exact models (ids in the council skill's `providers.py`), high effort, read-only mode, output normalization, and the 15-minute deadline. Do not call provider CLIs or the global runner directly.

| Stage | Profile | Original lanes |
| --- | --- | --- |
| Feature or amend critique | `critique` | `critique-codex-sol`, `critique-codex-astra`, `critique-agy-pro`, `critique-agy-flash`, `critique-grok`, `critique-cursor-kimi`, `critique-cursor-glm`, `critique-cursor-muse`, `critique-claude-opus`, `critique-claude-fable`, `critique-claude-sonnet` |
| QC | `qc` | `qc-codex-sol`, `qc-codex-astra`, `qc-agy-pro`, `qc-agy-flash`, `qc-grok`, `qc-cursor-kimi`, `qc-cursor-glm`, `qc-cursor-muse`, `qc-claude-opus`, `qc-claude-fable`, `qc-claude-sonnet` |

The `critique` and `qc` profiles run the same eleven CLI lanes: Sol 6.1, Astra 6, Gemini Pro 3.1, Gemini Flash 3.8, Grok 4.7 Build Fast, Kimi K3, GLM 5.2, Muse Spark 1.3, Opus 5.5, Fable 5.1 and Sonnet 5.5 (owner, September 29). Every fixed lane runs at high effort. The same lanes run from Claude Code and Codex. Do not add or remove a runner lane. There is no separate Opus subagent.

## Where the lanes run and what they may read

`review-lanes.py` takes `--checkout <path>`: the lanes run inside it and read its code. Critique leaves it at its default, the checkout the command runs in. A component QC passes the component's worktree; an integration QC runs in the main checkout on `ft/<N>`. The brief and the run directory may lie outside that checkout (a component round keeps them in the main checkout's `.feature/`), so every path in a brief is absolute.

`--add-dir <folder>` (repeatable) names a builders' skill folder by its central path (owner, September 28: reviewers get the builders' skills by exact path, not copies). The script forwards it to the runner when the runner's `start --help` lists `--add-dir`; until then it prints one line, `ADD_DIR_UNSUPPORTED <folders>`, before any lane starts. On that line the stage copies those folders under the run directory (`<run-dir>/skills/<name>/`) before starting: the runner already opens the brief's folder to the agy, Cursor and Claude lanes (a Grok lane rerouted through Cursor included), which read only their workspace and that folder, while a Codex lane's read-only sandbox reads the central paths in place. The brief says which lanes read the copy.

## Start a round

Critique creates one unique run directory under `.feature/lanes/`; QC uses its namespaced round directory `.feature/lanes/<N>/<component or integration>/round-<R>/`, created by the QC skill, never a random one. The brief remains the stage’s normal brief file. Remove an old critique run directory by its exact name, never with a wildcard on the profile prefix: the brief (`critique.brief`) shares that prefix, and a `critique.*` glob deleted it on September 24 and stalled a lane. Preview the fixed profile first, then start it:

```bash
mkdir -p .feature/lanes
run_dir="$(mktemp -d .feature/lanes/critique.XXXXXX)"
python3 .claude/scripts/review-lanes.py preview --profile critique --run-dir "$run_dir" --brief .feature/lanes/critique.brief
python3 .claude/scripts/review-lanes.py start --profile critique --run-dir "$run_dir" --brief .feature/lanes/critique.brief
```

For QC:

```bash
python3 .claude/scripts/review-lanes.py preview --profile qc --run-dir <round dir> --brief <round dir>/qc.brief --checkout <checkout> --add-dir <skill folder> ...
python3 .claude/scripts/review-lanes.py start   --profile qc --run-dir <round dir> --brief <round dir>/qc.brief --checkout <checkout> --add-dir <skill folder> ...
```

`start` refuses a run directory that already holds lane records for the profile, so a second start in the same round is impossible. Record the run directory in the stage’s working notes so a compaction resumes the same round rather than starting a second one.

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

Collect and extract the resume lane in the same bounded way. A usable resume finding file stands in for its original lane. `RESUME_UNAVAILABLE` means that original lane is dead, with no fresh fallback. Otherwise, that original lane has no findings. Never promote raw, partial, or reasoning output. Codex lanes do not resume. Cursor lanes resume their own session. Grok resumes are capped at five turns. One owner-authorized exception (owner, September 27): a Grok lane that fails on exhausted usage (HTTP 402) is rerun once by the runner inside the same lane on the same Grok 4.7 model through Cursor, and Grok lanes then start straight on Cursor until the weekly reset, Tuesday 17:22 Pacific, except a failure within two hours after the reset, which retries after 20 minutes; after that Grok is tried again. Such a lane is collected under its usual name, its extract line ends with `replaced=grok:... via=cursor reason=grok-usage-exhausted until=<reset time>`, and a resume of it is a Cursor resume. agy resumes are told to use no more than five turns because its CLI has no turn-cap flag. Both retain the same 15-minute ceiling.

## The Claude CLI lanes

Opus, Fable and Sonnet run through the same runner as every other reviewer, using the pinned model ids in `providers.py` (owner, September 29). Each starts a separate `claude -p` process with only Read, Grep and Glob, no MCP servers or skills, and the same brief and findings format. The runner removes Claude nesting markers so these processes also launch from Claude Code. Collect `<profile>-claude-opus`, `<profile>-claude-fable` and `<profile>-claude-sonnet` with the same wait, extract and bounded resume procedure above. Never dispatch a second Claude review subagent.
