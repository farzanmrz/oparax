---
name: bf-qc
description: >-
  Phase 4 of the bugfix flow, deep tier only, CLAUDE CODE ONLY: the whole
  charter-scoped QC round on bf/N in one session — gates, headless charter
  journeys, this session's own review, a fire-and-forget grok lane,
  adjudication, then re-brief (dispatching /bf-fix to Codex) or clear. Use
  when the user says /bf-qc N after a deep-tier /bf-fix. Fable 5 is the
  recommendation, never a gate: an owner invocation runs on the session's
  current model.
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# QC: charter-scoped evidence, judged here, one session

One Claude session over `origin/<base>...bf/<N>` (base from the brief
header). The charter in `.feature/bf-<N>-brief.md` is the WHOLE scope: no
all-journeys sweep, and no browser anywhere. This phase replaced the old
Codex-qc + Claude-judge pair: evidence and adjudication live in one head.

## 1. Price the round, then gates + the grok lane

Open by pricing the round against what remains of the 30-minute
approval-to-ship budget: cheapest evidence that proves each charter item
once, all independent proofs concurrent. Coverage never shrinks — only
the process that proves it.

```bash
bash .claude/skills/ft/scripts/qc-gates.sh origin/<base>...HEAD
```

`GATES: RED` = STOP. Then write the grok brief to
`.feature/bf-<N>-review-grok.in.txt` (diff range, the approved remedy,
the charter, the frame-attack line) and fire the lane in the BACKGROUND:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  bash .claude/workflows/council/run.sh grok bf-<N>-review-grok
```

**Fire-and-forget:** check for its output once, at adjudication time;
absent output = a dead lane recorded in the briefs. Never wait, never
retrigger.

## 2. Charter journeys (headless)

* **Prove each charter journey headlessly** with its REAL input: direct requests to the real local routes on :3000 plus the charter's DB assertions — never by driving the UI. Rendered surfaces are the owner's walkthrough, nowhere else.
* **Evidence before teardown:** every DB assertion the charter names is captured (dispatch `supabase-runner`, read-only, exact fixture ids) BEFORE any deletion; an unproven fixture is preserved, never deleted.

## 3. Review + adjudicate

Review the diff yourself against the approved remedy: correctness,
cross-file contract breaks, the charter's dispositions, security on any
touched trust boundary, needless complexity. Spot-read cited code where
contentious; 2+ independent sources = high confidence; approved-remedy
vetoes bind. **Decision-shaped findings go to the owner NOW, in plain
language,** with options and a recommendation. A failed lane is reported
as failed, never as a clean pass. Then hunt, targeted: changed files the
review was silent on, and risk paths in the diff (auth, money, posting,
schema, trust boundaries) regardless of silence.

## 4. Re-brief or clear

Accepted findings and hunt catches become
`.feature/bf-<N>-qc-r<R>-briefs.md` (fix shapes with `file:line` anchors,
owner decisions inlined, drops listed with one-line reasons, dead lanes
named). Nothing accepted = say so and hand to the owner's walkthrough.
Otherwise dispatch the fix round to Codex via the `codex-rescue`
subagent in the background — wrapper pinned to a cheap model (`sonnet`);
the Codex runtime runs it on this repo's pinned sol high, so no Fable
tokens are spent on execution. When the round's marker lands, re-run the
gates and hand the owner the walkthrough. Manual fallback:

<exit-example>

Adjudicated 4 findings: 1 accepted, 3 dropped; hunt added 0. Briefs written; fix round dispatched to Codex. I'll hand you the walkthrough when its marker lands.

</exit-example>
