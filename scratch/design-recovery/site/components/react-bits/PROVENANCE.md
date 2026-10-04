# React Bits source

Installed with the shadcn CLI from the official free React Bits registry on September 30, 2026:

- SpotlightCard: https://reactbits.dev/r/SpotlightCard-TS-TW.json
- AnimatedContent: https://reactbits.dev/r/AnimatedContent-TS-TW.json
- LogoLoop: https://reactbits.dev/r/LogoLoop-TS-TW.json

License: MIT plus Commons Clause, copyright 2026 David Haz. The full license is in LICENSE.md, copied from https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md (blob 6425315416e94469f28d0223a09f7285b2f785ab). Use inside an application is permitted; the components themselves cannot be resold or redistributed as a component product.

## Local changes

- All three identify their root with data-react-bits, preserve the license notice and use the installed Motion 13 reduced-motion preference.
- SpotlightCard retains the upstream pointer gradient and focus behavior. Its wrapper imposes only positioning and overflow, so existing card layout, padding and colors come from the caller. Its default spotlight follows the preview blue token; it accepts any CSS color string and normal div attributes, chaining caller events. The decorative overlay is hidden from screen readers and disabled for reduced motion and non-hover/coarse-pointer devices. Its fade is shortened to 200ms.
- AnimatedContent retains the GSAP and ScrollTrigger entrance API. It skips motion when requested by the operating system, leaves content visible before JavaScript runs, and removes its own tweens and inline transforms on cleanup.
- LogoLoop moves its three animation and observation hooks into logo-loop-hooks.ts to keep the component readable. It retains the upstream looping, resize and custom-render APIs. It uses the existing class merge helper, TypeScript union narrowing instead of unchecked any casts, the page background for fade edges, and live reduced-motion updates. Duplicate lists are inert to avoid repeated keyboard stops. Reduced-motion CSS shows one wrapping list so every logo remains readable.

The original CLI-viewed source is also retained in ../../../free-catalog/candidates.json.

## Catalog composition reset imports

Installed on September 30, 2026 with `pnpm dlx shadcn@latest add` against the official free registry, then moved unchanged into this directory before the adaptations below:

- MagicBento: https://reactbits.dev/r/MagicBento-TS-TW.json
- Stack: https://reactbits.dev/r/Stack-TS-TW.json
- ScrollStack: https://reactbits.dev/r/ScrollStack-TS-TW.json
- ThoughtLine: https://reactbits.dev/r/ThoughtLine-TS-TW.json
- StatusMark: https://reactbits.dev/r/StatusMark-TS-TW.json
- RubberSegment: https://reactbits.dev/r/RubberSegment-TS-TW.json
- FolderFloat: https://reactbits.dev/r/FolderFloat-TS-TW.json
- BranchedMenu: https://reactbits.dev/r/BranchedMenu-TS-TW.json
- AccordionGallery: https://reactbits.dev/r/AccordionGallery-TS-TW.json

These share the license recorded above. Registry source inspected before installation remains in ../../../free-catalog/composition-source-view.json. Every import has a license pointer in its source header and a data-react-bits marker. Installing an import does not mean a page uses it.

### Exact adaptations

- MagicBento adds an optional `items` array of `{ id?, content: ReactNode, className?, color? }` and root `className`. It keeps the vendor four-column desktop grid and original asymmetric third, fourth and sixth tile spans, two-column intermediate layout and single-column mobile layout. Caller content has natural height rather than the demo aspect ratio. The original global spotlight radius, distance falloff, pointer-relative border geometry, GSAP tilt/magnetism/ripple and optional particle mechanics remain. Card queries and asymmetric selectors use `mb-card` instead of the generic `card` class to avoid the earlier preview's CSS. Background/text/border defaults now use the preview surface/ink/line tokens, and the glow defaults to blue. Demo-only clipping, stars, click ripples and magnetism default off. The shared particle wrapper now owns all event cleanup even when stars are disabled, removing the vendor's duplicate callback-ref listeners. Motion is skipped on mobile and for a live reduced-motion preference.
- AccordionGallery retains the source panel flex-grow calculation, GSAP panel sizing, media parallax, tilt, grayscale and text-bar transitions. `image` becomes optional and an optional `content: ReactNode` slot holds real story evidence. A short panel label is a native selection button; it supports click/focus, arrows and Home/End with focus following selection. Only the selected desktop content is exposed. At 699px and below all panels stack with natural height and all content exposed. Reduced motion is observed live and disables panel tween duration and tilt. Optional report links render as ordinary links inside the content, avoiding a clickable container around nested controls. The gallery now uses the shared surface/ink tokens instead of the hard-coded violet demo background.
- Stack retains CardRotate's drag sensitivity, spring, rotation and relative scale progression. It adds `currentIndex`, `onIndexChange`, root `className`, `keyboardAdvance` and `ariaLabel`. The selected source is the top card, starting at index zero. Parent control and keyboard arrows/Enter/Space can advance a source and synchronize adjacent synthesis. Rear cards are inert. Demo images are removed when no cards are supplied. Optional random rotation is stable per source rather than changing each render. Reduced motion disables autoplay and displays only the selected card without drag or animated stacking.
- ScrollStack retains the original per-card trigger, scale interpolation, stack-distance, rotation, blur, transform cache and Lenis scroll driver. It defaults to window scrolling. Card height and padding become caller-owned; the vendor's `h-80`, entrance `20vh`, `50rem` bottom spacer and full-screen minimum are removed. Card and end-marker queries stay inside the current component. Card positions are measured before transforms so the source window-offset calculation cannot accumulate its own translation. Resize observation refreshes measurements. Pin release derives from the actual last marker and card height; it no longer depends on a fabricated large spacer. Cleanup removes applied transforms/margins, and mobile or reduced-motion use a plain vertical list with native scrolling. The loose transform cache type is replaced with the actual numeric shape.
- RubberSegment retains the vendor pointer drag, elastic thumb, controlled value, radiogroup semantics and reduced-motion jump behavior. Focused buttons now commit on Space/Enter, and arrow/Home/End selection uses the same thumb travel as pointer selection unless reduced motion is requested. Pointer activation is still owned by the original pointer handler, avoiding a second click commit.
- ThoughtLine retains its vendor content/status API and motion. It defines the missing settled-label and timer opacity variables as 0.75 and 0.55, fixing the imported source's invisible settled label. Its default color uses the shared foreground token with an explicit fallback, so shimmer text does not resolve `currentColor` from its own transparent text. StatusMark, FolderFloat and BranchedMenu retain their vendor APIs and motion. Source-license pointers, data markers and formatting were also added. They are available where a useful composition calls for them; none is automatically mounted.

### Stock inbox primitives

The isolated preview also installed the actual free Mira `sidebar` registry component through `pnpm dlx shadcn@latest add sidebar --yes`, from https://ui.shadcn.com/r/styles/radix-mira/sidebar.json. It brought Sidebar, Input, Sheet, Skeleton and the `use-mobile` hook. Existing Button, Separator and Tooltip were kept through explicit no-overwrite answers. The primitive APIs and behavior remain stock; formatting matches the workspace. The Reading Room worker composes the source-verified sidebar-09 inbox structure with these primitives.

Runtime dependencies installed by the free source are Lenis, Matter.js and Hugeicons, with Matter.js types added for the isolated site's strict typecheck. Motion remains on the preview's pre-existing v13 major after the registry installer requested v12. These are underlying dependencies rather than additional component catalogs.

ScrollStack reads and subscribes directly to the browser reduced-motion media query, including changes after hydration, so it reliably removes the scrolling engine and renders a plain list.
