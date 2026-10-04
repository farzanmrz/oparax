RESULT: FINDINGS

The sidebar in `feed-open.png` now has four levels, and the list is the same object as in `deck-feed.png`. The Oparax row stands alone, then a quiet gap, then "Sources", then the filled All sources row, then the small mono group label with its count. Under that, each row is Deck's row: logo, name, one aligned number. Show more is gone, and so is the name/handle switch. Notifications, @farzanmrz and Sign out sit in their own block at the bottom.

The closed feed is done. Expand is the only control at the top left, Clustered / Direct is on the left, and the one-line DM invitation is on the right. Three columns of the picture cards fill the width. Facts are readable on arrival, on one card surface. This is the card change he already called better.

Onboarding reads as one composition beside `window-building.png` from step 2 on: the step list, the work, the brief. Profile, pin, posts, logos and the brief are back, and it is its own page rather than `deck-building.png`. The weak shots are the ones he would hit first. Step 1 is a dead page: Window's loading placeholder is two faint bars on black, plus an empty brief. Step 2 shows only two of the three posts. Step 4 already prints "35 kept as strong or possible, 118 set aside" while Jev is still the running row, and the timeline later says that result in different words. Step 6 leaves the header empty because `runningLine.search` is an empty string. The skip sentence is only in the list. On `onboarding-done.png` the Websites section falls below 900px. The source cards are still a tall row each, the size he said to reduce so every section fits on the page.

He would notice step 1 first and dislike it, then the done page cutting off Websites. The two feed shots can go in front of him.

VERDICT: One more pass

1. `v2/one/onboarding.tsx` `ProfileRunning`: remove the skeleton. Show `ProfileCard` (name, @handle, bio, pinned post) while Find your X profile runs.
2. `v2/one/onboarding.tsx` `SourceCard`: shorten the 64px row to one tight line so X accounts, RSS feeds and Websites all sit in the 900px done shot.
3. `v2/one/onboarding.tsx` `CandidatesLine`: keep the 153 line while Jev runs. Show the kept and set-aside line only when that step is done, in the timeline's words.
4. `v2/one/onboarding.tsx` `runningLine.search`: set it to "No X search. Enough accounts already fit."
5. `v2/one/onboarding.tsx` `PostsRow`: show Post, Quote and Thread together once the posts step is on screen.
6. `v2/one/onboarding.tsx` `CandidatesLine`: drop the line once the source sections are on the page.

Show him `feed-closed.png`, `feed-open.png`, `onboarding-step-7.png`, `onboarding-done.png` first.