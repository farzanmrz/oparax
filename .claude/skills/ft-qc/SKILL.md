---
name: ft-qc
description: >-
  Phase 5 of the feature flow, CLAUDE CODE ONLY: the whole QC round on the
  built branch in one session — gates, headless journey evidence, this
  session's own deep review, a fire-and-forget grok lane, adjudication, gap
  hunt, fix briefs, then dispatching /ft-fix to Codex. Use when the user
  says /ft-qc after a build, or as the continuation when a gate-dispatched
  build returns. Fable 5 high is the recommendation (one of exactly two
  places the smartest model pays; the other is /ft-gate), never a gate: an
  owner invocation runs on the session's current model.
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# QC: collect the evidence, judge it, brief the fixes — one session

One Claude session over `origin/beta...ft/<N>` with the issue's approved
decisions as the requirement set. This phase replaced the old Codex-qc +
Claude-judge pair: evidence and adjudication live in one head, so no
findings file is serialized between models and no mid-tier review needs
re-checking here.

## 1. Price the round, then gates + the grok lane

Open by pricing the round against what remains of the doctrine's
30-minute gate-to-ship budget: pick the cheapest evidence that proves each
journey once, skip evidence that re-proves an already-green mechanism, and
run every independent proof concurrently. The budget never shrinks
coverage of the functionality — only the process that proves it.

```bash
bash .claude/skills/ft/scripts/qc-gates.sh
```

`GATES: RED` = STOP. Then write the grok brief to
`.feature/review-r<R>-grok.in.txt` (diff range, acceptance criteria from
the issue, distilled guards read from the touched code, the frame-attack
line: "name a real input or condition this feature now faces that no code
path handles") and fire the lane in the BACKGROUND:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  bash .claude/workflows/council/run.sh grok review-r<R>-grok
```

**Fire-and-forget is the contract:** check for its output once, at
adjudication time; absent output = a dead lane recorded in the briefs
file. Never wait on it, never retrigger it.

## 2. Journey evidence (headless — no browser, ever)

* **Prove each `QC-LIVE` journey ONCE, cheaply, headlessly** with its REAL input: a direct request to the real local route (curl against :3000). One pass per journey — the proof bar is "the feature works and can be experienced", not exhaustive coverage; the owner and real users are the deep test. Never run a multi-case suite or benchmark unless the owner ordered one.
* **Fixtures are created by API or SQL, never through the UI:** deliveries go straight to the ingest route; rows that must pre-exist are seeded via `supabase-runner`. Rendered surfaces are proven by the owner's walkthrough, nowhere else.
* **Evidence before teardown, always:** for every fixture created, capture the database assertions the journeys require (dispatch `supabase-runner`, read-only, with the exact fixture ids) BEFORE any deletion. A fixture with an unproven assertion is preserved and its ids recorded, never deleted. Teardown (service-role, exact captured ids, test-owner guard) runs only after all evidence is durable.

## 3. Review + adjudicate (this session, requirement by requirement)

Review the diff yourself against the approved decisions — correctness,
cross-file contract breaks, acceptance criteria, the spec's input-space
dispositions (a claimed-handled class with no code path is a top finding),
security (authz, injection, secrets, trust boundaries), races, error
paths, AND needless complexity, duplication, or missed reuse. Undiffed
code is in scope where the change composes with it. Spawn `pr-explorer`
to map evidence only past roughly ten changed files.

Adjudication rules: spot-read cited code where a finding is contentious;
2+ independent sources = high confidence; approved-decision vetoes bind;
merge cosmetic style deltas into one finding. **Decision-shaped findings
go to the owner NOW, in plain language,** with options and a
recommendation — nothing decision-shaped ever travels downstream to fix.
A failed lane is reported as failed, never as a clean pass.

## 4. Hunt the gaps

Targeted, not blind — the review grounding is reused: changed files with
zero findings get a read; interactions between confirmed findings; risk
paths in the diff (auth, money, posting, schema, trust boundaries)
regardless of silence.

## 5. Briefs, then dispatch the fix

Write `.feature/qc-r<R>-briefs.md`: every accepted finding and hunt catch
as a fix brief with a FIX SHAPE (approach + `file:line` anchor, one or
two lines, never a full patch), journey verdicts with evidence, owner
decisions inlined, drops listed with one-line reasons, any dead lane
named. Then dispatch the fix round to Codex via the `codex-rescue`
subagent in the background — wrapper pinned to a cheap model (`sonnet`);
the labor runs on the Codex runtime, which this repo pins to sol high, so
no Fable tokens are spent on execution. The dispatch prompt is exactly
`/ft-fix <N>` plus the briefs file path. When the round's done marker
lands, re-run the gates and hand the owner the walkthrough. If dispatch
is unavailable, fall back to the manual handoff:

<exit-example>

Adjudicated 11 findings: 8 accepted, 3 dropped; gap hunt added 2; grok lane dead (recorded). Briefs written; fix round dispatched to Codex. I'll hand you the walkthrough when its marker lands.

</exit-example>
