---
name: restart
description: Serve again whatever was being served at the end of the last session (the design lab or the product app), on the same port, and list the pages the owner was looking at. Owner-invoked only (/restart). One script decides from the record file; no judgment, no browser.
disable-model-invocation: true
allowed-tools: Bash(bash .claude/scripts/restart.sh*)
# haiku: the whole skill is one script and a relay of its output.
model: haiku
---

# Restart

Run exactly this, then relay its output to the owner word for word, as plain links, with nothing added:

```bash
bash .claude/scripts/restart.sh
```

The script reads `.claude/last-served.json` (target, port, pages, note), checks the port, stops only a server of the other kind, serves the recorded target (building the lab first if it has no build), verifies one page, stamps the record and prints the pages. If it exits with a message that a page is not answering, relay that message and stop; do not retry or start anything else.

The record changes only when something is served or the owner names the pages he is on. Whoever serves something new rewrites it.
