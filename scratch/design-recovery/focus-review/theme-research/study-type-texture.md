# Study: typography and texture as separation (dark on dark)

Lens: how Linear and Supabase separate things with text and non-color texture, and how our rejected feed and landing differ. Mechanisms only, no palette proposal.

Evidence tags used throughout:

- **[M]** measured: `getComputedStyle` on live pages (headless agent-browser, 1440x900, 2026-10-01), or values read from our source.
- **[P]** pixel-sampled from an image (owner screenshots or our renders). Text colors from images are estimates: the brightest 3% of glyph pixels, which reads slightly darker than the true color on small text because of anti-aliasing.
- **[S]** seen in an image, not measured.
- **[I]** inferred.

Owner screenshots are about 2000px wide captures of roughly 1440px pages, so image pixel sizes run about 1.39x the CSS sizes. New captures: `refs/tt-linear-home.png`, `refs/tt-supabase-home.png`, `refs/tt-supabase-docs-fold.png`. The Supabase dashboard (owner-1, owner-3) needs a login, so dashboard values are pixel samples. Supabase Docs stands in as a public proxy for the dashboard's label styles.

Our source: `scratch/design-recovery/site/next/` and `scratch/design-recovery/site/app/(next)/next.css`. The brief's paths `site/next/` and `site/app/(next)/next.css` do not exist at the repo root. This is the source behind the renders.

---

## 1. Text alone: the tier ladders

### Linear (linear.app home, includes the owner-4/5/6 sections) [M]

Page `#08090a`, card `#0f1011`. Inter Variable with font features `"cv01","ss03"` on every text style.

| Tier | Color | Contrast on page / card | Where (char volume on page) |
|---|---|---|---|
| T1 bright | `#f7f8f8` | 18.7 / 17.9 | Headings only: hero 64px/510, section 48px/510, chat input text 13px |
| T2 soft white | `#d0d6e0` | 13.6 / 13.0 | Sub-hero 24px/400 (547c), card titles 12-13px/510, names, sidebar items |
| T3 gray | `#8a8f98` | 6.1 / 5.9 | **The default body text.** 15px/400 is the single largest style on the page (1320c). Nav, "Learn more", descriptions, label chip text |
| T4 dim | `#62666d` | 3.5 / 3.3 | IDs (`ENG-2085` 10px), timestamps, "4 min ago", column counts, mono eyebrows |

- **Bright text is the exception.** The bulk of the copy sits at T3 (6:1). T1 is reserved for headings. A second bright tier, T2, carries titles and names. [M]
- **Each step roughly halves the contrast:** 18.7, 13.6, 6.1, 3.5. Four tiers are clearly distinct. [M]
- **Weights are light and close together:** 300 (chat bodies 15px), 400 body, 510 headings and labels, 590 for author names and panel titles. Headings are 510, not 600 or 700. Hierarchy comes from size and color tier, not boldness. [M]
- **Negative tracking at every size, scaled to size:** -0.011em at 13-15px (-0.13 to -0.165px), -0.012em at 24px, -0.022em at 48-72px. [M]
- **Headings are paired with a T3 continuation in the same size and weight.** "Purpose-built for modern teams with AI w..." is 48px/510 in `#8a8f98` beside 48px/510 in `#f7f8f8`. The heading carries two tones in one line. [M]
- **Sizes cluster tightly in the UI:** 10, 12, 13, 14, 15 for all product UI text. 24, 32, 48, 64, 72 are marketing display sizes only. [M]
- **Monospace is used for two things.** Berkeley Mono 12px uppercase in T4 for eyebrows and dates ("Sep 24, 2026", "Powering the companies..."), and Berkeley Mono 14px for code with syntax colors (`#f7bf8b`, `#f79ce0`, `#ffdf9f`, `#83dcdc`, `#8fa6ff`). Inline code is 12px in a `rgba(255,255,255,0.05)` fill with an 8% border and 4px radius. [M]
- **Numerals:** `tabular-nums lining-nums` on counts, dates and durations ("Worked for 10 sec", "Oct 2025", "1 / 84"). [M]
- **A card holds three text tiers in about 96px** (the kanban issue card, 300x96) [M]:
  - ID: 10px, T4, -0.15px tracking.
  - Title: 12px/510, T2.
  - Chip text: 12px/510, T3.

  The card's text never uses T1.

