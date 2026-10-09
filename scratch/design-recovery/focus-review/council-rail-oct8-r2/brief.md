# Council round 2 on the rail: confirm one specification (October 8, 2026, late night)

Same repo and pictures (img/). Round 1 converged on the structure. The host (Fable, the fourth voice) takes Grok's proposal as the specification to build because it is the most complete, with one addition from Astra: the heading text and the source names start at the same x, icons at x=16, text at x=36, source logos at x=36 and names at x=58 (Grok's numbers). The host accepts it.

Your task, in at most twelve lines: read Grok's proposal below and ACCEPT it, or name THE ONE CHANGE that would make you accept it (one sentence, with the number or object it changes). Then `## I accept` with one line: "Grok's rail" or "Grok's rail with: <the change>". No em dashes.

The three remaining differences the host sees: (a) Sign out: Grok a quiet 12px text, Astra a bordered button, Pro an icon; (b) Hide: Grok a 28px icon button at the foot's right, Astra labelled; (c) the email and initial: Grok and Astra remove them from the rail (Settings shows the account), Pro keeps a profile row. The host sides with Grok on all three: the rail gets quieter, and the account lives on Settings.

---

# Grok's proposal (verbatim)

I'll read the brief and the guidance index first, then only the skills that apply to this review.This is a visual rail review. I'll use the reference-led design skill and the twelve named pictures, then the theme and the earlier sidebar records.The rail in `shell-feed.png` is one surface wearing six systems at once. The brand line, the Feed / Settings / Notifications tab row, the group headings, the source rows, the free-week meter, and the Light / Dark plus Sign out plus Hide controls each have their own weight, edge, and left start. That is the incoherence.

## What is busy

In `shell-feed.png` the tab row sits under "Oparax" at the same size as a menu label, with a brand underline. Feed, Settings, and Notifications read as page tabs, which is the switch he called out. Under that, "Sources" is a third caption before the groups he already understood.

Each source row says the name twice: "Next.js" and "@nextjs", "Vercel" and "vercel.com". A count sits on the heading (7, 9) and again on almost every row, and the row count is 1. The right edge becomes a column of ones.

The foot is a second app. `FREE WEEK`, seven blue segments, "7 days left", and "0 of 300 watched Twitter posts used" stack up, then a two-pill Light / Dark control, then the initial and `farzan@newsroom.com`, then bordered Sign out and Hide on one row. Those controls are the same height and the same border as each other, and louder than the names above them. The same stack is on `shell-settings.png`, `shell-notifications.png`, and `shell-feed-light.png`.

The rail is also inset. At 1440 the Width rule leaves 48px of page to its left, so the sidebar reads as a panel inside the column. In `accepted-newsroom-dark.png` and `accepted-window-dark.png` the list meets the left edge of its frame. `accepted-deck-dark.png` has no left rail. Its free week is one quiet tile, the same size as the other status tiles.

What already works, and he named it: the group headings are a different object from the rows (kind icon, name, count, chevron, hairline). The pressed row plus the "from Vercel" chip in `shell-feed-filtered.png` is clear. Hide in `shell-feed-hidden.png` removes the whole rail, and Menu sits at the bottom left. The seven steps in `shell-onboarding-rest.png`, `shell-onboarding-run.png`, and `shell-onboarding-ready.png` are the right object, but each step is two lines and the foot covers the last one.

## One rail

One continuous `--rail`, 240px wide, full viewport height, fixed at the left edge. A 1px `--line` on its right. No outer radius, no page ground to its left. It is outside the content column.

The content column stays one centred column in the remaining width, under the same Width rule: side margin = clamp(48px, (remaining width − 1400px) / 4, 290px). At 1440 the remaining width is 1200, the margin falls to the 48px minimum, and the column is 1104px, centred in that remainder. The 48px he already approved stays between the rail and the stories. It is no longer to the left of the rail.

Top to bottom:

1. Brand head, 16px top padding, one line, 16px below, then a 1px `--line`. The ring mark is 18px. "Oparax" is 15px Open Sans 600, `--t1`, 8px after the mark. It is not a link, has no underline, no chevron, and no hover pill. It is the only 15px word in the rail. That is the different header: a name band, separated by a line, above the options.

