---
name: ship
description: >-
  The ship gate, standalone, same file in Claude Code (/ship <N>) and Codex ($ship <N>). Use when the user says /ship <N> or $ship <N>, "ship it",
  or "close the slice" on a finished branch, after independent integration QC PASS proof
  exists. Ship closes the issue once the squash lands on beta.
argument-hint: "[issue#]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(python3 *) Bash(pnpm *) Skill
model: inherit
disable-model-invocation: true
---

# Ship: independent PASS proof, owner walk, squash to beta

## 0. Confirm the target and settle meta changes

Before writing anything, confirm the active checkout is the requested `ft/<N>` or `bf/<N>` and no supervisor or build owns its writer lease. Refuse a wrong target or active writer without switching. Then sweep process and documentation paths into one commit on that canonical branch and push it, whether or not this session touched them: `.claude/`, `.codex/`, `.agents/`, `.grok/`, `.github/`, `docs/`, and root `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, `README.md`. (`.feature/` is git-ignored wholesale by its own `.gitignore`, so there is never anything to commit there.)

```bash
python3 .claude/scripts/writer-lease.py run --repo "$PWD" --run-id ship-meta-<N> -- bash -euc '
while IFS= read -r -d "" p; do
  case "$p" in
    .claude/*|.codex/*|.agents/*|.grok/*|.github/*|docs/*|AGENTS.md|CLAUDE.md|DESIGN.md|README.md) ;;
    *) printf "ship: staged non-metadata path preserved: %s\n" "$p" >&2; exit 1 ;;
  esac
done < <(git diff --cached --name-only -z --no-renames)
for p in .claude .codex .agents .grok .github docs AGENTS.md CLAUDE.md DESIGN.md README.md; do
  if [ -e "$p" ]; then git add -A -- "$p"; fi
done
git diff --cached --quiet || { git commit -m "meta: sweep before ship (#$1)" && git push origin HEAD; }
' -- <N>
```

(The guard runs inside the lease and rejects staged non-metadata paths without unstaging or changing them. Rename detection is disabled so both old and new paths are checked. A pathspec that does not exist makes `git add` fail wholesale, hence the existence filter.) Nothing staged means nothing to do; move on. This commit changes HEAD. If it follows QC, exact-commit proof must be renewed before ship.

## 1. Guard

* **Canonical target:** the active checkout must already be `ft/<N>` or `bf/<N>`. Refuse a wrong target without switching, and refuse an active repository writer lease. Ship is a separate owner-triggered action after the acceptance walk.
* **Independent integration PASS:** run the script's read-only proof validator before shipping:

```bash
gh issue view <N> --json comments | python3 .claude/scripts/qc-proof.py --commit "$(git rev-parse HEAD)"
```

It requires the latest integration QC marker to carry `Result: PASS` and `Reviewed-Commit: <SHA>` matching the shipping HEAD. A fix build's comment, a generic done heading or a component PASS never qualifies. Any later commit, including a meta sweep, requires fresh independent QC proof. Missing or stale proof is a STOP with the concrete reason; route to `/qc <N> --integration`.

* **Direct owner exception:** the normal script requires independent proof and has no override flag. If the owner explicitly says "ship anyway", record his exact instruction and route the exception to the host as a separately scoped action. Never fabricate PASS, imply that the normal guard was satisfied, or silently bypass the script. A green build or fix-applied comment authorizes no exception.

## 2. The gate ✋

Show the complete `git status --short --untracked-files=all` (everything listed will be staged) and name the terminal target in plain words. Also read the local detailed plan `.feature/plan-<N>.md` and every component slice `.feature/plan-<N>/<component>.md` (the issue carries only the plain plan) and, where a slice has a `## 4. Owner does at ship` part, list those items verbatim in plain words: they are the owner's own operations (Vercel env and dashboard toggles) and nothing in the flow executes them; the owner does them around this ship. The owner's own invocation saying ship ("/ship", "ship it") IS the authorization: show the inventory, do not wait for a second yes. Ambiguous invocation: ask once. A green build is never permission.

## 3. Ship

```bash
.claude/scripts/ship.sh <issue#> "<feature summary>"
```

The script owns the mechanics: inventory, staging, recovery snapshot, non-force push, one squash commit on `beta` with its trailers, and, once that push is verified, closing issue N. A recovery snapshot of dirty files changes HEAD; the script then refuses stale QC proof without pushing and preserves that local commit for review. On a conflict STOP: explain whether both intentions can coexist and offer exactly three resolutions (preserve both, prefer beta, prefer the feature); never a destructive reset.

The close is the script's job, not yours: never run `gh issue close` by hand here. If the script prints the `WARNING: ... could not be closed` line, the slice still shipped; say so in one line and close it manually.

**No promotion to `main` here.** Since 2026-08-18 `main` moves only through the weekly pull request `/promote` (or `$promote` in Codex) opens from `beta` for the owner's mentor to review; ship never runs `promote.sh beta main` and never pushes `main`.

The beta push IS the job. Never check, poll, or watch a deployment; the owner looks at the live app themselves.

Preserve the issue's plan, run, review and disposition evidence after the push. Do not remove shared lane folders or another issue's records. Operational `.feature` files remain available for follow-up amendments; owner-readable records belong under `scratch/feature-flow/<N>/`.

## 4. Stop: the slice is closed

The push closed the issue. Do NOT run finalize. End with:

<exit-example>

Shipped to beta and closed issue N. Check it on localhost when you get a chance; slices touching the external network get a two-minute check of the affected journey (server egress differs from localhost). It reaches production with this week's `/promote` pull request. The plan files stay on disk in case you want an `/amend`, say the word and I archive the issue records.

</exit-example>

Stop there. `.feature/` still holds `plan-<N>*.md`, `amend-<N>-*.md`, and `fixes-<N>*.md` on purpose: if the localhost walk turns up a problem, `/amend <N>` needs them. On the owner's word, `.claude/scripts/ship.sh --finalize <issue#>` preserves an issue-scoped archive under `scratch/feature-flow/<N>/` and retains operational records for compatibility. It never wipes the shared `.feature` directory, closes another issue or deletes a branch.

## Hard rules

* Feature slices run on the active `ft/<issue#>` or `bf/<issue#>` checkout; app code never lands directly on `beta` or `main`. One carve-out: owner-directed micro-edits to instruction files and docs (`.claude/**`, `AGENTS.md`, `docs/**`) land on `beta` directly.
* `main` moves only through the ordered beta-to-main promotion; never force-push protected branches.
* **The issue closes when the slice lands on `beta`, and `ship.sh` does it.** There is no separate owner-closes step and no waiting for the localhost walk. Never close an issue by hand except to recover from the script's own printed warning.
* **No stage creates component branches or worktrees automatically, or deletes a branch as a side effect.** Keep the active canonical branch. Owner-authorized preserving cleanup is a separate action outside the stages; obsolete branches accumulating is not a required policy.
