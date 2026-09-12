# Authentication email setup

Verified September 11, 2026 (Pacific), for Supabase project `pcgvpypzfwuchyfwdlwe`.

## Saved settings

- Email login, signup and email confirmation enabled; anonymous sign-in disabled.
- SMTP host `smtp.gmail.com`, port `465`.
- SMTP username **farzan@oparax.ai**, authenticated with the owner's Google app password.
- Sender **Oparax <no-reply@oparax.ai>**.
- Minimum interval per user: 30 seconds.
- Site URL: `https://oparax.ai`.
- Allowed redirects: `http://127.0.0.1:3000/**`, `http://localhost:3000/**`, `https://oparax.ai/**`.

`no-reply@oparax.ai` is an alias of the real Workspace mailbox, not a separate login. The alias is confirmed for sending. During verification the saved SMTP username was found to be the alias; it was corrected to `farzan@oparax.ai` and saved successfully.

## Proof and remaining boundary

An owner-authorized Supabase recovery email arrived in Spark at 19:03 Pacific, message **2769**, subject **Oparax Reset Password**, from **Oparax <no-reply@oparax.ai>** to the owner. This proves SMTP delivery with the intended sender. No owner password was changed. The reset link was not used to complete the application recovery journey.

Recheck signup, recovery and their final destinations when the fresh app is deployed. The legacy production app is paused during the reset, so email delivery alone must not be labeled a working signup flow.

Google two-step verification and the SMTP app password were set up by the owner. The Basic Memory notes **Oparax Google Workspace login** and **Oparax Supabase SMTP app password** are separate records. Preserve any owner-entered values when updating those notes. No password belongs in the repository.

The Supabase dashboard displays a quota warning: requests may stop when allowance is exhausted. Check actual remaining quota before bringing experiment users in. No plan upgrade was performed by this cleanup.
