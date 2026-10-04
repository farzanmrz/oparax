# Audit: is outdated, conflicting or lost design guidance reaching agents?

Synthesis of five read-only audits (agents-md, design-docs, feature-flow, global-design-skills, memory-and-scratch). Nothing was edited except this file. Date of truth: October 2, 2026.

Current truth used (cited as LP, OI, OV, RLD):
- LP = focus-review/LOCKED-PLAN.md, from "Owner rejection and new direction (October 1, evening)" (L53) onward and "Owner verdict, October 2" (L63) onward
- OI = focus-review/OPEN-ITEMS.md
- OV = focus-review/council-skill/owner-verdict.md (his verbatim words)
- RLD = /Users/farzanm4/.agents/skills/reference-led-design/SKILL.md

Check I ran: I re-read 23 cited lines directly in the repo (AGENTS.md, DESIGN.md, decisions.md, state.md, design-tooling.md, feature/qc/amend SKILL.md, engineering.md, handoff, next-plan.md, README.md, react-bits-pro, frontend-design, design-review). Every quote and line number matched. I did not re-verify the other roughly 150 findings; each row below carries its source ID so it can be traced to the area file.

---

## 1. The owner's fear: is stale, conflicting or missing design guidance being propagated to agents?

**Yes.** Not by accident in one file, but along the exact path AGENTS.md sends every agent down. AGENTS.md tells agents to read state.md at host start, DESIGN.md ("the contract") for visual work, decisions.md ("quote, do not re-argue") and design-tooling.md for tools. All four still describe the palette and process he rejected on October 1 and 2. His newest rulings exist only in git-ignored scratch/, which a session starting elsewhere cannot see. An agent that follows the written rules faithfully rebuilds navy, minimal color, brief-first work.

The five strongest pieces of evidence:

1. **The rejected palette is written into five binding files, and none mentions October 1 or 2.**
   - DESIGN.md:43 "Explore within this navy/blue family, not green, red or unrelated page themes."
   - decisions.md:218 (marked LOCKED) "No green/red page themes."
   - state.md:13 "No green/red theme exploration."
   - design-tooling.md:3 "Use restrained navy/blue around D1 or toward D2."
   - claude-design-handoff.md:16 "No green/red/plum page themes."
   - Truth: "Palette fixed input REPLACED... a black, gray and blue range" (LP L56); "Color for functional stuff is fine" (LP L59); "so much life... in the colors" (OV).
   - The one thing AGENTS.md says about authority ("DESIGN.md is the contract", AGENTS.md:26) makes this the worst chain: obeying the rules produces the monotone navy he called "too blue and too just monotone... at max 2 colours" (LP L55).

2. **The new method is invisible to the instruction chain.** Grep for "reference-led" in AGENTS.md, DESIGN.md, docs, .claude and .agents returns nothing. LOCKED-PLAN, the board, rendered-pages-beside-references and "quote his words verbatim" appear nowhere an agent is routed to. The feature, amend, build and qc flow has no design stage at all (the only render-and-compare loop is "standalone preview" research in amend:40 and engineering.md:24). The ui skill bundle (feature SKILL.md:87), the Codex skill list (feature:172) and qc:117 do not name the skill.

3. **Vendor design skills actively say the opposite and claim final authority.**
   - react-bits-pro:51 "This document is the single source of truth. Follow it literally." Its defaults (L641-644) are "Exactly two section backgrounds... three text tones... One accent colour, used... at most once", plus a counted pass/fail table (L681-697). That is the "monotone, max 2 colours" outcome.
   - frontend-design:47-53 mandates a prose plan with ASCII wireframes and a hex list before any render; :59 "Spend your boldness in one place."
   - design-review checklist:28 "Restrained palette; accent color used sparingly."
   - None of the ten design skills points at reference-led-design. Only its own Coexistence section says they yield, so an agent that loads only one of them never sees it.

4. **Text-only briefs and structure-before-look are written into the process itself.**
   - decisions.md:123 and roadmap.md:93 and :151: the design brief is written, then "the export is the plan's visual contract."
   - feature SKILL.md:63 fixes blocks, depth and motion "in that slice... so the build does not guess them" before any render; :105 has him approve a text plan; :41 says no screenshot step is mandatory.
   - amend:67 compresses a design request to "one or two sentences."
   - LOCKED-PLAN.md itself still lists "Structure stage (ignore polish)" (L25-36) above the rejection that withdrew it. RLD:39 lists exactly this under what failed.

5. **Files that look current still describe the rejected render, with no supersession marker.**
   - pro-exploration/next-plan.md:3 "Foundation unchanged (Open Sans, navy/blue, 10px)" is the structure render he rejected ("Nothing lands"), and it also adds an About section and the circle roadmap he ruled out.
   - scratch/design-recovery/README.md:15 "The original navy, white and blue palette is restored" calls itself the "current preview" and never points to LOCKED-PLAN.
   - .feature/amend-151-1.md:87-88, :198 are executable build contracts with Hanken and navy tokens.
   - Paraphrase replaces his words at each hand-off: owner-brief.md has 22 paraphrased points (one garbled), design-tooling.md points at an assistant-written "current visual brief", frontend-design:13 says use remembered preferences "as a hint". Only OV, ds2-original-feedback.md and owner-brief L15-21 quote him.

Honest limits: some of this is by design (DESIGN.md changes need his explicit yes per DESIGN.md:13, so the host rightly did not rewrite it). The gap is that nothing marks the old text as pending replacement. Also pending on his side: the GitHub and Product Hunt change is a product change against today's code (issue 136), so docs describing the digest as code reality (repo.md) stay accurate and need a note, not a rewrite.

---

## 2. Every OUTDATED, CONFLICT and LOST finding, most dangerous first

Class: O = OUTDATED, C = CONFLICT, L = LOST. Fix column points to the numbered edits in section 5. Source IDs: AM = agents-md, DD = design-docs (A=outdated, B=conflict, D=lost), FF = feature-flow (F), GS = global-design-skills, MS = memory-and-scratch (numbered items). Where several audits found the same line, they are merged into one row. Sev: P0 = read at host start or by every design agent and yields work he rejected; P1 = likely to be loaded; P2 = reachable on request or by one stage; P3 = archive or narrow.

