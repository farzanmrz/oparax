# What the owner sees in Linear and Supabase, and how it lands on the feed

Synthesis, October 1 2026. Inputs: `study-linear.md`, `study-supabase.md`, `study-life.md`, `study-type-texture.md` (this folder), the six owner screenshots in `refs/owner-1.webp` to `owner-6.webp` (all read), our render `focus-review/renders-r2/dark/12-shell-clustered.png` (read), and the feed preview source in `scratch/design-recovery/site/next/` (`story-card.tsx`, `feed/model.ts`, `data/feed.ts`).

Evidence marks:
- **[M]** measured by a study (computed styles on the live page, or pixel counts).
- **[S]** seen in an image, by me or a study.
- **[I]** inferred, my reading.

No palettes here. Where a rule needs a number, it is a lightness step, an opacity, a size or a contrast ratio, never a hue.

Two corrections to the brief's framing:
- Owner-5 and owner-6 are the "Intake and integrations" section of the Linear homepage, not linear.app/intake [M]. The studies covered both.
- The Supabase dashboard (owner-1, owner-3) needs a login, so its values are pixel samples from his screenshots, not computed styles.

---

## 1. The mechanisms, in plain words

Eight things make these pages feel clean, alive, and "different yet similar" in dark on dark. Each has one measured reference example and one example of where our render lacks it.

### 1. The ground is grey, and it climbs in tiny steps

The page, the panels and the cards are all nearly pure grey, and each layer is only a hair lighter than the one below. Depth comes from many close greys rather than two contrasting fills.

- **Reference [M]:** Linear's page, panel and card have lightness 13.9, 17.2 and 19.5 (OKLCH L, 0 to 100). Their color content (chroma) is 0.002 to 0.007, essentially zero. A card is only 1.05 to 1.09 times brighter than the page. The owner's six screenshots each show 12 to 25 distinct dark tones covering more than 0.3% of the screen.
- **Ours [M]:** surfaces carry chroma 0.031 to 0.048, all at one blue hue. That is about 8 times the references' color tint in the dark pixels (22 to 26 against 2.6 to 3.1). The screen has 3 to 4 dark tones, and two of them cover 93% of it. The card stands 1.15 times off the page.
- **What this explains [I]:**
  - The blue lives in every pixel, not just in the accent. That is "too blue".
  - Navy surfaces plus one blue accent is "two colors".

### 2. One faint light line draws every shape

Every card, chip, panel and divider is outlined with the same 1px line, made of white at low opacity. Because it is see-through, it automatically looks right on any surface. Clickable things get a slightly stronger line. There are almost no shadows.

- **Reference [M]:**
  - In Linear's intake section, 51 of 54 bordered elements use the same 1px white at 8%.
  - Supabase uses its text color at 7.5% for static edges and 13.5% for clickable ones. It has no visible drop shadows.
- **Ours [M]:** a solid blue border (`#2a3952`, 1.43:1 against the card) on every container. The card shadow is the page color, so it does nothing. Every story, aside block and step is the same heavy box.

### 3. Brightness, not color or boldness, sets the order of reading

Text comes in four greys, each about half as contrasty as the one above:
- the brightest for headings;
- a soft white for names and titles;
- a mid grey for ordinary reading text;
- a dim grey for times, IDs and counts.

Emphasis means making a phrase brighter inside a dimmer sentence. Headings are medium weight, never bold.

- **Reference [M]:**
  - Linear's tiers sit at 18.7, 13.6, 6.1 and 3.5 to 1. Its most-used text is 15px grey at 6.1:1.
  - Supabase writes "Every project is **a full Postgres database**, the world's most trusted..." at one size and one weight, with the bold phrase lifted only from 5.8:1 to 13.8:1 contrast.
  - Linear headings use weight 510, and Linear never uses 600 or 700.
- **Ours [M]:**
  - Two tiers.
  - The bullet facts, which are most of the card, sit at 14.6:1, almost the same as the title at 15.2:1, so everything shouts equally.
  - There is no dim tier for metadata, and headings use weight 600.

