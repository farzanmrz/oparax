---
name: x-check
description: Explicitly invoked Oparax workflow for checking whether queued X accounts can receive DMs, including rechecking previously unavailable accounts. Never invoke implicitly.
---

# X-check

Use only when Farzan explicitly invokes `$x-check`.

- Default invocation processes `c_new` records.
- If the invocation says `recheck unavailable`, process `x_unav` records instead.
- Delegate the complete browser workflow to the project custom agent `x_checker`.
- Tell the agent the selected mode and wait for its final report.
- Do not perform browser work in the parent session, do not send messages, and do not start another X worker.
- Return checked handles, resulting states, any stop reason, and the remaining count for the selected queue.
