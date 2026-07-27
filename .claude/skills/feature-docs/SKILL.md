---
name: feature-docs
description: >-
  QC step 3 of 4, hop-anywhere: the doc-sync pass over AGENTS.md,
  .claude/rules/, and skills after a QC fix round — subtractive first, default
  no change. Use standalone (/feature-docs) in any session/app after
  /feature-fix, or let /feature-qc chain it. Harness-neutral.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Docs — sync the instruction files to the shipped reality

**Input:** the branch diff plus the staleness findings in the latest
`## QC round <R> — findings` comment on the ft issue (reviewers flag
instruction-file lines the diff falsified). Dispatch ONE agent — Claude Code:
`model: sonnet`, `effort: high`; Codex: `cx_fixer` — with that input.

**Subtractive first; the default outcome is NO change.**

- Subtract any AGENTS.md / `.claude/rules/*.md` / skill line the diff
  falsified or made code-recoverable (a fact the code now states is not worth
  a doc line).
- Add ONLY a genuine non-recoverable keeper: a new guard, a retired pattern
  with its reason, a new trust boundary. Single-source every fact — if it
  lives in the code map, it doesn't also live in a rule.
- Never document scaffolding the slice deleted, and never let a doc line
  drift from the one place it cites.

If anything changed: commit it (`qc: doc sync round <R>`) and note the edits
in one sentence each. If nothing changed, say so — that is the expected
outcome most rounds.

Standalone: STOP — name the next hop (`/feature-verify`, either app). Under
`/feature-qc`: continue into feature-verify.
