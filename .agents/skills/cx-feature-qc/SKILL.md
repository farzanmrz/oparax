---
name: cx-feature-qc
description: >-
  Codex-native QC phase for oparax: the full quality battery over the current
  ft/<N> branch — build/tsc gates, parallel browser journeys, the cross-model
  review council (grok + agy CLIs + a native reviewer), fixes, lint, doc sync —
  ending at the verification gate. Use in Codex when the owner says
  $cx-feature-qc or asks to run QC here.
---

# The QC battery — Codex orchestrator, silent until the verification gate

Runs over the whole branch diff (`origin/beta...ft/<N>`). Run this chat on
`gpt-5.6-sol` at high — **the session model is spent on ADJUDICATION ONLY**
(step 5); every other step is a pinned subagent or a shell command. No prose
between steps; the verification ✋ (step 7) is where you write in full.

**Hop-anywhere:** QC is also runnable as four separate harness-neutral steps
— `$feature-find`, `$feature-fix`, `$feature-docs`, `$feature-verify` (in
`.agents/skills/`, each with a Codex dials row) — every step reads/writes
durable state (the issue's `QC round` comments), so any step may run in
Claude Code instead. This skill is the one-session chain of the same
contract; findings and fixes are ALWAYS posted as issue comments regardless
(steps 5 and 6 below), and the verification report follows feature-verify's
owner-legibility contract: plain-terms-first findings, jargon defined at
first use, "surfaced" items decidable from the text alone, manual checks as
concrete user actions.

## Weight — read it, never re-classify

The ft issue's `## Weight` line (`light | standard | heavy`; missing =
`standard`) is binding. It scales exactly two dials:

- **light** — step 4 runs ONE reviewer: the native `reviewer` subagent only
  (no external lanes). Step 3's journeys run only if the diff touches rendered
  UI (`app/**` or `components/**` `.tsx`); otherwise record "no UI surface —
  journeys skipped".
- **standard** — everything as written below.
- **heavy** — as standard, but spawn the `reviewer` subagent explicitly on
  xhigh, and the step-7 report ends by recommending the owner also run
  Claude Code's `/code-review ultra` before ship.

The floor never drops: build + tsc gates, session adjudication, dispatched
fixes, residual lint, doc sync, and the verification ✋ all run on every weight.

## 1. Setup

Spawn `cx_grounder` to gather and return one compact block: diff size
(`git diff --shortstat` + `--stat` over the range, spotting generated files);
the ft issue's "Stack & design acceptance criteria" + `## Weight` line via one
`gh issue view`; and the dead-code sweep (`pnpm deadcode`, each hit verified
by grep for dynamic refs, cross-checked against AGENTS.md "Dormant by design",
dead chains collapsed to one root finding).

Boot smoke runs in THIS session (needs write/network): `lsof -i :3000
-sTCP:LISTEN -t` FIRST — if a server is up, reuse it and record that QC did
not start it. Only if the port is free: start `pnpm dev` as a background
terminal, record the real listening PID, wait for `✓ Ready`, grep startup for
failure signatures. Leave it running for steps 3 and 6. Boot failure = STOP
and report.

## 2. Deterministic gates — shell

`bash .claude/skills/feature/scripts/qc-gates.sh` (build + tsc hard,
residual-lint report; never improvise the compound command). `GATES: RED`
stops QC — report and wait.

## 3. Browser journeys — parallel `cx_journey_walker` subagents

Derive JOURNEYS from the diff — what a user can now *do* differently, each an
ordered walk usually spanning several routes. Spawn one `cx_journey_walker`
per journey, in parallel (≤6 threads), each told its journey steps, the base
URL, and a unique `--session` id. Their TOML pins the contract: qc-login.sh
first, `agent-browser` CLI headless, transcribe don't judge. Rules that keep
parallelism safe: state each journey's preconditions (seed a row rather than
drive the UI that creates it); a WRITE journey needs its own record or runs
serially; never drive money/irreversible controls — walk up, confirm the
preceding state, report the rest unreached-by-design.

