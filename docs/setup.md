# Setup

Every external account and key this project uses, what state it is in, and when each section was last checked. No secret values are written here, only names and where they live.

## Vercel

Verified September 11, 2026. Plan: Pro. The `oparax` project deploys to production from the `main` branch only; every other branch, including `beta`, only ever produces a preview. Production has been paused since September 11, so `oparax.ai` currently shows Vercel's paused page. Verified again September 24: exactly these nine environment variables are installed across Production, Preview and Development (no drift), and a copy sits in the local `.env.local` file:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `X_BEARER_TOKEN`
- `AI_GATEWAY_API_KEY`
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST`

No spend limit or budget alert has been set up on the Vercel account yet. September 24: no marketplace integrations are installed; production is still paused; fourteen domains are attached to the project (oparax.ai plus oparax.com, .net, .xyz, .info, .store, their www variants and two vercel.app aliases), which the owner is reviewing. The Vercel CLI is a global install (under the nvm Node 24) and was upgraded to the current release on September 24.

Keys the owner is adding on September 24 (names only; each goes into Vercel as a Sensitive variable in all three environments, then `vercel env pull` refreshes `.env.local`): `X_BOT_BEARER_TOKEN` (moves out of `.env.bot.local`), `PRODUCT_HUNT_TOKEN`, `GITHUB_TOKEN` (fine-grained, public repositories read-only, note the expiry), `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` (test mode), optionally `POSTHOG_PERSONAL_API_KEY` for source-map upload.

## Supabase

Verified September 11, 2026. One shared project, ref `pcgvpypzfwuchyfwdlwe`, on a direct Supabase account (not connected through the Vercel marketplace) on the free plan. Its keys were generated in the Supabase dashboard and pasted by hand into Vercel, not linked through an integration. The database currently holds no product data (September 24: twenty tables in `public`, every one empty). It still carries two unused columns, `agents.stripe_customer_id` and `agents.stripe_subscription_id`, and five whole tables (`x_webhook_events`, `dm_connections`, `alerts`, `dm_send_ledger`, `onboard_attempts`, plus the `publisher_claim_kind` enum), all left over from the retired issue #131 branch and applied live before it was retired. The owner ruled on September 24 that the legacy schema is wiped with the legacy code (the clear-the-ground pass), so none of this survives. Login providers for issue 4 (owner, September 24): email, Google and X through Supabase Auth; the dashboard steps are in the September 24 click list the owner holds.

## Vercel AI Gateway

Verified September 11 to 21, 2026. The Gateway key is named `oparax-experiment-1`. Every model call the product makes, including the Jev ranking model (`typesafe-ai/jev`) and Grok (`spacexai/grok-4.7`), goes through this one Gateway key instead of a separate key per model provider. Two other keys sit unused in the local `.env.local` file: `TYPESAFE_KEY` and `BRIGHTDATA_API_KEY`.

## X developer app

Verified September 11, 2026. App **Oparax**, running under the account's default Pay Per Use project. Three separate credentials exist for three separate jobs: `X_BEARER_TOKEN` for app-level reads of public X data, `X_CLIENT_ID` and `X_CLIENT_SECRET` for when a person connects their own X account, and a separate bot bearer token for the project bot. The project bot exists with the capabilities to read tweets, read users, and read and send direct messages; its encrypted chat keys are registered. Its handle is **@oparax_ai** (verified September 24 by asking the API who the bot token belongs to; the earlier note saying `@oparax_bot` was stale). `@oparax` is taken (the owner saw it in the sign-up form on September 24) and `oparaxai` is free (one user lookup, September 24); the bot-management endpoint answered 404 to both the app token and the bot token, so a rename to `oparaxai` is done in the developer console (Projects, the project, Bots) if the owner wants it.

September 24 (owner): the plain account under `farzan@oparax.ai` is not created; `@oparax` is taken and moving the developer app to an Oparax login buys nothing. The project bot is the bot; a brand account can be created any later day if ever wanted.

Still unproven for direct messages: an actual owner-authorized send or reply has never been tested, and opt-in, opt-out, retry and incoming delivery are not built.

## X Ads

Verified September 22, 2026. A separate X Ads project. Its connector is connected in Claude Code and Codex. No ad campaign exists. Only the owner may create, change or launch a campaign.

## PostHog

Verified September 11 to 22, 2026. Project id `563049`. Its project token is installed in Vercel. A Slack channel has been connected to PostHog since August 18 with zero alerts configured so far.

## Email

Verified September 11, 2026. Supabase's authentication email (signup confirmation, password reset) sends through Google Workspace SMTP as **Oparax <no-reply@oparax.ai>**. A test password-reset email was proven to arrive on September 11. Resend, the alternative email service considered for future alerts, is not installed.

## Railway

Out of the stack (owner, September 24). The project and its two worker services were deleted on September 12; the CLI is still logged in and lists no project; whether the account subscription was also cancelled is unconfirmed (the owner checks the billing page). On September 24 the Railway plugin was uninstalled, the global `use-railway` skill deleted, and the `workers` bundle row removed from the feature skill. Website polling runs on a Vercel cron and X delivery arrives by webhook, so nothing needs a worker.

## Bright Data

A Bright Data API key is on file, but its zones are not configured, and it is not used in the first build of the product; most seed sources (66 of 76) can be read directly without it.

## Stripe

Nothing is set up. One attempt exists in the project's history: on August 28, installing Stripe through the Vercel marketplace stalled at a browser terms-acceptance step and was abandoned.

## GitHub and Product Hunt

The owner is creating both tokens on September 24 (a fine-grained GitHub token scoped to public repositories, a Product Hunt developer token that does not expire), stored in Vercel as `GITHUB_TOKEN` and `PRODUCT_HUNT_TOKEN`; the digest feature (#136) uses them when it is planned. Until the product has its first paying user, the owner uses Product Hunt's API in his personal capacity; once someone pays, he emails Product Hunt directly.

## Local env files

`.env.local` is a local copy of the variables installed in Vercel, refreshed with `vercel env pull`; nothing is hand-edited locally (owner, September 24: Vercel is the only place keys are typed). `.env.bot.local` holds only the X bot token and is deleted as soon as that token is in Vercel. The two local-only names `TYPESAFE_KEY` and `BRIGHTDATA_API_KEY` are dead (TypeSafe and xAI are registered on the Gateway as bring-your-own-key providers) and disappear at the next pull. The `poller` and `ingest` worker folders each keep an `.env.example` file that lists variable names only, no values.

## Claude Design

Synced September 24: the design-system project **Oparax** (id `14526a56-d87c-4973-b4fc-123c0a668ec6`) holds the `design-system/` bundle (tokens, seven preview cards, README). The repo stays the source of truth; re-run the sync after any change to DESIGN.md.

## Retired

- Railway: project and both worker services deleted, September 12; plugin and skill removed September 24.
- Sentry: organization not recreated; PostHog's error tracking replaced it.
- The Vercel to Slack integration: removed.
- The old X filtered-stream rule and its Railway stream consumer: deleted.
- The original Supabase and Gateway keys, from before the September 11 rotation: deleted or disabled.
