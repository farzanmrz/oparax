---
name: bf-ship
description: >-
  The bugfix ship gate, standalone and harness-neutral: guard the marker,
  squash bf/N onto beta (normal) or onto main with a beta cherry-pick
  (hotfix), promote, and stop; the owner closes the issue after checking
  production. Use when the user says /bf-ship N or "ship the fix".
argument-hint: "[issue#]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(pnpm *) Skill
model: inherit
---

# Ship: guard, land, owner closes

## 1. Guard

* **A `## bf round <R>: done` marker exists on the issue** (titles only, never the full thread):

```bash
gh api repos/{owner}/{repo}/issues/<N>/comments --paginate \
  --jq '.[] | select(.body|startswith("## bf round")) | (.body|split("\n")[0])'
```

* **Feature-path staleness:** commits after the latest done marker touching feature paths (`app/`, `lib/`, `components/`, `poller/`, `ingest/`, `supabase/`, `public/`, root config) mean the proven state is not the shipping state: STOP and route to a patch round. Meta-only commits (`.claude/`, `.agents/`, `.codex/`, `docs/`, root `*.md`) never trip this.
* **Missing marker:** name it and STOP. **Owner override:** "ship anyway" is honored and recorded.

## 2. The gate ✋

Show the complete `git status --short --untracked-files=all` (everything
listed will be staged) and name the terminal target in plain words. The
owner's own invocation saying ship IS the authorization; ambiguous
invocation asks once. A green build is never permission.

## 3. Ship (mode from the brief's `base:` header)

### A. Normal (base beta)

```bash
.claude/skills/ft/scripts/ship.sh <issue#> "<fix summary>"
```

Dispatch `deploy-checker` for the exact `beta_sha` at
`https://beta.oparax.ai`; failed verdict = STOP. Good verdict:

```bash
.claude/skills/ft/scripts/promote.sh beta main
```

### B. Hotfix (base main)

```bash
.claude/skills/ft/scripts/ship.sh --onto main <issue#> "<fix summary>"
```

Then land the SAME commit on beta so the next promotion cannot erase it
(`<main_sha>` from ship's output line; a cherry-pick conflict = STOP and
offer the three resolutions, never a destructive reset):

```bash
git fetch origin beta
wt="$(mktemp -d)"
git worktree add --detach "$wt" origin/beta
git -C "$wt" cherry-pick <main_sha>
git -C "$wt" push origin HEAD:refs/heads/beta
git worktree remove "$wt"
```

Dispatch `deploy-checker` for `<main_sha>` at `https://oparax.ai`; report
the verdict, never watch a deployment beyond that.

## 4. Stop: the owner closes

Do NOT run finalize and do NOT close the issue. End with:

<exit-example>

Shipped. Check the affected journey on production for two minutes; close the issue when satisfied, or tell me and I run the finalize sweep.

</exit-example>

On the owner's word (or their issue-close), run
`.claude/skills/ft/scripts/ship.sh --finalize <issue#>` from `bf/<N>`.

## Hard rules

* Bug fixes always run on `bf/<issue#>`; app code never lands directly on `beta` or `main` (owner-directed micro-edits to instruction files and docs are the one carve-out).
* `main` moves only through beta-to-main promotion or the hotfix path above; never force-push protected branches.
