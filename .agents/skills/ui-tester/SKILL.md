---
name: ui-tester
description: Run pre-defined UI/UX flow tests against the local Chirp app using agent-browser. Reports each step as ✅ or ❌ and stops on first failure.
when_to_use: Trigger when the user asks to "test the login flow", "run the UI tests", "check the signup flow", "make sure X still works", or names any flow defined in the Flows section below. Do not trigger for unit-test or backend-test requests.
model: sonnet
effort: low
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*), Bash(lsof:*), Bash(kill:*), Bash(pnpm:*), Bash(curl:*)
---

# UI/UX Tester

See the Flows section for currently testable flows. The General section below applies to all of them.

## General

Preset rules, sequence of actions and/or values that generally apply across any user flow being tested

### Rules

1. ALWAYS use the [`agent-browser`](../agent-browser/SKILL.md) skill to work with the agent-browser CLI for every browser interaction including but not limited to - open, snapshot, click, fill, assert etc.
2. NEVER use any other browser tool besides agent-browser.
3. ALWAYS perform all testing on the oparax website served on the local dev server at `localhost:3000`. If `localhost:3000` has some other process or website running on it then inform user before killing it.
4. Make sure to run your tests in headless mode using the test chrome browser with agent-browser
5. When trying to assert whether a new page has been opened like checking if `http://localhost:3000/dashboard` is the current page after doing login, simply run the command `agent-browser wait -u "<exact-full-url>"` with the full URL and never with pattern matching. So run `agent-browser wait -u "http://localhost:3000/dashboard"` and never patterns like `agent-browser wait --url "**/dashboard"`
6. Never run the following two abstract commands that cause long wait times and always run full URL check as explained in 5. above:
   - Partial pattern wait command: `agent-browser wait --url "**/dashboard"`
   - Get URL command: `agent-browser get url`
7. ALWAYS take annotated screenshots WHEN storing images for user to visually verify. Never take plain screenshots without annotation.
8. If by some chance a wait command is triggered then never wait more than 10 seconds before terminating the process and checking for output.

### Predetermined actions

#### Preflight

These steps always have to be taken anytime this skill is triggered anew for checking UI/UX flows to setup the environment for testing. These steps in this exact order are

1. Close all agent browsers headed or headless: `agent-browser close --all`
2. Kill any pre-existing process on `localhost:3000`: `lsof -ti :3000 | xargs kill -9 2>/dev/null || true`
3. Start the dev server in background: `pnpm dev`
4. Wait for 5 seconds until `http://localhost:3000` responds: `for i in {1..5}; do curl -sf http://localhost:3000 > /dev/null && break; sleep 1; done`
5. Open the app at `http://localhost:3000` using agent-browser CLI in headless mode with the chrome test browser.

If preflight fails, report ❌ with the failing step and stop — do not attempt the flow.

#### Post completion of running all flows

After providing the relevant text and visual output make sure to run these steps after finishing all UI/UX flow tests in a session

1. Close all agent browsers headed or headless: `agent-browser close --all`
2. Stop the dev server: `lsof -ti :3000 | xargs kill -9 2>/dev/null || true`

### Fixed values

Regardless of what flow is being tested always use the following login credentials below to perform initial login needed:

- Email: `testuser@oparax.com`
- Password: `hello123`

### Reporting

#### Visual Output

1. Since the test flows are run in headless mode, take annotated screenshots after every passed step and save them inside the [test_sc/](../../../test_sc/) folder for user evaluation.
2. If user explicitly specifies to run in headed mode then ignore the screenshot instruction above because user can witness everything by themselves.

#### Text Output

For every step in a defined flow, print one line:

- `<flow name>: <step description> - PASS ✅` on success
- `<flow name>: <step description> - FAIL ❌ <what you actually saw>` on failure, then stop further steps in the flow

At the end of each flow, print one of:

- `<flow name>: <passed #steps>/<total steps> - PASS ✅` if all steps passed
- `<flow name>: <passed #steps>/<total steps> - FAIL ❌` if even 1 step failed

Keep step descriptions short — one line each, matching the wording below.

## Flows

Infer which flow to run from the user's request. If ambiguous, ask.

### login

1. Navigate to the login page.
2. Fill in email and password using the test credentials.
3. Click the login button.
4. Confirm the user lands on the authenticated dashboard.
