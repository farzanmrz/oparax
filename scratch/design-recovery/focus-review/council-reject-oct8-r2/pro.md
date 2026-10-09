### Astra's Proposal
* Keep one aligned header (`components/one/header.tsx`) and a separate page-title line: ACCEPT (keep the running header and a page-title band below it).
* Restore Deck's source-list treatment as the shared left sidebar: ACCEPT (a 264px left sidebar using Deck's `SourceList`).
* Feed and Settings navigation live there; do not repeat them in the header: REJECT (must go; contradicts his October 5 acceptance of the header and his instruction that the aside is for context).
* Keep one brand and one account control: ACCEPT (brand and account stay in the header).
* Left column contains navigation followed by existing step list on onboarding: THE ONE CHANGE (remove navigation from the onboarding aside; it should hold only the seven steps).
* Section links jump to visible settings sections on Settings: THE ONE CHANGE (the Settings aside must hold the actual source list, not section links).
* Put the handle, beat and Build button inside one lifted central form: ACCEPT (one central lifted card holding only these inputs).
* Keep the steps beside it: ACCEPT (the 7 steps sit in the left aside).
* Remove the giant starter catalogue: ACCEPT (remove the 150-row catalogue from `components/one/run.tsx`).
* Explain that selection can be extended: ACCEPT (a single sentence explaining sources can be added later).
* Use existing form controls with main-surface lift: ACCEPT (the existing form in a lifted central card).
* Form's central surface becomes the working surface in place: ACCEPT (the build card streams the run log in place).
* Preserve the profile, bio and posts as they arrive: ACCEPT (the right column block appears after the profile checkpoint).
* Label submitted sentence separately from generated brief: ACCEPT (distinct labels for user sentence and Jev's brief).
* Retain gathered-source information under active status: ACCEPT (keep gathered source text visible while running).
* Animate checkpoint arrivals only: ACCEPT (animate only checkpoint arrivals).
* Chosen sources the first central object: ACCEPT (at ready, the chosen set sits at the top of the center card).
* Show actual names and addresses, reasons expand: ACCEPT (actual names and URLs visible, expandable reasons).
* Keep completed candidate bands below: ACCEPT (the run bands fold below the chosen sources).
* At ready, chosen set, brief, Open your feed immediately visible: ACCEPT (the final state shows these without scrolling).
* Put failure and retry in central surface: ACCEPT (failure state and retry button stay in the center card).
* Restore Deck's content-sized card composition beside sidebar: THE ONE CHANGE (use `OneCard` in a grid, as backing plates were rejected).
* Use integrated publisher images when supplied, compact imageless cards alongside: ACCEPT (images when present, compact cards when not).
* Preserve all facts and the source row above them: ACCEPT (facts and the source row stay on the card).
* Do not restore rejected backing-card peeks: ACCEPT (single cards without stacks).
* This week's activity and allowance above stories (`Tiles`): ACCEPT (four Deck tiles above the feed grid).
* Give the digest a finished neutral card with repository, summary, date: ACCEPT (the digest becomes a small card in the feed grid).
* Settings source directory as the main surface: THE ONE CHANGE (put the sources in the aside and the account settings in the main column).
* Source errors remaining beside the affected row: ACCEPT (show source errors on their rows).
* Separate right side into account/plan and Notifications: ACCEPT (separate lifted objects for account, plan, and notifications).
* Scheduling and digest controls inside Notifications: ACCEPT (scheduling and digests live inside the Notifications object).
* Source add/remove gated by sign-up: ACCEPT (follow his October 6 sign-up-only ruling).
* Login keeps current composition (`img/now-login.png`): ACCEPT (no structural changes to the login page).
* Use existing theme surfaces and shadows: ACCEPT (keep the `.one-column` theme and borders).

### Grok's Proposal
* Title band holds only the page title (and Clustered/Direct on Feed): ACCEPT (page-title band below the header).
* 264px sticky aside, collapse at bottom: ACCEPT (a 264px left aside collapsing at the foot).
* Deck's `SourceList`, closed means gone, Expand button at left of title band: ACCEPT (SourceList anatomy, disappearing when closed, expand button).
* Before Build title band is phase name, controls leave row: ACCEPT (title band holds only the title/phase).
* Left aside holds the 7 steps with `Shimmer`: ACCEPT (the aside holds the step list with these states).
* Center lifted card at rest shows handle, beat, Build: ACCEPT (the build card is the sole center object).
* 150-row table and `tableIntro` are not on this screen: ACCEPT (remove the catalogue).
* Click Build and card becomes stream in place with pills: ACCEPT (stream runs inside the card).
* Kind is a chip (blue Twitter, teal article): ACCEPT (use colored kind chips).
* Set aside stays quieter: ACCEPT (visual deemphasis for set aside).
* On failure card remains build card and failed step carries error/Try again: ACCEPT (failure states inline in the card).
* Right block only after profile checkpoint: ACCEPT (right column identity block as seen in `img/now-run-chosen.png`).
* Four Deck tiles, real numbers only: ACCEPT (the 4 top tiles on Feed).
* Dashed amber checking row while check runs: ACCEPT (checking row above the feed grid).
* Three across at 1440 with aside open, `OneCard` stays: ACCEPT (a 3-column grid of OneCards).
* Digest is a small card in grid with Skipped: ACCEPT (digest as a grid card).
* Aside lists agent's sources with Deck's count, Show more: ACCEPT (grouped source list in the feed aside).
* Row filters the feed, All sources clears it, no search box: ACCEPT (simple filter row in aside, no search).
* Settings aside lists watched sources with logos and no counts, Add on group, remove on row: ACCEPT (sources in the settings aside with add/remove).
* Settings main column is the account objects: ACCEPT (account objects in the main center column).
* One line says settings stay read-only until subscription is active: ACCEPT (read-only warning line).
* Login no change: ACCEPT (login remains as is).
* Keep theme, Width rule (`.one-column`), running header: ACCEPT (keep the header and fixed width).

### Host's (Fable) Proposal
* Keep the running header: ACCEPT (running header stays).
* Title band that holds only the page title: ACCEPT (secondary title band).
* 264px lifted aside on the left: ACCEPT (lifted left aside).
* Nothing repeated; Feed and Settings stay in header only: ACCEPT (do not put app nav in the sidebar).
* Title band "Set up your agent", then the phase name: ACCEPT (phase name in title band).
* Left aside holds the seven steps: ACCEPT (steps in the aside).
* Centre one lifted card, handle, sentence, Build my agent. No catalogue: ACCEPT (clean center card).
* On Build card becomes stream in place: count, bands with logo pills and coloured kind chips, chosen set as pills: ACCEPT (stream in place with pills and chips).
* At ready, chosen set becomes the first thing in the card and bands fold below it. Open your feed at the card's foot: ACCEPT (chosen set top, bands below, Open feed at bottom).
* On failure card keeps what was found and carries error and Try again: ACCEPT (failure states inline).
* Right column only after profile checkpoint: ACCEPT (right column timing).
* Title band, then Deck's four tiles: ACCEPT (4 tiles on feed).
* Amber checking row only while check runs: ACCEPT (dynamic checking row).
* Cards three across with aside open, `OneCard` stays, picture 172px, no backing plates: ACCEPT (3-column grid, no stacks).
* Digest as one small card in the grid: ACCEPT (digest in grid).
* Aside lists agent's sources; row filters feed: ACCEPT (aside source filtering).
* Settings aside is the source list with Add/remove: ACCEPT (source list aside on settings).
* Main column is the account as separate small lifted objects: ACCEPT (account in main column).
* Login no change: ACCEPT (login untouched).

### Revisions to My Own Proposal
* I withdraw removing the running header (`components/one/header.tsx`) and moving global navigation to the sidebar. The running header was accepted in pass 16 and keeps the global app layout stable, while the aside should be strictly for page-specific context. I accept keeping the header.
* I withdraw my proposal for physical story stacks (`site/v2/deck/stack.tsx`). The owner explicitly rejected backing plates and peeks as stupid. I accept keeping `OneCard` in a 3-column grid.
* I withdraw putting grouped settings into the center column with an undefined new sidebar. I accept the unified layout agreed upon by Grok and Host: the aside holds the source list, and the main column holds the account and notification objects.

## I accept
1. Shell and sidebar: Keep the running header (Oparax, Feed, Settings, account) without repeating navigation; use a title band below it; add a 264px lifted left aside (`site/v2/deck/feed.tsx` SourceList) that collapses at the foot, with an expand button in the title band.
2. Before Build and run: Title band holds the phase; left aside holds the 7 steps; center is one lifted card with handle, beat, and build button (no 150-row catalogue); on build, it becomes a stream in place with logo pills and colored kind chips; right block appears after profile checkpoint; at ready, chosen sources sit at the top of the center card with bands folded below and "Open your feed" at the foot; failure states stay in the card.
3. Feed: Title band (with Clustered/Direct); 4 top Deck tiles (activity, reports, agent status, allowance); dynamic amber checking row; 3-column grid of `OneCard` (no backing plates) with 172px pictures when available; digest as a small card in the grid; aside lists agent's sources with a filter row.
4. Settings: Title band; aside holds the watched source list with sign-up-gated Add on groups and remove on rows; main column holds separate small lifted objects for the person, plan, and Notifications (which includes digests and scheduling).
5. Login: Keep the current composition (`img/now-login.png`) without changes.