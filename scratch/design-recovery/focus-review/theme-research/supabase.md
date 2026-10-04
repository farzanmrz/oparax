# Supabase design system color logic (research for Oparax theming)

Researched 2026-10-01. Read-only research, public sources only.

## 0. How to read this file

- VERIFIED: copied from Supabase source files or their design-system page.
- COMPUTED: I ran the published formulas myself (OKLCH to sRGB, alpha composited over the page background). Hex values are my arithmetic on verified inputs, not values Supabase prints. Treat as accurate to about plus or minus 1 per channel.
- INFERRED: my reading of component code or numbers, not stated by Supabase.

Sources (all fetched directly):

- S1 https://supabase.com/design-system/docs/color-usage (token names, Radix v0.1.9 statement, `--primary-hue` knob)
- S2 https://raw.githubusercontent.com/supabase/supabase/master/packages/ui/build/css/source/semantic.css (the formulas)
- S3 https://raw.githubusercontent.com/supabase/supabase/master/packages/ui/build/css/themes/dark.css
- S4 https://raw.githubusercontent.com/supabase/supabase/master/packages/ui/build/css/themes/light.css
- S5 https://raw.githubusercontent.com/supabase/supabase/master/packages/ui/build/css/source/compat.css (old token names mapped to new ones)
- S6 https://raw.githubusercontent.com/supabase/supabase/master/packages/ui/build/css/source/global.css (Radix gray and slate ladders)
- S7 https://raw.githubusercontent.com/supabase/supabase/master/packages/config/css/theme.css (Tailwind v4 mapping, `bg-surface-100` etc.)
- S8 https://raw.githubusercontent.com/supabase/supabase/master/packages/ui/src/components/shadcn/ui/{button,card,input,badge,tabs,switch,checkbox,alert,dropdown-menu,sidebar}.tsx
- S9 https://raw.githubusercontent.com/supabase/supabase/master/packages/config/css/utilities.css (`focus-ring`)
- S10 Pre-refactor themes, same paths at commit 9fbe5152d9 (April 2026), for the classic hex values everyone remembers.
- S11 https://github.com/supabase/supabase/pull/47288 "Color system" (merged 2026-07-03). Commits a31ca2bad0 (2026-09-22) and 5f9ce727c0 (2026-08-18) tuned it further.

Important timing fact (VERIFIED, S2/S11): Supabase replaced its hand-picked gray tables with a formula system in July 2026. The old token names still exist as aliases (S5). So "Supabase colors" now means a small set of inputs that derive everything in OKLCH. That is ideal for Oparax: swap one hue input and the whole system follows.

## 1. The one-paragraph answer

Supabase is almost entirely neutral. Pages are built from about 5 near-black (or near-white) steps that each rise by a fixed lightness amount, separated by hairline borders made from the foreground color at 7 to 30 percent alpha. Green appears in only four jobs: the primary button fill, links and small text accents, the focus ring and "on" state of switches, and success badges. Checkboxes, active tabs, active sidebar rows and hover states are all neutral (white or black at low alpha). The harmony comes from using ONE hue for every neutral (a faint tint) plus one spot hue, with status colors (amber, red, violet) pulled slightly toward the spot hue. Separation comes from three layers in this order: lightness step, then 1px border, then (rarely) shadow.

## 2. The input model (VERIFIED, S2/S3/S4)

Every semantic color is derived from these inputs. Themes only override the inputs.

| Input | Dark | Light | Meaning |
|---|---|---|---|
| `--hue` (spot hue) | 157.5 | 157.5 | Supabase green in OKLCH. Drives `--primary-hue`. |
| `--surface-hue` | = hue (157.5) | 34 (but chroma is 0, so no tint) | Hue of the neutral ramp |
| `--chroma` | 0.005 | 0 | Tint strength of neutrals. Dark neutrals carry a barely visible green cast. |
| `--surface` | 0.19 | 0.995 | Page background lightness (OKLCH L) |
| `--elevation-step` | 0.025 | 0.024 | Lightness added per elevation level. Positive in both modes: higher = lighter. |
| `--foreground-lightness` | 0.95 | 0.10 | Text lightness |
| `--contrast` | 0.5 | 0.53 | Global knob (0 to 1) that scales border alpha and muted text |
| `--muted-foreground-level` | 0.8 | 0.65 | How far muted text sits from surface toward foreground |
| `--tertiary-foreground-level` | 0.65 | 0.5 | Same for tertiary text |
| `--field-alpha` | 0.12 | 0.015 (default) | Black wash for sunk inputs |
| `--expressive-chroma` | 0.14 | 0.14 | Shared chroma for warning/destructive/info |

