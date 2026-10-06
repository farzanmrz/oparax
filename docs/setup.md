# Setup

Every external account and key this project uses and how it is configured now (September 24, 2026; the September 28 rulings on budgets, credits and the tiers added). No secret values are written here, only names and where they live. How each piece was set up is in git history.

## Source and tooling update, September 30

The account-console facts below retain their original verification dates; this audit did not recheck remote account inventory or the live database. Current source includes the monitoring tables and RPCs, signup-first onboarding, billing, cron jobs and Contact delivery. Their schemas and migration mirrors are in `lib/supabase/database.types.ts` and `supabase/migrations/`; the old empty-schema description below records the post-148 state. Current source also reads `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`, `SMTP_USER` and `SMTP_PASSWORD`. Do not treat the earlier environment-variable total as a current inventory.

React Bits Pro is purchased. `REACTBITS_LICENSE_KEY` was pulled from Vercel into the git-ignored project and preview environment files; `components.json` uses Authorization Bearer environment interpolation. Never record the value. Fresh shadcn CLI and MCP retrieval passed. Arbitrary shells do not load `.env.local` automatically, and a running MCP may predate its license environment. The selected setup guidance was exposed additively; no existing active tool was removed. Evidence: `scratch/reactbits-pro-setup/status.md` and the current tooling audit record.

## Vercel

