---
name: run-plan
description: >-
  Start, check, stop or resume the unattended run of an approved plan. The script
  .claude/scripts/run-plan.py builds each component in this checkout with one
  writer, then carries whole-branch QC and fixes to a bounded PASS or blocker.
  Use when the owner says /run-plan <N>, /run-plan <N> status, /run-plan <N> stop
  or /run-plan <N> resume. This skill only starts, shows or stops the script; it
  never decides scope or proof.
argument-hint: "<issue #> [status|stop|resume]"
allowed-tools: Bash(python3 *)
model: sonnet
disable-model-invocation: true
---

# Run: hand the approved plan to the script and step away

The feature skill ends with an approved, frozen plan in `.feature/plan-<N>.md` and `.feature/plan-<N>/`. What the script does with it is in [orchestration](../feature/references/orchestration.md). Run the one form the owner asked for:

```bash
python3 .claude/scripts/run-plan.py start --issue <N>
python3 .claude/scripts/run-plan.py status --issue <N>
python3 .claude/scripts/run-plan.py stop --issue <N>
python3 .claude/scripts/run-plan.py resume --issue <N>
```

Show the result plainly and stop. Do not launch jobs, switch branches or poll: the detached script continues after this session closes and notifies the owner when it ends. `status` prints one line per component and the whole-branch check, and after the run ends the summary of built work, parked questions, blockers and what to walk. `start --component-review lanes` adds a full review per component; the default is build and typecheck per component and one whole-branch review (owner, September 28).

If the script refuses (wrong branch, changed plan, unknown dirty work, another writer), relay the refusal and stop. Never reset or clean the owner's checkout to make it start.
