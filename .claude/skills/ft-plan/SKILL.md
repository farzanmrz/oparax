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

## 2. Propose the stubs

* **One stub = one user-facing functionality** (what the owner's user
  gains), never a slice, theme, or refactor list. A chunk that converged
  into several functionalities gets one stub each.
* **Show every stub draft in full** (exact title + exact body) and wait for
  the owner's yes. Never create or edit silently.

Every stub body has EXACTLY four parts, in this order, and NEVER a prose
paragraph:

1. **Functionality bullets** (no header, they open the body): one bullet
   per implementable piece, `**bold key:** plain content`, owner's words.
2. **Today / After this table**, two columns: the delta at a glance.
3. **`## Decided`**: decisions the owner locked while talking. Binding on
   ft-spec AND readable by the owner. Focused ("Block Kit, iterate in
   the online builder") or explicitly open-ended ("exact shape settled at
   spec") both belong. A decision the owner states gets captured here,
   never paraphrased away or demoted to a note.
4. **`## Notes`**: hints for the spec session only, opening with the italic
   line marking it machine-facing. Omit the section if none.

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

## Decided

- **Message UI:** Slack Block Kit defines the notification's look; Farzan
  iterates it in the online Block Kit builder before spec.
- **Skill:** the Slack work grounds in the `slack-docs` skill.

## Notes

*(for the spec session; the owner never needs to read this)*

- probably `chat.postMessage`; the interactions endpoint already handles
  the 3s ack

</stub-example>

## 3. Create on yes

```bash
gh issue create --title "<title>" --body "<body>"
```

(or `gh issue edit` for updates). Nothing else: no branch, no spec, no
labels, no code.

## 4. Exit: report + handoff block

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
