---
name: ft-fix
description: >-
  QC step 3 of 3, CODEX ONLY: apply the latest QC findings round plus its
  browsed report's failures (or owner-reported triage items) on the ft
  branch, re-prove the branch (gates, boot smoke), and present the
  verification gate — the full owner-facing report written so no
  clarifying question is ever needed. One continuous run ending at the
  verification ✋: there is no separate "verify" skill to invoke afterward.
  Use standalone (/ft-fix) after a find round, or let /ft-qc chain it.
  This skill does not run in Claude Code: it lives only under
  `.agents/skills/`, which Claude Code never scans, so it is not listed or
  invocable there. A Claude Code session that reaches this step stops and
  tells the owner to switch to Codex (ft-qc's routing rule).
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Fix through verify: apply, re-prove, then the verification gate ✋

Codex-only, one continuous session: apply the adjudicated round, re-prove
the branch, and present the verification gate — no stop in between and no
second skill to invoke.

* **Dial:** `gpt-5.6-sol` high throughout (fix application and the
  owner-facing report are judgment work).
* **Inputs for phases 4-6:** the branch diff and the issue's QC round
  comments (`findings`, `browsed`, `fixes` — the last one is this run's own
  phase 3 output, already in hand). Read fix anchors from the fixes marker
  and spawn `grounder` ONLY for anchors it lacks; the diff map is
  `git diff --stat origin/beta...HEAD` run inline, never a dispatched
  grounder (a past round spent ~60% of its tokens re-deriving both from
  scratch).
* **Exploration fan-out:** when a surface sweep spans 3+ independent
  files/areas, spawn PARALLEL `grounder` instances, named explicitly
  (≤6 threads); never fan out unprompted. Spawn with `fork_turns: "none"` —
  a typed agent plus a full-history fork is always rejected.

## 1. Brief

* **Resuming an interrupted run:** if the newest `## QC round <R>` already
  has a `fixes` comment but no `verified` comment (this skill posted phase
  3's marker and then stopped, e.g. mid-session), do NOT re-derive a brief
  or re-dispatch fixers — the round is already applied. Skip straight to
  phase 4 (re-prove).
* **Brief source (fresh round):** the newest `## QC round <R>` findings comment on the ft
  issue that has no matching `## QC round <R>` fixes comment yet, PLUS the
  same round's `browsed` comment when one exists: its fix-ready failure
  briefs join the findings in the same file-group dispatch. A missing
  `browsed` marker is reported in the fixes comment as "browse not run this
  round", never silently ignored. Read ONLY the QC marker comments (a full
  `--comments` read is 30k+ tokens and truncates):

```bash
gh api repos/{owner}/{repo}/issues/<N>/comments --paginate \
  --jq '[.[] | select(.body|startswith("## QC round"))] | .[-4:] | .[].body'
```

* **Owner triage mode:** when the owner brought manual-test findings
  directly, their words are the brief. Owner findings are binding: no
  push-back, no deferral unless they explicitly say an item can wait.
* **The comment is the contract:** nothing from the find session's
  conversation is needed.
* **Empty round:** zero accepted findings AND zero browse failures =
  dispatch nothing; still post the round's fixes marker recording "nothing
  to apply". The marker must exist for every round: phase 5's report and
  resume detection read it, and its absence reads as a skipped step.

## 2. Apply

### A. Dispatch

* **Applying is not adjudicating: dispatch it.** One `fixer` per
  DISJOINT FILE GROUP: bundle every accepted finding that touches the same
  files into one brief (the findings' text, technical + plain-terms lines,
  IS the brief). Per-finding fixers re-read the same files N times and
  serialize behind each other on overlaps, so the group is the dispatch
  unit.
* **Grouping:** union findings whose touched-file sets overlap
  (transitively) into one group. A group containing any risk-path finding
  (auth, money, posting, schema/migration, new trust boundary) spawns
  `fixer` on `gpt-5.6-sol` high for the whole group; an ordinary group
  runs at the default dial.
* **Parallelism:** groups are disjoint by construction: dispatch them ALL
  in parallel; there is no serial case.
* **Fixer contract:** minimal correct fix, match surrounding idiom,
  `tsc --noEmit` clean on touched files, STOP and report if the brief turns
  out to need a design decision. A new numeric limit, threshold, cap, or
  other product-visible constant NOT spelled out verbatim in the brief IS a
  design decision by definition: stop, never pick a value (a fixer once
  silently capped how much of an article the product reads).
* **`owner-decision` findings are never dispatched:** list them in the fixes
  comment as awaiting the owner's pick; they surface again in phase 5's
  "Surfaced, not fixed" section.
* **Schema changes escalate, and never land half-applied:** a fix needing a
  migration: STOP and present options first. If approved, the SAME round
  applies it to the Supabase project (the MCP `apply_migration`),
  regenerates types, and verifies the touched query shape; a committed
  migration file alone crashes every runtime surface that reads the new
  column.
* **Scope:** mid-fix new scope stays off the branch.

### B. Gates

Re-run the gates:

```bash
bash .claude/skills/ft/scripts/qc-gates.sh
```

* **Failure condition:** `GATES: RED` = STOP.
* Its residual-lint report also feeds subsection C.

### C. Residual lint

* **On the changed files only** (safe formatting already happened via the
  write hooks): dispatch `fixer` per file group for what Biome can't
  auto-fix, flagging any behavior-changing rule fix with one sentence of
  reasoning.
* **Gate again:** if lint changed code, a clean build is required again.

### D. Checkpoint commit

Commit the round as one checkpoint commit with this message:

<commit-message>
qc: apply round <R> fixes
</commit-message>

## 3. Record the fixes marker

Post the round's fixes comment (titled `## QC round <R>: fixes`) on the
issue:

* **Per finding:** `fixed — <file:line at the checkpoint commit>` (what
  changed, one sentence) or `skipped` (why, e.g. escalated as a design
  call). The anchors are load-bearing: phase 6 reads them instead of
  re-deriving every fix's location (a past round's verify spent ~60% of
  its tokens reconstructing anchors this comment already could have
  carried).
