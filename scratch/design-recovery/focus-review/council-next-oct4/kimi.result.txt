RESULT: FINDINGS

**1. Feed chrome**
1. Bring the sidebar back as a floating panel over the page, never pushing it: his Oct 4 words, "the sidebar thingy can float atop the page," and Oct 3, "when it comes from the left, it doesn't adjust the page."
2. It opens from the existing bubble (his pass 9 choice) and closes fully: "When it's closed, it's closed... no reduced sidebar."
3. Contents are Deck's source list exactly: logos and counts, 3 per group then Show more, numbers aligned; "The count and the logos of the companies are all that are needed. The name/handle switch can be removed."
4. Add a header: "Feed" title left, Clustered/Direct switch right. He asked "I think the page is looking blank because it doesn't have a header. What do you think?" Yes.
5. The two tiles he misses ("The free week counter... and this week's card, I like those... that's what's devoid of life") return as two compact tiles at the header's right end, not a row of three cards up top ("Get rid of the three cards up top" stands; the Checking tile stays gone).
6. No pill filters. He said "I don't know," and on Oct 4: "search, filtration, newest first, all of this bullshit. Why does it matter? I don't even have the first user." Clicking a source in the sidebar already filters.
7. The DM banner becomes a plain text line under the header, not a lifted card: "Oparax can DM you on X when something matters," a button, and a dismiss cross.
8. Expect Astra to want the tiles as a full row under the header; Grok to want the sidebar as its own button, not inside the bubble.

**2. Onboarding**
1. Left column: the 8-step timeline as it is now (`one/onboarding.tsx` Steps rail).
2. Right column, his own stuff top to bottom: profile card ("finding X profile is fine for farzanmrz... the username comes on the right side"), then posts streaming in under "Reading your newest posts," one post below the next as the step runs. Drop the pinned post: "You don't need to show the pinned post."
3. From the Choose sources step on, "your brief comes right at the top of the right sidebar," above the profile, streaming word by word as now.
4. Center: Gather candidates and Check relevance get motion: the candidate count ticking up and chips arriving during Gather; Deck's "Checked N of M" line with the amber bar during relevance, then chips landing into place.
5. Center then shows Deck's building bands: "strong match, possible match, and set-aside... We can take the center of the page for that," then the chosen sources by kind.
6. Top right: "X account" and "Build my agent" controls; the heading runs "Choosing sources," then "Saving your agent," then "Your agent is ready."
7. Setup keeps only the handle and the one sentence plus the build button ("the setup page simply needs to be a precursor"); the sample-run panels leave setup because onboarding now shows the real thing.
8. Expect Grok to keep the pinned post; Astra to want the brief to replace rather than sit above the profile.

**3. Login**
1. Use React Bits Pro `auth-3` as the form's frame, harmonized to DESIGN.md tokens (host tokens win per the skill). He named it on Oct 3: "auth5, auth4, auth3, and even auth1 as pretty neat designs."
2. Fix his real complaint, "your way of separating the login from the cards is not nice," with Deck's own sign-up device: the form is the front card and the three story cards fan behind it as offset plates, one object, no scrim panel between them (the current `one/login.tsx` scrim at 60 percent is the separation he dislikes).
3. Keep the form order he locked: email and password first, blue Log in, sign up swapping in place, neutral X and Google buttons below.
4. Deck's login stays the fallback if auth-3 fights the fixed theme after harmonization.
5. Expect Astra to prefer Deck's login as is ("I like the login for the Deck more... I don't know why" argues for the smallest change); Grok to prefer auth-5.

**4. Sources page**
1. Rows, not cards: one lifted list panel per kind (X accounts, RSS feeds, Websites), since "The card UI itself, I don't like."
2. No numbers anywhere: "There should be no numbers next to the sources because this is the sources page."
3. Row anatomy: logo, then name and handle on one row for accounts, site and name on one row for websites.
4. Every row expands in place to its reason. The Vercel-only description is sample data missing "focus" text (`sources.tsx` line 75); in the product every chosen source has its reason, so the lab data should carry one per source.
5. Add and remove: an "Add source" button in the page header with the limit shown as "14 of 20 sources," and a quiet remove control on each row ("add and remove sources as per their limit count").
6. Build a thin Settings page now: account, the free week and subscription, sign out. He asked for it ("there also needs to be a settings page... that's where subscription and all will also come, right?") and the header tiles need somewhere to lead.
7. Expect Grok to defer Settings until after the first user, citing his own "I don't even have the first user."

**5. Notifications**
1. The X DM row loses the toggle and gets a button: "There'll be a button because the plan is that this takes them to their X website, where they have to DM the bot."
2. The button opens X's DM compose to the bot in a new tab; the row's line explains the agent DMs back once he has written to the bot first.
3. Keep the page one list panel, rows added as channels come ("the notifications themselves can be by X, by a bunch of other stuff we can add").
4. The feed banner's "Turn on notifications" link now lands on this row.
5. No other changes; he said "Notifications are fine."

**6. Live feed**
1. This week: run the product app locally on another port with his real account and a real build for him and for Reshad. Only real arrivals answer "unable to see a live feed updating in action" and "I've been looking at the same six examples"; a longer replay is still the same six stories.
2. Cost in his time: one X sign-in on localhost, naming Reshad's handle, then one walk. Roughly 15 minutes.
3. The lab replay stays for design passes, labelled once as a replay.
4. Expect Astra and Grok to pick the cheaper longer replay; the answer to that is his own sentence, "trigger a live feed for me and for Reshad, so at least I can see the actual examples."

**7. Order**
1. One Opus builder, one pass: feed chrome first (floating sidebar, header, two tiles, banner line), since every other page hangs off that decision.
2. Then onboarding (the three-column spec above), then login (auth-3 plus the fan).
3. Then sources, notifications, the slimmed setup, and the thin Settings page together; they are small.
4. Then he walks localhost, dark and light.
5. Question one after the walk: should the bubble open the floating source sidebar directly, or should the sidebar have its own button at the header's left?
6. Question two: confirm pill filters stay out until the first real user, per "if it's not [straightforward], then why?"

One caveat for the record: per the reference-led-design skill a visual lane should open the renders; they are absent from the repo, so these positions lean on his verbatim words and the code, and the builder must render and judge against the accepted feeds before he walks anything.