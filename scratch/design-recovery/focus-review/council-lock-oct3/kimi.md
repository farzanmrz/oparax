RESULT: FINDINGS

I read the brief, the guidance index, PAGE-NOTES.md in full, both council rounds, DESIGN.md, the reference-led-design skill (the only relevant guidance; the rest covers code, data or instrumentation this design lock does not touch), and the Deck source: `feed.tsx`, `stack.tsx`, `chrome.tsx`, `ready.tsx`, `building.tsx`, `setup.tsx`, `login.tsx`, `shared/auth-form.tsx`, `data.ts`.

(a) Corrections to the host's list

1. The screenshots path `focus-review/v2/{window,newsroom,deck}/*.png` does not exist in the repo; I judged from code and the accepted feeds.
2. Item 3 supersedes round 2, and correctly: rounds 1 and 2 kept `PEEK = 22` because he had only asked what the strip was. His third message answers that ("looks really stupid"), so the plates go.
3. The "N Articles" pill is `KindChip` in `stack.tsx`; the sidebar count is `sourceCount` in `data.ts`, which today renders "2 articles" and becomes "2".

(b) Decisions on the open points

1. Sidebar: keep the overlay, it is not a bad idea, because "no one's really consistently looking at everything in the sidebar." Closed means an icon strip, not just a button: the Oparax mark on top, one icon per source group, the expand control, account actions at the bottom, matching his Supabase collapsed image. The overlay never moves the cards, so the grid is stable. On onboarding it sits flush at the left edge, as he asked. Counts are plain numbers. Logos stay: "if it weren't for you adding the Vercel, Hugging Face, and all those logos on the left, it would have never looked so lively."

2. Tools: the row keeps Clustered / Direct and Get alerts on X, nothing else. "Search, filtration, newest first, all of this bullshit... I don't even have the first user." Newest first is the order, not a control. Council's choice for after connecting: the button becomes a connected state in the same spot, since he said "I can't answer the alerts."

3. Cards: text leads. Anatomy top to bottom: the source row (marks, names, time), which is the citations row and the control; the headline; the facts. The image becomes a small right-side thumbnail when the story has one, nothing otherwise. No peek, no kind pill, no parenthetical citations. Fixed card width, columns fill the window: 2 below about 1280px, 3 at 1440, 4 at 2560, packed by the existing height estimate. His words: "The image itself should be the smallest part of the card" and "why make the user excessively scroll?"

4. Source click: keep the side panel, it is straightforward. A drawer at the right edge shows that source's direct synthesis from `itemsFrom(sourceId)` while the cluster stays visible, "while the clustered news is showing." It is transient, so it does not rebuild the fluff rail.

5. Onboarding: one page. While running, one quiet status line ("Checking 212 candidates") and the source grid filling in by kind, with the X accounts / sites and feeds switch and a per-source Why on demand. Done: the same grid settled, the trial as text ("7 days left"), the alerts tile, the first stories. No step list, no count tiles, no Jev bands, no segment bar: "posts read, candidates gathered, that's all just extra fluff."

6. Login: the Deck card, email first, X and Google below, lifted with `--window-shadow` over the fanned story cards. I pick dim: a low-opacity page-color scrim behind the card, no blur. The blend was his only complaint, and placement alone already failed once.

(c) Build spec

Routes: `site/app/(v2)/v2/one/{login,setup,onboarding,feed,landing}/page.tsx`; components in `site/v2/one/`. Reuse from `site/v2/deck/`: `chrome.tsx` (`Stage`, `lift`, `liftStyle`, `SiteHeader`, `PrimaryLink`, `SecondaryLink`, `AlertsButton`, `ViewSwitch`, `Facts`, `Quote`, `Tile`), `stack.tsx` `StoryCard` rebuilt without `Plate` and the `KindChip` row, `marks.tsx` (`SourceMark`, `GroupGlyph`, `GroupLabel`, `Dot`, `MarkStack`, `ItemMark`), `live.tsx` (`Checking`, `Arrive`, `useArrival`), `data.ts` (`stories`, `sources`, `groups`, `status`, `when`, `beat`, `HANDLE`, `itemsFrom`, `sourceOf`), `shared/auth-form.tsx` (`AuthForm`, `GoogleG`), and `next/data/onboarding` (`chosenAccounts`, `chosenSites`, `brief`, `profile`). Margins everywhere: half of Deck's (`px-2 lg:px-4`, `pt-4`), no 1400px cap at 2560.

1. Feed: `Stage`; the overlay `Rail` (new, from `SourceList` rows, plain counts, name/handle switch only under X, GitHub grouped by interest); tool row with `ViewSwitch` and `AlertsButton`, the `Checking` line beneath; the card grid. `SourceHeader` becomes the drawer header. Removed: `Header`, `Tiles`, `SourceStrip`, peek, pills, inline citations.
2. Setup: the `DeckSetup` composition unchanged, halved margins.
3. Onboarding: the status line, then `ready.tsx`'s `Group` grid with `building.tsx`'s `ChosenCard` why behind a toggle; end state is `DeckReady` minus `Segments`.
4. Login: `DeckLogin` plus the scrim.
5. Landing: the Deck landing unchanged except margins; he gave no landing notes.

Sample data: the recorded run's sources and the council stories, led by `st-gpt61-sol` (Latent Space plus Simon Willison) and `st-hf-olmocore3` (Hugging Face), plus `githubStory`. Screenshots: every page at 1440 and 2560, dark and light; the feed also rail open, rail closed to icons, and the drawer open on Simon Willison; onboarding running and done.

(d) Review checklist for the renders

1. Every page beside the accepted Deck, dark and light, at the same depth and life.
2. Logos, avatars and real images carry the color; no new hues.
3. Facts readable on arrival; nothing essential behind a click.
4. No peek, no "N Articles" pill, no parenthetical citations, no step list, no bands, no segment bar.
5. Tool row holds only Clustered / Direct and Get alerts on X.
6. Rail overlays the page; closed it is an icon strip; grid never reflows.
7. Cards: thumbnail or no image, text leads; 3 columns at 1440, 4 at 2560.
8. Drawer keeps the cluster visible; closing it restores the page.
9. Login card unmistakably separated from the story cards.
10. Light mode designed, not inverted; focus visible; the drawer and switch keyboard reachable.