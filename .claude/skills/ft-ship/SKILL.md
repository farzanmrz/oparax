---
name: ft-ship
description: >-
  Phase 9 of the feature flow, standalone: the ship gate. Use when the user
  says /ft-ship, "ship it", or "close the slice" on a finished branch.
  Harness-neutral: runs in Claude Code or Codex. Ship does NOT close the
  issue; the owner closes it after their production check.
argument-hint: "[issue#]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(pnpm *) Skill
model: inherit
---

# Ship: minimal guard, deterministic mechanics, owner closes

## 1. Guard

* **A `## QC round <R>: done` marker exists on the issue** (titles only, never the full thread):

```bash
gh api repos/{owner}/{repo}/issues/<N>/comments --paginate \
  --jq '.[] | select(.body|startswith("## QC round")) | (.body|split("\n")[0])'
```

* **Feature-path staleness:** commits after the latest done marker touching feature paths (`app/`, `lib/`, `components/`, `poller/`, `supabase/`, `public/`, root config) mean the proven state is not the shipping state: STOP and route to a patch round. Meta-only commits (`.claude/`, `.agents/`, `.codex/`, `docs/`, root `*.md`) never trip this.
* **Missing marker:** name it and STOP. **Owner override:** "ship anyway" is honored and recorded.

## 2. The gate ✋

Show the complete `git status --short --untracked-files=all` (everything
listed will be staged) and name the terminal target in plain words. The
owner's own invocation saying ship ("/ft-ship", "ship it") IS the
authorization: show the inventory, do not wait for a second yes. Ambiguous
invocation: ask once. A green build is never permission.

## 3. Ship

```bash
.claude/skills/ft/scripts/ship.sh <issue#> "<feature summary>"
```

The script owns the mechanics: inventory, staging, recovery snapshot,
non-force push, one squash commit on `beta` with its trailers. On a
conflict STOP: explain whether both intentions can coexist and offer
exactly three resolutions (preserve both, prefer beta, prefer the feature);
never a destructive reset.

**Promotion to `main`:** dispatch `deploy-checker` for the exact `beta_sha`
at `https://beta.oparax.ai`; failed verdict = STOP. Good verdict:

```bash
.claude/skills/ft/scripts/promote.sh beta main
```

Never watch a deployment beyond that check.

## 4. Stop: the owner closes

Do NOT run finalize and do NOT close the issue. End with:

<exit-example>

Shipped to beta (and promoted to main). Check production when you get a chance; slices touching the external network get a two-minute check of the affected journey (server egress differs from localhost). Close the issue when satisfied, or tell me and I run the finalize sweep.

</exit-example>

On the owner's word (or their issue-close), run
`.claude/skills/ft/scripts/ship.sh --finalize <issue#>`: it proves the
recovery tips still match `origin/beta`, closes the issue if still open,
and sweeps `.feature/`.

## Hard rules

* Feature slices always run on `ft/<issue#>`; app code never lands directly on `beta` or `main`. One carve-out: owner-directed micro-edits to instruction files and docs (`.claude/**`, `AGENTS.md`, `docs/**`) land on `beta` directly.
* `main` moves only through the ordered beta-to-main promotion; never force-push protected branches.
