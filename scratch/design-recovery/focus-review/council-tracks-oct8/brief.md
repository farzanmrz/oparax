# Council: how to run the owner's two tracks properly, then the design-system step, then a from-scratch feature flow that loses no detail (October 8, 2026)

Repo: /Users/farzanm4/Desktop/repos/oparax (branch beta; read-only for you). You are an ADVISER. Direct, concrete, product terms, with reasons and what would change your mind. No flattery. No em dashes.

## Read first (ground truth)
- scratch/design-recovery/focus-review/council-prudence-oct6/{brief,astra,grok}.md and council-plan-oct6/{brief,astra,pro,grok}.md: the two rounds of October 6 with the owner's full history and pattern. Build on them, do not repeat them.
- AGENTS.md (now with the "Recording" rule the owner said yes to on October 8), DESIGN.md, docs/references/decisions.md, docs/references/engineering.md (the stage flow: /feature, build, qc, ship, promote), ~/.agents/skills/reference-led-design/SKILL.md (the design skill; the owner says a part of it "wasn't working" and wants it fixed at the design-system step; he has not yet said which part).
- The Jev scoring bug is FIXED (commit ddcaf857, October 8: each Jev request carries only its own candidates, measured under the cap). No real build has run since. The owner does not want a real build yet.

## What the owner decided today (verbatim where it matters)
He rejected deleting any documentation or scratch now: "losing all of that means we lose the current design exploration." He rejected separate branches or sessions per track. His plan, in his words:
"I do the design exploration, and at the same time, with chat, I figure out what the algorithm is, okay? Once that is done, then we fix the design system rule because we were also fixing a skill for it that wasn't working. Then that's fixed. All that's done, then we trigger a feature flow to build the thing from scratch completely correctly, but I don't know how to do that without losing every detail of information we have, even the nuances of whatever bug we encountered. We shouldn't encounter it again."
And now: "right now the design exploration on localhost is fine no need for a real build just yet. Trigger the server show me the pages and ill make my design judgements fast while u explain the onboarding algorithm here in detail work with /council on how to proceed with this properly."
The host proposed three homes for details that must survive a rebuild: the current code stays in git and on beta as the reference until the new build passes his walk; his rulings stay in decisions.md and DESIGN.md; a bug ledger, one line per confirmed bug (what broke, cause, the rule that prevents it), written only when a bug is confirmed. The owner has not accepted or rejected that.

## Questions
1. The two parallel tracks in one session pair (design walk on localhost with example-data pages; algorithm explained in chat from the code): how should each be run so the walk produces design rulings the rebuild can use (what form: per page, verbatim, yes or no, in DESIGN.md?) and the algorithm explanation produces an algorithm spec he owns (what form, how short, where it lives)? Note the Recording rule: agents record nothing on their own initiative; he authorizes each edit.
2. The design-system step: what must the design skill and DESIGN.md contain for a from-scratch builder to reproduce the accepted pages without the owner re-explaining, given the sixteen-pass history? Keep it to the smallest set.
3. The from-scratch feature flow: how is its brief assembled so that no detail is lost (his rulings, the accepted pages, the algorithm spec, measured costs, the bugs met: the Jev cap, the email templates pointing at the Site URL, the paid-only source gate that was never his ruling, the 15-minute council ceiling), while the old code stays as reference? Is the host's three-homes proposal right, and what is missing from it? Is "from scratch" the right word, or should the plan stage decide repair versus rewrite per area?
4. The order and the gates: what is the sign that track 1 and track 2 are done and the design-system step may start; what is the sign the feature flow may start? One line each.
5. Name the one thing most likely to turn this into the loop again, and the rule that stops it.

Be short. Numbered answers.
