---
name: feature-build
description: >-
  Phase 2 of the feature flow, standalone: execute the approved plan from the
  ft/N issue inline, as a dumb executor over a hyper-specific spec. Use when the
  user says /feature-build, "build the plan", "implement the tasks", or "just
  build X" mid-flight on a feature branch.
argument-hint: "[issue# | what to build]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(pnpm *)
# inherit, not a pin: the owner dials build sessions cheap (sonnet low) — the plan
# carries the judgment, this phase carries it out. A pin would override that dial.
model: inherit
effort: medium
---

# Build — inline, sequential, silent

**Source of tasks:** the `ft/<issue#>` issue body via `gh issue view` — it is
hyper-specific by the plan phase's contract (files, signatures, near-code per
task). If there is no issue, the user's direct instruction is the plan
(small-build mode — one branch, no scope creep beyond what they said).

Communication: the `Flow` output style governs — zero prose during execution;
the only permitted text is an escalation.

## Preflight

Run `pnpm install --frozen-lockfile`. An unmet-peer warning on a
feature-relevant package is a BLOCKER — stop and surface (proven in #39: a
green build hid a worker crash).

## Execute — no dispatch, no briefs

Work the plan's Build steps **yourself, in order, in this session**. Dispatching
implementers was measured and removed: 204KB of briefs across 27 tasks bought
parallelism that mostly wasn't there, and concurrent agents confused each
other's work. The plan already decided the design — your job per task:

1. Invoke the skills the plan names for that task (binding, not optional).
2. Write the code the plan specifies, resolving only implementation nuance —
   imports, adjacent-code idiom, minor type friction. Match the surrounding
   code's style; no placeholder comments, no TODOs.
3. **Escalate instead of improvising:** if reality diverges from the plan
   beyond nuance — an interface can't exist as specified, a dependency
   surprise, a guard the plan missed — STOP and surface it in one or two
   sentences. Architecture decisions never happen on the build dial.
4. After each task: `pnpm exec tsc --noEmit` and confirm no error names the
   files just written (the branch as a whole may not typecheck until later
   tasks land; only the files just touched must be clean). **Green = commit
   checkpoint.** Commits here are restore points, not history — the slice
   squash-merges at ship.

Respect AGENTS.md's Guards (stock shadcn + ai-elements only; no persistence
until a data shape earns it; never resurrect deleted legacy patterns). A task
needing MCP (Supabase migration, type regeneration, Vercel config) is an
ordinary task — do it inline; load tools via ToolSearch.

## Hard rules

- Never push, never branch, never open PRs. No builds or lint here — that is
  `/feature-qc`.
- **No browser here — ever.** Build never opens a browser (not `agent-browser`,
  not an MCP surface) and never dispatches a browser agent. Proving behavior in
  a rendered page is QC's journeys. When the plan itself demands live
  demonstration or evidence capture (a verification-type slice), that work IS
  QC/verification: finish the build tasks, exit into `/feature-qc`, and let the
  evidence be gathered there or at the owner's manual gate — never improvised
  mid-build.
- Mid-flight new scope stays off the branch — drop it; a deferral the user
  names is a future slice.
- Track progress with TaskUpdate only when the plan has 4+ tasks; otherwise
  skip the ceremony.

## Exit — straight into QC

When every task is done and the last checkpoint is green, **invoke
`/feature-qc` immediately — no gate, no prose, no asking.** The owner's next
decision point is QC's verification report. (Standalone exception: if the user
invoked /feature-build explicitly outside the full flow and the session should
stop here, run `/handoff` so a fresh session can resume.)
