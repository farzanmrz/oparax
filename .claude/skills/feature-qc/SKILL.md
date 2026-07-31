---
name: feature-qc
description: >-
  Phase 3 of the feature flow, standalone: the full QC battery over the current
  feature branch, run as one session: chains feature-find, feature-fix,
  feature-docs, feature-verify with no stops between. Use when the user says
  /feature-qc, "run QC", or wants the branch proven in one sitting. To hop
  between apps/sessions mid-QC, run the four steps individually instead.
  Harness-neutral: runs in Claude Code or Codex.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Skill
model: inherit
---

# The QC battery: one session, four steps, one gate

* **Hop-anywhere contract:** QC is four separable steps, each a skill of its
  own, so the owner can run any step in any session or app (Claude Code or
  Codex). Every step starts from durable state only (the branch, the issue,
  its `QC round` comments) and ends by writing durable state back.
* **Under /feature-qc:** invoke the four steps in order in THIS session with
  no stops between. The chain's only gate is the verification ✋ in phase 4.
* **Sub-skill authority:** each sub-skill's own text governs its step;
  nothing here overrides them, and each carries its own per-harness dials
  table naming the subagents it dispatches.

## Dials (per harness)

This skill is single-source: Codex invokes this same file (`$feature-qc`, via
the `.agents/skills/` symlink); the per-harness twin (`cx-feature-qc`) was
deleted, and a per-harness difference belongs in this table, never in a
second file.

| | Claude Code | Codex |
|---|---|---|
| Session dial | fable/opus, high | `gpt-5.6-sol` high (set with `/model` before starting) |
| Review council (phase 1) | internal `bug-finder` lane + the `codex`, `grok` and `agy` externals | native `reviewer` (the oparax critic contract in `.codex/agents/reviewer.toml`) spawning `pr_explorer` for evidence, **named explicitly in the prompt**, + the `grok` and `agy` externals. No codex lane: that family IS this session |
| Subagents | `bug-finder`, `fixer`, `supabase-runner` | `cx_grounder`, `cx_fixer`, `cx_supabase_runner` |
| Concurrency cap | ≤10 agents per fan-out | ≤6 threads (the global `[agents]` cap) |

* **Pick the smart dial AT INVOCATION:** a chain offers no reliable moment
  for a mid-run flip. The cheap-start-then-flip pattern applies only to
  `feature-find` run standalone, where "council lanes launched" is the cue. A
  chain started on a cheap dial must say so in its first milestone line.

## 1. feature-find

Gates + the cross-model review council + adjudication. Findings posted to the
ft issue.

## 2. feature-fix

Apply the round (one fixer per finding, gates re-run, residual lint). Fixes
recorded on the issue.

## 3. feature-docs

Doc sync, subtractive first, default no change.

## 4. feature-verify

Re-prove (gates + the runtime sweep). The verification ✋, written to the
owner-legibility contract.

## Hard rules (bind the whole chain)

* **Session model boundary:** the session model does adjudication + the final
  report ONLY. Everything else is a pinned dispatch or shell.
* **One combined review charter per lane:** never re-expand into per-angle ×
  per-family fan-outs; never add a separate verifier quorum.
* **Failure conditions:** a failed lane is reported FAILED, never as a clean
  pass. `AGY_EMPTY` is no-signal. Before trusting the council at all, prove
  it (exits in 0.2s unless a wrapper, profile, or CLI version moved since the
  last green run):

```bash
bash .claude/workflows/council/selftest.sh --if-changed
```

* **Milestone lines are required output:** one entering each of the four
  phases, one launching any long background wait (name + expected duration).
  Nothing else between them.
* **Open questions freeze writes:** before pausing to ask the owner anything,
  stop or await write-capable subagents. Read-only agents may drain; nothing
  edits files while a question is open.
* **Durable record:** all four `findings` / `fixes` / `docs` / `verified`
  markers land as issue comments even in the one-session chain. They are what
  resume detection and both ships' completeness guards read, and that record
  is what makes hop-anywhere and post-hoc audit possible.
* **Cleanup is not a QC step:** run `/simplify` off the critical path.
* **Escalation:** a dependency MAJOR upgrade, framework migration, or
  schema/data migration surfacing here: STOP and present options; never
  autonomous.
