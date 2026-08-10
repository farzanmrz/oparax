---
name: ft-judge
description: >-
  Phase 6 of the feature flow, CLAUDE CODE ONLY: adjudicate the QC chain's
  findings, then hunt the gaps the lanes missed, then write the fix briefs
  for /ft-fix (Codex). Use when the user says /ft-judge N after /ft-qc
  finished in Codex. Fable 5 high is the recommendation (one of exactly two
  places the smartest model pays; the other is /ft-gate on UNSURE specs),
  never a gate: an owner invocation runs on the session's current model.
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Judge: adjudicate first, then hunt what nobody found

Inputs: `.feature/qc-r<R>-findings.md`, the diff (`origin/beta...ft/<N>`),
the issue's approved decisions. Order matters: adjudication first builds the
map of what is already found, which is what makes the hunt targeted instead
of a full re-read.

## 1. Adjudicate

* **Judge every finding on its merits:** spot-read the cited code where a finding is contentious; 2+ independent sources = high confidence; lone findings weighed on their scenario; approved-decision vetoes bind. Merge cosmetic style deltas into one finding.
* **Decision-shaped findings go to the owner NOW, in plain language:** any finding whose remedy requires choosing a user-visible behavior, limit, or constant the spec does not fix is asked here, with options and a recommendation, while the owner is present. Nothing decision-shaped ever travels downstream to fix.
* **A failed lane is reported as failed, never as a clean pass.**

## 2. Hunt the gaps

Targeted, not blind: the adjudication grounding is reused.

* **Files the lanes were silent on:** changed files with zero findings get a read.
* **Interactions between confirmed findings:** the class no single-finding lane can see.
* **Risk paths in the diff:** auth, money, posting, schema, trust boundaries, regardless of lane silence.

## 3. Write the briefs, hand off

Write `.feature/qc-r<R>-briefs.md`: every accepted finding and every hunt
catch as a fix brief with a FIX SHAPE (approach + `file:line` anchor, one
or two lines, never a full patch), the owner's recorded decisions inlined,
dropped findings listed with one-line reasons. Then STOP:

<exit-example>

Adjudicated 11 findings: 8 accepted, 3 dropped; gap hunt added 2. Briefs written. Now switch to Codex on gpt-5.6-sol high and run:

```
/ft-fix 118
```

</exit-example>
