# Approved handoff to /run-plan

Use from `/feature` step 9 only after the owner's approval stands: the step 4 approval when critique changed nothing material, or step 7 approval when it did. Earlier scope or visual agreement alone is not plain-plan approval. The host launches in the existing canonical checkout, then stops. Manual `/run-plan <N>` remains available if the owner prefers a later launch.

[Orchestration](orchestration.md) defines the script's behavior. `.claude/scripts/run-plan.py` reads the unchanged component table and slice files under `.feature`, builds sequentially on the active `ft/<N>` or `bf/<N>` branch with one repository writer, checks build and typecheck per component, then carries whole-branch QC, exact fixes and repeated independent QC to the bounded limit. Independent review lanes remain parallel. It posts exact reviewed-SHA PASS proof and pushes only this branch after PASS, then notifies the owner with the visible issue-scoped summary. The feature session supplies the approved plan, not instructions to create component branches.

- **Preconditions:** the checkout is already on `ft/<N>` or `bf/<N>`; `.feature/plan-<N>.md`, `.feature/plan-<N>/shared.md` and every table row's slice exist by exact path (`ls`, never `rg --files`); `.feature/plan-<N>-owner.md` is byte-identical to the issue body. No competing writer may own the repository. An existing run record is inspected as history or state, never taken as proof that a supervisor is alive. Start does not overwrite an old run; use status or eligible resume rather than deleting records to retry.
- **Clean tree:** unknown uncommitted work refuses launch and remains intact. Tool-configuration changes under `.claude/` or `.codex/` are committed and pushed as a `meta:` commit by the host before launching. Do not absorb unrelated files or reset the checkout.
- **Model:** every launched build is Astra High (owner, September 24). No model question at launch.
- **Topology:** one current checkout and one product writer. `--max-builds` is 1 and other values refuse. No automatic component refs or worktrees. A separate implementation checkout requires an explicit owner request and coordination outside this default contract.

Launch once in a foreground call that returns the detached process's real status:

```bash
python3 .claude/scripts/run-plan.py start --issue <N>
```

The result confirms launch, not completed work. Never issue a second start while the writer lease is held. No watcher registration is needed: the detached supervisor continues after this session closes and supplies one notification plus `scratch/feature-flow/<N>/run-<run_id>-summary.md` and the compatibility `.feature/run-<N>-summary.md`.

Close with the issue, canonical branch and component count, say the run launched and how the owner hears from it, and STOP. Keep this checkout on that branch and do not edit product files or start a competing stage while it runs.

On a later owner request:

```bash
python3 .claude/scripts/run-plan.py status --issue <N>
```

Relay built work, parked questions, blockers and next owner journeys. `stop` starts nothing new after the current job; `resume` continues an eligible stopped or interrupted schema-v2 run. Schema-v1 worktree runs and completed runs remain history and cannot resume silently.

## Fix builds from /qc

A standalone `/qc <N>` remains authorization to launch its queued fixes (owner, September 6, 2026). A historical `.feature/run-<N>.json` never suppresses that launch. Only `OPARAX_SUPERVISOR=run-plan`, both supervisor identifiers and successful `writer-lease.py verify` delegate it to the supervisor, as QC defines.

Standalone QC writes `.feature/fixes-<N>-<mode>.md` with `Status: pending` and `Round: <R>`, then launches on the existing canonical checkout:

```bash
python3 .claude/scripts/build-launch.py launch --issue <N> --component <mode> --plan <absolute scope path>
python3 .claude/scripts/build-launch.py watch --job <absolute job directory>
```

`<mode>` is the component id with its slice, or `integration` with `.feature/plan-<N>.md`. Optional `--worktree <existing canonical checkout>` does not create anything. The launcher acquires the repository writer lease, selects FIX from the pending list, persists the round's initial commit for step accounting and refuses unknown dirty work. `--dry-run` validates the target and prints the command without starting a build or creating refs.

Every build uses Astra High; `--model sol` is only for an explicit owner request. `RUNNING` proves launch only. Commit trailers and the decision log determine `BUILT`, `PARKED` or `FAILED`; `<job>/result.md` and `status --job <dir>` retain the verdict. A fix build posts no QC-done marker. Under active supervision, integration fixes continue into gates and another independent QC round; standalone QC stops after launch and names the next independent review. Ship remains owner-invoked after the walk.
