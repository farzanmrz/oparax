# Standing design notes — owner decisions, set once, never re-litigated per round

Referenced by `direction-council.md`: every direction-council brief INCLUDES this file
verbatim, and every lane obeys it as a hard constraint. When the owner states a general
design decision during a pick (as opposed to a one-slice preference), it is APPENDED here
in the same session — that is what keeps expensive re-rounds from happening because a
lane repeated an already-rejected pattern. Entries carry the decision date.

## Page anatomy

- **A page title is ONE line, with nothing stacked under it** (2026-07-27). No gray
  descriptive subline beneath the title ("Create agent" over a muted "give it a beat and
  sources" is the rejected example), and no gray hairline rule under the title. This is
  the downward twin of the no-eyebrow rule (no kicker above, no subline below).
- **Action buttons never render inside bordered, field-look containers** (2026-07-27).
  A button like Connect X sits as a standalone control at its section's level — never
  boxed inside an input-shaped bordered element. A *confirmed/completed state* may render
  as a field-look row (e.g. "✓ @handle connected"); the button that gets you there may not.
- **Grouping related fields into one combined container with thin dividers between
  groups is a liked pattern** (2026-07-27, from grok's round-3 create board) — one
  bordered container, `Separator`-style dividers inside, rather than N separate boxed
  cards or a fully flat list.

## Rendering & judging

- **Every board state renders as a FULL PAGE, never a floating fragment** (2026-07-27).
  The owner judges what a user will actually see: real shared chrome (site header; the
  mobile desk-tab bar on desk pages) is included even when the slice doesn't touch it,
  inside an explicit viewport frame with visible bounds. Lane annotations live OUTSIDE
  the frame, visually distinct, so board commentary can never be mistaken for page UI.
