# Audit: feature flow stage skills and their references

Scope: `.claude/skills/` (feature, amend, build, qc, ship, promote, run-plan, lint, and `feature/references/*`) and `.agents/skills/` (Codex wrappers and the canonical build skill). Read-only audit, October 2, 2026. Paths are relative to `/Users/farzanm4/Desktop/repos/oparax`.

Truth citations used below:
- LP = `scratch/design-recovery/focus-review/LOCKED-PLAN.md` (line numbers of that file)
- OI = `.../OPEN-ITEMS.md`
- OV = `.../council-skill/owner-verdict.md`
- RLD = `/Users/farzanm4/.agents/skills/reference-led-design/SKILL.md`

Classes: OUTDATED, CONFLICT, DUPLICATE, LOST, FINE.

## 0. Map of every design step in the flow

| # | Where | What happens today | Look judged from |
| --- | --- | --- | --- |
| D1 | `feature/SKILL.md:59` step 1 "Screens" | Read design-tooling, search catalogs, record chosen blocks, reuse "the accepted visual reference" | Text, plus an unnamed accepted reference |
| D2 | `feature/SKILL.md:63` step 1.1 | One line per screen; ui bundle decides controls, blocks, depth, motion in text | Text |
| D3 | `feature/SKILL.md:69-78` step 2 and `:105` step 4 | Plain plan (no code terms) is what the owner approves | Text |
| D4 | `feature/SKILL.md:87` step 3 ui bundle | Loads 7 skills; "read root DESIGN.md first, the binding visual contract" | DESIGN.md (navy) |
| D5 | `feature/SKILL.md:145` step 5.1 | Slice records block source, access, "accepted visual reference", adaptations | Text fields |
| D6 | `feature/SKILL.md:155-172` step 6 critique | Eight read-only lanes review plan text; lens card has no visual lens | Text |
| D7 | `amend/SKILL.md:40,64,69,85` | Design research allowed; "UI checkpoint" referenced; plain amendment capped and paraphrased | Text |
| D8 | `.agents/skills/build/SKILL.md:54,71` | Builder reads design-tooling, implements selected blocks; no server, no browser | Plan slice only |
| D9 | `qc/SKILL.md:91-95` step 4a | Headless screenshots (1280/390, dark/light) of journey pages, reviewed by `design-review` and `accessibility` against accepted preview and DESIGN.md | Screenshots, but no board |
| D10 | `qc/SKILL.md:113-118` lanes | Nine lanes read code and brief only; no images passed | Code |
| D11 | `ship/SKILL.md` | Owner localhost walk; DESIGN.md swept as meta | Owner eyes |
| D12 | `feature/references/design-tooling.md` | Router for all of the above | See findings |
| D13 | `promote`, `run-plan`, `lint`, `orchestration.md`, `build-handoff.md`, `planning-protocol.md`, `review-lanes.md` | No design logic | n/a |

Key structural fact: the flow has no design-exploration stage. The only place a rendered direction is produced is inside feature step 1 / amend step 2 as host "research" (`amend/SKILL.md:40` "standalone design previews in the background"; `docs/references/engineering.md:24`). The method that produced the accepted renders (RLD) ran outside the flow, in `scratch/`. The flow therefore currently has nowhere that tells an agent to use it.

## 1. Findings

### `.claude/skills/feature/references/design-tooling.md`

**F1. CONFLICT / OUTDATED. `design-tooling.md:3`** Quote: "Use restrained navy/blue around D1 or toward D2, harmonious blue gradients and coherent light mode." Current truth: palette fixed input replaced by "a black, gray and blue range with his blue accent" (LP:56); "too blue and too just monotone... at max 2 colours" (LP:55); functional color yes (LP:59, LP:70); "one dark color theme, but... so much life... in the colors" (OV:16); several hues each with one job (RLD:31). Risk: this is the first paragraph every design-touching agent reads. "Restrained" plus "navy" reproduces the exact palette the owner rejected on October 1 and 2. Pushes toward minimal color.

**F2. CONFLICT. `design-tooling.md:3` and `:16`** Quote: "Read DESIGN.md and the current visual brief." and "The owner brief wins on aesthetics, composition and scope". Current truth: "Plan from these [verbatim words], never from a summary" (RLD:20); "The owner's later verbatim words always outrank this file" (RLD:8); "a lot of this is just briefs" and the board of real screenshots as the shared reference (LP:61). Risk: points agents at a text brief as the authority. A brief is an assistant summary; it loses points the owner already made (LP:61 lists 10 missed points). Text-only-brief push, and summarizing-the-owner push.

