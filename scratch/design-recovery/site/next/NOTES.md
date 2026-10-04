# Structure-stage render: notes for the council

Builder: Opus subagent, October 1, 2026. Contract: `focus-review/LOCKED-PLAN.md`; brief: `focus-review/build-brief.md`. Every route lives under `/next` (`site/app/(next)/next/`); components and data under `site/next/`. Desktop 1440 only. Dark is the default; append `?theme=light` or `?theme=dark` to any URL, and `?chrome=0` to hide the review dock.

Provenance keys: **imported** (used as is), **adapted from X** (structure lifted, recolored to semantic tokens), **custom**.

## Round 1 changes applied (`focus-review/council-r1/changes.md`)

Every "Adopted" item 1 to 24 is applied; "Not adopted" A to D keep current behavior (GitHub stays in the hero with its flag, the roadmap middle is the small story card, rejected stage 3 rows stay visible, checkout keeps product copy). Lanes as the change list records them.

| # | What changed | Lanes |
|---|---|---|
| 1 | Hero flow replaced by one product scene: dominant compact card, three realistic previews that arrive and tuck behind it, "Oct 21" dates, one caption | all three cut; Kimi layout, Grok gaining sources, Astra layered |
| 2 | Hero sub without "not just the obvious account" | Kimi, Astra |
| 3 | Public-source preview note once beside the hero example | Astra |
| 4 | Roadmap: circle, "Your agent", per-row "Planned" cut; small story card in the middle; new intro and legend; Instagram, Threads, LinkedIn, Snapchat as planned destinations | all three, owner; middle Grok |
| 5 | Pricing: one Sign Up under the table; no heat ramp | Astra, Grok; ramp all three |
| 6 | How It Works step 3 text; capture targets recorded | Grok; owner order rule |
| 7 | Setup What happens next lists the five stages | Grok, Astra |
| 8 | Typed-handle help without the bot procedure (preview copy) | Astra |
| 9 | Blank submit error (`?error=blank` for screenshots) | Astra |
| 10 | "Recorded example, not a live build." under the building heading | Astra, Grok |
| 11 | Done: stages 1 and 2 collapse to one-line summaries (reopenable); Open your feed also beside the heading | Kimi, Astra |
| 12 | Stage 2 rule "Reposts and replies to other people are not read." | Astra |
| 13 | Stage 3: batches flip as units, no counter; "shortlisted" wording | Astra; Grok, Kimi keep batches |
| 14 | Stage 4 rule line | Astra, Grok |
| 15 | Failed: later steps "Not started" | Astra |
| 16 | Ready: brief visible, two closed disclosures | Astra, Grok |
| 17 | Ready line "You can see it any time in Settings." | Astra |
| 18 | Direct and Clustered hold the same four reports (`next/data/feed.ts`) | Grok, Astra |
| 19 | Checking keeps stories underneath; `?state=failed-items` | Astra, Kimi |
| 20 | Settings in the member header; shell "Views" label and Log Out | all three |
| 21 | Active alerts cadence line; `?alerts=error` | Astra; Kimi |
| 22 | `?pool=out` free-week line | Grok, Astra |
| 23 | Wire plan-card detail on free week ended | Astra |
| 24 | Blue only for actions, selected view, links, score state and the building done row; neutral dots, icons, avatars, strokes, banners (small blue icon), highlight ring, meters, rail marks; destructive only for true errors | all three |

New review params: `/next/landing?settled=1`, `/next/setup?error=blank`, `?state=failed-items`, `?alerts=error`, `?pool=out` (feed shell and page), `?story=st-boe-story|st-next-post|st-next-blog`.

## Round 2 changes applied (`focus-review/council-r2/changes.md`)

Items R2-1 to R2-5 are applied; the three "Not adopted" notes keep current behavior.

