---
name: x-dm
description: Explicitly invoked Oparax workflow for sending already-prepared X DMs sequentially until the queue ends or X refuses a send. Never invoke implicitly.
---

# X-dm

Use only when Farzan explicitly invokes `$x-dm`. That invocation authorizes sending the exact prepared messages for queued `x_av` records.

Perform the complete workflow inline in the current task. Never delegate it or start a subagent. Use only the Codex in-app Browser and `.codex/outreach/outreach.py`. Keep all X work sequential.

At the start, establish one persistent Codex goal: exhaust the `x_av` queue or stop on a defined X hard-stop. Reuse the active goal on automatic continuation; never create parallel goals or workers. A per-turn runtime boundary is not a stopping condition: leave the goal active and continue from the next `x_av` record automatically. Complete the goal only when `next send` returns `null` or a defined hard-stop is reached.

Loop:

1. Run `rtk python3 .codex/outreach/outreach.py next send`.
2. If the result is `null`, stop normally; the queue is exhausted.
3. In X Messages, start a new message, search the exact returned handle, and select only an exact handle match.
4. If the exact returned message is already visibly present, run `rtk python3 .codex/outreach/outreach.py resolve <handle> x_done` and continue without resending.
5. If the account is greyed out or has no usable composer, run `rtk python3 .codex/outreach/outreach.py resolve <handle> x_unav` and continue.
6. Otherwise, send the exact returned message without changing any character.
7. Count success only after the complete message remains visible and the composer is empty. Then run `rtk python3 .codex/outreach/outreach.py resolve <handle> x_done` and continue.

Hard-stop immediately if X shows `Failed to send message`, `Failed, Try Again`, a warning, rate limit, locked session, changed UI, recipient mismatch, or an unverifiable send. Do not retry, inspect another handle, or update the current record. Tell Farzan that X is refusing sends and identify the unchanged handle.

Do not produce a final response while `next send` returns a record. Do not stop after an arbitrary batch or because one turn reaches its runtime boundary. Continue in the same task until the queue is empty or a hard-stop condition occurs.

Before completing the goal or reporting for any reason, including normal completion, a hard-stop, or a tool/browser failure, run `rtk .codex/outreach/sync-records.sh`. Run it after the last possible `resolve` and before the final count. The helper commits only `.codex/outreach/records.json` with its fixed message and pushes the current branch; never stage, commit, or push any other path. If it fails, report whether the commit was created and the push failed; do not claim the record update is remote.

Then run `rtk python3 .codex/outreach/outreach.py count send`. Never open LeanSpark. Return newly sent handles, unavailable outcomes, the stopping reason, that exact remaining `x_av` count, and the record-sync result.
