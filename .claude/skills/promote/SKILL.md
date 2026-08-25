---
name: promote
description: >-
  Open the weekly promotion pull request from beta to main, for the owner's
  mentor to review (STEM OPT training-plan requirement). Use ONLY when the
  owner explicitly says /promote (Claude Code) or $promote (Codex). It never
  merges, never touches beta, never pushes main. Not for shipping a slice
  (/ship does that, onto beta).
argument-hint: ""
allowed-tools: Bash(git *) Bash(gh *) Bash(date *)
model: inherit
disable-model-invocation: true
---

# Promote: one pull request, beta -> main, reviewed by the mentor

Since 2026-08-18, `main` moves only through a pull request from `beta`, opened by this skill on the owner's word (about once a week) and reviewed by the owner's mentor, Haiguang Li (haiguang@deepintel.us). GitHub login for the review request: `deepintel-admin` (resolved 2026-08-19 from the owner's email invite to haiguang@deepintel.us; if the owner corrects it, change it here and nowhere else). `/ship` lands slices on `beta` and stops there; it never promotes.

## 1. Preconditions, all with plain output

```bash
git fetch origin beta main
git rev-list --count origin/main..origin/beta
gh pr list --base main --head beta --state open --json number,url --jq '.[] | "\(.number) \(.url)"'
```

- Count 0: STOP. Say "beta and main are identical, nothing to promote this week" and end.
- An open PR already exists: STOP. Print its URL, say it is this week's PR already, and end. Never open a second one.

Never check out, reset, or push `beta` or `main` here; the branch you are on does not matter and does not change.

## 2. Write the PR body (plain words, for a reviewer who has not followed the work)

Collect `git log --format='%s' origin/main..origin/beta`. Split into two lists: slice commits (subjects that are not `meta:` or `promote:`, i.e. shipped features and fixes; each usually names an issue `#N`) and process commits (`meta:` subjects: skills, agent workflow, docs). Write `.feature/promote-pr.md`:

```
## Weekly promotion: beta -> main, <YYYY-MM-DD>

What shipped since the last promotion:
- <one plain line per slice commit: what changed for a user; the ship commit subject is already plain, keep it, add the issue link #N if the subject or the branch had one>

Process and tooling: <k> commits (agent skills, workflow, docs); no product change.

@deepintel-admin this is the weekly training-plan review. Nothing to run or test: a comment or an approval is all that is needed. The owner merges after that.
```

No file names, no code, no commit hashes in the body. If there are no slice commits (only meta), say so plainly in the first list ("no product changes this week; process and tooling only").

## 3. Open it

```bash
gh pr create --base main --head beta --title "Weekly promotion: beta -> main (<YYYY-MM-DD>)" --body-file .feature/promote-pr.md --reviewer deepintel-admin
```

If the reviewer request is rejected (the login is not a collaborator yet, or was changed), rerun without `--reviewer`; the `@` mention in the body still notifies him, and tell the owner in one line that the review request itself failed and why (add him as a collaborator: `gh api -X PUT repos/{owner}/{repo}/collaborators/<login> -f permission=pull`).

## 4. Hand back

Final message, three parts and nothing else:

1. The PR URL.
2. A ready-to-paste Google Chat message, exactly this shape, plain words:

   ```
   Hi Haiguang, this week's PR for the training plan: <URL>
   In short: <one sentence, what shipped for a user this week; or "process and tooling changes only, no product change">.
   Nothing to test on your side; a quick comment or approval on the PR is all I need. Thanks!
   ```

3. One line: "Once he has commented or approved, merge it with `gh pr merge <number> --merge` (a merge commit, never squash or rebase, so beta and main stay in step), or the Merge button set to 'Create a merge commit'." This skill never merges.

## Hard rules

- Manual invocation only; nothing in the flow calls this.
- Never merges, never force-pushes, never touches `beta`, never rewinds `main`.
- Never edits `.claude/scripts/promote.sh` (kept for the `bf` hotfix path only).