### P0: loaded first, directly yields rejected work

| # | Sev | file:line | Quote | Cl | Current truth | Fix | Src |
|---|---|---|---|---|---|---|---|
| 1 | P0 | DESIGN.md:43 | "Explore within this navy/blue family, not green, red or unrelated page themes." | O/C | Functional color wanted; palette replaced (LP L56, L59, L70; OV "life in the colors") | E1 | AM-1, AM-D1, DD-A2 |
| 2 | P0 | DESIGN.md:23, and table L28-43 | "Restrained navy/blue around direction 1... harmonious blue gradients" | O | Black, grey, blue darkish range, visible blue accent, depth from soft light (LP L56; RLD L31-32) | E1 | DD-A1, DD-A2, AM-D1 |
| 3 | P0 | state.md:13 | "restrained navy/blue around D1 or toward D2... No green/red theme exploration." | O | As row 1. This file is read first at every host start and after compaction | E6 | DD-A4, AM-D3 |
| 4 | P0 | decisions.md:218 | LOCKED: "navy/blue around direction 1... No green/red page themes." | O | As row 1. AGENTS.md:13 says quote decisions.md, so the stale ruling gets quoted against his later one | E5 | DD-A15, AM-3, AM-D2 |
| 5 | P0 | design-tooling.md:3 | "Use restrained navy/blue around D1 or toward D2... Only official logos retain their authentic appearance." | O/C | Same palette truth; real logos, avatars and images in their own colors allowed (RLD L31; LP L69). First paragraph every design agent reads | E16 | FF-F1, FF-F11, AM-D3 |
| 6 | P0 | AGENTS.md:13 | "read `DESIGN.md`, the current brief and original feedback" | L | Must also route to RLD, LOCKED-PLAN, verdict, board; "the current brief" is a text summary (RLD L14, L20, L39). No mention of the skill anywhere in the file | E9, E10 | AM-2, AM-6, AM-17, DD-D6 |
| 7 | P0 | AGENTS.md:13 and decisions.md (no October section) | "append dated owner decisions" | L | October 1 and 2 rulings live only in scratch/ (git-ignored). Not in decisions.md, DESIGN.md, state.md or AGENTS.md | E5, E9 | AM-4, DD-D1, DD-D7, DD-D18 |
| 8 | P0 | AGENTS.md:26 | "`DESIGN.md` is the contract" | C | The contract still carries the replaced palette; owner approval to update it is pending, and nothing marks the old text as pending | E1, E10 | AM-1 |
| 9 | P0 | pro-exploration/next-plan.md:3, :21-22 | "Foundation unchanged (Open Sans, navy/blue, 10px)"; "About"; "React Bits circles component" | O/C | This render was rejected Oct 1 evening (LP L54); no About (LP L20); circle roadmap "looks bad" (LP L50). No supersession marker | E31 | MS-52, MS-53, MS-54 |
| 10 | P0 | scratch/design-recovery/README.md:3, :15, :17 and whole file | "Current preview: http://localhost:3100/."; "original navy, white and blue palette is restored"; "No colored story slabs or source rails." | O/C/L | Folder entry point; never points to LP, OI, OV or RLD; per-source hue is now wanted (LP L61) | E31 | MS-1 to MS-7 |
| 11 | P0 | react-bits-pro/SKILL.md:51 and :641-644 | "single source of truth. Follow it literally." / "Exactly two section backgrounds... One accent colour... at most once" | C | RLD L8 owner's later words outrank; RLD L45 names this rule as one that must yield; "too just monotone" (LP L55) | E35 | GS-29, GS-34 |
| 12 | P0 | frontend-design/SKILL.md:47-53 | "brainstorm a short design plan... 4-6 named hex values... ASCII wireframes" | C | Text-first, structure-first, palette-by-hex-list is the listed failure (RLD L39; LP L54) | E34 | GS-6 |
| 13 | P0 | feature/SKILL.md:63 (step 1.1) | "which shadcn controls and React Bits Pro... blocks, where depth goes... are written into that slice... so the build does not guess them" | C | Components, depth and motion are chosen after looking at the board (RLD step 5); structure judged without look broke (LP L54) | E25 | FF-F13 |
| 14 | P0 | feature/SKILL.md:69-78 and :105 | "exactly this six-section format"; "Nothing below starts until the owner has said yes to this exact document" | C | For screens with a new look, show rendered pages and one paragraph each, not a memo (RLD L26) | E24 | FF-F17 |
| 15 | P0 | feature/SKILL.md:87 (ui bundle row), :172, qc/SKILL.md:117 | ui bundle lists seven skills; Codex list names ten; none names the new skill | L | Owner ordered a global skill for all models and lanes (LP L66; OV). Three identical lists must change together | E22 | FF-F16, AM-D4, FF-F30 |
| 16 | P0 | feature/SKILL.md:87 | "read root `DESIGN.md` first, the binding visual contract" | C | "Binding" currently means the rejected palette; DESIGN.md update awaits his yes | E1, E24 | FF-F15 |
| 17 | P0 | decisions.md:123; roadmap.md:93, :151 | "`/feature` writes a design brief... the export is the plan's visual contract." | O | Board of real screenshots and rendered pages replace briefs (LP L61); text-only briefs are failure number one (RLD L39) | E5, E8 | DD-A18, DD-A19 |
| 18 | P0 | LOCKED-PLAN.md:25-36 (Stages, "Structure stage (ignore polish)") and :41 (roster "Astra, Grok and Kimi") | "Structure stage (ignore polish)"; "Council lanes: Astra, Grok and Kimi" | O | The stage split is withdrawn by the Oct 1 evening rejection (LP L54) and RLD L39; roster is superseded by OI L12 (adds agy, Muse Spark, GLM). The truth file contradicts itself, un-struck | E32 | DD (F-structure), AM-7, GS-62 |
| 19 | P0 | design-review/checklist.md:28, :6, :10; react-bits-pro:651-666, :681-697; frontend-design:59, :32, :40-45 | "Restrained palette; accent color used sparingly"; "Only the navigation and the hero may animate"; "Spend your boldness in one place" | C | Several hues one job each; React Bits motion and "imaginative flair" wanted (OV; LP L48, L61); a dense feed has many focal objects (RLD L22) | E34, E35, E36 | GS-13, GS-14, GS-35, GS-37, GS-7, GS-4, GS-5 |