### 4. Color is a small mark that answers one question

Each hue has one job, such as a state (in progress, healthy, warning, error), a kind (bug, design) or a change (lines added or removed). It shows up only as a 6 to 14px dot, icon or small badge. The word next to the mark stays grey. All the hues are about equally loud, so a mix of them reads as one family. This is what the owner described as "yellow, blue, green and red elements, but in the relevant location".

- **Reference [M]:**
  - Linear's "Bug" chip has grey text (`#8a8f98`) and a 7x7px red dot.
  - Supabase's WARNINGS and ERRORS are grey mono words, each led by a 6px colored dot, with the counts in white.
  - Colored pixels make up 0.03 to 0.6% of every reference screen.
  - Linear's accents all fall within lightness 57 to 83 and chroma 0.12 to 0.21.
  - In owner-1's table area, the most saturated pixel is near-grey.
- **Ours [M][S]:**
  - One blue does every job: button, selected nav item, view toggle, score bars, links, the active citation.
  - So color tells the viewer nothing about state or kind.
  - The blue still covers 0.8% of the feed, more than any reference screen, mostly in one full-width "Get alerts on X" bar.

### 5. Real-world things keep their own colors

Photos of people, company logos and a flag keep their native colors. A neutral grey ground lets them stand out without competing. This is where most of the warmth comes from.

- **Reference [M][S]:**
  - Owner-5/6 show 9 photo avatars.
  - Owner-1 shows the Claude logo in its own orange and the owner's own photo.
  - Owner-3 shows a US flag.
  - Linear's customer logos are pure white, brighter than its headline text.
  - Supabase's GitHub mark is a solid filled glyph at text size (`#bcbdbc`), with no circle around it.
  - The studies disagree slightly on why the GitHub mark reads clearly. Measured, it is the second tier, not the brightest. The common factor is a solid shape at text size with no container [I].
- **Ours [M][S]:**
  - Every source is a 10px grey X or newspaper glyph inside a 20px bordered circle.
  - The user avatar is a letter "F".
  - Of our renders, the owner praised only d1, which was still navy and single-hue. It was the only one with a real colored logo (NASA), a photo and a date on every card [M].

### 6. Every object carries quiet facts in a "machine voice"

Every card shows small, dim data: an ID, a time, a count, a size. On Supabase, labels like STATUS, COLUMNS and WARNINGS are set in small uppercase monospace (typewriter-style) letters. This marks them as system words, separate from the content.

- **Reference [M][S]:**
  - Linear issue cards hold "ENG-926", a priority glyph, label chips and a PR number in 300x96px, in three text tiers.
  - Linear's thread shows "7:06 PM" beside each name.
  - Supabase stacks the label "STATUS" (dim mono caps) over the value "Healthy" (bright). The node card reads "CPU 2% · Disk 3% · RAM 52% · 5/60 conns".
- **Ours [M][S]:**
  - The card has no time, no report count, no ID and no meta row.
  - Facts sit inside sentences, with source names in grey parentheses.
  - There is no monospace and no uppercase label anywhere on the feed.
  - Two lines tell the viewer it is not real: "Preview data from public sources, not from your agent." and "Illustrative example, not a real run."

### 7. Same skin, different bodies, stacked several deep

One edge rule, one set of text greys and one type system are applied to many kinds of container: tables, tiles, pills, chat bubbles, floating windows and canvases. These nest four to six levels deep and sometimes overlap. This is "everything looks different yet similar" [I].

- **Reference [M][S]:**
  - Linear intake nests page > board > column > card > label chip > dot (6 levels). Its thread panel overlaps the board.
  - Linear uses about 10 different corner radii, all with the same 8% line.
  - Supabase's illustrations are built from its own UI parts: pills, bordered tiles, dashed connectors and mono labels.
- **Ours [M][S]:**
  - Two working levels (page > card).
  - Every container has the same fill, edge and radius.
  - The aside floats beside a large empty gap.
  - Our radius steps (14 / 10 / 8 / full) are close to the references, so radius is not the problem [M].

