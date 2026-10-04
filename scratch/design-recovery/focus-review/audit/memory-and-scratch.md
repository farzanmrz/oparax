# Audit: design notes in memory, .feature/ and scratch/design-recovery

Read-only audit. Date of truth: October 2, 2026. Paths are under /Users/farzanm4/Desktop/repos/oparax unless absolute. "D" = scratch/design-recovery, "FR" = D/focus-review, "PX" = D/pro-exploration.

Current truth used: FR/LOCKED-PLAN.md (esp. from "Owner rejection and new direction (October 1, evening)" L53 and "Owner verdict, October 2" L63), FR/OPEN-ITEMS.md, FR/council-skill/owner-verdict.md, ~/.agents/skills/reference-led-design/SKILL.md. Short form of that truth:
- functional color wanted (several hues, one job each, visible blue accent; green/amber/red for status) [LOCKED L58-59, L70; skill L31]
- black/grey/blue darkish palette, depth from soft light and shadow; old navy-only palette and "max 2 colours" rejected [LOCKED L55-56]
- objects not paragraphs; feed is the design carrier [LOCKED L57; skill L22]
- real logos and images allowed [LOCKED L69; skill L31]
- GitHub and Product Hunt are equal sources, not a separate digest; product change pending [LOCKED L67; OPEN-ITEMS L8]
- design judged from rendered pages beside a board of images, not text briefs [LOCKED L61; skill L21, L39]
- Open Sans [DESIGN.md L9, L24]
- owner's verbatim words outrank summaries [skill L9, L14]

## 0. Memory files

