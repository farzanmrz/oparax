# Flow: login

## Goal
Verify the `/login` surface in both directions: invalid credentials show the
mapped error and keep the user on `/login`; valid credentials sign the user in
and land them on the `/dashboard` shell.

## Preconditions
- Local dev server runs on `http://localhost:3000` (started by the pre-flow
  setup below — do not assume it is already up).
- The Supabase project linked via `.env.local` already has the test user
  `testuser@oparax.com` / `hello123`. If sign-in unexpectedly fails, surface
  that as a blocker — do not create the user from this flow.
- No prior flow needs to have run.

## Pre-flow setup (run before every execution)

```bash
lsof -ti:3000 | xargs -r kill -9 2>/dev/null
sleep 0.3
mkdir -p ./test-screenshots/login
pnpm dev >/tmp/oparax-dev.log 2>&1 &
echo $! > /tmp/oparax-dev.pid
until curl -sf http://localhost:3000 -o /dev/null 2>&1; do sleep 0.5; done
```

## Steps

### Scenario 1 — Invalid credentials (negative path)

1. **Open the login page** — fresh navigation, no prior auth state.
   - `agent-browser open http://localhost:3000/login`
     (append `--headed` to watch in a visible window).
   - Refs to identify after the next snapshot:
     - the email input (textbox labelled "Email", required)
     - the password input (textbox labelled "Password", required)
     - the "Sign in" submit button
     - the heading "Welcome back" (sanity landmark)

2. **Snapshot interactives** — confirm the form rendered.
   - `agent-browser snapshot -i`
   - Expect: heading "Welcome back", textbox "Email", textbox "Password",
     button "Sign in" (plus three OAuth provider buttons and a "Sign up" link).

3. **Fill invalid credentials.** Both fields are intentionally wrong; this
   flow chooses to make the email a non-existent valid-format address and
   the password an arbitrary string. Either alone would trigger the error,
   but both wrong keeps the test deterministic.
   - `agent-browser fill <email-input-ref> "wrong@oparax.com"`
   - `agent-browser fill <password-input-ref> "wrongpass"`
   - Screenshot: `./test-screenshots/login/01-scenario1-filled.png`
     (`agent-browser screenshot ... --annotate`)

4. **Submit and wait for the server-action redirect.** The login server
   action redirects to `/login?error=...` on failure rather than rendering
   inline, so wait for the URL — do not wait on `@ref` (refs go stale on
   page change).
   - `agent-browser click <sign-in-button-ref>`
   - `agent-browser wait --url "**/login?error=*"` (or
     `agent-browser wait --text "Invalid email or password."`)

5. **Verify error UI.**
   - `agent-browser get url` → must contain `localhost:3000/login` and
     `error=Invalid%20email%20or%20password.` (URL-encoded). The path
     component must still be `/login` (no navigation away from the surface).
   - `agent-browser snapshot` (full content tree, not `-i`) must include an
     `alert` node whose StaticText is exactly:
     `Invalid email or password.`
   - Screenshot: `./test-screenshots/login/02-scenario1-error.png`
     (`--annotate`).

### Scenario 2 — Valid credentials (positive path)

6. **Re-navigate to a clean `/login`.** This flow chooses re-navigation over
   refilling the existing form because (a) it clears the `?error=...`
   querystring, and (b) the inputs after a server-action redirect are
   sometimes pre-populated by the browser; re-navigating gives a
   deterministic blank slate.
   - `agent-browser open http://localhost:3000/login`
   - `agent-browser snapshot -i` — confirm the form rendered fresh and there
     is no `alert` node in `agent-browser snapshot` output.

7. **Fill valid credentials.**
   - `agent-browser fill <email-input-ref> "testuser@oparax.com"`
   - `agent-browser fill <password-input-ref> "hello123"`
   - Screenshot: `./test-screenshots/login/03-scenario2-filled.png`
     (`--annotate`).