**F3. OUTDATED. `design-tooling.md:20`** Quote: "a coherent navy-tinted `--color-neutral-*` ramp for surfaces/text/borders". Current truth: black/grey/blue darkish palette with depth from soft light and shadow, "not the old navy-only palette" (LP:56; RLD:32). Risk: agent tints every neutral navy again. Also the "four-knob" theme has exactly one accent knob; RLD:31 and LP:61 want a visible brand accent plus a hue per kind of thing. A builder following L20 and L22 ends with one blue and no functional hues.

**F4. CONFLICT. `design-tooling.md:22`** Quote: "blue action accent plus its foreground via `--rb-accent`/`--rb-accent-fg`" and "Keep Bento tiles outside .rb-theme-scope". Current truth: vendor "one accent, used at most once" defaults yield to the brief (RLD:45); every hue has one job (RLD:24). The four-knob theme is fine as plumbing for the blue accent but is silent on the hue-per-source-kind and status hues the owner approved (LP:67, LP:70). Risk: functional colors get stripped as "not in the theme". Mild; needs one added sentence, not a rewrite.

**F5. OUTDATED. `design-tooling.md:47`** Quote: "The next exploration produces four complete directions, each with landing and feed, each feed with Direct and Clustered views... The current readiness task prepares the Claude handoff; the handoff starts page exploration." Current truth: three directions (Window, Newsroom, Deck) were built and accepted in all of dark and light (LP:64); the feed is the carrier and the landing follows from it (LP:57); directions differ in composition and where color lives, "never one layout in several palettes" (RLD:24); exploration did not go through Claude Design handoff. Risk: an agent restarts a four-direction landing-plus-feed exploration via the handoff doc instead of continuing from the three accepted renders. The sentence "A build does not prove visual fidelity" in the same paragraph is FINE and should stay.

**F6. LOST. `design-tooling.md:5-14` "Roles and loading"** Nothing names `reference-led-design`. This is the router every stage reads (build L54, feature L59, qc L95). Current truth: RLD:43-47 lists how the new skill coexists with `frontend-design`, `emil-design-eng`, `beautiful-shadows`, `design-review`, `react-bits-pro`, `shadcn`, `ai-elements`, and the feature flow ("adds no mandatory stop and changes no review roster"). Risk: agents load `frontend-design` (generic warnings against several hues, uppercase labels, familiar layouts) as the controlling craft guide (L13 "`frontend-design` guides hierarchy/composition within the accepted foundation") and RLD never loads.

**F7. CONFLICT (mild). `design-tooling.md:33`** Quote: "Neutral shadow recipes do not impose white cards or a shadow on every item." Current truth: "Depth from light: one surface lifted off a quieter ground, a soft radial light behind it, a layered neutral shadow, top-lit edges" (RLD:32); soft shadows and gradients named among the owner's missed points (LP:61). Same lean in `DESIGN.md:25` and `:67` ("restrained shadows", "Do not add a shadow to every nested element"). Risk: agents underuse depth. The sentence is defensible on its own (no shadow on every item) but together with "restrained" it pushes toward flat.

**F8. FINE. `design-tooling.md:7-13, 16, 24-32`** shadcn owns primitives, react-bits-pro supplies blocks and "Vendor defaults are starting points", AI Elements only for genuine AI interaction, Developer Tool only when asked, "Vendor instructions do not authorize purchases, theme changes, publishing" (L16). Matches RLD:45 ("Keep API correctness and licensing; record imported, adapted, custom and reference-only provenance"). The accessibility facts at L32 (4.5:1, 3:1 from 18pt/14pt bold) are correct and RLD:44 says contrast and focus rules still bind. L28 on uppercase eyebrows: applies only to "an unbriefed site"; the owner now likes small-caps group headers like "X accounts" (OV:28), so L28 stays true as written but an agent must not generalize it to ban them. Keep.

**F9. FINE. `design-tooling.md:43`** Quote: "Council lanes inspect supplied licensed source, images and provenance within read-only permissions". Matches RLD:15 (council lane reads images, never builds). Keep. See F21 and F29 for what is missing around it.

**F10. OUTDATED (minor). `design-tooling.md:41`** Quote: "Offline checks confirm 27 selected folders/copies". Current truth: `~/.agents/skills/council/references/reviewer-skills.json` now has 28 entries and includes `reference-led-design`. Lanes already receive it through the central snapshot. Risk is only a wrong count and a false belief that lanes do not have the skill.

