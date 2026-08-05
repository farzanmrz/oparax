---
name: feature-verify
description: >-
  QC step 5 of 5, hop-anywhere: re-prove the branch after fixes (gates, boot
  smoke) and present the verification gate: the full owner-facing
  report written so no clarifying question is ever needed. Use
  standalone (/feature-verify) in any session/app after /feature-fix, or let
  /feature-qc chain it. Harness-neutral. Ends at the verification ✋.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Verify: re-prove, then the verification gate ✋

* **Dial:** run this chat on a smart dial (Claude: opus/fable; Codex:
  gpt-5.6-sol): the phase 2 report is judgment work.
* **Inputs:** the branch diff and the issue's QC round comments (`findings`,
  `browsed`, `fixes`); nothing conversational is needed.
* **Exploration fan-out (Codex):** when the surface sweep spans 3+
  independent files/areas, spawn PARALLEL `cx_grounder` instances, named
  explicitly (≤6 threads); Codex never fans out unprompted. Claude Code
  batches independent Agent calls natively.

## 1. Re-prove

### A. Gates

```bash
bash .claude/skills/feature/scripts/qc-gates.sh
```

`GATES: RED` = STOP.

### B. Boot smoke

Reuse a running :3000 server or start one; check first:

```bash
lsof -i :3000 -sTCP:LISTEN -t
```

* **Boot is the whole check.** There is no runtime-error sweep: the
  `_next/mcp` endpoint only reports from a connected browser, so headless QC
  always found it vacuous (and one session opened a browser to fix that,
  2026-08-04). Runtime errors are Sentry's job. NEVER open the in-app Browser
  pane, agent-browser, or any browser here; rendered behavior is
  `/feature-browse`'s job (owner-triggered) or the owner's manual-check set.
  When the round has a `browsed` comment, cite it in section 2 and list only
  its HUMAN-ONLY remainder in section 6 instead of re-listing covered items.

### C. Teardown

Kill the dev server by its real PID only if THIS session started it; a reused
server is left running and reported.

## 2. The verification gate ✋: the owner-legibility contract

This report is the product of QC. It is written for the owner as a user of
the app first and a developer second, and its bar is: **the owner should
never need to ask a clarifying question.**

### A. Binding rules

* **Terms of art:** every one gets a one-clause plain definition at first use
  (e.g. "BCP-47: the `en-US`-style language tag format; the primary subtag is
  the `en` part"). Never lean on a name the owner didn't coin.
* **User-visible consequence:** every finding ties to one: what a user would
  have seen or lost, in one sentence, before any technical detail.
* **No "as discussed":** anything the plan/build phase renamed or reworked
  mid-flight is restated from scratch, never referenced (the owner didn't
  watch the sessions).
* **Length serves clarity:** compress by dropping what doesn't change the
  owner's next action, never by abbreviating what's kept.

### B. Sections, in order

1. **What this slice changed, as a user:** a short walk-through of the new
   behavior: "when X happens, the app now does Y; before, it did Z."
2. **Status + coverage:** builds/boots/gates one-liner; review-lane coverage
   with per-lane finding counts; anything NOT VERIFIABLE (from the design
   critic), verbatim: these ARE the owner's manual-check set, and the report
   must never imply coverage of a state no automated pass actually
   experienced. Nothing here is proven in a browser: every rendered behavior
   the owner cares about belongs in section 6.
3. **Fixed:** per finding: what was wrong in plain terms, what a user could
   have hit, what changed (with `file:line`). The plain-terms sentence comes
   first, the technical one second.
4. **Dropped:** one line + reason each (the owner may disagree; make that
   possible).
5. **Surfaced, not fixed:** each explained from zero context: the situation,
   why it's a design call rather than a bug, and 1-2 concrete options with
   trade-offs. These are decisions being handed to the owner: write them so
   the owner can decide from this text alone.
6. **Your manual-check set:** concrete user actions, step by step ("open the
   feed, relink a different X account, confirm the counter drops to 280"),
   each with one clause on why it can't be proven automatically.

End by offering `/code-review ultra` before ship.

## 3. Persist and stop

* **Persist the report:** post the full report as `## QC round <R>: verified`
  on the ft issue (same content as the chat message). This is the durable
  marker resume detection and feature-ship's guard require: without it, a
  later session cannot distinguish "verified" from "fixed but never
  re-proven", and it means the owner can re-read the report anywhere.
* **Then STOP and wait:** this is the run's verification gate. Ship is
  `/feature-ship` (`$feature-ship` in Codex), owner-triggered.
* **Owner findings:** go through `/feature-fix` (owner findings are binding);
  verify re-runs and posts a new round's marker.
