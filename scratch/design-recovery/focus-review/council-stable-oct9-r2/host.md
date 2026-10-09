# Host (Claude Fable 5.1), written before reading the three lanes

## Checklist
Everywhere
1. "Twitter" is the name wherever a person reads; the X logo is the mark. ["Use the logo for X, but use the name Twitter everywhere inside the design flow", Oct 8]
2. No name handle anywhere. ["the name handle, which we're not using anymore, so remove it across all designs", Oct 8]
3. No search box and no cluster chip. ["Cluster, search stories, all of that: remove it because that's confusing me", Oct 8]
4. No "Checking one item against your sentence" line on any feed. ["Remove it from: Newsroom, Deck, Window, One", Oct 8]
5. No development-preview bar on any page. ["Why tf is there a constant bar uptop", Oct 8]
6. The standard switcher, same options in the same places, on every lab page. ["please bring standardization because this is fucking confusing to me", Oct 8]
7. Nothing on a page exists only because our examples have it. ["That's just for these specific examples we've tested. We're claiming to monitor the entire web.", Oct 8]
8. No object he did not ask for. ["why tf is there extra UI components?", Oct 9; "the trick isn't adding stuff, it's taking away", Oct 2]
9. One look for the same thing on every page. ["one consistent alignment across the different pages of one view", Oct 3]

Sidebar
10. Stuck to the viewport's left with no margin. ["Why the fuck is the page appearing with the sidebar with a margin? The sidebar is stuck to the left", Oct 8]
11. Feed, Settings and Notifications are rows in the sidebar, never a switch in a header. ["three individual parts I want to be navigable in the sidebar", Oct 8; "You've introduced the switching between feed settings and notifications, whereas they were supposed to be options in the sidebar", Oct 8]
12. No "All Sources". ["Why is it saying All Sources?", Oct 8]
13. The source groups come directly after the nav rows with no visible separation between groups. ["there's a weird sort of fucking separation", "come up at the top, along with Feed, Settings, and Notifications", Oct 9]
14. A group heading is told from its rows at a glance. ["very hard to distinguish from the actual elements inside them", Oct 8]
15. Rows are indented where the heading's text starts. ["indent the items exactly where the heading is", Oct 8]
16. A row shows the name only: no handle, no URL. ["no need to put the handles in or the actual website URL in the sidebar", Oct 8]
17. The bottom holds the username, the free week, Sign out, the theme toggle and Hide. ["Sign Out at the bottom, Theme toggle, FREE WEEK showing there, Perhaps a username", Oct 8; "Why isnt the Username showing in the bottom", Oct 9; "the sign out, the theme toggle, the sidebar thingy, and the free week", Oct 9]
18. Sign out, the theme toggle and Hide differ in look and are not side by side. ["They're so close together and look so similar that a user can even accidentally press one", Oct 9]
19. The free week meter reads full at 7 of 7 in the blue of the accepted feeds. ["not going fully, and you changed the color for some reason", Oct 9; "The free week counter in the deck design, the card, and this week's card, I like those", Oct 4]
20. One kind icon per kind, identical on the sidebar and on Settings. ["a different X logo for the RSS feed in the settings panel and a different one for the sidebar", Oct 9]
21. When the sidebar is hidden, the control that brings it back covers no content. ["randomly floating with a random floating toggle over the page cards", Oct 9]
22. Nothing in the sidebar beyond rules 11 to 21. ["way too busy", Oct 8]

Onboarding
23. Before Build the centre is one card: the handle, the sentence, Build. No source catalogue. ["That's where you can make a card. Inside that card, you can say your handle and description of your beat. 'Build my agent.'", Oct 8]
24. Build happens in place: that card becomes the run. ["You click that in place, and it changes", Oct 8]
25. Before an agent exists the sidebar is the Oparax head, the seven steps alone, and the bottom of rule 17. ["the seven steps alone, but the oparax header remains, and at the bottom, the sign out, the theme toggle, the sidebar thingy, and the free week", Oct 9]
26. Settings and Notifications exist only once the agent is saved. ["I don't understand how Settings and Notifications can show before the guy has gone through the onboarding", Oct 9]
27. The seven steps are visible while the run goes, named as the product names them. ["I do want to see Finding your profile and Reading your newest posts showing", Oct 5]
28. The same sidebar on onboarding as on the feed. ["you have managed to use the same sidebar for the actual onboarding", Oct 9]
29. The onboarding page's switcher offers the steps. ["Why the hell do I not have toggles on the onboarding page", Oct 8]
30. Bands and pills at checkpoints, never a probability. [loves and hates list, owner-history.md]

