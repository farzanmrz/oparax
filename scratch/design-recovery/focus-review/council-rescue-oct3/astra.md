RESULT: FINDINGS

(a) What I saw:

- `feed-open-p3.png`: the translucent sheet, rounded only on its right edge, covers the first story and clips the controls. It looks temporarily laid over the product.
- `feed-closed-p3.png`: the 56px gutter, lone mark and bottom Expand control still form a reduced sidebar. Small square thumbnails crop the Vercel and Mistral graphics awkwardly.
- `deck-feed-now.png`: the lifted aside has breathing room and its own column. One’s “All sources” selection already resembles Deck’s; that selected box is not the main problem.
- `window-feed-now.png` and `newsroom-feed-now.png`: navigation occupies a defined region beside readable content. Neither depends on covering stories.
- The three `accepted-*-dark.png` feeds have clear spatial hierarchy and differentiated surfaces. One has retained individual components while losing their relationships.
- `onboarding-running-p3.png` and `onboarding-done-p3.png`: profile and posts dominate the middle; inserting the wide brief pushes accounts much farther down. `window-building-now.png` keeps the brief visible beside the work.
- `login-p3.png`: the front story is wider than the form and approximately its height; the fan wins attention despite dimming.
- `setup-p3.png`: the form, example sources and story strip have clear roles and balanced space. Leave it.

(b) **Yes to the sidebar hypothesis.** My vote is a 240px lifted aside within the page layout, completely removed when collapsed. Deck demonstrates the right relationship between navigation and content. Transplanting its rows into an overlay cannot reproduce that relationship. This explicitly replaces the earlier floating-sidebar choice. The preview note and detached footer compound the problem, but removing them alone will not fix it. This is this lane’s vote, not a claim of council majority.

(c) Builder changes, in viewing order. Files below are in [site/v2/one](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one).

1. **Feed, `rail.tsx`, `Shell`/`Rail`:** replace the fixed translucent dialog and backdrop with a 240px in-layout aside, inset from the page edge, using Deck’s existing lifted surface, radius and shadow.
2. **Feed, `rail.tsx`, closed state:** remove `STRIP`, permanent left padding and both closed-state rail buttons; put one Expand control at the page’s top left. Keep Collapse inside the aside.
3. **Feed, `rail.tsx`, `SourceList`:** retain Deck’s selected “All sources” row, real marks, names, three sources per group, Show more and aligned count column; remove `PREVIEW_NOTE` from the sidebar.
4. **Feed, `rail.tsx`, footer:** separate it from sources with one quiet divider; give Notifications, handle and Sign out the source rows’ height, icon slot, label alignment and padding. Notifications opens its channel section; show a disclosure cue, not a switch. Put trial text beneath the handle.
5. **Feed, `feed.tsx`, top row:** keep Clustered/Direct left and the dismissible notification sentence right, aligned within the available content width; retain Checking immediately below.
6. **Feed, `feed.tsx`, `useColumns`:** measure remaining content width; at the pictured desktop size use two readable columns with the aside open and three when closed. Expansion must never cover cards.
7. **Feed, `card.tsx`, `OneCard` thumbnail:** retain the small footprint; contain graphic artwork so words and logos are not cut off. Keep photographic crops and every fact readable.
8. **Onboarding, `onboarding.tsx`, main grid:** use three stable columns: 240px timeline, flexible accounts area, 320px brief; retain existing page margins and theme.
9. **Onboarding, step list/source sections:** connect step marks vertically; place grouped source cards immediately beneath “Click on any source to see the reason” in the middle, two cards across, expanding reasons in place.
10. **Onboarding, `BriefCard`/`Profile`/`Posts`:** reserve the right column throughout; show Window’s brief there when available, followed by “What we read” with compact profile and post evidence. Remove their large middle-column presentations.
11. **Onboarding, completion:** keep all three columns and expanded reasons in place; update the status line with readiness, days remaining and Open your feed.
12. **Login, `login.tsx`, story fan:** scale the entire fan to 60 percent around its center, vertically center it beside the unchanged form and retain the existing dimming.
13. **Setup, `setup.tsx`:** no page-specific changes.

(d) Must not change: fixed theme, desktop scope, halved margins, email-first Deck form, text-first stories, full facts and source access; no header, tool row, peek, backing plates, article-count pills or parenthetical citations.