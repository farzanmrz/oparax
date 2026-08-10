---
name: ft-gate
description: >-
  Phase 3 of the feature flow, CLAUDE CODE ONLY: judge the Codex-authored
  spec and present it to the owner for approval; on yes, freeze the spec and
  cut ft/N. Use when the user says /ft-gate N after /ft-spec finished in
  Codex. Recommended model per the spec's handoff line (Fable 5 when the
  spec carries UNSURE flags, Opus 4.8 otherwise); advisory, never a gate:
  an owner invocation runs on the session's current model.
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *)
model: inherit
---

# Gate: judge the spec, ask the owner only what needs the owner

Inputs: the stub issue `<N>`, `.feature/spec-<N>.md`, `.feature/critique-grok.out.json`.
If the critique file is missing or the lane died, relaunch it (a dead lane is
reported, never silently skipped):

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh grok critique-grok
```

## 1. Judge (depth scales with the decision list)

* **Trivial decision list** (no UNSURE flags, no risk paths, no schema/auth/money/posting): skip deep review; go straight to phase 2.
* **Otherwise, review the DECISIONS, not the document:** for each technical decision, does the grounded code support it; spot-read the cited files where a decision smells wrong; weigh grok's critique on its merits and record accept/reject in one line each. Check the "skills consulted" audit line against the diff paths the spec names.
* **The stub is binding:** `Decided` items are vetoes; the journeys must all appear in the spec with dispositions. A spec that dropped a journey or contradicts a Decided item goes back to Codex with the specific defect, never patched silently here.

## 2. Present to the owner (plain language only)

The owner gates PRODUCT; this session gates technical. Surface, in this order:

* **Product decisions:** what a user experiences, per state and failure, with the exact copy.
* **What happens when (input space):** each input class in one plain line ("paste just `example.com`: X happens"). An out-of-scope class is stated here; the owner's yes is what makes it legitimately out of scope.
* **The walkthrough:** the exact post-build click-through the owner will later run on localhost. The owner may push back ("why aren't we checking X") and the spec is amended before approval.
* **Open judgment calls:** anything genuinely needing the owner, each with a recommendation.

No file paths, no identifiers, no technical prose on this screen.

## 3. Close on yes

Compose `.feature/gate-<N>.md`: the stub body + an appended `## Approved decisions` section (product decisions, input-space table, walkthrough, adjudication one-liners). Then:

```bash
bash .claude/skills/ft/scripts/start.sh --issue <N> .feature/gate-<N>.md
```

The script puts the composed body on the issue and lands on `ft/<N>`
(adoption-aware; its resolution is the contract). Then STOP with the handoff:

<exit-example>

Issue #118 approved, `ft/118` cut. Now switch to Codex on gpt-5.6-sol high and run:

```
/ft-build 118
```

</exit-example>
