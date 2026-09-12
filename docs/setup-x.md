# X app and chat bot

Verified in the logged-in X Developer Console on September 11, 2026 (Pacific). This is an operating record, not proof that the new product can deliver news. Read this before configuring X or implementing bot delivery. Secret values live in Basic Memory, never here.

## Documentation routing

X publishes an official [agent skill](https://docs.x.com/skill.md). Its [Agent Resources](https://docs.x.com/tools/ai) describes the skill, Docs MCP, API MCP and OpenAPI specification as distinct resources. The Codex `x_docs` and Claude Code `x-docs` agents on this machine are configured to consult `https://docs.x.com/mcp`. Use that agent for X platform documentation; use the separate xAI agent for Grok model API documentation.

The official X Chat pages are accessible and document project bots, encryption, key handling, conversations, sending and receiving. A prior research pass stopped too early and incorrectly described those areas as undocumented. Start with:

- [X Chat introduction](https://docs.x.com/xchat/introduction) and [getting started](https://docs.x.com/xchat/getting-started).
- [Manage bot accounts](https://docs.x.com/xchat/bots).
- [Chat XDK](https://docs.x.com/xchat/xchat-xdk).
- [Private-key and PIN handling](https://docs.x.com/xchat/handling-private-keys).

The Chat XDK handles encryption, decryption, signing and verification; the application still makes the HTTP requests. The documented flow includes generating keys, registering public keys with `POST /2/users/{user_id}/public_keys`, setting the identity/key version, establishing conversation keys with `POST /2/chat/conversations/{recipient_id}/keys`, and sending with `POST /2/chat/conversations/{conversation_id}/messages`. Send requests carry the XDK-produced `message_id`, `encoded_message_create_event` and `encoded_message_event_signature`. Event history or live events supply received messages for XDK decryption. These are documented integration paths, not operations tested by this setup.

For bots, the private-key guide recommends `export_keys` into a secret manager or HSM and `import_keys` at runtime. It describes Juicebox `setup`/`unlock` with a passcode for client backup and recovery. It treats the passcode as a root credential and says not to send it to a backend or share it with third parties. Our console-generated bot PIN is recorded at the owner's explicit request; that does not establish a supported backend key-loading design. Before deployment, reconcile the console-created identity with the documented bot export/import path, preserving the registered key identity.

The narrower unverified point is how the console's exact Register chat keys action maps to the XDK identity and key storage, including obtaining a compatible exported key blob for the already-registered version. Do not infer that all bot transport documentation is missing from that remaining setup question.

## Three distinct credentials

- **App bearer token:** `X_BEARER_TOKEN`, for app-level X API reads. A bounded lookup of the owner's public account returned HTTP 200 after rotation.
- **User connection:** `X_CLIENT_ID` and `X_CLIENT_SECRET`, for OAuth 2 when a person connects their X account. These do not authenticate the project bot. The replacement secret is installed, but a complete customer OAuth journey has not been retested.
- **Project bot:** `X_BOT_BEARER_TOKEN`, for the separate `@oparax_bot` identity. Its encrypted chat keys also require a Juicebox PIN. Neither credential belongs to the owner's personal X login. Personal Premium does not replace API billing or bot credentials.

The documented `/2/bots` lifecycle endpoints use the project's **app bearer token**, with app-only OAuth 2 and no scopes. They create/manage the bot and issue its separate `xcbot_` token. The getting-started runtime examples use a generic OAuth access token; the bot guide says its bearer token is how to act as the bot. Verify acceptance of our bot token on the exact chat runtime endpoints during integration rather than confusing lifecycle authentication with message authentication.

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

The documented recovery path for an exported bot key blob uses `import_keys` followed by `set_identity(user_id, signing_key_version)` with the existing registered public-key version. It does not require registering a new identity. This setup has not yet exported such a blob from the console-created keys. Establish that transfer before treating the platform setup as a deployable bot client.

**Do not re-register chat keys as a troubleshooting default.** The console warns that a new keypair creates a new encryption identity and breaks existing conversations unless each conversation gets a new conversation key. Rotating a token, revoking a token, registering chat keys and deleting a bot are different operations. Revocation retains the bot identity; deletion destroys it and frees its slot.

## Retired connections

- Deleted the old `oparax-group-0` football/crypto filtered-stream rule, ID `2091746176567828480`, after saving a recovery copy.
- App Streaming rules now displays **No streaming rules found**.
- App Subscriptions displays **No subscriptions found for this app**.
- App Webhooks displays **No webhooks found for this app**.
- The latest stream connection is **Disconnected**, ending September 11 at 18:50:15. Historical connection records remain as history.
- The Railway stream consumer has been deleted. Do not restore it from the old repository instructions automatically.

## What still requires implementation and proof

1. Implement the documented Chat XDK and X Chat API flow. Resolve how to load the existing console-created key identity using the recommended bot key storage method; do not assume a console PIN is the correct server configuration. The official docs establish the protocol, but our integration has not been exercised.
2. Test an owner-authorized send and reply; establish who must initiate, recipient requirements, message limits and actual billed cost. Do not assume the conventional account DM API tariff or authentication applies to this bot.
3. Implement opt-in, verified recipient binding, opt-out, retry/deduplication and trial-expiry enforcement. A delivery accepted by X is not proof it was read.
4. Select incoming event delivery only after the receiving code exists. There is currently no webhook or subscription configured. Verify signing, replay protection and actual receipt if using a webhook.
5. Deploy bot secrets only into the service that actually uses them. Do not add guessed bot environment names to the web app before its consumer exists.

Use the official X Chat references above for implementation and this console record for the saved Oparax configuration. Ordinary account DM documentation is a separate surface. State specific remaining access or integration uncertainties; do not label a documented protocol unavailable because an earlier search missed it.

## Credential records

Basic Memory project **main**, ID `25f5c0c5-9dcd-4ea1-bc92-3830a613eece`, directory `credentials`:

- **Oparax Experiment 1 - X API**: app bearer, OAuth 2 client ID and secret.
- **Oparax Experiment 1 - X Chat Bot**: bot token and Juicebox PIN.

X Ads is separate. The owner explicitly prohibited ad setup or campaigns during this cleanup. No Ads action is implied by these app or bot settings.

## Handle lookup

On September 11, 2026, an authenticated `GET /2/users/by/username/oparaxAI` returned an X `resource-not-found` error (inside an HTTP 200 response). No public account was returned for `@oparaxAI`. This is not proof that X allows the handle to be claimed; the creation/change flow can reserve or reject handles that do not resolve publicly. No handle was claimed and the existing bot was not renamed.
