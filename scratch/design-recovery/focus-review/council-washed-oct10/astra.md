**The One retains the accepted tokens, but their depth no longer carries the composition.** In `light-sources.png` and `light-notifications.png`, the rail, header bands and page read as adjacent pale surfaces. `light-feed.png` has visible card outlines, but little lift.

Measured from CSS using CIELAB lightness, L* (0 black, 100 white):

| Surface | L* | Difference below white |
|---|---:|---:|
| Page | 94.1 | 5.9 points |
| Rail | 97.6 | 2.4 |
| Card | 100 | 0 |
| Band | 96.5 | 3.5 |
| Well | 97.2 | 2.8 |

The rail/page difference is only 3.5 points; rail/footer just 0.4. Bands have no separating hairline.

The live light card shadow is weaker than the brief describes: ink ring 7%, `0 1px 2px` at 5%, `0 6px 16px -6px` at 10%. The 22% broad shadow belongs to **windows**, absent here. Lines remain 6/10/16%; the 90% white top highlight disappears against white bodies. Blue stage light peaks at 11% across a 560px region, tinting the upper ground without defining an object.

Text tiers against white measure 18.9/11.4/5.8/3.3:1. Body text is sufficiently distinct visually; the faintest metadata contributes to the washed impression.

In `accepted-window-light.png`, the darker stage frame and broad window shadow establish depth. `accepted-newsroom-light.png` gains structure from repeated table boundaries. `accepted-deck-light.png` retains card rings, exposed image edges and offset plates. The One **has retained the rings**, but every card now sits independently on bare ground. Its 14px outer radius and 10px image radius, with 12px picture insets, add a white surround where Deck’s images reached the perimeter. Keep those locked choices; compensate through surfaces.

**Two complete proposals**, values below. `I(a)` means `rgb(16 24 40 / a)`, `K(a)` black, `W(a)` white. Shadow dimensions are CSS pixels. Card ground also sets `--window`.

| Token | A light | A dark | B light | B dark |
|---|---|---|---|---|
| Page | `#dfe3e9` | `#090b0e` | `#eceef2` | `#0b0c0f` |
| Rail | `#f7f8fa` | `#11151b` | `#e2e6ec` | `#161a21` |
| Card | `#ffffff` | `#171b22` | `#ffffff` | `#111317` |
| Band | `#edf0f4` | `#202631` | `#e8ecf1` | `#1d222b` |
| Well | `#e8ecf1` | `#0d1117` | `#edf0f4` | `#0d0f12` |
| Soft/regular/strong lines | I(.08/.14/.20) | W(.06/.10/.16) | I(.10/.18/.26) | W(.07/.13/.20) |
| Stage light | none | none | none | none |
| Top light | W(.9) | W(.08) | W(.65) | W(.06) |

Apply 1px strong lines to card perimeters and the rail’s right edge; regular lines under the rail head and above its footer; soft lines to existing internal dividers. Keep bands borderless.

| Shadow | Light | Dark |
|---|---|---|
| A cards | `0 0 0 1px I(.04), 0 2px 4px I(.08), 0 12px 24px -8px I(.18)` | `0 0 0 1px K(.45), 0 2px 4px K(.30), 0 12px 28px -10px K(.60)` |
| A rail | `4px 0 12px -6px I(.18)` | `4px 0 12px -6px K(.45)` |
| B cards | `0 1px 2px I(.08), 0 4px 8px -4px I(.12)` | `0 1px 2px K(.35), 0 4px 8px -4px K(.50)` |
| B rail | none | none |

Append `inset 0 1px 0` with the specified top-light color to cards.

## Directions

- **A, Surface Depth:** brighter rail, deeper page, lifted cards, clearer bands. Recommended first; risk: excessive floating-card weight.
- **B, Structural Edges:** darker rail, pale page, firmer outlines, stronger bands. Risk: outlined flatness.

Both preserve layout, imagery and functional colors, avoid gradient washes and left-border cards, and require paired light/dark previews before approval.