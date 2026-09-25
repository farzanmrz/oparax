# Setup

Every external account and key this project uses, what state it is in, and when each section was last checked. No secret values are written here, only names and where they live.

## Vercel

Verified September 11, 2026. Plan: Pro. The `oparax` project deploys to production from the `main` branch only; every other branch, including `beta`, only ever produces a preview. Production has been paused since September 11, so `oparax.ai` currently shows Vercel's paused page. Before the September 24 setup pass, these nine environment variables were installed across Production, Preview and Development, with a copy in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `X_BEARER_TOKEN`
- `AI_GATEWAY_API_KEY`
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST`

No spend limit or budget alert has been set up on the Vercel account yet. September 24: no marketplace integrations are installed; production is still paused; fourteen domains are recorded as attached to the project (oparax.ai plus oparax.com, .net, .xyz, .info, .store, their www variants and two vercel.app aliases). The owner confirmed the domains are intentional, so none were removed. The Vercel CLI is a global install (under the nvm Node 24) and was upgraded to the current release on September 24.

Completed September 24, 2026: the nine original variables plus `X_BOT_BEARER_TOKEN`, `PRODUCT_HUNT_TOKEN`, `GITHUB_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `POSTHOG_PERSONAL_API_KEY` are installed. All fifteen use readable Config storage, with exactly one entry per variable and Production, Preview and Development selected together (All Environments), at the owner's explicit instruction. Separate exports from all three environments were compared with `.env.local`: every value matched, with no duplicate environment assignments or Sensitive entries. Production remains paused; no deployment was triggered. All existing domains are retained because the owner confirmed ownership and intent.

The CLI's `env add --force` selected an existing entry by name rather than reliably replacing each target when several entries shared a name. Obsolete duplicates were removed by exact environment-variable ID only after all replacement values were verified. The owner corrected the remaining per-environment layout: all matching-value entries were consolidated to one entry per name with all three targets selected. For future updates, update that single entry by its ID; never create separate rows for Development, Preview and Production when the value is shared.

September 24 follow-up: the owner also requested storage of Product Hunt's application credentials. Added `PRODUCT_HUNT_API_KEY` and `PRODUCT_HUNT_API_SECRET`, bringing the current total to seventeen variables. Each has one readable Config entry targeting Production, Preview and Development together. Readback verified the stored values; a fresh `.env.local` export matches all seventeen, with the previous fifteen values unchanged and file permissions `0600`.

## Supabase

Verified September 11, 2026. One shared project, ref `pcgvpypzfwuchyfwdlwe`, on a direct Supabase account (not connected through the Vercel marketplace) on the free plan. Its keys were generated in the Supabase dashboard and pasted by hand into Vercel, not linked through an integration. The database currently holds no product data (September 24: twenty tables in `public`, every one empty). It still carries two unused columns, `agents.stripe_customer_id` and `agents.stripe_subscription_id`, and five whole tables (`x_webhook_events`, `dm_connections`, `alerts`, `dm_send_ledger`, `onboard_attempts`, plus the `publisher_claim_kind` enum), all left over from the retired issue #131 branch and applied live before it was retired. The owner ruled on September 24 that the legacy schema is wiped with the legacy code (the clear-the-ground pass), so none of this survives. Login providers for issue 4 (owner, September 24): email, Google and X through Supabase Auth; the dashboard steps are in the September 24 click list the owner holds.

## Google and X sign-in setup

Configured and verified September 24, 2026 for issue #146. Google Cloud project `oparax` (number `306527649526`) has a Web application client named `Supabase`. Its authorized JavaScript origin is `https://oparax.ai`, and its redirect URI is `https://pcgvpypzfwuchyfwdlwe.supabase.co/auth/v1/callback`. Google Auth Platform is External and In production, with only `openid`, `userinfo.email` and `userinfo.profile` declared. Support email is `farzanmrz@gmail.com`, the available account in the selector; developer contact is `farzan@oparax.ai`. The client ID and secret are saved in Supabase's Google provider. No extra Google CLI login was needed.

Supabase has Email, Google and X / Twitter (OAuth 2.0) enabled; deprecated Twitter remains disabled. The existing X OAuth 2.0 client ID and secret were reused without regeneration. The X app requests email and retains both earlier callbacks (`http://localhost:3000/auth/x/callback` and `https://oparax.ai/auth/x/callback`) alongside the Supabase callback. Nonce checks remain enabled for Google, and both providers retain the setting requiring an email.

