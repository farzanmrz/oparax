In [stable-rail.png](/Users/farzanm4/Desktop/repos/oparax/img/stable-rail.png), navigation, group headings and source names share almost the same size, alignment and spacing, while the footer runs identity, Sign out and usage together as loose text. The uncontained 22px “7” interrupts those 13px lines; [accepted-window-dark.png](/Users/farzanm4/Desktop/repos/oparax/img/accepted-window-dark.png) gives identity a recognizable account row, and [accepted-deck-dark.png](/Users/farzanm4/Desktop/repos/oparax/img/accepted-deck-dark.png) contains the counter, label and meter inside one lifted tile.

Use Window’s account-row composition and Deck’s trial tile. Separation comes from consistent alignment, deliberate gaps and recognizable controls.

The dark block is structural: `AppShell` subtracts `DOCK_CLEAR` from the scrolling viewport. Delete that spacer and let the viewport reach the screen’s bottom; put clearance after the content, inside the scroller. Cards will continue behind the floating dock, and the final card can scroll completely above it.

One additional incoherence: the selected Feed row uses an edge stripe, while the view and theme controls use enclosed blue selection. Adopt Window’s enclosed selection for navigation. The lone Hide icon also needs a visible label so it reads as a control belonging to the footer.

## Spec

1. **Rail:** retain 240px width and full viewport height; `--rail` background, 1px `--line` right border. Keep the existing page column and `--stage-light`. Head, navigation and footer do not shrink; sources occupy the remaining independently scrolling space.

2. **Head:** 56px high, 16px horizontal padding; 18px Oparax mark, 8px gap, “Oparax” at 15px/20px semibold `--t1`. Retain its bottom `--line` border.

3. **Navigation:** Feed, Settings, Notifications in that order; 32px rows, 2px between rows, 8px outer inset, 8px inner padding, 16px icons, 8px icon-to-label gap; labels 13px/20px medium. Default text `--t2`, icons `--t3`; selected row uses `--brand-soft`, inset 1px `--brand-line`, `--t1` text and `--brand` icon. Remove the viewport-edge stripe; retain existing row radius.

4. **Groups:** start 12px below navigation; Twitter accounts, RSS feeds, Websites, GitHub, with 12px between groups and no dividing lines. Headers are 28px high, 16px horizontal padding, 11.5px/16px semibold `--t3`; 16px kind icon, 8px gap, count and chevron right-aligned. Preserve existing kind tokens. Source rows are 28px high, 13px/20px `--t2`, 16px real marks at x16, names at x40. Keep names only and all existing sources; use scrolling, without a new truncation limit.

5. **Footer container:** `--rail`, one top `--line` border, padding 12px 12px 16px; children separated by 12px. Order: account row, trial tile, theme switch, Hide. No separators between these children.

6. **Account row:** 48px high, no surrounding tile; 24px existing profile avatar, 8px gap, name at 13px/18px semibold `--t1`, handle beneath at 11.5px/16px `--t3`. Place Sign out at the right with an 8px minimum gap: 64×28px outlined secondary control, 12px medium `--t2`, `--window` fill, `--line-strong` border and `--top-light`.

7. **Trial tile:** reuse Deck `Tile`, `lift` and `liftStyle`; 216px wide, 12px padding. “Free week” at 12px/16px `--t3`; 4px below, 22px/24px semibold `--t1` number beside 13px `--t2` “days left”. After 8px, reuse `Segments`: seven full blue segments, 6px high, 4px gaps. After 8px, “Watched Twitter posts” left and “0 / 300” right, both 11.5px/16px `--t3`.

8. **Utilities:** retain the full-width 32px Light/Dark switch; below it, a 28px ghost button with 16px panel icon, 8px gap and 13px `--t2` “Hide”. Preserve focus handling and the hidden-rail restore control.

9. **Feed clearance:** delete `DOCK_CLEAR` and its spacer; retain the full-height scroller; replace `switcherClear`’s 48px padding with 160px bottom padding inside `main`. Keep the dock fixed with no full-width background or mask beneath it.