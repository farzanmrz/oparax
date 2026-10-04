# Four palettes on the feed: notes for a quick visual comparison

Builder: Opus subagent, October 1, 2026. This is a look-and-pick exercise on one screen, not a theme system. Inputs: `focus-review/theme-research/what-the-owner-sees.md` (mechanisms 1 to 8, feed rules 3.1 to 3.6), `attacks.md` (the skeptics win where they refute or weaken), `owner-pattern.md` with its skeptic review, `vendor-theming.md`, `consumers.md`, the Linear, Supabase and Vercel studies, and the October 1 evening decisions in `LOCKED-PLAN.md`.

## How to look

- `/next/feed/page?palette=graphite|slate|ink|navy` with `&theme=dark|light`. The palette is remembered in localStorage (`oparax-next-palette`), so view links keep it. `?palette=current` returns to the unchanged navy tokens. The review dock has a palette row (Current, Graphite, Slate, Ink, Navy).
- `&compose=old` shows the round 2 card and aside unchanged under the chosen palette: the color-only test the first skeptic asked for. Default is `compose=new`.
- `&state=checking|failed-items`, `&alerts=active|paused|stopped|error`, `&pool=out` and `&story=` work as before.
- Renders: `focus-review/renders-themes/<palette>-<theme>.png` (clustered, 1440x900 viewport), plus `graphite|slate-dark-compose-old|new.png` and `<palette>-dark-signals.png` (direct view, alerts on, one failed item, to show the status slots and four stories).

## What every palette defines

One CSS file, `site/app/(next)/palettes.css`, imported by the root layout after `next.css`. A palette is a class on `<html>` set before paint by `next/palette.ts`, like the dark class. Each block sets, for light and dark:

