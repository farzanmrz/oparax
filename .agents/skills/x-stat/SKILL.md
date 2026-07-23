---
name: x-stat
description: Explicitly invoked deterministic status report for the Oparax outreach record store. Never invoke implicitly.
---

# X-stat

Use only when Farzan explicitly invokes `$x-stat`.

Run:

```bash
rtk python3 .codex/outreach/outreach.py status
```

Return the program output verbatim. This workflow is read-only: do not run the record-sync helper or perform any Git action. Do not open a browser, delegate to an agent, recount records, or add inferred metrics.
