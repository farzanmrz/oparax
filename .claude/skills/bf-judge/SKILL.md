---
name: bf-judge
description: >-
  Phase 5 of the bugfix flow, deep tier only, CLAUDE CODE ONLY on Fable 5:
  adjudicate the /bf-qc findings, hunt what the lanes missed, then write
  fix briefs for /bf-fix or clear the round. Use when the user says
  /bf-judge N after /bf-qc finished in Codex. Fresh session, cold read.
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Judge: adjudicate, hunt, re-brief or clear

Inputs: `.feature/bf-<N>-qc-r<R>-findings.md`, the diff
(`origin/<base>...bf/<N>`), the issue's approved remedy and charter.

## 1. Adjudicate

* **Every finding on its merits:** spot-read the cited code where a finding is contentious; 2+ independent sources = high confidence; approved-remedy vetoes bind.
* **Decision-shaped findings go to the owner NOW, in plain language,** with options and a recommendation; nothing decision-shaped travels downstream to fix.
* **A failed lane is reported as failed, never as a clean pass.**

## 2. Hunt, targeted

* **Changed files the lanes were silent on** get a read.
* **Risk paths in the diff** (auth, money, posting, schema, trust boundaries) regardless of lane silence.

## 3. Re-brief or clear

Accepted findings and hunt catches become
`.feature/bf-<N>-qc-r<R>-briefs.md` (fix shapes with `file:line` anchors,
owner decisions inlined, drops listed with one-line reasons). Nothing
accepted = say so and hand to the owner's walkthrough. Otherwise STOP with:

<exit-example>

Adjudicated 4 findings: 1 accepted, 3 dropped; hunt added 0. Briefs written. Now switch to Codex on gpt-5.6-sol high and run:

```
/bf-fix N
```

</exit-example>
