# Linear, page by page: what the owner is picking up on

Lens: Linear only. Captured headless (agent-browser, 1440x900, October 1 2026) and measured with `getComputedStyle`; pixel statistics from the screenshots with Pillow. Owner screenshots owner-4/5/6 were read and matched to live pages.

Evidence key: **[M]** measured from computed styles or pixels, **[S]** seen in a screenshot, **[I]** my inference.

Screenshots (all in `refs/`): `linear-home-fold.png`, `linear-home-y{900,1700,2600,3300,3900,4600,5150,5800,6400,7100,7650,8300,9000}.png`, `linear-home-full.png`, `linear-intake-fold.png`, `linear-intake-y{900,1800,2600,3600,4600,5400,6300,7700,9800}.png`, `linear-features-y{0,900,1800,2700,3600}.png`, `linear-pricing-y{0,900,1800,2700,3600}.png`, `linear-method-y{0,900,1800,2700,3600}.png`.

Owner-5 and owner-6 are not linear.app/intake. They are the "Intake and integrations" section of the homepage (h2 at y=2674), identical copy and layout [S][M]. I captured both that section and the real /intake page.

---

## 0. The shared system (identical on every page)

Linear exposes its tokens as CSS custom properties on `:root`, so these are the real values, not guesses [M].

### Surface ladder (OKLCH L computed from the hex)

| Role | Hex | OKLCH L | Step |
|---|---|---|---|
| `--color-bg-marketing` (rare, deepest) | #010102 | 6.9 | |
| Page (`--color-bg-primary`, level-0) | #08090a | 13.9 | base |
| Panel / app window (level-1) | #0f1011 | 17.2 | +3.3 |
| Card (panel + 2% white overlay) = level-2 | #141516 | 19.5 | +2.3 |
| Floating agent panel / inner bubble | #161718 | 20.4 | +0.9 |
| Composer (panel + 4% white) = level-3 | #191a1b | 21.7 | +1.3 |
| bg-secondary / Slack-thread fill | #1c1c1f / #1c1d1e | 23.0 | +1.3 |
| bg-tertiary, bg-quaternary (hover, pressed) | #232326, #28282c | 25.7, 27.8 | |

