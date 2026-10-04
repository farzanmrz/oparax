RESULT: FINDINGS

The accepted feeds (`accepted-deck-dark.png`, `accepted-deck-light.png`, `accepted-newsroom-dark.png`, `accepted-newsroom-light.png`, `accepted-window-dark.png`, `accepted-window-light.png`) stay the finish: lifted cards, real logos, quiet ground, stage light. The current Deck feed (`focus-review/v2/deck/feed-dark-01.png`) spends the first screen on a 172px hero, a peeking plate, a "1 Article" chip, and three status tiles. His third message moves the page onto the facts and the logos, and it withdraws the round-2 peek and the column reflow. The failure to avoid is `feed-same-shell-front-page-dark.png`: a title, a tool pile, and one giant lead.

(a) Corrections

The host list holds, with these corrections. The pill to drop is `KindChip` on the card. The sidebar keeps a bare number, the Newsroom count, in place of `sourceCount`'s "2 articles". Search, kind filters, Newest first, grid or list, and show or hide images stay out. Clustered / Direct stays, because he said that swap "is a different thing" and "needs to come onto the page." Round 2's `PEEK = 22` and the two-to-three column reflow are withdrawn. Setup stays its own page. Login and landing do not take the source rail. Name/handle only under X, GitHub as one group, and no app header stay agreed: "Everything I haven't mentioned, I agree with you on."

(b) Decisions

1. Sidebar. Overlay is sound. He said "no one's really consistently looking at everything in the sidebar," and he asked the page not to adjust. Closed, a 56px strip stays flush left: the Oparax mark, the source logos, the account initial, and one Expand control. Those logos are what "made the page lively," so a lone button would strip that. Open, a 280px panel floats over the cards and does not reflow them. The same rail is on setup and onboarding, "all the way to the left."

2. Tools. The row keeps Clustered / Direct and Get alerts on X. He called "search, filtration, newest first... bullshit" before the first user. Newest first is the order of the data. After connect, the same button reads "Alerts on" and stays put. He "can't answer the alerts," and a new destination would be another choice.

3. Cards. Three columns at 1440, four at 2560, natural height, no reflow when the rail opens. He asked three, four, or dynamic, then asked not to be handed more viewing options. The image is a 64px thumbnail, "the smallest part of the card," still a real picture. Facts are the body, all visible. Citations are the source marks and names at the top. The article chip goes. The peek goes: "that looks really stupid."

4. Source click. Keep the side panel. He described it: see "the direct synthesis from that source while the clustered news is showing." A right overlay, about 400px, opens from a mark in the top row, lists the cluster's other marks, and closes with Escape. The cluster card stays visible. A direct card has one source and no panel.

5. Onboarding. One page. While it runs, one line, "Checking sources," and the chosen sources fill a grid by kind, with a switch between X, RSS, websites, and GitHub. The why sentence opens on demand. "posts read, candidates gathered" is the fluff he named, so the eight steps, the bands, and the segment bar go. The same page ends ready: "Your agent is ready," the text "7 days left," and Open your feed. The run is labelled once as a replay.

6. Login. The Deck card, email first, X and Google below, story cards behind. A light scrim dims the stories so the card stops "blending" into them. No blur. Sign up swaps in place. This is a page, not a popup: he likes this login "the best" and said there is "no point complicating it."

(c) THE BUILD SPEC

New files only. Leave `site/v2/window`, `site/v2/newsroom`, `site/v2/deck`, and their routes untouched. Add `site/v2/one/{chrome,feed,login,setup,onboarding,landing}.tsx` and `site/app/(v2)/v2/one/{login,setup,onboarding,feed,landing}/page.tsx`. Wrap every page in `Stage` from `site/v2/deck/chrome.tsx`. Outer padding is half the Deck page: `px-2 pt-4 lg:px-4`, no `max-w-[1400px]`. Desktop only.