* **Plus:** any behavior-changing lint flags from phase 2, subsection C.
* **Audience:** this comment, plus phase 5's report, are what the owner
  reads. Continue directly into phase 4 below — do not stop here.

## 4. Re-prove

### A. Gates

```bash
bash .claude/skills/ft/scripts/qc-gates.sh
```

`GATES: RED` = STOP.

### B. Boot smoke

Reuse a running :3000 server or start one; check first:

```bash
lsof -i :3000 -sTCP:LISTEN -t
```

* **Boot is the whole check.** There is no runtime-error sweep: the
  `_next/mcp` endpoint only reports from a connected browser, so headless QC
  always found it vacuous. Runtime errors are Sentry's job. NEVER open a
  browser here; rendered behavior is `/ft-browse`'s job (owner-
  triggered) or the owner's manual-check set. When the round has a
  `browsed` comment, cite it in phase 5 section 2 and list only its
  HUMAN-ONLY remainder in section 6 instead of re-listing covered items.

### C. Teardown

Kill the dev server by its real PID only if THIS session started it; a reused
server is left running and reported.

## 5. The verification gate ✋: the owner-legibility contract

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
* **Fresh numbering:** every list in this report numbers 1..n on its own;
  numbering inherited from another comment never appears as a list number
  (a past round's Fixed list jumped 19 → 22 because two findings landed in
  Surfaced — to the owner that reads as missing content). Cite provenance
  inline as "(finding 20)" when it matters.
* **Weight by consequence:** a fix with no user-visible consequence (code
  comments, lint debt) gets one line under a single Housekeeping
  entry, never a full narrative slot; the length budget belongs to what a
  user could have hit.
* **Length serves clarity:** compress by dropping what doesn't change the
  owner's next action, never by abbreviating what's kept.

### B. Sections, in order

0. **The verdict screen** — everything needed to decide whether to read on,
   in ~10 lines, plain language only (no identifiers, paths, or numbers the
   owner didn't coin): the GREEN/RED gates line; one counts line (N fixed /
   M dropped / K decisions owed / J manual checks); each owed decision as
   ONE line with its options; the exact next command. The owner who reads
   nothing else must still leave knowing the state and what they owe.
1. **What this slice changed, as a user:** a short walk-through of the new
   behavior: "when X happens, the app now does Y; before, it did Z."
2. **Status + coverage:** builds/boots/gates one-liner; review-lane coverage with
   per-lane finding counts; anything NOT VERIFIABLE (from the design critic),
   verbatim: these ARE the owner's manual-check set, and the report must
   never imply coverage of a state no automated pass actually experienced.
   Nothing here is proven in a browser: every rendered behavior the owner
   cares about belongs in section 6.
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
   each with one clause on why it can't be proven automatically. Split it:
   **Before ship** (the few checks that could change the ship decision)
   first, **Anytime after** for the rest — eight undifferentiated multi-step
   items is a wall the owner won't climb.

End by offering `/code-review ultra` before ship.

## 6. Persist and stop

* **Persist the report:** post the full report as `## QC round <R>: verified`
  on the ft issue (same content as the chat message). This is the durable
  marker resume detection and ft-ship's guard require: without it, a
  later session cannot distinguish "verified" from "fixed but never
  re-proven", and it means the owner can re-read the report anywhere.
* **Then STOP and wait:** this is the run's verification gate. Ship is
  `/ft-ship`, owner-triggered, in either app (Codex: `gpt-5.6-sol` high;
  Claude Code: the owner's dial).
* **Owner findings:** go through this skill again (owner findings are
  binding); it re-runs and posts a new round's fixes + verified markers.
