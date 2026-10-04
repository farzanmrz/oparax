# Supabase visual study (dashboard and site)

Studied 2026-10-01 for the Oparax feed. Read-only. Mechanisms only, no palette proposal.

## How to read this

- MEASURED: `getComputedStyle` on the live pages in a headless 1440x900 browser, converted to hex by painting the value over the page background on a canvas. Or pixel sampling of the owner's screenshots (owner-1, owner-2, owner-3) on a canvas.
- SOURCE: read from github.com/supabase/supabase (master) or supabase.com/design-system pages.
- SEEN: visible in an image, not measured.
- INFERRED: my reading.

Captures saved in `refs/`: `sb-home-full.png`, `sb-home-fold.png`, `sb-home-cards-row2.png`, `sb-home-cards-hover.png`, `sb-database-full.png`, `sb-database-fold.png`, `sb-pricing-full.png`, `sb-pricing-fold.png`, `sb-design-system-full.png`, `sb-ds-metric-card.png`, `sb-ds-charts.png`. Token-level formulas are already in `supabase.md` in this folder, so this file covers what the pages actually do with them.

Owner screenshot scale: owner-1 and owner-3 are 2000px wide. The top bar is 49px tall in the image, and Studio's header is 48px, so I treat the images as about 1:1 CSS pixels (INFERRED).

## 1. The one-paragraph answer

Supabase is one dark material used everywhere: a near-black page with a faint green tint, cards one small lightness step up, and every edge drawn with the same hairline. That hairline is the text color at about 7.5% alpha. Interactive edges get a stronger hairline, and there are no drop shadows. Text runs in three to four gray levels, and emphasis comes from switching gray levels inside one sentence, not from color. Green is rationed. On the site it marks the primary call to action (a deep, dark plate rather than neon), the logo, one phrase per page, and small "ok/on/healthy" signals. Where the dashboard holds data (the tables list), I counted zero saturated pixels. Amber and red appear only as 6px dots or tinted badges with a word next to them. Illustrations are gray line drawings made from the same parts as the UI (pills, bordered tiles, dashed connectors, mono labels). That is why everything "looks different yet similar": the shapes differ but the material is shared.

## 2. Surface ladder

### Site (MEASURED, supabase.com home, /database, /pricing, /design-system)

| Layer | Value | Step from page | Where |
|---|---|---|---|
| Announcement bar (sunk) | `#0b0e0d` | darker than page | top banner only |
| Page | `#131413` = `oklch(0.19 0.0025 157.5)` | 0 | body, nav, footer, sections |
| Card / surface-100 | `#181a19` | +0.025 L (about +5 per sRGB channel) | product cards, plan cards, metric and chart cards, table body rows |
| Button default / table header | `#191a19` + overlay `linear-gradient(rgba(255,255,255,.016), rgba(0,0,0,.01))` | about +0.03 L | Sign in, Request a demo, Insert, Learn more, table header row |
| Popover / dialog | `#1b1d1c` | +0.0375 L | skip link, menus |
| Inline code bg / surface-200 | `#1a1b1a` | foreground at 3.3% | `<code>` in docs |
| Surface-300 | `#1e201f` | +0.05 L | not seen at scale on these pages |

Notes:
- MEASURED: the site's sections are not filled bands. Sections share the page color and are split by full-bleed 1px rules (`#232423`). Example: the rule at y=1524 above the logo cloud, and on /database the rules above and below the quote band. The quote band itself is a slightly raised panel bounded by vertical hairlines at the 1280 container edges (SEEN).
- MEASURED: on the site, depth is at most two steps (page, then card). Inside a card, sub-elements (chips, pills, mail cells) go back to the page color or stay at card color with a border. They do not stack a third fill.

### Dashboard (MEASURED by pixel sampling owner-1 and owner-3)

| Layer | Value | Where |
|---|---|---|
| Canvas | `#121514` | page, BOTH sidebars, top bar, project overview background |
| Near-flat callout | `#131615` | "Automatically enable RLS" banner: only +1 over canvas, defined almost entirely by its border |
| Raised panel | `#181a1a` | tables list container and rows, assistant chat panel, usage chart cards, stat tiles, "Primary Database" card |
| Selected / button | `#1d1f1e` | selected sidebar row (Database, Tables, Project Overview), "Set up trigger", "Copy" |
| Raised button inside panel | `#202322` | "View columns" inside the table panel (one step above its panel) |
| Sunk input | `#101211` to `#111313` | the chat input sits darker than the panel around it |

