---
name: feature-find
description: >-
  QC step 1 of 5, hop-anywhere: gates + the cross-model review council +
  adjudication, ending with findings posted durably to the ft issue. Use
  standalone (/feature-find) to adjudicate here and apply fixes in
  another session/app, or let /feature-qc chain it. Harness-neutral: runs in
  Claude Code or Codex.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Find: discover, adjudicate, persist

Runs over `origin/beta...ft/<N>`.

* **Model rule:** the session model is spent on ADJUDICATION ONLY. Run this
  chat on a smart dial (Claude: opus/fable high; Codex: gpt-5.6-sol high), or
  start cheap and switch at the phase 4 cue. Everything else is a pinned
  dispatch or shell.
* **Communication rule:** no prose between steps EXCEPT milestone lines: one
  entering each numbered phase, one launching any long wait (name + expected
  duration).
* **Model-flip cue:** the phase 4 milestone line must say verbatim:

<milestone-line>
council lanes launched (~5-8 min): switch models now if you started cheap; adjudication uses whatever is selected when lanes return.
</milestone-line>

## Dials (per harness)

| Stage | Claude Code | Codex |
|---|---|---|
| Setup scout | one agent, `model: haiku`, `effort: low` | `cx_grounder` |
| Internal review lane | `bug-finder` (inherits the session model; run find on the smart dial per feature-qc's step-dial table) | `pr_explorer` + `reviewer` |
| Exploration fan-out | native (batch independent Agent calls in one response) | spawn PARALLEL `cx_grounder`/`pr_explorer` instances, named explicitly, whenever evidence-mapping spans 3+ independent files/areas; never sequential-read what independent agents can read concurrently (≤6 threads) |
| Design critic (UI slices only) | one agent, `model: sonnet`, `effort: high` | the `reviewer` agent with that charter |
| External council lanes | `codex` + `grok` + `agy` | `grok` + `agy` (no codex lane: that family IS this session) |
| DB seeding / exploratory Supabase ops | `supabase-runner` (sonnet, its own default) | `cx_supabase_runner` |

## 1. Setup

### A. Scout dispatch

Dispatch the setup scout for one compact block:

* **Diff shape:** `--shortstat` / `--stat` (spot generated files).
* **Acceptance criteria:** the issue's, via one `gh issue view`.
* **Dead-code sweep:** `pnpm deadcode`, each hit grep-verified, cross-checked
  against AGENTS.md "Dormant by design", chains collapsed to one root.

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
  connected browser, so headless QC always found it vacuous (and one session
  opened a browser to fix that, 2026-08-04). Runtime errors are Sentry's job;
  rendered behavior is the owner's manual-check set.

## 2. Deterministic gates + the council self-test

### A. Council self-test

```bash
bash .claude/workflows/council/selftest.sh --if-changed
```

* **Cost:** usually exits in 0.2s. It probes only when a council wrapper, an
  agent profile, a council config, or a CLI version has moved since the last
  green run (the only things that can actually break a lane). When it probes
  it drives every lane through the real wrapper, the real schema, and a brief
  that cannot be answered without opening a file (~90s on cheap dials, in the
  background alongside the gates).
* **Failure condition:** a lane that fails here is FAILED for this round: do
  not launch it in phase 4, and say so in the record. This exists because
  liveness probes kept passing while real briefs returned nothing, and a lane
  returning nothing looks exactly like a lane finding nothing.

### B. Gates

```bash
bash .claude/skills/feature/scripts/qc-gates.sh
```

* **The one scripted gate runner:** build + tsc hard, residual-lint report.
  Never improvise the compound command.
* **`GATES: RED`:** STOP and report.

## 3. Design critic (UI-touching slices only)

ONE pass (Claude: `model: sonnet`, `effort: high`; Codex: the `reviewer`
agent with this charter). Design findings enter phase 5's adjudication like
any lane's. No UI in the diff: record "no UI surface, design critic skipped".

### A. Yardstick

The plan's `[design: reuse]` contract; the critic NEVER judges from its own
taste: conformance to the app, ladder respected (existing components before
new), the surface reads as native, per-state intent met.

* **Post-v0 rounds flip the yardstick:** when the round follows a declared
  OWNER-V0 merge (the plan's step list says which), the merged v0 design IS
  the spec. Judge conformance to the v0 output and per-state intent; new
  visual patterns, spacing, and color from v0 are the design, not ladder
  violations. Functional findings (states, contracts, RLS, races) are
  unaffected.

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
  verbatim into feature-browse's checklist (step 2, owner-run); whatever
  browse marks HUMAN-ONLY lands in feature-verify's manual-check set.
* **No substitutes:** no screenshotting, no starting a browser, no synthetic
  fixture built solely to make a state reachable.

## 4. Review council: one combined charter

Every reviewer does ONE deep pass over the whole diff, covering:

* correctness bugs, cross-file contract breaks, acceptance-criteria
  compliance
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
  the AGENTS.md constraints that bear on the files in this diff (a few lines,
  never the whole file) and paste them into each external lane's `.in.txt`. A
  convention the reviewer never saw is a convention it will never enforce,
  and a slice-scoped distillation is identical across families.

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

### C. Lane rosters

* **Claude Code:** THREE externals (`codex` with `COUNCIL_MODEL=gpt-5.6-sol`,
  `grok`, `agy`) plus the internal lane.
* **Codex:** its native `reviewer` (`.codex/agents/reviewer.toml` carries the
  same oparax critic contract as the grok and agy lanes) spawning
  `pr_explorer` for evidence (name it explicitly: Codex never delegates off a
  description), plus the `grok` and `agy` externals. The codex family's
  perspective is the session itself.

### D. Tier and failure rules

* **Tier is family-shaped:** codex and grok take an EFFORT tier, but agy's
  `COUNCIL_TIER` is its model slug (`gemini-3.1-pro-high`): that CLI fuses
  model and effort. Don't copy one lane's tier onto another.
* **Failure conditions:** a failed lane is reported FAILED, never as a clean
  pass. `AGY_EMPTY` is no-signal, not approval. All externals failing =
  single-family review, and the record must say so.
* **Retry once, fast failures only:** a lane exiting non-zero within ~2 min
  with no output gets exactly ONE relaunch (preserve the first attempt's
  logs first: the shared label paths overwrite). Both attempts land in the
  round record; a second failure is final.
* **Judge a lane on POST-FIX behaviour, never on its accumulated failure
  count:** a proposed detach of grok+agy was reversed the same day once the
  record was read; the evidence is in `council/run.sh`'s header, don't
  re-derive it. Phase 2's self-test is what you rely on instead.

## 5. Adjudicate (this session)

Merge, dedup by file+line, judge every finding:

* **2+ independent families:** high-confidence.
* **Lone findings:** weighed on their scenario.
* **Plan-frozen decisions:** vetoes.
* **Real-but-not-this-slice:** surface and drop.

## 6. Persist: the findings record

Post ONE comment on issue #N titled `## QC round <R>: findings` (R = prior
QC-round comments + 1). Contents:

* **Per ACCEPTED finding:** `file:line`, one technical sentence, then
  `Plain terms:` one sentence a non-reader of the code understands (what a
  user would see / what could go wrong), then the fix owner (`fix-here` |
  `risk-path`).
* **Dropped:** one-line reason each.
* **Vetoed by plan.**

This comment is the complete brief for `/feature-fix` in ANY session or app:
write it so nothing from this conversation is needed.

**Standalone:** STOP here. Report the round number, counts, and lane
coverage, then hand off with the exact next command AND its dial from
feature-qc's step-dial table: `/feature-browse` (`$feature-browse` in
Codex) on the normal dial, which grounds this round's `NOT VERIFIABLE`
lines before `/feature-fix` applies both records. A handoff naming a
command without its dial is incomplete (the dial line is load-bearing, per
feature-qc).
Under `/feature-qc` chain: continue into feature-browse (the chain
invocation is the browser unlock, per feature-qc).
