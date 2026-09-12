# X app and chat bot

Verified in the logged-in X Developer Console on September 11, 2026 (Pacific). This is an operating record, not proof that the new product can deliver news. Read this before configuring X or implementing bot delivery. Secret values live in Basic Memory, never here.

## Three distinct credentials

- **App bearer token:** `X_BEARER_TOKEN`, for app-level X API reads. A bounded lookup of the owner's public account returned HTTP 200 after rotation.
- **User connection:** `X_CLIENT_ID` and `X_CLIENT_SECRET`, for OAuth 2 when a person connects their X account. These do not authenticate the project bot. The replacement secret is installed, but a complete customer OAuth journey has not been retested.
- **Project bot:** `X_BOT_BEARER_TOKEN`, for the separate `@oparax_bot` identity. Its encrypted chat keys also require a Juicebox PIN. Neither credential belongs to the owner's personal X login. Personal Premium does not replace API billing or bot credentials.

## App configuration

[Oparax app in the console](https://console.x.com/accounts/2019899171617300480/apps/32997059).

- Account ID: `2019899171617300480`.
- App: **Oparax**, ID `32997059`, active.
- Project: **Default project-2019899171617300480 (Pay Per Use)**.
- Description: Personalized news monitoring across X and the web, with a user-controlled feed and optional updates through the Oparax bot.
- OAuth 2 type: **Web App, Automated App or Bot**, confidential client.
- Callback URLs: `http://localhost:3000/auth/x/callback` and `https://oparax.ai/auth/x/callback`.
- Website and organization URL: `https://oparax.ai`. Organization: Oparax.
- Request-email option off. Terms and privacy URLs are empty; create real pages before adding their URLs.
- OAuth 1 permissions reduced to **Read**. No personal OAuth 1 access token was generated. This does not set the scopes the application requests in OAuth 2. Review those separately during the new feature.
- App bearer and OAuth 2 client secret rotated. Client ID retained. Required values installed in Vercel Production, Preview and Development.

## Bot identity and encryption

[Chat bots in the console](https://console.x.com/accounts/2019899171617300480/bots).

- Display name **Oparax**, handle **@oparax_bot**, user ID `2098571482792112140`.
- Active, issued under app Oparax in the Pay Per Use project. The console says bot tokens use their issuing app's rate limits.
- Project bot allowance: **1 / 1**. Do not create another bot or delete this identity to start over.
- Who can message: **Everyone**. This setting alone does not establish whether the bot can initiate an unsolicited conversation.
- Capabilities displayed: `dm.write`, `users.read`, `tweet.read`, `dm.read`. Media writing was not enabled.
- **Chat keys registered successfully.** The console confirmed private keys are stored in Juicebox under the bot PIN and public keys are registered with X.
- Key version: `1789179510929`.
- Public fingerprint: `TOS64LB0g36bob3Pko9mwbsHukIa37jyRZdGd5JyInE`.

The console registration flow accepts the bot bearer token and a confirmed PIN (4, 5, 6 or 8 digits). This setup used an independently generated eight-digit bot PIN. The success screen warns that the PIN cannot be recovered later and both the token and PIN are needed to run the bot. Both are saved in **Oparax Experiment 1 - X Chat Bot** in Basic Memory. The token also remains in git-ignored `.env.bot.local` with owner-only file permissions; the PIN has a private recovery copy outside the repository.

**Do not re-register chat keys as a troubleshooting default.** The console warns that a new keypair creates a new encryption identity and breaks existing conversations unless each conversation gets a new conversation key. Rotating a token, revoking a token, registering chat keys and deleting a bot are different operations. Revocation retains the bot identity; deletion destroys it and frees its slot.

## Retired connections

- Deleted the old `oparax-group-0` football/crypto filtered-stream rule, ID `2091746176567828480`, after saving a recovery copy.
- App Streaming rules now displays **No streaming rules found**.
- App Subscriptions displays **No subscriptions found for this app**.
- App Webhooks displays **No webhooks found for this app**.
- The latest stream connection is **Disconnected**, ending September 11 at 18:50:15. Historical connection records remain as history.
- The Railway stream consumer has been deleted. Do not restore it from the old repository instructions automatically.

## What still requires implementation and proof

1. Establish the supported client/protocol for this project-scoped encrypted chat bot, including unlocking its Juicebox keys. No SDK, send endpoint, encryption payload or event schema is established by the console screens above.
2. Test an owner-authorized send and reply; establish who must initiate, recipient requirements, message limits and actual billed cost. Do not assume the conventional account DM API tariff or authentication applies to this bot.
3. Implement opt-in, verified recipient binding, opt-out, retry/deduplication and trial-expiry enforcement. A delivery accepted by X is not proof it was read.
4. Select incoming event delivery only after the receiving code exists. There is currently no webhook or subscription configured. Verify signing, replay protection and actual receipt if using a webhook.
5. Deploy bot secrets only into the service that actually uses them. Do not add guessed bot environment names to the web app before its consumer exists.

The [official X documentation](https://docs.x.com) remains the starting point for endpoint references. The console observations above are direct evidence of this newer bot surface; they are not a substitute for an endpoint specification. If docs are missing, report the specific gap rather than concluding project bots do not exist or silently substituting ordinary account DMs.

## Credential records

Basic Memory project **main**, ID `25f5c0c5-9dcd-4ea1-bc92-3830a613eece`, directory `credentials`:

- **Oparax Experiment 1 - X API**: app bearer, OAuth 2 client ID and secret.
- **Oparax Experiment 1 - X Chat Bot**: bot token and Juicebox PIN.

X Ads is separate. The owner explicitly prohibited ad setup or campaigns during this cleanup. No Ads action is implied by these app or bot settings.