/Users/farzanm4/.claude/projects/-Users-farzanm4-Desktop-repos-oparax/memory/ does not exist. No `memory/` directory exists under any /Users/farzanm4/.claude/projects/* folder, and no MEMORY.md exists in the repo to depth 3. Class: FINE (nothing stale to mislead). Not searched: the Basic Memory MCP store (outside the stated area).

## 1. D top-level notes

### README.md
1. L3 "Current preview: http://localhost:3100/." OUTDATED. Preview later moved to 3000 (free-proof-verification.md L5), then focus-review renders. Risk: agent starts a stale server and judges the Sept 30 four-direction set as current.
2. L15 "The original navy, white and blue palette is restored. Direction 1 is the exact baseline". OUTDATED. LOCKED L55-56: old navy palette replaced by black/grey/blue; even Sept 30 dark renders "too blue and too just monotone". Risk: a builder restores navy as baseline.
3. L15 "No colored story slabs or source rails." CONFLICT. LOCKED L61 checklist includes "a promised tint and hue per source kind"; skill L31 "a hue per kind of thing". Risk: agent strips per-source color, the exact "no life" failure.
4. L17 "The four fixed sans-serif candidates remain Hanken Grotesk, Inter, Manrope and Source Sans 3". OUTDATED. Open Sans selected (DESIGN.md L9).
5. L21 "The X conversation is black in both page themes". OUTDATED. claude-design-handoff.md L19: chat "may be restyled"; PX/agent-brief L9 repeats it.
6. L23 "Doubled margins remain 56px desktop and 32px mobile ... The four liked arrangements remain." OUTDATED. LOCKED L10: 90% width up to 1800px; the four arrangements were replaced (PX/next-plan L3, then Window/Newsroom/Deck).
7. LOST (whole file). It is the folder entry point, claims "Latest owner correction and current result" (L13) and "All requested council and Opus reviews are complete" (L38), and never mentions FR/LOCKED-PLAN.md, OPEN-ITEMS.md, the board, or the global reference-led-design skill. Risk: first file an agent opens points at a superseded state.
8. L33 "Older captures remain only as review evidence, not active alternatives." FINE (correct handling rule; keep and apply to the whole folder).

### owner-brief.md
9. L50 "Fixed for comparisons: liked cool blue-gray palette, blue accent ... sources/engine-with-story/delivery order". CONFLICT. Palette replaced (LOCKED L56); the Sources/Oparax/Delivery hero flow was rejected (LOCKED L50, L54). Risk: "fixed" label makes agents treat both as locked.
10. L78 "Any exploration must be restrained within that palette, not competing plum, coral, teal, gold slabs." CONFLICT. LOCKED L59, L70, L72 and skill L31 want several hues with one job each. Pushes minimal color.
11. L74 "Four fixed sans-serif candidates ... Hanken". OUTDATED (Open Sans).
12. L70 "Likes D2 circular roadmap center with left/right groups". CONFLICT. LOCKED L50: "the big 'Your agent' circle in the middle looks bad."
13. L23-L46 (22 numbered "Chronological reading of cumulative feedback") and L70. Summarizing the owner instead of quoting. L70 is also garbled ("Publisherfaviconfromsite", "Explicitlystop oldlocalhostservers and serve previewonwww.localhost3000", "onlyheader"). Skill L9/L14: plan from verbatim words, never a summary. Risk: agents read the paraphrase as the owner's rules; items like 16 (L40) carry the rejected hero order.
14. L40 item 16 and L66 acceptance "At 1680x820 viewport, three-stage explanation present in first screen". OUTDATED. Hero flow rejected; Oct 1 "hero showing everything stretched out might be a bit overrated" (LOCKED L57).
15. L70, L74, L78 define the roadmap three ways (17 social platforms; a single list of 11 named platforms; left sources/right destinations with X, WhatsApp, Slack, SMS, Email). DUPLICATE with different wording; LOCKED L50 adds Instagram, Threads, LinkedIn, Snapchat as destinations and drops per-item "Planned". Risk: agent picks any of three.
16. L15-L21 verbatim rejection quotes. FINE (verbatim, dated; keep).

### council-summary.md
17. L16 "Agreement: retain palette" and L18 "Hanken default ... default system sans". OUTDATED (palette, Open Sans).
18. L29 "One shared palette/header/footer is appropriate. Core experience ... vary." CONFLICT with skill L24 ("differ in composition and in where color lives, never one layout in several palettes"; the reverse also fails because color never differs).
19. L24-L27 four named directions (Connected Stories, Story Gallery, Reading Room, Story Timeline). OUTDATED; names collide with later Window/Newsroom/Deck.
20. L10 notes which lanes did only description reads. FINE (honest evidence grading; matches "council never inspected rendered screenshots" lesson).

### ds2-original-feedback.md and ds2-visual-observations.md
21. ds2-original L5-L7, annotations verbatim. FINE (verbatim; L3 correctly says praise is not a global winner). Add a status line: all annotations refer to the Sept 30 port-3100 set.
22. ds2-original L186 / ds2-visual L24 and L36 "Move this switching into the header throughout the explorations" / "Put Direct Feed / Clustered controls in the header in every direction." CONFLICT with PX/agent-brief L48 and handoff ("beside the page-level feed heading") and LOCKED L19 (sidebar or beside the title). Two guidance files disagree on one control; ds2-visual is read first by agent-brief L9 step 3.
23. ds2-visual L38 "direction 1 hero composition ... can coexist". OUTDATED (hero flow rejected).
24. ds2-visual L3, L28-L35 (separate intent from label, images support not decide, sources once, dates once, rounded-square tiles). FINE.

### history-product-map.md
25. L23 "Baseline: coherent cool blue-gray light/dark palette" and L27-L31 typography ("Use a clearly proposed readable alternative sans"). OUTDATED (palette, Open Sans).
26. L43 "These remain distinct daily digests in actual code, not current source-clustering inputs." LOST. True of code, but no note that the owner decided GitHub/Product Hunt are equal sources (LOCKED L67); an agent will design a separate digest section.
27. L49-L64 "Landing source gap now" and "Four genuine paired structural opportunities". OUTDATED (superseded structures). Its L64 "Do not make four theme swaps" is FINE and matches skill L39.

### implementation-contract.md
28. L7 "Use existing shared tokens; don't change palette/font" and L23 "default system sans". CONFLICT (palette replaced, Open Sans).
29. L25 "FIRST VIEW: at 1680x820 ... Scene starts near y180 and COMPLETE sources + center story + right DM ends before y760". OUTDATED, and a text-only structural spec (coordinates, pixel budgets) that pushes structure before look.
30. L29 "Interpret screenshots as images, not just DOM." FINE.

### component-evidence.md
31. L5 "Font choice is unresolved" and L9 "Keep the exact light/dark blue-gray palette". OUTDATED.
32. L9 "not a bigger effect catalog" and L11 "Select one background and at most one narrative motion pattern per pair ... No autoplay topic switcher, scrolling ticker, infinite beam". CONFLICT. Owner Oct 1 wanted React Bits animations and imaginative component use (LOCKED L61 item list). Pushes minimal motion and effects.
33. L70 "GitHub/Product Hunt remain separate daily digests ... No invented freshness, ongoing learning, realtime delivery". CONFLICT. LOCKED L67 (equal sources) and L48 (headline says news arrives instantly, "1 minute is the minimum cron").
34. L26 table row Studio: "Do not label Pro code available, buy access". OUTDATED. React Bits Pro is purchased and installed (claude-design-handoff.md L41; PX/agent-brief L33).
35. L30-L54 four arrangements (Evidence bridge, Correspondence, Story gallery, Reading tray). OUTDATED.
36. L28 license notes (React Bits MIT with Commons Clause, Magic UI, shadcn, MicroKit). FINE.

### roadmap-followup.md
37. L35 "preserve the 158px circular mark, broad ring" and L27 "All labels and planned states remain visible". CONFLICT (LOCKED L50: circle looks bad; "planned items need no per-item 'Planned' label").
38. L7-L21 17 platform names and logo sources. FINE.

### catalog-assets.md, catalog-led-verification.md, free-component-manifest.md, free-proof-verification.md, react-bits-setup.md, whole-layout-verification.md
39. catalog-assets.md L3-L15 mark provenance (28 SVGs, gaps for Douyin and Reuters). FINE; directly supports "real logos allowed".
40. catalog-led-verification.md L9 (MagicBento, AccordionGallery ...) and L14 "unchanged navy/blue/light foundation". OUTDATED. free-component-manifest.md L3 says it replaces this map, but catalog-led-verification carries no marker. Overlaps free-component-manifest: DUPLICATE with different content.
41. free-component-manifest.md L7-L10 per-direction palettes "Lilac, Inter", "Paper/cobalt, Manrope", "Forest/teal", "Plum/porcelain". OUTDATED as page themes (rejected Sept 30, README L15; PX/agent-brief L15). Note: teal/green as functional status hue is now allowed; as a page theme it is not.
42. free-component-manifest.md L20, react-bits-setup.md L7 "Paid blocks ... remain untested ... The owner will decide about purchase". OUTDATED (Pro bought, used in PX).
43. free-proof-verification.md L5 "only Oparax review address ... previous 3100 comparison server was stopped", whole-layout-verification.md L5 (served at 3000). OUTDATED (ports); L34 "No design has been accepted by the owner" now OUTDATED (accepted renders exist, Oct 2).

## 2. PX (pro-exploration) top-level

44. agent-brief.md L15 "Open Sans, navy/blue base, blue accent ... No green/red/plum page themes. Harmonious blue gradients are allowed." CONFLICT. Palette is black/grey/blue with several functional hues (LOCKED L56, L59, L70). Note the file was written for Sept 30; the problem is that it still reads as the active builder brief.
45. agent-brief.md L35 "no uppercase tracked eyebrows". CONFLICT. Owner Oct 2 asked for small-caps source headers ("X accounts", "RSS feeds") (LOCKED L68; owner-verdict L28); skill L43 says such generic warnings yield.
46. agent-brief.md L45 "Sources -> Oparax -> Delivery demonstration visible early ... three stage headings align on one line". OUTDATED. Hero flow rejected (LOCKED L50).
47. agent-brief.md L7-L12 reading order. LOST. Names the handoff, DESIGN.md, ds2 files; omits LOCKED-PLAN, OPEN-ITEMS, owner-verdict, the board, reference-led-design. The whole file is a text brief (required content list, pixel budgets); skill L39 lists "text-only briefs" as the failure.
48. agent-brief.md L48 (switch beside heading), L60 ("LOOK at every image"), L15 ("not the same old cards with different paint"), L9 ("local preferences, not global rules"). FINE.
49. final-plan.md L11 "No AI chat or AI Elements in any feed." CONFLICT. LOCKED L11 card uses AI Elements Sources; LOCKED L39 uses AI Elements for onboarding; next-plan.md L7 uses it too.
50. final-plan.md L19-L48 (four directions, all with the centered three-stage hero) and L35 "recolored to navy/blue glow tokens". OUTDATED. L3 "This plan supersedes direction-plans-draft.md" is FINE, but nothing marks final-plan itself superseded by next-plan.
51. direction-plans-draft.md L1 "(NOT agreed, for council critique)". OUTDATED, self-labelled; DUPLICATE of final-plan with different block choices (e.g. device, hero-24, bento-17 present in draft, dropped in final). Low risk.
52. next-plan.md L3 "Foundation unchanged (Open Sans, navy/blue, 10px)" and the whole Direction 5 structure. OUTDATED and CONFLICT. This is the render the owner rejected on Oct 1 evening ("Nothing lands", LOCKED L54). No supersession marker. Risk: highest in this folder, a future agent rebuilds it.
53. next-plan.md L21 "About: what Oparax is and why it exists", L20 How It Works base candidates (how-it-works-1/2, features-11), L22 "Roadmap: the React Bits circles component". CONFLICT. LOCKED L20 "No About, blog or timeline", L21 five owner steps, L50 circle rejected.
54. next-plan.md L14 "Nothing else (no agent card, no counts)". CONFLICT (mild) with accepted council renders using status tiles and stored-value counts (OPEN-ITEMS L7; skill L34).
55. next-plan.md L7-L10 card spec (plain title, bullet facts, parenthesized citations, "Used N sources", Direct vs Clustered subtle). FINE; matches LOCKED L11.

## 3. .feature/ (Sept 24 to Sept 30 feature plans)

56. plan-151-owner.md L63, issue-body.md L64, amend-151-1-owner.md L7 "The product gets the look you approved on September 29: the cool blue-gray ... the Hanken Grotesk typeface". OUTDATED and DUPLICATE (three copies). AGENTS.md says dated owner-attributed plan passages are his decisions, so these read as authority; Open Sans (Sept 30) and the Oct 1 palette reset outrank them.
57. amend-151-1.md L87 token hex table (#f6f8fc/#090f1d, #245dec/#6b94ff ...), L88 `Hanken_Grotesk`, L198 J15 "Hanken Grotesk everywhere". CONFLICT with Open Sans and the black/grey/blue palette. These are executable build contracts (signup-first-effective.md L67 repeats step 22). Risk: a QC or amend run "fixes" the product back to Hanken/navy.
58. amend-151-1.md L98 pause/play control on the background, L99 "Badge variant outline 'Planned'" on each planned row, GitHub and Product Hunt listed as digests under "Works today". CONFLICT. Owner Sept 30 "no pause/play"; LOCKED L50 no per-item Planned label; LOCKED L67 sources equal.
59. plan-151.md L16 "No catalog block, rendered reference or new visual direction; the screens are small edits to existing compositions." CONFLICT. Whole design is being redone from rendered references; wording is the structure-first/minimal-design stance.
60. plan-151/design-refs/design-brief.md L13 (Hanken, cool blue-gray), L7 ("not another four-page exploration"), L20 (separate GitHub/Product Hunt digests), L46 (discreet motion toggle). OUTDATED. L3 "not a claim of owner acceptance of a rendered product" is FINE.
61. plan-151/design-refs/d17-notes.md L7 (palette and Hanken inherited), L11 (pause control). OUTDATED; reference-only folder.
62. plan-149-owner.md L38 "stock shadcn Mira ... owner restyles pages in Claude Design later", plan-149/landing.md L7 (Nunito Sans, BuildBox hero), decisions-149-landing.md L2 and decisions-149-page.md L2 ("no redesign or theme edits are needed"), pair-signup/scope-brief.md L10 and plain-fable.md L36 (design system out of scope). OUTDATED archive; same pattern (stock first, no visual direction). Low risk unless an agent greps .feature for "design".
63. lanes/skills/frontend-design/SKILL.md L59 "Spend your boldness in one place" and L42 (gradient washes and identical cards as tells), snapshot dated Sept 28. CONFLICT with several hues/soft gradients. The snapshot predates and lacks reference-led-design's Coexistence block (skill L43), so review lanes using this copy get the "one accent" push.
64. decisions-*, critique-dispositions*, pair-*, build-runs/. FINE as archive (evidence); preserve per AGENTS.md. Not design guidance.

## 4. D/site notes (provenance and render notes)

65. site/next/NOTES.md L1, L3 "Structure-stage render" and L36 item 24 "Blue only for actions, selected view, links ... neutral dots, icons, avatars". OUTDATED and CONFLICT. This is the render rejected Oct 1; it states the minimal-color rule and has no rejection banner. Its product FLAGs (e.g. build_state not exposed publicly; GitHub in hero vs digest) are FINE and still needed.
66. site/directions/d1-notes.md L3 (lilac, Inter), d2-notes.md L25 (Manrope, cobalt), d3-notes.md L26 (teal, forest), d4-notes.md L7 (plum, mauve). OUTDATED (rejected page themes).
67. site/pro/d1..d4/NOTES.md (e.g. d3 L13 "recolored ... to navy/blue"). FINE as provenance (imported/adapted/custom records); palette statements OUTDATED.
68. Cross-area, spotted while tracing: scratch/claude-design-handoff/START-HERE.md L5, L29, L31 (navy baseline, four font candidates, 56px margins) and docs/references/claude-design-handoff.md L16 ("No green/red/plum page themes"), L7/L19, which PX/agent-brief L7 says "wins on aesthetics". Both OUTDATED/CONFLICT for the same reasons; owned by another area.

## 5. Patterns that push agents the wrong way

- Text-only briefs: PX/agent-brief.md (required-content list, pixel budgets), D/implementation-contract.md L25, PX/final-plan.md, .feature/plan-151/design-refs/design-brief.md. None link a board of images or the owner's praised/rejected renders; skill L21-L22, L39.
- Structure before look: .feature/plan-151.md L16, D/implementation-contract.md L25, PX/direction-plans-draft.md and final-plan.md (block slugs and layout decided first), site/next/NOTES.md (whole "structure-stage" frame; LOCKED L54 names this as the broken decision).
- Minimal color: D/README.md L15, D/owner-brief.md L78, PX/agent-brief.md L15, site/next/NOTES.md L36, lanes/skills/frontend-design L59.
- Summarizing the owner: D/owner-brief.md L23-L46 and L70 (22 paraphrased items, one garbled), D/history-product-map.md (chronology prose), D/council-summary.md. Only owner-brief L15-L21, ds2-original-feedback.md and FR/council-skill/owner-verdict.md quote him.
- Missing supersession banners: README.md, next-plan.md, final-plan.md, catalog-led-verification.md, site/next/NOTES.md. Suggested fix (not applied): one STATUS line atop each pointing to FR/LOCKED-PLAN.md and FR/OPEN-ITEMS.md.

## Counts

68 numbered findings, one primary class each: OUTDATED 30, CONFLICT 21, DUPLICATE 1 (item 15; items 40, 51, 56 are also partly duplicates), LOST 3 (items 7, 26, 47), FINE 13. Memory files: 0 present.
Item 13 (summarizing the owner) is counted as CONFLICT with skill L9/L14 and AGENTS.md visual-feedback rules.
