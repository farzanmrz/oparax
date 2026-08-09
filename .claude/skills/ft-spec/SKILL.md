---
name: ft-spec
description: >-
  Phase 1 of the feature flow: turn a stub issue into the approved spec at
  the plan gate (the spec is the plan of record). Use when the user says
  /ft-spec N, "spec this out", or "plan this feature" for a stubbed
  functionality. Not for stubbing ideas (that is /ft-plan, outside the
  flow) and not for building (/ft-build, Codex only). Claude Code only,
  session model set to the best available.
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# The spec ✋: one gate

One document: the spec is the plan of record, hyper-specific down to
near-code. Every judgment call is decided here; the build phase implements,
it never designs. Seed from the stub issue in `$ARGUMENTS`.

**Communication rule:** the `Flow` output style governs. No interim prose.
Write in full only at the ✋ gate.

## Dispatch roster

| Stage | Dispatch |
| --- | --- |
| Session dial | owner's top dial (opus/fable, high) |
| Exploration fan-out | batch independent Agent calls in one response |
| Critique (phase 5) | externals: `codex` + `grok` + `agy` + cline lanes (`kimi-k3`, `minimax-m3`) |
| Close (phase 7) | `start.sh --issue <N>` |

## 1. Preflight

* **The ask is the stub issue:** run `gh issue view <N>` and read the title,
  description, and any `Notes` tail (technical fragments parked by
  /ft-plan: hints, never commitments). No stub, or an empty one: STOP
  and stub first via /ft-plan.
* **Scratch space is `.feature/`:** it always exists (its tracked
  `.gitignore` keeps everything else in it out of git), no setup needed.

## 2. Ground inline

No dispatch: the session reads for itself, so the plan is designed against
real code, never a summary of it.

* **Ground truth:** Read the files the slice will touch or interface with
  (signatures, exported types, route shapes), batching independent reads in
  one response.
* **Ground against reality, not only code:** when the slice depends on anything outside the repo — third-party sites, external APIs, network behavior, live data shapes, device constraints — probe the real thing NOW: fetch the actual domains the stub's journeys name, hit the actual endpoints, read the actual DB rows, record status codes and payload shapes. Park the transcript in `.feature/probes.md` and cite it in the plan. A spec written against imagined external behavior is ungrounded no matter how well it cites the repo (one 30-second fetch of a bot-blocked homepage would have re-framed a slice that instead shipped and failed on first real use).
* **Skill constraints:** two flat lists in `references/`, one skill name
  per line. `guided-skills.md`: consider every entry, select those whose
  area this slice touches. `disallowed-skills.md`: never consider when
  planning. In the session's listing but on neither list: select only if
  its content changes a design decision for this slice.
* **Invoke every selected skill NOW, before drafting:** a skill's
  constraints shape the plan only while they are in context as the plan is
  written. Selection without invocation is a no-op, and it happens
  silently, so state the selection out loud first: one line naming each
  skill taken and each guided-list entry skipped with a word of reason,
  then the invocations in that same response.
* **Guards:** distill them from the grounded code itself — trust boundaries,
  auth shapes, invariants the read files reveal — plus the selected skills.
* **Rationalize:** state what is actually going to be done, stub against
  grounded reality. Discrepancies feed phase 3.

## 3. Confirm the ask

The stub already converged in /ft-plan; never re-litigate the WHAT and
WHY it settled. `Decided` is binding, `Notes` are hints.

* **Read the stub critically, not obediently:** bullets that contradict each
  other, a `Decided` item the grounded code makes incoherent, or an obvious
  missing piece stops drafting until resolved.
* **Genuinely ambiguous: interview the owner,** one question at a time, each
  with your best-guess answer attached, until coherent.
