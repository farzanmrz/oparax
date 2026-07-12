---
name: feature-plan
description: >-
  Phase 1 of the feature flow, standalone: turn an ask into an approved spec+plan,
  then cut the issue + ft/N branch. Use when the user says /feature-plan, "plan
  this feature", "spec this out", or wants a plan gate without committing to the
  full flow. Ends at the approved plan + branch — building is /feature-build.
argument-hint: "[feature description]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
disable-model-invocation: true
---

# /feature-plan — spec + plan ✋ (one gate)

Seed from `$ARGUMENTS` or the conversation.

**Preflight.** Read AGENTS.md + the `.claude/rules/` files for the areas touched.
The slice comes from the user's ask — never self-served from the `triage:` issue
backlog. Scratch lives in `.feature/` (create self-gitignoring: `mkdir -p .feature
&& printf '*\n' > .feature/.gitignore`).

**Clear the thinking first.** Rambling/multi-directional ask → first interview one
question at a time with your best guess attached, until the ask is coherent. Then
invoke `first-principles-thinking` seeded with that ask — this phase's thinking
gate, not optional: its dialogue strips the ask to the load-bearing problem and
minimal rebuild, and its concluded action IS the confirmed ask the planner is
dispatched with. Direction still genuinely unknown after it → `idea-refine` (save
path override: `.feature/`). These are conversations, not sign-offs — the plan
GATE below stays this flow's only approval gate.

**Draft via the `planner` agent** (`.claude/agents/planner.md`, pinned `model: opus`
— the flow's one top-model step; never downgrade it). Dispatch with the confirmed
ask; save its spec+plan verbatim to `.feature/spec-plan.md`. Gate revisions
re-dispatch the planner with the prior draft + feedback. The document:

- Opens with a **definition-of-done in ≤2 sentences** (can't? slice too big — cut).
- **2–3 approaches, one recommended**, with the deciding trade-off.
- Explicit **In scope / Deferred** split — every "while we're here" goes to Deferred.
- The **plan** for a zero-context engineer: file map first; bite-sized tasks with
  exact file ownership + interfaces; full code in non-obvious steps; NO placeholders.
  Split tasks only where a reviewer could reject one and approve its neighbor.
- Big/architectural slices only: 3–4 parallel opus sketch-agents (risk-first,
  YAGNI-minimal, vertical-slice, verification-first) feed the planner; sketches die
  at the gate.

GATE ✋: **paste the full spec+plan into chat** (never a file pointer). Revise until
the user's explicit go. On approval:
`.claude/skills/feature/scripts/start.sh "<feature name>" .feature/spec-plan.md`
— cuts `ft/<issue#>` from clean dev, opens the issue with the plan as body (capture
the issue number — its only stdout line) — then delete the draft. The issue is now
the single source of truth.

Rules: scope freezes at this gate. Planning docs never enter the repo — the issue
body is the record.
