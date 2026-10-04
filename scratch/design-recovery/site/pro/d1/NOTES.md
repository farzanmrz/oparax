# Direction 1, Transform: provenance and notes

September 30, 2026. Built by a Claude Code (Opus) direction agent from `pro-exploration/agent-brief.md` and `final-plan.md`.

## Idea

Three real reports visibly pass through Oparax and come out as one clustered story, which then stays as a readable card between the sources and the X DM. The rest of the page explains how to read the feed (Direct or Clustered), where Oparax goes next and what it costs, and the feed is a calm hairline reading list grouped by date.

## Provenance by section

| Section | Pro item | How it was used |
| --- | --- | --- |
| Hero, middle stage | `magic-transform` (component) | Adapted copy in `blocks/magic-transform.tsx`. Procedural scribble documents replaced by real source cards (NASA post with avatar and mentions, NASA release with photo, NASA Science follow-up); result chips now render their labels (stock never drew `label`), and each burst emits only the labels of the document that just crossed, computed from the stock timing math; violet axis, vendor chip colors and React Bits logo replaced by theme tokens and `OparaxMark`; `paused` path removed because it rewinds documents; `onBurst` added; chip and particle drift bounded to the column. Beat 1.4s, three beats. |
| Hero, left and right stages | none (shared `XPost`, `ArticleCard`, `XDm`) | Custom composition: three stages in a CSS subgrid so headings, notes and content share rows; static arrow nodes between stages. |
| Hero, settled story | none | Custom `StoryCard` (`story.tsx`): title, facts with "Added from the mission update", Europa photo as a supporting thumbnail with credit, sources once. |
| Two ways to read | `features-13` (marketing) | Adapted in `blocks/features-13.tsx`: four Cadence items cut to exactly Direct and Clustered; vignettes replaced by a real Direct item (ESA/Webb) and a real Clustered story (Euclid); tokens, frame, heading scale, desk breakpoints; "01" numbering and in-view reveal removed. |
| Roadmap | none (`features-10` dropped per plan) | Custom composition (`roadmap.tsx`): two equal banks of official `LogoTile`s, planned sources and planned destinations, Oparax mark between, separate "Works today" line below. |
| Pricing | `pricing-13` (marketing) | Adapted in `blocks/pricing-13.tsx`: verified Hobby/Creator/Wire; watched X posts on every option and leading the detail panel; badges, per-seat copy, trial text and seats/support/uptime grid removed; 15-minute cadence in words; free week as a note; shared `Button` for Sign Up. |
| Feed | `blog-11` (marketing) | Adapted in `blocks/blog-11.tsx`: featured essay removed so every story uses the same row; hairlines and nudging arrows kept; one sticky date per date group on a thin timeline rail; title and facts first, photo as a supporting thumbnail, sources once in a right column. Direct rows share the grammar with the source's favicon, name, host and "Open original". |

Shared files used read-only: `shared/brand.tsx`, `shared/sources.tsx`, `shared/feed-heading.tsx`, `shared/motion.ts`, `shared/shell.tsx`, `content.ts`. Stock shadcn: `Button`, `Badge`, `ToggleGroup` (through `FeedHeading`).

## Motion

- Hero transform: starts on mount, runs three 1.4s beats, then unmounts (no rewind) and the story fades in with a short blur-to-sharp settle. It settles after the third crossing plus 0.9s, with `useSettledMotion(4700)` as a hard cap. Phases only move forward, so a re-run of the timer never restarts it. Under reduced motion the story shows immediately and the transform never mounts. The story is always in the DOM, so assistive technology reads it during the animation; the transform is `aria-hidden`.
- Reading modes, pricing and the feed switch: user-triggered crossfades of 0.2 to 0.35s, removed under reduced motion.
- Hover nudges on source arrows. No loops, marquees or shaders.

## Renders inspected

`scratch/design-recovery/pro-exploration/renders/d1/`: landing-dark, landing-light, hero-settled, hero-transform-dark, hero-transform-light, hero-reduced-motion, modes-clustered-dark, pricing-wire-dark, feed-clustered-dark, feed-direct-dark, feed-clustered-light, mobile-landing-* (390x844 segments), mobile-feed-clustered-*, mobile-feed-direct-0.

## Known weaknesses

- Before hydration the middle stage is empty (the story waits hidden for the transform), so a slow first load shows a blank column for a moment.
- On 1440x900 the third source card is cut by the fold; the three stage headings and the DM are fully above it.
- The reading-modes panel leaves generous empty space around its single card on desktop.
- Direct and Clustered rows intentionally share one grammar; the difference is carried by the sources column (one source with Open original versus a list).
