### 1. Diagnosis and Measurements

In the light screenshots ([light-feed.png](file:///Users/farzanm4/Desktop/repos/oparax/img/light-feed.png), [light-sources.png](file:///Users/farzanm4/Desktop/repos/oparax/img/light-sources.png), [light-account.png](file:///Users/farzanm4/Desktop/repos/oparax/img/light-account.png)), the One reads washed because surface luminance steps are compressed and edge definitions are too weak compared to the accepted feeds ([accepted-window-light.png](file:///Users/farzanm4/Desktop/repos/oparax/img/accepted-window-light.png), [accepted-deck-light.png](file:///Users/farzanm4/Desktop/repos/oparax/img/accepted-deck-light.png)):

- **Lightness Steps ([palettes.css](file:///Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/app/(next)/palettes.css#L645-L706), [DESIGN.md](file:///Users/farzanm4/Desktop/repos/oparax/DESIGN.md#L7-L17)):** `--page` is `#eceef2` (94% L), `--rail` is `#f7f8fa` (97.5% L), `--card`/`--window` is `#ffffff` (100% L), `--raised` (band) is `#f4f5f8` (96.5% L), and `--well` (rail foot) is `#f6f7f9` (97.1% L).
  - The rail is only 3.5% lighter than the page.
  - The band is only 3.5% darker than the card.
  - The rail foot differs from the rail body by merely 0.4%, disappearing completely.
- **Lines and Shadows:** The rail divider uses `--line` at 10% ink (`rgb(16 24 40 / 0.1)`), which dissolves against the 3.5% ground step. Cards use `--line-strong` at 16% ink (`0.16`), but `--card-shadow` has a faint 7% ring (`0.07`) and soft drop (`0.05` to `0.10`) that bleeds out on `#eceef2`. `--top-light` is inset white (`rgb(255 255 255 / 0.9)`), yielding 0 contrast on pure white cards.
- **Stage Light:** The 11% brand-blue wash (`--stage-light`) over the top 560px raises background brightness, drowning out the white cards in blue haze.
- **Radius and Insets:** Cards use 12px radius (`rounded-xl`), nested images use 8px (`rounded-lg`) inset with `p-3`. Text tiers (`--t1` `#0e1116` to `--t4` `#878d99`) are sharp, but secondary metadata lacks surface contrast.
- **Accepted Feeds vs. One Composition:**
  - *Window* placed surfaces inside an architectural `--stage-frame` (`#dfe3ea` to `#eceef2`) with a heavy window shadow (`40px 80px` at 0.22 ink).
  - *Newsroom* separated data with dense table hairlines.
  - *Deck* relied on multi-card physical stack rings.
  - *The One* removed the enclosing stage frame and placed individual cards on the bare page, while resting the rail on a near-white ground beside a near-white page. In dark mode ([dark-feed.png](file:///Users/farzanm4/Desktop/repos/oparax/img/dark-feed.png)), non-linear eye response and white borders hold depth; in light mode, the low delta washes out.

---

### 2. Directions

#### Direction 1: Architectural Step (Deeper Canvas Ground and Distinct Elevation)
- **Light values:**
  - `--page`: `#e1e4ea` (89% L, establishing an 11% step to card)
  - `--rail`: `#f8f9fb` (98% L)
  - `--card` / `--window`: `#ffffff` (100% L)
  - `--raised` (band): `#eaedf3` (93.5% L, a clear 6.5% step)
  - `--well` (rail foot): `#ebedf2` (93.5% L)
  - Lines: Rail right edge and card borders get `--line` `rgb(16 24 40 / 0.14)`; band dividers get `--line-strong` `rgb(16 24 40 / 0.20)`.
  - Shadows: `--card-shadow`: `0 0 0 1px rgb(16 24 40 / 0.10), 0 2px 4px rgb(16 24 40 / 0.05), 0 12px 24px -6px rgb(16 24 40 / 0.12)`.
  - `--stage-light`: `none` in light mode (removes the washed blue veil).
  - `--top-light`: `inset 0 1px 0 rgb(255 255 255 / 0.8)` on raised bands.
- **Matching Dark values:**
  - `--page`: `#090a0d`, `--rail`: `#0d0f13`, `--card`: `#13161c`, `--raised`: `#1a1e26`, `--well`: `#0b0d10`.
  - Lines: `--line` `rgb(255 255 255 / 0.08)`, `--line-strong` `rgb(255 255 255 / 0.14)`.
  - Shadows: `0 0 0 1px rgb(0 0 0 / 0.5), 0 2px 4px rgb(0 0 0 / 0.3), 0 12px 28px -10px rgb(0 0 0 / 0.55)`.
  - `--stage-light`: `radial-gradient(80% 65% at 50% 0%, rgb(170 190 230 / 0.15), transparent 75%)`.
  - `--top-light`: `inset 0 1px 0 rgb(255 255 255 / 0.06)`.
- **Visual Changes & Risk:** The sidebar edge and cards pop against the deeper page; band steps are obvious. Avoids color washes, preserves text contrast, and keeps dark mode aligned.

#### Direction 2: Crisp Mechanical Rings (Tactile Hairlines and Structural Framing)
- **Light values:**
  - `--page`: `#e8ebf0` (92% L)
  - `--rail`: `#f2f4f7` (96% L, tinted structural rail)
  - `--card` / `--window`: `#ffffff` (100% L)
  - `--raised` (band): `#f0f2f6` (95% L) with a bottom hairline `border-b border-line`
  - `--well`: `#e7eaef`
  - Lines: Rail right edge gets `--line-strong` `rgb(16 24 40 / 0.18)`. Cards get a crisp ring border at `rgb(16 24 40 / 0.14)`.
  - Shadows: `--card-shadow`: `0 1px 3px rgb(16 24 40 / 0.08), 0 8px 20px -4px rgb(16 24 40 / 0.14)`.
  - `--stage-light`: `none` or cool neutral radial rim (`rgb(16 24 40 / 0.03)`).
  - `--top-light`: `inset 0 1px 0 rgb(255 255 255 / 1.0)`.
- **Matching Dark values:**
  - `--page`: `#0b0c0f`, `--rail`: `#0e1014`, `--card`: `#12151a`, `--raised`: `#181b22`, `--well`: `#0d0f12`.
  - Lines: Rail right edge and card borders get `rgb(255 255 255 / 0.13)`.
  - Shadows: `0 0 0 1px rgb(0 0 0 / 0.6), 0 2px 4px rgb(0 0 0 / 0.35), 0 12px 28px -10px rgb(0 0 0 / 0.6)`.
  - `--stage-light`: Standard dark stage light.
  - `--top-light`: `inset 0 1px 0 rgb(255 255 255 / 0.08)`.
- **Visual Changes & Risk:** Defines the sidebar as an anchored boundary and sharpens card edges with physical rings. Avoids left-border strips or heavy tints.

---

### ## Directions
- **Direction 1: Architectural Step** - Deeper pale page (#e1e4ea), crisp white card pop, and grounded rail edge.
- **Direction 2: Crisp Mechanical Rings** - Tinted structural rail (#f2f4f7), tactile card border rings, and hairline-separated bands.