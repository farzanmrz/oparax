# Oparax Design System

Dark, quiet, and fast. The system was extracted from the locked landing page
(`Oparax Landing v10.html`) — that page is the living reference for how the
pieces compose. Everything reusable lives in **`styles.css`**; pages keep only
their own layout CSS.

## Product context

Oparax is an AI news desk for reporters on X. An agent watches the X accounts
a user can't keep up with, scans on a schedule, merges duplicate reports into
single news items, and drafts posts in the user's voice — live on X today,
more platforms coming. UI copy is plain sentence case: direct, first-person,
no jargon, no unnecessary capitalization.

## Foundations

- **Font** — Source Sans 3 (variable, `fonts/`), the only family. `--font-sans`.
- **Logo** — the "orbit" mark (two round-capped arcs + core dot), drawn inline
  with `currentColor`. The wordmark is always **plain text** next to the mark,
  never an image. Files: `assets/oparax-mark.svg`, `assets/oparax-favicon.svg`.
- **Color** — absolute-dark theme (tokens in `styles.css`):
  - Surfaces: `--bg` (page) · `--chrome` (header/footer, separated by 1.5px
    `--chrome-line`) · `--card` (panels/modals) · `--inset` (output wells) ·
    `--field-bg`/`--field-line` (form surfaces)
  - Ink: `--fg` / `--muted` / `--faint` — kept bright for readability
  - Accent: light blue, **used sparingly** — `--accent` (text/badges),
    `--accent-vivid` (dots, caret, loadbar), `--accent-soft`/`--accent-line` (fills/borders)
  - Interactive: **white** (`--action`) — buttons must stand out from the dark bg
  - Status: `--live` (green, scanning/live), `--err` (validation red)
- **Shape** — rectangular controls, minimal rounding: `--radius: 6px`;
  cards/modals 14px; badges 4px. Control height `--ctl-h: 36px` (buttons and
  inputs always match heights).

## Components (class → use)

- `.btn` + `.btn-primary` (white) / `.btn-secondary` (accent) / `.btn-sm` /
  `.btn-block`; states: `disabled`, `.loading` (in-button `.ld` spinner)
- `.field` (stacked label + input), `.hl-input` (inline/header input),
  `.pw-box` + `.eye` (password visibility — toggle all password fields in a
  form together), `.ferr` / `.form-err` + `.invalid` (validation)
- `.wbadge` — rectangular accent badge (@handles); `.dot` (+ `.blink`,
  `.green`); `.label-sm` (small caps); `.draft-divider` + `.chip` (pill-chip
  section divider)
- `.ffield-wrap`/`.flabel`/`.ffield`/`.badge-row` — read-only "form" display
  fields; `.top-row`/`.ffield-row` — the card's aligned 2-column grid
- `.desk-card` + `.card-chrome`/`.card-body`/`.card-soon` — the agent card
- `.news-item` (+ `.srcs` with accent `↗` source attributions and `.when`
  timestamp); `.xpost` + `.xpost-foot` — the draft post
- `.modal`/`.overlay` suite (incl. disabled `.sso-btn`s); `.loadbar` —
  top progress bar for page navigation

## Rules of thumb

1. Don't make users think — one headline, one sub, one primary action.
2. Accent blue is seasoning, not paint; white is for actions.
3. Every form follows the same language: label above field, errors below in
   red on blur, submit disabled until all fields are filled, loaders on press.
4. Animation only where it carries meaning (blinking dots = live, caret =
   drafting, spinner = loading) — slow, subtle, `prefers-reduced-motion` safe.
5. Keep pages to a single viewport where possible; header fixed, footer in flow.
