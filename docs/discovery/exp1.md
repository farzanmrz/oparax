# Experiment 1: Oparax monitors the internet for you and tells you on X

Rewritten September 19, 2026 to match the product as defined that day. The plan is [roadmap.md](roadmap.md); the onboarding specification is [onboarding-algorithm.md](onboarding-algorithm.md). This file says what the experiment is trying to learn, how it is measured, and what has to exist before it can run. Every line is marked by where it came from: the owner's decision, still open, or an assistant proposal the owner has not approved. The earlier version (September 11) tested a different offer, a personalized news feed gathered across X and the web; what carried over from it is the measurement rules, the event names and the ads setup. It has not yet been attacked through the lean-startup and mom-test lenses; that happens before slice 1 is planned.

## 1. Learn

### The offer being tested

Owner's words (September 16 and 17): "You already live on X, you already see X. What about the wide internet that you don't see on X? Oparax brings it to you." and "I'll monitor the internet, GitHub and Product Hunt for you outside of X and give you that info on X."

What a person gets: they type their X handle and one sentence about what they cover. Oparax reads their recent X activity once, recommends at most ten sites and feeds and at least five X accounts, and builds a page at oparax.ai/<handle>. It watches those sources, judges every new item against their beat, folds items about one story into one card in English, and the Oparax bot tells them on X. GitHub and Product Hunt digests are a later addition a person adds by hand; they are not part of what is tested first (owner, September 19).

### Leap of faith and hypotheses

**Leap of faith:** a person who publishes about a beat on X will keep using, and pay for, something that watches the internet outside X for them and brings it to them on X.

1. People use it repeatedly and can point to coverage they would not otherwise have had, or to less time spent finding material.
2. People pay the disclosed price to continue, and what it costs to serve them is compatible with that price.

More sources and working automation do not establish value on their own. Nobody has reacted to monitoring output yet and nobody has paid (the founder-diagnostic verdict of September 16, which still governs pace).

### People

The first cohort is five people the owner knows: Farzan, Kush, Liam, Nihan and Reshad. The owner builds their monitors himself and sends each a link (owner, September 16). AI content creators are the primary group (owner, August 27), and among them the creator still building an audience is the bet behind the GitHub and Product Hunt digest (owner, September 19). Liam and Nihan are starting cases, not validated customers. Farzan and Kush test founder and personal use; Reshad tests whether it holds for someone whose news breaks on X first. Report the groups separately. Monitors the founder prepared can show value; they cannot show that automatic setup works, and the preparation cost stays visible. Evidence stays in `findings.md`, `reshad.md` and `people.tsv`.

After the five: strangers through X ads, only once a stranger can complete the whole walk (roadmap section 10). Open: whether Farzan and Kush count as paying seats or test seats.

## 2. Measure

### Window and decision

Each person gets seven days from the start of their clock (bot activation or sign-up, whichever comes first), then 48 hours in which payment is observed. The experiment window opens when the slices it needs have shipped (section 3). Open: the calendar dates. The September 30 readout in the earlier version is dead because the build has not started.

Assistant proposal from September 11, never approved by the owner: seek at least ten eligible creators offered the same priced service and at least five complete observation windows; keep testing this offer if at least three show repeated benefit and at least two of those pay. These are small-sample working thresholds, not benchmarks and not proof of fit.

Repeated benefit means meaningful use on at least three trial days, including one of the last two, plus either:

- **Coverage:** two separate examples where something Oparax surfaced informed their research or a post, and their normal routine had not surfaced it by then.
- **Effort:** two comparable discovery sessions with at least 25% less time spent searching and no loss of usable material. This route only counts with two baseline sessions recorded before they used Oparax. No baseline means effort is unmeasured, not disproved.

Choose the route from the person's existing routine before observing, report the routes separately, and never switch afterwards to whichever looks better. For the tool-focused creator there is one more concrete test (owner's bet, September 19): did anything they posted come from the digest.

