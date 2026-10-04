# Study: "life" and "different yet similar"

Written 2026-10-01. Lens: what the owner's six reference screenshots have that our rejected dark renders lack, counted per screen. No palettes proposed; this names mechanisms only.

## 0. Method and evidence labels

- MEASURED (pixels): every screenshot was converted to BMP and scanned pixel by pixel. "Dark tones" = exact colors darker than 70/255 covering more than 0.3% of the image. "Dark chroma" = mean (max channel minus min channel) over pixels darker than 90/255; 0 is pure grey. "Vivid hue" = pixels with channel spread at least 70 and brightness at least 110, grouped into hue families.
- MEASURED (DOM): live pages captured headless with agent-browser at 1440x900 and read with getComputedStyle: linear.app homepage hero (y 0 to 1300, the frame in owner-4), linear.app homepage "Intake and integrations" section (y 2600 to 3600, the section in owner-5 and owner-6), supabase.com hero (y 0 to 1100, owner-2). The Supabase dashboard (owner-1, owner-3) needs a login, so it is pixels and eye only. Screenshots saved as refs/life-linear-intake.png and refs/life-supabase-hero.png.
- SEEN: read by eye from the image. Counts of material kinds and of our text tiers are SEEN (our renders came from a local server that this study did not run).
- INFERRED: my reading of why it works.

Files studied. References: refs/owner-1.webp (Supabase database tables), owner-2 (Supabase landing), owner-3 (Supabase project overview), owner-4 (Linear landing hero), owner-5 and owner-6 (Linear intake section). Ours: renders-r3/dark/01-landing.png, renders-r2/dark/18-page-clustered.png, renders-r2/dark/12-shell-clustered.png, renders-r3/dark/09-building-done.png, and the once-praised evidence/d1-landing-dark.png.

## 1. Headline table

| Screen | Nesting levels | Dark tones >0.3% (MEASURED) | Dark chroma (MEASURED) | Functional hues | Material kinds (SEEN) | Text tiers | Real-content signals |
|---|---|---|---|---|---|---|---|
| owner-1 Supabase tables | 5 | 17 | 2.6 | 2 system (green, amber) + 2 external (Claude orange logo, photo) | 15 | about 13 SEEN, 2 families (sans, mono) | table names, column/row counts, sizes, branch, photo, 3 vendor logos |
| owner-2 Supabase landing | 3 | 13 | 2.8 | 1 hue in 7 tints (MEASURED) + photo | 10 | 19 MEASURED, 3 families | 111K stars, photo, CLI command, email chips, event date |
| owner-3 Supabase overview | 4 | 12 | 2.8 | 3 system (green ok, amber warn, red error) + flag + photo | 12 | about 10 SEEN, 2 families | real URL, region, CPU 2%, RAM 52%, 5/60 conns, request counts |
| owner-4 Linear hero | 5 | 25 | 2.9 | 5 MEASURED (yellow, indigo, green, red, orange) | 12 | 32 MEASURED, 2 families | DRV-8852, 1 / 84, "Opus 5", code identifier, avatars |
| owner-5/6 Linear intake | 5 to 6 | 21 / 22 | 3.1 | 7 MEASURED + 9 photos | 12 | 18 MEASURED, 1 family | 3 named people with photos, 7:06 PM, ENG-926, Todo 71, PR 61039 |
| ours feed (18) | 2 | 4 (two cover 93%) | 24.2 | 1 (blue) | 8 | about 9 SEEN, 1 family, 2 to 3 text colors | facts in prose, source names in grey parentheses |
| ours shell feed (12) | 2 | 3 | 25.7 | 1 | 9 | about 10 SEEN | same, plus letter avatar "F" |
| ours landing (01) | 3 | 3 (two cover 95%) | 22.2 | 1 system + 9 brand logos confined to the roadmap list | 12 | about 12 SEEN, 1 family | dated facts, real brand logos (roadmap only) |
| ours building (09) | 3 to 4 | 3 (two cover 93%) | 23.0 | 1 | 10 | about 11 SEEN | scores 0.97, "35 shortlisted from 153", real names and handles; glyphs grey |
| d1 landing (praised) | 3 | 11 | 22.9 | 1 system + photo + NASA logo | 11 | about 12 SEEN | photo, colored logo, a date on every card, @mentions, handles |