| # | What changed | Where |
|---|---|---|
| R2-1 | Hero settled state: each preview, once shown readable, tucks behind the story card leaving a 40px sliver (its mark and a few letters). Tucked slivers stack within the card's height, so no preview line shows below or beside the card. When all three are tucked the scene slides left to center card plus slivers. `?settled=1` renders that end state directly. | `next/landing/hero.tsx` |
| R2-2 | Hero caption: "Three reports, one story. Open any citation to see its quote." | `next/landing/hero.tsx` |
| R2-3 | Roadmap: the GitHub and Product Hunt lines end at a small "Daily digest" label just below the story card, with no line onward to destinations. The story card stays the center. | `next/landing/roadmap.tsx` |
| R2-4 | Building stage 2 while running: "Reading your newest posts from the last 90 days and your pinned post." The animation-derived "Read N of up to 10 posts" is gone. | `next/building/stage-bodies.tsx`, `run.tsx` |
| R2-5 | Building fixture label: "Illustrative example, not a real run." | `next/building/run.tsx` |

Judgment calls: the sliver is 40px rather than 36px so the @nextjs avatar mark shows whole; the closing recenter slide is mine (without it the settled card sat off center with an empty band on its left).

## Frame (all screens)

- `app/(next)/layout.tsx`: separate root layout importing `next.css`. An inline script in `<head>` sets the `dark` class before paint (`?theme=` first, then localStorage, default dark). React does not own the `html` class, so a re-render cannot undo the script.
- `next/frame.tsx`, custom. The header is 56px high and uses the 90% frame up to 1800px. Its rule runs edge to edge. The Oparax mark and wordmark (`OparaxMark` imported from `pro/shared/brand.tsx`) form one link home. Landing nav: How It Works, Roadmap, Pricing, Log In, Sign Up, theme. Signed-in pages: theme, Settings and Log Out (round 1 change 20). The footer holds only Privacy, Terms and Contact, right-aligned.
- Settings is a header link on signed-in pages (change 20, all three lanes); its page is still out of this pass's scope.
- Review dock (`next/review-dock.tsx`) and `/next` index: review tooling, not product.

## Auth: `/next/signup`, `/next/signup/sent`, `/next/login`, `/next/forgot` (`?state=sent`)

- STOCK, per the owner ("shouldnt take up urs or councils time"). The forms are the official shadcn `login-03` (radix-mira) composition, **imported** as `next/auth-card.tsx`. Only two things changed: the providers (Continue with X, Continue with Google, email and password) and the copy, which is verbatim from `lib/auth/content.ts`.
- The sent screen keeps the product title `Sign Up` with the real `signupNotice` text. No council review is requested for these.
- Added shadcn primitives `field`, `label`, `textarea`, `alert`. `app/catalog-foundation.css` was checked unchanged after the add.

## Setup: `/next/setup`

States: verified X handle (default), `?handle=typed`, `?error=handle_not_found` (verified copy plus "Sign out and continue with X"), `?handle=typed&error=handle_not_found` (typed copy), `?error=blank` (blank sentence on submit), `?state=waitlist`.

- Shows: the X account (locked `@farzanmrz` with the real help line, or a typed input with the real help), the one sentence field (300 max with a live counter), one primary action, and What happens next. All field and error copy is verbatim from `lib/onboarding/content.ts`.
- What happens next (preview copy) lists the five building stages, in order (change 7). It ends with the real landing sentence: "Your free week starts when your agent is ready and includes 300 watched X posts." Why: LOCKED-PLAN rejection example "the setup screen does not say what happens next".
- Composer: a plain shadcn `Textarea` (**imported**), not AI Elements PromptInput. This is one form with two fields and one submit, not a conversation. A chat composer would imply a reply.
- No suggestion chips. There are no real example beats beyond the product placeholder, and invented chips would steer people toward topics the source table does not cover.
- The error colors use `destructive`, restrained: a not-found handle is a true product error.

## Building: `/next/building` (the key screen)

States: replay once (default, settles in 4.6 s, no pause control, WCAG 2.2.2), `?at=1..5` (frozen with that stage running), `?at=done`, `?state=failed`. Reduced motion jumps to the done state.