2. Feed, Settings, Notifications, vertical, in that order. One shared row: 32px tall, 2px between rows, icon 15px at x=16, label 13px Open Sans 500 at x=36. Idle icon `--t3`, idle label `--t2`. The current page gets a 2px `--brand` bar on the rail's left edge and a `--raised` fill inset 8px from both sides, radius 8px. Icons are a list, a gear, and a bell. No counts. 12px below the third row, then the groups. There is no "Sources" caption. The first heading already says what the list is.

3. Section headings stay the distinct object. 13px Open Sans 600, `--t1`. Kind icon 14px at x=16, in `--kind-post`, `--kind-article`, or `--kind-github`. Websites use a globe in `--kind-article`. The heading text starts at x=36. The group count is 11px mono, `--t3`, at the right, then a 12px chevron in `--t4`. A hairline sits above every group after the first. 14px above a heading, 4px below. Groups start open, collapse on their own, and a group with no sources is absent. Twitter accounts, RSS feeds, Websites, GitHub, only the ones he has.

4. Source rows indent to that heading text. The logo's left edge is at x=36, the name starts at x=58. Row height 30px. Name only, 13px Open Sans 400, `--t2`: "Next.js", "Vercel", "Guillermo Rauch". No handle, no host. Real logos and avatars stay. Long names ellipsize. A pressed row is `--raised` fill only, with no brand bar, so "you are here" and "filtered by" do not share a mark. The "from {name}" chip beside the page title stays. Its x, pressing the row again, or Feed clears it.

5. Onboarding keeps the seven steps in that middle, through rest, run, and ready. Each step is one 13px line, same 32px row as the nav, with the status mark in the icon slot: empty ring, `--ok` check, `--caution` ring and `--raised` fill on the current step. The explanation stays in the page, which is where `shell-onboarding-run.png` already puts it. Pause and Replay stay at the bottom of the steps, above the foot. The kept sources replace the steps when Feed opens.

6. The foot is pinned under one hairline, on the same `--rail`. It is not a `--raised` slab. The free week is the only mono block: 11px, `FREE WEEK` in `--caution`, seven segments of 18×3 (filled `--caution`, rest `--line-strong`), then `7 days left` in `--t3` on that line. The next line is `0 of 300 posts`, 11px `--t3`. Under that, one 36px line aligned to x=16: a 28px icon button for the theme (sun in dark, moon in light, one state, label "Theme"), then "Sign out" as 12px `--t3` text with no border, then the spacer, then Hide as the matching 28px icon button at the right, label "Hide". The email and the initial leave the rail. Settings already shows the account.

Same row style: the three nav rows and the seven steps. The source rows, one style across every group. Theme and Hide, one icon button.

A different object, and it has to stay different: the brand head, the section headings, the free-week meter, and Sign out.

Nearest near miss: the settings-app sidebar, the same family as the repeated app-shell chrome. Brand, tabs, tree, meter, account, and a button row, all the same height. This rail has two reading jobs, which page and which source, and the account shrinks to one quiet line. It is also not the hunk. Hide removes the whole rail. Menu at the bottom left, inside the content's margin, brings the full 240px rail back. There is no icon strip.

Kept as they are: the filter chip, no All sources, no header on signed-in pages. The page title and its actions stay in the content. Login keeps the visitor header. The rail filters. Settings and Notifications edit. Light mode uses the same composition on `--rail` `#f7f8fa`.

## I accept