- the full shadcn set (background, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, eight sidebar tokens) and the three glow tokens;
- the React Bits Pro knobs: `--rb-accent`, `--rb-accent-fg`, the `--color-neutral-50..950` ramp (Tailwind's lightness steps kept, only chroma and hue moved, as the vendor asks) and the radius ladder, globally rather than inside `.rb-theme-scope`;
- four text tiers `--t1..--t4` (title, names and key phrases, reading text, meta);
- hairlines `--line` (cards), `--line-soft`, `--line-strong` (controls, tiles), plus `--raised` (selected or hover) and `--well` (sunk evidence area);
- four functional slots with foreground pairs: `--ok`, `--caution`, `--error`, `--brand`. All sit at OKLCH lightness 57 to 83 and chroma about 0.12 to 0.21 so they read as one family, as Linear's and Supabase's status hues do;
- structure knobs the new composition reads: heading weight, label font and case, action radius, story radius and shadow, selected-segment fill and edge.

`next.css` gained `@theme inline` entries for the new tokens (`text-t1`, `bg-ok`, `border-line` and so on).

## 1. Graphite (Linear logic)

**Logic.** Linear's dark UI has almost no tint in its greys (chroma under 0.007), draws every shape with one see-through white line, and puts its only brand color on the focus ring, the send button and a mention. The primary action is a light grey pill. This is the purest test of "the navy itself was the problem".

| Token | Dark | Light |
|---|---|---|
| page | `#08090a` | `#ffffff` |
| list container (`--card`) | `#0f1011` | `#f9f9fa` |
| raised, selected segment | `#191a1b` | `#ececee` |
| popover | `#141516` | `#ffffff` |
| hairline / soft / strong | white 8% / 5% / 12% | black 9% / 6% / 14% |
| text t1 t2 t3 t4 | `#f7f8f8` `#d0d6e0` `#8a8f98` `#6e737b` (18.7, 13.6, 6.1, 4.2 to 1) | `#0f1011` `#2f3237` `#5f636a` `#7b8089` (19, 12.9, 6.0, 4.0 to 1) |
| primary pill | `#e5e5e6` with `#08090a` text | `#18191b` with `#f7f8f8` text |
| ok, caution, error | `#27a644`, `#f0bf00`, `#eb5757` | `#27a644`, `#d9a100`, `#e5484d` |
| brand (ring, small marks) | `#6b94ff` | `#245dec` |
| ramp | chroma 0.002 to 0.004, hue 264 | same |

Headings weight 510, labels in sans at 12px (Linear's section labels are sans, not mono). Stories are unboxed rows separated by hairlines inside one list container with a dark 1px outer ring (the Linear thread and Linear's bevel). Departure from the brief: the brief listed card `#141516`; on the feed there is no panel layer, so the list container takes the panel value `#0f1011` and `#141516` became the popover step. The light hairline is 9% rather than 6 to 8% because the owner said light-mode borders were "too light" (October 1).

**Color appears:** the primary pill is grey, so the only hue on a resting screen is the publisher art. Status dots (ok, error), the focus ring and the meter's caution or error fill appear only when their state is true. **Forbidden:** every fill, border, headline, fact, citation and the view switch.

## 2. Slate (Supabase logic, blue instead of green)

**Logic.** Supabase tints every neutral with one hue at very low chroma, builds hairlines from the foreground color at 7.5% (13.5% for things you can press), keeps a deep dark plate for the primary action and saves the bright accent for small marks, the focus ring and the switch-on state. Field labels are uppercase monospace (STATUS-style). Selected tabs are drawn by a bright foreground edge, not a fill.

| Token | Dark | Light |
|---|---|---|
| page | `oklch(0.19 0.005 250)` (`#121416`) | `#fdfdfd` |
| card | `oklch(0.215 0.005 250)` | `#ffffff` |
| popover, raised | `oklch(0.24 0.005 250)` | `#ffffff`, `#f3f4f5` |
| well (sunk) | `oklch(0.175 0.005 250)` | `#f7f8f9` |
| hairline / strong | `#edeff0` at 7.5% / 13.5% | `#e4e5e7` / `#d6d8db` |
| text t1 t2 t3 t4 | `#edeff0`, L 0.86, L 0.68, L 0.58 (16, 12, 6.4, 4.2 to 1) | `#17181b`, L 0.36, `#616467`, L 0.58 |
| primary plate | `oklch(0.44 0.11 262)`, `#eef3ff` text, 1px edge `oklch(0.55 0.13 262)` | `oklch(0.47 0.17 263)`, white text |
| ok, caution, error | `oklch(0.74 0.14 162)`, `oklch(0.8 0.15 78)`, `oklch(0.66 0.18 25)` | L 0.6, 0.7, 0.57 at the same hues |
| brand | `#6b94ff` | `#245dec` |
| ramp | chroma 0.003 to 0.006, hue 250 | same |

Headings weight 560, buttons radius 6, mono caps labels at 11px tracked 0.06em, the selected view has the page fill and a bright edge, icon tiles have a card fill and a strong hairline. Stories stay boxed cards 12px apart. Departure from the brief: the light border is `#e4e5e7`, a step darker than Supabase's `#e9e9e9`, for the same light-mode complaint.

**Color appears:** the deep blue plate (one per screen), status dots, the ring. **Forbidden:** blue on text, links, selection, tiles or cards; status hue on boxes or words.

## 3. Ink (Vercel Geist logic)

**Logic.** Geist is pure black and white with a published grey ladder whose jobs are fixed (100 component fill, 200 hover, 300 selected, 400 border, 900 secondary text, 1000 primary text). Cards are drawn by a `#ffffff25` ring plus a faint layered shadow rather than a fill step. Blue is a signal: the focus ring, links at blue-900 and one solid primary at blue-700. This palette keeps Vercel's own blue (hue about 212) as the host defined it, so it is the one option that does not use the owner's `#245dec` / `#6b94ff`; worth flagging when he compares.

| Token | Dark | Light |
|---|---|---|
| page | `#000000` | `#fafafa` |
| card, list container | `#000000` | `#ffffff` |
| panel, raised (gray-100) | `#1a1a1a` | `#f2f2f2` |
| selected segment (gray-300) | `#292929` | `#e6e6e6` |
| hairline / strong | white 14.5% (`#ffffff25`) / 24% | black 8% (`#00000014`) / 14% |
| text t1 t2 t3 t4 | `#ededed` `#d4d4d4` `#a0a0a0` `#7d7d7d` (17.9, 14.2, 8.0, 5.1 to 1) | `#171717` `#4d4d4d` `#666666` `#767676` |
| primary | `#0071f6`, white text | `#0070f7`, white text |
| ring, brand, links | `#50a8ff` | `#0070f7` ring, `#0064e2` brand |
| ok, caution, error | `#00ca52`, `#ffb200`, `#ff5e63` | `#28a948`, `#ff9900`, `oklch(0.6 0.2 25)` |
| ramp | chroma 0 | same |

Headings weight 600 (Geist's), mono caps labels at 11px, buttons radius 6. Stories are rows inside one list container, as Vercel lists are, with a layered shadow. Geist has no fourth text tier, so t2 `#d4d4d4` and the light t4 `#767676` are mine; the ladder is flatter and brighter than Linear's, which is part of Geist's character. `ok` in dark (`#00ca52`) is the loudest slot of the four palettes.

**Color appears:** the one blue primary, status dots, the ring. **Forbidden:** everything else, including selection (grey 300) and input focus.

## 4. Navy (the control)

**Logic.** Same navy family as today (page `#090f1d`, card `#141e31`), with every other mechanism applied: see-through hairlines instead of the solid `#2a3952` border, four text tiers instead of two, no blue on bullets, citations, selected view, highlight or meter, blue only on the primary and small marks, functional slots added. If navy still reads "too blue" here, the ground itself is the problem; if it reads fine, it was the accent spread.

| Token | Dark | Light |
|---|---|---|
| page | `#090f1d` | `#f3f6fb` |
| card | `#141e31` | `#ffffff` |
| raised, popover | `#19253c` | `#eaf0fa`, `#ffffff` |
| well | `#0d1424` | `#f6f8fc` |
| hairline / strong | white 8% / 13% | `#132139` at 11% / 18% |
| text t1 t2 t3 t4 | `#f0f4ff` `#c8d2e6` `#8e9bb3` `#6b788f` (17.4, 12.6, 6.8, 4.3 to 1) | `#132139` `#34425b` `#56637a` `#6d7a92` |
| primary | `#6b94ff`, `#081022` text | `#245dec`, white text |
| ok, caution, error | `oklch(0.74 0.15 160)`, `oklch(0.8 0.15 78)`, `#ff7a86` | L 0.6, 0.7, `#c8313f` |
| ramp | the current navy ramp, unchanged | same |

Headings weight 520, mono caps labels, pill primary, boxed cards. The coordinator's correction holds: no extra fill layers; the 2 to 3 fills stay (page, card, raised).

## Feed composition (compose=new), same in all four

Files: `next/feed/compose-new.tsx` (page, view switch, aside), `next/feed/story-row.tsx` (the card, adapted from `next/story-card.tsx`, which stays as is for `compose=old` and the landing hero). Only `/next/feed/page` uses it; ready, exhausted, free-week-ended and the shell keep the round 2 composition.

| Change | Why |
|---|---|
| Time ("Aug 7, 2025 · 11:02", newest report, UTC) and "2 reports" in t4 sans with tabular numerals, on the headline's line at the right | Mechanism 6, rule 3.6.1 and 3.6.2. Sans, not mono: the structure skeptic (objection 7) and the coordinator; both references set object facts in dim sans. On the headline's line so the title stays first (owner, September 30: title not at the top) |
| Facts 14px in t3, the key number, date or release name in t2 at the same weight | Mechanism 3, rule 3.3, question 5. The key phrase is a preview regex (numbers, percentages, dates, "React 19", "Next.js 15"), standing in for a writer-marked phrase |
| Citation stays in parentheses (owner's card spec) but in t4 at 12.5px, brightening to t2 on hover; the active one gets a neutral 7% foreground wash, not the accent | Rule 3.6.5 and 3.4 links row |
| Source strip under the facts: X author avatar (round) with publisher in t2 and handle in t4; publisher favicon (square) with domain in t4. The strip is the "Used N sources" control; it opens the quotes | Mechanism 5, questions 3 and 7; kind told by shape (round post, square article). The words "Used N sources" are dropped because "2 reports" already gives the count and the marks name the sources (owner rule: never say anything twice) |
| Quotes open in a sunk well (`--well`, hairline, radius 8) | Rule 3.1 L2 and 3.6.6 |
| Graphite and ink: rows in one list container; slate and navy: boxed cards 12px apart; one radius per palette | Coordinator correction 2 and attack objection 6 (Linear thread, Vercel list) |
| Cards measure 200 to 240px (clustered), padding 18 by 22px | Rule 3.5. Only two clustered stories exist in the verified data, so the clustered shot shows two; the direct "signals" shots show four |
| Main column fills the frame (no 800px cap), aside 300px | Owner theme 1.1, blank space |
| Aside: label over value on the canvas, each with a 32px bordered icon tile; alerts state as a dot plus words (ok when on, hollow when off, paused or stopped, error when it failed); one compact primary pill; "Check connection" as a text link | Rule 3.5 aside, 3.4 alert state, primary row; coordinator correction 2 (no raised, nearly empty box) |
| Status pair in the aside: a pulsing neutral dot for "2 items being checked." (`?state=checking`) and an error dot for "Could not process 1 item." (`?state=failed-items`), replacing the boxes above the stories | Rule 3.4 pending and failed rows |
| Free week and watched posts as two pairs; the meter is neutral, caution fill at 80% or more, error fill and an error dot when used up (`?pool=out`) | Rule 3.4 meter row |
| View switch selected by lightness (graphite, ink, navy) or a bright edge (slate), never hue; view names use the palette's label style | Rule 3.4, coordinator correction 3 |
| Preview note kept as one t4 line at the right of the title block | Brief; question 8 stays open for the owner |
| Headings 510 to 600 by palette, title 28px tracked -0.022em | Mechanism 3, rule 3.3 |

Not changed, on purpose: no images on cards (card spec), no "Sent to X" mark (the data has no delivery time), no fades or glows (attack objection 13: those are marketing-page mechanisms), the shared header (its Settings and Log Out are still bright; changing `frame.tsx` would touch every page).

## Measured on the renders

Vivid pixels (max minus min channel at least 40, max channel at least 80), excluding the publisher and avatar images: graphite 0.00% (its primary is grey), slate 0.32%, ink 0.33%, navy 0.31% at rest; about 0.01% in the signals shots, where the dots are the only hue. All are under the 0.5% budget, and the references range 0.03 to 0.6%. Fills covering more than 1% of the screen: 1 to 3 per render.

## Runtime images

Publisher favicons (`https://icons.duckduckgo.com/ip3/<host>.ico`) and X avatars (`https://unavatar.io/x/<handle>`) are public images fetched by the browser at runtime, for this preview only. Nothing was downloaded into the repo. If an image fails, a neutral X or newspaper glyph in the same shape takes its place.