### P1: likely to be loaded or reachable in a normal feature run

| # | Sev | file:line | Quote | Cl | Current truth | Fix | Src |
|---|---|---|---|---|---|---|---|
| 20 | P1 | state.md:17, :53-55 | "four complete Pro directions, then owner design acceptance" / "Render four complete Pro Exploration directions" | O | Three council directions (Window, Newsroom, Deck) built and all land; not picked; next is the global skill then revising them (LP L64; OI "Next") | E6 | DD-A5 |
| 21 | P1 | state.md:3 and :15 | "Updated September 30, 2026"; "Review at http://localhost:3000/?d=1&view=feed&type=open. The typography selector offers..." | O | Font chosen (Open Sans); design moved Oct 1 and 2; stamp gives false freshness | E6 | DD-A6, DD-A7 |
| 22 | P1 | decisions.md:211 | "retaining D1's liked navy/blue palette and layout... render four complete Pro directions" | O | Still reads PENDING; no entry records the outcome | E5 | DD-A14, AM-D2 |
| 23 | P1 | decisions.md:131, :15; roadmap.md:17, :21, :65-67, :142, :149 | "Tabled: GitHub and Product Hunt (#136)"; "A daily digest, separate from the ten sites" | O | GitHub and Product Hunt are equal sources (LP L67; OV). Product change pending against issue 136; add a note, do not rewrite code description | E5, E8 | DD-A22, AM-5, DD-D9, MS-26, MS-33 |
| 24 | P1 | decisions.md:19, :20; :187; :165 | Nunito Sans/Source Sans 3; "no added depth"; "centered" footer; "palette"; "triggers the design-sync hook" | O | Open Sans (DESIGN L24); depth from light (RLD L32); footer aligned right (DESIGN L60); hook removed (L198) | E5 | DD-A16, A17, A23, A24 |
| 25 | P1 | DESIGN.md:25, :67 | "restrained shadows where useful"; "Do not add a shadow to every nested element by default" | C | Depth from soft light and layered shadow (LP L56-57, L61; RLD L32) | E2 | DD-B1, FF-F7 |
| 26 | P1 | DESIGN.md:66 | "Semantic colors are states." | C | First half (green/amber/red = status) is right; blocks per-source-kind hues and "a hue per kind of thing" (RLD L31; LP L61) | E3 | DD-B2 |
| 27 | P1 | DESIGN.md:80 and :68 | "remain open: ... feed-card composition..."; "omit decorative labels" and Title Case headers | O/C | Oct 1 card contract is decided (LP L11); small-capitalized group headers and more prominent section headers wanted (OV L28; OI L9) | E4 | DD-A3, DD-B3 |
| 28 | P1 | design-tooling.md:20, :22, :33 | "navy-tinted `--color-neutral-*` ramp"; single accent knob; "Neutral shadow recipes do not impose... a shadow on every item" | O/C | Black/grey/blue; accent plus functional hues; lean depth | E18, E21 | FF-F3, FF-F4, FF-F7 |
| 29 | P1 | design-tooling.md:3 and :16 | "Read DESIGN.md and the current visual brief"; "The owner brief wins on aesthetics, composition and scope" | C | A brief is an assistant summary; his verbatim words and the board win (RLD L8, L20; LP L61) | E16 | FF-F2 |
| 30 | P1 | design-tooling.md:47 | "The next exploration produces four complete directions... The current readiness task prepares the Claude handoff" | O | Three directions built and accepted; exploration did not go through the handoff | E19 | FF-F5 |
| 31 | P1 | design-tooling.md:5-14 ("Roles and loading") | no mention of reference-led-design | L | RLD L43-47 Coexistence; frontend-design is currently the controlling craft guide | E17 | FF-F6 |
| 32 | P1 | design-tooling.md:41 | "Offline checks confirm 27 selected folders/copies" | O | Manifest now has 28 and includes the skill | E20 | FF-F10 |
| 33 | P1 | feature/SKILL.md:41 | "no browser, screenshot or visual-probe step is mandatory." | C | Judge from rendered pages beside the board (RLD L25-26); amend:40 already allows standalone previews | E23 | FF-F12 |
| 34 | P1 | feature/SKILL.md:59 | "Reuse the accepted visual reference" | L | "Accepted reference" undefined: it is the three council renders, no pick yet; no trigger for the loop when he rejects or points at screenshots (RLD L3) | E24 | FF-F14 |
| 35 | P1 | feature/SKILL.md:45 | DESIGN.md changed "only when the owner explicitly approves" | L | Guard is right; nothing queues the palette change as a decision line at step 4 with the render as evidence | E24 | FF-F18 |
| 36 | P1 | feature/SKILL.md:145 (step 5.1), amend/SKILL.md:93, :109, planning-protocol.md:7 | "Each screen records the exact template/block source, access requirement, accepted visual reference and adaptations" | L | Slice also needs his dated verbatim quotes, board path and reference images, numbered criteria, accepted render path; otherwise the builder has only text | E26, E29 | FF-F20, F25, F27, F35 |
| 37 | P1 | feature/SKILL.md:162-170; qc/SKILL.md:113-118, :93-95 | Eight critique lenses, seven QC lenses, none visual; QC compares to "accepted preview plus DESIGN.md" | L/C | Lead with "as a human looking at this, does it land..." (LP L54); pass board and shots/; QC compares to board and rejected renders (RLD L25) | E27 | FF-F21, F28, F29 |
| 38 | P1 | amend/SKILL.md:67 | "What you asked for, in one or two sentences" | C | Never summarize him where his words exist (RLD L14); the cap was for code findings | E28 | FF-F22 |
| 39 | P1 | amend/SKILL.md:64, :69 | "run the same UI checkpoint if it touches a user-facing surface" | O | No UI checkpoint exists in feature; inventing one contradicts RLD L47 | E28 | FF-F23 |
| 40 | P1 | AGENTS.md:17, :21, :7, :22 | "Interpret the owner's informal dictated annotation batch"; "Infer dictated wording" | C | Needs one verbatim rule: quote raw, add interpretation beside it, never in place of it (RLD L14, L20; 10 missed points, LP L61) | E10 | AM-9, AM-12 |
| 41 | P1 | AGENTS.md:19 | "Selectors, DOM, CSS, coordinates, captured text and screenshots are generated evidence" | C | Correct for annotation exports; wrong for screenshots he picks as references (Supabase, Linear, owner-1..6; LP L57) | E12 | AM-10 |
| 42 | P1 | AGENTS.md:28, :30 | "restricted council lanes review selected guidance, source and renders"; "The current initial exploration adds no mandatory design stop elsewhere." | C/O | Lanes need images and his verbatim words; "initial exploration" points at the replaced Sept 30 work | E11 | AM-7, AM-8 |
| 43 | P1 | AGENTS.md:28, :34 | "Relevant UI skills guide planning, building and review."; "Preserve rosters" | L | Names neither the skill nor the design roster Astra, Grok, Kimi, agy, Muse Spark, GLM (OI L12) | E10 | AM-17 |
| 44 | P1 | AGENTS.md:46 (uncommitted) | "Scratch work requires explicit user authorization" | C | Method writes the board, renders and verdicts to scratch/ every round; builders and lanes will stall or write elsewhere. Owner should decide before commit | E14 | AM-14 |
| 45 | P1 | AGENTS.md:42 | "Stages do not run or attach to product servers." | C | Standalone design previews are allowed (engineering.md:24; RLD step 6); AGENTS.md does not say so | E15 | AM-15, AM-16 |
| 46 | P1 | AGENTS.md:21 | "Local praise neither selects a whole direction nor changes the global theme." | C | He did approve the whole look Oct 2 ("one dark color theme... so much life"); no counterpart for his global statements | E10 | AM-11 |
| 47 | P1 | AGENTS.md:5 (and roadmap.md) | "Oparax monitors sources and alerts one person on X." | L | Equal-sources product change pending (LP L67); one pointer needed | E8 | AM-5 |
| 48 | P1 | AGENTS.md (design section) | no statement on real logos and images | L | Real logos and images allowed; story shows its image when one exists (LP L69; OV L20) | E1 | AM-18, DD-D10, DD-D19 |
| 49 | P1 | engineering.md:13 | "Illustrative counts are fixed text, not runtime product calculations." | C | No invented counts; counts only from stored values (RLD L34; LP L13) | E7 | DD-B4 |
| 50 | P1 | roadmap.md:11 | "font choice remains pending." | O | Open Sans chosen Sept 30; contradicts state.md:55 | E8 | DD-A20 |
| 51 | P1 | roadmap.md:57 (card) | "a synthesized headline, one to five fact lines each with its source, the contributing publishers, one compact relative time" | O | Oct 1 card: plain title, bullets with parenthesized citations, "Used N sources", nothing else (LP L11); image when it exists | E8 | DD-A21, DD-D11, DD-B9 |
| 52 | P1 | claude-design-handoff.md:11, :16, :23, :45, :49 | "Four directions means four complete landing/feed pairs"; "No green/red/plum page themes"; "navy-tinted neutral base"; "--only opus,grok,kimi"; "?set=pro&d=1" | O | Three directions; functional color; black/grey/blue; roster per OI L12 | E31 | DD-A8 to A10, A12 |
| 53 | P1 | claude-design-handoff.md:27 and design-toolkit-proof.md:97 | "Sources -> Oparax -> Delivery demonstration visible early" | O | Hero flow rejected (LP L50; L61) | E31 | DD-A11, MS-46, MS-14 |
| 54 | P1 | claude-design-handoff.md:11 | "Do not restart theme selection or a broad toolkit debate" | C | Blocks the palette work he ordered (LP L56-61) | E31 | DD-B7 |
| 55 | P1 | claude-design-handoff.md:7, :9-11 and whole file | "Read first" list is all documents; "What the owner is trying to achieve" paraphrase | L | 53-line prose brief, no board, no verdict file; D4 feed-is-carrier, D5 objects-not-paragraphs missing | E31 | DD (F-text, F-summary), DD-D4, DD-D5 |
| 56 | P1 | claude-design-handoff.md:31 and design-toolkit-proof.md:101 | roadmap input and output platform lists, "separates future incoming platforms from future delivery destinations" | C | Instagram, Threads, LinkedIn, Snapchat are destinations; one composition, not a grid; no per-item "Planned" label (LP L20, L50) | E31 | DD-B5 |
| 57 | P1 | roadmap.md, decisions.md, handoff ("sites and feeds") | "sites and feeds unlimited on every tier" | C | Name websites and RSS feeds separately (LP L68; OV L28); fine as internal shorthand, wrong as UI copy | E8 | DD-B6 |
| 58 | P1 | design-toolkit-proof.md:7, :9, :25, :29 | "retain the D1 navy/blue light and dark palette"; three competing "current/latest" markers | O/C | As rows 1 and 20; heading-level markers disagree, so mid-file reads take the wrong one | E31 | DD-A13, DD-B8 |
| 59 | P1 | .feature/amend-151-1.md:87-88, :98-99, :198; plan-151.md:16; plan-151-owner.md:63; issue-body.md:64; amend-151-1-owner.md:7 | Hanken token table; pause control; "Planned" badge on each row; "No catalog block, rendered reference or new visual direction"; "the look you approved on September 29" | O/C | Open Sans; no pause (Sept 30); no per-item Planned label (LP L50); equal sources (LP L67). Executable build contracts that QC or amend could "fix" the product back to | E33 | MS-56 to MS-60, MS-61 |
| 60 | P1 | frontend-design/SKILL.md:25-28, :13, :9, :19-21, :71 | "Using all caps for labels."; "use [memory] as a hint"; "not mistaken for anyone else's"; "sentence case" | C/L | Small capitalized headers wanted (OV L28; RLD L43); verbatim words not memory (RLD L20); references he pointed at are the target; Title Case nav (LP L10); Open Sans fixed | E34 | GS-3, GS-9, GS-1, GS-2, GS-8 |
| 61 | P1 | react-bits-pro:605, :634, :631, :670-679, :796-798, :847-860, :944-1010 | "apply Job B's defaults"; "max-w-[1400px]"; alternate texture; "One primary call to action"; "Do not add per-block... overrides"; purple SilkWaves; Agent Kit autoload | C | 90% width up to 1800px (LP L10); landing scope fixed (LP L20); adaptation to palette allowed; plum/lavender out; inspiration stays inspiration (LP L12); Agent Kit install not authorized | E35 | GS-31, 33, 36, 39, 40, 41 |
| 62 | P1 | shadcn: customization.md:37, :46; SKILL.md:25, :33, :23, :63-64, :70, :184; styling.md:40-60, :82-105 | `--accent` hover surface, grey `--primary`; "Never override component colors"; "Dashboard = Sidebar + Card + Chart + Table"; ask which registry; ask about status colors | L/C | Visible blue accent on actions and selection; lifted surfaces; objects not boxes; status colors and registries already answered (OV L40; DT) | E38 | GS-46 to GS-50 |
| 63 | P1 | council SKILL.md:73-88; review_guidance.py:231-236; reviewer-skills.json (skills 5, 11, 26) | critique template is a defect hunt; vendor design skills and RLD listed as equals | L | Design briefs lead with "does it land" and the board; owner's words and RLD outrank vendor defaults | E37 | GS-59, GS-61, GS-62 |
| 64 | P1 | design-review/SKILL.md:10-17, :59-78; :19-32 | usage ping to a third-party domain; Pro upload of code; rubric with no board | C/L | design-tooling.md:14 forbids telemetry; judge renders beside the board (RLD L25) | E36 | GS-12, GS-15 |
| 65 | P1 | ai-elements/SKILL.md:3, :158-160; scripts/jsx-preview.tsx:30 | "Build AI chat interfaces"; purple badges | L/C | Onboarding components where judgment and selection happen (LP L39); Sources in the card (LP L11); black/grey/blue | E39 | GS-52, GS-53 |
| 66 | P1 | beautiful-shadows presets (all `rgba(0,0,0,..)`, `bg-white`) | black alpha presets | L | Dark-on-dark must separate via luminance steps and top-lit edges (LP L57; RLD L32) | E39 | GS-26 |
| 67 | P1 | web-design-guidelines SKILL.md:19, :37 | "terse file:line format" | C/L | Owner reads product language (AGENTS.md:7); judge a render, not code only | E36 | GS-18 |
| 68 | P1 | emil-design-eng:70-76, :93 | "Tens of times/day... Remove or drastically reduce" | C | The feed is the main surface and carries React Bits motion and life (RLD L22; LP L61) | E39 | GS-21 |
| 69 | P1 | DESIGN.md (whole), docs/references: nothing on objects, verdict, board | no mention of: feed is the design carrier; objects not paragraphs; board method; verdict; accepted renders; landing copy rules; How It Works order; stock auth components; onboarding as design; council process rules; no paid runs from preview | L | LP L20-21, L39, L44, L46, L48, L50-51, L57; RLD L22, L30; OI L12 | E1, E5, E6, E9 | DD-D1 to D5, D8, D12 to D17 |

