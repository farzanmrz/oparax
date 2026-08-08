---
name: ft-qc
description: >-
  Phase 3 of the feature flow, standalone: the QC battery over the current
  feature branch as a GATED RELAY: run the next pending step, then stop with
  a handoff naming the following step and its model dial. Use when the user
  says /ft-qc or "run QC". Say "/ft-qc chain" to run all pending
  steps in one sitting with no stops (Codex only, past ft-find — see
  the harness rule below). ft-find is dual-harness; ft-browse and
  ft-fix (which also covers verify) are Codex only.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Skill
model: inherit
---

# The QC battery: three steps, gated relay by default

* **Hop-anywhere contract, within a harness:** QC is three separable steps,
  each a skill of its own. `ft-find` runs in either harness;
  `ft-browse` and `ft-fix` (which absorbed `feature-verify`, and
  `feature-docs` before it) run ONLY in Codex — real files under
  `.agents/skills/`, absent from `.claude/skills/` by 2026-08-08 owner
  decision, so Claude Code cannot discover or invoke them. Every step starts
  from durable state only (the branch, the issue, its `QC round` comments)
  and ends by writing durable state back.
* **CLAUDE-CODE HARNESS GUARD — check this before routing to any step:** if
  this session is Claude Code and the detected next pending step is
  `ft-browse` or `ft-fix`, do NOT attempt the Skill tool for it
  (it is not in this harness's listing; the call would just fail
  confusingly). Instead STOP immediately and tell the owner plainly: "This
  step only runs in Codex — switch to Codex/ChatGPT and run `/ft-<x>`
  there." State the detected round position first, exactly as any other
  handoff would, then the redirect. This is not a dial mismatch (route,
  don't run, below) — it is a harness mismatch, and no session model change
  fixes it.
* **Under /ft-qc (default = gated relay):** detect the next pending step
  from the issue's `QC round` markers, run ONLY that step, then STOP with a
  handoff. The handoff states: what completed, the durable state written, the
  exact next command (`/ft-find` etc., same `/` form in both harnesses),
  and the
  recommended dial for the next step from the step-dial table below. The
  owner runs each step in a fresh session on the matching dial (and, for
  browse/fix, in Codex).
* **Wrong dial = route, don't run:** when the detected step's tier doesn't
  match this session's model, do NOT run it: report the detected step and
  STOP with the handoff (exact command, both harness forms where the step
  actually runs in both, dial). This makes `/ft-qc` safe to invoke on
  ANY dial as a pure router: the owner never needs to remember the sequence.
* **Under /ft-qc chain (explicit opt-in):** invoke the REMAINING
  pending steps in order in THIS session with no stops between — the chain
  starts at the next pending marker, never at step 1. In Claude Code, the
  chain can only ever complete `ft-find`: if the next pending step
  after that is `ft-browse` or `ft-fix`, the harness guard above
  fires and the chain ends there with the Codex redirect. A chain begun in
  Codex on or after `ft-browse` can run straight through to the
  verification ✋ in one sitting; the owner's chain invocation is the
  browser unlock for the browse step (the settings ask-gate still prompts).
* **Sub-skill authority:** each sub-skill's own text governs its step;
  nothing here overrides them, and each carries its own dials naming the
  subagents it dispatches.
* **A v0 merge starts a fresh round:** when the plan declares an OWNER-V0
  interlude and its merge-back lands on the ft branch, that is new
  unreviewed code: the relay's next step is ft-find over the updated
  diff (a normal new round; the design critic flips to the v0 yardstick per
  ft-find). Ship's staleness guard enforces this even if skipped here.

## Step dials (what the handoff recommends)

| Step | Harness | Tier | Dial |
|---|---|---|---|
| ft-find | Claude Code or Codex | smart (adjudication) | fable/opus high / `gpt-5.6-sol` high |
| ft-browse | Codex only | normal | `gpt-5.6-terra` |
| ft-fix | Codex only | smart (the owner-facing ✋) | `gpt-5.6-sol` high |

* **The relay is what protects recall:** `bug-finder` inherits the session
  model, so running find on a cheap dial silently weakens the last automated
  net before beta. The handoff's dial line is load-bearing, not advisory.

## Dials (per harness)

This skill is single-source: Codex invokes this same file (`/ft-qc`, via
the `.agents/skills/` symlink); the per-harness twin (`cx-ft-qc`) was
deleted, and a per-harness difference belongs in this table, never in a
second file.

| | Claude Code | Codex |
|---|---|---|
| Session dial | fable/opus, high | `gpt-5.6-sol` high (set with `/model` before starting) |
| Review council (phase 1) | internal `bug-finder` lane + the `codex`, `grok`, `agy` and `cline` (minimax-m3) externals | native `reviewer` (the oparax critic contract in `.codex/agents/reviewer.toml`) spawning `pr-explorer` for evidence, **named explicitly in the prompt**, + the `grok`, `agy` and `cline` (minimax-m3) externals. No codex lane: that family IS this session |
| Subagents | `bug-finder`, `fixer`, `supabase-runner` | `grounder`, `fixer`, `supabase-runner` |
| Concurrency cap | ≤10 agents per fan-out | ≤6 threads (the global `[agents]` cap) |

* **Chain mode only, pick the smart dial AT INVOCATION:** a chain offers no
  reliable moment for a mid-run flip, so `/ft-qc chain` runs entirely on
  the smart dial. The cheap-start-then-flip pattern applies only to
  `ft-find` run standalone, where "council lanes launched" is the cue. A
  chain started on a cheap dial must say so in its first milestone line. The
  relay needs none of this: each step starts on the right dial by handoff.

## 1. ft-find

Gates + the cross-model review council + adjudication. Findings posted to the
ft issue. Runs in either harness.

## 2. ft-browse (Codex only)

Checklist-drive the rendered branch in the built-in browser (the round's
`NOT VERIFIABLE` lines, plan states, manual-check set). Browsed report posted
to the issue; failures become fix-ready briefs for step 3.

## 3. ft-fix (Codex only)

One continuous run: apply the round (one `fixer` per disjoint file group
of findings + browse failures, gates re-run, residual lint) → re-prove
(gates + boot smoke) → the verification ✋, written to the
owner-legibility contract. Fixes and the verification report both recorded
on the issue.

## Hard rules (bind the whole chain)

* **Session model boundary:** the session model does adjudication, the
  inline design-critic pass (ft-find phase 3), + the final report ONLY.
  Everything else is a pinned dispatch or shell.
* **One combined review charter per lane:** never re-expand into per-angle ×
  per-family fan-outs; never add a separate verifier quorum.
* **Failure conditions:** a failed lane is reported FAILED, never as a clean
  pass. `AGY_EMPTY` is no-signal. Before trusting the council at all, prove
  it (exits in 0.2s unless a wrapper, profile, or CLI version moved since the
  last green run):

```bash
bash .claude/workflows/council/selftest.sh --if-changed
```

* **Milestone lines are required output:** one entering each of the three
  steps, one launching any long background wait (name + expected duration).
  Nothing else between them.
* **Open questions freeze writes:** before pausing to ask the owner anything,
  stop or await write-capable subagents. Read-only agents may drain; nothing
  edits files while a question is open.
* **Durable record:** all four `findings` / `browsed` / `fixes` / `verified`
  markers land as issue comments even in a one-session Codex chain —
  four markers from three steps, since `ft-fix` posts two. They are
  what resume detection and both ships' completeness guards read, and that
  record is what makes hop-anywhere (within a harness) and post-hoc audit
  possible.
* **Browsers only inside ft-browse:** no other step opens a browser on
  its own judgment; a check that would need a browser to be meaningful is
  reported unproven, never backfilled by browsing. Browse is a fixed step,
  but the relay still never runs it itself: find's handoff DIRECTS the owner
  to Codex and `/ft-browse`, and the owner invoking it (or invoking the
  chain, from Codex) is the only unlock (the settings ask-gate on the
  browser tools enforces this).
* **Cleanup is not a QC step:** run `/simplify` off the critical path.
* **Escalation:** a dependency MAJOR upgrade, framework migration, or
  schema/data migration surfacing here: STOP and present options; never
  autonomous.
