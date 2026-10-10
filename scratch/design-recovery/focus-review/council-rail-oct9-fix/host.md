# Host (Claude Fable 5.1), written before reading the lanes

1. Why it reads as no coherence: every line in the rail is the same 13px text on the same ground, so the account name, Sign out, the free week label, the big 7, the posts line and the switch are eight loose lines with no edges; nothing says which lines belong together. Deck and Window separate things with surfaces and a type ladder (a 12px label in t3 over a value in t1, inside a bordered tile or a lifted window), and the account sits in its own row with an avatar; this rail has no surface at all below the head.

2. Design: head unchanged (mark, "Oparax", hairline). Nav rows unchanged. Groups: as built, plus 6px between groups and each group shows at most 5 rows then an "N more" row (13px, t3, same row shape) that expands it ("have a 'Show more' option", Oct 4), so Websites and GitHub are on screen at 900px. Foot, on the rail ground above one hairline, 8px inset, 8px between blocks: (1) the account tile, Deck's lift (rounded-xl, --line-strong border, --window, card shadow), 10px padding: the 24px avatar, the name 13px medium t1 with @handle 12px t3 under it, and "Sign out" as 12px t2 words at the tile's right end; (2) the free week tile: Deck's Tile exactly (label, 22px number with "days left", Segments, the posts line); (3) the Light | Dark switch full width (the bordered control it is); (4) a 36px row with the Hide panel icon alone at the left. Three different looks for the three controls: words inside the account tile, a bordered switch, a bare icon, each in its own block.

3. Dark block: DOCK_CLEAR goes; main gets 160px of bottom padding inside the scroll area, so the last row scrolls clear of the dock and no empty ground is drawn.

4. None.

## Spec
1. Groups: 6px gap between groups; a group over 5 rows shows 5 and an "N more" row that expands.
2. Foot block 1: account tile (Deck lift), avatar 24, name 13 medium t1, @handle 12 t3, Sign out 12 t2 at the right.
3. Foot block 2: Deck's Tile "Free week" unchanged.
4. Foot block 3: ThemeSwitch full width.
5. Foot block 4: Hide icon alone, 36px row, left.
6. 8px between blocks, 8px inset, one hairline above the foot.
7. DOCK_CLEAR removed; 160px bottom padding inside the scroll area.
