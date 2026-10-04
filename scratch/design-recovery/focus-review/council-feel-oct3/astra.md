RESULT: FINDINGS

(a) Diagnosis

Against [accepted Deck](/Users/farzanm4/.agents/skills/reference-led-design/examples/accepted/accepted-deck-dark.png) and [v2 Deck](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/v2/deck/feed-dark-01.png), One loses visual variety more than theme fidelity.  
Stage light, lifted card shadows, top highlights and kind colour strips survive in code and renders; claiming they were removed would misdiagnose it.  
Removing peek plates was required; removing physical depth was never required. Preserve the lifted fronts without counterfeit backing plates.  
The tile row and hero images were removed by council instructions. Their combined loss removed large colour areas and contrasting objects; the builder followed that prescription.  
One already packs natural-height cards into equal-width columns. Equal width and packing are compatible; neither explains the failure alone.  
The 20px headlines and 13.5px body remain legible, but repeated source capsules, square thumbnails and identical anatomy flatten the spacing rhythm. Capsule styling was unnecessary.  
The 56px strip was specified, but miniature logo clusters were not. Those boxed mosaics, the opaque full-height panel and nested controls turn readable navigation into “a hunk.”  
The banner invitation was requested, its solid card treatment was not. Checklist removal was the council’s overreach; oversized onboarding cards and completion previews inserted above them compound it.

(b) Builder’s change list

Paths below are relative to `scratch/design-recovery/site/`.

1. `v2/one/rail.tsx`, closed sidebar: retain 56px; replace boxed mini-logo clusters with individual 20px source marks in 28px rows, grouped with quiet kind glyphs. Keep Oparax, Expand and account controls; remove mode icons.

2. `v2/one/rail.tsx`, open sidebar: use a 264px overlay, existing rail colour at 94% opacity, 16px backdrop blur and existing window shadow. Remove the explicit outer border. The overlay is compatible with the lock; its opaque, sharply bounded slab treatment causes the problem.

3. `v2/one/rail.tsx`, panel contents: Deck’s 13px “Sources,” 13px source names, 18px marks, 32px rows and bare nonzero counts. Keep collapsible groups and GitHub interests. Render X-only Name/Handle as plain text choices; Notifications, X DMs and its switch as an unboxed row. No nested boxes or chips; retain focus outlines.

4. `v2/one/feed.tsx`, banner: show “Oparax can DM you on X when something matters.” as one unfilled text line with a blue text “Turn on” action and dismiss cross, removing the X badge, border, shadow and colour stripe.

5. `v2/one/feed.tsx` and `app/(v2)/v2/one/feed/page.tsx`, mode control: make labelled Clustered / Direct permanent at the grid’s top right, sharing the checking line’s baseline; remove the sidebar-placement variant and extra reserved row.

6. `v2/one/card.tsx`, lifted fronts: retain `liftStyle`, top highlights and existing surfaces. Keep the 2px kind strip on each card and the imageless kind wash. Removing the heavy banner exposes the existing stage light; do not alter theme tokens.

7. `v2/one/card.tsx`, source row: replace raised capsules with inline clickable logos and names. Keep timestamps right, 20px headlines, 13.5px facts, 16px padding and 12px separation between identity, headline and facts.

8. `v2/one/card.tsx`, imagery: retain real 64px thumbnails beside headlines, with recognizable crops; no image placeholder. Preserve larger pictures in login and landing, where the feed thumbnail restriction does not apply.

9. `v2/one/feed.tsx`, composition: retain three packed columns at 1440, two on narrower desktops, natural heights and 20px gaps. Never stretch cards into equal-height rows or move them when navigation opens.

10. `v2/one/onboarding.tsx`, source area: at 1440, place a 224px checklist beside three columns of 56px-high source tiles, with 8px gaps. Seventeen sources occupy six rows, 376px total. Each tile shows a 24px logo, name, kind and compact Why control opening a popover on focus or click.

11. `v2/one/onboarding.tsx`, checklist: reuse all eight `stepTitle` names and `run.states`; 32px rows, names and state marks only. No counters, explanatory paragraphs, progress bars or automatic scrolling.

12. `v2/one/onboarding.tsx`, completion: preserve source and checklist positions; change the status and reveal the feed action there. Move existing story previews below the source area so completion never pushes selections off-screen.

(c) Must NOT change: fixed theme, halved margins, desktop-only scope, readable facts, text-first cards, no peek, article-count pill, parenthetical citations, header or tool row; retain floating navigation, sidebar Notifications and the source reader.