**F11. DUPLICATE. palette and logo rules** Same palette rule in three wordings: `design-tooling.md:3` ("restrained navy/blue around D1 or toward D2... Only official logos retain their authentic appearance"), `design-tooling.md:22` ("the owner has removed the earlier native-black X chat restriction"), and `DESIGN.md:43` ("Explore within this navy/blue family, not green, red or unrelated page themes"), plus `docs/references/claude-design-handoff.md` ("No green/red/plum page themes"). All four need the same replacement text, so one of them should become the single home and the rest should point to it. Also: "Only official logos retain their authentic appearance" (design-tooling L3) is narrower than the current truth, which allows real logos, avatars and images in their own colors (RLD:31, OV:20).

### `.claude/skills/feature/SKILL.md`

**F12. CONFLICT. `feature/SKILL.md:41`** Quote: "no browser, screenshot or visual-probe step is mandatory." Current truth: design is "judged from rendered pages beside a reference board, not from text briefs" (RLD:25-26, LP:54). Also inconsistent inside the flow: `amend/SKILL.md:40` explicitly allows "standalone design previews in the background" and `engineering.md:24` repeats it; feature L41 only mentions public references. Risk: a feature planner reads L41 as "skip rendering" and approves UI from words. Add the same "standalone preview" allowance, and say the product app is still never started.

**F13. CONFLICT. `feature/SKILL.md:63` (step 1.1)** Quote: "which shadcn controls and React Bits Pro structural, visual or motion blocks, where depth goes per `beautiful-shadows`... whether anything moves per `emil-design-eng`... are written into that slice in step 5.1 so the build does not guess them." Current truth: components, depth and motion are chosen after directions and looking at the board (RLD:24 step 5); "Text-only briefs scoped to 'structure only, ignore polish'" is listed as a failure (RLD:39); structure was judged without the look and nothing landed (LP:54). Risk: structure and component choice are fixed in text before any render exists. This is the "structure-before-look" path: the slice then forces the builder to implement text-chosen blocks.

**F14. LOST. `feature/SKILL.md:59`** Quote: "Reuse the accepted visual reference; Claude Design is optional... respect DESIGN.md until a rendered direction and any departures are approved in the normal plan discussion. Do not force another design stop for a screen using an already accepted direction." Good parts (FINE): requires a rendered direction before departing from DESIGN.md; no extra mandatory stop, which matches RLD:47. What is missing: "the accepted visual reference" is not defined or located. Today the accepted material is the three council renders (Window, Newsroom, Deck; `scratch/design-recovery/focus-review/renders-council/*`), the owner has not picked one (LP:64), and the verdict is in OV. Nothing in the flow says where these are, that a pick is pending, or that new screens (landing, onboarding, settings) are the case RLD:3 names as "an accepted design must be extended to new screens". Also there is no trigger for the loop: "owner rejects visual work, says no life, points at other products' screenshots" (RLD:3) is not a routing condition anywhere in feature or amend. Risk: a planner invents a new direction or uses the old navy previews as "the accepted reference".

**F15. CONFLICT. `feature/SKILL.md:87` (ui bundle row)** Quote: "read root `DESIGN.md` first, the binding visual contract... `frontend-design` for composition within the accepted reference and design contract". Current truth: `DESIGN.md:23,43` still carries the navy palette; DESIGN.md changes need the owner's explicit approval (`DESIGN.md:13`), and no such approval for the new palette is recorded in the files I was told to treat as current (OI:3 "Nothing here is applied to the renders yet"). So "binding" currently means the rejected palette. Risk: every plan that touches UI carries navy tokens into the slice. See F18 for the guard that blocks the fix.

**F16. LOST. `feature/SKILL.md:87` and `:172` (and `qc/SKILL.md:117`)** The ui bundle lists `vercel:react-best-practices`, `shadcn`, `react-bits-pro`, `frontend-design`, `web-design-guidelines`, `accessibility`, `beautiful-shadows`; the Codex global-skill list at L172 lists `shadcn`, `frontend-design`, `web-design-guidelines`, `accessibility`, `beautiful-shadows`, `emil-design-eng`, `design-review`, `react-bits-pro`, `react-bits-developer-tool` and `ai-elements`. Neither contains `reference-led-design`. Current truth: the owner ordered a global skill for all models and council lanes (LP:66, OV:8, OV:14). It exists at `~/.agents/skills/reference-led-design` and is in the council manifest. Risk: planners, Codex lanes and the QC consult line never name it, so no skill-checklist step loads it. Needs adding in three places that must stay identical (feature L87, feature L172, qc L117); that triple is itself a DUPLICATE hazard (F30).