### Supabase marketing (supabase.com, owner-2) [M]

Page `oklch(0.19 0.0025 157.5)` (about `#131413`), card `oklch(0.215 ...)` (about `#181a19`). Inter for body, Manrope for display.

| Tier | Color | Contrast on page / card | Where |
|---|---|---|---|
| fg | L 0.95 (`#edefee`) | 16.0 / 15.1 | Titles, buttons, nav, **inline strong phrases** |
| light | L 0.798 (`#bcbdbc`) | 9.8 / 9.3 | Secondary links ("View all examples") |
| lighter | L 0.684 (`#989a99`) | 6.5 / 6.2 | **Default body text** (2064c at 15px, 1650c at 14px) |
| brand | L 0.76 C 0.15 green | 9.1 / 8.7 | Second hero line, "More on Security", inline `functions deploy` |

- **The default body is again the gray tier (6.5:1).** [M]
- **Inline emphasis by tier switch inside one sentence.** "Every project is **a full Postgres database**, the world's most trusted..." keeps the paragraph at L 0.684 and sets the `<strong>` phrase at L 0.95, same size (14px) and same weight (450). The rule is literally `[&_strong]:text-foreground`. Sampled from owner-2: muted `#929594` (5.8:1) against strong `#e2e5e4` (13.8:1) on the card. [M][P]
- **The heading and lede trick at section level:** "Best of breed products. Integrated as a platform." is 22px in L 0.684, with "Use one or all." in L 0.95. [M]
- **Weights:** 450 body (a half step above regular), 500 buttons and nav, 600 card titles (16px) and section heads (34px), 500 hero (46px). The hero is not bold. [M]
- **Tracking:** normal on body, -0.16px on the 22px lede. Less tracking work than Linear. [M]

### Supabase dashboard (owner-1, owner-3), pixel estimates [P][S]

Page `#121514`, panel or table `#181a1a`.

| Role | Example | Glyph estimate | Contrast |
|---|---|---|---|
| Page title | "Database Tables", "oparax" | `#edefef` | 16 |
| Value / active | "Healthy", "Tables" (active), "card_versions" | `#dadddc` to `#e8ebea` | 12.8 to 15 |
| Secondary | "Schema Visualizer" (inactive nav), banner body | `#afb1b0` | 8.5 |
| Muted | "No repository connected", sidebar items, "Disabled" | `#8c8f8e` to `#929493` | 5.4 to 6.0 |
| Mono uppercase label | DATABASE MANAGEMENT, NAME, COLUMNS, STATUS, API GATEWAY, WARNINGS | `#8c8f8e` to `#b3b5b4` | 5.4 to 8.5 |

- **Label above value is the base unit.** "STATUS" over "Healthy" and "LAST MIGRATION" over "signup_first": a small mono uppercase label sits over a larger sans value. The label is dimmer (8.4:1) and the value is brighter (15:1). One pair needs no box, no divider and no color. [S][P]
- **Empty values drop a tier.** "No repository connected" and "No backups" sit at 6:1, while real values ("Healthy", "signup_first") sit at 15:1. Absence is shown by tone alone. [P]
- **Public proxy (Supabase Docs, same design system):** section labels are Source Code Pro 12px/500, uppercase, letter-spacing 0.6px (0.05em). The "On this page" label is 12px/450 uppercase. [M]
- **Mono uppercase also marks system words:** FREE, PRODUCTION, NANO, PREVIEW, NEW, all as tiny pills. User data (table names, sizes, counts) stays in sans. [S]

### Oparax feed (render `renders-r2/dark/18-page-clustered.png`, source `story-card.tsx`, `feed/parts.tsx`)

Page `#090f1d`, card `#141e31`. Open Sans 300-800.

| Role | Source | Glyph estimate [P] | Contrast |
|---|---|---|---|
| Page title "Your Feed" | 30px/600, tracking-tight | `#f0f4ff` | 17.4 |
| Card title | 20px/600, -0.025em | `#f0f4ff` | 15.2 |
| **Bullet text (the bulk)** | 15px/400, foreground | `#ecf0fc` | **14.6** |
| Free-week body, nav, buttons | 14px foreground | `#e9edf8` | 14.2 to 17.2 |
| Citation "(CNBC)" | 14px muted | `#a5b3ca` | 7.9 |
| "Used 2 sources", aside fine print | 12px muted | `#9ca9c1` | 6.8 to 7.0 |
| View hint, preview note | 14px / 12px muted | `#a3b1c9` | 8.2 to 8.8 |