After all walkers return and **before any session closes**, collect runtime
errors once from Next's own endpoint:

```bash
curl -s -X POST http://localhost:3000/_next/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"get_errors","arguments":{}}}'
```

Then close each agent-browser session.

## 4. Static review — external council + native reviewer, one combined charter

Every reviewer does ONE deep pass over the whole diff against a single
combined charter: **correctness bugs + cross-file contract breaks +
acceptance-criteria compliance + convention violations + instruction-file
staleness.** Diversity rides on model families.

External lanes (background terminals, poll for `.out.json`; agy can take
~8 min): for each of `grok` and `agy`, write charter + diff range + acceptance
criteria + plan-frozen vetoes to `.feature/review-<family>.in.txt`, then:

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" \
  COUNCIL_SCHEMA="$PWD/.claude/workflows/qc-findings-schema.json" \
  bash .claude/workflows/council/run.sh <family> review-<family>
```

(grok tier defaults high; agy: `COUNCIL_TIER=gemini-3.1-pro-high`, tmux TUI
handled by the wrapper.) Meanwhile spawn the native lane: `pr_explorer` to map
and evidence the changed code paths, then `reviewer` to judge the diff against
that evidence and the charter. A lane that fails is reported as FAILED, never
as a clean pass — an `AGY_EMPTY` stderr note means no-signal. If ALL external
lanes fail, the review is codex-only and the step-7 report must say so.

## 5. Merge + adjudicate — this session (the one judgment stage)

Merge the lists, dedup near-duplicates by file+line, adjudicate every finding.
A finding raised by 2+ independent families is high-confidence; a lone finding
gets weighed on its scenario. Plan-frozen decisions in the ft issue are vetoes
— drop them even if raised. Real-but-not-this-slice → surface to the owner and
drop. Disagreement between reviewers is signal for this stage to weigh, not a
reason to spawn a tiebreaker.

## 6. Apply fixes + narrow re-sweep

**Applying is not adjudicating — dispatch it.** One `cx_fixer` subagent per
accepted finding (the finding text IS the brief); for a risk-path fix (auth,
money, posting, schema/migration, new trust boundary) spawn it explicitly on
`gpt-5.6-sol` high. Disjoint files → parallel; overlapping → serial. Re-run
step 2's gates over the fix diff, then re-walk only the journeys whose routes
the fixes touched (same walkers, same server, same session state). If nothing
changed, skip and say so.

## 7. Residual lint + doc sync, then the verification gate ✋

- **Residual lint** (LAST — fixes mutated code): `pnpm lint` on the changed
  files; dispatch `cx_fixer` for what Biome can't auto-fix, flagging
  behavior-changing rule fixes for the owner; gate on clean `pnpm build`.
- **Doc sync — subtractive first**, one `cx_fixer` fed the reviewers'
  staleness findings. Default outcome is NO change. Subtract any
  AGENTS.md/`.claude/rules/`/skill line the diff falsified; add only a genuine
  non-recoverable keeper.
- **Teardown:** kill the dev server by its real PID only if step 1 started it;
  if reused, leave it and say so.

**Then the verification ✋ — write to the owner in full:** builds ✓ · boots ✓ ·
journeys walked ✓ (+ anything NOT REACHED, verbatim — the owner's manual-check
set) · findings fixed ✓ · server state. What was implemented, and what the
owner must manually verify before shipping. Stop and wait — ship is
`$cx-feature-ship` (or `/feature-ship` in Claude Code), owner-triggered.

## Hard rules

- Session model = ADJUDICATION ONLY; all work stages are pinned subagents or
  shell. Never re-expand the review into per-angle × per-family fan-outs, and
  never a separate verifier quorum.
- A dependency MAJOR upgrade, framework migration, or schema/data migration
  surfacing here → STOP and present options.
- Cleanup/simplification is quality, not correctness — not a QC step.
