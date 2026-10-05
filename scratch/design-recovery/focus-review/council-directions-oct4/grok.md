(Host note: Grok delivered this answer in full but without the RESULT: FINDINGS marker, so the runner marked the lane INVALID; the text below is its output, unedited.)

RESULT: FINDINGS

Pass 13 has no frame, and that is the whole failure. `deck-feed.png` is one page under a bar. `window-feed.png` is one window with the bar inside it. The One is neither. `feed-open.png` is the word Feed, two loose tiles, a thin alert line, and a bubble. `p13-onboarding-done.png` adds its own title, an account chip, and a button on top of that bubble: the sidebar and the pop-up together. `p13-settings.png` is one card in a void, and it stops at account, plan, and X DMs. `p13-login.png` is a logo, a sun icon, and a split slab. The pages cannot look related.

The cards read. The grid does not. In `feed-open.png` a tall picture sits beside a shorter card, and the next row's imageless card clips `vercel/next.js, Next.js`. This week and the free week, the only living objects, sit in tiles, so the header is a label.

The run is a flash. `site/next/building/steps.ts` plays the eight steps in 4.6 seconds (400, 600, 500, 1400, 800, 0, 600, 300 ms). Search is 0 ms. The done screen is every check already ticked, so the reasoning never stays.

One catalog piece: Center Flow, on login only, in our colours. The card stays the Deck card. The run stays these eight steps. Sources, notifications, and settings become one page. The lab switcher stays bottom left on every lab page, login included. It is not the product.

**Three directions.** The choice is the frame, and where the source list lives. Two would hide one of the originals he still loves. All three keep his lines: Deck cards, no icon rail, a closed list is gone, no banner slab, no coloured strips, no "N Articles" pills, no citations in the bullets, no peek, no "Why" labels, no name/handle switch, no search, sort, or pill filters, desktop only, the fixed theme, logos plus counts with three then Show more, one onboarding page, setup on one line with the button beside it, timeline on the left and his things on the right, X DMs as a button.

**1. Desk**
- Name and feel: Deck's open ground. Cards lift off the page under one bar, as in `deck-feed.png`.
- Shell: one header on feed, onboarding, and settings. Left to right: mark, Feed, Onboarding, Settings, then Clustered and Direct on the feed only, the this-week bars, the free-week bar (7 days, the blue segments), account (picture and Farzan Mirza, Sign out inside it), theme. A Sources control, feed only, opens the list over the page: logo, count, three per group, then Show more, with a gap before the next group. Closing it removes it. Not chrome: the bubble, the alert line, the two tiles, a second top bar, a sources route. Login sits outside the shell and keeps the header line (mark, theme).
- Pages: `/feed`, `/onboarding`, `/settings`, `/login`. Sources, notifications, and setup as its own route are gone. Settings is the same ground in four blocks: account (picture, name, handle, and about in one object), plan (0 of 300 watched X posts, Plans), sources (logo, name and handle on one line, reason on click, Add and Remove), and the X DMs button. Setup is onboarding's first state: X account and what to follow on one line, button at the side.
- Feed grid: three columns. One height per row. The picture is one band, about a third of the card, cropped. An imageless card draws that source's mark in the same band, on the card ground, so Next.js matches the photo beside it. Top line: logo, one name, time at the right. The name ellipsizes. The time never clips. Further sources are logos, then +N.
- Header life: the week bars and the amber line "Checking 1 item against your sentence". Feed is only the current item in the nav.
- Onboarding pacing: Replay, 32 seconds, control in the header. Profile 3s (picture, name, handle land on the right). Posts 5s (the 10 posts stream in the centre). Gather 4s (the recorded count, then chips). Jev 8s (strong, possible, and set aside stay up while the chips sort). Choose 5s (chosen sources, name and handle on one line). Search 2s (the skip line, readable). Brief 3s (it writes inside that one profile object). Save 2s (ready, Open your feed).
- Login: the Deck card on the left, at card size: email, password, blue Log in, X and Google with their own logos. Center Flow on the right. The centre is the Next.js 15 story. GitHub and Product Hunt above, web and RSS at the sides, X below. Lines come in from those five.
- Gives up: a source column you can scan while you read. You open it. Nearest miss is the empty settings card. The header and the four blocks fill the ground, so it is not that.

**2. Full window**
- Name and feel: Window, after his correction. The window is the page. The header is inside it. No ground around a box.
- Shell: the same contents as Desk's header, set into the top of the window, on every page. The source list is a column inside the window, feed only (logos, counts, three, Show more). Close removes the column. It is absent from onboarding and settings, and it does not hold the account. Not chrome: the right-hand agent column, the name/handle switch, Newest first, the preview sentence, the bubble. Login keeps the header line.
- Pages: the same four routes. Settings is those four blocks as a list inside the window. Onboarding is timeline, centre, one profile object, inside the window. Setup is the line under the header.
- Feed grid: Desk's row rule. Two columns while the source column is open, three when it is gone. Card width stays even.
- Header life: the week objects and the checking line, in the window's bar. Stories start under it.
- Onboarding pacing: the same 32s Replay (3, 5, 4, 8, 5, 2, 3, 2) and the same lines. The centre shows only the live step, so the eye stays on one thing. Replay is in the header.
- Login: one window. The Deck card is the left half. Center Flow is the right half: same story, same five nodes, a gap between form and story.
- Gives up: Deck's open ground. Nearest miss is copying `window-feed.png` whole. The right column and the tool row are gone, and more than one story is readable on arrival.

**3. Sheet**
- Name and feel: Newsroom's full page. Edge to edge, one inset on every page, one sheet, mono labels in the bar.
- Shell: the same header contents, as the sheet's top bar. The source list is the sheet's first column on the feed only, and it is gone when closed. Onboarding puts the timeline there instead. Settings has no filter column. Not chrome: a window edge, a stage behind it, tiles, the bubble. Login keeps mark and theme.
- Pages: the same four routes, each the same sheet. Settings rows are account, plan, sources (reason on click, Add and Remove), and the X DMs button. Onboarding is timeline, centre, one profile object.
- Feed grid: Deck's row rule, three columns, tighter gutters. Same top line, same image band.
- Header life: this week and the free week as two cells in the bar, plus the checking line. No tiles above the cards.
- Onboarding pacing: the same 32s clock and Replay control. Finished steps stay readable in the left column, so a glance still shows the reasoning.
- Login: the sheet's header line, then the Deck card on the left and Center Flow on the right. Same story, same five nodes, our accents.
- Gives up: the lifted air he likes on Deck. The sheet is dense on purpose. Nearest miss is a stretched Newsroom with nothing leading. The cards still lead.

**(a)** Build Desk first. He already said the Deck arrangement is the one that makes sense, and the cards are the locked base. The failure is the missing frame. The open ground plus one header is the frame `deck-feed.png` already proved. Full window and Sheet stay if that ground still feels loose.

**(b)** The host builds that one shell and places feed, onboarding, and settings inside it before changing a card, a sentence, or any catalog block.