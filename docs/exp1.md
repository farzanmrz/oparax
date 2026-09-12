# Experiment 1: Personalized news delivery

Oparax monitors the world for each person. This experiment tests one offer: relevant news gathered across X and the web, selected for the individual, consolidated into a feed and optionally delivered by the Oparax bot.

## 1. Learn

### Leap of faith and hypotheses

**Leap of faith:** personalized news delivery can improve how AI content creators keep informed enough to earn repeated use and payment.

**Hypotheses:**

1. Creators use the service repeatedly and identify useful coverage or reduced discovery effort relative to their existing routine.
2. Creators pay the disclosed price to continue, with provision costs compatible with that price.

More sources and successful automation alone do not establish value. Personalization, coverage and delivery are mechanisms we evaluate underneath these hypotheses.

### People

The primary group is creators who regularly publish AI developments, tools or practical AI content on X. Liam and Nihan are starting cases, not validated customers. Recruit through warm outreach and X ads; founder-prepared desks are allowed. Existing discovery shows interest but no creator activation, so we test actual use and payment rather than collecting more endorsements.

Farzan and Kush test personal/founder consumption; Reshad tests football catch-up at the offered cadence. Report them separately. Enterprise discovery can continue separately but does not add enterprise features to this experiment. Evidence remains in `findings.md` and `reshad.md`.

## 2. Measure

### Window and decision

Measure from the first live offer through **September 30, 2026, 23:59 Los Angeles time**. Each participant receives seven days from signup, then 48 hours to observe payment. Signup by September 21 gives a complete observation window. Later entrants remain visible as incomplete. This deadline bounds the readout, not the product we can build.

**Proposed pilot decision rules:** seek at least ten eligible creators offered the same priced service and at least five signups with complete observation windows. Continue testing this offer if at least three demonstrate repeated benefit and at least two of those pay. These are practical small-sample thresholds, not established benchmarks or proof of product-market fit. Recruitment can exceed ten. Founder-prepared desks can satisfy the value test; their results do not validate automatic setup, and their preparation cost remains visible.

Count repeated benefit as meaningful use on at least three trial days, including one of the final two, plus either:

- **Coverage:** two distinct examples where a development or context informed their research/content work and their normal routine had not surfaced it at that point.
- **Effort:** two comparable discovery sessions with at least 25% less search/assessment time and no reduction in usable information.

Choose the benefit route from the creator's existing routine before observation, and report the routes separately. A short onboarding question can establish the desired improvement; an interview is not a condition of signup. Use the effort route only with two comparable baseline sessions recorded before testing Oparax. Missing baseline data means effort is unmeasured, not disproved. No switching to whichever result looks better afterward. These are pilot rules, not universal definitions of activation.

Adequate participation with little repeated benefit or payment counts against this offer. Too few entrants is a recruitment result, not proof nobody wants the product. Broken delivery remains a product failure and is recorded separately from disinterest. Positive creator results support further iteration; they do not establish durable income, renewal or scalable acquisition by September.

### Evidence and PostHog

Use existing discovery notes or one short baseline conversation: how did they find material for their last post, what was difficult, and what did they do about it? During follow-up ask for specific stories and actions, not whether they like the idea. A complaint without a workaround weakens evidence but does not automatically disprove demand.

**PostHog records behavior:**

- Entry: `preview_requested`, `preview_ready`, `signup_completed`.
- Use: `story_interacted` with action and channel, `story_feedback`, `monitoring_preferences_changed`.
- Delivery: `bot_subscription_changed`, `notification_attempted`, `notification_result`, `notification_interacted`.
- Payment: `paywall_shown`, `checkout_started`, `payment_succeeded`, `payment_refunded`, `subscription_cancelled`.
- Reliability/cost: `monitoring_run_completed` or `monitoring_run_failed`, model `$ai_generation` events and reconciled usage costs.

Carry participant group, acquisition source, setup method, trial start and offer version. Add story/source, notification, campaign and payment identifiers where relevant. Identify the real signed-in user; typing someone else's handle does not establish identity. Founder preparation and reminders are recorded separately from user actions. Test accounts are excluded.

**A meaningful-use day** contains a deliberate story/source open, story-specific feedback, a substantive story reply, or concrete evidence that the person read a delivered story. Count at most one day regardless of event volume. For DM-only reading, a follow-up can establish which story was read and when; record the consumption date separately from the interview date, linked to participant/story IDs. Preference edits, bot activation, sent notifications, idle pages and automated refreshes do not qualify by themselves.

