---
name: feature-fix
description: >-
  QC step 3 of 5, hop-anywhere: apply the latest QC findings round plus its
  browsed report's failures (or owner-reported triage items) on the ft branch
  (one fixer per file group, gates re-run, residual lint) and record what was
  applied on the issue. Use standalone (/feature-fix) after a find round from
  any session/app, or let /feature-qc chain it. Harness-neutral: runs in
  Claude Code or Codex.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Fix: apply the adjudicated round

## Dials (per harness)

| Work | Claude Code | Codex |
|---|---|---|
| Ordinary fix group | `fixer`, `model: sonnet` | `cx_fixer` |
| Risk-path fix group (auth, money, posting, schema/migration, new trust boundary) | `fixer` on `model: opus` | spawn `cx_fixer` on `gpt-5.6-sol` high |
| Residual lint | `feature-lint` (fixes inline) | `cx_fixer` per file group |

## 1. Brief

* **Brief source:** the newest `## QC round <R>` findings comment on the ft
  issue that has no matching `## QC round <R>` fixes comment yet, PLUS the
  same round's `browsed` comment when one exists: its fix-ready failure
  briefs join the findings in the same file-group dispatch. A missing
  `browsed` marker is reported in the fixes comment as "browse not run this
  round", never silently ignored. Read ONLY the QC marker comments (a full
  `--comments` read is 30k+ tokens and truncates):

```bash
gh api repos/{owner}/{repo}/issues/<N>/comments --paginate \
  --jq '[.[] | select(.body|startswith("## QC round"))] | .[-4:] | .[].body'
```

* **Owner triage mode:** when the owner brought manual-test findings
  directly, their words are the brief. Owner findings are binding: no
  push-back, no deferral unless they explicitly say an item can wait.
* **The comment is the contract:** nothing from the find session's
  conversation is needed.
* **Empty round:** zero accepted findings AND zero browse failures =
  dispatch nothing; still post the round's fixes marker recording "nothing
  to apply". The marker must exist for every round: verify and resume
  detection read it, and its absence reads as a skipped step.

## 2. Apply

### A. Dispatch

* **Applying is not adjudicating: dispatch it.** One fixer per DISJOINT FILE
  GROUP: bundle every accepted finding that touches the same files into one
  brief (the findings' text, technical + plain-terms lines, IS the brief).
  Per-finding fixers re-read the same files N times and serialize behind each
  other on overlaps, so the group is the dispatch unit.
* **Grouping:** union findings whose touched-file sets overlap (transitively)
  into one group. A group containing any risk-path finding runs on the
  risk-path dial for the whole group.
* **Parallelism:** groups are disjoint by construction: dispatch them ALL in
  parallel; there is no serial case.
* **Fixer contract:** minimal correct fix, match surrounding idiom,
  `tsc --noEmit` clean on touched files, STOP and report if the brief turns
  out to need a design decision. A new numeric limit, threshold, cap, or
  other product-visible constant NOT spelled out verbatim in the brief IS a
  design decision by definition: stop, never pick a value (a fixer once
  silently capped how much of an article the product reads).
* **`owner-decision` findings are never dispatched:** list them in the fixes
  comment as awaiting the owner's pick; they surface again at verify's
  "Surfaced, not fixed" section.
* **Schema changes escalate, and never land half-applied:** a fix needing a
  migration is feature-qc's escalation case: STOP and present options first.
  If approved, the SAME round applies it to the Supabase project (MCP
  `apply_migration`), regenerates types, and verifies the touched query
  shape; a committed migration file alone crashes every runtime surface
  that reads the new column.
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

* **Per finding:** `fixed — <file:line at the checkpoint commit>` (what
  changed, one sentence) or `skipped` (why, e.g. escalated as a design
  call). The anchors are load-bearing: verify reads them instead of
  re-deriving every fix's location (round 5's verify spent ~60% of its
  tokens reconstructing anchors this comment already could have carried).
* **Plus:** any behavior-changing lint flags from phase 2, subsection C.
* **Audience:** this comment is what `/feature-verify` and the owner read.

## 4. Exit

* **Standalone:** STOP. Summarize applied/skipped, then hand off with the
  exact next command AND its dial from feature-qc's step-dial table: next is
  `/feature-docs` (`$feature-docs` in Codex) on the normal dial, then
  `/feature-verify` (`$feature-verify`) on the smart dial. A handoff naming
  a command without its dial is incomplete (the dial line is load-bearing,
  per feature-qc).
* **Under `/feature-qc`:** continue into feature-docs.
