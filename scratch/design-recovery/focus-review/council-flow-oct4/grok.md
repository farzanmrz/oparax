RESULT: FINDINGS

`feed-p5-open.png` glues four different things into one list. Deck's `SourceList` in `site/v2/deck/feed.tsx` has no brand row: "Sources" is the first line, every source is a 32px row, and there is no Show more (`deck-feed-now.png`). The One column adds a 36px Oparax row with about 8px under it (`pb-1` plus `pt-1`), 10px under Sources (`pb-2.5`), and 16px before X accounts (`mt-1` plus `mt-3`), then a grey "Show more" that is not a row. That is the missing distinction, and it pulls the footer into the list. `onboarding-p5-done.png` is the dead page. The life he already liked is the profile, the pinned post, the three post cards, the logos, and the brief (`onboarding-done-p3.png`, `window-building-now.png`, `deck/building-v3-dark-done.png`). Counters, bands, the progress bar, set-aside rows, why sentences, and the dashed "7 more" card are the fluff. Chosen cards stay one surface. A dimmer card is the different-colored card he already rejected. Color stays in the logos, the avatar, and the kind glyph.

(a) Sidebar, `site/v2/one/rail.tsx`. The column stays 240px, `p-2.5`, lifted, sticky, `calc(100svh - 28px)`.

1. Brand row 36px: mark 20px, "Oparax" 15px, theme and Collapse 32px. No bottom padding.
2. Then 24px empty. No rule. Deck has no brand in this list, so this gap is the split.
3. "Sources" is 20px, 13px semibold. Then 16px. Then All sources at 36px, 8px padding, 18px icon, 13px label.
4. Then 20px. Each group label is 16px, mono 10.5px, tracking 0.12em, 12px glyph, count in a 24px column. Then 8px.
5. Each source row is 32px, gap 10px, logo 18px, name 13px, count 11px in that same 24px column. The next group starts 20px later.
6. No Show more. List every source, as Deck does. The middle scrolls. The bottom block does not.
7. Bottom: a top rule, 8px, then three identical 36px rows, 18px icon, 13px label: Notifications, @farzanmrz, Sign out. No chevron, no X DMs line, no "7 days left". Sign out is the link. Escape still collapses and focuses the 36px Expand. Rows keep the focus ring.

(b) Onboarding, one page, sidebar collapsed. Columns 264px, the work, 340px, gap 20px. The top row is only Expand until the end. The timeline shows the title always. The one line under it appears only when that step is done or skipped. The running row is the caution wash and a shimmering title. Objects stay once they appear. The right card is empty until the brief.

1. Find your X profile. "Found Farzan Mirza on X." Middle: the two Window profile cards, initial, name, @farzanmrz, bio, and the pinned post, Jul 14.
2. Read your newest posts. "Read 10 newest posts. A thread counts as one. Replies and reposts are left out." Middle adds Post Sep 27, Quote Sep 24 with the @rauchg quote, and Thread, 2 parts, Sep 20. No fourth card.
3. Gather candidates. "150 from the source list, 3 accounts you quoted." Middle stays as it is. No 150 tile.
4. Jev checks relevance. "Jev kept 12 as strong and 23 as possible, and set 118 aside." Middle adds X accounts 7, RSS feeds 9, Websites 1, from `chosenAccounts` and `chosenSites`. Same 64px card, 24px logo, name, handle or domain, kind glyph.
5. Choose sources. "Chose 10 sites and feeds and 7 X accounts." The cards stay, and they are not buttons. No why.
6. Search X for more accounts. "No X search. Enough accounts already fit." Skipped mark. Nothing else appears.
7. Write your brief. "Wrote your brief." Right fills: About Farzan, the summary, the five interest chips, Language English.
8. Save your agent. "Saved your agent." The top becomes "Your agent is ready" and Open your feed. Profile, posts, sections, and brief stay.

(c) Feed. `feed-p5-closed.png` is done beside `deck-feed-now.png`: image on top, names at the top, facts with the citations removed, no peek, Clustered / Direct on the left, the one-line banner on the right. The dock on the Mistral card is the review switcher. `StyleSwitcher` already returns null on `/v2/one`. Leave that return in place.

(d) Builder

1. `rail.tsx` brand row: remove `pb-1`. Insert a 24px spacer before `SourceList`.
2. `rail.tsx` `SourceList`: "Sources" is 20px, with `pt-1` and `pb-2.5` removed. Then 16px, then All sources at 36px.
3. `rail.tsx` groups: remove the wrapper `mt-1`. Each `GroupBlock` is `mt-5`. The label is 16px with 8px under it. Each `Row` is 32px with `py-0`.
4. `rail.tsx` `GroupBlock`: keep every member. Add no Show more control.
5. `rail.tsx` bottom: delete the channel state, the chevron, the X DMs row, and the days-left text. Three 36px rows.
6. `onboarding.tsx` top: remove `Checking`. Expand only, until the 20px ready title and `PrimaryLink`. No days left.
7. `onboarding.tsx` timeline: the second line is `stepLine` for done and skipped only. A failed posts step says "Read your newest posts stopped." in the error color, with no extra panel.
8. `onboarding.tsx` middle: copy `ProfileCard` and the three `PostsGrid` cards from `v2/window/building.tsx` into this file. Omit the dashed cell and the "other 7" sentence. Profile from the profile step, posts from the posts step.
9. `onboarding.tsx` sources: render them when Jev starts, from `chosenAccounts` and `chosenSites`, grouped X, RSS, website. The card is static. No click, no why.
10. `onboarding.tsx` `BriefPane`: delete "Written after the sources are chosen." An empty lifted card until the brief step, then the summary, then the chips and language. It stays through Save.
11. `style-switcher.tsx`: keep the One early return. Leave `feed.tsx` and `card.tsx` as they are.