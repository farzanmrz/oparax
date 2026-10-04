# Vercel Geist color logic (research for Oparax theming)

Researched 2026-10-01. Read-only research. No em dashes used.

## Source legend

- VERIFIED-DOC: stated in Vercel's own Geist docs.
  - https://vercel.com/geist/colors (append `.md` for the machine-readable version, https://vercel.com/geist/colors.md)
  - https://vercel.com/geist/materials.md
  - https://vercel.com/geist/introduction
- VERIFIED-CSS: read directly from the compiled stylesheet served by vercel.com/geist (`https://vercel.com/vc-ap-b3331f/_next/static/immutable/chunks/21h6t23lz7aea.css`, the `:root,.light-theme` block and the `.dark,.dark-theme,.invert-theme` block). The hex values below are those blocks verbatim. The site also ships a `lab()` copy of every token for wide-gamut browsers (`@supports (color:lab(0% 0 0))`), and the docs say "P3 colors are used on supported browsers and displays". The hex is the sRGB fallback of the same token.
- CALC: contrast ratios I computed with the WCAG 2 formula from the verified hex. Not from Vercel.
- INFERRED: my reading of how Vercel combines the tokens. The docs name the step roles but do not publish per-component recipes, so component rows are inference unless marked VERIFIED-CSS.
- Not used: the community package https://github.com/ephraimduncan/geist-colors. Its gray values are stale and wrong (for example `gray-400` is 92% lightness there, `gray-1000` is 9%). Do not copy from it.

## 1. The core idea (why it feels harmonious)

1. Geist is a pure neutral gray ramp (saturation 0, no tint) plus one accent ramp per hue. Every ramp has the same 10 steps and each step has a fixed job (VERIFIED-DOC). Harmony comes from every color, gray or blue, obeying the same step-to-job map.
2. Separation does not come from using more hues. It comes from three stacked mechanisms (INFERRED from the tokens and docs):
   - Surface steps: page `background-100`, subtle section `background-200`, component fills gray 100 to 300.
   - A 1px hairline on almost everything: `--ds-shadow-border-base` is `0 0 0 1px #00000014` in light and `#ffffff25` in dark (VERIFIED-CSS). Cards, menus and tooltips are drawn with this ring plus a very faint shadow, not with a heavy border or a colored fill.
   - Text hierarchy using only two text steps: 1000 for primary, 900 for secondary.
3. Accent (blue) is sparse. In the compiled site CSS, token usage counts are: gray-1000 112, background-100 57, gray-900 40, gray-100 36, gray-700 34, blue-900 33, gray-500 32, background-200 31. Blue is mostly 900 (links and text), 700 (focus ring, selection), and 100/400/900 (info notes). The primary button is not blue, it is gray-1000 on background-100 (INFERRED from the 1000 "primary text" role and the inverted badge variant; the docs list `default` as a button variant but publish no fill color). So blue is a signal color, not a surface color.
4. Dark mode is not an inversion of the light ramp. Some steps change role weight (see 3.2), the page goes pure `#000`, and accent steps 100 to 500 become deep navy fills while 900 and 1000 become light blues (VERIFIED-CSS).

## 2. Official step map (VERIFIED-DOC, https://vercel.com/geist/colors.md)

| Step | Variable | Role |
|---|---|---|
| 100 | `--ds-gray-100` | Default component background |
| 200 | `--ds-gray-200` | Hover background |
| 300 | `--ds-gray-300` | Active (pressed) background |
| 400 | `--ds-gray-400` | Default border |
| 500 | `--ds-gray-500` | Hover border |
| 600 | `--ds-gray-600` | Active border |
| 700 | `--ds-gray-700` | High contrast background |
| 800 | `--ds-gray-800` | Hover high contrast background |
| 900 | `--ds-gray-900` | Secondary text and icons |
| 1000 | `--ds-gray-1000` | Primary text and icons |

Same map applies to gray-alpha, blue, red, amber, green, teal, purple, pink (10 scales named: backgrounds, gray, gray-alpha, blue, red, amber, green, teal, purple, pink).

Official usage notes (VERIFIED-DOC, paraphrased):
- Two page backgrounds. Use Background 1 (`--ds-background-100`) by default, especially when color sits on top of it. Use Background 2 (`--ds-background-200`) "sparingly" when a subtle differentiation is needed.
- If a component's default background is Background 1, use Color 1 (gray-100) as its hover and Color 2 (gray-200) as its active.
- On small elements like badges, use Color 2 or Color 3 as the background.
- Colors 1 to 3 = component backgrounds, 4 to 6 = borders, 7 to 8 = high-contrast backgrounds, 9 to 10 = text and icons.
- Introduction page: "A high contrast, accessible color system."

