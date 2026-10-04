RESULT: FINDINGS

I read the brief, the guidance index, the reference-led-design skill (global and snapshot copies are identical), DESIGN.md, PAGE-NOTES.md, the owner's four images, the Deck, Newsroom and Window feed screenshots, the Deck building, ready and signup screenshots, and verified the "line above the card" in code (`site/v2/deck/stack.tsx`, `PEEK = 22`). Of the index, only reference-led-design was relevant; the rest cover code, data or instrumentation this review does not touch.

**1. What he wants, restated**

Feed. Deck is the base: "I am leaning toward the deck design because that makes the most logical sense given the arrangement of information." A left sidebar, stuck left, collapsible to icons and expandable by one button, Supabase-style but simpler: "clicking Expand expands it, and Contract contracts it, simple." It holds the logo, username, Sign Out / Sign Up / Log In, and source sections (X accounts, websites, RSS feeds, GitHub) that each expand and collapse with Newsroom's per-kind icons, set in Deck's "Sources" type. The name/handle switch appears only under X accounts. The page itself gets a toolbar: "clustered and direct can come there because these are all tools for tweaking the feed," plus Newest First sort, search, and possibly filters. Cards keep the Deck stacks, but citations leave the bullets: "I just want the citations at the top," and the top citations become a control that swaps the card between the clustered synthesis and each source's direct synthesis. Alerts on X must be prominent. Deck margins halved.

Building and ready. One page: "There is just one page, call it onboarding... the building needs to convert into the ready page at the end." Sources show first, collectively, grouped and switchable by kind, with a per-source reason readable on demand: "the sources themselves should show first, and perhaps there should be a way for the user to read why that source was selected if they want to."

Login. Deck's card, unchanged in structure: "I honestly like the login page for the deck the best," but visually separated from the feed cards behind it.

**2. Contradictions and gaps to clear**

- Citations "at the top. That's it" vs citations as a swap control. Ask: are the top source icons passive labels or the switch? Recommend: the switch; his later paragraphs describe exactly that, and it is what removes inline citations without losing per-source reading.
- Popover vs "drawer on the side." Ask which. Recommend popover first: he called it "the simplest way to go," and a permanent drawer rebuilds the right rail he calls fluff.
- Clustered/direct in the sidebar vs on the page; he says both. Ask: page toolbar only? Recommend yes; the sidebar keeps account and sources, the toolbar tweaks the feed, nothing said twice.
- Right sidebar loved vs "a lot of it is fluff." Ask: remove it and put one alerts action in the toolbar? Recommend yes, on his own verdict and the nothing-useless principle.
- Where the alerts button lives; he is "not really sure." Recommend the right end of the page toolbar, since pushing notifications is the product's goal.
- One onboarding page vs a Deck ready page he likes. Ask: confirm building's final state is the ready content on the same page, no progress-bar page. Recommend yes; that is his own resolution of "why the fuck is that progress bar?"
- Card sizing at full width: "I'm unsure how that dynamic size is allocated." Ask: is one reading column of stacks, sized by content, acceptable? Recommend one column at a fixed measure; reading first, and it avoids masonry guessing.
- GitHub in the sidebar: confirm it lists interests with their repositories grouped, not every repository.

**3. Three UIs or one**

One, with Deck as the base. He said "for the feed, a general design has emerged," and every specific pick today is Deck (feed, login, ready, building's clean sources). Carry over: Window's stuck-left collapsible sidebar behavior (his Supabase images 11 and 12), Newsroom's source-kind icons and its search-and-sort toolbar idea, Deck's stacks, "Sources" type, login card and ready content. Drop: the Window stage frame as the feed shell, the Newsroom table as the feed, the right rail filler, inline parenthetical citations, the separate ready page, Deck's wide margins. Strongest case against: he has not reviewed setup, building or landing in detail, and locking one shell now could force re-litigation when he does. Mitigation: lock the feed first, then extend the same shell page by page for his ruling. Highest risks: the citation swap hiding facts behind a click (a hard fail under the skill's section 2a unless the clustered card is fully readable on arrival), and the drawer variant quietly becoming the fluff rail again.

**4. Changes now, per page**

Feed: halve margins; build the collapsible left sidebar (logo top, auth actions bottom, grouped source sections with Newsroom icons, name/handle toggle only under X, Deck type); add the page toolbar (Clustered/Direct, Newest First, search, prominent Get alerts on X); remove right-rail filler; strip parenthetical citations from bullets and make the card-top source icons a popover that swaps the card to that source's direct synthesis and back; keep the stacks and the peek, and answer his question: the line above the card is the cluster's second article peeking 22 px as a backing card, not a separate component; GitHub grouped per interest.

Onboarding (building plus ready): one page; the run's final state is the ready content; sources in a collective grid grouped by kind with a switcher and an on-demand why; no standalone progress-bar page.

Login: Deck card; email and password first, Continue with X and Google below in provider colors; separate the card from the feed backdrop with stronger lift and a dimmed or blurred stage behind it.

First move: render two pages in the real theme, the new Deck feed dark and the merged onboarding end state, and put them in front of him with the seven questions above. Verified: the PEEK value, the fixed tokens, his quoted notes. Inference: my recommended answers to the open questions. Unknown: his rulings on every gap in section 2.