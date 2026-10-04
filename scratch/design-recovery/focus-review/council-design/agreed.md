# Council-design round 1: reconciled agreement (host, October 2)

Lanes: Astra (gpt-6-astra), Grok (grok-4.7-build-fast), Kimi (kimi-k3-high); answers in `astra.md`, `grok.md`, `kimi.md`. All three opened the board (Kimi could not decode the six owner .webp files and used the PNG captures of the same pages instead; its owner-picks claims are secondhand).

## Diagnosis all three share
- In Kimi's words: "his pages show many small machines working; ours show paragraphs in boxes." Linear and Supabase put a working product on the page: windows, boards, tables, charts, chips that mean something. The four rejected feeds are one column of prose cards in four tints.
- Palette is a minor part (Kimi estimates about 20 percent). The rest is objects, composition, depth and light, density and text tiers.
- The research's "dots only, 0.5 percent color" reading was wrong for him; his 10 points win (all three).
- The card spec: Grok says the locked "nothing else" line ordered the result; Kimi says the spec is not the binding constraint, since time and counts were added and still failed; Astra keeps the anatomy but would reopen "nothing else" where it hides evidence. Agreed: keep the story's own anatomy (title, bullets, parenthesized citation), and put yes or no questions to the owner about what may sit AROUND it. The render shows each direction as if he says yes, labelled as such.

## Shared foundation (all three directions)
- Ground: neutral near-black with a faint blue tint (chroma under 0.01), one step lighter for the main window or panel, white hairlines at 8 percent (13.5 percent on controls), four text tiers. Light mode on a pale grey page with white panels and visibly darker borders.
- Light and depth: one soft radial light behind the main object (`linear-home-fold.png`), a neutral layered shadow on that one object only, top-lit border on featured surfaces, edge fades where a list continues.
- Blue is felt: the primary action, the selected view and the focus ring, plus blue as a kind hue (Grok, Kimi).
- Functional color, each hue with a word or icon: X post = blue mark, article = green mark (Grok), GitHub digest = the real GitHub mark, Product Hunt = its real orange; status: green = alerts on or healthy, amber = pool warning, free week under 3 days, paused source; red = failed, unreadable, alerts stopped (Grok, Kimi, Astra's status mapping). Native-color publisher logos and X avatars on every report.
- Motion that shows arrival: new rows enter with a short fade and slide (React Bits `animated-list` or `notifications-1` motion), a live "checking" row driven by the pending count, reduced motion respected.
- Truth limits (Astra): no invented activity, no deltas without two real buckets, publication time is not arrival time, GitHub is a digest not a story report. Counts and sparklines only from stored timestamps.

## The three directions (merged)
1. **Window** (Astra A, Grok Window, Kimi B): app shell (sidebar with Direct/Clustered, sources with native favicons and kind dots, alert status at the bottom), center a raised story window (title and facts large on the left, the report stack on the right: each report as its own row with kind mark, real logo or avatar, publisher, time, and its quote on selection), a slim live strip above naming what is being checked, right rail of status tiles (alerts, failed, days left, pool). Built from `owner-4.webp`, `owner-5/6.webp`, `owner-1.webp`, `linear-home-01`, `linear-intake-02`. Components: `app-shell-4` or `app-sidebar-*`, `click-stack` or `Stack` for reports, `agent-activity-1` for the live strip, AI Elements `Sources`, shadcn `Avatar`, `Badge`.
2. **Newsroom** (Kimi A, Astra B, Grok Instrument): Supabase dashboard logic. One full-width panel holding the feed as hairline rows under a mono uppercase header (KIND, STORY, REPORTS, SOURCES, TIME): colored kind tile, native logo or avatar, headline, a "2 reports" chip, dim tabular time; a "checking now" row on top; a row expands in place to the full story with its evidence. Right rail of status tiles with icon tiles and one metric card with a count of stories per day from stored times. Built from `owner-1.webp`, `owner-3.webp`, `supabase-database-01`, `supabase-functions-05`, `supabase-ds-*`. Densest: many rows on the first screen. Components: shadcn `Table`, `Collapsible`, `Progress`, React Bits Pro metric or stats card, `monitoring-4` row anatomy.
3. **Deck** (Kimi C, Astra C, Grok Board): one slim row of four tiles on top (stories today, coverage sparkline from stored times, alerts, free week meter), then stories as physical report stacks: a clustered story is a card with its other reports peeking behind it (React Bits `Stack` or `hero-10` stacking), a direct item is a flat card, so kinds and cluster size read at a glance; a digest panel holds GitHub and Product Hunt entries. Built from `linear-build-08`, `linear-insights-03`, `sb-ds-metric-card`, `owner-2.webp`. Most colorful; risk: news must stay in focus (his d1 verdict).

## Build order Astra and Grok would build Window first; Kimi would build Newsroom first and says "if two can be rendered, render A and B". The owner asked to see directions and judge by looking, so the host renders all three on the same content, dark and light, then asks him.

## Yes or no questions for the owner (merged, shown beside the renders)
1. May each report show beside its story as its own row or stacked card, with kind, real logo or avatar, publisher and time?
2. May a story show its image when one exists, and stay complete when it does not?
3. May the page show counts and a small chart computed only from timestamps already stored?
4. May green, amber and red mark healthy, warning and failure, with blue staying the brand accent and the post mark?
5. May the right side become status tiles instead of sentences?
