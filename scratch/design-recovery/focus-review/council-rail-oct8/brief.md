# Council: the One's sidebar is "way too busy"; make it coherent (October 8, 2026, late night)

Repo /Users/farzanm4/Desktop/repos/oparax, read-only for you. The lab: scratch/design-recovery/site, the One's shell v2/one/shell.tsx (built tonight from the council's agreement in council-sidebar-oct8, -r2, -r3; read those records). The theme is fixed (DESIGN.md). Four designers: Astra, Grok, Gemini Pro and the host; the host adds no proposal this round. No em dashes.

## Look at the pictures first (img/ at the repo root)
- shell-feed.png: the One feed with the new rail. shell-feed-filtered.png (a source pressed), shell-feed-hidden.png (rail hidden), shell-onboarding-rest.png, shell-onboarding-run.png, shell-onboarding-ready.png, shell-settings.png, shell-notifications.png, shell-feed-light.png.
- accepted-window-dark.png, accepted-deck-dark.png, accepted-newsroom-dark.png: the three feeds he loved on October 2.

## His words on these pictures, verbatim
"Some good ideas on the sidebar, but it's way too busy. You put: feed settings, notifications, the free week line, light/dark toggle, sign out, hide and show, the sources. If you screenshot it and actually discuss it with /council, there's no coherence in the design. Why the fuck is the page appearing with the sidebar with a margin? The sidebar is stuck to the left, and the heading where Oparax comes, that header should be different. What the fuck have you done? You've introduced the switching between feed settings and notifications, whereas they were supposed to be options in the sidebar.

Somehow, you were able to figure out how you're showing the sections (Twitter accounts, RSS feeds, and all) and how you're showing the items inside them. That's nice, except I want you to indent the items exactly where the heading is. I told you there is no need to put the handles in or the actual website URL in the sidebar. You can just name them the actual name.

There's definitely progress, but it's a horrible way of bringing everything together. Absolutely horrible, despicable, in fact. Discuss with /council my notes and make the relevant changes. Take the screenshot and pass it to council because they need to see what it looks like."

His earlier words that still stand (tonight): "Settings, the Feed, and Notifications are three individual parts I want to be navigable in the sidebar [...] below that, at the bottom, there should be a Sign Out button, a Theme toggle, and the FREE WEEK showing on the bottom left in the sidebar [...] The sources occupy the entirety of the sidebar, but at the bottom, all these options appear differently." On October 4 he liked Window's and Deck's sidebars and said of a sidebar he wanted: "stuck to the left, expandable from the left, and collapsible, kind of like how Supabase's sidebar is"; he hated a reduced icon rail ("hunk").

## Facts
- The rail today sits inside the centred page column (DESIGN.md Width: margin = clamp(48px, (vw − 1400) / 4, 290px)), so at 1440 there is a 48px margin left of the rail; he calls that "the page appearing with the sidebar with a margin" and wants the rail stuck to the viewport's left edge. The Width rule was his yes on October 5 for the page's content; nobody has asked him whether the rail is inside or outside it: propose, and say what the content column does when the rail is at the edge.
- Nav today: Feed, Settings, Notifications as a horizontal row of text links under the brand line. He says they "were supposed to be options in the sidebar": read that as vertical sidebar items (menu rows), not a tab row.
- The brand line "Oparax" at the top of the rail: he says "that header should be different" without saying how.
- Rows today show name plus handle or host; he wants the name only, and the rows indented so the item names start exactly at the heading's text x.
- The foot today: FREE WEEK meter and lines, the Light / Dark switch, the email with an initial, Sign out and Hide on one row. He still wants Sign out, the theme toggle and the free week at the bottom, "appearing differently", and the whole to be coherent, not busy.

## What we need from you
1. Judge shell-feed.png as a human: name what makes it busy and incoherent (how many visual systems compete, what repeats, what is the wrong size or weight, cite the picture), and what already works (he named the section headings and rows).
2. Propose the coherent rail as ONE object, top to bottom, with sizes: the brand line (what it holds and how it differs from the rest), the three navigation options as vertical rows (icon? current state? spacing), the sources (headings and rows, names only, rows indented to the heading's text x, counts or no counts), and the foot (how the free week, theme and sign out appear "differently" yet quietly: what gets smaller, what merges, what becomes an icon control, where Hide lives). Say which of these should be the same row style and which must not. Say whether the rail sits at the viewport's left edge and what the content column does (centred in the remaining width under the Width rule, or starting at a fixed gutter after the rail). Give the nearest near miss (a settings-app sidebar, the hunk) and why it is not that.
3. Keep: the group headings' distinctness he praised; the filter chip; the seven steps in the rail during onboarding; Hide removing the whole rail; no All sources; no header on signed-in pages.
4. End with `## I accept`, numbered one-line items (Rail position and content column; Brand line; Navigation rows; Section headings; Source rows; Counts; Foot; Hide and Menu), comparable word by word. The host will send every proposal to the others verbatim for one more round, then build.

Be concrete and short. Cite pictures.
