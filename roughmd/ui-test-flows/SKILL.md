---
name: ui-test-flows
description: Library of validated UI test flows for the Oparax Next.js app. Each flow under `references/` is a deterministic, reproducible sequence of agent-browser commands that exercises one user behavior (signup form rendering, signin → dashboard, create-workflow navigation, settings page, etc.). Flows are drafted by the `ui-test-creator` subagent and executed by a separate runner subagent. Use this skill to enumerate, read, or run pre-existing flows.
when_to_use: Trigger when the user asks to run a specific UI flow ("run the signin flow"), list existing flows ("what flows do we have"), or reference a specific flow by name. Drafting a brand-new flow goes through the `ui-test-creator` subagent, not this skill directly.
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*), Bash(pnpm:*), Bash(lsof:*), Bash(kill:*), Bash(curl:*), Bash(mkdir:*)
model: inherit
---

# ui-test-flows

A library of validated UI test flows for the Oparax web app. Each file under `references/` is a self-contained, deterministic script for exercising one user behavior — signup, signin, create-workflow, settings, etc.

There's no top-level orchestrator. Flows are independent and can be run individually or as a suite.

## Shared environment (applies to every flow)

- **App URL**: `http://localhost:3000` (Next.js dev server)
- **Browser**: `agent-browser` CLI, default **headless**
- **Test credentials**: `testuser@oparax.com` / `hello123` (this account exists in the local Supabase — do not invent new credentials per flow)
- **Output paths**:
  - Screenshots → `./test-screenshots/<flow-name>/<NN>-<descriptor>.png`
  - Reports → `./test-reports/<flow-name>-$(date +%s).md` (suite runs only)

## Pre-flow setup (run before every flow)

```bash
lsof -ti:3000 | xargs -r kill -9 2>/dev/null
sleep 0.3
mkdir -p ./test-screenshots/<flow-name>
pnpm dev >/tmp/oparax-dev.log 2>&1 &
echo $! > /tmp/oparax-dev.pid
until curl -sf http://localhost:3000 -o /dev/null 2>&1; do sleep 0.5; done
```

## Post-flow cleanup (run after every flow, even on failure)

```bash
agent-browser close --all 2>/dev/null
[[ -f /tmp/oparax-dev.pid ]] && kill -9 "$(cat /tmp/oparax-dev.pid)" 2>/dev/null
rm -f /tmp/oparax-dev.pid
lsof -ti:3000 | xargs -r kill -9 2>/dev/null
```

## Flow file format

Every flow under `references/` follows the same structure:

```markdown
# Flow: <name>

## Goal
<one sentence — what user behavior is validated>

## Preconditions
- <DB state, auth state, prior flows that must run first if any>

## Steps
1. **<step name>** — <action>
   - `agent-browser <command>` (one or more)
   - Screenshot: `./test-screenshots/<flow-name>/<NN>-<descriptor>.png` (with `--annotate`)
   - Refs to identify: `<role-based description, not hard-coded @eN>`
2. ...

## Expected end state
- URL: `<final URL>`
- Visible elements: `<what confirms success>`

## Failure modes to flag
- <known regressions>
- <console error patterns that indicate real bugs vs. expected noise>
```

Refs are described by **role** ("the email input", "the submit button"), not by `@e3`. Refs vary per render, so hard-coded numbers would break flows on the slightest DOM change.

## How to run a flow (for the runner subagent / human)

1. Read `references/<flow-name>.md`.
2. Run the pre-flow setup above.
3. Execute the steps in order. After every page-changing action: `agent-browser snapshot -i` before any new ref-based action (refs go stale on page change — non-negotiable).
4. Capture screenshots with `--annotate` so labels map back to refs.
5. Run `agent-browser errors` and `agent-browser console` at least once per flow.
6. Compare actual outcomes against the "Expected end state" section.
7. Run the post-flow cleanup, even if the flow failed.

## How new flows get added

The `ui-test-creator` subagent drafts new flows from natural-language descriptions, validates them by running once headed (user watches) then once headless (no window), and only writes the file to `references/<name>.md` after both runs pass. Don't hand-write flow files — let the creator agent produce them so they're guaranteed to actually run on the live app.

## Currently in this library

(Empty — to be populated by the `ui-test-creator` subagent.)
