# Where things stand

Read this first in any new session, before the roadmap. Updated September 24, 2026. This is the handoff: where things are, what is open, and how to explain things to the owner. Every decision is one line in [decisions.md](decisions.md); every account and key is in [setup.md](../setup.md); history is in git.

## How the owner wants to be answered

Plain product terms, a reason with every recommendation, no em dashes, nothing invented and presented as his decision, whole-picture answers rather than a literal answer to one sentence, and no new documents for him to read (files are for the agents; he reads chat).

## Where things are

- **Foundation on `beta`, and live.** #148 cleared the legacy drafting product from the code and the database. `main` equals `beta`, and `https://oparax.ai` serves the placeholder homepage, `/privacy` and `/terms` (text in `lib/legal/content.ts`).
- **Every account and key is set up** (Vercel, Supabase with email, Google and X login, Google branding verified, the X app and the `@oparax_ai` bot, GitHub, Product Hunt, Stripe sandbox, PostHog, AI Gateway). Nothing is waiting on setup; see setup.md.
- **Design system** rebuilt on Mira (DESIGN.md is the contract); Claude Design synced to match on September 24; a hook keeps it in step from now on.
- **The flow** is frozen until issue 1 ships (the owner has named his own habit of over-building meta tooling).

## Open

1. **Contact delivery.** The public Contact dialog sends nothing, yet the privacy policy tells people to request account deletion through Contact. Wiring it to deliver messages is the first thing to build before real users.
2. **The owner reviews the two explainer pages** (the onboarding algorithm and the downstream lab, in the git-ignored `.lab/explainers`, served on localhost:4400 when started) and discusses them in chat.
3. **Then `/feature 143`** (issue 1, onboarding) in a fresh chat.
4. **Not blocking:** his yes on tests and alerts as one loop (decisions.md), the PostHog Slack alert, source-map upload (setup.md), and the principles wording in AGENTS.md (the "about 400 lines" limit is the assistant's number).

## Rulings still needed, by issue

- **Issue 2:** the article fit line (keep 0.75 on and 0.35 off, lower it, or count the unsure band as on; the lab put 8 of Nihan's 25 items in that band, several plainly relevant); what Jev is told about the person (beat only, plus Grok's paragraph, plus the person's posts at about 25 cents a person a month); which writer (Qwen 3.7 Flash copies quotes most cleanly, Ling produced more cards at no cost); what a new monitor shows on day zero; where polling runs and how often (a Vercel Pro cron every minute is the assistant's recommendation).
- **Issue 5:** how watched X accounts arrive (polling looks best; none of the three assistant options is decided); the price (not decided).
- **Later:** email and Slack as alert channels (the owner's lean: after the slices); per-service budgets (after real usage).

## How to explain what he has said he does not hold

- **The whole project:** in his own five issues (onboarding, the feed page with its algorithm, the landing page and the whole flow, sign-up, after sign-up), never nine slices. Keep the shape: product, money, accounts, onboarding, downstream, agent or pipeline, X delivery, Stripe, what was invented, path.
- **The onboarding algorithm:** four steps with what goes in and what comes out, never as prompts; the explainer page and issue 1's building page show each step live.
- **The downstream algorithm:** one step at a time in chat before issue 2; each ruling goes into downstream-algorithm.md with his name and date. Every R-numbered rule there is the assistant's proposal until it carries his date.
- **Agent or pipeline:** onboarding step 3 is a real tool-loop agent (Grok, six-step cap, two tools); the downstream is a fixed pipeline, and should be. In this repo "agent" means one monitor.
