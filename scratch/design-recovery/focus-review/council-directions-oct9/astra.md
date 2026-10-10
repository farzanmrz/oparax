I propose two directions per area. These are candidates for council agreement, not a claim of consensus.

All retain Open Sans, existing light/dark tokens, 10px card radii, `--stage-light`, `--card-shadow` and `--top-light`. X marks use `--t1`; RSS and website icons retain `--kind-article`. Real logos keep their colors. Login stays untouched; no search, preview bar or New chip.

**Sidebar A: Inline tree.** Combine `app-sidebar-1`’s grouped navigation and footer with `app-sidebar-5`’s nesting. A 256px `--rail` sidebar holds the Oparax word mark and theme toggle in a 52px header. Feed contains four indented, expandable source groups; names appear another 16px inward, with repository icons for GitHub rows. Group headings are 14px, rows 13px/32px. Settings and Notifications follow outside Feed. Spacing, indentation and `--t1` versus `--t2` distinguish pages from sources without group hairlines. Sign out and Hide sidebar sit above the bottom username. Free week leaves this rail. Its defining feature is one continuous, readable hierarchy.

**Sidebar B: Branch and pane.** Adapt `app-sidebar-4`’s secondary panel while retaining visible labels. Under one shared word-mark/theme header, a 176px navigation column holds Feed, its four nested source kinds, then Settings and Notifications. Selecting a kind shows its names in an adjacent 176px pane, aligned with that branch. Use `--rail` for navigation and `--well` for the source pane; 14px group headings and 32px rows match A. The account footer spans both columns, with Sign out, Hide and username retained; free week leaves. Unlike A, source names occupy a neighboring pane and never push page navigation downward.

**Settings A: Header cards.** Borrow `settings-form-3`’s inset rows and Deck’s independent lifted cards. Arrange four separate, content-height cards in two columns with 20px gutters. Each has a 48px `--raised` header containing its 16px group title, icon and Add source action; rows sit on `--card` with 16px padding. Each 40px row holds logo, name and handle/address on one line, followed by remove. No counts. The account/plan object follows the four cards. The distinction is a compact field of independent cards, each with a clear top header.

**Settings B: Side-header cards.** Adapt `settings-form-1`’s label/control arrangement at the group level. Stack four separate full-width cards, 20px apart. Each card has a 160px `--well` left compartment containing its 16px group heading and Add source, while the right compartment contains 40px source rows on `--card`. Names and addresses remain inline, remove stays at the row’s end, and counts disappear. Keep the account/plan object in the existing right column. Unlike A, headings sit beside their collections, leaving a consistent vertical reading axis for sources.

**Feed A: Publisher cards.** Recompose `stable-feed.png` using `accepted-deck-dark.png`’s packed columns and depth. Each approximately 340px card begins with a 40px source strip: 20px logo, source name and timestamp. A roughly 150px picture follows, then a 20px headline and every fact at 13.5px, with 16px padding. Imageless stories proceed directly from source to headline. Cards size to content and pack into three columns when space permits. Clustered/Direct stays at the title’s right. This is the narrow, vertically read arrangement.

**Feed B: Wide story cards.** Combine Deck’s packing with `accepted-window-dark.png`’s separation of story identity and evidence. Use two approximately 500px columns. Each card retains source strip first and a roughly 170px image second; beneath that, a 170px headline column sits beside the facts column, separated by 20px of space. Both remain on one lifted `--card` surface. All facts are immediately readable; imageless cards omit the image region. Narrow screens stack headline above facts. The difference is lateral reading within wider cards, without selecting a story.

**Onboarding A: Result bands.** Borrow `wizard-6`’s active-task treatment and Deck’s tiles. Align the sidebar’s first step with the centre card’s top. Step 3 uses separate source-kind areas with 15px headings and name-only chips. Step 4 places the current task above Strong match tiles, Possible match rows, and a compact Set aside band with readable names. Use `--ok` for strong matches, `--caution` only for checking, and neutral text for other judgments. Ready becomes separate group cards with 48px headers. The compact right column begins with the person and bio, then brief and posts, without “About.”

**Onboarding B: Source ledger.** Borrow `list-1`’s rows and `onboarding-6`’s summary hierarchy. Keep the same aligned sidebar and compact person-first right column. Step 3 presents separate kind sections with name-only chips. In step 4, each section becomes readable rows containing logo/name, the existing reason, and a right-aligned Strong match, Possible match or Set aside pill. Rows grow beyond their 44px minimum for reasons; no expansion is needed. Ready uses separate cards with 140px side headers and selected-source rows. Unlike A’s judgment bands, this keeps sources grouped by kind throughout.

Reject an icon-only primary rail: “the top of it gets replaced with the oparax word mark.”

Reject three identical onboarding chip panels: “It’s all just one consistent thing.”

## Directions

Sidebar: A Inline tree, B Branch and pane  
Settings: A Header cards, B Side-header cards  
Feed card: A Publisher cards, B Wide story cards  
Onboarding: A Result bands, B Source ledger