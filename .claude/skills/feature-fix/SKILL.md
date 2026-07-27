---
name: feature-fix
description: >-
  QC step 2 of 4, hop-anywhere: apply the latest QC findings round (or
  owner-reported triage items) on the ft branch — one fixer per finding,
  gates re-run, residual lint — and record what was applied on the issue. Use
  standalone (/feature-fix) after a find round from any session/app, or let
  /feature-qc chain it. Harness-neutral: runs in Claude Code or Codex.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Fix — apply the adjudicated round

**Brief source:** the newest `## QC round <R> — findings` comment on the ft
issue (`gh issue view <N> --comments`) that has no matching
`## QC round <R> — fixes` comment yet — or, when the owner brought manual-test
findings directly, their words (owner findings are binding; no push-back, no
deferral unless they explicitly say an item can wait). Nothing from the find
session's conversation is needed — the comment is the contract.

## Dials — per harness

| Work | Claude Code | Codex |
|---|---|---|
| Ordinary fix | `implementer`-style agent, `model: sonnet` | `cx_fixer` |
| Risk-path fix (auth, money, posting, schema/migration, new trust boundary) | `model: opus` | spawn `cx_fixer` on `gpt-5.6-sol` high |
| Residual lint | `feature-lint` (its own fixer agents) | `cx_fixer` per file group |

## Apply

**Applying is not adjudicating — dispatch it.** One fixer per accepted
finding; the finding's text (technical + plain-terms lines) IS the brief.
Disjoint files → parallel; overlapping → serial. Fixer contract: minimal
correct fix, match surrounding idiom, `tsc --noEmit` clean on touched files,
STOP and report if the brief turns out to need a design decision. Mid-fix new
scope stays off the branch.

Then, in order:

1. Re-run the gates: `pnpm build` + `pnpm exec tsc --noEmit`. Red = STOP.
2. Residual lint on the changed files (safe formatting already happened via
   the write hooks): apply what Biome can't auto-fix, flagging any
   behavior-changing rule fix with one sentence of reasoning. Gate on a clean
   build again if lint changed code.
3. Commit the round as one checkpoint commit (`qc: apply round <R> fixes`).

## Record

Post `## QC round <R> — fixes` on the issue: per finding — `fixed` (what
changed, one sentence) | `skipped` (why — e.g. escalated as a design call) —
plus any behavior-changing lint flags. This is what `/feature-verify` and the
owner read.

Standalone: STOP — summarize applied/skipped and name the next hop
(`/feature-docs`, then `/feature-verify`, in either app). Under
`/feature-qc`: continue into feature-docs.
