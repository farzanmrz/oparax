---
name: ft-find
description: >-
  QC step 1 of 3: gates + the cross-model review council + adjudication,
  ending with findings posted durably to the ft issue. Use standalone
  (/ft-find) to adjudicate here and apply fixes in another session, or
  let /ft-qc chain it. Runs in either harness (Claude Code or Codex),
  session model set to the best available.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Find: discover, adjudicate, persist

Runs over `origin/beta...ft/<N>` in either harness, with the session model
on the best available dial (fable/opus high, or `gpt-5.6-sol` high in
Codex) from the start.

* **Model rule:** the session model is spent on ADJUDICATION ONLY. Everything
  else is a pinned dispatch or shell. The internal `bug-finder` lane inherits
  the session model, which is why this session runs on the best dial.
* **Communication rule:** no prose between steps EXCEPT milestone lines: one
  entering each numbered phase, one launching any long wait (name + expected
  duration).

## Dispatch roster

| Stage | Dispatch |
|---|---|
| Setup scout | one agent, `model: haiku`, `effort: low` |
| Internal review lane | `bug-finder` (inherits the session model) |
| Exploration fan-out | batch independent Agent calls in one response |
| Design critic (UI slices only) | the session model itself, inline, no dispatch |
| External council lanes | `codex` + `grok` + `agy` + `cline` (minimax-m3) CLI wrappers |
| DB seeding / exploratory Supabase ops | `supabase-runner` (sonnet, its own default) |

## 1. Setup

### A. Scout dispatch

Dispatch the setup scout for one compact block:

* **Diff shape:** `--shortstat` / `--stat` (spot generated files).
* **Acceptance criteria:** the issue's, via one `gh issue view`.

### B. Boot smoke (in-session)

Port check first:

```bash
lsof -i :3000 -sTCP:LISTEN -t
```

* **Server already running:** reuse it and record that QC didn't start it.
* **No server:** start `pnpm dev` in the background, record the real PID,
  wait for `✓ Ready`.
* **Boot failure:** STOP.
* **Leave the dev server up:** later phases reuse it.
* **No runtime-error sweep:** the `_next/mcp` endpoint only reports from a
  connected browser, so headless QC finds it vacuous. Runtime errors are
  Sentry's job; rendered behavior is ft-browse's job.

## 2. Deterministic gates + the council self-test

### A. Council self-test

```bash
bash .claude/workflows/council/selftest.sh --if-changed
```

* **Cost:** usually exits in 0.2s. It probes only when a council wrapper, an
  agent profile, a council config, or a CLI version has moved since the last
  green run (the only things that can actually break a lane). When it probes
  it drives every lane through the real wrapper, the real schema, and a brief
  that cannot be answered without opening a file (~90s, in the background
  alongside the gates).
* **Failure condition:** a lane that fails here is FAILED for this round: do
  not launch it in phase 4, and say so in the record. This exists because
  liveness probes kept passing while real briefs returned nothing, and a lane
  returning nothing looks exactly like a lane finding nothing.

### B. Gates

```bash
bash .claude/skills/ft/scripts/qc-gates.sh
```

* **The one scripted gate runner:** build + tsc hard, residual-lint report.
  Never improvise the compound command.
* **`GATES: RED`:** STOP and report.

## 3. Design critic (UI-touching slices only)

ONE pass, run inline by the session model itself (owner decision: design
judgment stays on the smart dial, never delegated to a cheaper dispatch).
Design findings enter phase 5's adjudication like any lane's. No UI in the
diff: record "no UI surface, design critic skipped".

### A. Yardstick

The plan's stated design intent, plus root `DESIGN.md` when it exists (the
codified aesthetic contract — alignment findings cite it, never taste); the
critic NEVER judges from its own taste: conformance to that intent,
alignment with the app's existing aesthetic (any new pattern is one the
plan declared with rationale), the surface reads as native, per-state
intent met.