* **Spec the input space, not the example:** enumerate the classes of input/behavior each user-facing entry point admits (worked derivations: `references/input-space-examples.md`). For EVERY class the plan states one of: handled (mechanism named), graceful failure (the exact user-visible copy plus the recovery step), or out of scope (the owner acknowledges it at the gate). A class that silently hard-fails is a spec defect, not an edge case. The stub's modal input is the PRIMARY acceptance case; the conversation's example never substitutes for it.
* **These are conversations, not sign-offs.** The ✋ gate in phase 6 is this
  flow's only approval gate.

## 4. Draft the plan

Write the full plan yourself, incorporating the following rules:

### Plan council (opt-in experiment: only when the invocation says "council")

Off by default; adds competing drafts, never changes the rules below.

* **Launch external planners first:** write one brief per family to
  `.feature/plan-<family>.in.txt`: the confirmed ask + phase 2 ground
  truth and guards + the 4C section list + the specificity contract, then
  launch codex/grok/agy in the background with
  `COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-proposal-schema.json"`, env
  otherwise exactly as phase 5's lanes.
* **Draft your own plan before reading any of theirs:** reading first
  anchors the draft, and an anchored draft is the experiment's null result.
* **Adjudicate on return:** graft genuinely better ideas into your draft;
  record what was adopted from whom, plus the strongest rejected idea per
  family, in the Approach section.
* Phase 5 then critiques the synthesized plan as normal.

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
* **Design alignment, not lockdown:** root `DESIGN.md` is the codified
  aesthetic: new UI aligns with it (tokens, spacing and type scale,
  shadcn/ai-elements idioms) and reuses existing components where they fit
  naturally. A task MAY introduce a new visual pattern when the slice calls
  for it; the design intent states the new pattern and its rationale, and
  that stated intent is what QC judges against. Genuine design EXPLORATION
  is never done silently inside the plan: it is a declared owner handoff
  step (the OWNER-V0 contract; same shape if the owner iterates in Claude
  Design instead), and the merged winner becomes the design spec.

* **v0 interlude (when the ask includes a v0 design pass):** the plan
  declares it as an explicit OWNER-V0 step in the build list, placed after
  the skeleton tasks it designs against. Aesthetic alignment governs the
  skeleton only; from the merge-back on, the v0 winning design IS the design spec,
  and the post-v0 QC round judges conformance to IT (see ft-find's
  yardstick). Leaving the interlude implicit is the recurring failure: the
  flow then ships or verifies around v0 instead of through it.
* **States are part of the spec:** enumerate observable states (pending,
  streaming-empty, mid-stream, done, each failure) and specify intent per
  state. Keep render paths presentational-pure (props in, pixels out, no
  timers, no pipeline knowledge) so every state is deterministically reachable.

### B. Execution and actor contracts

