---
name: feature-plan
description: >-
  Phase 1 of the feature flow, standalone: the plan gate (the plan is the spec).
  Use when the user says /feature-plan, "plan this feature", "spec this out", or
  wants a plan gate without committing to the full flow. Not for building — that
  is /feature-build.
argument-hint: "[feature description]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# The plan ✋ — spec and plan, one gate

One document, **the plan**: it is the spec and the plan at once. Seed from
`$ARGUMENTS` or the conversation, then work the steps in order.

## 1. Preflight
- The slice comes from the user's ask — never self-served.
- Scratch lives in `.feature/` (self-gitignoring: `mkdir -p .feature && printf
  '*\n' > .feature/.gitignore`).

## 2. Clear the thinking — before any drafting
1. Invoke `first-principles-thinking` seeded with the raw ask **first** — this
   phase's thinking gate, not optional. It strips the ask to its load-bearing
   problem and the minimal rebuild; its concluded action IS the confirmed ask.
2. Still rambling / multi-directional after that → interview one question at a
   time, each with your best-guess answer attached, until the ask is coherent.
3. Direction still genuinely unknown → `idea-refine` (save-path override
   `.feature/`).

These are conversations, not sign-offs — the ✋ gate in step 4 is this flow's only
approval gate.

## 3. Plan the slice — skill-grounded synthesis

The plan is synthesized by a fixed workflow, not drafted freehand, so the stack
skills that apply to the slice are consulted **deterministically** every time (not
left to whether the session remembers to). One
`Workflow({ scriptPath: ".claude/workflows/plan-synth.mjs", args })` call runs the
whole pass — address it by **`scriptPath`, never `name`** (same reason as the QC
workflow: `{ name }` doesn't scan the repo's `.claude/workflows/`). Pass `args`:
`{ ask: "<the confirmed ask from step 2>", context: "<any seed worth carrying>" }`.

It runs five stages, grounded **once** (Scope + Lenses), then synthesized across
**four independent model families** (Draft council), not one model reasoning alone.

**Scope** selects the lenses from the **live skill inventory** (`list-plan-skills.sh`
— the stack plugins + repo build skills, self-updating; not a fixed menu) rather than
a hardcoded set, so a slice needing `vercel:marketplace` / `vercel-connect` /
`chat-sdk` / `workflow` actually reaches them; the same pass reads AGENTS.md and
glob-matches the slice's predicted paths against the `.claude/rules/` `paths:`
frontmatter to gather the applicable guards into a digest (there is no diff at plan
time to auto-inject them). This digest is also the **only** ground truth the three
external families get in Draft council — they do not explore the filesystem — so its
thoroughness is load-bearing.

**Lenses** fan out **one repo-grounded agent per selected skill, named after the
skill** (no bundling, no cap below the inventory); each invokes its skill and returns
hard constraints + acceptance criteria + conflicts to watch.

**Consolidate** merges every lens's constraints into one deduped constraint set and
names a **2–3 candidate menu** — a seed for Draft council, not a ceiling; a family is
free to deviate from it if it sees a stronger spine.

**Draft council** fans out **one fleshed plan per family, concurrent, no per-candidate
multiplication**: Claude (pinned opus) + Codex/gpt-5.6-sol (pinned medium) +
Grok-4.5 (pinned medium) + Gemini-3.1-pro via `agy` (pinned high). Best-effort per
family — a CLI that errors, times out, or returns malformed JSON is dropped; the
Claude draft is the guaranteed floor.

**Synthesize** folds the surviving drafts into ONE final plan: best-reasoned spine,
graft only compatible wins, record load-bearing disagreements under "Conflicts
resolved" rather than averaging them away.

**Model policy (the Fable discipline — locked with Farzan):** Scope and Lenses are
extraction/comprehension, not generation — **pinned sonnet, effort medium** (depth is
bought with effort, not tier; Lenses is also the highest-fan-out stage in this
workflow, so it must never inherit — that would multiply spend N skills wide). The
external draft tiers are fixed production values, never re-litigated per run. Exactly
**two** stages inherit your session model + tier and may spend Fable: **Consolidate**
(candidate-menu generation) and **Synthesize** (the final judge) — both generative,
single-call, ceiling-setting acts. Nothing else in this workflow can spend Fable, by
design. There is no `repo-fit` lens — the guards ride in via the Scope digest and via
path-rule auto-injection when a lens reads a matching file.

The returned `plan` carries the standard sections the workflow enforces (so they are
not re-specified here) — Definition of done, Approach, In scope / Deferred, Build steps
(per-task file ownership + the skills each task invokes), and a **## Stack & design
acceptance criteria** checklist. Two are load-bearing downstream: feature-ship's triage
measures every "fix now" against the Definition of done, and feature-qc verifies the
built diff against the acceptance-criteria checklist.

**Scope discipline is yours to enforce at the gate** — the workflow drafts, you decide:
everything asked for together is one slice (a minimal UI tweak *and* a major schema
change ship together); Deferred is only a substantial related slice better built after
this lands; incidental "while we're here" ideas → drop, never inflate. Read the plan
critically, fix anything it got wrong, and never let it propose what a hard guard
forbids.

## 4. GATE ✋
**Paste the full plan into chat** (never a file pointer). Revise until
the user's explicit go. Before acting on that approval, resolve two values from the
conversation without re-asking if they were already stated:

- **mode** — tracked by default; `current` only when the user explicitly asked to
  work directly on the current branch and that branch is exactly `dev`. Never use
  current mode on `beta` or `main`.
- **terminal target** — `dev` by default, or the explicitly requested `beta` / `main`.

On approval, pipe the approved plan — exactly as pasted — into one kickoff command
on stdin (heredoc; no file argument):

```bash
# Default tracked run: stdout is the new issue number.
.claude/skills/feature/scripts/start.sh --target <dev|beta|main> "<feature name>"

# Explicit direct-dev exception: stdout is "direct:dev".
.claude/skills/feature/scripts/start.sh --current --target <dev|beta|main> "<feature name>"
```

Tracked mode opens the issue with the plan as its body and cuts `ft/<issue#>` from
the fetched `origin/dev` without checking out local `dev`; the issue is the single
source of truth. Direct mode creates no issue or branch: it requires a clean local
`dev` exactly at `origin/dev`, saves the exact approved plan to ignored
`.feature/approved-plan.md`, and records that starting `baseSha` as QC's diff
boundary. Both modes initialize branch-scoped state with the retained terminal
target. If tracked branch setup or state initialization fails after issue creation,
the kickoff closes the new issue rather than leaving an orphan.

Rules: scope freezes at this gate. Planning docs never enter the repo — the issue
body is the tracked record; the direct-run copy is ignored runtime scratch.
