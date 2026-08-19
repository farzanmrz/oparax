---
name: ship
description: >-
  The ship gate, standalone, same file in Claude Code (/ship <N>) and Codex ($ship <N>). Use when the user says /ship <N> or $ship <N>, "ship it",
  or "close the slice" on a finished branch, after /qc's round marker
  exists. Ship does NOT close the issue; the owner closes it after their
  production check.
argument-hint: "[issue#]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(pnpm *) Skill
model: inherit
---

# Ship: minimal guard, deterministic mechanics, owner closes

## 0. Meta and docs sweep (always, first, unconditional)

Before any guard, sweep every process and documentation path into one commit on the CURRENT branch and push it, whether or not this session touched them: `.claude/`, `.codex/`, `.agents/`, `.grok/`, `.github/`, `docs/`, and root `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, `README.md`. (`.feature/` is git-ignored wholesale by its own `.gitignore`, so there is never anything to commit there.)

```bash
for p in .claude .codex .agents .grok .github docs AGENTS.md CLAUDE.md DESIGN.md README.md; do [ -e "$p" ] && git add -A -- "$p"; done; git diff --cached --quiet || { git commit -m "meta: sweep before ship (#<N>)" && git push origin HEAD; }
```

(A pathspec that does not exist makes `git add` fail wholesale, hence the existence filter.) Nothing staged means nothing to do; move on. This commit touches meta paths only, so it never trips the staleness rule below.

## 1. Guard

* **A `## QC round <R>: done` marker exists on the issue** (titles only, never the full thread):

```bash
gh api repos/{owner}/{repo}/issues/<N>/comments --paginate \
  --jq '.[] | select(.body|startswith("## QC round")) | (.body|split("\n")[0])'
```

* **Feature-path staleness:** commits after the latest done marker touching feature paths (`app/`, `lib/`, `components/`, `poller/`, `ingest/`, `supabase/`, `public/`, root config) mean the proven state is not the shipping state: STOP and route to another `/qc <N>` round. Meta-only commits (`.claude/`, `.agents/`, `.codex/`, `docs/`, root `*.md`) never trip this.
* **Missing marker:** name it and STOP. **Owner override:** "ship anyway" is honored and recorded.

## 2. The gate ✋

Show the complete `git status --short --untracked-files=all` (everything listed will be staged) and name the terminal target in plain words. Also read the local detailed plan `.feature/plan-<N>.md` (the issue carries only the plain plan) and, if it has a `## 4. Owner does at ship` part, list those items verbatim in plain words: they are the owner's own operations (Vercel env, Railway redeploys, dashboard toggles) and nothing in the flow executes them; the owner does them around this ship. The owner's own invocation saying ship ("/ship", "ship it") IS the authorization: show the inventory, do not wait for a second yes. Ambiguous invocation: ask once. A green build is never permission.

## 3. Ship

```bash
.claude/scripts/ship.sh <issue#> "<feature summary>"
```

The script owns the mechanics: inventory, staging, recovery snapshot, non-force push, one squash commit on `beta` with its trailers. On a conflict STOP: explain whether both intentions can coexist and offer exactly three resolutions (preserve both, prefer beta, prefer the feature); never a destructive reset.

**No promotion to `main` here.** Since 2026-08-18 `main` moves only through the weekly pull request `/promote` (or `$promote` in Codex) opens from `beta` for the owner's mentor to review; ship never runs `promote.sh beta main` and never pushes `main`.

The beta push IS the job. Never check, poll, or watch a deployment; the owner looks at the live app themselves.

Right after the push, delete the branch's scratch: `.feature/lanes/`, `.feature/*dispositions*.md`, `.feature/issue-body.md`, and any draft files. Keep only `.feature/plan-<N>*.md`, `.feature/amend-<N>-*.md`, and `.feature/fixes-<N>*.md` until finalize (below), which wipes the directory.

## 4. Stop: the owner closes

Do NOT run finalize and do NOT close the issue. End with:

<exit-example>

Shipped to beta. Check beta.oparax.ai when you get a chance; slices touching the external network get a two-minute check of the affected journey (server egress differs from localhost). It reaches production with this week's `/promote` pull request. Close the issue when satisfied, or tell me and I run the finalize sweep.

</exit-example>

On the owner's word (or their issue-close), run `.claude/scripts/ship.sh --finalize <issue#>`: it proves the recovery tips still match `origin/beta`, closes the issue if still open, and sweeps `.feature/`.

## Hard rules

* Feature slices always run on `ft/<issue#>`; app code never lands directly on `beta` or `main`. One carve-out: owner-directed micro-edits to instruction files and docs (`.claude/**`, `AGENTS.md`, `docs/**`) land on `beta` directly.
* `main` moves only through the ordered beta-to-main promotion; never force-push protected branches.