**F17. CONFLICT (summarizing). `feature/SKILL.md:69-78` and `:105`** Quote: "Write 'the plan' in exactly this six-section format (no code terms, no file paths, no framework language anywhere in it)" and "Nothing below starts until the owner has said yes to this exact document". Current truth: show rendered pages, one plain paragraph each, plus yes or no questions for anything touching a locked spec; "Do not send a plan or a memo instead of pages" (RLD:26). Risk: for UI screens the owner's approval is a text list ("every screen in one line", L71). He cannot judge "does it land" from a sentence. Text-only-brief push. The six-section format is right for behavior; the gap is that step 4 has no slot for rendered pages for screens whose look is new.

**F18. FINE (guard) with LOST. `feature/SKILL.md:45`** Quote: "DESIGN.md and the theme tokens in `app/globals.css` are changed only when the owner explicitly approves that exact scoped change in the current session; propose a required change at step 4 as a decision line". FINE as a guard, and the same rule is in `AGENTS.md` and `build` L41. LOST: nothing tells an agent that the palette change (black/grey/blue plus functional hues, LP:56, LP:59, LP:70) is a queued DESIGN.md decision. Following the flow literally, a feature that implements the feed will build in navy and park the change forever. The decision line must be proposed at step 4 with the render as evidence.

**F19. FINE. `feature/SKILL.md:49, 55`; `planning-protocol.md:7`** "Only a line that carries an owner attribution with a date... is the owner's word: take those as given and preserve them as his original words"; "Preserve the owner's original messages and references, including uncertainty and later corrections"; "Preserve original owner messages and corrections separately from assistant interpretations". These match RLD:20 and the AGENTS.md visual-feedback section. Keep. Gap in F20 and F27: the verbatim words stop at the planning host and do not reach the slice or the builder.

**F20. LOST. `feature/SKILL.md:145` (step 5.1)** Quote: "Each screen records the exact template/block source, access requirement, accepted visual reference and adaptations". Missing slice fields the method needs: the owner's verbatim quotes with dates for that screen, the board path and the specific reference images, the numbered acceptance criteria (RLD:23), and the path of the accepted render the screen must match. Without them the builder has only text (see F22).

**F21. LOST. `feature/SKILL.md:162-170` (critique lens card)** Eight lenses: frame-attack, contract-completeness, internal-consistency, external-limits, principles, security-trust, silent-failure, pauses. None asks "as a human looking at this, does it land, is it aligned, does it use components imaginatively" which LP:54 requires "from now on" for council briefs; RLD:39 lists "A council asked to audit truth but never asked whether it lands" as a failure. The critique runs on plan text only, so even a visual lens would have nothing to look at. For plans with new-look screens the brief should also pass the board folder and the render images, and the acceptance criteria. Not a conflict for non-UI plans.

### `.claude/skills/amend/SKILL.md`

**F22. CONFLICT (summarizing). `amend/SKILL.md:66-67`** Quote: "Exactly three short parts... **What you asked for, in one or two sentences**, restated in the plan's plain voice" with a 1,500 character cap rationale. Current truth: the host "never summarizes the owner where his words exist" (RLD:14); AGENTS.md visual-feedback section says to retain original feedback and screenshots and reconcile the whole batch. Risk: design amendments (owner pastes an annotated batch or a verdict like OV) get compressed into two sentences, losing points and screenshots. Add: for visual feedback, quote verbatim and attach images; the cap is for code findings, which was its stated reason.

**F23. OUTDATED. `amend/SKILL.md:64` and `:69`** Quote: "run the same UI checkpoint if it touches a user-facing surface" and "(and the UI checkpoint if it applies)". There is no UI checkpoint in `feature/SKILL.md` anymore; step 1 now says "Do not force another design stop" (feature L59). Risk: an agent invents a mandatory design stop, the opposite of RLD:47. Replace with a pointer to feature step 1.1 and the new skill's trigger conditions.

**F24. FINE. `amend/SKILL.md:40`** "the planning host may research public references and standalone design previews in the background. Never start or attach to the product app." This is the one sentence that legalizes the render-then-compare loop in the flow. Keep, copy to feature L41 (F12), and name the board and RLD here.

