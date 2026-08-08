# Handoff: Oparax feed card (web + mobile)

## Overview
The Oparax feed is a review queue. Each card represents one ingested story from a source (an X account or a news website), shows a one-paragraph synthesis of that story, and shows a draft post written in the user's voice that they can edit and publish to X. The card is the entire feed — there is no filter bar, no search, no "Stories" header, no counts above the list.

This handoff covers the feed card and the feed shell at two viewports: web (max 1040px content column) and mobile (393px).

## About the design files
`oparax-feed.dc.html` is a **design reference created in HTML** — a working prototype of the intended look and behaviour, not production code to copy. `support.js` is only the runtime that makes that prototype render; it is not part of the design and should not be ported.

The task is to **recreate this design in the target codebase** using its existing framework, component library, and conventions. If no environment exists yet, pick the appropriate framework for the project and build it there.

Open the prototype by serving the folder and loading `oparax-feed.dc.html` in a browser. It has one control (a "viewport" prop, `web` | `mobile`) that switches between the two layouts; in the source this is `this.props.viewport` read in `renderVals()`. In a real app this is a media query, not a prop.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii and interaction behaviour are final. Recreate them precisely, using the codebase's existing primitives where they match. The one thing that is deliberately loose is the app header (logo, account pill, Feed/Voice/Setup nav, avatar) — it is reproduced only as context for the cards; keep the app's real header.

---

## Screens / views

### 1. Feed — web
**Purpose:** the user scans cards, edits drafts, and posts.

**Layout**
- Page background `#08080a`. Content centred, `padding: 40px 24px 80px`.
- Feed shell: `width: 100%`, `max-width: 1040px`, background `#0d0d0b`, border `1px solid #23231d`, `border-radius: 12px`, `overflow: hidden`, shadow `0 24px 60px rgba(0,0,0,0.45)`.
- App header strip: background `#0f0f0d`, `border-bottom: 1px solid #1e1e18`, `padding: 11px 18px`, flex row, `gap: 12px`. Nav (Feed / Voice / Setup) centred via `margin: 0 auto`; avatar pushed right with `margin-left: auto`.
- Card list: `padding: 22px`, `display: flex; flex-direction: column; gap: 24px`.

### 2. Feed — mobile
Same structure, 393px wide, with these differences:
- Device status row above the header (prototype only — the real app uses the OS status bar).
- The Feed / Voice / Setup nav moves out of the header row into a full-width tab row below it: three equal flex items, `padding: 11px 0`, active item `color: #f2efe8` with `border-bottom: 2px solid #1d9bf0`, inactive `#7a766b`.
- Card list padding `14px`, `gap: 16px`.
- Card internal padding and type scale down (see "Fluid sizing").

---

## The card

Structure, top to bottom: **source notch → headline → divider → synthesis → draft box**. Nothing else. No avatar, no status pill ("Ready to review" etc.), no chevron/expander, no judge notes, no "drafted x ago" line.

### Card surface
- Background `#1c1c16`, border `1px solid #3a3a30`, `border-radius: 8px`, shadow `0 12px 32px rgba(0,0,0,0.35)`.
- Padding: top `31–38px` (leaves room for the notch), sides `15–22px`, bottom `15–20px`.
- The card is a container query context (`container-type: inline-size`) so one card component serves both viewports.

### Source notch (top-left, inside the card)
A tab set into the card's top edge — it does **not** protrude above the card. `position: absolute; top: 0; left: 13–20px; border-radius: 0 0 5px 5px; overflow: hidden;` two segments side by side.

- **Segment 1 — source:** icon + handle. `padding: 5px 9px 6px`, `gap: 7px`. Handle `font-size: 11–12.5px; font-weight: 500`.
- **Segment 2 — time:** relative time only ("1m ago", "8m ago"). `padding: 5px 10px 6px`, `font-size: 10.5–11.5px`.

**Fill rule — important.** The time segment is *the source fill with lightness raised by a fixed step*, same hue and chroma. It always gets lighter, never darker, so every source type behaves identically. Text inside it is the source's text color at ~60–72% opacity.

