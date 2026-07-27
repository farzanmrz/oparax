---
name: cx-feature-qc
description: >-
  Codex-native QC phase for oparax: the full quality battery over the current
  ft/<N> branch, run as one Codex session — chains the shared feature-find →
  feature-fix → feature-docs → feature-verify steps with no stops between,
  ending at the verification gate. Use in Codex when the owner says
  $cx-feature-qc or asks to run QC here. To hop between apps mid-QC, run the
  four steps individually instead.
---

# The QC battery — Codex conductor, one session, one gate

QC is four separable, harness-neutral steps — each its own skill in
`.agents/skills/` with a Codex dials row, each starting from durable state
only (the branch, the ft issue, its `## QC round <R>` comments) and ending by
writing durable state back:

1. **`$feature-find`** — gates (`qc-gates.sh`) + browser journeys + the
   review council + adjudication → `— findings` comment on the issue.
2. **`$feature-fix`** — apply the round (one `cx_fixer` per finding; sol-high
   for risk paths), gates re-run, residual lint → `— fixes` comment.
3. **`$feature-docs`** — doc sync, subtractive first → `— docs` comment
   (posted even on "no change").
4. **`$feature-verify`** — re-prove (gates + journey re-walks via
   `cx_journey_walker`) → the verification ✋ written to the owner-legibility
   contract, posted as the `— verified` comment.

**Under $cx-feature-qc, run them in that order in THIS session with no stops
between** — the chain's only gate is feature-verify's ✋ at the end. Each
step's own skill text governs it; the Codex column of its dials table names
the subagents (`cx_grounder`, `cx_journey_walker`, `cx_fixer`, plus
`pr_explorer`/`reviewer` as the internal review lane). All four markers are
posted even in this one-session chain — they are what resume detection
($cx-feature / /feature) and both ships' QC-completeness guards read.

Run this chat on `gpt-5.6-sol` high — the session model is spent on
feature-find's adjudication and feature-verify's report only; everything else
is pinned subagents, the council bridge's background terminals (grok + agy —
Codex runs no codex external lane; the native reviewer pair covers that
family), or shell scripts.

## Hard rules (bind the whole chain)

- Session model = adjudication + the final report ONLY.
- The issue's `## Weight` line is binding — read it, never re-classify.
- One combined review charter per lane; a failed lane is reported as failed,
  never as a clean pass; `AGY_EMPTY` = no-signal.
- ≤6 concurrent subagent threads.
- A dependency MAJOR upgrade, framework migration, or schema/data migration
  surfacing here → STOP and present options; never autonomous.
- Cleanup/simplification is not a QC step.