- Model (`next/building/model.ts`): each stage is an AI SDK typed tool part `tool-<name>` with a `state` (`queued`, `input-available` for running, `output-available` for done, `output-error` for failed). `run.tsx` switches on type, then on state, to choose the component. This is the generative UI pattern from components.md section 2.
- Rail: **adapted from React Bits Pro agent-plan-1** (numbered steps, state on the right, "N of 5 done" progress in the header). The marks are React Bits `StatusMark` (**imported**), neutral (foreground when done, muted otherwise; change 24), with destructive only for the failed step. When the build is done, the progress in the header gives way to "Your agent is ready." and Open your feed (change 11); the bottom done row stays the one blue done moment.
- Stage 1, look up the X account: **custom**, after the AI Elements Task idea. Shows the name initial avatar, name, `@handle` and bio. The fixture image URL is a fake `pbs.twimg.com` path that would 404, so the product's own fallback (the name initial) is shown.
- Stage 2, read newest posts: **custom**. Shows "10 newest posts from the last 90 days and your pinned post", then the pinned post and the three posts the fixture records in full, then "7 more posts read". The fixture has no sponsored posts, so no exclusion rows appear. The one true rule is stated instead: "Reposts and replies to other people are not read." (change 12; `exclude: replies,retweets` plus thread folding).
- Stage 3, score candidates: **adapted from React Bits Pro tool-calls-4** (ranked rows with a relevance number). The bar is the main change: each row gets a score bar with a tick at 0.35, so every row shows its distance from the keep line.
  - The counts read "35 shortlisted from 153", plus "150 sources from the Oparax list and 3 accounts you quote" (change 13).
  - Accounts that became candidates because the person quoted them carry "Quoted in your posts".
  - Judgment call on the layout: show the top 6 shortlisted rows, a "Show 26 more shortlisted" expander, then the last 3 shortlisted rows just above the line. The dashed line comes next ("Shortlisted at 0.35 and above"), then the 3 highest rows that were not shortlisted (kept visible, round 1 item C), then "115 more scored under 0.35". This keeps the boundary, where the judgment happens, visible without scrolling.
  - Kept and not kept differ only by blue versus muted gray, and by opacity. No green and no red.
  - While running, the stage title reads "Checking which sources fit your sentence" and the body shows the three real batches (60, 60, 33), each flipping from "checking" to "done" as a unit. No counter derived from animation time (change 13).
- Stage 4, choose sites and X accounts: AI Elements **Queue** (`Queue`, `QueueSection`, `QueueSectionTrigger`, `QueueSectionLabel`, `QueueItem`, **imported**, spacing overridden).
  - There are two sections, "10 sites and feeds, chosen from 18 shortlisted" and "7 X accounts, chosen from 17 shortlisted" ("kept" became "shortlisted" for consistency with change 13). Each pick shows its one-sentence why.
  - The rule line says "Chosen from the shortlist: up to 10 sites and feeds, and the X accounts that fit, each with the reason." (change 14; "at least 5" is a prompt aim, not a guarantee).
- Stage 5, write the brief: AI Elements **Plan** with `isStreaming` (**imported**). The title and summary shimmer while the brief is written, then settle into the summary, Interests and Languages.
  - `topic_terms` is not shown. It drives digest searches and means nothing to the person.
- Done row: "Your agent is ready. Your free week has started: 7 days and 300 watched X posts." with Open your feed, which goes to `/next/ready`. This is preview copy. The free week truly starts at `complete_build`.
- Failed: the destructive alert carries the real copy: "Building stopped at: Reading @farzanmrz's newest posts. Preparation could not finish. Your free week has not started." It is followed by `Try again` (owner only, one retry). Stage 1 shows done, stage 2 shows stopped, and stages 3 to 5 show "Not started" (change 15).
  - Deviation from today's product: today the failed step shows as pending. The render marks it "Stopped" so the failure point is visible.
- Plain user-facing copy: no model names are shown. What was judged is said instead ("Scoring sources against your sentence").
- **Exact real log strings today** (`monitors.build_log`, shown raw as step descriptions in the product, including the word Jev):
  - `Profile identity confirmed`
  - `Looking up @farzanmrz on X`
  - `Reading @farzanmrz's newest posts` (written three times)
  - `Read 10 posts; Jev is scoring 153 candidate sources`
  - `Jev passed 35 candidates; choosing from them`
  - `Choosing recommendations and writing the brief`
- Stage mapping: the product has three labelled steps. Stages 3, 4 and 5 here split product step 3 ("Choosing sources and X accounts") into its three real decisions (Jev scores, code keeps at 0.35, Luna chooses and writes).
- **FLAG, product truth (owner approval needed):** scores, posts read and rejected rows exist in `monitors.build_state`, but no public read path exposes them (`monitorColumns` excludes `build_state`). Showing stages 2 and 3 as rendered here needs a new owner-only read path, which is a product change the owner must approve.
  - The live run would also need to emit per-stage events. Today the page polls every 3 s and sees only log strings.
  - Stage 1, the stage 4 picks with why, and the stage 5 brief are already persisted and publicly readable.