| Source | Icon | Source fill | Time fill (+0.06 L) | Text |
|---|---|---|---|---|
| X | X glyph, 11px, `currentColor` | `oklch(0.20 0.004 100)` | `oklch(0.265 0.004 100)` | `#f2efe8` / time `rgba(242,239,232,0.6)` |
| News site | globe outline, 12px, 2px stroke | `oklch(0.44 0.05 55)` | `oklch(0.505 0.05 55)` | `#faf6ee` / time `rgba(250,246,238,0.72)` |

For a new source type, pick its fill and derive the time segment with the same +0.06 L step.

**The notch is the "view original" affordance.** The whole notch is an `<a>` to the source post/article, `target="_blank" rel="noreferrer"`, with a 9px external-link arrow after the handle at `opacity: 0.5`. Hover: `filter: brightness(1.3)`. There is no separate "View source" button anywhere on the card.

### Headline
`font-weight: 600`, `font-size: 16–21px`, `line-height: 1.28`, `letter-spacing: -0.015em`, color `#f2efe8`, `text-wrap: pretty`. It is the largest text on the card.

### Divider + synthesis
- Divider: `border-top: 1px solid rgba(242,239,232,0.12)` on the synthesis paragraph, with `margin-top` and `padding-top` both `11–14px`.
- Synthesis: `font-size: 13.5–15.5px`, `line-height: 1.6`, color `#aeaba1`, `text-wrap: pretty`. Quieter than both the headline and the draft — it is context, not the action.

### Draft box
Reads as a preview of the post it will become, and is directly editable.
- Background `oklch(0.245 0.004 100)`, border `1px solid #35352c`, `border-radius: 7px`, padding `13–17px / 14–18px / 8–10px`, `margin-top: 13–17px`.
- **Text:** a borderless auto-growing `textarea` — `background: none; border: none; outline: none; resize: none; overflow: hidden`, `font-size: 14.5–17px`, `line-height: 1.5`, color `#f2efe8`, `caret-color: #1d9bf0`. Multiline; height is recalculated to `scrollHeight` on every change. Selection color `rgba(29,155,240,0.3)`.
- **Inset hairline** between text and controls: `height: 1px; background: rgba(242,239,232,0.08); margin-top: 11–14px`. Inset, not a full-bleed footer bar — the box must stay one object.
- **Controls row:** `padding-top: 4px`, space-between.
  - Left: pencil button, label "Edit" (becomes "Editing" while the textarea has focus). Icon 15px, 1.7 stroke, `color: #8a8679`, hover `#e4e1d8`, `min-height: 44px`. Clicking it focuses the textarea and puts the caret at the end.
  - Left, conditional: clock button, appears **only after a draft has been edited**. Label "Edited", or "N edits" when there is more than one version. Same styling and hit area as the pencil.
  - Right: character count then Post button, `gap: 10–14px`.
- **Character count:** `JetBrains Mono`, `font-size: 10–11.5px`, color `#7a766b`, format `NNN/280`. Turns `#e0674f` when over 280.
- **Post button:** `background: #1d9bf0`, `color: #fff`, `border-radius: 2px` (square-ish, deliberate), `height: 30px`, `padding: 0 15px`, `font-size: 13.5–14.5px`, `font-weight: 500`, `line-height: 1`. Hover `#1a8cd8`, active `translateY(1px)`.
- **Posted state:** the button is replaced in place by a static chip — checkmark + "Posted", `background: rgba(29,155,240,0.12)`, `border: 1px solid rgba(29,155,240,0.35)`, `border-radius: 2px`, `height: 30px`, `color: #63b8f2`, entering with the `op-rise` animation.

### Icon-vs-state rationale (keep this)
One icon by default. The pencil is always present, because a block of text that is secretly editable is not discoverable on either platform. History is not a peer action, it is a state: the clock appears only once a version exists. So most cards in the feed carry exactly one icon.

---

