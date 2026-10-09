**The pattern is lost coherence through piecemeal fixes.** Each round rearranged the latest offending object without preserving the relationships that made the accepted screens work. Council preferences then became specifications, even where the owner had already given a different direction.

His repeated objection is clear:

- **October 2:** “Complexity is still represented in a consistent design system, and it still looks good.” [History](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/history/owner-history.md:82)
- **October 2:** “the trick isn't adding stuff, it's taking away.” [History](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/history/owner-history.md:250)
- **October 3:** “one consistent alignment across the different pages of one view.” [Page notes](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/PAGE-NOTES.md:19)
- **October 4:** “There is literally no uniformity between notifications, the username, and Sign Out, so it's not a balanced UI.” [History](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/history/owner-history.md:941)
- **October 5:** “Why are those two separate cards on the right side of the onboarding? … This is the kind of coherence I'm talking about.” [History](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/history/owner-oct5-8.md:93)
- **October 8:** “There's definitely progress, but it's a horrible way of bringing everything together.” [Page notes](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/PAGE-NOTES.md:164)

The accepted Window, Newsroom and Deck organize information into recognizable relationships. The current One retains their colors and shadows, but wastes space inside stretched cards, scatters controls, and presents an example catalogue before the user has done anything. Subtraction should remove that friction while keeping the images, identities, readable facts and depth.

**Where the work went wrong**

1. **The council prescribed several regressions.** Grok specified “one 36px line” containing theme, Sign out and Hide, and “The email and the initial leave the rail.” The host explicitly chose that because “the rail gets quieter.” This removed identity and compressed unrelated actions instead of balancing them. The build followed it. [Grok’s specification](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/council-rail-oct8/grok.md:33), [host’s adoption](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/council-rail-oct8-r2/brief.md:7)

2. **A lane’s measurements replaced the visual reference.** “Seven segments of 18×3,” filled with `--caution`, became the implementation. The accepted feeds show blue meters spanning their containers. All seven current segments are filled, but their fixed widths leave a conspicuous empty remainder. This is a specification error, faithfully implemented, not missing trial days. [Specification](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/council-rail-oct8/grok.md:33), [implementation](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one/shell.tsx:374), [accepted Deck](/Users/farzanm4/Desktop/repos/oparax/img/accepted-deck-dark.png)

3. **Changing names did not resolve the composition.** The sidebar agreement turned “plates” into “internal bands” while retaining the partitioned navigation, source sections and utility block. The owner’s praise for distinguishable headings was treated as approval of every separator. The current complaint rejects that result. [Agreement](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/council-sidebar-oct8-r3/brief.md:5), [owner’s crop](/Users/farzanm4/Desktop/repos/oparax/img/owner-rail.png)

4. **Notifications inherited scope instead of earning it.** Astra explicitly specified “Twitter DM connection, Message @oparax_ai, alert hour and digests.” The builder reproduced those three sections. The extra UI therefore came through the council, not an independent builder invention. Existing product controls were mistaken for the requested page. [Council](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/council-sidebar-oct8/astra.md:23), [result](/Users/farzanm4/Desktop/repos/oparax/img/now9-notifications.png)

5. **The lab failed to incorporate a direct correction.** He requested: “Inside that card, you can say your handle and description of your beat. ‘Build my agent.’” Yet the lab still renders `SourceTable` before gathering, with “Every agent starts from these.” This directly contradicts his rejection, regardless of improvements to the sidebar. [Owner](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/PAGE-NOTES.md:159), [code](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one/onboarding.tsx:303)

6. **Review narrowed to the specification rather than the whole experience.** The rail confirmation allowed only “THE ONE CHANGE,” although the proposed layout still had multiple unresolved relationships. Earlier, sidebar round three ended with Astra accepting “Header: bar” and Grok and Pro accepting “Header: none.” Those records do not establish unanimous agreement. Precision and a completed round were being mistaken for convergence. [Confirmation brief](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/council-rail-oct8-r2/brief.md:5), [Astra](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/council-sidebar-oct8-r3/astra.md), [Grok](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/council-sidebar-oct8-r3/grok.md)

**The smallest corrections**

**(a) Menu.** Keep the open rail attached to the viewport edge. When hidden, put Menu in the existing page-title row. Remove the fixed button overlapping stories in [rail-feed-hidden.png](/Users/farzanm4/Desktop/repos/oparax/img/rail-feed-hidden.png). This revises the older bottom-location instruction in response to his current rejection. No new header or collapsed icon strip.

**(b) Notifications.** One Twitter DM activation surface: connection state, Message @oparax_ai and concise sending instructions. Move the existing alert hour, timezone and digest preferences back into Settings. Do not reproduce the three-column panel under another title.

**(c) Foot.** Three ordered groups: trial and usage; account identity with username and a separate Sign out button; then theme left and collapse right on their own utility row. Account actions and display controls should not share one undifferentiated line. Use the signed-in identity, with email as fallback when no username exists.

**(d) Meter.** Restore the accepted blue fill. Seven equal flexible segments span the available width; seven remaining days fills all seven. Preserve the existing theme tokens. `DESIGN.md` includes free week under caution, but the supplied accepted pictures show a blue meter and the owner explicitly rejects this recoloring. That conflict is not permission to silently rewrite the theme document.

**(e) Sections.** Keep the brighter headings, kind icons, counts and aligned source names. Place groups immediately below navigation in one continuous list. Remove inter-group horizontal rules and excessive section padding; retain modest spacing and collapsibility. I read “Commissions” as the bottom utility options, not a new feature.

**(f) Icons.** Use the same X, RSS, globe and GitHub marks, sizes and semantic colors everywhere. The code already shares `GroupGlyph`; Settings makes it muted while the rail applies kind colors. Normalize the presentation rather than inventing another icon set. RSS remains an RSS symbol. [Settings](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one/settings.tsx:42), [rail](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one/shell.tsx:311)

**(g) Before Build.** Keep the page heading separate. Put handle, sentence and Build inside one card in the central results area; replace that card with the running results after submission. Remove the catalogue. Before an agent exists, show Feed and the pending onboarding steps in the shared rail, without Settings, Notifications or watched-source groups. Retain steps through Ready; show the normal navigation once the agent exists.

**(h) Cards.** Put New immediately beside the source name in the existing source row. Let each card end after its text. The present height comes from grid stretching and explicit `h-full`, not a content-based height rule. Remove that stretching while preserving chronological row order and current image treatment; masonry is unnecessary for this correction. [Feed](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one/feed.tsx:57), [New’s separate row](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one/card.tsx:118)

**(i) Fable.** None of the sixteen pictures shows “Fable,” and the inspected One, Deck and shared data files contain no matching label. My best interpretation is a dictated address to the host, possibly while objecting to the empty card space. That remains uncertain; it does not justify changing story text.

Nothing was built or edited.

## I accept

(a) Menu: place the reopening control in the existing page-title row; remove the floating overlay.
(b) Notifications: Twitter DM activation only; alert timing and digest preferences return to Settings.
(c) Foot: trial and usage, then username with Sign out, then a separate theme-and-collapse row.
(d) Meter: existing blue, seven flexible segments across the full width, fully filled at seven of seven.
(e) Sections: source groups directly below navigation, aligned names and distinct headings, no inter-group rules.
(f) Icons: one shared X/RSS/globe/GitHub treatment across the rail and page content.
(g) Onboarding: one setup card; Feed and steps before creation; normal navigation after the agent exists.
(h) Cards: New beside the source name; content-height cards without stretching or hidden facts.
(i) Fable: likely a dictated address to the host; no visible label verified and no content change justified.