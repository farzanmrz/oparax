---
name: feature-plan
description: >-
  Phase 1 of the feature flow, standalone: the spec+plan gate. Use when the user
  says /feature-plan, "plan this feature", "spec this out", or wants a plan gate
  without committing to the full flow. Not for building — that is /feature-build.
argument-hint: "[feature description]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
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
minimal rebuild, and its concluded action IS the confirmed ask the plan is
drafted from. Direction still genuinely unknown after it → `idea-refine` (save
path override: `.feature/`). These are conversations, not sign-offs — the plan
GATE below stays this flow's only approval gate.

**Draft the spec+plan inline** — authored right here in the chat, inheriting the
session's model; never delegated to a subagent. Before writing, read every file the ask
touches and Grep for callers and contracts rather than guessing; never propose
anything a hard guard forbids. Save the draft to `.feature/spec-plan.md`. Gate
revisions rework the same draft with the user's feedback. The document:

- Opens with a **definition-of-done in ≤2 sentences** (can't? slice too big — cut).
- **2–3 approaches, one recommended**, with the deciding trade-off.
- Explicit **In scope / Deferred** split — every "while we're here" goes to Deferred.
- The **plan** for a zero-context engineer: file map first; bite-sized tasks with
  exact file ownership + interfaces + the `.claude/rules/` skills each implementer
  must invoke (feature-build copies them into briefs); full code in non-obvious
  steps; NO placeholders. Split tasks only where a reviewer could reject one and
  approve its neighbor.
- Big/architectural slices only: 3–4 parallel sketch-agents (risk-first,
  YAGNI-minimal, vertical-slice, verification-first) feed the draft; sketches die
  at the gate.

GATE ✋: **paste the full spec+plan into chat** (never a file pointer). Revise until
the user's explicit go. On approval:
`.claude/skills/feature/scripts/start.sh "<feature name>" .feature/spec-plan.md`
— cuts `ft/<issue#>` from clean dev, opens the issue with the plan as body (capture
the issue number — its only stdout line) — then delete the draft. The issue is now
the single source of truth.

Rules: scope freezes at this gate. Planning docs never enter the repo — the issue
body is the record.
