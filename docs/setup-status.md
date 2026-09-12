# Setup status

Verified September 11, 2026 (Pacific). This is the operational baseline for the fresh experiment. Configuration checks are complete for the items below; the replacement product has not been built or launched.

## Completed

- **Repository:** `beta` is the working baseline; `main` remains production. Old feature branches and issue #131 are retired. No open issues or pull requests remained at the cleanup check. The old product source remains until the replacement feature specifies its removal.
- **Railway:** deleted project `oparax-ingest` and both the website poller and X ingest services. Used immediate deletion after the initial grace-period delete. Dashboard showed zero projects. Retired local worker credentials were moved out of the active checkout after backup. This does not mean the Railway account subscription was canceled.
- **Vercel:** removed all old project environment variables, then installed the nine names in [setup-env.md](setup-env.md) across Production, Preview and Development. Pulled `.env.local` from Development. Removed the Slack integration. **Production is paused**, so `oparax.ai` serves Vercel's paused response until resumed. Project settings, domains, historical deployments and previews remain; pausing production does not delete or pause previews.
- **Supabase:** retained shared project `pcgvpypzfwuchyfwdlwe` and auth configuration. Created the new publishable/server key pair, removed old modern keys, and disabled legacy keys for `apikey` header use. Legacy JWT signing was not rotated. No new schema migration or auth-user deletion was performed in this credential cleanup.
- **Authentication email:** corrected the SMTP username to `farzan@oparax.ai`; sender remains **Oparax <no-reply@oparax.ai>**. A Supabase recovery email arrived in Spark. See [setup-smtp.md](setup-smtp.md). The full application signup/recovery journey remains to be exercised after the rebuild.
- **X:** rotated app bearer and OAuth 2 client secret, updated the app description/settings, removed the obsolete football/crypto streaming rule. The app has no webhooks or subscriptions and its latest stream connection is disconnected. **@oparax_bot** exists and its encryption keys are registered successfully. Token and PIN are saved. See [setup-x.md](setup-x.md).
- **PostHog:** retained project `563049`, rotated its project token and installed it in the app environments. Existing history remains. The new experiment dashboard, failure alerts and AI instrumentation are not implemented by a token reset.
- **Slack/Sentry:** archived the obsolete `engineering-quality` and `release-health` channels and verified their read-only archive state. Removed Vercel's Slack integration and app Slack/Sentry variables. Sentry was not recreated. The Slack workspace, its installed apps and the existing PostHog integration were not deleted; Slack is not a required runtime service for the new experiment.
- **Credentials:** replacement Supabase, X API, X bot/PIN, Gateway and PostHog records are in Basic Memory, with a single **Oparax Experiment 1 - Credential Index** linking them. Values were read back privately. The Workspace login and SMTP password records remain separate owner-managed entries.
- **Browser:** closed seven completed or duplicate setup tabs. Kept the current core-service consoles and the owner's other tabs.

## Verified, within these limits

Fresh Supabase public-auth access, Supabase admin access, Gateway credit access and one X public user lookup returned HTTP 200. X confirmed chat-key registration. Spark confirmed SMTP arrival. These are credential/platform checks, not proof of a working feed, OAuth connection, chatbot delivery, payment flow or experiment.

## What the fresh feature must settle and build

1. **Learning and measurements:** use [exp1.md](exp1.md), reconcile its proposed operating choices once, and derive the build from its hypotheses and decision rules. The first algorithm check uses Liam, Nihan, Farzan, Kush and Reshad; founder-prepared examples are not customer validation.
2. **Replacement schema and repository cleanup:** inspect the actual shared schema, preserve needed auth, remove obsolete voice/drafting/posting flows and their tables/RPCs, and retain source-discovery or telemetry code only where it serves the new flow. The old deployment already showed schema drift, including missing `voice_guides` and `drafts.posted_at`. Do not try to repair the retired product as a prerequisite to planning the replacement. Preserve a recoverable database copy before destructive schema changes.
3. **First personalization algorithm:** Grok 4.6 through Vercel Gateway, using bounded X API evidence and the person's explicit monitoring request. Establish the output and evaluate recommendations before expanding acquisition to selected RSS, sites and other sources. Verify the model route with a bounded generation; credentials alone do not prove tool support.
4. **Complete user journey:** free handle preview, signup for connecting/customizing, seven-day trial and a real selected price, feed, optional bot delivery, corrections and opt-out. The bot's client/encryption protocol, actual send/reply and tariffs still require proof. Stripe setup belongs with payment and webhook implementation.
5. **Monitoring:** use PostHog as the primary place to connect user behavior, errors, AI traces/evaluations, delivery results and costs using shared user/story/run IDs. Keep Vercel/Supabase native diagnostics for provider failures. A missing successful event needs a separate failure or overdue-work signal; a sent DM is not a read receipt, and an LLM judge is not customer validation. Select the owner's alert destination after the actual alerts exist, without making Slack a runtime dependency.
6. **Runtime and launch:** choose scheduling from measured task duration, retry and cadence needs. Do not recreate Railway automatically. Confirm Supabase quota, the priced trial and full acceptance journey, deploy the replacement, then resume Vercel production. The owner controls the launch.

## Explicitly outside this cleanup

No ad campaign or X Ads setup, no new payment subscription, no customer DM, no automatic feature/build launch, and no replacement database schema. The owner has independently activated personal X Premium at $40/month. Historical Vercel deployments and Slack app installations remain as stated above; they have not been represented as deleted.

## Records and recovery

[setup.md](setup.md) is the short handoff index. Provider details are in [setup-x.md](setup-x.md), [setup-env.md](setup-env.md) and [setup-smtp.md](setup-smtp.md). The source of truth for the target experiment remains [exp1.md](exp1.md).

Private configuration recovery: `/Users/farzanm4/Desktop/oparax-recovery/clean-reset-20260912-014947`. Earlier repository/issue/planning recovery: `/Users/farzanm4/Desktop/oparax-recovery/20260911-173343`. Neither is a specification or a source from which to restore obsolete secrets wholesale.