Mechanism (INFERRED from the numbers): the step is about +6 in sRGB from canvas to panel, then +5 from panel to selected or button. The sidebars are not a different fill. Navigation sits on the canvas and is separated only by 1px vertical hairlines. The only raised areas are things that hold content (the data table, chat, cards). Navigation is ground, content is raised, and controls go one step further in whichever direction they mean: buttons rise, inputs sink.

## 3. Borders

MEASURED, site:
- Default hairline: 1px, foreground at 7.5% alpha, which becomes `#232423` over the page. It is used on cards, the code panel, table outline, section rules, footer rule, and "Read docs" pills.
- Strong hairline: 1px at 13.5%, which becomes `#303130`. It is used on interactive pills (`$ supabase functions deploy`, the image/file/video tiles in the Storage card, badge default).
- Gradient border on the big product cards: the card is wrapped in a 1px-padded element whose background is `linear-gradient(border-7.5% at top, card color at bottom)`, with radius 16 outside and 15 inside. The border is visible at the top and fades out toward the bottom. This is why the homepage cards look lit from above without any shadow.
- Selected segmented tab ("Table Editor"): page-colored fill with a 1px FOREGROUND border (`#edefee`). Unselected tabs get the default hairline. Selection is shown by border brightness, not color.
- Product sub-nav (/database: Database, Auth, Storage...): the active item has a bright underline and white text, and inactive items are `#989a99`. No color.
- Emphasized plan (Pro, /pricing): 2px border at `#989a99` (a text gray used as a border). The card is 64px taller and starts 32px higher than its neighbors. Emphasis comes from a heavier neutral line plus geometry.
- Customer logo tiles: no border, but `box-shadow: inset 0 0 0 1px rgba(255,255,255,.12)`. A ring stands in for a border on colored tiles.

MEASURED, dashboard images:
- Sidebar dividers `#1e201f` to `#1f2121` on a `#121514` canvas (about +12 per channel). The table container's top edge is `#242625`. Row dividers inside the panel are `#202322` on `#181a1a`. The header-to-row divider is `#1f2121`.
- Card edges on the overview (stat tiles `#242625`, chart cards `#1e201f`) are the same weight as the sidebar lines. One hairline weight is used everywhere.

Border hierarchy (SOURCE, packages/ui): static layout uses 7.5%, interactive controls use 13.5%, button hover uses 17%, and input hover/focus uses 28%. Interactive things always carry a slightly stronger edge than static containers. This is the main way a dense screen stays readable without color.

## 4. Shadows

MEASURED: every element on home, /database and /pricing that I measured had either `none` or the Tailwind transparent placeholder (`rgba(0,0,0,0) 0 0 0 0`). There are no visible drop shadows on the site. SOURCE: Card uses `shadow-xs`, and menus use `shadow-md/lg`, which is invisible on `#131413`. Depth comes from the lightness step plus the hairline, and on the homepage cards from the top-lit gradient border. In the owner-3 image, the only floating element with apparent depth is the "Primary Database" card over the dot map, and that depth comes from its fill being one step up on a busy dot background (SEEN).

## 5. Typography tiers

Fonts (MEASURED): Inter for UI and body, Manrope for marketing headings, Source Code Pro for code, numbers on pricing, and micro labels. Body weight is 450, not 400 (Inter variable). That is a slightly heavier regular, which keeps gray text legible on near-black.

| Tier | Font / size / line / weight | Color | Example |
|---|---|---|---|
| Hero display | Manrope 46/46 w500 | `#edefee`, second line `#4acd8b` | "Build in a weekend / Scale to millions" |
| Section heading | Manrope 34/37.8 w600, two lines | line 1 `#989a99`, line 2 `#edefee` | "Kickstart your next project / with production ready templates" |
| Card title | Manrope 16/24 w600 | `#edefee` | "Postgres Database", with an 18px 1.5-stroke icon in `#edefee` |
| Lead | Inter 16/24 w450 | `#989a99` | hero subcopy |
| Body | Inter 14/20 w450 | `#989a99`, inline highlights `#edefee` | "Every project is **a full Postgres database**, the world's most trusted..." |
| Testimonial | Inter 15/22.5 w450 | `#989a99` | community cards |
| UI small | Inter 12/16 w500 | `#edefee` | nav buttons, table header column name |
| UI meta | Inter 12/16 w450 | `#bcbdbc` | column type ("timestamptz"), "Filter", "Sort" |
| Table cell | Inter 13/19.5 w450 | `#edefee`, NULL `#989a99` italic | /database table |
| Code | Source Code Pro 13/22.1 w500 | white, keywords `#bda4ff`, strings `#ffcda1`, identifiers `#3ecf8e` | code samples |
| Plan name | Source Code Pro 22/29 uppercase | `#edefee` | FREE / PRO / TEAM / ENTERPRISE |
| Price | Source Code Pro 46/46 w450 | `#edefee`, "/ month" Inter 13 `#989a99` | "$25" |
| Mono micro label (card) | Source Code Pro 12/16 uppercase, letter-spacing 0 | `#bcbdbc` | "ACTIVE USERS", "TOTAL USERS", "WARN", "ERR" |
| Mono micro label (nav group) | Source Code Pro 12/16 uppercase, letter-spacing 1.2px (tracking-widest) | `#767877` (foreground-lighter at 75%) | "GETTING STARTED", "UI PATTERNS" |
| Badge | Inter 9/9 w500 uppercase, letter-spacing 0.63px | variant | DEFAULT / WARNING / SUCCESS |