Pro plan. Project `oparax`; only `main` deploys, and production is live at `https://oparax.ai` (placeholder homepage, `/privacy`, `/terms`). Fourteen domains are attached (oparax.ai plus oparax.com, .net, .xyz, .info, .store, their www variants and two vercel.app aliases); the owner keeps all of them. No marketplace integrations. No Vercel spend limit yet (set after real usage, owner's rule); the AI Gateway key gets a budget, below.

Seventeen environment variables, each one readable Config entry with Production, Preview and Development selected together (owner's rule: never separate rows per environment for a shared value; update the single entry by its ID):

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- X: `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_BEARER_TOKEN`, `X_BOT_BEARER_TOKEN`
- Models: `AI_GATEWAY_API_KEY`
- PostHog: `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_PERSONAL_API_KEY`
- Digest: `GITHUB_TOKEN`, `PRODUCT_HUNT_TOKEN`, `PRODUCT_HUNT_API_KEY`, `PRODUCT_HUNT_API_SECRET`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

## Supabase

One shared project, ref `pcgvpypzfwuchyfwdlwe`, on a direct account (not through the Vercel marketplace), free plan. The `public` schema holds no application objects since #148; Supabase Auth and its users are untouched. Login providers: Email, Google, and X / Twitter (OAuth 2.0); the deprecated Twitter provider stays off. Site URL `https://oparax.ai`; allowed return URLs `http://localhost:3000/**`, `http://127.0.0.1:3000/**`, `https://oparax.ai/**` and `https://beta.oparax.ai/**`. The Confirm sign up and Reset password email templates build their button link from `{{ .RedirectTo }}` (the address the requesting site sends), not `{{ .SiteURL }}`, so an email asked for on beta or localhost returns there (October 5, 2026). Nonce checks stay on for Google, and both providers require an email.

## Google sign-in

Google Cloud project `oparax` (number `306527649526`), Web client `Supabase`: origin `https://oparax.ai`, redirect `https://pcgvpypzfwuchyfwdlwe.supabase.co/auth/v1/callback`; its ID and secret live in Supabase's Google provider. Google Auth Platform is External and In production with only `openid`, `userinfo.email` and `userinfo.profile`. Branding is verified (passed September 24): home `https://oparax.ai`, privacy `https://oparax.ai/privacy`, terms `https://oparax.ai/terms`. The `oparax.ai` Domain property is verified in Search Console under `farzanmrz@gmail.com` by a root TXT record in GoDaddy; keep that record. Support email is `farzanmrz@gmail.com`, developer contact `farzan@oparax.ai`. Still to do: switch the support email to `farzan@oparax.ai` once Google's selector offers it.

## X developer app

App **Oparax** under the default Pay Per Use project. Website and organization URL `https://oparax.ai`, terms `https://oparax.ai/terms`, privacy `https://oparax.ai/privacy`. It requests email; callbacks are Supabase's plus `http://localhost:3000/auth/x/callback` and `https://oparax.ai/auth/x/callback`. Credentials: `X_BEARER_TOKEN` for reading public X data, `X_CLIENT_ID` and `X_CLIENT_SECRET` for sign-in with X, `X_BOT_BEARER_TOKEN` for the project bot.

The bot is **@oparax_ai**: Active, with `tweet.read`, `users.read`, `dm.read` and `dm.write`, chat keys registered, anyone may message it. `@oparax` is taken; a rename to the free `oparaxai` is a console step (Projects, the project, Bots) if the owner ever wants it. No DM has ever been sent or received; opt-in, opt-out, retry and incoming delivery are built in the one feature (September 28); the one-DM-per-story rule and the cadence per tier are roadmap section 7.

X API credits (owner, September 28): auto top-up stays off ("I'm not switching on auto top-up at all"). The owner loaded $50 on September 28 and the Developer Console balance is $19.21, so it was about $31 negative before; the console spend cap is $51.64 and applies per billing cycle, which runs from the 5th to the 5th (now September 5 to October 5). The assistant's recommendation, recorded as such: load $50 more now (balance about $69) and set the cap to $70 for this cycle, then about $100 loaded before ads or the first ten paying users. The code reads `GET /2/usage/credits` once a day and alerts at $20 and $10, and its own ledger pauses public builds and free-week polling under an estimated $15 so paying users keep running (cogs.md section 6).

## X Ads

A separate X Ads project, connector connected in Claude Code and Codex. No campaign exists. Only the owner creates, changes or launches one.

## Vercel AI Gateway

Key `oparax-experiment-1`, installed as `AI_GATEWAY_API_KEY`. Every model call goes through it, including Jev (`typesafe-ai/jev`) and the onboarding model, GPT-6 Luna fast (`openai/gpt-6-luna-fast`, which replaced Grok `spacexai/grok-4.7` in the September 26 to 27 lab and the app), so no per-provider keys exist. A budget on the key is a hard stop at its limit (owner, September 28); the amount is his to set and is not recorded yet.

## PostHog

Project `563049`, token installed. A Slack channel has been connected since August 18 with no alerts configured; the build adds alerts to Slack on daily X spend, per-page spend and errors (owner, September 28). Personal key `oparax source maps` (project `563049`, `error_tracking:write` only) is `POSTHOG_PERSONAL_API_KEY`. Still to do: the build does not upload source maps yet, so production stack traces stay unreadable until a build step uploads each release's maps with this key.

## Email

Supabase's auth email (sign-up confirmation, password reset) sends through Google Workspace SMTP as **Oparax <no-reply@oparax.ai>**, proven working. Resend is not installed.

## Stripe

Direct account under `farzan@oparax.ai`; sandbox `Oparax sandbox`, `acct_1T5QSeEnXImHVwy0`, test mode. Test keys are `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`. The Stripe plugin is installed and signed in in Claude Code; Codex has its own Stripe plugin. The sandbox is the only Stripe account. Nothing is created in the account yet (no products, prices or live mode). The build creates the three prices (Hobby $5, Creator $30, Wire $99 a month; owner, September 28), the webhook endpoint and its signing secret; checkout on day seven is the sign-up (roadmap section 9).

## GitHub and Product Hunt

`GITHUB_TOKEN` is the fine-grained token `oparax-digest` (owner `farzanmrz`, public repositories read-only, no expiration). Product Hunt application `Oparax` (id `300256`, Confidential client, redirect `https://oparax.ai`): `PRODUCT_HUNT_TOKEN` is its developer token (no expiration), used for public-feed reads; `PRODUCT_HUNT_API_KEY` and `PRODUCT_HUNT_API_SECRET` are stored for later use. Both are for the digests, optional switches a signed-up person turns on after onboarding (owner, September 28; #136 stays open as their issue). Product Hunt use is personal until the first paying user, when the owner asks Product Hunt about business use.

## Local env files

`.env.local` is a copy of the Vercel variables (Vercel is the source of truth; nothing is hand-edited). Refresh it with a fresh `vercel env pull` to a new file and replace the old one, because pulling over an existing file can keep stale entries. Keep it at permissions `0600`.

## Not used

- Railway: out of the stack (owner, September 24); project deleted, plugin and skill removed.
- Bright Data: not in the first build; 66 of the 76 seed sources are read directly.
- Sentry: replaced by PostHog error tracking.
- The Vercel to Slack integration, the old X filtered-stream rule, and the keys from before the September 11 rotation: removed.
