RESULT: FINDINGS

I accept signup and building. Feed, landing, setup, and ready each need one object change before they belong with the accepted feeds. This pass is reading flow and component use. On building, React Bits StatusMark and AI Elements Shimmer and Plan are used for the step, the running label, and the brief.

1. I opened `accepted-deck-dark.png`: the Olmo card stops at "2 more facts", and GitHub is a separate digest card. I opened `feed-dark-01.png`: that Olmo headline is followed by four fact bullets, and the left list groups X ACCOUNTS, RSS FEEDS, WEBSITES, and GITHUB.

2. Feed. One change. Remove the Next.js Blog card from Direct (`stories.direct` still picks `st-next-blog`). `data.ts` says that article has no source in the list, so the rail cannot explain the card. Keep the blog only as a plate on the clustered Next.js 15 stack. After that I accept. Clustered and Direct show facts on arrival (`feed-dark-01`, `feed-direct-dark-01`), Vercel filters to its two articles (`feed-source-dark-01`), Handle rewrites the card (`feed-handle-light-01`), and light is its own page (`feed-light-01`).

Landing. One change. Remove the Product Hunt panel in `landing-dark-02`. It is only the caption "Daily new product launches", beside GitHub's two release lines. The sentences above already name it. The hero stack, source rows, story stacks, build example, and plans (`landing-dark-01` through `04`) are not the empty, flat, or busy near misses.

Sign up. ACCEPT. In `signup-dark-01` the front card's facts are readable. The two cards behind are the fan, cropped by overlap.

Setup. One change. In `setup-dark-01`, replace the unnamed logo cluster under the group headers with one named row per source, name and focus, the same rows the OpenAI example already uses on that page.

Building. ACCEPT. `building-mid-dark-01` shows step 3 running and the tile at 60, the first batch. `building-dark-02` shows checks, a labeled left-out sample, and the brief in Plan. The bar says it is a replay.

Ready. One change. Replace the three thumbnail rows under the stack in `ready-dark-02` (image, publisher, headline, no facts) with the feed's story cards, facts included. Those rows are a lead plus teasers. The lead stack is already readable.

3. The eight mistakes. (1) Fixed on feed cards. Still open on ready's thumbnail rows. (2) Fixed here. Chips say Article, Post, Release. No "reports" chip in `v2/deck`. "safety reports" on setup is the stored OpenAI focus line. (3) Fixed. Separate group headers. Copy says "websites, RSS feeds". (4) Fixed in the feed: GitHub is a row with "1 release", and the card restates the two stored release lines. Not a digest panel. (5) One card anatomy in `stack.tsx`. Image cards sit with text cards in `feed-dark-01`. I did not see the imageless wash in a shot. The code draws it when `image` is null. (6) The control works. Long feed addresses in the rail still break mid-word (`feed-handle-light-01`). (7) Fixed. This week, Agent, and Free week each say what the number is for. No zero chip. (8) Fixed on the counts that judge the feed: "5 stories", "1 post", "2 articles", "1 release". Front headlines are not ellipsized. `--t4` is the chevron and the pending dash, not the facts. Group totals borrow their unit from the header, as the accepted window does.

4. I disagree with leaving (b) open. The Direct blog card is a defect. I disagree with (a) on the landing only. I agree the feed should not grow an empty Product Hunt row. Ready does not list every source the feed watches: `ready.tsx` never renders GitHub. (c) is why setup does not pass. (d) overstates it. Signup is email and password, not an email link.

The strongest case against me: the empty-source sentence already says the stacks are the rest of the feed, and a Product Hunt caption is how you name a kind with no stored launch. I still rate the Direct blog card and the ready teasers higher.

Highest risk: Handle mode's broken addresses, and an empty selection still painting every stack (`feed-source-empty-dark-01`). I did not run the page, so keyboard focus is unknown, and `feed-narrow-dark-01` stops above the story cards.

First: remove `st-next-blog` from Direct.