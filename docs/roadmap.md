# Oparax roadmap

Rewritten September 19, 2026, when the product was defined and the experiments ended. This is the one plan: what is being built, in what order, every decision made and by whom, what is still open, and how it got here. The exact onboarding specification, with every rejected direction and why, is [onboarding-algorithm.md](onboarding-algorithm.md). The experiment it serves is [exp1.md](exp1.md). Every slice below is a GitHub issue whose body is the brief its `/feature` session starts from.

Naming (owner, September 16): the thing a person gets is a **monitor**. "Desk" and "agent" are the legacy names for the same row in the code.

## 1. The product

A person types their X handle and one sentence about what they cover. Oparax reads their recent X activity once to learn what they actually follow, recommends at most ten websites and feeds that publish it, and builds them a page at oparax.ai/<handle>. From then on it watches those sources, judges every new item against their beat, folds items about one story into one card in English, fills the page, and alerts them in their X DMs through the Oparax bot. It recommends at least five X accounts and watches up to five of them. Later, a person can add a daily digest of GitHub repos and Product Hunt launches that fit.

In the owner's words (September 16 and 17): "You already live on X, you already see X. What about the wide internet that you don't see on X? Oparax brings it to you." and "I'll monitor the internet, GitHub and Product Hunt for you outside of X and give you that info on X."

X is used for three things: learning what the person cares about, reaching them, and watching up to five accounts they choose. Drafting, voice guides and posting are gone (owner, August 26 and September 14).

Who it is for, as recorded: people who follow a beat and publish about it. AI content creators first (owner, August 27), and among them the creator still building an audience is the one the GitHub and Product Hunt digest is a bet on (owner, September 19); reporters second; Reshad, the football reporter, is the test of whether it holds for someone whose news breaks on X first. The first cohort is five people the owner knows: Farzan, Kush, Liam, Nihan, Reshad. The owner builds their monitors himself and sends each a link.

The diagnose verdict of September 16 still governs pace: no one has reacted to monitoring output yet and no one has paid, so the first slice goes to the five and the rest follows what they do, not what we guess.

## 2. The journey

Decided by the owner on September 16 (third pass) and 17:

| Moment | What happens | Gate |
| --- | --- | --- |
| Arrives | Landing page: the promise, a real finished monitor as proof, the box for a handle and a sentence | none |
| Submits | oparax.ai/<handle> opens in its building state and shows the work as it happens; then the monitor appears | one build per handle, a daily spend ceiling, an invisible bot check |
| Days 0 to 3 | The feed runs; alerts arrive if they activated the bot | none |
| First change | Removing or adding a source, or keeping it past day three | sign-up, shown in place: Continue with X, Continue with Google, or email |
| Day 3 without sign-up or bot | Polling stops; the page stays readable | |
| Day 7 | The bot sends the payment message; without payment the feed freezes and the bot goes quiet; the page stays readable | pay |

Messaging the bot keeps the feed alive past day three but not past day seven. The seven-day clock starts at bot activation or sign-up, whichever comes first. The bot and sign-up are independent; the bot is not a sign-up (owner, September 15). The person always messages the bot first; that is our design choice, not an X rule. A stranger opening someone else's page is not a concern for now (owner, September 17).

## 3. Onboarding

Settled September 19. Four steps: read the person (Grok fetches fixed X searches, code pulls links, accounts and hashtags from the posts); rank every known source against them (Jev, in code, under a second, under a cent; strong at 0.75, possible at 0.35, below that dropped); Grok picks at most ten for the page, preferring what the person's own activity points to, and searches the web only for parts of the beat nothing covers; the page. New sources it finds are checked, given a written description and added to the shared table for the next person. Measured: 8 cents and a minute for Reshad, 26 cents and four minutes for Liam, against about $1 each on September 15.

The shared table is the asset: one row per recurring stream, read by a person as "Mundo Deportivo · FC Barcelona" with a plain-English description of who publishes it and what that stream actually posts, plus its language, how we fetch it, and how often it publishes. 76 verified rows seed it ([source-table-seed.json](source-table-seed.json)). We do not crawl sites or index the web: a publisher's own feed or section page is already the index of its new content, a rented search finds streams we have never heard of, and the table remembers them so no one pays to find them twice.

