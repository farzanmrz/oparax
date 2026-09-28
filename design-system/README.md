# Oparax design system bundle

What Claude Design gets when the repo is synced. A Claude Code hook (`.claude/hooks/design-sync.sh`) fingerprints DESIGN.md, the theme tokens and this folder, and makes Claude re-sync whenever they change (owner, September 24); `.synced` holds the fingerprint of the last sync. The repo is the source of truth: `DESIGN.md` is the contract, `app/globals.css` holds the live tokens; `tokens.css` here is an export of them and `previews/` shows each piece in light and dark, side by side.

- `tokens.css`: fonts (Nunito Sans headings, Source Sans 3 text, JetBrains Mono for handles and counts), radius, the light and dark color slots (primary is the Oparax blue, tuned per mode for contrast).
- `previews/colors.html`, `type.html`, `buttons.html`, `inputs.html`, `dialog.html`, `frame.html`: one card each in the Design System pane, drawn at the sizes the stock Mira components render, sharing `previews/preview.css`.
