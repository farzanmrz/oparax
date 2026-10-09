**I would build a single, visible sidebar with no signed-in header first.** It gives Feed, Settings and Notifications one home, keeps watched sources visible, and puts account controls where he now explicitly wants them.

**What causes the confusion**

In [lab-one-feed.png](/Users/farzanm4/Desktop/repos/oparax/img/lab-one-feed.png), Feed and Settings live above the content, while “All sources” has the strongest selection treatment in the sidebar. Two places appear to answer “where am I?” The source list has no clear “Sources” heading, so its purpose depends on understanding the individual groups.

The group headings are smaller and fainter than their children. “TWITTER ACCOUNTS” and “RSS FEEDS” share the rows’ left alignment, small icons and grey treatment. Letter spacing distinguishes typography, but does little to establish hierarchy. The [shell source](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one/shell.tsx) confirms 10.5px muted headings above 12.5px source rows.

[lab-one-settings.png](/Users/farzanm4/Desktop/repos/oparax/img/lab-one-settings.png) compounds this: sources appear twice, account information appears in two places, and the plan and Sign out appear in Settings despite also belonging to the header’s account menu. Notifications lacks its own destination.

[owner-one-onboarding.png](/Users/farzanm4/Desktop/repos/oparax/img/owner-one-onboarding.png) has two left columns: an apparently established watched-source list, then the actual setup steps. Before a first build, that source list communicates the wrong state.

The useful material is the watched sources, their recognizable marks and their counts. The expendable material is “All sources,” duplicated account controls, and tonight’s explicitly rejected “Checking one item against your sentence.” The latter removal is recorded in [PAGE-NOTES.md](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/PAGE-NOTES.md).

**Shared treatment for both directions**

Keep the fixed [DESIGN.md](/Users/farzanm4/Desktop/repos/oparax/DESIGN.md) theme and centred composition. Carry forward Window’s orderly rail, Deck’s depth and readable images, and Newsroom’s clear separation of navigation from information. Preserve the One’s content while reorganizing its chrome.

Use **Sources** as a plain section title. Within it, group headings use 13.5px semibold Open Sans in `--t1`, the appropriate kind icon, a disclosure chevron, a hairline above each subsequent group, and visibly more space above than below. Source rows remain 12.5px regular `--t2`, indented beneath the headings, with real marks and right-aligned counts. Groups collapse independently; expanding reveals their complete lists in the scrollable middle.

Feed opens the unfiltered feed. No source row is selected in that state. Selecting a source adds a removable chip beside the page title, for example **Vercel · RSS feeds ×**. Its close button, clicking the selected source again, or choosing Feed clears the filter. No permanent “All sources” replacement row.

Notifications contains Twitter DM connection, Message @oparax_ai, alert hour and digests. Settings contains source management and remaining account settings. Neither repeats the sidebar’s theme and Sign out controls.

**Direction 1: One continuous workspace**

- **Header:** None on signed-in pages. The page title and its own actions begin the main content. Login retains its separate visitor header.
- **Sidebar, top to bottom:** Oparax; Feed, Settings, Notifications; a separating rule; Sources; the grouped watched-source list; a fixed account foot.
- **Foot:** FREE WEEK with seven-segment meter, days left and watched-post usage; Light / Dark; account initial and email; a bordered Sign out button; Collapse at the bottom. Sources scroll above it. On short windows, every control remains reachable without overlapping the list.
- **Onboarding:** Before sources exist, the sidebar middle holds the seven existing steps instead of empty source groups. The setup form occupies the centre and becomes the running results; profile, posts and brief occupy the right. Remove the second checklist column. Ready retains the completed steps until the person opens Feed, when watched sources replace them. Feed remains the active destination throughout.
- **Collapse:** The whole sidebar disappears and the content gains its space. A labelled Menu button remains at the bottom left inside the composition. Reopening restores the full sidebar. No residual strip of company icons.
- **Nearest failure:** The “hunk” rail. Avoid it through one continuous rail surface, clear internal hierarchy and a separated foot, without stacking rounded cards inside it. Unlike [new-settings.png](/Users/farzanm4/Desktop/repos/oparax/img/new-settings.png), it is integrated with the content, begins at the same top line, and leaves no detached aside beside a large empty gutter.

This carries the useful organization of [accepted-window-dark.png](/Users/farzanm4/Desktop/repos/oparax/img/accepted-window-dark.png) without reinstating its superseded nested-window composition.

**Direction 2: Full-width content with an overlay sidebar**

- **Header:** Window’s thin masthead, containing only Oparax. Page headings and actions remain in the content.
- **Sidebar:** A bottom-left Menu button opens a full-height overlay inside the centred composition. Top: Feed, Settings, Notifications. Middle: Sources and grouped watched-source rows using the shared heading treatment. Foot: the same free-week block, Light / Dark, initial/email, Sign out and Close.
- **Composition:** Content always owns the full column; opening the sidebar covers part of it without resizing stories. Closing restores the unobstructed page.
- **Onboarding:** The seven-step timeline stays visible within the main page, with results in the centre and personal evidence on the right. Before watched sources exist, the overlay contains navigation and account controls, with no source groups or duplicate timeline.
- **Filter and collapse:** The same visible filter chip survives closing the overlay. Selecting a source opens the filtered Feed and closes the overlay. Escape closes it and returns focus to Menu; keyboard focus stays within the open overlay.
- **Nearest failure:** A generic settings menu or the earlier reduced rail. Full source names, marks and grouped lists preserve its purpose; closed means completely closed. Its weakness is that navigation and source life disappear until opened.

**Why Direction 1 wins**

Tonight he says the three destinations must be “navigable in the sidebar,” and that the sources should sit above the bottom controls. Direction 1 makes that arrangement immediately legible. Direction 2 better serves uninterrupted reading, but repeats the tradeoff behind his earlier “I also miss the sidebar.” These are genuinely different organizations: persistent workspace versus full-width content with an overlay.

## I accept

1. **Header:** No signed-in header; page title and actions stay in the main content; login keeps its visitor header.
2. **Sidebar top:** Oparax, then Feed, Settings and Notifications as distinct destinations.
3. **Sidebar middle:** Sources, then collapsible Twitter accounts, RSS feeds, Websites and GitHub groups containing actual watched sources.
4. **Sidebar foot:** Fixed free-week meter, days left and usage; Light / Dark; initial and email; bordered Sign out; Collapse.
5. **Section headings:** Semibold Open Sans, brighter and larger than source rows, with kind icons, spacing, rules and disclosure chevrons.
6. **Filter state:** Feed clears filtering; no selected source means unfiltered; an active source appears as a removable chip beside the Feed title.
7. **Onboarding sidebar:** Seven steps replace unavailable watched sources through rest, run and ready; completed sources appear when Feed opens.
8. **Collapse:** Hide the entire sidebar, reclaim its width and retain a bottom-left Menu button; reopening restores it without an icon rail.