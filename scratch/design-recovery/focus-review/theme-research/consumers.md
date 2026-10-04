# Which color tokens our components consume (theme contract research)

Scope: read-only inspection of `scratch/design-recovery/site` (call it SITE) and `scratch/design-recovery/pro-exploration/catalog/src/tsx` (call it CATALOG, 135 fetched React Bits Pro sources). Counts come from `rg -o` over class strings and are exact for the stated pattern, but a pattern is not a parser, so treat them as +/- a few percent. "Verified" means read from a file or from the compiled CSS in `SITE/build`. "Inferred" means my reasoning from those facts.

## 1. The headline findings

1. **Three independent color vocabularies exist in the code, and a theme must feed all three.**
   - (a) shadcn semantic tokens (`--background`, `--card`, `--primary`, ...). Used by `components/ui`, `components/ai-elements`, all of `SITE/next` and most of `SITE/pro`.
   - (b) The React Bits Pro contract: a literal Tailwind `neutral-50..950` ladder, `white`/`black`, and two variables `--rb-accent` / `--rb-accent-fg`. Used by `components/blocks` (34 installed Pro blocks) and by all 135 CATALOG sources.
   - (c) A legacy reference-set vocabulary (`--bg --surface --soft --ink --muted --line --blue --wash`, plus `--card`) defined only in `app/globals.css` and switched by `html[data-theme=light]`, not by `.dark`. Read by 5 React Bits animated components (`MagicBento`, `SpotlightCard`, `Stack`, `LogoLoop`, `AccordionGallery`).
2. **The Pro ladder and accent only apply inside `.rb-theme-scope`.** In both `next.css` and `pro.css` the `--color-neutral-*` overrides and `--rb-accent`/`--rb-accent-fg` are declared on `.rb-theme-scope`, not on `:root`. Only 4 elements carry that class: `pro/d2/blocks/feed-reader.tsx`, `pro/d2/blocks/workspace-window.tsx`, `pro/d2/blocks/setup-log.tsx`, `pro/d4/feed.tsx`. Nothing under `SITE/next` uses it. Verified in the compiled CSS `SITE/build/dev/static/css/app/(pro)/layout.css`: lines 75-87 hold the stock Tailwind ladder at `:root` with chroma 0 (`--color-neutral-500: oklch(55.6% 0 none)`) plus `--color-white: #fff`, `--color-black: #000`; the tinted ladder appears only at line 10965 onward under `.rb-theme-scope`. So an installed block dropped on a page outside the scope renders pure-gray neutrals and the Pro default accent (light: near-black `oklch(20.5% 0 0)` button; dark: white button), not our blue.
3. **The tinted ladder does not match the semantic tokens.** Converting hex to OKLCH (my calculation, section 5): a Pro block using `dark:bg-neutral-950` renders `#040a17`, darker than the app `--background` `#090f1d`; `dark:bg-neutral-900` is `#0d1729` against `--card` `#141e31`; `dark:border-neutral-800` is `#1a263c` against `--border` `#2a3952`. Blocks and shadcn components sit on slightly different surfaces unless the ladder is derived from the same palette.
4. **Tailwind v4 makes the ladder cheap to retheme.** `bg-neutral-100` compiles to `background-color: var(--color-neutral-100)`, `bg-white` to `var(--color-white)`, and `bg-white/10` to `color-mix(in oklab, var(--color-white) 10%, transparent)` (verified, build CSS lines 3623, 3785, 7466-7472). Redefining 11 neutral variables (and optionally white/black) once at `:root` re-skins all 1846 neutral references in installed blocks and all 6685 in CATALOG, in both modes, because the `dark:` variant is already wired to the `.dark` class (`@custom-variant dark (&:where(.dark, .dark *))`).
5. **The animated components are mostly color-free or prop-driven.** Of the ones named, only `StatusMark` is used by the owner-facing `/next` routes. `AnimatedContent` and `ScrollStack` hold no colors. `ThoughtLine` takes `color` (default `var(--foreground, #64748b)`). `MagicBento` has hard-coded purple and a default RGB glow. `Stack`, `SpotlightCard`, `LogoLoop` read legacy reference vars that `next.css`/`pro.css` do not define.

## 2. Token files, every variable and value

Both files share: `@import "tailwindcss"; "tw-animate-css"; "shadcn/tailwind.css"`, `@custom-variant dark (&:where(.dark, .dark *))`, Open Sans `@font-face` (`/fonts/opensans.ttf`, weight 300 to 800), `@theme inline` mapping every semantic token to `--color-*`, `--radius-sm/md/lg/xl` as radius -4/-2/0/+4px, `--breakpoint-desk: 700px`. Mode switch: `next` toggles the `dark` class on `<html>` from a pre-paint script (`next/theme.tsx`, key `oparax-next-theme`, default dark, `?theme=light|dark` override). `pro` hard-codes `className="dark"` on `<html>`.

