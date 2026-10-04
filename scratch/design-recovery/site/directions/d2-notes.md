# Direction 2: Visual story edition

This is a free source adaptation for the comparison preview. The whole gallery and its image-first reading rhythm come from the actual free React Bits Portfolio template, rather than a locally invented effect presented as a catalog block. Oparax's source strip, synthesis and delivery composition are our own adaptation around it. It is not an installed Pro marketing or Application UI block.

## Source and permission

- Upstream: [DavidHDev/rbp-portfolio](https://github.com/DavidHDev/rbp-portfolio).
- Inspected commit: `1581b9b8e5876f60e5eb844970747506980c4412`, September 30, 2026.
- Primary section: [`components/projects/projects.tsx`](https://github.com/DavidHDev/rbp-portfolio/blob/1581b9b8e5876f60e5eb844970747506980c4412/components/projects/projects.tsx).
- Entrance helper: [`components/ui/motion-primitives.tsx`](https://github.com/DavidHDev/rbp-portfolio/blob/1581b9b8e5876f60e5eb844970747506980c4412/components/ui/motion-primitives.tsx).
- Also inspected the actual [`components/hero/hero.tsx`](https://github.com/DavidHDev/rbp-portfolio/blob/1581b9b8e5876f60e5eb844970747506980c4412/components/hero/hero.tsx), to understand the template's complete page pattern.
- The upstream README's License section explicitly permits personal and commercial projects and prohibits resale or redistribution of the template itself. GitHub's API returns no machine-classified license. This preview contains the relevant locally adapted section, not a redistributed copy of the complete template.
- Upstream Dribbble project images and portfolio content are intentionally excluded. The only photo is the existing licensed NASA launch asset already in this preview. Existing publisher favicons and the official NASA X avatar retain their existing provenance under `public/examples/`.

## Source retained and adaptations

`d2-portfolio-gallery.tsx` adapts the Projects section's two-column gallery, `break-inside: avoid` reading items, rounded inset media, title/description/content/meta order, and the FadeIn helper's `[0.22, 1, 0.36, 1]` easing with opacity and 12px movement. The image zoom behavior follows the template's documented project-card treatment. The helper respects reduced motion and animates the gallery as one composition, rather than repeating an entrance on every reading tile.

The portfolio's hardcoded project list is replaced with Oparax's existing historical `stories` and `directItems`. Its JSX card shell becomes the existing stock shadcn Card, CardContent, CardHeader, CardTitle, CardDescription and CardFooter. Buttons and badges are also stock shadcn. No Pro source, alternate component vendor, external image or new dependency is used.

The landing adapts the same source-derived image/card structure into an asymmetric edition. Original reports appear once in the source strip, the large picture-led card is Oparax's synthesis, and the companion is an authentic black X message. The feed uses the adapted two-column gallery in both Direct and Clustered modes. Direct prioritizes the existing photo report, followed by each remaining single-source synthesis. Clustered keeps each multi-source story with its original reports once.

## Original composition and visual identity

The source strip, causal Sources -> Oparax -> Delivery arrangement, X companion and feed data mapping are Oparax-specific composition. Manrope, an oversized compact headline, white paper, cobalt and ink distinguish this direction. Dark mode uses ink-black and soft cobalt. Local Manrope and its OFL record already exist under `public/fonts/`.

Pricing and the roadmap reuse shared sections once. Direction-scoped styles give those sections the same bright edition treatment without changing product prices, promises or production design tokens. The historic NASA/ESA content is clearly labeled sample feed material, not the subject of Oparax's brand.

No product app build or server was run by this worker. The host owns the comparison build and off-screen visual verification. Responsive rules cover a 390px viewport; keyboard focus uses the shared visible focus ring; reduced motion removes image zoom and the motion helper's initial displacement.