## Version history popup

Opened by the clock button. It is an **overlay**, not an inline expansion — the feed must not shift when it opens.

- Backdrop: `position: fixed; inset: 0; z-index: 50; background: rgba(4,4,3,0.72); backdrop-filter: blur(3px); padding: 24px 16px`. Clicking the backdrop closes. `op-fade` 160ms in.
- Alignment: `center` on web, `flex-end` (rises from the bottom) on mobile.
- Panel: `width: 100%`, `max-width: 560px` web / `393px` mobile, `max-height: 78vh`, background `#111110`, border `1px solid #2a2a22`, `border-radius: 10px`, shadow `0 30px 70px rgba(0,0,0,0.6)`, `op-rise` 200ms in. Body scrolls.
- Panel header: `padding: 15px 18px 13px`, `border-bottom: 1px solid #23231d`. Title "Version history" (15px, 600, `#f2efe8`); subtitle `<handle> · N earlier version(s)` (12.5px, `#7a766b`). Close button 30×30, `border: 1px solid #2e2e26`, `border-radius: 4px`, 14px ✕.
- Body: `padding: 16px 18px 20px`, `gap: 14px`.
- **Each version repeats the draft box's own construction** so it reads as "a past draft":
  - Background `oklch(0.245 0.004 100)`, border `1px solid #35352c`, `border-radius: 7px`, `padding: 28px 16px 8px`.
  - Timestamp notch at `top: 0; left: 14px`, `background: oklch(0.30 0.004 100)`, `border-radius: 0 0 5px 5px`, `padding: 4px 10px 5px`, `font-size: 11px`, `color: rgba(242,239,232,0.62)`. Relative label: "just now" / "Nm ago" / "Nh ago".
  - Text: `font-size: 15.5px`, `line-height: 1.5`, `color: #e4e1d8`, `white-space: pre-wrap`.
  - Inset hairline `rgba(242,239,232,0.08)`, `margin-top: 13px`.
  - Footer row, right-aligned, `padding-top: 9px`, `gap: 12px`: character count (same mono style as the card) then **Revert** — `background: #eab308`, `color: #1a1a12`, `border-radius: 2px`, `height: 30px`, `padding: 0 15px`, `font-weight: 500`. Hover `#f5c518`, active `translateY(1px)`. Yellow marks it as a restore action, distinct from the blue publish action.
- Revert sets the draft text to that version and closes the popup.
- Newest version first.

---

## Interactions & behavior

| Trigger | Result |
|---|---|
| Click draft text | Caret lands where clicked; editing begins immediately. |
| Click pencil | Focuses the textarea, caret at end. Label switches to "Editing". |
| Type | Textarea grows to fit content; character count updates live; count turns `#e0674f` above 280. |
| Blur textarea | Commits. If the text changed, the **previous** text is pushed onto the version stack with a timestamp, and the clock button appears. Label returns to "Edit". |
| Click clock | Opens the version popup for that card. Clicking again closes it. |
| Click Revert | Draft becomes that version; popup closes. (Note: reverting is itself an edit, so on the next blur it will also produce a version.) |
| Click backdrop or ✕ | Closes the popup. |
| Click Post | Button is replaced by the "Posted" chip. No confirmation step. |
| Click the notch | Opens the original post/article in a new tab. |
| Hover notch | `filter: brightness(1.3)`. |
| Hover pencil/clock | Color `#8a8679` → `#e4e1d8`, 150ms. |
| Hover Post | `#1d9bf0` → `#1a8cd8`, 150ms. Active: `translateY(1px)`, 100ms. |

Transitions are all 100–200ms; nothing longer.

## State management

Per card:
- `text: string` — current draft.
- `versions: Array<{ text: string; at: number }>` — newest first, capturing the text *before* each committed edit.
- `posted: boolean`.
- `focused: boolean` — drives the Edit/Editing label only.
- Plus a non-render `saved` value per card (last committed text) so blur can tell whether anything actually changed.

