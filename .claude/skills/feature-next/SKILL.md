---
name: feature-next
description: >-
  Phase 5 of the feature flow: after a slice ships, frame the next one. Emits a
  paste-ready prompt for a fresh /feature-plan session and updates the roadmap.
  Use when the user says /feature-next, "what's next", or "plan the next task's
  prompt for me" at the end of a slice.
argument-hint: "[what's next, in a sentence]"
model: inherit
---

# Frame the next slice

Runs in the same session as ship — this is a judgment task (shaping the next
ask), so it earns the session model. The `Flow` output style permits full prose
here: the paste-ready prompt IS the deliverable.

## Steps

1. **Read the roadmap state:** AGENTS.md "Current roadmap" line, `gh issue list
   --state open`, and what the slice that just shipped implemented or deferred
   (its issue, its manual-verification findings).
2. **Take the owner's one-line intent** from `$ARGUMENTS` if given; otherwise
   propose the next slice from the roadmap order and say why.
3. **Emit the paste-ready prompt** — a `/feature-plan` invocation the owner can
   drop into a fresh session verbatim:
   - seeded with the issue number to graduate (or a crisp new-ask description),
   - carrying forward context this slice produced that the next planner needs
     (a deferred item, a note left on an issue, a discovered constraint),
   - naming the **recommended session-model dial** for the plan phase (Fable
     for genuine design, sonnet for a pattern-following slice).
4. **Update the roadmap** — if the shipped slice changed the order or cleared an
   item, edit AGENTS.md's "Current roadmap" line and commit it directly to
   `beta` (instruction-file micro-edit carve-out — see feature/SKILL.md).

Keep it to the prompt plus a one-line rationale. The owner opens the next
session on the recommended dial and pastes.