* **Post-v0 rounds flip the yardstick:** when the round follows a declared
  OWNER-V0 merge (the plan's step list says which), the merged v0 design IS
  the spec. Judge conformance to the v0 output and per-state intent; new
  visual patterns, spacing, and color from v0 are the design, never
  alignment findings. Functional findings (states, contracts, RLS, races)
  are unaffected.

### B. Experiential checklist

Also check experiential quality (hierarchy, spacing, all states,
streaming/motion feel, layout shift) plus this tells checklist:

* decorative status dots; `00 / INDEX` eyebrows; uppercase-tracking labels
  past one per ~3 sections
* cards inside cards; borders on every row edge; mixed corner-radius systems;
  duplicate-intent CTAs
* layout shifting between states or on hover (dimensions must be stable);
  loading states that don't match final layout; missing empty/error states
* `useState` tracking continuous input (mouse/scroll) instead of motion
  values
* mobile containment, reasoned per surface at 375px: fixed equal-column or
  nowrap layouts that cannot fit their content, a min-width on a child
  inside a shrinkable (`min-w-0`) flex item (defeats wrapping and paints
  past the container), overlay/absolute text layers standing in for native
  behavior, any element able to widen the page; each rendered-at-mobile
  claim becomes a `NOT VERIFIABLE` line so browse's mobile pass inherits it
* internal machinery on user surfaces: raw tool payloads, model reasoning
  or narration, log-grade error strings; consumer-facing surfaces render
  none of these
* WCAG AA contrast on every CTA and form control
* this repo's hard rules: sentence case, no eyebrow headers, uniform form
  fields

For rule lookups the critic may query the repo-local database (no
dependencies; also `--stack shadcn` / `--stack nextjs`): severity-tagged
Do/Don't rules to cite, not an aesthetic authority:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
```

### C. Evidence: code trace only, and say so

* **No visual evidence path exists:** browser journeys were removed from the
  flow, and no dev state-gallery route has ever existed in this repo. Every
  judgment here is made by reading the code.
* **Rendered-appearance claims:** every one is reported
  `NOT VERIFIABLE: <reason>`, never silently skipped. Those lines flow
  verbatim into ft-browse's checklist (step 2, owner-run); whatever
  browse marks HUMAN-ONLY lands in ft-fix's manual-check set (phase 6 of
  its verification report).
* **No substitutes:** no screenshotting, no starting a browser, no synthetic
  fixture built solely to make a state reachable.

## 4. Review council: one combined charter

Every reviewer does ONE deep pass over the whole diff, covering:

* correctness bugs, cross-file contract breaks, acceptance-criteria
  compliance
* the plan's `Input space` dispositions: every class claimed handled has a
  real code path; every graceful-failure class produces its stated copy; a
  claimed-handled class with no code behind it is a finding of the highest
  order (a class the plan never enumerated but a real user will produce is
  a finding too — cite the entry point)
* convention violations, instruction-file staleness
* security: authz, injection, secret/token handling, trust boundaries
* concurrency and races, error-path handling

**Undiffed does not mean out of scope:** where the diff's behavior composes
with a vendored component (`components/ui`, `components/ai-elements`), read
that code too (a real bug hid in ai-elements' Reasoning auto-open, which no
diff showed).

### A. Labels and briefs

* **Compute the label first:** `R` exactly as phase 6 does, and
  `HEAD12=$(git rev-parse --short=12 HEAD)`. Every lane label is
  `review-r${R}-${HEAD12}-<family>`.
* **Brief:** write charter + range + criteria + plan-frozen vetoes + the
  distilled guards to the matching `.feature/<label>.in.txt`, and consume
  only that exact `<label>.out.json`. Never glob old `*.out.json` files or
  reuse an unqualified `review-<family>` label.
* **Distilled guards are part of the brief, not a harness setting:** distill
  the constraints that bear on the files in this diff (a few lines, read
  from the code itself — trust boundaries, auth shapes, invariants — plus
  DESIGN.md where UI is touched) and paste them into each external lane's
  `.in.txt`. A convention the reviewer never saw is a convention it will
  never enforce, and a slice-scoped distillation is identical across
  families.

### B. Launch discipline

* **Persistent sessions only:** launch each lane in a named persistent
  task/session (a harness-native durable task, or `tmux`), record its real
  task/session id, have the session write `<label>.exit` with the
  wrapper's exit code, and redirect the bridge command's stderr to
  `<label>.stderr.log` (a lane that dies pre-wrapper otherwise leaves no
  diagnosable trace). Never shell-background a command with `&` and
  abandon it.
* **Poll:** the live task/session plus its exact exit file; read the exact
  output only after exit `0`.
* **Failure condition:** a non-zero exit, or a vanished session with no exit
  record, is FAILED even if an older output happens to be present.

The council bridge command inside that persistent session:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" \
  COUNCIL_SCHEMA="$PWD/.claude/workflows/qc-findings-schema.json" \
  bash .claude/workflows/council/run.sh codex "$LABEL"
```

### C. Lane roster

FOUR externals: `codex` (with `COUNCIL_MODEL=gpt-5.6-sol`), `grok`, `agy`,
and ONE `cline` model lane, `minimax/minimax-m3`, launched via
`run.sh cline <label>`. Plus the internal `bug-finder` lane. kimi-k3 was cut
from find by owner decision 2026-08-08: two concurrent cline lanes share one
local hub daemon with no per-run isolation, and QC rounds 1 and 4 each lost a
cline lane to that contention — round 1's glm lane and round 4's kimi lane
both hung/died while their cline sibling completed normally in the same
window (round 4: #112 finding #19, a 2423s zero-byte hang). Find now runs
exactly one cline lane, so that contention cannot recur here. This is find-
specific: ft-spec's critique phase still runs kimi-k3 alongside
minimax-m3 deliberately (both have returned clean there), so do not port this
cut to ft-spec — the two skills' cline rosters are allowed to differ.
Each cline lane gets its own `<label>.in.txt` copy of the shared brief (never
codex's, which carries a codex-only subagent addendum).

### D. Tier and failure rules

* **Tier is family-shaped:** codex and grok take an EFFORT tier, but agy's
  `COUNCIL_TIER` is its model slug (`gemini-3.1-pro-high`): that CLI fuses
  model and effort. Cline is model-shaped: `plan-cline.sh` clamps
  `COUNCIL_TIER` to the model's real ladder (minimax is a toggle, not a
  ladder), so pass `COUNCIL_TIER=high` and let the wrapper clamp.
* **A stalled or frozen cline lane is now the wrapper's problem, not the
  skill's:** `plan-cline.sh` runs the CLI under an external watchdog that
  kills and retries once on a stall producing zero output (free — nothing was
  spent), or kills and fails without retry once real output exists (it may
  have spent). Override `COUNCIL_CLINE_STALL_S` / `COUNCIL_CLINE_MAX_S` only
  to debug; the defaults (600s / 2400s) are set above every lane's measured
  runtime.
* **Cline lanes review a working tree a build may still be touching:** when a
  find round runs while edits are in flight, set `COUNCIL_CLINE_WORKTREE=1`
  so the lane reads a detached snapshot instead of tripping the
  write-detection diff on someone else's concurrent edits, or on a plan-mode
  slip of its own — plan mode is advisory, not enforced, and has been
  observed to not hold on a live run.
* **Failure conditions:** a failed lane is reported FAILED, never as a clean
  pass. `AGY_EMPTY` is no-signal, not approval. A `CLINE_FAILED` lane whose
  `.raw.err` visibly contains a conforming payload is an ENVELOPE failure
  (Cline cannot schema-constrain output): recover the payload by hand,
  validate it against the schema, adjudicate the content, and still record
  the lane as harness-failed. All externals failing =
  single-family review, and the record must say so.
* **Retry once, fast failures only:** a lane exiting non-zero within ~2 min
  with no output gets exactly ONE relaunch (preserve the first attempt's
  logs first: the shared label paths overwrite). Both attempts land in the
  round record; a second failure is final.
* **A thin lane is weak signal, never a clean bill:** record every lane's
  finding count. A lane returning near-zero while sibling families return
  many corroborates nothing — adjudicate what it sent, but never present it
  as evidence the diff is clean.
* **Judge a lane on POST-FIX behaviour, never on its accumulated failure
  count:** the evidence is in `council/run.sh`'s header, don't re-derive it.
  Phase 2's self-test is what you rely on instead.

## 5. Adjudicate (this session)

Merge, dedup by file+line, judge every finding:

* **2+ independent families:** high-confidence.
* **Lone findings:** weighed on their scenario.
* **Plan-frozen decisions:** vetoes.
* **Real-but-not-this-slice:** surface and drop.
* **Cosmetic fidelity deltas merge:** design-critic findings whose whole
  remedy is a style-value change (spacing/padding, radius, overflow
  clipping, animation timing) merge into ONE `cosmetic polish` finding
  listing every delta — round 5 shipped five separately numbered px-level
  findings that each cost a full adjudication and report slot.
* **Open design choices never travel downward:** if a finding's remedy
  requires choosing a user-visible behavior, limit, or constant the spec
  does not already fix, its owner is `owner-decision`: state the options in
  the findings comment for the owner to pick. NEVER write an either/or menu
  for a fixer (that pattern is how a fixer once invented a 6,000-char input
  cap on its own).
* **A cline-attributed wrong drop feeds the lesson file:** when a `cline`
  finding is dropped or vetoed specifically because it contradicted
  DESIGN.md, a plan-frozen veto, or a documented repo convention — not
  merely out of scope — append one line, inline, no
  dispatch (you already hold the verdict):
  `bash .claude/skills/ft/scripts/cline-lesson.sh "<the pattern, one line>"`.
  Skip this for every other drop reason; not every dropped finding is a
  cline mistake worth recording.

## 6. Persist: the findings record

Post ONE comment on issue #N titled `## QC round <R>: findings` (R = prior
QC-round comments + 1). Contents:

* **Per ACCEPTED finding:** `file:line`, one technical sentence, then
  `Plain terms:` one sentence a non-reader of the code understands (what a
  user would see / what could go wrong), then the fix owner (`fix-here` |
  `risk-path` | `owner-decision`).
* **Dropped:** one-line reason each.
* **Vetoed by plan.**

This comment is the complete brief for `/ft-fix` in ANY Codex session:
write it so nothing from this conversation is needed.

**Standalone:** STOP here. Report the round number, counts, and lane
coverage, then suggest the next step in one line: both `ft-browse`
(owner-triggered) and `ft-fix` are Codex only, so the line is "switch
to Codex — `/ft-browse` (`gpt-5.6-terra`) grounds this round's
`NOT VERIFIABLE` lines before `/ft-fix` (`gpt-5.6-sol` high) applies both
records." This session may itself be
Codex (find runs in either harness) — only say "switch" when this session
actually is Claude Code.
Under `/ft-qc` chain in Claude Code: the chain ends here (the harness
guard fires on the next step) with the same Codex redirect. Under
`/ft-qc chain` already in Codex: continue into ft-browse.