Use does not prove benefit. Record concrete benefit examples separately in discovery notes, including how the information was used and whether their existing routine had already surfaced it. Missing DM click telemetry is unknown, not automatic non-use. Product notifications count as part of the offer; personal chasing is assistance.

PostHog views: entry-to-signup-to-first-interaction funnel; return activity during the trial; trial-expiry-to-payment funnel; costs and delivery failures. Bot enablement is an optional branch. Include people who never start or benefit in denominators; payment conversion uses only completed trial/payment windows, with incomplete ones shown separately. Billing webhooks establish payments, not checkout clicks. Preserve anonymous-to-signup attribution where possible, and distinguish payment errors, refunds and refusals.

Keep X ad spend/impressions/clicks from X reports, tagged campaign traffic in PostHog, and founder setup/support time in a small operating log. Report signup, repeated benefit and payments by acquisition route and setup method. Do not describe observational differences as proof the bot or ads caused retention.

### Price and spending

**Proposed launch plan: $29/month, one personalized desk, hourly feed updates, optional hourly/4-hourly/daily bot delivery, and up to ten explicitly pinned sources.** Automatic source discovery is included and is not a promise of exhaustive coverage. No annual plan, source bundles or latency tiers in this experiment. These are operating proposals for this draft, not authorization to spend or launch ads.

Show the price before signup. The trial requires no card; at seven days, stop new personalized processing and DMs until payment. Keep previous results readable. Implement one monthly subscription with confirmed payment, cancellation and entitlement checks. A discount or changed offer gets a new version and separate results.

**Proposed experiment ceiling: $500**, comprising $200 ads, $250 product operation and $50 reserve through the readout. Count new provider commitments and allocated infrastructure/analytics charges, not only token costs; also report existing fixed bills separately. Reserve enough budget for outstanding trials before accepting more. Paid subscriptions require a funded full service month even when it extends past September. Alert at 80%; stop new ads/admissions before commitments exceed the ceiling. If delivery must stop, make the interruption visible and refund undelivered paid service. Never hide reduced coverage to make the economics look better.

Track setup/free-preview costs, recurring retrieval/model/DM costs, shared infrastructure, payment fees and acquisition separately. Allocate shared retrieval once across served users and show the allocation. Record unknown costs as unknown. Target recurring provision below $10 per user/month at the tested workload; a price above actual provision cost is the minimum economic bar. One-time setup and acquisition must also be recovered before claiming a sustainable business.

For scale: at the published standard X rate, 24 DM sends daily cost $10.80 per 30 days before retrieval or models; 100 new paid post reads daily cost $15. Hourly is an allowed delivery interval, not an instruction to send empty messages. These examples are not a forecast or the unverified project-chatbot tariff. Report provision cost by delivery cadence as well as overall; hourly users may miss the $10 target even when the $29 price covers provision. Price viability must be checked with measured traces at the actual cadence before taking payment.

## 3. Build

### The user experience

1. **Preview:** enter what to follow and optionally an X handle. Generate a bounded sample feed plus a plain description of inferred interests and suggested sources. Start with at most 20 recent public posts, a $0.25 per-preview budget and a $5 global daily preview cap within the operation budget. Reserve estimated spend before calls, cache public evidence and rate-limit requests. When the global cap is reached, pause fresh generation and offer a cached sample or retry state. An anonymous preview does not start persistent monitoring.
2. **Signup:** start the seven-day trial. Allow X connection, preference corrections and source edits. Founder-prepared desks are claimed by the real user, with no invented signup or usage events.
3. **Personalization:** show topics/entities to include and exclude, what makes a story useful, suggested sources and the evidence behind suggestions. Explicit wishes override inferred interests. Sparse accounts fall back to the stated beat and a short clarification. Do not invent beliefs from absence of data or treat following an account as wanting every subject it discusses.
4. **Delivery:** offer a source-linked feed and optional bot subscription. Feed refresh is hourly. The bot defaults to daily, with hourly and four-hourly options, timezone and quiet hours. Each delivery is one compact brief of new or materially changed stories; no empty messages or repeated unchanged stories. Reading should not require visiting the site.
5. **Control:** users can change preferences, exclude a topic/entity, block or prioritize a source, give story feedback, pause DMs and pay/cancel. Topic exclusion changes the monitoring brief; source exclusion changes source selection. Negative feedback does not silently rewrite unrelated preferences.

The feed shows short summaries, source links, publication/discovery times, why a story matches, and whether it is reporting, a release or opinion. Rank by explicit topic/source rules, individual relevance, material novelty and recency; activity is supporting context, never proof of truth. Group repeated reporting; distinguish additional context, corrections and conflicting claims. Keep numeric relevance/popularity scores out until there is a measured reason to expose them. Provide a simple feed search and an inspectable filtered-out view so relevance failures can be diagnosed.

