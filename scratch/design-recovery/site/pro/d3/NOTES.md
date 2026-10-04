# Direction 3, Bento Wire: provenance and notes

September 30, 2026. Built to `scratch/design-recovery/pro-exploration/final-plan.md` (Direction 3 and the shared rules).

## Idea

A short navy/blue mesh glow holds one bento row of three cells, Sources, Oparax and Delivery, joined by measured wires that carry the real NASA post and two NASA articles into one clustered story and on to an X DM. The rest of the page and the feed keep the same tile-and-wire language with real content only: the same event read Direct and Clustered, roadmap grids, plan cards and a two-column bento feed.

## Provenance by section

| Section | Pro item | Treatment |
| --- | --- | --- |
| Hero atmosphere and headline | `hero-22` | Adapted (`blocks/hero-22.tsx`). Mesh stops recolored from #7c3aed/#ffc9df to navy/blue; theme passed from the preview's `dark` prop (no prefers-color-scheme); speed 0.45 only while `useSettledMotion` runs (about 4.8s), then 0, which stops the shader's rAF; reduced motion renders a fixed frame and never animates; `min-h-screen` removed so the demo row sits inside the glow; vendor badge, copy, pill buttons and trust line replaced; shadcn Buttons; DESIGN.md frame; `MotionConfig reducedMotion="user"` for the headline reveal. |
| Demo row (three cells) | `bento-1` | Adapted (`blocks/bento-1.tsx`) plus custom composition (`demo.tsx`). Grok's three-cell structure: one grid row, three cells, headings aligned on one line by a CSS subgrid (heading row plus content row). Sources cell: the real `XPost` and two `ArticleCard`s (summaries hidden for height), each a link to the original, on bento-1's dot grid. Connectors are measured from the rendered cards (ResizeObserver) so they meet them at any width: three wires converge on the story, one runs from the story to the X DM. Pulses travel three times (all within about 4.75s), then the wires settle lit. Hover or focus on a source lights its wire, the delivery wire and the matching source chip in the story (bento-1's hover lighting, extended). On phones the cells stack and the wires turn vertical (bento-1's original funnel orientation) and stay inside the gaps. Removed: Connect pill, sync card, emerald ping, 4.4s infinite bar, Lucide chips, fake record counts. Outside `.rb-theme-scope`; colors are semantic tokens. |
| Oparax cell | none | Custom composition: one interest line, then the Europa story with title, facts (the solar-array fact marked "Added from the mission update"), supporting photo with credit, and sources once as chips. |
| Delivery cell | none | Shared `XDm` (rule 2), restyled surface; its story link opens the sample feed. |
| Two ways to read | none | Custom bento pair. One event both ways: ESA's single report (Direct) and the Euclid story joining ESA and NASA (Clustered), one line each on the difference, plus a static dashed wire from the Direct item to the same ESA source inside the Clustered story. Each tile's button opens the feed in that mode. |
| Roadmap | `social-proof-1` | Adapted (`blocks/social-proof-1.tsx`). Kept only the bordered-cell grid. Two labeled grids, planned sources (12) and planned destinations (4), of authentic `LogoTile` marks with names; silhouette/grayscale/invert removed; "Trusted by" framing removed; an Oparax node between the grids; a separate works-today line above. Static. |
| Pricing | `pricing-6` | Adapted (`blocks/pricing-6.tsx`). Annual toggle, annual prices, "Most Popular", raised card and purple removed. Watched X posts are the large figure, then price, then cadence in words (Wire: every 15 minutes when there is news). Shared inclusions listed once below; free week as a note. Static. |
| Feed | `blog-6` | Adapted (`blocks/blog-6.tsx`). Newsroom heading, tabs, Unsplash images, tag pills, hover arrow/zoom and Load more removed. Two-column bento grid, newest first: a photo tile spans two rows on the right while text tiles stay complete on the left; the photo fills the remaining height without setting the row height. Every tile reads title, facts, sources, then the optional photo. Clustered: sources once as chips, date once per story. Direct: one date header per day, original source identity and Open original on each item; a lone text item spans both columns. popLayout entrance kept for switching modes (opacity only under reduced motion). Shared `FeedHeading` with Direct/Clustered beside "Your Feed". |

No `card-spread`, `bento-7`, `bento-17`, `bento-23` or `hero-24` (dropped by the plan).

## Motion

- One orchestrated moment: the hero shader drift and the wire pulses, both on `useSettledMotion(4800)`; the shader freezes and the wires settle lit within about 4.8s. Reduced motion shows the settled frame at once.
- User-controlled: hover/focus on a source traces it through the story to delivery; Direct/Clustered switching animates the feed tiles.
- Everything below the hero is static.

## Known weaknesses

- The Sources cell has a little empty space under its third card at 1440x900 because the Oparax cell is the tallest.
- The light-mode wires are quieter than in dark (primary at 45% on white).
- The mesh frame frozen at about 2s varies slightly between loads (by design of the shader time), so the glow position differs a little between captures.
- The shared preview dock overlaps content at the bottom of the viewport on every direction (not owned here).

## Files

`index.tsx` (entry), `content.ts` (direction copy), `story-parts.tsx` (shared reading pieces), `demo.tsx`, `modes.tsx`, `blocks/hero-22.tsx`, `blocks/bento-1.tsx`, `blocks/social-proof-1.tsx`, `blocks/pricing-6.tsx`, `blocks/blog-6.tsx`. Renders: `scratch/design-recovery/pro-exploration/renders/d3/`.
