# Three feed directions (council round 1)

Builder: Opus subagent, October 1, 2026. Source of truth: `focus-review/council-design/agreed.md` (where `astra.md`, `grok.md` and `kimi.md` differ, agreed.md wins). Desktop 1440 only.

## How to look

- `/next/feed/directions`: the three side by side, one sentence each, linking to the routes.
- `/next/feed/window`, `/next/feed/newsroom`, `/next/feed/deck`. Add `?theme=light|dark`, `?view=clustered|direct`, `?chrome=0` to hide the review dock. Window and Newsroom also take `?story=<id>` to open a story (for example `st-boe-story`).
- Window and Deck open on Clustered; Newsroom opens on Direct, because one row per report is what makes it the dense direction. The switch is on every page.
- Renders: `focus-review/renders-council/<route>-<theme>.png` (1440x900 viewport) and `<route>-dark-full.png`.
- Each page replays one arrival on load: the checking row reads "Checking 2 items", and after 2.6 seconds the newest story (Olmo-core 3) slides in with a blue New flag and the count drops to 1. Under reduced motion the end state shows at once. This is a replay of a stored report, not live activity; every page says "Preview data from public sources, not from your agent." once, in the top bar.

## Shared foundation (all three)

Palette `palette-council` in `app/(next)/palettes.css`, scoped to a wrapper class so these routes use it whatever palette the dock remembers.

| Role | Dark | Light | Where it appears |
|---|---|---|---|
| Page | `#0b0c0f` | `#eceef2` | ground, near-black with a faint blue tint |
| Window or panel | `#111317` | `#ffffff` | the main object, one step lighter |
| Rail | `#0e1013` | `#f7f8fa` | sidebars and status columns |
| Hairline | white 7.5%, 13% on controls | ink 10%, 16% | every border |
| Text tiers | `#f3f5f8` `#c9ced7` `#8d939e` `#646a75` | `#0e1116` `#343a45` `#5f6672` `#878d99` | title, fact text, meta, dim |
| Blue (brand) | `#3a6cf4` plate, `#6b95ff` marks | `#2459e8` | Get alerts on X, selected view and row (soft band plus a 2px bar), New flag, focus ring, the X post kind, chart bars |
| Post kind | blue | blue | X glyph tile or chip with the word Post |
| Article kind | teal `#3cc9b5` | `#0d9488` | newspaper glyph tile or chip with the word Article |
| GitHub | its own mark, white or near-black | same | digest entries |
| Green | `#4cd07d` | `#17a34a` | agent live (healthy) only |
| Amber | `#f2b84b` | `#c88504` | checking in progress (the live row and its count), FREE WEEK badge |
| Red | `#f2555a` | `#d93a40` | failed items only |