**F25. LOST. `amend/SKILL.md:93`, `:109`** The detailed amendment step is "the code change in prose". For a visual amendment there is no field for the board images or criteria (same gap as F20).

### Build and QC

**F26. CONFLICT (conditional). `.agents/skills/build/SKILL.md:71`** Quote: "No servers, no browsers, no gates. Never run `pnpm dev`... never open a browser or computer-use tool." Current truth: the builder "screenshots its own pages (dark and light, real widths) and reads them beside the references and the rejected renders" (RLD:25). Not a defect for run-plan builds: RLD:3 says it is "Not for routine builds inside an already accepted direction", and L71 is an owner-set stage boundary. But it means no builder in the flow can follow RLD steps 5-6. The design-exploration builder must run as host-launched standalone preview work under the engineering.md:24 exception, outside run-plan, and the flow should say so rather than leave a builder to trip the rule. Do not loosen L71 without the owner.

**F27. LOST. `.agents/skills/build/SKILL.md:54` and `:29`** Quote: "Design: read `.claude/skills/feature/references/design-tooling.md` and implement the plan's actual selected blocks and accepted reference." FINE for routine builds. LOST: the builder reads only the slice and shared contracts (L29), so the owner's original words, the screenshots and the board never reach it unless the slice quotes them (F20). Also inherits F1, F3 from the file it is told to read. `.claude/skills/build/SKILL.md:12,16` is only a pointer to the canonical file: FINE.

**F28. LOST / CONFLICT. `qc/SKILL.md:93-95` (step 4a)** Quote: "The QC session reviews the images itself with `design-review` and `accessibility` loaded, against the slice's selected template/block and accepted preview (including a Claude Design export when provided), plus DESIGN.md". FINE mechanics: headless, off-screen, 1280 and 390 wide, dark and light, saved under the round dir (matches RLD:25 and the AGENTS.md rule that browsers stay in the background). Problems: (a) the comparison set is "accepted preview plus DESIGN.md", so the navy DESIGN.md is the yardstick (F15); (b) no board, no owner verdicts, no rejected renders, so QC cannot say "this cannot be mistaken for anything he rejected" (RLD:25); (c) a Claude Design export is named as the reference, which is no longer the process; (d) the screenshot agent "never clicks through a journey", so open states are never captured, and OI:14 item A says the owner's main complaint is needing a click to read stories.

**F29. LOST. `qc/SKILL.md:111, 113-118`** The nine lanes receive the brief and code; the brief text never lists the `shots/` folder, and the research boundary says "launch a browser" is forbidden (fine, reading images is not). Lens card at L115 has seven lenses, none visual. So a UI slice gets code correctness review only; nobody asks whether it lands. Same gap as F21.

**F30. DUPLICATE. `qc/SKILL.md:117` vs `feature/SKILL.md:172`** The Codex global-skill name list (shadcn, frontend-design, web-design-guidelines, accessibility, beautiful-shadows, emil-design-eng, design-review, react-bits-pro, react-bits-developer-tool, ai-elements) is repeated word for word. Related duplicates with identical or near-identical wording: research boundary (`feature/SKILL.md:159`, `qc/SKILL.md:111`, `review-lanes.md:20`), reading ceiling (`feature/SKILL.md:42,158`, `amend/SKILL.md:41`, `qc/SKILL.md:110`), "owner reads product language" (`feature/SKILL.md:36`, `amend/SKILL.md:36`). Low immediate risk; the risk is drift when the new skill is added to one copy only.

### Everything else

**F31. FINE. `.claude/skills/feature/references/review-lanes.md:3-20`** Fixed profiles include Astra, Grok, Kimi, GLM, Muse, both agy lanes, Opus and (QC) Sol: a superset of the owner's design council (OI:7 "Astra, Grok, Kimi, plus agy (Gemini), Muse Spark and GLM"). "Remains explicit-owner-invoked only" and "Do not add or remove a runner lane" are consistent with OI:14 item C (RLD must not tell agents to start council). The skill's "Council lane (read-only)" role (RLD:15) fits the lane permissions. No change needed except that QC and critique briefs should hand lanes the images (F21, F29).

**F32. FINE. `ship/SKILL.md`** Ship guards on independent QC PASS and the owner's localhost walk; sweeps `DESIGN.md` as a meta path (L17, L23, L27). No design logic to conflict. The owner's walk is where visual acceptance really happens, which matches "Show, then record" (RLD:26).

