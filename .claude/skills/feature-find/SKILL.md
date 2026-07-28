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

## 4. Review council — one combined charter

Every reviewer does ONE deep pass over the whole diff: **correctness bugs +
cross-file contract breaks + acceptance-criteria compliance + convention
violations + instruction-file staleness.** External lanes via the council
bridge (background; poll `.feature/*.out.json`; agy ~8 min) — write charter +
range + criteria + plan-frozen vetoes to `.feature/review-<family>.in.txt`,
then per family:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" \
  COUNCIL_SCHEMA="$PWD/.claude/workflows/qc-findings-schema.json" \
  bash .claude/workflows/council/run.sh <family> review-<family>
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
