# Council round 3: confirm the merged checklist and the one list of changes (October 9, 2026)

Repo /Users/farzanm4/Desktop/repos/oparax, read-only. Same four designers. No em dashes. Round 2's four answers are in scratch/design-recovery/focus-review/council-stable-oct9-r2/{astra,grok,pro,host}.md (read all four; the host's was written before reading yours). Round 2's brief.sent.md holds the owner's words that settle the splits. Pictures stay in img/ at the repo root; open only the ones an item names.

This round is a confirmation. For each lettered item answer "yes" or "no" with his quote and the one wording you would accept instead. For the checklist answer "yes" or name each rule to add or strike, with his quote. Nothing else. Under 500 words plus the two lists.

## Items the four already match on (one wording; say yes or object with his quote)
(a) Hidden rail: the same panel icon as Hide, no word, fixed 16px from the viewport's left and bottom; the content column keeps a left inset wider than the icon so it never covers content.
(b) Notifications: one block, the DM state in words and the Message @oparax_ai button; the Alerts and Digests columns are deleted and drawn nowhere else. (Astra's "concise connection instructions": only the one sentence the page already has for the state, no new text.)
(d) Meter: Deck's Segments, seven flex-1 segments, --brand filled, --line-strong empty, full across the foot at 7 of 7, with Deck's labels ("Free week", "7 days left", "0 of 300 posts"); the amber 18x3 ticks go.
(e) Groups: Twitter accounts, RSS feeds, Websites, GitHub directly under Notifications, no hairlines, no per-group top padding beyond the row gap; heading row in t1 with the kind icon in its hue, the count and the chevron; rows in t2, logo and name only, name aligned to the heading's text.
(f) One GroupGlyph per kind in the rail hue on the rail and on Settings; the text-t3 wrap in settings.tsx goes.
(h) Rail before an agent exists: the Oparax head, the seven steps with the product's full names from steps.ts (a long name wraps; railName's shortenings go), the foot. After save: Feed, Settings, Notifications, his sources, the foot.
(j) card.tsx loses the fresh prop, FreshRing and NewFlag; feed.tsx loses freshId; the h-full stretch goes so each card ends after its text.
(k) Deck's ViewSwitch (v2/deck/chrome.tsx:170: Clustered and Direct with the layer and row icons, quiet well, blue selected) at the right end of the Feed title line, on the same row as the word Feed, wired to both views.

## Items that differed, with one wording built from his words
(c) The foot, top to bottom, one row each, 8px between rows: the username (name, then @handle in t3 on the same line); "Sign out" as words, a text button, no outline; the free week label and meter; the theme as a labelled two-segment control (Light | Dark); a 12px gap; the Hide panel icon alone at the bottom left. Three looks (words, segmented control, icon) and the meter sits between Sign out and the theme, so none of the three touches another. This is Astra's order. His words: "at the bottom, the sign out, the theme toggle, the sidebar thingy, and the free week" (Oct 9) and "They're so close together and look so similar that a user can even accidentally press one" (Oct 9). Grok's five rows and Pro's "separated" both fit this; the host's switch-then-Sign-out order is withdrawn.
(g) Before Build: the title "Set up your agent" alone on the title line, no explanation line under it (as the Feed title has none: "Why is there a subline beneath your feed? Just call it Feed", Oct 4); the centre is one lifted card with the handle field, the sentence field and Build my agent, nothing else in it (no starter-source guidance: "why tf is there extra UI components?", Oct 9); SourceTable and "Every agent starts from these" are deleted.
(i) During the run: once Build is clicked the handle chip and the Build button leave the title line; the card becomes the run in place with the running step as its title, its work (the gathering pills, then Strong match, Possible match, Set aside), and the chosen sources as removable pills with a cross ("pills that can be removable", Oct 5); the duplicate "Checked N of M" under the title goes because the running step already carries the count; the profile block stays on the right (picture, name beside it, handle under, About, Brief when written, newest posts). At Ready: "Your agent is ready", the chosen sources first, the brief, the completed Strong, Possible and Set aside groups below ("I like how you show strong match, possible match, and set-aside content", Oct 4), the profile block on the right, Open your feed; the finished progress bar, the "Gathering candidates 153 from the source list" line and the "106 more candidates were scored and set aside the same way" sentence go. Astra's question to the owner (does the completed scoring stay at Ready) is answered by his Oct 4 words above; say if you disagree.
(l) The example headline keeps "Astra". Grok and Astra: his complaint was the label; the headline is on accepted-window-dark.png, which he loved; an unasked edit is the pattern we are correcting. The host and Pro withdraw the removal.
(m) Three verified fixes and two struck claims. Verified in the lab: (1) the switcher dock (v2/shared/style-switcher.tsx, fixed at bottom 16, right) can sit over the last cards; the content column gets bottom padding equal to the dock's height so nothing runs under it (Grok). (2) feed.tsx line 46 shows every story when a source filter matches none; the filtered feed shows only that source's stories and, when there are none, one line "Nothing from <name> this week" (Astra). (3) The switcher's page row lights Settings on the Notifications page (style-switcher.tsx line 42); the page row gets a Notifications pill, disabled on styles without that page, as Settings already is (Astra). Struck: "10 of 10" source cap, not found in v2/one or next/ (Astra, cite the file or drop it); "selectable card citations", his Oct 3 words were about Window's reader, not an objection to the One (Astra, drop it or quote him on the One).