Key rules from S2:

- background = oklch(surface, chroma x 0.5, surface-hue)
- card = background lightness + step x 1
- popover = + step x 1.5
- secondary = + step x 2
- muted, accent, tertiary are NOT solid colors: they are the foreground color at alpha (step / span) x 1, x 1.5, x 2. So hover and selected fills automatically lighten on dark and darken on light, over any surface.
- border = foreground at alpha 2% + 20% x contrast-border, where contrast-border = (0.05 + 0.95 x contrast) squared. At contrast 0.5 that is about 7.5%.
- Primary has three forms: `--primary` (readable ink, brighter on dark, darkened on light for AA), `--primary-solid` (deeper button plate), `--primary-bright` (focus rings and selected controls, stays vivid in both modes).
- Status hues: warning 75, destructive 25, info 288 (violet), each pulled 15% toward the spot hue and clamped so amber stays amber and red stays red. With a blue spot hue they shift only a few degrees.
- Status lightness is fixed per mode, not derived from the neutral ramp: warning .80/.55, destructive .55/.52, info .70/.54 (dark/light).

## 3. Full token ladder, resolved (COMPUTED from S2/S3/S4)

Dark mode (default appearance). Alpha tokens shown as the solid they produce over the page background `#131413`, and over a card `#181a19` in brackets.

| Role | Token(s) | Dark | Light |
|---|---|---|---|
| App background | `--background`, `--background-default`, `--background-dash-canvas`, `--background-dash-sidebar`, `--background-alternative-default` | `#131413` (L .19) | `#fdfdfd` (L .995) |
| Surface 75 / 100 / "200 bg" | `--card`, `--background-surface-75`, `--background-surface-100`, `--background-200`, `--background-alternative-200` | `#181a19` (L .215) | `#ffffff` (L 1.019 clamps to white) |
| Surface 200 / muted | `--muted`, `--background-surface-200`, `--background-muted` (fg at 3.3% dark, 2.7% light) | `#1a1b1a` [`#1f2120`] | `#f7f7f7` [`#fefefe`] |
| Surface 300 / secondary / overlay / button | `--secondary`, `--background-surface-300`, `--background-overlay-default`, `--background-button-default` (solid, step x 2) | `#1e201f` (L .24) | `#ffffff` |
| Popover / dialog | `--popover`, `--background-dialog-default` (step x 1.5) | `#1b1d1c` | `#ffffff` |
| Hover / selection / control bg | `--accent`, `--background-selection`, `--background-control`, `--background-overlay-hover` (fg at 4.9% / 4.0%) | `#1e1f1e` [`#232423`] | `#f3f3f3` [`#fbfbfb`] |
| Surface 400 / tertiary | `--tertiary`, `--background-surface-400` (fg at 6.6% / 5.4%) | `#212222` [`#262827`] | `#f0f0f0` [`#f8f8f8`] |
| Sunk input field | `--field` (black at 12% dark, 1.5% light) | `#111211` | `#fafafa` |
| Raised control (select) | `--control-raised` (white at 2.1% dark) | `#1d1f1e` | `#ffffff` |
| Border default / muted / secondary / alternative / button | `--border`, `--border-default`, `--border-muted`, `--border-secondary` (fg at 7.5% dark, 8.1% light) | `#232524` | `#e9e9e9` |
| Border control / strong / input | `--input`, `--border-control`, `--border-strong` (13.5% / 14.6%) | `#303231` | `#d9d9d9` |
| Border overlay | `--border-overlay` (13.4% / 14.4%) | `#303130` | `#d9d9d9` |
| Border stronger / button-hover | `--border-stronger`, `--border-button-hover` (17.4% / 18.8%) | `#393a39` | `#cecece` |
| Border on control hover | `--border-control-hover` (28% / 29.8%) | `#505150` | `#b3b3b3` |
| Foreground default | `--foreground`, `--foreground-default` | `#edefee` (L .95) | `#030303` (L .10) |
| Foreground light | `--muted-foreground`, `--foreground-light` | `#bcbdbc` | `#464646` |
| Foreground lighter / muted | `--tertiary-foreground`, `--foreground-lighter`, `--foreground-muted` | `#989a99` | `#696969` |
| Foreground contrast (text on inverted fill) | `--foreground-contrast` | `#131413` | `#fdfdfd` |
| Primary ink (links, small accents) | `--primary` | `#4acd8b` oklch(.76 .15 157.5) | `#0e7e4e` oklch(.525 .12 157.5) |
| Primary hover | `--primary-hover` (L +.04 dark, -.04 light) | `#59da97` | `#007243` |
| Primary solid (button) | `--primary-solid` | `#006338` oklch(.436 .11 157.5) | = primary `#0e7e4e` |
| Primary solid hover | `--primary-solid-hover` | `#076e43` | `#007243` |
| Text on solid | `--primary-solid-foreground` | `#edefee` | `#fafcfb` |
| Primary bright (ring, switch on) | `--primary-bright` = max(L .7, C .15) | `#4acd8b` | `#30ba79` |
| Focus ring | `--ring` = primary-bright at 55% alpha, 2px, 2px offset in background color | same | same |
| Warning | `--warning` | `#f2af48` oklch(.80 .14 75) | `#ac5800` oklch(.55 .14 58) |
| Destructive | `--destructive` | `#b54a46` oklch(.55 .14 25) | `#ab413e` oklch(.52 .14 25) |
| Info | `--info` | `#9b8ff0` oklch(.70 .14 288) | `#6c5eba` oklch(.54 .14 288) |
| Status border | `--border-warning/destructive/info` | status color at 30% alpha | same |

