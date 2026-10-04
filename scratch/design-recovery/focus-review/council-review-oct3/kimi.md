RESULT: FINDINGS

(a) VERDICT: One more pass, a short one. Every locked element is built and right; two things the owner will see in his first minute of walking need fixing.

(b) Checklist

1. Beside the accepted Deck, dark and light: PASS. `feed-closed-dark-1440` and `feed-closed-light-1440` have the same lifted cards, quiet ground, top-lit edges and logo color as the Deck. No top bar, no title row, no source tabs, so it is not the same-shell near miss.
2. Color carried by logos, avatars, images, no new hues: PASS. The strip's logo clusters, the card source chips and the kind glyphs use the DESIGN.md tokens only.
3. Facts readable on arrival, no peek, no pill, no parenthetical citations: PASS. Every card shows its full fact list; citations live as source chips in the top row (`feed-closed-dark-1440`, `card.tsx`).
4. Sidebar: PASS. The panel lies over the cards and nothing moves (`feed-open-dark-1440` vs `feed-closed-dark-1440`); closed it is the 56px strip with logo clusters; counts are bare numbers; Name/Handle sits only under X accounts; GitHub is grouped by interest; the Notifications row has the X DMs switch; the banner reads exactly "Oparax can DM you on X when something matters." with Turn on and Dismiss (`feed-banner-turnedon-dark-1440`, `feed-banner-dismissed-click-dark-1440`).
5. No tool row, header or title; Clustered/Direct in strip and panel, `?switch=page` rendered: PASS (`feed-strip-clustered-dark-1440`, `feed-switch-page-banner-dark-1440`, `feed-switch-page-nobanner-dark-1440`).
6. Cards text-first, 64px thumbnail or none, 3 columns at 1440, 4 at 2560: PASS.
7. Reader: PASS. One right-edge sheet listing the story's sources, the selected source's own report, cluster visible behind (`feed-reader-dark-1440`, `feed-reader-dark-2560`); Escape closes and focus returns to the opening chip (`drawer.tsx`, `feed.tsx` `closeReader`).
8. Onboarding: PASS. One page, one status line, kind switch, sources as lifted cards with Why on demand (`onboarding-why-dark-1440`), done state with the trial as text and no bar (`onboarding-done-dark-1440`).
9. Login: PASS. The lifted card with the fan behind reads clearly separate from the story cards; email first, X and Google neutral below (`login-login-dark-1440`, `login-signup-dark-1440`).
10. Margins halved, no width cap, light designed, focus visible: PASS. Light mode has white panels, real borders and shadows that read (`feed-open-light-1440`, `landing-full-light-1440`); every control carries `focus-visible` styling in code.

No checklist item fails. Two walk-level problems sit outside the list:

- The style switcher dock (`site/v2/shared/style-switcher.tsx`, left 72, bottom 16 on One pages) overlaps the open sidebar panel's bottom block, hiding Notifications and Sign out. It was hidden for the screenshots, but he walks live pages and opens the sidebar first.
- `feed-closed-dark-2560` and `feed-closed-light-2560`: six stories in four columns fill a row and a half; the bottom third of the screen is empty ground. Beside the accepted Deck, which fills its screen, this reads short of life on his ultra-wide.

(c) Fix list for the one pass

1. `style-switcher.tsx`: on One pages dock bottom right (`right: 16`, `left: auto`), so nothing covers the open panel.
2. `site/v2/deck/data.ts`: add two more clustered stories so the 2560 grid fills its second row.
3. `feed.tsx`: while the reader reserves width at 2560, keep the banner and Checking line spanning only the grid width, not under the sheet (minor, only if the builder sees the overlap I saw in `feed-reader-dark-2560`).
4. Re-render the four affected shots (feed-closed both themes at 2560, feed-open both themes at 1440 with the dock visible) and confirm by eye.

(d) The builder's seven deviations

1. Width-set column count: accept; that is exactly the locked 3 at 1440, 4 at 2560.
2. Grid yields to the reader at 2560 only: accept; the card stays readable and at 1440 nothing moves.
3. Single-source clustered cards also open the reader: accept; the source chip is one consistent control.
4. Hero images on login and landing cards: accept; that is the Deck story card, and the 64px rule was a feed rule.
5. Landing header without Sign up or Log in: accept; the hero carries the blue Sign up and a Log in link.
6. Dock at 72px covering the panel bottom: fix; item 1 above.
7. Empty spaces at 2560: fix the feed bottom (item 2); accept the landing hero, the story card and DM card fill its right; accept mid-run onboarding, the grid filling in is the product working.

On the two Clustered/Direct placements: recommend the `?switch=page` version, because the labeled words at the top right of the grid read at a glance while the strip's two bare glyphs need decoding, and the owner himself said he was not sure the sidebar was the right place.