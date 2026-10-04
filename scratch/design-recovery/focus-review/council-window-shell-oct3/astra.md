RESULT: FINDINGS.

My position: make Window one viewport-filling application surface containing its own header and working panes. Remove the separate page-level header and oversized feed title band. Merely moving the existing header inside while retaining that band would preserve the problem.

Verified: the three styles already define separate `TopBar` components in their respective `chrome.tsx` files. They look alike because they repeat the same composition, not because one shared component forces it. Window’s [AppFrame](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/window/chrome.tsx:142) adds a minimum 124px heading band beneath the external header.

At 1440px, I propose an 8px illuminated perimeter, with one window spanning x=8–1432 and beginning at y=8. The stage becomes only this narrow rim, with existing light, shadow and radius tokens. No content or navigation sits outside it. Use minimum viewport height and ordinary document scrolling, not a fixed-height dashboard.

Inside, a 48px utility header holds logo, account and eligible FREE WEEK badge on the left; preview/replay disclosure and theme toggle on the right. Remove the redundant “/ Feed” breadcrumb. Immediately below, retain the 228px source rail, flexible reading column and 236px status rail. Remove the source rail’s duplicate account block. Its first controls become Name/Handle and All sources. In the center, replace “Stories” with the sole 28px “Your Feed” h1, followed by its existing explanatory sentence; place Clustered/Direct and Newest first in that same column’s toolbar, wrapping when necessary. Keep the checking row and readable stories below. Keep the right rail’s alerts, agent, trial, usage and publishing information.

Setup, building and ready use that same enclosing window and internal utility header. Their page names appear once as h1s inside the working surface. Preserve setup’s form/example split, building’s steps/work/brief columns, and ready’s chosen-sources/brief split. Keep progress and primary actions beside their headings. Remove the forced 124px minimum; let actual content determine height.

Each style should own its header composition. Newsroom gets an editorial masthead aligned with its table: logo and page title left, account, trial and theme utilities right, disclosure beneath. Deck gets an open header aligned with its cards at x=52, with title and feed controls integrated above the tiles. Neither needs the repeated slash-separated app bar.

For Newsroom, 26px is the strongest literal interpretation of “half the margins” because Deck’s measured content inset is 52px. I would propose 26px desktop gutters, measured to the outer content edge. However, that reduces today’s 28px: it cannot resolve “extremely low.” The intended larger value is unknown; do not silently substitute 56px or halve internal padding.

The strongest objection is that the [accepted Window](/Users/farzanm4/.agents/skills/reference-led-design/examples/accepted/accepted-window-dark.png) derives depth from a generous stage. An 8px rim could weaken it. His latest words justify changing composition, but the rendered result must preserve that depth and avoid the repeated chrome visible in `feed-same-shell-reader-dark.png`.

The builder’s scope should be the three `chrome.tsx` files and their four member pages. Preserve theme files, visitor pages, data, behavior, links and replay logic. Highest risks are lost theme initialization, stale height calculations, sticky-header overlap and narrow-screen overflow.

First, render Window feed with this shell. Then verify all member pages at 1440×900 in both themes and a narrow viewport, including filters, direct view, empty/error states, keyboard focus and navigation. Require build/typecheck evidence afterward. I ran no product, builds or tests.