### 8. Things dissolve into light instead of ending in a box

Large product images fade out at their edges instead of ending in a hard box. Featured cards are lit from the top edge. Grey light glows behind product shots. Neither site uses noise or grain.

- **Reference [M]:**
  - Linear masks its board to transparent over 560px on the right and 300px at the bottom. The fade is visible in owner-5/6.
  - Supabase's feature cards have a border that is bright at the top and fades to nothing at the bottom.
  - Linear adds a 3% white bloom in panel corners, and a grey floor-glow under the hero mockup.
- **Ours [M]:** the feed and the landing hero have no gradients, masks, glows or fades. The three glow tokens in `next.css` exist but nothing uses them.

---

## 2. Which of these are about color, honestly

| # | Mechanism | Color | Structure | Type | Density | Content | Texture |
|---|---|---|---|---|---|---|---|
| 1 | Grey ground, tiny steps | **yes** (remove hue from neutrals) | yes (more levels) | | | | yes (more tones) |
| 2 | One light hairline | partly (neutral, not blue) | **yes** | | | | yes |
| 3 | Brightness sets order | | | **yes** | | | |
| 4 | Color as small single-job marks | **yes** | | | | | |
| 5 | Real things in their own colors | partly | | | | **yes** | |
| 6 | Quiet facts, machine voice | | | yes | **yes** | **yes** | |
| 7 | Same skin, different bodies | | **yes** | | yes | | |
| 8 | Dissolve into light | | | | | | **yes** |

The split:
- **Two mechanisms are mainly color (1 and 4), and two touch it (2 and 5).**
  - The color fix means taking the hue out of the neutrals and moving it into small marks with one job each.
  - The fix *reduces* color by area. The references show less vivid color than ours (0.03 to 0.6% against our 0.8%) [M]. They read as more colorful because their color has meaning and variety, not because there is more of it [I].
- **"No life" is mostly not color.** Linear's /method page has 0.00% colored pixels and /pricing 0.07% [M], and both still read as alive.
  - Their life comes from the text-tier ladder, nesting, real marks, metadata and light fades.
  - If we fixed only color and kept 2 levels, 2 text tiers and prose-only cards, I expect the owner to get a cleaner page that still reads as lifeless [I].
- **"Too blue" and "two colors" are color**, plus one type cause: two text tiers on a two-tone ground [M][I].

---

## 3. Rule set for the Oparax FEED

All rules are mechanisms; the hue choices come later. "L" is OKLCH lightness on a 0 to 100 scale.

### 3.1 Surface levels and lightness steps

| Level | What sits on it | Step | Basis |
|---|---|---|---|
| L0 canvas | page, left nav, top bar, footer, aside labels and values | one fill shared by all of these; nav is separated by a 1px hairline, not a different fill | Supabase sidebars sit on the canvas [M] |
| L1 content | story card, the one aside block that must be a box | +2 to +3.5 L over canvas (contrast 1.05 to 1.09); best done as a 2 to 3% white overlay so it stacks automatically | Linear +2.3 to +3.3, Supabase +2.5 [M] |
| L2 inside a card | evidence (quotes per source) area: **sunk**, back toward canvas (-1 to -3 L from the card); source chips and buttons: **raised**, +1.5 to +2 L | buttons rise, inputs and wells sink | Supabase in-card elements return to page color, inputs sink [M]; Linear chips 5% white [M] |
| L3 floating | popovers, menus, the DM preview on the landing | +1 to +2 L over its base, plus the only shadow allowed (Linear: `0 2px 32px rgba(0,0,0,.25)`) | Linear agent panel [M] |
| Selected / hover | selected nav item, selected view, hovered row | +2 to +4 L over its container, no hue | Supabase selected row [M] |

Further rules:
- **Neutral chroma:** at most about 0.006 on every surface, border and text grey [M range of both references]. Text greys may carry a faint tint (Linear: 0.012 to 0.015 [M]); surfaces should not.
- **Fills per screen:** no more than four on screen at once, while the dark tones visible should rise from 3 to 4 to roughly 12 or more, through overlays, sheens and fades rather than new fills [I].
- **Canvas lightness:** the references sit between L 14 (Linear) and L 19 (Supabase). Choosing within that range is a palette decision, deferred.

