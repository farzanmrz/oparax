---
name: bf-qc
description: >-
  Phase 4 of the bugfix flow, deep tier only, CODEX ONLY: collect
  charter-scoped QC evidence on bf/N in one session (gates, native review,
  grok lane, the charter's journeys, DB assertions), producing a findings
  file for /bf-judge. Use when the user says /bf-qc N after a deep-tier
  /bf-fix. Adjudication is /bf-judge's job, never done here.
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# QC: charter-scoped evidence, no judgment

One session (recommended dial `gpt-5.6-sol` high, advisory, never a gate)
over `origin/<base>...bf/<N>` (base from the brief header). The charter in `.feature/bf-<N>-brief.md` is the WHOLE
scope: no all-journeys sweep, no full screenshot pass.

## 1. Gates + review

```bash
bash .claude/skills/ft/scripts/qc-gates.sh origin/<base>...HEAD
```

`GATES: RED` = STOP. Then, in parallel:

* **Grok lane, background:** brief to `.feature/bf-<N>-review-grok.in.txt` (diff range, the approved remedy, the charter, the frame-attack line), then:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  bash .claude/workflows/council/run.sh grok bf-<N>-review-grok
```

* **Native review, this session:** the diff against the approved remedy: correctness, cross-file contract breaks, the charter's dispositions, security on any touched trust boundary, needless complexity. Small diffs review inline; spawn `pr-explorer` + `reviewer` only past roughly ten changed files.

## 2. Charter journeys

* **Drive each charter journey** on :3000 (test user from `AGENTS.md`) with its REAL input; the model judges what renders.
* **Evidence before teardown:** every DB assertion the charter names is captured (dispatch `supabase-runner`, read-only, exact fixture ids) BEFORE any deletion; an unproven fixture is preserved, never deleted.

## 3. Hand off

Merge findings mechanically (file+line), write
`.feature/bf-<N>-qc-r<R>-findings.md` (findings with failure scenarios,
per-journey verdicts, per-lane counts, any lane that died), then STOP:

<exit-example>

QC evidence collected: 4 findings (3 native, 1 grok), 2 journeys PASS, DB assertions captured. Now switch to Claude Code on Fable 5 and run:

```
/bf-judge N
```

</exit-example>