Adequate participation with little repeated benefit or payment counts against the offer. Too few entrants is a recruitment result, not proof nobody wants it. Broken delivery is a product failure recorded separately from disinterest.

### Evidence and PostHog

Use existing discovery notes or one short baseline conversation: how did they find material for their last post, what was hard, and what did they do about it. In follow-ups ask for specific stories and actions, never whether they like the idea. A complaint with no workaround behind it is weak evidence.

PostHog project 563049 is the one dashboard (owner). Event names carried from the earlier version; each slice adds the ones it owns, recorded on the server where the action happens off the web:

- Entry: `preview_requested` and `preview_ready` (now the monitor build starting and finishing), `signup_completed`.
- Use: `story_interacted` with action and channel, `story_feedback`, `monitoring_preferences_changed`.
- Delivery: `bot_subscription_changed`, `notification_attempted`, `notification_result`, `notification_interacted`.
- Payment: `paywall_shown`, `checkout_started`, `payment_succeeded`, `payment_refunded`, `subscription_cancelled`.
- Reliability and cost: `monitoring_run_completed` or `monitoring_run_failed`, model `$ai_generation` events and reconciled usage costs.

Carry the participant group, acquisition source, setup method (founder-prepared or self-serve), trial start and offer version. Typing someone else's handle does not establish identity. Founder preparation and reminders are recorded apart from the person's own actions. Test accounts are excluded.

**A meaningful-use day** contains a deliberate story or source open, feedback on a specific story, a substantive reply about a story, or concrete evidence the person read a delivered story. One day counts once however many events it holds. For someone who only reads the DMs, a follow-up can establish which story was read and when. Editing preferences, activating the bot, sent notifications and idle pages do not count by themselves. Use does not prove benefit; benefit examples are recorded separately with how the information was used. Missing DM click data is unknown, not non-use.

The funnel: arrived, built a monitor, activated the bot, signed up, used it, paid. People who never start or never benefit stay in the denominators. Payment conversion uses only completed windows, with incomplete ones shown apart. Stripe's webhooks establish payments, not checkout clicks. X ad spend and clicks come from X's reports, tagged traffic from PostHog, founder setup and support time from a small operating log.

### Price and spending

**The price is open.** What is decided (owner, September 19): the only metered thing is watched X posts, as a monthly pool rather than a daily cap, because X bills half a cent for every post a watched account makes. Websites, feeds, GitHub and Product Hunt are not metered: their feeds and APIs cost nothing and each source is fetched once for everyone. For now the bot alerts once a day, 45 cents a person a month. Every cost and its arithmetic is in [references/cogs.md](references/cogs.md).

The owner's working pitch, not a decided price: about 3,000 watched posts a month (100 a day) with everything else unlimited for about $30, and lower tiers below it. What that plan costs at full use: about $15 for X, $1 to $2 for judging and writing, 45 cents for the daily alert, plus payment fees. Measured September 19: a company or lab account posts about once a day; a founder who argues in replies posts 49 times a day of which 8 are his own posts; a transfer journalist 34; one sports outlet 117, more than the whole pool on its own, and its feed carries the same stories for nothing.

How the number gets found (assistant's account, not approved): cost only sets the floor. The price comes from what the person already pays for tools that do a neighbouring job and from what the job earns them. A creator who sells sponsored posts is buying material for posts that earn money, and tools in that position sit between roughly $20 and $100 a month (the assistant's recollection of that market, not checked); a reader who just wants to keep up is a different customer (Reshad said $4). So open at the high end of believable for creators and come down: the first people are recruited by hand, a price can be lowered for one person and never quietly raised, and the objection heard at a high price is the most useful thing the experiment collects. Record objections word for word.

Show the price before the trial ends. The trial needs no card. At day seven without payment the feed freezes and the bot goes quiet; the page stays readable (owner, September 16). A discount or a changed offer is a new offer version with its own results.

