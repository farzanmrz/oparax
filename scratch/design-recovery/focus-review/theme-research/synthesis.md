# Synthesis: shared color logic and the Oparax role contract

Written 2026-10-01 from the five researcher files in this folder (supabase.md, vercel.md, linear-peers.md, radix-shadcn.md, consumers.md). Read-only; no repo edits. No em dashes.

## 0. Legend and what this pass added

Labels carry over from the researchers:
- VERIFIED: read from a vendor file, docs page or repo file by a researcher.
- COMPUTED: arithmetic on verified inputs. Items marked "COMPUTED (synthesis)" were calculated by me in this pass with OKLab/WCAG math (accurate to about 1 per channel for hex, 0.01 for contrast).
- INFERRED: a reading or recommendation, not a published fact.

New in this pass (COMPUTED (synthesis)): the researchers measured lightness in two different scales (Linear and Raycast in CIE L*, Supabase and Radix in OKLCH L). I converted every ladder to both, so the numbers below can be compared directly.

### 0.1 Unified dark ladder (hex, OKLCH L, chroma C, CIE L*)

| System | Page | Card / panel | Raised / popover | Default border |
|---|---|---|---|---|
| Supabase (formula output) | #131413 L .190 C .003 L* 6.2 | #181a19 .215 .004 L* 9.0 | #1b1d1c .228 L* 10.5 | #232524 (7.5% fg) .262 L* 14.4 |
| Vercel Geist | #000000 L 0 | gray-100 #1a1a1a .218 L* 9.3 | gray-200 #1f1f1f .239 L* 11.8 | gray-400 #2e2e2e .301 L* 18.9 |
| Linear | #08090a .139 C .003 L* 2.4 | #141516 .195 L* 6.7 | #191a1b .217 L* 9.2 | #23252a .264 C .010 L* 14.7 |
| Raycast | #07080a .134 C .005 L* 2.2 | #18191a .213 L* 8.7 | #1b1c1e .226 L* 10.2 | #242728 L* 15.4 |
| Radix slate | #111113 .179 C .004 L* 5.1 | #18191b .213 C .004 L* 8.7 | #212225 .252 C .006 L* 13.2 | step 6 #363a3f .347 C .010 L* 24.2 |
| Oparax now (scratch site next.css) | #090f1d .170 C .031 L* 4.4 | #141e31 .236 C .040 L* 11.3 | same as card | #2a3952 .343 C .048 L* 23.8 |

Light side: Supabase #fdfdfd page, #ffffff cards, border #e9e9e9 (L* 92.3). Linear #ffffff page, #f8f8f8 / #f4f4f4 / #f0f0f0 steps, border #e9e8ea (L* 92.1). Radix slate #f9f9fb page, white cards, border step 6 #d9d9e0 (L* 86.9). Oparax now: page #f3f6fb (L* 96.8), border #bccadf (L* 80.9, C .033).

