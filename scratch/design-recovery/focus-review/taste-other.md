# Owner taste from DS (2), the current Claude session, annotations and recorded rulings (Sonnet reader, October 1, 2026)

A reader agent extracted these. Raw files: raw/ds2-owner-messages.md, raw/session-owner-messages.md, plus scratch/design-recovery/ds2-original-feedback.md, docs/references/design-toolkit-proof.md, DESIGN.md, docs/references/decisions.md. Key: S# = current-session owner message (Oct 1, numbered in raw/session-owner-messages.md); A# = DS (2) annotation (Sept 30, on the old four-direction previews); DR = decisions.md or DESIGN.md owner line. The DS (2) chat messages themselves contain no design opinions (they are about the annotation tool). Nothing covers onboarding or settings visuals beyond the sign-up and sidebar notes.

## Inspiration vs instruction (his repeated complaint)
- S22: "I was suggesting Magic Transform, Circle Center Flow, as just areas of inspiration, okay? Not that you have to create this."
- S23: "The features 10 block looks pretty good. I'm not saying use it directly. Every time I tell you something looks good and I'm taking inspiration from it, you start using it directly."
- S23 on Bento 7 and Bento 1: "Don't use that component exactly"; Bento 1 shows "connecting and moving in that direction, but that also won't be a good thing to go by."
- S21: "cover flow in a Bento or collaboration orbit. These are just examples."
- DR Sept 29: his comments are "areas of exploration and things I'm not happy with, not as things to fix in my design system or rules".
- Praise of one card or diagram is local, never a global winner (A5, A6, A9, A13).

## 1. Overall feel
- S23: "there's no coherence to the design"; "I like none of the wireframes or the landing page at all."
- S21: "no life on the page"; "too much wastage on the page"; "too much redundancy, so I keep running into the same problems again and again."
- S21: "if it can be represented to them more easily... Why are you making them scroll?"
- S23: "scope for imagination, but while being logical".
- Sept 30: "Where is the imagination? Where is the exploration?"; rejected "the same old cards recolored".

## 2. Color, light and dark
- Sept 30 lock: "the color palette will remain dark at number 1, or somewhere between numbers 1 and 2"; "there can be variations in that gradient also". No green, red or plum. STANDING.
- S21: "the light mode is extremely bad, with so much pink and purple"; "Try and make it with a blue accent"; light mode "very bland... The card elements, their separators, and their borders are too light, even for the buttons"; "looks good only in dark mode". STANDING.
- "Only the official logos, yes, make them retain their appearance. Everything else can change, literally." STANDING.

## 3. Typography
- "Open Sans is good" (Sept 30). STANDING. Runtime still loads Hanken Grotesk until migration.
- Sept 24: "no bold by default". No monospace identity for handles and numbers (DESIGN.md).

## 4. Logo and brand marks
- A8: "Oparax's normal black logo applies literally... dark background and white, like the one we have on our header. That's what we'll show as the X bot also."
- S21: "It loses its purpose if you introduce the Oparax logo in every single place."
- S21: "in light mode the Oparax logo changes to a dark version. The Oparax logo is the white, circularish thing, so light mode is also very blank." (no fix stated)
- A2: "I prefer square icons with rounded corners, kind of like the Material theme across everything" (platform icons).
- Logo is one link home (Sept 24).

## 5. Layout and frame
- DR: content 90% width up to 1800px, 16px minimum gutters (Sept 28); footer only Privacy, Terms, Contact, right-aligned (Sept 29); header and footer rules edge to edge; nav Title Case, one or two words.
- S19: "the phone UI doesn't matter for the speed exploration because it's going to change anyway." TENTATIVE.

## 6. Landing page
- S23: "I don't like the main header... It's not descriptive, and it doesn't say what oparax is doing."
- S23: show "an X post", "an article", "a GitHub repository somehow as a third, more unique option"; "Oparax ingests it and produces a headline."
- S21: wants "a simpler news item" showing what was tweeted, what Oparax produced, what message it sent; "maybe it's because of these NASA examples that you're just stuck on."
- S23: social proof cards could show incoming news "differently for GitHub, Twitter, and articles, with some standardization". (inspiration)
- S21: redundant hero copy is waste.
- A5: hero diagram "Cleanest out of all diagrams or most visually appealing/balanced" (local praise); A1: stage headings must align on one line, consistent caption rhythm; A1 vs A5 on middle-stage extras (remove vs keep as site elements).
- Delivery: A9 praised realistic X message; A10 "Definitely doesnt look like what a tweet looks like" (source post must look like a tweet); S21 "the xChat window doesn't have to be there, but it just needs to be in harmony"; S23 "Stop caring about the X message build right now."
- Roadmap: A2 "Weird af" asymmetric; A3 explanatory line attached to heading; S21 circles or center flow for roadmap and planned destinations; S23 "The roadmap also looks horrible... I don't want it as a grid", "you can use the circle flow component".
- Pricing: A4 watched-posts allowance should be integrated or "advertised more heavily"; S21 "#1 most appealing... logically I'm liking number 2 more because it shows everything without the user having to click... cleanest is number 3"; S23 "doesn't have enough content"; "use the comparison section to show pricing. Comparison 8 and Comparison 5 are good places to show that."
- Sections: S23 "opening hero, along with the How It Works section, is a good place to start"; a "more detailed How It Works" that "explains each single component"; "the About Us section also needs to show"; blog components "might be useful". S21: the timeline section is unnecessary.