### 2.1 Semantic variables (source: `SITE/app/(next)/next.css` and `SITE/app/(pro)/pro.css`)

Cells show the `next` value; where `pro` differs it follows after a slash.

| Variable | `:root` (light) | `.dark` |
|---|---|---|
| `--background` | `#f3f6fb` / pro `#f6f8fc` | `#090f1d` |
| `--foreground` | `#132139` | `#f0f4ff` |
| `--card` | `#ffffff` | `#141e31` |
| `--card-foreground` | `#132139` | `#f0f4ff` |
| `--popover` | `#ffffff` | `#141e31` |
| `--popover-foreground` | `#132139` | `#f0f4ff` |
| `--primary` | `#245dec` | `#6b94ff` |
| `--primary-foreground` | `#ffffff` | `#081022` |
| `--secondary` | `#eaf0fa` | `#19253c` |
| `--secondary-foreground` | `#132139` | `#f0f4ff` |
| `--muted` | `#eaf0fa` | `#19253c` |
| `--muted-foreground` | `#4a5870` / pro `#526079` | `#a8b6ce` |
| `--accent` | `#e7eeff` | `#203664` |
| `--accent-foreground` | `#132139` | `#f0f4ff` |
| `--destructive` | `#c8313f` | `#ff7a86` |
| `--border` | `#bccadf` / pro `#d3ddec` | `#2a3952` |
| `--input` | `#b3c2d8` / pro `#d3ddec` | `#2a3952` |
| `--ring` | `#245dec` | `#6b94ff` |
| `--radius` | `10px` | (not redefined) |
| `--sidebar` | `#ffffff` | `#141e31` |
| `--sidebar-foreground` | `#132139` | `#f0f4ff` |
| `--sidebar-primary` | `#245dec` | `#6b94ff` |
| `--sidebar-primary-foreground` | `#ffffff` | `#081022` |
| `--sidebar-accent` | `#e7eeff` | `#203664` |
| `--sidebar-accent-foreground` | `#132139` | `#f0f4ff` |
| `--sidebar-border` | `#bccadf` / pro `#d3ddec` | `#2a3952` |
| `--sidebar-ring` | `#245dec` | `#6b94ff` |
| `--glow-1` | `#245dec` | `#1d3f9e` |
| `--glow-2` | `#6b94ff` | `#3f6fe8` |
| `--glow-3` | `#a9c1ff` | `#6b94ff` |

Not defined in either file (verified by grep), and nothing consumes them: `--chart-1..5`, `--destructive-foreground`, any success / warning / info token.

Also: `color-scheme: light` on `:root`, `dark` on `.dark`. `@layer base` sets `* { border-color: var(--border); outline: ring/50 }` and `body { bg-background text-foreground font-sans antialiased }`. `html` sets `--rb-section-min-h: 0px` (so Pro blocks stop forcing 100vh) and `scroll-padding-top` (72px; pro: 124px under 1280px).

### 2.2 React Bits scope block (both files, `.rb-theme-scope`)

| Variable | Value |
|---|---|
| `--rb-radius` | `10px` |
| `--rb-r-xs/sm/md/lg/xl/2xl/3xl/4xl` | radius -6, -4, -2, 0, +2, +4, +6, +8 px (calc/min/max forms, redeclared in scope because `:root` resolution would use the root radius) |
| `--rb-accent` | `#245dec` (light), `#6b94ff` under `.dark .rb-theme-scope` / `.dark.rb-theme-scope` |
| `--rb-accent-fg` | `#ffffff` (light), `#081022` (dark) |
| `--color-neutral-50` | next `oklch(98.5% 0.004 250)`, pro `oklch(98.5% 0.006 262)` |
| `-100` | next `oklch(97% 0.007 250)`, pro `oklch(97% 0.011 262)` |
| `-200` | next `oklch(92.2% 0.013 252)`, pro `oklch(92.2% 0.019 262)` |
| `-300` | next `oklch(87% 0.018 252)`, pro `oklch(87% 0.025 262)` |
| `-400` | next `oklch(70.8% 0.028 254)`, pro `oklch(70.8% 0.035 262)` |
| `-500` | next `oklch(55.6% 0.035 256)`, pro `oklch(55.6% 0.04 262)` |
| `-600` | next `oklch(43.9% 0.04 258)`, pro `oklch(43.9% 0.044 262)` |
| `-700` | next `oklch(37.1% 0.044 260)`, pro `oklch(37.1% 0.046 262)` |
| `-800 / -900 / -950` | both files: `oklch(26.9% 0.045 262)`, `oklch(20.5% 0.04 262)`, `oklch(14.5% 0.032 262)` |