Data, all existing, from `site/v2/deck/data.ts`: `stories`, `sources`, `groups`, `itemsFrom`, `storyHasSource`, `itemLabel`, `when`, `newest`, `status`, `HANDLE`, `beat`, `PREVIEW_NOTE`. Marks from `site/v2/deck/marks.tsx`: `SourceMark`, `ItemMark`, `MarkStack`, `GroupGlyph`, `GroupLabel`, `Dot`. The live line is `Checking` from `site/v2/deck/live.tsx`. Auth is `AuthForm` from `site/v2/shared/auth-form.tsx`. Do not import `StoryStack`, `Plate`, `PEEK`, `KindChip`, `Header`, `SiteHeader`, `Tile`, `Segments`, or `WeekBars`.

1. Feed, `/v2/one/feed`. The icon rail or the open overlay, then `ViewSwitch` and `AlertsButton`, then one `Checking` line, then the grid. Clustered uses `stories.clustered`, newest first, including the Latent Space and Simon Willison story and the Hugging Face story. Direct uses `stories.direct`, one card per item. A card, built in `one/feed.tsx` from `StoryCard`'s fields: mark row (the citation control), 20px title, a 64px thumbnail when `story.card.image` exists, then the fact lines with the publisher parentheses removed. Imageless cards keep the `kindSoft` wash. Sidebar rows follow `SourceList`: `GroupLabel`, `SourceMark`, name, and `itemsFrom(id).length` as a bare number. `NameHandle` only inside X accounts. The one GitHub row stays under one GitHub heading. Account block: mark, `@farzanmrz`, "7 days left", Sign out, `ThemeToggle`. One preview note, in the rail.

2. Setup, `/v2/one/setup`. Same rail. One lifted form, the `DeckSetup` fields: X handle and the sentence (`beat`), blank error when empty, submit to `/v2/one/onboarding`. Beside it, the logos from `sources`.

3. Onboarding, `/v2/one/onboarding`. Same rail. One status line. A kind switch. A grid of lifted source cards (`SourceMark`, name, why on demand) that fill in. `?at=done` is the ready state on that route: the ready line, "7 days left", `PrimaryLink` to the feed. No step list.

4. Login, `/v2/one/login`. No rail. `DeckLogin`'s two columns: `AuthForm` on the window surface (email, password, confirm on sign up, blue submit, neutral X and Google under the divider), `StoryCard` fans behind, a page scrim over the fan only. `?mode=signup` is the in-place swap. Success goes to setup.

5. Landing, `/v2/one/landing`. No rail. `DeckLanding`'s hero and its source and story sections, margins halved, `StoryCard` in place of a peeking stack, one blue Sign up and a Log in link to `/v2/one/login`. No second auth form. No new sections.

Removed on these routes: peek plates, card kind pills, parenthetical citations, search, sort control, kind filters, grid toggle, image toggle, status tiles, right column, app header, "Your Feed" title, segment bars, eight-step narration, bands, phone layout.

Screenshots, 1440 and 2560, dark and light: feed rail closed, feed rail open, feed with the Latent Space drawer open, feed direct, onboarding mid-run, onboarding done, setup, setup blank error, login, login signup, landing. Set the feed settled so the arrival replay is still. Place the feed shots beside `accepted-deck-dark.png` and `feed-same-shell-front-page-dark.png`.

(d) Review checklist

1. Facts readable on arrival, with no peek and no hidden facts.
2. The image is a 64px thumbnail. The rail logos still carry the color.
3. The sidebar overlays. Columns stay put: 3 at 1440, 4 at 2560.
4. The sidebar count is a bare number. No "2 Articles" chip.
5. The tool row is only Clustered / Direct and Get alerts on X.
6. The drawer shows one source and leaves the cluster visible.
7. Onboarding is one page: one status line, sources by kind, why on demand, trial as text.
8. The login card is lifted off dimmed story cards. Email first. Providers below, in their own colors.
9. Tokens match `DESIGN.md`. The old `/v2` routes are unchanged.
10. Expand, the kind switch, a source mark, and Escape from the drawer show a focus ring.