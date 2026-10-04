# Owner taste extracted from the "DS" chat (Sonnet reader, October 1, 2026)

A reader agent extracted these from raw/ds-owner-messages.md. It is a summary with quotes; the raw file is the ground truth. M# = owner message number in that file. S = standing, SUP = superseded, T = tentative.

## 1. Overall feel
- "I just want to work with something that aligns things specifically and is imaginative when it has to be." M2 9/29. S.
- "it's a vibe, and I only know it when I see it." M2. S.
- "There's no life in it." M9. S (recurs M68, M74).
- "too much useless repetition of the same thing, whereas you have enough features and functionalities to show differently." M17. S. M23: each section "should be unique and have one idea."
- "it looks professional, but there is a lot of fluff and not enough substance yet." M17. "The page is just dead... it's just fluff." M22. S.
- Realism: "not enough realism in it." M22. "As close as X Bot DM would look in real life, or as close as a tweet would look in real life." M24. S.
- M68: "I like the components and the arrangement now." Change only feed elements and real problems. S.
- Restraint vs imagination: M17 "be creative, but within the bounds I provided"; M30 "I might be overcomplicating and overdesigning... my intent was to set a theme and a design system"; M74/M75 "too far off the deep end. I didn't want this much variation in colors"; M111 "Where is the imagination? Where is the exploration?"; M118 "Man is this much better." Net: imaginative layout and components, tight palette and font.
- shadcn blocks "very basic"; Motion/React Bits "modern and exciting." M92. S.
- "Cleanest combination... balanced." M32. S.
- "I'm wasting time with how much decision-making I'm doing." M83. T.

## 2. Color, light and dark
- "I love the color palette in both dark mode and light mode... perfect." M19 (direction 4). T.
- Dark card on dark card "looks good. Switch it to light mode, and it starts appearing a bit weird." M9. T.
- "I thought the default was dark mode." M64. S.
- M68 "devoid of some color"; M74 complained added color looked the same; SUP by M75.
- M75: "Literally delete all your current explorations and go back to the older color palette." "number one is the closest." Clashing colors rejected. S.
- M118: "revert to what we had before." M126: "color palette will remain dark at number 1, or somewhere between numbers 1 and 2. You're not going to go toward green, red..." Gradients allowed. S.
- M129: only official logos keep their appearance; everything else can change (reverses M75 black X chat). S.

## 3. Typography
- M14 likes most fonts except heavy bolding. T. Hanken Grotesk rejected (M64, M118). "Don't just swap" fonts (M74). Sans-serif only, no serif. M118: not generic "like Inter or Geist." M126: "Open Sans is good." S, locked.

## 4. Logo and brand marks
- Oparax logo with wordmark in the header (M9); "The logo only exists at the top of my header, and that's it." (M68). S. No logo or wordmark in the footer (M14).
- M14 asks why its color keeps changing; "Can we just fix one color... use the SVG." T.
- Platform logos: actual company logos "adds a bit more life" (M13); keep their colors (M32); "the actual colored logos. Your logos are so flat." (M74); clean app-icon style (M75). S.
- Oparax logo allowed inside the X chat (M75). S.

## 5. Layout and frame
- Header/footer divider lines edge to edge; header and footer smaller (M17). Footer short, Privacy/Terms/Contact on the right (M14). Nav items Title Case, one or two words (M14). S.
- Wants the real header and footer rendered (M9, M14). S.
- Hero: "central headline should stretch out at the top, and the three cards should be the first thing that appears visible." M64. S.
- Margins swung; last word M74: "Margins are too thin now. Just double the current size." Net: moderate.
- No pause/play control (M17, M64). S.

## 6. Landing page
- M14: "as a user, I'm not understanding what Oparax does." Hero must explain the product. S.
- Disliked headlines "A wider view. A quieter feed." (M9) and "Keep up with what you care about" (M14). S.
- Demo layout (M31/M32): title at top, then left sources, center "Oparax engine", right the story delivered. "That's it. That's literally it." S.
- Wants "multiple different tweets or the same news from multiple different sources feeding into this engine." M32. Cards not too big.
- Hates "that stupid space exploration header." M32.
- X DM should look like X's chat (M17); SUP by M126/M129 (restyle allowed).
- Real-looking tweets and articles (M18, M22, M24); no "illustrative" or "real example" labels: "You can just show things straight up." M22. S.
- Topics: "AI and developer tool" misleads (M17); obscure topics confuse a normal visitor (M22); idea of a topic switcher (M22, M31). T.
- Show more than X: "email, text, or X bot... RSS, X, GitHub, Product Hunt, and Reddit." M17. GitHub and Product Hunt are sources (M22). S.
- "Less legwork, more perspective" section "kind of useless." M9.
- Background: "buzzy feeling... flowing animation." M17, M22, M24. S.
- Roadmap: flow plus future possibilities as a roadmap (M22); loved "a central circular element with the left and right sides" (M71); exact list (M74): Instagram, Reddit, LinkedIn, every Meta network, Snapchat, TikTok, X, YouTube, Yahoo Finance, Google News; "doesn't need 'Available Today'"; M75: left sources streaming in, right "everywhere we can send information, including X, WhatsApp, SMS, and email." S.
- Pricing: liked direction 4's interest component (M14, T); price switch plus table "redundant" (M17); "remove redundancies, but you can add more features" (M22); rejected "Works today / Planned" split (M64).

## 7. Feed and story cards
- "The cards have the story header, the text, and the sources. The sources can be different types, and they can combine." M14. S.
- Two feeds: "direct feed and clustered feed." M68. Heading "your feed" (M74), no topic title. S.
- Direct: "the synthesized version... that Qwen produces, with the header and text. It picks the favicon from the site itself." M70. Visual separation of X post vs article in direct (M70). S.
- "The clustered feed will not have subsections." M74. S.
- Switch beside the feed heading (M111). S.
- "the feed looks pathetic... bland and boring." M64.

## 8. Motion
- Liked Signal Flow animation (M9, M14) and the flowing string into Oparax (M17). Flow should show real streams, clustering, then the alert, not a "weird Oparax logo" blob (M17). Background motion wanted (M17, M22, M24). No pause/play. Magic Transform as hero idea (M115, T).

## 9. Components and libraries
- Likes React Bits micro-animations (M1), beam and ripple effects (M2), card separation and shadows (M9). shadcn blocks basic (M92). Wants explorations that truly use prebuilt components (M99, M114). Reference list (M28): Scroll Tide, Microkit, Kinetics, Minimal Gallery, Refaroo styles (Cursor, Linear, Wise, Ramp, Eleven Labs). No react-tweet (M23).

## 10. Copy
- Section names Title Case, one or two words (M14). No "illustrative" labels (M22). Avoid confusing topics. Sign-up: "Continue with X, Continue with Google, or email/password." (M37).

## 11. Product screens
- Sign-up first, then onboarding agent builds the feed (M37, M40, M9). Wants to walk the real flow (M51). Claude Design: wireframe, then design system, then pages (M78, T).

## Contradictions
1. X chat black (M75) vs freely restyle (M126, M129).
2. More color (M68, M74) vs too much (M75) vs no exploration (M111) vs old palette (M118, M126).
3. Font swaps (M64, M74) vs Open Sans locked (M126).
4. Logo repeated vs header only (M68).
5. react-tweet (M22) vs not (M23).
6. Icons not logos (M31) vs official colored logos (M74, M129).
7. "Don't overcomplicate" (M30) vs "where is the imagination" (M111).
