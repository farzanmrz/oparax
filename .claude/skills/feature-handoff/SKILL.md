---
name: feature-handoff
description: >-
  Capture or clear a bounded, branch-scoped checkpoint for continuing an active
  feature in a fresh Claude Code session. Use only when the user explicitly invokes
  /feature-handoff; this is a lean continuity snapshot, not a transcript export.
argument-hint: "[capture | clear]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Read Write
model: sonnet
effort: medium
user-invocable: true
disable-model-invocation: true
---

# Feature handoff — bounded session continuity

Create one safe checkpoint for the exact current branch. The deterministic helper is
`.claude/skills/feature-handoff/scripts/state.mjs`; it owns paths, validation,
fingerprinting, size limits, atomic replacement, and cleanup.

## Clear

When `$ARGUMENTS` is `clear`:

1. Read the exact branch with `git branch --show-current`; stop on detached HEAD.
2. Run `node .claude/skills/feature-handoff/scripts/state.mjs clear --branch "<branch>"`.
3. Report that only that branch's checkpoint was removed, then stop.

## Capture

1. Read the current branch and HEAD. Run the helper's `show --branch "<branch>"`.
2. If state is missing, initialize it before writing the handoff:
   - `ft/<N>` → mode `tracked`, issue `N`, approved-plan reference `issue:#N`, and
     base SHA from `git merge-base HEAD origin/dev`.
   - `dev` → mode `current`, issue omitted. Use the saved start SHA from the current
     conversation or feature artifacts as base SHA. If it cannot be recovered, use
     current HEAD and explicitly record in Open issues that QC cannot reconstruct
     earlier direct-mode work.
   - Reject every other branch. Default the terminal target to `dev` only when the
     conversation did not already retain `beta` or `main`.
   - Invoke `init` with explicit `--mode`, `--branch`, optional `--issue`,
     `--base-sha`, `--source-tip`, `--phase`, `--gate`, `--target`, and
     `--approved-plan` arguments. Source tip must be current HEAD.
3. Run `path --branch "<branch>"`. Write a new `handoff.next.md` in the returned
   directory using exactly this structure:

   ```markdown
   # Feature handoff

   ## Objective and canonical sources
   ## Checkpoint
   ## Decisions and approvals
   ## Implemented state
   ## Verification
   ## Open issues
   ## Next safe action
   ```

4. Synthesize only durable facts needed to resume:
   - Summarize the objective and point to canonical repo/issue paths.
   - Name the current phase, completed work, explicit approvals, verification results,
     unresolved blockers, and one next safe action.
   - Do not include secrets or environment values, raw transcripts, raw diffs, hidden
     reasoning, large logs, `.feature/` contents, speculative conclusions, or repeated
     background. Never quote credentials even when redacted.
5. Run `capture --branch "<branch>" --input "<returned-path>/handoff.next.md"`,
   passing changed `--phase`, `--gate`, `--target`, or `--approved-plan` metadata when
   needed. Capture rejects unsafe shapes and anything over 7,000 bytes, atomically
   replaces `handoff.md`, deletes the draft, and seals current HEAD plus worktree
   fingerprint.
6. Report the checkpoint path, phase, next gate, and terminal target. Do not paste the
   whole handoff back into chat.

## Invariants

- Never append. Each capture replaces the prior handoff for that exact branch.
- Never load or copy another branch's checkpoint as a fallback.
- Use `/resume` or `/branch` when exact conversation history is required; this skill
  intentionally preserves much less.
- `update` is for flow scripts changing phase metadata. It deliberately marks the
  prose handoff stale until the next capture.