Data: `next/data/onboarding.ts`, from product-data.md section 10 (ILLUSTRATIVE values in real shapes). Names, kinds, focus lines and targets are real rows of `docs/source-table-seed.json`. The scores, whys, posts and bio are fixture values.

- `x-steipete` is shown as "Peter Steinberger" without the emoji in the real row name.
- Display names for the quoted accounts @nextjs and @leerob (Next.js, Lee Robinson) are this builder's addition. The fixture gives only @rauchg's name.

## Ready summary: `/next/ready`

- Decision: the ready summary is the **first-visit state of the feed**, not its own screen. It is rendered in the simple page arrangement; the shell would hold the identical column.
- Why:
  - The building screen already showed every choice live, so a separate summary screen would repeat it. The owner rejects repetition.
  - Right after the build, the feed is truly empty (product-data 10.6a). The summary fills that empty moment with useful content instead of adding a click between the build and the first story.
- Shows:
  - "Your agent is ready", with the line "This is what it chose for your sentence. You can see it any time in Settings." (change 17; editing is paid-only today).
  - The brief summary stays visible; "10 sites and feeds" and "7 X accounts" are closed disclosures holding every name and why (change 16), so the empty feed sits near the top. All of this is persisted public data (`monitors.brief`, `monitor_sources`, `monitor_accounts`). Scores are deliberately left out.
  - The aside shows Get alerts on X and the free-week card (7 days, 0 of 300).
  - The feed below shows the real empty state. That empty feed is the way into the feed.
- Judgment call: after the first visit, the chosen sources live in Settings (the product has Sources and X accounts tabs), not in the feed. The owner rejected sidebar filler.

## Feed: `/next/feed/shell` and `/next/feed/page`

Params: `?view=clustered|direct`, `?state=populated|empty|checking|failed-items`, `?story=<id>` (Clustered `st-boe-story`, `st-next-15`; Direct `st-boe-post`, `st-boe-cnbc`, `st-next-post`, `st-next-blog`), `?alerts=active|paused|stopped|error` (default not connected), `?pool=out`.

- Identical in both arrangements: the title "Your Feed", a one-line view hint, the preview note (`PREVIEW_NOTE`, once, above the cards, populated state only), the cards, and the aside (Alerts on X plus the free-week card). Only navigation differs, so the owner compares exactly one variable.
- Shell (`FeedShell`): the stock shadcn **Sidebar** (**imported**, `collapsible="none"`). The logo sits top left as the one link home. "Your Feed" holds Direct and Clustered. The footer holds Settings and the account (initial, name, handle, theme toggle). Nothing else, per the owner's "adding stuff for the sake of adding stuff".
- Page (`FeedPage`): the normal header, with a Direct/Clustered segmented switch beside "Your Feed" (owner, September 30). The switch is made of links, so each view has a URL.
- View content (change 18): both views hold the SAME four reports. Clustered: the Bank of England story (X post plus CNBC) and the Next.js 15 story (X post plus blog). Direct: the @bankofengland post, the CNBC article, the @nextjs post and the Next.js blog post, each alone. Newest first.
  - The two new Direct cards cite only their own verified spans. The Clustered Bank of England card uses the facts and spans of `pro-exploration/examples-verified.json` verbatim; its CNBC span "voted by a fine margin..." comes from the article body, not from the lede stored as the item text.
- Story in feed (`?story=`): that story comes first and is highlighted with a neutral stronger border (change 24). Its sources area opens by default, and the view switches to that story's arrangement. The product has no separate story layout. Judgment call: opening the sources by default, because a reader arriving from a DM link most likely wants the evidence.
- Checking: real copy "2 items being checked.", with a running StatusMark and one preview line: "Each item is judged against your sentence before it becomes a story." The stories stay underneath, as the product places them (change 19).
- `?state=failed-items`: "Could not process 1 item." above the stories, restrained destructive (change 19). The product string is `Could not process ${n} items.`, which would read "1 items"; the singular is the round 1 wording, a product copy fix at implementation.
- Empty: real copy "No relevant news yet.", followed by a preview line: "Your agent keeps checking your sites, feeds and X accounts. Stories that fit your sentence appear here." No timing claim is made.
- Alerts card (owner only, free week or paid): copy verbatim from `bot-button.tsx`.
  - Not connected and stopped show Get alerts on X with the real explanation.
  - Active and paused show the status line. Active adds the preview cadence line "Daily alerts in your free week." (change 21).
  - `?alerts=error` shows the not-connected card plus the real "X connection could not start. Try again." (change 21).
  - Check connection always shows.
  - The bot avatar is not used here: the rule keeps the Oparax mark to the header and the DM.