Note on light mode (VERIFIED code, COMPUTED result): card, popover and secondary all compute to L at or above 1.0 and clamp to white. So in light mode surfaces 75 to 100 and overlays are pure white on a `#fdfdfd` page (a 1% difference). Light-mode separation is therefore carried by the border (`#e9e9e9`) and the muted wash (`#f7f7f7`), not by background steps. That is why the file comment says "soft-gray canvas... so elevated surfaces have headroom".

### Brand and status stepped scales (VERIFIED values, S3/S4; hex COMPUTED from the HSL)

These 200 to 600 scales are per-theme literals, used for alerts, badges and tinted blocks. 200 is the faintest tint, 600 the strongest text color.

| Step | Brand dark | Brand light | Warning dark | Warning light | Destructive dark | Destructive light |
|---|---|---|---|---|---|---|
| default | `#3ecf8e` | `#3fcf8e` | `#db8e00` (600) | `#dc7b18` (600) | `#e54d2e` | `#e54d2e` |
| 600 | `#85e0ba` (text) | `#097c4f` (text) | `#db8e00` | `#dc7b18` | `#f16a50` | `#ca3214` |
| 500 | `#006239` (border) | `#16b674` | `#693f05` | `#f3ba63` | `#7f2315` | `#f3b0a2` |
| 400 | `#00311d` | `#72e3ad` | `#4a2900` | `#ffe3a2` | `#541c15` | `#fdd8d3` |
| 300 | `#002918` | `#a9f1ca` | `#341c00` | `#fff4d5` | `#3b1813` | `#fff0ee` |
| 200 | `#000a07` | `#d3f8e4` | `#291900` | `#fefbf5` | `#1d1412` | `#fffcfc` |

Pattern worth copying: in dark mode the scale runs from near-black tint (200) up to bright text (600); in light mode it runs from near-white tint (200) down to dark text (600). A tinted alert is `bg-X-200` + `border-X-400` + icon chip `bg-X-600`. Alerts and inputs in error state use exactly this (S8 alert.tsx, input.tsx).

## 4. Which underlying scale (VERIFIED + INFERRED)

- VERIFIED (S1): "The colors are taken from `@radix-ui/colors` v0.1.9 except the Brand and Scale colors." All Radix scales are exposed as `--colors-{name}{1..12}`, including gray, slate, blue, indigo, violet, crimson, tomato, amber, green and so on.
- VERIFIED (S6): gray-dark 1 to 12 lightness is 8.6, 11, 13.7, 15.7, 18, 20.4, 24.3, 31.4, 43.9, 49.4, 62.7, 92.9 percent (`#161616`, `#1c1c1c`, `#232323`, `#282828`, `#2e2e2e`, `#343434`, `#3e3e3e`, `#505050`, `#707070`, `#7e7e7e`, `#a0a0a0`, `#ededed`). Light: 98.8, 97.3, 95.3, 92.9, 91, 88.6, 85.9, 78, 56.1, 52.2, 43.5, 9 (`#fcfcfc` to `#171717`). Slate (a cool 200 to 210 degree gray with 5 to 7 percent saturation) is also shipped, with the same lightness ladder.
- INFERRED: the numbers match Radix's 12-step convention (steps 1 to 2 backgrounds, 3 to 5 component backgrounds, 6 to 8 borders, 9 to 10 solid, 11 to 12 text). Supabase uses the same step semantics.
- The post-July-2026 semantic tokens do NOT read these ladders directly any more (they compute lightness from formulas). The ladders now serve charts, `--background-button-default` fallbacks and legacy code. The old direct picks (S10, pre-refactor) were: dark background `#121212`, sidebar/surface-75 `#171717`, surface-100 `#1f1f1f`, surface-200 `#212121`, surface-300/400 `#292929`, overlay `#242424`, selection `#313131`, border default `#2e2e2e`, strong `#363636`, stronger `#454545`, control `#393939`; text `#fafafa` / `#b4b4b4` / `#898989` / `#4d4d4d`. Light: surface-100 `#fcfcfc`, surface-200 `#f3f3f3`, surface-300 `#ededed`, border `#dfdfdf`, strong `#d4d4d4`, stronger `#8f8f8f`, text-light `#525252`, lighter `#707070`. The new computed values are very close to these, just slightly lighter and tinted.

