---
name: ft-plan
description: >-
  The front door of feature work, OUTSIDE the build flow: turn a converging
  product conversation into stub issues (title + a few sentences in the
  owner's words), one per user-facing functionality. Use when the user says
  /ft-plan, or invoke it yourself when a conversation converges on
  buildable functionality. Not for specs, code, or branches: building starts
  later with /ft-spec <N> (Codex).
allowed-tools: Bash(gh *)
model: inherit
---

# Plan: talk, converge, stub

The conversation IS the planning. This skill only closes it: park each
converged user-facing functionality as one stub issue, then hand off.
Recommended model: Opus 4.8 (plan output is small; what matters is
pushback quality on the owner's thinking, not tokens). Advisory, never a
gate: an owner invocation runs on the session's current model.

## 1. Match against what exists

```bash
gh issue list --state open
```

* **Fits an open issue:** propose an edit to that issue, not a duplicate.
* **Supersedes an open issue:** propose closing the old one with a pointer to the new stub.
* **Unsure which:** ask the owner one line, never guess.

## 2. Attack the ask

The conversation's example is one sample of user behavior, never the spec. For each functionality derive:

* **Modal input:** what most users will actually type or do at this entry point (usually lazier and messier than anything discussed).
* **Laziest input:** the most careless version that still expresses intent (bare value, no formatting, pasted blob, mid-typing submit).
* **The conversation's example:** the input the discussion happened to use.

When the example and the modal input take different paths, the stub carries BOTH as acceptance journeys: an example-driven stub silently promotes a demo input to "the feature" and ships the modal input untested (a section-page example once became the whole spec while the bare domain every real user types hard-failed in production). Worked derivations: `references/behavior-examples.md`.

## 3. Propose the stubs

* **One stub = one user-facing functionality**, never a slice-theme or refactor list.
* **Show parts 1-4 in full** (title, bullets, table, journeys, Decided) and wait for the owner's yes. Never create silently.
* **The Notes dossier is NOT surfaced in chat:** machine-facing; the owner sees one summary line. The full dossier goes into the issue body for the spec session.
* **New UI needing real design exploration:** the stub marks an explicit owner step, "design in Claude Design first"; the exported result feeds the spec. Never explore design silently inside the flow.

Stub body, five parts, never a prose paragraph:

1. **Functionality bullets** (no header): one per implementable piece, `**bold key:** plain content`, owner's words.
2. **Today / After this table**: the delta at a glance.
3. **`## Acceptance journeys`**: one bullet per journey, REAL input (modal and laziest first) `→` observable outcome, tagged `QC-LIVE` (provable by QC driving the app) or `OWNER` (real accounts, money, taste). These become the spec's walkthrough and QC's browse script.
4. **`## Decided`**: decisions the owner locked while talking; binding on the spec.
5. **`## Notes`**: the spec dossier, opening with the italic machine-facing line. Everything the spec session needs to reconstruct this conversation: diagnosis narrative with `file:line` and live-probe evidence, exact real-world data (URLs, status codes, DB rows, error copy), settled user-behavior assumptions, rejected interpretations. Thin notes are a stub defect. Unbounded length; the owner never reads it.

Technical identifiers in backticks. Apply the label taxonomy from `AGENTS.md` (`feature`, `bug`, `cleanup`, `meta`, `docs`).

## 4. Create on yes

```bash
gh issue create --title "<title>" --body "<body>" --label feature
```

Nothing else: no branch, no spec, no code.

## 5. Exit: report + handoff

One line per stub touched, then the copyable handoff:

<exit-example>

Stubbed:
- #118 Slack notifications + replies: created

Now switch to Codex on gpt-5.6-sol high and run:

```
/ft-spec 118
```

</exit-example>