Everything else, including the prompts, the checker, the costs and the twenty-odd directions that were tried and dropped, is in [onboarding-algorithm.md](onboarding-algorithm.md).

## 4. The feed: judging, grouping, cards

What exists from the drafting product and carries forward: a Qwen stage that judges one item on or off the beat with a reason, and a Qwen stage that writes an English headline and fact lines from an item in any language (measured in August at $0.000116 and $0.00025 a call). Each item is its own card today; grouping was built on July 23 and removed the next day, and a single merged judge-and-write call was tried on July 26 and split back on August 10 because its output broke deliveries.

The owner's direction (September 17 and 18): judging and grouping are redesigned together as one algorithm and that is its own slice. Every incoming item passes through Jev first for whether it fits what the person has said they want; for grouping, Jev gives a probability that the item is the same news as a recent story; Qwen reads that, decides only whether the item adds anything, and writes. The person's corrections, per source or per story, are compiled into what Jev reads, so its judgments follow them. Jev keeps nothing between calls; what grows is the facts we send it. It enters behind a test on real items against the owner's own labels, half of them Spanish, with Qwen as the fallback whenever Jev is unsure or unreachable and always as the writer.

The card (decided August 28): a synthesized headline, one to five fact lines each with its source, the contributing publishers, one compact relative time, an image only when a source had one.

Open: what a new monitor shows on day zero. On September 17 the owner described pulling the last three items or the last day from every source, judged and shown as cards; on September 18 he said that is not decided. The slice settles it. Open too: how long a story stays open for new items to join (nothing on record; 48 quiet hours is the proposal), how a card changes when an item joins (append and deduplicate is the proposal), whether a skipped item can be flipped back.

## 5. Keeping it moving

Feeds and sections are polled every one to five minutes with conditional requests, which cost nothing, and each new item is judged the moment it arrives (owner, September 16). Recommended by the September 17 stack walk and not yet confirmed by the owner: polling runs on Vercel cron (once a minute is available on the plan already paid for), Railway has no remaining role, and the old X stream worker is retired. The poller code that exists (sitemap, feed and listing readers, the already-seen check, the body fetcher with its Bright Data fallback at $1.50 per thousand requests) is reused. The old poller was only safe because exactly one copy ran; on a scheduler two runs can overlap, so a claim taken at the start of each run is required before anything is delivered. Poll each unique source once for everyone who watches it. Do not keep article bodies past the window in which a story can still grow; keep the card. Expire already-seen keys after a month or two. The daily spend watchdog, built after one source looped for three days in August and cost $69, gets its own schedule.

## 6. GitHub and Product Hunt

Decided September 19 (owner: "that defines the product"). Not part of onboarding, which recommends sites and feeds only, and not blocking anything (owner, the same day): a later addition that a person adds to a running monitor by hand. A daily digest, separate from the ten sites, for people whose beat is tools and launches: new and fast-rising repos in their interest areas, the day's Product Hunt launches that fit, each as a card with the name, a why-now line and two lines on what it does; a weekly pass of large established repos they have not covered; and releases of repos they have covered. Interest areas come from the beat and posts, numbers qualify candidates in code for free, and the beat judgment makes it personal. The mechanics and the evidence behind it are in [onboarding-algorithm.md](onboarding-algorithm.md) section 8. It is a bet: Liam said GitHub would be "useful eventually", runs a weekly repo series by hand, and never mentions Product Hunt; Nihan touches both only in paid posts. The test is whether anything either of them posts came from the digest. Before any paying customer sees Product Hunt data, its terms require an email to them about commercial use.

## 7. The bot

`@oparax_bot` exists in the developer console with messaging permissions and registered chat keys; the owner wants the handle `@oparax`. Nothing has ever been sent or received. Verified from X's documentation on September 17: sending a DM costs $0.015; a received DM event costs $0.010; 1,440 sends per app per day and 15 per fifteen minutes per person; incoming messages arrive through the X Activity API by a webhook that answers X's challenge and verifies X's signature; one subscription on the bot's own account covers every monitor; nothing in X's rules requires the person to message first. Recommended and not yet confirmed: send through the plain DM endpoints from an ordinary connected `@oparax` account, because the registered bot keys have never been loaded at runtime and the price is documented only for the plain path. Activation: a button on the page opens the person's own composer addressed to the bot with a one-time code; sending it links the DM to the monitor. Replies: STOP, PAUSE and RESUME as fixed words, everything else logged for the owner. The day-seven message arrives by DM with a link to pay.

