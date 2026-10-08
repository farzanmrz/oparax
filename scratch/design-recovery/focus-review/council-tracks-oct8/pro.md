1. **The two tracks in one session pair:**
   - Design walk: Save the accepted page states as screenshots in `img/`. Capture his spoken reactions verbatim in `PAGE-NOTES.md`. Rulings only enter `DESIGN.md` when he explicitly authorizes the exact text. Reason: The Recording rule bans agent summaries, making pictures and exact quotes the only reliable record for a rebuild.
   - Algorithm explanation: Produce one short file (for example, `docs/algorithm.md`, under 40 lines) mapping inputs, the exact prompt purpose, limits, and outputs. Reason: He needs a plain English contract he can verify and own before shipping.
   - What would change my mind: If he proves comfortable reading the typescript logic directly, the explanation can live as comments in the code instead of a separate document.

2. **The design-system step:**
   - The smallest set: 1) `DESIGN.md` containing the final layout, typography, and token rules. 2) The accepted page screenshots in `img/`. 3) The `reference-led-design` skill explicitly instructed to match the screenshots pixel-for-pixel using only the `DESIGN.md` tokens.
   - Reason: Sixteen passes happened because agents substituted generic UI for his rulings. Pictures and a strict visual matching rule prevent hallucination.
   - What would change my mind: If the preview app's CSS is already flawless, the skill can just instruct builders to apply the preview's exact classes.

3. **The from-scratch feature flow:**
   - Assemble the brief as a list of pointers to the truth. Point to `DESIGN.md` and `img/` for visuals, the new algorithm spec for logic, `cogs.md` for costs, `decisions.md` for the reversed paid-only gate, the bug ledger for the Jev cap and email URL fixes, and `AGENTS.md` for the 15-minute ceiling.
   - The host's three-homes proposal is right but missing three homes: the accepted screenshots in `img/`, the algorithm spec, and `cogs.md` for costs.
   - "From scratch" is the wrong word. The plan stage must decide repair versus rewrite per area. Reason: A blind blank-slate rewrite deletes the working plumbing (Auth, Stripe, routing) and guarantees another month of delays.
   - What would change my mind: If the old beta code is structurally incompatible with the new algorithm.

4. **The order and the gates:**
   - Tracks 1 and 2 are done when: He explicitly says "yes" to the final algorithm spec and the final set of screenshots.
   - The feature flow may start when: He explicitly approves the exact text of the updated `DESIGN.md` and the fixed design skill in chat.

5. **The loop and the rule:**
   - Most likely to cause the loop: Executing "from scratch completely correctly" by deleting the entire working product and rebuilding plumbing based on generalized chat summaries.
   - The rule that stops it: The Recording rule. It prohibits unapproved requirements and agent-initiated summaries, forcing the build to rely entirely on explicitly authorized rules and the referenced beta code.