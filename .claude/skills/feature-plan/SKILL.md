---
name: feature-plan
description: >-
  Phase 1 of the feature flow, standalone: the plan gate (the plan is the spec).
  Use when the user says /feature-plan, "plan this feature", "spec this out", or
  wants a plan gate without committing to the full flow. Not for building — that
  is /feature-build.
argument-hint: "[feature description | roadmap issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# The plan ✋ — spec and plan, one gate

One document, **the plan**: it is the spec and the plan at once. It must be
**hyper-specific** — the build phase runs as a dumb executor on a cheap model,
so everything that requires judgment is decided HERE, on this session's model
(run plan sessions on the owner's top dial). Seed from `$ARGUMENTS` (a feature
description, or an existing roadmap issue number to graduate) or the
conversation.

Communication: the `Flow` output style governs — no interim prose; the ✋ gate
is where you write in full.

## 1. Preflight

- The slice comes from the user's ask — never self-served. If `$ARGUMENTS`
  names an existing issue, `gh issue view` it: its body is the raw ask.
- Scratch lives in `.feature/` (self-gitignoring: `mkdir -p .feature && printf
  '*\n' > .feature/.gitignore`).

## 2. Clear the thinking — before any drafting

Invoke `first-principles-thinking` seeded with the raw ask — this phase's
thinking gate, not optional. It strips the ask to its load-bearing problem and
the minimal rebuild; its concluded action IS the confirmed ask. Still rambling
after that → interview one question at a time, each with your best-guess answer
attached, until the ask is coherent. (These are conversations, not sign-offs —
the ✋ in step 6 is this flow's only approval gate.)

## 3. Grounding pack — ONE cheap agent, not a fan-out

Dispatch **one agent, `model: sonnet`, `effort: low`** (state both explicitly
in the dispatch — a model named in prose silently runs on whatever the session
is). It returns one compact pack; the session never re-derives any of it.

The agent gathers:

- **Skill constraints.** Run `bash .claude/workflows/list-plan-skills.sh` for
  the live inventory, select ONLY the knowledge skills whose remit the
  confirmed ask genuinely touches — **status/action skills (env listing,
  deployment status, deploy commands) are never selected**; they are facts, not
  constraints, and planning runs on the decisions already in AGENTS.md. Invoke
  each selected skill and distill its hard constraints for this slice.
- **Guards.** AGENTS.md plus every `.claude/rules/*.md` whose `paths:`
  frontmatter matches the predicted touch-paths — distilled, not pasted.
- **Ground truth.** Excerpts (signatures, exported types, route shapes) of the
  files the slice will touch or interface with.

## 4. Draft — this session, hyper-specific

Write the full plan yourself. Charter:

- **Diverge before committing** (this replaces the retired idea-refine skill):
  enumerate 2–3 candidate approaches with one-line trade-offs, commit to one,
  and record the rejections in the Approach section. Simplicity is the
  tiebreaker among correct designs, never a license to drop a requirement.
- **Specificity contract:** every build task names its files, its exact
  interfaces/signatures, and near-code for anything non-obvious — written so a
  sonnet-low executor needs judgment only for implementation nuance (imports,
  adjacent idiom, minor type friction), never for design.
- **Actor contract — every step names WHO performs it.** A step is either
  `BUILD` (the executor writes code), `QC` (verified by the QC battery), or
  `OWNER-MANUAL` (the owner does it by hand — anything in a live/production UI,
  anything spending real money, anything on the owner's accounts). An
  `OWNER-MANUAL` step is a handoff: the flow presents it and STOPS; no phase
  ever performs it, drives a browser toward it, or "sets it up" beyond stating
  what to do. This is load-bearing: on #72 a plan step reading "manual Post to X
  in a logged-in production browser session" was absorbed by the build phase,
  which opened a browser on production and typed login credentials itself.
  "Manual" without a named actor gets reinterpreted; the label is the fix.
- **Weight call — one line, decided here, binding downstream.** Classify the
  slice and record `## Weight: light | standard | heavy` in the plan:
  - `light` — ALL of: roughly ≤4 files, no schema/auth/money/posting path, no
    new dependency, no new route or page.
  - `heavy` — ANY of: schema/data migration, auth or session surface, real
    money spend, live posting, a new trust boundary, or roughly >15 files.
  - `standard` — everything else.
  The weight rides in the issue body; downstream phases read it and never
  re-classify mid-flight. A misclassification is visible to the owner at the ✋
  gate, next to the plan it describes — that is the safety on this lever.
- Sections (unchanged, downstream depends on them): **Definition of done**
  (the ship gate's yardstick) · **Approach** (with the rejected alternatives) ·
  **## Weight** (above) · **In scope / Deferred** · **Build steps** (per-task
  files + the skills each task invokes) · **## Stack & design acceptance
  criteria** (what QC verifies the built diff against).

## 5. Critique — three external families, zero Claude

**Weight gates this step.** `light`: skip external critique entirely — the
top-dial draft plus its own divergence pass IS the whole plan phase; go
straight to the gate. `standard` / `heavy`: launch all three families.

Launch all three in background via the council bridge and end the turn — the
harness re-invokes you as each finishes. For each family, write the prompt
(plan + grounding pack + "verify claims against the actual code, cite paths;
work requirement by requirement; an empty list is a valid verdict only after
that") to `.feature/critique-<family>.in.txt`, then run — with
`run_in_background: true` on each:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh <family> critique-<family>
```

Families and models: `codex` (`COUNCIL_MODEL=gpt-5.6-sol`, tier high) · `grok`
(grok-4.5, tier high) · `agy` (`COUNCIL_TIER=gemini-3.1-pro-high`). A lane that
fails or returns empty without having worked the requirements is reported as
failed — never treated as approval.

## 6. Refine + gate ✋

Adjudicate each critique on its merits — fix the real ones, reject taste and
scope inflation — and record every accept/reject call in a "Critique
adjudication" section. Present the final plan to the user in full. **Scope
discipline is the owner's to enforce at the gate**: everything asked for
together is one slice; Deferred is only a substantial related slice better
built after this lands; incidental ideas → drop.

## 7. Close the gate

On the user's explicit approval:

- New ask: `bash .claude/skills/feature/scripts/start.sh "<title>" <plan-file>`
- Graduating a roadmap issue: `bash .claude/skills/feature/scripts/start.sh
  --issue <N> <plan-file>` — the plan becomes that issue's body; no duplicate
  issue is ever created.

Either way the script prints the issue number and cuts `ft/<issue#>` from
fetched `origin/beta`. Under `/feature` the run continues; standalone, stop —
the next session picks up with `/feature-build <issue#>` on the owner's build
dial (sonnet low).
