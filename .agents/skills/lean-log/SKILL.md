---
name: lean-log
description: Explicitly invoked Oparax workflow for logging X-contacted reporters into the fixed LeanSpark experiment. Never invoke implicitly.
---

# Lean-log

Use only when Farzan explicitly invokes `$lean-log`.

- Delegate the complete browser workflow to the project custom agent `lean_logger`.
- Wait for its final report.
- Never open X or alter reply, booking, or interview controls.
- On an unrecognized LeanSpark page or result, require the worker to stop, preserve the record, capture a screenshot, and report what changed.
- Return logged handles, the stopping reason, and the remaining `x_done` count.