The uppercase monospace micro labels (SOURCE):
- `heading-meta` = `text-xs font-mono uppercase tracking-wider font-medium` (packages/config/typography.css).
- `CardTitle` = `text-xs font-mono uppercase` (packages/ui card.tsx). Every dashboard card title is a mono label, not a heading.
- Dashboard stat tile (`SingleStat`): the label uses `heading-meta text-foreground-light` ("STATUS", "COMPUTE", "GITHUB", "LAST MIGRATION"). The value below is base-size `text-foreground` ("Healthy", "signup_first"). The empty state is the same size in `text-foreground-lighter` ("No backups"). MEASURED in owner-3: label `#b8bab9`, value `#edf0ef`, empty value `#9a9d9c`.
- Usage cards: `CardTitle` "API GATEWAY", the count `text-xl text-foreground`, and on the right "WARNINGS" / "ERRORS" as `heading-meta`, each led by a 6px colored dot, with the count below in `text-foreground text-base`.
- Studio sidebar groups ("DATABASE MANAGEMENT", "ACCESS CONTROL", "PLATFORM" in owner-1). SEEN as spaced mono caps, and MEASURED in the image at about `#959796`.

Two-tone sentences, the main typographic mechanism (MEASURED): headlines and paragraphs are split into a dim part and a bright part instead of using bold or color. Examples are "Use one or all. (bright) Best of breed products. Integrated as a platform. (dim)", "Build in a weekend, (dim) scale to millions (bright)", and body copy with key nouns in `#edefee` inside `#989a99` text. The dashboard does the same with "11 (bright) Total Requests (dim)" and "100.0% (bright) Success Rate (dim)" (SOURCE: ProjectUsageSectionDeltas, `heading-section text-foreground-light` with the number in a `text-foreground` span). Green replaces the bright half only once per page: the hero line on home, and the second half of the customer quote on /database.

## 6. Icons and icon tiles

SOURCE (design-system/docs/icons): Lucide for UI icons. Custom icons are 24x24 with about 18x18 of content, `stroke="currentColor"`, 1.5 stroke, no fills, and no hardcoded colors. Icons are tinted like text, and destructive actions are never tinted red ("there should be a confirmation dialog right after"). The principles are "Paired" (icons accompany text), "Clear" and "Consistent".

MEASURED, site: card-title icons are 18px, 1.5 stroke, `#edefee`. Illustration icons (the Storage card grid) are 24px, 2px stroke, `#989a99`. There is no colored icon anywhere in the site chrome.

Icon tiles, dashboard (SOURCE `SingleStat.tsx`, SEEN owner-3): `w-16 h-16 rounded-md bg-surface-75 border`, with an 18px Lucide icon at 1.5 stroke in `text-foreground`. On hover the tile fill goes to `bg-muted`. MEASURED in the image: tile fill `#181a1a`, edge `#242625`, icon about `#dee0e0`. The tile is a small raised square with a hairline, a light icon, and the mono label plus value to its right. The one exception is STATUS. Its tile holds a 3x2 grid of 6px dots instead of an icon, green when each service is healthy (`bg-brand-default`), gray `bg-selection` when not, and pulsing gray while loading (SOURCE ServiceStatus.tsx).

Green icon tiles: in the dashboard, colored tiles appear only where Supabase points at a "do this next" or primary resource. The "Primary Database" card icon tile is MEASURED `#036239` fill with a light icon. The assistant suggestions (Generate sample data, Set up RLS policies, Build a notebook) have tiles at `#01321d` to `#023821`, a very dark green with a light green glyph. These are the same tile shape as the gray ones, with the hue used to mark "action available".