Supabase's Site URL was already `https://oparax.ai`, with `http://localhost:3000/**` and `https://oparax.ai/**` already allowed. Those settings were verified and retained. Auth API checks returned HTTP 302 to `accounts.google.com` and `x.com` with the correct Supabase callback. This verifies provider handoff, not a completed user sign-in: the new website sign-up flow is still built in #146 and production remains paused.

The owner authorized `https://oparax.ai` as a temporary privacy-policy and terms-of-service URL. It is currently entered in both Google branding and X authentication settings; actual policy and terms pages remain to be published and these links updated. Google's policy acceptance was explicitly approved by the owner.

### Google branding verification follow-up

Read September 24, 2026 from Google Auth Platform's Branding verification issues panel for project `oparax`, after the owner uploaded the logo. Google reported six findings from the previous verification attempt:

| Finding reported by Google | Work required before resubmission |
| --- | --- |
| The homepage at `https://oparax.ai` was unresponsive. | Make the production homepage publicly reachable. Production was intentionally paused during setup; changing that remains separate launch work. |
| Google could not verify that the homepage belongs to the owner. | Completed September 24: Search Console verified the `oparax.ai` Domain property under `farzanmrz@gmail.com` using a new GoDaddy TXT record. The old branding finding is historical until the full submission is reviewed again. |
| The homepage did not link to a privacy policy. | Add a visible link on the public homepage to the actual privacy page. |
| The privacy-policy URL was unresponsive. | Publish a publicly reachable privacy page, with no login required. |
| The privacy page did not sufficiently explain data collection and use. | Write Oparax-specific content describing how Google user data is accessed, used, stored and shared. The temporary homepage is not a privacy policy. |
| The privacy-policy address was identical to the homepage address. | Give the policy its own URL and update Google branding to point to it. |

No logo-specific rejection appeared in this panel. The findings concern the submitted website and privacy policy; they are not proof that the OAuth client credentials are wrong. The temporary links permitted initial setup but did not satisfy branding verification. Domain ownership was subsequently verified as recorded below; the five website/privacy findings remain unresolved. No branding re-verification request was submitted. Once the pages are ready, check all six findings and then request re-verification. Google's guidance: [homepage requirements](https://support.google.com/cloud/answer/13807376) and [privacy-policy requirements](https://support.google.com/cloud/answer/13806988).

Separate owner-requested branding follow-up: change the user-facing support email to `farzan@oparax.ai` when it is available in Google's selector. The currently recorded Gmail support address can be shown to users; developer contact information is where Google contacts the maintainer and does not replace that user-facing address. Actual terms pages and their final Google/X links are also pending. These follow-ups do not require adding localhost as an authorized Google domain: Google returns to the hosted Supabase callback, and Supabase's allowed return URLs already include localhost.

