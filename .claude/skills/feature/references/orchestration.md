# What happens after the plan is approved

Owner, September 28: "My involvement should only be planning it all out once." This page says, in plain words, what carries the approved plan out while he is away, and then, for the agents, the exact files and rules.

## For the owner

Your plan is split into components (the schema, the page, the alerts, and so on), each with what it depends on. When you approve the plan, `/run-plan <N>` hands it to a script. The script, not a model, decides what happens next, and it follows the plan file exactly as approved; if the plan file changes underneath it, it stops and says so.

For each component, in the order the dependencies allow, up to three at a time:

1. **Build.** A fresh copy of the code is made for this component alone (its own folder and branch, cut from the feature branch after everything it depends on has landed). A Codex build session reads only this component's slice of the plan and builds it step by step, committing after every step. If the build hits a question only you can answer, it parks: it writes the question down, keeps every step it finished, and the script moves on to the components that do not depend on it.
2. **Review.** A separate, headless Claude session runs `/qc` on that copy alone: the gates, the review lanes, the fix list. The script reads the verdict: pass, fixes, or stop.
3. **Fix.** If there are fixes, a Codex fix session applies exactly that list on the same copy, and review runs again. At most three fix rounds; after that the component is blocked for you to look at, and the rest keeps going.
4. **Merge.** A passed component is merged into the feature branch `ft/<N>` with its step commits kept, in dependency order. A merge conflict blocks that component with the file names, nothing more.

After the last merge, one more headless review runs on the whole branch. If it passes, the branch is pushed. Nothing ever touches `beta` or `main`.

Every session has a hard deadline (a build 60 minutes, a review 30, a fix round 45). A session that runs past it is killed, its unfinished changes are discarded, and it is started again from the last step it committed; after three such timeouts the component is blocked for you to look at. A hung session never holds the night.

You get one macOS notification when the run ends and one file to read: `.feature/run-<N>-summary.md`. It lists what shipped, what is parked and the question each parked component is waiting on, what is blocked and why, and which acceptance journeys to walk. `/run-plan <N> status` shows the same picture at any time while it runs. `/run-plan <N> stop` lets the sessions already running finish their job and starts nothing new; `/run-plan <N> resume` picks up where it stopped.

Two components that change the database never build at the same time, because there is one shared Supabase project.

## For the agents

**The plan the script reads.** `.feature/plan-<N>.md` opens with a table whose header has `id` (or `component`), `title`, `depends_on` and `migrations` columns. One row per component; `depends_on` is a comma list of ids or `none`; `migrations` is `yes` or `no` (the launcher reads the same answer from a `migrations: yes` line in the slice). Each component has a slice `.feature/plan-<N>/<id>.md`, which is the component's `plan_section` in the run file, and `.feature/plan-<N>/shared.md` holds what every slice shares. `/feature` writes this format; `run-plan.py start` refuses if any slice is missing, a dependency names an unknown id, or the main checkout is not on `ft/<N>` and clean.

**State.** `.feature/run-<N>.json`, written atomically by the detached loop, which is its only writer. It holds the plan path and its sha256 at approval, `max_builds`, the integration checkout, and per component: `id`, `title`, `plan_section`, `depends_on`, `migrations`, `worktree`, `branch`, `base_commit`, `head_commit`, `status`, `steps_done`, `qc` (`round`, `reviewed_commit`, `status`, `pid`), `fix_rounds`, `last_error`, `parked`, `build_job`. Statuses: `planned`, `building`, `built`, `parked`, `qc`, `fixing`, `passed`, `merged`, `blocked`, `failed`. The journal `.feature/run-<N>.log` is append-only; a stop request is the file `.feature/run-<N>.stop`; the lock `.feature/run-<N>.lock` is held by the loop for its life.

**Places.** The launcher cuts each worktree at `/Users/farzanm4/Desktop/repos/oparax-wt/<N>-<id>/` on the local branch `ft/<N>-<id>` from `ft/<N>` at build launch, so a component built after a merge starts from the merged code. Merges and the whole-branch QC happen in the main checkout, which stays on `ft/<N>` for the whole run. Only `ft/<N>` is pushed, after the whole-branch QC passes.

**Commands the script issues.** Build: `build-launch.py launch --issue <N> --component <id> --worktree <path> --plan <slice>` (the same command for a fix round: the launcher enters FIX mode by itself from `.feature/fixes-<N>-<id>.md` at `Status: pending`, which QC writes; the script writes no fix list and QC launches no build inside a run), then `build-launch.py status --job <job>` until the job is `BUILT`, `PARKED` or `FAILED`; `base_commit`, `head_commit` and the step count come from the job's state. Review, from the main checkout: `claude -p "/qc <N> --component <id>" --output-format json --permission-prompts none --allowedTools Bash Read Edit Write Grep Glob --disallowedTools "Bash(git push:*)" "Bash(git merge:*)" "Bash(git switch:*)" "Bash(git checkout:*)" "Bash(git reset:*)" "Bash(git branch:*)" "Bash(gh:*)" --add-dir <worktree>` (Bash stays allowed for the gates, diffs and the `gates:` commit; the deny list keeps a headless session off pushes, merges and GitHub), then `.feature/lanes/<N>/<id>/round-<R>/result.json` (`{"status": "PASS" | "FIXES" | "STOP", "reviewed_commit", "fixes", "summary"}`; the session numbers its own round dir, the script reads the highest); the whole branch: `claude -p "/qc <N> --integration"` with the same flags and no `--add-dir`. Merge: `git merge --no-edit ft/<N>-<id>`; on conflict, `git merge --abort` and the conflict paths go on the component. Parked questions come from the `PARKED:` lines of `.feature/decisions-<N>-<id>.md`.

**Deadlines.** A build launch 60 minutes, a QC session 30, a fix build 45. Past its deadline the script kills the session's process group (the launcher's worker and its Codex child, or the `claude -p` process), writes `TIMEOUT` to the journal, runs `git reset --hard HEAD` and `git clean -fd` in that checkout, and relaunches: a build resumes from its last step commit (the launcher reads the `Step:` trailers), a QC starts a new round. The third timeout of a component blocks it with the reason; the whole-branch QC records it on the run instead.

**Refusals.** The whole run: the plan file's hash differs from the approved one; at start, a main checkout that is not on `ft/<N>` or holds any uncommitted file. One component (the rest keeps going): its worktree holds uncommitted changes that no live session owns; a QC pass whose `reviewed_commit` is not the branch head; a dependency that ended parked, blocked or failed; a third fix round that still leaves fixes.

**Terminal states only.** One `osascript` notification and the summary file when the run finishes, stops or refuses. No other channel; a watching Claude desktop session may relay.