Spending: every model call, X read and DM is one row in the cost ledger under the person it served, confirmed and estimated amounts kept apart, unknown costs recorded as unknown. A price above what it costs to serve the person is the minimum bar; setup and acquisition have to be recovered before anyone claims a business. Open: the experiment's total spend ceiling and the daily ceiling on free builds. Assistant proposals never approved: $500 in total ($200 ads, $250 operation, $50 reserve) and $25 a day on builds.

## 3. Build

What has to exist, in order, each an issue whose body is the brief its `/feature` session starts from (roadmap section 13):

| Slice | Issue | The five can be tested | Strangers can be tested |
| --- | --- | --- | --- |
| 1 | [#133](https://github.com/farzanmrz/oparax/issues/133) Build a monitor and show its page | needed | needed |
| 2 | [#134](https://github.com/farzanmrz/oparax/issues/134) The feed: judging, grouping and story cards | needed | needed |
| 3 | [#135](https://github.com/farzanmrz/oparax/issues/135) Scheduled polling and the day-three pause | needed | needed |
| 4 | [#137](https://github.com/farzanmrz/oparax/issues/137) The bot: alerts in X DMs | needed | needed |
| 5 | [#141](https://github.com/farzanmrz/oparax/issues/141) Watching X accounts within a monthly post allowance | needed for hypothesis 2 at the pitched price | needed |
| 6 | [#138](https://github.com/farzanmrz/oparax/issues/138) Sign-up in place, and editing a monitor | needed | needed |
| 7 | [#139](https://github.com/farzanmrz/oparax/issues/139) Payment at day seven | needed for hypothesis 2 | needed |
| 8 | [#140](https://github.com/farzanmrz/oparax/issues/140) The public door | no | needed |
| 9 | [#136](https://github.com/farzanmrz/oparax/issues/136) GitHub and Product Hunt digests | no | no |

Hypothesis 1 can start being observed with the five as soon as slices 1 to 4 work, because the owner builds their monitors and sends the link. Hypothesis 2 needs slice 7. The diagnostic verdict applies: the first slice goes to the five and the rest follows what they do.

Before anyone outside the five is invited, walk the real sequence once: build, page, bot activation and a delivered message, STOP, day three, sign-up, day seven, payment, cancellation. Confirm the events and the billed costs for each step. This file sets the experiment; it authorizes no spending, no ads and no messages to customers.

### X Ads and PostHog setup

1. **Connect the assistants:** the official `https://ads-api.x.com/mcp` entry is registered as `x-ads` in both Codex and Claude Code. The developer console has an `Oparax Ads` project on Ads Starter. Use a separate app per assistant, because X allows one live grant per app and user, and keep them apart from the customer-login app.
2. **Run one offer:** one campaign and a small set of creatives making the same promise, each link tagged with `utm_source=x`, `utm_medium=paid_social`, a stable campaign identifier and a creative identifier that persist through sign-up and billing. Campaigns are created paused; the owner launches and budgets them. On record from the owner: an appetite of $300 for 500 sign-ups, a number to reset.
3. **Join spend to outcomes:** spend, clicks and impressions come from the Ads connector or portal exports, keyed to the same campaign identifiers in PostHog. X is not a native PostHog spend source. Report cost per sign-up, per repeated-benefit user and per payer once windows mature.
4. **Return conversions to X:** sign-up and confirmed payment, from the backend, with stable deduplication identifiers. PostHog's attribution and X's may differ; keep both.

## References

- Verified prices and platform facts: roadmap section 12 and onboarding-algorithm.md section 11.
- [X API pricing](https://docs.x.com/x-api/getting-started/pricing): a post read or delivered is $0.005, a user lookup $0.010, a DM send $0.015, a received DM event $0.010, a counts request $0.005.
- [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks).
- Product Hunt's [API terms](https://www.producthunt.com/v2/docs) require contacting them before commercial use; this matters only when slice 9 reaches paying users.
- [PostHog retention](https://posthog.com/docs/product-analytics/retention), [marketing sources](https://posthog.com/docs/web-analytics/marketing-analytics), [official X Ads MCP](https://docs.x.com/x-ads-api/mcp).
