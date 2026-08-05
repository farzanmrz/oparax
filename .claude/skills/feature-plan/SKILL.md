---
name: feature-plan
description: >-
  Phase 1 of the feature flow, standalone: the plan gate (the plan is the spec).
  Use when the user says /feature-plan, "plan this feature", "spec this out", or
  wants a plan gate without committing to the full flow. Not for building (that
  is /feature-build). Harness-neutral: runs in Claude Code or Codex.
argument-hint: "[feature description | issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# The plan ✋: spec and plan, one gate

One document: the plan is the spec. It must be hyper-specific (the build phase
runs as a dumb executor on a cheap model, so everything requiring judgment is
decided here). Seed from `$ARGUMENTS` or the conversation.

**Communication rule:** the `Flow` output style governs. No interim prose.
Write in full only at the ✋ gate.

## Dials (per harness)

This skill is single-source: Codex invokes this same file (`$feature-plan`, via
the `.agents/skills/` symlink) and reads its column. A per-harness difference
belongs in this table, never in a second file.

| Stage | Claude Code | Codex |
| --- | --- | --- |
| Session dial | owner's top dial (opus/fable, high) | `gpt-5.6-sol` high (set with `/model` before starting) |
| Thinking gate (phase 2) | `/first-principles-thinking` | `$first-principles-thinking` |
| Grounding pack (phase 3) | one agent, `model: sonnet`, `effort: low` | `cx_grounder` (pinned cheap, read-only in its TOML) |
| Exploration fan-out | native (batch independent Agent calls in one response) | spawn PARALLEL `cx_grounder` instances, named explicitly, when grounding spans 3+ independent files/areas (≤6 threads); Codex never fans out unprompted |
| Critique (phase 5) | externals: `codex` + `grok` + `agy` | `grok` + `agy` externals + the native `reviewer` agent. Spawn `reviewer` explicitly (Codex never delegates off a description). Never launch a codex lane: that family's perspective IS this session. |
| Close (phase 7) | same `start.sh` invocation | same `start.sh` invocation |

## 1. Preflight

* Get the slice from the user's ask, never self-served. If `$ARGUMENTS` is an
  existing issue, run `gh issue view` to read the raw ask.
* Initialize scratch space: `mkdir -p .feature && printf '*\n' > .feature/.gitignore`

## 2. Clear the thinking

Invoke `first-principles-thinking` seeded with the raw ask. Not optional.

* Strip the ask to its load-bearing problem and minimal rebuild.
* The concluded action IS the confirmed ask.
* If still ambiguous, interview the user one question at a time (each with
  your best-guess answer attached) until coherent.
* **Warning:** these are conversations, not sign-offs. The ✋ gate in phase 6
  is this flow's only approval gate.

## 3. Grounding pack

Dispatch **ONE agent** (`model: sonnet`, `effort: low`). State the model and
effort explicitly in the dispatch so it does not silently run on the session's
model. It returns a single compact pack; the session never re-derives any of it:

* **Skill constraints:** run `bash .claude/workflows/list-plan-skills.sh`.
  Select ONLY the knowledge skills the confirmed ask genuinely touches. Never
  select status/action skills (env listings, deploy status, deploy commands):
  they are facts, not constraints.
* **Guards:** distill AGENTS.md's constraints against the predicted
  touch-paths. Distil, do not paste.
* **Ground truth:** extract signatures, exported types, and route shapes of
  the files the slice will touch or interface with.

## 4. Draft the plan

Write the full plan yourself, incorporating the following rules:

### A. Design constraints

* **Diverge before committing:** enumerate 2 to 3 candidate approaches
  differing in SHAPE, not parameters (data-model-first, UI-first,
  reuse-what-exists). State one-line trade-offs. Commit to one; record the
  rejections in the Approach section. Three flavors of the same idea is a
  failed divergence. Simplicity is the tiebreaker among correct designs,
  never a license to drop a requirement.
* **Design intent (UI-touching tasks):** specify hierarchy, spacing, states,
  and motion/streaming behavior in the near-code, grounded in the repo's UI
  conventions and ai-elements idioms. "Works but ugly" is a spec defect: QC's
  design critic judges the rendered result against exactly this intent.