Light and depth: a soft radial light at the top of the page or stage (`--stage-light`), a layered neutral shadow and a 1px top-lit inner edge on the main objects (`--window-shadow`, `--card-shadow`, `--top-light`), fades where a list continues. Native-color favicons (Google's favicon service, DuckDuckGo second, a glyph last) and X avatars (unavatar) on every report, source and account; all loaded in every render (the capture script counts broken images: zero).

Components: React Bits StatusMark (the amber running mark), the React Bits AnimatedList entrance recipe rebuilt with Motion (`next/council/live.tsx`: fade plus short slide, the arriving row opens its height), AI Elements Shimmer (the moving "Checking" label) and Sources trigger and content (Window's "Used 2 sources"), shadcn Collapsible. Pro blocks named in agreed.md were used as anatomy, not imported: `app-shell-4` (Window's three panes), `monitoring-4` and Supabase `ds-table` (Newsroom rows), `stats` metric card (Newsroom chart), React Bits `Stack` and `hero-10` (Deck's stacks, rebuilt in CSS so the front card stays readable). Nothing new was installed, so `app/catalog-foundation.css` is untouched.

## 1. Window

What it shows: the feed as one lit product window sitting in a top-lit frame. Inside: a sidebar with the agent, Feed and Digests counts, the ten chosen sites and feeds with favicons and Feed or Site, the seven X accounts with avatars and handles; a story list with the live checking row, each row with overlapping report marks, publishers, time, headline and kind chips; the open story large (kind chips, fact count, time, headline, image thumbnail when one exists, facts with parenthesized citations that open the verbatim quote), then "Used 2 sources" with each report as its own row (mark, publisher, domain or handle, kind, time) joined by a timeline line, the first one open on its quotes; a status column of tiles: Alerts on X with the blue button, Agent live, Checking and Failed counts, Free week as seven segments, Watched X posts, and reports published per day this week.

Board carryovers: `linear-home-01` and `owner-4` (an app window with sidebar, issue view and right column, lifted off a near-black page); `linear-intake-02` and `linear-plan-08` (the grey top-lit frame the window sits in); `owner-5` and `owner-6` (people and sources as recognizable avatars beside the work); `praised-d3-feed-dark` (story beside its evidence, now with literal labels so each section says what it is).

Assumes yes to: question 1 (each report as its own row with kind, logo, publisher, time), question 2 (image when one exists), question 5 (status tiles instead of sentences).

## 2. Newsroom

What it shows: Supabase dashboard logic. A labelled left nav (FEED, WATCHING, ACCOUNT, with counts), a page header with the blue Get alerts on X, a toolbar (Clustered and Direct with counts, search, Posts, Articles and digest chips), then one panel holding every report as a hairline row under a mono uppercase header: KIND (colored tile and word), STORY (headline and first fact), REPORTS (count chip, blue when more than one), SOURCE (marks and publishers), PUBLISHED (mono time). A LIVE row sits on top in amber. The selected row opens in place: the story's facts on the left, EVIDENCE quotes per report on the right. The right rail: icon status tiles (Agent live with a green dot grid, Checking, Failed, Alerts on X), a metric card "Reports published, 6 in the last 7 days" with a stepped blue area over a dot grid, the GitHub digest, and the free week meter.

Board carryovers: `owner-1` and `supabase-database-01` (mono header, hairline rows, one bordered panel, side panel); `owner-3` (icon tiles with mono labels and a green status mark, a dotted field); `supabase-functions-05` and `supabase-blog-unifiedlogs-01` (a log table with colored status cells and a live top row); `supabase-ds-metriccard-01` (label, big number, stepped sparkline); `supabase-ds-table-01` (footer caption inside the card).

Assumes yes to: question 3 (counts and a small chart from stored timestamps), question 4 (green, amber, red for healthy, in progress, failed; blue for brand and posts), question 5.

## 3. Deck

What it shows: a slim row of four tiles (Stories this week with seven day bars; Reports by kind as a blue and teal split bar with chips; Agent live with checking, failed and alerts state; Free week with segments), then a three-column board of story cards placed newest first into the shortest column. A card shows the story image when one exists, kind chips and time, the headline, two facts with citations and "N more facts", and a footer of report marks. A story built from several reports is a stack: the other reports peek above the front card as plates with a kind-colored edge, publisher, domain and time, and fan out on hover. A dashed amber card holds the live checking row; a Daily digest panel holds the GitHub release.

Board carryovers: `linear-build-08` (a notification card with stacked cards behind it); `linear-insights-03` and `supabase-ds-metriccard-01` (a row of small dashboard widgets with a big number and bars); `owner-2` (unlike product cards side by side, each with its own illustration).

Assumes yes to: questions 1, 2 and 3. Risk recorded by the council: images and tiles can take focus from the news; the headline stays the largest type on each card.

## Real versus preview

Real (verified): every story, fact and evidence span; publishers, URLs, publication times and images. Six reports were added on October 1, 2026, fetched read-only from configured sources (`chosenSites` in `next/data/onboarding.ts`), each span checked by script as a verbatim substring of the page, recorded in `next/data/feed.ts` with "verified 2026-10-01 from <url>":

- Simon Willison, OpenAI DevDay 2026 live blog, Sep 29 15:55 UTC
- Latent Space, AINews on OpenAI DevDay 2026, Sep 30 05:53 UTC (clustered with the above as the GPT-6.1 Sol story)
- Vercel changelog, Microsoft AI models on AI Gateway, Oct 1
- Vercel changelog, Vercel Agent installs private packages, Sep 30 23:22 UTC
- Hugging Face blog, Olmo-core 3, Oct 1 15:01 UTC
- Mistral AI news, Munich hub, Sep 28 15:57 UTC

The GitHub digest entry (vercel/next.js v15.0.0, "The React Framework", released Oct 21, 2024) comes from `pro-exploration/examples-verified.json`; it is shown as a digest, never as a story report. Its why_now line is null because none was recorded. No Product Hunt entry was verified, so none is shown.

Computed from stored values: kind counts, report counts, "Stories this week" (5) and "Reports published" (6) and the seven day bars, all by publication date, which is not arrival time. No deltas or percent changes are shown because there is no second real period.

Preview (fixture): the recorded onboarding run's source and account names are real rows, but their reasons and scores are fixture values; 2 items checking, 1 failed, alerts not connected, 7 days left, 0 of 300 watched posts; the arrival replay.

## Judgment calls

- Amber marks "checking, in progress" (Linear's In Progress convention) as well as warnings, so amber has a place on screen without inventing a warning. If the owner wants amber only for warnings, the checking mark goes neutral.
- Articles are teal rather than the pure green Grok proposed, so "article" never reads as "healthy".
- Newsroom opens on Direct for density; the others open on Clustered, the product default.
- All story images and avatars load lazily. Eager images made React emit image preloads into the head, and with them the page sometimes fell back to a client render that dropped the `dark` class from `<html>`. The top bar also re-applies the theme after mount as a guard.
