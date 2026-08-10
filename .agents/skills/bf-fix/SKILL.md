---
name: bf-fix
description: >-
  Phase 3 of the bugfix flow, CODEX ONLY: execute the approved brief on
  bf/N, re-prove the exact repro, post the round marker; the small tier also
  runs its charter QC here. Also the home of bf PATCH ROUNDS from the
  owner's walkthrough. Use when the user says /bf-fix N.
argument-hint: "[issue# | owner findings]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Fix: execute, re-prove the broken path, one marker

Read `tier:` and `base:` from `.feature/bf-<N>-brief.md` (never infer them).
Session dial by tier: quick and small on `gpt-5.6-terra` high, deep on
`gpt-5.6-sol` high. Diff range: `origin/<base>...HEAD`.

## 1. Apply

* **Branch:** `bf/<N>` must already exist (cut at approval). Missing = the owner never approved: STOP.
* **Execute the fix shapes exactly:** a shape that does not survive contact with the file = STOP and report that brief; never invent a value or behavior. Minimal correct fix, surrounding idiom, Biome-clean as written.
* **Patch rounds:** owner-reported findings are binding, never scope creep; ask ONCE "anything else to fold into this round?" so drip-fed findings batch.
* **Guards:** conversion (capability growth = its own slice, STOP); schema changes STOP and present options first; agent-noticed extras stay off the branch.

## 2. Re-prove

```bash
bash .claude/skills/ft/scripts/qc-gates.sh origin/<base>...HEAD
```

`GATES: RED` = STOP. Then re-drive the EXACT repro from the brief (the
browser path on :3000, reuse a running server or start one, or the recorded
DB assertion) and capture the after-evidence.

* **Small tier only:** also run the charter here (its journeys with real inputs, its DB assertions via `supabase-runner` BEFORE any teardown), then close with a plain-words screen: what changed, what was verified, the two or three things the owner should eyeball on :3000.

## 3. One marker, then stop

Post ONE comment on the issue, `## bf round <R>: done`: fixed/dropped
counts, gates GREEN, before/after repro evidence, per-fix `file:line`
one-liners. Patch rounds use the next R with a `(patch)` suffix. Quick and
small tiers hand to the owner walk and ship:

<exit-example>

Round 1 done, gates GREEN, repro re-driven. Walk it on localhost:3000; tell me anything wrong (patch round), or run:

```
/bf-ship N
```

</exit-example>

The deep tier hands to QC instead:

<exit-example>

Round 1 done, gates GREEN. Now run here in Codex (gpt-5.6-sol high):

```
/bf-qc N
```

</exit-example>