The cost dial: at $0.015 a send, alerting every card is $7 to $22 a day on a busy monitor. What gets alerted (every card, only those a second judgment marks worth it, or a digest with "alert me now" as something the person types) is open; the second judgment and the repeat-suppression check are assistant proposals the owner has not approved. Prerequisites: the X API project balance is negative (about $18, after a $39.64 following-list fetch on September 13) and every call fails until it is topped up; the app must request the DM permissions; one real send proves the path.

## 8. Sign-up

Continue with X, Continue with Google, or email, through Supabase Auth (owner, September 14). Email through Gmail as farzan@oparax.ai is proven. Sign-up appears in place at the first action that changes a monitor; it claims the page to an account, unlocks editing, keeps the feed alive past day three, and is where payment attaches. Signing in with X also proves the handle is theirs. Verified September 17: Supabase's X sign-in uses the credentials the product already holds and Supabase's own callback address, and one X app can carry both that and the old connect flow; Supabase joins two sign-in methods into one account only on a matching confirmed email, and X usually gives none, so someone who signs in with X once and Google later becomes two accounts unless linking is offered; Google requires brand verification that takes days. Open: who may claim a page (anyone who signs in from it is the proposal, since email cannot prove a handle); one monitor per account for now. The existing email login pages become the way back in; the old connect-X flow has no job once posting is gone. No test account exists.

## 9. Payment

Day seven, Stripe hosted checkout through the Vercel marketplace (it supplies the keys and starts sandboxed; going live is a reconnect), one product with a monthly and a yearly price, no Stripe-side trial because our clock is the trial, the customer portal for cancelling, refunds by hand, payment attached to the account. Four events matter: first payment, renewal paid, payment failed, subscription ended; each updates paid-through and status, and the webhook must verify Stripe's signature against the unparsed request. Nothing is built.

The price is not decided. With X accounts not watched, a monitor costs little to run: fetching is free, judging and writing about $1 to $8 a month by volume, alerts $2 to $22 by what gets alerted, onboarding under 50 cents once. Anchors: Reshad said $4 a month, Brieflet charges $12 for similar personalization, the owner floated $5, $20 and $100 in August.

Decided September 19: up to five watched X accounts per monitor. What it does to the price: X charges half a cent per delivered post, so the bill follows how much the accounts post, not how many there are: five company or founder accounts are about $5 to $10 a month; five transfer journalists and outlets are $22 to $45. A watched account is billed once however many people watch it, so cost falls where users overlap, and football is where everyone watches the same ten people. The honest lever is a monthly allowance of delivered posts with each account's usual volume shown when it is picked. Unknown: whether replies and reposts are delivered and billed; X's self-serve limit is 1,500 watched accounts in total.

## 10. The public door: landing page, guards, ads

The live site still sells drafting; production is paused, so nobody sees it. The new landing page shows the product working, carries the box, and sends a submit straight to oparax.ai/<handle> in its building state. References from September 16: v0.app, granola.ai, f5bot.com; Motion is already in the repo; no embed tools. The look stays on the current design tokens; the pages are designed fresh through Claude Design or the feature flow's design step (owner, September 17).

Guards for a free box: one build per handle (a repeat opens the built page); a daily spend ceiling counted from the cost ledger, which exists so a viral link or a script cannot spend without limit, with a "full for today, leave your handle" message (the number is open; $25 is the proposal); Vercel's free invisible bot check. The only abuse guard ever written was an in-memory limiter on the retired August branch.

Ads (owner, September 14 to 16): prepared from the first slice, run by the assistant through the X Ads connector (app "Oparax Ads Agent"), launched and budgeted by the owner, live only when a stranger can complete the walk. Objective website traffic; audience seeded from people.tsv minus the 23 already contacted and the owner's followers; two or three promoted-only posts in the owner's words, each with its own tag; appetite on record $300 for 500 sign-ups, a number to reset. Speaking as the product account needs that account to grant posting delegation to the ads account, a console step. Which handle speaks is open; the product is the recommendation.

## 11. Measurement