Brand glyphs: the nav GitHub mark is a FILLED 24px glyph in `#bcbdbc` next to "111K" in 12/16 w500 `#bcbdbc` (MEASURED). INFERRED: it reads "pretty clear against the page" because a solid filled glyph carries far more ink than the 1.5px line icons around it, at the same gray value. The footer social icons work the same way. Logos in the "Trusted by" cloud are flattened to `#989a99` at 70% opacity (MEASURED). Logos of integrations and templates keep their native colors: Stripe purple, the Flutter and LangChain marks, OpenAI and Next.js inverted to white (MEASURED `filter: invert(1)`).

## 7. Illustrations: gray line art built from UI parts

MEASURED + SEEN on the homepage product grid (`sb-home-fold.png`, `sb-home-cards-row2.png`):
- Postgres: the elephant as a single-weight outline inside a rounded square, with faint concentric construction lines (an icon blown up with its construction grid showing). Its brightest pixel is `#656766` in owner-2. It brightens on hover (`sb-home-cards-hover.png`).
- Authentication: a grid of bordered cells holding monospace emails, some blurred out. The cells are the same bordered tile as a UI cell.
- Edge Functions: a wireframe globe drawn with gradient strokes that fade (SVG radial gradients), white node dots, and a code pill `$ supabase functions deploy` on top. The pill is a real UI pill (card fill, `#303130` strong border, full radius, Inter 12) with only the subcommand in green.
- Storage: a grid of 62px bordered tiles, each with a 24px gray Lucide icon (image, file, video). The illustration is the icon-tile primitive repeated.
- Realtime: grid-paper background, two gray cursor arrows, and a pill with three dots (a typing indicator).
- Vector: an isometric wireframe cube with small green points (the "data" dots), plus OpenAI and Hugging Face logos in white.
- Data APIs: rows of table-name pills linked by dashed lines to API path pills (`.../v1/countries`). This is a schematic built entirely from pills and dashed hairlines.
- /database: the PK key icon in the table header is green. Branching uses mono uppercase pills ("MAIN", "FEAT/NEW-MEMBERS") on curved gray lines. Read replicas uses a gray globe with node dots.
- owner-3: the project region map is a dot-grid world map in `#282b2a` dots on canvas, and the only color is the green icon tile on the floating database card.

Hover-reveal (MEASURED): each product card carries a second illustration layer at `opacity: 0` (`auth-active.svg`, plus SVG overlays whose gradient stops run from `hsl(var(--brand-default))` to `var(--foreground-lighter)`). INFERRED: color and brightness are held back until interaction, so the resting state stays gray.

Template thumbnails (SEEN, home): schematic mock UIs in gray blocks, each with exactly one accent element (a purple bar, a blue dot).

Why this produces "different yet similar" (INFERRED): every illustration uses the same stroke gray, the same 1px hairline, the same radii, the same pill and tile shapes, and the same mono text that the product UI uses. Only the arrangement changes. No illustration introduces a new material such as gradient fills, shading or a new palette.

## 8. Pills, chips, badges, inline code

- Badge (SOURCE badge.tsx, MEASURED on the DS page): pill, Inter 9px w500 uppercase, letter-spacing 0.07em, padding 3px 5.5px, 17px tall. Variants are tinted rather than solid:
  - default: bg `#181a19`, border `#303130`, text `#bcbdbc`
  - success: bg `#17261f` (brand at 10%), border `#006239`, text `#85e0ba`
  - warning: bg `#2a2318`, border `#693f05`, text `#db8e00`
  - destructive: bg `#231918`, border `#442322`, text `#b54a46`
  - The docs say: "Badge is designed to stand out, so should be used sparingly", and "Keep Badge text to one or two words".
