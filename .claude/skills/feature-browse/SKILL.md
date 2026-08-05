---
name: feature-browse
description: >-
  Optional QC step, hop-anywhere and OWNER-TRIGGERED ONLY: drive the current
  ft branch's rendered surfaces in the built-in browser against a checklist
  derived from the issue (plan states, NOT VERIFIABLE lines, manual-check
  set), then post a browsed report the next step reads. Use when the user
  says /feature-browse or "run the browser review". Never runs inside
  find/fix/docs/verify or the relay on a session's own judgment.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Bash(lsof *) mcp__Claude_Browser__preview_start mcp__Claude_Browser__preview_stop mcp__Claude_Browser__preview_logs mcp__Claude_Browser__navigate mcp__Claude_Browser__read_page mcp__Claude_Browser__find mcp__Claude_Browser__computer mcp__Claude_Browser__form_input mcp__Claude_Browser__read_console_messages mcp__Claude_Browser__read_network_requests mcp__Claude_Browser__resize_window mcp__Claude_Browser__javascript_tool mcp__Claude_Browser__tabs_context
model: inherit
---

# Browse: checklist-drive the rendered app, report, stop

The owner invoking this skill IS the explicit browser authorization the QC
hard rule requires; the settings ask-gate may still prompt once and the owner
approving it is expected, not an error.

## Dials (per harness)

| | Claude Code | Codex |
|---|---|---|
| Session dial | sonnet (mechanical checklist-driving, not judgment) | `gpt-5.6-terra` |
| Browser | the in-app Browser pane (`mcp__Claude_Browser__*`) | the harness's own browser surface if this install provides one; if it does not, STOP and report BLOCKED-harness with the instruction to run /feature-browse in Claude Code instead. Never substitute agent-browser or a hand-rolled driver. |

## 1. Derive the checklist (durable state only)

Read the ft issue:

```bash
gh issue view <N> --comments
```

* **Sources, in order:** the plan's observable-states table, the latest
  `verified` report's manual-check set, any `NOT VERIFIABLE:` lines from the
  design critic, and open owner findings.
* **Split every item:** BROWSER-CHECKABLE (reachable by driving the UI with
  the test login) vs HUMAN-ONLY (real posting, anything on the owner's own
  accounts, taste/feel judgments). HUMAN-ONLY items are listed in the report
  untouched, never attempted.
* **Always include the mechanics** even if no source names them: initial
  render at 375x812, pagination to exhaustion (scroll until the list ends;
  count pages; duplicates or a premature stop are findings), every filter
  narrowing server-side, search, one full auto-refresh cycle with 2+ pages
  loaded (scroll position, no duplicates/drops), each card state present in
  data, dialogs open/close, console errors.

## 2. Boot and log in

* **Server:** reuse a listening :3000 (`lsof -i :3000 -sTCP:LISTEN -t`) or
  start `pnpm dev` in the background and record the PID.
* **Browser:** open the pane at `http://localhost:3000`, log in with the
  test account (`testuser@oparax.ai` / `hello123`, pre-authorized in
  AGENTS.md), set viewport 375x812.

## 3. Drive the checklist

* **Text assertions over pixels:** `read_page` / `find` / console and
  network reads are the evidence of record; screenshots only where a claim
  is inherently visual (one per such item, never per step). No GIFs, no
  videos, no exploratory wandering off the checklist.
* **HARD RULE, never violated:** never confirm a post to X, never submit
  anything that leaves the machine, never edit files, never touch
  non-localhost origins. A checklist item that would require it is
  HUMAN-ONLY by definition.
* **Per item:** record PASS / FAIL / BLOCKED with one line of evidence
  (element text, count, console line). A FAIL is written as a
  fix-ready brief: what was done, what happened, what was expected, suspect
  file if obvious.

## 4. Report and stop

* **Teardown:** stop the dev server only if THIS session started it.
* **Post the report** as an issue comment, then STOP with the relay handoff
  (failures: next is `/feature-fix` on sonnet / `$feature-fix` on
  `gpt-5.6-terra`; clean: next is `/feature-verify` on the smart dial):

<browsed-comment-template>
## QC round <R>: browsed

Checked at <viewport>, test login, <n> items.

| Item | Verdict | Evidence |
| --- | --- | --- |

Failures (fix-ready briefs): ...
Remaining HUMAN-ONLY items: ...
</browsed-comment-template>

* **The manual-check handoff:** the report's HUMAN-ONLY list REPLACES the
  owner's previous manual-check set; everything browser-checked here is off
  the owner's plate, and the next `verified` report cites this comment
  instead of re-listing covered items.