Feed
31. No New label and no chip that takes its own line. ["What the fuck is this, and who introduced this? Remove it.", Oct 9]
32. A card is as tall as its content. ["Shouldn't it be as much as the text allows?", Oct 9]
33. Clustered and Direct as a toggle at the right of the title line. ["you can simply make it a toggle on the right of our header", Oct 9]
34. No explanation line under the Feed title. ["'clustered and direct preview data from public sources.' That line is not needed", Oct 4]
35. Cards carry the picture, the logo, the facts. ["the feed is extremely lifeless", Oct 8; "if it weren't for you adding the Vercel, Hugging Face, and all those logos on the left, it would have never looked so lively", Oct 4]

Settings
36. One lifted surface per thing, the same icons as the sidebar (rule 20). ["Why the fuck is sources one consistent card? This looks so fucking weird", Oct 4]

Notifications
37. Only the Twitter DM state and the Message @oparax_ai button; a button, not a toggle. ["there won't be a toggle. There'll be a button", Oct 4; "It was supposed to be simple twitter DMs to activate", Oct 9; "Drop alert R and digest for now. Just drop it.", Oct 9]

Login
38. "Login" one word on the main button. [Oct 8]
39. "Login with Twitter" and "Login with Google" on login; "Continue with Twitter" and "Continue with Google" on sign-up. [Oct 8]
40. The logo and the label centred together as one group (layout C). [Oct 8]
41. The four-colour Google G. [Oct 8]
42. No "Email me a sign-in link" line. [Oct 8]
43. Login is not in the switcher. ["remove it from one of the things I have to review", Oct 8]

## Changes
(a) Hidden rail: the same panel icon as Hide, no word, fixed 16px from the viewport's left and bottom; the content column keeps a 56px left inset so it never sits on a card.
(b) Notifications: the DM state in one line and the Message @oparax_ai button; the Alerts and Digests columns are deleted, not moved.
(c) Foot, top to bottom, one 32px row each: the username (name, then @handle in t3); the free week label and meter; the theme as a labelled switch ("Dark" with a real switch control); last row "Sign out" as text at the left and the Hide panel icon at the far right. Three looks (text, switch, icon), Sign out and theme on different rows.
(d) Meter: Deck's Segments, seven flex-1 segments, --brand filled, full across the foot at 7 of 7; the amber 18x3 ticks go.
(e) Groups: 12px under Notifications, no hairlines, no top padding per group; heading row in t1 with the kind icon in its hue, the count and the chevron; rows in t2, name only, text aligned to the heading's text.
(f) GroupGlyph in the rail hue on Settings too; the text-t3 wrap goes.
(g) Before Build: title "Set up your agent" with its one explanation line; the centre is one lifted card: the handle field, the sentence field, Build my agent; SourceTable and "Every agent starts from these" are deleted.
(h) Rail before an agent exists: head, the seven steps with the product's full names (two lines where a name needs it, no shortening), foot; after save: Feed, Settings, Notifications, then his sources.
(i) During the run the card becomes the run in place: the step bands, "Checked N of M", the Strong, Possible and Set aside pills, the chosen sources; the profile block to the right after step 1; at Ready the card says the agent is ready with Open feed. Nothing else changes there.
(j) Feed card: the fresh prop, FreshRing and NewFlag leave the One card; freshId leaves feed.tsx; the h-full stretch goes so each card ends after its text.
(k) Clustered and Direct: Deck's two-segment toggle at the right end of the Feed title line, on the same row as the title.
(l) The example headline loses "Astra": "OpenAI launches GPT-6.1 Sol at a fifth of the price".
(m) none.

## Questions for the owner
none

## I accept
(a) Hidden rail: the Hide icon's pair, no word, fixed 16px from the viewport's left and bottom, column inset so it never covers content.
(b) Notifications: the DM state and Message @oparax_ai only; Alerts and Digests deleted.
(c) Foot: username, free week meter, theme as a labelled switch, then Sign out text at the left and Hide icon at the right; three looks, separate rows.
(d) Meter: Deck's seven flex-1 segments in --brand, full at 7 of 7.
(e) Groups directly under the nav, no hairlines, heading in t1 with the hue icon, rows name only aligned to the heading text.
(f) One GroupGlyph in the rail hue on the rail and on Settings.
(g) Before Build: one card with the handle, the sentence and Build; no catalogue.
(h) Rail before an agent: head, seven steps with full names, foot; after save: Feed, Settings, Notifications, sources.
(i) The card becomes the run in place; the run and Ready centre otherwise unchanged.
(j) New chip, FreshRing and NewFlag off the One; content-height cards.
(k) Clustered and Direct as a two-segment toggle at the right of the Feed title line.
(l) "Astra" out of the example headline.
(m) none.

## Checklist count
43