## The merged checklist (a yes/no check, then his quote and date; Pro's rule 21 "New chip to the right of the source name" is struck, superseded by "Remove it", Oct 9)
Everywhere
1. Twitter is the written name; the X logo is the mark. ["use the name Twitter everywhere inside the design flow", Oct 8]
2. No name/handle switch anywhere. ["remove the name handle", Oct 8]
3. No search box and no cluster chip. ["Cluster, search stories, all of that: remove it", Oct 8]
4. No "Checking one item against your sentence" line. ["Remove it from: Newsroom, Deck, Window, One", Oct 8]
5. No development-preview bar. ["Why tf is there a constant bar uptop", Oct 8]
6. The standard switcher in the same place with the same rows on every lab page, and its lit pills match the page and step shown. ["please bring standardization", "It's not showing me the different steps", Oct 8]
7. No phone layout. ["Mobile feed literally doesn't matter", Oct 5]
8. Nothing exists on a page only because our examples have it, and no example becomes a limit. ["That's just for these specific examples we've tested", Oct 8]
9. No object he did not ask for. ["why tf is there extra UI components?", Oct 9; "the trick isn't adding stuff, it's taking away", Oct 2]
10. One alignment for titles and content across the pages of one view. ["one consistent alignment across the different pages of one view", Oct 3]
11. The fixed theme in both modes; colour comes from function, surfaces keep their depth, real logos and pictures stay. ["Dark and light are fixed", "The color is coming from functional stuff", "the narrow color and the flatness were a big problem", Oct 2]
Sidebar
12. Stuck to the viewport's left, no margin. ["The sidebar is stuck to the left", Oct 8]
13. A distinct Oparax head. ["the heading where Oparax comes, that header should be different", Oct 8]
14. Closing removes the whole sidebar; no reduced strip. ["When it's opened, it's open. There's no reduced sidebar", Oct 3]
15. The control that brings it back is at the bottom and covers no content. ["The sidebar close and open should literally be at the bottom", Oct 4; "randomly floating toggle over the page cards", Oct 9]
16. After an agent exists, Feed, Settings and Notifications are rows in the sidebar, never a header switch. ["three individual parts I want to be navigable in the sidebar", Oct 8]
17. No "All Sources". ["Why is it saying All Sources?", Oct 8]
18. The groups come directly after the nav rows with no separation between groups. ["a weird sort of fucking separation", "come up at the top, along with Feed, Settings, and Notifications", Oct 9]
19. A heading is told from its rows at a glance. ["very hard to distinguish from the actual elements inside them", Oct 8]
20. Rows are indented where the heading's text starts. ["indent the items exactly where the heading is", Oct 8]
21. A row is the name only, no handle, no URL. ["no need to put the handles in or the actual website URL", Oct 8]
22. The bottom holds the username, the free week, Sign out, the theme toggle and Hide, on every page including onboarding. ["Sign Out at the bottom, Theme toggle, FREE WEEK showing there, Perhaps a username", Oct 8; "the oparax header remains, and at the bottom, the sign out, the theme toggle, the sidebar thingy, and the free week", Oct 9]
23. Sign out, the theme toggle and Hide differ in look and do not touch. ["so close together and look so similar that a user can even accidentally press one", Oct 9]
24. The meter is blue and full at 7 of 7. ["not going fully, and you changed the color", Oct 9; "The free week counter in the deck design... I like those", Oct 4]
25. One kind icon per kind, identical on the sidebar and on Settings. ["a different X logo for the RSS feed in the settings panel and a different one for the sidebar", Oct 9]
26. Nothing in the sidebar beyond rules 13 to 25. ["way too busy", Oct 8]
Onboarding
27. Before Build the centre is one card: the handle, the sentence, Build; no catalogue and no "Every agent starts from these". ["Inside that card, you can say your handle and description of your beat. 'Build my agent.'", Oct 8]
28. The title is on its own line, not mashed with the fields. ["the page header is kind of mashing into your handle", Oct 8]
29. Build happens in place: the card becomes the run. ["You click that in place, and it changes", Oct 8]
30. Before an agent exists the sidebar is the head, the seven steps alone, the bottom. ["the seven steps alone, but the oparax header remains", Oct 9]
31. Settings and Notifications exist only once the agent is saved. ["I don't understand how Settings and Notifications can show before the guy has gone through the onboarding", Oct 9]
32. The steps are visible during the run, named as the product names them. ["I do want to see Finding your profile and Reading your newest posts showing", Oct 5]
33. Steps left, sources centre, the person's own things right. ["The right side is for the user's own stuff, and the left side is for my timeline", Oct 4]
34. Strong match, Possible match and Set aside are shown; bands and pills, never a probability. ["I like how you show strong match, possible match, and set-aside content", Oct 4]
35. The profile: name beside the picture, handle below, the Twitter About; posts below as they are read; the brief at the top of the right side when written. [Oct 5; Oct 4]
36. Chosen sources are removable pills with a cross; the sources come first, no repeated "Why". ["pills that can be removable", Oct 5; "It is just saying 'Why, why, why, why?'", Oct 3]
37. Ready is the end of the same page. ["the end of building is what the ready page looks like", Oct 3]
38. The suggested sources read as a start, never as a cap. ["You can add as many sources as you want", Oct 7]
39. The onboarding page's switcher offers the steps. ["Why the hell do I not have toggles on the onboarding page", Oct 8]
Feed
40. The title is the word Feed with no subline. ["Just call it Feed", Oct 4]
41. Clustered and Direct as a toggle at the right of the title line. ["make it a toggle on the right of our header", Oct 9]
42. No New label, ring or flag, in any replay frame. ["What the fuck is this, and who introduced this? Remove it.", Oct 9]
43. A card is as tall as its content. ["Shouldn't it be as much as the text allows?", Oct 9]
44. Several stories and their facts readable without a click; citations at the top, none in parentheses after bullets. ["multiple different stories should be represented without the user clicking on anything", Oct 2; "I just want the citations at the top", Oct 3]
45. No plate peeking above a card; no card in a different ground colour. ["that looks really stupid", Oct 3; "Why is one of the cards green?", Oct 4]
46. Cards carry the picture, the logo and the facts. ["the feed is extremely lifeless", Oct 8; "those logos on the left... so lively", Oct 4]
47. A source filter shows that source's stories only. [rule 9; the fallback shows stories he did not ask for]
Settings
48. Account and handle on one line; website and name on one line. ["The account and handle can come next to each other", Oct 4]
49. No numbers next to the sources. ["There should be no numbers next to the sources because this is the sources page", Oct 4]
50. Add and remove sources are available, gated by sign-up only. ["There needs to be the ability to add or remove sources", Oct 4; "gated only by sign-up, not by payment", Oct 7]
51. Subscription information lives here. ["that's where subscription and all will also come", Oct 4]
52. One lifted surface per thing, no odd separate cards. ["Why the fuck is sources one consistent card?", Oct 4]
Notifications
53. Only the Twitter DM state and the Message @oparax_ai button; a button, not a toggle. ["there won't be a toggle. There'll be a button", Oct 4; "simple twitter DMs to activate", Oct 9]
54. No alert hour, timezone, Save or digests, here or anywhere. ["Drop alert R and digest for now. Just drop it.", Oct 9]
Login
55. "Login" one word on the main button, which is the blue one; provider buttons neutral. [Oct 8; Oct 3]
56. "Login with Twitter" and "Login with Google" on login; "Continue with Twitter" and "Continue with Google" on sign-up. [Oct 8]
57. Each provider button centres its logo and label as one group (layout C). [Oct 8]
58. The four-colour Google G. [Oct 8]
59. No "Email me a sign-in link" line in either mode. [Oct 8]
60. Email and password first, providers below; the form centred in the page column. [Oct 3; Oct 5]
61. Login is not in the switcher; the fixed login is the one shown. ["remove it from one of the things I have to review", Oct 8]

## End with
`## I accept`: (a) to (m), each "yes" or "no: <his quote>, <your wording>".
`## Checklist`: "yes" or "add: <rule> [<quote, date>]" and "strike: <number> [<quote, date>]" lines.
`## Questions for the owner`: lines or "none".
