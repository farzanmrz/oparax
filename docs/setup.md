# Setup

Every external account and key this project uses and how it is configured now (September 24, 2026). No secret values are written here, only names and where they live. How each piece was set up is in git history.

## Vercel

Pro plan. Project `oparax`; only `main` deploys, and production is live at `https://oparax.ai` (placeholder homepage, `/privacy`, `/terms`). Fourteen domains are attached (oparax.ai plus oparax.com, .net, .xyz, .info, .store, their www variants and two vercel.app aliases); the owner keeps all of them. No marketplace integrations. No spend limit or budget alert yet (set after real usage, owner's rule).

Seventeen environment variables, each one readable Config entry with Production, Preview and Development selected together (owner's rule: never separate rows per environment for a shared value; update the single entry by its ID):

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- X: `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_BEARER_TOKEN`, `X_BOT_BEARER_TOKEN`
- Models: `AI_GATEWAY_API_KEY`
- PostHog: `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_PERSONAL_API_KEY`
- Digest: `GITHUB_TOKEN`, `PRODUCT_HUNT_TOKEN`, `PRODUCT_HUNT_API_KEY`, `PRODUCT_HUNT_API_SECRET`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

## Supabase

One shared project, ref `pcgvpypzfwuchyfwdlwe`, on a direct account (not through the Vercel marketplace), free plan. The `public` schema holds no application objects since #148; Supabase Auth and its users are untouched. Login providers: Email, Google, and X / Twitter (OAuth 2.0); the deprecated Twitter provider stays off. Site URL `https://oparax.ai`; allowed return URLs `http://localhost:3000/**` and `https://oparax.ai/**`. Nonce checks stay on for Google, and both providers require an email.

## Google sign-in

Google Cloud project `oparax` (number `306527649526`), Web client `Supabase`: origin `https://oparax.ai`, redirect `https://pcgvpypzfwuchyfwdlwe.supabase.co/auth/v1/callback`; its ID and secret live in Supabase's Google provider. Google Auth Platform is External and In production with only `openid`, `userinfo.email` and `userinfo.profile`. Branding is verified (passed September 24): home `https://oparax.ai`, privacy `https://oparax.ai/privacy`, terms `https://oparax.ai/terms`. The `oparax.ai` Domain property is verified in Search Console under `farzanmrz@gmail.com` by a root TXT record in GoDaddy; keep that record. Support email is `farzanmrz@gmail.com`, developer contact `farzan@oparax.ai`. Still to do: switch the support email to `farzan@oparax.ai` once Google's selector offers it.

## X developer app

App **Oparax** under the default Pay Per Use project. Website and organization URL `https://oparax.ai`, terms `https://oparax.ai/terms`, privacy `https://oparax.ai/privacy`. It requests email; callbacks are Supabase's plus `http://localhost:3000/auth/x/callback` and `https://oparax.ai/auth/x/callback`. Credentials: `X_BEARER_TOKEN` for reading public X data, `X_CLIENT_ID` and `X_CLIENT_SECRET` for sign-in with X, `X_BOT_BEARER_TOKEN` for the project bot.

The bot is **@oparax_ai**: Active, with `tweet.read`, `users.read`, `dm.read` and `dm.write`, chat keys registered, anyone may message it. `@oparax` is taken; a rename to the free `oparaxai` is a console step (Projects, the project, Bots) if the owner ever wants it. No DM has ever been sent or received; opt-in, opt-out, retry and incoming delivery are feature work (issue 5).

## X Ads

A separate X Ads project, connector connected in Claude Code and Codex. No campaign exists. Only the owner creates, changes or launches one.

## Vercel AI Gateway

Key `oparax-experiment-1`, installed as `AI_GATEWAY_API_KEY`. Every model call goes through it, including Jev (`typesafe-ai/jev`) and Grok (`spacexai/grok-4.7`), so no per-provider keys exist.

## PostHog

Project `563049`, token installed. A Slack channel has been connected since August 18 with no alerts configured. Personal key `oparax source maps` (project `563049`, `error_tracking:write` only) is `POSTHOG_PERSONAL_API_KEY`. Still to do: the build does not upload source maps yet, so production stack traces stay unreadable until a build step uploads each release's maps with this key.

## Email

Supabase's auth email (sign-up confirmation, password reset) sends through Google Workspace SMTP as **Oparax <no-reply@oparax.ai>**, proven working. Resend is not installed.

## Stripe

Direct account under `farzan@oparax.ai`; sandbox `Oparax sandbox`, `acct_1T5QSeEnXImHVwy0`, test mode. Test keys are `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`. The Stripe connector is connected in Claude and Codex. Nothing is created in the account (no products, prices or live mode). The webhook endpoint and its signing secret come with issue 5 (#147).

## GitHub and Product Hunt

`GITHUB_TOKEN` is the fine-grained token `oparax-digest` (owner `farzanmrz`, public repositories read-only, no expiration). Product Hunt application `Oparax` (id `300256`, Confidential client, redirect `https://oparax.ai`): `PRODUCT_HUNT_TOKEN` is its developer token (no expiration), used for public-feed reads; `PRODUCT_HUNT_API_KEY` and `PRODUCT_HUNT_API_SECRET` are stored for later use. Both are for the digest (#136, tabled). Product Hunt use is personal until the first paying user, when the owner asks Product Hunt about business use.

## Local env files

`.env.local` is a copy of the Vercel variables (Vercel is the source of truth; nothing is hand-edited). Refresh it with a fresh `vercel env pull` to a new file and replace the old one, because pulling over an existing file can keep stale entries. Keep it at permissions `0600`.

## Claude Design

Design-system project **Oparax** (id `14526a56-d87c-4973-b4fc-123c0a668ec6`) holds a synced copy of `design-system/`. The repo is the source of truth; re-sync after any change to DESIGN.md.

## Not used

- Railway: out of the stack (owner, September 24); project deleted, plugin and skill removed.
- Bright Data: not in the first build; 66 of the 76 seed sources are read directly.
- Sentry: replaced by PostHog error tracking.
- The Vercel to Slack integration, the old X filtered-stream rule, and the keys from before the September 11 rotation: removed.