## 5. How elements are separated

Order of preference (INFERRED from component code in S8, with the cited classes VERIFIED):

1. Lightness step between layers. Page `#131413`, card `#181a19`, popover `#1b1d1c`, button/secondary `#1e201f`. Only about 2.5 L points per step in dark. Too small to separate alone, which is why a border always accompanies it.
2. 1px border, the workhorse. Card: `border bg-surface-100 shadow-xs`. Input: `border-control` (stronger) with `hover:border-control-hover` (stronger still). Dropdown/menu: `border-overlay bg-overlay shadow-lg`. Hierarchy of borders: muted/default (7.5%) for static layout, control/strong (13.5%) for interactive edges, stronger (17%) for button hover, control-hover (28%) for focus/hover on inputs. Interactive things get a stronger border than static ones; this is the main "separated yet harmonious" trick.
3. Fill-by-alpha for state. Hover, selected, muted wash: foreground color at 3 to 7 percent alpha, so it works over any layer and any mode.
4. Shadows are nearly absent. Card uses `shadow-xs`; popovers `shadow-md/lg`; switch thumb `shadow-lg`. No colored shadows. In dark mode shadows are invisible against `#131413`, so the border does the work.
5. Sunk vs raised controls: inputs are SUNK (`--field`, black at 12% in dark, so slightly darker than the card), selects are RAISED (`--control-raised`, white at about 2%). So a form reads as depth without borders getting heavier.
6. Card headers use a `border-b` hairline divider and `text-xs font-mono uppercase` titles; tabs use a 1px track line with a 2px foreground-colored underline. Structure through lines and type, not color.

## 6. Where brand color is and is not used (VERIFIED from S1, S8)

Used (spot color):
- Default button: `bg-primary-solid text-primary-solid-foreground hover:bg-primary-solid-hover`. A deep green plate (`#006338` dark), not the neon `#3ecf8e`.
- Link variant and branded text: `text-primary`.
- Switch ON: `bg-primary-bright`, thumb `bg-primary-foreground`.
- Focus ring: `ring-ring` = primary-bright at 55 percent, 2px with 2px offset.
- Success badge: `bg-brand-default/10 text-brand-600 border-brand-500`.
- Selected controls generally (`bg-primary-bright` per S1) and the logo / marketing hero (fixed `--brand-default` `#3ecf8e`, "fixed Supabase green for branded surfaces").

NOT used (neutral foreground instead):
- Checkbox checked: `bg-foreground text-background` (white box on dark).
- Active tab: `text-foreground` with a `bg-foreground` underline.
- Active sidebar item: `bg-sidebar-accent` + `text-foreground` (neutral wash, not green).
- Hover on ghost/outline buttons and menu items: `bg-accent` / `bg-overlay-hover` (neutral).
- Secondary button, default badge, alert default icon chip (`bg-foreground text-background`).
- Table, card, form chrome, nav.

S1 explicitly says: "Use accent text colors (e.g. text-destructive, text-warning) sparingly to avoid visual overload", and "Primary is the theme's functional accent. Changing `--primary-hue` updates primary text, buttons, selected controls, and focus rings."

Share of a typical screen (INFERRED, not measured): brand color covers well under 5 percent of pixels in the Studio dashboard (one primary button, a few links, a focus ring, small badges and toggles). Roughly 90 to 95 percent is neutral surfaces, borders and text; the remainder is semantic status color. Marketing pages (supabase.com) use more green, but still mostly as glow gradients, a single CTA, and small text.

## 7. State expression

