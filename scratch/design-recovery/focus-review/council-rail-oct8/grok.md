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