Short form, as asked: Linear intake shows 5 to 6 nested surface levels, 7 functional colors, about 12 material kinds and 21 dark tones; our feed shows 2 levels, 1 color, about 8 kinds and 4 dark tones, two of which cover 93% of the screen.

## 2. Per-screen inventory

### owner-1 Supabase database tables (pixels + SEEN)

1. Non-neutral colors and function:
   - Green: logo bolt (brand), "New table" primary button (deep green plate with green edge, the one creation action), "NEW" pill on Pipelines (newness), "PREVIEW" pill, green icons on dark-green tiles in the chat suggestions (suggested actions), green `select` keyword in the code preview, green notification dot on the lightbulb.
   - Amber: "PRODUCTION" badge on the branch (environment caution), Advisors lightbulb icon.
   - External: Claude asterisk in its own orange, the OpenAI and another vendor mark in white ("Use your own agent"), the owner's photo avatar.
   - MEASURED vivid pixels: green-teal 272 px, orange 214 px, yellow 45 px in a 1.8M px image (about 0.03%).
2. Materials (15): page, icon-plus-label primary sidebar, secondary text sidebar with mono uppercase section labels, top bar with breadcrumb selectors, badge (FREE, PRODUCTION), outline button (Connect), search field with kbd hint, round icon buttons, photo avatar, callout card with icon tile and close, select and search inputs, primary button, data table (mono header, divided rows, row icon, per-row button), right chat panel with textarea and vendor-logo row, floating preview card containing an inner card and a code block.
3. Text tiers: page title, nav label, active nav label (filled pill), mono uppercase section label, mono uppercase table header, table cell, banner title, banner body (muted), mono badge text, button label, chat heading, placeholder, tiny mono code. About 13, in two families.
4. Real content: real project name "Oparax", branch "main", the owner's actual tables (card_versions, config, contact_messages, cost_ledger...), real counts (6, 3, 7 columns; 0 and 5 rows), sizes (24 kB, 32 kB), owner photo, vendor logos.
5. Nesting: page > right panel > preview card > inner "User growth" card > code block = 5. Main column: page > table container > row > button = 4.

### owner-2 Supabase landing (DOM + pixels)

