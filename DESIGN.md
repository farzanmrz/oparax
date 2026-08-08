# Oparax Design System

`DESIGN.md` is the living contract for Oparax product UI. `app/globals.css` is its production token source; components consume those custom properties rather than re-deriving values.

## Tokens

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
| Content width / gutters | `--content-max` / `--gutter-mobile` / `--gutter-mobile-narrow` / `--gutter-web` | `1356px` / `32px` / `16px` / `6px` |
| Page rhythm | `--page-rhythm-mobile` / `--page-rhythm-web` | `16px` / `24px` |
| Source-strip height | `--strip-h-mobile` / `--strip-h-web` | `38px` / `32px` |
| Post height | `--post-h-mobile` / `--post-h-web` | `44px` / `30px` |
| Draft footer gap | `--draft-footer-gap-mobile` / `--draft-footer-gap-web` | `8px` / `1px` |
| Mobile char-label gap | `--char-count-gap-mobile` | `4px` |

## Radius Language

Cards use 10px (`rounded-lg`), controls and inputs use 6px (`rounded-md`), tags use 5px (`rounded-sm`), and count badges use 4px (`rounded-badge`). The only circles are avatars and status dots; controls, chips, tags, and badges are rounded rectangles.

## Card Anatomy

Every non-feed card uses the shared gradient, 1px border, 10px radius, and blue-backlit shadow. Its full-bleed header band uses 12px vertical and 24px horizontal padding, a bottom rule, 15px/500 ice-blue text, and a 22px square icon tile. Danger cards keep the same anatomy with a red border, red title, and faint red band fill. Card content uses 20px vertical and 24px horizontal padding.

## Feed Card Anatomy

The feed card is one 10px gradient card with three stacked zones: a source-tinted strip, the story body, and a blue-tinted draft zone. The source strip carries the source identity, freshness, alert slot, and menu; its leading icon is a fixed 15px slot for every source kind — the X logo, or a website favicon/globe fallback centered on a rounded 3px neutral light tile — so the strip's leading edge never shifts and dark logos stay legible. Website sources display their onboarded publication name ("Mundo Deportivo") and fall back to the www-stripped hostname; the story body carries only the title and synthesis; the draft zone carries the editable post text, count and edited state, and posting control. The draft editor height follows rendered content and reflows with width and breakpoint changes, with no clipping, overlap, reserved textarea floor, or spacer. When unfocused, the draft display styles @mentions, #hashtags, URLs, and recognized X entities in action blue; native editing preserves the raw text. Saved Guide quoted real-post examples use the same treatment; ordinary guide prose remains unaffected. Source access belongs in the menu, not inline in the body.

The reasoning sheet is user-facing: its title is Brain icon + Reasoning, with no eyebrow or helper copy, followed by an Info introduction and the persisted beat-match explanation. For newly generated drafts, `model_calls.usage.draftConstruction` also records a versioned editorial account of the selected post mode, the voice rules applied, and the formatting choices, each with a concise explanation; this is structured reporter-facing provenance, not hidden chain-of-thought. Historic drafts may show that construction details were not recorded, and an edited draft labels the account as belonging to the original model draft. The sheet omits duplicated title, synthesis, and draft content as well as raw provider traces, JSON, and markdown.

The desk tab and page heading use the same PenLine identity and the name Guide. Guide card headers use semantic section icons, while legacy `Hard Rules — Always` and `Hard Rules — Never` are grouped visually as a single Rules card with Do and Avoid subsections; this compatibility presentation does not change stored guide content or its drafting/audit order.

## Semantic Color Meanings

Blue means action, linking, and composing. Green means live, posted, or connected. Amber means freshness, caution or an edited-draft state, and states or actions that are uncertain, unconfirmed, or in progress. Red means deleted-source or destructive action. These meanings are stable across all states and pages.

## Type Scale

Hanken Grotesk is the UI face, Space Grotesk is reserved for draft/post text, and JetBrains Mono is reserved for counts and timestamps. Page headers are 21px/700 with -0.015em tracking; card-band headers are 15px/500; feed titles are 20px/600 with 1.3 line height and -0.017em tracking; synthesis is 14.5px with 1.6 line height; draft text is 16.5px with 1.52 line height; source-strip names are 13.5px with 13px times (14.5px and 14px below 700px); counts are 11.5px.

Page and card headers use Title Case. `PageHeading` pairs a 20px icon and its title at 8px, with 12px between the title group and heading actions. Do not use all-caps headings, eyebrow copy, or helper subtitles below redesigned headers; ordinary form labels remain explicit. Owner-decided exception: the create-agent form's field labels carry always-visible helper text below them (12px muted) in place of the removed info-icon hover tooltips, which were undiscoverable on mobile.

## Form Fields

Create-agent field labels carry always-visible helper text (the recorded exception above); placeholders are short native examples only, never instructions — the helper text carries the instruction. X-account and website fields are single-line add fields with committed source rows above them, sharing one component with Sources; they keep an inline + Add control and disable autocapitalize/autocorrect/spellcheck, with the URL keyboard on website fields. Agent names cap at 30 characters, enforced with a live red under-field error in the login-form style. The connected X-account row shows the green dot and @handle only. Sources website rows are single-line onboarded names with a bare hostname fallback and no URL text; their fixed 15px favicon/globe slot uses the same neutral light tile as the feed strip.

## Touch Targets

Under 700px, every touch control has a hit area of at least 44px in both dimensions. Icon chrome may remain 24–30px inside that hit area. Icon-only controls require an accessible label and visible focus treatment.

## Responsive Rules

The shared `desk` breakpoint is 700px. Desktop content is at most 1356px wide with 6px gutters and 24px page rhythm; mobile uses 32px gutters and 16px page rhythm, falling back to 16px gutters below 360px wide. Redesigned surfaces use `desk:` responsive gates, never `md:`. Sources keep intentional 8px source-row gaps, 44px mobile and 36px desk row heights, and a 16px offset before each add-source field. Guide masonry uses the shared 16px/24px rhythm for both columns and card separation.

Below 700px, feed titles are 17.5px, synthesis is 13.5px, draft text is 15px, source strips grow from 32px to 38px, and Post becomes a full-width 44px footer with an 8px gap after the draft text. The regular Post action carries compact, quiet left-side `N chars` metadata with a balanced 4px separation and no divider rather than in a standalone row; web retains a separate count. Source names and times never truncate on mobile; source alerts become icon-only popovers. On web, the alert truncates first, then time, then source name.

The app header has three mobile stages tied to the inner application scroller: full at or above 90px from the top, fully hidden while scrolling down, and tabs-only while scrolling up mid-page. The web header remains pinned. The mobile transformation runs for 260ms; hidden uses `translateY(-101%)` and tabs-only uses `translateY(-57px)`.
