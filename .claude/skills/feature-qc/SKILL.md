---
name: feature-qc
description: >-
  Phase 3 of the feature flow, standalone: the full QC battery over the current
  feature branch, run as one session — chains feature-find → feature-fix →
  feature-docs → feature-verify with no stops between. Use when the user says
  /feature-qc, "run QC", or wants the branch proven in one sitting. To hop
  between apps/sessions mid-QC, run the four steps individually instead.
  Harness-neutral: runs in Claude Code or Codex.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Skill
model: inherit
---

# The QC battery — one session, four steps, one gate

QC is four separable steps, each a skill of its own so the owner can run any
of them in any session or app (Claude Code or Codex) — every step starts from
durable state only (the branch, the issue, its `QC round` comments) and ends
by writing durable state back:

1. **`feature-find`** — gates + the cross-model review council +
   adjudication → findings posted to the ft issue.
2. **`feature-fix`** — apply the round (one fixer per finding, gates re-run,
   residual lint) → fixes recorded on the issue.
3. **`feature-docs`** — doc sync, subtractive first, default no change.
4. **`feature-verify`** — re-prove (gates + the runtime sweep) → the
   verification ✋, written to the owner-legibility contract.

**Under /feature-qc, invoke them in that order in THIS session with no stops
between** — the chain's only gate is feature-verify's ✋ at the end. Each
sub-skill's own text governs its step; nothing here overrides them, and each
carries its own per-harness dials table naming the subagents it dispatches.

## Dials — per harness

Codex invokes this same file (`$feature-qc`, via the `.agents/skills/` symlink);
the `cx-feature-qc` twin was deleted 2026-07-30. All four `— findings` /
`— fixes` / `— docs` / `— verified` markers are posted even in the one-session
chain — they are what resume detection and both ships' completeness guards read.

| | Claude Code | Codex |
|---|---|---|
| Session dial | fable/opus, high | `gpt-5.6-sol` high — set with `/model` before starting |
| Review council (step 1) | internal `bug-finder` lane + the `codex`, `grok` and `agy` externals | native `reviewer` (the oparax critic contract in `.codex/agents/reviewer.toml`) spawning `pr_explorer` for evidence, **named explicitly in the prompt**, + the `grok` and `agy` externals. No codex lane — that family IS this session |
| Subagents | `bug-finder`, `fixer`, `supabase-runner` | `cx_grounder`, `cx_fixer`, `cx_supabase_runner` |
| Concurrency cap | ≤10 agents per fan-out | ≤6 threads (the global `[agents]` cap) |

**Pick the smart dial AT INVOCATION.** A chain offers no reliable moment for a
mid-run flip. The cheap-start-then-flip pattern applies only to `feature-find`
run standalone, where "council lanes launched" is the cue. A chain started on a
cheap dial must say so in its first milestone line.

## Hard rules (bind the whole chain)

- Session model = adjudication + the final report ONLY. Everything else is a
  pinned dispatch or shell.
- One combined review charter per lane. Never re-expand into per-angle ×
  per-family fan-outs; never add a separate verifier quorum.
- **A failed lane is reported FAILED, never as a clean pass.** `AGY_EMPTY` is
  no-signal. Before trusting the council at all, prove it: `bash
  .claude/workflows/council/selftest.sh`.
- **Milestone lines are required output:** one entering each of the four steps,
  one launching any long background wait (name + expected duration). Nothing
  else between them.
- **Before pausing to ask the owner anything, stop or await write-capable
  subagents.** Read-only agents may drain; nothing edits files while a question
  is open.
- All four markers land as issue comments even in the one-session chain — that
  record is what makes hop-anywhere and post-hoc audit possible.
- Cleanup/simplification is not a QC step; run `/simplify` off the critical path.
- A dependency MAJOR upgrade, framework migration, or schema/data migration
  surfacing here → STOP and present options; never autonomous.
