---
name: ft-plan
description: >-
  The front door of feature work, OUTSIDE the build flow: turn a converging
  product conversation into stub issues (title + a few sentences in the
  owner's words), one per user-facing functionality. Use when the user says
  /ft-plan, or invoke it yourself when a conversation converges on
  buildable functionality. Not for specs, code, or branches: building starts
  later with /ft-spec <N>.
allowed-tools: Bash(gh *)
model: inherit
---

# Plan: talk, converge, stub

The conversation IS the planning. This skill only closes it: park each
converged user-facing functionality as one stub issue, in the exact format
below, then hand off.

## 1. Match against what exists

Run this before proposing anything:

```bash
gh issue list --state open
```

* **Fits an open issue:** propose an edit to that issue, not a duplicate.
* **Supersedes an open issue:** propose closing the old one with a pointer
  to the new stub.
* **Unsure which:** ask the owner one line, never guess.

## 2. Attack the ask

The conversation's example is one sample of user behavior, never the spec. Before drafting, derive for each functionality:

* **Modal input:** what most users will actually type or do at this entry point — usually lazier and messier than anything the conversation discussed.
* **Laziest input:** the most careless version that still expresses intent (a bare value, no formatting, a pasted blob, a mid-typing submit).
* **The conversation's example:** the input the discussion happened to use.

When the example and the modal input take different paths, the stub carries BOTH as acceptance journeys. An example-driven stub silently promotes a demo input to "the feature" and ships the modal input untested — that inversion is the recurring failure this step exists to stop (a section-page example once became the whole spec while the bare domain every real user types hard-failed in production). Worked derivations across this repo's features live in `references/behavior-examples.md`; consult it while deriving, not after.

## 3. Propose the stubs

* **One stub = one user-facing functionality** (what the owner's user
  gains), never a slice, theme, or refactor list. A chunk that converged
  into several functionalities gets one stub each.
* **Show every stub draft in full** (exact title + exact body) and wait for
  the owner's yes. Never create or edit silently.

Every stub body has EXACTLY five parts, in this order, and NEVER a prose
paragraph:

1. **Functionality bullets** (no header, they open the body): one bullet
   per implementable piece, `**bold key:** plain content`, owner's words.
2. **Today / After this table**, two columns: the delta at a glance.
3. **`## Acceptance journeys`**: one bullet per journey — a REAL input (the modal and laziest inputs from step 2 come first, the conversation's example after them) `→` the observable outcome the user gets, each tagged `QC-LIVE` (provable by the QC battery driving the app) or `OWNER-MANUAL` (real accounts, real money, taste). These flow into the spec's DoD and from there into browse's checklist verbatim: a journey missing here is untested everywhere downstream.
4. **`## Decided`**: decisions the owner locked while talking. Binding on
   ft-spec AND readable by the owner. Focused ("Block Kit, iterate in
   the online builder") or explicitly open-ended ("exact shape settled at
   spec") both belong. A decision the owner states gets captured here,
   never paraphrased away or demoted to a note.
5. **`## Notes`**: the spec dossier, opening with the italic line marking it machine-facing. It carries EVERYTHING the spec session needs to reconstruct this conversation's understanding without access to it: the diagnosis narrative (what was investigated and what it found, with `file:line` and live-probe evidence), the exact real-world data encountered (URLs, status codes, DB rows, error copy), settled user-behavior assumptions, and rejected interpretations. Thin notes are a stub defect — the spec session must never re-derive what this conversation already proved. Length is unbounded; the owner never needs to read it. Omit only when the stub genuinely emerged with no such context.

Technical identifiers anywhere in the body (skill names, endpoints, tables,
env vars) go in backticks.

<stub-example>

Title: Slack notifications + replies

- **Draft ping:** a Slack message arrives the moment a draft is ready.
- **Approve from Slack:** replying to that message approves the draft.
- **Edit from Slack:** replying with new text replaces the draft.

| Today | After this |
| --- | --- |
| Farzan keeps checking the feed to notice a new draft | Slack pings him the moment it is ready |
| approving means opening the app | approve/edit happens by replying in Slack |

## Acceptance journeys

- `QC-LIVE` reply to the ping with plain replacement text → the draft body is replaced and the feed shows the edit
- `QC-LIVE` reply "approve" (any casing, trailing whitespace, Slack's auto-quoted `>` context included) → the draft is approved
- `OWNER-MANUAL` react with an emoji instead of replying → nothing changes, nothing breaks (real Slack account)

## Decided

- **Message UI:** Slack Block Kit defines the notification's look; Farzan
  iterates it in the online Block Kit builder before spec.
- **Skill:** the Slack work grounds in the `slack-docs` skill.

## Notes

*(for the spec session; the owner never needs to read this)*

- probably `chat.postMessage`; the interactions endpoint already handles
  the 3s ack
- probed 2026-08-01: reply events arrive as `message.channels` with `thread_ts` set, and Slack prepends quoted `>` lines to mobile replies — text comparison must strip them first

</stub-example>

## 4. Create on yes

```bash
gh issue create --title "<title>" --body "<body>"
```

(or `gh issue edit` for updates). Nothing else: no branch, no spec, no
labels, no code.

## 5. Exit: report + handoff block

End with EXACTLY this shape: one line per stub touched, then the handoff.
The handoff always names the app and model in plain words, then gives the
next command in a copyable fenced block, one block per created stub.

<exit-example>

Stubbed:
- #112 Slack notifications + replies: created
- #103 Feed UI consolidation: description updated (per-desk note)

To build one, open a fresh Claude Code session on Fable 5 (best model) and
paste:

```
/ft-spec 112
```

</exit-example>
