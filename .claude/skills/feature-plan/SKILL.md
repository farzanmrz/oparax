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

It runs three stages: a **scope pre-pass** predicts which stack areas the slice
touches (there is no diff yet — it infers from the ask + a repo grep) and fires only
those lenses; a parallel **brief** per fired lens, each invoking its own skill
(`vercel:nextjs` · `vercel:react-best-practices` · `web-design-guidelines` ·
`frontend-design` on new surfaces · `vercel:ai-sdk`+`vercel:ai-gateway` ·
`supabase:supabase`+postgres · always `repo-fit`, which reads AGENTS.md + the
`.claude/rules/` guards); then a **synthesis** step (opus) that assembles 2–3
candidate approaches, picks one via the four lenses (**risk-first**,
**YAGNI-minimal**, **vertical-slice**, **verification-first**), reconciles the briefs
(additive → merge; conflicting → decide + log why), and returns ONE plan.

The returned `plan` markdown carries: **Definition of done** (the slice contract;
feature-ship's triage measures every "fix now" against it), the **decided approach
only**, an **In scope / Deferred** split (everything asked for together is in scope —
a minimal UI tweak *and* a major schema change are one slice; Deferred is only a
substantial related slice better built after this lands; incidental "while we're
here" ideas → drop, never inflate), **Build steps** for a zero-context
engineer (file map first; bite-sized tasks with exact file ownership + interfaces +
per-task the skills to invoke;
feature-build copies these into briefs; full code in non-obvious steps; no
placeholders), and a **## Stack & design acceptance criteria** checklist that
feature-qc verifies the built diff against.

Read the returned plan critically before the gate — you are the decider; the workflow
grounds and drafts, you own the final call. Fix anything it got wrong, then present
it. Never propose anything a hard guard forbids.

## 4. GATE ✋
**Paste the full plan into chat** (never a file pointer). Revise until
the user's explicit go. On approval, pipe the approved plan — exactly as pasted —
into `.claude/skills/feature/scripts/start.sh "<feature name>"` on stdin (heredoc; no
file argument): cuts `ft/<issue#>` from clean dev, opens the issue with the plan as
body (capture the issue number — its only stdout line). The issue is now the single
source of truth.

Rules: scope freezes at this gate. Planning docs never enter the repo — the issue
body is the record.
