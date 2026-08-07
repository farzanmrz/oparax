# Oparax Design System

This document is the living contract for Oparax product UI. When design artifacts disagree, the canonical prototype HTML wins, then the handoff README, then `tokens.css`: `Oparax App Prototype v2.dc.html` > `README.md` > `tokens.css`.

## Tokens

The production values live in `app/globals.css`; components consume the custom properties instead of re-deriving them.

| Role | Token | Value |
| --- | --- | --- |
| Page ground | `--page-bg` | `#0c0c0e` |
| Header ground | `--header-bg` | `#121214` |
| Card gradient | `--card-grad-top` → `--card-grad-bottom` | `oklch(0.2 0.006 260)` → `oklch(0.172 0.004 260)` |
| Card border | `--card-border` | `rgba(255,255,255,0.13)` |
| Band fill / rule | `--band-bg` / `--band-border` | `rgba(255,255,255,0.045)` / `rgba(255,255,255,0.09)` |
| Draft zone | `--draft-bg` / `--draft-border-top` | `oklch(0.24 0.015 250)` / `oklch(0.62 0.15 245 / 0.28)` |
| Action blue | `--accent` | `oklch(0.62 0.15 245)` |
| Success green | `--success` | `oklch(0.78 0.17 155)` |
| Warning amber | `--warn` | `oklch(0.8 0.14 76)` |
| Stale amber | `--warn-stale` | `oklch(0.66 0.04 76)` |
| Danger red | `--danger` | `oklch(0.66 0.2 25)` |
| Title / body / draft | `--text-title` / `--text-body` / `--text-draft` | `oklch(0.97 0.008 95)` / `oklch(0.74 0.012 90)` / `oklch(0.95 0.004 95)` |

## Radius Language

Cards use 10px (`rounded-lg`), controls and inputs use 6px (`rounded-md`), tags use 5px (`rounded-sm`), and count badges use 4px (`rounded-badge`). The only circles are avatars and status dots; controls, chips, tags, and badges are rounded rectangles.

## Card Anatomy

Every non-feed card uses the shared gradient, 1px border, 10px radius, and blue-backlit shadow. Its full-bleed header band uses 12px vertical and 24px horizontal padding, a bottom rule, 15px/500 ice-blue text, and a 22px square icon tile. Danger cards keep the same anatomy with a red border, red title, and faint red band fill. Card content uses 20px vertical and 24px horizontal padding.

## Feed Card Anatomy

The feed card is one 10px gradient card with three stacked zones: a source-tinted strip, the story body, and a blue-tinted draft zone. The source strip carries the source identity, freshness, alert slot, and menu; the story body carries only the title and synthesis; the draft zone carries the editable post text, count and edited state, and posting control. Source access belongs in the menu, not inline in the body.

## Semantic Color Meanings

Blue means action, linking, and composing. Green means live, posted, or connected. Amber means freshness or an edited-source warning. Red means deleted-source or destructive action. These meanings are stable across all states and pages.

## Type Scale

Hanken Grotesk is the UI face, Space Grotesk is reserved for draft/post text, and JetBrains Mono is reserved for counts and timestamps. Page headers are 21px/700 with -0.015em tracking; card-band headers are 15px/500; feed titles are 20px/600 with 1.3 line height and -0.017em tracking; synthesis is 14.5px with 1.6 line height; draft text is 16.5px with 1.52 line height; source strips are 12.5px; counts are 11.5px.

Page and card headers use Title Case. Do not use all-caps headings, eyebrow copy, or helper subtitles below redesigned headers; ordinary form labels remain explicit.

## Touch Targets

Under 700px, every touch control has a hit area of at least 44px in both dimensions. Icon chrome may remain 24–30px inside that hit area. Icon-only controls require an accessible label and visible focus treatment.

## Responsive Rules

The shared `desk` breakpoint is 700px. Web content is at most 1080px wide with 12px gutters and 24px card gaps; mobile uses 16px gutters and gaps. Redesigned surfaces use `desk:` responsive gates, never `md:`.

Below 700px, feed titles are 17.5px, synthesis is 13.5px, draft text is 15px, source strips grow from 32px to 38px, and Post becomes a full-width 40px footer. Source names and times never truncate on mobile; source alerts become icon-only popovers. On web, the alert truncates first, then time, then source name.

The app header has three mobile stages tied to the inner application scroller: full at or above 90px from the top, fully hidden while scrolling down, and tabs-only while scrolling up mid-page. The web header remains pinned. The mobile transformation runs for 260ms; hidden uses `translateY(-101%)` and tabs-only uses `translateY(-57px)`.