- **There are two tiers, not four.** The foreground sits at 14 to 17:1 and the muted tier at 7 to 9:1. No dim tier near 3.5:1 exists, so metadata cannot recede below the citations. [M][P]
- **Hierarchy runs inverted to the references.** The body copy (the bullet facts) is set at the brightest tier, so nearly every line on the card is bright. The references set their body at about 6:1 and reserve brightness for a few words. [M][P][I]
- **Headings separate from body only by size and 600 weight.** Title (20/600) and bullets (15/400) share nearly the same color (15.2 against 14.6). The references separate them by tier. [M]
- **No monospace, uppercase labels, inline emphasis, or tabular numerals on the feed.** Tracking applies only to headings (-0.025em); body tracking is normal. [M from source]
- **The muted tier is blue-tinted:** `#a8b6ce` = oklch(0.773 0.038 261). Linear's T3 has chroma 0.015 and Supabase's 0.003. [M]

### Oparax landing (render `renders-r3/dark/01-landing.png`, `landing/hero.tsx`) [M from source][S]

- **Hero:** 48px/600, -0.025em, centered. The 18px lede in muted is centered too.
- **Linear's hero** is 64px/510 and left-aligned. Its lede is 15px gray, set far below the heading and paired with a right-aligned "New Loops" link.
- **Section heads** ("How It Works", "Roadmap", "Pick your pace") are all 30px/600, with nothing above them. No eyebrow labels or mono anywhere. Pricing numbers are 30px/600 with `tabular-nums` only in one column.

---

## 2. Named text mechanisms (what the owner is likely picking up on)

1. **Gray body, bright accents.** Default reading text sits near 6:1. Brightness at about 16:1 is spent on headings, names, values and a few strong phrases, so the eye lands on those first. [M] Ours spends brightness on everything. [M]
2. **Four-step tone ladder with roughly halving contrast** (Linear 18.7 / 13.6 / 6.1 / 3.5). A dim fourth tier lets IDs, times and counts exist without competing. [M]
3. **Two tones inside one line.** Linear's 48px heading continues in gray. Supabase bolds a phrase by brightness, not weight. This creates emphasis without color or boldness. [M]
4. **Mono uppercase micro labels for system words:** 12px, tracked about 0.05em, dim. They label ("STATUS", "NAME", dates, environment pills) while user content stays in sans. The type family itself says "this is machinery, not content". [M][S]
5. **Label over value pairs** replace boxes and dividers in the Supabase overview. [S]
6. **Light, close weights** (400/450/510/590, or 450/500/600). Linear headings are 510. Ours are 600 throughout. [M]
7. **Size-scaled negative tracking with stylistic alternates** (Linear) gives Inter its tight, engineered texture. Ours has normal tracking on body and a single -0.025em on headings. [M]
8. **Tabular numerals** on every count and time, so numbers align and read as data. [M]

---

## 3. Texture without color

### Borders and hairlines

- **Linear [M]:**
  - Almost every border is `1px rgba(255,255,255,0.08)`, a translucent white, not a fixed hex. It composites to `#222324` on cards and `#1c1d1e` on the page, about 1.21:1 against the card. The same token works on every surface.
  - A stronger 12% variant is used sparingly, on 5 elements.
  - The header bottom is the same 8% line with `backdrop-filter: blur(20px)`.
- **Linear inner hairlines as inset shadows [M]:**
  - `rgba(255,255,255,0.08) 0 0 0 0.5px inset` (5 uses)
  - `rgba(255,255,255,0.05) 0 0 0 1px inset` (4 uses)
  - `rgba(0,0,0,0.2) 0 0 12px inset` (7 uses), an inner shade that darkens panel edges
  - `rgba(0,0,0,0.2) 0 0 0 1px` (8 uses), a dark outer hairline outside the light one

  The light inner line and dark outer line make a bevel at about 1px.
- **Supabase marketing, gradient border [M]:**
  - Feature cards are a 1px-padding wrapper whose background is `linear-gradient(L0.95 at 7.5% alpha, card color)` from top to bottom, with the card inset 1px inside it.
  - The border is brightest at the top edge (`#262828` sampled on owner-2) and fades to nothing at the bottom. It reads as light falling from above. [P]
  - Ordinary borders use the same 7.5% alpha light. Pills use 13.5%.