- Free-week card: the real lines `7 days left in your free week. Plans from $5 a month.` and `0 of 300 watched posts used in your free week.`, with a meter. The values are the just-built state (10.6a), kept everywhere, so no usage counts are invented.
  - `?pool=out` (change 22): the meter full, "300 of 300", and the real line "Your free week's watched X posts are used up. Sites and feeds keep running." Days stay at the fixture's 7 rather than inventing a number.
- Shell: the sidebar group label is "Views", and the account block ends with Log Out (change 20).

## Story card (`next/story-card.tsx`, shared everywhere)

- Content: a plain title, then bullet facts. Each bullet ends with a parenthesized citation. Clicking the citation opens the quiet "Used N sources" area at the card bottom and highlights that fact's quote(s) under each source. Quotes for other facts dim, and sources that do not support the fact fade. Nothing else is on the card.
- Citation label: the **publisher name** ("(Next.js, Next.js Blog)", "(CNBC)"). Why:
  - It is what the product already links per fact, so it is real data.
  - It tells the reader who said it.
  - Numbers would force a lookup, and domains are noisier.
- Sources area: AI Elements `SourcesTrigger` and `SourcesContent` (**imported**).
  - The root is the stock shadcn `Collapsible`, because AI Elements types the `Sources` root as a div, which cannot be controlled.
  - The trigger text is singular or plural ("Used 1 source"). The AI Elements default always says "sources".
- Direct versus Clustered, subtle by design: the only signal is the sources line. A Direct card shows one mark and "Used 1 source". A Clustered card shows a small overlapping stack of marks (X, article) and "Used 2 sources". No badge or label is added, which follows "nothing else" and the owner's note that the sources should not be too prominent.
- No image, even when the data has one. Why:
  - The card spec says "nothing else".
  - Images are optional in the product (one of the three stories has none).
  - The owner asked where images come from (A12).
  - The card works the same with or without one.
- No time either, for the same reason. The council may want one back; it would be a spec change for the owner.
- Gap: real publisher favicons would need new assets in `public/`, which this builder may not write, and no runtime third-party calls are allowed. Generic marks (X, newspaper) stand in.

## Plans

- `/next/free-week-ended`: the feed (page arrangement) with the real frozen copy ("Your free week is over." plus body). The three real plan cards (`pay-buttons.tsx`: detail line, "Sites and feeds unlimited.", button label) sit inside the banner. The stories stay readable below.
  - The banner is a neutral surface with one small blue icon, not destructive: an ended trial is not an error (change 24). The Wire card reads "4,000 watched X posts a month, alerts every 15 minutes when there is news." (change 23, preview copy; the product says "a digest every 15 minutes").
  - The alerts card is hidden, matching the product (alerts show only in the free week or paid).
- `/next/exhausted`: the real exhausted copy as a neutral status banner with a small blue icon (change 24). Stories stay readable, and there are no plan cards ("Plans open when the week ends").
- `/next/checkout-return?state=confirmed|pending|unpaid|unavailable`: the real shell title "Your Oparax Agent", the real status line per case, then `Open your agent`. `Check again` is added when the session is valid (every state except unavailable).

## Landing: `/next/landing` (rough)

Hero:

