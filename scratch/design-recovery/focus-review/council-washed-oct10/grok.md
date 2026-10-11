I'll read the brief and the guidance index first, then only the review material those name.The brief is a visual diagnosis of the washed light theme. I'll read the design skill and the theme sources, then the twelve pictures.The wash is the grounds and the light sitting on one another. The chips, tiles, and selection are not it. Text is already cut: `#0e1116` on white. The surfaces are not.

Lightness as a percent of white (channel average), from `.palette-council` in `scratch/design-recovery/site/app/(next)/palettes.css`: page `#eceef2` is 93.6, rail `#f7f8fa` is 97.4 (3.8 above the page), card and window `#ffffff` are 100 (6.4 above the page, 2.6 above the rail), band `--raised` `#f4f5f8` is 96.3 (3.7 under the card, 2.7 above the page), well `#f6f7f9` is 97.0. Sidebar, band, and card are three near-whites. The rail (`v2/one/shell.tsx`) is a 248px slab with one right edge at `--line`, ink 10 percent, which paints about `#e7e8ea`, the same grey as the page. Cards (`v2/deck/chrome.tsx` `lift`) add a 16 percent border, about `#d9dade`, plus the live light `--card-shadow`: a 1px ring at 0.07, a 1px/2px blur at 0.05, and `0 6px 16px -6px` at 0.10. The negative spread hides that last layer under the card. `--top-light` is an inset white at 0.9 on a white card, so it draws nothing in light. `--stage-light` is brand blue at 11 percent over the top 560px, which turns the crown into about `rgb(214, 222, 241)`, a blue mist where a grey ground should be.

Dark uses the same small fill steps (page `#0b0c0f` at 4.7, card `#121418` at 8.1) and still separates, because its shadow is black at 0.45 to 0.55 with a real 2px/4px and a 12px/28px layer, and its top rim is white at 0.06 on a dark card. DESIGN.md's "12 to 28px at ink 0.1 to 0.22" is that dark card shadow, and the light `--window-shadow`. The light card shadow stopped at 6px and 0.10.

Accepted light, beside these:
- Window: one surface inside `--stage-frame`, which starts at `#dfe3ea` (89.4, about 4 points under today's page), with the 40px/80px shadow at 0.22. The rail sits in that frame, so its edge is a cut.
- Newsroom: one table, rows divided by rules.
- Deck: pictures run to the card edge, so the photo is the card's color. The One card (`v2/one/card.tsx`) pads `p-3` or `p-5` and rounds the picture inside, a white channel between photo and page. That card is locked (sources, then image, then the story), so the picture stays. Radius is `rounded-xl` on a 10px token. It softens the edge. It is not the wash.

A page that only goes greyer, with the mist left on, is the rejected theme set: no life, and the flatness he already named.

### Seam
Lines do the cut. Shadows stay.
Light: page `#e6e9ef`, rail `#f3f5f8`, card `#ffffff`, band `#e9edf3`, well `#eef1f5`. Rail's right edge and every card's four sides: 1px at ink 28 percent. Band's bottom edge, between band and body: 1px at 18 percent. Inner rows: 14 percent. Shadow unchanged. Stage light off. Top light off in light.
Dark: grounds unchanged. Lines white 10 / 6 / 18 percent (from 7.5 / 4.5 / 13). Rail and card border use the 18. Stage light and the 0.06 top rim stay.
His pictures: a drawn sidebar edge, a drawn card edge, a line under the band title. Risk: past about 30 percent the light pages look like forms. No left-border accent. Dark stays dark.

### Weight
The shadow light dropped, and the blue mist off the page.
Light: page `#e4e7ed` (91.0), rail `#eef1f6` (94.8), card `#ffffff`, band `#e7ebf2` (92.5, a step under the white body), well `#e8ecf2`. Rail right edge: 1px at 18 percent, no drop (a drop would float the locked sidebar). Cards: `0 0 0 1px rgb(16 24 40 / 0.12)`, `0 2px 4px rgb(16 24 40 / 0.08)`, `0 12px 28px -8px rgb(16 24 40 / 0.18)`. Stage light: neutral radial, 70% 36% at 50% 0%, `rgb(16 24 40 / 0.05)` to transparent at 55%. Top light stays inset white 0.9. It shows as the ring against the darker page.
Dark: grounds unchanged. Cards: `0 0 0 1px rgb(0 0 0 / 0.55)`, `0 2px 4px rgb(0 0 0 / 0.32)`, `0 14px 32px -8px rgb(0 0 0 / 0.62)`, so dark stays the heavier lift. Rail: no added shadow. Stage light stays the cool 0.20. Top light 0.08.
His pictures: cards sit down, the band is a darker cap, the sidebar is a step plus a line. Risk: a blur past 28px is the glossy near miss. Five percent ink is a backlight. Dark grounds do not move.

### Frame
The page becomes the Window's frame grey. Each card gets a short far shadow, not the window's 80px layer.
Light: page `#dfe3ea` (89.4), rail `#e7ebf2`, card `#ffffff`, band `#eef1f6`, well `#e4e8ef`. Rail right edge: 1px at 16 percent. Card border: 12 percent. Band bottom: 1px at 12 percent. Cards: `0 0 0 1px rgb(16 24 40 / 0.10)`, `0 2px 4px rgb(16 24 40 / 0.06)`, `0 16px 32px -12px rgb(16 24 40 / 0.16)`. Stage light: white radial, 180px, `rgb(255 255 255 / 0.5)` at 50% 0% to transparent at 70%. Top light inset white 0.95.
Dark: page stays `#0b0c0f`. Rail `#101318`, card `#161a20`, band `#1e232c`, well `#0e1014`. Lines, card shadow, stage light, and top light unchanged.
His pictures: the sidebar is a lighter slab on a grey field, cards are white objects, the band is the pale cap. Risk: Sources and Notifications are mostly empty page, so `#dfe3ea` makes that emptiness plainer. The grey is the Window frame he already accepted. The dark page does not lighten toward it.

## Directions
- Seam: near-white grounds stay, stage light off, every outer edge a 28 percent ink line in light and an 18 percent white line in dark.
- Weight: page `#e4e7ed`, band a real step, light cards a 12/28px shadow at 0.18, backlight a 5 percent ink crown, dark shadow one step heavier, dark grounds still.
- Frame: page is the Window frame `#dfe3ea`, cards a 16/32px shadow at 0.16, a 180px white crown, dark cards one step up (`#161a20`) and the dark page unmoved.