I'll read the brief and the guidance index first, then only the skills that review actually needs.The brief is a design council on the One chrome. I'll read the design skill, the owner's history, and the pictures it names.The current One shell is clear. Next I will look at Window, Deck, Newsroom, and the sidebar he already rejected.The header and the sidebar are both saying "you are here," and the sidebar's labels are the same object as its rows. Build the three-plate left side: pages, sources, and a foot that looks different, with the thin bar holding only the mark.

## What is wrong now

In `lab-one-feed.png` the header underlines **Feed** (`v2/one/shell.tsx`, the brand bar on the current link) and the rail paints **All sources** as the selected pill. Those are two different facts. The underline is the page. The pill is "no source filter," and it is on whenever `selected === null`, which is the ordinary feed. **Settings** is a second page link in that same header, while the rail never says Settings or Notifications.

The account is a third place. Free week, Light / Dark, and Sign out open from `farzan@newsroom.com` in the header (`Account` in `shell.tsx`). The rail's foot is empty. Tonight he put those three on the bottom left of the sidebar.

**All sources** is the useless row. The feed already shows every source when nothing is chosen. Window does the same (`v2/window/feed.tsx`, the "All sources" button). On Settings (`lab-one-settings.png`) and onboarding (`lab-one-onboarding.png`, `owner-one-onboarding.png`) that pill still looks like the current page, and a source row leaves the page for a filtered feed.

The section labels fail on the picture, and the code makes them the same edge as the rows. `TWITTER ACCOUNTS` is 10.5px mono, uppercase, `text-t3`, with a 12px kind mark (`shell.tsx`, the `GroupGlyph` line). The row under it is 12.5px, gray, 28px tall, with a 15px mark, and the caption's `px-4` lines up with the row's `px-2` inside the list's `px-2`. The X on the label and the X on Next.js are the same kind of mark. `RSS FEEDS` repeats it. He already called this bleeding: the headers are not bigger than the things inside them, and nothing separates them but four pixels of padding (`pt-4`).

Onboarding makes it worse. The seven steps are in the page (`lab-window-building.png` puts them in a **STEPS** column). The One's rail ignores them and lists sources with story counts while he is still choosing (`owner-one-onboarding.png`).

`new-feed.png` and `new-settings.png` are the rejected shape: a running header (Feed, Settings, the email) plus a Deck-style **Sources** card that still says **All sources**, still uses the same mono labels, and still hides Sign out. Closing it leaves a round **N**, the reduced rail he called a hunk.

Login (`lab-one-login.png`) is fine: mark, and Appearance as Light / Dark. These three organizations are for onboarding, feed, settings, and notifications.

The column rule in `DESIGN.md` still holds. The rail sits inside the centred column, with the stage ground outside it, as in `accepted-window-dark.png`. The current One bar runs edge to edge (`OneHeader` uses `px-4` instead of `one-column`).

## 1. One rail, and the bar keeps only the mark

**Header.** The 48px Window bar, mark and wordmark only, inside the column. No page links, no email, no chevron.

**Sidebar, top to bottom.** Feed, Settings, Notifications, as a `nav` of text links. The current page gets the brand underline the header uses now, and `aria-current="page"`. A hairline. Then the sources, real logos and counts, grouped Twitter accounts, RSS feeds, Websites, GitHub. Then a pinned foot, outside the source scroll: the 7-segment meter, "7 days left," "0 of 300 watched Twitter posts used," the existing Light / Dark switch, the initial and `farzan@newsroom.com`, Sign out as the bordered button already in `shell.tsx`, and **Hide** at the bottom.

**Section headings.** Not a row. A hairline, then 16px of air, then an 11px mono caption with the kind icon in that kind's existing hue and the group count on the right (the number he liked on Newsroom). The caption is not a button, has no pill, and does not hover. Rows stay 12.5px sentence case with the real logo.

**Filter.** Nothing pressed means the whole feed. The pressed row is the brand-soft row it already is. The page title carries Window's chip, "from Vercel," with a clear control (`FilterChip` in `v2/window/feed.tsx`). Pressing the row again clears it too.

**Onboarding.** Before he has sources, the middle is the seven steps, current step marked, the same list as `lab-window-building.png`. Nav and foot stay. After the agent is saved, the steps are replaced by the sources he kept.

