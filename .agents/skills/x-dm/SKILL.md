---
name: x-dm
description: Explicitly invoked Oparax workflow for sending already-prepared X DMs sequentially until the queue ends or X refuses a send. Never invoke implicitly.
---

# X-dm

Use only when Farzan explicitly invokes `$x-dm`. That invocation authorizes sending the exact prepared messages for queued `x_av` records.

- Delegate the complete browser workflow to the project custom agent `x_sender`.
- Wait for its final report.
- Never create parallel X workers or send from the parent session.
- If X displays a failed-send message, the worker must stop immediately, leave the record unchanged, and alert Farzan.
- Return newly sent handles, unavailable outcomes, the stopping reason, and the remaining `x_av` count.
