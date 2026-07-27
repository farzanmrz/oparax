---
name: feature-qc
description: >-
  Phase 3 of the feature flow, standalone: the QC battery over the current
  feature branch, run inline. Use when the user says /feature-qc, "run QC",
  "quality pass", or wants the branch proven buildable+bootable+browser-clean.
  For just one pass, use /simplify, /code-review, or /feature-lint directly.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# The QC battery — inline, silent until the verification gate

Runs over the whole branch diff (`origin/beta...ft/<N>` — the branch is its own
marker). **Inline, not a workflow:** the old `qc-review.mjs` existed to
orchestrate 24+ agents with a barrier/dedup/quorum; at this scale it was pure
overhead and the source of an args-stringification bug that twice gave a large
diff a small-diff review. Everything here is dispatched directly with explicit
`model`+`effort` params (never named in prose only), and the external lanes run
as `run_in_background` Bash — the harness re-invokes on exit.

Communication: the `Flow` output style governs — no prose between steps; the
verification ✋ (step 7) is where you write in full. **The session model is
spent on ADJUDICATION ONLY** — every other step is a pinned dispatch or a shell
command.

## 1. Setup — ONE haiku agent (`model: haiku`, `effort: low`)

Dispatch it to gather and return one compact block:
- **Diff size.** `git diff --shortstat <range>` + `git diff --stat` (spot
  generated files).
- **Acceptance criteria.** The ft issue's "Stack & design acceptance criteria"
  section, verbatim, via `gh issue view`.
- **Dead-code sweep.** `pnpm deadcode` (knip). Verify each hit (grep for
  dynamic/string refs knip misses), cross-check AGENTS.md "Dormant by design"
  (a switched-off lever is not dead code — flag but say so), collapse dead
  chains to one root finding. Deterministic, so it runs once here, never in the
  review fan-out.
- **Boot smoke.** `lsof -i :3000 -sTCP:LISTEN -t` FIRST. If a server is already
  up, reuse it and record that QC did not start it (Next 16.2 refuses a second
  dev server in one dir; two sessions on one repo is normal). Only if the port
  is free: start `pnpm dev` backgrounded, record the REAL listening PID, wait
  for readiness, grep startup for `✓ Ready` plus failure signatures. Leave the
  server running for steps 3 and 6. If boot fails, STOP and report.

## 2. Deterministic gates — shell

`pnpm build` and `pnpm exec tsc --noEmit`. A red gate stops QC — report and
wait.

## 3. Browser journeys — parallel, `model: sonnet` `effort: medium`

Static review cannot see a hydration error, a dead control, a blank render, or
a failed request (#69: those slipped 36 static agents + tsc + lint + a boot
grep). Derive JOURNEYS from the diff — what a user can now *do* differently,
each an ordered walk that usually spans several routes (the handoffs between
routes are where bugs hide). Dispatch one `browser-verifier` per journey, each
with its own `--session` id, in parallel, reusing step 1's server.

Tool: the `agent-browser` CLI, headless (the two MCP browsers are token-heavy
and rejected). Auth is scripted, never reasoned about: each verifier runs
`.claude/skills/feature/scripts/qc-login.sh <session> <base>` as its session's
first command — a deterministic test-user login (fixed selectors, documented
test credentials). Only the script itself failing is an auth finding; an agent
must never stall a sweep on login or ask the owner to log in. Rules that keep parallelism
safe: state each journey's preconditions (seed a row rather than drive the UICP
that creates it; report a state as unreachable rather than skip it silently);
a WRITE journey needs its own record or runs serially; never drive
money/irreversible controls — walk up, confirm the preceding state, report the
rest unreached-by-design.

Collect runtime errors from Next's own endpoint, once, after journeys return
and **before any session closes**:

```bash
curl -s -X POST http://localhost:3000/_next/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"get_errors","arguments":{}}}'
```

Source-mapped stack traces across every live session — strictly better than an
agent transcribing a console. The orchestrator then closes each session.

## 4. Static review — FOUR peer reviewers, identical combined charter

Not a fan-out of narrow angles: four reviewers, each doing ONE deep pass over
the whole diff against a single combined charter — **correctness bugs +
cross-file contract breaks + acceptance-criteria compliance + convention
violations + instruction-file staleness.** Three are external (background,
zero Claude); one is Claude. This is the only divergent stage, so diversity
rides on model families, not on angle-splitting.

