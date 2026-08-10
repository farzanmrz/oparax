---
name: ft-qc
description: >-
  Phase 5 of the feature flow, CODEX ONLY: the QC chain over the current ft
  branch in ONE session: gates, deep review plus the grok lane, scripted
  journey browse with the built-in browser, DB assertions before teardown,
  then a deduped findings file for /ft-judge (Claude Code). Use when the
  user says /ft-qc or "run QC" on a built branch. Adjudication is not done
  here: judging is /ft-judge's job.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# QC chain: collect all the evidence, judge none of it

One Codex session (recommended dial `gpt-5.6-sol` high, advisory, never a gate) over `origin/beta...ft/<N>`. This
chain COLLECTS: review findings, rendered evidence, database evidence. It
never adjudicates and never fixes; its product is one findings file.

**First-use check (once, then delete this line's ceremony):** before the
first round ever run from Codex, prove the grok wrapper launches from this
harness:

```bash
bash .claude/workflows/council/selftest.sh --if-changed grok
```

If the lane cannot launch here, the fallback is the owner pointing their own
grok session at the findings file; report which path ran.

## 1. Gates + review

```bash
bash .claude/skills/ft/scripts/qc-gates.sh
```

`GATES: RED` = STOP. Then, in parallel:

* **Grok lane, background:** brief to `.feature/review-r<R>-grok.in.txt` (diff range, acceptance criteria from the issue, distilled guards read from the touched code, the frame-attack line: "name a real input or condition this feature now faces that no code path handles"), then launch:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  bash .claude/workflows/council/run.sh grok review-r<R>-grok
```
* **Native deep review, this session:** spawn `pr-explorer` to map and evidence the changed code paths, then `reviewer` judges requirement by requirement against that evidence. Charter: correctness, cross-file contract breaks, acceptance criteria, the spec's input-space dispositions (a claimed-handled class with no code path is a top finding), security (authz, injection, secrets, trust boundaries), races, error paths, AND needless complexity, duplication, or missed reuse (simplification findings are findings). Undiffed code is in scope where the change composes with it.

## 2. Journey browse (built-in browser)

* **Script the rails, judge with eyes:** deterministic steps do login (test user from `AGENTS.md`) and navigation; the model judges what renders. Drive every `QC-LIVE` journey from the issue's approved decisions with its REAL input (the modal and laziest inputs verbatim, trailing spaces included), at 1280x800 and 375x812.
* **Screenshot judgment:** capture the changed surfaces at both viewports and judge the images against root `DESIGN.md` and the spec's stated product decisions (spacing, states, hierarchy, mobile containment). This replaces the retired code-trace design critic.
* **Server-side effects run through localhost:** onboarding, polling, and outbound fetches are exercised by driving the UI; the server reaches the real network. "Needs the external network" alone never disqualifies a journey.
* **Evidence before teardown, always:** for every fixture created, capture the browser verdicts AND the database assertions the journeys require (dispatch `supabase-runner`, read-only, with the exact fixture ids) BEFORE any deletion. A fixture with an unproven assertion is preserved and its ids recorded, never deleted. Teardown (service-role, exact captured ids, test-owner guard) runs only after all evidence is durable.

## 3. Dedupe and hand off

Merge this session's findings with grok's by file+line (mechanical merge
only, no judgment calls), collect the journey verdicts and screenshots, and
write `.feature/qc-r<R>-findings.md`: findings with file:line and failure
scenarios, per-journey verdicts with evidence, per-lane counts, anything a
lane failed to deliver. Then STOP:

<exit-example>

QC evidence collected: 11 findings (7 native, 4 grok), 5 journeys (4 PASS, 1 FAIL), DB assertions captured. Now switch to Claude Code on Fable 5 high and run:

```
/ft-judge 118
```

</exit-example>
