RESULT: FINDINGS.

I would not accept the whole flow yet. I opened every reference image and supplied render. In `accepted-deck-dark.png`, the Olmo card sits between a checking strip and a separate GitHub digest. In `feed-dark-01.png`, the lifted source rail replaces that arrangement, and all four Olmo facts are visible.

Feed: desktop composition belongs beside the accepted feeds. Change the narrow layout: replace the full source directory above the feed with a compact source selector, bringing the first story into the initial viewport. `feed-narrow-dark-01.png` currently shows no story. Keep the desktop stacks and the populated empty-source treatment.

Landing: the hero belongs; the lower agent section does not yet. In `landing-dark-03.png` and `landing-light-03.png`, replace the large candidate-count panel with an image-backed story stack beside a compact list of chosen sources and reasons. That gives this section a visible result and avoids the text-heavy near misses. The pricing comparison can remain restrained.

Sign up: ACCEPT the visual composition in `signup-dark-01.png` and `signup-light-01.png`. The raised form and fanned imagery belong together. Task acceptance is blocked by [signup.tsx](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/deck/signup.tsx:36): its form defaults to GET, putting entered passwords in the URL. Intercept preview submission and navigate without serializing credentials.

Setup: ACCEPT the desktop composition in `setup-dark-01.png` and `setup-light-01.png`. The form leads, with a useful example alongside it. Task acceptance remains incomplete: `setup.tsx` discards the entered sentence and handle, then opens the fixed example. Make that demonstration transition explicit.

Building: replace the dominant candidate-chip field with a source table showing names, kinds, selection and stored reasons, retaining the steps at left. `building-dark-01.png` and `building-light-02.png` currently resemble the busy near misses: many small objects, no clear leading result. A source-review table earns its density.

Ready: replace the three headline-only rows beneath the front story with complete readable cards in the same right column. `ready-dark-02.png` and `ready-light-02.png` reproduce the explicitly forbidden lead-story-plus-teasers pattern.

On the eight mistakes: (1) feed facts are exposed, but Ready retains teasers and `live.tsx` delays the newest feed story by 2.6 seconds. (2) Article/Post terminology is fixed; Vercel’s “2 articles” repeats in the rail and selected-source header. (3) Separate uppercase source groups are fixed. (4) GitHub joins ordinary stories, with supported direct-card wording; Product Hunt filtering is absent, and Next.js Blog has no selectable source. (5) Image and imageless cards balance well in Direct. (6) Source selection and Name/Handle switching exist; the custom radio/tab controls lack arrow-key handling. (7) Allowance and failure counts help; candidate ratios dominate without helping a decision. (8) Deck units and decorative-only `t4` usage are substantially fixed. Newsroom truncation and Window overflow are outside these renders.

I agree with the builder’s desktop depth, imagery and GitHub treatment. I disagree about a recorded run: `onboarding.ts` identifies illustrative fixtures; `building.tsx` derives intermediate candidates from timed proportions. Its Plan shimmers complete text rather than streaming it. Mid-run screenshots also disclose the final source breakdown before selection finishes. Omitting unchosen Product Hunt data is defensible, but does not verify that requirement.

The strongest case for acceptance is that desktop surfaces retain the accepted finish. Highest risks are credential exposure and misleading demonstration states. Fix submission first. These findings are verified from images and code; aesthetic judgments are mine. Live keyboard, error and end-to-end behavior remain unverified.