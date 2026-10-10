I'll read the brief and the guidance index first, then only the skill files that apply to this review.The brief is a single exact rail design. I'll use the design and accessibility guidance, then the named pictures and the shell, Deck, and theme files.The current rail and the feed cut are clear. Next I’ll read the three accepted dark feeds and the shell, Deck tile, and theme tokens so the spec can name exact sizes.The rail reads as one smear because the foot in `stable-rail.png` is a single column of the same 13px text on `--rail`: name, "Sign out", "Free week", the 22px "7", the segments, the 11.5px usage line, the Light | Dark pill, and a lone 28px icon. Nothing has a surface, so they touch, and the 32px nav rows, headings, and source rows above are the same 13px texture. `accepted-window-dark.png` makes the account its own row (initial, name) inside a lifted rail, with a count or handle at each row's right end. `accepted-deck-dark.png` puts "Free week", the big "7", "days left", and the full blue segments inside one bordered tile. This rail uses neither object.

**Rail.** 240px, fixed to the left edge, background `--rail`, 1px `--line` on the right. No shadow on the rail and no gap between rail and viewport.

**Head.** Unchanged: 18px mark, "Oparax" at 15px semibold `--t1`, tracking -0.01em, padding 16px, 1px `--line` under it.

**Nav.** Feed, Settings, Notifications. Each row is 32px, margin 8px, radius 8px, 15px icon at x16, 13px medium label at x36, 2px between rows. The current page is background `--raised`, text `--t1`, with a 2px `--brand` bar on the rail edge. The others are `--t2`. Then 12px of rail ground. No rule. Onboarding still hides this block and shows the seven steps.

**Groups.** No hairlines. 8px of ground before every group after the first. Heading: a 32px button, 13px semibold `--t1`, 14px glyph in `--kind-post`, `--kind-article`, or `--kind-github`, count at 11px mono `--t3`, chevron 12px `--t4`, icon at x16 and label at x36. Row: 30px, 16px logo, name only at 13px `--t2`, same x16 and x36. A pressed row is background `--raised`, text `--t1`. Empty groups stay absent.

**Foot.** Remove the top rule. Padding 12px. Three objects with 8px of `--rail` between them, then the control row. They differ in body and do not touch.

1. Account, a `div`, not a button. Use `lift` and `liftStyle` from `v2/deck/chrome.tsx` (`rounded-xl`, border `--line-strong`, background `--window`, `--card-shadow`, `--top-light`). Height 44px, padding-x 10px. A 24px circle, background `--brand`, white 11px semibold `profile.name[0]`. Beside it, the name at 13px medium `--t1` and `@handle` at 11px `--t3`, stacked and truncated.
2. Sign out, the existing login link. Height 32px, full width, radius 8px, 1px `--line`, no fill, no shadow, 13px medium `--t2`, padding-x 10px. Hover: background `--raised`, text `--t1`.
3. Free week, Deck's `Tile` with that label. Inside it, the Deck feed block: `status.daysLeft` at 22px semibold tabular `--t1`, "days left" at 13px `--t2`, then `Segments` from `v2/deck/marks.tsx` with `total={status.trialDays}`, `filled={status.daysLeft}`, and the default brand tone so all seven are `--brand` while 7 of 7 remain. Under that, "`poolUsed` of `poolLimit` watched Twitter posts used" at 11.5px `--t3`.
4. Control row, 8px under the tile. `ThemeSwitch` flexes to fill, then an 8px gap, then Hide: a 32px button, radius 8px, 1px `--line`, 14px icon `--t3`, `aria-label="Hide sidebar"`. The Show button, while the rail is hidden, is that same button, fixed 16px from the left and the bottom. Every control keeps a 2px `--brand` focus outline.

**Dark block.** Delete the `DOCK_CLEAR` sibling, the 144px `aria-hidden` strip under the scrollport in `AppShell`. The scroller is `h-svh overflow-y-auto` with `scroll-padding-bottom: 160px`. `main` uses `pb-[160px]` in place of `pb-12`. The lab dock stays fixed. Cards scroll under it, and the last card can rest fully above it. The pad is the page ground, so the feed no longer stops in a dead band. `scroll-padding-bottom` keeps a focused card clear of the dock.

**Also.** The nav and the first group meet on a 2px gap, so pages and sources read as one list. The 12px gap is the fix. Hide is a bare 28px glyph in the same stack as Sign out. The bordered 32px button is the fix. Nothing else in `stable-feed.png`, `stable-rail.png`, or `stable-foot.png`. The empty ground in `stable-onboarding-rest.png` is the short page. The same scroll change leaves it alone.

## Spec

1. Rail: 240px, fixed left, background `--rail`, right edge 1px `--line`.
2. Head: 18px mark, 15px semibold "Oparax" `--t1`, padding 16px, 1px `--line` below.
3. Nav rows: 32px, radius 8px, 13px medium, 15px icon, current page background `--raised` plus a 2px `--brand` bar.
4. 12px of ground under the nav. Groups have 8px of ground between them and no rules.
5. Heading: 32px button, 13px semibold `--t1`, 14px hue glyph, 11px mono count `--t3`, 12px chevron.
6. Source row: 30px, 16px logo, name only 13px `--t2`, aligned with the heading.
7. Foot: padding 12px, no top rule. Account row, 8px, Sign out, 8px, Free week tile, 8px, theme switch plus Hide.
8. Account: `lift` plus `liftStyle`, height 44px, 24px `--brand` initial, name 13px `--t1`, handle 11px `--t3`.
9. Sign out: height 32px, radius 8px, 1px `--line`, 13px `--t2`, no shadow.
10. Free week: Deck `Tile` and `Segments`, 22px number, brand segments, usage line 11.5px `--t3`.
11. `ThemeSwitch` flexes. Hide and Show are 32px bordered buttons with a 2px `--brand` focus outline.
12. Remove `DOCK_CLEAR`. The scroller is full viewport height, `scroll-padding-bottom: 160px`, and `main` has `pb-[160px]`.