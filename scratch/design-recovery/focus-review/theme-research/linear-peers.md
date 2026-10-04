# Linear, Raycast, Resend: how dark-first products build separated, harmonious color

Research only. Scope: Linear (primary), Raycast and Resend (peers). Goal: rules Oparax can reuse with its own blue accent in dark and light.

Labels used below:
- VERIFIED = read directly from the product's public CSS custom properties or an official page (fetched 2026-10-01).
- COMPUTED = my arithmetic on verified hex values (CIE L* and WCAG contrast). Not published by the vendors.
- INFERRED = my reading of the evidence. Treat as a hypothesis.

Important caveat: values for all three come from their public marketing sites (linear.app, raycast.com, resend.com). Linear's in-app themes are generated at runtime from base, accent and contrast inputs, so the marketing tokens show the same design language but are not guaranteed to equal the app's output.

---

## 1. Linear

### 1.1 How the theme is built (VERIFIED, official articles)

Sources:
- https://linear.app/now/how-we-redesigned-the-linear-ui (part II, theme generation)
- https://linear.app/now/behind-the-latest-design-refresh (2024 refresh, warmer and less saturated grays, fewer borders)

Facts stated there:
- Themes are generated in the LCH color space (perceptually uniform: equal L reads as equal lightness whatever the hue), replacing HSL.
- A theme used to need about 98 hand-set variables. It now takes three inputs: base color, accent color, contrast.
- Contrast is a single number. Raising it spreads the surface and text lightness steps apart. It is how Linear ships high-contrast accessibility themes automatically. (One fetch summary gave the range as 30 to 100. Treat the range as reported, not confirmed.)
- Elevation is computed from the same inputs: background, foreground, panels, dialogs and modals each get their own lightness step.
- The 2024 refresh moved defaults toward "a warmer gray that still feels crisp, but less saturated" and reduced borders and contrast so structure appears without clutter.
- Designers tuned tokens with an internal tool exposing hue, chroma and lightness per token.

### 1.2 Measured tokens, dark (VERIFIED from https://linear.app CSS, `[data-theme=dark]`)

Surface ladder (hex, then COMPUTED L*):

| Step | Hex | L* |
|---|---|---|
| bg-marketing (deepest) | #010102 | 0.3 |
| bg-level-0 / bg-primary (page) | #08090a | 2.4 |
| bg-level-1 / bg-panel (sidebar, panels) | #0f1011 | 4.6 |
| bg-level-2 (cards, rows) | #141516 | 6.7 |
| bg-level-3 (raised, popovers) | #191a1b | 9.2 |
| bg-secondary | #1c1c1f | 10.4 |
| bg-tertiary | #232326 | 13.8 |
| bg-quaternary | #28282c | 16.3 |
| translucent overlays | #ffffff0d, #ffffff12, #ffffff26 | n/a |

Reading (COMPUTED): the whole page-to-popover ladder spans only about 7 L* points (2.4 to 9.2). Each step is roughly 2 to 3 L*. Elevation = a few points lighter, not a different hue. The neutrals are not pure gray: they lean very slightly cool (blue channel a point or two above red), which keeps them from looking dead next to an indigo accent.

Borders (dark):
- border-primary #23252a (L* 14.7), border-secondary #34343a (21.9), border-tertiary #3e3e44 (26.4).
- line-primary #37393a, line-secondary #202122, line-tertiary #18191a, line-quaternary #141515 (the "line" set is a second, even quieter ladder used inside lists).
- Translucent borders #ffffff0d and #ffffff14 (5 to 8 percent white) in marketing and header.
- Rule (COMPUTED): the default border sits about 10 to 12 L* above the surface it divides. It is a hairline of low contrast, never a bright outline.

