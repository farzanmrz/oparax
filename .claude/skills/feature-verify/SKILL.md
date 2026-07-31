---
name: feature-verify
description: >-
  QC step 4 of 4, hop-anywhere: re-prove the branch after fixes (gates, boot,
  runtime sweep) and present the verification gate — the full owner-facing
  report written so no clarifying question is ever needed. Use
  standalone (/feature-verify) in any session/app after /feature-fix, or let
  /feature-qc chain it. Harness-neutral. Ends at the verification ✋.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Verify — re-prove, then the verification gate ✋

Run this chat on a smart dial (Claude: opus/fable; Codex: gpt-5.6-sol) — the
report below is judgment work. Inputs: the branch diff and the issue's QC
round comments (`findings` + `fixes`); nothing conversational is needed.

## Re-prove

1. **Gates:** `bash .claude/skills/feature/scripts/qc-gates.sh`.
   `GATES: RED` = STOP.
2. **Boot + runtime sweep:** reuse a running :3000 server or start one
   (`lsof -i :3000 -sTCP:LISTEN -t` first), then collect runtime errors once
   from the `_next/mcp` endpoint.
3. **Teardown:** kill the dev server by its real PID only if THIS session
   started it; a reused server is left running and reported.

## The verification gate ✋ — the owner-legibility contract

This report is the product of QC. It is written for the owner **as a user of
the app first and a developer second**, and its bar is: **the owner should
never need to ask a clarifying question.** Binding rules:

- Every term of art gets a one-clause plain definition at first use (e.g.
  "BCP-47 — the `en-US`-style language tag format; the primary subtag is the
  `en` part"). Never lean on a name the owner didn't coin.
- Every finding ties to a user-visible consequence: what a user would have
  seen or lost, in one sentence, before any technical detail.
- Anything the plan/build phase renamed or reworked mid-flight is restated
  from scratch, not referenced ("as discussed" is banned — the owner didn't
  watch the sessions).
- Length serves clarity: compress by dropping what doesn't change the owner's
  next action, never by abbreviating what's kept.

Sections, in order:

1. **What this slice changed, as a user** — a short walk-through of the new
   behavior: "when X happens, the app now does Y; before, it did Z."
2. **Status + coverage** — builds/boots/gates one-liner; review-lane
   coverage with per-lane finding counts; anything NOT VERIFIABLE (from the
   design critic), verbatim — these ARE the owner's manual-check set, and the
   report must never imply coverage of a state no automated pass actually
   experienced. Nothing here is proven in a browser: every rendered behavior
   the owner cares about belongs in section 6.
3. **Fixed** — per finding: *what was wrong in plain terms → what a user
   could have hit → what changed* (with `file:line`). The plain-terms
   sentence comes first, the technical one second.
4. **Dropped** — one line + reason each (the owner may disagree; make that
   possible).
5. **Surfaced, not fixed** — each explained from zero context: the situation,
   why it's a design call rather than a bug, and 1–2 concrete options with
   trade-offs. These are decisions being handed to the owner — write them so
   the owner can decide from this text alone.
6. **Your manual-check set** — concrete user actions, step by step ("open the
   feed, relink a different X account, confirm the counter drops to 280"),
   each with one clause on why it can't be proven automatically.

End by offering `/code-review ultra` before ship.

**Persist the report too:** post the full report as `## QC round <R> —
verified` on the ft issue (same content as the chat message). This is the
durable marker resume detection and feature-ship's guard require — without
it, a later session cannot distinguish "verified" from "fixed but never
re-proven" — and it means the owner can re-read the report anywhere.

Then STOP and wait — this is the run's verification gate; ship is
`/feature-ship` (`$feature-ship` in Codex), owner-triggered. If the owner
reports findings, they go through `/feature-fix` (owner findings are binding)
and verify re-runs, posting a new round's marker.
