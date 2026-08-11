---
name: bf-adj
description: >-
  Phase 2 of the bugfix flow, deep tier only, CLAUDE CODE ONLY, Fable 5
  recommended:
  cold-adjudicate the /bf-plan brief against its own read and both
  critiques, present the plain-language screen, and on yes write the issue
  and cut bf/N. Use when the user says /bf-adj N after a deep-tier /bf-plan.
  A fresh session on Fable 5 is the recommendation, never a gate: an owner
  invocation runs wherever it is made.
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *)
model: inherit
---

# Adjudicate cold: own verdict first, then the critiques

Price approval-to-ship against 30 minutes of process wall-clock: strip
redundant proof and ceremony from the charter you approve — never the
remedy or its coverage.

Session (advisory): a fresh session keeps the read cold. Invoked inside
the planning conversation, run anyway and note in one line that the read
is warm; never refuse or delay.

Inputs: `.feature/bf-<N>-brief.md`, the issue,
`.feature/bf-<N>-critique-grok.out.json`,
`.feature/bf-<N>-critique-codex.out.json`. A missing or dead lane is
relaunched (env-complete commands in bf-plan phase 4C) and reported, never
silently skipped.

## 1. Own verdict, critiques UNOPENED

Reading critiques first anchors the judge, so this order is binding:

* **Verify the mechanism:** spot-read every `file:line` the brief cites; confirm the code actually behaves as diagnosed.
* **Attack the frame:** name the input or condition the remedy never mentions.
* **Record own findings** before opening either critique file.

## 2. Adjudicate all lanes

* **Own findings are a peer lane:** judged on the same merits as the others; drop a `self` point as readily as a `grok` one.
* **Per-finding one-liners:** accept or reject, labeled by lane (`grok`, `sol`, `self`).

## 3. The owner screen (plain language only)

* **The changes:** what a user experiences, per state and failure, with exact copy.
* **The test plan read out:** each charter journey as one plain line, DB checks in words, which lanes QC runs. The owner amends the charter here; their yes freezes it.
* **Open judgment calls,** each with a recommendation.
* **The lane verdict lines.** No file paths, no technical prose on this screen.

## 4. Close on yes

Finalize the brief, compose `.feature/bf-<N>-issue.md` (the five-line bug
body + `## Approved remedy` + the charter + adjudication one-liners), then:

```bash
bash .claude/skills/ft/scripts/start.sh --prefix bf --issue <N> .feature/bf-<N>-issue.md
```

**Hotfix (`base: main` in the brief):** start.sh cuts from beta only, so
update the issue and cut the branch directly:

```bash
gh issue edit <N> --body-file .feature/bf-<N>-issue.md
```

```bash
git switch --create bf/<N> --no-track origin/main
```

Then STOP:

<exit-example>

Issue #N approved, `bf/N` cut. Fix dispatched to Codex via `codex-rescue`
(cheap wrapper; Codex runs this repo's pinned sol high) — I'll report when
its round marker lands. Manual fallback: run `/bf-fix N` in Codex.

</exit-example>