* **Design freedom is `reuse`, always:** every UI-touching task carries
  `[design: reuse]`. Binding ladder, in order: vendored component
  (shadcn/ai-elements) -> existing bespoke chrome -> composition of existing
  primitives -> new, with a one-line justification for why the ladder failed.
  No new visual patterns, no new spacing/radius/color decisions.

* **v0 interlude (when the ask includes a v0 design pass):** the plan
  declares it as an explicit OWNER-V0 step in the build list, placed after
  the skeleton tasks it designs against. The ladder governs the skeleton
  only; from the merge-back on, the v0 winning design IS the design spec,
  and the post-v0 QC round judges conformance to IT (see feature-find's
  yardstick). Leaving the interlude implicit is the recurring failure: the
  flow then ships or verifies around v0 instead of through it.
* **States are part of the spec:** enumerate observable states (pending,
  streaming-empty, mid-stream, done, each failure) and specify intent per
  state. Keep render paths presentational-pure (props in, pixels out, no
  timers, no pipeline knowledge) so every state is deterministically reachable.

### B. Execution and actor contracts

* **Specificity contract:** name exact files, interfaces/signatures, and
  near-code for anything non-obvious. Write so a sonnet-low executor needs
  judgment only for implementation nuance, never for design.
* **Actor contract:** every step names WHO performs it:
    * `BUILD`: the executor writes code.
    * `QC`: the battery verifies it.
    * `OWNER-MANUAL`: the owner does it by hand (anything in a live/production
      UI, anything spending real money, anything on the owner's accounts).
      **A handoff step: the flow presents it and STOPS.** No phase performs
      it or drives a browser toward it. "Manual" without a named actor gets
      reinterpreted, so the label is the fix.
    * `OWNER-V0`: the owner drives v0 (GitHub-synced) against the ft branch:
      v0 cuts its own `v0/*` branch from it and merges the winning design
      back into it. A handoff step like OWNER-MANUAL: the flow presents what
      v0 designs against (the built contract) and STOPS. The merge-back is
      unreviewed code, so a fresh QC round over the branch is MANDATORY after
      it and the plan's step list says so explicitly.

### C. Required document sections

Downstream phases depend on these exact sections:

* Definition of done
* Approach (including rejected alternatives)
* In scope / Deferred
* Build steps (per-task files + the skills each task invokes)
* Stack & design acceptance criteria

**In scope / Deferred format:** each is a BULLETED LIST, one item per bullet,
never a dot-separated or comma-run-on inline list (run-on lists are unreadable
at the gate, so bullets are the fix). Each bullet keeps its technical phrasing
and appends a short plain-language gloss a non-engineer owner understands.

<scope-bullet-example>
* trigram fuzzy search: better typo-tolerant search, a later upgrade
</scope-bullet-example>

## 5. Critique

Run three external CLI lanes: `codex`, `grok`, and `agy`. Judge a lane on its
current output, never on its accumulated failure count.

### A. Briefs, not toolkits

All three CLIs reach this working tree with full read access and read
`AGENTS.md` themselves, so a critic is never short of capability: it is short
of this slice's context. The `.in.txt` brief carries the distilled guards from
phase 3. Do not give external families skills, agents, or MCP of their own.

### B. Pre-critique check

The selftest exits in 0.2s unless a wrapper, profile, or CLI version moved
since the last green run:

```bash
bash .claude/workflows/council/selftest.sh --if-changed
```

### C. Launch the lanes

Write each lane's prompt to `.feature/critique-<family>.in.txt` combining:
plan + grounding pack + "verify claims against the actual code, cite paths;
work requirement by requirement; an empty list is a valid verdict only after
that" + the pre-implementation framing below. Launch all three in the
background (`run_in_background: true`) and end your turn; the harness
re-invokes you when they finish.

* **Pre-implementation framing (mandatory in every brief):** state that this
  is a PRE-IMPLEMENTATION plan review: the tree holds the current code, none
  of the plan is built yet, and "planned file X is absent" or "the code still
  does the old thing" is not a finding. Lanes verify the plan's CLAIMS about
  the current code and attack the DESIGN. Without this line a lane audits the
  tree against the plan and returns "not implemented yet" as blockers.

**Codex** (append to its `.in.txt` only: "You have repo-defined subagents:
spawn `pr_explorer` to map and evidence the code paths each build task names,
then have `reviewer` judge requirement-by-requirement against that evidence.
Wait for all, then return ONLY the schema JSON."):

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_MODEL=gpt-5.6-sol \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh codex critique-codex
```

**Grok:**

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh grok critique-grok
```

**Agy:**

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" \
  COUNCIL_DEPTH=deep COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh agy critique-agy
```

### D. Tier and failure rules

* **Tier is family-shaped;** never copy one lane's `COUNCIL_TIER` onto
  another. Codex takes `COUNCIL_MODEL=gpt-5.6-sol` at effort high. Grok is
  single-model (`grok-4.5`) at effort high, never xhigh/max (those error).
  Agy's tier IS its model slug (`gemini-3.1-pro-high` by default): that CLI
  fuses model and effort and rejects them as separate flags.
* **Failure conditions:** a lane that fails, or returns empty without having
  worked the requirements, is reported as FAILED, never treated as approval.
  `AGY_EMPTY` is no-signal, not approval. All three failing = no external
  critique, and the adjudication must say so explicitly.

## 6. Refine and gate ✋

Adjudicate each critique on its merits: fix the real ones, reject taste and
scope inflation. Record every accept/reject call in a "Critique adjudication"
section.

**Scope and terminology discipline:**

* The owner enforces scope at the gate. Everything asked for together is one
  slice. Deferred is only a substantial related slice better built after this
  lands. Incidental ideas are dropped.
* Terms of art get a one-clause definition at first use. Anything renamed or
  reworked during drafting is stated fresh, never as "as discussed".

**Presentation formatting:**

* **Spec vs. presentation:** the STORED plan document (the future issue body,
  executed by a cheap model at build) stays the hyper-specific spec with
  near-code; the gate presentation is a reader-facing layer ON TOP of it.
  These readability rules govern presentation, never a dumbing-down of the
  stored spec.
* **No prose walls:** "Today vs. after this slice" and "User narrative" use
  short bullets or clearly labeled subsections, plain language first with the
  technical detail kept alongside, never dropped.
* **Scope lists:** "In scope" and "Deferred" keep the phase 4C format at the
  gate too: one item per bullet with its plain-language gloss, never a
  dot-separated or comma-run-on inline list.

**Present the plan to the owner strictly in this order** (the owner approves
as a user first, developer second, and should never need a clarifying
question):

* **Definition of done:** first thing on screen.
* **Today vs. after this slice:** what exists now, what changes, what is
  brand new, as short bullets or labeled subsections.
* **User narrative:** a step-through of the feature working, so the owner
  sees the whole behavior before any technical detail.
* **The full plan:** every section from phase 4.
* **Critique adjudication:** every accepted item and every rejected item
  carries its technical statement plus a plain-words explanation the owner
  reads as a user (what was wrong, or why it was rejected).

## 7. Close the gate

Upon explicit owner approval, run the close script:

* New ask: `bash .claude/skills/feature/scripts/start.sh "<title>" <plan-file>`
* Existing issue: `bash .claude/skills/feature/scripts/start.sh --issue <N>
  <plan-file>` (the plan becomes that issue's body; no duplicate issue is
  ever created)

The script prints the issue number and lands on `ft/<issue#>`. It is
adoption-aware: an existing local/remote `ft/N` is adopted (fast-forwarded
onto beta only when it has no unique commits), a current `ft/N-*` branch is
renamed to `ft/N` local+remote, a fresh cut from `origin/beta` is the
fallback, the clean-tree requirement applies only when it must switch or
create, and prose is unwrapped before posting (GitHub renders issue newlines
as hard breaks). Never work around the script; its resolution IS the
contract. **Then STOP, always, under `/feature` too.** The issue body is
now the complete spec, which is what makes the app-jump clean. End the session
with this exact message format:

<final-message-example>
Issue #N opened, `ft/N` cut. Build it whenever and wherever you like:
**(a)** a Claude session on your build dial: `/feature-build N`
**(b)** a Codex chat on a cheap dial (`gpt-5.3-codex-spark`): `$feature-build` for issue N.
Then QC in either app: `/feature-qc` or `$feature-qc`.
</final-message-example>
