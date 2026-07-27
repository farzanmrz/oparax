---
name: feature-qc
description: >-
  Phase 3 of the feature flow, standalone: the full QC battery over the current
  feature branch, run as one session — chains feature-find → feature-fix →
  feature-docs → feature-verify with no stops between. Use when the user says
  /feature-qc, "run QC", or wants the branch proven in one sitting. To hop
  between apps/sessions mid-QC, run the four steps individually instead.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Skill
model: inherit
---

# The QC battery — one session, four steps, one gate

QC is four separable steps, each a skill of its own so the owner can run any
of them in any session or app (Claude Code or Codex) — every step starts from
durable state only (the branch, the issue, its `QC round` comments) and ends
by writing durable state back:

1. **`feature-find`** — gates + browser journeys + the cross-model review
   council + adjudication → findings posted to the ft issue.
2. **`feature-fix`** — apply the round (one fixer per finding, gates re-run,
   residual lint) → fixes recorded on the issue.
3. **`feature-docs`** — doc sync, subtractive first, default no change.
4. **`feature-verify`** — re-prove (gates + journey re-walks) → the
   verification ✋, written to the owner-legibility contract.

**Under /feature-qc, invoke them in that order in THIS session with no stops
between** — the chain's only gate is feature-verify's ✋ at the end. Each
sub-skill's own text governs its step; nothing here overrides them.

Session-model advice (the reason to start smart or switch mid-wait): the
session's own tokens are spent almost entirely in feature-find's adjudication
and feature-verify's report. Invoke on a smart dial, or start cheap and switch
(`/model`) while the external review lanes run in the background.

## Hard rules (bind the whole chain)

- Session model = adjudication + the final report ONLY. Setup, journeys,
  reviews, fixes, lint, doc sync are all dispatched with explicit
  model+effort (or the Codex subagent roster) or run in shell.
- The issue's `## Weight` line is binding — read it, never re-classify.
- One combined review charter per lane — never re-expand into per-angle ×
  per-family fan-outs, and never a separate verifier quorum.
- A failed review lane is reported as failed, never as a clean pass.
- Findings and fixes ALWAYS land as issue comments even in the one-session
  chain — the durable record is what makes hop-anywhere (and post-hoc audit)
  possible, and it costs two `gh issue comment` calls.
- Cleanup/simplification is quality, not correctness — not a QC step; run
  `/simplify` on demand, off the critical path.
- A dependency MAJOR upgrade, framework migration, or schema/data migration
  surfacing here → STOP and present options; never autonomous.
