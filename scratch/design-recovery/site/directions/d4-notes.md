# Source Stories, direction 4

This is an original Oparax page composition using actual free React Bits mechanics and stock shadcn controls. It is not a paid application block, a free marketing template, or an installation of Magic Transform.

## Whole-page intent

Manrope, porcelain with plum in light mode, and rich warm charcoal with muted mauve in dark mode. The incoming source cards occupy an overlapping 3D deck, three report fragments with recognizable publishers and real headlines travel into the same persistent clustered story, each supported fact is revealed as its exact source URL arrives, and the black X message stays visible beside the story. The introduction settles after about three seconds. Pending fact rows reserve their final height; the story heading and X delivery stay visible. Replay clears the contributed source URLs and adds them back at 1, 2 and 3 seconds. Reduced motion and narrow layouts start complete without a reveal. It never cycles automatically. Ordinary source selection brings a different report to the front and highlights the corresponding contribution; “See reports connect” repeats the short introduction. Narrow screens and reduced motion show the settled, readable composition.

The feed uses a compact three-column reading masonry on desktop, two columns at intermediate widths and one column on mobile: one photo story and naturally sized text stories, with no internal scroll panes. Direct mode contains the existing single-source syntheses. Clustered mode contains the existing multi-source stories. Both keep title, facts and original reports visible. Natural card heights are observed, so expanding or translated text cannot be clipped by fixed image tile geometry.

## Actual free source

- React Bits CardSwap: https://reactbits.dev/components/card-swap
- Inspected/downloaded upstream TypeScript: https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Components/CardSwap/CardSwap.tsx
- Adapted imported module: `components/react-bits/d4-card-swap.tsx`. It retains the vendor’s makeSlot depth and distance calculation, GSAP placeNow transform placement, cloned card refs, perspective deck and animated position reflow. Automatic interval cycling was removed. The caller controls the front source with native shadcn buttons; the front stays straight, rear cards retain their tilt, and natural card heights replace the fixed empty front-card minimum; rear cards are inert and hidden from assistive technology. Mobile and reduced motion show one untransformed selected source. The original card-drop cycle is not retained.
- React Bits Masonry: https://reactbits.dev/components/masonry
- Inspected/downloaded upstream TypeScript: https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Components/Masonry/Masonry.tsx
- Adapted imported module: `components/react-bits/d4-masonry.tsx`. It retains the vendor’s shortest-column assignment, container ResizeObserver and GSAP animated layout reflow. Image-only items became React content slots. Every card’s real text height is measured. Photo hover zoom, color wash, random entrances, image preloading and clickable outer tile wrappers were removed. One-column/mobile rendering is ordinary document flow. Native links and buttons inside cards own navigation.
- License retained in `components/react-bits/LICENSE.md`, MIT plus Commons Clause. This source is being used within an application preview.
- Stock shadcn Button/Card: https://ui.shadcn.com/docs/components/radix/button and https://ui.shadcn.com/docs/components/radix/card. Existing installed Mira primitives were composed without editing them.
- Shared FeedHeading uses the previously imported React Bits RubberSegment. Its Direct / Clustered control stays beside the feed heading.

## Original composition and evidence

`components/react-bits/d4-source-flow.tsx` is original Oparax choreography. It moves recognizable report headlines into the clustered story, draws their connecting paths and reports each arriving source URL to the persistent story. The story reveals only that source’s attributed fact when it arrives. It is explicitly separate from the downloaded component adaptations. Magic Transform’s locked implementation was neither accessed nor recreated.

The NASA post, NASA article, mission update, story facts, photos and favicons reuse the verified historical preview records. `d4-content.ts` binds contributed facts to exact source URLs rather than assuming the source-array position implies attribution. Pricing and roadmap each appear once and use their existing shared content. No live news, new metrics, account state or paid functionality is claimed.

The feed cards pair lighter Source Sans 3 titles and text with Manrope page headings. Source Sans 3 uses the existing `public/fonts/sourcesans3.ttf` with its OFL file. Manrope uses the already downloaded `public/fonts/manrope.ttf`, with its existing OFL file beside it. No production design tokens or DESIGN.md were changed.

## Verification

The isolated preview TypeScript check passed after implementation. The host owns the combined build and off-screen rendered inspection. This note does not claim that those checks have already completed.
