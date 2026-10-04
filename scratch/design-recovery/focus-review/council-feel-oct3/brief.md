# Council brief: the ONE UI lost the feel. Diagnose and prescribe (October 3, 2026, late night)

Astra and Grok only. One round; the host merges your two answers and dispatches an Opus builder straight after, so be concrete.

## What happened

The Opus builder built the One UI you specified (your lock answers: council-lock-oct3/{astra,grok}.md, council-lock-oct3-r2/{astra,grok}.md; the review round: council-review-oct3/{astra,grok}.md, all under /Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/). The owner walked it live and rejected the feel. His words, verbatim, in order:

1. "Whatever this weird bar is above the cards in the one design, I don't like that. I don't like the banner and how solid it comes, and the button looks weird. The X logo also appears weirdly. The sidebar looks damn weird, like it's not as clean as it was in deck. In newsroom, even in window, the sidebar looks extremely, extremely clunky. All three of the previous ones look better. Where exactly is the running checklist that was there before in the onboarding?"
2. "You must reduce the card sizes for the elements in RSS feed X in the onboarding. Why are they so big? Everything can appear consistently on the same page. But honestly, this UI is horrible. Overall, I don't like the feel of this UI at all."
3. "And the clunky part is also how blocky the sidebar looks. It's not as clean as the previous three designs. It just looks like a hunk."

Earlier tonight he also warned: "if it weren't for you adding the Vercel, Hugging Face, and all those logos on the left, it would have never looked so lively, right? It does now, so it's really tricky. All I know is that if something's not needed, then it can be removed. I think even that's the wrong criteria." And the standing bar is the three accepted feeds he loved ("the 3 beautiful UIs that made me cry"): /Users/farzanm4/.agents/skills/reference-led-design/examples/accepted/accepted-{deck,newsroom,window}-{dark,light}.png. The skill: /Users/farzanm4/.agents/skills/reference-led-design/SKILL.md. Theme: /Users/farzanm4/Desktop/repos/oparax/DESIGN.md. All his notes: PAGE-NOTES.md in the focus-review folder (read the Feed section fully; the newest notes are at the bottom of its Problems list).

## Look at these side by side

The One renders: focus-review/v2/one/feed-closed-dark-1440.png, feed-open-dark-1440.png, feed-reader-dark-1440.png, onboarding-running-dark-1440.png, onboarding-done-dark-1440.png, login-login-dark-1440.png, and their light versions. The three directions he says all look better: focus-review/v2/deck/feed-dark-01.png, focus-review/v2/newsroom/feed-dark-01.png, focus-review/v2/window/feed-dark-01.png, and the same folders' building-v3-dark-done.png (the onboarding he liked parts of), ready-dark-01.png, signup-dark-01.png. Code: site/v2/one/{rail,card,feed,onboarding,drawer}.tsx versus site/v2/deck/{feed,stack,chrome,marks}.tsx.

## Questions

1. Diagnose, specifically, what the One feed lost against the Deck feed and the accepted Deck: name the objects (the stage light and lit page, the lifted stacks, the tile row, the hero images, the kind colour strips, the spacing rhythm, the type scale, the equal-width grid versus packed columns, the 56px strip with mini-logo clusters, the panel's chips and boxes, the solid banner). For each: did his locks require removing it, or did the builder over-strip? Which removals killed the life?
2. The sidebar: why does it read as "blocky", "a hunk", against Deck's inline source list and Window's rail? Prescribe the exact sidebar: what the closed state shows, what the open state shows, how it is drawn (no boxes, no chips, Deck's type and rows), and whether the overlay itself is the problem (an overlay panel over a lit page tends to read as a slab; say how to avoid that: translucency, shadow, width, no fill borders).
3. Onboarding: the source cards are too big ("Why are they so big? Everything can appear consistently on the same page"). Prescribe the compact form so all 17 sources plus the step checklist fit on one 1440x900 screen: rows or small tiles, the size, what each shows (logo, name, kind, Why on hover or click), and where the 8-step checklist sits (he asked where it went; it comes back quietly, names and marks only).
4. The banner: he dislikes the solid bar, the button and the X logo. Prescribe its quiet form in one sentence.
5. Keep what he locked: no peek, no "N Articles" pill, no parenthetical citations, text first with a small thumbnail, no header, no tool row, Clustered / Direct at the top right of the grid (the review round's unanimous pick), sidebar floats over the page, Notifications in the sidebar, margins halved, no phone. Within those, what brings the Deck feel back? Be exact: stage light on, cards as lifted stacks (without the peek plate), the packed two or three columns, kind colour where, images where.

## Deliver

RESULT: FINDINGS, then (a) the diagnosis in at most 8 lines, (b) the builder's change list, numbered, each line naming the file, the object and the exact change, ordered by what he will notice first, at most 14 lines, (c) one line on what must NOT change. Under 700 words, no em dashes, plain prose. Read-only.
