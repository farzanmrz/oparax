---
name: lean-log
description: Explicitly invoked Oparax workflow for logging X-contacted reporters into the fixed LeanSpark experiment. Never invoke implicitly.
---

# Lean-log

Use only when Farzan explicitly invokes `$lean-log`.

Perform the complete workflow inline in the current task. Never delegate it or start a subagent. Use only the Codex in-app Browser and `.codex/outreach/outreach.py`. Never open X.

Loop:

1. Run `rtk python3 .codex/outreach/outreach.py next lean`.
2. If the result is `null`, stop normally; the queue is exhausted.
3. Navigate to the `leanspark_url` in `.codex/outreach/config.json`.
4. Require exactly one contact textbox labelled `Name or handle of who you contacted` and exactly one `Log a contact` button.
5. Enter the exact returned contact string and click `Log a contact`.
6. Verify that the exact contact appears as contacted and the field clears, or that another authoritative success signal confirms submission.
7. Only after verification, run `rtk python3 .codex/outreach/outreach.py resolve <handle> l_done` and continue.

Never touch Mark replied, Mark booked, interview, or any other experiment control.

If the URL, authentication, controls, labels, layout, or success behavior does not match these instructions, stop immediately. Do not guess or click an alternative. Leave the record `x_done`, capture a screenshot, and tell Farzan the handle, what was expected, and what changed.

Return logged handles, the stopping reason, and the remaining `x_done` count.