- Dashboard badges in owner-1 (MEASURED in the image): "FREE" is neutral. "PRODUCTION" is amber, bg about `#2a2315` with text about `#b28d41`. Amber means "this is the live environment, be careful", and that is its meaningful location. "NEW" (sidebar, Pipelines) and "PREVIEW" (Explorer popover) are green tinted, bg `#17281e` with text about `#97c8b3`. "NANO" is neutral.
- Neutral emphasis chip: "Most Popular" on /pricing is a filled light-gray pill (bg `#bcbdbc`, text `#131413`, radius 8, Inter 13). "Compare Plans" is a filled `#edefee` button with dark text. When something must stand out without color, they invert the neutral.
- Pill with border: "Starts from $10/month" uses page fill, a `#232423` border and full radius. The "What is compute?" pill is similar.
- Inline code (SOURCE `text-code-inline`): 12px, `bg-surface-200`, `border-muted`, `rounded-md`, padding px-1 py-0.5, medium weight. MEASURED in docs prose: Source Code Pro 14px `#bcbdbc` on `#1a1b1a`, radius 4px, padding 3.2px 4.8px.
- Table type labels (/database): the column header pairs "created_at" (12px w500 `#edefee`) with "timestamptz" (12px w450 `#bcbdbc`). Name and type are told apart by brightness, not by a chip.

## 9. Where green appears and where it does not

Counted on screen. A "site" is one distinct use, and a repeated row of identical checkmarks counts once per column.

| Screen | Green sites | What they are | Other hues |
|---|---|---|---|
| Home, first viewport | 6 | logo; "Apply to attend" link + bracket ornament; nav "Start your project" plate `#006338`; hero line 2 `#4acd8b`; hero CTA plate; "functions deploy" in the code pill | none |
| Home, full page | about 12 | above + Realtime pill (`#002918` fill, `#3ecf8e` border) and its 3 dots; Vector cube points; code-sample identifiers; "Open source" dot matrix in green tints (`#111613` to `#202c27`); footer "More on Security", "Start your project", "Subscribe" | only inside other brands' logos and story cards (Stripe purple, the Lovable pink-to-orange gradient card, customer tiles in navy, teal, black and blue), plus syntax purple/orange |
| /database, first viewport | 5 | logo, announcement link, nav CTA, PK key icon, the selected "false" cell tint. NOTE: the hero CTAs here are NEUTRAL | none |
| /database, full page | about 10 | above + check icons, chat bubbles `#193025`, the green half of the quote, code identifiers | syntax only |
| /pricing, first viewport | 7 | logo, link, nav CTA, three plan buttons (Free, Pro, Team), green checkmarks in those three columns | none. Enterprise gets a neutral button and WHITE checks (MEASURED `#edefee`). The Pro emphasis is gray. Spend cap uses a dashed AMBER threshold line and a green switch "on" |
| Dashboard tables (owner-1) | about 8, all small | logo, green dot on the top-bar advisor bulb, "New table" plate `#01653a`, "NEW" badge, three suggestion tiles, "PREVIEW" badge | amber: Advisors sidebar icon `#dc8c00`, PRODUCTION badge |
| Dashboard overview (owner-3) | about 8 | logo, bulb dot, status 6-dot grid, Primary Database icon tile, green usage bars in 3 to 4 cards, PREVIEW | amber: Advisors icon, PRODUCTION, 4 "WARNINGS" dots (`#e5b566` in the image). Red: 4 "ERRORS" dots (`#b35452`) |

Where green is NOT (MEASURED unless marked):
- In the owner-1 table area (x 540 to 1400, y 390 to 900), the most saturated pixel is `#545146`, a chroma of 14 out of 255. The data region is pure neutral. The "Disabled" realtime column uses a gray X and gray text, not red.
- In owner-3, the text block (title, URL, Copy) has a maximum chroma of 3.
- Not used for: selected sidebar rows (`#1d1f1e`), selected tabs (white border or underline), headings except one phrase per page, body links (gray underline, `text-link` = `text-foreground-light underline`), card borders, card titles, illustration strokes, secondary buttons, Enterprise checks, the most-popular plan, logo clouds, or numbers. The numbers in the warn/error columns are white, and only the 6px dot carries the hue.
- SOURCE (design-system color usage): green has split jobs. `--primary` is the readable ink for links, labels, radios and step dots. `--primary-solid` is the deep button plate, "darker than --primary so buttons do not read as lime". `--primary-bright` is used for focus rings and selected controls. `brand-default` is the canonical green, "only when the canonical Supabase green is required". The docs also say: "Use accent text colors (e.g. text-destructive, text-warning) sparingly to avoid visual overload."
- SOURCE (charts docs): status colors "are reserved for state and always ship with an icon or label. Never use one as a series color: amber on a neutral metric reads as a problem." Series colors come from 8 fixed categorical slots (brand, blue, pink, violet, tomato, indigo, green, purple, at steps 800 to 1100), assigned in order and never cycled. A ninth series folds into "Other".

So amber, red and the categorical hues do exist, but each one is tied to a single meaning (environment risk, warning, error, data series) and appears only where that meaning applies. INFERRED: this is the same pattern the owner described in Linear, color "in the relevant location, not as something random".

