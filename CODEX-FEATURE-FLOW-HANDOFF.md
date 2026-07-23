# Codex feature-flow handoff for Claude Code

This is a temporary coordination artifact for the remainder of `ft/68`. Read it before changing the planning or QC workflows, preserve the interfaces described below, and delete this file before the feature is finally shipped.

## Scope boundary

Codex implemented the non-planning/non-QC portion of the feature-flow redesign. It did **not** invoke `/feature`, `/feature-plan`, `/feature-qc`, `/feature-ship`, a live promotion, or branch cleanup. It did not change planner councils, planner prompts, `plan-synth.mjs`, QC councils, `qc-review.mjs`, or QC agents.

Claude owns the remaining planning and QC model-workflow decisions. A narrow phase-boundary edit was made to `feature-plan` so it can start the new tracked/direct run contract; the planning synthesis itself is untouched. QC must consume the saved direct-run `baseSha`, but its internal workflow is intentionally unchanged for Claude to implement.

## Starting state and anomalies

- Work was performed on the existing `ft/68`; its prior commits and outreach changes were preserved.
- Issue `#68` remains open.
- `origin/dev` at `3ef2e9d` already contains the earlier large `ft/68` merge. Before this Codex slice, current `ft/68` was that `dev` tip plus outreach commits `ce3f15e` and `c392a07`.
- Local `dev` is checked out in `/Users/farzanm4/oparax-dev-sim`. The previous scripts' `checkout dev` design would therefore fail; the new scripts use fetched remote refs and temporary detached worktrees.
- Local `ft/67` is closed but predates durable ship trailers, so automated cleanup must skip it.
- `dev`, `beta`, and `main` have divergent history. Promotion therefore uses normal merge commits, not fast-forward-only branch copying.

## Implemented behavior

### Build transition

- `/feature-build` is pinned to Claude Opus with medium effort. Implementers remain pinned to Sonnet.
- Deterministic `pnpm install --frozen-lockfile`, task-graph coordination, dispatch, and wave typechecks stay with the coordinator.
- Repository-mutating prerequisites such as adding shadcn components are explicit foundational implementer tasks that block their consumers.
- There is no extra background coordinator.
- Implementer reports are exception-only. Normal completion returns a short status and commit list; detailed reports exist only for deviations, blockers, failed checks, non-obvious decisions, or out-of-scope findings.

### Branch-scoped state and `/feature-handoff`

The runtime root is ignored `.context/features/<exact branch>/`.

`state.json` is schema version 1 and contains:

- `mode`: `tracked` or `current`
- `issue`: integer or `null`
- `branch`
- `baseSha`
- `sourceTip`
- `headSha`
- `worktreeFingerprint`
- `capturedAt`
- `phase`
- `gate`
- `releaseTarget`: `dev`, `beta`, or `main`
- `approvedPlanRef`
- `handoffReady`

The deterministic interface is `.claude/skills/feature-handoff/scripts/state.mjs`:

- `init`: establish an exact tracked or direct-dev run.
- `update`: update phase/gate/target/source metadata and invalidate older prose.
- `capture`: validate and atomically replace `handoff.md`, with a 7,000-byte maximum.
- `show`, `path`, and `fingerprint`: read-only inspection.
- `clear`: remove only the named branch's runtime directory.
- `hook`: exact-branch SessionStart loader.

The manual `/feature-handoff` skill runs on Sonnet medium and cannot be auto-invoked. It replaces, never appends, a bounded checkpoint. It rejects raw transcripts, raw diffs, reasoning traces, secret-like content, missing required sections, and oversized output.

`.claude/settings.json` loads a handoff only on `startup|clear|compact`. The loader requires exact branch, HEAD, and worktree fingerprint matches. Missing state is silent; stale or invalid state produces only a short path-specific notice. It never falls back to another branch. `/resume` or `/branch` remains the correct choice for exact transcript continuity.

### Tracked and direct-dev starts

Default tracked mode:

1. Require a completely clean tree, including untracked files.
2. Fetch `origin/dev` without checking out local `dev`.
3. Create the issue with the approved plan.
4. Cut `ft/<issue>` from the exact fetched SHA.
5. Initialize branch state with the issue as the approved-plan source and retain the requested terminal target.
6. If branch creation or state initialization fails, close the new issue and roll back the incomplete branch where possible.

Explicit current mode is allowed only while already on a clean local `dev` exactly equal to `origin/dev`. It creates no issue or branch, saves the approved plan to ignored `.feature/approved-plan.md`, and records that starting SHA as `baseSha`.

**QC integration contract:** for `mode: current`, use `state.baseSha..HEAD` as the run's change boundary. Do not assume `origin/dev...ft/N`, and do not replace the saved base with a later `dev` SHA. Tracked runs continue to use their issue/feature-branch contract.

### Shipping, conflicts, cleanup, and promotion

