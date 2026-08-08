---
name: feature
description: >-
  The end-to-end feature flow: plan → build → QC → triage+ship, run as one guided
  sequence. Use when the user wants a full slice built from idea to shipped commit.
  For a single phase, use the granular skills directly: /feature-spec,
  /feature-build, /feature-qc, /feature-ship (or /simplify, /code-review,
  /feature-lint for individual QC passes). Stubbing ideas happens OUTSIDE
  this flow via /feature-plan. To resume in a fresh session, use the
  global /handoff and /continue skills.
argument-hint: "[feature description]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
disable-model-invocation: true
---

# Idea to shipped: the orchestrator

This skill only conducts; the phase skills do the work. A run is **ONE issue,
ONE feature branch, ONE squashed commit on `beta`**. `beta` and `main` are
integration and promotion destinations, never feature-development branches. No
PRs, no CI. Parallelism is a private implementation detail.

* **Task tracking:** create one TaskCreate task per phase (2 through 5 below)
  and tick each as it finishes; the flow is complete only when the last ticks.
* **Scripts:** `start.sh`, `ship.sh`, and `promote.sh` live in
  `.claude/skills/feature/scripts/`, called by feature-spec and feature-ship.
* **Nothing about a run is persisted:** the branch identifies the slice, the
  issue body is its spec, the terminal target rides in the conversation. To
  stop mid-flow, run the global `/handoff` and resume in a fresh session with
  `/continue <session-id>`.
* **Owner-driven granular runs:** the user may jump out at any point and drive
  the granular skills themselves; this orchestrator's only job then is to keep
  the checklist honest.

## Harness portability

* **One flow, two harnesses, with one deliberate exception:** Codex invokes
  most of these skills through the `.agents/skills/` symlinks (`$feature`,
  `$feature-spec`, `$feature-build`, `$feature-qc`, `$feature-ship`),
  reading the Codex column of each skill's dials table. `feature-browse` and
  `feature-fix` are NOT symlinked: they are real files that exist only
  under `.agents/skills/`, invisible to Claude Code by construction (its
  skill discovery never scans that directory), because the owner never runs
  either in Claude Code. Every other skill stays genuinely dual-harness.
* **Never a second per-harness copy:** a duplicated skill drifts measurably
  weaker, so a genuine per-harness difference (session dial, subagent names,
  which council lanes run) belongs in a dials row; nothing else differs. The
  browse/fix asymmetry above is a placement difference, not a duplication —
  there is still exactly one copy of each.
* **Hop-anywhere, within a harness:** each phase starts from durable state
  only (the issue body, the branch, `origin/beta...ft/<N>`, the `## QC
  round` comments), so a slice may switch harness at any phase boundary
  that both harnesses actually support — which excludes browse and fix.

## 1. Resume detection: run on EVERY invocation, before anything else

Locate the slice before conducting. List the ft branches and note the current
branch:

```bash
git branch -a | grep ft/
```

Then, for an existing `ft/<N>`, read the issue and its comments:

```bash
gh issue view <N> --comments
```

**Marker format:** each new QC marker comment is titled `## QC round <R>: <suffix>`
(`findings`, `browsed`, `fixes`, `verified` — `docs` was a fifth marker before
2026-08-08, when `feature-docs` folded into `feature-verify`; a round with a
separate `docs` marker predates the merge and is still valid history). Match
markers by the `## QC round <R>` prefix plus the suffix keyword,
separator-agnostic (older rounds used an em dash).

Decide the entry point from the FIRST missing marker, in order:

| Marker present? | Meaning | Next |
|---|---|---|
| stub issue only (from /feature-plan), no spec/branch | nothing specced | `feature-spec` (phase 2) |
| `ft/N` + issue, no commits beyond the branch cut | planned, not built | build (phase 3, owner picks harness) |
| build commits, no `## QC round` comments | built | `feature-find` (either harness) |
| findings marker without browsed marker | adjudicated | `feature-browse` — OWNER-TRIGGERED, CODEX ONLY: surface it as the pending step, never auto-run; if this session is Claude Code, tell the owner to switch to Codex and run `$feature-browse` there |
| browsed marker without matching fixes marker | browsed | `feature-fix` from its phase 1 — CODEX ONLY (now covers apply, doc sync, and verify in one run); if this session is Claude Code, tell the owner to switch to Codex and run `$feature-fix` there |
| fixes marker without verified marker | fixed but not re-proven (an interrupted `feature-fix` run) | `feature-fix` again, resuming at its phase 4 (doc sync) — same Codex-only redirect applies |
| verified marker present | verified | triage/`feature-ship` (phase 5, ✋) |