Feed level:
- `openHistory: number | null` — index of the card whose popup is open; only one at a time.

Real app additions: persist drafts and versions server-side; `posted` should come from the API, and the Post action needs failure handling (the prototype has none). Character limit is `280`, defined once.

## Fluid sizing

The prototype uses container queries rather than two separate components: the card wrapper sets `container-type: inline-size` and every size is `clamp(min, Ncqw, max)` — e.g. headline `clamp(16px, 1.9cqw, 21px)`, synthesis `clamp(13.5px, 1.5cqw, 15.5px)`, draft `clamp(14.5px, 1.68cqw, 17px)`, card padding `clamp(31px, 3.4cqw, 38px)`. One card component then serves both viewports. Port this if the target platform supports it; otherwise read min = mobile value, max = web value from each clamp.

Fixed regardless of width: notch text (11–12.5px), character count (10–11.5px), Post height (30px), touch targets (44px min-height on pencil and clock).

## Design tokens

**Surfaces**
- Page `#08080a`
- Feed shell / list `#0d0d0b`
- App header `#0f0f0d`
- Card `#1c1c16`, border `#3a3a30`
- Draft box `oklch(0.245 0.004 100)`, border `#35352c`
- Popup panel `#111110`, border `#2a2a22`, header rule `#23231d`
- Version timestamp notch `oklch(0.30 0.004 100)`

**Text**
- Primary `#f2efe8`
- Secondary / synthesis `#aeaba1`
- Version text `#e4e1d8`
- Muted / icons `#8a8679`, hover `#e4e1d8`
- Faint / counts `#7a766b`

**Accents**
- Publish blue `#1d9bf0`, hover `#1a8cd8`, tint `rgba(29,155,240,0.12)`, tint border `rgba(29,155,240,0.35)`, posted text `#63b8f2`
- Revert yellow `#eab308`, hover `#f5c518`, on-yellow text `#1a1a12`
- Over-limit red `#e0674f`
- Live-account dot green `#22c55e`

**Rules**
- Card divider `rgba(242,239,232,0.12)`
- Inset hairline inside draft/version boxes `rgba(242,239,232,0.08)`

**Typography**
- UI, headlines, synthesis, drafts: **Hanken Grotesk** 400/500/600.
- Character counts only: **JetBrains Mono** 400/500. (Nothing else is mono — handles and timestamps are Hanken.)
- Headline `600 / -0.015em / 1.28`; body `400 / 1.6`; draft `400 / 1.5`.

**Radii:** card `8px` · draft & version box `7px` · notch `0 0 5px 5px` · popup `10px` · buttons `2px` · close button `4px` · shell `12px` (web) / `44px` device frame (mobile prototype only).

**Shadows:** card `0 12px 32px rgba(0,0,0,0.35)` · shell `0 24px 60px rgba(0,0,0,0.45)` · popup `0 30px 70px rgba(0,0,0,0.6)`.

**Spacing:** card gap `24px` web / `16px` mobile · list padding `22px` / `14px` · header padding `11px 18px` · popup body gap `14px`.

**Animations**
```css
@keyframes op-rise { from { opacity:0; transform: translateY(5px) } to { opacity:1; transform:none } }
@keyframes op-fade { from { opacity:0 } to { opacity:1 } }
```

## Assets
No image assets. Two inline SVGs: the X glyph (24×24 viewBox, filled `currentColor`) and a globe outline (24×24, 2px stroke) for news sources. UI icons — pencil, clock-with-arrow, external-link arrow, checkmark, ✕, chevrons — are all inline SVG at 9–15px; substitute the codebase's icon set at matching sizes and stroke weights (1.7–2.6). Fonts load from Google Fonts in the prototype; use the app's own font pipeline.

Real deployments need a per-source logo strategy for the notch (favicon or a small logo map) — the prototype uses one generic globe for all news sites.

## Files
- `oparax-feed.dc.html` — the design. Template markup first, then the logic class (state, handlers, tokens) near the end of the file.
- `support.js` — prototype runtime only. Do not port.
