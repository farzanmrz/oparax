---
name: x-recheck
description: Explicitly invoked Oparax workflow for rechecking every previously unavailable X account and resolving it as available or invalid. Never invoke implicitly and never use for new-contact checks.
---

# X-recheck

Use only when Farzan explicitly invokes `$x-recheck`.

Perform the complete workflow inline in the current task. Never delegate it, create a goal, or start a subagent. Use only the Codex in-app Browser and `.codex/outreach/outreach.py`. Never send a message.

Open the X New message modal once and keep it open for the entire run. Never click or select a search result and never navigate into a conversation.

Run the whole queue in one task turn:

1. Run `rtk python3 .codex/outreach/outreach.py batch recheck` once. If its records array is empty, report completion.
2. Claim the already-open signed-in X tab and open the New message modal once.
3. In one continuous Browser JavaScript execution, loop through every returned record using the same search field. Do not use one Browser tool call per account.
4. For each record, replace the search text with its exact handle and poll for an exact-handle result every 250 milliseconds for up to five seconds. Ignore similar handles.
5. If the exact result is normal-bright and enabled/selectable, append `{handle, outcome: "available", display_name, first_name}` without clicking it.
6. If the exact result is muted/greyed and disabled/unselectable, append `{handle, outcome: "invalid"}` without clicking it.
7. If no exact result appears after five seconds, including when X still shows only loading skeletons, append `{handle, outcome: "invalid"}` and continue to the next record.
8. Return the complete results array from that single Browser execution, encode its JSON as base64 in the task runtime, and run `rtk python3 .codex/outreach/outreach.py apply-check-batch recheck <base64-payload>` exactly once.

Do not create a goal, subagent, parallel worker, or per-account shell/browser loop. Do not split a complete queue into arbitrary batches.

Stop immediately without changing the unapplied batch on logout, X warning, rate limit, changed UI, closed New message modal, recipient mismatch, or another genuine browser failure. Do not open LeanSpark.

Before reporting, run `rtk python3 .codex/outreach/outreach.py count recheck`. Return rechecked handles, resulting states, any stop reason, and that exact global remaining count.
