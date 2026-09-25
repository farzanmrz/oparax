# Oparax design system bundle

What Claude Design gets when the repo is synced (`/design-sync`, run by the owner after `/design-login`). The repo is the source of truth: `DESIGN.md` is the contract, `app/globals.css` holds the live tokens; `tokens.css` here is an export of them and `previews/` shows each piece in light and dark, side by side. Re-export and re-sync after any change to the contract.

- `tokens.css`: fonts (Nunito Sans headings, Source Sans 3 text, JetBrains Mono for handles and counts), radius, the light and dark color slots (primary is the Oparax blue, tuned per mode for contrast).
- `previews/colors.html`, `type.html`, `buttons.html`, `inputs.html`, `header.html`: one card each in the Design System pane.
