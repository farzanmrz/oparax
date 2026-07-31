---
name: feature-find
description: >-
  QC step 1 of 4, hop-anywhere: gates + browser journeys + the cross-model
  review council + adjudication, ending with findings posted durably to the ft
  issue. Use standalone (/feature-find) to adjudicate here and apply fixes in
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

**Weight** (the issue's `## Weight` line; missing = standard) is binding:
`light` = one internal reviewer only, journeys only if the diff touches
rendered UI (`app/**` or `components/**` `.tsx`); `heavy` = the internal
reviewer runs on the top dial. The floor (gates, adjudication, the findings
record) never drops.

## Dials — per harness

| Stage | Claude Code | Codex |
|---|---|---|
| Setup scout | one agent, `model: haiku`, `effort: low` | `cx_grounder` |
| Journeys | `browser-verifier` agents, `model: sonnet`, `effort: medium` | `cx_journey_walker` |
| Internal review lane | `bug-finder`-style agent, `model: sonnet`, `effort: high` (heavy: `opus` high) | `pr_explorer` + `reviewer` (heavy: spawn reviewer on xhigh) |
| DB seeding / exploratory Supabase ops | `supabase-runner` (`model: haiku`; sonnet for open-ended) | `cx_supabase_runner` |

## 1. Setup

Dispatch the setup scout for one compact block: diff `--shortstat`/`--stat`
(spot generated files); the issue's acceptance criteria + `## Weight` via one
`gh issue view`; the dead-code sweep (`pnpm deadcode`, each hit grep-verified,
cross-checked against AGENTS.md "Dormant by design", chains collapsed to one
root). Boot smoke in-session: `lsof -i :3000 -sTCP:LISTEN -t` first — reuse a
running server and record that QC didn't start it; else start `pnpm dev` in
the background, record the real PID, wait for `✓ Ready`. Boot failure = STOP.

## 2. Deterministic gates

`bash .claude/skills/feature/scripts/qc-gates.sh` — the one scripted gate
runner (build + tsc hard, residual-lint report). `GATES: RED` = STOP and
report. Never improvise the compound command.

## 3. Browser journeys

Derive JOURNEYS from the diff — what a user can now *do* differently, each an
ordered multi-route walk. One journey agent each, parallel, own `--session`
id; auth is `.claude/skills/feature/scripts/qc-login.sh` as each session's
first command (only the script failing is an auth finding). Preconditions
stated; WRITE journeys own their record or run serially; never drive
money/irreversible controls. After all return and before sessions close,
collect runtime errors once from `http://localhost:3000/_next/mcp`
(`get_errors` tools/call POST), then close sessions. Leave the dev server up —
later steps reuse it.

## 3b. Design critic — UI-touching slices only

ONE pass (Claude: `model: sonnet`, `effort: high`; heavy: `opus`; Codex: the
`reviewer` agent with this charter). **The yardstick follows each surface's
plan tag — the critic NEVER judges from its own taste:**

- `[design: reuse]` → conformance to the app: ladder respected (existing
  components before new), the surface reads as native, per-state intent met.
- `[design: elevated]` → conformance to the FROZEN direction in the issue:
  the built surface matches the board the owner picked, named patterns
  implemented as named.

Both modes also check experiential quality — hierarchy, spacing, all states,
streaming/motion feel, layout shift — and this distilled tells checklist
(sourced from taste-skill v2 / ECC / ui-ux-pro-max research, 2026-07-28):
decorative status dots and `00 / INDEX` eyebrows; uppercase-tracking labels
multiplying past one per ~3 sections; cards nested inside cards; borders on
every row edge; mixed corner-radius systems; duplicate-intent CTAs; layout
shifting between states or on hover (dimensions must be stable); loading
states that don't match final layout; missing empty/error states; `useState`
tracking continuous input (mouse/scroll) instead of motion values; WCAG AA
contrast on every CTA/form control; and this repo's own hard rules (sentence
case, no eyebrow headers, uniform form fields). For rule lookups the critic
may query the repo-local ui-ux-pro-max database (no dependencies):
`python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux`
(also `--stack shadcn` / `--stack nextjs`) — severity-tagged Do/Don't rules
to cite, not an aesthetic authority. Evidence ladder, in order:

1. **State gallery first:** if a dev state-gallery route covers the touched
   surface, screenshot its contact sheet (every state at once, deterministic,
   no paid runs) and judge that.
2. **Live fallback:** otherwise the journey walkers screenshot the changed
   surfaces they walk (one `agent-browser screenshot` per surface), and the
   critic judges those.
3. **Honest gaps:** any behavior that is time-domain or gated on real spend
   (streaming feel, a paid model's thinking window) with no replay/gallery
   fixture is reported `NOT VERIFIABLE — <reason>`, never silently skipped —
   these lines flow verbatim into feature-verify's manual-check set.

Design findings enter step 5's adjudication like any lane's. No UI in the
diff → record "no UI surface — design critic skipped".

## 4. Review council — one combined charter

Every reviewer does ONE deep pass over the whole diff: **correctness bugs +
cross-file contract breaks + acceptance-criteria compliance + convention
violations + instruction-file staleness + security (authz, injection,
secret/token handling, trust boundaries) + concurrency/races + error-path
handling.** When the diff's behavior composes with a vendored component
(`components/ui`, `components/ai-elements`), read the relevant vendored code
too — undiffed does not mean out of scope (a real bug hid in ai-elements'
Reasoning auto-open, which no diff ever showed). Before launching an external,
calculate `R` exactly as step 6 does and `HEAD12=$(git rev-parse --short=12
HEAD)`. Every lane label is `review-r${R}-${HEAD12}-<family>`; write its
charter + range + criteria + plan-frozen vetoes only to the matching
`.feature/<label>.in.txt`, and consume only that exact `<label>.out.json`.
Never glob old `*.out.json` files or reuse an unqualified `review-<family>`
label.

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
  bash .claude/workflows/council/run.sh <family> "$LABEL"
```

Claude Code runs three externals (`codex` with `COUNCIL_MODEL=gpt-5.6-sol`,
`grok`, `agy` with `COUNCIL_TIER=gemini-3.1-pro-high`) + the internal lane;
Codex runs two (`grok`, `agy`) + its native reviewer pair. A failed lane is
reported FAILED, never as a clean pass; `AGY_EMPTY` = no-signal. All externals
failing = single-family review, and the record must say so.

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
