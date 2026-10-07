# Council: the owner's working plan, "rough until I understand, then rip it out and rebuild from exact notes" (October 6, 2026, late night)

Repo: /Users/farzanm4/Desktop/repos/oparax (branch beta; read-only for you). You are an ADVISER. The owner wants your honest advice on his plan below, in product terms, direct, with reasons and what would change your mind. No flattery.

## Ground truth to read first
- scratch/design-recovery/focus-review/council-prudence-oct6/brief.md, astra.md, grok.md: the previous round tonight (same two advisers), with the full history, timeline and the owner's pattern. Read it whole; do not repeat it, build on it.
- docs/references/decisions.md (rejections and reversals), docs/roadmap.md, docs/references/engineering.md, AGENTS.md (the project instructions), scratch/design-recovery/focus-review/RUN-STATE.md (top section and newest bullets), the global design skill ~/.agents/skills/reference-led-design/SKILL.md and DESIGN.md at the repo root (the design system he set up October 2 and refined October 5).
- The product code is the one-day build of September 28 plus the October 5 design port; no stage with reviewers has run over it; no real build has completed (the Jev size-cap bug, previous round, item 6).

## What happened after the previous round (host)
The owner answered the previous round's advice:
- Adding and removing sources is gated by sign-up only, never by payment: "I never said it should be gated by payment, only by sign-up." The paid-only gate was the September 28 build's default, not his ruling.
- Notifications: build the pluggable shape now (a channel per person with kind and address, one delivery per story per channel, X DM first), overriding the "wait for a second channel" advice: "In order to do fast iteration, it's not like today I implement X DM. Tomorrow, I'll do away with the email. Might as well set it up accordingly."
- On the prompts: "I'm underconfident about shipping something where I don't know how it's functioning in the background. I won't be confident unless it's passed through the feature flow in the entire build, because this was just quick iteration. I don't even know what the fuck's happening in the background." And: "I keep linking back to design and then to the algorithm in the background because, via design, when I see it working as a normal user, I can relate it to the background algorithm and to the feature flow." And: "There's so much fucking documentation. I don't know what my AGENTS.md says. I don't know what a bunch of different documents in docs say. It's just mush, and I'm just abstracting away all my work to AI, so I need to get control of it before shipping."
The host proposed: fix the bug, one real build he watches, an explainer page of that run (the project's explain-flow format: each step's rule beside exactly what happened, real inputs and outputs, the exact prompt), then one /feature over the product as built plus his rulings, then the documentation cleanup.

## His reply, verbatim (dictated; may contain mishearings)
"Well, the idea is going to be that once I'm settled on the design and the algorithm and the flow, then we remove all scratch and all unnecessary documentation. No need to work on the documentation now.

There are also so many things I forgot. For example, providing a per-source watch monitor from X accounts, so that if someone has a total of 100 posts per day, they can watch per account and limit how many posts per day they want per account. That's one thing. Searching infiltration is another, but I don't want to document this because then it might get confusing, as it did in the past. Documentation evolved with words I said and also words I just mentioned, threw away in a chat, never said, and recorded. They still get kept getting recorded.

That's how I'm thinking about it: we do a rough, patchy thing until I understand and we create it. Then we rip it all out and plan it from the start, but we have the exact notes, documents, and designs of how to move forward, because remember we were setting up a design system and a design skill also."

## What we need from you
1. His plan: rough and patchy until he understands it, then rip it all out and plan from the start with exact notes and designs. Given his history (one-day build September 28, "rebuild from scratch is not prudent" September 27, sixteen design passes, documents that recorded throwaway words), is this a path to shipping or the loop again? If the rewrite is the right end state, what must be true before it starts, and what is the smallest "understand it" that justifies it?
2. The parked ideas (per-account daily post caps for watched X accounts; "search infiltration", whatever that means to you, say what you take it to mean) and his refusal to document them: where do loose ideas go so they are neither lost nor turned into requirements? Keep it to one mechanism.
3. The documentation mush: AGENTS.md, docs/, scratch/, decisions.md, RUN-STATE.md, PAGE-NOTES.md, the design skill. He will clean it later. Is "later" right, or does the mush itself cause the recording of throwaway words now? Say concretely what the agents should stop recording from this point on.
4. The next three actions, in order, in one line each, with who does each (the owner, the host, a stage). Reconcile with the previous round where you can; say where his new rulings change your answer.

Be direct. Fewer words. No em dashes.
