---
name: feature-find
description: >-
  QC step 1 of 4, hop-anywhere: gates + the cross-model review council +
  adjudication, ending with findings posted durably to the ft issue. Use
  standalone (/feature-find) to adjudicate here and apply fixes in
  another session/app, or let /feature-qc chain it. Harness-neutral: runs in
  Claude Code or Codex.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Find — discover, adjudicate, persist

Runs over `origin/beta...ft/<N>`. **The session model is spent on ADJUDICATION
ONLY** — run this chat on a smart dial (Claude: opus/fable high; Codex:
gpt-5.6-sol high), or start cheap and switch at the announced cue below.
Everything else is a pinned dispatch or shell. No prose between steps EXCEPT
milestone lines — one entering each numbered step, one launching any long wait
(name + expected duration). The step-4 milestone line is also the model-flip
cue and must say so verbatim: "council lanes launched (~5–8 min) — switch
models now if you started cheap; adjudication uses whatever is selected when
lanes return."

## Dials — per harness

| Stage | Claude Code | Codex |
|---|---|---|
| Setup scout | one agent, `model: haiku`, `effort: low` | `cx_grounder` |
| Internal review lane | `bug-finder` — **opus, pinned in the agent**; do not override | `pr_explorer` + `reviewer` |
| DB seeding / exploratory Supabase ops | `supabase-runner` (`model: haiku`; sonnet for open-ended) | `cx_supabase_runner` |

## 1. Setup

Dispatch the setup scout for one compact block: diff `--shortstat`/`--stat`
(spot generated files); the issue's acceptance criteria via one `gh issue
view`; the dead-code sweep (`pnpm deadcode`, each hit grep-verified,
cross-checked against AGENTS.md "Dormant by design", chains collapsed to one
root). Boot smoke in-session: `lsof -i :3000 -sTCP:LISTEN -t` first — reuse a
running server and record that QC didn't start it; else start `pnpm dev` in
the background, record the real PID, wait for `✓ Ready`. Boot failure = STOP.

Then sweep runtime errors once from `http://localhost:3000/_next/mcp`
(`get_errors` tools/call POST) and carry anything it returns into step 5's
adjudication. Leave the dev server up — later steps reuse it.

## 2. Deterministic gates + the council self-test

```bash
bash .claude/workflows/council/selftest.sh --if-changed
```

**Usually this exits in 0.2s and costs nothing.** It probes only when a council
wrapper, an agent profile, a council config or a CLI version has moved since the
last green run — the only things that can actually break a lane. When it does
probe it drives every lane through the real wrapper, the real schema and a brief
that cannot be answered without opening a file (~90s on cheap dials, in the
background alongside the gates).

**A lane that fails here is FAILED for this round** — do not launch it in step 4,
and say so in the record. This exists because liveness probes kept passing while
real briefs returned nothing, and a lane returning nothing looks exactly like a
lane finding nothing.



`bash .claude/skills/feature/scripts/qc-gates.sh` — the one scripted gate
runner (build + tsc hard, residual-lint report). `GATES: RED` = STOP and
report. Never improvise the compound command.

## 3. Design critic — UI-touching slices only

ONE pass (Claude: `model: sonnet`, `effort: high`; Codex: the `reviewer` agent
with this charter). **The yardstick is the plan's `[design: reuse]` contract —
the critic NEVER judges from its own taste:** conformance to the app, ladder
respected (existing components before new), the surface reads as native,
per-state intent met.

It also checks experiential quality — hierarchy, spacing, all states,
streaming/motion feel, layout shift — plus this tells checklist:

- decorative status dots; `00 / INDEX` eyebrows; uppercase-tracking labels past
  one per ~3 sections
- cards inside cards; borders on every row edge; mixed corner-radius systems;
  duplicate-intent CTAs
- layout shifting between states or on hover (dimensions must be stable);
  loading states that don't match final layout; missing empty/error states
- `useState` tracking continuous input (mouse/scroll) instead of motion values
- WCAG AA contrast on every CTA and form control
- this repo's hard rules: sentence case, no eyebrow headers, uniform form fields

For rule lookups the critic may query the repo-local database (no dependencies):
`python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux`
(also `--stack shadcn` / `--stack nextjs`) — severity-tagged Do/Don't rules
to cite, not an aesthetic authority.

**Evidence: code trace only, and say so.** This critic has NO visual evidence
path. Browser journeys were removed from the flow (2026-07-30), and no dev
state-gallery route has ever existed in this repo — the `app/dev/` tree only
ever held direction-council boards, now deleted. So every judgment here is made
by reading the code, and **every rendered-appearance claim is reported
`NOT VERIFIABLE — <reason>`**, never silently skipped. Those lines flow verbatim
into feature-verify's manual-check set, which is where the owner — the only
party who actually renders this app — picks them up.

