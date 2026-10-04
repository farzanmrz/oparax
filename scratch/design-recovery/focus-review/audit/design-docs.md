# Audit: DESIGN.md and docs/references/ and docs/roadmap.md design sections

Read-only audit, October 2, 2026 (repo date October 1). Area: `DESIGN.md`, every file in `docs/references/` (decisions, state, engineering, design-toolkit-proof, repo, claude-design-handoff, cogs, downstream-lab, model-comparison, state-history) and the design, landing, feed, color, font and component parts of `docs/roadmap.md`.

Truth used (abbreviations):
- LP = `focus-review/LOCKED-PLAN.md` (sections from "Owner rejection and new direction (October 1, evening)" onward, and "Owner verdict, October 2")
- OI = `focus-review/OPEN-ITEMS.md`
- OV = `focus-review/council-skill/owner-verdict.md` (verbatim)
- RLD = `~/.agents/skills/reference-led-design/SKILL.md`

## Headline

1. No file in this area contains a single October 1 or October 2 decision. `rg -i october` over DESIGN.md, docs/references/*.md (except an unrelated cogs line) and roadmap.md finds nothing about design. Every design statement stops at September 30. The newest owner direction (functional color, black/grey/blue depth, objects not paragraphs, feed as design carrier, real logos and images, equal sources, reference board, three accepted directions) exists only under `scratch/`.
2. `AGENTS.md` tells every agent to read `state.md` at host start, `DESIGN.md` for visual work, and to "quote existing `docs/references/decisions.md` rulings rather than re-arguing". All three still say navy only, "no green/red", "restrained", four directions, "do not restart theme selection". An agent obeying the repo faithfully rebuilds what the owner rejected on October 1 and 2.
3. The reference-led-design skill and the reference board are mentioned nowhere in this area (decisions.md L125 lists the installed design skills without it).

---

## A. OUTDATED (superseded by a later owner decision)

**A1. DESIGN.md L23** (Shared foundation, Palette row)
- Quote: "Restrained navy/blue around direction 1, with latitude toward direction 2 and harmonious blue gradients (owner, September 30)."
- Current truth: LP L56 "Palette fixed input REPLACED (owner): a black, gray and blue range with his blue accent, built like Supabase or Vercel"; LP L55 "too blue and too just monotone... at max 2 colours"; LP L65 and OV L16 "one dark color theme, but... so much life in the colors".
- Risk: builder paints everything navy with one accent, which is the exact "same as before" the owner rejected on October 2 ("I despise all four").

**A2. DESIGN.md L28-43** (Palette reference table and paragraph)
- Quote: "Explore within this navy/blue family, not green, red or unrelated page themes." Table values `#090f1d`, `#141e31`, `#6b94ff`, etc.
- Current truth: LP L59 "Color for functional stuff is fine"; LP L70 "yes to green, amber and red for healthy, warning and failure, and more generally to the color life in these renders"; RLD L31 "a visible brand accent on actions and selection; a hue per kind of thing; status hues".
- Risk: the table is "implemented as tokens" by the next build and bans the colors the owner now wants. The table also encodes the navy-only base the owner replaced.

**A3. DESIGN.md L80** (open decisions list)
- Quote: "The following remain open: integrations-block layout, the source/engine/story demonstration, incoming-card size and motion, background selection, feed-card composition, story-page layout, and exact page copy."
- Current truth: LP L11 (Oct 1 card: plain title, bullets with parenthesized citations, "Used N sources", nothing else); LP L69 images when they exist; three accepted feed directions (LP L64).
- Risk: agents treat the feed card as undecided and redesign it, or treat the Sept 29 "do not convert feedback into rules" note as blocking recording of the new card contract.

**A4. state.md L13** ("Current design task")
- Quote: "restrained navy/blue around D1 or toward D2, with harmonious blue gradients. No green/red theme exploration."
- Current truth: LP L56-L60 and L70 (palette replaced, functional color allowed and wanted, owner approved "Color for functional stuff is fine").
- Risk: this is the file read first at every host start and after compaction; it is the single highest-leverage stale file.

**A5. state.md L17 and L53-L55** (agreed sequence and "Next")
- Quote: "four complete Pro directions, then owner design acceptance" and "Render four complete Pro Exploration directions, each landing and Direct/Clustered feed."
- Current truth: LP L64 and OV L6: three council directions (Window, Newsroom, Deck) were built, all three landed; owner has not picked; next is the global skill, then revising the three renders (OI L16-L18 "Next").
- Risk: a new host restarts a four-direction exploration from the old handoff.

**A6. state.md L15** (review URL)
- Quote: "Review at `http://localhost:3000/?d=1&view=feed&type=open`. The typography selector offers..."
- Current truth: font is chosen (Open Sans); the review surface is now the accepted renders and the board gallery (LP L61).
- Risk: points agents at a font-comparison preview as the "current design".

**A7. state.md L3** ("Updated September 30, 2026")
- Current truth: design moved on October 1 and 2 (LP). The stamp tells agents the file is current.
- Risk: false freshness.

**A8. claude-design-handoff.md L11** ("Four directions means four complete landing/feed pairs") and **L49** (set `?set=pro&d=1`, "floating 1-4 direction navigation")
- Current truth: three directions accepted (LP L64); council-built renders, not this handoff's output.
- Risk: obsolete deliverable shape.

**A9. claude-design-handoff.md L16** ("No green/red/plum page themes")
- Current truth: LP L70; LP L58 (reopened input, now answered yes); RLD L31.
- Risk: see A2.

**A10. claude-design-handoff.md L23** ("a navy-tinted neutral base, blue accent... Map these choices to shadcn's semantic tokens once")
- Current truth: LP L56 black, grey, blue darkish range with depth from soft light and shadow, mapped per component role including React Bits animation, dark and light.
- Risk: sets a single navy knob set for all components; RLD says "gives every hue one job" and directions differ "in where color lives".

**A11. claude-design-handoff.md L27 and design-toolkit-proof.md L97** (landing: "Sources -> Oparax -> Delivery demonstration visible early")
- Quote: "the Sources -> Oparax -> Delivery demonstration visible early... The engine matches the person's interests and groups reports; the clustered story belongs inside that middle stage."
- Current truth: LP L50 "Owner rejected the hero flow ('the Publish section') and How It Works as rendered"; LP L48 hero copy says news arrives instantly; LP L22 hero inputs X post, article, GitHub; LP L61 "the hero showing everything stretched out 'might be a bit overrated'".
- Risk: rebuilds the rejected hero diagram.

**A12. claude-design-handoff.md L45** (council lanes)
- Quote: "Use the requested page-design lanes Opus, Grok and Kimi... --only opus,grok,kimi".
- Current truth: OI L12 "Council lanes for design work from now on: Astra, Grok, Kimi, plus agy (Gemini), Muse Spark and GLM"; LP L41 "Astra, Grok and Kimi".
- Risk: wrong lanes, and a stale command line.

**A13. design-toolkit-proof.md L7 and L9** (current section)
- Quote: "retain the D1 navy/blue light and dark palette and existing layout", "then four Pro directions".
- Current truth: as A4, A5.
- Risk: the "current brief" that "supersedes" everything below it is itself superseded.

**A14. decisions.md L211** (PENDING / AUTHORIZED)
- Quote: "retaining D1's liked navy/blue palette and layout... render four complete Pro directions".
- Current truth: as A5. No entry records the outcome.
- Risk: line still reads PENDING.

**A15. decisions.md L218** (LOCKED, Open Sans and restrained blue foundation)
- Quote: "with navy/blue around direction 1 or toward direction 2 and harmonious gradient variations. No green/red page themes."
- Current truth: Open Sans part stays (OK). Navy-only and "No green/red" parts replaced: LP L56, L59, L70.
- Risk: AGENTS.md says to quote decisions.md rather than re-argue. This LOCKED line is the strongest-worded contradiction of the October decisions in the repo, and nothing marks it superseded.

**A16. decisions.md L19** (Nunito Sans headings, Source Sans 3 text, JetBrains Mono, "no bold by default")
- Current truth: Open Sans throughout (decisions L218, DESIGN L24).
- Risk: low (line is tagged SUPERSEDED and APPLIED) but the full list of old fonts is still presented as "locked September 24".

**A17. decisions.md L20** (design system rebuilt on Mira)
- Quote: "Primary is the old Oparax blue... (about #0077c2)... with no added depth or focus rules (owner, September 24: a custom shadow and focus outline were tried and removed)... Contact... is UI only"
- Current truth: DESIGN.md L40 accent `#245dec`/`#6b94ff` (so L20 accent is already stale); RLD L32 "Depth from light: one surface lifted off a quieter ground, a soft radial light behind it, a layered neutral shadow, top-lit edges"; state.md L7 Contact saves and attempts delivery; DESIGN.md L60 footer right-aligned (L20 says "centered").
- Risk: "no added depth" read as a ban on shadows and light; footer and Contact claims wrong.

**A18. decisions.md L123** ("Design moves to Claude Design; the flow's design-generation step is retired. LOCKED September 23... `/feature` writes a design brief; the owner designs on the web; the export is the plan's visual contract.")
- Current truth: DESIGN.md L11 "The repo is the source of truth"; LP L61 board of real screenshots; RLD L39 "Text-only briefs scoped to 'structure only'" are listed under what failed.
- Risk: this is the clearest text-brief-first mechanism in the repo.

**A19. roadmap.md L93 and L151** ("the owner designs the pages in Claude Design and the export is the plan's visual contract")
- Same as A18. Also duplicates it.
- Risk: same.

**A20. roadmap.md L11** ("Current tooling work selects no font or theme; font choice remains pending.")
- Current truth: Open Sans chosen September 30 (decisions L218, DESIGN L9).
- Risk: agent reopens font selection; contradicts state.md L55 "Do not reopen font".

**A21. roadmap.md L57** (the card: "a synthesized headline, one to five fact lines each with its source, the contributing publishers, one compact relative time, an image only when a source had one")
- Current truth: LP L11 "plain story title; bullet facts; each bullet ends with a parenthesized citation... 'Used N sources' area... nothing else"; LP L69 image shown when it exists, balanced.
- Risk: card gets a publisher list and time row the owner's Oct 1 card removes. The "image only when a source had one" part is fine.

**A22. decisions.md L15 and roadmap.md L17, L21, L65-L67, L142, L149** (GitHub and Product Hunt as a separate daily digest "added by hand later", "separate from the ten sites")
- Quote: "A daily digest, separate from the ten sites" (roadmap L67); "optional switches... GitHub and Product Hunt as daily digests" (decisions L15).
- Current truth: LP L67 "Sources are all equal inputs... GitHub is not a separate digest. Several repositories that inform a beat are synthesized into story cards"; OV L30-L32 "GitHub by itself is not a separate thing from the sources. It is also a source."
- Risk: designs a digest screen or a separate GitHub area. Note: LP L67 says this is a product change against today's code (issue 136), to flag at implementation, so the code description in repo.md L38, L95 is still accurate (see FINE F11).

**A23. decisions.md L187** ("DESIGN.md now records the current preview palette")
- Historical entry. Palette part now wrong (see A2). Low risk.

**A24. decisions.md L165** ("an approved change triggers the design-sync hook")
- Already superseded by L198 (hook removed) but L165 itself is unmarked.
- Risk: low.

---

## B. CONFLICT (contradicts current truth or another guidance file)

**B1. DESIGN.md L25 and L67** (Shape and depth: "restrained shadows where useful"; "Do not add a shadow to every nested element by default")
- Current truth: RLD L32 depth from light and layered shadow; LP L56 "depth from soft light and shadow"; LP L61 checklist "soft shadows and gradients, the live product card lit against the background".
- Risk: builder underuses light and shadow; dark on dark stops separating (the owner's Supabase point, LP L57).

**B2. DESIGN.md L66** ("Semantic colors are states. Green, amber, and red communicate meaningful states. The blue accent supports actions and selected emphasis.")
- Current truth: RLD L31 "a visible brand accent... a hue per kind of thing; status hues where they mean something"; LP L61 "a promised tint and hue per source kind", "several functional hues"; OV L40 "it's not just those colors... way more color and activity on the screen".
- Risk: read narrowly, color is allowed only as status; source-kind hues and decorative-but-functional color are blocked. Half of the sentence (green/amber/red = status) is correct and should stay.

**B3. DESIGN.md L68** ("omit decorative labels and repeated explanations that add no information"; Short navigation labels Title Case) with decisions.md L21 ("section headings bold, Title Case")
- Current truth: OV L28 and OI L9 owner wants small capitalized group headers ("X accounts" style) and more prominent section headers with icons; RLD L43 notes "generic warnings (against uppercase labels...) yield".
- Risk: low to medium; an agent strips group headers or forces Title Case on them.

**B4. engineering.md L13** ("Each marketing/demo surface has one typed module for all fixed copy, examples and counts. Illustrative counts are fixed text, not runtime product calculations.")
- Current truth: RLD L34 and L51 "Never invent stories, counts, deltas, activity or quotes", "counts only from stored values"; LP L13 "no invented data, counts or durations"; LP L44 "recorded data shaped exactly like real runs".
- Risk: the engineering file explicitly licenses invented counts on marketing surfaces, which the owner forbids.

**B5. claude-design-handoff.md L31 and design-toolkit-proof.md L101** (roadmap: "inputs include Instagram, Reddit, LinkedIn, Meta networks, Snapchat... Outputs include X, WhatsApp, Slack, SMS and email"; "separates future incoming platforms from future delivery destinations")
- Current truth: LP L50 "Instagram, Threads, LinkedIn and Snapchat are also planned DM destinations; planned items need no per-item 'Planned' label"; LP L20 roadmap "one composition... not a grid".
- Risk: wrong destination list, a grid layout, and "Planned" labels.

**B6. "sites and feeds" wording** in roadmap.md (6 hits, e.g. L15) and decisions.md (3 hits, L101, L142) and handoff.
- Quote: "sites and feeds unlimited on every tier" (decisions L101).
- Current truth: OV L28 and LP L68 "Name websites and RSS feeds separately... do not merge them as 'Sites and feeds'"; OI L6 kinds: tweets, articles, repositories.
- Risk: the phrase leaks into UI copy. Correct as internal shorthand, wrong as user-facing text. Not marked as such.

**B7. claude-design-handoff.md L11** ("Do not restart theme selection or a broad toolkit debate")
- Current truth: LP L56 "Palette fixed input REPLACED"; LP L57-L61 theme research ordered and executed after the owner rejected the quick palettes.
- Risk: blocks the very palette work the owner ordered.

**B8. design-toolkit-proof.md L25** ("# Active task: prove the component workflow before purchase... Read this after compaction and before continuing the four-page preview work") placed under the "Historical briefs" banner at L21-L23; and **L29** ("Latest owner correction") versus L7 (retain D1).
- Risk: three heading-level "current" markers in one file that disagree. A reader entering mid-file after compaction takes the wrong one.

**B9. decisions.md L60 vs LP L11** (Card shape LOCKED August 28 "headline plus one to five fact lines, each with its source")
- Compatible in spirit, but the later card adds citations that open a quote, "Used N sources" and "nothing else". No cross-reference, so two LOCKED card definitions exist.

**B10. roadmap.md L31 table** ("Arrives: Landing page: the promise, a real finished monitor as proof, the box for a handle and a sentence")
- Current truth: roadmap L9 itself says entry is sign-up first; LP L48 landing message is real-time watching of the whole internet with hero copy "instant"; sign-up/log-in are stock components (LP L46).
- Risk: low; historical journey table presented as the plan.

---

## C. DUPLICATE (same rule in several places, different wording)

**C1. Palette** stated in DESIGN.md L23 and L43, state.md L13 and L53, claude-design-handoff.md L16 and L23, design-toolkit-proof.md L7, decisions.md L211 and L218, and `.claude/skills/feature/references/design-tooling.md` L3 (outside the area). Wording drifts: "restrained navy/blue around direction 1", "latitude toward direction 2", "navy-tinted neutral base", "harmonious blue gradients", "variations in that gradient". When it changes (it must), nine places need the edit. One canonical place plus links is needed.

**C2. The word "restrained"** appears in DESIGN.md (5 times), design-toolkit-proof.md (3), state.md (1), decisions.md (1), claude-design-handoff.md (1). It is the assistant's word; the owner's verbatim words at DESIGN.md L43 do not contain it. It reads as a color budget and pushes agents toward minimal color. RLD L39 lists "color only as tiny dots, 0.5 percent budget" among failures.

**C3. Open Sans** is stated in DESIGN.md L9 and L24, state.md L13, repo.md L114, roadmap.md L11 (contradicting), handoff L15 and L17, proof L7, decisions L218. Each repeats the "Hanken until migration" caveat in different words. Fine content, high repetition, one stale copy (A20).

**C4. Official logos retain their appearance, everything else may be restyled**: DESIGN.md L43, handoff L16, L19 and L23, state.md L13 and L53, proof L7, decisions L218 and L221. Seven restatements.

**C5. Direct/Clustered beside the feed heading**: state.md L17, handoff L29, proof L37, L49, L141. Heading text differs: "Your Reading Room" (proof L37) versus "Your Feed" (handoff L29). The Oct 2 renders put Direct/Clustered in the sidebar for Window (LP L19 offered both arrangements; owner chooses once). Not yet decided, so the "beside the heading" rule is a prior fixed input still unresolved.

**C6. Council rosters** appear in repo.md L117, decisions.md L193-L204 (five consecutive superseding entries), state.md L41, and handoff L45, with different member lists and counts (eight, nine, ten lanes; Fable/Sonnet only in repo.md). None mentions OI L12 design lanes.

**C7. Page frame** (header, footer, logo link): DESIGN.md L58-L60, decisions.md L20 and L23, handoff L18-L19. Footer is "centered" in decisions L20 and "aligned to the right" in DESIGN L60.

**C8. Feed definitions** (Direct = one source synthesized, Clustered = story from multiple sources): proof L99, handoff L29, roadmap L55-L59, decisions L55-L56, with different details (see also OI L6 naming rule: "report", "tweet", "article", "repository", never "2 Articles" with "2 reports").

**C9. GitHub and Product Hunt digest**: roadmap L17, L21, L65-L67, L142, L149; decisions L15, L151, L152. All say separate digest.

---

## D. LOST (current decisions missing where an agent needs them)

**D1. The October 1 evening rejection and its diagnosis** (LP L54-L55): "neither the sections their components nor the design hits. Nothing lands"; broken decision = "structure was judged without the look". Missing from decisions.md, state.md, DESIGN.md. Needed in: decisions.md (new October section), state.md.

**D2. Palette replacement** (black, grey, blue darkish; Supabase/Vercel harmony; depth from soft light and shadow; visible blue accent; several functional hues each with one job). Missing from DESIGN.md, state.md, decisions.md, handoff. Needed in DESIGN.md palette and depth sections.

**D3. Functional color allowed and wanted; green/amber/red for healthy/warning/failure** (LP L59, L70). Missing everywhere; opposite is recorded in A2, A9, A15.

**D4. "The FEED is the screen themes are generated on" / feed is the design carrier** (LP L57). Missing; handoff makes landing and feed co-equal and starts with the landing hero.

**D5. Objects, not paragraphs** (RLD L22, L30: "his pages show many small machines working; ours show paragraphs in boxes"; OV L8, L16; LP L61 "complexity shown neatly with shell and charts"). Missing from DESIGN.md; its component section talks about accessible primitives, never about information-as-objects.

**D6. The reference board method and the global skill** (RLD; LP L61 `focus-review/board/`, gallery; OV L8, L14 "create this skill globally for all my models"). Missing from AGENTS-adjacent docs, decisions.md L125 skill list, handoff "Read first" (L7), state.md Toolkit section. An agent following the repo will not load `reference-led-design` or look at a board.

**D7. The owner's verbatim verdict** (OV) and the rule that "the owner's later verbatim words always outrank this file" (RLD L8). No pointer from DESIGN.md, state.md or decisions.md. decisions.md paraphrases most September 30 design rulings (L210, L211, L218) with at most one short quote.

**D8. Accepted renders and what is pending**: three directions (Window, Newsroom, Deck) landed in dark and light; owner not yet picked; small issues; pending questions (report vs story, counts and chart, right-side tiles) (LP L63-L71, OI). Missing from state.md.

**D9. Equal sources, naming and kinds** (OI L6 item 1; LP L67-L68; OV L28-L32): X accounts, RSS feeds, websites, GitHub, Product Hunt are all sources; "report" = one input from one unique source; kinds named tweets, articles, repositories; websites and RSS feeds named separately. Missing from roadmap §6, decisions L15, handoff L29.

**D10. Images**: story shows its image when one exists, balanced between cards with and without (LP L69, OV L20). DESIGN.md is silent; handoff L29 only says "photo and no-photo cases".

**D11. October 1 card contract** (LP L11): plain title, bullet facts, parenthesized citation opening a quote in "Used N sources", subtle Direct vs Clustered, works without an image. Missing from DESIGN.md and roadmap §4 (roadmap L57 has the old card; see A21).

**D12. Landing message and copy rules** (LP L48): the page must communicate continuous watching of the whole internet ("sites, RSS, X") and that Oparax decides what to watch; headline says news arrives instantly; check frequency appears once lower. Missing from roadmap §10 and handoff L27.

**D13. How It Works and roadmap corrections and the order rule** (LP L21, L50-L51): five steps, Sign Up not a step, screenshots of actual onboarding and feed; "we must first fix the onboarding and the feed UI. Only then will we fix this." Missing from handoff L31 and proof L101.

**D14. Sign-up and log-in use stock React Bits or shadcn auth components, no design work, no council** (LP L46). Missing from handoff.

**D15. Onboarding is part of the design** with distinct components where judgment and selection happen (LP L39). Handoff L43 treats onboarding only as a log display candidate (agent-activity-1/2/5).

**D16. Council process rules for design** (LP L41-L42; OI L12): lanes Astra, Grok, Kimi plus agy, Muse Spark, GLM; max 3 exchange rounds per stage; screenshots passed to lanes; host tests interactions; owner reviews after convergence. Missing.

**D17. No paid runs from the preview; recorded data shaped like real runs; reloading never calls a model** (LP L44). Missing from engineering.md, which governs preview work.

**D18. DESIGN.md update trigger** (decisions L165 and DESIGN L13: change only on explicit owner approval in his current session). The owner's October palette replacement, taste verdict and accepted renders are real owner direction, but DESIGN.md still carries the old contract. Needs an explicit owner yes to rewrite it; nothing in the docs records that this is pending.

**D19. Real logos and real images allowed** (task summary of current truth; LP L9, L69). DESIGN.md L26 and engineering.md L15 cover logos well, but not content images or favicons beyond "real integration marks".

---

## E. FINE (keep)

- **F1. DESIGN.md L9** implementation status: Open Sans target, Hanken still in runtime, migration not claimed done. Honest and matches repo.md L114.
- **F2. DESIGN.md L11, L13** repo is source of truth; baseline changes need the owner's explicit instruction.
- **F3. DESIGN.md L21, L51-L54** stock Mira components never hand-edited; touch targets. Matches LP L46 (stock auth components).
- **F4. DESIGN.md L24** Open Sans for headings, body and ordinary UI.
- **F5. DESIGN.md L26, L71** real marks with provenance, Oparax logo and wordmark, no invented logo. Matches LP L9. (Content images are the gap, D19.)
- **F6. DESIGN.md L58-L62, L72** page frame: header/footer content, logo links home, footer only Privacy, Terms, Contact, 90% width to 1800px, Title Case short nav, edge-to-edge dividers. Matches LP L10 exactly.
- **F7. DESIGN.md L43 (second half)** "Official platform logos retain their authentic appearance. All other components, including the X chat preview, may be restyled." Matches LP L9.
- **F8. DESIGN.md L69** AA contrast, focus, empty/loading/error states (also OI L11 "treat as an accessibility fix").
- **F9. DESIGN.md L70** motion explains work, respects reduced motion (RLD "honest motion"). Gap: no mention that React Bits animation is wanted.
- **F10. DESIGN.md L82, handoff L51** "A successful build is not proof of good design"; acceptance differs from baseline. Matches RLD "Show, then record".
- **F11. repo.md L38, L95, L117** describes `digests/` and GitHub/Product Hunt tokens: accurate for today's code (LP L67 says the change is pending). Needs only a note that the design direction is changing.
- **F12. repo.md L46, L110-L111, L114** `design-system/` historical, Biome, shadcn Mira, runtime font status.
- **F13. engineering.md L12, L14, L15, L24-L25** token use, real primitives for depicted controls, committed brand marks, off-screen screenshots, background browsers, never front a tab. Compatible with RLD "headless only".
- **F14. state.md L19, L23-L25, L47** the owner wants agents to discover and compose real components and show complete renders; honest toolkit access evidence; Pro default, AI Elements conditional.
- **F15. handoff L7** read original feedback, inspect screenshots, "report missing evidence, and never invent annotations".
- **F16. handoff L29** Direct/Clustered meanings; "Do not impose an AI chat layout on a reading feed".
- **F17. handoff L33** finite motion, reduced motion, no pause button, controls that work.
- **F18. handoff L37-L43** component honesty: "Catalog access is not proof a component was used"; never pass a demo timer off as real completion.
- **F19. handoff L45 (first sentence)** "The owner wants council help with the actual designs, not generic approval of prose." Matches RLD "A council asked to audit truth but never asked whether it lands" failure.
- **F20. design-toolkit-proof.md L31-L39** (verbatim owner rejection, "explore visual identities, not a shared old theme... Where is the imagination?"). Verbatim quote is the right style, and its intent (different compositions and color placement) matches RLD step 5. Ignore only the "Latest" label (B8).
- **F21. design-toolkit-proof.md L59, L133** "no fabricated extra news to fill component slots". Matches RLD truth rules.
- **F22. decisions.md L125, L128, L185, L189, L191, L198, L205, L221** additive tooling, QC screenshots, annotation interpretation, official logos only. L205 (visual feedback: comments are intent, reconcile batch, preserve screenshots) is compatible with RLD step 1.
- **F23. state-history-2026-09-30.md** header labels it non-operative. Keep as archive; do not edit.
- **F24. cogs.md, downstream-lab, model-comparison** carry no design guidance. No action.
- **F25. roadmap.md L9, L71** entry-flow note and bot facts. Unrelated to design drift.

---

## F. Patterns that push agents the wrong way

**F-text. Text-only briefs.** decisions.md L123 and roadmap.md L93, L151 ("`/feature` writes a design brief... the export is the plan's visual contract"). claude-design-handoff.md is a 53-line prose brief with no reference images, no board, no verdict file; its "Read first" list (L7) is all documents. DESIGN.md is a token and rules document with no screenshot or reference pointer. RLD L39 lists text-only briefs as the first failure.

**F-structure. Structure before look.** state.md L17 and proof L7-L9 sequence font, then palette, then composition. handoff L21-L23 "Set the foundation once" fixes palette and rounding before any composition, then L25 composes. The foundation-first order is what LP L54 diagnoses as the broken decision ("structure was judged without the look"). Also note a cross-reference outside this area: LP L30-L36 "Structure stage (ignore polish)" still sits in the locked plan above the Oct 1 rejection and has not been struck through there either.

**F-minimal. Minimal color.** "restrained" x11 (C2); "No green/red theme exploration" (state L13); "No green/red/plum page themes" (handoff L16); "not green, red or unrelated page themes" (DESIGN L43); "Semantic colors are states" (DESIGN L66); "restrained shadows" (DESIGN L25); decisions L218 and L20 ("no added depth").

**F-summary. Summarizing the owner instead of quoting him.** handoff L9-L11 ("What the owner is trying to achieve") and state.md L11-L19 paraphrase him. Decisions L210, L211, L218 carry at most one short quote. "Restrained" is not his word (his verbatim at DESIGN L43: "dark at number 1, or somewhere between numbers 1 and 2"). RLD L14 and L8 say the host "never summarizes the owner where his words exist", and OV exists, but no document in this area points to it. Positive counterexample: proof L33 quotes his rejection in full.

---

## Counts

- OUTDATED: 24 (A1-A24)
- CONFLICT: 10 (B1-B10)
- DUPLICATE: 9 (C1-C9)
- LOST: 19 (D1-D19)
- FINE: 25 (F1-F25)

## Highest-value fixes (for the owner to approve; nothing was edited)

1. Add an October 1-2 section to decisions.md and mark L211 and L218 (and L19, L20 partly) as superseded in the palette and "no green/red" parts, quoting OV and LP verbatim.
2. Rewrite state.md "Current design task" and "Next" around the three accepted renders, the pending skill test, and a pointer to `focus-review/` (LOCKED-PLAN, OPEN-ITEMS, owner-verdict, board).
3. DESIGN.md palette, depth, color-role and open-decisions sections need the owner's explicit yes before editing (DESIGN.md L13, decisions L165). Ask him once.
4. Retire or mark historical: claude-design-handoff.md, design-toolkit-proof.md L7-L9 and L25, roadmap L93 and L151, decisions L123.
5. Fix engineering.md L13 so no marketing surface may invent counts.
