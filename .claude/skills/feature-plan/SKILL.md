---
name: feature-plan
description: >-
  Phase 1 of the feature flow, standalone: the plan gate (the plan is the spec).
  Use when the user says /feature-plan, "plan this feature", "spec this out", or
  wants a plan gate without committing to the full flow. Not for building — that
  is /feature-build. Harness-neutral: runs in Claude Code or Codex.
argument-hint: "[feature description | issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# The plan ✋ — spec and plan, one gate

One document, **the plan**: it is the spec and the plan at once. It must be
**hyper-specific** — the build phase runs as a dumb executor on a cheap model,
so everything that requires judgment is decided HERE, on this session's model
(run plan sessions on the owner's top dial). Seed from `$ARGUMENTS` (a feature
description, or an existing issue number to plan) or the
conversation.

Communication: the `Flow` output style governs — no interim prose; the ✋ gate
is where you write in full.

## Dials — per harness

This skill is single-source: Codex invokes the same file (`$feature-plan`, via
the `.agents/skills/` symlink) and reads the Codex column. The `cx-feature*`
twins were deleted 2026-07-30 — they had drifted into weaker copies (the Codex
plan skill carried the `OWNER-MANUAL` rule but had lost the #72 incident that
justifies it, and had dropped design-intent-is-spec entirely), which is what a
duplicated skill does over time. A per-harness difference belongs in this
table, never in a second file.

| Stage | Claude Code | Codex |
|---|---|---|
| Session dial | owner's top dial (opus/fable, high) | `gpt-5.6-sol` high — set with `/model` before starting |
| Thinking gate (step 2) | `/first-principles-thinking` | `$first-principles-thinking` — same skill, mirrored into `.agents/skills` |
| Grounding pack (step 3) | one agent, `model: sonnet`, `effort: low` | `cx_grounder` (pinned cheap + read-only in its TOML) |
| Critique (step 5) | both externals: `codex` + `grok` | `grok` + `agy` externals + the native `reviewer` agent (`.codex/agents/reviewer.toml` — the oparax critic contract, spawning `pr_explorer` for evidence). The codex family's perspective IS this session, so it never launches a codex lane against itself. **Spawn `reviewer` explicitly** — Codex never delegates off a description. |
| Close (step 7) | same `start.sh` invocation | same `start.sh` invocation |

## 1. Preflight

- The slice comes from the user's ask — never self-served. If `$ARGUMENTS`
  names an existing issue, `gh issue view` it: its body is the raw ask.
- Scratch lives in `.feature/` (self-gitignoring: `mkdir -p .feature && printf
  '*\n' > .feature/.gitignore`).

## 2. Clear the thinking — before any drafting

Invoke `first-principles-thinking` seeded with the raw ask — this phase's
thinking gate, not optional. It is a global skill mirrored into `.agents/skills`,
so Codex reaches the same file as `$first-principles-thinking`. It strips the ask to its load-bearing problem and
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
- **Guards.** AGENTS.md plus **every** `.claude/rules/*.md` whose `paths:`
  frontmatter matches **any** predicted touch-path — check each rule against each
  path, distil, do not paste.
- **Ground truth.** Excerpts (signatures, exported types, route shapes) of the
  files the slice will touch or interface with.

## 4. Draft — this session, hyper-specific

Write the full plan yourself. Charter:

- **Diverge before committing** (this replaces the retired idea-refine skill):
  enumerate 2–3 candidate approaches that differ in SHAPE, not parameters —
  name the angle each takes (e.g. data-model-first, UI-first, pipeline-first,
  reuse-what-exists) — with one-line trade-offs; commit to one; record the
  rejections in the Approach section. Three flavors of the same idea is a
  failed divergence. Simplicity is the tiebreaker among correct designs,
  never a license to drop a requirement.
- **Design intent is part of the spec for UI-touching tasks.** Any task that
  renders something states its hierarchy, spacing, states (loading/empty/
  error), and motion/streaming behavior in the near-code — grounded in the
  repo's UI rules (AGENTS.md conventions, `.claude/rules/components.md`,
  ai-elements idioms), which the grounding pack must distill for UI slices.
  "Works but ugly" is a spec defect, not an executor defect: QC's design
  critic judges the rendered result against exactly this intent.
- **Design freedom is `reuse`, always.** Every UI-touching task carries
  `[design: reuse]`. The component ladder is binding, in order: vendored
  component (shadcn/ai-elements) → existing bespoke chrome → composition of
  existing primitives → only then something new, with a one-line justification
  for why the ladder failed. No new visual patterns, no new
  spacing/radius/color decisions — the surface reads as if it was always part
  of the app. Build executes the intent this plan freezes; the critic judges
  against that intent, never its own taste.
- **States are part of the spec.** Enumerate the surface's observable states
  (pending / streaming-empty / mid-stream / done / each failure) and specify
  intent per state. Keep render paths presentational-pure — props in, pixels
  out, no timers, no pipeline knowledge — so every state is reachable
  deterministically.
- **Specificity contract:** every build task names its files, its exact
  interfaces/signatures, and near-code for anything non-obvious — written so a
  sonnet-low executor needs judgment only for implementation nuance (imports,
  adjacent idiom, minor type friction), never for design.