## 3. Token values

### 3.1 Backgrounds, gray, gray-alpha (VERIFIED-CSS)

| Token | Light | Dark |
|---|---|---|
| background-100 | `#ffffff` | `#000000` |
| background-200 | `#fafafa` | `#000000` (identical to 100) |
| gray-100 | `#f2f2f2` | `#1a1a1a` |
| gray-200 | `#ebebeb` | `#1f1f1f` |
| gray-300 | `#e6e6e6` | `#292929` |
| gray-400 | `#eaeaea` | `#2e2e2e` |
| gray-500 | `#c9c9c9` | `#454545` |
| gray-600 | `#a8a8a8` | `#878787` |
| gray-700 | `#8f8f8f` | `#8f8f8f` |
| gray-800 | `#7d7d7d` | `#7d7d7d` |
| gray-900 | `#4d4d4d` | `#a0a0a0` |
| gray-1000 | `#171717` | `#ededed` |
| gray-alpha-100 | `#0000000d` (5%) | `#ffffff12` (7%) |
| gray-alpha-200 | `#00000015` (8%) | `#ffffff17` (9%) |
| gray-alpha-300 | `#0000001a` (10%) | `#ffffff21` (13%) |
| gray-alpha-400 | `#00000014` (8%) | `#ffffff24` (14%) |
| gray-alpha-500 | `#00000036` (21%) | `#ffffff3d` (24%) |
| gray-alpha-600 | `#0000003d` (24%) | `#ffffff82` (51%) |
| gray-alpha-700 | `#00000070` (44%) | `#ffffff8a` (54%) |
| gray-alpha-800 | `#00000082` (51%) | `#ffffff78` (47%) |
| gray-alpha-900 | `#000000b3` (70%) | `#ffffff9c` (61%) |
| gray-alpha-1000 | `#000000e8` (91%) | `#ffffffeb` (92%) |

Observations (INFERRED from the numbers):
- Light 400 (`#eaeaea`) is slightly lighter than 300 (`#e6e6e6`). Borders at rest are deliberately faint; the ladder is not monotonic at that point.
- Dark: background-100 and 200 are both pure black. In dark mode the "subtle section" job is done by gray-100 (`#1a1a1a`) instead.
- Gray 700 and 800 are the same hex in both themes (`#8f8f8f`, `#7d7d7d`): the mid-gray pivots that stay put.
- Dark gray-900 (`#a0a0a0`) is lighter than dark 800/700, so "secondary text" stays readable while the 700/800 backgrounds stay dim.
- Gray-alpha is the same ramp expressed as translucent black (light) or white (dark). Use it when a surface can sit over a varying background (images, gradients, shader backgrounds), because the fill adapts. Solid grays are for flat surfaces.

### 3.2 Blue (VERIFIED-CSS)

| Token | Light | Dark | Role |
|---|---|---|---|
| blue-100 | `#f0f7ff` | `#06193a` | Tint fill, info note bg |
| blue-200 | `#eaf4ff` | `#022248` | Hover tint |
| blue-300 | `#e0efff` | `#002f62` | Active tint, selected row, highlighted code line |
| blue-400 | `#cce7ff` | `#003771` | Tint border (info note border) |
| blue-500 | `#97ccff` | `#004287` | Hover border |
| blue-600 | `#51aeff` | `#0090ff` | Active border / bright mid |
| blue-700 | `#0070f7` | `#0071f6` | Solid accent fill, focus ring color (light), text selection |
| blue-800 | `#005edc` | `#005fd8` | Hover solid accent |
| blue-900 | `#0064e2` | `#50a8ff` | Accent text, links, checked checkbox, focus color (dark) |
| blue-1000 | `#002453` | `#ebf6ff` | Text on blue tint |

Key facts for the owner's "blue accent instead of green":
- The solid-fill steps 700 and 800 are nearly the same in both themes (`#0070f7` vs `#0071f6`). Only 100 to 500 (surface tints) and 900 to 1000 (text) flip.
- Accent text is 900 in both themes but the value changes: `#0064e2` on white, `#50a8ff` on black. A single accent hex cannot serve both modes as text; you need two.
- Vercel's blue is hue about 211 to 212 deg (light 700 is HSL 212 100% 48%).

### 3.3 Semantic colors (VERIFIED-CSS, for state mapping)

