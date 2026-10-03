# What the run does after the plan is approved

Owner, September 28: "My involvement should only be planning it all out once." `/run-plan <N>` hands the frozen plan to `.claude/scripts/run-plan.py`, a detached supervisor that keeps going after the session closes.

## For the owner

The supervisor builds the components one at a time in dependency order, in this checkout on `ft/<N>` or `bf/<N>`, each on Astra High with one commit per numbered step. One writer, no worktrees and no parallel builds, because every failure so far came from several writers in one checkout (owner, October 2: "Worktree is not allowed, parallel is not allowed"). Research and review lanes still run in parallel, read-only.

After each component it runs build and typecheck. Red blocks that component and everything that depends on it; independent components continue. A parked question keeps the work done behind its default and lets independent components continue.

When every component is in, one independent whole-branch QC runs the eight lanes plus its own pass on the diff and the screenshots. Fixes go straight back to a fix build in this checkout, then gates and QC again, at most three fix rounds before a concrete blocker. A PASS must name the commit it reviewed, still at HEAD; only then does the supervisor post that proof on the issue and push the branch. It never ships, closes the issue or promotes.

Deadlines: a build 60 minutes, QC 30, a fix build 45. Past one the job is stopped; dirty work is kept and blocks for inspection, clean work retries from its last committed step, and three timeouts block the job. The run ends with a macOS notification; `/run-plan <N> status` then shows what was built, parked questions, blockers and what to walk.

## For the agents

- **Inputs.** `.feature/plan-<N>.md` (table with `id`, `title`, `depends_on`, `migrations`), `.feature/plan-<N>/shared.md` and one slice per row; the migrating slice carries its own `migrations: yes` line. Start checks paths, duplicate ids and cycles, and records hashes of every plan file; a changed plan refuses the run, so scope changes are amendments.
- **State.** The supervisor alone writes `.feature/run-<N>.json`, the one machine file it reads to resume, plus its journal `.feature/run-<N>.log`. The writer lease lives in the Git directory and is shared by runs, builds, kickoff and ship. A component state `merged` means its commits are already on the branch.
- **Builds.** `build-launch.py launch --issue <N> --component <id> --plan <absolute slice>` runs in this checkout; a retry may pass `--base-commit` so step counting uses the round's fixed base. Mode order is a pending amendment for that scope, then its pending fix list, then the plan. The launcher decides BUILT, PARKED or FAILED from step trailers and the `PARKED:`/`FAILED:` lines of the build's final report. Unknown dirty work refuses without reset.
- **QC.** The supervisor starts headless Sonnet medium QC with `OPARAX_SUPERVISOR=run-plan`, `OPARAX_RUN_ID` and `OPARAX_WRITER_TOKEN`, deletes `.feature/qc-<N>-<unit>.json` first and reads that file back: `status` PASS, FIXES or STOP, `reviewed_commit`, `fixes`, `summary`. Headless QC may read the issue but never comment or push; only verified supervised QC may commit bounded `gates:` corrections. After a PASS at HEAD the supervisor posts:

```text
## QC done: integration

Reviewed-Commit: <SHA>
Result: PASS
```

A fix build's report never substitutes for this proof.
- **Commands.** `status` reads progress; `stop` lets the current job finish and starts nothing new; `resume` continues an interrupted or stopped run but never retries a failed, blocked or parked component. Recovering one is a separately scoped build and review in this checkout, never a hand-edited state.
