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

**Where it stands.** Slice 6. Decided by you on September 14: Continue with X, Google or email. The tool was assumed to be Supabase; you asked whether Clerk is better.

**What was verified.** Both join two sign-in methods only on a matching confirmed email, and both would have refused the August case for the same reason: your X account carries farzanmrz@gmail.com, which already belonged to your email account, and the system refused to hand one person's identity to another. That was correct behaviour; the fix was to sign in with X as yourself. Both cost $0 at 5, 100 and 1,000 people (each includes 50,000). Clerk needs the same "create an X app, paste its secret" work in production; its shared credentials are for development only. This codebase already runs on Supabase Auth in 22 files, eleven migrations and four foreign keys; switching to Clerk is roughly a full slice of rewriting for no saving. Google brand verification is your job either way (domain proof, privacy policy, homepage; minutes automated, two to three business days if reviewed).

**What only you can do.** In the X app: turn on "request email", paste Supabase's callback; paste the X client id and secret into Supabase; create the Google OAuth client and consent screen; submit brand verification.

**Recommendation.** Stay on Supabase Auth; enable X and Google; turn on manual linking so a person can attach a second method from settings; an X account that returns no email becomes an X-only account.

**Your ruling.** Supabase Auth or Clerk. This can wait for slice 6, but ruling it now ends the nag.

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

**Where it stands.** Railway was deleted on September 12 and has no role today. The intended stack is six services: Vercel (app, scheduled polling, webhooks), Supabase (data, sign-in, the cost ledger), the AI Gateway (every model), the X API, Stripe, PostHog. The one open question belongs to slice 5: how watched X posts arrive.

**What was verified.** The only job that wants an always-on process is X's filtered stream (one connection, held open all day). Vercel cannot hold it (functions stop at 800 seconds). Options: (a) Railway again at $5 a month flat, a second platform to run; (b) X's Activity API on Vercel, no worker, but replies and reposts are billed: about $6.15 a month more for one argue-in-replies founder account, about $0.15 more for a transfer journalist, once per account however many people watch it. Costs per person live in the code's own ledger; PostHog can show that ledger beside behaviour by syncing it.

Note: on September 21 the assistant recommended the filtered stream to avoid the reply bill; today's note recommends the Activity API to avoid the worker. Both are assistant positions; the numbers above are what decides, and they depend on which accounts people actually watch.

**Recommendation.** Start on Vercel with the Activity API (it is needed for the bot's incoming DMs anyway); bring Railway back only when reply-heavy accounts cost more than $5 a month between them.

**Your ruling.** In slice 5. Nothing now.

## 8. Pricing and Stripe

**Where it stands.** Slice 7. Decided: pay at day seven; only watched X posts are metered, as a monthly pool; the bot alerts once a day. Open: the price, the tiers, the pool sizes (roadmap section 9 has the logic for finding the number; the experiment tests it).

**What was verified.** The Vercel marketplace Stripe integration provisions a sandbox and two keys and nothing else; the webhook, its signing secret, the checkout, the portal and the paid-through logic are ours (the roadmap's "three keys" was wrong; corrected). No Stripe skill is installed; Stripe's official plugin exists and adds guidance, not code. The pool is best modelled as an allowance inside a flat monthly price counted by our ledger, not Stripe's metered billing (Stripe now steers that to a separate platform and its portal cannot change it). Fees: 2.9% plus 30 cents per charge, plus 0.7% for subscriptions, about $1.38 on a $30 charge; cogs.md updated. Keep our seven-day clock over Stripe's trial.

**What only you can do.** Create and activate the Stripe account (legal entity, bank, tax), install the marketplace integration, register the webhook and paste its secret into Vercel, configure the portal, decide the price.

**Your ruling.** None now; the price is the experiment's question.

## 9. Notifications: X DM, email, Slack

**Where it stands.** Decided by your own promise (September 16 and 17): "give you that info on X". The bot is slice 4.

**What was verified.** With a handle-only onboarding, X DM is the only route that can reach a person: their first message to the bot is the address we collect. Email needs an address onboarding promised not to ask for; Resend is free for 5 people, $20 a month at 100 or 1,000. Slack cannot reach a stranger at any price: an app can only message people in a workspace where it was installed. X DM costs $2.25 a month for 5 people, $45 for 100, $450 for 1,000, and at 1,000 a second daily message no longer fits X's per-app cap.

**Recommendation.** X DM first, prove one real send. Email later as an opt-in on the page, never an onboarding field. No Slack.

**Your ruling.** None now.

## 10. Which skills belong where

**Where it stands.** Open, small. Codex has finished its changes to the feature flow, so the skill files can be edited again.

**What was verified.** The feature flow loads skills in fixed bundles; `typesafe-ai` sits in none, so it only enters by name. Per slice: the AI bundle plus `typesafe-ai` for slices 1, 2 and 9; `vercel-functions` for cron and raw-body webhooks in slices 3, 4 and 7; `vercel:marketplace` for payment; the full UI bundle and `vercel-firewall` for the public door; Supabase Auth, not `vercel:auth`, for sign-up. Do not fit: `ai-elements` (chat interfaces), `vercel:chat-sdk` and the Slack bundle (X is not a supported platform), `build-agents` and `eve` (agent frameworks; Oparax is a fixed pipeline), `use-railway` unless slice 5 revives the worker. Gaps: no Stripe skill before slice 7; X platform knowledge lives only in the `x-docs` agent. The lab pattern (a runner plus a local results page, built from scratch twice) would pay for a small project skill holding the viewer shell and the spend file, run only at your word.

**Recommendation.** Put `typesafe-ai` in the AI bundle; drop `ai-elements` and the Slack bundle; install Stripe's plugin before slice 7; make the lab skill.

**Your ruling.** Bundle changes yes or no; lab skill yes or no.

## Also recorded

- Codex's changes (AGENTS.md as the native instruction file, the global `/critique` skill, shared review profiles) are committed and pushed on `beta`.
- Two Jev questions from track 1 await your ruling: whether "about the person" (onboarding's paragraph) goes into Jev's input for every article; whether the person's posts go in as evidence too (about 25 cents a person a month at list price). The lab can compare both on the same 47 articles for cents, but their posts would have to be read again (about 10 cents each; the August copies are gone).
