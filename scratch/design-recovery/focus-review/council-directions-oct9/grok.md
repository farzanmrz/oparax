I'll read the brief and the guidance index first, then only the review material those files name.The brief is a design-direction council. I'll read the design and React Bits skills, the earlier checklist, and the pictures he named.The two design skills are in. Next I’ll check the locked checklist and the screens he named, then write the directions.The sources sit under Feed in every sidebar. The word mark (Open Sans 15px, weight 600, `--t1`) and the Light | Dark control (11px mono, 28px tall, `--well`, selected segment `--brand`) share the head. The foot is Hide sidebar, then the username (avatar 28px, name 13px `--t1`, `@handle` 12px `--t3`) and Sign out as plain words. The free week leaves the rail. The X mark is the normal mark in `--t1`. Kind headers are 15px, weight 600, `--t1`. A row is a logo and a name, 13px `--t2`. `vercel/next.js` uses a 14px repository icon. No hairlines and no search.

**Sidebar A, Inline nest.** `app-sidebar-5`'s tree, with `app-sidebar-1`'s head and foot. One 248px column on `--rail`. Feed (13px `--t1`, chevron) opens in place. Kind headers indent 16px. Name rows indent 32px. Settings and Notifications follow the tree after 16px of air, at Feed's indent. Indent marks the sources. The foot's own ground marks the account actions. This one is a file tree in a single column.

**Sidebar B, Two panels.** `app-sidebar-4`, without its search. The head spans both panels. A 64px rail holds Feed, Settings and Notifications as 32px icons, the selected one on `--raised`. A 220px panel on `--window` holds the four kind headers and the name rows, and it belongs to Feed. The foot closes that panel. Pages, sources and account actions are three surfaces. This one puts the sources in a second panel.

**Sidebar C, Menu tray.** `app-sidebar-1`'s single column. Directly under the Feed row, a tray (`--well`, radius 10px, inset 8px) holds the four kind headers and the name rows. Settings and Notifications sit on the rail below the tray, with 20px of air. The foot is the third region. This one boxes the sources under Feed and leaves the pages outside the box.

A workspace switcher (`app-sidebar-3`) loses the word mark he asked to put at the top. `WORKSPACE` / `INSIGHTS` / `ACCOUNT` labels are words he did not ask for. Leaving the four kinds as peers of Feed keeps "settings, notifications, and feed" in the same list as "Twitter accounts, RSS feeds, websites, and GitHub."

**Settings A, Header bar.** `settings-form-1`'s section card, once per kind, with 16px of `--page` between cards. Each card is `--card`, `--card-shadow`, `--top-light`, radius 10px. The header is a 44px bar: icon 16px, title 16px weight 600 `--t1`, Add source at the right, then a `--line`. A row is 36px: logo 16px, name 13px `--t1` and handle or address 13px `--t3` on one line, remove in `--t3`. No counts. The bar is the header. This one gives each kind its own card and a band across the top.

**Settings B, Heading outside.** The icon, the kind name (16px, weight 600, `--t1`) and Add source sit on `--page`. The card under them holds only rows. Twelve pixels separate the heading from the card. Twenty-four separate one kind from the next. The heading is type on the ground. The rows are the lifted card. This one keeps the title out of the card.

**Settings C, Account cards.** The kind name is 15px on the page. Each source is its own small `--card`, the separate row from `list-1`: logo, name and handle on one line, remove. Add source is the last card, same size, `--line-strong` border. Nothing wraps the group. The row is the card. This one has no group container to confuse with its title.

The attached stack in `stable-settings.png` is the thing he rejected: "Why are these attached cards?" Field descriptions and a Save footer from `settings-form-1` are things he did not ask for.

Every feed keeps the title Feed at 28px, with Clustered and Direct at its right. Card height follows the copy. Columns pack on a 16px gap. The order is logo and name, then the picture, then the headline and the facts.

**Feed A, Picture band.** The card in `stable-feed.png`, reordered. Padding 12px. The source row is a 16px logo, the name at 13px `--t1`, and the time at 11px mono `--t3`. The picture is inset, full width, capped at 132px, radius 8px. The headline is 18px, weight 600. Facts are 13px `--t2`. This one puts a short picture band between the source and the news.

**Feed B, Deck stack.** `accepted-deck-dark.png`. The front card uses A's order, with the picture capped at 120px. In Clustered, the other reports peek as 6px plates behind it. Direct is that card with no plates. This one makes a cluster a stack.

**Feed C, Small thumbnail.** The source row stays on top. A 72px picture sits under the logo. The headline at 16px and the first fact sit beside it. The remaining facts run full width below. This one makes the picture a small object beside the type.

The hero crop, source name underneath, is the current card and the hero crops in `accepted-deck-dark.png`. He asked for the logo at the top, then the image, then the news. The facts stay on the card.

For onboarding, the first step and the centre surface share one top edge. The right column shares it: avatar 32px, name 14px weight 600 `--t1`, handle 12px `--t3`, then the brief or the bio at 13px `--t2`, then the posts 8px apart. No About label. Step 3's areas are Tweets, RSS feeds and Websites. A chip is a logo and a name. At Ready the chosen sources lead, the brief appears once under the name, and Open your feed stays.

**Onboarding A, Mixed objects.** Step 3 is three cards, one per kind, each with a 15px header and name chips. Step 4 uses three objects. Strong match is a row of Deck tiles: logo, name, reason. Possible match is `wizard-6` rows: mark, name, reason. Set aside is one line of names in `--t3`. Ready uses Settings A's header bar for each chosen kind. This one gives the three judgments three different bodies.

**Onboarding B, Scaled rows.** Step 3 is three columns. The kind name is 20px. The chips sit under it, with no card around them. Step 4 is `list-1`. A Strong row is 48px and shows the reason. A Possible row is 32px with a `--caution` mark and the reason. A Set aside row is 28px, name only, in `--t3`. Ready uses Settings B's outside heading. This one keeps every judgment as a row and changes the row's size.

**Onboarding C, Task rows.** Step 3 is three stacks of pills under 20px kind names, 24px apart, with no card. Step 4 is `wizard-6` for the whole run. The streamed reasoning is the title. Each candidate is a task row: status glyph, name, reason. Strong uses `--ok`, Possible uses `--caution`, Set aside uses `--t3`. Ready lists each chosen source as a task row under a 16px kind line, with remove on the row. This one makes the run a task list.

Three matching chip stacks are what he called "all just one consistent thing." More divisions inside one card are the "blanket component" he described. The About label is the line he said does not need to be there. `onboarding-6`'s centered summary is a headline and a small table on an empty page.

## Directions
Sidebar: A Inline nest, B Two panels, C Menu tray
Settings: A Header bar, B Heading outside, C Account cards
Feed: A Picture band, B Deck stack, C Small thumbnail
Onboarding: A Mixed objects, B Scaled rows, C Task rows