- **Supabase dashboard [P][S]:**
  - Table rows are separated by a 1px `#202322` line on a `#181a1a` panel, about 1.1:1. There is no zebra striping.
  - The header row is lifted by 1 to 2 lightness steps (`#1a1d1c`).
  - The sidebar and page share one color (`#121514`), split only by a vertical hairline. The active nav item is a soft fill (`#1d1f1e` to `#2d2f2f`), not a border or an accent color.
- **Oparax [M]:**
  - Borders are a solid `#2a3952` (oklch 0.343 0.048 260), about 1.43:1 against the card. That is the most visible border of the three, and it is blue.
  - The card shadow uses `rgb(9 15 29)`, the page color itself, so on dark it is invisible. The box is defined only by the bright blue border and the lifted fill.

### Surface lift

- **Card against page contrast:** Linear 1.05, Supabase 1.06, Oparax 1.15. [M] Our cards stand about three times further off the page.
- Linear and Supabase cards are barely lighter than the page and lean on the hairline. Ours combine a strong lift with a strong border, so every story is a heavy box. [M][I]
- **Neutral chroma:** Linear surfaces 0.003 to 0.005, Supabase 0.003 to 0.005, Oparax 0.031 to 0.048 at hue about 263. [M] The surfaces, border, muted text and primary all share one hue, so the whole render reads as two colors: navy and blue-white. [I]

### Radius ladder

- **Linear [M]:**
  - 12px for the outer product frame and large panels. The frame has an 8px pad.
  - 9px for kanban cards, 8px for nav items and buttons, 4px for inline code, and 9999px for chips and the main buttons.
  - Nested radii step down as the containers nest.
- **Supabase [M]:**
  - Panels are 16px outer and 15px inner, a pair that makes the gradient border exactly 1px.
  - Most controls are about 10.7px, small items 5.3px, buttons 8 to 9px, and pills are full.
- **Oparax [M from source]:** card 14px (rounded-xl), switch 10/8px, buttons 8px, marks full. The ladder is similar to the references, so **radius is not the gap**.

### Icon tiles, marks and dots

- **Supabase overview [P][S]:**
  - Every stat has a square icon tile about 48px (CSS). Each tile is filled `#181a1a`, has a 1px border and holds a 16px stroke icon in mid gray.
  - The only box on the row goes around the icon, not around the content. Label and value sit on the bare page.
  - "Healthy" is a 3x2 grid of small green dots inside the tile. That is the only green in the row.
- **Linear [M]:**
  - Label chips are pills with an 8% border, no fill, a **7px colored dot**, and 12px/510 gray text. Measured dots: red `#eb5757`, blue `#4ea7fc`, green `#27a644`.
  - Color lives only in the 7px dot and status icons (yellow "In Progress" ring), never in the text or the surface. This is the owner's "yellow, blue, green and red in the relevant location".
  - Icons are 14px (93 uses) and 16px (40 uses), sitting at text size.
- **Supabase metrics [S]:** WARNINGS has a yellow dot and ERRORS a red dot, beside dim mono uppercase labels. It is the same "color only on a dot" rule.
- **Logos [S][I]:**
  - The GitHub mark on supabase.com is drawn solid at text size in the bright tier, beside a gray "111K" count.
  - Ours: a 10px glyph inside a 20px bordered circle, `ItemMark` in `story-card.tsx`, so the logo is small relative to its container. [M]
  - The owner's "GitHub logo is pretty clear" likely reflects a bright solid mark, at text size, with no container.

### Dividers

- Linear's thread header uses a dark 1px shadow line, `rgba(0,0,0,0.4) 0 1px 0`, instead of a light border. Dark lines carve and light lines rim. [M]
- Supabase uses light alpha lines for row and section dividers. [M]
- Ours: one `border-t border-border` above "Used N sources", the same blue hairline as the card edge. [M]

### Fades, masks, glows, gradients, noise

- **Linear masks [M]:**
  - Radial masks of 200px at a corner fade large illustrations to transparency: `radial-gradient(200px at 0% 0%, black, 0.6, 0.2, transparent 70%)`.
  - Linear masks fade the kanban board out to the right and bottom (`to left, transparent 0, black 560px`; `to top, transparent 0, black 300px`).
  - In owner-5/6 the "Done" column and the lowest rows dissolve into the page. [S] The product image has no hard edge on two sides.
