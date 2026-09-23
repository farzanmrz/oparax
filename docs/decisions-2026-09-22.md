# Decisions, September 22, 2026

The owner's eight open question areas from September 22, each set against what this project already decided, rejected or deferred, so nothing is reopened by accident. Eight background research notes (in the git-ignored lab folder) were checked against current documentation; this file is the assistant's compilation of them against the history in the roadmap. Nothing here is a decision until the "Your ruling" line is filled in by the owner and copied into the roadmap with his name and date.

How to read each topic: **Where it stands** (decided, rejected, later slice, or open now), **What was verified** (with the source the note cites), **What only you can do**, **Recommendation** (assistant's), **Your ruling**.

## The shape of the work

Two tracks, two chats. Track 1 is the downstream algorithm, one step at a time, each ruling written into [downstream-algorithm.md](downstream-algorithm.md) with your name and date; it must finish before slice 2. Track 2 is development: `/feature 133` can start today, because slice 1 (build a monitor and show its page) needs no sign-in, no payment, no bot and none of the topics below. The fuzzy items you listed (what we ask the person, the flow of models, how it is stored, the look of the page) are what that planning session settles with you, line by line.

Rulings that matter now: topics 4, 5 and 6 below, and the two Jev questions from track 1. Everything else is recorded here and comes back when its slice is planned.

## 1. Onboarding flow, page design, storage

**Where it stands.** Slice 1, `/feature 133`. The onboarding algorithm is settled (September 19). The look stays on the current design tokens and the page is designed in the flow's design step (owner, September 17). What we ask the person is decided: an X handle and one sentence. How it is stored is the planning session's job.

**What was verified.** The live database no longer matches the description in AGENTS.md: the voice tables are gone, five tables from the retired August branch are present (`x_webhook_events`, `dm_connections`, `alerts`, `dm_send_ledger`, `onboard_attempts`), and every table is empty. So the schema question is a clean-slate question, not a migration question.

**Your ruling.** None needed here; start `/feature 133`.

## 2. GitHub

**Where it stands.** Slice 9, last, added by hand to a running monitor (owner, September 19). Not blocking.

**What was verified.** No token needed for 60 calls an hour; a token gives 5,000. A fine-grained personal token with "Public repositories" and zero permissions reads everything the digest needs (Settings, Developer settings, Personal access tokens, Fine-grained). Nothing is billed. GitHub's API terms have no commercial licence to sign; the only commerce clause concerns high-throughput or resale, which a digest of public repos is not. Search is 30 a minute; "not modified" replies are free. The star-history endpoint of September 4, 2026 exists.

**What only you can do.** When slice 9 comes: create a free Oparax GitHub account, make the token there, hand it over as an environment variable, diary its expiry.

**Recommendation.** Exactly that; no GitHub App.

**Your ruling.** None now.

## 3. Product Hunt

**Where it stands.** Slice 9. Earlier notes said an email to Product Hunt was owed before use; you asked why it was ever rejected. Correction: it was never rejected, and the email is owed before commercial use, not before any use.

**What was verified.** A developer token is self-serve, read-only, does not expire, no approval step. 6,250 points per 15 minutes, one daily pull fits. The docs say, word for word, that the API "must not be used for commercial purposes" and to contact hello@producthunt.com for business use; "commercial" is undefined, so free use during the five-person experiment is tolerated in practice, not a clear yes. The wiki's other APIs are a 2014 list: one dead, one an automation tool without topic filters, the rest scrapers in a worse legal position. The public feed carries name, tagline and link but no votes or topics.

**What only you can do.** Create the app and token when slice 9 comes. Send the email early; late permission blocks a launch.

**Recommendation.** Official API with attribution on every card, feed as fallback, never scrape; email before the first paying user sees the digest.

**Your ruling.** When to send the email: now, or when slice 9 is planned.

## 4. Sign-in: Supabase Auth or Clerk

**Where it stands.** Slice 6. Decided by you on September 14: Continue with X, Google or email. Open: which tool. Your points: Supabase is already set up; Clerk looks more native to Vercel and has its own skill.

**What "native to Vercel" actually buys with Clerk.** Clerk is installed from Vercel's marketplace: its keys are written into the Vercel project for you, its bill lands on the Vercel invoice, and the `vercel:auth` skill guides the setup. It also ships ready-made sign-in and account screens (buttons, forms, an account page where a person links a second method), and it handles bot protection on sign-up. Supabase has its own skill too (`supabase`, plus the Supabase connection this session already uses), and it is connected to our Vercel project by hand-pasted keys, not through the marketplace. So both have a skill; Clerk's advantage is the ready-made screens and the one-click install.

**What it costs.** The real difference is where "who is this person" lives. With Supabase Auth, the signed-in person is the database's own user, so the database's access rules ("only the owner of this monitor can see it") read that user directly. With Clerk, identity lives at Clerk, and Supabase is told to trust Clerk's token: every access rule reads Clerk's id instead, and deleting an account means deleting it in two places. Both cost $0 at 5, 100 and 1,000 people. Both need the same "create an X app, paste its secret" work in production (Clerk's shared keys are for development only).

**A correction to the research note.** It said switching would cost roughly a whole slice because 22 files and eleven migrations use Supabase Auth. That overstates it: the database is empty and a clean slate, and most of those files are the old drafting product, which the new product replaces anyway. What would genuinely be thrown away is the working email sign-up, confirm and reset-password flow, and the session refresh on every page. So the choice is closer than the note said.

**The August collision** would have happened with either tool. Both join two sign-in methods into one account only when they share a confirmed email, and both refuse to attach an identity whose email already belongs to a different account. Your X account carries farzanmrz@gmail.com, which was already a separate account. That refusal is a security rule, not a bug.

**Recommendation (a lean, not a strong one).** Supabase Auth: one system holds both the people and their data, and the email flows already work; we add two buttons. Choose Clerk if the ready-made sign-in and account screens matter more to you than keeping one system.

**What only you can do, either way.** Create the X app settings (callback, "request email"), create the Google OAuth client and submit Google's brand verification (domain proof, privacy policy, homepage; minutes automated, two to three business days if reviewed).

**Your ruling.** Supabase Auth or Clerk, by slice 6.

## 5. Vercel: the pipeline and what tells you something broke

**Where it stands.** Open now; ten minutes of your clicks.

**What was verified.** Only `main` builds and serves at oparax.ai; pushes to `beta` and feature branches build nothing (that rule is deliberate and keeps preview bills away); production is paused, so oparax.ai shows a "paused" page until you press Resume. Already on for free: deployment-failure emails, one day of runtime logs, anomaly alerts (which will not fire at five-user traffic), the observability dashboard. Not on: a budget on the Gateway key, Spend Management, cron jobs, any Slack.

**What only you can do.** Set a monthly budget with alerts on the Gateway key `oparax-experiment-1`; turn on Spend Management with "pause production"; confirm the notification emails reach you. These are the two ways this project has actually been hurt (a $69 silent loop in August, a paused site nobody re-checked).

**Recommendation.** Do those three this week; leave paid observability, log drains and Vercel's Slack app off.

**Your ruling.** Do the three clicks, yes or no.

## 6. PostHog as the one place for alerts

**Where it stands.** Decided by you: PostHog is the one dashboard. What was missing is any alert at all.

**What was verified.** The browser already sends pageviews, replay and errors; the server already sends every failure as an error-tracking issue (about 30 places) and every model call as an AI event (3,749 in 30 days); the daily spend watchdog already writes an issue. The Oparax Slack workspace has been connected to PostHog since August 18 with zero alerts configured, so nothing reaches you today. Sign-up failures only log to the console. One error-tracking alert to a Slack channel ("issue created or reopened") covers sign-up failures, site errors, runaway spend and later failed bot sends. A dead scheduler is the one thing PostHog cannot see; a heartbeat event plus a "fewer than one a day" alert, built inside slice 3, covers it (the note's Railway webhook does not apply: Railway is gone and polling runs on Vercel). Free tier is nowhere near exceeded; the first limit to break is AI events at about 43 live monitors, at which point send only writes and failures.

**What only you can do.** Create the Slack channel and invite the PostHog app; approve the alert when it is offered.

**Recommendation.** One alert now; the sign-up hook in slice 6; the heartbeat in slice 3; a daily AI-cost alert once real volume exists. Nothing else.

**Your ruling.** Create the channel and approve the one alert, yes or no.

## 7. Railway, and how the stack connects

**Where it stands.** Nothing runs on Railway today: the project was deleted on September 12 and nothing is billed. The worker code is still in the repo. Railway may come back in slice 5, for one job only.

**Why a worker might be needed at all.** Everything else runs when something happens (a page is opened, a scheduled tick fires, a webhook arrives), which Vercel handles. The exception is X's filtered stream, which delivers watched accounts' posts over a connection that stays open all day, like a phone line left off the hook. Vercel functions hang up after at most 800 seconds and cannot hold that line, so something that runs continuously must; that is what Railway did.

**The two options for watched X accounts, with numbers.** (a) The filtered stream on a small Railway service, about $5 a month flat; its rules can leave out replies and reposts before X bills them. (b) X's Activity API, which pushes each post to a Vercel address with no worker, but delivers and bills replies and reposts too: about $6.15 a month extra for one founder who argues in replies (49 posts a day raw against 8), about $0.15 for a transfer journalist (34 against 33), billed once per account however many people watch it. The bot's incoming DMs arrive through the Activity API anyway, so that address is built regardless.

**Recommendation.** Start with (b) and bring Railway back when the reply-heavy accounts people actually watch cost more than about $5 a month between them. On September 21 the assistant leaned the other way, towards the stream, to avoid the reply bill; both are assistant positions and the numbers above decide.

**Your ruling.** In slice 5.

## 8. Pricing and Stripe

**Where it stands.** Slice 7. Decided: pay at day seven; only watched X posts are metered, as a monthly pool; the bot alerts once a day. Open: the price, the tiers, the pool sizes (roadmap section 9 has the logic for finding the number; the experiment tests it).

**What was verified.** The Vercel marketplace Stripe integration provisions a sandbox and two keys and nothing else; the webhook, its signing secret, the checkout, the portal and the paid-through logic are ours (the roadmap's "three keys" was wrong; corrected). No Stripe skill is installed; Stripe's official plugin, `stripe@claude-plugins-official`, exists: ten skills plus a live-account connection; it adds guidance, not code (topic 10). The pool is best modelled as an allowance inside a flat monthly price counted by our ledger, not Stripe's metered billing (Stripe now steers that to a separate platform and its portal cannot change it). Fees: 2.9% plus 30 cents per charge, plus 0.7% for subscriptions, about $1.38 on a $30 charge; cogs.md updated. Keep our seven-day clock over Stripe's trial.

**What only you can do.** Create and activate the Stripe account (legal entity, bank, tax), install the marketplace integration, register the webhook and paste its secret into Vercel, configure the portal, decide the price.

**Your ruling.** None now; the price is the experiment's question.

## 9. Notifications: X DM, email, Slack

**Where it stands.** Your promise (September 16 and 17): "give you that info on X". The bot is slice 4. Your question: Slack is free and Resend is cheap; should they be routes too?

**What each route needs from the person, and costs.**
- **X DM:** the person messages the bot once (a button on their page), and that message is how we can reach them. $0.015 a send: once a day is $2.25 a month for 5 people, $45 for 100, $450 for 1,000. X allows 1,440 sends per app per day, so at about 1,000 people a second daily message no longer fits.
- **Email through Resend:** your figures are right (free: 3,000 a month, 100 a day; Pro: $20 for 50,000, no daily cap). It needs the person's email address and a sending domain set up on oparax.ai. Anyone who signs up with Google or email (slice 6) has already given us an address, so for them email needs no extra ask.
- **Slack:** a correction to what I wrote. A stranger can use it: they click "Add to Slack" on their page, approve our app into a workspace they belong to, and the bot can then message them there. Free for us. It needs a workspace where they are allowed to install apps (a free workspace allows up to ten), and an extra step after the handle. The `vercel:chat-sdk` skill covers exactly this kind of Slack bot, so it would fit if Slack is added.

**The trade.** X DM is the only route that works with nothing but a handle, and it is the promise. It is also the most expensive per message by far: at 100 people X DM costs $45 a month where email or Slack cost $0 to $20. So offering email and Slack as cheaper choices on the page is a sound cost idea, not a distraction. The cost is building and maintaining three delivery routes instead of one before anyone has reacted to the first.

**Recommendation.** Build X DM first and prove one real send. Then add email as a choice for people who signed up (they already gave an address), and Slack as a choice for people who want it; both are a page setting, never an onboarding field.

**Your ruling.** Whether to add email and Slack as choices, and when: with the bot (slice 4), or after the five react.

## 10. Which skills belong where

**Where it stands.** Open, small. Codex has finished its changes to the feature flow, so the skill files can be edited again.

**How skills get loaded.** The feature flow picks skills in fixed bundles (web, UI, data, AI, Slack, workers) plus named extras. `typesafe-ai`, the Jev skill, is in no bundle, so it is only loaded if someone names it; that is why it should join the AI bundle.

**The ones you asked about, with reasons.**
- **`vercel:build-agents` and `vercel:eve`:** these are for agents, meaning programs where the model decides what to do next, calls tools, and may run for minutes or days with saved progress. Most of Oparax is fixed steps where code decides the order (fetch, Jev scores, writer writes), which needs the plain AI SDK, not an agent framework. But onboarding's third step is a small agent: Grok runs up to six steps with a web search and a source checker, and Liam's build took four minutes, close to the time a single Vercel function is allowed. So load `build-agents` when planning slice 1, to decide whether onboarding needs a durable workflow that survives past that limit. My earlier "doesn't fit" was wrong for onboarding.
- **`vercel:ai-sdk` and `vercel:ai-gateway`:** every model call goes through them; they belong in slices 1, 2 and 9.
- **`vercel:chat-sdk`:** it builds bots for Slack, Teams, Discord and similar, not for X. It fits only if Slack alerts are added (topic 9).
- **`ai-elements`:** ready-made chat screens (message bubbles, a prompt box). No page in the plan is a chat, so it has nothing to do; the onboarding "building" screen is a list of steps.
- **`vercel:vercel-connect`:** it gets tokens on behalf of each user (for example, a person connecting their own GitHub). The digest uses one server token of ours, so it does not apply.
- **Stripe:** no Stripe skill is installed, and the fix is the one you meant: Stripe's official plugin, `stripe@claude-plugins-official`, which brings ten skills (subscriptions, Checkout, webhooks, the customer portal, usage billing) plus a connection to the live Stripe account. Install it before slice 7. It gives guidance and account access; our day-seven freeze logic is still ours to write.
- **PostHog:** only the four `posthog:instrument-*` skills belong in building slices; the rest of the plugin is for running the product once it is live.
- **The lab:** twice now a test runner plus a local results page was built from scratch. A small project skill holding the page shell and the spend tracking would make the next one faster and comparable, run only at your word.

**Your ruling.** Bundle changes (Jev skill into the AI bundle; `build-agents` into slice 1's planning), yes or no; install the Stripe plugin now or at slice 7; lab skill, yes or no.

## Also recorded

- Codex's changes (AGENTS.md as the native instruction file, the global `/critique` skill, shared review profiles) are committed and pushed on `beta`.
- Two Jev questions from track 1 await your ruling: whether "about the person" (onboarding's paragraph) goes into Jev's input for every article; whether the person's posts go in as evidence too (about 25 cents a person a month at list price). The lab can compare both on the same 47 articles for cents, but their posts would have to be read again (about 10 cents each; the August copies are gone).