### P2: one stage, one folder, or narrow

| # | Sev | file:line | Quote | Cl | Current truth | Fix | Src |
|---|---|---|---|---|---|---|---|
| 70 | P2 | scratch/owner-brief.md:23-46, :50, :70, :74, :78 | 22 paraphrased points (one garbled); "Fixed... liked cool blue-gray palette"; "restrained within that palette"; "Likes D2 circular roadmap" | C/O | Paraphrase, not his words; palette replaced; circle rejected (LP L50); hues wanted | E31 | MS-9 to MS-15 |
| 71 | P2 | pro-exploration/agent-brief.md:15, :35, :45, :7-12 | "No green/red/plum page themes"; "no uppercase tracked eyebrows"; "Sources -> Oparax -> Delivery"; reading order omits LP, OI, OV, skill | C/O/L | As rows 1, 53; small caps headers wanted; read LP first | E31 | MS-44 to MS-47 |
| 72 | P2 | pro-exploration/final-plan.md:11, :19-48, :35; direction-plans-draft.md:1 | "No AI chat or AI Elements in any feed"; four directions all with centered hero; "recolored to navy/blue glow tokens" | C/O | AI Elements Sources component is in the card (LP L11) | E31 | MS-49 to MS-51 |
| 73 | P2 | site/next/NOTES.md:1, :3, :36 | "Structure-stage render"; "Blue only for actions, selected view, links" | O/C | Render rejected Oct 1; minimal color rule; product FLAGs still valid | E31 | MS-65 |
| 74 | P2 | scratch/implementation-contract.md:7, :23, :25 | "don't change palette/font"; coordinates "y180... y760" | C/O | Palette replaced; coordinate budgets are a text structure spec | E31 | MS-28, MS-29 |
| 75 | P2 | scratch/component-evidence.md:5, :9, :11, :26, :30-54, :70 | "Font choice is unresolved"; "not a bigger effect catalog"; "No autoplay topic switcher"; "Do not label Pro code available"; four arrangements; digest | O/C | Open Sans; React Bits motion wanted; Pro purchased; equal sources | E31 | MS-31 to MS-35 |
| 76 | P2 | scratch/history-product-map.md:23, :27-31, :43, :49-64; council-summary.md:16-29; ds2-visual-observations.md:24, :36, :38 | "Baseline: ... palette"; "separate daily digests"; four named directions; "controls in the header"; "hero composition... can coexist" | O/L/C | Palette; equal sources; Direct/Clustered beside heading or in sidebar (LP L19) not header | E31 | MS-17 to MS-19, MS-22, MS-23, MS-25 to MS-27 |
| 77 | P2 | scratch/roadmap-followup.md:35, :27 | "preserve the 158px circular mark"; "All labels and planned states remain visible" | C | Circle rejected; no per-item Planned label | E31 | MS-37 |
| 78 | P2 | scratch free/catalog proof files (catalog-led-verification.md:9, :14; free-component-manifest.md:7-10, :20; react-bits-setup.md:7; free-proof-verification.md:5; whole-layout-verification.md:5, :34) | per-direction lilac/plum/forest palettes; "Paid blocks... remain untested"; "No design has been accepted by the owner" | O | Rejected page themes; Pro bought; accepted renders exist | E31 | MS-40 to MS-43 |
| 79 | P2 | site/directions/d1..d4-notes.md; site/pro/d*/NOTES.md; plan-149 and pair/scope briefs; .feature/plan-151/design-refs/*; lanes/skills/frontend-design snapshot (L59, L42) | rejected palettes, stock-first design stance, "Spend your boldness in one place" snapshot copy | O/C | Archive; snapshot lacks the Coexistence block | E31 | MS-61, MS-62, MS-63, MS-66, MS-67 |
| 80 | P2 | scratch/claude-design-handoff/START-HERE.md:5, :29, :31 | navy baseline, four font candidates, 56px margins | O | Open Sans; 90% width up to 1800px | E31 | MS-68 |
| 81 | P2 | docs/references/engineering.md and design docs | no rule for no paid runs from the preview; recorded data shaped like real runs; reloading never calls a model | L | LP L44 | E7 | DD-D17 |

Counts of merged rows: P0 19, P1 50, P2 12, total 81 rows covering OUTDATED, CONFLICT and LOST findings. Raw counts across the five audits before merging: OUTDATED 63, CONFLICT 77, LOST 48, DUPLICATE 16, FINE 69. Unique line-level problems are fewer because several audits found the same line.

---

## 3. Duplicates to consolidate (one home, others point to it)

| Rule | Where it is repeated | Keep here | Risk of leaving |
|---|---|---|---|
| Palette | DESIGN.md:23 and :43, state.md:13 and :53, handoff:16 and :23, design-toolkit-proof.md:7, decisions.md:211 and :218, design-tooling.md:3 (nine places, drifting wording) | DESIGN.md palette table only; others link | Nine edits next time, one missed |
| The word "restrained" | DESIGN.md (5), design-toolkit-proof (3), state, decisions, handoff, design-tooling (11 uses) | Delete; it is the assistant's word, not his | Reads as a color budget, pushes minimal color |
| Open Sans, "Hanken until migration" | DESIGN.md:9 and :24, state:13, repo.md:114, roadmap:11 (stale), handoff:15 and :17, proof:7, decisions:218 | DESIGN.md:9 | One stale copy already (roadmap:11) |
| Official logos retain appearance | DESIGN.md:43, handoff, state, proof, decisions (7 copies) | DESIGN.md plus one line allowing real logos and images | Narrower than truth |
| Direct/Clustered placement | state:17, handoff:29, proof:37, :49, :141; ds2-visual says "in the header"; agent-brief says beside heading | Decide once with the owner (sidebar or beside title, LP L19), then one note | Agents read the first one found |
| Council rosters | repo.md:117, decisions.md:193-204 (five superseding entries), state:41, handoff:45; LP L41; OI L12 | review-lanes.md plus OI L12 for design work | Wrong lanes, stale command |
| GitHub and Product Hunt digest | roadmap:17, :21, :65-67, :142, :149; decisions:15, :151, :152; history-product-map:43; component-evidence:70 | One note: "digest today, equal source after issue 136" | Designs a separate digest |
| Feed definitions, Direct vs Clustered | proof:99, handoff:29, roadmap:55-59, decisions:55-56, OI naming rule | roadmap §4 | Different details each place |
| Page frame, footer centered vs right | DESIGN.md:58-60, decisions:20 and :23, handoff:18-19 | DESIGN.md:60 | Footer wrong in decisions:20 |
| Card shape LOCKED twice | decisions.md:60 and LP L11 | Cross-reference | Two LOCKED definitions |
| Dictation rule, four wordings | AGENTS.md:7, AGENTS.md:22, global AGENTS.md:1, RLD "unedited" | Global AGENTS.md:1 plus a single "quote raw, act on inferred" sentence | Model must choose between "infer" and "unedited" |
| Em-dash and browser bans | AGENTS.md:7, :73, :42; global AGENTS.md:6-7 | Global file only | Spends the 10 characters of headroom in a 9,000 cap file |
| Codex skill list | feature/SKILL.md:87, :172, qc/SKILL.md:117 | Define once in design-tooling.md and reference | New skill added to one copy only |
| Research boundary / reading ceiling | feature:159, qc:111, review-lanes:20; feature:42, :158, amend:41, qc:110 | review-lanes.md | Drift |
| "Look you approved on September 29" | plan-151-owner.md:63, issue-body.md:64, amend-151-1-owner.md:7 | Mark all as superseded | Read as authority (dated owner passages are his decisions per AGENTS.md) |
| Vendor skill copies | ~/.claude/skills/{frontend-design, web-design-guidelines, ai-elements} are real copies of ~/.agents/skills | Replace with symlinks | Fix in one reaches Claude Code sessions never |
| Reduced-motion and caps-label rules | emil-design-eng:529 vs accessibility:289-297; frontend-design, design-review, react-bits-pro, web-design-guidelines | RLD Coexistence note says which wins | Opposite wording |
| Roadmap platform lists | owner-brief:70, :74, :78 (three definitions) | LP L50 | Agent picks any |
| Free-proof manifests | catalog-led-verification vs free-component-manifest; direction-plans-draft vs final-plan | Mark older ones historical | Different block choices |

---

## 4. Where reference-led-design should be referenced so agents find it

Ordered by how many agents pass through the file.

| Priority | File and line | What to add | Why this spot |
|---|---|---|---|
| 1 | AGENTS.md:13 (visual work paragraph) | Name the skill and the direction file; "his words verbatim; judge from rendered pages beside a reference board" | Every agent in every harness reads it; today it says "the current brief" |
| 2 | design-tooling.md:3 and Roles and loading L7-14, plus the conflict list L24-33 | Router bullet and a coexistence line | Every design-touching stage reads it (build:54, feature:59, qc:95) |
| 3 | feature/SKILL.md:87 (ui bundle row) and :172 | Add the skill name to both lists | Skills-consult lines are built from this row |
| 4 | qc/SKILL.md:117 and :93-95 | Add to the list; compare shots to the board | Nine QC lanes and the screenshot step |
| 5 | feature/SKILL.md:59-63 (step 1, 1.1) | Trigger sentence and "show rendered pages at step 4" | The only place a new look is decided |
| 6 | amend/SKILL.md:64 and :69 (where "UI checkpoint" is cited), :40 | Replace the dead pointer; name the board beside the standalone-preview allowance | The only place that already legalizes render-then-compare |
| 7 | state.md:13 (Current design task) and the Toolkit section near :47 | One line pointing to the skill, LP, OI, OV | Read first at host start and after compaction |
| 8 | DESIGN.md header, after L13 (needs his yes) | Pointer: "his later verbatim words and the board outrank this file" | The binding contract |
| 9 | decisions.md:125 (installed design skills list) and the new October section | List the skill; append the dated rulings | AGENTS.md says quote decisions.md |
| 10 | planning-protocol.md:7 | Detailed-planning briefs name board folder and verdict files | Fable and Astra drafts |
| 11 | council SKILL.md:73-88 and review_guidance.py:231-236 | Design critique line and precedence line | Lanes read the index, not each skill |
| 12 | One-line precedence at the top of frontend-design (L45), react-bits-pro (L51), design-review (SKILL.md), shadcn (SKILL.md) | "If the owner's verbatim words or reference-led-design are present, they win over this file's look defaults." | An agent loading only one vendor skill never reaches RLD |
| 13 | scratch/design-recovery/README.md line 1 and the top of each superseded scratch plan | STATUS banner to LP, OI, OV | Entry point of the folder |
| 14 | docs/references/claude-design-handoff.md:7 (Read first) | Retire or add banner | Current "Read first" is all prose |

One constraint: AGENTS.md is at 8,990 of 9,000 characters, so the pointer in row 1 has to be paid for by deleting duplicates (see E10).

---

## 5. Proposed edits (NOT applied). Each is small and surgical

Gate legend: [OWNER] needs his explicit yes (DESIGN.md:13, decisions.md:165, AGENTS.md owner-approval rule); [HOST] pointer or banner, no behavior change; [GLOBAL] edits a global skill outside the repo, so it affects every project.

**A. Record the October 1 and 2 rulings (the root fix)**
- E1 [OWNER] DESIGN.md:23, :43 and palette table L28-43: replace the navy-only wording with the black/grey/blue darkish range, visible blue accent on actions and selection, several functional hues each with one job (status green/amber/red; per source kind), depth from soft light, real logos and images allowed. Quote OV and LP L56/L59/L70 verbatim beside it. Delete "restrained" and "not green, red or unrelated page themes".
- E2 [OWNER] DESIGN.md:25 and :67: replace "restrained shadows" and "Do not add a shadow to every nested element" with depth from light: one surface lifted off a quieter ground, soft radial light, layered neutral shadow, top-lit edges.
- E3 [OWNER] DESIGN.md:66: keep "Green, amber, and red communicate meaningful states"; add "Other hues carry one job each."
- E4 [OWNER] DESIGN.md:80: replace the open-decisions list with the current one: Oct 1 card contract decided; three directions landed and unpicked; pending questions from LP.
- E5 [OWNER] decisions.md: append an "October 1 and 2, 2026" dated section quoting OV and LP verbatim (palette replaced, functional color, objects not paragraphs, feed as carrier, equal sources, naming, images, board method, global skill, design lanes). Tag L211, L218 (palette and "No green/red" clauses only), L131, L15, L19, L20, L123, L165 as "SUPERSEDED Oct 2 in part". Do not rewrite history.
- E6 [HOST after E1/E5] state.md: rewrite L3 date, L13, L15, L17, L53-55 to the Oct 2 state with pointers to the skill, LP, OI, OV.
- E7 [HOST] engineering.md:13: change "Illustrative counts are fixed text" to "No invented counts; counts come from stored values or are omitted." Add LP L44 rule (recorded data shaped like real runs; reload never calls a model; no paid runs from the preview).
- E8 [HOST, product-change notes] roadmap.md L11 (font: Open Sans), L57 (card per LP L11), L93 and L151 (remove "the export is the plan's visual contract"), L17/L21/L65-67/L142/L149 and decisions L15 (add: "digest today; equal source after issue 136"), AGENTS.md:5 (one pointer to the pending change).
- E9 [OWNER] Give the rulings a tracked home. Copy LOCKED-PLAN (Oct 1 evening onward), OPEN-ITEMS and owner-verdict into docs/references (for example docs/references/design-direction.md), so sessions outside scratch/ and fresh clones can see them. AGENTS.md should point there, not into git-ignored scratch/.

**B. AGENTS.md (cap 9,000; today 8,990)**
- E10 [OWNER] Line 13: replace "the current brief and original feedback" with "the reference-led-design skill, the owner's verbatim feedback and docs/references/design-direction.md". Add one sentence: "Pass his words verbatim to every subagent and lane; judge design from rendered pages beside a reference board, not text briefs." Name the design roster (OI L12) where "Preserve rosters" appears (L34). Pay for it by deleting: the dictation and em-dash sentence in line 7 ("Infer dictated mishearings... Never use em dashes."), because the global AGENTS.md states both; and the duplicated "Infer dictated wording; ask only when..." in line 22 (about 130 characters total, enough for the new text). Add to line 21: "A global statement from him about color or theme does change the theme, through the DESIGN.md approval step."
- E11 [OWNER] Line 30: replace "The current initial exploration adds no mandatory design stop elsewhere." with "reference-led-design adds no mandatory stop for work inside an accepted direction."
- E12 [OWNER] Line 19: change to "Annotation selectors, DOM, CSS, coordinates, captured text and annotation screenshots are generated evidence...; screenshots he picks as references are inputs to match."
- E14 [OWNER] Line 46 (uncommitted): decide before committing. Suggested: keep the rule but add "except reference boards, renders and verdicts for design work".
- E15 [OWNER] Line 42: add "except standalone design previews under engineering.md".

**C. Feature flow and design-tooling**
- E16 [HOST, text follows E1] design-tooling.md:3: delete "restrained navy/blue around D1 or toward D2, harmonious blue gradients"; point to the DESIGN.md palette; replace "the current visual brief" with "the owner's verbatim words and the board"; broaden "Only official logos retain..." to real logos and images; L16 "owner brief wins" to "his verbatim words win".
- E17 [HOST] design-tooling.md L7-14 and L24-33: add reference-led-design as method skill for any new look, rejected visual work, or extension to a new screen; one coexistence bullet from RLD L43-47.
- E18 [HOST] design-tooling.md L20, L22: drop "navy-tinted"; add that functional hues (status, per source kind) are semantic tokens beside the four knobs.
- E19 [HOST] design-tooling.md:47: replace the four-direction sentence with the current state (three accepted renders, not picked).
- E20 [HOST] design-tooling.md:41: change "27" to "28" or drop the count.
- E21 [HOST] design-tooling.md:33: add "depth comes from light and layered shadow".
- E22 [HOST] feature/SKILL.md:87, :172 and qc/SKILL.md:117: add `reference-led-design` (Codex form `$reference-led-design`) to all three together.
- E23 [HOST] feature/SKILL.md:41: add "standalone design previews in scratch/ are allowed; the product app is never started" (matches amend:40).
- E24 [HOST] feature/SKILL.md:59-63 and :105: add a trigger sentence ("if he rejected the look, pointed at other products' screenshots, or an accepted design extends to a new screen, run reference-led-design first and show rendered pages, dark and light, with one paragraph each, next to the plan"); add that a DESIGN.md palette change is proposed at step 4 as a decision line with the render as evidence.
- E25 [HOST] feature/SKILL.md:63: change "written into that slice so the build does not guess them" to say blocks, depth and motion are chosen after the board and renders exist.
- E26 [HOST] feature/SKILL.md:145 and amend/SKILL.md:93, :109: slice fields add dated verbatim quotes, board path and reference images, numbered criteria, accepted render path.
- E27 [HOST] feature/SKILL.md:162-170 and qc/SKILL.md:93-95, :113-118: add one visual lens ("as a human looking at this, does it land, is it aligned, does it use components imaginatively"); pass board and shots/ to lanes; QC compares to the board and rejected renders, not only DESIGN.md.
- E28 [HOST] amend/SKILL.md:64, :69: replace "UI checkpoint" with a pointer to feature step 1.1; :67 add "for visual feedback quote him verbatim and attach the images; the cap is for code findings".
- E29 [HOST] planning-protocol.md:7: add board folder and verdict files to detailed-planning briefs.
- E30 [HOST] build/SKILL.md:71: no change. Add one sentence in design-tooling.md that design-exploration builders run as host-launched standalone previews outside run-plan.

**D. Banners and cleanups**
- E31 [HOST] One STATUS line at the top of each superseded file (bodies untouched): scratch/design-recovery/README.md, owner-brief.md, implementation-contract.md, component-evidence.md, history-product-map.md, council-summary.md, roadmap-followup.md, catalog-led-verification.md, free-component-manifest.md, claude-design-handoff/START-HERE.md, pro-exploration/{next-plan, final-plan, direction-plans-draft, agent-brief}.md, site/next/NOTES.md, docs/references/claude-design-handoff.md, design-toolkit-proof.md. Text: "SUPERSEDED Oct 1 and 2 for palette, hero, directions and fonts. Current: focus-review/LOCKED-PLAN.md (from the Oct 1 evening section), OPEN-ITEMS.md, council-skill/owner-verdict.md, reference-led-design skill."
- E32 [OWNER, it is his locked plan] LOCKED-PLAN.md: strike or annotate L25-36 ("Structure/visual split withdrawn Oct 1 evening, see rejection") and update L41 to the OI L12 roster.
- E33 [HOST] .feature/amend-151-1.md top: "Tokens and Hanken here are superseded (Open Sans; palette replaced Oct 1). QC and amend must not revert the product to them."

**E. Global skills (these edit shared files under ~/.agents/skills)**
- E34 [GLOBAL] frontend-design: L45 add "the owner's verbatim words and reference-led-design win"; L13 replace "memory as a hint" with "read his verbatim words where they exist"; L59 qualify "one place" with "unless the brief asks for life across the page"; L25-28 note caps section labels are allowed when asked.
- E35 [GLOBAL] react-bits-pro: L51 limit "single source of truth" to API and licensing; L605 and L641 say Job B defaults apply only when there are no owner words and no board.
- E36 [GLOBAL] design-review: checklist L28 "Palette matches the brief; accent and status hues each have one job"; L6/L10 allow dense feeds; SKILL.md L10-17 default telemetry and Pro upload off; add the board comparison step to L19-32. web-design-guidelines: add a product-language summary above the terse list.
- E37 [GLOBAL] council: review_guidance.py L231-236 one-line precedence; SKILL.md L73-88 design critique template with the "does it land" question, board path, and images.
- E38 [GLOBAL] shadcn: note where the brand accent maps (`--primary` vs `--accent`), that status colors and registries are answered, and that composition may override stock colors when the brief asks.
- E39 [GLOBAL] beautiful-shadows: dark-mode paragraph (luminance steps, top-lit edge). ai-elements: routing from need to component for onboarding. emil-design-eng: note feed life is wanted. Optional: swap purple examples.
- E40 [GLOBAL] Replace the real copies in ~/.claude/skills (frontend-design, web-design-guidelines, ai-elements) with symlinks to ~/.agents/skills.

Suggested order: E9 and E5 first (they create the tracked record), then E1 to E4 with one yes from him, then E10 to E15 (AGENTS.md), then E16 to E30 (routing), then E31 to E33 (banners), then E34 to E40 (global).

---

## 6. Things that are fine and should be left alone

Keep: AGENTS.md "explain product behavior first", "later rulings outrank history", the reread-after-compaction rule, the theme-approval safeguard, provenance recording, council staying owner-invoked (AM-19 to AM-27); DESIGN.md page frame, Open Sans target, honest runtime status, stock components, accessibility and motion lines (DD-F1 to F10); design-tooling.md shadcn/React Bits/AI Elements roles and accessibility facts (FF-F8, F9); verbatim-owner-words rules in feature:49, :55 and planning-protocol:7 (FF-F19); the review-lane roster, ship, promote, run-plan, lint and the .agents wrappers (FF-F31 to F34); the DESIGN.md update guard itself; amend:40 standalone-preview sentence; accessibility and web-design-guidelines rules; the react-bits-developer-tool wrapper; catalog-assets.md provenance; ds2-original-feedback.md verbatim file; next-plan.md L7-10 card spec; agent-brief.md L60 "LOOK at every image". Memory: no project memory files exist (the Basic Memory store was not searched).
