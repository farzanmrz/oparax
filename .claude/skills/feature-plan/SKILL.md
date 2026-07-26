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

It runs six stages, grounded **once** (Scope + Lenses), drafted by **the session
model alone**, then hardened by an external adversarial critique round. (The
four-family draft council this replaces was measured on the slice-69 run: all four
families independently chose the same spine, and the cross-draft merge introduced
contradictions the critique stage then had to catch — cross-model spend belongs on
attack, not on drafting the same plan four times.)

**Scope** selects the lenses from the **live skill inventory** (`list-plan-skills.sh`
— the stack plugins + repo build skills, self-updating; not a fixed menu) rather than
a hardcoded set, so a slice needing `vercel:marketplace` / `vercel-connect` /
`chat-sdk` / `workflow` actually reaches them; the same pass reads AGENTS.md and
glob-matches the slice's predicted paths against the `.claude/rules/` `paths:`
frontmatter to gather the applicable guards into a digest (there is no diff at plan
time to auto-inject them). The digest seeds every downstream stage; the external
critics additionally explore the repository themselves (deep, read-only), so it is
their starting map rather than their only ground truth.

**Lenses** fan out **one repo-grounded agent per selected skill, named after the
skill** (no bundling, no cap below the inventory); each invokes its skill and returns
hard constraints + acceptance criteria + conflicts to watch.

**Consolidate** merges every lens's constraints into one deduped constraint set and
names a **2–3 candidate menu** — a seed for the Draft stage, not a ceiling; the
drafter is free to deviate from it if it sees a stronger spine.

**Draft** is ONE plan, written by the session model: pick a spine from the menu (or
a stronger one), commit to it, and emit the full build-ready plan directly in its
final sections — no council, no synthesis-across-drafts.

**Critique** sends the plan to three external families, each **deep** (repo-resident,
read-only, verifying the plan's claims against the actual code) at its **tier
ceiling** — critique is each family's only seat and the terminal gate before the
human one. Charters are distinct: Codex/gpt-5.6-sol (high) digs deepest on
infrastructure durability + internal consistency; Grok-4.5 (high) on requirement
traceability + unjustified complexity; Gemini-3.1-pro (high) via `agy` on repo-guard
compliance + concrete risk. Each must work through the plan requirement by
requirement before an empty list counts as a valid verdict; the charter forbids
performative criticism. No Claude critic — the session model wrote the plan, so
that would be self-review. (Known risk, accepted 2026-07-26: the agy lane returned
5/5 empty critiques in the old shallow text-only mode; deep mode is the bet that
bounded evidence-checking — the shape of its productive QC Verify seat — engages
it. Repeated deep empties are the new fact that reopens the seat.)

**Refine** adjudicates each critique on its merits (fix the real ones, reject taste
and scope inflation) and emits the final hardened plan, with a "Critique
adjudication" section recording every accept/reject call. Zero surviving critiques
skips Refine and ships the Draft output unchanged.

Every design stage carries a calibrated simplicity pressure: the simplest
architecture that satisfies every requirement wins, complexity must pay rent — but
simplicity is a tiebreaker among correct designs, never a license to drop a
requirement or weaken a guard.

**Model policy (the Fable discipline — locked with Farzan):** Scope and Lenses are
extraction/comprehension, not generation — **pinned sonnet, effort medium** (depth is
bought with effort, not tier; Lenses is also the highest-fan-out stage in this
workflow, so it must never inherit — that would multiply spend N skills wide). The
external critique tiers are fixed production values, never re-litigated per run. Exactly
**three** stages inherit your session model + tier and may spend Fable: **Consolidate**
(candidate-menu generation), **Draft** (the plan itself), and **Refine** (critique
adjudication) — all generative, single-call, ceiling-setting acts.
Nothing else in this workflow can spend Fable, by design. There is no `repo-fit` lens — the guards ride in via the Scope digest and via
path-rule auto-injection when a lens reads a matching file.

The returned `plan` carries the standard sections the workflow enforces (so they are
not re-specified here) — Definition of done, Approach, In scope / Deferred, Build steps
(per-task file ownership + the skills each task invokes), and a **## Stack & design
acceptance criteria** checklist. Two are load-bearing downstream: the Definition of
done is the ship gate's yardstick for what finished means (owner-reported
manual-verification findings are implemented regardless of it — feature-ship's triage
rule), and feature-qc verifies the built diff against the acceptance-criteria
checklist.

**Scope discipline is yours to enforce at the gate** — the workflow drafts, you decide:
everything asked for together is one slice (a minimal UI tweak *and* a major schema
change ship together); Deferred is only a substantial related slice better built after
this lands; incidental "while we're here" ideas → drop, never inflate. Read the plan
critically, fix anything it got wrong, and never let it propose what a hard guard
forbids.

## 4. GATE ✋
**Paste the full plan into chat** (never a file pointer). Revise until
the user's explicit go. Before acting on that approval, resolve one value from the
conversation without re-asking if it was already stated:

- **terminal target** — `dev` by default, or the explicitly requested `beta` / `main`.
  Nothing persists it, so carry it in the conversation and pass it to `ship.sh`.

On approval, pipe the approved plan — exactly as pasted — into one kickoff command
on stdin (heredoc; no file argument):

```bash
# stdout is the new issue number.
.claude/skills/feature/scripts/start.sh "<feature name>"
```

The kickoff opens the issue with the plan as its body and cuts `ft/<issue#>` from the
fetched `origin/dev` without checking out local `dev`; the issue is the single source
of truth. Nothing is persisted about the run — the branch identifies the slice, and
the release target is passed to `ship.sh` at ship time. If branch setup fails after
issue creation, the kickoff closes the new issue rather than leaving an orphan.

**Approval is the trigger — no further prompting.** The moment the kickoff succeeds
(issue created carrying the approved plan, `ft/<issue#>` cut and checked out), tell
the user in one line that the branch is cut, naming the retained terminal target so it
is not lost. Continuity across sessions is the global `/handoff` skill's job: when the
user wants to stop, they run `/handoff` and resume in a fresh session with
`/continue <session-id>`.

Rules: scope freezes at this gate. Planning docs never enter the repo — the issue
body is the tracked record.
