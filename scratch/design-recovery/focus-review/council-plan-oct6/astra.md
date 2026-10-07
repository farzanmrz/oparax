<!-- host note: taken from the lane's raw output; the runner found no RESULT marker -->

**Keep the rough prototype phase. Make a complete rewrite conditional on what it reveals.** As stated, “until I understand” has no finish line, and “then rip it all out” commits you to another implementation before you know what needs replacing. That can repeat the loop.

Your concern is justified: the integrated product has not completed onboarding, and it has not passed through the full feature flow. Earlier advice to trust the lab and ship underestimated that gap.

The smallest useful “I understand it” is one real journey where you can explain:

- Why a source was recommended and another rejected.
- How an article became a card, joined a story, or was excluded.
- When an alert goes out, what consumes the allowance, and what happens when something fails.

For those decisions, you should see the actual input, exact prompt or code rule, and actual output. You need enough understanding to point to the decision you disagree with. You do not need to memorize the implementation.

Then plan the intended product afresh. **Planning from the beginning does not require deleting the code first.** Compare repairing the current product with replacing it against the same accepted behavior. A rewrite earns its cost if review shows that the existing structure repeatedly obstructs that behavior and replacement is simpler overall. A failed size guard, missing review, or confusing documentation alone does not establish that. Replacement adds another implementation and verification cycle.

Before a rewrite starts, the accepted screens, algorithm decisions, explicit product rules, and acceptance journey must be settled enough that the builder is implementing decisions rather than rediscovering them. Preserve the existing reference until its replacement passes.

For loose ideas, use **the original chat as the single inbox**. Leave “per-account daily caps” and “search infiltration” there verbatim, without turning either into an issue, plan item, or standing instruction. Retrieve the messages when you choose the next scope. I provisionally read “search infiltration” as “search and filtration,” meaning search and filtering, but its meaning remains unresolved. Per-account caps could prevent one busy account consuming the allowance; they still need a decision about which posts get collected. Neither idea is ready to implement merely because you mentioned it.

**Documentation cleanup can wait. The recording behavior should change now.** Stop recording speculative remarks as requirements, assistant defaults as owner decisions, local praise as whole-page acceptance, and council recommendations as approved scope. Stop copying the same evolving interpretation across files.

There is already a concrete example: [RUN-STATE.md](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/RUN-STATE.md) says both previous advisers opposed a feature bundle, while [Astra’s answer](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/council-prudence-oct6/astra.md) recommended a bounded amendment. More recording is not necessarily more fidelity. Exact words need their context and approval status preserved.

The next three actions:

1. **Host:** Fix the Jev request sizing and complete one real onboarding-to-feed-and-alert journey, retaining the actual inputs, prompts and outputs for inspection.
2. **Owner with host:** Walk that journey and its explainer; identify the specific behavior still wrong or unclear, using the existing design as the reference.
3. **Full feature flow:** Review the whole current product against your explicit rulings, choose repair or replacement from the findings, build and QC it, then return it for your acceptance before cleanup and the pilot.

Your new rulings belong in that scope: source additions and removals require sign-up, not payment; channels get the pluggable structure now, with X DM first. Those supersede the previous advice. The parked ideas remain outside until you choose them.