What this table says (COMPUTED (synthesis), conclusions INFERRED):
1. The card lands at L* 8.7 to 9.3 in five of the five peer systems. The page sits between L* 0 and 6, the popover 10 to 13, and the default border 14 to 19 (Radix step 6 at 24 is its "subtle border" and is the outlier).
2. Oparax's dark lightness spacing is already in range (page to card is 6.9 L*, peers 2.8 to 6.6). The visible difference is chroma: Oparax surfaces are C .031 to .040 and its border is .048, against peers at .000 to .010. That is 7 to 15 times more color in every neutral. This supports radix-shadcn.md's reading of "too blue, monotone": every surface, border and the accent live in hue 260 to 266 at visible chroma, so only lightness separates them.
3. Oparax's light border (#bccadf, L* 81) is darker and more tinted than any peer (L* 87 to 92), so the light mode reads heavier than Supabase, Linear or Radix at the same role.
4. Tailwind's stock lightness steps already match the peers (INFERRED from the table). Tailwind neutral 950 / 900 / 800 are OKLCH L .145 / .205 / .269. Peers' page / card / default border are .134 to .19 / .195 to .218 / .26 to .30. So the consumers.md plan (keep Tailwind's L steps, change only chroma and hue) already lands on peer values. At hue 264 and chroma .005 those three steps render as #090a0c, #161719, #252629 (COMPUTED (synthesis)).

## 1. The shared logic of a dark-first gray scale plus one accent

### 1.1 How many steps

| System | Neutral vocabulary | Evidence |
|---|---|---|
| Radix | 12 steps per scale, plus an alpha twin | VERIFIED |
| Vercel Geist | 2 backgrounds plus 10 steps per hue (gray, gray-alpha, blue, ...) | VERIFIED-DOC |
| Resend | 12 steps plus an alpha twin | VERIFIED |
| Linear | about 4 surface levels, 4 quaternary fills, 3 borders, 4 text tiers, generated from 3 inputs | VERIFIED |
| Supabase | 4 solid surfaces, 3 alpha washes, 5 border alphas, 3 text tiers, generated from about 6 inputs | VERIFIED |
| Raycast | about 9 grays plus white-alpha hairlines | VERIFIED |

Consensus working vocabulary for Oparax (INFERRED): 4 surface levels (page, panel, card, raised), 3 interaction fills (hover, selected, pressed) as alpha or adjacent steps, 3 borders (subtle, default, strong), 3 text tiers plus a disabled tier, and an accent set of 4 plus a ring. That is the 12-step Radix/Geist job list compressed to what the app uses.

### 1.2 Which step does which job

| Job | Radix step | Geist step | Supabase token | Linear token |
|---|---|---|---|---|
| App background | 1 | background-100 | --background | bg-level-0 |
| Subtle panel / sidebar / card | 2 | background-200 or gray-100 | --card | bg-level-1 / 2 |
| Component fill, rest | 3 | gray-100 | --muted (fg 3.3% alpha) | bg-secondary |
| Component fill, hover | 4 | gray-200 | --accent (fg 4.9% alpha) | bg-tertiary |
| Component fill, active or selected | 5 | gray-300 | --tertiary (fg 6.6% alpha) | bg-quaternary |
| Subtle border | 6 | gray-400 | --border (fg 7.5%) | border-primary |
| Interactive border | 7 | gray-500 | --input (fg 13.5%) | border-secondary |
| Hover or focus border | 8 | gray-600 | --border-control-hover (fg 28%) | border-tertiary |
| Solid fill (brand) | 9 | 700 | --primary-solid | accent / brand-bg |
| Solid hover | 10 | 800 | --primary-solid-hover | accent-hover |
| Secondary text | 11 | 900 | --muted-foreground | text-secondary / tertiary |
| Primary text | 12 | 1000 | --foreground | text-primary |

The step number keeps the same job in light and dark in Radix and Geist (VERIFIED-DOC). Supabase and Linear do the same with semantic names. The invariant to copy is the job map, not the hex.

### 1.3 How separation is achieved

Order of mechanisms, agreed by Supabase, Vercel, Linear, Raycast and Resend (VERIFIED code, ranking INFERRED):
1. A lightness step of 1.5 to 3 L* per layer (page, panel, card, raised). Whole page-to-popover range is only 7 to 11 L*.
2. A 1px hairline on nearly everything. Dark: white at 5 to 10% (Raycast, Linear, Resend), Supabase 7.5%, Vercel 14.5% (#ffffff25). Light: black at 8% (Supabase, Vercel #00000014).
3. A stronger border for interactive things than for static ones (Supabase 7.5% static, 13.5% control, 17% hover, 28% focus; Geist 400 / 500 / 600). This is the main way "everything is separated but still one family".
4. Fill by alpha for state. Hover and selected are foreground at 3 to 7% alpha, so they work over any layer and flip direction in light mode (Supabase, Vercel gray-alpha, Resend, Raycast).
5. Shadows are secondary. None in dark (invisible on near-black). In light they return as faint layered shadows plus the hairline (Linear, Vercel materials).
6. Text hierarchy by 3 or 4 tiers instead of color. Never pure white or black on dark (Supabase #edefee, Linear #f7f8f8, Vercel #ededed, Radix #edeef0). Light text is near-black, tinted or neutral (#171717, #1c2024, #282a30; Supabase #030303 is the outlier).
7. Neutrals carry a faint tint toward the accent (Linear, Raycast, Resend, Radix slate) or toward the brand hue (Supabase). Measured chroma is .000 to .010 in every system (table 0.1). Vercel is the only pure-neutral system.

Where the peers disagree (these are real design choices, not noise):
- Hairline strength in dark: 6% (Raycast) to 14.5% (Vercel).
- Input treatment: Supabase sinks the field (black wash) and raises the select (white wash); Vercel fills inputs with background-100 and uses a neutral halo on focus; Linear/Raycast not documented.

### 1.4 Accent share and where the accent goes

All figures are proxies from CSS reference counts, none is a pixel measurement:
- Supabase: under 5% of pixels (INFERRED).
- Linear: about 34 accent references against about 440 neutral ones (INFERRED).
- Vercel: blue-900 33 uses against gray-1000 112 and gray-900 40 (VERIFIED counts, INFERRED meaning).
- Raycast: coral in brand moments only. Resend: no chromatic accent in the UI tokens.
- Working number for the council: accent at 5% of pixels or less, 90% or more neutral (INFERRED).

Accent goes to: the primary action, links and small accent text, the focus ring, switch-on and selected controls, info chips, the text-selection color. Accent does not go to: hover, active tab, active sidebar row, checkbox, card or page fills, headings (Supabase and Vercel both keep these neutral, VERIFIED code).

Two schools for the primary button (VERIFIED, each; the choice is open):
- Accent plate: Supabase (deep `#006338`, not the neon brand color), Linear.
- Inverted neutral: Vercel (INFERRED, gray-1000 fill), Raycast (#ffffffd0 fill), Resend (white in dark, black in light). The accent then lives on links, focus, selection and chips only.

The accent is always a set, not a color: solid, hover, subtle fill, readable text, ring. Dark hover is lighter, light hover is darker (Supabase plus or minus .04 OKLCH L, hue and chroma held). Solid steps change little between modes (Vercel blue-700 `#0070f7` vs `#0071f6`); the tints and the text step flip (Vercel, Linear).

### 1.5 How light mode is derived

Not an inversion. Same role names, new values (Linear, Resend, Supabase, Geist, VERIFIED). Rules shared by all:
1. Roles stay identical; only values swap. The shadcn contract already does this.
2. Alpha borders and washes switch base from white to black. Light borders are 8% (subtle) to 13.5% (control) black: `#ebebeb` and `#dddddd` on white (COMPUTED (synthesis)).
3. Surfaces step down 1 to 2 L* from white (Linear 100 / 97.6 / 96.2 / 94.8). Three schools for the page:
   - A. Slightly gray page, white cards (Radix, current Oparax).
   - B. White page, gray shell or sidebar (Linear, Vercel `#fafafa`).
   - C. Near-flat `#fdfdfd` page and white cards, the border does all the work (Supabase).
4. Shadows return in light (Linear, Vercel), because tints at 1 to 2 L* are too faint.
5. Accent: same hue, lightness shifts. Dark ink is light (Supabase L .76, Linear #828fff, Vercel `#50a8ff`), light ink is deep (Supabase .525, Vercel `#0064e2`). Tint flips from a near-black wash to a near-white wash (Linear #18182f to #f1f1ff). Accent as plain text can fail in light mode (Linear 3.85:1), so check it.
6. Text near-black, not black. Tertiary text in light mode must be darker than the mid-gray step (Radix slate 9 is only 3.30:1 on white).

## 2. Oparax role contract

Concrete values below use Radix slate hex (VERIFIED) for neutrals, because those are real published values at chroma .004 to .010, and the owner's two hex for the accent. They are one defensible starting ladder for a "slate plus blue" variant, not the answer for all four variants. Peer cross-checks are in the last column. For a more neutral or blacker variant, lower chroma toward 0 and the page toward L .134 (Linear/Raycast) or 0 (Vercel); for a more tinted one raise chroma to at most .01 on surfaces (INFERRED).

Contrast values are COMPUTED (synthesis) unless a researcher file is cited.

| Role | shadcn / CSS token | Dark | Light | Peer basis |
|---|---|---|---|---|
| Page | --background | #111113 (slate 1) | #f9f9fb (slate 2) or #fdfdfd | Supabase #131413 / #fdfdfd, Linear #08090a / #fff, Vercel #000 / #fff |
| Sidebar | --sidebar | page tone `#111113` with a border-right, or one rung up `#18191b` | #fcfcfd, or white with border | Supabase sidebar equals page, Radix mapping uses slate 2, Linear panel sits between page and card. Peers split, see 4.2 |
| Card | --card | #18191b (slate 2) | #ffffff plus subtle border | Supabase #181a19, Vercel #1a1a1a, Linear #141516 (all L* 7 to 9) |
| Raised card / popover / dialog | --popover | #212225 (slate 3) | #ffffff plus default border plus medium shadow | Supabase #1b1d1c, Linear #191a1b, Vercel gray-200 #1f1f1f. Light cannot go lighter than white, so border and shadow carry it |
| Input fill | `bg-input/30` today; fill role | sunk: page tone or darker than card (Supabase black 12% wash, `#111211`) | white, or `#fafafa` | Supabase sunk input and raised select; Vercel background-100 |
| Hover | --muted (components/ui hover uses muted) | #222325 = fg 4.9% over card (Supabase rule), near Radix slate 3 #212225 | black 3 to 4% over surface, near `#f0f0f3` (slate 3) | Supabase --accent alpha, Geist hover 100 to 200, Radix step 4 |
| Selected | --accent, --sidebar-accent | #272a2d (slate 4) or fg 6.6% (`#262729` over card) | #e8e8ec (slate 4) or black 5.4% | Supabase, Vercel gray-300: neutral. See 4.3 on accent-tinted selection |
| Pressed | --secondary | #2e3135 (slate 5) | #e0e1e6 (slate 5) | Radix 5, Geist 300 |
| Border subtle | --border, --sidebar-border | white 7.5%: #262729 on card, `#232524` on Supabase page | black 8%: `#ebebeb` on white | Supabase 7.5% / 8.1%, Raycast #ffffff0f, Linear #ffffff0d to #23252a |
| Border default (controls) | --input (border role) | white 13.5%: #37383a on card | black 13.5%: `#dddddd` on white | Supabase --input, Geist 500 (#454545 / #c9c9c9) |
| Border strong (hover, focus, divider that must be seen) | hover and focus border | white 28%, about `#505150`; or Radix slate 8 #5a6169 | black 28%, about `#b3b3b3`; or slate 8 #b9bbc6 | Supabase control-hover, Geist 600, Radix 8. Only Radix step 9 reaches 3:1 (slate 9 on white is 3.30) |
| Text primary | --foreground | #edeef0 (slate 12), 16.3:1 on page | #1c2024 (slate 12), 15.6:1 on #f9f9fb | Supabase #edefee / #030303, Vercel #ededed / #171717, Linear #f7f8f8 / #282a30 |
| Text secondary | --muted-foreground | #b0b4ba (slate 11), 8.45:1 on card | #60646c (slate 11), 5.65:1 on #f9f9fb | Supabase #bcbdbc / #464646, Linear #d0d6e0 / #3c4149 |
| Text tertiary (meta, timestamps) | tier 3, not a shadcn token | #8a8f98 (Linear), 5.4:1 on card | #696969 (Supabase) 5.49:1 or #6f6e77 (Linear) 5.03:1 on white. Not slate 9 (3.30:1) | Linear tier 3, Supabase --tertiary-foreground |
| Text disabled / placeholder only | tier 4 | #62666d (Linear), 3.45:1 | #86848d (Linear), 3.7:1 | Linear tier 4, Supabase uses opacity-50 for disabled |
| Accent solid (button plate, switch-on) | --primary | Choice: A. owner #6b94ff with dark text #111113 (6.56:1); B. deep plate OKLCH(.436 .11 264) = #324e8d with light text (8.05:1) or at chroma .15 = #254aa3 (8.12:1); C. inverted neutral | #245dec with white text (5.45:1) | Supabase B (plate), Linear A/B, Vercel/Raycast/Resend C. Open, see 4.1 |
| Accent hover | --primary hover | lightness plus .04, hue and chroma kept. Owner #6b94ff gives about #71a2ff but leaves sRGB at chroma .164, so reduce chroma | lightness minus .04, about #184fde (in gamut) | Supabase --button-fill-hover-delta, Geist 700 to 800 |
| Accent subtle (tint, chip, citation highlight) | --accent tint role, glow | #6b94ff at 12 to 15% over card: #222836 to #242b3d (accent text on it 4.91:1). Alternative Radix indigo 3 #182449 (more chroma) | #245dec at 8 to 10% over white: #edf2fd to #e9effd (accent text 4.86:1). Radix indigo 3 #edf2fe | Linear accent-tint (#18182f / #f1f1ff), Geist blue-100/300, Raycast 15% alpha fill |
| Accent text / link | text-primary | #6b94ff, 6.4:1 on page, 6.1:1 on card. Brighter step if needed: Radix indigo 11 #9eb1ff, 9.15:1 | #245dec, 5.4:1 on #fdfdfd, 5.18:1 on #f9f9fb | Supabase --primary ink (.76 / .525), Geist blue-900 |
| Focus ring | --ring, --sidebar-ring | 2px accent, 2px offset in page color. #6b94ff. Inputs also raise border to strong | #245dec, same geometry | Geist `0 0 0 2px bg, 0 0 0 4px blue`, Supabase 55% alpha. Radix indigo 8 is only 2.42:1 in light, 3.09:1 in dark, so do not use step 8 |
| Status: warning | needs a new token | amber text #f2af48 (9.2:1 on card) on 15% fill | #ac5800 text (5.06:1 on white) | Supabase `.80 .14 75` / `.55 .14 58`, Raycast text plus 15% fill, Geist amber-100/400/900 |
| Status: info | needs a new token | use the accent family (tint plus accent text), see 4.4 | same | Geist info note = blue-100 / 400 / 900 |
| Status: neutral / done | no color | foreground (the code already does this: StatusMark `doneColor` = foreground) | same | consumers.md section 4 |
| Status: success | out of scope ("success-free"); see 4.6 | not defined | not defined | Geist's own "success" note is blue |
| Destructive | --destructive | fill #b54a46 with white text (5.21:1); text #ff9592 (Radix red 11, 8.35:1 on card) | fill #ab413e with white text (5.90:1); text #ce2c31 (5.21:1 on white) | Supabase `.55 .14 25` / `.52 .14 25`, Radix red 11. Radix red 9 #e5484d with white fails (3.91:1) |
| Chart / score bar | track, kept fill, dropped fill, keep line | track `--muted` tone; kept = accent solid; dropped = text-tertiary at 35%; keep line = foreground at 50% | same roles | Existing code: score-stage.tsx uses `bg-muted`, `bg-primary`, `bg-muted-foreground/35`, `bg-foreground/50`. If multi-series charts return, use a one-hue lightness ramp (shadcn blue theme: L .809 / .623 / .546 / .488 / .424), because `--chart-*` is currently unread |
| Code block | pane background | Muted wash, `#1f2022` (fg 3.3% over card) or page tone, plus subtle border. Shiki token colors stay their own (one-dark-pro) | `#f7f7f7` wash or white plus subtle border; one-light | Supabase --muted for "code block", Geist background-100 with hairline. Needs owner call whether Shiki palette is acceptable, see 3 |
| Quote / citation block | quote surface and the active-citation highlight | resting: muted wash with a 2px strong-border left bar; active: accent subtle fill | same, with the light tints above | INFERRED. Geist uses blue-300 for a highlighted code line; pro/ code uses a selected-row left bar in `--rb-accent`. No peer documents a citation quote |
| X bot DM bubble | bubble, avatar, link | See 4.5. Today: bubble = accent tint (`--wash` #203664), avatar = inverted neutral (`--ink` fill), link = accent. Recommend: bubble = accent subtle or raised neutral, avatar = inverted neutral, link = accent text | same | Not researched by any file. Resend/Vercel inversion for the avatar is the peer pattern |

### 2.1 Roles the code needs that the brief did not list (from consumers.md, VERIFIED)

| Role | Why it is needed | Recommendation (INFERRED) |
|---|---|---|
| `--rb-accent`, `--rb-accent-fg` global | React Bits Pro blocks read it for every fill, focus outline and on-fill text (276 / 236 / 182 uses in the 135 sources) but it is declared only on `.rb-theme-scope`, which 4 elements carry | Define on `:root` and `.dark`, same values as --primary and its foreground |
| `--color-neutral-50..950` global | 1846 references in installed blocks, 6685 in sources | Define once on `:root` (no `.dark` override). Keep Tailwind's L steps, vary chroma and hue. Constraint: 900 near light foreground and dark card, 950 / 900 / 800 equal dark page / card / border |
| `--color-white`, `--color-black` | `bg-white` (387 hits) is the light surface; `bg-black/80` is the dialog scrim | Leave white pure for cards; optionally redefine black for scrims (Geist uses gray-100 at 80% in light, background-200 in dark) |
| `--glow-1..3` | Only hero backgrounds and the adapted magic-transform particles | Accent hue at low alpha over the page tone (Linear and Resend precedent, INFERRED) |
| Shadow color | About 35 navy `rgb(9 15 29 / a)` shadows in `next/` and `pro/` | Black-based shadows for any variant that is not navy |
| Text selection | none defined | Accent at 25 to 30% (Geist uses blue-700 solid) |

## 3. Gaps

### 3.1 Claims that are unverified or conflict

1. Every accent-share number is a CSS reference count or an estimate (Supabase, Linear, Vercel, Raycast). No pixel measurement exists. Treat "5% or less" as a design target, not a finding.
2. Supabase hex values are the researcher's OKLCH arithmetic on published formulas, not values Supabase prints. The tweakcn "supabase" preset (radix-shadcn.md) is a community approximation with different values (dark card `#171717`, border `#292929`) and the two should not be mixed in one comparison.
3. Vercel's default primary button is INFERRED (no Button CSS found). The docs site was inspected, not the dashboard.
4. Linear values come from its marketing site, not the app. Linear's contrast range (30 to 100) and generator formulas were not found.
5. Radix generator behavior (https://www.radix-ui.com/colors/custom) and Radix Themes' blue-to-slate auto-pairing were never read, so the recommended mapping was built by hand.
6. radix-shadcn.md called Tailwind v4 `color-mix` for opacity modifiers UNVERIFIED. consumers.md found it in the compiled CSS for `bg-white/10` (build CSS lines 7466 to 7472). That settles the white/black case; `ring-ring/50` and `bg-primary/80` follow the same Tailwind mechanism but were not individually read.
7. The two files describe different "current" repos. radix-shadcn.md read the live app's `app/globals.css`, where `--input` is `#6d7f9e` (confirmed by rg in this pass). consumers.md read the scratch site's `next.css`, where `--input` is `#b3c2d8` (light) and `#2a3952` (dark). Dark surface hex agree in both. Anyone comparing "before and after" must say which one.
8. The "too blue and monotone" cause is the researcher's inference plus my table 0.1. It explains the numbers but the owner has not confirmed that chroma, rather than for example the glows, navy shadows or hero mesh, is what he is reacting to.
9. Contrast numbers in vercel.md, linear-peers.md and radix-shadcn.md are the researchers' own computations. I re-ran the ones I reuse and they matched to 0.01.

### 3.2 Values missing that a council would need

1. A full dark and light token table per variant. Only one ladder (slate plus owner blue) is concrete. The other three directions (pure gray plus blue, navy-tinted, near-black with sparing blue) have only a few seed values in radix-shadcn.md section 7. The "black" end (Vercel pure `#000` page) has no Radix or Geist-derived neutral ladder at all.
2. Status colors in a blue-hue world. Supabase's info hue is 288 (violet), which is 24 degrees from the owner's 264 and ends near 284 after its 15% pull toward the spot hue (INFERRED). There are no chosen info, warning or destructive hex values for each variant and no tint fills or text pairs verified for contrast on those tints.
3. A tertiary text token for the light mode that passes 4.5:1 (I give two peer values, none was tested on Oparax surfaces).
4. Shadows: no concrete light-mode shadow recipe for Oparax, only Linear's and Vercel's.
5. Overlay scrim, skeleton, text selection and disabled colors (only INFERRED in vercel.md).
6. How React Bits animated and WebGL effects read each variant. No researcher inspected shader background props or glow colors beyond `--glow-*`; `MagicBento`, `AccordionGallery`, `BranchedMenu`, `FolderFloat`, `RubberSegment` and `scroll-stack` carry hard-coded purple or zinc defaults (consumers.md section 4) and `hero-22` hard-codes navy and blue mesh stops. None of them has a recolor plan per variant.
7. The Shiki palette in `ai-elements/code-block.tsx` (one-light, one-dark-pro) and the fixed status icons in `tool.tsx` (yellow, blue, green, red, orange 600) will show in every variant unless replaced.
8. Open Sans. All the peers use Inter, Geist or similar. Whether the 4-tier text ramp reads as intended in Open Sans (larger x-height, different weight rendering on dark) was not researched.
9. The X bot DM bubble. No file covers it. Real X DM colors (X blue for outgoing, gray for incoming) were not verified in this run, and the repo already treats third-party brand marks as fixed (Google G, X blue `#1d9bf0`).
10. Rendered evidence. No researcher rendered any variant, and no screenshots of Supabase or Vercel applied to Oparax-like content (cards with citations, feed, onboarding build screen) exist. Everything here is from CSS and docs.
11. Owner preference data: he named Supabase and Vercel as the feeling he wants, but there is no recorded preference between the primary-button schools, the sidebar tone or the light-page school.

## 4. Decisions the council has to make (each is a genuine split in the evidence)

4.1 Primary button: accent plate (Supabase, Linear), inverted neutral (Vercel, Raycast, Resend), or dark plate in accent with the owner's bright blue only as ink. This single choice moves the accent share the most. 4.2 Sidebar tone in dark: same as page with a border, one rung up, or between (Linear). 4.3 Selected nav and tabs: neutral wash (Supabase, Vercel, Linear, the cleanest reading of "harmony with clean separation") or accent-tinted (the radix-shadcn.md mapping: indigo 3 with indigo 11 text). Three of three peers are neutral. 4.4 Info status: reuse the accent family (Geist precedent) or add a distinct hue such as sky near 230 (computed example: `#59c5f5` dark, `#007daa` light, only lightly checked). 4.5 DM bubble: follow the theme (current) or mimic X's own colors as a fixed zone like the brand marks. 4.6 "Success-free status": I read this as no green success token, with done state shown by neutral foreground, as `StatusMark` already does. consumers.md recommends adding a success/warning/info trio. If you meant something else, this row changes. 4.7 Page darkness in dark: L .134 to .145 (Linear, Raycast, Tailwind 950), .18 to .19 (Radix, Supabase) or 0 (Vercel). 4.8 Light page school: A (gray page, white cards), B (white page, gray shell) or C (flat). 4.9 Input edge contrast: hairline look at about 1.6:1 (Supabase/Vercel style) or 3:1 for WCAG 1.4.11 (slate 9, or the live app's `#6d7f9e`). radix-shadcn.md already marks this an owner decision. 4.10 Chroma per variant: suggested dial from peers (INFERRED): pure gray 0, slate .004 to .006, tinted .010, navy at most .02 on surfaces with borders held at or below .01. The current .031 to .048 is outside every peer.
