---
name: restart
description: Serve again whatever was being served at the end of the last session, on the same port, and say which pages the owner was looking at. Use when the owner invokes /restart, or says he is restarting work, starting the day, or asks to "trigger the serve again" or "serve the same page". Never guesses between the product app and the design lab; it reads the record.
---

# Restart

The owner shuts his machine down between days. Every morning the same question came up: is it the product app (`pnpm dev` at the repo root) or the design lab (the built site under `scratch/design-recovery`) that has to be served on port 3000? This skill answers it from a record, not from memory.

## The record

`.claude/last-served.json` at the repo root, one object, written by this skill (and by whoever serves something new) every time something is served:

```json
{
  "target": "lab" | "product",
  "port": 3000,
  "started": "<ISO time>",
  "pages": ["<the addresses the owner was looking at, most important first>"],
  "note": "<one line: what those pages are, in the owner's words where possible>"
}
```

It is operational state, not notes: it holds addresses and one line, nothing about plans or progress.

## Steps

1. **Read the record.** If `.claude/last-served.json` is missing, fall back to the evidence: `scratch/design-recovery/server.pid` or a `server.log` newer than any product dev log means the lab; otherwise the product. Say which rule decided.
2. **Check the port.** `lsof -nP -iTCP:<port> -sTCP:LISTEN`. If something listens, read its command line (`ps -p <pid> -o command=`). If it is already the recorded target, do not restart it; go to step 5. If it is the other target, stop it by PID (never `pkill -f "next start"`, which misses the lab's `next-server`), then continue.
3. **Serve the target.**
   - Lab: `scratch/design-recovery/site/build/BUILD_ID` must exist; if it does not, run `pnpm build` in `scratch/design-recovery/site` first (about 3 minutes). Then `python3 scratch/design-recovery/start-preview.py --port <port>` from the repo root. It refuses a busy port by design.
   - Product: `pnpm dev` at the repo root, in the background, on the recorded port.
4. **Verify.** `curl -s -o /dev/null -w "%{http_code}"` on the first recorded page; 200 or 307 means up. If not, read the tail of the server log and say what is wrong instead of retrying blindly.
5. **Update the record** with the new `started` time (keep `pages` and `note` unless the owner names new pages).
6. **Report in two or three lines:** what is served and on which port, the recorded pages as plain links, and the note. Nothing else. Never open a browser tab or pane (owner rule: browsers stay in the background; he opens pages himself).

## Rules

- One server on the port. The lab and the product never share it.
- The record changes only when something is served or the owner names the pages he is on.
- No em dashes.
