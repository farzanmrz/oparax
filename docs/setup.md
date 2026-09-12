# Experiment setup handoff

## Fresh start

September 11, 2026. The owner retired issue #131 instead of amending it. It is closed as not planned. Remote work branches ft/126, ft/127 and ft/131 are deleted; the checkout is beta, with main retained as the production branch. No open GitHub issues remain. Old .feature plans and review artifacts are removed from the active workspace. The current experiment and discovery records are preserved.

A local recovery copy contains the old repository history, documents, issue record and planning files: /Users/farzanm4/Desktop/oparax-recovery/20260911-173343. It is recovery material, not the specification for the new feature.

Run a new /feature in Claude Code from beta using docs/exp1.md and this handoff. Do not amend or resume #131. Remove obsolete product machinery in the new implementation. Branch retirement did not revert deployed services or database migrations; inspect the actual live schema before planning the reset. No production database or running service has been changed by this preparation.

## X bot

Created the bot @oparax_bot, display name Oparax, through Chrome in the existing Pay Per Use project. X rejected @oparax with "Username is unavailable." The bot has dm.read, dm.write, tweet.read and users.read; media.write is disabled. Its token is saved in the git-ignored .env.bot.local under X_BOT_BEARER_TOKEN, with file permissions restricted to the local user. It has not yet been installed in deployed services. The owner subsequently requested a regular @oparax account and Premium. X shows no public @oparax profile but refuses the username. The new-account flow is open, pending the owner's email choice and which account should receive Premium. X's handle-marketplace rules require an eligible paid tier and an account older than three months; Premium does not guarantee this handle.

The console states that a bot belongs to a project and its token is issued under one of that project's apps, using that app's rate limits. Bot user ID: 2098571482792112140; issued under app Oparax (32997059); messaging audience: Everyone. Creation alone will not prove send/reply, opt-out, cost or webhook delivery. Product endpoints and those checks belong in the fresh build.

X also provides a Register chat keys dialog. It generates encryption keys, stores the private keys in Juicebox under a user-chosen PIN, and registers public keys with X. This remains unfinished: the computer-use tool requires the owner to enter and submit new authentication credentials. The dialog is open in Chrome. No chat PIN or chat keys have been created by this setup.

## Remaining external setup

- Regular X account/Premium: Chrome currently displays Premium at $8/month and Premium+ at $40/month, billed monthly and automatically renewing. Nothing purchased. Handle Marketplace is on Premium+, not ordinary Premium; the new account must also satisfy X's age/activity requirements. Account creation is waiting for the owner's chosen email, and the subscription target is unconfirmed.
- X Ads: Oparax Ads project exists on Ads Starter, MCP-only, with no connected apps. The x-ads MCP server is registered in Codex and Claude Code; authorization remains unverified. Codex previously rejected the provider's OAuth origin metadata. No campaign has been launched.
- Payments: Stripe is the proposed provider in exp1.md. Merchant readiness, product/price creation and credentials are not verified. Integration and webhook delivery require the new application endpoints.
- PostHog: the experiment's event contract is in exp1.md. Project access, dashboards and live instrumentation still need verification for the fresh build.
- Runtime/source providers: retain account access and verify required project configuration before build. The reset does not establish that model routes, retrieval, scheduling or source permissions are ready.

Keep credentials in secret stores. Add verified IDs, permissions and remaining dependencies here, never credential values.