| Token | Light | Dark |
|---|---|---|
| red-100 / 400 | `#ffeef0` / `#ffd8d7` | `#330a11` / `#6f101b` |
| red-700 / 800 / 900 | `#fc0035` / `#e70022` / `#d60020` | `#f13242` / `#e2162a` / `#ff5e63` |
| amber-100 / 400 | `#fff6e1` / `#ffdd84` | `#291800` / `#573200` |
| amber-700 / 800 / 900 | `#ffb200` / `#ff9900` / `#a64f00` | `#ffb200` / `#ff9900` / `#ff9900` |
| green-100 / 400 | `#ecfdec` / `#b9f5bc` | `#00250a` / `#004616` |
| green-700 / 800 / 900 | `#28a948` / `#279141` / `#107d32` | `#00ab3e` / `#009335` / `#00ca52` |

(Full red, amber, green, teal, purple, pink ramps are in the source stylesheet; not needed for a blue/black/gray range.)

## 4. How states work (VERIFIED-CSS unless marked)

- Focus ring: `--ds-focus-ring: 0 0 0 2px var(--ds-background-100), 0 0 0 4px var(--ds-focus-color)`. A 2px gap in the page background, then a 2px ring. `--ds-focus-color` is `blue-700` in light (`#0070f7`) and `blue-900` in dark (`#50a8ff`). The ring is the main place blue appears on interactive chrome.
- Input focus (utility `focus:shadow-[var(--ds-focus-border)]`): `0 0 0 1px var(--ds-gray-alpha-600), 0 0 0 4px #00000029` in light; `0 0 0 1px var(--ds-gray-alpha-600), 0 0 0 4px #ffffff3d` in dark. So text inputs focus with a darker hairline plus a soft neutral halo, not a blue ring.
- Hover on surfaces: the site uses `hover:bg-gray-100`, `hover:bg-gray-200`, `hover:bg-gray-alpha-100`, `hover:bg-gray-alpha-200`, `hover:bg-background-100/200` (cards flip from background-200 to background-100 on hover). Matches the doc rule "default Background 1, hover gray-100, active gray-200".
- Selected (aria-selected, tabs, list items): `bg-gray-300` or `bg-gray-alpha-300`, text `gray-1000`; primary tab variant adds a `border-gray-1000` underline (VERIFIED-CSS). The selected state is a neutral, not blue. Blue-300 selection is used only for a highlighted code line and a hover tint on one component.
- Text hover on links/suffixes: `gray-900` to `gray-1000`.
- Pressed/active: step 300 for tinted backgrounds. Error-filled button defines `hover: red-900`, `press: #ffaba3`-style lighter in dark (VERIFIED-CSS).
- Error: border `red-400`, bg `red-100`, text `red-900` (non-filled); filled uses `red-800` bg with white (`--ds-contrast-fg: #fff`), hover `red-900`.
- Warning: `amber-100` bg, `amber-400` border, `amber-900` text; filled `amber-800` with near-black text `#0a0a0a`.
- Info/success note (the "blue" note): `blue-100` bg, `blue-400` border, `blue-900` text. This is the exact tint pattern: step 100 fill + step 400 border + step 900 text.
- Text selection: `::selection` background `blue-700` on the Geist site; dark theme variants swap to other ramps per page.
- Disabled: not documented in the colors page. INFERRED: gray-100 fill with gray-700 text.
- Overlay backdrop: `gray-100` at 0.8 opacity in light, `background-200` in dark (VERIFIED-CSS).
- Motion: `--ds-motion-overlay-duration: .3s`, `--ds-motion-popover-duration: .2s`, easing `cubic-bezier(.175, .885, .32, 1.1)`, overlay scale `.96` (VERIFIED-CSS).

## 5. Elevation and separation (materials, VERIFIED-CSS + VERIFIED-DOC)

Surface materials (on the page): all use `background-100` as fill and a shadow stack that always begins with the 1px hairline ring.

| Material | Radius | Shadow (light) | Use |
|---|---|---|---|
| material-base | 6px | `--ds-shadow-border` = hairline `0 0 0 1px #00000014` + `0 0 0 1px background-200` | Everyday cards |
| material-small | 6px | hairline + `0 2px 2px #0000000a` | Slightly raised |
| material-medium | 12px | hairline + `0 2px 2px #0000000a, 0 8px 8px -8px #0000000a` | Further raised |
| material-large | 12px | hairline + `0 2px 2px #0000000a, 0 8px 16px -4px #0000000a` | Further raised |

