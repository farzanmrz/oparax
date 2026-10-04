RESULT: FINDINGS

Show every algorithm step as objects the person can read on arrival, in each style's own composition. Jev returns only a probability, so the page shows Strong, Possible, and Set aside, plus the written why on each chosen source. It does not invent a chain of thought.

The order is `lib/onboarding/engine.ts`. The recorded run is `scratch/design-recovery/site/next/data/onboarding.ts` (@farzanmrz, the AI developer-tools beat). `buildLog` has no search line.

1. Look the person up. `lookupProfile`, report step 1. Show Farzan Mirza, @farzanmrz, the bio, and the 14 Jul 2026 pinned post. Line: "Found Farzan Mirza on X."

2. Read the newest posts. `readPosts`, report step 2. Ten of their own posts from the last 90 days. A thread counts as one. Replies to other people and reposts are left out. The sample stores three in full: the 27 Sep Next.js caching post, the 24 Sep quote of @rauchg, and the 20 Sep open-models thread, plus the pin. Line: "Read 10 newest posts. A thread counts as one." Say the other seven have no stored text. Do not invent them. Jev does not score these posts. They are evidence for the next step.

3. Jev scores sources. Candidates are the 150 shared-table rows plus quoted accounts that are not already in the table and are not the person: 153. Mentions are not candidates. Sponsored posts are not read. `ROW_Q` asks whether the source keeps publishing the beat. A quote alone does not qualify it. `lib/ai/jev.ts` returns only `answers[id].probability`. Bands, stated in `engine.ts`: strong at 0.75 or above (12 here), possible from 0.35 (23), under 0.35 set aside (118). Line: "Jev kept 12 as strong and 23 as possible, and set 118 aside." Show name, logo, kind, and band. Show the 12 recorded set-aside names, from Paul Graham through Fabrizio Romano.

4. Choose. The first recommendation call sees only rows at or above 0.35 and writes one why sentence each, plus the brief. This run picks 10 sites and feeds and 7 X accounts. Line: "Chose 10 sites and feeds and 7 X accounts." Put the fixture why under each name. Vercel: "Vercel's own feed carries the Next.js and platform news your posts follow most closely."

5. Search X only when fewer than 5 accounts fit (`searchAccounts`, Jev again, then a second choice). This run skips it because 17 accounts already passed. Line: "No X search. Enough accounts already fit." When a run does search, show the words, each author, the same three bands, and the revised picks. Hide query operators.

6. Brief, from the same answer. Show `brief.summary`, the five interests, and English. The fixture has no topic terms, so show none.

Do not show the prompt, `ROW_Q`, XML, model names, tokens, cost, internal ids, page tokens, the 60-item request batches, or scores such as 0.58. That number is how sure Jev is of a yes, not a percent of relevance. The TypeSafe guidance says Jev does not write explanations, and a mid value means uncertainty. Do not call the why sentence Jev's reasoning. Jev scored the source. The sentence is why it was picked. Do not use AI Elements Reasoning, Chain of Thought, or Tool. There is no thinking stream. Those step components collapse, which breaks reading without clicking, and Tool input would print JSON. Use React Bits `StatusMark` for waiting, running, and done, and `Shimmer` only on the running title. Green is done, amber is running, red is failed, blue is X and Chosen, teal is articles and feeds.

Window keeps the lifted full-screen window and three columns (`v2/window/building-dark-01.png`). The left rail lists all six steps. The center stacks the profile, post cards, band groups, and open chosen columns with whys, and they stay after the step ends. Today `ScorePanel` is removed once choosing starts. Stop that. The right rail keeps the brief open.

Newsroom keeps one full-width table (`v2/newsroom/building-dark-01.png`). Add a Jev column: Strong, Possible, or Set aside. Keep the why in the row. Posts stay in the right rail, with the brief under them. One line says the search was not needed. Keep the LIVE, DONE, and STOPPED row.

Deck keeps the tiles and the left step stack (`v2/deck/building-dark-01.png`). Replace "batches of 60, 60, 33" with "150 from the list, 3 quoted." Chosen sources are the front cards, with the why on the card. Sources that fit but were not chosen peek behind. The 12 set-aside names are a dimmer stack. The brief is open text. A small tile says no search.

One pass: extend the three `building.tsx` files and the shared fixture. Do not add an engine stage. Announce the current step with `aria-live`. Reduced motion jumps to the end. Label the page once as a replay. Check dark and light at 1440 and a narrow window, frozen on each step, at done, and on the timeline failure. Posts, bands, whys, the skipped search, and the brief must be readable with no click.

The case against this is the wish to read "what Jev did" as prose. Inventing that prose would be false, and it would show the machine the way the rejected flowchart feed did. The highest risks are fake reasoning, decimal scores, and hiding the score step once choosing starts. First, render the done page in all three styles with those objects visible, then the running states.