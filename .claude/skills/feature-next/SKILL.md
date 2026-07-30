---
name: feature-next
description: >-
  Optional handoff helper: frame an owner-selected issue or ask as a
  paste-ready prompt for a fresh feature-plan session. It never chooses, ranks,
  or schedules issues. Use when the owner has already named what they want to
  plan next.
argument-hint: "[owner-selected issue # or ask]"
model: inherit
---

# Frame an owner-selected slice

Runs in the same session as ship — this is a judgment task (shaping the next
ask), so it earns the session model. The `Flow` output style permits full prose
here: the paste-ready prompt IS the deliverable.

## Steps

1. **Require the owner's selection.** Read the issue number or concrete ask from
   `$ARGUMENTS`. If none is provided, ask what the owner wants to plan; never
   choose or rank an issue on their behalf.
2. **Read only the selected context:** the named issue or ask, plus the slice
   that just shipped when it contains an explicitly linked constraint or
   owner-approved deferral relevant to that selection.
3. **Emit the paste-ready prompt** — a `/feature-plan` invocation the owner can
   drop into a fresh session verbatim:
   - seeded with the selected existing issue number (or a crisp new-ask description),
   - carrying forward context this slice produced that the next planner needs
     (a deferred item, a note left on an issue, a discovered constraint),
   - naming the **recommended session-model dial** for the plan phase (Fable
     for genuine design, sonnet for a pattern-following slice).
Keep it to the prompt plus a one-line rationale. The owner opens the next
session on the recommended dial and pastes.