## 7. Feed, app shell and cards
- Card spec, S23 (latest): "Plain and simple story title"; "Bullet points stating the text"; "Quotation at the end of the bullet point in parentheses that, when clicked, expands the bottom of the card, which already says 'Used X sources' using the sources component from /ai-elements (although I'm unsure if we're using /ai-elements anymore) and whatever the React bits equivalent is"; "That's it. That's the card. We just need a way to represent the difference. I guess the sources at the bottom are too prominent. They don't have to be."
- S21: date and sources footer "takes up so much space"; decide the card first with "no useless information".
- A11, A12: don't repeat sources; don't repeat dates the feed shows; "The news title should come at the top."
- Images: A12 "I don't understand where the images will be coming from"; photo vs no-photo handling; A7 image-first draws attention but "the information representation of the actual story is not good".
- Card praise (local): A15 d1 card "most visually appealing" but "Why is the news not mainly in focus?"; A12 d4 "closest to how I was imagining standardized elements, regardless of news size"; A13 d3 reading room visually appealing but "I have no clue what each section is doing... or how we would even populate that"; S21 "The feed is horrible across all"; #3 "the cleanest one because it's the most straightforward"; #2 app shell liked best "but... maybe my mind is subconsciously liking just the app".
- Direct/Clustered placement: Sept 30 "next to the 'Your Reading Room' header"; A14 "why is this switcher over here and not simply in the header"; S23 "shouldn't the direct clustered switch come on the left in the massively empty app shell?... Not saying app shell is the correct way to go or the wrong way to go. I'm just saying that is the kind of logical hierarchy of components I'm talking about."
- S21: "that entire square shape with the app shell becomes the page, and Oparax and its logo come to the top left. Sign-up and all need to be adjusted in the sidebar".
- S23: sidebar agent/watching/accounts block is "adding stuff for the sake of adding stuff".
- DR Sept 28: Direct = one source synthesized; Clustered = multiple sources into one story; the person sees both and chooses.

## 8. Motion
- S21: Magic Transform "happens for a bit and then disappears. I thought that magic transform itself becomes the central hero" (inspiration only, S22).
- A2: wish for "clean animations and icons for SMS and email".
- "No visible pause/play button" is recorded in repo docs; the DS reader found owner quotes M17 and M64 for it.

## 9. Components and libraries
- Inspiration: Bento 1, Bento 7, Features 10, social-proof cards, Circles, Center Flow, Comparison 5 and 8, blog components, Magic Transform, Cover Flow, Collaboration Orbit, React Bits app shells, AI Elements Sources.
- Dislikes: the four old directions overall, grid roadmap, sidebar filler.

## 10. Copy
- Headline must say what Oparax does; avoid redundant copy; real-world examples, not NASA only.

## 11. Onboarding and other screens
- Owner (latest): "in my head I am walking the flow from onboarding but im not seeing onboarding or designing it so it might not be registering I guess".
- Sign-up in the sidebar (S21). Signup-first: X, Google, email, then blank onboarding, then feed (DR).

## 12. How he wants design work done
- S3: "you were supposed to council with them on everything, not create the renders, then council with them."
- "Wait I never told u to build anything or trigger council stop." Stop means stop.
- S22: wireframe first, "I just want to be done with this as quickly as possible." S23: wireframes don't show how components render: "My mind is constantly looking at the UI".
- Latest: do the design "once and freeze it"; synthesize his tastes against product needs and what pulls users in; council Astra and Grok on raw data; then wireframe he is happy with; then the actual design; lock at each step.
- "save me from my worst impulses and focus up on what is important... then move to ship and gain users."
- No unrequested docs or scratch files.

## Contradictions to settle
1. Direct/Clustered placement (header, beside feed heading, app-shell sidebar).
2. Extra middle-stage content (A1 remove vs A5 keep as site elements).
3. Wireframe first vs wireframes don't help him judge.
4. Feed preference differs per annotation (d1, d3, d4, #2, #3).
5. Light mode: liked card seen in light; light mode called bland.
6. Roadmap: rounded square tiles (A2) vs circular flow, not a grid.
7. Four directions vs freeze once.
8. Logo in light mode.
