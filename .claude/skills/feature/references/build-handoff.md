# Approved handoff to /run-plan

Use from `/feature` step 9 only after the owner's approval stands: the step 4 approval when the critique changed nothing material, or the step 7 approval when it did. Scope, plain-plan or visual approval at an earlier point is not this approval. The host launches the orchestrator in the same local checkout, then stops working. A manual `/run-plan <N>` remains available if the owner prefers to launch it himself.

What `/run-plan <N>` does with the plan is defined in [the orchestration reference](orchestration.md), which the orchestrator skill owns: `.claude/scripts/run-plan.py` reads the component table in `.feature/plan-<N>.md` and the files under `.feature/plan-<N>/`, records the plan's hash in `.feature/run-<N>.json` (its own state file; no stage writes it), builds the components in parallel worktrees in dependency order (the data model first and alone, every build on Astra High, owner, September 24), runs QC per component and one integration QC, merges into `ft/<N>`, pushes it, and notifies the owner with a desktop notification and `.feature/run-<N>-summary.md`. The feature session hands it a complete plan and nothing else.

- **Preconditions the host verifies before launching:** the checkout is on `ft/<N>` (or `bf/<N>`) and the branch exists; `.feature/plan-<N>.md`, `.feature/plan-<N>/shared.md` and one `.feature/plan-<N>/<id>.md` per table row exist by exact path (`ls`, never `rg --files`, which hides the git-ignored `.feature/`); `.feature/plan-<N>-owner.md` is byte-identical to the issue body just posted; no `.feature/run-<N>.json` exists for this issue (one does only if a run was already started; then it is `resume`, `status` or `stop`, never a second `start`).
- **Clean tree:** the launcher refuses a checkout on `ft/<N>` with uncommitted changes and does not commit anything itself. Uncommitted files under `.claude/` or `.codex/` (tool configuration written mid-flow) never block a stage: the host commits and pushes them on the branch as a `meta:` commit before launching. Any other uncommitted file is a stop to report, not something to absorb.
- **Model:** every build the run launches is Astra High (owner, September 24: no model question at any launch). Do not pass, offer or ask about a model.
- **Scope:** launch the literal command below. Do not paste the planning discussion into it, preselect a component order, or tell it which components to skip; the table is the whole instruction. `--max-builds` (how many components build at once; the script's default is 3, the assistant's number) is passed only when the owner asks for a different number. Report any rejected operation or unavailable credential as a blocker, not success.

Run in a foreground Bash call:

```bash
python3 .claude/scripts/run-plan.py start --issue <N>
```

The output is one JSON line with the issue, the detached loop's process id and the state file path. It confirms the run launched, not that anything was built. Never issue a second start while a run for that issue is going; the script holds a lock and refuses it.

There is no watcher to register: the loop is detached, survives this session closing, and reports to the owner on its own (the desktop notification and the summary file). Do not wait in foreground, poll `status`, or keep a model thinking about progress.

After launching, close with the issue, the branch and the number of components, say the run was launched and how the owner will hear from it, and STOP. Keep the shared checkout on that branch. Do not start QC, ship, a build or make further repo changes while it goes.

On a later explicit request from the owner, read the run without relaunching:

```bash
python3 .claude/scripts/run-plan.py status --issue <N>
```

and relay it in plain words (which components merged, which parked for his answer, which blocked or failed and why, what he walks next, from `.feature/run-<N>-summary.md` when the run has finished). `stop --issue <N>` asks the loop to start nothing new; `resume --issue <N>` continues a stopped run against the same plan. The orchestration reference defines what a parked component needs from him.

## Fix builds from /qc

A standalone `/qc <N>` (outside a run) still launches its own fix build when it queues fixes (owner decision 2026-09-06: the `/qc <N>` invocation is the approval for that round's fixes; QC never stops to ask). That launch uses the single-component launcher, in a foreground Bash call, on the component's own worktree: the pending fix list is `.feature/fixes-<N>-<component>.md` (`Status: pending`, `Round: <R>`), the worktree and plan slice are that component's entries in `.feature/run-<N>.json`, and the launcher picks FIX mode from the fix file. It creates or reuses the worktree, copies uncommitted `.claude/` and `.codex/` files into it as a `meta:` commit on the component branch (never a push), and refuses a second migrating component while one runs:

```bash
python3 .claude/scripts/build-launch.py launch --issue <N> --component <id> --worktree <absolute worktree path> --plan <absolute plan slice path>
python3 .claude/scripts/build-launch.py watch --job <absolute-job-directory>
```

Every such build runs on Astra High; `--model sol` exists only for an explicit owner request. `RUNNING` confirms the process launched, not that the build succeeded. The end state is decided by code from the item commits (`Step: k/M` trailers with `Component:` and `Round: fix-R`) and the decision log `.feature/decisions-<N>-<component>.md`, never from the agent's prose: `BUILT` (every item committed, worktree clean), `PARKED` (built, and the log holds `PARKED:` questions for the owner), `FAILED` (an item without its commit, leftovers in the worktree, or Codex did not complete; `reason` says which). The result persists at `<job>/result.md`; `status --job <dir>` reads it later, and `--dry-run` prepares the worktree and prints the exact Codex command without starting it. Inside a run, the orchestrator launches fix builds itself and QC does not use this section.