PostHog project 563049 is the one dashboard (owner). It receives only automatic events today. Each slice adds one named past-tense event per intent, recorded on the server where the action happens off the web. The funnel: arrived, built a monitor, activated the bot, signed up, used it (three of the trial days including one of the last two), paid; plus cost per person from the one cost ledger, confirmed and estimated amounts kept apart. Each promoted post carries a source tag that persists through the funnel. The event vocabulary and denominators are in exp1.md.

## 12. What exists today

| Thing | State |
| --- | --- |
| Repo `beta` | The drafting product's code; monitoring pieces carry forward (source discovery, feed and sitemap parsing, the Qwen judge and writer, the model-call ledger, the X sign-in client); nothing of the new product is built |
| Tag `archive/ft-131-monitoring-pivot` | The retired August monitoring branch: a public page by handle and its query are to be lifted, not rebuilt |
| Vercel `oparax` | Pro plan, production paused, domains attached, variables installed |
| Supabase `pcgvpypzfwuchyfwdlwe` | Every table empty; free plan that hibernates; tables from the August branch may still be live while the committed types predate them, so regenerate types before the first migration; X and Google sign-in not enabled |
| Railway | Nothing deployed |
| X developer console | App "Oparax", bot `@oparax_bot`, ads app, negative balance |
| X Ads | Account exists, no campaign, connector connected |
| PostHog | Live, automatic events only |
| Stripe | Nothing |
| TypeSafe | Key on the owner's machine; commercial-use terms unpublished |

Verified prices: grok-4.6 $2 in and $6 out per million tokens; qwen3.7-flash $0.03 and $0.13; Jev $0.042 per million input tokens by its documentation, output free; X search half a cent per call until September 21, 2026, then half a cent per post fetched and a cent per profile; X Activity API half a cent per delivered post; X DM $0.015 a send; Bright Data $1.50 per thousand requests; GitHub's public reads and Product Hunt's feed free.

## 13. Build order

One slice at a time through the flow: `/feature <issue>` plans it from the issue's brief, `$build` builds it, `/qc` reviews, the owner walks it on localhost, `/ship`. Each issue's brief is replaced by its approved plan when planning finishes; this file and the algorithm file are the permanent memory.

