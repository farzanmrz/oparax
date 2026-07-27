---
name: cx-feature-plan
description: >-
  Codex-native plan phase for oparax: produce the hyper-specific plan (the plan
  IS the spec), run the external critique council (grok + agy CLIs), gate with
  the owner, then open the ft issue + branch and stop. Use in Codex when the
  owner says $cx-feature-plan or asks to plan/spec a feature slice here.
---

# The plan ✋ — spec and plan, one gate (Codex orchestrator)

One document, **the plan**: spec and plan at once, hyper-specific — build runs
as a dumb executor on a cheap model, so every judgment call is decided HERE.
Run this chat on `gpt-5.6-sol` at high (xhigh for a heavy slice); switch with
`/model` before starting if needed. Seed from the owner's ask or an existing
roadmap issue number (`gh issue view N` — its body is the raw ask).

No interim narration between steps; the ✋ gate is where you write in full.

## 1. Preflight

- The slice comes from the owner's ask — never self-served.
- Scratch: `mkdir -p .feature && printf '*\n' > .feature/.gitignore`.

## 2. Clear the thinking — before any drafting

Strip the ask to first principles yourself, in this chat: name the load-bearing
problem, the minimal rebuild that solves it, and what the ask does NOT require.
If the ask is still ambiguous after that, interview the owner one question at a
time, each with your best-guess answer attached. (Conversation, not sign-off —
the ✋ in step 6 is the only approval gate.)

## 3. Grounding pack — ONE subagent

Spawn the `cx_grounder` agent (pinned cheap + read-only in its TOML) with the
confirmed ask and predicted touch-paths. It returns one compact pack; never
re-derive any of it in this chat:

- **Skill constraints** — the knowledge skills whose remit the ask touches,
  read as files from `.claude/skills/<name>/SKILL.md` (knowledge skills only —
  status/action skills are facts, not constraints). Distilled hard constraints
  for this slice.
- **Guards** — AGENTS.md plus every `.claude/rules/*.md` whose `paths:`
  frontmatter matches the touch-paths — distilled, not pasted.
- **Ground truth** — signatures, exported types, and route shapes of the files
  the slice will touch or interface with.

## 4. Draft — this session, hyper-specific

Write the full plan yourself. Charter (identical to the Claude flow's):

- **Diverge before committing:** 2–3 candidate approaches with one-line
  trade-offs; commit to one; record the rejections in the Approach section.
- **Specificity contract:** every build task names its files, exact
  interfaces/signatures, and near-code for anything non-obvious — written so a
  cheap executor needs judgment only for implementation nuance, never design.
- **Actor contract — every step names WHO performs it:** `BUILD` (executor
  writes code), `QC` (verified by the QC battery), or `OWNER-MANUAL` (the
  owner by hand — anything in a live/production UI, anything spending real
  money, anything on the owner's accounts). An `OWNER-MANUAL` step is a
  handoff: the flow presents it and STOPS; no phase ever performs it or
  drives a browser toward it.
- **Weight call — one line, binding downstream:** `## Weight: light | standard
  | heavy`. `light` = ALL of: ~≤4 files, no schema/auth/money/posting path, no
  new dependency, no new route/page. `heavy` = ANY of: schema/data migration,
  auth or session surface, real money, live posting, a new trust boundary, or
  ~>15 files. Else `standard`.
- Sections (downstream depends on them): **Definition of done** · **Approach**
  (with rejections) · **## Weight** · **In scope / Deferred** · **Build steps**
  (per-task files + the `.claude/skills` knowledge skills each task's executor
  must read) · **## Stack & design acceptance criteria**.

## 5. Critique — external council + one internal second opinion

**Weight gates this.** `light`: skip critique entirely — go to the gate.
`standard`/`heavy`: run the lanes below.

External lanes (grok, agy) run through the shared council bridge as
**background terminals** — launch both, then poll for their `.out.json` files
(e.g. `sleep 60` loops; agy's tmux lane can take ~8 min). For each family,
write plan + grounding pack + charter ("verify claims against the actual code,
cite paths; work requirement by requirement; an empty list is a valid verdict
only after that") to `.feature/critique-<family>.in.txt`, then run in the
background:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh <family> critique-<family>
```

- `grok` — grok-4.5, tier high
- `agy` — `COUNCIL_TIER=gemini-3.1-pro-high` (rides its interactive TUI via
  tmux; the wrapper handles everything — treat it as a black box)

While they run, spawn the `reviewer` agent (repo-defined, `gpt-5.6-sol` high)
with the plan for an independent internal pass — instruct it to critique
requirement-by-requirement against the actual code, not the plan's own claims.
This replaces the codex council lane: the codex family's perspective is native
here. A lane that fails or returns empty without having worked the
requirements is reported as FAILED — never treated as approval.

## 6. Refine + gate ✋

Adjudicate each critique on its merits — fix the real ones, reject taste and
scope inflation — recording every accept/reject in a "Critique adjudication"
section. Scope discipline is the owner's to enforce at the gate.

Present to the owner in this order (the gate legibility contract — approved
as a user first, developer second; no clarifying question should ever be
needed): **1)** Definition of done. **2)** Today → after this slice (what
exists now, what changes, what's new — plain language). **3)** "As a user,
what will happen" — a step-through narrative of the feature working. **4)**
the full plan. **5)** the critique adjudication. Terms of art get a
one-clause definition at first use; nothing is referenced "as discussed."

## 7. Close the gate

On explicit approval:

- New ask: `bash .claude/skills/feature/scripts/start.sh "<title>" <plan-file>`
- Graduating a roadmap issue: `bash .claude/skills/feature/scripts/start.sh
  --issue <N> <plan-file>`

The script prints the issue number and cuts `ft/<issue#>` from fetched
`origin/beta`. **Then STOP — always.** Close with:

> Issue #N opened, `ft/N` cut. Build it whenever and wherever you like:
> **(a)** a new Codex chat on a cheap dial (`gpt-5.3-codex-spark`) —
> `$feature-build` for issue N — or **(b)** a Claude Code session —
> `/feature-build N`. Then QC: `$cx-feature-qc` here or `/feature-qc` in
> Claude Code.

The issue body is the complete spec; the build executor needs nothing from
this conversation.
