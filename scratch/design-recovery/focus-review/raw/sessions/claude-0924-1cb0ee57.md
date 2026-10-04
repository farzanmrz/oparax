# claude session 1cb0ee57-ee6e-4a66-b96f-b82221d52d8b (0924) cwd /Users/farzanm4/Desktop/repos/oparax

## 2026-08-19T00:22:03.589Z

<command-message>amend</command-message>
<command-name>/amend</command-name>
<command-args>Amend unshipped issue #124. This is an evolution of the feature’s intended behavior based on live PostHog verification after QC.
Do not restart discovery from scratch. Use the established findings and implementation map below, inspect the named code, validate the likely delta against the installed `posthog-js` version, and revise issue #124’s plan accordingly.
1. Updated product intent
The owner wants passive behavior visibility across the entire website without adding custom analytics events in this round.
Session Replay should cover:

* Anonymous visitors on the landing page.
* Login, sign-up, forgot-password, confirmation, and password-reset pages.
* Signed-in product pages.
* The transition from an anonymous visitor to an identified account after sign-in.

The purpose is to watch what visitors experience when pages, navigation, or forms behave unexpectedly. Automatic page views, clicks, scrolling, replay, console output, browser errors, browser and device context, screen information, and approximate geographic context are sufficient.
Ordinary text and form inputs, including email fields, may be visible. Password characters must remain hidden. One-time confirmation and password-reset tokens must never reach PostHog through captured URLs.
Raw network request and response bodies or headers are not required for this goal. Browser, device, operating-system, screen, and GeoIP information are automatic PostHog event context and are separate from network-payload capture.
2. Live PostHog findings already established
These were verified through the connected PostHog MCP against project `563049`:

* Product events work: Localhost page views reach PostHog.
* Identity works: An anonymous browser identity is joined to `testuser@oparax.ai` through the existing identification flow.
* Error Tracking works: Project exception autocapture is enabled, and recent page views contain `$exception_capture_enabled_server_side = true`.
* Replay project setting is on: `session_recording_opt_in = true`.
* Replay sampling is complete: `session_recording_sample_rate = "1.00"`.
* No duration threshold: `session_recording_minimum_duration_milliseconds = 0`.
* No replay conditions: There is no linked flag, URL trigger, event trigger, trigger group, URL blocklist, or recording-domain restriction.
* Supporting capture is enabled: Console capture, performance capture, Web Vitals, heatmaps, dead clicks, canvas recording, and network recording are enabled at the project level.
* Replay still fails: Every recent localhost event queried through PostHog reports `$recording_status = "disabled"`.
* No recordings exist: The PostHog recording-list query returns zero recordings.
* Dashboard state is not the blocker: The live dashboard and MCP agree that “Record user sessions” is enabled.

Do not spend the planning stage rechecking whether the PostHog project is connected, whether Error Tracking is enabled, or whether the Replay dashboard toggle is on. Those questions are resolved.
3. Existing implementation map
The relevant behavior has already been narrowed to these files.
3.1 PostHog initialization
lib/observability/posthog-client.ts
Current behavior:

* Defines `AUTH_PATHS` for `/login`, `/signup`, `/forgot-password`, `/auth/reset-password`, and `/auth/confirm`.
* Exports `isAuthPath()`.
* Initializes PostHog with `capture_exceptions: true`.
* Uses `capture_pageview: "history_change"`.
* Initializes with `disable_session_recording: true`.
* Uses `before_send` to return `null` for every event produced while the browser is on an auth path.
* Uses local-storage persistence.
* Configures ordinary text and inputs as visible.
* Explicitly keeps password inputs masked.
* Explicitly blocks network request and response bodies and headers.

3.2 Browser entry point
instrumentation-client.ts
Current behavior:

* Calls `initPostHog()` only when the initial pathname is not an auth path.
* Therefore PostHog is never initialized when a browser directly loads an auth page.

3.3 Signed-in identity and recording lifecycle
components/posthog-user-context.tsx
Current behavior:

* Runs only inside the signed-in product shell.
* Calls `initPostHog()`.
* Calls `posthog.startSessionRecording()`.
* Calls `posthog.identify(id, { email })`.
* On cleanup, calls `posthog.stopSessionRecording()` and `posthog.reset()`.