* **Specificity contract:** name exact files, interfaces/signatures, and
  near-code for anything non-obvious. Write so the build phase needs
  judgment only for implementation nuance, never for design. Near-code uses
  the repo's lint-clean idioms (`next/image` not `<img>`, complete hook
  dependency arrays) so build never has to translate away a lint finding
  the spec itself planted.
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
* Acceptance journeys (the stub's, refined to observable expectations, each tagged `QC-LIVE` / `OWNER-MANUAL`; every DoD item traces to at least one journey)
* Input space (the phase 3 enumeration: every class with its disposition — handled / graceful failure / out of scope)
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

Run five external CLI lanes: `codex`, `grok`, `agy`, and two `cline` model
lanes (kimi-k3, minimax-m3; glm-5.2 and deepseek-v4-flash removed by owner
decision 2026-08-08). Judge a lane on its current output, never on its
accumulated failure count.

### A. Briefs, not toolkits

All the lanes' CLIs reach this working tree with full read access and read
`AGENTS.md` themselves, so a critic is never short of capability: it is short
of this slice's context. The `.in.txt` brief carries the guards distilled in
phase 2. Do not give external families skills, agents, or MCP of their own.

### B. Pre-critique check

The selftest exits in 0.2s unless a wrapper, profile, or CLI version moved
since the last green run:

```bash
bash .claude/workflows/council/selftest.sh --if-changed
```

### C. Launch the lanes

Write each lane's prompt to `.feature/critique-<family>.in.txt` combining:
plan + the phase 2 guards and ground truth + "verify claims against the actual code, cite paths;
work requirement by requirement; an empty list is a valid verdict only after
that" + the pre-implementation framing below. Launch Codex, Grok, and Agy in
the background (`run_in_background: true`) and end your turn; the harness
re-invokes you when they finish.

* **Pre-implementation framing (mandatory in every brief):** state that this
  is a PRE-IMPLEMENTATION plan review: the tree holds the current code, none
  of the plan is built yet, and "planned file X is absent" or "the code still
  does the old thing" is not a finding. Lanes verify the plan's CLAIMS about
  the current code and attack the DESIGN. Without this line a lane audits the
  tree against the plan and returns "not implemented yet" as blockers.
* **Frame attack (mandatory in every brief):** instruct each lane, as a separate charter item from claim verification: "ATTACK THE FRAME: name concrete real inputs, user behaviors, or environmental conditions this plan never mentions but a real user will produce. A missing input class outranks any in-frame bug." Lanes that only verify what is written inherit the plan's blind spots — five confirmations of a wrong frame shipped a production failure once; this line is what makes the lanes' diversity attack scope, not just correctness.

**Codex** (append to its `.in.txt` only: "You have repo-defined subagents:
spawn `pr-explorer` to map and evidence the code paths each build task names,
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

**Cline lanes** (two launches, one per model; copy the shared brief to
`critique-<name>.in.txt` first). Launch each in its own named persistent
task/session, record the real task/session id, and do not shell-background
the bridge with `&`. Same env as above plus `COUNCIL_MODEL`;
`COUNCIL_TIER=high` is clamped per model by the wrapper. Each session runs:

```bash
name=kimi
model=moonshotai/kimi-k3
cp .feature/critique-grok.in.txt ".feature/critique-$name.in.txt"
set +e
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" COUNCIL_TIER=high \
  COUNCIL_MODEL="$model" COUNCIL_SCHEMA="$PWD/.claude/workflows/plan-critique-schema.json" \
  bash .claude/workflows/council/run.sh cline "critique-$name" \
  2> ".feature/critique-$name.stderr.log"
rc=$?   # NOT "status": that name is a read-only builtin in zsh, and the assignment error after the bridge completes records a healthy lane as harness-failed
printf '%s\n' "$rc" > ".feature/critique-$name.exit"
exit "$rc"
```

(Use `name=minimax` and `model=minimax/minimax-m3` for the second session. The
grok brief is the clean shared one; codex's carries a codex-only subagent
addendum. Poll each live task/session and its exact `.exit` artifact; read its
exact `.out.json` only after exit `0`. A non-zero exit, or a vanished session
without its exit artifact, is FAILED even if an older output is present.
Adjudication holds for all lanes' returns.)

### D. Tier and failure rules

* **Tier is family-shaped;** never copy one lane's `COUNCIL_TIER` onto
  another. Codex takes `COUNCIL_MODEL=gpt-5.6-sol` at effort high. Grok is
  single-model (`grok-4.5`) at effort high, never xhigh/max (those error).
  Agy's tier IS its model slug (`gemini-3.1-pro-high` by default): that CLI
  fuses model and effort and rejects them as separate flags. Cline is a
  FOURTH shape, model-shaped: each model has its own reasoning ladder and
  `plan-cline.sh` clamps `COUNCIL_TIER` to what the model accepts (kimi-k3
  high, minimax toggle), so pass `COUNCIL_TIER=high` and let the wrapper
  clamp.
* **Failure conditions:** a lane that fails, or returns empty without having
  worked the requirements, is reported as FAILED, never treated as approval.
  `AGY_EMPTY` is no-signal, not approval. A `CLINE_FAILED` lane whose
  `.raw.err` visibly contains a conforming payload is an ENVELOPE failure
  (Cline cannot schema-constrain output): the payload may be recovered by
  hand, validated against the schema, and adjudicated, but the lane is still
  recorded as harness-failed. All lanes failing = no external critique, and
  the adjudication must say so explicitly.

## 6. Refine and gate ✋

Adjudicate each critique on its merits: fix the real ones, reject taste and
scope inflation. Record every accept/reject call in a "Critique adjudication"
section.

* **A cline-attributed wrong reject feeds the lesson file:** when a `cline`
  critique (kimi-k3 or minimax-m3) is rejected specifically because it
  contradicted DESIGN.md, a documented convention, or a frozen owner
  decision — not taste,
  not scope inflation — append one line, inline, no dispatch (you already
  hold the verdict):
  `bash .claude/skills/ft/scripts/cline-lesson.sh "<the pattern, one line>"`.
  Spec is the flow's only cline touchpoint (ft-find dropped its cline lane
  by owner decision 2026-08-09).

**Scope and terminology discipline:**

* The owner enforces scope at the gate. Everything asked for together is one
  slice. Deferred is only a substantial related slice better built after this
  lands. Incidental ideas are dropped.
* Terms of art get a one-clause definition at first use. Anything renamed or
  reworked during drafting is stated fresh, never as "as discussed".

**Presentation formatting:**

* **Spec vs. presentation:** the STORED plan document (the future issue
  body, the build phase's sole input) stays the hyper-specific spec with
  near-code; the gate presentation is a reader-facing layer ON TOP of it.
  These readability rules govern presentation, never a dumbing-down of the
  stored spec.
* **The first screen is plain language ONLY:** Definition of done, Today
  vs. after, and User narrative carry no file paths, identifiers, pixel or
  color values: outcomes as the user experiences them, ONE line per DoD
  item. The technical DoD lives in the full plan below; pasting it into
  the reader layer is the recurring failure this rule exists to stop.
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
* **What happens when (input space):** every input class in plain words — "paste just `example.com`: X happens", "reply with only an emoji: Y happens" — so the owner approves the FRAME, not only the feature. An out-of-scope class is stated here in plain words too; the owner's yes at the gate is what makes it legitimately out of scope.
* **The full plan:** every section from phase 4.
* **Critique adjudication:** every accepted item and every rejected item
  carries its technical statement plus a plain-words explanation the owner
  reads as a user (what was wrong, or why it was rejected).

**Pre-present check** (fix, then present): first three sections free of
identifiers; every section bulleted, no prose walls; In scope / Deferred
present with their glosses; the input-space lines present in plain words;
every adjudication entry carries its plain-words line.

## 7. Close the gate

Upon explicit owner approval, run the close script:

* `bash .claude/skills/ft/scripts/start.sh --issue <N> <plan-file>`
  (the spec becomes the stub issue's body; no new issue is ever created
  here, stubs come from /ft-plan)

The script prints the issue number and lands on `ft/<issue#>`. It is
adoption-aware: an existing local/remote `ft/N` is adopted (fast-forwarded
onto beta only when it has no unique commits), a current `ft/N-*` branch is
renamed to `ft/N` local+remote, a fresh cut from `origin/beta` is the
fallback, the clean-tree requirement applies only when it must switch or
create, and prose is unwrapped before posting (GitHub renders issue newlines
as hard breaks). Never work around the script; its resolution IS the
contract. **Then STOP, always, under `/ft` too.** The issue body is
now the complete spec, which is what makes the app-jump clean. End the session
with this exact message format:

<final-message-example>
Issue #N opened, `ft/N` cut. Now switch to ChatGPT on gpt-5.6-terra high and
run:

```
/ft-build N
```

Then QC in either app on the smart dial: `/ft-qc`.
</final-message-example>