1. Colors, MEASURED: one hue family only. Tints #3ecf8e (brand), #4acd8b ("Scale to millions" headline line, "functions deploy" in the CLI pill), #94e6b7 ("Apply to attend" link), #00bd58 / #95e6b8 / #e1fcd7 (ASCII bracket texture in the announcement strip), #006338 (primary button plate), #002918 (badge fill). Plus the photo avatar and a white GitHub mark with "111K". Every green has a different job: brand, emphasis line, link, texture, button plate, badge.
2. Materials (10): announcement strip with ASCII texture, nav, star counter with logo, photo avatar, two button kinds, three bento cards of different widths, line-art elephant in a tile, a grid of email chips, a wireframe globe with dots, a terminal command pill, a check list.
3. Text tiers, MEASURED: 19 combinations in the hero. Families: Manrope (46/500 headline, 16/600 card titles), Inter (14/450 body in grey #989a99, 14/450 in bright #edefee for key phrases, 14/500 nav, 12/500 buttons, 12/450 code pill), Departure Mono (texture strip). Two-tone sentences are MEASURED: "Every project is **a full Postgres database**, the world's most trusted..." switches #989a99 to #edefee mid-sentence at the same size and weight.
4. Real content: GitHub 111K, real user avatar, email-address chips, a real CLI command, "October 2".
5. Nesting: page > bento card > illustration tile or chip > text = 3.
- Surfaces MEASURED: page oklch(0.19 0.0025 157.5) (#131413), header #0b0e0d, card #181a19, popover #1b1d1c, card gradient from 7.5% foreground at the top edge down to card. Borders 1px at 8% and 13% of #eeefee. Radii 8, 8.9, 10.7, 15, 16, full.

### owner-3 Supabase project overview (pixels + SEEN)

1. Colors: green (six status dots for "Healthy", the database icon tile, chart bars, PREVIEW), amber (PRODUCTION badge, WARNINGS legend dot, lightbulb), red (ERRORS legend dot), a US flag in real colors, photo avatar. MEASURED vivid: green-teal 1001 px, orange 251, red 163, yellow 65. Each hue is a state: healthy, warning, error.
2. Materials (12): stat tiles (icon tile + mono uppercase label + value), small mono badge (NANO), URL with copy menu, a dotted-grid canvas, a floating node card with flag and a metrics row, large inline numbers ("11 Total Requests 100.0% Success Rate"), metric cards with legend dots and bar charts, drag handle, floating preview card.
3. Text tiers: mono uppercase labels (STATUS, API GATEWAY, WARNINGS), primary values, muted values ("No repository connected"), large numerals, metric numerals, URL. About 10.
4. Real content: the project URL, migration "signup_first", "West US (North California) us-west-1 · t4g.nano", CPU 2%, Disk 3%, RAM 52%, 5/60 conns, request counts 5, 4, 2, 0.
5. Nesting: page > dotted canvas > node card > icon tile = 4.

### owner-4 Linear landing hero (DOM + pixels)

1. Colors, MEASURED: #f0bf00 yellow ("In Progress" status ring and the favorite star), #5e6ad2 indigo (brand mark, "Revert" PR icon), #27a644 green ("+ 22" lines added), #f34e52 red ("− 10" lines removed), #fc7840 orange (one icon). Five hues, each locked to one meaning. In the owner's crop only yellow and indigo show; MEASURED vivid pixels: yellow 240 px out of 1.9M.
2. Materials (12): nav, app frame, sidebar with icon nav items, issue header with ID and star, round outline icon-button cluster, inline code chip (`vehicle_state`), section heading, properties column ("Reviews / Revert"), floating agent window with a model badge ("Opus 5"), comment bubble, 14px avatars, logo tile.
3. Text tiers, MEASURED: 32 size/weight/color/tracking combinations, built from only 4 text colors (#f7f8f8, #d0d6e0, #8a8f98, #62666d) plus two mono greys, weights 400 / 500 / 510 / 590, sizes 10 to 64, and tracking that tightens with size (-1.408px at 64, -0.24px at 20, -0.182px at 14). Berkeley Mono for code and branch names.
4. Real content: DRV-8852, "1 / 84", "Opus 5", a code identifier, an avatar of a named teammate.
5. Nesting, MEASURED surfaces: page #08090a > frame #090a0b / #101112 > view (white 1%) > panel #161718 > comment card #0f1011 + white 3 to 4% overlay > code chip white 5% = 5. Borders MEASURED: 8 different edge values (white 5, 6, 8, 12% and #24282c, #2a2a2d, #2e2e32).

### owner-5 and owner-6 Linear intake (DOM + pixels)

1. Colors, MEASURED: #eb5757 red (Bug label dot), #4ea7fc blue (Design label dot), #27a644 green (AI and Performance dots, PR icons with numbers), #f2c94c yellow (In Progress status), #5e6ad2 indigo (split send button), #6d78d5 (the "@Linear" mention text on a 15% wash of itself), #dcffff (one pale dot). Plus 3 photo avatars at 36px and 6 image avatars at 14px. Seven hues, nine photos.
   - The hue lives in a 7x7 px dot (MEASURED span size), not in the word: the "Bug" and "Design" label text is grey #8a8f98. MEASURED vivid area in owner-6: about 1,700 px of 1.96M (0.09%).
2. Materials (12): Slack-style thread panel with header and channel tag, message rows (photo, name, time, body), composer with a mention chip, icon toolbar, split send button, kanban columns (status icon, name, count, add, more), issue cards (ID, title, avatar, priority-bars glyph, label pills with dots, PR chips with numbers), off-edge column that fades out, dividers.
3. Text tiers, MEASURED: 18 combinations; 4 colors; weights 300 / 400 / 510 / 590; sizes 10, 12, 13, 15, 16, 18, 24, 48. Message bodies are 15/300, names 15/590: weight carries "who" versus "what".
4. Real content: lena, didier, andreas with photos; 7:06 PM; ENG-926, ENG-2088, MKT-1028, ENG-2187; Todo 71, In Progress 3; PR 61039, 62048; "TypeError: Cannot read properties"; "#product"; "@Linear".
5. Nesting: page > board panel > column > issue card > label pill > dot = 6. Thread: page > thread panel > composer > mention chip = 4.
- Edges MEASURED: 51 of 54 bordered elements in the section use the same 1px white at 8%. Cards are #0f1011 with a 2% white overlay; 16 cards share it exactly. Radii MEASURED: 10 values (1.5, 4, 6, 8, 9, 12, 16, 22 px, 50%, full).

### Ours: feed, page clustered (18) and shell clustered (12)

1. Colors: one hue. MEASURED: page #090f1d (52.7%), card #141e31 (40.5%), edge about #283850, accent #6894fc. Vivid pixels: blue only, 10,191 px (0.8%), from the full-width "Get alerts on X" button and the toggle. In 12 the selected sidebar item adds a blue-tinted fill (#203464). Citations are grey text. No status, no category, no time color.
2. Materials (8 to 9): page, top bar (or sidebar), segmented toggle, story card, bullet list, divider, a 16px pair of grey glyph circles (X, document) with "Used 2 sources", side card with a primary and an outline button, an empty progress track, footer. The kinds exist, but every container uses the same fill, edge and radius (SEEN).
3. Text tiers SEEN: page title, subtitle, small note, card title, bullet text, grey citation, "Used 2 sources", side-card title, side-card body, button. About 9 to 10, one family, no mono, no uppercase labels, effectively two text colors (near-white and one grey).
4. Real content: real facts and dates inside sentences (4.25% to 4%, August 7, 2025; October 21, 2024), source names in parentheses. Missing: arrival time on the card, source logos or favicons in color, author or account photos, counts, IDs, topic or category marks. The line "Preview data from public sources, not from your agent." tells the viewer it is not real.
5. Nesting: page > card > glyph circle = 2 working levels. The right column floats beside a large empty gap (SEEN).

### Ours: landing (01, r3)

1. Colors: MEASURED two surfaces cover 95% (#090f1d 73.9%, #141e31 21.0%). Blue 11,804 px is the system hue. Red, yellow, orange, green, violet, pink pixels exist (1,289 / 1,035 / 587 / 604 / 602 / 318 px) and all come from brand logos in the Roadmap list (Reddit, YouTube, Instagram, Snapchat, WhatsApp and others, SEEN). The hero story card is monochrome.
2. Materials (12): nav, fanned card stack, numbered step circles, textarea mock, check list, source rows, mini story card, DM bubble, node graph with solid and dashed curves, logo rows, pricing table, buttons. Material variety is there; the skin is identical on all of them.
3. Text tiers about 12 SEEN, one family.
4. Real content: dated facts, 14 real brand logos, all in one uniform list of identical rows.
5. Nesting: page > card > inner input or bubble = 3.

### Ours: building done (09, r3)

1. Colors: one hue. Score bars, the threshold line ("Shortlisted at 0.35 and above"), button fills. Above and below the threshold differ only by blue versus grey bars (SEEN). MEASURED blue 16,298 px.
2. Materials (10): step rail with check circles, ranked rows, score bars, "Quoted in your posts" chips, dashed "show more" row, two-column choice lists, brief card with tag pills, CTA banner.
3. Text tiers about 11 SEEN.
4. Real content: the richest of ours. Ranks 1 to 38, scores 0.97 to 0.22, "35 shortlisted from 153", "115 more scored under 0.35", real names and handles (@rauchg, @simonw, Hugging Face). But the source marks are generic grey glyphs (RSS, X, globe) and the page says "Illustrative example, not a real run."
5. Nesting: page > step block > row card > chip = 3 to 4.

### d1 landing dark (once praised)

1. Colors: still one system hue (blue links, @mentions, labels such as "Following your interests", "From the mission update", "Read story"), but MEASURED orange 110 px and red 36 px come from a real photo and a real logo.
2. Materials (11): tweet card with NASA logo and X mark, article card with a rocket photo thumbnail, article card with site icon, topic chip ("Planetary missions"), quote block with a colored label, evidence column with per-source rows and type labels ("Post on X", "Article"), DM phone mock with avatar and message bubble, curved connectors between columns, step counter row ("3 reports about the same mission → 1 story").
3. Text tiers about 12 SEEN; the blue is used as a label color that says "this is the reason" or "this is the evidence".
4. Real content: NASA logo in color, a launch photo, "Oct 14, 2024" on every card, @EuropaClipper / @NASAKennedy / @SpaceX mentions, handles.
5. Nesting: page > story card > evidence column > source row = 3 to 4. MEASURED 11 dark tones (connector curves and a lighter band), against 3 to 4 in the r2/r3 renders.
- INFERRED: d1 is still navy and single-hue, which matches "too blue". It was praised despite that, and it is the only one of ours with photos, a colored real logo, a date on every card and a column of evidence. That points at real-content signals and nesting as the "life" half, and at tinted neutrals plus a single hue as the "too blue / two colors" half.

## 3. What the references have that ours lack (with evidence)

1. **A fine neutral ladder, not two fills.** References show 12 to 25 distinct dark tones over 0.3% of the screen; ours show 3 to 4, and two of them cover 93 to 95% (MEASURED). The steps are small (Linear page #08090a, frame #090a0b, card #0f1011, panel #161718; Supabase page #131413, card #181a19, popover #1b1d1c), and extra tones come from translucent white overlays (1 to 5%), top-edge sheens (Supabase card gradient, Linear 2 to 4% overlays), radial glows (4% white) and edge fades (the Linear board fades out to the right). INFERRED: this is "dark on dark": depth from many near-equal greys rather than two contrasting fills.
2. **Neutrals with almost no hue.** Dark chroma 2.6 to 3.1 in every reference against 22 to 26 in ours (MEASURED, about 8x). Supabase's neutrals are tinted green at chroma .0025; Linear's are close to pure grey. INFERRED: this is "too blue": the blue is in every pixel of ours, not mainly in the accent.
3. **Color as small, assigned meaning.** References carry 3 to 7 hues, each locked to one job: state (healthy green, warning amber, error red; in-progress yellow), category (Bug red, Design blue, AI green), change (+ green, − red), environment (PRODUCTION amber), brand (one hue), mention (indigo wash). The hue sits on a 7px dot, a 14 to 16px icon or a badge; the word next to it stays grey (MEASURED: "Bug" is #8a8f98, its dot #eb5757). Total vivid area is tiny: 0.03 to 0.6% (MEASURED). INFERRED: "yellow, blue, green and red in the relevant location, not random" is exactly this mapping.
4. **Real-world artifacts in their own colors.** Photo avatars (Linear intake: 9), vendor logos (Claude, OpenAI, GitHub, Slack), a country flag, a launch photo in d1. The GitHub mark is white on a near-grey page (SEEN); INFERRED: a neutral page lets each artifact keep its own color without competing with a tinted background, which is why it "is pretty clear against the page".
5. **Dense metadata on every object.** IDs (ENG-926, DRV-8852), times (7:06 PM), counts (Todo 71, 5/60 conns), sizes (24 kB), percentages (CPU 2%), numbers on chips (PR 61039). Ours put facts inside prose and give the card no meta row: no arrival time, no source marks, no count of reports, no topic.
6. **A second type voice and more tiers from fewer parts.** Supabase uses mono uppercase letter-spaced labels (STATUS, COMPUTE, table headers, badges); Linear uses a mono for code and branches and an inline code chip. Linear builds 18 to 32 text tiers from 4 colors, 4 weights (incl. 510 and 590, very close), 8 sizes and size-scaled negative tracking (MEASURED). Supabase uses two-tone sentences (MEASURED). Ours use one family and effectively two text colors.
7. **Deeper nesting.** 4 to 6 levels in references against 2 in our feed: board > column > card > pill > dot; panel > card > inner card > code block.
8. **Mixed object types in one view, overlapping.** Thread panel overlapping a board; agent window overlapping an issue; preview card floating over a chat panel; a canvas with a floating node card. Ours stack identical cards in one column with a detached side column.
9. **One edge rule that works at every depth.** Linear: 51 of 54 edges are the same 1px white 8%; Supabase: 8% and 13% of the foreground (MEASURED). Because the edge is a translucent white, it reads the same on page, card and inner card. Ours use one opaque tinted edge (#283850 area).
10. **Texture made of data.** Status-dot grids, bar charts, a dotted canvas, ASCII brackets, line-art illustrations, an email-chip grid, priority-bar glyphs. Ours have one empty progress track and score bars only on the building page.

## 4. What ours have that the references avoid

1. **Hue in every neutral.** Page, card, edge and selected fills all sit in the same blue at visible chroma (MEASURED 22 to 26 versus 3).
2. **One hue for every job.** Button fill, selected nav fill, toggle, score bars, threshold line, links and labels are all the same blue, so color tells the viewer nothing about state or kind.
3. **Large saturated fills.** The full-width "Get alerts on X" button and the blue CTA banner. Our feed's vivid area (0.8%, MEASURED) is larger than any reference screen's (0.03 to 0.6%). References keep big buttons either deep and dark (Supabase #006338 plate) or inverted neutral (Linear "Sign up" #e5e5e6); Linear's brand indigo fills one 65x28 send button.
4. **The same container repeated.** Story cards, side cards, step cards, pricing table: same fill, same edge, same radius (SEEN). References keep one edge rule but vary the containers (table, tile, bubble, pill, chip, canvas, window) and use about 10 radius values (MEASURED on Linear).
5. **Prose-only cards.** Bullets plus grey parenthetical citations; no meta row, no marks, no numbers outside sentences.
6. **Long uniform lists.** 14 identical logo rows on the landing roadmap; color appears only as a list, not as status.
7. **Disclaimers that undercut realism.** "Preview data from public sources, not from your agent." and "Illustrative example, not a real run." The references show real-looking names, IDs and times without hedging (INFERRED that this matters to the feel; the product may still need the honesty, which is a copy question, not a color one).
8. **Generic grey glyphs where real marks exist.** X, RSS and globe glyphs in grey for sources that have real logos and avatars (Vercel, Hugging Face, @rauchg). d1 used the real NASA logo and a photo and was the praised one.

## 5. The mechanisms, named

- **Neutral depth**: many near-equal greys plus translucent overlays, sheens and fades; almost no hue in neutrals.
- **Semantic color slots**: each hue answers one question (what state, what kind, what changed, which brand), drawn small on a dot, icon or badge; the text beside it stays neutral.
- **Real artifacts**: photos, real logos, flags in their native color, which the neutral ground lets stand out.
- **Metadata density**: every object carries an ID, time, count or number in a quieter voice.
- **Shared skin, varied bodies** ("different yet similar"): one edge rule, one text-color ladder, one tracking curve, one family plus a mono, used on many container kinds at several depths.
- **Overlap and mixed composition**: two or three object types per view, layered.

## 6. Where these would land on the feed (mechanism only, no palette)

- Story card meta row: arrival time, count of reports joined, topic or beat mark, in the quiet tier or mono.
- Sources as real marks: favicons and X avatars in native color in place of grey glyphs, inside small chips with the source name.
- Semantic slots that the feed actually has: new since last visit, updated story, number of sources, X account versus article versus feed, delivered to X or not. Each a dot or icon, words stay neutral.
- Depth: the evidence (quotes per source) as a nested panel inside the card, the way d1's evidence column and Linear's card > pill > dot nest.
- One translucent edge rule across all levels; neutrals without hue; the accent reduced to small marks and one action.