Floating materials (above the page): tooltip 6px, menu 12px, modal 12px, fullscreen 16px. All keep fill `background-100` and add hairline plus larger layered, low-opacity shadows (`#0000000a` to `#0000000f`). Dark mode replaces the hairline with `#ffffff25` (white at 15%) and uses heavier black shadows only on small/medium (`#00000029`, `#00000052`).

Dark-mode implication (INFERRED): because the page is pure black and shadows cannot show on black, depth is carried by the lighter hairline (`#ffffff25`) and by the gray-100 (`#1a1a1a`) fill, not by shadow.

## 6. Role mapping table (Geist tokens for each Oparax component role)

Light value / dark value in parentheses. All token choices are INFERRED from the verified step map unless the "Basis" column says VERIFIED.

| Role | Light token (hex) | Dark token (hex) | Basis |
|---|---|---|---|
| Page background | background-100 (`#fff`) | background-100 (`#000`) | VERIFIED-DOC |
| Subtle section / app shell / sidebar | background-200 (`#fafafa`) | gray-100 (`#1a1a1a`) or background-200 (`#000`) | VERIFIED-DOC for light; dark is INFERRED because 200 equals 100 in dark |
| Card surface | background-100 + hairline ring (`#00000014`) | background-100 + hairline (`#ffffff25`) | VERIFIED-CSS (`material-base`) |
| Card on a tinted section | background-100 on background-200 | gray-100 on background-100 | INFERRED |
| Card hover | background-200 to background-100 flip, or gray-100 | gray-100 to gray-200 | VERIFIED-CSS for the flip |
| Input fill | background-100 | background-100 | INFERRED |
| Input border | gray-alpha-400 (via hairline) / gray-400 `#eaeaea`; hover gray-500 `#c9c9c9` | gray-400 `#2e2e2e`; hover gray-500 `#454545` | doc rule: 4 default, 5 hover, 6 active |
| Input focus | `--ds-focus-border` (gray-alpha-600 hairline + 4px `#00000029` halo) | same with `#ffffff3d` halo | VERIFIED-CSS |
| Menu / popover / dialog | background-100 + `--ds-shadow-menu`, radius 12 | background-100 + `#ffffff25` hairline + shadow | VERIFIED-CSS |
| Menu item hover | gray-100 / gray-alpha-100 | gray-100 `#1a1a1a` / gray-alpha-100 | doc rule + VERIFIED utilities |
| Menu item selected | gray-300 / gray-alpha-300, text gray-1000 | same | VERIFIED-CSS (aria-selected) |
| Table header text | gray-1000 | gray-1000 | VERIFIED-CSS |
| Table row divider | 1px gray-400 (`#eaeaea`) | gray-400 (`#2e2e2e`) | VERIFIED-CSS |
| Table row hover | gray-100 | gray-100 | INFERRED |
| Primary button | fill gray-1000 (`#171717`), text background-100 (`#fff`); hover gray-900 | fill gray-1000 (`#ededed`), text background-100 (`#000`) | INFERRED (hover:bg-gray-900 exists in CSS) |
| Secondary button | fill background-100, hairline ring, hover gray-100 / gray-alpha-100 | same, hover gray-100 | INFERRED |
| Tertiary / ghost button | transparent, hover gray-alpha-100, active gray-alpha-200 | same | INFERRED |
| Accent / brand button (if used) | blue-700 fill `#0070f7`, white text, hover blue-800 `#005edc` | blue-700 `#0071f6`, hover blue-800 `#005fd8` | white on 700 = 4.51 light / 4.47 dark (CALC), so 800 is safer for body-size text |
| Link / accent text | blue-900 `#0064e2` | blue-900 `#50a8ff` | VERIFIED-CSS |
| Primary text | gray-1000 `#171717` | gray-1000 `#ededed` | VERIFIED-DOC |
| Secondary text | gray-900 `#4d4d4d` | gray-900 `#a0a0a0` | VERIFIED-DOC |
| Tertiary / placeholder / meta | gray-700 `#8f8f8f` (3.23:1 on white, below AA for body text) | gray-700 `#8f8f8f` (6.49:1 on black) | CALC; use light-mode gray-700 only for non-essential or large text |
| Icon default | gray-900 | gray-900 | VERIFIED-DOC |
| Divider / hairline | gray-alpha-400 or gray-400 | gray-alpha-400 or gray-400 | doc rule |
| Badge (neutral) | gray-200 or gray-300 fill, gray-1000 text (small elements use 2 or 3) | same | VERIFIED-DOC |
| Badge (blue, subtle) | blue-100 fill, blue-400 border or none, blue-900 text | blue-100 `#06193a`, blue-900 `#50a8ff` | VERIFIED-CSS note pattern |
| Badge (inverted) | gray-1000 fill, background-100 text | same | Geist has `variant="inverted"` |
| Info note | blue-100 / blue-400 / blue-900 | `#06193a` / `#003771` / `#50a8ff` | VERIFIED-CSS |
| Error | red-100 / red-400 / red-900; filled red-800 | `#330a11` / `#6f101b` / `#ff5e63`; filled `#e2162a` | VERIFIED-CSS |
| Warning | amber-100 / amber-400 / amber-900 | `#291800` / `#573200` / `#ff9900` | VERIFIED-CSS |
| Success | green-700 / 900 (note pattern in Geist actually uses blue for "success") | green-700 `#00ab3e` / 900 `#00ca52` | Geist's own `geist-new-success` note is blue (VERIFIED-CSS) |
| Focus ring | `0 0 0 2px bg-100, 0 0 0 4px blue-700` | `... blue-900` | VERIFIED-CSS |
| Selected tab / nav item | gray-300 or gray-alpha-300 fill, gray-1000 text, optional 2px gray-1000 underline | same | VERIFIED-CSS |
| Skeleton / progress track | gray-100 / gray-200 | gray-200 / gray-300 | INFERRED |
| Overlay scrim | gray-100 at 80% | background-200 at 80% | VERIFIED-CSS |
| Code block bg | background-100, tokens colored with 900 steps (pink keywords, blue functions, green strings) | same | VERIFIED-CSS |
| Chart / citation chip highlight | blue-300 fill (`#e0efff`) | blue-300 (`#002f62`) | VERIFIED-CSS (code-line highlight) |
| Text selection | blue-700 bg | blue-700 bg | VERIFIED-CSS |