**F33. FINE. `promote/SKILL.md`, `run-plan/SKILL.md`, `lint/SKILL.md`, `feature/references/orchestration.md`, `feature/references/build-handoff.md`, `feature/references/planning-protocol.md` (except the one LOST below)** No design, palette, render or screenshot content (searched). `lint/SKILL.md:20` says "browser checks are out" for lint only: fine.

**F34. FINE. `.agents/skills/{amend,feature,promote,qc,run-plan,ship}/SKILL.md` and `*/agents/openai.yaml`** Thin Codex wrappers that point at the canonical `.claude/skills/*` files. No independent design text, so no duplication of design rules there. Updating the `.claude` files updates Codex. `allow_implicit_invocation: false` throughout: fine.

**F35. LOST (small). `planning-protocol.md:7`** "Each detailed-planning brief names the exact approved owner plan, relevant repository source, selected skill rules with their source paths". For a UI component the brief should also name the board folder and the verdict files, or the two independent drafts (Fable, Astra) design from text.

## 2. Counts per class

| Class | Count | Findings |
| --- | --- | --- |
| OUTDATED | 5 | F1, F3, F5, F10, F23 |
| CONFLICT | 9 | F2, F4, F7, F12, F13, F15, F17, F22, F26 (conditional) |
| DUPLICATE | 2 | F11, F30 |
| LOST | 11 | F6, F14, F16, F18, F20, F21, F25, F27, F28, F29, F35 |
| FINE | 8 | F8, F9, F19, F24, F31, F32, F33, F34 |

35 findings, each counted once under its main class. F1 is also a CONFLICT, F18 is a FINE guard with a LOST gap, F28 is FINE mechanics with LOST and CONFLICT parts.

## 3. Where the reference-led-design method should plug in

1. **Router first:** `design-tooling.md` "Roles and loading" (L7-L14): add `reference-led-design` as the method skill for any visual direction, rejection or extension to new screens, with the coexistence rules from RLD:43-47 added to "Resolving actual skill conflicts" (L24-L33) as one bullet. Replace the F1, F3, F5 text.
2. **Trigger and rendered-first:** `feature/SKILL.md` step 1.1 (L61-L65) and `amend/SKILL.md` step 2 (L64). Condition: screen has a new look, owner rejected visual work, or an accepted design is extended to a new screen. Action: run RLD steps 1-4 (owner's verbatim words, board, plain-words difference, numbered criteria) and 5-6 as standalone preview work under the existing `amend/SKILL.md:40` and `engineering.md:24` allowance; show pages, not a plan (RLD:26). A screen inside an already accepted direction takes the existing no-extra-stop path (feature L59).
3. **Step 4 approval:** for those screens the approval document carries rendered pages (dark and light) with one paragraph each and yes or no questions, next to the six-section plan. The DESIGN.md/token change is proposed at step 4 as the decision line (F18).
4. **Skill lists:** add the skill to the ui bundle row (L87), the Codex list (L172) and `qc/SKILL.md:117` together.
5. **Slice fields:** step 5.1 and amend step 4 add verbatim quotes with dates, board path, reference images, numbered criteria, accepted render path (F20, F25). `planning-protocol.md:7` names them in briefs (F35).
6. **Critique and QC lenses:** one added visual lens for UI slices ("as a human looking at this, does it land, is it aligned, does it use components imaginatively", LP:54) and the board plus `shots/` passed to lanes (F21, F29). QC 4a compares shots to the board and the rejected renders, not only DESIGN.md (F28).
7. **Builder:** run-plan builders keep L71 unchanged; design-exploration builders run as host-launched standalone previews (F26). Do not change L71 without the owner.
8. **DESIGN.md:** the palette and the "restrained shadows" lines need an explicit owner-approved update (F15, F7); until then the flow cannot produce the accepted look.

## 4. Pushes to watch (summary of the four patterns asked about)

- Text-only briefs: F2, F13, F17, F22, F25.
- Structure-before-look: F13, F17 (plan approved from words before render), plus F21 (critique cannot see renders).
- Minimal color: F1 ("restrained navy/blue"), F3 (navy ramp), F4 (single accent knob), F7 ("restrained" depth), plus DESIGN.md:23 and :43 which F15 forwards.
- Summarizing the owner instead of quoting him: F2 ("current visual brief"), F22 (restate in two sentences), F27 and F20 (verbatim never reaches the builder). Counter-examples that are good: F19.
