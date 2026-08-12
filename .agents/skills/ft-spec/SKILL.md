---
name: ft-spec
description: >-
  Phase 2 of the feature flow: author the decision-complete spec for a stub
  issue. Runs in Codex (recommended dial: sol high) or Claude Code (the gate that judges
  this spec runs in Claude Code as /ft-adj). Use when the user says
  /ft-spec N, "spec this out", or "plan this feature" for a stubbed
  functionality. Not for stubbing ideas (/ft-plan) and not for building
  (/ft-build).
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Bash(curl *)
model: inherit
---

# Spec: ground, probe, decide, write

Author the spec that lets build execute without designing. The spec is
DECISION-COMPLETE, not code-complete: decisions, contracts, and journeys,
with near-code only where a contract is genuinely tricky. Recommended dial (advisory, never a gate):
`gpt-5.6-sol` high. Seed from the stub issue in `$ARGUMENTS` (title, bullets,
journeys, `Decided` binding, `Notes` dossier).

## 1. Ground

* **In code:** read the files the slice touches or interfaces with (signatures, exported types, route shapes). Mention paths explicitly; flag missing information instead of guessing.
* **In reality:** when the slice depends on anything outside the repo (third-party sites, external APIs, live data shapes), probe the real thing NOW: fetch the actual domains the journeys name, hit the actual endpoints, read the actual DB rows. Record status codes and payload shapes in `.feature/probes.md`. A spec written against imagined external behavior is ungrounded no matter how well it cites the repo.
* **Surfaces are evidence-bound:** verify every surface the stub names against the code (the route, page, or component exists in the tree today — no browser probing); a stub-named surface with no code path is flagged back to the owner in the decision list, never specced around or silently expanded.
* **Skills by path (mechanical, no judgment):** spawn EXACTLY ONE matching `*-rules` distiller agent per matched row below, all in parallel, in one round, each briefed with the touched paths and a one-line change description. Their compact packs replace reading skill files inline. Never spawn anything else, never a second round, and distillers never spawn agents themselves. Record one audit line in the decision list: "rules consulted: ...". The adjudicator checks this line against the diff paths.

| Slice touches | Distiller agent |
|---|---|
| `app/`, `components/` (any UI) | `ux-rules` |
| `supabase/`, any query or schema | `supabase-rules` |
| `lib/agent/`, model calls, gateway | `ai-sdk-rules` |
| routes, middleware, config, deploy | `nextjs-rules` |
| niche platform features (blob, queues, functions) | the matching platform skill, read inline, on demand |

## 2. Write the spec (local files, not the issue)

Write to `.feature/spec-<N>.md`, section by section as you go — a killed
session resumes from the last completed section, never from scratch. The
issue gets nothing yet; the gate posts the approved summary later.
Required sections:

* **Product decisions**, plain language: what a user experiences, per state and per failure, including exact user-facing copy for graceful failures.
* **Technical decisions**: one line each with its why; mark every low-confidence decision with `UNSURE:` and what would settle it. This list is what the gate reviews.
* **Input space**: every class of input each user-facing entry point admits, each dispositioned: handled (mechanism named), graceful failure (copy + recovery step), or out of scope (the owner acknowledges at the gate). A silently hard-failing class is a spec defect. The modal input is the PRIMARY acceptance case. Worked derivations: `references/input-space-examples.md`.
* **Acceptance journeys**: the stub's, refined to observable expectations with real inputs.
* **Owner walkthrough**: the exact post-build sequence the owner will click through ("open X, paste Y, you should see Z"), derived from the journeys, plain language. This becomes the gate presentation and the owner's pre-ship checklist; QC never drives the UI, so anything only eyes on a rendered surface can judge lives here, on the owner's list.
* **Build steps**: per-task files and the skills each task invokes. Never commission a test harness, fixture suite, benchmark, or regression lab unless the owner explicitly ordered one in the stub: the proof bar is build + boot + each journey experienced once. Any script a task does commission runs its independent model/network calls concurrently.
* Near-code ONLY where a contract is tricky; write it in Biome-clean idiom (`next/image`, complete hook dependency arrays).

## 3. Exit

Fire the grok critique as the LAST act, then stop:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh grok critique-grok
```

The brief (`.feature/critique-grok.in.txt`): the spec + "PRE-IMPLEMENTATION review: the tree holds current code, none of this is built; verify the spec's claims about the code, attack the design, and ATTACK THE FRAME: name real inputs or conditions this spec never mentions but a real user will produce; a missing input class outranks any in-frame bug."

End with the handoff, stating whether the decision list carries `UNSURE:` flags:

<exit-example>

Spec written to `.feature/spec-118.md`; grok critique running in the background. Decision list: 2 UNSURE flags.

Now switch to Claude Code and run (Fable 5 because of the UNSURE flags; Opus 4.8 is fine when there are none):

```
/ft-adj 118
```

</exit-example>

## Council mode (only when the invocation says "council")

For genuinely architectural slices the owner escalates: this session authors
its plan, AND the owner separately asks grok to author a rival plan
(`plan-proposal-schema.json`), both to `.feature/`. The gate then adjudicates
competing drafts instead of one draft plus a critique. Never the default.
