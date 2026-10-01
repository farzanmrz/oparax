---
name: run-plan
description: >-
  Start, check or stop the unattended run of an approved plan. The script
  .claude/scripts/run-plan.py builds each component in the existing canonical
  checkout with one product writer, then carries independent whole-branch QC,
  fixes and QC to a bounded PASS or blocker. Use when the owner says
  /run-plan <N>, /run-plan <N> status, /run-plan <N> stop or /run-plan <N> resume.
  This skill only starts, shows or stops the script; it never decides scope or proof.
argument-hint: "<issue #> [status|stop|resume]"
allowed-tools: Bash(python3 *)
model: sonnet
disable-model-invocation: true
---

# Run: hand the approved plan to the script and step away

`/feature <N>` ends with an approved plan on disk: `.feature/plan-<N>.md` with one row per component and a slice per component under `.feature/plan-<N>/`. The script carries it out in the existing `ft/<N>` or `bf/<N>` checkout with one product writer. Independent research and review lanes remain parallel and read-only. What it does is defined in [orchestration](../feature/references/orchestration.md).

Run the one form the owner asked for:

```bash
python3 .claude/scripts/run-plan.py start --issue <N>
python3 .claude/scripts/run-plan.py status --issue <N>
python3 .claude/scripts/run-plan.py stop --issue <N>
python3 .claude/scripts/run-plan.py resume --issue <N>
```

Show the result plainly and stop. Do not launch jobs yourself, switch branches, create checkouts or poll: the detached script continues after this session closes.

- **While it runs:** status shows one line per component and whole-branch QC. The legacy state word `merged` means incorporated directly into the active branch; there is no component merge.
- **When it ends:** one macOS notification and an owner-readable summary under `scratch/feature-flow/<N>/run-<run_id>-summary.md`. `.feature/run-<N>-summary.md` remains a compatibility copy. The summary names built work, parked questions, blockers and acceptance journeys.
- **One writer:** components build sequentially in dependency order. `--max-builds` defaults to 1 and refuses other values. No component branch or worktree is created. Additional implementation checkouts require an explicit owner request and a separate coordination arrangement.
- **Review and continuation:** each component gets build and typecheck; `--component-review lanes` optionally adds independent component QC. Whole-branch QC always uses the fixed nine reviewers plus the host pass. FIXES launches the exact integration fix list in this checkout, then repeats gates and independent QC within the existing three-fix-round limit. PASS is tied to the reviewed SHA, posted by the supervisor, then the canonical feature branch is pushed.
- **Deadlines:** a build gets 60 minutes, QC 30, a fix 45. A timed-out job is stopped. Dirty work is preserved and blocks for inspection. A clean job can retry from its fixed round base and committed steps; three timeouts block it.
- **Resume:** only a stopped or interrupted current-checkout schema-v2 run may resume. Historical schema-v1 component-worktree records remain readable by status but cannot be silently resumed. Completed runs cannot be resumed as new work.

If the script refuses a wrong branch, changed approved plan, unknown dirty work or another writer, relay the concrete refusal and stop. Never reset or clean the owner's checkout to make launch succeed.