- **codex** — `COUNCIL_MODEL=gpt-5.6-sol`, tier high
- **grok** — grok-4.5, tier high
- **agy** — `COUNCIL_TIER=gemini-3.1-pro-high`
- **claude** — one `bug-finder`-style agent, `model: sonnet`, `effort: high`

For each external, write the charter + diff range + acceptance criteria +
plan-frozen vetoes to `.feature/review-<family>.in.txt`, then (each
`run_in_background: true`):

```bash
CLAUDE_PROJECT_DIR="$PWD" COUNCIL_SCRATCH="$PWD/.feature" \
  COUNCIL_SCHEMA="$PWD/.claude/workflows/qc-findings-schema.json" \
  bash .claude/workflows/council/run.sh <family> review-<family>
```

(codex additionally: `COUNCIL_MODEL=gpt-5.6-sol`; grok/codex tier defaults to
high already; agy carries its model in the tier slug.) Each returns findings in
`qc-findings-schema.json` shape. A lane that fails is reported as failed, never
as a clean pass — if ALL external lanes fail, the review is Claude-only and
must be reported as such, not as a full cross-model pass.

## 5. Merge + adjudicate — this session (the one judgment stage)

Merge the four lists, dedup near-duplicates by file+line, and adjudicate every
finding — this is where the session model earns its place (measured at 82% of a
real run's main-session output, catching things cheap models miss). Cross-family
trust is free here: a finding raised by 2+ independent families is high-confidence;
a lone finding gets weighed on its scenario. Plan-frozen decisions in the ft
issue are vetoes — drop them even if raised. A finding that is real but
not-this-slice → surface to the user and drop (the flow tracks no deferrals).
Disagreement between reviewers is signal for this stage to weigh, not a reason
to spawn a tiebreaker.

## 6. Apply fixes + narrow re-sweep

**Applying is not adjudicating — dispatch it.** One owner per fix: an
`implementer`-style agent, `model: sonnet` for an ordinary fix, `model: opus`
for a risk-path fix (auth, money, posting, schema/migration, new trust
boundary). The finding text IS the brief — no brief file needed. Disjoint files
→ parallel; overlapping → serial. The fix diff stays gated by step 2's gates
re-run and this re-sweep — no separate delta-verify pass.

Then re-run the browser journeys whose routes the fixes touched (only knowable
now — that's why it can't fold into step 3). Same agents, same server, same
`--state`. If step 6 changed nothing, skip and say so.

## 7. feature-lint + doc sync, then the verification gate ✋

- **`feature-lint`** on the changed files (LAST — the review pass mutated code).
  Formatting is already done by the PostToolUse hook; this is residual Biome
  (no-fix + `--unsafe` rules) → risk-tiered fixer agents (`model: sonnet`),
  gating on clean `pnpm build`.
- **Doc sync — subtractive first**, ONE agent (`model: sonnet`, `effort:
  high`), fed by the reviewers' staleness findings. Default outcome is NO
  change. Subtract any AGENTS.md/`.claude/rules/`/skill line the diff falsified
  or made code-recoverable; add only a genuine non-recoverable keeper (new
  guard, retired pattern, new trust boundary). Single-source every fact.
- **Teardown:** kill the dev server by its REAL listening PID only if step 1
  started it; if it was reused, leave it and say so.

**Then the verification ✋ — write to the owner in full:**

> builds ✓ · boots ✓ · journeys walked ✓ (+ anything NOT REACHED, verbatim —
> that is the owner's manual-check set) · findings fixed ✓ · server killed ✓ (or
> what remains). Here is what was implemented, and here is what you must
> manually verify before we ship.

Stop there and wait. This is the run's second and last gate.

## Hard rules

- Session model = ADJUDICATION ONLY. Setup, journeys, reviews, fixes, lint, doc
  sync are all dispatched with explicit model+effort or run in shell.
- Four peer reviewers, one combined charter each — never re-expand into a
  per-angle × per-family barrier, and never a separate verifier quorum
  (deleted: on #69 a per-finding verify fan-out burned 30 agents for 0
  refutations).
- Cleanup/simplification is quality, not correctness — it is NOT a QC step; run
  `/simplify` on demand, off the critical path.
- A dependency MAJOR upgrade, framework migration, or schema/data migration
  surfacing here → STOP and present options; never autonomous.
