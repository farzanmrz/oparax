---
name: feature-browse
description: >-
  QC step 2 of 5, hop-anywhere and OWNER-TRIGGERED ONLY: after a find round,
  drive the current ft branch's rendered surfaces in the built-in browser
  against a checklist derived from the issue (plan states, NOT VERIFIABLE
  lines, manual-check set), then post the browsed report feature-fix reads
  alongside the findings. Use when the user says /feature-browse or "run the
  browser review". Never runs inside find/fix/docs/verify or the relay on a
  session's own judgment.
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
| Browser | the in-app Browser pane (`mcp__Claude_Browser__*`) | the app's built-in browser (the Browser panel; owner-enabled in Settings > Browser, "control the built-in browser"). If browser control is disabled in this install, STOP and report BLOCKED-harness with the instruction to enable it or run /feature-browse in Claude Code. Never substitute agent-browser or a hand-rolled driver. |

## 1. Derive the checklist (durable state only)

Read the ft issue body (the plan's observable-states table), then ONLY the
QC marker comments — a full `--comments` read is 30k+ tokens, truncates, and
forces re-parsing:

```bash
gh issue view <N>
gh api repos/{owner}/{repo}/issues/<N>/comments --paginate \
  --jq '[.[] | select(.body|startswith("## QC round"))] | .[-6:] | .[].body'
```

* **Sources, in order:** the plan's observable-states table, the latest
  `verified` report's manual-check set, any `NOT VERIFIABLE:` lines from the
  design critic, and open owner findings.
* **Split every item:** BROWSER-CHECKABLE (reachable by driving the UI with
  the test login) vs HUMAN-ONLY (real posting, anything on the owner's own
  accounts, taste/feel judgments). HUMAN-ONLY items are listed in the report
  untouched, never attempted.
* **HUMAN-ONLY applies at the side-effect boundary, never the page:** a flow
  whose submit is off-limits (billed model call, real posting) is still
  driven up to that submit: type into its fields, exercise separator and
  paste chip behavior, trigger inline validation, assert layout at both
  viewports. Only the submit itself is HUMAN-ONLY (classifying the whole
  create-agent form HUMAN-ONLY is how its input shipped broken).
* **Always include the mechanics** even if no source names them: initial
  render, pagination up to 3 pages or the list's end — whichever first
  (count pages; duplicates or a premature stop are findings; when the
  previous round's browsed/findings comment already records this pagination
  FAIL, confirm it with ONE probe and cite that comment instead of
  re-driving to exhaustion), every filter narrowing server-side, search, one
  full auto-refresh cycle with 2+ pages loaded (scroll position, no
  duplicates/drops), each card state present in data, dialogs open/close,
  console errors.
* **Viewports: every round is TWO passes, both mandatory.** The full
  checklist at 1280x800, then a mobile pass at 375x812 over every surface
  the round touches: re-render each page, run the overflow probe below, and
  re-drive any item that is interaction-shaped or involves a mobile-only
  component (e.g. the mobile tab bar). Verdicts are recorded per viewport;
  a desktop-only report is an incomplete round, not a smaller one.
* **Assert the viewport explicitly at each pass start AND after any tab
  recreation or server restart.** Tab defaults are not stable (a post-crash
  recovery tab once defaulted to 415x736 and tainted every finding after
  it). A mobile-pass failure is a finding like any other: viewport noise is
  ruled out by the assertion, never by skipping the pass.
* **Overflow probe, every checked page, both passes:**

```javascript
document.documentElement.scrollWidth > document.documentElement.clientWidth
```

  `true` is an automatic FAIL for that page: some element widens the
  document and the whole page pans horizontally on phones.

## 2. Boot and log in

* **Server:** reuse a listening :3000 (`lsof -i :3000 -sTCP:LISTEN -t`) or
  start `pnpm dev` in the background and record the PID. A reused server is
  not owned by this session; if the server dies mid-run, restart it once and
  re-assert the viewport before continuing (the 2026-08-06 crash cascade —
  server death, recovery tab, tainted findings — came from skipping the
  re-assert).
* **Browser:** open the pane at `http://localhost:3000`, log in with the
  test account (`testuser@oparax.ai` / `hello123`, pre-authorized in
  AGENTS.md). Set the viewport per the phase-1 rule (1280x800 first, the
  375x812 mobile pass after).

## 3. Drive the checklist

* **Text assertions over pixels:** `read_page` / `find` / console and
  network reads are the evidence of record; screenshots only where a claim
  is inherently visual (one per such item, never per step). No GIFs, no
  videos, no exploratory wandering off the checklist.
* **HARD RULE, never violated:** never confirm a post to X, never submit
  anything that leaves the machine, never edit files, never touch
  non-localhost origins. A checklist item that would require it is
  HUMAN-ONLY by definition.
* **Stuck clicks (Codex):** if a Playwright click leaves the target
  unchanged (e.g. `aria-expanded` still false) after 2 tries, switch to
  `dom_cua.click` by node id immediately — a Radix menu once ate 6 attempts
  and a selector deadline before the fallback landed on the first try.
* **Per item:** record PASS / FAIL / BLOCKED with one line of evidence
  (element text, count, console line). A FAIL is written as a
  fix-ready brief: what was done, what happened, what was expected, suspect
  file if obvious.

## 4. Report and stop

* **Teardown:** stop the dev server only if THIS session started it.
* **Post the report** as an issue comment, then STOP with the relay
  handoff:

<browsed-comment-template>
## QC round <R>: browsed

Checked at 1280x800 and 375x812, test login, <n> items.

| Item | Verdict | Evidence |
| --- | --- | --- |

Failures (fix-ready briefs): ...
Remaining HUMAN-ONLY items: ...
</browsed-comment-template>

* **The manual-check handoff:** the report's HUMAN-ONLY list REPLACES the
  owner's previous manual-check set; everything browser-checked here is off
  the owner's plate, and the next `verified` report cites this comment
  instead of re-listing covered items.
* **Exit handoff: next is the post-browse relay** — `$feature-qc chain` in
  Codex (`/feature-qc chain` in Claude Code) on the smart dial, which runs
  fix → docs → verify in one session from this round's markers; standalone
  `/feature-fix` remains the hop-anywhere fallback. Never route around fix:
  even a round with zero browse failures usually has accepted findings
  waiting in the findings comment, and judging "nothing to fix" is
  feature-fix's call, not this session's (an empty round gets its fixes
  marker from feature-fix, so verify's guard always has it).