### 3.2 Border and radius per level

| Level | Border | Radius |
|---|---|---|
| L0 dividers (nav edge, section rules, card's internal rule above sources) | 1px, white or foreground at 5 to 7.5% | none |
| L1 story card | 1px at 8% | 12 to 14 (ours 14 is fine) |
| L1 lead or alerted story (optional) | top-lit gradient border: 8% at the top fading to 0 at the bottom (Supabase) | same |
| L2 evidence well, chips | 1px at 8%; chips full pill, wells 6 to 8; radius steps down as containers nest | 6 to 8, full |
| Clickable controls | 1px at about 13.5%, hover about 17%, focus clearly brighter | 8, or full for pills |
| L3 floating | 1px at 12% plus the shadow above | 12 |
| Story opened from an alert | brighter neutral edge (much higher opacity), no hue; our current neutral ring already follows this | same as card |

- **Optional bevel:** a dark 1px outer ring (`rgba(0,0,0,.2)`) outside the light line, as Linear does [M].
- **No solid tinted borders anywhere.**

### 3.3 Text tiers

| Tier | Contrast on canvas | Feed use |
|---|---|---|
| T1 | 16 to 19:1 | page title, story headline |
| T2 | 12 to 14:1 | publisher and author names, the key number or noun phrase inside each fact (brightened, same weight), aside values ("212 of 300"), selected nav text |
| T3 | about 6 to 6.5:1 | **the bullet fact text**, aside explanations, nav items, links, chip text |
| T4 | about 3.5 to 4.5:1 | times, report counts, handles, domains, "Used N sources", mono labels |

Rules:
- **T4 and accessibility:** Linear's dimmest tier is 3.45:1 [M], below the usual 4.5:1 for small text. If we keep it, T4 holds only text that also exists elsewhere or is not needed to act. Otherwise set T4 at 4.5:1 [I].
- **Weights:**
  - 400 to 450 for body text;
  - about 500 to 510 for headings (no 600 or 700);
  - about 590 only for names in source rows.
- **Letter spacing:** about -0.011em at 13 to 15px and -0.022em on the 28px+ page title [M Linear].
- **Tabular numerals:** on every time, count and the meter [M Linear].
- **Mono voice:** one small uppercase monospace style (11 to 12px, tracked about 0.05em, at T4 or the lower half of T3) for system words only:
  - the time ("2H AGO" or "OCT 21 · 19:58");
  - "3 REPORTS";
  - "SENT TO X";
  - the aside labels "ALERTS ON X" and "FREE WEEK".
  - The user's content (headline, facts, quotes) stays in the sans [M Supabase pattern].
- **Label over value:** in the aside, a dim mono label sits over a bright value, replacing boxed paragraphs [S owner-3].

### 3.4 Functional color map for the feed

The rule: a hue appears only where it answers a question, only as a mark of 6 to 16px (or as a real-world artwork), and the word beside it stays in a grey tier. All hue slots must be about equally loud; that is a constraint on the future palette [I from M].

| Feed element | Treatment | Why |
|---|---|---|
| Publisher logos and favicons | **native color**, solid, 14 to 16px, no circle around them, beside the publisher name in T2 | Real artwork, mechanism 5. The data already holds `publisher`, `url` and `source_id` [M source]; `product-screens-and-pull.md` notes publisher icons exist in data but are not shown |
| X authors | real profile photo, 16 to 20px round, with the handle in T4 | Linear thread photos [S] |
| X logo itself | solid white or T2 glyph at text size | Brand mark with no color of its own; reads like the GitHub mark |
| Source kind (post, article, feed, site) | **shape, not hue**: round avatar = X post, square favicon = article or site, RSS glyph = feed | The publisher art already brings color. Kind hues on top would add color without a single job, which reads as "random" [I] |
| Pending ("N items being checked") | neutral dot that pulses gently, with T3 words; no hue | Pending is not a problem. Supabase loading dots pulse grey [M source] |
| Failed ("Could not process N items") | error slot, 6 to 7px dot or 14px icon, with T3 words; **not** a red-tinted box border as now | Supabase ERRORS dot [M] |
| Fit score (skipped list, building screen) | **neutral**: bars in grey, kept items shown by brightness (T2 against T4), threshold as a dashed neutral line | Supabase: status colors are never used for data; data stays neutral [M source] |
| Alert state, aside | active: "ok" slot dot. Paused and stopped: hollow neutral dot. Error: error slot dot. The word stays T2 | Supabase health dots, Linear status icons [M] |
| Per story "sent to X" | white X glyph plus time in mono T4; no hue, because every story gets one DM and it is the normal case. A failed send gets the error dot | Color marks exceptions and states, not the default [I] |
| Free week meter | neutral track, fill in T2 grey, numbers tabular. The caution slot only near the limit, the error slot only when used up (`poolOut`) | Supabase amber spend-cap line, only at threshold [M] |
| Selected view (Clustered or Direct) | neutral: lighter fill or bright border on the selected segment | Supabase selected tab uses a foreground border, Linear active nav is lighter [M] |
| Selected nav item | +2 to +4 L fill, T2 text, no hue | Supabase [M] |
| Links and citations | T3 or T4 text that goes brighter on hover. The active citation gets a neutral white wash (5 to 8%), not the accent | Linear links are grey with an arrow; Supabase body links are grey and underlined [M] |
| Primary action ("Get alerts on X", plan choice) | one per screen, compact, not full width. Either an inverted neutral pill (Linear) or a deep, dark brand plate (Supabase). Open question 2 | Neither reference puts a large bright accent fill in its chrome [M] |
| Brand slot | logo, focus ring, the one primary if question 2 says so | Linear indigo is limited to the send button, toggle, mention and focus ring [M] |
| New or updated story (only if the product tracks it) | brand slot dot, or a small tinted "NEW" badge | Supabase NEW badge [S]. Whether the data supports it is unverified |

**Color must not appear on:**
- page, card or border fills;
- headlines, fact text or citation text;
- "Used N sources";
- the view switch or nav;
- score bars;
- whole boxes or banners (state is a dot plus a word);
- full-width buttons;
- empty states;
- decorative gradients.

**Budget:** excluding photos and logos, vivid pixels stay at or below about 0.5% of a feed screen. Expect 5 to 20 colored marks per screen [M reference range].

### 3.5 Density targets

- **Current [S]:** two story cards fill the 1440x900 screen (cards are about 280 to 340px tall), and the aside holds two boxed blocks of prose.
- **Target [I]:** three to four stories start inside the first screen at 1440x900. A clustered card runs about 180 to 260px:
  - a meta row;
  - the headline;
  - two to four facts, with "show more" if longer;
  - the source strip.
- **Inside the card:** 13 to 15px for facts, 12px for the mono meta, 8 to 12px gaps between rows, and 20 to 24px padding. Linear fits three tiers into a 96px card [M]. We need more room for prose, but the meta must be as compact as theirs.
- **Between cards:** 12 to 16px.
- **Aside:** label over value pairs on the canvas with small icon tiles (Supabase overview). One box at most, for the alert action.
- **Calm and dense together:** the page header and the empty space around the column stay generous. The density lives inside the cards (Linear's "airy copy, dense UI" [M]).

### 3.6 Real-content signals every card must carry

Each signal below is backed by a field that already exists in the preview data shape (`data/feed.ts`, [M source]).

1. **Time:** `published_at` (or the arrival time) in the mono T4 meta row.
2. **Report count:** "3 REPORTS" for clustered stories, from `items.length`.
3. **Publisher marks:** favicon or logo in real color, publisher name in T2, domain in T4.
4. **X posts:** author photo and handle (`author`).
5. **Per-fact citation:** kept, but as T4 names that brighten on hover, not parentheses in the reading tier.
6. **Nested evidence:** the quotes per source, already in `SourcesContent`, shown in the sunk L2 well. This gives the card its third and fourth levels.
7. **Image thumbnail:** shown when `image` is present (the Next.js blog item has one). d1, the praised render, had a photo [M].
8. **Delivery mark:** "SENT TO X · 19:58" once alerts are active.
9. **Disclaimer:** shorten "Preview data from public sources, not from your agent." to one quiet mono label, or keep the sentence. This is a copy and honesty question for the owner, not a color question (question 8).

---

## 4. The landing, in brief

Same ground, hairline, tiers and color map as the feed. Specific to the landing:

- **Hero headline:**
  - left-aligned, at weight about 500 with tight tracking;
  - optionally two-toned, the first clause bright and the rest grey at the same size;
  - one short grey line under it;
  - one primary action as an inverted neutral pill or a deep plate. No colored gradient text, badge or eyebrow [M Linear hero].
- **The hero need not show everything at once (owner's tentative point).** The references support this [M][S]:
  - The Linear hero shows one issue and one agent panel, cropped: the mockup starts at y=527, so only about 370px shows in the first screen.
  - The Linear /intake hero shows the product board blurred and dimmed, as texture under the headline.
  - Supabase's hero shows three cards, each a fragment.
  - For Oparax [I]: show one real story card with real publisher marks, with the DM preview overlapping it as an L3 floating panel. The three reports sit tucked or fading behind the card. Crop it at the fold and fade its edges with masks.
  - The full flow (sources > story > DM, setup, timing) is told further down, one chapter per step, not all in the hero.
- **Staging:** product UI as real page elements (not pictures), sitting on grey light (a floor glow from below, or a top-center spotlight). Edges fade into the page [M Linear].
- **Chapters:** one repeated template, built the same way for each step:
  - heading at left;
  - a short paragraph at right in soft white;
  - the staged UI;
  - a 1px rule.
- **Roadmap logos:**
  - Linear makes integration logos grey on dark tiles; Supabase flattens logo clouds to grey [M].
  - Native color is kept for things that identify content (a source inside a story card).
  - A deliberate rule [I]:
    - grey for the roadmap, the "planned" list and the platform list;
    - real color only for publishers inside story cards.
  - The current landing has 14 colored logos in one uniform list, which reads as color without a job [M][S].
- **Pricing:**
  - no colored cards and no colored checks;
  - the recommended plan is marked by a heavier neutral border and/or a taller card plus the one bright button [M both];
  - plan names and prices may use the mono voice (Supabase) [M].
- **Big color blocks:** Linear's only large color areas are customer testimonials in each customer's own color. We have no customers to quote, so the landing should have no large color areas at all [I].

---

## 5. Open yes or no questions for the owner

1. **Ground:** should the background, cards and borders become near-pure grey, with the navy removed? This would change the locked navy and blue contract, so it needs your approval.
2. **Main button:** should the main button be a light grey pill with dark text (Linear's way)? If no, it becomes a deep, dark colored plate (Supabase's way).
3. **Real logos:** should publisher logos and X profile photos show in their real colors on every story card?
4. **Machine voice:** should a small uppercase monospace style be added for times, counts and labels, next to the current sans font?
5. **Reading text:** should the bullet facts drop to a calmer grey, with only the key number or phrase in each fact made bright?
6. **Meta row:** should every story show a top row with its time and number of reports?
7. **Images:** should a story show the source's image when it has one?
8. **Disclaimer:** should "Preview data from public sources, not from your agent." be shortened to a small label (or removed where the data is real)?
9. **Fit scores:** should fit scores stay colorless, with kept items shown by brightness instead of the accent?
10. **Alert dot:** should a small colored "ok" dot next to "Alerts on" be the only color in the aside when alerts work?
11. **Hero:** should the landing hero show one real story with the DM overlapping it, cut off at the fold and fading out, leaving the rest of the flow to the sections below?
12. **Roadmap:** should roadmap and platform logos go grey, keeping real logo color only inside story cards?
13. **Headings:** should headings get lighter, about medium weight instead of semibold?