- **Actor contract — every step names WHO performs it:** `BUILD` (the executor
  writes code), `QC` (the battery verifies it), or `OWNER-MANUAL` (the owner
  does it by hand — anything in a live/production UI, anything spending real
  money, anything on the owner's accounts).
  **An `OWNER-MANUAL` step is a handoff: the flow presents it and STOPS.** No
  phase performs it, drives a browser toward it, or "sets it up". This is
  load-bearing — on #72 a step reading "manual Post to X in a logged-in
  production browser session" was absorbed by build, which opened a browser on
  production and typed credentials. "Manual" without a named actor gets
  reinterpreted; the label is the fix.
- Sections (unchanged, downstream depends on them): **Definition of done**
  (the ship gate's yardstick) · **Approach** (with the rejected alternatives) ·
  **In scope / Deferred** · **Build steps** (per-task files + the skills each
  task invokes) · **## Stack & design acceptance criteria** (what QC verifies
  the built diff against).

## 5. Critique — three external families, zero Claude

This is the phase where external critique demonstrably earned its keep (~86
accepted critiques against 7 rejections across six slices). Three lanes run:
**`codex`**, **`grok`** and **`agy`**.

**Each lane needs a brief, not a toolkit.** All three CLIs reach this working
tree with full read access and read `AGENTS.md` themselves, so a critic is never
short of capability — it is short of *this slice's* context. That is the
`.in.txt`'s job, and it is why no family gets skills, rules, agents or MCP of
its own: the grounding pack from step 3 already distilled the matching
`.claude/rules/*.md` guards, and pasting those distilled guards into the brief
beats any harness-side rules import (slice-scoped instead of blanket, and it
works identically for a family with no rules mechanism at all).

**Judge a lane on POST-FIX behaviour, never on its accumulated failure count** —
a detach of grok+agy was proposed 2026-07-30 and reversed the same day once the
record was read. The evidence is in `council/run.sh`'s header; don't re-derive
it. Prove the lanes instead of trusting them — this exits in 0.2s unless a
wrapper, profile or CLI version moved since the last green run:

```bash
bash .claude/workflows/council/selftest.sh --if-changed
```

Write each lane's prompt — plan + grounding pack + "verify claims against the
actual code, cite paths; work requirement by requirement; an empty list is a
valid verdict only after that" — to `.feature/critique-<family>.in.txt`, launch
ALL THREE in background, and end the turn; the harness re-invokes you when they
finish. With `run_in_background: true`, one call per family:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh codex critique-codex
```

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh grok critique-grok
```

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh agy critique-agy
```

Tier is family-shaped, so don't copy one lane's `COUNCIL_TIER` onto another:
codex takes `COUNCIL_MODEL=gpt-5.6-sol` at effort high; grok is single-model
(`grok-4.5`) at effort high — never xhigh/max, which error; **agy's tier IS its
model slug** (`gemini-3.1-pro-high` by default), because that CLI fuses model
and effort and rejects them as separate flags. A lane that fails, or returns
empty without having worked the requirements, is reported as FAILED — never
treated as approval. `AGY_EMPTY` is no-signal, not approval. All three failing =
no external critique, and the adjudication must say so.

**Codex delegation line:** append to the codex lane's `.in.txt` only — "You have
repo-defined subagents: spawn `pr_explorer` to map and evidence the code paths
each build task names, then have `reviewer` judge requirement-by-requirement
against that evidence. Wait for all, then return ONLY the schema JSON."

## 6. Refine + gate ✋

Adjudicate each critique on its merits — fix the real ones, reject taste and
scope inflation — and record every accept/reject call in a "Critique
adjudication" section. **Scope discipline is the owner's to enforce at the
gate**: everything asked for together is one slice; Deferred is only a
substantial related slice better built after this lands; incidental ideas →
drop.

**Present the plan to the owner in this order (the gate legibility contract —
the owner approves as a user first, developer second, and should never need a
clarifying question):**

1. **Definition of done** — first thing on screen.
2. **Today → after this slice** — what exists right now, what this changes,
   what's brand new; plain language, a few lines.
3. **As a user, what will happen** — a step-through narrative of the feature
   working ("a post arrives → the judge checks it against your beat → …"),
   so the owner can see the whole behavior before any technical detail.
4. The full plan (every section from step 4).
5. The critique adjudication.

Terms of art get a one-clause definition at first use; anything renamed or
reworked during drafting is stated fresh, never as "as discussed."

## 7. Close the gate

On the user's explicit approval:

- New ask: `bash .claude/skills/feature/scripts/start.sh "<title>" <plan-file>`
- Planning an existing issue: `bash .claude/skills/feature/scripts/start.sh
  --issue <N> <plan-file>` — the plan becomes that issue's body; no duplicate
  issue is ever created.

Either way the script prints the issue number and cuts `ft/<issue#>` from
fetched `origin/beta`. **Then STOP — always, under `/feature` too.** The plan
phase's last words name the owner's two equivalent build paths and end the
session's involvement:

> Issue #N opened, `ft/N` cut. Build it whenever and wherever you like:
> **(a)** a Claude session on your build dial — `/feature-build N` — or
> **(b)** a Codex chat on a cheap dial (`gpt-5.3-codex-spark`) —
> `$feature-build` for issue N. Then QC in either app: `/feature-qc` or
> `$feature-qc`.

The issue body is the complete spec by this phase's contract, so the build
executor needs nothing from this conversation — that is what makes the
app-jump clean.
