1. **Run both tracks in the same conversation, with one builder.** Your newer instruction supersedes October 6’s recommendation to run a real build first.

   **Design:** walk one preview page and state at a time. Repeat your verdict verbatim and establish what it accepts: an element, the whole page, or its behavior. “This looks better” is not whole-page acceptance. With your authorization, `PAGE-NOTES.md` holds your exact words alongside the page/state and reference image. `DESIGN.md` receives only approved reusable rules.

   **Algorithm:** explain the code in chat, decision by decision: input → exact prompt or code rule → resulting selection/action → failure behavior and cost. Distinguish current behavior, your intended behavior, and historical measured results. Example data must never masquerade as a completed run. The eventual spec should have one compact entry per decision, linking exact prompts and code at a fixed revision. Put it in the feature brief when you authorize assembly, rather than creating another document now. Include downstream judging, grouping, alerts and allowances before declaring the whole algorithm settled.

2. **The design-system step needs a reproducible reference, not more adjectives.**

   The smallest useful set is: accepted page source and images; your scoped verdicts; shared tokens and reusable component behavior; and the relevant rejected alternatives. References must identify states, themes, widths and interactions, because a screenshot alone cannot specify behavior.

   The skill should explain how to explore an undecided page and how to reproduce an accepted one without reopening its composition. `DESIGN.md` should hold the shared visual rules and point to the accepted implementations. The original three feeds remain the finish standard, with their superseded interactions clearly identified.

   First identify which part “wasn’t working.” One visible conflict already exists: the skill tells agents to add accepted examples automatically, while your Recording rule requires authorization. Correct that operational conflict explicitly; do not infer that your philosophy needs changing. Validate the proposed correction against an accepted page. I would expand the guidance only where that exercise exposes a specific ambiguity.

3. **The three-homes proposal is incomplete, and the bug ledger is not authorized.** Git preserves implementation, but code cannot tell a future builder which behavior you intended. `decisions.md` holds rejections and reversals only. It cannot become the general home for positive rulings.

   Assemble one approved feature brief that links each intended behavior to your exact ruling, accepted page or algorithm decision, existing implementation, and the proof required. Preserve the historical material without treating every old instruction as current scope. Include approved source access after sign-up and pluggable notifications with X DM first.

   Carry these specific protections into that brief:

   - **Jev:** retain `ddcaf857`, request-local candidates and the size guard. The fix is established; a successful integrated run remains unproven.
   - **Auth email:** preserve the requesting-site return behavior and external template configuration. Git alone does not preserve it. The records distinguish corrected sign-up/reset templates from an untested magic-link template.
   - **Source access:** the paid-only gate is an implementation mistake, not a requirement to preserve.
   - **Council:** retain the 14-minute working budget, picture bound and 15-minute termination ceiling.
   - **Costs:** link dated measurements and their original conditions. [COGS](/Users/farzanm4/Desktop/repos/oparax/docs/references/cogs.md) still contains the rejected $200 budget, demonstrating why historical evidence needs reconciliation.

   A confirmed bug entry needs cause, fix/reference and recurrence proof, not merely a preventative slogan. Those entries can live within the authorized feature brief without a separate ledger.

   Call this **planning the whole product afresh**. Following “Compare before choosing,” the plan should justify reuse, repair or replacement per area. Replacement earns its cost when existing structure obstructs accepted behavior. Preserve the old reference until the replacement passes your walk.

4. **Track completion:** you explicitly accept the scoped pages/states and algorithm decisions, with no unresolved question that would change either; real-run proof remains pending.

   **Design-system start:** both tracks are accepted and you identify the failed skill behavior to correct.

   **Feature-flow start:** you approve the demonstrated design-system correction and the reconciled brief, then explicitly trigger `/feature`; build, QC, your acceptance walk, ship and promote follow their existing gates.

5. **The likeliest repeat is an agent turning an explanation, example or partial compliment into a requirement.** The stopping rule is provenance: every proposed requirement points to your explicit ruling; every acceptance states its scope; every file edit has your authorization. Conflicts come back as one concrete decision. Nobody silently fills the gap.