The ladder is mode-independent: there is no `.dark` override for neutral steps, because blocks pair a light step with a `dark:` step (see 3.2).

Other difference between the two files: `next.css` adds `@source` for `../../next` and `../../components/ai-elements`; `pro.css` does not scan them.

### 2.3 Official upstream contract (source: `CATALOG/../app-ui-theme.json`, registry:style, docs https://pro.reactbits.dev/docs/app-ui/theming)

Upstream defines only `--rb-radius`, the `--rb-r-*` ladder, and `--rb-accent`/`--rb-accent-fg`, with defaults light accent `oklch(20.5% 0 0)`, fg `oklch(100% 0 0)`, dark accent `oklch(100% 0 0)`, fg `oklch(20.5% 0 0)`. These equal the per-use fallbacks inside blocks, for example `var(--rb-accent,oklch(20.5%_0_0))` (verified in `components/blocks/card-7.tsx` and others). The neutral ladder is not one of upstream's knobs; our scoped override is our own addition.

## 3. React Bits Pro blocks and components

### 3.1 Usage counts (rg -o over class strings)

| Pattern | `components/blocks` (34 files) | CATALOG (135 files) | `components/react-bits` (24) | `SITE/pro` (46) | `SITE/next` (25) |
|---|---|---|---|---|---|
| `neutral-50..950` | 1846 | 6685 | 37 | 3 (comments only) | 0 |
| any `dark:` variant | 1186 | 4253 | 24 | 13 | 8 |
| `--rb-accent` (fg included) | about 120 | 696 (512 accent, 184 fg) | 0 | 22 | 0 |
| `--rb-accent-fg` alone | 42 | 184 | 0 | 2 | 0 |
| `white` utilities (`bg/text/border/ring/from/fill-white`, any alpha) | 376 | 1115 | 13 | 7 | 0 |
| `black` utilities | 14 | 42 | 6 | 4 | 0 |
| `rgb(`/`rgba(` | 61 | 148 | 47 | 42 | 5 |
| hex literal | 22 | 94 | 69 | 19 | 0 |
| semantic token utilities (`bg-card`, `text-muted-foreground`, ...) | not counted | 10 | 0 | about 526 | about 277 |

Neutral step distribution, CATALOG: 50=253, 100=727, 200=623, 300=354, 400=592, 500=882, 600=392, 700=396, 800=748, 900=1208, 950=510. Utility kinds on neutral: text 3309, bg 2031, border 1032, from (gradients) 118, ring 61, divide 35, decoration 22, fill 15, stroke 12. Of the 6685 neutral references, 3251 are `dark:`-prefixed. Neutral with an opacity modifier (`neutral-200/70`): 302. `white`/`black` with alpha (`white/10`, `black/40`): 103. `color-mix` appears in 33 CATALOG files.

How `--rb-accent` is consumed in CATALOG (arbitrary-value forms): `bg-[var(--rb-accent...)]` 276, `outline-[var(--rb-accent...)]` 236 (every focus ring), `text-[var(--rb-accent-fg...)]` 182. Never used as text color, border color or gradient. 312 of the references are `dark:` forms. Other contract variables: `--rb-section-min-h` 11 uses, and the radius ladder (`--rb-r-md` 247, `-lg` 173, `-sm` 118, `-2xl` 90, `-xs` 19, `-4xl` 17, `-xl` 13, `-3xl` 2).

### 3.2 The role map Pro blocks assume (most frequent pairs in CATALOG, count in parentheses)