Do not invent a substitute: no screenshotting, no starting a browser, no
synthetic fixture built solely to make a state reachable.

Design findings enter step 5's adjudication like any lane's. No UI in the
diff → record "no UI surface — design critic skipped".

## 4. Review council — one combined charter

Every reviewer does ONE deep pass over the whole diff, covering:

- correctness bugs · cross-file contract breaks · acceptance-criteria compliance
- convention violations · instruction-file staleness
- security: authz, injection, secret/token handling, trust boundaries
- concurrency and races · error-path handling

**Undiffed does not mean out of scope.** Where the diff's behavior composes with
a vendored component (`components/ui`, `components/ai-elements`), read that code
too — a real bug hid in ai-elements' Reasoning auto-open, which no diff showed.

**Labels.** Before launching an external, compute `R` exactly as step 6 does and
`HEAD12=$(git rev-parse --short=12 HEAD)`. Every lane label is
`review-r${R}-${HEAD12}-<family>`. Write its charter + range + criteria +
plan-frozen vetoes **+ the distilled guards** to the matching
`.feature/<label>.in.txt`, and consume only that exact `<label>.out.json`. Never
glob old `*.out.json` files or reuse an unqualified `review-<family>` label.

**Distilled guards are part of the brief, not a harness setting.** Read every
`.claude/rules/*.md` whose `paths:` frontmatter matches a file in this diff and
paste the hard constraints — a few lines, distilled, never the whole file —
into each external lane's `.in.txt`. An external CLI cannot be assumed to load
this repo's rules (Codex has no rules mechanism at all, and Grok's Claude-compat
import is deliberately off), and a convention the reviewer never saw is a
convention it will never enforce. This is also strictly better than importing:
slice-scoped instead of blanket, and identical across families.

Launch each lane in a named persistent task/session (a harness-native durable
task, or `tmux`), record its real task/session id, and have the session write
`<label>.exit` with the wrapper's exit code. Do **not** shell-background a
command with `&` and abandon it. Poll the live task/session plus its exact exit
file; read the exact output only after exit `0`. A non-zero exit, or a vanished
session with no exit record, is `FAILED` even if an older output happens to be
present. The council bridge command inside that persistent session is:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" \
  COUNCIL_SCHEMA="$PWD/.claude/workflows/qc-findings-schema.json" \
  bash .claude/workflows/council/run.sh codex "$LABEL"
```

Claude Code runs THREE externals — `codex` (`COUNCIL_MODEL=gpt-5.6-sol`),
`grok`, and `agy` — plus the internal lane. Codex runs its native `reviewer`
(`.codex/agents/reviewer.toml` carries the same oparax critic contract as the
grok and agy lanes) spawning `pr_explorer` for evidence — **named explicitly,
since Codex never delegates off a description** — plus the `grok` and `agy`
externals. The codex family's perspective is the session itself. A failed lane is reported FAILED,
never as a clean pass; `AGY_EMPTY` is no-signal, not approval. All externals
failing = single-family review, and the record must say so.

**Judge a lane on POST-FIX behaviour, never on its accumulated failure count** —
a detach of grok+agy was proposed 2026-07-30 and reversed the same day once the
record was read. The evidence is in `council/run.sh`'s header; don't re-derive
it. Step 2's self-test is what you rely on instead.

Tier is family-shaped: codex and grok take an EFFORT tier, but **agy's
`COUNCIL_TIER` is its model slug** (`gemini-3.1-pro-high`), because that CLI
fuses model and effort. Don't copy one lane's tier onto another.

## 5. Adjudicate — this session

Merge, dedup by file+line, judge every finding: 2+ independent families =
high-confidence; lone findings weighed on their scenario; plan-frozen
decisions are vetoes; real-but-not-this-slice → surface and drop.

## 6. Persist — the findings record

Post ONE comment on issue #N titled `## QC round <R> — findings` (R = prior
QC-round comments + 1). For each ACCEPTED finding: `file:line` — one
technical sentence — **`Plain terms:` one sentence a non-reader of the code
understands (what a user would see / what could go wrong)** — fix owner
(`fix-here` | `risk-path`). Then **Dropped** (one-line reason each) and
**Vetoed by plan**. This comment is the complete brief for `/feature-fix` in
ANY session or app — write it so nothing from this conversation is needed.

Standalone: STOP here — report the round number, counts, and lane coverage,
and name the next hop (`/feature-fix` here or in the other app). Under
`/feature-qc`: continue into feature-fix.
