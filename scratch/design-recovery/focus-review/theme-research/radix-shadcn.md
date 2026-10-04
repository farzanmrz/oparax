# Radix scales and shadcn mapping (research)

Scope: read-only research for the Oparax color system (black / gray / blue range, owner's blue accent, light and dark, Open Sans). Written 2026-10-01.

## Evidence labels

- VERIFIED: read from a primary source in this run (raw Radix Colors v3.0.0 source on GitHub, shadcn/ui repo files, tweakcn repo file) or computed locally from verified hex values (OKLCH and contrast ratios, my own sRGB to OKLab and WCAG 2 math).
- DOCS: stated on the official docs page, fetched through a summarizing fetch tool, so wording is paraphrased.
- INFERRED: my recommendation or reasoning, not stated by a source.
- UNVERIFIED: could not be confirmed in this run.

Primary sources:
- Radix scale guide: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Radix gray pairing: https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette
- Radix raw light values: https://raw.githubusercontent.com/radix-ui/colors/main/src/light.ts
- Radix raw dark values: https://raw.githubusercontent.com/radix-ui/colors/main/src/dark.ts (package.json says version 3.0.0)
- Radix usage: https://www.radix-ui.com/colors/docs/overview/usage
- Radix Themes color tokens: https://www.radix-ui.com/themes/docs/theme/color
- shadcn theming: https://ui.shadcn.com/docs/theming
- shadcn docs-site CSS: https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/app/globals.css
- shadcn theme registry (blue theme): https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/themes.ts
- tweakcn presets: https://raw.githubusercontent.com/jnsahaj/tweakcn/main/utils/theme-presets.ts

## 1. Radix: what the 12 steps mean

DOCS (understanding-the-scale):

| Step | Role |
|---|---|
| 1 | App background |
| 2 | Subtle background (cards, sidebars, striping) |
| 3 | UI element background (default) |
| 4 | Hovered UI element background |
| 5 | Active or selected UI element background |
| 6 | Subtle borders and separators |
| 7 | UI element border and focus rings |
| 8 | Hovered UI element border |
| 9 | Solid backgrounds (the "brand" color) |
| 10 | Hovered solid backgrounds |
| 11 | Low-contrast text |
| 12 | High-contrast text |

Other documented rules:
- Steps 11 and 12 are guaranteed Lc 60 and Lc 90 APCA contrast on a step 2 background of the same family. Step 12 is the body-text step, step 11 the secondary-text step.
- Steps 3, 4, 5 are one progression (rest, hover, pressed). Steps 6, 7, 8 are the same progression for borders.
- Most step 9 colors take white text. Sky, Mint, Lime, Yellow, Amber take dark text.
- Light scales apply to `:root`, `.light`, `.light-theme`. Dark scales apply to `.dark`, `.dark-theme`. The same step number keeps the same job in both modes, so a mapping written in step numbers works for both themes.
- Radix Themes (the component library) exposes `--accent-1..12`, `--accent-a1..a12`, `--accent-surface`, `--accent-indicator`, `--accent-track`, `--accent-contrast`, the same for `--gray-*`, plus `--color-background`, `--color-panel-solid`, `--color-panel-translucent`, `--color-surface`, `--color-overlay`, `--focus-1..12`. It pairs an accent with a matching gray automatically ("auto" gray). The exact auto mapping algorithm was not shown (UNVERIFIED), but the documented manual table below is the same idea.

## 2. The gray variants and which pair with blue

DOCS (composing-a-palette) pairing table:

| Gray | Pairs with |
|---|---|
| Slate | Iris, Indigo, Blue, Sky, Cyan |
| Mauve | Tomato, Red, Ruby, Crimson, Pink, Plum, Purple, Violet |
| Sage | Mint, Teal, Jade, Green |
| Olive | Grass, Lime |
| Sand | Yellow, Amber, Orange, Brown |
| Gray | Pure neutral, goes with any accent, "minimalist" |

Rule from Radix: pick the gray whose tint is closest to the accent hue for a "more colorful and harmonious vibe". Caution from the same page: be careful with saturated (tinted) grays as app background, especially in dark mode, because colorful components such as badges can clash with them.

VERIFIED step 1 and 2 values for each gray (hue and chroma show how tinted each one is):

| Gray | Light 1 | Light 2 | Dark 1 | Dark 2 | Dark 1 OKLCH |
|---|---|---|---|---|---|
| gray | #fcfcfc | #f9f9f9 | #111111 | #191919 | oklch(0.178 0 -) |
| slate | #fcfcfd | #f9f9fb | #111113 | #18191b | oklch(0.179 0.004 286) |
| mauve | #fdfcfd | #faf9fb | #121113 | #1a191b | oklch(0.180 0.004 308) |
| sage | #fbfdfc | #f7f9f8 | #101211 | #171918 | oklch(0.180 0.004 165) |
| olive | #fcfdfc | #f8faf8 | #111210 | #181917 | oklch(0.180 0.004 129) |
| sand | #fdfdfc | #f9f9f8 | #111110 | #191918 | oklch(0.177 0.002 107) |

Only slate (and plain gray) apply to a blue accent. Slate chroma is 0.003 to 0.016 across the whole scale, which reads as "black and gray with a cool cast", not as "blue".

## 3. Exact scales: slate, blue, indigo, cyan (VERIFIED hex from raw source, OKLCH computed locally)

### Slate light
| Step | Hex | OKLCH |
|---|---|---|
| 1 | #fcfcfd | 0.991 0.001 286 |
| 2 | #f9f9fb | 0.983 0.003 286 |
| 3 | #f0f0f3 | 0.956 0.004 286 |
| 4 | #e8e8ec | 0.932 0.005 286 |
| 5 | #e0e1e6 | 0.910 0.007 277 |
| 6 | #d9d9e0 | 0.887 0.010 286 |
| 7 | #cdced6 | 0.853 0.011 280 |
| 8 | #b9bbc6 | 0.794 0.016 278 |
| 9 | #8b8d98 | 0.645 0.016 278 |
| 10 | #80838d | 0.611 0.015 273 |
| 11 | #60646c | 0.502 0.014 264 |
| 12 | #1c2024 | 0.241 0.010 248 |

### Slate dark
| Step | Hex | OKLCH |
|---|---|---|
| 1 | #111113 | 0.179 0.004 286 |
| 2 | #18191b | 0.213 0.004 264 |
| 3 | #212225 | 0.252 0.006 271 |
| 4 | #272a2d | 0.283 0.007 248 |
| 5 | #2e3135 | 0.312 0.008 256 |
| 6 | #363a3f | 0.347 0.010 254 |
| 7 | #43484e | 0.399 0.012 253 |
| 8 | #5a6169 | 0.489 0.016 252 |
| 9 | #696e77 | 0.537 0.015 262 |
| 10 | #777b84 | 0.583 0.015 267 |
| 11 | #b0b4ba | 0.769 0.010 258 |
| 12 | #edeef0 | 0.949 0.003 265 |

Slate dark alpha (white-ish overlays, from `slateDarkA`): 6 `#d6ebfd30`, 7 `#d9edff40`, 8 `#d9edff5d`, 11 `#f1f7feb5`, 12 `#fcfdffef`. Light alpha (`slateA`): 6 `#00002f26`, 7 `#00062e32`, 8 `#00083046`.

### Blue light
| Step | Hex | OKLCH |
|---|---|---|
| 1 | #fbfdff | 0.993 0.003 248 |
| 2 | #f4faff | 0.982 0.009 243 |
| 3 | #e6f4fe | 0.960 0.020 239 |
| 4 | #d5efff | 0.938 0.035 235 |
| 5 | #c2e5ff | 0.905 0.051 240 |
| 6 | #acd8fc | 0.863 0.068 243 |
| 7 | #8ec8f6 | 0.810 0.089 243 |
| 8 | #5eb1ef | 0.734 0.121 243 |
| 9 | #0090ff | 0.649 0.193 252 |
| 10 | #0588f0 | 0.622 0.183 252 |
| 11 | #0d74ce | 0.556 0.162 252 |
| 12 | #113264 | 0.324 0.096 259 |

### Blue dark
| Step | Hex | OKLCH |
|---|---|---|
| 1 | #0d1520 | 0.194 0.025 256 |
| 2 | #111927 | 0.213 0.030 261 |
| 3 | #0d2847 | 0.274 0.066 254 |
| 4 | #003362 | 0.320 0.097 252 |
| 5 | #004074 | 0.367 0.106 251 |
| 6 | #104d87 | 0.416 0.113 252 |
| 7 | #205d9e | 0.474 0.122 253 |
| 8 | #2870bd | 0.541 0.140 253 |
| 9 | #0090ff | 0.649 0.193 252 |
| 10 | #3b9eff | 0.688 0.169 251 |
| 11 | #70b8ff | 0.764 0.126 249 |
| 12 | #c2e6ff | 0.907 0.051 238 |

### Indigo light
| Step | Hex | OKLCH |
|---|---|---|
| 1 | #fdfdfe | 0.994 0.001 286 |
| 2 | #f7f9ff | 0.982 0.008 271 |
| 3 | #edf2fe | 0.961 0.017 268 |
| 4 | #e1e9ff | 0.935 0.031 270 |
| 5 | #d2deff | 0.902 0.047 270 |
| 6 | #c1d0ff | 0.862 0.068 271 |
| 7 | #abbdf9 | 0.806 0.088 271 |
| 8 | #8da4ef | 0.731 0.112 270 |
| 9 | #3e63dd | 0.544 0.191 267 |
| 10 | #3358d4 | 0.511 0.195 267 |
| 11 | #3a5bc7 | 0.509 0.172 267 |
| 12 | #1f2d5c | 0.313 0.086 269 |

### Indigo dark
| Step | Hex | OKLCH |
|---|---|---|
| 1 | #11131f | 0.191 0.025 277 |
| 2 | #141726 | 0.209 0.030 275 |
| 3 | #182449 | 0.272 0.071 268 |
| 4 | #1d2e62 | 0.318 0.095 267 |
| 5 | #253974 | 0.362 0.104 267 |
| 6 | #304384 | 0.403 0.111 269 |
| 7 | #3a4f97 | 0.449 0.120 269 |
| 8 | #435db1 | 0.502 0.137 268 |
| 9 | #3e63dd | 0.544 0.191 267 |
| 10 | #5472e4 | 0.589 0.176 269 |
| 11 | #9eb1ff | 0.776 0.114 273 |
| 12 | #d6e1ff | 0.911 0.043 270 |

### Cyan (for a cool secondary / chart hue)
- Light 1..12: #fafdfe #f2fafb #def7f9 #caf1f6 #b5e9f0 #9ddde7 #7dcedc #3db9cf #00a2c7 #0797b9 #107d98 #0d3c48
- Dark 1..12: #0b161a #101b20 #082c36 #003848 #004558 #045468 #12677e #11809c #00a2c7 #23afd0 #4ccce6 #b6ecf7

### Other step 9 hues useful for charts and states (VERIFIED hex)
- violet 9 `#6e56cf` (light 11 `#6550b9`, dark 11 `#baa7ff`)
- sky 9 `#7ce2fe` (light 11 `#00749e`, dark 11 `#75c7f0`)
- green 9 `#30a46c` (light 11 `#218358`, dark 11 `#3dd68c`, dark 3 `#132d21`)
- red 9 `#e5484d` (light 11 `#ce2c31`, dark 11 `#ff9592`, light 3 `#feebec`, dark 3 `#3b1219`)
- amber 9 `#ffc53d` (light 11 `#ab6400`, dark 11 `#ffca16`, light 3 `#fff7c2`, dark 3 `#302008`)

## 4. Where the owner's blue sits on the Radix hue map (VERIFIED math)

| Color | OKLCH |
|---|---|
| Owner light accent #245dec | 0.535 0.224 264 |
| Owner dark accent #6b94ff | 0.686 0.164 266 |
| Radix blue 9 #0090ff | 0.649 0.193 252 |
| Radix indigo 9 #3e63dd | 0.544 0.191 267 |
| Tailwind blue-700 (shadcn blue theme primary) | 0.488 0.243 264.4 |

- The owner's accent is hue 264 to 266. That is Radix indigo territory (hue 267), 12 to 14 degrees away from Radix blue (252). It is also the same hue as shadcn's own blue theme primary.
- Radix pairs slate with Iris, Indigo, Blue, Sky, Cyan, so slate is the correct gray for this accent either way.
- INFERRED: take the Radix indigo scale as the accent ramp (steps 1 to 8 and 10 to 12 for tints, borders, text) and put the owner's hex at step 9 (light #245dec, dark #6b94ff). If a brighter, more "sky" blue is wanted, Radix blue is the alternative, but blue 9 has only 3.26:1 against white, so it needs larger text or a darker step 10.

Why the current theme reads as "too blue, monotone" (computed from repo `app/globals.css` hex values plus Radix values):
- Current dark surfaces: background #090f1d = oklch(0.170 0.031 266), card #141e31 = oklch(0.236 0.040 263). Chroma 0.031 to 0.040 at the same hue as the accent.
- Radix slate dark surfaces have chroma 0.004 to 0.006. Radix indigo dark steps 1 and 2 have chroma 0.025 and 0.030, so the current dark background and card are about as saturated as Radix's indigo-tinted app backgrounds, roughly 7 to 10 times the chroma of slate.
- When every surface, border and accent shares one hue and chroma family, only lightness separates them. INFERRED cause of the owner's complaint. Radix's own page warns about saturated grays in dark mode.
- Light mode is already near slate: #f6f8fc = oklch(0.979 0.006 265) versus slate 2 = oklch(0.983 0.003 286). So the change is mostly dark mode.

## 5. How shadcn and Tailwind v4 themes are built

VERIFIED from shadcn docs and repo:
- Every semantic token is a pair: surface token plus `-foreground` (primary with primary-foreground). Full list: background, foreground, card, card-foreground, popover, popover-foreground, primary, primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent, accent-foreground, destructive, border, input, ring, chart-1..5, sidebar, sidebar-foreground, sidebar-primary, sidebar-primary-foreground, sidebar-accent, sidebar-accent-foreground, sidebar-border, sidebar-ring, radius. The docs-site CSS adds destructive-foreground, surface, code, selection.
- Raw values live in `:root` and `.dark`. A `@theme inline` block maps `--color-primary: var(--primary)` etc., which creates the `bg-primary`, `text-primary-foreground` utilities. `@custom-variant dark (&:is(.dark *))` switches modes. Oparax's `app/globals.css` already follows this exactly.
- Values default to OKLCH since the Tailwind v4 update; hex also works (Oparax uses hex).
- Default neutral light: background oklch(1 0 0), foreground oklch(0.145 0 0), primary oklch(0.205 0 0), secondary/muted/accent oklch(0.97 0 0), muted-foreground oklch(0.556 0 0), border and input oklch(0.922 0 0), ring oklch(0.708 0 0), sidebar oklch(0.985 0 0).
- Default neutral dark: background oklch(0.145 0 0), card and popover oklch(0.205 0 0), primary oklch(0.922 0 0), secondary and muted oklch(0.269 0 0), accent oklch(0.371 0 0), muted-foreground oklch(0.708 0 0), border oklch(1 0 0 / 10%), input oklch(1 0 0 / 15%), ring oklch(0.556 0 0), sidebar oklch(0.205 0 0), sidebar-primary oklch(0.488 0.243 264.376).
- Two shadcn habits worth copying: dark borders are white at 10 to 15% alpha (adapts to any surface, same idea as Radix `slateDarkA`), and the only chromatic token in the neutral theme is sidebar-primary.
- shadcn "blue" theme (registry/themes.ts) changes only a few tokens. Light primary oklch(0.488 0.243 264.376), primary-foreground oklch(0.97 0.014 254.604), dark primary oklch(0.424 0.199 265.638), chart-1..5 oklch(0.809 0.105 251.813), (0.623 0.214 259.815), (0.546 0.245 262.881), (0.488 0.243 264.376), (0.424 0.199 265.638), sidebar-primary light oklch(0.546 0.245 262.881), dark oklch(0.623 0.214 259.815). Neutrals stay neutral (secondary oklch(0.967 0.001 286.375)). Pattern: neutral base, brand on primary, ring, sidebar-primary and the chart ramp only.

VERIFIED tweakcn mechanics (preset file): a preset is `{label, styles: {light: {...}, dark: {...}}}` with exactly the shadcn token keys plus optional font-sans/serif/mono, radius, shadow-color/opacity/blur/spread/offset, letter-spacing, spacing. The editor edits those keys and exports them as `:root` and `.dark` CSS (Tailwind v3 or v4, OKLCH or HSL or hex). Export format details come from secondary sources and were not checked in the tweakcn code (UNVERIFIED). The preset list includes `supabase` and no `vercel` preset.

### The tweakcn Supabase preset (VERIFIED values; a community interpretation, not Supabase's own CSS)

Light: background #fcfcfc, foreground #171717, card #fcfcfc, popover #fcfcfc, primary #72e3ad (fg #1e2723), secondary #fdfdfd, muted #ededed, accent #ededed, border #dfdfdf, input #f6f6f6, ring #72e3ad, sidebar #fcfcfc, sidebar-foreground #707070, destructive #ca3214, chart-1..5 #72e3ad #3b82f6 #8b5cf6 #f59e0b #10b981.

Dark: background #121212, foreground #e2e8f0, card #171717, popover #242424, primary #006239 (fg #dde8e3), secondary #242424, muted #1f1f1f, accent #313131, border #292929, input #242424, ring #4ade80, sidebar #121212, sidebar-foreground #898989, destructive #541c15, chart-1..5 #4ade80 #60a5fa #a78bfa #fbbf24 #2dd4bf.

What it shows (computed): dark surface ladder in OKLCH lightness is 0.182 (background), 0.205 (card), 0.239 (muted), 0.260 (popover, secondary), 0.281 (border), 0.313 (accent), all chroma 0. Radix slate dark steps 1 to 6 are 0.179, 0.213, 0.252, 0.283, 0.312, 0.347 with chroma 0.004 to 0.010. The two ladders are nearly the same rungs. So "Supabase harmony" is: a neutral ladder with about 0.02 to 0.03 lightness per rung, one brand color on primary/ring/charts, and a muted brand-tinted dark primary (#006239) rather than a glowing one. Substituting the owner's blue for green on top of Radix slate reproduces that structure.

## 6. Recommended mapping: Radix step to shadcn token

Principle (INFERRED, built on Radix step roles): same step number in both modes. Neutrals from slate, accent from indigo with the owner's hex swapped in at step 9. Blue shows only on: primary, ring, links, selected nav, charts, focus.

| shadcn token | Radix step | Light | Dark |
|---|---|---|---|
| background | slate 2 light, slate 1 dark | #f9f9fb | #111113 |
| foreground | slate 12 | #1c2024 | #edeef0 |
| card | white light, slate 2 dark | #ffffff | #18191b |
| card-foreground | slate 12 | #1c2024 | #edeef0 |
| popover | white light, slate 3 dark (raised) | #ffffff | #212225 |
| popover-foreground | slate 12 | #1c2024 | #edeef0 |
| primary | owner accent (indigo 9 slot) | #245dec | #6b94ff |
| primary-foreground | white light, slate 1 dark | #ffffff | #111113 |
| secondary | slate 4 | #e8e8ec | #272a2d |
| secondary-foreground | slate 12 | #1c2024 | #edeef0 |
| muted | slate 3 | #f0f0f3 | #212225 |
| muted-foreground | slate 11 | #60646c | #b0b4ba |
| accent (hover, menu highlight) | slate 5 | #e0e1e6 | #2e3135 |
| accent-foreground | slate 12 | #1c2024 | #edeef0 |
| destructive | red 9 for fills, red 11 for text | #e5484d | #e5484d |
| border | slate 6 (dark alt: slate-a6 `#d6ebfd30`) | #d9d9e0 | #363a3f |
| input | slate 7 (see a11y note) | #cdced6 | #43484e |
| ring | indigo 8 dark, owner accent light | #245dec | #435db1 |
| chart-1 | owner accent | #245dec | #6b94ff |
| chart-2 | blue 9 / blue 10 | #0090ff | #3b9eff |
| chart-3 | cyan 9 / cyan 11 | #00a2c7 | #4ccce6 |
| chart-4 | violet 9 / violet 11 | #6e56cf | #baa7ff |
| chart-5 | slate 9 / slate 11 | #8b8d98 | #b0b4ba |
| sidebar | slate 1 light, slate 2 dark | #fcfcfd | #18191b |
| sidebar-foreground | slate 11 | #60646c | #b0b4ba |
| sidebar-primary | owner accent | #245dec | #6b94ff |
| sidebar-primary-foreground | same as primary-foreground | #ffffff | #111113 |
| sidebar-accent (selected item) | indigo 3 | #edf2fe | #182449 |
| sidebar-accent-foreground | indigo 11 | #3a5bc7 | #9eb1ff |
| sidebar-border | slate 6 | #d9d9e0 | #363a3f |
| sidebar-ring | same as ring | #245dec | #435db1 |

Notes on choices:
- Three neutral tiers (muted 3, secondary 4, accent 5) keep Radix's rest, hover, pressed ladder across three shadcn slots because shadcn has one slot per role. Choice is INFERRED. If hover on a ghost button feels heavy in light mode, use slate 4 for accent.
- Light surfaces: background slate 2 plus white cards gives separation by lightness and a slate 6 hairline. Radix Themes does the same with `--color-panel-solid` (white) on a step 1 or 2 app background (DOCS names the tokens; the white value is INFERRED).
- Dark popover one rung above card (slate 3) is what makes menus separate from cards without a bigger border. Supabase preset does the same (popover #242424 over card #171717).
- Blue stays out of surfaces. Only sidebar-accent and selected states use indigo 3 and 11 tints.
- Semantic states: green 9 #30a46c, amber 9 #ffc53d, red 9 #e5484d, each with step 3 background and step 11 text (values in section 3). This keeps DESIGN.md's rule that green, amber, red are states, not decoration.

Contrast checks (computed WCAG 2.x ratios, VERIFIED math):

| Pair | Ratio |
|---|---|
| slate 12 on slate 2, light | 15.6 |
| slate 11 on slate 2, light | 5.65 |
| slate 11 on white, light | 5.94 |
| slate 11 on slate 3, light | 5.22 |
| slate 12 on slate 2, dark | 15.2 |
| slate 11 on slate 2, dark | 8.45 |
| slate 11 on slate 3 (popover), dark | 7.64 |
| white on #245dec | 5.45 |
| white on indigo 9 #3e63dd | 5.21 |
| #111113 on #6b94ff (dark primary button) | 6.56 |
| #6b94ff as text on slate 2, dark | 6.12 |
| indigo 11 #9eb1ff on slate 1, dark | 9.15 |
| indigo 11 #9eb1ff on indigo 3 #182449 | 7.34 |
| indigo 11 #3a5bc7 on indigo 3 #edf2fe, light | 5.35 |
| white on red 9 #e5484d | 3.91 (fails 4.5 for small text; use red 11 as text, keep red 9 for large or filled areas, or darken) |
| white on blue 9 #0090ff | 3.26 (fails; avoid Radix blue 9 as a white-text button) |
| border slate 6 on slate 2 dark | 1.54 (hairline, decorative) |
| border slate 7 on white, light | 1.57 |
| slate 9 on white | 3.30 |
| ring indigo 8 #435db1 on slate 1 dark | 3.09 |
| ring indigo 8 #8da4ef on white, light | 2.42 (too faint, which is why light ring uses the owner accent at 5.21 to 5.45) |

Accessibility note on `input`: the repo currently uses `--input` #6d7f9e, a darker border so field edges reach about 3:1. Slate 7 as input border is only about 1.6:1 against white. If WCAG 1.4.11 on field boundaries matters, use slate 9 (#8b8d98, 3.30:1) in light and slate 8 or 9 in dark; if the look should match Vercel/Supabase hairlines, accept slate 7 and add a slate 3 field fill. Decision belongs to the owner.

## 7. Variant ranges this lens supports (INFERRED, for the council)

All use the same token table above; only the neutral family and chroma change.

| Variant | Neutral ladder | Dark bg / card | Light bg | Character |
|---|---|---|---|---|
| A. Slate + indigo (Radix canonical) | slate | #111113 / #18191b | #f9f9fb | Cool black and gray, blue only on action. Closest to "Supabase with blue". |
| B. Pure gray + blue | gray | #111111 / #191919 | #f9f9f9 | Vercel-like. Gray dark ladder: #111111 #191919 #222222 #2a2a2a #313131 #3a3a3a #484848 #606060 #6e6e6e #7b7b7b #b4b4b4 #eeeeee. Gray light: #fcfcfc #f9f9f9 #f0f0f0 #e8e8e8 #e0e0e0 #d9d9d9 #cecece #bbbbbb #8d8d8d #838383 #646464 #202020. Blue pops most. |
| C. Blue-tinted navy (nearest the current look, but stepped down) | blue/indigo steps 1 to 6 for dark surfaces | #0d1520 / #111927 (blue 1, 2) or #11131f / #141726 (indigo 1, 2) | #f4faff (blue 2) or #f7f9ff (indigo 2) | Most blue, most cohesive, highest risk of the "monotone" complaint; keep borders on slate to compensate. |
| D. Near-black with sparing blue | gray or slate, with surfaces one rung darker (use step 1 for background, step 1 to 2 for card) | #0b0b0c-ish custom (not a Radix value) | #fcfcfd | Maximum separation by borders, blue only on primary and focus. Custom value is INFERRED. |

Light-mode behaviour for each: the same step numbers apply, since Radix keeps the roles identical across modes.

## 8. Custom palette generator

https://www.radix-ui.com/colors/custom takes three inputs (accent color, gray color, background color) and outputs 12-step light and dark scales for backgrounds, components, borders, solids and text. The page text I could fetch did not describe the algorithm or caveats (UNVERIFIED). Practical use: enter #245dec as accent, slate-like gray, background #111113 (dark) and #f9f9fb (light), then compare its step 9, 11 and 12 with the hand mapping above. Generated scales would replace the "swap the owner's hex into indigo step 9" shortcut with a fully consistent ramp.

## 9. Limits of this research

- tweakcn export implementation, Radix custom generator algorithm and Radix Themes' blue-to-slate auto mapping were not confirmed from source.
- Tailwind v4 compiling opacity modifiers on theme variables to `color-mix` was not re-fetched here; it is background knowledge (UNVERIFIED in this run). It matters because `ring-ring/50`, `bg-primary/80` and `outline-ring/50` in the repo CSS rely on it.
- Supabase's and Vercel's own CSS custom properties are out of scope for this file (other researchers); the tweakcn Supabase preset above is a third-party approximation.
- The recommended mapping, variant table and tier choices are my reasoning, not Radix or shadcn guidance, and have not been rendered.