- The final gate shows the complete dirty inventory and explicitly names the retained target: dev, beta, or production.
- Shipping stages every listed modification, deletion, and untracked file.
- A tracked feature tip is normally pushed first as the recovery copy.
- Integration is previewed with `git merge-tree` before any ref changes, then squash-committed from a temporary detached worktree based on fetched `origin/dev`.
- The dev commit has parseable `Feature-Issue`, `Feature-Branch`, and `Feature-Source-Tip` trailers.
- No destructive reset is used. Conflicts report destination-only commits, feature-only commits, conflicting paths, and the three user choices: preserve compatible intentions from both, prefer destination, or prefer feature.
- The just-shipped feature branch is retained locally and remotely for one recovery generation. A later successful finalization considers only older exact `ft/<number>` branches. Deletion requires a closed issue, matching dev trailers, unchanged local/remote tips, no worktree use, successful remote queries, and an exact remote lease. Ambiguous branches are skipped.
- Promotion is strictly `dev → beta → main`. `promote.sh` performs one Git-only hop using a normal `--no-ff` merge in a temporary detached worktree and prints only the exact destination SHA.
- `feature-ship` must use `vercel:deployments-cicd` to prove that exact SHA is READY at `beta.oparax.ai` before a main hop, and at `oparax.ai` before finalization. Failure stops the ladder without another approval prompt.
- Finalization verifies live refs, closes the tracked issue, clears only this branch's continuity state, sweeps feature scratch, and conservatively checks older recovery branches.

### Permanent branch protection

- Versioned `.githooks/reference-transaction` blocks local deletion and non-fast-forward updates to exact refs `main`, `dev`, and `beta`.
- Versioned `.githooks/pre-push` blocks remote deletion and non-fast-forward pushes to those refs, failing closed when ancestry cannot be proven.
- This checkout now has `core.hooksPath=.githooks`.
- GitHub ruleset `19644133`, **Protect permanent branches**, is active for `refs/heads/main`, `refs/heads/dev`, and `refs/heads/beta`. It has no bypass actors and enforces `deletion` plus `non_fast_forward`. Ordinary fast-forward pushes remain allowed.
- The ruleset is the canonical protection. Local hooks are guardrails and can be disabled by someone who controls the local Git configuration.

### Canonical release mapping

`AGENTS.md` now records:

- `dev`: normal integration and preview branch.
- `beta`: `beta.oparax.ai`.
- `main`: `oparax.ai`.
- Promotions always traverse `dev → beta → main`.

Both public domains returned HTTP 200 from Vercel during this slice. No deployment or alias was changed.

## Files and interfaces to preserve

- Feature skills and agents: `.claude/skills/feature*`, `.claude/agents/implementer.md`.
- Flow scripts: `.claude/skills/feature/scripts/start.sh`, `ship.sh`, and `promote.sh`.
- Handoff runtime: `.claude/skills/feature-handoff/`, `.claude/hooks/feature-handoff.sh`, and the `.agents/skills/feature-handoff` symlink.
- Configuration and policy: `.claude/settings.json`, `.githooks/`, `.gitignore`, and `AGENTS.md`.

Planning and QC may extend these contracts but must not introduce a competing run-state file, change the meaning of `baseSha`, bypass the retained target, load cross-branch handoffs, or weaken the final gate and protected-branch rules.

## Verification completed by Codex

- Shell syntax passed for all new/changed flow scripts and Git hooks.
- Node syntax passed for `state.mjs`.
- `.claude/settings.json` parses successfully.
- `git diff --check` passed.
- The `.agents/skills/feature-handoff` symlink resolves to the Claude skill.
- A temporary repository exercised state initialization, bounded capture, exact-branch hook injection, stale-HEAD rejection, and branch-local clear.
- Local hooks were exercised in isolated repositories for protected/unprotected fast-forwards, rewrites, deletions, missing ancestry, and SHA-1/SHA-256 zero OIDs.
- A temporary bare remote exercised both promotion hops. Each created a normal two-parent merge, preserved destination history, advanced only the intended remote ref, and emitted the exact SHA required for deployment verification.
- GitHub ruleset `19644133` was queried after creation and returned active enforcement, the three exact refs, no bypass actors, and the two intended rules.
- `core.hooksPath` was queried after repair and returned `.githooks`.
- `pnpm lint` passed with no findings.
- `pnpm build` passed: production compilation, TypeScript, page-data collection, and all 20 static pages completed successfully.

## Known limitations and intentionally deferred work

- No live feature start, QC run, ship, cleanup, or promotion was executed.
- Local Vercel CLI authentication was not usable for an exact deployment-SHA inspection. Future promotion is therefore required to verify the exact SHA through the installed deployment skill before advancing.
- Legacy branches without the new trailers, including `ft/67`, are deliberately not auto-deleted.
- The handoff is a bounded checkpoint, not transcript recovery. Conversation-only decisions made after capture require another explicit `/feature-handoff`.
- Planning and QC council/model behavior remains Claude's work.

## Instructions for Claude

1. Read this document and inspect the Codex commit before editing.
2. Use a background read-only agent to check syntax, Claude Code frontmatter/hook semantics, state transitions, and script/skill agreement. Do **not** invoke `/feature`, `/feature-plan`, `/feature-qc`, `/feature-ship`, a live start, a live ship, cleanup, or promotion as validation.
3. Implement the planning and QC workflow decisions from the existing Claude conversation while preserving the interfaces above.
4. Teach QC to resolve its diff boundary from `state.baseSha` for direct-dev mode and retain existing tracked-run behavior.
5. Re-run static checks and temporary-repository fixtures after integrating both halves.
6. Delete `CODEX-FEATURE-FLOW-HANDOFF.md` before final shipment; it is not permanent product documentation.
