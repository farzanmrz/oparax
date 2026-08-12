---
name: bf-qc
description: >-
  Phase 4 of the bugfix flow, deep tier only, CLAUDE CODE ONLY: the whole
  charter-scoped QC round on bf/N in one session — gates, headless charter
  journeys, this session's own review, a fire-and-forget grok lane,
  adjudication, then re-brief (STOP with /bf-fix named — the owner
  triggers it in Codex or Claude Code) or clear. Use
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

* **Prove each charter journey ONCE, cheaply, headlessly** with its REAL input: a direct request to the real local route on :3000 plus the charter's DB assertion. One pass per journey; the owner and real users are the deep test — never a suite, never a benchmark.
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
Otherwise STOP — no dispatching, no background subagents, no waiting.
The owner triggers the fix themselves; this session's last words name
the next command and where it can run:

<exit-example>

Adjudicated 4 findings: 1 accepted, 3 dropped; hunt added 0. Briefs at `.feature/bf-N-qc-r1-briefs.md`. Next: `/bf-fix N` — Codex (recommended dial: sol high) or Claude Code, your pick. After the fix round, re-run `/bf-qc N` here.

</exit-example>
