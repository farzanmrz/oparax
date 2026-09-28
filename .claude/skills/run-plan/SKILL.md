---
name: run-plan
description: >-
  Start, check or stop the overnight run of an approved plan. The script
  .claude/scripts/run-plan.py builds, reviews and merges every component of
  .feature/plan-<N>.md on its own and leaves one list to read in the morning.
  Use when the owner says /run-plan <N>, /run-plan <N> status, /run-plan <N> stop or
  /run-plan <N> resume. This skill only starts, shows or stops the script; it never
  decides what to build, what passed, or what to merge.
argument-hint: "<issue #> [status|stop|resume]"
allowed-tools: Bash(python3 *)
model: sonnet
disable-model-invocation: true
---

# Run: hand the approved plan to the script and step away

`/feature <N>` ends with an approved plan on disk: `.feature/plan-<N>.md` with one row per component, and one slice file per component under `.feature/plan-<N>/`. This command hands that plan to a script that carries it out while you are away. The script is the only thing that decides anything; no model session holds the whole plan, and every model session does one bounded job (build one component, review one component, apply one fix round) and then ends. What the script does, in plain words, is in [orchestration](../feature/references/orchestration.md).

The four forms, and the one command each runs:

```bash
python3 .claude/scripts/run-plan.py start --issue <N>    # /run-plan <N>: begin the run, detached, and come back at once
python3 .claude/scripts/run-plan.py status --issue <N>   # /run-plan <N> status: one screen, one line per component
python3 .claude/scripts/run-plan.py stop --issue <N>     # /run-plan <N> stop: nothing new starts; what is running finishes its job
python3 .claude/scripts/run-plan.py resume --issue <N>   # /run-plan <N> resume: pick up a stopped or interrupted run where it stands
```

Run the one command the owner asked for, show its output in plain words, and stop. Do not read the plan, do not launch builds, reviews or merges yourself, do not touch worktrees or branches, and do not poll or wait: the script runs detached and keeps going after this session closes.

What the owner gets:

- **While it runs:** `/run-plan <N> status` at any time. Each component is one line with where it is (planned, building, reviewing, fixing, merged, parked, blocked, failed).
- **When it ends:** a macOS notification and one file, `.feature/run-<N>-summary.md`: what shipped into `ft/<N>`, what parked with the question it is waiting on, what blocked and why, and which acceptance journeys to walk. Nothing else needs reading.
- **A pause parks only that component.** The rest keeps going. Parked and blocked components keep every step they committed on their own branch, so nothing is lost and nothing has to be redone.
- **No session can hang the night.** A build gets 60 minutes, a review 30, a fix round 45; past that the script ends it, throws away its unfinished changes, and starts it again from the last step it committed. Three such timeouts block the component for you to look at.

If the script refuses (the plan file changed since approval, a component's worktree holds changes no session owns, a run is already going), relay its message as it is and stop; it says what to do.
