RESULT: FINDINGS

One feed, with Deck as the base. Render that before any other page changes. His feed notes already describe one arrangement, and applying them to Window, Newsroom, and Deck would make three copies of the same page. Setup, building, and landing stay three directions until he walks them. Login is already chosen.

**What he wants**

Feed. He is "leaning toward the deck design" because it "makes the most logical sense given the arrangement of information": plain cards, a sidebar that looks nice. He dislikes that sidebar as it stands. He wants it "stuck to the left, expandable from the left, and collapsible, kind of like how Supabase's sidebar is," then cuts the extra: "clicking Expand expands it, and Contract contracts it, simple." Images 11 and 12 show the expanded list and the icon rail. The three-way menu in 11 is the detail he does not want. The rail holds "oparax's logo at the top, the username, and Sign Out, Sign Up, and Log In," so the page is "free for everything else." X accounts, RSS, and websites collapse, with "the icon that exists in Newsroom." Type stays Deck: "the way Sources is written and the font used for name and handle." Verified in `site/v2/deck/feed.tsx`: "Sources" is 13px semibold. The group labels under it are mono small-caps. The name and handle switch "should only come up for X accounts." GitHub is "multiple different repositories per interest," not every repository. The strip above the GPT-6.1 card is the other article in the stack, Simon Willison, Sep 29, peeking 22px (`site/v2/deck/stack.tsx`, `PEEK = 22`, image 9). He does not want the citation "in parentheses after the bulleted line." He wants "the citations at the top," and those citations swappable: click the cluster, see its sources, open one, and read that source while "the clustered news is showing." Direct stays: "let's not get rid of the direct feed." Clustered versus direct, search, "Newest First," and "simple filtration" are "tools for tweaking the feed" and can sit on the page. "Get alerts on X" "has got to be a prominent part." Cards "vary in size as per the news," and he does not know how that works once the rail closes. Deck margins "need to be half the current margins."

Building and ready. He "hasn't really looked at building" and tried not to judge it. What he did say: sources in a grid, websites and feeds separate, a switch between X accounts and feeds, sources first, the reason available if he wants it. He likes Deck's source cards, and Window and Deck "because the cards come in." Newsroom building makes him "scroll through a lot." On Deck ready: "I like it," then "why the fuck is that progress bar," because he had thought they were separate pages. His ruling: "one page, call it onboarding," and "the end of building is what the ready page looks like."

Login. "I honestly like the login page for the deck the best." The failure is that "the feed cards and the login card are kind of blending into each other."

**Clear these before building**

1. Clustered and Direct in the sidebar, or on the page with search and sort? Page tool row. He called them feed tools. The sidebar he listed is logo, account, and sources.
2. Are the top citations a label, or a control that opens one source? Both. Bullets stay clean. The "N Articles" row opens the list, and the cluster card stays visible.
3. Popup, or a side drawer? Drawer. He wants the cluster showing while he moves through sources.
4. Does the right column stay? No column. "Get alerts on X" goes on the tool row. Keep the single "Checking" line, because that is the agent working. The free-week bar, charts, and repeated alert tiles are the fluff he named.
5. When the rail contracts, do cards keep their width and gain a column, or grow wider? Same width, one more column. Height already follows the image and the facts. A full-width card stops being the Deck he picked.
6. Contracted rail: the icon rail from image 12, or one button and no rail? Icon rail. Expand and Contract only.
7. Is the free-week "7 days left" bar on Deck ready the bar he wants gone, and does building land on that ready layout as the same page? Yes. I infer that is the bar. I do not know whether he meant a stepper that is not on that screenshot.
8. On onboarding, do chosen sources lead as a Deck grid, with the steps and Jev bands behind the reason? Yes, and do not build it until he says so.
9. Email and password first, X and Google under them? Yes. That is the earlier ruling. Today's signup screenshot still shows X, then Google, then email.
10. Does the top bar go once logo and account sit in the rail? Yes. He could not reconcile "the header, sidebar, and the center."
11. Do filters stop at kind, plus picking a source in the rail? Yes, until he names more.
12. Halve the padding, and also drop the 1400px cap? Halve `px-4` / `lg:px-8` and `pt-8` now. Ask before removing the cap.

He already settled these: Direct stays, source-swapping is a different control, phone is out, and the three-mode sidebar menu is out.

**What to carry, what to drop**

Carry Deck stacks, Deck cards, the "Sources" type, and the Deck login. Carry Window's left rail, placed on the page edge. An inset window plus a rail plus a tool row is the pile he cannot hold, and the earlier ruling is that the window is the whole page. Carry Newsroom's source icons, search, and sort. Carry only the Supabase behavior he named: left edge, expand, contract, icon rail, skinned with the Oparax tokens.

Drop, on this feed: the inset window frame, the Newsroom table, the right stat column, the three Deck status tiles, parenthetical citations, the name/handle switch outside X, the top bar, and a separate ready route once he confirms onboarding. GitHub stays grouped by interest. The current Newsroom sidebar shows one GitHub row, Next.js. The rule is for when there are several.

The strongest case against one feed: he is "unsure how cards would look" at full width, he likes the right sidebar, and he is "not really sure if those sections should be removed." So the other two feeds stay on screen until he accepts the new one. Deleting them first would decide for him.

Highest risks: rebuilding the October 2 same-shell near miss, a title row plus toggles plus a rail with no leading card. A drawer that covers the cluster. Halved margins and no right column looking empty beside the accepted Deck. Folding the algorithm into onboarding before he walks the steps. Keeping the 22px peek with no other change, after he has already asked what it is. Letting the Supabase screenshots restyle the page.

**First render, then the builder list**

Render one desktop feed, dark and light, rail open and rail closed. Use the Latent Space and Simon Willison card, with clean bullets, the peek left as it is, and the drawer open on one source while the cluster stays visible. Use the Hugging Face card with no repeated source name. Include the tool row. No right column. Then the Deck login: email first, the form on the window surface, story stacks behind it, margins halved. Hold setup, building, landing, and the ready merge until he answers 7 and 8.

Feed build, after that lock: edge rail as above. Deck cards and the 22px stacks. Citations only in the top row. Drawer for a source. Direct as its own newest-first stream. Tool row with Clustered, Direct, search, Newest first, kind filters, and Get alerts on X. Checking line stays. Status tiles and the right column come off. Outer padding halved. Login: email first, X and Google under it, form on the window surface, same padding, no app sidebar. Onboarding waits. Setup and landing stay as they are.