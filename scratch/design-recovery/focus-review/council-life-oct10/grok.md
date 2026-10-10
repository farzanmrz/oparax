I'll read the brief and the guidance index first, then only the skills that apply to this review.This is a color review of the One feed. I'll read the design skill and the named sources, then look at the seven pictures.The blue stayed in the chrome. Kind, live, caution, failed, and the free-week meter left the feed. Reading flow: put the hue on the card the person is already reading.

Accepted Deck, Window, and Newsroom (`accepted-deck-dark.png`, `accepted-window-dark.png`, `accepted-newsroom-dark.png`) carry colour on seven things. `a-feed.png` and `a-feed-light.png` keep logos, pictures, and one blue control.

- **Tiles.** A `--brand` chart, Live in `--ok`, Checking in `--caution`, Failed in `--error` (Deck's top row, Newsroom's side, Window's rail). The One has none.
- **Kind chips.** Teal Article chips on Deck and Window. Newsroom's KIND column, blue "2 Posts", teal "8 Articles". One cards name the source only.
- **Live row.** "Checking 1 item against your sentence" in `--caution`, plus a green Live dot. The feed has none. `a-onboarding-run.png` still has `--ok` checks and a `--caution` step.
- **Meter.** FREE WEEK dashes in `--brand`, "7 days left", grey 0 of 300. Absent on the feed and on `a-sources.png`.
- **Selection.** Window's open story is a `--brand` left bar on `--raised`. Clustered or Direct is a brand pill. One dark: the Feed pill is `--primary` `#3a6cf4`, and the bubble button is blue. Clustered/Direct is grey. One light: that nav pill is `--brand-soft`, a wash.
- **Links.** Solid `--brand` "Get alerts on X". Headlines stay `--t1`. The One feed has no brand link. Facts stay `--t2`.
- **Marks.** Kind glyphs and status marks (green dot, amber arc, red dot). The One keeps logos and pictures, the life from October 4 ("would have never looked so lively"). Kind and status marks are gone. Sidebar icons are mono. Sources is logos, a blue nav pill, and grey Add buttons.

Light is that same gap with a fainter blue: grey page, white cards, photos. The narrow colour from October 2. No new token. A card-tint token is the one to refuse.

**Kind chips.** Each card's source row gets a glyph and Article, Post, or GitHub. Dark: `--kind-article` `#3cc9b5` on `--kind-article-soft` `rgb(60 201 181 / 0.12)`, `--kind-post` `#6b95ff` on `rgb(107 149 255 / 0.14)`, `--kind-github` `#e6e8eb` on `rgb(230 232 235 / 0.08)`. Light: `#0d9488` on `rgb(13 148 136 / 0.1)`, `#2459e8` on `rgb(36 89 232 / 0.1)`, `#1f2328` on `rgb(31 35 40 / 0.07)`. Cards stay. Adds the kind on the story, on arrival, in both modes. Risk: a tinted band is a new card ground, the October 4 green card. The chip stays small. No wash, no left border. Nearest miss: `landing-flat`, if chips replace pictures. shadcn Badge.

**Status row.** One `--tile-bg` row (`--card-shadow`, `--top-light`) between the title and the cards. FREE WEEK in mono, days in `--caution` (`#f2b84b` / `#c88504`), segments in `--brand` (`#6b95ff` / `#2459e8`). Live dot `--ok` (`#4cd07d` / `#17a34a`) on `--ok-soft`. Checking in `--caution` on `--caution-soft` (React Bits StatusMark), the sentence in that row, AI Elements Shimmer on that word only while a check runs. Failed `--error` (`#f2555a` / `#d93a40`) on `--error-soft`. Watched posts stay `--t3` on `--line`. Adds the meter he liked, and green, amber, and red, solid in both modes. Risk: drop any tile whose count is empty, and skip a chart (it repeats the counts). One row, outside the locked sidebar, short of Deck's header.

**Selection and links.** Active Clustered or Direct: solid `--primary` (`#3a6cf4` dark, `#2459e8` light), white label. Idle: `--t2`, `--line` edge. An alerts or outbound action: label `--brand` (`#6b95ff` / `#2459e8`). Headlines `--t1`, facts `--t2`, focus `--brand-line`. A marked card: `--raised` plus a `--brand-line` ring. Adds selection and action blue on the feed, solid in light as well as dark. Risk: brand headlines are the rejected blue-box page. A left bar on the band card is the left-border near miss. Window keeps its list bar.

October 2: "The color is coming from functional stuff, not just random elements included for the sake of including them."

## Directions

1. Kind chips: `--kind-article`, `--kind-post`, `--kind-github` soft chip on each feed card's source row, both modes.
2. Status tiles: one row above the cards for Live `--ok`, Checking `--caution`, Failed `--error`, Free week meter `--brand`, both modes.
3. Selection and links: solid `--primary` on the active Clustered or Direct control, `--brand` on action links, headlines stay `--t1`, both modes.