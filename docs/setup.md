# Setup

Every external account and key this project uses, what state it is in, and when each section was last checked. No secret values are written here, only names and where they live.

## Vercel

Verified September 11, 2026. Plan: Pro. The `oparax` project deploys to production from the `main` branch only; every other branch, including `beta`, only ever produces a preview. Production has been paused since September 11, so `oparax.ai` currently shows Vercel's paused page. Nine environment variables are installed across Production, Preview and Development, and a copy sits in the local `.env.local` file:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `X_BEARER_TOKEN`
- `AI_GATEWAY_API_KEY`
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST`

No spend limit or budget alert has been set up on the Vercel account yet.

## Supabase

Verified September 11, 2026. One shared project, ref `pcgvpypzfwuchyfwdlwe`, on a direct Supabase account (not connected through the Vercel marketplace) on the free plan. Its keys were generated in the Supabase dashboard and pasted by hand into Vercel, not linked through an integration. The database currently holds no product data. It still carries two unused columns, `agents.stripe_customer_id` and `agents.stripe_subscription_id`, left over from the retired issue #131 branch.

## Vercel AI Gateway

Verified September 11 to 21, 2026. The Gateway key is named `oparax-experiment-1`. Every model call the product makes, including the Jev ranking model (`typesafe-ai/jev`) and Grok (`spacexai/grok-4.7`), goes through this one Gateway key instead of a separate key per model provider. Two other keys sit unused in the local `.env.local` file: `TYPESAFE_KEY` and `BRIGHTDATA_API_KEY`.

## X developer app

Verified September 11, 2026. App **Oparax**, running under the account's default Pay Per Use project. Three separate credentials exist for three separate jobs: `X_BEARER_TOKEN` for app-level reads of public X data, `X_CLIENT_ID` and `X_CLIENT_SECRET` for when a person connects their own X account, and a separate bot bearer token for the project bot. The project bot, handle **@oparax_bot**, exists as a placeholder with the capabilities to read tweets, read users, and read and send direct messages; its encrypted chat keys are registered.

Correction, September 19: the owner never instructed that this bot must become `@oparax`. His actual plan is to first create a plain X account under `farzan@oparax.ai` and see whether the `@oparax` handle can be set up there; what that account or handle would be used for is still undecided.

Still unproven for direct messages: an actual owner-authorized send or reply has never been tested, and opt-in, opt-out, retry and incoming delivery are not built.

## X Ads

Verified September 22, 2026. A separate X Ads project. Its connector is connected in Claude Code and Codex. No ad campaign exists. Only the owner may create, change or launch a campaign.

## PostHog

Verified September 11 to 22, 2026. Project id `563049`. Its project token is installed in Vercel. A Slack channel has been connected to PostHog since August 18 with zero alerts configured so far.

## Email

Verified September 11, 2026. Supabase's authentication email (signup confirmation, password reset) sends through Google Workspace SMTP as **Oparax <no-reply@oparax.ai>**. A test password-reset email was proven to arrive on September 11. Resend, the alternative email service considered for future alerts, is not installed.

## Railway

The project and its two worker services were deleted on September 12. Whether the underlying Railway account subscription was also cancelled is unconfirmed.

## Bright Data

A Bright Data API key is on file, but its zones are not configured, and it is not used in the first build of the product; most seed sources (66 of 76) can be read directly without it.

## Stripe

Nothing is set up. One attempt exists in the project's history: on August 28, installing Stripe through the Vercel marketplace stalled at a browser terms-acceptance step and was abandoned.

## GitHub and Product Hunt

Nothing is set up yet. Each needs its own API token, which the owner will create when the GitHub and Product Hunt digest feature (slice 9) is planned. Until the product has its first paying user, the owner uses Product Hunt's API in his personal capacity; once someone pays, he emails Product Hunt directly.

## Local env files

`.env.local` is a local copy of the variables installed in Vercel. `.env.bot.local` holds only the X bot token and is deleted once slice 4 (the bot) is built. The `poller` and `ingest` worker folders each keep an `.env.example` file that lists variable names only, no values.

## Retired

- Railway: project and both worker services deleted, September 12.
- Sentry: organization not recreated; PostHog's error tracking replaced it.
- The Vercel to Slack integration: removed.
- The old X filtered-stream rule and its Railway stream consumer: deleted.
- The original Supabase and Gateway keys, from before the September 11 rotation: deleted or disabled.
