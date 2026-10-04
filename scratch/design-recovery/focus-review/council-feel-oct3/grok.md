RESULT: FINDINGS

(a) One reads as a wall of equal boxes next to Deck (`v2/deck/feed-dark-01.png`, `accepted-deck-dark.png`). The stage light is still painted (`rail.tsx` uses Deck's `Stage`), and the full-height solid rail plus the solid banner cover it, so the page looks flat.

His lock removed the peek plate. The builder also removed the stack, so each card is one `lift` rectangle with nothing behind it. Hero images were his lock (text first, image the small part). At 64px with a hard frame they stop being pictures. The tile row was not one of his verbatim locks. It left with the header, and with it the blue, teal, green and amber. The 2px kind strip remains, at 70% opacity, and reads as one grey line.

The 56px strip was required. The bordered 40px logo tiles, badges and shadows on it were not. The open panel is a 280px opaque slab (`bg-[var(--rail)]`, `border-line-strong`, window shadow) full of chips: All sources, a Name/Handle well, a Notifications well. That slab is the hunk. Deck's list is type and rows. A filled, bordered overlay over a lit page always reads as a second app.

Onboarding (`onboarding-running-dark-1440.png`) draws each of the 17 sources as a 290px card, so about ten fill the top and the rest of 1440x900 is empty. Deck's eight-step list (`building.tsx`) is gone. Only "Checking sources" remains.

The banner is a lifted card, a blue edge, a circled X and a primary button. Its quiet form is one line of text, Turn on as a word, and a ×, with no bar, logo or button fill.

(b) Builder change list, in the order he will notice:

1. `site/v2/one/feed.tsx`, Banner: remove `lift`, the card shadow, the 3px blue bar, the blue gradient, the circled X and the primary Turn on button. One 32px row: 13px `--t2` text "Oparax can DM you on X when something matters.", Turn on in `--brand`, Dismiss as a plain ×.
2. `site/v2/one/rail.tsx`, closed strip: drop `border-r`, `bg-[var(--rail)]` and the strip shadow so the stage light shows through. Delete the `size-10` bordered cluster buttons, the corner glyph badges and their card shadows. Each group is its real logos at 22px, 8px apart. Keep the mark, the F initial and Expand.
3. `site/v2/one/rail.tsx` StripViews and `feed.tsx`: remove Clustered and Direct from the strip and the open panel. Put `ViewSwitch` on the Checking row, right aligned. That is the only placement.
4. `site/v2/one/rail.tsx`, open panel: width 240, `color-mix(in srgb, var(--rail) 78%, transparent)`, `backdrop-blur-xl`, `--window-shadow`, right corners 14px, no `border-r`. The click-away stays invisible.
5. `site/v2/one/rail.tsx`, panel rows: match Deck `feed.tsx` Row. 18px logo, 13px name, bare count, hover `bg-raised` only. "Sources" stays 13px semibold. Delete the All-sources filled chip, the Name/Handle well and the Notifications well. Name and Handle are two words under X accounts, the active word in `--t1`. Notifications is one row, the word plus the switch. A selected source is brand-colored text.
6. `site/v2/one/card.tsx`, source controls: replace the `rounded-full` bordered pills with that same inline row, 18px mark and 13px name, no border and no fill. The click still opens the reader.
7. `site/v2/one/card.tsx`, stack: when a story has more than one source, one backing plate behind the front card, inset 10px on the left and right, top flush with the front card (no peek, no padding-top), 8px visible below, `bg-[var(--raised)]`, `--card-shadow`, its own 2px kind strip. The front card is the only one with words.
8. `site/v2/one/card.tsx`, kind strip: full width, opacity 1, the lead kind (`--kind-article`, `--kind-post`, `--kind-github`). Imageless cards keep the soft kind wash.
9. `site/v2/one/card.tsx`, thumbnail: 64px to 96px, radius 10, no `border-line-strong`. It stays to the right of the headline.
10. `site/v2/one/feed.tsx`, grid: `useColumns` returns 2 columns below 1600px and 3 from 1600px up. Gap 20 becomes 16. Height packing stays.
11. `site/v2/one/rail.tsx`, Shell: `light` 560 becomes 720 so the radial reaches the first card row.
12. `site/v2/one/onboarding.tsx`, SourceCard: drop the `minmax(290px, 1fr)` cards, the 36px marks, the kind sentence and the card chrome. Two columns of 36px rows: 18px logo, 13px name, kind glyph in its color. Why on click adds one 13px line under that row. Hover shows the same why in the title.
13. `site/v2/one/onboarding.tsx`, checklist: a 220px column on the left, the eight `stepTitle` names with `StepMark` only, no `stepLine`, no count tiles, no evidence. Remove the KindSwitch bar while the run is going, so the list and all 17 rows fit on 1440x900.
14. `site/v2/one/drawer.tsx`, reader: the same skin as the open sidebar. Translucent rail, blur, `--window-shadow`, no `border-l`.

(c) Do not bring back the peek above the card, the "N Articles" pill, parenthetical citations, the header, the tool row, the phone control, the four status tiles, or a sidebar that pushes the grid. Notifications stays in the sidebar, margins stay halved, and the text stays first.