| Role | Light | Dark |
|---|---|---|
| Heading / primary text | `text-neutral-900` (540), `text-neutral-950` (48) | `dark:text-neutral-100` (339) |
| Secondary text | `text-neutral-600` (241), `text-neutral-700` (154) | `dark:text-neutral-300` (161), `dark:text-neutral-200` (35) |
| Muted text | `text-neutral-500` (567), `text-neutral-400` (136) | `dark:text-neutral-400` (371), `dark:text-neutral-500` (245) |
| Page / section background | `bg-white` (387), `bg-neutral-50` (134) | `dark:bg-neutral-950` (278) |
| Card / panel surface | `bg-white`, `bg-neutral-50` | `dark:bg-neutral-900` (236) |
| Raised / hover / inset surface | `bg-neutral-100` (172), `bg-neutral-200` (57), `hover:bg-neutral-50/100` | `dark:bg-neutral-800` (181), `dark:hover:bg-neutral-800` (102), `dark:bg-neutral-700` (37) |
| Border | `border-neutral-200` (230), `border-neutral-200/70` (158), `border-neutral-300` (52) | `dark:border-neutral-800` (362), `dark:border-neutral-700` (51) |
| Inverted solid (non-accent button, selected chip) | `bg-neutral-900` (69), `bg-neutral-950` (30) | `dark:bg-white` (98) with `dark:text-neutral-900` (42) |
| Gradient fades | `from-white` (63) | `dark:from-neutral-950` (54), `dark:from-neutral-900` (35) |
| Primary action fill | `bg-[var(--rb-accent)]` + `text-[var(--rb-accent-fg)]` | same variables, re-pointed by the dark values |
| Focus ring | `outline-[var(--rb-accent)]` | same |
| On-dark / on-accent text | `text-white` (95) | `dark:text-white` (242) |

Inference: neutral-900 is the light-mode text color and also the dark-mode card, so a ladder that doubles as the semantic palette needs neutral-900 near `--foreground` (light) and near `--card` (dark). In the current navy palette those are almost the same color (`#132139` vs `#141e31`), which is why the present ladder works at all. A black/gray theme must keep that property or the roles drift.

### 3.3 Status and brand colors inside Pro blocks (escape any theme)

CATALOG fixed-hue utilities: `bg-amber-500` 17, `text-red-600` 17, `text-red-400` 16, `bg-red-500` 13, `bg-emerald-500` 12, `border-red-500` 10, `bg-purple-500` 8, `bg-purple-600` 7, `bg-emerald-400` 6, plus `text-emerald-600/400`, `text-amber-600/500`, `text-indigo-300..700`. Installed `components/blocks` (plus react-bits, pro, next combined): `bg-emerald-500` 7, `bg-purple-600` 6, `bg-purple-500` 6, `bg-emerald-400` 5, `bg-red-500` 3, `text-emerald-600` 3. Hex literals in CATALOG concentrate in decorative blocks: `device.tsx` 14, `magic-transform.tsx` 8, `hero-24.tsx` 6, `center-flow.tsx` 6, `blinking-dots.tsx` 6, `scroll-stack.tsx` 5. Most frequent hex: `#ffffff` 10, `#0a0a0a` 9, `#484848` 6, `#e724eb` 4, `#7c3aed` 4.

## 4. React Bits animated components in `components/react-bits`

Used by `/next` and `/pro` today: `StatusMark` (from `next/building/run.tsx` and `next/feed/parts.tsx`) only. Everything else is installed for the reference set or the catalog and is not imported by `SITE/next` or `SITE/pro` (verified by import grep; `pro/d1/blocks/magic-transform.tsx` is a separate adapted copy).

