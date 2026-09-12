# Environment configuration

Verified September 11, 2026 (Pacific). Values are stored in Basic Memory and the platform secret settings, never in this file.

## Current app configuration

Exactly these nine names were recreated for **Production, Preview and Development** in the Vercel `oparax` project:

- `NEXT_PUBLIC_SUPABASE_URL`: shared project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: new public application key.
- `SUPABASE_SECRET_KEY`: new server-only key.
- `X_CLIENT_ID`: retained OAuth 2 application identifier.
- `X_CLIENT_SECRET`: rotated OAuth 2 secret.
- `X_BEARER_TOKEN`: rotated app-level X API token.
- `AI_GATEWAY_API_KEY`: new Vercel Gateway key, named `oparax-experiment-1`.
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`: rotated project token.
- `NEXT_PUBLIC_POSTHOG_HOST`: `https://us.i.posthog.com`.

Secret values are marked sensitive in Production and Preview. Development values remain retrievable for local work. The same Supabase project is used in all environments by the owner's decision. This is not data isolation between preview and production.

All prior project variables were removed first. No shared variables were linked. The replacement values were installed through the Vercel CLI after the browser import form failed; that unsaved form was discarded. `.env.local` was pulled from Vercel Development successfully. It also contains Vercel's generated `VERCEL_OIDC_TOKEN`; do not manually create an equivalent project variable or check it into git. Vercel supplies `VERCEL_ENV` and `NODE_ENV`.

## Removed

Old Slack, Sentry, cron, direct-xAI, Bright Data, worker-ingest and OAuth 1 app variables are absent from the web app configuration. `INGEST_SECRET` is intentionally absent because the old workers were retired. Do not treat the remaining legacy code's requests for those variables as instructions to restore retired infrastructure.

The Railway project and both workers were deleted. Their old local environment files are recovery material, not the fresh runtime configuration. The Vercel Slack integration was removed. No Sentry organization was recreated.

## Credential retirement and checks

- Supabase modern keys now use the name `oparax_experiment_1`. Deleted old secret keys `default`, `service`, `service_dev` and old publishable key `default`.
- Disabled legacy `anon` and `service_role` keys for use in the `apikey` header. The console explicitly says they remain valid JWTs; this operation did not rotate the project's JWT signing secret or prove every old JWT revoked.
- Created the new Gateway key and removed old `main` and `BYOK Test Key (farzanmrz)` keys.
- Rotated the X app bearer token, X OAuth 2 client secret and PostHog project token.
- Bounded checks returned HTTP 200 for Supabase public auth settings, Supabase admin access, Vercel Gateway credits and an X public user lookup. No paid model generation or full application journey was exercised by those checks.

## Additional secrets only when consumed

The separate bot token and chat PIN are documented in [setup-x.md](setup-x.md) and saved in Basic Memory. The token also remains in `.env.bot.local`; it is not installed in Vercel yet because no deployed bot client consumes it.

Stripe, new scheduler credentials and webhook secrets belong to the feature that defines their endpoints. Add their exact names when that code exists. Do not invent placeholder credentials or reuse one webhook secret across unrelated endpoints.

The owner's initial model choice is Grok 4.6 through Vercel Gateway, with bounded X API evidence. The public catalog identifier observed during research was `spacexai/grok-4.6`; availability and tool support still need a bounded generation check during implementation. No direct xAI credential is required for the current starting approach.

## Recovery and source of truth

Vercel is the source for the app's local environment pull. Basic Memory project `main`, directory `credentials`, holds the replacement credential records under **Oparax Experiment 1 - Supabase**, **X API**, **X Chat Bot**, **Vercel AI Gateway**, and **PostHog**.

Private recovery files are outside git at `/Users/farzanm4/Desktop/oparax-recovery/clean-reset-20260912-014947`. They include retired configurations and fresh credential recovery copies. Never import the retired files wholesale back into the app.
