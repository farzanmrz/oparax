# Council review: the ONE UI renders. Done, or one more pass? (October 3, 2026, late)

Same three advisers. The Opus builder built the pages you specified (your lock answers: council-lock-oct3/{astra,grok,kimi}.md and council-lock-oct3-r2/{astra,grok,kimi}.md; the host's majority rulings and the builder brief: /private/tmp/claude-501/-Users-farzanm4-Desktop-repos-oparax/d3c16fde-a07f-4090-bd29-5b478494e449/scratchpad/one-build-brief.md). The owner's instruction for this round: "trigger /council again with the same models, and along with them, you should go through: 'Okay, is everything done, or is one more pass needed?'" He is away and wants pages to walk when he returns, so this ends in a verdict plus, if needed, a short fix list for ONE more builder pass. Not a redesign.

## The renders (open by path)

Folder: /Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/v2/one/, named <page>-<state>-<theme>-<width>.png. Both themes at 1440 and 2560: feed-closed, feed-open, feed-reader (Simon Willison selected), feed-direct, feed-banner-dismissed; onboarding-running, onboarding-done, onboarding-why; setup-blank, setup-error; login-login, login-signup; landing-full. Dark 1440 only: feed-strip-clustered, feed-strip-direct, feed-switch-page-banner, feed-switch-page-nobanner (the owner's alternative: Clustered / Direct at the top right of the grid instead of the sidebar), feed-banner-turnedon, feed-banner-dismissed-click, feed-filtered. Code: /Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one/*.tsx. The bar: /Users/farzanm4/.agents/skills/reference-led-design/examples/accepted/accepted-deck-dark.png and -light.png; the near miss to avoid: examples/near-misses/feed-same-shell-front-page-dark.png. Theme: /Users/farzanm4/Desktop/repos/oparax/DESIGN.md. The owner's notes: /Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/PAGE-NOTES.md.

## The builder's own report of deviations

1. Column count set by window width (3 at 1440, 4 at 2560), cards share the row width equally, rather than one fixed card width.
2. At 2560, when the reader opens over the right column, the grid gives up the reader's width and the cards narrow; at 1440 nothing moves.
3. Clustered cards with one source also open the reader; only Direct cards are inert.
4. Story cards on login and landing keep the image on top (the 64px thumbnail rule applied to the feed only).
5. Landing header has no Sign up or Log in; the hero's blue Sign up is the only one on the first screen.
6. The style switcher dock sits 72px from the left on One pages and still covers the panel's bottom when the sidebar is open (hidden for those screenshots only).
7. Things to judge: empty space below the six stories at 2560; the landing hero leaves the right of the screen empty at 2560; mid-run onboarding has an empty lower half while the grid fills.

## Review checklist (the lock round's, merged)

1. Beside the accepted Deck, dark and light: same depth, colour and life; not the same-shell near miss.
2. Logos, avatars and real images carry the colour; no new hues; DESIGN.md tokens.
3. Facts readable on arrival; nothing essential behind a click; no peek, no "N Articles" pill, no parenthetical citations.
4. Sidebar overlays and never moves the cards; closed it is the icon strip with the logos; counts are bare numbers; Name/Handle only under X; GitHub by interest; Notifications row with the X DMs switch; the banner reads "Oparax can DM you on X when something matters." with Turn on and Dismiss.
5. No tool row, no header, no title; Clustered / Direct in the strip and the panel (and the ?switch=page variant rendered for the owner's pick).
6. Cards: thumbnail or no image, text leads; 3 columns at 1440, 4 at 2560.
7. Reader: one right-edge sheet listing the story's sources, the selected source's own report, cluster still visible, Escape closes, focus returns.
8. Onboarding: one page, one status line, sources by kind with a switch and Why on demand, done state with the trial as text; no step list, bands or bars.
9. Login: Deck card lifted and clearly separated from the story cards; email first, X and Google below.
10. Margins halved, no width cap; light mode designed, not inverted; focus visible.

## Deliver

RESULT: FINDINGS, then: (a) VERDICT in one line: "Done" or "One more pass", (b) the checklist items that pass and the ones that fail, each failure with the screenshot name and what you see, (c) the fix list for the one pass, numbered, at most 10 lines, concrete enough for the builder (file, object, change), ordered by what the owner would notice first, (d) your view on the builder's 7 deviations (accept or fix) and on the two Clustered / Direct placements (which to recommend to the owner, one sentence). Under 700 words, no em dashes, plain prose. Read-only.