### Personalization and retrieval

**Onboarding after signup:** use the stated beat plus a bounded, recent sample of accessible X posts, replies/reposts, linked URLs and followed accounts. Use authorized user-only data only when the relevant scopes and endpoints permit it. Start with at most 50 posts and 100 followed accounts, labeling partial evidence rather than implying a complete account read. Bookmarks, home timeline, lists, communities and Spaces are optional later inputs, not required access for this trial.

**Grok proposes a monitoring brief:** include/exclude topics, entities, story-selection preferences, source candidates and discovery queries, each with evidence and confidence. It resolves linked websites and repositories, finds supported feeds and proposes additional sources. Persist user corrections and version the brief. Run discovery on onboarding and material preference changes, with a shared daily discovery refresh for each beat rather than a fresh open-ended agent search per user every hour.

**Sources:**

- **X:** use bounded account/topic queries and direct timeline reads as needed. Prefer one shared retrieval for overlapping desks. Start with scheduled retrieval for the hourly offer; streaming/webhooks are an adapter option when they improve coverage or efficiency, not a condition of the first release.
- **Web/RSS:** discover RSS/Atom first, otherwise use the site's sitemap/listing and fetch articles. Conditional requests and canonical URLs avoid unnecessary fetching. Bright Data is a metered fallback for failed direct retrieval, not the default path.
- **GitHub:** monitor selected repositories' releases/tags through the API or feeds. Discover candidates from X links, tracked organizations and scheduled search. Poll selected repositories hourly, honoring endpoint headers and rate limits. GitHub has no universal one-hour minimum. Do not substitute its delayed Events feed for reliable release tracking or label a custom popularity ranking as official Trending.
- **Product Hunt feed:** include its official Atom feed in the shared hourly poller, then filter entries for each creator. A September 11 retrieval returned 50 entries with IDs, titles, publication/update timestamps, links, content and author fields. It is a discovery input, not evidence of exhaustive launch coverage or a source of structured vote counts. Preserve links and first-seen times, and resolve the underlying product website when useful. The guessed AI-topic feed URL returned 404, so do not fabricate topic feeds.
- **Product Hunt API:** build the richer adapter for topic/date-filtered, paginated launch discovery, with `NEWEST`, `RANKING` or `VOTES` ordering. It can return descriptions, maker/product links, votes, comments and daily/weekly/monthly ranks. Fetch minimal fields once for shared use; the documented GraphQL quota is 6,250 complexity points per 15 minutes, not a fixed hourly polling requirement. A server-side client token supports public discovery without making customers connect Product Hunt. User-specific votes and followed collections need the appropriate authorized context. Its API docs explicitly require contacting Product Hunt for commercial use; a developer token does not remove that condition.
- **Other Product Hunt routes:** its linked integration directory includes Zapier's current New Product trigger and historical Algolia/Pusher options. Zapier is an alternative delivery adapter, with its own task cost and coverage; old wiki links do not establish that a service is still supported. Start with the verified feed and add approved API enrichment for documented gaps. Feed/API/partner coverage and costs are recorded separately.

Fetch once, normalize and store provenance, then deduplicate URLs/native IDs. Candidate clusters use entities, event and time; Qwen decides whether an item is the same development, additional context, a correction or a separate story. Preserve conflicting claims and attribution rather than merging them into a false consensus. Apply each desk's brief to the shared stories, retaining its own relevance and delivery state. Sources are interchangeable when they preserve needed information, timing and attribution. Initially measure their unique useful contribution; optimize expensive redundant retrieval after evidence supports it. YouTube, Reddit and Threads adapters are outside the first offer unless missed useful stories demonstrate the need.

### Models, delivery and infrastructure