- Chroma of every surface is 0.002 to 0.007, essentially pure grey [M]. Surfaces step by only 1 to 3 L units. Contrast of the brightest card against the page is 1.09:1 [M]. Cards are found by their borders, not their fills [I].
- Cards get their lift from a translucent white **overlay** (`linear-gradient(rgba(255,255,255,.02))` on #0f1011), not a new hex [M]. The same rule is used for the 4% composer and the 5% ghost buttons.

### Borders
- Almost always **white at an alpha**, never a fixed grey: 5% (`--color-border-translucent`) for quiet frames, 8% for cards and chips, 12% for floating panels [M]. A fixed alpha reads brighter on brighter surfaces automatically: 8% white over the page gives #1c1d1e (L 23.0); over a panel it gives #222324 (L 25.5); 12% over a panel gives #2c2d2e (L 29.7) [M computed].
- Width is always 1px. The only fixed-hex borders are the full-width 1px section rules and the app-frame inset ring, both #23252a (`--color-border-primary`) [M].
- Header: fixed, 73px, `backdrop-filter: blur(20px)`, 80% black gradient fill, bottom border 1px 8% white [M].

### Shadows (sparing, used only for elevation)
- Page-level elements: none.
- Floating panels (the agent chat window): `0 2px 32px rgba(0,0,0,.25)` plus a 12% border [M].
- Cards and bubbles inside a window: a 1px **dark** outer ring `0 0 0 1px rgba(0,0,0,.2)` that separates them from the surface below without a glow [M].
- Ghost buttons: `inset 0 0 0 1px rgba(255,255,255,.03)` plus `inset 0 1px 0 rgba(255,255,255,.04)` (a top highlight), with an outer `0 0 0 1px rgba(0,0,0,.6)` [M].
- Elevation rule [I]: a raised element gets three things together: a slightly lighter surface, a brighter border alpha, and (only if it floats) a soft black shadow.

### Text ladder (four greys, slightly cool)
| Token | Hex | L | Contrast on page | Used for |
|---|---|---|---|---|
| text-primary | #f7f8f8 | 97.8 | 18.7 | headlines, issue titles you are reading |
| text-secondary | #d0d6e0 | 87.4 | 13.6 | 24px intro paragraphs, UI labels, card titles |
| text-tertiary | #8a8f98 | 64.9 | 6.1 | body copy, nav, chip text, "Learn more" |
| text-quaternary | #62666d | 50.9 | 3.45 | timestamps, IDs, mono captions, "+" icons |

Text greys carry a faint cool hue (C 0.012 to 0.015 at hue 262) while surfaces are neutral [M]. Logos in the customer strip are pure #ffffff, one step **brighter than headline text** [M pixel]. That is why logos read so clearly against the page [I]. The owner made the same point about GitHub on Supabase.

### Typography
- Inter Variable with `font-feature-settings: "cv01","ss03"`. Mono is Berkeley Mono. Serif (Tiempos Headline) appears only on /method [M].
- Weights are **510** for display and headings, **590** for UI titles, **400** for body, and 300 in chat bubbles. 600 and 700 are never used [M]. The heavy look comes from size and tight tracking, not weight [I].
- Scale and tracking [M]:
  - Hero h1: 64px/510, line height 1.0, letter spacing -0.022em (-1.408px). The /intake h1 is 72/500 and the CTA h2 is 72/510 (-1.584px).
  - Section h2: 48px/510, line height 1.0, -0.022em.
  - Intro paragraph beside the h2: 24px/400 #d0d6e0, line height 1.33, -0.012em.
  - Marketing body: 15px/400 #8a8f98, line height 1.6, -0.011em. Features and method ledes are 17px/400, line height 1.6.
  - UI tier (inside mockups and the footer): 13px/400 to 510, 12px meta, 10 to 11px IDs, normal tracking.
  - Small-label tier: 12px Berkeley Mono, uppercase, #62666d ("POWERING THE COMPANIES...", "FIG 0.1", changelog dates "SEP 24, 2026") [M].
- **Two-tone headline**: in "A new species of product tool. Purpose-built for...", the first sentence is #f7f8f8 and the rest #8a8f98, at the same 48px [M]. Emphasis comes from lightness, not color or weight.

### Buttons and links
- Primary: pill (radius 9999), fill #e5e5e6, text #08090a 13px/510, 32px tall in the nav and 40 to 44px elsewhere [M]. The primary action is a **light grey pill, not a colored one**.
- Secondary: pill, 5% white fill with an inset hairline, white text [M].
- Links ("Learn more →", "Customer stories →"): #8a8f98 15 to 16px with an arrow glyph; no color and no underline [M].
- Nav: 13px/400 #8a8f98; the active page (Pricing) is lighter [S].

### Accent and semantic palette (tokens on `:root`)
| Token | Hex | L | C | Where it appears |
|---|---|---|---|---|
| indigo brand | #5e6ad2 | 56.7 | 0.159 | send button, toggles, PR icon, focus ring, @mention |
| accent / link | #7170ff / #828fff | 62 / 69 | 0.21 / 0.16 | defined, barely visible on marketing |
| yellow | #f0bf00 | 82.5 | 0.169 | "In Progress" status, favorite star |
| orange | #fc7840 | 71.9 | 0.176 | "Triage" status, Urgent priority |
| red | #eb5757 | 65.3 | 0.183 | "Bug" label dot, overdue milestone, removed diff lines |
| green | #27a644 | 63.7 | 0.175 | PR linked or merged, "In Review", "Performance" label, added diff lines |
| blue | #4ea7fc | 71.2 | 0.151 | "Design" label dot |
| teal | #00b8cc | 71.6 | 0.123 | project icon, chart series |
| plan green / build gold | #68cc58 / #d4b144 | 76 / 77 | 0.18 / 0.13 | product-area tags on /features |

[M] All accents sit in a narrow band: L 57 to 83, chroma 0.12 to 0.21. Every hue is roughly equally loud, and each is 5:1 to 11:1 against the page. [I] Because the greys have almost zero chroma, any one of these hues is the most saturated thing in its neighborhood, even at 7px.

### How much color is on screen (pixel measure) Share of pixels with RGB spread above 40, header excluded [M]:
- Product sections on the homepage and /intake: **0.02% to 0.9%**. The owner's own screenshots measure 0.03% (owner-4), 0.06% (owner-5) and 0.15% (owner-6).
- /method and /pricing: **0.0% to 0.07%**.
- The only screens above 1%: the customer testimonial band, at **11% to 16%**.
- Median pixel luma on every product screen is about 9 (the page color). 90% or more of pixels are darker than luma 30.

[I] Color is roughly 1/200th of the screen, but it sits on exactly the elements that carry state, so the eye finds it at once.

---

## 1. linear.app (homepage)

**First screen** [S][M]:
- Nav: logo left; seven 13px grey links; a 1px separator; Log in; white "Sign up" pill.
- Hero h1: 64px, two lines, **left-aligned**, starting y=272, 1280px content width (80px gutters at 1440).
- One 15px grey subline, with "New  Loops →" right-aligned on the same baseline.
- The product mockup starts at y=527, so only its top ~370px is visible in the fold. It is 1320x720 (92% of viewport width, 80% of its height), radius 12, border 1px 8% white.
- No eyebrow, no badge, no gradient text, no illustration.

**The hero mockup (Linear's UI inside the landing page)** [M][S]:
- Two-pane window:
  - Sidebar #090a0b: items 13px/510 #d0d6e0 at 30px rows, section labels 12px/510 #62666d.
  - Main pane: 1% white overlay, 5% border, a 2px outer ring of rgba(0,0,0,.2).
- Issue view: title 20px/590 #d0d6e0; body 14px/400 #8a8f98; inline code chip with 5% white fill, 8% border, radius 4; activity rows 12px #62666d with 14px avatars.
- Floating agent panel: 400x520, #161718, 12% border, radius 12, shadow `0 2px 32px rgba(0,0,0,.25)`, overlapping the issue pane at the bottom right. The prompt bubble is #161718 plus 4% white.
- Round icon buttons: 28px, 2% white fill, 5% inset ring.
- Behind the window, a full-bleed 1416x768 backdrop: `linear-gradient(#08090a 10%, #d0d6e0 100%)` under a radial darkening. This produces a grey "floor light" glowing up from below the window (seen in y900: up to #7e8287 at center, falling to #464a4c at the edges) [M pixel].
- `mask-image` radial gradients (200px at the top-left corners) make the window's top-left edge catch light and fade out [M].
- Color in the fold: the yellow In Progress icon (3 times), a yellow favorite star, and the indigo PR "Revert" icon. That is **about 5 colored glyphs, all 12 to 16px** [M].

**Sequence on scroll** [M y positions]:
1. Mockup finishes, floor glow ends.
2. Logo strip: 7 customer logos in pure white, one row, with a 12px mono uppercase caption below.
3. Two-tone 48px statement (y=1596).
4. Three columns "FIG 0.1/0.2/0.3": thin grey isometric line drawings, 15px/510 #d0d6e0 titles, 15px grey bodies, 1px vertical rules. Zero color.
5. Four product chapters, roughly 1240px apart: Intake (2674), Planning (3910), AI (5149), Build (6391). Each uses the **same template**:
   - h2 48px left, two lines;
   - 24px #d0d6e0 paragraph in the right half;
   - "Learn more →";
   - a 600 to 630px mockup that bleeds past the content edges and is masked to transparent (300px fade at the bottom, 400 to 600px fades at the sides);
   - a "Features" row of 15px grey links with "+";
   - a full-width 1px #23252a rule.
6. Changelog (7644): 4 columns on a thin timeline. The newest dot is **red**, the others grey. 15px/510 titles, 15px grey excerpts, mono dates.
7. Testimonials (~8200): two large cards, radius 6, in **the customer's brand color**: OpenAI pale-blue gradient (#b2d5ff + 40% white), Ramp lime #e4f222. Dark 24px text, customer logo at the bottom left.
8. Stat line: "40,000" in 510 #d0d6e0 inside 15px grey text.
9. Centered 72px "Built for the future. Available today." with a light primary pill and a ghost secondary pill.
10. Six-column footer, 13px: headers 510 #f7f8f8, links 400 #8a8f98.

**Section-by-section color inside the mockups** [M][S]:
- *Intake* (owner-5/6): Kanban columns Backlog / Todo / In Progress / Done.
  - Column status icons: grey circle; yellow half circle; indigo check (faded).
  - Issue cards: 300x96, #0f1011 + 2%, border 8%, radius 9, padding 8/10/12/12, 8px gap. ID 10px #62666d, title 12px/510 #d0d6e0.
  - Label chips are neutral pills (transparent, 1px 8% border, 12px/510 #8a8f98). **Only a 7px dot carries hue**: red Bug, blue Design, green Performance.
  - PR chips: green branch icon plus number. Priority: grey bar glyph. Avatars: 14px photos.
  - Slack-style thread panel: 36px photo avatars, 15px/300 text. The single indigo element is the send button (#5e6ad2 with a 3px 40% indigo ring) and the "@Linear" mention (15% indigo fill).
  - About **15 to 20 colored marks, each 7 to 14px**, across 1440x900.
- *Planning*: roadmap with project icons (teal, yellow, green) and milestone diamonds. The one red mark is a late milestone: a red dashed bar with a 20% red gradient. Teal dots plot the chart.
- *AI*: four agent windows (#0f1011, 12% border, radius 12, 32px shadow). Color is limited to one orange triage glyph, one yellow In Progress glyph and tool logos (Cursor, ChatPRD).
- *Build*: grouped list (In Review green, In Progress yellow, Todo grey circles, 40px rows) beside a code diff: red tint on removed lines, green tint on added lines, muted syntax colors.

---

## 2. linear.app/intake

- **Hero** [S]: the backdrop is the product itself, a Kanban board **blurred, tilted in perspective and dimmed**, with issue titles and a few colored dots (green Performance, blue iOS, yellow) still faintly readable. On top: a small 16px "Intake and integrations" breadcrumb, then a 72px/500 headline bottom-left. A 1px rule closes the hero [M]. [I] The product is ambient texture before it becomes a demo.
- **Stages** [M][S]: each chapter's mockup sits on a 1344x940 raster "stage", radius 8, lit from the **top center**. Pixels go from #7a8084 (L 60) at top center down to #131415 at the bottom corners. The app window inside is 1120px wide, #0f1011 + 1% white, 5% border, top radius 12, with the bottom cut off. [I] This is a photographic studio spotlight: the only large bright area on the page is grey light, not color.
- **Mockup composition** [S]: two or three windows overlap with stepped offsets (thread panel behind, issue view in front; three customer cards fanned like a hand). Front windows are slightly lighter and higher.
- **Feature grids** [M][S]: 1344-wide bordered container (1px 8% white, radius 8) split into 2 columns by internal 1px rules. Each cell holds a small vignette (a composer, a routing diagram, possible duplicates, a rule builder) floating in empty dark space, with a 15px/510 white title and a 15px grey description at the bottom. Integration logos (Zendesk, Intercom, Salesforce and others) are rendered **grey on dark keycaps**, matching the `--icon-grayscale-image-filter: grayscale(100%) brightness(400%)` token. Third-party brand color is removed.
- **Where color appears on /intake** [S]:
  - Triage view: one orange triage icon; a red Bug dot; an indigo phone icon on the iOS suggestion; a yellow duplicate status.
  - Customer cards: each customer's **logo is its own brand color** (Unreal green, XMP purple, ACME orange). That is the identity marker, while all the data around it stays grey. A tiny orange triangle flags the high-priority item.
  - Rule builder: a single orange "!" Urgent square.
  - Asks form: an indigo app icon.
  - End: testimonials again in brand colors (Scale near-white, Clay lavender).

## 3. linear.app/features

- **Hero** [S]: a grid of dark rounded "keycap" icons (about 96px, radius ~20, grey glyphs, fading out at the edges) around one raised, brighter Linear app icon. A centered 64px/510 headline and a 17px grey lede follow. Zero color.
- **Bento cards** [M]:
  - Card: `a` element, #0f1011, radius 16, padding 32/24. The border is drawn by an `::after` at 1px 5% white.
  - Category label: 13px/510 #8a8f98, preceded by a **14x8 colored pill**: Planning #68cc58, Building #d4b144. Other categories use grey labels.
  - Title 15px/510 white; a round 40px chevron button with a 1px #1c1c1f border.
- Visual inside each card [S]:
  - Planning: a grey radial gauge.
  - Building: a yellow area chart (the card's category hue reused as the data color), with a grey comparison line.
  - Insights: a scatter in indigo, yellow and green dots.
  - Mobile: a grey phone. Asks: a grey extruded logo. Security: mono character rain.
- Pixel color share: 0.55% on the busiest screen [M].

## 4. linear.app/pricing

- **No cards at all** [M]. Four plan columns separated by **1px 5% white left rules**. Each column:
  - plan name 24px/590 white;
  - price 17px/510 #d0d6e0 with a grey unit;
  - a 1px 5% divider band holding "Billed yearly" with an indigo toggle;
  - a feature list in 13px #d0d6e0, each row starting with a **filled #d0d6e0 check circle**. Checks are neutral, not green.
- Only one column (Business) has the light primary pill. The others have ghost pills [M]. [I] The recommendation is marked by one bright button, not by a colored or highlighted card.
- Below: the white logo strip again, then a comparison table with a sticky header row and 1px vertical column rules. Excluded features show a grey ×.
- Color on the page: **two indigo toggles (32x20)** and nothing else; 0.07% of pixels [M].

## 5. linear.app/method

- Centered 14px uppercase grey eyebrow, then a **128px/400 serif (Tiempos Headline)** two-line title, then a 17px grey lede [M].
- A large Venn diagram: two **dashed** 1px circles, the intersection hatched with fine diagonal lines, and one bright arc tracing the edge [S].
- Table of contents: 13px/510 uppercase white section heads; 16px grey items; right-aligned mono numbers (2.1, 2.2); dashed dividers [S][M].
- 0.00% colored pixels [M]. [I] Proof that the system holds with no hue at all: interest comes from the type contrast (serif against grotesk, mono numbers) and line work.

---

## 6. Mechanisms, named (what "everything looks different yet similar" is)

1. **Near-black, near-zero-chroma ladder with tiny steps.** Page L 14, panels 17, cards 19.5, raised 21 to 23. "Dark on dark" works because each step is real but small, and because borders, not fills, draw the shapes [M].
2. **Alpha-white hairlines as the main drawing tool.** 5%, 8% and 12% white at 1px. The same rule renders correctly on every surface, so a card in a hero window, a pricing column and a feature cell share one "pen" [M][I].
3. **Hue only on semantic glyphs, at glyph size.** Status icons (yellow in progress, green in review or merged, orange triage, indigo done), label dots (red bug, blue design, green performance), PR icons, priority flags, diff lines. Chips, cards, buttons and links stay neutral; **the colored part is a 7 to 14px mark inside a neutral container** [M]. This is the "yellow, blue, green and red in the relevant location" the owner noticed [I].
4. **Equal-loudness accents.** Every hue is L 57 to 83 and chroma 0.12 to 0.21, so no single color dominates and a board with red, blue, yellow and green dots reads as one family [M][I].
5. **Brand color is almost absent from the chrome.** Indigo appears on a send button, a toggle, a mention and the focus ring, never on nav, headlines, primary CTAs or links. The primary CTA is a light grey pill [M].
6. **Color budget below 1% of pixels per screen**, with one deliberate exception: the testimonial band, where full-bleed color belongs to the customer's identity, not Linear's [M][I].
7. **Lightness, not color, carries emphasis.** A four-step text ladder; two-tone headlines; logos at pure white above headline white; one light pill marking the recommended plan [M].
8. **Real product UI as the hero image, staged with light.** Mockups are live DOM with genuine density (12 to 13px text, 8px gaps, 30 to 40px rows). They sit on a grey spotlight or floor-glow and dissolve into the page through mask gradients rather than ending in a hard box [M].
9. **Density contrast.** Marketing copy is airy (24px intro paragraphs, about 1240px per chapter, 80px gutters). The UI inside is dense. The page feels calm while the product looks capable [M][I].
10. **Photographic avatars and customer logos supply natural color.** Real faces at 14 to 36px and brand-colored customer logos add warmth without adding UI hues [S][I].
11. **Repetition of one chapter template** (h2 left, 24px paragraph right, link, staged mockup, feature links, 1px rule) on every product page. Each page varies only the mockup and the occasional typographic exception (serif on /method) [M][I].
12. **Weight 510 at display sizes with -0.022em tracking, Inter with cv01/ss03 alternates.** Headings look heavy but not bold [M].

### Carry-over notes for a feed render (mechanisms only, no palette) [I]
- Story cards should be found by a 1px alpha-white border on a surface only 2 to 3 L above the page, not by a tinted fill.
- Each card should hold at most a few colored glyphs, and each color should encode one fixed meaning (a story state, a source type, a severity). Each should sit as a dot or icon inside a neutral chip.
- Citations and source logos can be monochrome white (Linear's logo strip) or keep their own color when they mark identity (Linear's customer cards). That choice should be deliberate and the same everywhere.
- The primary action can be a light neutral pill. Accent hue then stays free to mean state.
- The build screen and landing can stage the real feed UI on a grey light source, with masked edges, instead of drawing illustrations.