- Headline: "Oparax watches the web and X around your beat, and brings each new story to your feed instantly."
- Sub: "Write one sentence about what you follow. Your agent decides what to watch, not just the obvious account: follow OpenAI and it also reads OpenAI's news feed and TechCrunch's AI coverage. Reports about the same event become one story, with the quote behind every line."
- Then Sign Up and the real line "Free for a week once your agent is ready."
- Sub (change 2, Kimi; Astra also cut the clause): "Write one sentence about what you follow. Your agent decides what to watch: follow OpenAI and it also reads OpenAI's news feed and TechCrunch's AI coverage. Reports about the same event become one story, with the quote behind every line." Headline unchanged (owner decision).
- Scene (change 1, Kimi's layout stripped of chrome plus Grok's "the card gains sources"; Astra's layered cards point the same way), **custom**: the story card is dominant and compact (`StoryCard compact`: headline, facts, citations, "Used N sources"). Three realistic small previews arrive in real publication order (the Next.js blog article, the vercel/next.js v15.0.0 release, the @nextjs post), each shown, then tucked behind the card's left edge, adding its mark to "Used N sources" (1, 2, 3). Dates read "Oct 21" only. No column labels, clock times, agent node or wires.
  - Previews: the post has an initial avatar, name, handle, date and its two verbatim lines; the article has host, date, title and lede; the release has repo, tag and two verbatim lines of its notes.
  - Caption: "Three reports, one story. Open any citation to see its quote." (R2-2) Beside it, small, the public-source preview note once (change 3, Astra).
  - Motion settles in about 3.8 s (under 5 s). Reduced motion and `?settled=1` render the end state directly, so screenshots need no wait.
  - The radial blue glow behind the hero is removed (change 24).

**Owner addition (October 1, via host): watches continuously, and decides what to watch.**

- The hero's core message is that Oparax watches around the person's beat and new items reach the feed fast.
- Wording choices:
  - It says "the web and X around your beat", not "the whole internet". The agent watches chosen sites, feeds and X accounts, so "whole internet" would overclaim.
  - The second point uses the owner's own example, with only configured sources: @OpenAI, the OpenAI news feed (rss), and the TechCrunch AI feed (rss). Sam Altman's blog is not used because it is not a configured source.

**Owner decision (October 1, via host), replacing the earlier wording limit:** the hero says news arrives **instantly**. Owner: "1 minute is the minimum cron. That's instant... the headline or the content should be that it comes instantly."

- The hero has no "within minutes", "1 minute" or "5 minutes".
- The check frequency appears once, lower on the page, in How It Works step 4: "Sites, feeds and X accounts are checked as often as every minute, so stories land as news breaks."
- Product-truth limit, recorded:
  - Collection crons run every minute.
  - Watched X accounts are polled every minute on Wire and every 5 minutes on other plans.
  - Sites and feeds are checked every minute.
  - Nothing has been measured end to end yet.
- DM cadence stays accurate in How It Works step 5 and in pricing: daily on Hobby and Creator, and every 15 minutes when there is news on Wire. No copy implies instant DMs.

**FLAG, GitHub in the hero:** today's code keeps GitHub and Product Hunt in a separate daily digest (issue 136 tabled). GitHub joining a story is the owner's intent ("GitHub product hunt, web, Twitter. It comes into Oparax. Oparax produces the card"), not current behavior. The owner decides when the hero is built.

- Kept in the render with this flag (round 1 item A, not adopted: lanes split, LOCKED-PLAN says follow his intent and flag it).
- The hero card is `heroStory` (`next/data/landing.ts`), the feed.ts card plus the release as a third source.
- The release supports two facts with verbatim lines of its notes: "Support React 19 in App and Pages router" and "Disable automatic fetch caching". These were read from the GitHub API on October 1, 2026.

How It Works, five steps (owner): **adapted from React Bits Pro how-it-works-8** (numbered steps on one connector line, each with a small vignette of the real UI). There is no Sign Up step and no duration claim beyond the check frequency above.

1. Write one sentence (the fixture beat with its 81/300 counter).
2. Your agent builds (its four stages).
3. See what it chose (the Vercel feed and @nextjs, each with its real fixture why). Body text: "The sites, feeds and X accounts it chose, each with the reason." (change 6, Grok). **FLAG:** this is the host's interpretation of the dictated "Press the onboarding flow", unconfirmed.
4. Read your feed (a mini card with one fact and its citation).
5. Get the DM. The text is exactly what `packDm("farzanmrz", [Next.js 15])` produces, shown as plain text in a bubble with the `BotAvatar` (white mark on black).

No redesign (owner order rule, change 6); step numbers, the step 2 checks and the vignette dot are neutral now (change 24). Agreed capture targets for when the onboarding and feed are fixed (change 6): 1 the setup sentence field; 2 building frozen at stage 3 (`?at=3`); 3 the ready picks with whys; 4 the populated feed, Clustered; 5 the DM.

Roadmap: one composition, not a grid (custom; Center Flow and Circles were inspiration only).

- Sources come in on the left, run into one small story card in the middle (headline "Next.js 15 is released as stable" and "Used 2 sources", sized like a source row, no glow), and destinations go out on the right (change 4, Grok; round 1 item B keeps the alternatives open for round 2).
- The big circle, "Your agent" and "Joins reports into stories" are cut (change 4, all three, owner).
- Intro: "Where your agent reads, and where you get your stories." Legend: "Solid lines work today. Dashed lines are planned." with a solid and a dashed sample.
- Today, with solid lines and cards: X; websites and RSS; GitHub and Product Hunt, each labeled "Daily digest"; and out to X DM. The GitHub and Product Hunt lines end at a separate "Daily digest" label under the story card, not in it, with nothing onward (R2-3).
- Planned, with dashed lines and a dashed outline, no per-row label (change 4, owner): Reddit, YouTube, Instagram, Facebook, Threads, LinkedIn, TikTok, Snapchat, Yahoo Finance and Google News. Destinations planned: Email, SMS, WhatsApp, Messenger, Instagram, Threads, LinkedIn and Snapchat (the last four added, change 4, owner).
- Connector strokes are neutral (muted foreground for today, border color dashed for planned) and the Lucide icons are muted (change 24).
- There is no "Works today" heading (the owner rejected that split, M64/M74).
- Official artwork from `public/roadmap-brands/` keeps its colors. GitHub swaps between the black and white official SVGs by theme. Email and SMS use generic Lucide icons, per the asset provenance.

Pricing, a comparison: grouped rows and check chips are **adapted from React Bits Pro comparison-8**. The comparison-5 heat ramp is removed (change 5, all three: blue used for quantity); the watched-posts row leads by type weight only. The three "Start your free week" buttons are cut; one "Sign Up" sits under the table (change 5, Astra, Grok). Check chips are neutral (change 24).

- The title and intro are real: "Pick your pace".
- Column headers: Hobby $5, Creator $30, Wire $99, each "a month".
- First row, emphasized: Watched X posts a month (100, 3,000, 4,000), with the line "Posts from the X accounts your agent watches. Sites and feeds never count." This is true: the pool pauses only X accounts.
- The remaining rows are the real landing comparison rows: Alerts on X, Sites and RSS feeds, Stories with original sources, GitHub discovery digest and Product Hunt digest.
- The free week line ("7 days and 300 watched X posts, no card") sits in the header cell.
- No featured tier and no invented features.

## Other judgment calls and gaps

- **Example topic:** the Bank of England examples are off-beat for an AI developer-tools creator (**FLAG**). They are kept because feed.ts is the locked preview content. The owner's own run replaces them before acceptance.
- **Preview copy:** strings written for this render (not in the product) are the typed-handle help and the blank-sentence error (changes 8, 9), "Illustrative example, not a real run." (R2-5), "Daily alerts in your free week.", the Wire plan-card detail, What happens next, the building done row, the ready panel heading and line, the checking and empty explanations, the view hints, and all landing copy except "Pick your pace", its intro and "Free for a week once your agent is ready."
- **Installed source change:** two unused `@ts-expect-error` lines were removed from `components/ai-elements/tool.tsx`. The registry assumed AI SDK v6; with v7 they broke typecheck and build. Tool itself is not used.
- **Not done:** Settings, contact and legal pages (out of this pass).

## Palette comparison (October 1, evening)

Four candidate palettes on `/next/feed/page` (`?palette=graphite|slate|ink|navy`, remembered in localStorage, picker in the review dock) and a new feed composition (default; `?compose=old` keeps the round 2 card and aside). Tokens in `app/(next)/palettes.css`, script in `next/palette.ts`, composition in `next/feed/compose-new.tsx` and `next/feed/story-row.tsx` (**adapted from** `next/story-card.tsx`). Full notes: `next/THEMES.md`. Publisher favicons (DuckDuckGo icon service) and X avatars (unavatar.io) are runtime public images for the preview only, with a glyph fallback; nothing is stored in the repo.
