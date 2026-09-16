> **History, September 16, 2026.** Grounding as of September 14 evening. The live plan is [roadmap.md](roadmap.md); it wins where they disagree.

# State of Oparax, September 14, 2026, late evening

Grounding for the next plan. Sources: 219 Codex sessions since August 1 (digested and read), the docs folder, Basic Memory (the Oparax business note, credential index, preferences), the live X developer console, X Ads Manager, Vercel, PostHog, and git. Each fact says where it came from. "Verified" means seen live tonight; "recorded" means from a session or document.

## The intentional plan already on record (August 26 to September 14, Claude Code sessions)

This is the plan the owner built over three weeks. It was executed once as issue #131 without process, deleted September 12, and is to be replanned with process. Everything here is from the owner's own sessions; the #131 code is only a local archive tag.

**Direction (August 26):** "we are moving in the direction of stripping away everything to make Oparax a monitoring service." Drafting, voice guide, voice rules and posting go. Feed, Skipped, Sources and Settings stay. Confirmed September 14: monitoring only, posting removed.

**Customer (August 27):** AI content creators who aggregate news or a beat from public sources. Reshad is in the cohort as the negative test.

**The walk, as designed:**
1. Landing page with a handle box: type an X handle, get a feed. "Only one setup" per IP, "no more than 10 feed creations a month" (August 28); September 14 raised the appetite to "$300 for 500 signups", so the cap is a number to reset, not a principle.
2. The onboarding agent (Grok) reads the person's posts and linked sites, runs discovered sites through the existing website onboarding, searches for beat feeds, and returns a beat plus a lean source set with evidence. Rule: any source the person demonstrably quoted or linked is kept. September 14 replaced the internals with the selected algorithm and the corrected evidence rules; the shape is the same.
3. A public feed page, `oparax.ai/feed/<handle>`, no login: story cards with a synthesized headline, one to five fact lines, contributing sources, one relative time, an image only when a source had one, one combined search-and-filter, continuous scroll, no header or hero or counts.
4. **Authorize the bot.** One press does two things: the bot (`@oparax_ai`, speaking as Oparax, never "breaking on your beat") sends one message, "reply yes and I'll start sending your news", and the person is taken to X's DM composer prefilled with "yes", never auto-sent. The bot never messages anyone at feed setup, only on their own press. Owner's reason: X's spam rules want the person to speak first. Five states: idle, waiting for reply, connected, trial ended, stopped. This is how DM setup happens before any Oparax account exists, which is exactly what the owner asked for tonight.
5. Alert loop: Qwen judges DM-worthiness; a 30-minute echo check suppresses repeats; suppressed items still reach the feed page; plain text plus at most one image; X caps of 1,440 DMs per day per app and 15 per 15 minutes per person; story grouping merges many items about one story into one card.
6. Sign-up to customize: connecting the account or personalizing interests, beliefs or sources requires sign-up (owner's gate, September 10). September 14: sign-up is continue with X, continue with Google, or email.
7. Trial and paywall: seven days, then a hard paywall where the bot stops and the feed stops updating; Stripe through the Vercel marketplace; automated day-7 payment DM.
8. Ingestion: X Activity API per-handle subscriptions push new posts and incoming DM replies to one webhook route on Vercel, written to a receipt ledger before acknowledgement, with a 15-minute reconcile sweep; about half a cent per delivered post; the persistent-stream worker goes away. Named build check never run: whether a source's own replies and reposts fire the webhook. Named ops item never done: regenerate the leaked consumer secret. Tier limits (docs showed 3 subscribed accounts on one tier) were never reconciled with the 1,500-account assumption.
9. Measurement floor (PostHog): every alert link tracked; feed page views, searches, filter presses, authorize presses, alert link clicks, replay on feed pages; funnel in plain words: pressed authorize, bot message delivered or bounced, replied yes (trial starts), acted unprompted, paid. September 10 reshaped the experiment into five gates: Visited, Enable, Use, Pay, Cost.
10. Design system locked August 28: Hanken Grotesk for text, JetBrains Mono for times and numbers, never serif, never all caps, title case for interface elements, relative compact times only, one orbit mark plus a plain wordmark, no eyebrow text, no subtitles, no filler. Palette left open. Every visual board so far was rejected.

**Pricing on record:** August 28 the owner floated "a hobby plan of $5 a month, a normal plan of $20 a month, a serious plan of $100 a month... That'll depend on how the usage shakes out"; Reshad's $4 was "leaking in from somewhere I havent decided"; $29 was an assistant proposal; September 14: "What they pay is a calculation we still have to do." The inputs for that calculation exist: onboarding $0.55 to $0.70 measured; X ingestion about half a cent per delivered post; bot DM cost unverified; per-story filter and synthesis cost measurable from PostHog AI events.

**Contradictions the owner has not closed, now that the whole record is visible:**
- Trial clock: starts at the "yes" reply (August 28 build) or at sign-up (September 10 gate)? Tonight's order, feed then bot DM then sign-up to customize, suggests the "yes" reply starts a DM trial and sign-up starts customization; both can be true, but the paywall needs one clock.
- Day-7 automated payment DM (build) versus a manual ask (experiment session). Never answered.
- Free-feed caps: 10 a month (August) versus 500 sign-ups at $300 (tonight).
- Ads: "paid acquisition" sits under Rejected in the August 26 decisions file; tonight ads are in scope and the owner runs them himself.
- Public feed page with no login versus "customizing requires sign-up": compatible, but the feed page must be read-only until sign-up, and the design must say what a stranger who finds someone else's feed URL sees.
- Reshad can satisfy his own negative test by paying out of loyalty; the asymmetric clause was agreed in conversation and never written.
- Whether the prebuilt pilot desks count against the free-feed cap.

## Corrections to what was said earlier today

- **The price was never decided.** $29 a month, the $500 ceiling and $200 of ads were assistant proposals in exp1.md and setup-status.md, labelled as proposals. The only price a real person named is Reshad's "$4 USD per month" (reshad.md). Brieflet sells comparable personalization at $12 (research-monitoring.md).
- **September 21 was never the owner's date.** It is xAI's X Search repricing date plus an assistant-proposed cohort cutoff. September 30 was the owner's own contingency, set September 9: no validated customer by month end means a job search. The owner has since said to forget the clock.
- **The bot is `@oparax_ai`** (verified in the console tonight: bot user id 2098571482792112140, active, dm.write/dm.read/users.read/tweet.read, chat keys registered, created September 11, renamed September 12 evening). setup-x.md and setup-status.md still say `@oparax_bot` and are stale on this point.
- **The bot is the delivery channel, not outreach.** Recorded owner words: delivery "in their feed or via Oparax bot DM that can automatically be personalised", cadence hourly or slower.
- **The "45 profiles" do not appear anywhere.** The only lists are the five test profiles and the 199-row people ledger. Ask the owner what the 45 are.

## What the owner has actually decided, in his words (recorded)

- Product: "I want to monitor the world specifically for each person." Mechanism: social monitoring.
- Customer: "tightly scope to AI Content Creators." Reshad is "my negative test." Enterprise social monitoring is a separate discovery track.
- The gate, written by him: "Providing the handle is free. Connecting the account, or personalizing interests, beliefs, or sources, requires signup. Seven days after signup, they must pay." Trial clock starts at signup.
- Sign-up (tonight): continue with X, continue with Google, or email. Nothing else.
- Ads: he opted in ("I'm getting desperate so I'm gonna run X ads also besides warm outreach and setup of desks myself") and fenced them: "I don't want you setting up any ads. That'll be catastrophic." Ads are his to launch; the assistant plans and measures.
- PostHog: "make that a sorta 1 stop shop"; favors Experiments over AI observability for now; wants to "retroactively set it up and judge."
- Clean slate: #131 deleted, branches removed, issues closed, "we start afresh."
- Open product questions he raised and did not close: cap X monitoring per user (his suggestion: max 20 accounts, gated by price, websites and RSS free); minimum surfaced sources ("at least surface 10" each for websites and feeds).
- The algorithm for onboarding: selected September 14, see onboarding-algorithm-results.md.
- Unfinished sentence tonight: "since we're planning on detaching the post-to-X part". Needs completing; it decides what "connect X" is for.

## What exists and what state it is in

| Thing | State | How known |
| --- | --- | --- |
| Repo `beta` | docs and meta commits only since September 6; last product commit is the landing page (#132) | git, verified |
| Repo `main` | equals the September 6 landing page release; 7 docs commits behind `beta` | git, verified |
| Issue #131 build (public feeds, DM alerts, X Activity API ingest, onboarding agent, payments minus Stripe) | closed not planned September 12, branch deleted, backup trashed; the merge head survives locally and is now tagged `archive/ft-131-monitoring-pivot` (153 files, reference only) | git, verified |
| Landing page | shipped September 6: illustrated, "Dana's example desk", positioned for reporters and creators, roadmap section; owner says tonight it was "randomly made up" and does not draw him in | lib/landing/content.ts, verified; owner tonight |
| Vercel project `oparax` | production paused (`live: false`); last production deploy September 5; six oparax domains attached; nine env vars installed | Vercel API, verified |
| Supabase project pcgvpypzfwuchyfwdlwe | audited after the owner signed in: every public table has zero rows; the voice tables are gone and the #131 tables (x_webhook_events, dm_connections, alerts, dm_send_ledger, onboard_attempts) remain, so the #131 teardown migrations ran live; last migration `attach_or_create_story`; advisor reports no issues; Nano compute, hibernates when idle, so production needs it kept awake; auth user count not yet read; SMTP via Gmail as `farzan@oparax.ai`, sender `no-reply@oparax.ai`, delivery proven September 12; keys rotated September 12; `testuser@oparax.ai` was a permanent admin override in August and its user row was never confirmed deleted | supabase-runner attempt, verified blocked; setup-smtp.md, setup-status.md |
| Railway workers (poller, X ingest) | deleted September 12; feed ingestion does not exist anywhere today | recorded, Railway email |
| X developer app | rotated September 11; OAuth client for "connect X"; app bearer token; project "Default project (Pay Per Use)" | setup-x.md; console verified |
| X bot | `@oparax_ai`, active, keys registered; sending and receiving never built or tested; billing for bot DMs unverified | console verified; setup-x.md |
| X Ads | Ads Manager account exists under Farzan Mirza, opened tonight straight into the first-campaign tour: no campaign ever; an "Oparax Ads" project exists in the developer console; the X Ads MCP connection in this workspace reports unauthenticated and the owner cannot find it in his connector list, so treat it as unusable and use the browser if ads work is ever delegated | Ads Manager verified; console verified |
| PostHog project 563049 | receiving only automatic events in the last 30 days: pageview, identify, web vitals, exceptions, dead clicks, AI generation; `landing_cta_clicked` has never arrived; session replay gap from August (owner tested, nothing appeared, ad-blocker theory) never resolved; no product events, no funnel, no experiment | PostHog API, verified |
| Sentry, Slack | removed September 12 | recorded |
| People ledger | 199 rows: about 180 sports and politics reporter handles without email, about a dozen AI/tech creators with emails; funnel: reporters 178 listed, 89 reachable, 5 responses; creators 23 contacted, 11 chats, 2 demos, 0 activations | people.tsv, findings.md |
| Real users | none. Reshad (cousin) used it repeatedly in August, then lapsed 10 days with about 429 unread drafts when founder contact stopped; Liam and Nihan engaged with hand-built demos, never set up a desk, went silent when asked to self-serve | reshad.md, findings.md |
| Money | X credits drained September 13 by a $39.64 following-list fetch (estimated, not confirmed); today's discovery runs about $13.70; Premium+ $40 a month on the personal account | recorded; today's runs |

## What was built and thrown away, so it is not rebuilt blind

- August: three full UI rebuilds of the feed (#103), Slack delivery built and removed twice, clustering and multi-platform fan-out built and removed, Bright Data voice collection built and removed, jsdom incident took 19 of 20 sources offline for 50 minutes.
- August 28: #131 built almost the whole monitoring product (public per-handle feed, DM authorization, X Activity API webhooks, onboarding attempt caps, cost attribution); Stripe skipped; then closed unbuilt-for-payments and deleted September 12.
- September 12 to 14: three source-discovery experiments; the last one selected the algorithm.

Pattern the owner named himself: over-optimization, good-to-have features, constant rebuilding, cascading scope; building instead of customer contact.

## What is still unknown and who unblocks it

- Supabase contents (auth users, stale test accounts, table data): owner signs in at supabase.com in the inbuilt browser, then the audit reruns.
- The end of "detaching the post-to-X part": owner.
- What "45 profiles" means: owner.
- Price and what the free preview includes: owner, and the two data points above argue against $29.
- Whether the X Ads MCP is worth authorizing at all: owner; browser use is the fallback.
- Bot DM cost and whether the bot may open a conversation first: X Chat docs and a test send, after the owner says so.

## Dead ends checked tonight so nobody re-checks them

- Using users' ChatGPT or Claude subscriptions through Codex-style OAuth in Oparax: unsupported by OpenAI, explicitly banned by Anthropic since April 2026, and irrelevant to a product whose model calls are its own.
- Native Grok web search as the default web route: 3 to 5 times the cost of Perplexity per person for more candidates; keep as an optional second pass.
- Full X following lists as an onboarding input: $39.64 for five people, dropped.