Concrete completion checklist, following the panel's Learn more links and Google's [domain verification instructions](https://support.google.com/cloud/answer/13804266):

- [x] Verify the **Domain** property `oparax.ai` in Google Search Console under `farzanmrz@gmail.com`, the Google account used for the Oparax Cloud project. Completed September 24: added Google's new root (`@`) TXT record in GoDaddy; Search Console returned **Ownership verified**, method **Domain name provider**. GoDaddy's saved record shows TTL 1 Hour. The new record was also visible on both authoritative nameservers and public Google/Cloudflare DNS lookups. Keep this record in DNS to retain verification. The existing older Google verification record, website records and email records were preserved; no nameserver or Vercel configuration changed.
- [x] Publish the real homepage at `https://oparax.ai`, accessible without signing in and without a paused/deployment-protection screen. Identify Oparax, explain what it does and why it requests Google identity information. Keep the submitted URL consistent with the page users actually reach. Completed September 24 (owner's word): production was unpaused and `main` was brought level with `beta` (promote commit 7955624), deployed and aliased to `https://oparax.ai`; checked signed out, `/`, `/privacy` and `/terms` return 200 and the homepage links the privacy page.
- [x] Publish a dedicated HTML privacy page on the verified domain, proposed path `/privacy`, and link it visibly from the homepage and relevant app screens. Name Oparax/OPARAX AI INC. Describe the Google identity data actually received, its purpose, storage and protection, recipients/processors, retention and how users request deletion. Ground every claim in implemented behavior; do not publish generic template promises or invented retention periods. A PDF or embedded document is not the required web page. Completed September 24: `/privacy` names OPARAX AI, Inc., states the Google data received (name, email, picture, account id, basic scopes only), its use, processors (Supabase, Vercel, PostHog, Google Workspace), US storage, retention, deletion by email within 30 days, and the Limited Use statement; `/terms` is published too. Content lives in `lib/legal/content.ts`; the owner reviews it.
- [ ] Update Google branding with the real homepage and distinct privacy URL. Set the user-facing support address to the Oparax address once selectable. Publish the terms page and replace the temporary terms link too; terms were a known setup follow-up, not one of the six reported findings. Keep the Supabase OAuth callback intact.
- [ ] Check the public pages while signed out: both load, the privacy link works, names match the consent screen, and the policy reflects the actual basic identity/email/profile access and data handling. Confirm domain verification in Search Console. These checks must be against the public domain, not only localhost. Partly done September 24: all three pages load signed out and the link works; the consent-screen name check stays with the owner.
- [ ] After every finding is resolved, choose the fixed-issues option in Google Auth Platform and request re-verification. If Google's existing review email asks for a reply, provide the completed URLs and ownership confirmation in that review thread. Approval is Google's decision; record the returned status rather than assuming submission means approval.

Domain ownership, the public homepage and the privacy and terms pages are complete. Remaining, the owner's: in Google branding set the homepage to `https://oparax.ai`, the privacy policy to `https://oparax.ai/privacy` and terms to `https://oparax.ai/terms` (and the same two links in the X app's authentication settings), then request re-verification. The September 24 ownership follow-up added only the verification TXT record and documentation. It did not unpause production or deploy the unfinished rebuild. Proof of domain ownership works independently of website availability.

## Vercel AI Gateway

Verified September 11 to 21, 2026. The Gateway key is named `oparax-experiment-1`. Every model call the product makes, including the Jev ranking model (`typesafe-ai/jev`) and Grok (`spacexai/grok-4.7`), goes through this one Gateway key instead of a separate key per model provider. The unused local-only `TYPESAFE_KEY` and `BRIGHTDATA_API_KEY` entries were removed during the September 24 setup cleanup.

## X developer app

Verified September 11, 2026. App **Oparax**, running under the account's default Pay Per Use project. Three separate credentials exist for three separate jobs: `X_BEARER_TOKEN` for app-level reads of public X data, `X_CLIENT_ID` and `X_CLIENT_SECRET` for when a person connects their own X account, and a separate bot bearer token for the project bot. The project bot exists with the capabilities to read tweets, read users, and read and send direct messages; its encrypted chat keys are registered. Its handle is **@oparax_ai** (verified September 24 by asking the API who the bot token belongs to; the earlier note saying `@oparax_bot` was stale). `@oparax` is taken (the owner saw it in the sign-up form on September 24) and `oparaxai` is free (one user lookup, September 24); the bot-management endpoint answered 404 to both the app token and the bot token, so a rename to `oparaxai` is done in the developer console (Projects, the project, Bots) if the owner wants it.

September 24 (owner): the plain account under `farzan@oparax.ai` is not created; `@oparax` is taken and moving the developer app to an Oparax login buys nothing. The project bot is the bot; a brand account can be created any later day if ever wanted.

Still unproven for direct messages: an actual owner-authorized send or reply has never been tested, and opt-in, opt-out, retry and incoming delivery are not built.

September 24 setup pass: the developer console shows the existing `@oparax_ai` bot Active, issued under Oparax, with `dm.write`, `users.read`, `tweet.read`, and `dm.read`, and Everyone allowed to message it. No handle change, token rotation or DM send was performed. Its existing bearer token is now in Vercel as `X_BOT_BEARER_TOKEN`.

## X Ads

Verified September 22, 2026. A separate X Ads project. Its connector is connected in Claude Code and Codex. No ad campaign exists. Only the owner may create, change or launch a campaign.

## PostHog

Verified September 11 to 22, 2026. Project id `563049`. Its project token is installed in Vercel. A Slack channel has been connected to PostHog since August 18 with zero alerts configured so far.

September 24: created personal key `oparax source maps`, restricted to project `563049` (display name `Default project`) and `error_tracking:write`. Saved as `POSTHOG_PERSONAL_API_KEY` in all three Vercel environments and pulled locally. This is credential preparation only: `next.config.ts` currently has no source-map upload integration, so the key alone does not enable readable production stack traces.

Source-map implementation follow-up: configure the build to generate and upload the maps matching each release automatically, using this key. Maps translate an error's location in compressed website code back to the original file and line. They are generated artifacts, not files the owner writes or updates by hand. Every changed build needs its own matching maps; automating that as part of the build removes routine manual work. Verify the integration with an error from a known release resolving to its original source location. This follow-up records the requirement only; no uploader code was added during account setup.

## Email

Verified September 11, 2026. Supabase's authentication email (signup confirmation, password reset) sends through Google Workspace SMTP as **Oparax <no-reply@oparax.ai>**. A test password-reset email was proven to arrive on September 11. Resend, the alternative email service considered for future alerts, is not installed.

## Railway

Out of the stack (owner, September 24). The project and its two worker services were deleted on September 12; the CLI is still logged in and lists no project. On September 24 the Railway plugin was uninstalled, the global `use-railway` skill deleted, and the `workers` bundle row removed from the feature skill. Website polling runs on a Vercel cron and X delivery arrives by webhook, so nothing needs a worker.

Billing verified in Chrome September 24: the Oparax workspace shows Trial, with Trial expired, rather than an active Hobby or Pro subscription. No billing settings were changed.

## Bright Data

Bright Data is not used in the first build of the product; its zones are not configured and its unused local key was removed in the September 24 cleanup. Most seed sources (66 of 76) can be read directly without it.

## Stripe

September 24: the owner created a direct Stripe account with `farzan@oparax.ai`. Its Oparax sandbox is `acct_1T5QSeEnXImHVwy0`. Existing sandbox keys are installed as `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in all three Vercel environments and pulled locally. A read-only balance request returned HTTP 200 with `livemode: false`. No live-mode setup, charges, products, prices or subscriptions were created. The webhook endpoint and signing secret remain part of #147 when its route exists.

September 24 connector follow-up: the Stripe plugin in this Codex session lists `Oparax sandbox`, account `acct_1T5QSeEnXImHVwy0`, with `livemode: false`, matching the application's test keys. Both read and write tools are exposed. The account-list response does not report the complete permission grant, so this confirms the connected sandbox without claiming every write operation has been tested. No transaction or test mutation was performed merely to prove access. The owner reports authorizing the connection; Claude's separate connection was not inspected.

## GitHub and Product Hunt

Created September 24: GitHub fine-grained token `oparax-digest`, resource owner `farzanmrz`, public repositories read-only, no additional account permissions, and no expiration at the owner's request. An authenticated read of another owner's public repository (`vercel/next.js`) returned HTTP 200. Product Hunt application `Oparax` (id `300256`) uses the Confidential client type and redirect `https://oparax.ai`; its developer token has no expiration. A public-feed GraphQL read returned HTTP 200 without errors. Tokens are stored as `GITHUB_TOKEN` and `PRODUCT_HUNT_TOKEN` in all three Vercel environments and pulled locally; the digest feature (#136) uses them when built. The owner's stated plan remains personal use until the first paying user, at which point he contacts Product Hunt about business use; no commercial permission has been obtained by this setup.

September 24 follow-up (owner): Product Hunt's existing application key and secret are also stored as `PRODUCT_HUNT_API_KEY` and `PRODUCT_HUNT_API_SECRET` in Vercel, one entry each shared across all three environments, and in the fresh local export. They identify/authenticate the application when obtaining access tokens; the existing `PRODUCT_HUNT_TOKEN` remains sufficient for the current planned public-feed reads. Saving the application credentials does not implement a new authorization flow or require users to connect Product Hunt accounts. No credential was regenerated, and no secret value belongs in this document.

## Local env files

`.env.local` is a local copy of the variables installed in Vercel, refreshed with `vercel env pull`; nothing is hand-edited locally (owner, September 24: Vercel is the source of truth). September 24: the bot token was uploaded and its downloaded value compared with `.env.bot.local` before that obsolete file was deleted. A clean Vercel export replaced `.env.local` with file permissions `0600`, removing the dead local-only `TYPESAFE_KEY` and `BRIGHTDATA_API_KEY`. Pulling over an existing file can preserve stale local entries, so use a fresh ignored export and verify before replacing it when cleaning obsolete variables. The `poller` and `ingest` worker folders each keep an `.env.example` file that lists variable names only, no values.

## Claude Design

Synced September 24: the design-system project **Oparax** (id `14526a56-d87c-4973-b4fc-123c0a668ec6`) holds the `design-system/` bundle (tokens, seven preview cards, README). The repo stays the source of truth; re-run the sync after any change to DESIGN.md.

## Retired

- Railway: project and both worker services deleted, September 12; plugin and skill removed September 24.
- Sentry: organization not recreated; PostHog's error tracking replaced it.
- The Vercel to Slack integration: removed.
- The old X filtered-stream rule and its Railway stream consumer: deleted.
- The original Supabase and Gateway keys, from before the September 11 rotation: deleted or disabled.
