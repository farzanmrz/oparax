# Vendor theming guidance: React Bits Pro, React Bits free, shadcn/ui, AI Elements

Researched October 1, 2026. Purpose: apply one color theme (black, gray and blue range, one blue accent, dark and light) the way each vendor intends. Facts marked VERIFIED were read from the vendor page, vendor registry JSON or installed source. Facts marked INFERENCE are my reading and need a render check.

How the React Bits Pro page was read: the page at pro.reactbits.dev/docs/app-ui/theming renders its code samples client-side, so a plain fetch drops them. I recovered the exact samples from the page's own JavaScript chunk (chunk 255342ef, "Theming" page component). No license key was needed or used.

## 1. React Bits Pro (App UI blocks, marketing blocks, Bento tiles)

Sources:
- https://pro.reactbits.dev/docs/app-ui/theming (the theming guide; also the `docs` field of the `app-ui-theme` registry item)
- https://pro.reactbits.dev/api/r/pro/app-ui-theme.json (registry item; local copy at `pro-exploration/catalog/src/app-ui-theme.json`)
- https://pro.reactbits.dev/api/r/starter/skill (Agent Kit skill; local copy at `pro-exploration/council-next/review-guidance/skills/react-bits-pro/SKILL.md`)

### 1.1 The four knobs (VERIFIED, from the theming page)

| Knob | Variable | Notes |
|---|---|---|
| Rounding | `--rb-radius` | One value. All corners derive from it. Default 10px. |
| Accent | `--rb-accent` and `--rb-accent-fg` | Set as a pair, separately for light and dark. `-fg` is the text and icon color on the accent. Hover states derive automatically. |
| Base | Tailwind `--color-neutral-*` ramp (50 to 950) | Redefine Tailwind's own neutral scale. Surfaces, borders and body text use it. |
| Typeface | none | Blocks declare no font family; they inherit from `body`. Type sizes are in px so a font swap does not break density. |

### 1.2 Exact variables and where they go (VERIFIED)

The `app-ui-theme` registry item is `registry:style` with `files: []`. It "changes nothing on its own": its values equal the fallback baked into every block. Install: `npx shadcn@latest add @reactbits-pro/app-ui-theme` (each App UI block lists it as a registryDependency, so the first block install pulls it in). Marketing blocks do not depend on it (in the 46 catalog items I checked, only the 11 App UI blocks did).

The docs' paste-in CSS goes in the global stylesheet, after the Tailwind import, on `:root` and `.dark`:

```css
:root {
  --rb-radius: 10px;
  --rb-r-xs: max(0px, calc(var(--rb-radius) - 6px));
  --rb-r-sm: max(0px, calc(var(--rb-radius) - 4px));
  --rb-r-md: max(0px, calc(var(--rb-radius) - 2px));
  --rb-r-lg: var(--rb-radius);
  --rb-r-xl: calc(var(--rb-radius) + min(2px, var(--rb-radius)));
  --rb-r-2xl: calc(var(--rb-radius) + min(4px, var(--rb-radius)));
  --rb-r-3xl: calc(var(--rb-radius) + min(6px, var(--rb-radius)));
  --rb-r-4xl: calc(var(--rb-radius) + min(8px, var(--rb-radius)));
  --rb-accent: oklch(20.5% 0 0);      /* light default */
  --rb-accent-fg: oklch(100% 0 0);
}
.dark {
  --rb-accent: oklch(100% 0 0);       /* dark default is the swapped pair */
  --rb-accent-fg: oklch(20.5% 0 0);
}
```

The docs' own blue example:

```css
:root  { --rb-accent: oklch(54.6% 0.245 262.881); --rb-accent-fg: oklch(100% 0 0); }
.dark  { --rb-accent: oklch(62.3% 0.214 259.815); --rb-accent-fg: oklch(100% 0 0); }
```

Neutral base override, docs example (mauve), on `:root`:

```css
:root { --color-neutral-50: oklch(98.5% 0.004 318); /* ... through 950 */ }
```