- **Payments:** proposed provider is Stripe Checkout plus its customer portal, subject to merchant account availability. Keep the no-card trial in Oparax; checkout starts the paid monthly subscription. Verify and deduplicate webhooks: `invoice.paid` with an active subscription grants the paid period; `invoice.payment_failed` records failure without extending access; `customer.subscription.updated` and `.deleted` reconcile cancellation and expiry; `charge.refunded` reconciles refunds. Cancellation at period end preserves already-paid access. Refunds do not automatically cancel a subscription, so explicitly end service when refunding its undelivered remainder. Reconcile current provider state when events arrive out of order. See [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks).
- **Models:** the owner's starting choice is Grok 4.6 through Vercel AI Gateway, with X API evidence supplied to it. Verify the exact available Gateway identifier before implementation; do not silently substitute another model. Qwen remains a downstream candidate once the first algorithm's outputs and needs are established. Keep deterministic deduplication ahead of model work.
- **Search access:** start with the X API. Native Grok search and off-X retrieval are later inputs to evaluate, not prerequisites for the first algorithm iteration. If native search is introduced, verify support and billing on the actual Gateway route; model token pricing does not establish search cost. A direct xAI route requires an explicit decision.
- **Runtime:** retain Next.js/Vercel and Supabase authentication. The old Railway project is deleted. Plan retrieval, processing and notification scheduling from the required cadence, persisted cursors, retries and job claims. First assess what Vercel and Supabase can carry; add a worker only for a demonstrated runtime requirement. The UI reads persisted results. The replacement schema and scheduling choice are part of the fresh feature, not inherited infrastructure.
- **Bot:** the project bot @oparax_bot has been created; its current setup is recorded in [setup-x.md](setup-x.md), including successful encrypted-chat key registration. Implement its client in the fresh feature and verify an authorized send/reply, opt-in, unsubscribe, payload limits and billing. Reuse the registered chat identity; verify its unlock and message protocol rather than registering replacement keys. If the project-bot transport cannot support the offer, use a dedicated Oparax X account through the documented DM API, subject to recipient permissions and account/app limits. Record transport and failures. Do not substitute another channel and claim the X DM test passed.
- **Bot subscription:** connect a verified X recipient to the signed-in user with a single-use subscription link or code. Receive replies/opt-outs through the supported event subscription/webhook route, with bounded polling only if necessary. Verify incoming events, deduplicate provider message IDs and stop sends immediately after opt-out or trial expiry. Use the same story and user IDs for the feed, bot interactions and PostHog. Record attempted, provider-accepted, failed and user-interacted states separately; provider acceptance is not a read receipt.
- **Reliability:** unique source-item and delivery identifiers prevent duplicate work/messages; retries do not double charge payments or repeat notifications. Record first seen, source publication, processing and send times separately. A feed refresh may complete without new news. Show stale/failed monitoring visibly.

### The new data and what goes

Keep authentication and account ownership. Rebuild the application data around: each user's monitoring brief and corrections; shared sources and retrieval cursors; raw items and provenance; story clusters; each user's story relevance/feedback; delivery preferences and history; trial/subscription entitlement; and usage/cost records. These are responsibilities, not a requirement for one table per noun. Source credentials stay server-only; each user can access only their own preferences, feed and billing information.

Start a fresh feature from `beta`; issue #131 and its implementation branch have been retired at the owner's instruction. Retire the previous voice-guide, drafting and posting flows, obsolete tables/RPCs and workers that serve only those flows. Keep existing website discovery, safe fetching, auth and telemetry only where they serve this experiment. Ground the new design in the actual checkout and live schema, without carrying forward #131's decisions or assuming its onboarding, clustering or bot code exists. Verify model aliases and implement the chosen brief cadence.

The reset is a sequenced migration: preserve authentication and needed billing/consent records, capture a recovery copy, stop obsolete writers, replace their consumers, then remove obsolete data. No live deletion occurs as part of writing this document.

### First executable slice

First develop the personalization algorithm step by step on Liam, Nihan, Farzan, Kush and Reshad, using Grok 4.6 through Gateway and bounded X API evidence. Inspect what each person said they want, what their account supports, what remains uncertain, and which monitoring topics and sources follow from that evidence. Compare the outputs with known examples and correct the logic before expanding acquisition. Then connect the source recommendations to RSS, websites and the broader retrieval/feed pipeline where justified. Reserve fresh examples for judgment so evaluation is not merely reproducing examples supplied to the model. Founder-prepared profiles are labeled assisted and cannot prove automatic personalization works. This is an engineering check, not customer validation.

Then deliver the complete priced trial to creators, including signup, feed, optional DM, payment and instrumentation. Begin warm outreach and the bounded X campaign when that journey works. Use official X Ads MCP for campaign work and PostHog MCP for results; campaign tags work immediately, while importing ad spend and sending conversions back to X require separate integrations. Keep shared campaign IDs and use X reports until those links are verified.

Launch requires the promised retrieval coverage, working feed, optional DM transport, signup/trial/payment gates and trustworthy measurement. Richer source enrichment, automated ad-spend imports and conversion return are follow-on improvements, not prerequisites when the same learning is supported by working retrieval and tagged campaign reports. A feed-only offer would be a separately labeled experiment version, not a silent substitute for this one.

