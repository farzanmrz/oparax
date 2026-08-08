---
name: feature-build
description: >-
  Phase 2 of the feature flow, standalone: execute the approved plan from the
  ft/N issue inline; the spec decides, build implements. Use when the
  user says /feature-build, "build the plan", "implement the tasks", or "just
  build X" mid-flight on a feature branch.
argument-hint: "[issue# | what to build]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(pnpm *)
# inherit, not a pin: the owner sets the session dial. The plan carries the
# judgment; this phase carries it out. A pin would override that dial.
model: inherit
effort: medium
---

# Build: inline, sequential, silent

* **Source of tasks:** the `ft/<issue#>` issue body via `gh issue view`. It is
  hyper-specific by the plan phase's contract (files, signatures, near-code
  per task).
* **No issue = small-build mode:** the user's direct instruction is the plan.
  One branch, no scope creep beyond what they said.
* **Communication rule:** the `Flow` output style governs. Zero prose during
  execution; the only permitted text is an escalation.
* **Grounding fan-out (Codex only):** before writing code, ground the issue
  body's named files with PARALLEL read-only `cx_grounder` instances, named
  explicitly, whenever they span 3+ independent files/areas (≤6 threads);
  Codex never fans out unprompted and sequential-reads otherwise.
  IMPLEMENTATION stays inline and sequential in both harnesses (the rule
  below); fan-out is for reading, never writing.

## 1. Preflight

Run the install gate:

```bash
pnpm install --frozen-lockfile
```

* **BLOCKER:** an unmet-peer warning on a feature-relevant package. Stop and
  surface it (proven in #39: a green build hid a worker crash).

## 2. Execute

Work the plan's Build steps **yourself, in order, in this session**.
**No dispatch, no briefs:** per-task implementer agents were measured and
removed (brief overhead outweighed parallelism that mostly wasn't there, and
concurrent agents confused each other's work). The plan already decided the
design.

### A. Per-task loop

1. **Skills first:** invoke the skills the plan names for that task (binding,
   not optional).
2. **Write to spec:** write the code the plan specifies, resolving only
   implementation nuance (imports, adjacent-code idiom, minor type friction).
   Match the surrounding code's style; no placeholder comments, no TODOs.
3. **Escalate instead of improvising:** if reality diverges from the plan
   beyond nuance (an interface can't exist as specified, a dependency
   surprise, a guard the plan missed), STOP and surface it in one or two
   sentences. Architecture decisions never happen on the build dial.
4. **Checkpoint:** after each task, run the typecheck and confirm no error
   names the files just written (the branch as a whole may not typecheck
   until later tasks land; only the files just touched must be clean). Green =
   commit checkpoint. Commits here are restore points, not history: the slice
   squash-merges at ship.

```bash
pnpm exec tsc --noEmit
```

### B. Guards and MCP

* **Standing guards:** stock shadcn + ai-elements only; no persistence until
  a data shape earns it; never resurrect deleted legacy patterns.
* **MCP tasks are ordinary tasks:** a Supabase migration, type regeneration,
  or Vercel config task is done inline; load tools via ToolSearch.
* **Exploratory DB work:** if a DB task turns exploratory (schema surprises,
  repeated query failures), dispatch `supabase-runner` instead of thrashing
  in-session.

## Hard rules

* **Never push, never branch, never open PRs.** No `pnpm build` here: that
  is `/feature-qc`. Lint runs exactly once, as the phase-3 exit sweep, never
  mid-task.
* **No browser here, ever:** build never opens a browser (not
  `agent-browser`, not an MCP surface) and never dispatches a browser agent.
  Proving behavior in a rendered page is the owner's manual check.
* **Verification-type slices:** when the plan itself demands live
  demonstration or evidence capture, that work IS QC/verification. Finish the
  build tasks, exit per phase 3 into `/feature-qc`, and let the evidence be
  gathered at the owner's manual gate, never improvised mid-build.
* **Scope:** mid-flight new scope stays off the branch: drop it. A deferral
  the user names is a future slice.
* **Progress tracking:** TaskUpdate only when the plan has 4+ tasks;
  otherwise skip the ceremony.

## 3. Exit: STOP when built

* **Exit lint sweep (changed files only):** before reporting, run

```bash
files=$(git diff --name-only --diff-filter=ACMR origin/beta...HEAD \
  -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs')
[ -n "$files" ] && echo "$files" | xargs pnpm exec biome check --write --no-errors-on-unmatched
```

  then fix every remaining diagnostic inline (the writer fixes its own lint
  while context is hot; a behavior-changing fix like a hook-dependency edit
  gets one flag line in the build summary), re-run `pnpm exec tsc --noEmit`,
  and commit. Handoff contract: zero Biome diagnostics on the branch's
  changed files, so QC's residual-lint step starts empty. Never widen to
  `biome check .`: pre-existing findings in untouched code are QC's scope
  call, not this build's.
* **Stop and report** when every task is done and the last checkpoint from
  phase 2 is green: tasks completed, files touched, and any deviations or
  escalations. A compact build summary, nothing more.
* **Never auto-invoke QC** (owner decision 2026-07-27): wait for the owner to
  say whether QC runs now (`/feature-qc`), later, or in a different session.
  This mirrors the external-executor path (a Codex build necessarily stops
  when done), so every build ends at the same owner checkpoint regardless of
  harness.