- Hover (button, primary): lightness shifts only, +0.04 L on dark, -0.04 L on light (`--button-fill-hover-delta`), hue and chroma preserved. S2 notes mixing with foreground "reads as yellow" in light mode, so they changed lightness only.
- Hover (neutral items): `bg-accent` (foreground at 4.9 percent) or `bg-overlay-hover` for menu rows; border steps up one level on controls (`hover:border-control-hover`).
- Hover (secondary button): `bg-secondary/80`. Destructive: `bg-destructive/90`.
- Selected: `bg-accent` wash + `text-foreground` (tabs, sidebar); switches use `bg-primary-bright`; checkboxes use inverted foreground.
- Focus: `focus-visible` only. Ring 2px, `--ring` (primary-bright at 55 percent), offset 2px in background color so it floats. Inputs also raise border to `border-control-hover` on focus. Dense rows use `focus-inset` (outline, no box-shadow).
- Disabled: `opacity-50` and pointer-events off. Placeholder text is `foreground-muted`.
- Destructive: solid fill `bg-destructive` with `destructive-foreground` text (white on red). Error input: `bg-destructive-200 border-destructive-400`, hover/focus border goes to full `destructive`. Alert: `bg-destructive-200 border-destructive-400` and icon chip `bg-destructive-600`.
- Warning: same pattern with the warning scale, amber. Badge: `bg-warning/10 text-warning-600 border-warning-500`.
- Info: violet `oklch(.7 .14 288)` dark / `oklch(.54 .14 288)` light, used as a third status hue distinct from brand.

## 8. Token to generic role map

| Supabase token | Generic role for Oparax |
|---|---|
| `--background` | App canvas |
| `--background-surface-75` / `-100` / `--card` | Card, panel, sidebar |
| `--popover`, `--background-dialog-default` | Dialog, popover, command menu |
| `--secondary`, `--background-surface-300`, `--background-overlay-default` | Raised control, dropdown, secondary button |
| `--muted`, `--background-surface-200` | Quiet wash, table header, code block |
| `--accent`, `--background-selection`, `--background-overlay-hover` | Hover and selected row |
| `--tertiary`, `--background-surface-400` | Pressed, chip, strongest neutral wash |
| `--field` | Text input fill (sunk) |
| `--control-raised` | Select/dropdown trigger fill |
| `--border` / `--border-muted` | Static dividers, card edge |
| `--input` / `--border-control` / `--border-strong` | Interactive edge (input, outline button) |
| `--border-stronger` / `--border-button-hover` | Hover edge |
| `--border-control-hover` | Focus/hover edge on inputs |
| `--foreground` | Primary text, headings |
| `--muted-foreground` / `--foreground-light` | Body secondary text |
| `--tertiary-foreground` / `--foreground-lighter` | Captions, placeholders, inactive nav |
| `--primary` | Link, accent text, small indicator |
| `--primary-solid` + `-foreground` | Primary button plate and its label |
| `--primary-bright` | Selected control, switch on, ring source |
| `--ring` | Focus ring |
| `--brand-default` + `brand-200..600` | Fixed brand art, success tints |
| `--warning-*`, `--destructive-*`, `--info` | Status |

## 9. Takeaways for Oparax (INFERRED, design suggestions for the council)

1. Copy the architecture, not the hexes: 1 neutral ramp (tinted faintly toward blue, chroma about 0.005 to 0.016 in OKLCH) + 1 spot hue (the owner's blue) + 3 status hues. Everything else is lightness steps and alpha.
2. Spot hue goes into exactly: primary button plate (deep, L about .44), links/small accent text (L .76 dark, .525 light), switch/selected, focus ring. Keep checkbox, tabs, nav active, hover neutral. That is what makes it look like "more than two colors yet harmonious": the neutrals carry the structure.
3. Dark steps of about 0.025 L per layer plus a border of foreground at 7.5 percent (hover 13.5, strong 17, focus 28). Light mode: near-white page, white cards, and rely on the border (8 percent) and a 3 percent wash.
4. Variants along the owner's blue / black / gray range are cheap: change `--surface-hue`, `--chroma`, `--surface` and `--primary-hue` only. Supabase itself documents that `--surface-hue` and `--primary-hue` are separable so "a cool-gray surface against the green brand" is a supported configuration (S2 comment). Chroma 0 gives pure gray, 0.005 gives a hint, 0.016 (Supabase root default) gives a visible tint.
5. Watch out: a blue spot hue near L .76 is lighter than Supabase's green because blue has less perceived lightness; keep `--primary` L about .72 to .78 on dark and confirm contrast. The 0.15 chroma used for green may be out of sRGB gamut for some blue hues at high L; reduce to about 0.13 and check.
6. Fixed status lightness (not derived from the neutral ramp) is a good rule: status colors stay legible when the theme is dialed toward gray.
7. Amber/red/violet status hues drift only 15 percent toward the spot hue and are clamped, so they will still read as warning/error against blue.
