---
name: feature
description: >-
  Use when the user wants to build, implement, redesign, restructure, or make any
  non-trivial multi-step change to this project's app — anything that needs design
  + planning + a real build, not a one-off edit. Do NOT use for quick questions,
  one-line fixes, pure analysis, or debugging an existing bug.
argument-hint: "[feature description]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
disable-model-invocation: true
---

# Feature — idea to shipped (native flow)

The end-to-end workflow for building a feature in this repo (oparax-chirp), built on
Claude Code primitives only: this skill orchestrates; project agents implement and
review; built-in commands do QC. No plugin sub-skills — the judgment patterns worth
keeping live in this file's own words.

**Core principle:** parallelism is a private implementation detail, never a public
artifact. **ONE issue · ONE feature branch · ONE squashed commit on `dev`.** No
per-task branches. No PRs. No CI / GitHub Actions. The user controls integration.

## Running this skill

**Track the five phases with TaskCreate** — one task per phase, ticked as each
finishes. This checklist is the durable anchor that keeps the tail phases (QC,
triage, ship) from being skipped; the workflow is complete only when Phase 5 ticks.

1. `Phase 1 — Spec+plan approved by user (✋ gate)`
2. `Phase 2 — Issue + branch created at the gate (start.sh), built on ft/<issue#>`
3. `Phase 3 — QC: reviews · lint · build · boot smoke`
4. `Phase 4 — Manual-test feedback triaged (✋ gate)`
5. `Phase 5 — Shipped via ship.sh (✋ gate)`

Stop at every ✋ gate and wait for the user's explicit words. Phases 2–3 are
autonomous; the three gates (spec+plan, triage, ship) are user-controlled.
**Grounding never skips gates**, however much context was adopted.

**Skill grounding (binding, every phase):** before working in any area, invoke the
skill named for that area in AGENTS.md's Skills table (`vercel:eve`, `vercel:ai-sdk`,
`vercel:shadcn`, `vercel:nextjs`, …). Dispatched agents do NOT inherit this — every
dispatch prompt must name the skills that task must invoke before writing code.

**Model routing (fully automatic — the user never switches models):** the session
runs on whatever model it started with (Opus is the norm; nothing here requires
more). Fable enters the flow exactly once: the Fable-pinned `planner` agent in
Phase 1. If that dispatch fails on a usage limit, re-dispatch the planner with
`model: "opus"` and note the downgrade at the gate — never block on it. Every
other dispatch is pinned down-tier: `planner`/`implementer`/`task-reviewer` carry
models in their frontmatter; /simplify and /code-review finder AND verifier
agents dispatch with `model: "opus"`; recon/Explore and mechanical-sweep agents
with `model: "sonnet"`; lint fixers keep their own frontmatter (sonnet/opus).

**Scratch discipline:** every working file this flow generates lives in `docs/feature/`
(create it self-gitignoring: `mkdir -p docs/feature && printf '*\n' > docs/feature/.gitignore`).
The spec+plan draft dies once it reaches the issue; everything else dies at ship.

---

## Phase 1 — Spec + plan ✋ (one gate)

If invoked as `/feature <description>`, seed from `$ARGUMENTS`; else from the
conversation.