1. Rail position and content column: The rail is fixed to the viewport's left edge, 240px, full height, `--rail`, 1px `--line` on its right, no outer radius and no page margin to its left. The content column is centred in the remaining width under the Width rule, margin = clamp(48px, (remaining − 1400px) / 4, 290px).
2. Brand line: A head, not a row and not a link: 16px top padding, 18px ring mark, "Oparax" at 15px Open Sans 600 `--t1`, 16px below, then a 1px `--line`.
3. Navigation rows: Feed, Settings, Notifications, vertical, 32px rows, 15px icon at x=16, 13px/500 label at x=36, current page marked by a 2px `--brand` left bar and `--raised` fill. No "Sources" caption. The seven onboarding steps use this same row, one line each, with a status mark, through rest, run, and ready.
4. Section headings: 13px Open Sans 600 `--t1`, kind icon in its hue at x=16, text at x=36, 11px mono `--t3` count, chevron, hairline above every group after the first, 14px above and 4px below. Groups start open. Empty groups are absent.
5. Source rows: Logo left edge at the heading's text x (36px), name only, 13px/400 `--t2`, 30px row, real logos and avatars. No handle and no URL. A pressed row is `--raised` only. The "from {name}" chip beside the page title stays, cleared by its x, the row again, or Feed.
6. Counts: The heading count only. No count on a source row and no count on a nav row.
7. Foot: Pinned under a hairline on the same `--rail`. Free week is an 11px mono block: `FREE WEEK` in `--caution`, seven 18×3 segments, `7 days left`, then `0 of 300 posts` in `--t3`. Below that, one line: a 28px theme icon button, "Sign out" as 12px `--t3` text, and no email.
8. Hide and Menu: Hide is the 28px icon button at the right of that foot line. It removes the whole rail and the content takes the width. A labelled Menu at the bottom left brings the full rail back. No icon rail. No All sources. No header on signed-in pages.

---

# Astra's proposal (verbatim)

**The rail contains the right things, but they compete instead of forming a hierarchy.** In [shell-feed.png](/Users/farzanm4/Desktop/repos/oparax/img/shell-feed.png), six treatments compete: underlined tabs, grouped source lists, a segmented meter, a boxed theme switch, an avatar/account line, and mixed footer buttons. The 210px footer feels like a second application. Handles and domains add a second reading track to every source. The 48px strip outside the rail makes it look stranded inside the page.

What works is specific: brighter group headings, colored kind icons, real source marks, and separation between groups. Keep those. [Window](/Users/farzanm4/Desktop/repos/oparax/img/accepted-window-dark.png) demonstrates an orderly source list; [Newsroom](/Users/farzanm4/Desktop/repos/oparax/img/accepted-newsroom-dark.png) demonstrates vertical navigation. [Deck](/Users/farzanm4/Desktop/repos/oparax/img/accepted-deck-dark.png) keeps the stories visually dominant. Borrow those relationships while retaining the fixed theme.

I propose one continuous, edge-attached rail with a distinctive brand opening, three navigation rows, a scrolling source middle, and a compact utility foot. Navigation and sources share alignment, hover, focus and selection treatments, but navigation is taller and heavier. Group headings remain a different object. The brand and foot never become additional menu rows.

Remove the redundant **Sources** caption, handles, domains, individual story counts, and footer avatar/email. Keep group totals. Reduce the foot to about 120px by combining its actions on one line. This recovers room for the vertical navigation without compressing source text.

The nearest near miss is a settings-app sidebar with every function presented as an equally prominent row. Here, sources remain the substantial, colorful middle; account utilities occupy a small bottom band. The rejected “hunk” cannot survive collapse because the entire rail disappears.

Keep the filter chip shown in [shell-feed-filtered.png](/Users/farzanm4/Desktop/repos/oparax/img/shell-feed-filtered.png), including when hidden. Its ×, pressing the selected source again, or choosing Feed clears filtering. Keep all seven onboarding steps through rest, run and ready, replacing them with sources only when Feed opens.

## I accept