* **State the detected position in one line** ("ft/73 has round-1 findings but
  no fixes: resuming at feature-fix in Codex") and continue from there.
* **Never re-run** a completed phase; **never skip forward** past a missing
  marker. In particular, NEVER enter ship while the latest round lacks the
  verified marker.
* **Claude Code stops at the harness boundary:** this table's `feature-browse`
  and `feature-fix` rows only run in Codex (real files under
  `.agents/skills/`, absent from `.claude/skills/` by design). A Claude Code
  session landing on either one reports the position and redirects — it
  does not attempt the Skill tool for a name that isn't in its own listing.
  `feature-qc`'s own copy of this rule is the fuller version; this one exists
  because `/feature` can land here directly, without going through
  `feature-qc`.

## 2. Spec

Invoke **`feature-spec`** to its ✋ gate: spec approved onto the stub issue,
`ft/<issue#>` cut.

* **The session STOPS here** (standing owner decision). The issue body is the
  complete spec, so the owner chooses where build runs: `/feature-build N` in
  a Claude session, or `$feature-build` in a Codex chat, on whatever dial
  they pick. Later phases are owner-triggered.

## 3. Build

Invoke **`feature-build`** (Claude path); a Codex build stops the same way in
its own app.

* **Stops when built** with a compact build summary; the owner triggers QC.

## 4. QC

Invoke **`feature-qc`**, ending at the verification ✋.

* **Three sub-steps, one harness split:** `feature-find` (either harness),
  `feature-browse`, `feature-fix` (Codex only — `feature-fix` now covers
  apply, doc sync, and verify in one continuous run). Each is runnable
  standalone; under this orchestrator, or under `/feature-qc chain`, they
  chain in one session up to the harness boundary (see feature-qc's harness
  guard).

## 5. Ship

Invoke **`feature-ship`**: owner feedback implemented, then shipped via
`ship.sh` (✋).

## Phase-boundary stops

A run pauses at every phase boundary and nowhere else:

1. **The plan gate (✋):** plan approved or denied; on approval the issue and
   branch are cut and the session stops.
2. **The build stop:** build ends with a compact summary and waits.
3. **The verification gate (✋):** after phase 4, presenting what was
   implemented and what the owner must manually verify before shipping.
4. **The ship gate (✋):** feature-ship's triage + authorization (with its
   standing pre-approval carve-out when the invocation itself says ship).

Between these stops nothing else pauses or narrates: within a phase the owner
watches the reasoning trace, and interim narration is forbidden output (the
`Flow` output style governs). The stops are checkpoints, not conversations.

## Global hard rules (bind every phase)

* **Branching:** NEVER create per-task branches or PRs. Feature slices always
  run on `ft/<issue#>`; app code is never developed directly on `beta` or
  `main`. ONE carve-out: owner-directed micro-edits to instruction files and
  docs (`.claude/**`, `AGENTS.md`, `docs/**`, nothing the deployed app
  executes) may land directly on `beta` as ordinary fast-forward commits,
  skipping the flow. `main` moves only through the ordered `beta` to `main`
  promotion path after the target-specific final gate; never force-push
  protected branches.
* **Terminal target:** carry the release target (`beta` or `main`) in the
  conversation across Build, QC, and Ship; nothing persists it to disk. One
  explicit final authorization names the entire consequence; successful
  target deployment checks do not create extra approval gates.
* **Fan-out cap:** ≤10 agents TOTAL per fan-out, whatever any sub-skill's
  default says.
* **Scope freeze (agent-self-generated ideas only):** mid-build work an agent
  notices on its own is out of scope. Drop it, never onto this branch; if it
  matters, the user re-plans it as its own slice later. Findings the owner
  reports during manual verification are NEVER scope creep: implement every
  one on the branch before the ship gate, deferring an item only when the
  owner explicitly says it can wait.
* **No planning docs in the repo:** the issue body + squashed commit message
  are the record; scratch lives in self-gitignored `.feature/` and dies at
  ship.
* **Skill grounding is binding everywhere:** the plan grounds each task in the
  stack skills its area needs (selected inline in feature-spec's grounding
  phase); the build session invokes those skills as it implements each task.
* **STOP and present options, never autonomous:** dependency MAJOR upgrades,
  framework migrations, schema/data migrations.
* **Behavior contracts:** preserve server-action field names, Supabase auth
  flows, and the chat scaffold wiring.
