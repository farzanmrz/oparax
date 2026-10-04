RESULT: FINDINGS

The 1440 feed belongs beside the accepted Deck. Cards are lifted off a quiet ground, logos and the small thumbs carry the color, and the facts are on the card. There is no header, no peek, no "N Articles" pill, and no parenthetical citation. It does not repeat the same-shell near miss (`feed-same-shell-front-page-dark.png`), which is a "Your Feed" title, a lead photo, and a status strip. Light mode is its own page: white cards, a pale ground, darker borders. Login, setup, the reader, and finished onboarding do the jobs they were locked to.

(a) VERDICT: One more pass

(b) Checklist

1. Pass. `feed-closed-dark-1440` and `feed-closed-light-1440` have the Deck depth and the logo color.
2. Pass. Color is the theme tokens plus real logos, avatars, and thumbs.
3. Pass. The bullets are readable on the card.
4. Pass. In `feed-open-dark-1440` and `feed-open-light-1440` the panel covers the first column and the three columns stay put. The closed strip shows the logos. Counts are bare numbers. Name/Handle sits only under X accounts. Notifications has the X DMs switch. The banner reads "Oparax can DM you on X when something matters." with Turn on and Dismiss. GitHub grouped by interest is in `rail.tsx`. In the open shot it is below the X and RSS list, inside the scrolling middle.
5. Pass. The feed has no tool row, header, or title. Clustered / Direct is in the strip (`feed-strip-clustered-dark-1440`, `feed-strip-direct-dark-1440`) and at the top of the panel. The page variant is rendered.
6. Pass. Text leads, a 64px thumb or no image, 3 columns at 1440 and 4 at 2560.
7. Fail. `feed-reader-dark-1440` is a right-edge sheet: Simon Willison selected, his own report, the cluster card still on the page. The code closes on Escape and returns focus. `feed-reader-dark-2560` makes room for that sheet by narrowing every card.
8. Pass. `onboarding-running-dark-1440` is one status line, a kind switch, and source cards. `onboarding-why-dark-1440` opens "Hands-on evaluation of new models and tools." on Simon Willison. `onboarding-done-dark-1440` says "7 days left in your free week" as text, with Open your feed. No step list, bands, or bars.
9. Pass. `login-login-dark-1440` and `login-signup-light-1440`: the auth card is lifted clear of the story fan, email first, X and Google below with their logos.
10. Fail. Margins are the half step, light mode is designed, and the controls use a visible focus ring. `landing-full-dark-2560` still caps the hero: the story card stops at 760px and the right of that band is empty, while the section under it runs full width.

(c) Fix list

1. `feed.tsx`: remove the reserve padding (`setReserve` and `paddingRight`). The sheet in `drawer.tsx` stays a fixed overlay. Opening a source must not narrow the grid. Match `feed-reader-dark-1440`, where the grid stays, and correct `feed-reader-dark-2560`.
2. `landing.tsx`: drop `max-w-[760px]` on the hero card so the story and the DM card fill the free column. `landing-full-dark-2560` is the picture.
3. Style switcher: while the sidebar panel is open the dock covers Sign out. Hide the dock in that state, or pad the account block clear of it. The open shots hid the dock. The walk will not.

(d) Deviations, and the switch

1. Accept. Equal columns, 3 then 4, use the width. A fixed card width would leave a dead margin on the right.
2. Fix. Same as fix 1. At 2560 the sheet should cover the right edge. It should not shrink the cards.
3. Accept. A clustered card opens the reader from its source name, including a card with one source. Direct cards stay inert.
4. Accept. The 64px thumb is the feed rule. Login and landing keep the picture on top, which is what keeps those pages alive.
5. Accept. `landing-full-dark-1440` puts the blue Sign up and Log in in the hero. A second pair in the nav would repeat them.
6. Fix. Same as fix 3.
7. Accept the empty lower half of `feed-closed-dark-2560` and of `onboarding-running-dark-1440`. Six stories, and a run that has not finished, are the content. Leave the card height alone. The landing gap is the cap in fix 2.

Recommend Clustered / Direct at the top right of the grid (`feed-switch-page-nobanner-dark-1440`): it is the labeled control, quiet, and visible while he reads, while the strip only shows the mode as two small icons.