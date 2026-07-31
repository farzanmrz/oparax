---
name: feature-fix
description: >-
  QC step 2 of 4, hop-anywhere: apply the latest QC findings round (or
  owner-reported triage items) on the ft branch (one fixer per finding, gates
  re-run, residual lint) and record what was applied on the issue. Use
  standalone (/feature-fix) after a find round from any session/app, or let
  /feature-qc chain it. Harness-neutral: runs in Claude Code or Codex.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Fix: apply the adjudicated round

## Dials (per harness)

| Work | Claude Code | Codex |
|---|---|---|
| Ordinary fix | `fixer`, `model: sonnet` | `cx_fixer` |
| Risk-path fix (auth, money, posting, schema/migration, new trust boundary) | `fixer` on `model: opus` | spawn `cx_fixer` on `gpt-5.6-sol` high |
| Residual lint | `feature-lint` (fixes inline) | `cx_fixer` per file group |

## 1. Brief

* **Brief source:** the newest `## QC round <R>` findings comment on the ft
  issue that has no matching `## QC round <R>` fixes comment yet. Read the
  comments:

```bash
gh issue view <N> --comments
```

* **Owner triage mode:** when the owner brought manual-test findings
  directly, their words are the brief. Owner findings are binding: no
  push-back, no deferral unless they explicitly say an item can wait.
* **The comment is the contract:** nothing from the find session's
  conversation is needed.

## 2. Apply

### A. Dispatch

* **Applying is not adjudicating: dispatch it.** One fixer per accepted
  finding; the finding's text (technical + plain-terms lines) IS the brief.
* **Parallelism:** disjoint files run in parallel; overlapping files run
  serially.
* **Fixer contract:** minimal correct fix, match surrounding idiom,
  `tsc --noEmit` clean on touched files, STOP and report if the brief turns
  out to need a design decision.
* **Scope:** mid-fix new scope stays off the branch.

### B. Gates

Re-run the gates:

```bash
bash .claude/skills/feature/scripts/qc-gates.sh
```

* **Failure condition:** `GATES: RED` = STOP.
* Its residual-lint report also feeds subsection C.

### C. Residual lint

* **On the changed files only** (safe formatting already happened via the
  write hooks): apply what Biome can't auto-fix, flagging any
  behavior-changing rule fix with one sentence of reasoning.
* **Gate again:** if lint changed code, a clean build is required again.

### D. Checkpoint commit

Commit the round as one checkpoint commit with this message:

<commit-message>
qc: apply round <R> fixes
</commit-message>

## 3. Record

Post the round's fixes comment (titled `## QC round <R>: fixes`) on the
issue:

* **Per finding:** `fixed` (what changed, one sentence) or `skipped` (why,
  e.g. escalated as a design call).
* **Plus:** any behavior-changing lint flags from phase 2, subsection C.
* **Audience:** this comment is what `/feature-verify` and the owner read.

## 4. Exit

* **Standalone:** STOP. Summarize applied/skipped and name the next hop
  (`/feature-docs`, then `/feature-verify`, in either app).
* **Under `/feature-qc`:** continue into feature-docs.