**Collapse.** **Hide** removes the rail. **Sources** beside the page title brings it back. Open or absent. No icon strip.

**Nearest near miss.** The hunk, and the flat account rail on the left of `accepted-newsroom-dark.png` (Feed, Watching, and Account as one list). This one keeps a full source list with real logos, and the foot is pinned so Sign out cannot scroll away into the rows. The mark bar stays because on October 5 a page with no header looked blank.

## 2. The thin header keeps the three pages

**Header.** The same 48px bar. Mark, then Feed, Settings, Notifications on the left, current page underlined. The right side is empty. This is this afternoon's ruling ("Feed and settings remain on the left of the header," username moved off that bar) plus Notifications.

**Sidebar.** No page links. Sources from the top, same captions as organization 1, same pinned foot: meter, theme, username, Sign out, **Hide**.

**Filter, onboarding, collapse.** Same as organization 1. A source row always means "show the feed from this source," including when he is on Settings or Notifications.

**Nearest near miss.** `lab-one-feed.png` and `new-feed.png`: a header that navigates, plus a source aside that also looks selected. Here the header's right side is empty, and the rail has no **All sources** pill, so only the header can say which page he is on.

## 3. Three plates

**Header.** The 48px bar, mark and wordmark only, inside the column.

**Sidebar top.** Its own lifted plate: Feed, Settings, Notifications. Current page underlined. This is the only page navigation.

**Sidebar middle.** A second plate, Deck's **Sources** card (`lab-deck-feed.png`, the type he liked on October 3), holding only his sources. Each group is a shadcn `Collapsible`. The summary is 14px medium, with the kind icon, the group count, and a chevron. It is taller than a row and has no logo. Rows sit indented under it, name, real logo, story count. Groups start open. There is no **Show more** and no **All sources**.

**Sidebar foot.** A third plate, pinned: FREE WEEK meter, days left, posts used, Light / Dark, initial and email, Sign out as the bordered button, then **Hide**. He asked for the bottom to appear differently from the sources. Three plates do that. One shared row style is what made Sign out blend in.

**Filter.** Same chip and same press-again clear as organization 1.

**Onboarding.** The top plate and the foot stay. The middle plate is the seven steps until the agent is saved, then it becomes the sources. The centre of the page is the setup line, the run, or the feed. The rail does not repeat the catalogue in `owner-one-onboarding.png`.

**Collapse.** **Hide** removes all three plates. **Sources** by the page title returns them. The page column does not grow a stub of logos.

**Nearest near miss.** `accepted-window-dark.png`, where Feed, Digests, sites, and accounts are one continuous list, and `new-settings.png`, where a Sources card sits under a header that already says Feed and Settings. Here the header does not navigate, and pages, sources, and the account are three objects.

Settings keeps add, remove, and the limit ("10 of 10 websites and feeds"). Notifications is the page for Message @oparax_ai, the alert hour, and digests. The rail filters. Those pages edit.

## Build this first

Build organization 3. It is the sentence from tonight: Settings, the Feed, and Notifications navigable in the sidebar, the sources occupying the sidebar, and Sign out, the theme toggle, and FREE WEEK at the bottom left, appearing differently. The header becomes free. The mark stays, so the page does not go blank. It uses the Window bar he asked for this afternoon, Deck's source type, and the existing meter, theme switch, and Sign out button, inside the fixed theme.

## I accept

1. Header: Thin 48px bar inside the centred column, mark and wordmark only.
2. Sidebar top: A lifted plate with Feed, Settings, and Notifications. The current page has the brand underline.
3. Sidebar middle: A second plate of his sources only, real logos and story counts, groups for Twitter accounts, RSS feeds, Websites, and GitHub.
4. Sidebar foot: A third pinned plate with the 7-segment FREE WEEK meter, days left, watched posts used, Light / Dark, initial and email, the bordered Sign out, then Hide.
5. Section headings: Each group is a collapsible summary, 14px medium, kind icon, count, and chevron, with the source rows indented under it.
6. Filter state: No pressed row means every source. A pressed row adds a "from {name}" chip on the page title. The chip's clear, or the row pressed again, clears it.
7. Onboarding sidebar: The middle plate is the seven steps until the agent is saved, then the sources he kept. The top plate and the foot stay.
8. Collapse: Hide removes the three plates. Sources, beside the page title, brings them back. No icon rail.