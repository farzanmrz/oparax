1. The foot reads as incoherent because the username, Sign out link, free week counter, and theme toggle are rendered as a continuous, unboxed list of loose text on the same flat rail ground. The element sizes clash (e.g., the 22px "7" sitting tightly above 13px text) because they bleed into each other without the physical boundaries, raised rows, or bordered tiles that the accepted feeds used to separate distinct functions into objects.

2. **Rail Design**
- **Head**: 48px height, bottom border `--line`. 18px Oparax mark, 15px `--t1` font-semibold "Oparax".
- **Nav rows** (Feed, Settings, Notifications): 32px height, 8px padding, 2px gap. Icon at 15px (`--t3`), label at 13px (`--t2`). Selected state uses `--raised` background and a 2px `--brand` left border. No hairlines between rows.
- **Groups**: Headings are 32px height: kind icon in its hue at 14px, name at 13px (`--t1` font-semibold), count at 11px (`--t3` font-mono), chevron. Rows are 30px height: logo at 16px, name only at 13px (`--t2`). No hairlines between groups.
- **Foot**: Separated from the scrolling groups by a top `--line` border, 16px padding, with a 12px gap between each object:
  - **Account**: Window's account row vocabulary. A flex row containing a 20px blue initial avatar ("F"), name at 13px (`--t1` font-medium), and handle at 13px (`--t3`).
  - **Sign out**: A 32px secondary button (`--window` background, `--line-strong` border, `--top-light` shadow, 13px `--t2` text).
  - **Free week**: Deck's `Tile` component (lifted `--window` background, `--line-strong` border, `--card-shadow`, `--top-light`). Inside: "Free week" at 12px (`--t3`); a line with the 22px `--t1` "7" and 13px `--t2` "days left"; the 7 full blue `--brand` segments; and the quota text at 11.5px (`--t3`).
  - **Theme toggle**: The 28px segmented control inside a `--well` background.
  - **Hide**: The 28px panel icon at the bottom left.

3. **Dark Block Fix**
In `AppShell`, remove the empty 144px spacer (`<div aria-hidden="true" className="shrink-0" style={{ height: DOCK_CLEAR }} />`) that sits below and outside the scrollable area. Instead, move that space into the scroll area by applying `paddingBottom: 144px` (or updating `switcherClear` to `pb-[144px]`) to the `main` container, allowing the feed cards to scroll full-height behind the transparent dock without being abruptly cut off.

4. **Incoherent against words**
None. With the foot grouped into objects and the dark block removed, the rest of the rail perfectly matches his accepted rules: names only on rows, headings distinct from rows via hue icons and chevrons, no "All Sources", and a full blue meter.

## Spec
1. **Head**: 48px row, bottom `--line` border. 18px mark, 15px `--t1` font-semibold "Oparax".
2. **Nav Rows**: 32px height, 2px gap. 15px icon, 13px `--t2` label. Selected: `--raised` bg, 2px `--brand` left border. No hairlines.
3. **Group Headings**: 32px flex row. 14px kind icon (hue), 13px `--t1` font-semibold name, 11px `--t3` font-mono count, chevron.
4. **Group Rows**: 30px height. 16px logo/avatar, 13px `--t2` name only. No hairlines between groups.
5. **Foot Container**: Top `--line` border, 16px padding, flex column with 12px gap between items.
6. **Foot - Account Row**: Flex row, 20px `--brand` initial avatar ("F"), 13px `--t1` font-medium name, 13px `--t3` handle.
7. **Foot - Sign Out**: 32px button, `--window` bg, `--line-strong` border, `--top-light` shadow, 13px `--t2` text.
8. **Foot - Free Week Tile**: Deck `Tile` (bg `--window`, border `--line-strong`, shadow `--card-shadow` + `--top-light`). "Free week" at 12px `--t3`; 22px `--t1` "7" + 13px `--t2` "days left"; `Segments` full blue (`--brand`); quota text 11.5px `--t3`.
9. **Foot - Theme Toggle**: 28px segmented control, `--well` bg.
10. **Foot - Hide Panel**: 28px square icon button, left-aligned at bottom.
11. **Dark Block Fix**: Remove `<div style={{ height: DOCK_CLEAR }} />` below the scroll area in `AppShell`. Apply `pb-[144px]` to the `main` scroll container.