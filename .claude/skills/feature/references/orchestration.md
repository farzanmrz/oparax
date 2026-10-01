# What happens after the plan is approved

Owner, September 28: "My involvement should only be planning it all out once." Unattended continuation remains the goal. The September 30 correction uses one existing feature checkout and one product writer, rather than automatic branches and worktrees per component.

## For the owner

The approved plan has components, each with what it depends on. `/run-plan <N>` gives it to a detached script that builds them in order on the active `ft/<N>` or `bf/<N>` branch. Every build runs on Astra High and commits each numbered step. A parked question retains the completed work and lets independent later components continue when their dependencies allow it.

After each component the script runs build and typecheck. A red default component gate blocks that component with its errors; it does not automatically create or apply a repair list. Components depending on it cannot proceed, while eligible independent work may continue. Optional component QC is available. One full independent review at the end uses the same nine outside reviewers and the host's own review of the whole product and its seams. Research, detailed planning and review lanes remain parallel and read-only.

When whole-branch review finds fixes, the script launches the exact list on this checkout, checks build and typecheck again, and repeats independent QC. At most three fix rounds are allowed before a concrete blocker. A PASS must name the commit actually reviewed and still at HEAD. Only the supervisor then posts that proof and pushes the feature branch. It never ships, closes the issue or promotes to production.

A build has 60 minutes, QC 30, and a fix build 45. Past its deadline the process group stops. Dirty work is preserved and blocks for inspection; clean jobs can retry from the last committed step using the same fixed round base. Three timeouts block the affected job. A second writer cannot take this repository while the supervisor owns it.

The run ends with a macOS notification and a summary under `scratch/feature-flow/<N>/run-<run_id>-summary.md`, with a compatibility copy at `.feature/run-<N>-summary.md`. It names built work, parked questions, blockers and the owner's acceptance journeys. `status` reads progress; `stop` lets the current job finish and starts nothing new. `resume` continues queued work in an eligible stopped or interrupted current-checkout run. It does not repair or retry terminal failed, blocked or parked components. Recovery is a separately scoped build and review in the existing checkout with records retained, not a fabricated state transition. Old component-worktree runs and completed runs are historical and cannot silently resume into this topology.

## For the agents

**Plan compatibility.** Keep `.feature/plan-<N>.md`, `.feature/plan-<N>/shared.md` and one slice per component. The table has `id` (or `component`), `title`, `depends_on` and `migrations`; dependencies are comma-separated ids or `none`, migrations `yes` or `no`. The migrating slice has its exact `migrations: yes` line. Start checks paths, duplicate ids and cycles before launching. It binds to an existing clean canonical `ft/<N>` or `bf/<N>` checkout, never creating refs or worktrees. The approved plan is frozen; changes to scope use separately approved amendments rather than editing it.

**State and ownership.** The detached supervisor alone writes `.feature/run-<N>.json`. New records use `schema_version: 2`, `topology: current-checkout` and a UUID `run_id`; every component's legacy `worktree` and `branch` fields identify the same active checkout and branch. The repository writer lease lives in the common Git directory and is shared by direct builds and supervisors, across issue numbers. `max_builds` is 1; other values refuse. Existing job records retain scope, fixed `base_commit`, step count, HEAD, decision log, result and QC rounds. The journal and stop-request paths stay compatible. A `merged` state means the component's commits are already on the active branch, without a merge command.

**Build calls.** `build-launch.py launch --issue <N> --component <id> --plan <absolute slice>` uses the current checkout; optional `--worktree <existing canonical checkout>` is compatibility spelling only. Retry may pass `--base-commit <stored round base>` so step accounting does not use a moving branch. Mode priority is a pending amendment naming this scope, then its pending fix list, then BUILD. Status reads the exact job's result. One writer owns migrations and product edits. Unknown dirty work refuses without reset or clean; timeout preserves unfinished files. A job commits only its numbered scope and never publishes QC PASS.

**QC calls and evidence.** The supervisor starts headless Sonnet medium QC with the fixed review profile, passing `OPARAX_SUPERVISOR=run-plan`, `OPARAX_RUN_ID` and `OPARAX_WRITER_TOKEN`. QC defers fix launch only with that exact supervisor flag and both identifiers, after this succeeds:

```bash
python3 .claude/scripts/writer-lease.py verify --run-id "$OPARAX_RUN_ID" --token "$OPARAX_WRITER_TOKEN"
```

A run JSON file's existence is never proof of active supervision. A supplied invalid context is a routing blocker; a manual QC without context remains standalone even beside old records. Review refuses a wrong branch rather than switching. Headless QC may read its issue with `gh issue view`, but cannot post comments. Only verified supervised QC may make bounded mechanical gate corrections under the inherited lease. Standalone QC reads product source and delegates corrections to the leased launcher; metadata-only settlement claims a separate writer lease first. It writes `.feature/lanes/<N>/<mode>/round-<R>/result.json` with `status: PASS|FIXES|STOP`, `reviewed_commit`, `fixes` and `summary`. Only PASS after unchanged-HEAD verification permits the supervisor to post:

```text
## QC done: integration

Reviewed-Commit: <SHA>
Result: PASS
```

A fix-applied comment never substitutes for this independent proof. FIXES, including integration FIXES, returns to a same-checkout Astra High fix build and then independent QC within the bounded loop. STOP or exhausted rounds preserve work and report a blocker.

**Records.** Existing `.feature` plans, run files and result paths remain operational for compatibility. Owner-readable summaries and new audit evidence belong under visible `scratch/feature-flow/<N>/`. Finalize preserves an issue-scoped archive and never wipes other issues or deletes branches. Additional product branches or worktrees require an explicit owner request; preservation and cleanup ordered outside the stages are separate actions.