### X Ads and PostHog setup

1. **Connect the assistants:** the official `https://ads-api.x.com/mcp` entry is now registered as `x-ads` in both Codex and Claude Code. The developer console now has an `Oparax Ads` project on Ads Starter with zero connected apps. Create separate Native/public apps for each assistant and attach them to that project; X documents one live OAuth grant per app/user, so sharing one app can revoke the other assistant's login. Keep these separate from Oparax's customer-login app.
2. **Authenticate:** Claude Code needs its app's OAuth Client ID and registered `http://localhost:8080/callback`, then `/mcp` sign-in. Use `ads.read`, `ads.write` and `offline.access` for full operation. Codex's attempted OAuth login currently fails on X's issuer/authorization-origin metadata mismatch. Resolve through supported provider/client compatibility or its documented bearer-token configuration with proper refresh; do not disable verification. Both server entries are installed, neither account connection is verified. Start verification by listing ad accounts and reading campaigns.
3. **Run one offer:** use one creator-focused campaign and a small set of creatives making the same promise, with at most $20/day and $200 total under the proposed budget. Tag links with `utm_source=x`, `utm_medium=paid_social`, a stable campaign identifier and creative identifier. Preserve those through signup and billing; classify whether the entrant is an AI creator without blocking access for comparison cases. Exclude founder-created activity from ad conversions. Campaign creation starts paused; launch after the priced journey and tracking work.
4. **Join spend to outcomes:** retrieve campaign/date/currency/spend/click/impression records through Ads MCP analytics or portal exports; the current Ads Starter project is MCP-only, so do not assume direct Ads REST access. Import daily records into a PostHog-supported custom marketing source, keyed to the same campaign identifiers. Use supported object storage with mapped JSON fields if automating the import; revise prior dates without double counting. X is not a native PostHog spend connector. MCP access itself is not a continuous sync. Report cost per qualified signup, repeated-benefit user and payer after observation windows mature.
5. **Return conversions to X:** use the supported X conversion route for signup and confirmed payment events, directly from the backend or through a PostHog webhook to a backend adapter. Preserve the X click identifier where available, implement required matching fields and stable deduplication IDs, and avoid double counting browser/server copies. PostHog attribution and X-reported attribution may differ; retain both rather than forcing agreement. Prefer actual outcomes over clicks when enough conversion volume exists.

Before launch, walk the real sequence once: anonymous preview, signup, correction, scheduled feed update, bot opt-in and delivery, opt-out, trial expiry, payment and cancellation. Confirm corresponding events and billed costs. This document sets the experiment; it does not authorize database deletion, advertisements or customer messages during planning.

## Technical references

- [X API pricing](https://docs.x.com/x-api/getting-started/pricing): standard post reads $0.005, user/following reads $0.010 and ordinary DM sends $0.015. An unbilled outbound webhook notification does not make the originating send free. Developer-owned discounts do not apply to every connected customer.
- [xAI tool pricing](https://docs.x.ai/developers/pricing): X Search changes September 21 at noon PT from $5/1,000 calls to $5/1,000 posts and $10/1,000 profiles. Apply the actual effective rate in cost records. Gateway billing must be verified separately.
- [Gateway model catalog](https://ai-gateway.vercel.sh/v1/models): checked September 11; Grok 4.3 base input/output rates are $1.25/$2.50 per million tokens, Qwen 3.7 Flash starts at $0.03/$0.13 with higher context tiers. These exclude acquisition, delivery and infrastructure.
- [GitHub polling guidance](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).
- Product Hunt: [official feed](https://help.producthunt.com/en/articles/484970-does-product-hunt-have-an-rss-feed), [API access and commercial terms](https://www.producthunt.com/v2/docs), [post queries](https://api-v2-docs.producthunt.com/query/posts/), [post fields](https://api-v2-docs.producthunt.com/object/post/), [rate limits](https://www.producthunt.com/v2/docs/rate_limits/headers), [linked alternative integrations](https://github.com/producthunt/producthunt-api/wiki/Product-Hunt-APIs), [Zapier triggers](https://zapier.com/apps/product-hunt/integrations).
- [PostHog retention](https://posthog.com/docs/product-analytics/retention), [AI cost capture](https://posthog.com/docs/ai-observability/installation/manual-capture), [marketing sources](https://posthog.com/docs/web-analytics/marketing-analytics), [official X Ads MCP](https://docs.x.com/x-ads-api/mcp). X is not currently listed as a native PostHog advertising-spend source.
