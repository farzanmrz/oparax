# Direction 4, Scroll Story: provenance and notes

September 30, 2026. Built to `pro-exploration/final-plan.md` (Direction 4) and `agent-brief.md`.

## Idea

The reader's own scroll tells how a story forms and grows. The hero shows Sources, Oparax and Delivery on one connected line. A scroll-driven ledger then shows one launch day where each later report updates the same story instead of creating a new one. The feed carries the same timeline language as date-grouped disclosure rows.

## Provenance by section

| Section | Pro item | How it was used |
| --- | --- | --- |
| Hero, `hero.tsx` | how-it-works-8 | Adapted. Its three-column ordered list, staggered entrance, connector track and once-only connector draw are kept. Changes: data-sync copy and visuals replaced by the shared `XPost` and two `ArticleCard`s, a clustered `StoryCard` (title, facts, Europa photo strip, sources once) and the shared `XDm`. The heading row sits above the visuals. A subgrid aligns all three headings and notes on one line. The stock `aria-hidden` on the visual container is removed; only the connectors stay hidden. Neutral, white, black and mono values become semantic tokens. The vendor container becomes the shared frame. The lg breakpoint becomes `desk`. On phones the connector row hides and the step number sits inline with the heading. |
| Scroll section, `story-timeline.tsx` | how-it-works-6 | Adapted. Its measured center line, scroll-driven fill and node activation are kept. Changes: four alternating image cards become a two-column ledger (Report arrives, Your story) with a finale node and the finished story. The orange `rgb(249 115 22)` reached state becomes the blue primary. The `repeat: Infinity` pulse becomes one ring that plays once per node. Node positions are measured instead of assumed evenly spaced. The every-frame `requestAnimationFrame` loop becomes scroll and resize listeners. The uppercase eyebrow and vendor sizes are removed. On phones the line moves to the left edge. |
| Story card, `story-card.tsx` | none | Custom composition from shared content. |
| Roadmap, `roadmap.tsx` | none | Custom composition: two labeled dashed lanes (Planned sources, Planned destinations) joined by connectors through the Oparax mark on one centered axis. A separate small Works today line follows. It uses authentic `LogoTile` artwork without recoloring. |
| Pricing, `pricing.tsx` | pricing-10 (reference only) and shadcn `Slider` | Custom composition. It keeps pricing-10's idea of a slider that sets the plan. Its runs and seats tiers, billing cycles, 1.25x strike prices and badges are not used. The stock `Slider` (unedited) is proportional from 100 to 4,000 watched X posts. It snaps to 100, 3,000 and 4,000 on release, and arrow, page, Home and End keys move between plans. Three plan cards stay visible and are also click-selectable. Watched posts are the large figure. Wire's 15-minute cadence is in words, and the free week is a note. Because the stock Slider exposes no thumb props, an effect names the thumb and sets its `aria-valuetext` to the plan. |
| Feed, `feed.tsx` | notifications-1 | Adapted inside `.rb-theme-scope`. It keeps the bordered panel, day-grouped sections, rounded hover rows and accent focus outline. Removed: All/Unread/Mentions tabs, the unread count, Mark all read, read toggles and dismiss. Clustered rows show the title and first fact. A stretched Radix Collapsible trigger opens all facts and the sources (once), with the Europa photo thumbnail and credit. Direct rows show source identity, headline, facts and Open original. Real dates sit once in a sticky left rail instead of Today, Yesterday and Earlier. Small neutral-500 text becomes `text-muted-foreground`. The panel follows content height (no inner scroll). |
| Feed heading | shared `FeedHeading` | Imported as-is; Direct/Clustered sits beside Your Feed. |

## Motion

- Hero: the stage entrance stagger and the connector draw run once when visible. They finish in about 1.6 seconds and then stay still.
- Scroll section: the user drives the line fill, node activation and card highlight by scrolling. Each node's ring plays once when reached. Cards fade up once on entering view.
- Roadmap: the two connectors draw once on view.
- Pricing and feed: these respond only to input, through the slider, card selection and disclosure height (`collapsible-down` and `collapsible-up`).
- Reduced motion: every step shows as reached, the line is full, and all content is visible without scrolling or animation. `reduced-motion.ts` follows the live media query, because motion's hook reads it only once.

## Known weaknesses

- The timeline repeats the hero's NASA post and articles on purpose, because its subject is how they update one story. The hero's Delivery panel has some empty space below the message.
- Full-page screenshots enlarge the viewport, so they show the timeline fully reached. The mid-scroll render shows the true partial state.
- The shared dock in `pro/preview.tsx` is wider than a 390px viewport (right edge near 404px). It is fixed-position, so the page does not scroll sideways, but its edges are clipped.


## Host update, October 1

The host's production captures (`scratch/design-recovery/pro-exploration/renders/final/d4-timeline-mid.png`, `d4-timeline-late.png`) show the timeline filling as the page scrolls. The earlier note about full-page captures showing it fully reached, and about the dock clipping beyond 390px, is superseded: the shared dock now collapses to a corner button on phones and sits in the header on wide screens.