| Component | What colors it reads | Escapes our theme? |
|---|---|---|
| `StatusMark` | prop `color` (default `currentColor`), `doneColor` default `#22c55e`, `errorColor` default `#ef4444`; all strokes use `currentColor` | Defaults escape, but both call sites pass `color="var(--color-muted-foreground)"`, `doneColor="var(--color-foreground)"`, `errorColor="var(--color-destructive)"`, so it follows the theme. There is no success-green token. |
| `ThoughtLine` | `color` default `var(--foreground, #64748b)`; glyph color defaults to it; shimmer gradient derives from it | Follows `--foreground`. The `#64748b` fallback applies only if the variable is missing. |
| `MagicBento` | `glowColor` default RGB triplet `"62, 137, 255"` (our `#245dec` is `36, 93, 236`); six cards each `color: "#120F17"` (purple-black); injects `--purple-primary rgba(132,0,255,1)`, `--purple-glow`, `--purple-border`; shadows `rgba(46,24,78,...)`; reads `--line`, `--card`, `--ink` | Yes. Purple and the card fill are hard-coded; `--line` and `--ink` do not exist in `next.css`/`pro.css`. Needs `glowColor`, per-card `color`, and the purple variables neutralized. |
| `AnimatedContent`, `ScrollStack`, `d4-card-swap`, `d4-masonry`, `d4-source-flow`, `hover-preview` | no hex, rgba or neutral usage (motion and layout only) | No. |
| `parallax-cards` | one `ring-white/50` focus ring | Minor. |
| `Stack` | focus ring `ring-[var(--blue)]` | Yes: `--blue` is legacy and undefined in `next.css`/`pro.css`. |
| `SpotlightCard` | default `spotlightColor = "color-mix(in srgb, var(--blue), transparent 75%)"` | Yes, same reason. |
| `LogoLoop` | edge fade uses `var(--logoloop-fadeColor, var(--bg))` (legacy `--bg`); transparent end is literal `rgba(0,0,0,0)` | Yes unless `fadeOutColor="var(--background)"` is passed. |
| `AccordionGallery` | defaults `accentColor "#ffffff"`, `overlayColor "#060010"` (purple-black), `textColor "#ffffff"`; panel `bg-[var(--card)] text-[var(--ink)]` | Yes: `#060010` overlay and legacy `--ink`. |
| `BranchedMenu` | defaults `color`/`accentColor "#f5f5f5"`, `lineColor "#3f3f46"` (zinc, not navy) | Yes unless props are set. |
| `FolderFloat` | zinc defaults `#18181b #3f3f46 #52525b #f5f5f5 #fff` | Yes unless props are set. |
| `RubberSegment` | defaults `trackColor #27272a`, `thumbColor #fafafa`, `textColor #fafafa`, `activeTextColor #18181b` | Yes unless props are set. Used by `components/feed-heading.tsx` and `components/preview.tsx` (reference set). |
| `animated-list.tsx` | `#0a0a0a`, `neutral-*` x2, `white`/`black` x3, reads `--background` | Partly. |
| `card-spread`, `click-stack`, `device` | literal `#fff`, `#000`, `#0a0a15`, `#1a1a2e`, `#484848`, `#bcbcbc`, rgba | Yes (device frames and mockups, mostly intentional). |
| `scroll-stack.tsx` (lowercase file, not `ScrollStack.tsx`) | pastel hex `#9bd1ff #a8e6cf #c7b8ff #ffb3ba #ffd9a0`, `neutral-*` x11, `white` x8 | Yes (decorative palette). |
| `magic-transform.tsx` | purple/olive/rust hex `#7C3AED #2D1B3D #5C6B2E #9D2A6E #A8642A #2A5C8C`, neutral x24 | Yes. The adapted copy `pro/d1/blocks/magic-transform.tsx` already uses `PARTICLE_COLORS = ["var(--primary)", "var(--glow-2)", "var(--glow-3)"]`. |