1. **Rail position and content column:** A 264px rail touches the viewport’s left edge, with one right hairline; centre content in the remaining width using the existing viewport-based Width margin on both sides. At 1440px, content runs from x312 to x1392; after Hide, x48 to x1392.
2. **Brand line:** A 64px opening holds the 20px Oparax mark and 18px semibold wordmark, with 16px horizontal padding; no enclosing card, account details, dropdown or separate signed-in header.
3. **Navigation rows:** Feed, Settings and Notifications are vertical 34px rows with 16px icons, 13.5px text and 2px gaps; the current page uses the existing soft brand selection, with no underline.
4. **Section headings:** Keep 13.5px semibold bright text, colored kind icons, chevrons, initially expanded groups, separating hairlines, 16px above and 6px below; headings have no persistent selection fill.
5. **Source rows:** Use 30px rows, 12.5px names and 16px real marks; heading text and source names both begin at rail x40, with icons at x16; no handles, domains, All sources or Show more.
6. **Counts:** Show watched-source totals only beside group headings, right-aligned before the chevron; remove individual source-row counts.
7. **Foot:** Pin a roughly 120px `--raised` band beneath one hairline: 10.5px FREE WEEK and 12px days left, a 4px seven-segment meter, 11.5px usage, then one 32px action line containing bordered Sign out, an icon theme toggle with an accessible action label, and labelled Hide.
8. **Hide and Menu:** Hide stays bottom-right in the foot and removes the whole rail; a labelled Menu button at viewport left16/bottom16 restores it, with focus transferred between these controls and no residual icon strip.

---

# Gemini Pro's proposal (verbatim)

### 1. Judging shell-feed.png
In `shell-feed.png`, the design is busy and incoherent because three distinct visual systems compete: a horizontal tab bar for top navigation ("Feed", "Settings", "Notifications"), vertical list items for sources with right-aligned data, and a massive stacked layout of separate blocks in the footer. Handles (`@nextjs`, `vercel.com`) pointlessly repeat information beside the source names. The footer elements are the wrong size and weight: "FREE WEEK" demands a huge block with segmented progress bars, the Light/Dark toggle is an oversized full-width segmented control, and "Sign out" and "Hide" are heavy, full-bordered buttons. The entire rail is wrongly detached by a page margin. What already works are the section headings ("Twitter accounts", "RSS feeds") which are distinct and group the sources cleanly.

### 2. Proposing the coherent rail
The rail must be ONE coherent object, top to bottom:
* **Brand line**: Holds the Oparax wordmark and acts as a fixed header. It differs from the rest by having no hover background or interactive row style.
* **Navigation rows**: "Feed", "Settings", and "Notifications" become three vertical rows. Each has an icon on the left, the name, and an active state background.
* **Sources**: Distinct headings group the sources. Source rows show names only (no handles or URLs) and their text is indented to align exactly with the heading's text x. There are no counts on the rows to remove clutter.
* **Foot**: The heavy blocks merge and appear differently from the list rows, acting quietly. "FREE WEEK" gets smaller, becoming a single quiet text line. The theme toggle and "Sign out" become small icon controls that merge onto the same row as the user's avatar. "Hide" lives as a subtle collapse icon control next to them in the foot.
* **Row styles**: The navigation rows and source rows must share the exact same row style (height, hover state). The brand line and the foot must not.
* **Position**: The rail sits exactly at the viewport's left edge (x=0). The content column is centred in the remaining viewport width under the fixed Width rule.
* **Nearest near miss**: A settings-app sidebar or the "hunk" (reduced icon rail). It is not a settings-app sidebar because it holds live, changing data (free week, dynamic sources, onboarding steps) rather than static configuration menus. It is not the hunk because the owner explicitly wants it readable and expandable, not reduced to icons.

### 3. Keep
Keep the group headings' distinctness he praised, the filter chip, the seven steps in the rail during onboarding, Hide removing the whole rail, no All sources, and no header on signed-in pages.

### 4. I accept

## I accept
1. Rail position and content column: Rail stuck to the viewport's left edge; content column centred in the remaining width under the Width rule.
2. Brand line: Holds the Oparax brand as a fixed header, differing from lists with no hover state.
3. Navigation rows: Three vertical rows with icons and active states, sharing the exact same row style as source rows.
4. Section headings: Distinct typography as praised, cleanly separating groups.
5. Source rows: Names only (no handles), sharing the navigation row style, text indented perfectly to the heading's text x.
6. Counts: No counts on source rows to subtract visual clutter.
7. Foot: Free week as small text; Theme and Sign Out merge into quiet icon controls on the profile row, differing from the hoverable list style.
8. Hide and Menu: Hide lives as an icon control in the foot, cleanly removing the whole rail.
