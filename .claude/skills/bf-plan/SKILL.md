---
name: bf-plan
description: >-
  Phase 1 of the bugfix flow, CLAUDE CODE ONLY: intake a defect, pick the
  tier (quick, small, deep), capture evidence before any code change, and
  author the brief plus test charter; the cheap tiers close with the owner
  right here. Use when the user says /bf-plan, "fix this bug", reports
  broken behavior, or pastes a defect report or user DM. Not for new
  capabilities (/ft-plan) and not for cold adjudication (/bf-adj).
argument-hint: "[issue# | the bug in the owner's words]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Plan: evidence, tier, brief

Recommended dial: Sonnet 5 or Opus 4.8 (Opus for deep-tier discussions);
Fable is better saved for the /bf-adj cold read. Advisory only: an owner
invocation runs NOW on whatever model the session has, with at most a
one-line note of the mismatch. Never block, question, or delay the skill
over the model or the session's history.

## 1. Intake and tier

* **The bug issue is five lines,** authored here (or a bare owner-filed issue enriched): observed vs expected, evidence pointers, severity (is a live user blocked now), suspected area. Label `bug`.
* **Propose the tier; the owner confirms in a word.** The tier is recorded as a `tier:` header line in the brief; downstream skills read it, never infer it.

| Tier | When | What runs after plan |
|---|---|---|
| quick | obvious one-liner, correct behavior trivial | /bf-fix, owner walk, /bf-ship |
| small | routine fix deserving a sanity check | low-dial critiques adjudicated in-session, /bf-fix (charter QC embedded), /bf-ship |
| deep | conceptual, judgment-shaped, or risk paths (auth, money, posting, schema) | high-dial critiques, /bf-adj (Fable), /bf-fix, /bf-qc (Fable), /bf-ship |

* **Hotfix flag:** production is broken NOW and beta carries unshipped work: record `base: main` in the brief header (default `base: beta`). The branch then cuts from `origin/main` and /bf-ship runs hotfix mode.

## 2. Evidence before code

* **Reproduce or locate the artifact FIRST, without a browser:** pull the exact broken rows (dispatch `supabase-runner`: the draft row, its `item` jsonb, the source post), hit the failing route directly (curl against :3000 — anything listening there is this app: reuse it, else start it), or take the owner's own demonstrated repro as the record. Never drive the UI to reproduce. No repro and no artifact = STOP and report what was tried; never fix against a description.
* **Conversion guard:** a remedy that would grow a capability, column, or model behavior was never a bug; stub it with /ft-plan instead.

## 3. Author the brief

Deep tier: discussion first; correct behavior is DEFINED in the owner's
words before any remedy is drafted. Then write `.feature/bf-<N>-brief.md`:

* **Header lines:** `tier:` and `base:`.
* **Mechanism** with `file:line`: why the behavior happens, not where it shows.
* **Remedy** as fix shapes (approach + anchor, never a patch).
* **Test charter:** the journeys with REAL inputs (provable headlessly: direct requests and DB assertions — anything only rendered eyes can judge is an owner walkthrough item, never a QC journey), the DB assertions, and which review lanes QC runs. This becomes /bf-qc's whole scope and the owner's walkthrough list.
* **Self-contained,** including a plain-language owner summary: the critics and /bf-adj read only this file, never this conversation.
* **Surfaces are evidence-bound:** the brief names only surfaces reproduced in this session's own evidence; `@AGENTS.md`'s product prose is direction, never proof a surface exists.

## 4. Close per tier

Critique lanes, where a tier fires them: brief each lane to
`.feature/bf-<N>-critique-<lane>.in.txt` (the brief + "verify the mechanism
against the code, attack the remedy, and ATTACK THE FRAME: name a condition
this brief never mentions that a real user will produce"). First-ever lane
use from this flow:

```bash
bash .claude/workflows/council/selftest.sh --if-changed grok codex
```

A lane that dies is reported, never silently skipped.

### A. quick

Present the mini-screen in plain words (what changes, what will be checked). On yes:

```bash
bash .claude/skills/ft/scripts/start.sh --prefix bf --issue <N> .feature/bf-<N>-issue.md
```

(`bf-<N>-issue.md`: the five lines + the approved remedy and charter). Then STOP:

<exit-example>

Issue #N approved, `bf/N` cut. Now switch to Codex on gpt-5.6-terra high and run:

```
/bf-fix N
```

</exit-example>

### B. small

* **Fire both lanes at the low dials:**

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=medium \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh grok bf-<N>-critique-grok
```

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_MODEL=gpt-5.6-terra COUNCIL_DEPTH=deep \
  COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh codex bf-<N>-critique-codex
```

(verify the terra model id on the first run; the codex lane errors visibly on a wrong id)
* **Wait for both `.out.json` files, then adjudicate in-session:** per-finding accept/reject lines shown to the owner. **Escalation rule:** a lane challenging the remedy's FRAME (wrong mechanism, not a nitpick) = STOP and promote the slice to deep (/bf-adj takes it from here).
* **Owner screen, then close exactly as tier quick** (same start.sh command, same /bf-fix handoff on gpt-5.6-terra high).

### C. deep

Fire both lanes at high as the LAST act, then stop:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh grok bf-<N>-critique-grok
```

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh codex bf-<N>-critique-codex
```

<exit-example>

Brief drafted; both critiques running in the background. Now open a FRESH Claude Code session on Fable 5 and run:

```
/bf-adj N
```

</exit-example>