## 7. Translating to Oparax (blue accent, black and gray range)

1. Copy the step contract, not just the hexes. The reusable invariant: 100/200/300 fills, 400/500/600 borders, 700/800 solid fills, 900/1000 text, with the same job in light and dark.
2. Gray ramp: Geist is chroma 0. Oparax can keep it neutral or add a tiny cool tint (blue hue about 250 deg, chroma about 0.005 to 0.01 in OKLCH) so grays and the blue feel related. That tint is my suggestion (INFERRED, not Vercel). Supabase's grays are more tinted than Vercel's.
3. Blue ramp: Vercel's blue-700 `#0070f7` is the closest public analogue to a strong product blue. The owner's own blue should be slotted at step 700 (solid fill) and used for focus ring plus links, with 100 to 400 derived as tints and 900/1000 as text steps per theme. In dark, push 100 to 500 to deep navy, 900 to a light blue (about 66% L in lab, `#50a8ff`), 1000 to near white-blue.
4. Accent budget: keep blue to focus ring, links, selected-state hints, info chips, one primary CTA at most per screen. Primary action can stay gray-1000 (inverted), which is what makes Vercel feel monochrome yet separated.
5. Dark mode: page pure or near-black, cards `gray-100` (`#1a1a1a`) with a white 15% hairline; do not rely on shadows. Light mode: page `#fff`, shell `#fafafa`, cards white with a black 8% hairline.
6. Contrast to watch (CALC): light gray-700 text on white is 3.23:1 (not AA for body); light gray-400 border on white is 1.2:1 (decorative only; use gray-500 `#c9c9c9`, 1.66:1, or alpha-500 for any border that must be perceivable, such as input edges); white on blue-700 is 4.5:1 (borderline); dark blue-900 on black is 8.39:1; light blue-900 on white is 5.36:1.
7. Light/dark pairs that differ by role (do not auto-invert): blue-900, gray-900, gray-1000, gray-100 to 600, background-200. Pairs that stay put: gray-700, gray-800, blue-700, blue-800, amber-700, amber-800.

## 8. Open items not verified

- Exact default Button fills and the secondary button border: the docs page lists variants (default, error, warning, secondary, tertiary) and sizes, but the site stylesheet did not expose the button component CSS. Rows marked INFERRED rely on the step map and utilities that exist in the stylesheet (`hover:bg-gray-900`, `hover:bg-gray-alpha-100/200`).
- Disabled-state colors, input placeholder color, and exact table hover are not published on the colors page.
- Vercel dashboard (non-docs) may use slightly different component recipes than the docs site; only docs-site CSS was inspected.
- Geist docs for Card returned 404 (no card component page); card recipe comes from `material-*` and the docs-site `.card` rule.
