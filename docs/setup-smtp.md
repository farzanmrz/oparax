# SMTP setup handoff

September 11, 2026.

## Current Supabase auth configuration

The production Supabase project is `pcgvpypzfwuchyfwdlwe`.

- Email sign-in is enabled.
- New user signup is enabled.
- Email confirmation is enabled.
- Anonymous sign-in is disabled.
- Custom SMTP is enabled. The owner entered the Google app password, and the in-app browser confirmed “Successfully updated settings” after saving.
- Standard authentication templates are present. Security-notification templates were disabled and were left unchanged.

## Intended SMTP configuration

Use the existing Google Workspace mailbox as the SMTP login. The `no-reply@oparax.ai` address is the visible sender alias, not the SMTP username.

- Sender address: `no-reply@oparax.ai`
- Sender name: `Oparax AI`
- Host: `smtp.gmail.com`
- Port: `465`
- Username: `farzan@oparax.ai`
- Password: a new Google App Password for `farzan@oparax.ai`
- Minimum interval per user: leave at the Supabase default of 30 seconds unless an explicit product requirement changes it.

Google documents `smtp.gmail.com` with SSL on port 465, and the full Workspace address as the username. Supabase uses basic SMTP credentials, so it cannot use the sender alias as a separate login.

## Remaining verification

1. Confirm the `no-reply@oparax.ai` alias exists on the `farzan@oparax.ai` Workspace mailbox and can be used as the sender.
2. Verify the Supabase site URL, allowed authentication redirect URLs, and email links match the application.
3. Send one owner-authorized authentication email to the owner. Confirm arrival, displayed sender, and the intended link destination. SMTP settings saving successfully does not prove delivery. Do not reset the owner's password as part of this check.

Google 2-Step Verification and app-password creation are complete. No password values belong in this document or source control.

## Browser status

Settings were saved through the Codex in-app browser. Only that browser may be used for this setup; Chrome is reserved for the owner.

The dashboard also displays a quota warning stating that projects will not serve requests once the quota is exhausted. Review billing and remaining quota before opening the experiment to users.