| Order | Slice | Done when |
| --- | --- | --- |
| 1 | [#133](https://github.com/farzanmrz/oparax/issues/133) Build a monitor and show its page | The owner types a handle and a sentence behind his login, watches the build, and the person opens their page from a link with no account |
| 2 | [#134](https://github.com/farzanmrz/oparax/issues/134) The feed: judging, grouping, cards | Items from a monitor's sources become cards on the page, many items about one story as one card |
| 3 | [#135](https://github.com/farzanmrz/oparax/issues/135) Keeping it moving | New items appear on their own within minutes, and a monitor nobody claimed stops at day three |
| 4 | [#137](https://github.com/farzanmrz/oparax/issues/137) The bot | A person activates alerts from their page and receives them in their X DMs |
| 5 | [#141](https://github.com/farzanmrz/oparax/issues/141) Watching up to five X accounts | A person picks up to five X accounts and their posts arrive on the page like any other item |
| 6 | [#138](https://github.com/farzanmrz/oparax/issues/138) Sign-up in place, and editing a monitor | A person claims their page, adds and removes sources, and says in words what they want more or less of |
| 7 | [#139](https://github.com/farzanmrz/oparax/issues/139) Payment | Day seven asks for payment and a paid monitor keeps running |
| 8 | [#140](https://github.com/farzanmrz/oparax/issues/140) The public door | A stranger builds a monitor from the landing page, guarded, and every step is counted; ads go live |
| 9 | [#136](https://github.com/farzanmrz/oparax/issues/136) GitHub and Product Hunt digests | A person adds a GitHub or Product Hunt digest to their running monitor by hand, and gets a daily digest that fits them |

The five get links after slice 1 and again as each later slice changes what they see. Experiment 1 is fully running when the public door (slice 8) ships. The GitHub and Product Hunt digest is a later addition and blocks nothing (owner, September 19): something a person adds to a running monitor by hand.

## 14. Decisions

Made by the owner:

- Monitoring only. AI content creators first; Reshad as the test of a beat that breaks on X.
- Up to five X accounts watched per monitor, and at least five recommended at onboarding (September 19, reversing the September 16 position that accounts are only suggested). Priced by what the accounts post, half a cent per delivered post, billed once per account however many people watch it.
- Free build with no account; one page with a building state and a monitor state; sign-up in place at the first change with X, Google or email; messaging the bot extends to day seven; day seven blocks without payment; the clock starts at bot activation or sign-up, whichever first.
- The five open their page from a link with no account, and the owner builds their monitors himself.
- The onboarding algorithm of section 3, including: at most ten sites and feeds shown to a new person, the strongest ticked, activity-backed sources preferred and Grok deciding that; anything Jev scores under 0.35 is dropped; replies and thread reads dropped as noise; X search removed from Grok's pass; the table row as kind, target, name, focus, language and a fuller description true for anyone (no second address column; Grok writes the descriptions); no Qwen in onboarding; no handle lookup against X's API.
- Jev is in, behind a test, in the two roles of sections 3 and 4 (removed September 17, restored September 18).
- GitHub and Product Hunt as daily digests (September 19).
- Judging and grouping are redesigned together as their own slice.
- The current look stays; pages are designed fresh through Claude Design or the flow's design step. No new palette board.
- Ads in scope, prepared early, run through the connector, launched by the owner. PostHog is the one dashboard.
- No more experiments. The experiment scripts, run folders and working documents are deleted; what they taught is written down.
- Agents may use a browser for their own checks but never on the owner's screen.

Open, each settled inside the slice that needs it: day-zero stories (2); how a story closes and a card updates (2); where polling runs and how often (3); what gets alerted and the bot's transport (5); who may claim a page and account linking (6); the price and whether to offer watched X accounts (7); the daily ceiling, the ads handle, and whether Farzan and Kush are paying seats or test seats (8).

Assistant proposals the owner has not approved, marked so they are never mistaken for decisions: a second judgment on whether a story is worth a DM; suppressing repeat alerts for the same story; a per-monitor daily item budget; demoting a source whose items are never on the beat; a share link on the page; a monthly allowance of delivered posts.

## 15. How it got here

- **Through September 11.** The drafting product shipped through August; customer discovery (178 reporters and 23 creators contacted, two demos, no activations) is in findings.md. Experiment 1 was designed September 11 around personalized news delivery; production was paused and the workers deleted on September 12.
- **September 12 to 15.** Four generations of source discovery, about $20 of model spend. What survived: Perplexity over Grok's own web search; fixed X reads that Grok executes literally; a shared table of accepted sources; the rule that a page and its feed are one stream. What the owner cut, each time asking who had introduced it: a summary step, English phrase filters that dropped Spanish reporters, caps, rejection rules, a keyword matcher. The version of September 15 cost about $1 a person and gave Liam 91 sources.
- **September 16.** The journey settled. X accounts were dropped from monitoring and the positioning became the internet X does not show you. A founder-diagnostic pass put the company at step one: no reactions, no payers, talk to the five first.
- **September 17.** The working documents and scripts were deleted and the algorithm written down. An eight-part walk of the whole stack against the repo and the platforms' own documentation produced the facts now in sections 5 to 10. The plan critique gained a second Codex reader and quality control a third.
- **September 18.** Jev was restored and placed in code before Grok. A results page made the algorithm visible step by step, and looking at real runs did what reading plans had not: replies and threads were seen to be fragments and dropped; mentions were seen not to be credits; junk description lines were seen dragging scores down. Six outside models critiqued the algorithm with the full lab history as evidence, then proposed solutions under the owner's rulings; all of them and the assistant converged on one row per stream with a publisher, a focus and a written description. All 92 rows were re-read and rewritten into 76.
- **September 19.** The rebuilt pipeline ran end to end for 8 and 26 cents. The owner set the ten-source limit, defined the GitHub and Product Hunt digest after a read-only look at how Liam and Nihan actually post, and ended the experiments.

Rules the owner set for the assistant along the way: explain in chat, in plain terms, not by pointing at documents; never present an invention as a decision; no em dashes; skills are found, not installed, unless asked; do not zigzag; when something can be looked at, build the thing to look at, because seeing a real run settles in minutes what planning does not.

## 16. Not in the plan

Posting to X, drafting, voice guides, more than one monitor per account, teams, reading images or video in onboarding, enterprise social monitoring, users' own model subscriptions, crawling or indexing the web, news APIs, star-threshold alerts, any further discovery experiment.