8. **Submit and wait for the dashboard.**
   - `agent-browser click <sign-in-button-ref>`
   - `agent-browser wait --url "**/dashboard"`
   - `agent-browser wait --load networkidle` (sidebar shell hydrates after
     the navigation completes — this avoids a flaky empty snapshot).

9. **Verify the dashboard shell.**
   - `agent-browser get url` → ends with `/dashboard` (no querystring).
   - `agent-browser snapshot -i` must include all of:
     - the "O Oparax" sidebar logo link
     - the "Workflows" sidebar nav link
     - the "Settings" sidebar nav link
     - a user-menu button whose label contains `testuser@oparax.com`
     - a `breadcrumb` navigation region containing a "Dashboard" link
     - heading "Workflows" (the dashboard landing page renders the
       workflow list)
   - Screenshot: `./test-screenshots/login/04-scenario2-dashboard.png`
     (`--annotate`).

10. **Capture console state.**
    - `agent-browser errors` — must be empty (no JS errors / unhandled
      rejections / failed network requests).
    - `agent-browser console` — log for the report; expected dev-mode noise
      listed under "Failure modes" below is OK.

## Expected end state

- Final URL: `http://localhost:3000/dashboard`
- Visible elements that confirm success:
  - Sidebar links: "O Oparax", "Workflows", "Settings"
  - User-menu button label includes `testuser@oparax.com`
  - Breadcrumb region with a "Dashboard" link
  - Heading "Workflows" rendered as the dashboard landing content
- Scenario 1 confirmation captured earlier:
  - URL still on `/login` with `error=Invalid%20email%20or%20password.`
  - `alert` node present with StaticText `Invalid email or password.`

## Expected error copy (for diffing on regressions)

Scenario 1 alert text, exact match:
```
Invalid email or password.
```
Sourced from `lib/auth-errors.ts` — Supabase's `Invalid login credentials`
and `Email not confirmed` are both mapped to this single string to prevent
email enumeration. If the page renders different copy ("Invalid
credentials", "Wrong password", raw Supabase text), the mapping has
regressed.

## Failure modes to flag

- **Scenario 1 redirect didn't happen** — URL changes to anything other than
  `/login?error=...` after submit. Likely a regression in
  `app/login/actions.ts` or `lib/auth-errors.ts`.
- **Scenario 1 alert missing** — server action redirected with the error
  querystring but `LoginForm` did not render the `role="alert"` div. Check
  `components/login-form.tsx` `error` prop wiring.
- **Scenario 1 wrong copy** — alert exists but text differs from
  `Invalid email or password.`. Either `mapAuthError` changed or Supabase
  started returning an unmapped error key — both worth flagging, neither
  should silently pass.
- **Scenario 2 stuck on `/login`** — valid creds rejected. Most likely the
  test user doesn't exist in the connected Supabase project (or its email
  is unconfirmed, which `mapAuthError` collapses to the same generic error).
  Surface as a blocker, do not create the user from this flow.
- **Scenario 2 lands on `/dashboard` but the shell is missing** — sidebar
  links / user-menu absent. Check `app/dashboard/layout.tsx` auth guard
  (the layout might be rendering a redirect/empty state) or
  `components/app-sidebar.tsx`.
- **Console noise considered OK** (do not flag): `[HMR] connected`, the
  React DevTools download hint (`Download the React DevTools...`), Vercel
  Web Analytics / Speed Insights debug logs (`[Vercel Web Analytics]`,
  `[Vercel Speed Insights]`), and the LCP image warning for
  `/images/landing_bird.png`. Anything else printed at `[error]` or
  `[warning]` severity is a real signal.

## Post-flow cleanup (run after every execution, even on failure)

```bash
agent-browser close --all 2>/dev/null
[[ -f /tmp/oparax-dev.pid ]] && kill -9 "$(cat /tmp/oparax-dev.pid)" 2>/dev/null
rm -f /tmp/oparax-dev.pid
lsof -ti:3000 | xargs -r kill -9 2>/dev/null
```
