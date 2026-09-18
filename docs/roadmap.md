# Oparax roadmap

Written September 15, 2026, late evening, after the onboarding algorithm settled. This is the one document: the product as it is to be built, every feature, every algorithm, every decision made, every decision open, and what is shaky. When something here is decided, it says "decided" and by whom. When it is my understanding rather than the owner's word, it says so. Any new chat that plans a part of this should start here and push back on it here.

The working documents of September 15 and 16 (the state summary, the algorithm results, the discovery comparison files, the monitoring lab notes, the GitHub and Product Hunt briefing) were deleted on September 17 at the owner's word; everything they held that still matters is in this file, and git history keeps the rest.

Naming (owner, September 16): the thing a person creates is a **monitor**. "Desk" and "agent" are the legacy names for the same row and appear below where the code is described; the new form, page and copy say monitor.

## 0. Positioning proposed September 16 (owner): the internet X does not show you

"You already live on X. Oparax reads what you follow there, then watches everything X does not show you, the sites, the feeds, the repos, the launches, and brings it to your DMs." X is used for what it is uniquely good at and free for us: knowing what the person cares about (read once at onboarding through Grok's search) and reaching them (the bot). Watching X accounts, the one thing X charges per post for and the one thing the person already sees on their own screen, is dropped from monitoring for now. Consequences: a monitor costs $8 to $12 a month to run at any size, so the price is one number, not tiers and packs; onboarding is unchanged; the X accounts the build finds are shown as "the wires you already read on X" but not subscribed; slice two loses the X Activity API, the webhook, the subscription-cap question and the per-post bill; the alert is the moment of value. Cost of the choice: a wire like Reshad, whose news is on X first, is a weaker fit, which the positioning names on purpose. Proposed, not yet marked decided; nothing in slice one changes because of it.

**The pitch under the diagnose lens (September 16, at the owner's request).** Step 2, messaging: a stranger can tell in five seconds what is offered (the internet you miss while on X), how it helps (delivered to your DMs), and what to do (type your handle). Passes. Step 3, the right people: advertised on X, it tells X's own users that X is incomplete; the people for whom that is already felt are the ones who build their own off-X pipelines by hand (Liam and Nihan use GitHub search, Product Hunt and Hacker News to make their posts; the September 11 briefing describes exactly that pipeline), which is the Mom Test signal, they already pay for this with hours. The people for whom it is false are wires like Reshad, whose news is on X first; the pitch excludes them on purpose. Step 1 caveat, the one that matters: this is still a market hypothesis with zero reactions behind it, and the diagnose skill says do not spend on ads for a Step 1 problem. So: the positioning is the question the five monitors ask, not the ad copy yet. The ad copy is written from the five's own words after they answer "what do you check outside X every day that is not here". Primary skill mom-test; secondary obviously-awesome for the positioning once there is evidence. Positive framing to prefer in copy over "X does not show you": "everything on your beat, from everywhere, in your DMs".

## Assistant proposals, not owner decisions (marked September 16 at the owner's request)

The following appear in this document as if settled. They are the assistant's proposals or carry-overs from the August build record, and the owner has not confirmed any of them: a second judgment on whether a story is worth a DM (the August 28 record had a Qwen "DM-worthiness" step; never approved); the echo check that suppresses repeat alerts (same origin); a per-monitor daily item budget; ordering the monitor page activity sources first and table entries last; a share link on the monitor page; per-person preference sentences read by the filter; the source-type attribute; the pricing arithmetic and any tier shape in section 8; the "internet X does not show you" positioning is the owner's, its copy variants are the assistant's. Each stays a proposal until the owner writes "decided" against it.

## 1. What we are building

One sentence for the user: type your X handle and what you cover, and Oparax builds and runs your news desk: the accounts, sites and feeds behind your beat, a page that fills with the stories, and alerts in your X DMs.

Every piece, so nothing lives only in memory:

1. **A landing page** with the Oparax header, the promise, Reshad's finished desk as the proof, and the box: handle, beat, submit.
2. **Onboarding**: the algorithm that reads the person's posts, works out what they monitor, finds the sources, and verifies them (section 3). Includes the shared source table every user's kept sources feed back into, and the rule that swaps a page for its feed when they are the same stream.
3. **A page per handle** (oparax.ai/<handle>) that shows the sources with their reasons and then the live feed of story cards (section 5).
4. **Monitoring**: watching every source continuously (X through the X Activity API, sites and feeds through a poller), judging each item against the beat, turning it into a story card in English, grouping duplicates (section 4).
5. **The bot** (@oparax_ai): the person activates it from their page, it sends alerts to their X DMs, and it sends the payment ask on day seven (section 6).
6. **Sign-up** with X, Google or email, shown in place at the first action that changes something on a desk (section 7).
7. **Pausing and paying**: the feed pauses on day three without sign-up and freezes on day seven without payment; Stripe checkout; a price still to be calculated (section 8).
8. **Two more source kinds** for the AI creators: GitHub and Product Hunt (section 3.7 and section 15).
9. **Acquisition**: the owner's five desks, warm outreach with prebuilt pages, and X ads run through the connector (section 9).
10. **Measurement** in PostHog: one funnel, one cost-per-person number (section 10).
11. **Guards** so a free box cannot bankrupt us: one build per handle, a daily ceiling, an invisible anti-abuse check, shared X subscriptions, DM batching (section 12).

Monitoring is the whole product. Drafting posts, voice guides and posting to X are gone (owner, August 26 and September 14). Who it is for, as recorded: people who follow a beat and publish about it. The owner named AI content creators as the first group (August 27), reporters as a second, Reshad the Barça wire as the negative test. That is a note about who to reach first, not a limit on what is built; the product is the same for all of them.

## 2. The surfaces and the journey

Decided September 16, second pass (owner): the build is free and not gated; sign-up appears at the first action that changes something. The owner is willing to spend the build cost on a stranger who is trying the product. This supersedes the "sign-up before the build" version written earlier the same day. The guards for a free form return (section 12).

Three views, two addresses:

1. **oparax.ai** (landing): the Oparax header, the promise, one real desk as the proof (Reshad's, finished), and the box: handle, beat sentence, submit. Marketing plus the door. Nothing else on it.
2. **oparax.ai/<handle>, building**: the same page in its first state. The steps stream in as the algorithm runs (reading your last 90 days, you credit @FabrizioRomano five times, checking Mundo Deportivo's Barça feed), in the ai-elements style of step display the product has used before. Built once per handle; a repeat visit to a built handle goes straight to state 3.
3. **oparax.ai/<handle>, desk**: the same page when the build finishes. What they monitor in a few sentences, the sources grouped as X accounts, websites and feeds, each with its reason from the person's own posts, the sample stories first and then the live feed of story cards. Any action that changes something (remove a source, add one, keep it running past the free days, activate alerts) opens sign-up in place.

The bot (@oparax_ai in X DMs) and sign-up (X, Google, email) stay independent surfaces a person can use in any order (owner, September 15). Activating the bot: a button on the desk opens the person's own X composer with a prefilled message; the person sends it; the bot answers; the person always speaks first.

The journey one stranger walks:

| Step | What happens | Costs us | Gate |
| --- | --- | --- | --- |
| Arrives | Landing page: promise, Reshad's desk, the box. | nothing | none |
| Submits | oparax.ai/<handle> in its building state; steps stream; the desk appears. | about $1 once, target $0.50 | one build per handle, a daily spend ceiling, an invisible anti-abuse check |
| Days 0 to 3 | The feed runs live; bot alerts if activated. | monitoring (section 4) | none |
| First edit | Remove or add a source, or keep it running past day three. | | sign-up, shown in place |
| Day 7 | Bot sends the payment ask; Stripe checkout. Otherwise bot stops, feed freezes, old stories stay. | | pay |

The owner's five (Farzan, Kush, Liam, Nihan, Reshad) are built by the owner typing their handles and beats into the same box and sent as links to their pages.

Decided: free build, sign-up at the first edit; one page with two states; the landing page shows Reshad's finished desk and carries the box; pause at day three without sign-up; pay at day seven; sign-up methods; surfaces independent. Open (section 14): what starts the seven-day clock, whether bot activation alone keeps the feed alive past day three, what a stranger sees at someone else's handle page, the daily ceiling figure.

## 3. Onboarding: the algorithm

Final shape, settled September 15 after four generations of experiments. The exact specification (prompts verbatim, request shapes, the checker, the run record, the 93-row seed table) is [onboarding-algorithm.md](onboarding-algorithm.md); the build ports that file. The scripts and run records that produced it were deleted September 17.

### 3.1 The steps

1. **Read the person.** One Grok call in executor mode running exactly seven X keyword searches on the handle: own posts, quotes, replies, posts with links, self-threads, posts that mention others, and a second page of those. Window: 90 days. Code expands the shortened links, tags self-replies as threads, and counts every account the person mentions. Output: the raw posts and a credit count per account (Reshad: Romano five times, Monfort, Salt, Moretto, Scapde twice each).
2. **One agent request.** Grok gets the beat sentence, the raw posts, the credit counts and the shared source table (section 3.4), and one prompt: relate what they say they want to what they actually do; then find the X accounts, websites and feeds that publish it; include everything the evidence supports; do not reject on the person's behalf; no cap; accounts credited twice or more go in on the person's own posts; language never matters. It has three tools and decides itself how to use them:
   - `x_search`: Grok writes exact X keyword queries (operators, limit, Top or Latest), up to five per call; a raw executor request runs them literally and returns the posts.
   - `perplexity_search`: web search, three to five queries per call, for publisher sections and feeds.
   - `check_source`: the product's own checker, free: is this URL a live feed or a section with readable articles. It answers in prose: what they monitor, then every source with its kind, target, reason and origin (activity, database, search).
3. **Extraction.** One tool-free call copies the prose into a list. Needed because Grok through the Gateway returns a placeholder when tools and a strict schema share one request.
4. **Code checks.** Every feed and section is verified by the checker (two readable sample articles); a page and its own feed are one stream and the feed wins; invalid handles dropped; anything that fails is listed separately with the reason, not silently lost.

### 3.2 What it produced

- Reshad: 43 sources, $0.97. Every credited journalist, the outlets behind them (Sport, Mundo Deportivo and its Barça writer, Marca, COPE, The Athletic and two of its writers, RAC1's sports accounts, the club), 17 feeds and sections of which 14 came from the shared table. Grok's own queries: "from:monfortcarlos OR from:NathSalt1 OR from:MatteMoretto OR from:scapde_45", "JJ Gabriel Barcelona OR United transfer", "Barcelona fichajes OR renovación Raphinha".
- Liam: 91 sources, $1.06. All 17 credited product accounts, the official accounts of every tool he lists, Simon Willison, swyx, Rowan Cheung; 57 surfaces, 51 from the shared table. Nine named URLs failed the checker and are listed with reasons.

### 3.3 The platform facts the build must carry

- Grok is reached through the Vercel AI Gateway. Grok's native X search only works on the raw `/v1/responses` request. Perplexity search only works as a Gateway tool inside an AI SDK call. A raw request that carries both X search and function tools returns after Grok's first batch of searches (tested three ways). So the loop is an AI SDK `ToolLoopAgent` with Perplexity and the checker native, and X search as a function that fires the raw executor. Do not re-test this.
- Grok obeys literal prescribed queries exactly (executor mode). It also narrates unless told not to; the prompt says write nothing until the answer.
- xAI bills $0.005 per X search call today, confirmed to the cent from Gateway charges. From September 21, 2026, 12:00 PT it bills $0.005 per post fetched and $0.01 per profile fetched instead. Each person's onboarding fetched about 147 posts: $0.74 in X fees after the change against $0.11 today. Mitigation: smaller limits on the seven fixed reads and on the batches.
- The X API itself (the product's own bearer token) charges $0.005 per post read and $0.01 per user lookup on Pay Per Use. The account balance is negative (about $18) after a $39.64 following-list fetch on September 13; all reads return 402 until it is topped up.

### 3.4 The shared source table

Every X account, feed and site ever accepted by a build or added by a user lives in one table. Decided (owner, September 15); the design below is written September 16 after the owner's questions about matching, bias and growth.

**What a row holds.** Kind (x_account, rss, website, later github and producthunt). The canonical target (handle, or normalized URL). The publisher's name. One line on what it publishes, written when it was first accepted ("Mundo Deportivo's FC Barcelona section: daily first-team news and transfers, in Spanish"; "Bolt.new product blog: Forge, Visual Edits, builder features"). The list of beats it was accepted for, as the users' own beat sentences, not categories: "FC Barcelona men's first team and transfer news", "AI developments and practical tools worth sharing with my audience". The evidence from the first acceptance. Verification status, feed links found, last checked. How many monitors keep it. No taxonomy: "AI" or "football" as tags would be too coarse; the one-line description and the beat sentences carry the nuance, and they are matched by meaning.

**How a build uses it.** Not the whole table forever. At build time the person's beat sentence and the main entities from their posts are matched by meaning against the rows' descriptions and beat sentences (embeddings in Supabase, pgvector), and the closest forty to sixty rows go to Grok as candidates. While the table is small (under about two hundred rows) the whole table goes, as the experiment did. The prompt says three things about them: they are already verified, so never spend a search confirming they exist; they are candidates on the same evidentiary bar as anything found, so a known source goes in only when this person's beat or activity supports it; and search is for what the person needs that is not among them. That is the Kush and Mistral case: Grok sees Mistral is absent, searches for it, and the found Mistral feed joins the table for the next person. Personal credits always outrank the table: an account the person credits twice goes in on their own posts whether or not it is known.

**What it does not do.** It never replaces reading the person. It does not exclude known handles from X search at the request level (that would hide their posts as evidence); it tells Grok not to re-verify them. Perplexity's domain exclusion allows twenty domains, too few for a growing table, so the "do not re-search" instruction lives in the prompt and the retrieval keeps the list bounded.

**Measured.** In the September 15 run the table (93 rows) supplied 14 of Reshad's 17 surfaces and 51 of Liam's 57 at no search cost. The bias the owner named is real: on a broad beat with a full shelf Grok takes most of the shelf (Liam's 91). The evidentiary-bar rule above and the page ordering (activity sources first, known sources grouped last) are the answer, not a cap.

**User-provided sources.** Anything a user names when creating a monitor, or adds later, goes into the table with their beat sentence, and the build treats it as the strongest evidence there is.

### 3.5 The page-to-feed rule

When a user pastes a page, or Grok names one, the product looks for a feed (advertised by the page, or in the table) and compares: are the page's on-section article links all in the feed. If yes, the feed is polled and the card still shows the page the user asked for. If the feed covers only part of the page, or is site-wide, the page is polled. If neither can be read (JavaScript listings with site-wide sitemaps, like Cursor's blog), the user is told. Verified September 15 on Mundo Deportivo (18 of 18 Barça links in the feed, plus the page carried 8 off-beat items the feed does not) and The Athletic (25 of 25; the page itself is unreadable to the poller). Decided (owner, September 15).

### 3.6 What was tried and rejected, so it is not rebuilt

- A "brief" step between reading and searching: compressed 57 posts into a sentence and then searched on the sentence. Gone.
- A verification step with phrase filters: dropped Spanish and Italian reporters for not matching English keywords, then rejected accounts on two-post samples. Gone; the user prunes.
- A keyword matcher over the source table: gave zero registry candidates. Gone; the whole table goes to Grok.
- Caps on sources (10 feeds plus 10 websites), caps on searches, rejection rules, aggregator rules. Gone.
- Native Grok web search as the default web route: three to five times Perplexity's cost. Optional second pass at most.
- Full following lists as input: $39.64 for five people. Gone.
- Qwen anywhere in onboarding. Never.

### 3.7 Open tuning, not blocking

- Cost is $1 against a $0.50 target. The loop re-reads its context every step (400k tokens per person, half cached). Trim the payloads Grok gets back (post text to 200 characters, snippets to 120, no sample excerpts) and ask for batched checks. Not measured yet.
- Liam's 91 sources: with "include everything" and a large AI table, Grok takes most of the shelf. The user prunes; whether the first screen needs ordering (activity first, table last) is a page design question.
- Two more source kinds are needed for Liam and Nihan: GitHub and Product Hunt. See section 3.8.

### 3.8 GitHub and Product Hunt

Found September 15 in the Codex session of September 11: the owner attached a briefing written from Grok output (kept verbatim in this repo's git history until September 17, commit bb96b37, as docs/github-product-hunt-briefing.md). Owner's words that day: "there's Product Hunt, which Liam and Nihan have demonstrated... I think the reason I keep leading with GitHub and the product hunt direction is that I feel like Liam and Nihan would use something like this if the bot can just DM them." Codex parked it ("Parking lot: ... GitHub (Liam)") and on September 13 the owner told the discovery experiment to ignore GitHub and Product Hunt links "because obviously we have other plans for those specifically." So: discussed, designed on paper, never decided into a build. What the briefing says, in plain terms:

- **Two different jobs.** Discovery finds new projects in a beat (a repo that went from 12 to 800 stars this week, a new wave of SKILL.md files, today's Product Hunt launches). Watching follows known projects (releases, star velocity, first Product Hunt launch, first appearance on Trending). Discovery runs on a slow clock (every one to six hours); watching runs every ten minutes and reports only when something moved.
- **What exists to read.** GitHub has an official search API (by topic, keyword, creation and push date, stars), a code search (find every SKILL.md or mcp.json on public GitHub, which is how skills.sh and SkillsMP exist), per-repo metadata and releases, a new privacy-safe star-history endpoint (September 4, 2026) for stars per day, and an events feed that is laggy and sampled. There is no official Trending API; Trending is a page to scrape as a bonus signal only. Product Hunt has a GraphQL API for today's launches with votes, topics and usually a GitHub or website link.
- **One entity, several sources.** A tool seen on GitHub, on Product Hunt and on Trending is one record with three sources, joined by its GitHub URL, homepage or name. Being on Trending and launching on Product Hunt the same day outranks a famous repo that gained three stars.
- **The beat becomes a profile**, not a search string: topics, keywords, file patterns, exclusions, plus an embedding of the beat sentence to rank results by meaning, because GitHub search is keyword-only.
- **Two tracks.** Incumbents (2,500 stars or more on the beat, watched for releases) and rockets (new or recently pushed, fast velocity, no star floor). Every item carries a "why this tick" sentence ("+420 stars in 18h; first time on Trending").
- **Rate limits shape it.** GitHub search about 30 requests a minute when authenticated, 5,000 general requests an hour; Product Hunt about 6,250 points per 15 minutes. A watchlist of 150 to 400 entities per beat, conditional requests so unchanged repos cost nothing, never a full recrawl every ten minutes.
- **Where Oparax sits.** GitHub and Product Hunt are source adapters feeding the same desk: candidates in, the beat judgment after. The briefing's own decisions list (its section 16) is the starting point for the chat that plans this.

The written version that did make it into a plan is in [exp1.md](exp1.md) under Sources (September 11 to 12), and it is the settled mechanism until the owner says otherwise:

- **GitHub:** monitor selected repositories' releases and tags through the API or their feeds. Discover candidates from the links in the person's X posts, from tracked organizations and from a scheduled search. Poll selected repositories hourly, honoring rate limits. Do not use the delayed Events feed for release tracking, and never label our own popularity ranking as official Trending.
- **Product Hunt, feed:** its official Atom feed of launches goes into the shared hourly poller and is filtered per person. Verified September 11: 50 entries with ids, titles, times, links, content and authors. It is a discovery input, not exhaustive coverage and not vote counts. Guessed topic feed URLs return 404; do not fabricate them.
- **Product Hunt, API:** the richer adapter for topic and date filtered launch discovery with votes, comments and ranks, fetched once for shared use under the quota (6,250 points per 15 minutes) with a server-side token. Its terms require contacting Product Hunt for commercial use; that is an admin task before launch.

Not yet decided by the owner: whether this is in the first build or comes after the five desks run; whether a person's GitHub interest is a watchlist they name, topics we derive from their posts, or both; the same for Product Hunt topics.

**Owner's framing, September 17,** after the pivot statement "I'll monitor the internet, GitHub and Product Hunt for you outside of X and give you that info on X": the base algorithm does not change in shape, but GitHub and Product Hunt bring a second kind of event. Feeds only ever produce "a new item appeared"; a repo passing 3,000 stars or a launch passing 200 votes is "a number on something we already know crossed a line", seen only by sampling. The owner's stated concern is that a person should be able to steer all of it in plain words ("this sort of news I like, this sort I don't", "monitor it at 2.5k stars, bring it to me at 3k") rather than through per-source setup screens. Assistant proposal, not decided: every source kind runs fetch, then rules (numeric conditions on structured fields, in code, free), then the on-beat judgment on what survives, then the card; feeds have an empty rules step. The person's words are compiled once at save time into judge sentences and rule rows, and the page reads the compiled version back in plain words. No threshold or topic screens until someone types a number.

### 3.9 TypeSafe Jev (the owner's direction, September 18; enters behind a test)

History: researched September 16, removed from this document September 17 at the owner's word, restored September 18 at the owner's word ("dismissing Jev this early might have been wrong"). The owner's caution stands beside it: "I don't want to force things into my product just for the sake of them."

What it is, verified in its docs: one endpoint, a state (the facts for one decision) plus a map of typed questions, answered in parallel in about 100 milliseconds. Noul returns the probability of yes; Choice picks one of up to 255 options with a probability each and a confidence; Score rates against 2 to 10 described levels. About 32,000 tokens of state plus questions per call. It writes nothing, searches nothing, calls no tools, explains nothing, and keeps nothing between calls. No price page exists; the cookbooks imply about $0.042 per million input tokens with output free, which would make a three-question judgment on a 600-character item about $0.00002 against Qwen's measured $0.000116. Its own 711-case benchmark, reported by a third party, has it at 67.8 percent against 74.1 for the best frontier model, so it is cheaper and faster, not more accurate. Spanish and Catalan are documented nowhere. Rate limits, SLA and an API commercial-use clause are unpublished; the terms carry a $100 liability cap.

**The owner's framing, in two parts.**

Onboarding. An X account is suggested (suggested, never monitored) when it is already in the shared table or is directly credited or quoted in the person's own posts, and its intent relates to the beat; Jev scores that relation. The same judgment applies to the posts Grok pulls in (related to the beat or not) and to the sources, judged by their content, for whether they belong and should be recommended. All of it is presented to Grok.

Downstream. Every incoming item passes through Jev first: is it related to the person's intent as they have communicated it, or filtered out. Clustering: Jev answers whether this item is the same news as any story from the recent window, with a probability per story; Qwen reads that answer and only decides whether the item adds information to the story, then writes. The point is to cut Qwen's workload and run fast and cheap. The person's corrections, per source or per story, compile into what Jev reads, so its judgments follow the person over time.

**Mechanism notes (assistant, proposals).** Jev does not learn; "evolving" means the state we send grows: the beat sentence, the person's preference sentences, and a short list of their recent corrections as examples, inside the 32,000-token budget. Judgments run as a cascade: above a high threshold the item is kept, below a low one it is dropped, and only the uncertain middle band goes to Qwen, which stays the fallback whenever Jev errors and is always the writer. For clustering the question is a Choice over the monitor's open stories plus "none of these". In onboarding the open point is where Jev sits: the owner's words are "Grok just uses it as a tool"; the assistant's note is that every tool round trip makes Grok re-read its whole context, which is where the build's cost already is, so the cheaper placement is in code around Grok (before it, narrowing the table rows and candidate accounts Grok is shown; after it, scoring the checker's sample articles against the beat) with the scores handed to Grok as data. To be settled by the owner.

**The test.** The September 15 sample data was deleted with the run folders on September 17, so the comparison runs on slice 1's own day-zero items: every backfilled item is judged by the existing Qwen stage (which decides what the page shows) and, silently, by Jev; the owner labels 60 to 80 of them on-beat or off-beat, half of them Spanish from Reshad's monitor. Jev takes over the first-pass judgment in slice 2 only if it matches the owner's labels at least as well as Qwen, is no worse on Spanish, is calibrated (9 of 10 above 0.85 truly on-beat, 9 of 10 below 0.15 truly off), survives 50 concurrent calls without rate-limit errors, and the console bill confirms the cost. It needs the owner's TypeSafe API key as a server-only variable, and written confirmation from TypeSafe that commercial API use is permitted before any stranger's monitor depends on it.

## 4. Monitoring: what runs after onboarding

My understanding of the loop, assembled from the August 28 build (issue #131, archived as tag `archive/ft-131-monitoring-pivot`) and the September 14 plan. Nothing in this section is built today: the Railway workers were deleted September 12 and the Supabase tables are empty.

1. **X accounts** are watched through the X Activity API: one subscription per unique handle, shared across every desk that watches it, delivered by webhook to one route on Vercel, written to a receipt ledger before acknowledgement, with a reconcile sweep. About half a cent per delivered post. The live subscription cap per tier is unproven (docs once showed 3 on one tier against a 1,500 assumption); proving it is the first step of the ingestion slice. Whether a source's own replies and reposts fire the webhook is a named check never run.
2. **Feeds and sections** are polled on Vercel Pro cron with persisted cursors and claim-before-deliver, using the existing `lib/sources` detection (sitemap, feed, listing), direct fetch first, Bright Data Unlocker only after a block.
3. **Each delivered item** is judged on the desk's beat (the existing filter stage, cheap model), synthesized into an English story card (headline, one to five fact lines, contributing sources, one time, an image only when a source had one), and grouped so many items about one story make one card. Translation is part of synthesis, which is why source language never matters.
4. **Delivery:** the page fills continuously; the bot sends DM alerts for items judged alert-worthy, with a 30-minute echo check against repeats, plain text plus at most one image, under X's caps (1,440 DMs per day per app, 15 per 15 minutes per person). Suppressed items still reach the page.
5. **Pause:** on day three without sign-up the desk's subscriptions are released and polling stops; the page stays readable. On day seven without payment the bot stops and the feed freezes.

**Measured running costs (PostHog AI events, August 24 to 28, the last live desk).** Filtering: 2,734 Qwen calls at $0.000116 each, about one hundredth of a cent per item. Synthesis: 1,000 calls at $0.00025 each. Four days of one desk: $0.57 of model calls for about 640 items a day. Scaled to a 90-source monitor seeing 500 to 1,500 items a day, that is $0.06 to $0.17 a day for filtering and about half that for synthesis, so $3 to $8 a month, and batching items per tick shares the prompt and roughly halves it. X ingestion is the real bill: about half a cent per delivered post, so 200 X posts a day is $1 a day, $30 a month, ten times the model cost. Websites and feeds cost nothing to poll. Decision, September 16, corrected the same evening: feeds and sites are polled every one to five minutes with conditional requests (free to fetch; the old poller ran every 45 seconds), and whatever is new at a tick is judged in one call the moment it arrives, so the page is near real time for free. X posts arrive by push and are paid per post whatever the cadence. Alerts are not bounded by the clock but by a second judgment, DM-worthy or page-only, plus the echo check so one story never alerts twice; at $0.015 per DM that judgment is the second cost dial after the X account count (open decision 8). Items are judged one call each (the scaffolding of a call is about 1,500 tokens against 200 to 400 for the item, so batching would save a dollar or two a month and cost judgment quality; not worth designing around); a tick with fifty new items is fifty concurrent calls. Feeds and sites are unlimited, so the guard is a per-monitor daily item budget with the page showing which source produced the volume, not a cap on sources (slice two).

## 5. The person's page (oparax.ai/<handle>)

Design decided August 28 and not changed: story cards with a synthesized headline, one to five fact lines, contributing sources, one relative compact time, image only when a source had one, one combined search-and-filter, continuous scroll, no header or hero or counts. Hanken Grotesk for text, JetBrains Mono for times and numbers, never serif, never all caps, title case, one orbit mark plus a plain wordmark, no eyebrow text, no subtitles. Palette open. Every visual board so far was rejected.

The page carries the sources it was built from (grouped X accounts, websites, feeds, each with its reason from the person's own posts), the activate-alerts button, and the sign-up prompt at the edit and day-three points. While the page is being built it shows the work as it happens (reading your last 90 days, you credit @FabrizioRomano five times, checking Mundo Deportivo's Barça feed); that wait is the demo.

Open: what a stranger who opens someone else's handle page sees (recommendation on record: nothing until claimed; the owner has not decided).

## 6. The bot

`@oparax_ai`, verified live in the X developer console September 14 (bot user id 2098571482792112140, dm.read, dm.write, users.read, tweet.read, chat keys registered). Sending and receiving have never been built or tested; the cost of a bot DM is unverified and needs one real send. Five states on record: idle, waiting for reply, connected, trial ended, stopped. The bot speaks as Oparax. Delivery cadence hourly or slower (owner). When a person DMs the bot from their own account, the DM proves the handle is theirs; that fact can be used, but the bot is not a substitute for sign-up (owner, September 15).

## 7. Sign-up

Continue with X, continue with Google, or email (owner, September 14). Supabase Auth; SMTP through Gmail as farzan@oparax.ai is set up and proven. Sign-up appears in place at the first action that changes a desk (September 16, second pass); it claims the page to an account, unlocks editing sources, keeps the feed alive past day three, and is where payment attaches. Sign-in with X also proves handle ownership. No test account exists today.

## 8. Payment

Day seven, Stripe hosted checkout through the Vercel marketplace, webhook records paid-through time and status, renewal failure, cancellation, refunds. Nothing built. The price is a calculation still to be done (owner, September 14). Anchors on record: Reshad's $4 a month, Brieflet's $12 for comparable personalization, the owner's August floats of $5, $20 and $100 tiers, and an assistant proposal of $29 that was never adopted. Inputs for the calculation: onboarding about $1 today (target $0.50), X ingestion half a cent per post, bot DM cost unknown, per-story filtering unmeasured. The arithmetic, September 16, as a hypothesis and not a decision. Running cost per monitor per month: feeds and sites free to fetch, $5 to $8 to judge, alerts $4 to $14 bounded by the worthiness judgment, and X at $2.25 per typical account or $4.50 per busy wire. So a Liam-shaped monitor is about $18 with five X accounts and about $8 with none; a Reshad-shaped wire with ten busy accounts is about $55. On top: about $1 of infrastructure per user and $3 to $10 a month repaying acquisition. At $20, a monitor with X in its base breaks even; with the feeds carrying the news it earns 40 to 60 percent. Shape that follows: a base of unlimited feeds, sites, GitHub and Product Hunt plus the bot at $19 to $29 (cost $8 to $12), and X accounts in packs of five at $15 to $20 (cost $11 per typical pack). Liam and Kush land at $35 to $49 with five accounts; Reshad's ten wires at $50 to $70 against his stated $4, which is the negative test in numbers. The bet that decides all of it: the feeds deliver the wire's news fast enough that X becomes an add-on. The five monitors measure it, because every story card carries its sources: count the stories that arrived only from X and how far behind the feeds were on the rest. An earlier owner suggestion, cap X accounts at 20, is folded into the packs.

## 9. Acquisition and ads

Three doors, all prepared from slice one, ads leading among them (owner, September 14 and 15). Paid clicks go live when a stranger can complete the walk end to end (the owner's own "everything else waits" of September 16 and build order 13); until then the campaign sits built and paused. The owner's own five desks (Farzan, Kush, Liam, Nihan, Reshad) are the first cohort; warm outreach to creators recruited outside the 23 already contacted, each with a link to their own prebuilt page; X ads to the landing page.

X ads: the Ads Manager account exists under Farzan Mirza with no campaign ever created. The X Ads MCP connector is set up and logged in (September 15, app "Oparax Ads Agent", id 33434531, scopes ads.read ads.write offline.access), so the assistant can build and read campaigns; the owner presses Go and sets the budget. Campaign variables on record: objective website traffic to the form; audience seeded from creator handles in people.tsv, excluding the 23 contacted and the owner's followers; two or three promoted posts in the owner's words, each with its own source tag; automatic bidding; daily budget set by the owner. Appetite on record: $300 for 500 sign-ups, a number to reset, not a target. Which handle the ads speak as (@farzanmrz or @oparax_ai) is open.

## 10. Measurement

PostHog project 563049 is the one dashboard (owner). Today it receives only automatic events (pageviews, identify, web vitals, exceptions, dead clicks, AI generation); nothing custom, no funnel, no experiment; the August session-replay gap was never resolved. The build adds one named past-tense event per intent, recorded server side where the action happens off the web (bot delivery, replies), joined through an anonymous identity stored on the page and aliased at sign-up. The funnel in plain words: visited, built a page, activated the bot, used it (three of the trial days including one of the last two), paid, and cost per person from one reconciled cost source keeping confirmed and estimated amounts apart. PostHog Experiments only when there is a randomized variant.

## 11. What exists today

| Thing | State |
| --- | --- |
| Repo `beta` | docs and meta commits only since September 6; the last product commit is the September 6 landing page, which sells drafting and is to be replaced |
| Vercel `oparax` | Pro plan, production paused, six domains attached, env vars installed; resume before any traffic |
| Supabase `pcgvpypzfwuchyfwdlwe` | awake, every table empty, free plan that hibernates; the #131 tables remain live while the committed types and migrations on beta predate #131 (regenerate before slice one); upgrade before traffic; X and Google auth providers not yet enabled |
| Railway | gone; no ingestion exists anywhere |
| X developer console | product app "Oparax" (connect X, bot); ads app "Oparax Ads Agent"; X Activity API enabled; Pay Per Use project with a negative balance |
| X Ads | account exists, no campaign, connector connected |
| PostHog | live, automatic events only |
| Stripe | nothing |
| Landing page live | the drafting-era page from September 6 |
| Experiment code | deleted September 17; the algorithm lives in [onboarding-algorithm.md](onboarding-algorithm.md) |

## 12. Costs and guards

- Verified prices (September 16, official pages): X Activity API $0.005 per delivered post; X DM send $0.015 per request; qwen3.7-flash $0.03 per million input tokens and $0.13 per million output; grok-4.6 $2 in and $6 out per million; X search $5 per thousand calls until September 21, then per post and per profile. Per monitor per month at the 30-minute cadence: about $20 for a 20-source monitor with an even mix, about $90 for 90 sources, $14 if all feeds and sites, $240 to $405 if all X accounts. X delivery is 8 to 9 times the model cost at every size; the X-account share is the lever.
- TypeSafe Jev: no price page; cookbook-implied $0.042 per million input tokens and free output, unverified for the current model; no published rate limit or SLA; a direct key outside the Gateway budget alert, so its console spend joins the daily spend check if adopted.
- Onboarding: $0.97 (Reshad) and $1.06 (Liam) per clean pass; $0.13 to $0.18 to read the person, $0.22 for Grok's X searches, $0.55 to $0.59 for the loop, $0.02 extraction. Target under $0.50 by trimming payloads and batching; the shared table already removes most web searching on repeat beats.
- Guards on the box: one build per handle (a repeat visit opens the built desk), a daily spend ceiling with a visible "full for today" state, an invisible anti-abuse check.
- Guards on spend: AI Gateway budget alert; per-handle X subscriptions shared across desks; DM sends batched under the app cap; the seven fixed reads and batches at smaller limits after September 21.
- Spend on the discovery investigation, September 12 to 15: about $13.70 on the 14th, $3.52 on v3 and about $3.30 on v4 on the 15th, plus earlier days; the X API balance is negative and needs a top-up before the product reads X directly.

## 13. Build order

Each slice goes through the flow (`/feature` plans it, `$build` builds it, `/qc`, `/ship`). Order, September 16, streamlined by the six-lane pass and the diagnose rule (one slice, sent, then silence until the five answer).

### Slice 1: the monitor page, for the five

Scope, and nothing else:

- **The box** behind the existing email login: handle, beat sentence, submit. Only the owner submits in this slice.
- **The building state**: the four steps of section 3.1 stream as chain-of-thought steps from a run record the browser polls, with the per-step text and cost.
- **The monitor page**, readable by anyone holding the link, no login: what they monitor in a few sentences; sources grouped X accounts, websites, feeds; each with its reason and origin (activity, table, search); activity sources first, table entries last; sources that failed the checker listed separately with the reason.
- **First stories**: the checker's sample articles (title, URL, publisher) as cards labelled recent. No live feed in this slice.
- **One build per handle**: a repeat submit for a built handle opens the built page. No other guard, because no stranger can reach the box yet.
- **The shared source table**, 93 rows seeded from the experiment's known-sources file, loaded whole into the agent prompt, written to on every accepted source. No embeddings.
- **Every model call ledgered** in model_calls and usage_events under the owner's user id, with new stage names.
- Not in this slice: editing sources, sign-up in place, the bot button, PostHog custom events (automatic pageviews already run), any landing page change, the monitoring tick, GitHub and Product Hunt (tell Liam and Nihan in the send message that they are not wired yet).

Data, minimal: `agents` reused as the monitor row with two added columns (public_handle unique, monitor_summary); `monitor_runs` new (handle, beat, status, steps as JSON with name, status, text, cost, total cost, error, the agent id once built); `monitor_sources` new (agent id, kind, target, publisher, reason, origin, evidence, kept or failed with reason, feed URL, sample articles, position); `known_sources` new (kind, target, title, accepted-for beat sentences, feed URL, verified at) with the seed. Regenerate the Supabase types against the live project first: the committed types predate #131 and the live project still holds #131 tables.

Reuse: the chain-of-thought and shimmer components as composed in `components/extraction-chain.tsx`; the polling hook and progress card from voice extraction rewired to `monitor_runs`; the Sources tab band cards and chips with a feeds group and a reason line; the checker imported directly from `lib/sources` (no bundling); the Gateway cost and ledger helpers in `lib/agent`; the handle-shape rule in `lib/x/handle.ts`; from the archive tag, the no-login public query and page shape (`lib/feed/public-query.ts`, `app/feed/[handle]/feed-client.tsx`) and the public_handle migration; the runner's prompts and seven fixed reads as the reference for `lib/monitor`, then the scripts are deleted (copy the known-sources seed out first).

New: `lib/monitor/` (read-person, x-search executor on the raw Gateway request, build-monitor tool loop with Perplexity and the checker native and x_search as a function, extract, ground with the page-to-feed rule, run record writer), three prompts under `lib/sysprompts/monitor-*.md`, the box page and building state under the login, one public read route, one migration. Model id resolved from the live Gateway model list at runtime. No Bright Data fallback in the checker in this slice; URLs that fail direct fetch show in the failed list.

Traps from history, do not repeat: rebuilding what the archive tag already has; touching the bot, webhook or DM tables; re-polishing the story card or source rows before answers arrive (the feed was rebuilt twice in one week in August); story grouping (built July 23, scoped out July 24); a new palette board (every board so far was rejected); another paid discovery run; waiting for the five to come back on their own (Reshad went idle the day contact stopped, so the three questions go in a direct follow-up).

### After the five react

2. **Make it move.** Monitoring at the 30-minute cadence (section 4): the poller for feeds and sections on Vercel cron, X through the Activity API (first step: the live subscription-cap check), one prompt per tick judging every new item, story cards, grouping, the day-three pause. GitHub releases feeds and the Product Hunt launches feed join here as ordinary feeds. A queue of raw items is a slice-two migration on empty tables; nothing in slice one needs reshaping for it.
3. **The bot.** Composer-first activation, reply handling, alert sending ($0.015 per DM sent, verified), the day-seven message. Prerequisite: one authorized real send.
4. **Strangers.** The box outside the login with its guards (one build per handle, the per-IP attempt table from the archive, a daily dollar ceiling), sign-up in place at the first edit, X and Google sign-in, the landing page with Reshad's finished monitor and the box, arrival events with source tags.
5. **Payment.** Stripe, the day-seven ask, the price written down before anyone is asked.

Ads creative, targeting and a paused campaign are prepared from slice 1 onward through the connector; the campaign goes live when a stranger can complete the walk (section 9).

## 14. Decisions

### Made by the owner, in his words or confirmed

- Monitoring only; posting and drafting removed.
- AI content creators first; Reshad as the negative test.
- Free build by handle and beat, no account; one page with a building state and a desk state; sign-up in place at the first edit; pause at day three without sign-up; pay at day seven (September 16, second pass).
- Sign-up methods: X, Google, email.
- Surfaces are independent; the bot is not a sign-up.
- The algorithm of section 3, including: no caps, no rejection, the user prunes, language never matters, the shared source table, the page-to-feed rule, Grok's freedom in searching with the exact search parameters spelled out in the prompt, the person's read fixed to the seven queries.
- Ads in scope, run through the connector by the assistant, launched and budgeted by the owner, in parallel with the other doors.
- PostHog as the one dashboard.
- No Qwen in onboarding; no clock; no more discovery experiments.

### Answered by the owner, September 17

- The five open their monitor from its link with no account. Sign-up is needed only to edit the sources. In slice 1 the owner creates the five monitors himself.
- Day zero is a backfill, not the checker's samples: for every feed and site set up, pull the most recent items (at least the three most recent, or the last day), run them through the judgment and show them in the feed.
- Filtering and clustering are being redesigned together (many items about one story become one card); that redesign is its own slice.
- No X API handle check. The handle is read once through Grok's X search to learn the person; if nothing comes back the handle is wrong.
- The current DESIGN.md aesthetic stays; no new palette board. The pages themselves will look very different and are designed with Claude Design or through the feature flow's design path.
- DMing the bot keeps the feed alive past day three, not past day seven. Day seven blocks without payment.
- The seven-day clock starts at bot activation or sign-up, whichever comes first.
- A stranger opening someone else's page is not a concern for now.

### Open, for the owner, each explained

**1. What starts the seven-day clock.** Day seven is when the bot asks for money and the feed freezes without it. The clock has to start at one event. Three candidates: the moment the page is built (simplest, but a person who never comes back gets a payment ask for something they never used); the moment they activate the bot (the first thing that proves they want it, and the bot is the channel the ask arrives on); or the moment they sign up (the old rule from September 10, but with the day-three pause it means a person can pause, sign up on day ten, and pay on day seventeen). My recommendation: bot activation or sign-up, whichever comes first.

**2. Does activating the bot keep the feed alive past day three?** A person who has DMed the bot has proved they are real and given us a channel but has no account. Either that extends them to day seven, with sign-up required only to pay, or only sign-up extends. My recommendation: it extends.

**3. What a stranger sees at someone else's page.** Pages live at oparax.ai/<handle>. Anyone can type any handle. If the page is public, a person can build a desk for Fabrizio Romano's handle and read it, and Romano's page exists before he asked for it. Options: public read-only for everyone (most viral, most open to abuse of the free build); visible only to whoever built it until the handle owner claims it by signing in with X or DMing the bot; or nothing shown at all until claimed. The choice also sets whether a page is "theirs" or "yours about them". Recommendation on record: nothing until claimed. Your call.

**4. The daily spend ceiling on the form.** Each build costs about $1. Without a ceiling, a script or a link going viral could spend without limit. The ceiling is a dollar figure per day after which the form says "full for today, leave your handle" and queues. Pick a number; $25 a day means 25 strangers a day at today's cost.

**5. The price.** Nothing is decided. Anchors: Reshad said $4 a month; Brieflet charges $12 for similar personalization; you floated $5, $20 and $100 tiers in August. Costs to cover: about $1 once for onboarding, half a cent per X post ingested, tokens per story judged, DM cost unknown. A realistic desk might ingest 50 to 300 posts a day. The price is a calculation from those inputs, plus a decision on whether to cap X accounts per user (you suggested 20) and charge more for more.

**6. Which handle the ads speak as.** X ads are posted from an account. From @farzanmrz they read as a founder's post, which this cohort has learned to read as a collaboration ask. From @oparax_ai they read as the product speaking. The critique recommended the product. The ads account belongs to your personal handle today; promoting from the bot account may need the ads account to be tied to it.

**7. Whether paid traffic waits for a working end-to-end walk.** You said ads run in parallel with everything and lead. The seven reviewers wanted paid clicks to land only once a stranger can build a page, activate the bot and see stories without a dead end. The practical version of your instruction: prepare creative, targeting and a paused campaign now, and flip it live the day the page works; that is still "ads leading", it just does not pay for clicks into a dead page. If you want clicks earlier than that, say so and we ship a waitlist page first.

**8. The X account cap per user.** Every X account a desk watches is a subscription on the X Activity API, and each costs about half a cent per post delivered. A desk watching 40 prolific accounts costs more than one watching 10. You suggested a cap of 20 accounts, gated by price, with websites and feeds uncapped because polling them is nearly free. Decide the cap and whether a higher tier lifts it.

**9. What "45 profiles" means.** The term appears in your instructions ("build it for these 45 profiles") but no list of 45 exists anywhere; the only lists are the five test profiles and the 199-row people ledger. Either name the 45 or drop the term.

## 15. Shaky between us

Things I am not sure we see the same way. Each one explained so it can be decided without me.

**GitHub and Product Hunt as sources.** Found (section 3.8): the September 11 briefing has the full design; it was parked, not decided. Still yours to say: is it in the first build, and does a person name repos and topics themselves or do we derive them from their posts.

**What the first stories on day zero are.** The page promises stories at build time, but monitoring starts after the build and takes time to fill. The checker reads two sample articles per feed while verifying it; my assumption is that those samples are the first cards, labelled as recent, until live items arrive.

**Two clocks.** Pause at day three, pay at day seven. See open decisions 1 and 2; whichever events start them, the plan needs one sentence that says so.

**The cost target.** You want under $0.50; the measured pass is about $1. The loop re-reads everything it has gathered on every step, so trimming what the tools send back and batching checks should roughly halve it; not measured. xAI's September 21 change makes the X part about $0.74 per person unless the searches read fewer posts. If $0.50 is a hard ceiling, the seven fixed reads of the person's posts must shrink from ten posts each to about five, which reads less of them.

**"Surface everything."** Liam's page lists 91 sources. That is what "include everything the evidence supports" produces on a broad beat when the shared table already holds 93 AI entries. The user prunes, but 91 rows is a long first screen. Fix, if wanted, is on the page: activity-derived first, then discovered, then table entries collapsed; not a change to the algorithm.

**The monitoring loop.** Section 4 is my reconstruction from the deleted August build and the September 14 plan. You have not re-read it since the pivot. The pieces that matter most: X through the Activity API (push, not polling), sites and feeds polled on Vercel cron, every item judged on the beat, story cards in English, grouping of duplicates, DM alerts with an echo check.

**The X subscription cap.** The X Activity API delivers a source's new posts to us only for accounts we have subscribed to. X limits how many accounts a project may subscribe to, and the limit depends on the tier we are on. One document once showed 3 for a tier; the plan assumed 1,500. If the real number is small, the whole X side of monitoring needs a different route (polling each account, which costs per read). One call to the live endpoint answers it; nobody has made it.

**The bot's cost and its right to send first.** X charges for DMs sent through the API and its rules restrict a bot from messaging someone who has not messaged it. We designed the bot so the person always speaks first. What one DM costs and whether the reply flow works has never been tried; one real send answers both.

**The live landing page still sells drafting.** oparax.ai today is the September 6 page about drafts. Any visitor until the new page ships lands on the wrong promise. Options: pause the site, put up a one-line holding page, or leave it.

**Who the five desks are for.** Farzan, Kush, Liam, Nihan, Reshad are the first cohort. Whether Farzan and Kush count as customers with the seven-day payment ask, or as test seats that never pay, has not been said.

## 16. How we got here (September 12 to 16)

Recorded so the reasoning survives compaction and new chats.

- **September 12 to 13.** Three source-discovery experiments (Codex and Claude Code): a Bright Data SERP route, a renewed five-profile run aiming at 10 feeds plus 10 websites per person. Registered websites came out zero everywhere; the loop re-inspected without accepting; stopped on the owner's word. Lessons kept: Google News RSS is excluded by its terms; single articles must be rejected by shape; site-wide sitemaps are not sections.
- **September 14.** The comparison that settled the web route: Perplexity search through the Gateway against native Grok web search, same people, same evidence, same checker; Perplexity at a tenth of the search cost with on-beat picks. The lean algorithm measured at $0.56 to $0.68 per person. The grounding rule for personal evidence (any post under the person's handle counts) fixed the Romano loss. The whole plan was critiqued by seven reviewers (69 findings) and folded into the first roadmap. State of the business grounded from 219 Codex sessions, the console, Ads Manager, Vercel, PostHog.
- **September 15, day.** The owner's corrections drove v3: Romano missing from Reshad's list showed the person-read was two days of originals, so the seven fixed X keyword reads (own posts, quotes, replies, links, threads, mentions, paged mentions) were prescribed and Grok obeyed them literally; code counts credits; a brief step compressed the evidence and was later removed; the keyword matcher over the registry was the assistant's invention and was removed; the whole registry now goes to Grok. The X Ads connector was set up and logged in. xAI's September 21 repricing (per post and per profile instead of per call) was confirmed.
- **September 15, evening.** v3 results: verification with English phrase filters dropped Monfort, Moretto, RAC1 and Catalunya Ràdio; the owner asked who introduced it (the assistant) and the check was rebuilt as a liveness sample, then judged excessive along with the rejection rules; the owner asked for one prompt that relates the beat to the activity and searches with the exact parameters spelled out. v4 built: one agent loop. The Gateway fact found by three tests: Grok's native X search and function tools cannot share a raw request, so the loop is an AI SDK tool loop with Perplexity and the checker native and X search as a batched executor function. Results: Reshad 43 sources at $0.97, Liam 91 at $1.06. The page-to-feed rule verified on Mundo Deportivo (18 of 18) and The Athletic (25 of 25). GitHub and Product Hunt found in the September 11 Codex session and in exp1.md. The roadmap written as the one document; AGENTS.md cleaned.
- **September 16.** The journey moved three times and settled: free build, one page with a building state and a desk state, sign-up in place at the first edit. Landing page research (v0.app, granola.ai, f5bot.com as the three to visit; Motion already in the repo; no embed tools, no Typeform). find-skills installed globally; the design skills restored to the flow's ui bundle after git archaeology showed they were dropped by accident in the August 9 rewrite. Inventories of the current checkout and the August archive gave the reuse map. The naming changed to monitor. The shared table designed (description plus beat sentences, matched by meaning only when it outgrows the prompt; the model decides, embeddings only narrow). The diagnose skill applied: Step 1 fails, mom-test primary, one slice then silence. A six-lane Sonnet workflow (data state, history, verified prices, roadmap under diagnose, algorithm-to-product map, cadence loop) produced the streamlined slice one, the cut list, the traps and the contradictions, all folded in. Costs measured from PostHog (a hundredth of a cent to judge an item) and prices verified (X $0.005 per delivered post, DM $0.015, Qwen and Grok token prices): X delivery is the bill, model calls are noise, feeds are free; cadence does not change the X bill; alerts are bounded by a worthiness judgment, not the clock; items are judged one call each; feeds are unlimited with a daily item budget. The pricing arithmetic written as a hypothesis. The owner then proposed the positioning of section 0: drop X accounts from monitoring, read X only to understand the person and to deliver.

Corrections the owner made to the assistant along the way, kept as rules: explain in chat, not by pointing at documents; do not invent ports, pages, matchers or caps; do not sequence ads after the build; the bot is not a sign-up; skills are found before they are installed; no em dashes; plain terms.

## 17. Not in the plan

Posting to X, voice drafting, multi-desk, teams, media understanding in onboarding, enterprise social monitoring, users' own ChatGPT or Claude subscriptions, further discovery experiments, the experiment scripts and lab pages once the onboarding slice is planned.
