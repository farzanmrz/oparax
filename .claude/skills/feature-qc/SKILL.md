---
name: feature-qc
description: >-
  Phase 3 of the feature flow, standalone: the QC battery over the current
  feature branch as a GATED RELAY: run the next pending step (find, browse,
  fix, docs, verify), then stop with a handoff naming the following step and
  its model dial. Use when the user says /feature-qc or "run QC". Say
  "/feature-qc chain" to run all five in one sitting with no stops.
  Harness-neutral: runs in Claude Code or Codex.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Skill
model: inherit
---

# The QC battery: five steps, gated relay by default

* **Hop-anywhere contract:** QC is five separable steps, each a skill of its
  own, so the owner can run any step in any session or app (Claude Code or
  Codex). Every step starts from durable state only (the branch, the issue,
  its `QC round` comments) and ends by writing durable state back.
* **Under /feature-qc (default = gated relay):** detect the next pending step
  from the issue's `QC round` markers, run ONLY that step, then STOP with a
  handoff. The handoff states: what completed, the durable state written, the
  exact next command (`/feature-find` etc., `$`-form for Codex), and the
  recommended dial for the next step from the step-dial table below. The
  owner runs each step in a fresh session on the matching dial.
* **Wrong dial or owner-run step = route, don't run:** when the detected
  step's tier doesn't match this session's model, or the step is
  feature-browse (owner-run by the hard rule), do NOT run it: report the
  detected step and STOP with the handoff (exact command, both harness
  forms, dial). This makes `/feature-qc` safe to invoke on ANY dial as a
  pure router: the owner never needs to remember the sequence.
* **Under /feature-qc chain (explicit opt-in):** invoke the REMAINING
  pending steps in order in THIS session with no stops between — the chain
  starts at the next pending marker, never at step 1. The common post-browse
  form: after a `browsed` marker lands, `$feature-qc chain` relays
  fix → docs → verify in one sitting. The chain's only gate is the
  verification ✋ in phase 5. The owner's chain invocation is the browser
  unlock for the browse step (the settings ask-gate still prompts).
* **Sub-skill authority:** each sub-skill's own text governs its step;
  nothing here overrides them, and each carries its own per-harness dials
  table naming the subagents it dispatches.
* **A v0 merge starts a fresh round:** when the plan declares an OWNER-V0
  interlude and its merge-back lands on the ft branch, that is new
  unreviewed code: the relay's next step is feature-find over the updated
  diff (a normal new round; the design critic flips to the v0 yardstick per
  feature-find). Ship's staleness guard enforces this even if skipped here.

## Step dials (what the handoff recommends)

| Step | Tier | Claude Code | Codex |
|---|---|---|---|
| feature-find | smart (adjudication) | fable/opus high | `gpt-5.6-sol` high |
| feature-browse | normal | sonnet | `gpt-5.6-terra` |
| feature-fix | normal | sonnet | `gpt-5.6-terra` |
| feature-docs | normal | sonnet | `gpt-5.6-terra` |
| feature-verify | smart (the owner-facing ✋) | fable/opus high | `gpt-5.6-sol` high |

* **The relay is what protects recall:** `bug-finder` inherits the session
  model, so running find on a cheap dial silently weakens the last automated
  net before beta. The handoff's dial line is load-bearing, not advisory.

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

* **Chain mode only, pick the smart dial AT INVOCATION:** a chain offers no
  reliable moment for a mid-run flip, so `/feature-qc chain` runs entirely on
  the smart dial. The cheap-start-then-flip pattern applies only to
  `feature-find` run standalone, where "council lanes launched" is the cue. A
  chain started on a cheap dial must say so in its first milestone line. The
  relay needs none of this: each step starts on the right dial by handoff.

## 1. feature-find

Gates + the cross-model review council + adjudication. Findings posted to the
ft issue.

## 2. feature-browse

Checklist-drive the rendered branch in the built-in browser (the round's
`NOT VERIFIABLE` lines, plan states, manual-check set). Browsed report posted
to the issue; failures become fix-ready briefs for step 3.

## 3. feature-fix

Apply the round (one fixer per disjoint file group of findings + browse
failures, gates re-run, residual lint). Fixes recorded on the issue.

## 4. feature-docs

Doc sync, subtractive first, default no change.

## 5. feature-verify

Re-prove (gates + boot smoke). The verification ✋, written to the
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

* **Milestone lines are required output:** one entering each of the five
  steps, one launching any long background wait (name + expected duration).
  Nothing else between them.
* **Open questions freeze writes:** before pausing to ask the owner anything,
  stop or await write-capable subagents. Read-only agents may drain; nothing
  edits files while a question is open.
* **Durable record:** all five `findings` / `browsed` / `fixes` / `docs` /
  `verified` markers land as issue comments even in the one-session chain.
  They are what resume detection and both ships' completeness guards read,
  and that record is what makes hop-anywhere and post-hoc audit possible.
* **Browsers only inside /feature-browse:** no other step opens the in-app
  Browser pane, agent-browser, or any browser on its own judgment; a check
  that would need a browser to be meaningful is reported unproven, never
  backfilled by browsing. Browse is a fixed step, but the relay still never
  runs it itself: find's handoff DIRECTS the owner to `/feature-browse`, and
  the owner invoking it (or invoking the chain) is the only unlock (the
  settings ask-gate on the Browser tools enforces this).
* **Cleanup is not a QC step:** run `/simplify` off the critical path.
* **Escalation:** a dependency MAJOR upgrade, framework migration, or
  schema/data migration surfacing here: STOP and present options; never
  autonomous.
