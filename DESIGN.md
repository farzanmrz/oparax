# Oparax Design System

Fixed by the owner on October 2, 2026: the theme of the three accepted feeds (Window, Newsroom, Deck, dark and light) is the Oparax theme. Every new screen uses it exactly. Imagination goes into composition, never into the theme. It changes only in theme exploration mode, which the owner must ask for (global `reference-led-design` skill, section 5), and any change to this file needs his explicit approval in his current session.

The images are in `~/.agents/skills/reference-led-design/examples/accepted/`. The working source is the preview app: `scratch/design-recovery/site/app/(next)/palettes.css` (the `.palette-council` block, light then `.dark`) and `app/(next)/next.css` (radius, base). A page uses the theme by importing both files and wrapping its content in `.palette-council`. The product app adopts these tokens when the feed and landing are built.

## Ground and surfaces

| Token | Dark | Light | Job |
|---|---|---|---|
| `--page` | `#0a0b0e` | `#e2e5eb` | quiet ground, faint blue tint |
| `--window` | `#14171d` | `#ffffff` | the one lifted surface |
| `--rail` | `#0f1217` | `#f7f8fa` | navigation, a step below the window |
| `--card` / `--tile-bg` | `#14171d` / `#171b21` | `#ffffff` | cards and tiles |
| `--raised` | `#1e222a` | `#eaedf3` | hover, selected rows, the band on a card |
| `--well` | `#0c0e11` | `#e9ecf2` | inset wells |

## Lines and text

- Lines: `--line` white 9 percent (light: ink 14 percent), `--line-soft` 5.5 (8), `--line-strong` 15 (20). Owner, October 10 ("stick with depth"): the light grounds step further apart and the lines firmed so the sidebar, the band and the cards separate in light as they do in dark.
- Text tiers, order of reading by brightness: `--t1` `#f3f5f8`, `--t2` `#c9ced7`, `--t3` `#8d939e`, `--t4` `#646a75` (light: `#0e1116`, `#343a45`, `#5f6672`, `#878d99`). `--t4` is about 3.2:1 in dark: decoration and small labels only, never body text.

## Color, each hue one job

| Token | Dark | Light | Job |
|---|---|---|---|
| `--brand` (solid `--primary`) | `#6b95ff` (`#3a6cf4`) | `#2459e8` | primary action, selection, focus |
| `--kind-post` | `#6b95ff` | `#2459e8` | X posts and X accounts |
| `--kind-article` | `#3cc9b5` | `#0d9488` | articles from websites and RSS feeds |
| `--kind-github` | `#e6e8eb` | `#1f2328` | GitHub, its own mark |
| `--ok` | `#4cd07d` | `#17a34a` | live, healthy, done |
| `--caution` | `#f2b84b` | `#c88504` | checking, warning, free week |
| `--error` | `#f2555a` | `#d93a40` | failed |

Each has a `-soft` fill for chips. Real logos, favicons, avatars and article images keep their own colors and carry much of the life. No other hues: websites and RSS feeds are told apart by their label and icon, not by a new color.

## Depth and light

Every screen lifts its main surface or surfaces off the page with these tokens, as the accepted feeds do in different ways: Window sets a lifted window inside a lit stage frame with cards on it, Newsroom lifts one table window, Deck lifts cards and stacks on a lit page. The tokens only create depth when the composition lifts something; panels lying flat on the page fail.

- `--stage-light`: radial light from the top behind the main surface (dark: `rgb(170 190 230 / 0.16)` fading out; light: none, since October 10, the blue mist made the top cards sit on the palest ground).
- `--stage-frame`: the lit frame gradient around a window (dark `#23262d` to `#0d0e11`; light `#dfe3ea` to `#eceef2`).
- `--window-shadow`: four layers, hairline ring, 1px top highlight, 16 to 32px and 48 to 96px soft drops (dark at 0.6 to 0.75 black; light at 0.1 to 0.22 ink).
- `--card-shadow`: three layers, ring, 2 to 4px, 12 to 30px (light at ink 0.1 to 0.18, dark at black 0.32 to 0.6).
- `--top-light`: a 1px inset top highlight on raised surfaces.
- `--dot-grid`: faint dot texture for stages.

## Shape and type

- Radius 10px (`--radius`), with 18px for stage frames and 14px for window tops.
- Two typefaces, as in the accepted feeds. Open Sans (weights 300 to 800) for headings, body and rows; headings 600 with tight tracking (-0.025em at 28px). The system monospace (Tailwind `font-mono`: SF Mono, Menlo) at 10 to 11px with wide tracking for small labels: the Newsroom column headers, the "LIVE" marker, the "FREE WEEK" badge, timestamps and version codes. Open Sans confirmed by the owner on October 2 ("Open Sans seems fine").
- Sizes in the feeds: 28px page titles, 20 to 22px story titles, 12.5 to 13.5px body and rows, 11 to 11.5px labels.

## Width

- One centred column on every page, the header's content inside the same column. Side margin = clamp(48px, (viewport width − 1400px) / 4, 290px); the column is the viewport minus two margins (1344px at 1440, 1980px at 2560: half of the Deck page's margins on an ultra-wide screen). A page's composition is centred inside the column; nothing sits at the column's edge with empty ground beside it, and nothing is full-bleed. Owner, October 5, 2026 ("Yes" to this line).

## Light mode

Designed in its own right: pale grey page, white panels, visibly darker borders (ink 10 to 16 percent) and shadows that read. Never an inverted or pale-washed dark mode.
