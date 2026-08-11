---
name: ft-fix
description: >-
  Phase 7 of the feature flow, CODEX ONLY: execute the adjudicated fix
  briefs from /ft-qc, re-prove the branch, post the round's one marker.
  Also the home of PATCH ROUNDS: owner-reported findings from the localhost
  walkthrough, applied fast with a small report. Use /ft-fix after
  /ft-qc, or standalone with owner findings.
argument-hint: "[issue# | owner findings]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Fix: execute the briefs, prove it, one marker

Recommended dial: `gpt-5.6-sol` high (advisory, never a gate). The briefs decided everything; this
session executes. Nothing decision-shaped should be here: if a brief's fix
shape does not survive contact with the file, STOP and report that brief,
never invent a value or behavior (a fixer once invented a 6,000-char input
cap; that class of improvisation is the one forbidden move).

## 1. Apply

* **Brief source:** `.feature/qc-r<R>-briefs.md` from /ft-qc (Claude), or the owner's words directly (a PATCH ROUND). Owner findings are binding: no push-back, no deferral unless they say an item can wait. Before applying a patch round, ask ONCE: "anything else to fold into this round?" so drip-fed findings batch.
* **No re-grounding:** the briefs plus the files they cite are the whole context — no knowledge-skill re-reads, no changelog or doc probing, no history archaeology, no tool-roster surveys. Read a file when you are about to edit it.
* **Execution:** small rounds inline; 3+ disjoint file groups may dispatch one `fixer` per group in parallel (the brief's text IS the fixer's brief). Minimal correct fix, surrounding idiom, Biome-clean as written.
* **Schema changes:** STOP and present options first; if approved, the same round applies the migration to Supabase (MCP), regenerates types, and verifies the touched query shape. Never land a migration file half-applied.
* **Conversion guard:** a fix growing a new capability, column, or model behavior has left fix territory; surface it for its own slice.

## 2. Re-prove

```bash
bash .claude/skills/ft/scripts/qc-gates.sh
```

`GATES: RED` = STOP. Boot smoke: reuse a running :3000 server or start one;
boot is the whole check. A fix for a journey-FAILED finding is re-proven by
the same headless evidence that failed it (harness case, direct request, or
DB assertion) before it may be called fixed. Never open a browser. The
full regression suite re-runs only when the round touched prompts, the
pipeline, or the harness itself; otherwise run only the cases the fixes
touch.

## 3. One marker, then stop

Post ONE short comment on the issue, `## QC round <R>: done`: counts
(accepted/fixed/dropped), gates GREEN, per-fix one-liners with `file:line`,
anything owed to the owner in plain words. Patch rounds post the same marker
shape at the next R with a `(patch)` suffix. No other markers exist.

<exit-example>

Round 1 done: 10 fixed, 3 dropped, gates GREEN. Walk the spec's walkthrough on localhost:3000; tell me anything wrong (patch round), or run:

```
/ft-ship 118
```

</exit-example>
