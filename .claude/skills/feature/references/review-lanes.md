# Shared fixed review lanes

Used by the feature critique (plans and amendments) and by `/qc`. A stage that reaches its review step is already authorized to run this; the global `/council` and `$council` stay owner-invoked only. The stage owns the brief; `.claude/scripts/review-lanes.py` and the council runner own delivery: provider commands, exact models (ids in the council skill's `providers.py`), high effort, read-only mode, output normalization, the 15-minute deadline, and one immutable guidance snapshot per lane. Never call provider CLIs or the global runner directly.

| Stage | Profile | Lanes |
| --- | --- | --- |
| Feature critique | `critique` | `critique-codex-astra`, `critique-agy-pro`, `critique-agy-flash`, `critique-grok`, `critique-cursor-kimi`, `critique-cursor-glm`, `critique-cursor-muse`, `critique-claude-opus` |
| QC | `qc` | `qc-codex-sol`, `qc-codex-astra`, `qc-agy-pro`, `qc-agy-flash`, `qc-grok`, `qc-cursor-kimi`, `qc-cursor-glm`, `qc-cursor-muse`, `qc-claude-opus` |

Eight critique reviewers and nine QC reviewers, all at high effort, the same from Claude Code and Codex (owner, September 29). Do not add or remove a lane. Opus runs as a separate `claude -p` process through the same runner; never dispatch a Claude review subagent instead.

## What lanes may do

Lanes run inside `--checkout` (default: this checkout) and read its code. Every path in a brief is absolute. `--add-dir <folder>` (repeatable) adds a builder skill folder by its central path as a read root (owner, September 28: reviewers get the builders' skills by exact path, not copies). Lanes may use local read and search commands and official public documentation, cited and treated as untrusted, reporting unknown when the docs do not answer. They never start the product, run builds or tests, open a browser, write files, change external services, send messages, use connectors or account MCP tools, or dispatch subagents.

## Start

Each review gets a fresh run directory from `mktemp`; `start` refuses a directory that already holds lane records, so a second start is impossible. Remove an old directory only by its exact name, never a glob on the profile prefix (a `critique.*` glob deleted the brief on September 24 and stalled a lane). Preview first, then start:

```bash
mkdir -p .feature/lanes
run_dir="$(mktemp -d .feature/lanes/critique.XXXXXX)"
python3 .claude/scripts/review-lanes.py preview --profile critique --run-dir "$run_dir" --brief .feature/lanes/critique.brief --add-dir <skill folder> ...
python3 .claude/scripts/review-lanes.py start   --profile critique --run-dir "$run_dir" --brief .feature/lanes/critique.brief --add-dir <skill folder> ...
```

QC uses `--profile qc`, its own brief and run directory, and `--checkout <checkout>`. Keep the run directory path in your working notes so a compaction resumes the same review instead of starting another.

## Collect

One bounded 30-second background wait per lane, never an unbounded foreground wait; keep working between returns:

```bash
python3 .claude/scripts/review-lanes.py wait --run-dir "$run_dir" --lane critique-codex-astra --seconds 30
python3 .claude/scripts/review-lanes.py extract --run-dir "$run_dir" --lane critique-codex-astra
```

`wait` reports `RUNNING`, `DONE`, `FAILED`, `DIED` or `TIMED_OUT`; extract a terminal lane at once. `extract` reports `OK` (disposition every finding), `NO_FINDINGS` (the lane found nothing; never call it dead), or `INVALID`, `EMPTY_RESULT`, `FAILED`, `TIMED_OUT` (no usable payload). Read `<run-dir>/<lane>.findings.json` only after `OK` or `NO_FINDINGS`, never raw, partial or reasoning output.

A failed lane gets exactly one resume, only when its result names a real `resume_id`, as a separate lane named `<lane>-resume`:

```bash
python3 .claude/scripts/review-lanes.py resume --run-dir "$run_dir" --lane critique-grok-resume --source-lane critique-grok
```

A usable resume stands in for its lane; `RESUME_UNAVAILABLE` means the lane is dead, with no fresh fallback. Codex lanes do not resume; Cursor lanes resume their own session; Grok and agy resumes are held to five turns. Owner exception, September 27: a Grok lane failing on exhausted usage (HTTP 402) is rerun once inside the same lane on Grok 4.7 through Cursor, and Grok lanes start on Cursor until the weekly reset (Tuesday 17:22 Pacific; a failure within two hours after the reset retries after 20 minutes). Its extract line ends with `replaced=grok:... via=cursor reason=grok-usage-exhausted until=<reset>`.