**Preflight.** Read AGENTS.md and the `.claude/references/` files for the areas
the ask touches. (The slice comes from the user's ask — never from
`docs/triage.md`, which is the user's private notes, not a flow input.)

**Clear the user's thinking first.** If the ask is rambling, confused, or pulling
in several directions, interview the user directly — one question at a time, each
with your best guess attached, until intent is confirmed. If the *direction*
itself is genuinely unknown (not just fuzzy), invoke **`idea-refine`** for
divergent options — override its save path to `docs/feature/`, never `docs/ideas/`.
For an already-clear ask, skip both.

**Draft via the `planner` agent** (`.claude/agents/planner.md` — Fable-pinned;
the flow's ONE top-model step): dispatch it with the confirmed ask + interview
conclusions; it grounds itself in AGENTS.md + `.claude/references/` and the code, and
returns the complete spec+plan, which you save verbatim to
`docs/feature/spec-plan.md`. Gate revisions re-dispatch the planner with the
prior draft + the user's feedback. The document is ONE spec+plan:

- Opens with a **definition-of-done in ≤2 sentences** — if it can't be said that
  briefly, the slice is too big; cut it before the gate.
- **2–3 approaches considered, one recommended**, with the trade-off that decides it.
- An explicit **In scope (this slice)** / **Deferred (not now)** split — route every
  "while we're here" idea to Deferred rather than absorbing it.
- Then the **plan**, written for an engineer with zero context for this codebase:
  map the file structure first; then bite-sized tasks, each listing the exact files
  it owns and the interfaces it consumes/produces; full code in any non-obvious
  step. **No placeholders** — no TODO, TBD, or "something like" inside task steps.
  Split tasks only where a reviewer could meaningfully reject one while approving
  its neighbor. Global constraints (hard guards, conventions) stated once at the
  top; tasks reference them, never restate them.
- **Big/architectural slices only** (rare): before the planner runs, dispatch 3–4
  parallel subagents (`model: "opus"`) in one message, each drafting a 1–2 page plan
  *sketch* under a distinct directive (risk-first, YAGNI-minimal, vertical-slice,
  verification-first) into `docs/feature/`; hand the sketches to the planner as
  input. Sketches die at the gate.

GATE: **paste the complete spec+plan text into chat** — never a pointer to a file or
the issue; chat is the only review surface. The user revises en-masse, as many
rounds as they want; only their explicit go advances. On approval:
`${CLAUDE_SKILL_DIR}/scripts/start.sh "<feature name>" docs/feature/spec-plan.md` —
it cuts `ft/<issue#>` from a clean dev and opens the issue with the approved
spec+plan as its body (capture the issue number — its only stdout line) — then
delete the draft; the issue is now the single source of truth. Tick Phase 1.

## Phase 2 — Build (autonomous, parallel by structure)

- **The issue and branch were created at the Phase 1 gate** (start.sh) — you are
  on `ft/<issue#>` and the issue number drives ship.
- **Dependency preflight — before any task is built.** Run `pnpm install` and read
  its output for unmet-peer-dependency warnings involving packages this feature
  touches. An unmet peer on a feature-relevant package is a BLOCKER: stop and
  present it to the user — it is a runtime failure `pnpm build` cannot see (proven
  in #39: eve peering `ai ^7` against the repo's `ai ^6` pin crashed the dev worker
  after a green build).
- **Mirror the plan into TaskCreate**: one task per plan task, dependencies encoded
  with `addBlockedBy` (e.g. schema blocks API blocks UI). The task graph — not
  prose — decides what may run concurrently.
- **Execution — the smallest shape that fits:**
  - **1–2 tasks, or tightly coupled** → implement inline in this session.
  - **3+ unblocked tasks with disjoint file groups** → dispatch the **`implementer`**
    agent (`.claude/agents/implementer.md`) once per task, all in ONE message so
    they run in parallel, same working tree. Disjoint file ownership is what makes
    this safe — do NOT use worktree isolation here (it branches from the default
    branch, not `ft/<n>`).
  - **Tasks needing live mutual awareness or negotiation** → an **agent team**:
    teammates own file groups and share the dependency-gated task list (requires
    `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`; no automatic file isolation — assign
    disjoint files; watch for task-status lag blocking dependents).
  - **Massive mechanical sweeps** (rare) → the Workflow tool.
- **Each dispatched task gets a brief** at `docs/feature/task-<N>-brief.md`: the task's
  plan text verbatim + interfaces produced by prior tasks + the report path
  (`docs/feature/task-<N>-report.md`). The dispatch prompt stays thin — one line of
  scene-setting, the brief path, the skills to invoke, the report contract. The
  brief is the implementer's ONLY requirements source.
- **As each implementer returns, dispatch the `task-reviewer`** agent
  (`.claude/agents/task-reviewer.md`) with the brief path, report path, and the
  task's commit range. It verifies against the diff and never trusts the report.
  Fix its findings before dependent tasks unblock.
- Everything converges into `ft/<issue#>` as ordinary commits. Agents NEVER push,
  NEVER open PRs, NEVER create branches — `git branch` shows only `ft/<issue#>`
  (plus dev/main/beta).
- **Implementers write code only** — no builds, lint, or formatting; verification is
  centralized in Phase 3. Ignore mid-flight LSP diagnostics while parallel edits
  land; they are not ground truth. Tick Phase 2.

## Phase 3 — QC (autonomous)

Over the whole feature diff, in order:

1. **Convergence check**: all commits on `ft/<issue#>`; `git worktree list` shows
   only the main checkout; no stray branches.
2. **`/simplify`** (built-in) — cleanup-only pass; apply its fixes.
3. **`/code-review`** (built-in) — bug hunt over the branch diff; fix real findings.
   For a large or risky diff, offer the user `/code-review ultra` (cloud fleet).
4. **`lint-resolve`** skill (scoped to this feature's changed files) — biome format
   + safe fixes, residual findings via its fast/careful fixer agents, gating on a
   clean `pnpm build` — the authority on compile correctness.
5. **Runtime boot smoke** — a build cannot see boot failures: start `pnpm dev` in
   the background, wait for readiness, assert (a) every mounted service reports
   ready — today: the Next.js "Ready" line AND eve's dev-server line — and (b) NO
   failure signatures in startup output (ERROR, "failed", "worker init failed",
   unmet peer, unhandled rejection). Collect WARNING lines for Phase-4 triage; then
   kill the dev process. Startup output only — no browser, no page-driving.
6. **Update AGENTS.md or the touched area's `.claude/references/` file** if the
   feature changed anything they document (ships in the same diff).

Tick Phase 3. The branch now provably builds AND boots — that is what Phase 4 hands
to the user.

## Phase 4 — Feedback triage ✋ (the scope firewall)

The user manually tests and reports findings informally. For each, exactly one label:

- **fix now** — it breaks the slice's written definition-of-done (the ≤2-sentence
  statement from Phase 1). Build it here, then re-run lint-resolve and the boot
  smoke. If it doesn't break the DoD, it is not a fix-now, however tempting.
- **next feature / branch** — real, but its own slice → capture it to the user's
  `docs/triage.md`. You are scribing the user's deferral (extracting it from their
  feedback) — this is the ONE place the flow writes to triage, and only to record
  what the user chose to defer, never your own observations.
- **table for later** — maybe someday → likewise capture it to the user's `docs/triage.md`.

Loop test → triage → fix-now until the user has no fix-nows left.

GATE: **STOP and ask, in plain words, "Ready to ship, or more to fix first?"** A
green build is never permission to ship. Only the user's explicit "ship it"
advances. Tick Phase 4 when they say so.

## Phase 5 — Ship ✋

From the repo root, on `ft/<issue#>`:

```bash
${CLAUDE_SKILL_DIR}/scripts/ship.sh <issue#> "<feature summary>"
```

It refuses on the wrong branch, stray worktrees, or a dirty tree; squash-merges to
dev as ONE commit; pushes; deletes the branch; closes the issue (which remains as
the slice's permanent record); **sweeps all scratch** (`docs/feature/`, legacy
`.superpowers/`, the empty worktree mount); and leaves the repo on `dev`. The next
slice creates its own issue + branch at its Phase 1 gate. Tick Phase 5; only now
is the workflow complete.

---

## Hard rules (never break)

- NEVER create per-task branches or PRs. ONE feature branch only.
- NEVER open a PR or rely on GitHub Actions / CI. Quality = Phase 3, locally.
- NEVER push to `main` or `beta`. Ship target is `dev` only.
- Planning docs never enter the repo: the spec+plan lives in the slice issue's body
  (drafted transiently in `docs/feature/`, deleted once on the issue). The durable
  record is the squashed commit message + the issue — never AGENTS.md or
  `.claude/references/`. `docs/triage.md` is the user's notebook: write to it ONLY to
  capture the user's deferrals (Phase 4), and NEVER read it to choose or plan a slice.
- SCOPE IS FROZEN AT THE PHASE 1 GATE. A new feature/scope idea that surfaces
  mid-build goes to the spec's **Deferred** list, or — when the user defers it — the
  user's `docs/triage.md`; it is NOT built on the current branch. Phase 4 triage is
  the firewall.
- If the dependency preflight or boot smoke reveals the fix requires a dependency
  MAJOR upgrade, a framework migration, or a schema/data migration, the workflow
  STOPS and presents findings + options to the user as an explicit ✋ gate — never
  fix such things autonomously.
- Preserve the repo's behavior contracts (server-action field `name`s, the
  Supabase auth flows — recovery tokens consumed only on submit, same-password
  reset treated as success, signed-in users bounced off auth pages — and the eve
  chat's scaffold-faithful wiring) — see AGENTS.md and `.claude/references/`.