Mauve ramp from the page's own presets: 50 `98.5% 0.004`, 100 `97% 0.007`, 200 `92.2% 0.012`, 300 `87% 0.019`, 400 `70.8% 0.03`, 500 `55.6% 0.034`, 600 `43.9% 0.032`, 700 `37.1% 0.03`, 800 `26.9% 0.026`, 900 `20.5% 0.022`, 950 `14.5% 0.016` (all hue 318). Tailwind's default neutral lightness steps are 98.5, 97, 92.2, 87, 70.8, 55.6, 43.9, 37.1, 26.9, 20.5, 14.5 percent, chroma 0.

How a block reads it (VERIFIED, the docs' own sample): `rounded-[var(--rb-r-md,8px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))]`. Every themed value carries a fallback, so theming is additive and deleting the variables is safe.

### 1.3 Documented rules

1. Keep each neutral step's lightness; change only chroma and hue. The docs say the system relies on contrast between adjacent steps to separate card from page, and flattening it "is the quickest way to make an interface look muddy."
2. Set both halves of the accent pair, and set light and dark separately. A color with enough contrast on white is usually too dark on near-black.
3. Radius: rungs are fixed pixel offsets from `--rb-radius`, not ratios, so nested corners stay concentric. Useful range 0 to 26px; above 26px only large surfaces round and content starts clipping. Named values: None 0, Subtle 4, Soft 8, Round 10, Extra 16, Pill 26.
4. Scoping is documented: "Variables cascade, so a different theme for one region costs one selector." Declare the variables on any ancestor (the docs use `.admin`) and everything beneath re-resolves. The documented examples put the global theme on `:root`/`.dark`, not on a scope class. The `rb-theme-scope` class is the vendor's own preview wrapper (the Pro site adds it around App UI previews) and this repo's `pro.css` reuses the name.
5. Dark mode (Agent Kit skill, VERIFIED): blocks use Tailwind's `dark:` class strategy; toggle a `dark` class on `<html>` with `next-themes` (`attribute="class"`). A few components read `next-themes` and adapt.
6. Agent Kit skill rule 11 (VERIFIED, local SKILL.md line 85): Bento tiles do not use the App UI theme. Keep them outside `.rb-theme-scope`, apply no App UI accent, base, font or radius overrides to them, customize a tile by editing its own source. They still follow normal light/dark mode.
7. Agent Kit skill "Harmonizing blocks": edit installed source; first swap hardcoded `neutral-*` for the host's semantic tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`). One accent color, used on the primary CTA. Every color class needs its `dark:` counterpart. App UI blocks need a height-bounded parent.

### 1.4 Pitfalls found in the installed source (VERIFIED by counting `site/components/blocks`, 34 files)

- Blocks color mostly with literal classes: 1846 `neutral-N` class uses, 376 `white` utilities (`bg-white`, `text-white`, `border-white`), 12 `black`, 61 `rgba()`, 20 six-digit hex, 62 chromatic Tailwind classes (emerald, red, amber, etc.), and 0 shadcn semantic tokens. Redefining `--color-neutral-*` retints only the `neutral-N` classes. Literal `white`, `black`, `rgba()`, hex and chromatic status colors do not follow any variable. Examples: `border-white dark:border-neutral-900`, `bg-white/10`.
- Because `white` stays pure white, a light theme built on a gray ramp keeps pure-white card surfaces wherever blocks wrote `bg-white`. Editing those to `bg-card` (or `bg-neutral-50`) is source work, which the vendor expects.
- `--rb-accent` is read only where the vendor wrote it (focus outlines, selected markers, primary CTAs). Anything else blue or colored is hard-coded.
- Marketing blocks do not read `--rb-*` at all; they are `neutral-*` plus literal colors, so only the neutral ramp and source edits reach them.
- A `:root` radius ladder resolves against `:root`'s `--rb-radius`. If you scope a different `--rb-radius`, redeclare the whole ladder inside the scope (this repo's `pro.css` does; the docs' `.admin` example shows only `--rb-radius`, which INFERENCE says will not change the derived rungs unless they are declared inside that scope too, because custom properties resolve where declared).
- `dark:` in Tailwind v4 defaults to `prefers-color-scheme`. A class toggle requires `@custom-variant dark (&:where(.dark, .dark *));`. `pro.css` has it. `app/catalog-foundation.css` instead keys dark to `html:not([data-theme="light"])`. Pick one trigger and use it for token overrides and for `dark:` classes.

### 1.5 Free React Bits components (reactbits.dev, `@react-bits`)

Source: https://reactbits.dev/r/<Name>-TS-TW.json (read for SpotlightCard, AnimatedContent, LogoLoop, MagicBento, Stack, ThoughtLine, StatusMark, AccordionGallery).

- VERIFIED: no theme system, no `cssVars`, no `css`, no registry dependencies. Color comes from props with hard-coded defaults: SpotlightCard `spotlightColor='rgba(255, 255, 255, 0.25)'`, MagicBento `color: '#120F17'` and a purple glow `rgb` string, AccordionGallery `#060010`/`#0a0713`, StatusMark `doneColor='#22c55e'` / `errorColor='#ef4444'`, LogoLoop fade `--logoloop-fadeColorAuto:#ffffff` with `dark:` `#0b0b0b` (overridable with `--logoloop-fadeColor`).
- Therefore the only way to theme them is to pass props or edit source to read your tokens. PROVENANCE.md shows the local copies already default to preview tokens; a retheme means re-pointing those defaults at the new variables (`var(--primary)`, `var(--card)`, etc.).

## 2. shadcn/ui

Sources:
- https://ui.shadcn.com/docs/theming (token table, defaults, custom tokens, base colors)
- https://ui.shadcn.com/docs/tailwind-v4 (v4 structure, `@theme inline`, OKLCH)
- https://ui.shadcn.com/docs/dark-mode/next (next-themes provider)
- https://ui.shadcn.com/docs/components-json (`baseColor` is permanent)
- https://ui.shadcn.com/docs/cli and https://ui.shadcn.com/docs/changelog/2026-04-partial-preset-apply (`apply`, `--only`)
- https://ui.shadcn.com/create (visual builder that emits a preset)
- Local copy of the shadcn skill: `pro-exploration/council-next/review-guidance/skills/shadcn/customization.md` and `rules/styling.md`

### 2.1 Convention (VERIFIED)

Every semantic color is a pair: the base is the surface, `name-foreground` is the text or icon on it. Variables are plain `:root` and `.dark` blocks (outside `@layer base` in Tailwind v4), values in OKLCH, and a separate `@theme inline` block maps each to a Tailwind color so `bg-primary` etc. work. Dark mode is class-based: override the same tokens under `.dark`.

### 2.2 Variables to set (VERIFIED token list)

Set in `:root` (light) and `.dark` (dark):

`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1` through `--chart-5`, `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`, and `--radius` (in `:root`, default `0.625rem`).

Map them in `@theme inline` as `--color-<name>: var(--<name>);` for every token above (the docs print the full list), and the radius scale there too. Current docs use multiplicative radius: `--radius-sm: calc(var(--radius) * 0.6)`, `-md` 0.8, `-lg` `var(--radius)`, `-xl` 1.4, `-2xl` 1.8, `-3xl` 2.2, `-4xl` 2.6. Note: this repo's `pro.css` and `catalog-foundation.css` use the older additive form (`calc(var(--radius) - 4px)`); either works, but the two scales differ, and React Bits uses its own additive ladder, so set `--radius` and `--rb-radius` to the same px value and accept that the rungs are not identical.

Role guide from the docs: `primary` high-emphasis actions, buttons and active states; `accent` is hover and focus fill (not the brand accent; it is a subtle tint); `muted` subtle surfaces and descriptions; `ring` focus; `input` form borders; `destructive` errors. The default dark theme uses translucent borders (`--border: oklch(1 0 0 / 10%)`, `--input: oklch(1 0 0 / 15%)`).

Custom tokens (VERIFIED): define `--warning` and `--warning-foreground` in `:root` and `.dark`, then `--color-warning: var(--warning)` in `@theme inline`. Use this for success, warning and info states instead of raw `text-green-600`.

### 2.3 Rules and pitfalls

- `tailwind.baseColor` in `components.json` ("neutral, stone, zinc, mauve, olive, mist, taupe") picks the starting values and "cannot be changed after initialization." It only seeds `init`. After that the CSS variables are the source of truth; changing them is the supported way to retheme. This repo's `components.json` says `zinc` while the actual tokens are custom, which is harmless.
- `cssVariables: true` is also permanent. Components must keep using semantic utilities; the shadcn skill rule is "no raw values like `bg-blue-500`" and "no manual `dark:` color overrides" (semantic tokens switch by themselves).
- Presets: `npx shadcn@latest apply <code> --only theme` applies only theme tokens without reinstalling components (supports `theme`, `font`, `theme,font`). `npx shadcn@latest preset decode <code>` shows what a code contains. The `/create` builder (and tweakcn) are generators; neither is required.
- tweakcn (https://tweakcn.com) is the common third-party generator. VERIFIED from its registry JSON (`https://tweakcn.com/r/themes/modern-minimal.json`): it is a `registry:style` item that installs through `npx shadcn@latest add https://tweakcn.com/r/themes/<name>.json`, writes `cssVars.light`/`cssVars.dark` in the same shadcn token names (OKLCH), plus a `cssVars.theme` block with `font-sans`, `font-mono`, `font-serif`, `radius` and `tracking-*`, plus a `body` letter-spacing rule. It can also emit `destructive-foreground`, shadow and spacing variables not in the stock list. Read the JSON before installing; it can override fonts and `body` letter-spacing, which would fight an Open Sans choice.
- Chart tokens: `--chart-1..5` and `--color-chart-1..5` must exist or chart components fall back to nothing. This repo's `pro.css` defines neither.
- Dark mode wiring (VERIFIED): `next-themes` `ThemeProvider` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`, and `suppressHydrationWarning` on `<html>`. The Tailwind v4 `dark:` variant must be redefined to the class (`@custom-variant dark (&:is(.dark *))` in shadcn's generated CSS; `pro.css` uses `&:where(.dark, .dark *)`). INFERENCE: the exact generated line was not on the pages I fetched; check the project's generated `globals.css`.
- Mira style (`radix-mira`): stock components read the same tokens; no extra Mira-only variables were found in the pages read. INFERENCE: confirm by diffing an installed Mira component against the token list.

## 3. AI Elements

Sources:
- https://elements.ai-sdk.dev/docs/setup and https://elements.ai-sdk.dev/docs (prerequisite: shadcn/ui initialized, Tailwind v4)
- https://registry.ai-sdk.dev/<name>.json (message, conversation, prompt-input, tool, reasoning, shimmer, sources, plan, queue, confirmation, code-block, suggestion; all read)

VERIFIED: AI Elements defines no tokens of its own. None of the 12 registry items I read has `cssVars` or `css`. The components are shadcn-style files that use shadcn semantic utilities (`text-muted-foreground` 21 times, `text-foreground`, `bg-muted`, `bg-background`, `bg-accent`, `border-border`, `bg-secondary`, `text-primary`, `bg-destructive`) and shadcn primitives as registry dependencies (button, collapsible, badge, card, command, dropdown-menu, hover-card, input-group, select, scroll-area, tooltip, alert). They install into `@/components/ai-elements/`. A shadcn theme therefore themes them with no extra step.

Exceptions that bypass tokens (VERIFIED in registry source):
- `tool`: status icons use raw `text-yellow-600`, `text-blue-600`, `text-green-600`, `text-red-600`, `text-orange-600`. Edit these to semantic or custom tokens (`text-primary`, `text-destructive`, custom `--success`/`--warning`) if the theme allows only blue and gray.
- `code-block`: syntax colors come from Shiki themes `one-light` and `one-dark-pro`, not CSS variables; only the block background and foreground use `bg-background` / `text-foreground`. A new theme needs a Shiki theme choice or custom Shiki theme to match.
- `shimmer`: reads `--color-background` and `--color-muted-foreground`, so both must be registered in `@theme inline` (they are in the shadcn mapping).
- Dark switching uses Tailwind `dark:` (for example code-block's `dark:hidden` / `dark:block`), so the `dark` variant must match your toggle. The AI Elements troubleshooting text mentions a `data-theme` attribute; with Tailwind `dark:` classes the working setup is the `.dark` class (or a `@custom-variant dark` that matches your attribute).

## 4. Recommended order for one theme across all four

Goal: one source of truth, so a later change is one edit.

1. Pick the palette first, as plain values: an 11-step neutral ramp (black, gray with slight cool hue, chroma small) and one blue with a light value and a dark value, plus a readable foreground for each. Verify contrast (4.5:1 text) before wiring anything. Keep each step's lightness near Tailwind's (98.5, 97, 92.2, 87, 70.8, 55.6, 43.9, 37.1, 26.9, 20.5, 14.5) because React Bits depends on step contrast.
2. Choose one dark trigger. Use the `.dark` class on `<html>` (next-themes `attribute="class"`) and declare `@custom-variant dark (&:where(.dark, .dark *));`. Remove `data-theme`-based variants so shadcn tokens, React Bits `dark:` classes and AI Elements `dark:` classes all flip together.
3. In the one global stylesheet (after the Tailwind import) define the neutral ramp once: `--color-neutral-50` through `950` on `:root`. This is the vendor-intended place for React Bits Pro. A `.rb-theme-scope` selector is optional; if you keep it, only things inside it get the ramp.
4. Define the shadcn tokens on `:root` and `.dark` in OKLCH and build them from the same palette: `--background`, `--card`, `--popover`, `--secondary`, `--muted`, `--border`, `--input`, sidebar tokens from the ramp steps; `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring` from the single blue; foregrounds from the ramp or white. Add `--chart-1..5` (single blue and gray steps) and a `--success`/`--warning` pair if status colors are allowed. Add the full `@theme inline` mapping including chart and any custom tokens. Set `--radius` to the same px as `--rb-radius`.
5. Define the React Bits knobs from the same blue: `--rb-radius`, the radius ladder (copy from the registry item), `--rb-accent` and `--rb-accent-fg` on `:root` and `.dark`. Aliasing is fine (`--rb-accent: var(--primary)`) as long as the alias and the token are declared on the same element, because custom properties resolve where declared; do not alias at `:root` and then toggle `.dark` on a nested wrapper.
6. Sweep literal colors in installed React Bits blocks, since variables cannot reach them: `white`, `black`, `rgba()`, hex and chromatic classes (counts in 1.4). Per the vendor's harmonizing guidance, replace with semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`) or leave only where pure white/black is intended. Do this in the copied source, not in vendor registry files.
7. Bento tiles: follow vendor rule 11 (no App UI scope, no App UI overrides, edit tile source). They still read `neutral-*`, so a global ramp reaches them; if they should stay independent, keep the ramp inside `.rb-theme-scope` instead (INFERENCE: this is the one trade-off between "vendor-intended global ramp" and "Bento stays out of App UI theme"; decide once).
8. Free React Bits components: re-point each component's color props and hard-coded defaults (SpotlightCard `spotlightColor`, MagicBento glow and card colors, AccordionGallery colors, StatusMark done/error, LogoLoop `--logoloop-fadeColor`) to the new variables, in the local copy.
9. AI Elements: install normally (it inherits step 4). Then patch the exceptions: `tool` status icon colors, `code-block` Shiki theme choice, and confirm `shimmer` renders against the new background and muted foreground.
10. If using a generator (tweakcn or `shadcn apply <code> --only theme`), apply it first, then overlay steps 3 and 5 and the literal-color sweep; read the generator output for font, `body` letter-spacing and radius overrides before keeping it.
11. Proof: render landing and feed in light and dark and check text contrast, focus rings (`--rb-accent` outlines), selected states, charts, the sidebar, code blocks and tool statuses.