This component currently makes the signed-in shell responsible for starting and stopping Session Replay.
3.4 Signed-in mount point
app/agents/layout.tsx
Current behavior:

* Mounts `PostHogUserContext` after the reporter is signed in.
* Anonymous landing and auth pages never mount this component.

3.5 Root error capture
app/global-error.tsx
Current behavior:

* Initializes PostHog only when the current path is not an auth path.
* Explicitly reports root errors after initialization.

4. Likely minimal implementation delta
Treat this as the leading implementation hypothesis, not an instruction to copy blindly. Validate it against the installed `posthog-js` types and runtime behavior.

1. Initialize globally: Let the browser entry point initialize PostHog on every page rather than skipping auth paths.
2. Record globally: Start Session Replay as part of global initialization instead of initializing it disabled and relying on the signed-in shell to turn it on.
3. Stop dropping auth activity: Replace the auth-path `before_send` rejection with URL sanitization rather than returning `null`.
4. Separate identity from recording: Keep `PostHogUserContext` responsible for `identify()` and `reset()`, but remove its responsibility for starting and stopping the global recorder.
5. Preserve identity joining: Anonymous activity before login must remain associated with the same browser identity and become connected to the account when `identify()` runs.
6. Preserve password masking: Keep password inputs masked while ordinary inputs remain visible.
7. Sanitize auth URLs: Strip query strings and fragments from auth-page URLs before PostHog receives them. This must cover both analytics event URLs and URLs embedded in Session Replay snapshots.
8. Keep payload restrictions: Raw network bodies and headers remain blocked in application configuration because they are not needed for this behavior-analysis outcome.
9. Keep missing-key tolerance: The app must still work normally when the PostHog project token is absent.
10. Keep auth functional: No PostHog failure may block login, sign-up, confirmation, forgot-password, or password-reset behavior.

The planning stage should verify the exact installed SDK option or callback required to sanitize URLs in replay snapshots. PostHog’s current documentation identifies `maskCapturedNetworkRequestFn` as also applying to the page URL stored in replay snapshots, but the installed SDK types are the source of truth.
5. Required outcome
After the amendment:

1. A new anonymous visitor entering through the landing page produces a playable replay.
2. The replay continues through landing, auth, and signed-in pages without being stopped at layout boundaries.
3. Signing in connects the anonymous journey to `testuser@oparax.ai`.
4. Landing and auth interactions are visible without custom application events.
5. Ordinary inputs can be understood in the replay.
6. Password characters are not visible.
7. Confirmation and reset tokens do not appear in event URLs, replay URLs, or captured network URLs.
8. Browser, operating system, device, screen, and available GeoIP context appear automatically.
9. Browser errors and console context remain available beside the replay.
10. Recent events report Replay as active or otherwise successfully recording rather than disabled.
11. The PostHog MCP recording-list query returns a playable recording.

6. Acceptance evidence
The revised plan should include a plain owner journey and technical proof covering:

* Start from a fresh anonymous browser identity.
* Visit the landing page.
* Visit login, sign-up, and forgot-password pages.
* Exercise a reset URL containing a recognizable fake query token and prove that token never appears in PostHog.
* Sign in as `testuser@oparax.ai`.
* Navigate through the feed, a desk, and its voice page.
* Confirm PostHog shows one continuous replay across the anonymous and identified journey.
* Confirm the recording becomes associated with `testuser@oparax.ai`.
* Confirm ordinary text is visible and password characters are hidden.
* Confirm the event’s replay diagnostics no longer report `disabled`.
* Confirm the app still boots without a PostHog token.
* Confirm Error Tracking remains enabled.

7. Planning request
Revise issue #124’s plain plan and detailed build plan with this updated behavior.
Use the established findings and named files to avoid repeating solved discovery. Validate the likely implementation delta against the current code and installed SDK, then choose the smallest coherent implementation.
No new user-facing screen, design work, custom event taxonomy, or hand-authored auth funnel is requested.
Because this changes the behavior approved by the previous QC rounds, the amended implementation must be built and reviewed again before `/ship 124`.</command-args>

## 2026-08-19T00:53:53.660Z

[Request interrupted by user]

