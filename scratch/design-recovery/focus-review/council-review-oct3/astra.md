RESULT: FINDINGS

VERDICT: One more pass

The core composition holds. Beside `accepted-deck-dark.png` and `accepted-deck-light.png`, the feed retains lifted surfaces, clear text tiers and real source colour. It avoids `feed-same-shell-front-page-dark.png`: no dominant lead story, title bar or surrounding tool pile.

Checklist passes:

- **2:** Logos, avatars and images carry colour; the pages reuse the fixed theme.
- **3:** Feed facts are visible on arrival. No peek, article-count pill or parenthetical citations.
- **4:** Sidebar overlays without moving cards. Source logos, bare counts, X-only Name/Handle, GitHub interest grouping and Notifications are present. Banner wording matches.
- **5:** No feed header, title or tool row. Both switch placements are rendered.
- **6:** Text leads; thumbnails stay subordinate; three columns at 1440 and four at 2560.
- **8:** Onboarding has one running status, source-kind switching, Why on demand and trial text at completion.
- **9:** Login is visibly lifted and separated from the story fan in both themes. Email comes first, providers below.
- **7, visual portion:** Reader shows Simon Willison’s own report beside the visible cluster. Code matches the report by the cluster’s item identity.
- **10, layout portion:** Small gutters, uncapped page canvas and distinct light surfaces pass.

Failures:

- **1:** [landing-full-dark-2560.png](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/v2/one/landing-full-dark-2560.png), also light: the hero’s objects occupy only the left portion while a large empty area remains right. The story’s `max-w-[760px]` causes the composition to stop expanding.
- **10:** [onboarding-done-light-1440.png](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/v2/one/onboarding-done-light-1440.png): the preview dock covers source cards and Why controls. Sidebar captures hide the dock, so they conceal the reported account-panel collision.
- **7/10, code-confirmed:** In the states pictured by `feed-open-dark-1440.png` and `feed-reader-dark-1440.png`, covered controls remain keyboard reachable. Expand does not move focus into the sidebar. Switching feed mode can remove the reader’s opener, leaving no focus-return fallback. Reader options and strip radios also lack their expected arrow-key handling. Screenshots alone cannot verify these interactions.

One-pass fixes, ordered by visible impact:

1. `one/landing.tsx`, hero: remove the story’s outer width cap; distribute the existing copy, story and DM across the available width, retaining readable text measures.
2. `shared/style-switcher.tsx`, dock: reserve clearance for it and offset it beyond the open sidebar; capture its actual visible state.
3. `one/rail.tsx`, sidebar: move focus inside on every opening path, prevent focus reaching covered controls, and restore the invoking control on close.
4. `one/feed.tsx` and `one/drawer.tsx`, reader: close on mode/filter changes, provide a surviving focus fallback, and prevent focus disappearing beneath the sheet.
5. `one/drawer.tsx` and `one/rail.tsx`, source/view controls: use ordinary buttons with pressed states, or implement the complete listbox/radio keyboard behavior.

Builder deviations:

1. **Accept:** Fluid equal-width columns satisfy the viewport counts and available-width intent.
2. **Accept:** Conditional narrowing preserves the originating cluster for comparison; sidebar opening remains stationary.
3. **Accept:** Single-source clustered cards give consistent access to the report and original link.
4. **Accept:** Larger images suit the login fan and landing demonstration.
5. **Accept:** Hero Sign up and Log in are visible without duplicating header actions.
6. **Fix:** The dock must not obstruct the walkthrough.
7. **Mixed:** Accept space after six available stories and during source discovery; fix the landing hero’s unused right side.

Recommend the labelled top-right Clustered / Direct placement because its meaning is immediately visible; align it with Checking after banner dismissal to avoid the extra empty row.

Review used supplied renders and source only; no runtime verification.