Legacy reference vars these components read (source `SITE/app/globals.css`; dark is the default `:root`, light is `html[data-theme=light]`): `--bg #090f1d / #f6f8fc`, `--surface #141e31 / #fff`, `--soft #19253c / #eaf0fa`, `--ink #f0f4ff / #132139`, `--muted #a8b6ce / #526079`, `--line #2a3952 / #d3ddec`, `--blue #6b94ff / #245dec`, `--wash #203664 / #e7eeff`, `--button-ink #090f1d / #fff`, `--shadow`, `--font`. These do not exist when a page loads only `next.css` or `pro.css` (separate root layouts by design; `pro/layout.tsx` comment: the shared Pro theme never mixes with the reference set's CSS).

## 5. Conversion table (my calculation, Ottosson OKLab matrices, rounded)

Semantic palette in OKLCH:

| Token | hex | OKLCH |
|---|---|---|
| dark background | `#090f1d` | `oklch(17.0% 0.031 266)` |
| dark card/popover/sidebar | `#141e31` | `oklch(23.6% 0.040 263)` |
| dark secondary/muted | `#19253c` | `oklch(26.6% 0.046 263)` |
| dark accent | `#203664` | `oklch(34.1% 0.086 263)` |
| dark border | `#2a3952` | `oklch(34.3% 0.048 260)` |
| dark muted-foreground | `#a8b6ce` | `oklch(77.3% 0.038 261)` |
| dark foreground | `#f0f4ff` | `oklch(96.7% 0.015 270)` |
| dark primary | `#6b94ff` | `oklch(68.6% 0.164 266)` |
| light background (next / pro) | `#f3f6fb` / `#f6f8fc` | `oklch(97.2% 0.007 261)` / `oklch(97.9% 0.006 265)` |
| light secondary/muted | `#eaf0fa` | `oklch(95.4% 0.015 261)` |
| light accent | `#e7eeff` | `oklch(94.9% 0.024 268)` |
| light border (next / pro) | `#bccadf` / `#d3ddec` | `oklch(83.5% 0.033 258)` / `oklch(89.4% 0.023 258)` |
| light muted-foreground (next / pro) | `#4a5870` / `#526079` | `oklch(45.8% 0.043 261)` / `oklch(48.7% 0.044 262)` |
| light foreground | `#132139` | `oklch(24.9% 0.050 261)` |
| light primary | `#245dec` | `oklch(53.5% 0.224 264)` |

Current scoped ladder rendered as hex (next / pro): 50 `#f8fafd`/`#f8fafe`, 100 `#f2f6fa`/`#f1f5fd`, 200 `#dfe6ee`/`#dee6f2`, 300 `#ccd5e0`/`#cbd5e5`, 400 `#95a2b2`/`#95a1b7`, 500 `#667588`/`#67748b`, 600 `#455369`/`#45536b`, 700 `#324057`/`#334059`, 800 `#1a263c`, 900 `#0d1729`, 950 `#040a17`.

Reading: ladder 950 (L 14.5) is 2.5 lightness points darker than the dark `--background` (17.0), ladder 900 (20.5) is 3.1 darker than the dark `--card` (23.6), and ladder 800 (26.9) is 7.4 darker than the dark `--border` (34.3). Block borders look dimmer and block surfaces deeper than shadcn components next to them. Inference: visible only where Pro blocks and shadcn cards touch on the same screen.

## 6. AI Elements (`components/ai-elements`: chain-of-thought, code-block, loader, plan, queue, shimmer, sources, task, tool)

Semantic token utility counts (alpha stripped): `muted-foreground` 22, `foreground` 9, `muted` 8, `background` 4, `popover-foreground` 3, `destructive` 2, `border` 2, `secondary` 1, `primary` 1. Alpha modifiers used: `text-muted-foreground/40,/50`, `bg-muted/40,/50`, `bg-muted-foreground/10`, `border-muted-foreground/20,/50`, `bg-destructive/10`. No neutral ladder and no `dark:` color pairs; the two `dark:` uses only toggle code-block variants (`dark:hidden` / `dark:block`).

Literals that escape the theme:
- `tool.tsx` lines 53-57: status icons `text-yellow-600`, `text-blue-600`, `text-green-600`, `text-red-600`, `text-orange-600` (fixed hues, no dark counterparts).
- `code-block.tsx`: Shiki themes `one-light` and `one-dark-pro` (lines 64, 69) paint token colors; only the `<pre>` background and foreground are forced to `--background`/`--foreground` with `!`.
- `loader.tsx` line 76: `<rect fill="white">` mask.
- `shimmer.tsx` line 42: `#0000` transparent plus `var(--color-background)`; text is `var(--color-muted-foreground)`. Follows the theme.
- `sources.tsx` uses `text-primary` for the trigger.

## 7. shadcn primitives (`components/ui`, 25 files, style `radix-mira`, baseColor `zinc`)

Token usage (alpha stripped, class occurrences): `destructive` 40, `foreground` 26, `muted` 23, `ring` 20, `input` 17, `sidebar-accent-foreground` 16, `muted-foreground` 16, `primary` 12, `sidebar-accent` 11, `background` 9, `sidebar-foreground` 8, `sidebar-ring` 5, `sidebar` 5, `border` 5, `sidebar-border` 4, `secondary` 4, `primary-foreground` 4, `secondary-foreground` 3, `popover` 3, `popover-foreground` 3, `card` 3, `card-foreground` 2. `bg-accent`/`text-accent` do not appear in `components/ui` (Mira uses `bg-muted` for hover); `accent` reaches the primitives only through `sidebar-accent`, and our own `pro/` code uses `bg-accent` 10 times (selected rows, pricing highlight).

Alpha patterns that must look right in both modes: `ring-ring/30`, `bg-input/30` and `dark:bg-input/30` (inputs), `dark:data-unchecked:bg-input/80` (switch off), `bg-destructive/10`, `dark:bg-destructive/20`, `dark:aria-invalid:ring-destructive/40`, `dark:hover:bg-muted/50`, `dark:has-data-checked:bg-primary/10`, and `hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` on the secondary button.

Literals that escape: `dialog.tsx` and `sheet.tsx` overlay `bg-black/80`, `slider.tsx` thumb `bg-white`. Both follow `--color-black`/`--color-white` only if those are redefined. No hex anywhere in `components/ui`. No `chart-*`, no `destructive-foreground`.

## 8. Our own code: which tokens `SITE/next` and `SITE/pro` actually use

Counts of semantic classes (alpha stripped, variants collapsed):
- `SITE/next`: `muted-foreground` 103, `border` 60, `card` 25, `muted` 24, `foreground` 22, `primary` 12, `destructive` 8, `background` 7, `sidebar-border` 3, `ring` 3, `input` 3, `popover-foreground` 2, `popover` 2, `secondary` 1, `card-foreground` 1, `accent` 1. The eight `dark:` uses are asset swaps or `dark:bg-input/30`; no neutral, white or black.
- `SITE/pro`: `muted-foreground` 137, `border` 111, `primary` 77, `foreground` 68, `card` 45, `secondary` 18, `card-foreground` 13, `muted` 12, `background` 11, `primary-foreground` 10, `accent` 10, `ring` 8, a few `popover`, `secondary-foreground`, `accent-foreground`. `--rb-accent` is used 22 times (status dots, selected-row left bar, check badge, focus outlines).
- The `--glow-*` tokens appear only in Pro hero backgrounds (`pro/d1/hero.tsx`, `pro/d2/index.tsx`, `pro/d4/hero.tsx`: `radial-gradient(... color-mix(in oklab, var(--glow-2) 20-26%, transparent) ...)`) and in `pro/d1/blocks/magic-transform.tsx` particles (`--primary`, `--glow-2`, `--glow-3`). `--glow-2` is the one that matters.
- Recorded rule in `pro/d2/NOTES.md` line 31: App UI copies use semantic tokens for surfaces and text instead of the navy `neutral-*` ramp, keeping `--rb-accent` for the one accent role. The adapted blocks are therefore already insulated from the ladder; only newly installed, unadapted blocks need it.

Literal colors in `next/` and `pro/` that do not follow a theme:
- Navy-tinted shadows `rgb(9 15 29 / a)` (that is `#090f1d`): `next/review-dock.tsx` (2), `next/story-card.tsx` (1), `next/feed/parts.tsx` (1), and about 30 places in `pro/` (`d4/hero.tsx` 5, `d1/story.tsx` 4, `shared/feed-heading.tsx` 2, `shared/brand.tsx` 2, `d4/pricing.tsx` 2, `d3/story-parts.tsx`, `d2/blocks/workspace-window.tsx`, `d2/blocks/setup-log.tsx`, others). Harmless on a black or gray theme but tinted blue; they would need to become black-based or use a `--shadow-color` variable to be theme-pure.
- `pro/d3/blocks/hero-22.tsx` hard-codes page-background stops `#f6f8fc`, `rgb(246 248 252 / 0.9)`, `#090f1d`, `#070c18`, and a blue mesh `#0b1736 #15318a #3767ea #87a7ff #bacdff #e2eaff`. The mesh will not follow a new accent. (`#7c3aed`, `#ffc9df` appear only in its header comment.)
- Dark-mode depth shadows `rgb(255 255 255 / 0.04)` and `rgb(0 0 0 / 0.7-0.8)` in `pro/d3/story-parts.tsx` and `pro/d2/blocks/workspace-window.tsx` are neutral and fine.
- Brand marks that should stay fixed: Google G (`#4285F4 #EA4335 #FBBC05 #34A853`, `pro/shared/shell.tsx`), X blue `#1d9bf0` (`pro/shared/sources.tsx`), GitHub logo swap via `dark:hidden`/`dark:block` images (`next/landing/hero.tsx`, `next/landing/roadmap.tsx`).

## 9. Conclusion: the minimal variable set a theme must define

A theme that defines exactly the following gets full coverage in dark and light across shadcn, AI Elements, our adapted code, installed Pro blocks, and `StatusMark`/`ThoughtLine`.

**A. Semantic set, on `:root` (light) and `.dark` (dark), 27 variables** (the shadcn contract; all consumed): `--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --border --input --ring`, `--radius` (light only), and eight sidebar variables (`--sidebar --sidebar-foreground --sidebar-primary --sidebar-primary-foreground --sidebar-accent --sidebar-accent-foreground --sidebar-border --sidebar-ring`), plus the existing `@theme inline` map (`--color-*` for each). Nothing else from shadcn is read (no chart, no destructive-foreground).

**B. React Bits Pro set, 13 core variables, and it must be global rather than scoped** (move from `.rb-theme-scope` to `:root`, keep the dark value for the accent pair):
- `--rb-accent`, `--rb-accent-fg` (light value on `:root`, dark value on `.dark`). Consumed only as fill, focus outline and on-fill text (276 / 236 / 182 uses in CATALOG).
- `--color-neutral-50` through `--color-neutral-950` (11 steps, one value each, no `.dark` override, because blocks choose their own `dark:` step). Design constraint (inferred from 3.2 and 5): choose the steps so that 950 / 900 / 800 equal the dark background / card / border, 50 / 100 / 200 equal the light background-ish / secondary / border, 500 / 400 equal the light and dark muted text, and 900 / 100 equal the light and dark foreground. Then a Pro block and a shadcn card are the same color in both modes.
- Also set, already correct: `--rb-radius` and the `--rb-r-*` ladder (global too; unscoped blocks otherwise use inline fallbacks such as `var(--rb-r-lg,10px)`, which happen to equal 10px), and `--rb-section-min-h: 0px` on `html`.
- Optional: `--color-white` and `--color-black` (stock `#fff`/`#000`). They carry `bg-white` (387 hits in CATALOG, the default light-mode surface), `dark:text-white` (242) and the `bg-black/80` dialog scrim; redefining them tints every white surface and scrim in one place. Leave stock if the light card should stay pure white.

**C. Atmosphere set, 3 variables per mode**: `--glow-1 --glow-2 --glow-3`. Used by hero backgrounds and the adapted `magic-transform`.

**D. Compatibility aliases, only if the legacy animated components return to the new routes**: `--bg`, `--surface`, `--soft`, `--ink`, `--muted`, `--line`, `--blue`, `--wash` (map to `--background --card --secondary --foreground --muted-foreground --border --primary --accent`). Needed by `Stack`, `SpotlightCard`, `LogoLoop`, `MagicBento`, `AccordionGallery`. Alternative: pass `color`/`fadeOutColor`/`glowColor` props at the call sites. They are not rendered on `/next` or `/pro` today, so no action is needed for the current pages.

**E. Gaps to close so status colors do not escape** (currently absent): a success / warning / info trio, because `StatusMark` defaults to `#22c55e`, `ai-elements/tool.tsx` uses yellow/blue/green/red/orange 600, and CATALOG uses fixed emerald/amber/red/purple.

### Literal colors that escape a theme even after A to C

1. Fixed-hue status utilities in Pro blocks (emerald, amber, red, purple, indigo) and the `ai-elements/tool.tsx` icon colors.
2. `bg-black/80` overlays (dialog, sheet) and the `bg-white` slider thumb in `components/ui` (they follow `--color-black`/`--color-white` only if those are redefined).
3. Shiki `one-light` / `one-dark-pro` token palette in `code-block.tsx` (only the pane background and default text follow tokens).
4. Hex defaults in `MagicBento` (`#120F17` cards, purple `rgba(132,0,255)` variables, `62, 137, 255` glow), `AccordionGallery` (`#060010` overlay), `BranchedMenu`/`FolderFloat`/`RubberSegment` (zinc defaults), `scroll-stack.tsx` pastels, `magic-transform.tsx` purple palette, `device.tsx` mockup greys, `StatusMark` `#22c55e`/`#ef4444` defaults (props override them).
5. Navy-tinted shadows `rgb(9 15 29 / a)` across `next/` and `pro/`, and the hard-coded backgrounds and mesh blues in `pro/d3/blocks/hero-22.tsx`.
6. Third-party brand marks (Google G, X blue `#1d9bf0`, GitHub image swap).
7. Anything keyed to `[data-theme]` instead of `.dark` (only the legacy reference set does this; the new routes do not).
8. CATALOG decorative blocks with hex (`device`, `hero-24`, `center-flow`, `blinking-dots`, `simple-graph`, `rising-lines`, `auth-2`) carry their own multi-hue palettes and will not follow the accent unless recolored when adapted, as `hero-22` already was.

### What this implies for building 4 themes in the blue / black / gray range
- A theme is fully described by about 80 values: 27 semantic values x 2 modes (the radius is shared), 2 accent values x 2 modes, an 11-step ladder, 3 glow values x 2 modes, and an optional success/warning/info trio x 2 modes. Generate the semantic set and the ladder from one palette function so they agree; section 5 shows what happens when they are authored separately.
- Because blocks pair `dark:` steps from the same ladder in both modes, keep the ladder lightness steps at Tailwind's (98.5, 97, 92.2, 87, 70.8, 55.6, 43.9, 37.1, 26.9, 20.5, 14.5) and vary only chroma and hue per theme (the existing design: "lightness kept, chroma and hue moved"). For a blue/black/gray range this becomes a chroma and hue dial, from hue 262 chroma about 0.04 (navy) down to chroma 0 (neutral black and gray), with the accent `#245dec` / `#6b94ff` held fixed. Black-leaning themes will need the dark `--background` below the current L 17.0 (and ladder 950 to match).
- Minimum verification per theme: dark and light renders of `/next/landing`, `/next/building`, `/next/feed/page`, one Pro app-shell block, and one dialog (scrim) to confirm nothing in the "escapes" list shows visibly.
