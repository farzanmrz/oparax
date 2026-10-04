RESULT: FINDINGS.

1. Wrong changes to revert or rewrite:
The rule dropping any direction only one party wants was wrong. Verified: The owner stated, "Arriving at a consensus shouldn't drop stuff... All of you should agree." The prompts telling agents "do not reuse their layouts" and replacing component catalogs with "the preview app's own atoms" were wrong. Verified: The owner said, "The problem's not reusing the layouts. The problem is that it's an inspiration," and asked why the quote about components was removed. The removal of "Components available" from prompts must be reverted. Hard fail 2a.7 banning "facts hidden behind more facts" is overly broad. Verified: The owner acknowledged the conflict but said, "Perhaps we just generate those pages then without that," meaning adjust the UI, not ban the visual device itself.

2. Examples:
Examples should present the visual effect and name the specific components and treatments that achieve it. Verified: The owner suggested, "perhaps the images should be referenced to the exact code or component. For example, if there is a stack, then its depth... is referenced just to show that this is what's causing the depth." Inference: Providing the names of components, like shadcn Avatar or React Bits click-stack, along with their depth tokens, gives agents the tools to compose creatively without giving them full source code to blindly copy.

3. Consensus protocol:
No external tool is needed. Verified: The host summary noted external tools were not recommended, and the council runner supports resuming sessions.
Protocol: The builder creates a proposal with real data and catalog components. The host starts the council lanes. Instead of the host merging directions, the builder acts as the mediator in one continuous thread. The builder sends its proposal to the lanes using the resume command. The lanes critique the proposal from their different angles. The builder refines the directions and resumes the lanes again. This loop continues until all parties explicitly agree on the directions, dropping no valid ideas. The host only presents the final agreed directions to the owner.

4. Wireframe versus rendered draft:
The owner should lock elements and copy on a rendered directional sketch, not a grey box wireframe. Verified: The owner asked, "Are you sure that the wireframe itself you'll be able to render with the fixed theme and depth... It's just a very cheap UI, isn't it?" Astra confirms that a grey box wireframe cannot establish if a lifted window feels alive. The sketch must use the fixed theme and actual component proportions to properly judge the composition.

5. Claude Design (/design):
Yes, it can be used, but with strict bounds. Verified: decisions.md line 70 reversed the "Claude Design path with stock Mira." Grok and Astra note it can be used for quick directional sketches only if it strictly uses DESIGN.md tokens, real copy, and avoids Mira or default styling. It serves to pick a direction, not to generate final UI code.

6. Next steps for the host:
First, update the reference-led-design skill: annotate examples with component names, remove the layout reuse ban, and update the consensus loop to require continuous agreement via resuming. Second, run the continuous consensus loop where the builder and lanes debate until true agreement is reached. Third, generate a quick directional sketch bounded strictly by the fixed theme. Fourth, present the sketch to the owner to lock the elements and copy. Finally, implement and render the final UI for his review.