Text tiers (dark, contrast on #08090a is COMPUTED):

| Tier | Hex | Contrast on page |
|---|---|---|
| primary | #f7f8f8 | 18.7 |
| secondary | #d0d6e0 | 13.6 |
| tertiary | #8a8f98 | 6.1 |
| quaternary | #62666d | 3.5 (placeholder, disabled, decoration only) |

Accent (dark): accent #7170ff (L* 54), accent-hover #828fff, accent-tint #18182f (a near-black indigo wash), link #828fff, brand-bg #5e6ad2 (L* 49, white text on it is 4.7:1). Accent as text on the page is 5.2:1, link variant 7.0:1.

Shadows (dark): low `0 2px 4px #0000001a`, medium `0 4px 24px #0003`, high `0 7px 32px #00000059`. In dark, shadows are secondary to the lightness step.

### 1.3 Measured tokens, light (VERIFIED, `[data-theme=light]`)

| Role | Hex | L* (COMPUTED) |
|---|---|---|
| bg-primary / level-0 | #ffffff | 100 |
| bg-level-1 | #f8f8f8 | 97.6 |
| bg-secondary | #f9f8f9 | 97.7 |
| bg-level-2 | #f4f4f4 | 96.2 |
| bg-tertiary | #f4f2f4 | 95.7 |
| bg-level-3 | #f0f0f0 | 94.8 |
| bg-quaternary | #eeedef | 93.9 |
| bg-quinary | #e9e8ea | 92.1 |
| border-primary / secondary / tertiary | #e9e8ea / #e4e2e4 / #dcdbdd | 92.1 / n/a / 87.5 |
| line-primary / secondary / tertiary | #d4d4d6 / #eaeaeb / #f0f0f0 | n/a |
| text primary / secondary / tertiary / quaternary | #282a30 / #3c4149 / #6f6e77 / #86848d | contrast on white 14.3 / 10.3 / 5.0 / 3.7 |
| accent / hover / tint | #7170ff / #8989f0 / #f1f1ff | accent on white 3.85 |
| brand-bg | #7070ff (dark mode uses #5e6ad2) | white on it 3.85 |
| focus ring | #0006, 2px, offset 2px | n/a |

Light-mode strategy (INFERRED from the values):
- The page is pure white and surfaces step DOWN in 1 to 2 L* increments toward #f0f0f0. Light mode is not a flip of the dark ladder; the ladder is even tighter (about 5 L* total).
- Shadows return in light mode (`0 3px 12px #00000017`, plus an inset top highlight in the stack shadow), because tint steps alone are too faint on white.
- Text stays tinted near-black (#282a30), never #000.
- The accent hex is the same in both modes (#7170ff). Hover is a lighter, brighter step in dark (#828fff) and a slightly desaturated lighter step in light (#8989f0). The accent tint flips from near-black indigo (#18182f) to near-white indigo (#f1f1ff).
- Light accent as plain text is only 3.85:1, so Linear uses it for filled controls and large or icon use, and text links use `link-primary` (#7070ff light, #828fff dark).

### 1.4 Accent share (INFERRED, from token reference counts in the marketing CSS)

Counting `var(--token)` references in linear.app CSS: accent/brand/link tokens about 34 references against about 440 for text, background and border tokens. The accent appears on primary buttons, links, selection, focus, active states and small status marks. Everything else is neutral. Rough working number: accent under 5 percent of visible pixels.

### 1.5 Light/dark architecture (VERIFIED)

Both themes define the same semantic names (`bg-primary`, `border-primary`, `text-secondary`, `accent`) under `[data-theme=dark|light]`. Components never reference hex. There is also a `glass` theme that swaps solid steps for white-alpha overlays (#ffffff08, #ffffff12, #ffffff26), showing that the same roles can be filled by translucent white on one deep background.

---

## 2. Raycast (dark-first, single warm accent)

Sources: https://www.raycast.com (CSS custom properties), https://manual.raycast.com/themes (official theme docs). A third-party summary (oh-my-design.kr, refero) claims the page is "98% achromatic" with one coral accent; that percentage is unverified, but my measurements agree with the direction.

### 2.1 Surface ladder (VERIFIED, raycast.com `:root`)

| Token | Hex | L* (COMPUTED) |
|---|---|---|
| grey-900 / --background | #07080a | 2.2 |
| grey-800 | #0c0d0f | 3.6 |
| grey-700 | #111214 | 5.4 |
| color-bg-100 | #101111 | 5.0 |
| color-bg-200 | #18191a | 8.7 |
| grey-600 | #1b1c1e | 10.2 |
| grey-500 | #2f3031 | 19.8 |
| color-bg-300 | #313133 | 20.4 |
| grey-400 | #434345 | 28.5 |

Same pattern as Linear: page near L* 2, first panel near 5, card near 9 to 10. Neutrals have a faint cool tint.

### 2.2 Border strategy (VERIFIED + INFERRED)

- Named border `--color-border: #242728` (L* 15.4).
- Real usage is almost all white-alpha hairlines: `1px solid #ffffff0f` (6 percent) is the most common card border, then `#ffffff1a` (10 percent), `#ffffff14`, `#fff3` (20 percent). Literal counts in CSS: #ffffff1a 144, #ffffff0f 66, #ffffff0d 33.
- Rule (INFERRED): borders and dividers are 5 to 10 percent white over whatever surface is below, so they auto-adapt to every layer.

### 2.3 Text tiers (VERIFIED, contrast COMPUTED on #07080a)

| Tier | Hex | Contrast |
|---|---|---|
| fg | #f4f4f6 | 18.2 |
| fg-200 | #c2c7ca | 11.8 |
| grey-200 (most used body-dim) | #9c9c9d | 7.3 |
| fg-300 | #78787c | 4.6 |
| fg-400 | #5e6366 | 3.3 |

Also heavy use of white alpha for text: #ffffffe6 (90 percent), #ffffffb3 (70), #ffffff80 (50).

### 2.4 Accent usage (VERIFIED + INFERRED)

- Brand accent `#ff6363` (red-dark), 31 literal plus 9 variable uses, against hundreds of neutral/alpha uses. Contrast on page 6.9:1.
- Status set exists but is tiny and tinted: blue #57c1ff (10.0:1), green #59d499, yellow #ffc533, red #ff6161, each with a 15 percent "transparent" version (#57c1ff26 etc.) used as fills behind the saturated text color.
- Primary button is NOT the accent: `button-bg #ffffffd0` with `button-fg #18191a` (near-white button, dark text). The accent is reserved for brand moments and artwork.

### 2.5 Light mode (VERIFIED for the app docs, not for the site)

- raycast.com has no light stylesheet (zero `prefers-color-scheme` rules), so the site is dark only.
- The Raycast app follows system appearance and lets you pick a separate theme for Light and Dark. A theme is defined by three inputs: background, primary text, support colors (https://manual.raycast.com/themes). Same economy as Linear's base/accent/contrast: very few inputs, everything else derived.

---

## 3. Resend (dark-first, near-monochrome)

Source: https://resend.com CSS custom properties. Resend is the cleanest example of "separation without hue".

### 3.1 Surface and gray ladder (VERIFIED dark: `:root.dark`; contrast and L* COMPUTED)

Canvas: `--background: #000`, `--bg-base: black`. Then a 12-step gray scale (Radix-style numbering, steps 1 to 12):

| Step | Hex | L* | Role (INFERRED from Radix convention) |
|---|---|---|---|
| gray-1 | #141517 | 6.7 | app surface |
| gray-2 | #191b1e | 9.7 | subtle surface |
| gray-3 | #212629 | 14.8 | component bg |
| gray-4 | #293034 | 19.4 | component hover |
| gray-5 | #333b3e | 24.3 | component active |
| gray-6 | #3b4345 | 27.8 | subtle border |
| gray-7 | #434a4d | 30.9 | border |
| gray-8 | #52595b | 37.3 | strong border, placeholder |
| gray-9 | #6e7679 | 49.1 | solid |
| gray-10 | #878d8f | 58.2 | hover solid |
| gray-11 | #a1a4a5 | 67.2 | secondary text (8.4:1 on black) |
| gray-12 | #f0f0f0 | 94.8 | primary text (18.4:1) |

Alpha companions: gray-a1..a12 (e.g. a3 `#b0c7d925`, a4 `#caecff33`), used for borders and hover fills over any surface. Gray hue is cool (blue-green tint), the only chroma in the whole neutral scale.

### 3.2 Border strategy (VERIFIED counts)

Most-used border colors: `#ffffff0d` (5 percent), `gray-a3` (about 15 percent cool white), `gray-3`, slate-6/8 alphas. Ring for focus `--ring-accent: gray-a4`. Rule: 1px, low alpha, from the same scale.

### 3.3 Accent usage (VERIFIED + INFERRED)

- There is no chromatic brand accent in the UI tokens. `--bg-accent` is white in dark and black in light; `--text-on-accent` flips (black on white in dark, white on black in light). The "accent" is inversion.
- Blue is available (Radix-style blue-a1..a12 alpha scale, 12 alpha refs in the CSS) but used for rare states and illustration. Rainbow tokens (cyan #00d1c6, amber #e9ac48, purple #611c98) only for decoration/animation, at reduced alpha in dark (`#00d1c670`).
- Text uses only gray-11 / gray-12 and alpha variants. Over 90 references to gray-12 and 69 to gray-11.

### 3.4 Light mode (VERIFIED)

`:root,.light-theme` redefines the same tokens: `--background #fdfdfd`, `--canvas #eee`, `--bg-base white`, gray-12 `#191919` as text, gray-a1..a12 as black alphas (`#0000000d` to `#000000f2`) for borders and fills. So light mode = same 12 roles, scale reversed, alpha base switches from cool white to black. Overlay `#fffffff2` vs `#000000f2`.

---

## 4. Shared rules (what these three agree on)

Each rule is tagged by evidence.

1. **Separation comes from lightness steps, not hue.** (VERIFIED, COMPUTED) Page, panel, card and popover differ by 2 to 4 L* points each in dark (Linear 2.4, 4.6, 6.7, 9.2; Raycast 2.2, 5, 8.7, 10.2; Resend 0, 6.7, 9.7, 14.8). Total page-to-popover range is roughly 7 to 15 L*. Starting point for Oparax dark: page L* about 2 to 3, panel about 5, card about 7 to 9, raised about 10 to 14.

2. **The neutral ramp carries a faint cool tint that matches the accent.** (VERIFIED) Linear #08090a to #191a1b, Raycast #07080a, Resend #141517 to #333b3e all have blue channel slightly above red/green. This is why a blue accent looks native rather than pasted on. Oparax should tint neutrals toward its accent hue at very low chroma (about 0.005 to 0.015 in OKLCH).

3. **Borders are hairlines, 1px, low contrast, often white or black alpha.** (VERIFIED) Dark: 5 to 10 percent white (Raycast #ffffff0f, #ffffff1a; Linear #ffffff0d, #ffffff14; Resend #ffffff0d). Solid fallbacks sit 10 to 12 L* above the surface (Linear #23252a at L* 14.7 on a 2.4 page). Linear's 2024 refresh explicitly removed borders and softened contrast. Use fewer borders and let surface steps do the work; add a border only where two same-level surfaces touch.

4. **Text is a 4-tier ramp, never pure white or black.** (VERIFIED, COMPUTED) Dark: about 18:1, 12 to 14:1, 6 to 7:1, 3.3 to 4.5:1 (Linear #f7f8f8 / #d0d6e0 / #8a8f98 / #62666d). Light (Linear): 14:1, 10:1, 5:1, 3.7:1 using tinted near-black #282a30. Tier 4 is placeholder/disabled only. Body copy and long reads should stay in tiers 1 to 3 to keep 4.5:1.

5. **Accent is rationed: roughly 5 percent or less of pixels.** (INFERRED from CSS counts and Raycast/Resend behavior) It marks: primary action, link, selected/active state, focus ring, small status dots, selection highlight. It does not paint large panels, card backgrounds or headings. Linear: about 34 accent references versus about 440 neutral. Raycast: coral only in brand moments. Resend: no chromatic accent at all.

6. **The primary button is not always the accent.** (VERIFIED) Raycast uses a near-white button (#ffffffd0 with #18191a text). Resend inverts (white on black in dark, black on white in light). Linear uses the indigo for primary but keeps it tight. The inverted neutral button is a valid way to keep accent scarce; the accent then goes to links, selection, focus, and active indicators.

7. **Accent comes with a tint and a hover, as a small set.** (VERIFIED, Linear) accent, accent-hover (a lighter step in both modes), accent-tint (near-black wash in dark #18182f, near-white wash in light #f1f1ff). Raycast mirrors this with each status color plus a 15 percent alpha fill (#57c1ff26). Selected rows, chips and badges use the tint fill with the saturated accent for text or border.

8. **Accent lightness differs by mode, hue stays.** (VERIFIED) Linear dark text/link accent #828fff vs light #7070ff; brand fill #5e6ad2 in dark (white text 4.7:1) vs #7070ff in light (white text only 3.85:1, so large or bold labels only). For Oparax blue: in dark use a lighter blue for text and links (target 6:1+ on page), a mid blue for fills with white text (target 4.5:1+), and in light use a deeper blue for text (target 4.5:1+ on white).

9. **Semantic token names, same set in both modes.** (VERIFIED) Linear `[data-theme]`, Resend `:root` vs `:root.dark`, Raycast one dark set. Components reference roles (bg-primary, border-secondary, text-tertiary, accent), never hex. Light mode swaps values only.

10. **Light mode is a re-mapped ladder, not an inversion.** (VERIFIED, COMPUTED) Page becomes white (or #fdfdfd), surfaces step down 1 to 2 L* each (Linear 100, 97.6, 96.2, 94.8), borders darker neutrals (#e9e8ea to #dcdbdd, L* 92 to 87.5), shadows return (Linear light shadow-low `0 1px 4px -1px #00000017`, medium `0 3px 12px #00000017`), text becomes tinted near-black (#282a30), and accent tint flips to a pale wash. In dark, shadows barely matter; in light, shadows plus 1px borders do the separation because tints are too faint.

11. **Few inputs generate the whole system.** (VERIFIED) Linear: base, accent, contrast. Raycast: background, text, support colors. Resend: one gray scale plus an alpha twin. The takeaway for Oparax: define one tinted neutral scale (about 12 steps) plus an alpha version, one accent with tint/hover, a small status set with 15 percent fills, then map components to roles. Contrast as one dial (Linear) is a clean way to later offer variants.

12. **Status colors are small, tinted, and desaturated into fills.** (VERIFIED, Raycast) Saturated color for the text or dot, 15 percent alpha of the same color for the chip or row fill.

---

## 5. Mapping the rules to Oparax roles (INFERRED, suggestions only)

| Oparax surface | Dark rule | Light rule |
|---|---|---|
| Page / feed background | step 0 (L* about 2 to 3) | white or #fdfdfd |
| Sidebar / app shell | step 1 (L* about 5) | step -1 (about 97.5) |
| Story card | step 2 (L* about 7 to 9) plus 1px alpha border (6 to 8 percent white) | white with 1px border (#e9e8ea) and shadow-low |
| Popover / dialog | step 3 (L* about 10 to 14) plus shadow-high | white plus shadow-medium plus border |
| Citation chip / badge | accent-tint fill, accent text | accent-tint fill (pale blue), deeper blue text |
| Primary button | either accent fill with white text, or inverted neutral (Raycast/Resend pattern) | same choice, mirrored |
| Links, selected nav item, focus ring | accent (lighter variant in dark) | deeper accent |
| Dividers inside lists | quietest line step (Linear line-quaternary, L* about 7 in dark) | #f0f0f0 |
| Body text / meta / timestamps / placeholder | tiers 2, 3, 4 | tiers 2, 3, 4 |

Animated React Bits effects (INFERRED): keep glows and gradients in the accent hue at low alpha over the step-0 background, so they read as light on the same tinted neutral rather than a second color. Resend's rainbow tokens drop to about 44 percent alpha in dark (`#00d1c670`), a useful precedent.

## 6. Open items and honesty notes

- Linear's contrast range (30 to 100) and the exact LCH formulas are not published in the article; I did not find the generator source. Marketing-site hex values are used as a proxy for app output.
- Third-party claims about Raycast ("98 percent achromatic", #040506 canvas) did not match the CSS I measured (#07080a), so I used the CSS values.
- Accent share numbers are token reference counts in shipped CSS, not pixel measurements. They show the proportion of declarations, not screen area.
- Resend's light-mode gray scale numbering is unusual (gray-1 is #f0f0f0 and the middle steps are dark), so I treat its dark scale as the reference and its light mode as an alpha-over-white system.
- No section here required a login or any form entry.

## 7. Source list

- https://linear.app/now/how-we-redesigned-the-linear-ui
- https://linear.app/now/behind-the-latest-design-refresh
- https://linear.app (CSS bundles under https://static.linear.app/web/_next/static/css/, tokens under `[data-theme=dark]`, `[data-theme=light]`, `[data-theme=glass]`)
- https://www.raycast.com (CSS custom properties in `:root`)
- https://manual.raycast.com/themes
- https://resend.com (CSS custom properties in `:root` and `:root.dark`)
