# Direction 2, Workspace: provenance and notes

September 30, 2026. Built against `pro-exploration/final-plan.md` (Direction 2) and `agent-brief.md`.

## Idea

The page shows the product itself. The hero is an Oparax app window whose three panes are the three stages (Sources, Oparax, Delivery), and the feed is the same workspace as a list and reading pane, so the landing page and the feed share one component language.

## Sections and Pro items

| Section | Pro item | How it was used |
| --- | --- | --- |
| Hero (`#product`) | `app-shell-4` | Adapted (`blocks/workspace-window.tsx`). Kept the region structure (tinted side region, bordered content region, tinted right panel), scroll-faded panes, 13px App UI density, `--rb-accent` and `--rb-r-*` variables. Replaced the newsroom nav with the Sources stage (shared `XPost` and two `ArticleCard`s), the story queue table with the clustered Europa story (interest match line, title, facts, supporting photo, sources once via `SourceList`), and the schedule panel with Delivery (shared `XDm`). Deleted the calendar, schedule data, filters, mobile drawer, panel toggle and matchMedia layout state. The 800px minimum height became a bounded 520px three-pane row from `lg`, stacked below it. Surfaces use semantic tokens. No `device`. |
| What happens after you sign up | `agent-activity-2` | Adapted (`blocks/setup-log.tsx`). The billing ETL PHASES became the three real onboarding steps (`lib/monitor/content.ts` labels) with the real step 3 report messages from `lib/onboarding/engine.ts` (counts omitted, `@yourhandle` as placeholder). Removed every duration, the total time, the duration bars and the bar scale. Completed phases show a check. Only step 3 is a disclosure (stock disclosure motion kept). Captioned as a picture. The left column (three numbered steps) is a custom composition from verified copy: handle and subject, agent build, free week with 300 watched X posts. |
| Roadmap (`#roadmap`) | none | Custom composition (`roadmap.tsx`): a small separate "Works today" line, then one panel with two labeled rows, Planned sources and Planned destinations, of shared `LogoTile`s on the same 12-column cell grid (6 at desk, 4 on phones) so both groups read at one scale. |
| Pricing (`#pricing`) | `pricing-15` | Adapted (`blocks/pricing-compare.tsx`). Verified plans replace Core/Plus/Prime. Removed the billing switch, yearly prices, "Save 20%", "Most popular" and the featured column. Watched X posts is the first, emphasized row; alert cadence in words; included features as check rows; free week as a note. Neutral and black/white classes became semantic tokens, `lg` became `desk`, rounded-full controls became the shared radius. The stock phone plan selector and its layout animation are kept below 700px. Buttons are stock shadcn `Button`. |
| Feed (Direct and Clustered) | `app-shell-5` | Adapted (`blocks/feed-reader.tsx`). Kept list/detail, the listbox keyboard model (arrows, Home, End, Enter), search and its empty state, the phone list/detail swap with a back button, scroll fades and focus handling. Removed the mailbox rail and drawer, unread dots and read tracking, the Unread/Assigned/Escalated filters, reply, star, archive, delete, the overflow menu and the confirm dialog. Entries are grouped under one date header each (dates shown once). Reading pane: title, facts, photo when present (Europa, Europa launch article), then sources once with each source's own excerpt and Open original. Direct list rows carry source identity; Clustered rows carry title and first fact. Heading is the shared `FeedHeading` with Direct/Clustered beside it. |
| Shared hook | app-shell-4/5, agent-activity-2 | `blocks/scroll-fade.tsx` is the stock `useScrollFade` extracted once, plus the stock focus ring classes keyed to `--rb-accent`. |

Shared pieces used unchanged: `XPost`, `ArticleCard`, `XDm`, `SourceList`, `LogoTile`, `SourceIcon`, `OparaxMark`, `FeedHeading`, `frame`.

## Motion

- Hero arrival, one finite sequence on load: reports rise in (0.1 to 1.0s), each gets a short accent "joined" rule on its leading edge (1.25 to 1.45s), the interest line and story resolve (1.1 to 1.9s), the DM arrives (2.3 to 2.75s). Nothing moves after about 2.8s. It is CSS keyframes (runs before hydration, off the main thread); `prefers-reduced-motion` removes the animation so the final frame renders at once (checked: `renders/d2/landing-dark-reduced-motion-0.6s.png`). An earlier motion/react version stalled in the headless browser, which is why it moved to CSS.
- Everything else is user-controlled: setup log disclosure (stock 200ms height/opacity), pricing phone plan selector (stock layout animation, instant under reduced motion), feed selection and row hover color transitions, button press feedback.
- No loops, no marquees, no shaders, no pause control needed.

## Deviations from the plan

- The hero's three-pane split starts at `lg` (1024px), not `desk` (700px). At 700 to 1023px the three panes would be about 190px wide, too narrow for the tweet and the DM, so panes stack there as on phones. All other breakpoints in this folder use `desk:`/`max-desk:` (plus `min-[1000px]`/`min-[1200px]` for the setup grid, roadmap columns and feed list width). No `md:`.
- App UI copies use semantic tokens (`bg-card`, `bg-muted`, `text-muted-foreground`, `border-border`) for surfaces and text instead of the navy `neutral-*` ramp, keeping `--rb-accent` and `--rb-r-*`. This applies rule 6 (no small neutral-500 text) and makes the windows match the page and the shared XDm in both themes.
- The setup log shows a static "Ready" state with no auto-advancing messages (rule 1: changing information is user-selected).

## Renders inspected

`scratch/design-recovery/pro-exploration/renders/d2/`: `landing-dark-fold.png`, `landing-dark.png`, `landing-light.png`, `landing-dark-reduced-motion-0.6s.png`, `feed-clustered-dark.png`, `feed-clustered-dark-europa.png`, `feed-direct-dark.png`, `feed-clustered-light.png`, `feed-direct-light.png`, `mobile-landing-dark.png`, `mobile-landing-light.png`, `mobile-feed-direct-dark.png`, `mobile-feed-clustered-detail.png`, `mobile-feed-clustered-detail-2.png`.

## Known weaknesses

- The feed opens on the newest story (Webb, one source, no photo), so the reading pane is sparse until Europa is selected. Honest date order was kept rather than preselecting the richest story.
- Direct items list the source identity in the row and again in the reading pane's Original source block (navigation versus detail).
- The setup log card is shorter than its text column on desktop.
- During the run, other agents' edits caused frequent Fast Refresh full reloads; an intermittent dev-only "state update on a component that hasn't mounted yet" warning appeared on some feed loads and was traced to the shared `SourceIcon` during those reloads. Fresh loads at the end showed no console errors or warnings on landing, Clustered or Direct.
- agent-browser pointer clicks did not reach elements at the 390px mobile emulation; mobile list/detail opening was exercised with DOM clicks (detail replaces the list, focus moves to the back button, the view scrolls to the reader); the back button was not verified separately because a concurrent full reload reset the page. Desktop clicks and keyboard (ArrowUp, Home, End) were exercised with real input.