## 10. Status dots and sparklines

- Dots (SOURCE + MEASURED): 6px (`w-1.5 h-1.5 rounded-full`), always followed by a mono uppercase label ("WARNINGS", "ERRORS", "WARN", "ERR"). The count sits in a separate line in foreground white. On the DS charts page, the warn dot is `#f2af48` and the err dot `#b54a46`.
- Health grid: a 3x2 grid of 6px dots with a 4px gap inside a 64px tile. One dot per service makes partial outages visible at a glance.
- Sparkline (MEASURED, Metric Card): a 1.5px stroke in primary `#4acd8b`, stepped (step-after) rather than smooth, with an area fill from the same green at stop opacity 0.8 to 0 and `fill-opacity: 0.1` (about 8% at the top, fading to nothing). The card runs label (mono 12 uppercase `#bcbdbc`), value (Inter 18 `#edefee`), delta (Inter 13 `#4acd8b`, "+37.9%"), then the sparkline bleeding to the card's bottom and side edges. The card is `#181a19` with a `#232423` border and radius 8.
- Bar charts (SOURCE LogsBarChart, MEASURED on DS charts): stacked per time bucket with ok on top in green, warning amber, error red. `maxBarSize` is 24, bars are about 6 to 9px wide with tight gaps, and axis labels are 10px mono `text-foreground-lighter` showing only the first and last timestamps. In owner-3 each service card shows its bars in green (`#4aca91`) with a dark green base (`#0c2719`). Most buckets are empty, so a mostly empty card with one green spike is normal.

## 11. Density

- Site container: 1280 wide with 96px side padding, so content is 1088 (MEASURED). Product cards measure 263x400 and 538x400. The card padding is 24px vertical and 16px horizontal on the inner element, and the title block sits 24px from the top.
- Site table (/database): header row 29px, body rows 33px, cell padding 6px 12px, 13px text (MEASURED). That is spreadsheet density inside a marketing page.
- Buttons: small 26px tall (12/16 text, padding 4px 10px, radius 8), medium 34px (padding 8px 12px), large 38 to 42px (radius 9.3 to 9.7) (MEASURED).
- Radii (MEASURED): 4 (inline code), 5.3 (small chips), 8 (small buttons, metric cards), 10.7 (cards, code panel), 16 (big product and plan cards), 21.3 (testimonial cards), full (pills, badges, tabs). Bigger containers get bigger radii.
- Dashboard (owner images at about 1:1, INFERRED): table list rows about 63px pitch, sidebar items about 39px pitch, stat tiles 64px with about 30px between rows. The text is 14px. The dashboard is less dense than the marketing table; the density comes from many small labeled things, not from tight rows.

## 12. Mechanisms to name for the host (no palette)

1. One material. The page and the navigation share one near-black. Content panels go one small step lighter, and controls go one more step, up for buttons and down for inputs. Never more than two or three fills on screen.
2. One hairline everywhere. The text color at low alpha draws every edge, so borders automatically sit in the same family as the text. Interactive edges are a notch stronger than static ones. No drop shadows.
3. Top-lit edges instead of shadows. Featured cards use a border that fades from top to bottom.
4. Two-tone text. Emphasis means bright against dim inside the same sentence or heading. Weight changes are rare (450 body, 500 to 600 headings).
5. Mono uppercase micro labels as the "chrome voice". Every card title, stat label, group header, plan name and price uses the mono face, small and uppercase. This gives a technical, instrument-panel feel and separates metadata from content without any color.
6. Color = meaning, placed at the smallest possible size. Green means go, ok, primary or on. Amber means caution or threshold. Red means error. Each appears as a 6px dot, a tinted badge, a thin line, an icon tile, or one button plate, always next to a word. The data itself stays neutral.
7. The primary button is a deep, desaturated plate, not the bright brand green. The bright green is kept for small ink (links, dots, sparkline strokes) where it needs to read at small size.
8. Neutral inversion for emphasis. "Most Popular" and "Compare Plans" are light pills with dark text, and the Pro card uses a heavier gray border and a geometric lift. Emphasis does not require the accent.
9. Illustrations are built from UI parts (pills, bordered tiles, dashed connectors, mono labels, dot grids) drawn in the stroke gray. Color is held back to a few data points or revealed on hover.
10. Other brands' colors are allowed only as those brands' own marks (integration logos, customer stories). In a social-proof logo cloud they are flattened to gray.
