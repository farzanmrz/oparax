RESULT: FINDINGS

In `feed-dark-01.png` the first row is Hugging Face, the full headline "Olmo-core 3 scales open MoE training past a trillion parameters", four facts, and a teal card with a pink diamond and "Olmo-core 3". In `accepted-newsroom-dark.png` only the GPT-6.1 row is open, its quote sits in a green evidence box, and the other headlines end in ellipses.

These screens are the Newsroom family. None is finished. The feed, landing, and ready still fail the reading job.

Feed. One change: in the story column, cap the media block at about four fact lines and never print the headline again inside it. On `feed-dark-01.png` the Vercel Agent card repeats "Vercel Agent now installs private packages…", so two stories fill the window and the third is cut off. Facts are already visible, headlines are full, the words are Article, Post, and GitHub release, and Direct splits the joined OpenAI story (`feed-dark-direct-02.png`). It stays clear of `feed-convergence-lines-dark.png` and `feed-same-shell-front-page-dark.png`. It is the accepted table, too tall to scan. Drop the seven day numerals under PUBLISHED THIS WEEK. The big 6 already says the week (`feed.tsx`).

Landing. One change: in "Every source weighed the same", give every chosen source its own row with the handle on one line, and split the plans header "WEBSITES AND RSS FEEDS" into two columns. `landing-dark-02.png` breaks "feed.xml" across lines and ends "And 4 more X accounts and 4 more RSS feeds". `landing-dark-03.png` has the empty gap of `landing-empty-sections-dark.png`, then one plan table in the vein of `landing-empty-plans-dark.png`. The hero belongs: a replay window, five cited facts, separate kind chips, and light mode holds (`landing-light-01.png`). Move the direct-message card off the NEXT.js image.

Sign up. One change: in the third row's release block, keep `vercel/next.js` on one line, with `v15.0.0` and the two stored lines under it. The form, the confirmation ("If this email can be registered…"), and the three readable stories belong (`signup-dark-sent-01.png`).

Setup. One change: on step 3, add GitHub and Product Hunt as their own chips beside X, RSS, and Web. The sentence is in the field, the account and three posts are readable, and Build my agent is the action (`setup-dark-01.png`). The step currently teaches that only three kinds are checked.

Building. One change: delete the 0.xx numerals and leave the bar plus Fits or Chosen. StatusMark, Shimmer, the steps, and the posts are the right objects. I see no amber KEEP LINE. Chosen and not chosen stay in score order (`building-dark-02.png`). The left step still names only X accounts, RSS feeds, and websites.

Ready. One change: add a GITHUB group under WEBSITES, with vercel/next.js and its reason, and remove the decimals. `ready.tsx` drops every GitHub source (`group !== "github"`), so the page says 17 while the feed's agent tile says 18. The reason is what the person needs. The 0.93 beside a full green bar says the score twice. Light mode is a real pale page (`ready-light-01.png`).

Where I disagree with the builder: an empty Product Hunt group on the feed rail would be a zero chip, so leaving it off is right. GitHub is in this run. The feed lists it, and the three facts are the stored release lines (`data.ts`). Ready deletes it. Tall rows are why the beat cannot be scanned. Setup and ready can live without article imagery. The direct-message card does not merely touch a corner. It covers the lead picture. The KEEP LINE is not in the renders I opened.

The strongest case against me: full facts force tall rows, and a shorter media block could make imageless items look thin. I would still shorten the slot before hiding a fact.

The highest risk is that Ready and the feed disagree on whether GitHub was chosen. A person who trusts Ready will not find that source in the list they just approved.

First, put the GitHub row back on Ready, then shorten the feed media so a third headline clears the fold.

Verified from the renders and from `feed.tsx`, `ready.tsx`, `data.ts`, and `landing.tsx`. I did not click the pages. StatusMark, Shimmer, and the Name/Handle ToggleGroup are real catalog uses. I did not open every rejected theme file.