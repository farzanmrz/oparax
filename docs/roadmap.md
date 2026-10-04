# Oparax roadmap

The short product summary. The work in flight is GitHub issue #151 and its amendments; the onboarding specification is the code in `lib/onboarding/` (owner, September 27: "the code is the spec"); what the owner rejected or reversed is [references/decisions.md](references/decisions.md); every cost is in [references/cogs.md](references/cogs.md). Earlier versions of this file, with the history of how the product got here, are in git.

Naming (owner, September 16): the thing a person gets is a **monitor**; "agent" and "desk" name the same thing.

## The product

In the owner's words (September 16 and 17): "You already live on X, you already see X. What about the wide internet that you don't see on X? Oparax brings it to you." and "I'll monitor the internet, GitHub and Product Hunt for you outside of X and give you that info on X."

A person signs up first (owner, October 2: "Sign-up first wins"), with X, Google or email and password, then gives the X handle whose posts show their interests and one sentence about what they cover. Oparax reads their recent X activity once, recommends at most ten websites and feeds, and builds their page at oparax.ai/<handle>. From then on it watches those sources, judges every new item against their beat, groups reports of one story into one English card, and alerts them in their X DMs through the bot `@oparax_ai`.

X is used for learning what the person cares about, reaching them, and watching the X accounts they choose within a monthly pool of posts. Drafting, voice guides and posting are gone (owner, August 26 and September 14).

Who it is for: people who follow a beat and publish about it. AI content creators first (owner, August 27); reporters second; Reshad, the football reporter, is the test on a different beat (owner, September 10: "Reshad gets 95 percent of his news from articles, not X posts").

## The feed

Settled September 28 (owner's one yes on the reconciliation): day zero is each source's 10 newest items from the last 2 days; the fit line is 0.5, with the unsure band counted off; the writer is Qwen 3.7 Flash with Jev doing the checks ("Jev can be a pretty good check"); grouping is in this build ("that stays. Obviously, that's a part of this"), articles first, with the assistant's 72-hour story window and 0.75 join and adds lines recorded as defaults. The full article is fetched and never cut, and nothing is translated before Jev.

The card (owner, August 28): a synthesized headline, one to five fact lines each with its source, the contributing publishers, one compact relative time, an image only when a source had one.

GitHub and Product Hunt (owner, October 2): "on GitHub and Product Hunt, they are sources like any other." Today's code still has the separate digest (issue 136).

## Keeping it moving

Ruled September 28 (owner's yes to the assistant's recommendation): watched X accounts are polled from a Vercel cron, every minute for Wire and every five minutes for the other tiers, with replies and reposts excluded so they are never billed; the Activity API serves only the bot's incoming DMs. Sites and feeds are polled often with conditional requests (owner, September 16: "cant we poll my sites and RSS literally every minute?"), each source once for everyone who watches it, and every fetch presents itself as a normal browser (owner, September 19).

## Alerts

Ruled September 28 (owner): one DM per story, ever, carrying the link to that story on the person's page; later reports improve the card and never DM again ("If all other places bring that news in, it gets clustered into one story, but it's not alerting the user again on the bot DM"). Hobby and Creator get one alert a day; Wire gets "every 15 minutes giving a sort of mini digest, or nothing if there's no news." No instant alerts. The bot carries news only. Alerts start when the person sends "Start alerts" from the page's own X account (owner accepted, September 28); STOP, PAUSE and RESUME keep working.

## Plans and payment

Ruled September 28 (owner): three tiers. Hobby $5 a month (100 watched X posts a month, a daily alert); Creator $30 (3,000 posts, a daily alert); Wire $99 (4,000 posts, the 15-minute mini digest). Sites and feeds are unlimited on every tier. The $5 and $30 are his ("I want to price my startup tier at $5. The creator tier can be at $30"); the $99 and the pools are the assistant's recommendation he accepted. The monthly pool is the only allowance number; at zero the person's watched accounts pause until the month resets while sites continue.

The seven-day free week starts when preparation succeeds (owner, September 28), carries 300 watched posts and asks for no card. At its end updates and alerts stop, stories stay readable and the owner of the page sees the plans. Stripe checkout is paid by the signed-in owner for their own monitor; X credit auto top-up stays off (owner, September 28).

## Measurement

PostHog project 563049 is the one dashboard (owner). Each change adds one named past-tense event per intent, recorded on the server where the action happens off the web.

## Not in the plan

Posting to X, drafting, voice guides, more than one monitor per account, teams, enterprise social monitoring, users' own model subscriptions, crawling or indexing the web, news APIs and any further discovery experiment. Star-threshold alerts ("if the repo goes to 3k stars then bring it upto me", owner, September 16) were parked by the assistant, not by him.
