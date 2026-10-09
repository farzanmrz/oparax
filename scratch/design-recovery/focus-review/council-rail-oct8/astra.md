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