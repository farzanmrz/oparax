# exp1 ([Mmm DD] - [Mmm DD])

**Name:** Oparax DM alerts

Oparax reduced to its monitoring core, delivering on-beat news alerts as X direct messages to desks belonging to a handful of people already warm to us, with every pilot person also getting a public feed page at `oparax.ai/feed/<their-handle>`. Drafting is not part of this run. The experiment also has a payment leg: a person's "yes" reply starts a 7-day free trial, and after it a payment ask goes out by DM with three doors, $5, $20, or $100 a month, the same product behind each, so which door someone picks is itself a signal.

## Learn

### Leap-of-faith assumptions

1. **Monitoring alone is valuable:** aggregators of any type of news on X using public sources will use Oparax's monitoring without being prompted.
2. **Monitoring alone is a payable product:** at least 1 of them will pay to keep it after a trial.

### Hypothesis

#### Value

The warm aggregators getting alerts as X DMs will act on them on their own during their first 8 days.

**Disproved:** nobody touches an alert on their own in their first 8 days.

## Measure

- **Alert clicks:** every alert link points at our own domain (`/l/<token>` redirect), so a click is counted before the person lands on the story.
- **Feed activity:** feed page views, searches (query length only, never the text), filter presses, and authorize presses.
- **DM outcomes:** consents and stops, trial expiries, and payment-ask DMs sent.
- **Onboarding:** started, completed, failed, and rate-limited.
- **Per-person AI cost:** every AI generation is attributed to the pilot person's identity `x:<handle>` with a `pilot_handle` property, so cost per person is a direct query.
- **Session replay:** full session replay on feed pages.
- **Failure events:** webhook, reconcile, alert sending, DM intake, and onboarding each emit a failure event when they break.
- **Delivery:** analytics ride a first-party `/ingest` proxy so blockers don't erase the numbers.
- **Identity hygiene:** feed visitors are never merged into pilot identities.

## Cohort

To be filled when the section is settled.

## Build

- **Push ingest:** X posts arrive by push through X Activity API webhooks, capacity around 1,500 watched accounts at $0.005 per delivered post.
- **Story grouping:** multiple sources covering the same event are filed under one story.
- **DM alerts:** alerts go out as plain-news X DMs from the Oparax bot after a DM-worthiness judgment, with a 30-minute suppression window so duplicate echoes of the same story don't re-alert.
- **Consent by reply:** one bot DM asks; a "yes" reply starts alerts and the trial clock, a "stop" reply ends them.
- **Public feed page:** every pilot person gets a public page at `oparax.ai/feed/<their-handle>` with search, source filters, an alerts filter, day dividers, and the authorize module.
- **Onboarding agent:** an agent (Grok at high reasoning) builds a desk from a typed X handle on the landing page, capped at 10 new feeds a month and 3 attempts per address per day, and existing feeds are never rebuilt.
- **Drafting removed:** drafting and voice are deleted outright.
- **Payments:** Stripe through the Vercel marketplace integration. The Stripe provisioning required a browser terms-acceptance step at build time, so the payment pages ship in a follow-up once the owner completes it; the trial gating and the payment-ask DM are live.

## Results

Filled after the run.

## Analysis

Filled after the run.

## Verdict

Filled after the run.
