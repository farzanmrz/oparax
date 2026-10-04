RESULT: FINDINGS

The One keeps getting worse because its sidebar stopped being part of the page. Deck, Window, and Newsroom look fine because each rail is structure: a lifted card in the grid, a rail inside the window, a column of the page. One's rail is a scrim laid over the stories.

(a) What I saw
1. In `feed-open-p3.png`, beside `deck-feed-now.png` and `window-feed-now.png`, One's sidebar is a translucent sheet with rounded right corners, and the first story column is sliced underneath it. Deck's aside is an opaque lifted card in the page, with the stories starting to its right. Window's rail sits inside the window, with the stories starting after it.
2. In `feed-closed-p3.png` the grid does take the width, Clustered/Direct on the left and the banner on the right, but a bare 56px gutter remains with only the Oparax mark.
3. On the open sheet, "All sources" is a full-width brand box. The bottom carries "Preview data from public sources, not from your agent." Notifications, the handle, and Sign out sit in a different rhythm from the source rows, and Notifications still opens an "X DMs" line.
4. In `onboarding-running-p3.png` and `onboarding-done-p3.png`, a Deck step card sits on the left, then the profile, the post cards, and, once finished, a full-width brief stack above the accounts. In `window-building-now.png` the brief is a side block and the work is in the center.
5. In `login-p3.png` the front fan card is as wide as the login box and sits at the same height, so the two read as a pair.
6. In `setup-p3.png` the form and the sample run are two lifted columns with real sources and images. Nothing on it is wrong.
7. The feed cards still read correctly: text first, a small thumbnail, no peek, no article-count pill, no parenthetical citations.
8. The closed feed's top row is the one part that already matches the instruction. The open sheet is what covers it.

(b) Yes. The overlay is what reads wrong. In `feed-open-p3.png` the sheet and the stories share the same pixels. In `deck-feed-now.png` and `window-feed-now.png` the rail takes its own column and the stories start after it. Make the sidebar Deck's lifted aside: a 240px column in the page grid. Collapse, at the top of that column, removes it and the grid takes the width. No reduced strip. When it is hidden, Expand is one control at the top left of the content.

(c) Builder changes
1. `Shell` and `Rail` in `site/v2/one/rail.tsx`: remove the fixed 56px nav, the `paddingLeft: STRIP` gutter, the full-page scrim, and the dialog panel. Open, it is a 240px grid column with `lift` and `liftStyle` from `v2/deck/chrome.tsx`, an opaque window surface, and the stories in the next column. Closed, that column is gone and the content has no left pad.
2. `Rail` header: put Collapse (`PanelLeftClose`) on the top row with the mark and `ThemeToggle`. Delete the bottom Contract button and the `PREVIEW_NOTE` line. Closed, one Expand (`PanelLeftOpen`) sits at the top left of `OneFeed`'s top row. Escape still closes and returns focus there.
3. `Rail` bottom: Notifications becomes a `GroupLabel` section, with no X DMs toggle. The account and Sign out use `Row`: an 18px mark, a 13px label, and "7 days left" in `countCol`, the same height as the source rows.
4. `OneFeed` in `site/v2/one/feed.tsx`: keep `ViewSwitch` at the left of the content column and `Banner` at the right, with the checking line under the switch. Leave `OneCard` and the `Row` selection on All sources as they are.
5. `OneOnboarding` in `site/v2/one/onboarding.tsx`: change the grid to `lg:grid-cols-[264px_minmax(0,1fr)_340px]`, the split in `v2/window/building.tsx`. The left column stays the current step `ol`. The middle column is only "Click on any source to see the reason.", the kind sections, and `SourceCard`. The right column is `BriefCard` in the `BriefPane` slot (an aside labeled "Your brief"), from the brief step onward.
6. `Profile` and `Posts`: take the large sections out of the middle. Under the status line, one compact row: avatar, name, @handle, and "10 posts read" after those steps start. The brief stays About, interests, and language. On ready, the three columns stay put and the status line becomes "Your agent is ready", the days left, and Open your feed.
7. `OneLogin` in `site/v2/one/login.tsx`: draw the fan at 60 percent (front card 264px, the two behind 240px), shift it up and to the right, and darken the page scrim so the 420px form is the only full-size surface. Keep the three cards and email first.
8. `OneSetup` in `site/v2/one/setup.tsx`: leave it.

(d) Leave the cards, the theme, the absent header and tool row, Clustered/Direct on the left with the banner on the right, desktop only, and the email-first login card.