- **Linear glow [M]:**
  - "edgeGlow" `::before` draws `radial-gradient(50% 50% at 100% 0, rgba(255,255,255,0.03) ...)`, a 3% white bloom in one corner of panels.
  - Some boxes carry an SVG background: a blurred, rotated light capsule at 22% opacity on `#1C1D1E`, a soft light leak.
  - The hero section uses a vertical `linear-gradient(#08090a 10%, #d0d6e0 100%)` under a radial darkening mask.
- **Supabase [M]:**
  - Buttons carry `linear-gradient(rgba(255,255,255,0.016), rgba(0,0,0,0.01))`, an almost subliminal top-light bevel, plus a 12% white inset ring.
  - The hero grid is masked: `linear-gradient(black 50%, transparent)` with a side fade, and a `radial-gradient(70% 80%, black 25%, transparent 75%)`.
  - Card illustrations fade with `linear-gradient(to top, transparent 50%, card 85%)`.
  - Owner-3's overview shows a **dotted-grid background** behind the database card. Owner-2's banner uses green mono bracket glyphs as texture. [S]
- **Noise:** neither site has noise. Linear has zero `feTurbulence` elements and no noise images; Supabase showed none in computed backgrounds. Their "life" comes from fades, corner blooms and masked imagery, not grain. [M]
- **Oparax [M from source]:** the feed and the landing hero have no gradients, masks, glows, inner borders, or fades. The only effect is the header's `backdrop-blur-md`. `--glow-1..3` exist in `next.css` but no feed or landing component uses them.

---

## 4. Side by side, applied to the feed card

| Mechanism | Linear / Supabase | Our feed card |
|---|---|---|
| Body text tier | gray, about 6:1 | bright, 14.6:1 |
| Bright text used for | headings, names, values, strong phrases | everything |
| Number of tiers | 4 (Linear), 3 plus brand (Supabase) | 2 |
| Dim tier for metadata (about 3.5:1) | yes | no |
| Heading weight | 510 / 500-600 | 600 |
| Inline emphasis | brightness switch, same weight | none |
| System labels | mono 12px uppercase, tracked 0.05em, dim | none |
| Numerals | tabular | proportional |
| Border | 1px white at 7.5-8% alpha, about 1.2:1, neutral | solid blue `#2a3952`, 1.43:1 |
| Card lift over page | 1.05-1.06 | 1.15 |
| Surface chroma | about 0.004 | 0.03-0.05, hue 263 |
| Color placement | 6-7px dots, status icons, one CTA | primary blue on buttons and active citations; no small colored marks |
| Edges | gradient-lit top border, inset hairlines, corner bloom, masked fades | flat box, invisible shadow |
| Texture | dot grid, glyph strips, light-leak SVGs; no noise | none |
| Containers | few; label/value pairs and icon tiles on bare page | every story and every aside block is a full box |

## 5. What this implies for a feed render (mechanisms, not palettes) [I]

- Set the bullet facts at the gray body tier. Raise only the headline, the key noun phrase or number per fact (Supabase's strong-by-brightness), and the source names.
- Add a dim fourth tier for timestamps, counts and "Used N sources".
- Introduce one mono uppercase label style for system words (for example the story's time, the source count, the alert state) at 12px, tracked about 0.05em, dim. Keep user content in sans.
- Lighten heading weight toward about 500. Add size-scaled negative tracking to body sizes, and tabular numerals to times and counts.
- Swap the solid border for a translucent light hairline at about 1.2:1. Drop the card lift toward about 1.05. Optionally make the top edge brighter than the bottom (Supabase gradient border) or add an inset light hairline over a dark outer one (Linear bevel).
- Put color only on small marks with meaning: a 6-7px dot per source kind or story state, solid bright source logos at text size, one accent CTA. Never tint text or surfaces with it.
- Reduce boxes: the aside "Alerts on X" and free-week blocks could be label/value pairs with an icon tile on the bare page, as in Supabase's overview.
- For "life" without color: a corner bloom (about 3% white radial) on the top story, and a masked fade where the feed or the landing preview runs off the edge. Avoid noise; neither reference uses it.

These are mechanism candidates for the host to name and test. The palette question is separate.
