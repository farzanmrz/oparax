---
name: eve-session-review
description: Use when reviewing or debugging a PAST eve agent run/session in this project — reconstruct offline from the local .workflow-data/ store what the agent said, reasoned, called, and got back, with no running server and without knowing the workflow/session id. Triggers include "review that session", "what did the agent do when I asked about crypto", "debug the last run", "why did the scan return nothing", "show me the tool call from that chat".
model: sonnet
---

# Reviewing past eve sessions

eve persists every turn to `.workflow-data/` as durable state. This skill reads
it back into a readable transcript so you can debug agent behavior after the
fact — no live server, and you don't need the workflow id, just a description of
the conversation.

## Use the bundled tool

Run from the **repo root** (where `.workflow-data/` lives):

```bash
# recent runs, newest first — first user message + grok's real invocation count
python3 .claude/skills/eve-session-review/eve_session.py list
python3 .claude/skills/eve-session-review/eve_session.py list --limit 30   # cap the row count

# full transcript, found by a run-id match OR a content substring
python3 .claude/skills/eve-session-review/eve_session.py show crypto
python3 .claude/skills/eve-session-review/eve_session.py show wrun_01KWTVE8   # or an id
python3 .claude/skills/eve-session-review/eve_session.py show --last          # most recent
```

`show <query>`: if the query isn't found inside a run id, it searches the
decoded content of every run (newest first) and picks the newest run that
contains it — so `show crypto` finds the crypto conversation without an id.

## Reading the transcript

Each message prints under `### USER` / `### ASSISTANT` / `### TOOL` in order:

- plain lines = assistant/user text
- `[reasoning]` = the model's private reasoning for that step
- `[tool→] <name> input={…}` = a tool call and its exact arguments
- `[tool←]` = a tool result
- a trailing block reports **Tools invoked** — real per-tool call counts parsed
  from the `tool-call` parts of the history (e.g. `grok_twitter_search ×1`) —
  kept SEPARATE from names only **present in the graph** (enabled/available
  tools and grok's server-side subtools like `x_search`; present ≠ invoked),
  plus all **Source URLs**. Counts are invocations, never string occurrences.

## What the data actually is (so you can extend the tool)

- Each turn is `base64( b"zstd" + <zstd frame> )` of a **devalue**-serialized
  graph (the frame is tagged with a literal `"devl"` prefix inside).
- **User messages** ride in uncompressed control events (grep-able as plaintext).
- **Assistant text, reasoning, and tool calls/results** live in the compressed
  step payloads; every step snapshots the FULL cumulative history, so the richest
  step holds the whole conversation — the tool extracts the longest `history`.
- The decoder (`eve_session.py`) handles base64 → strip `zstd` tag →
  zstd-decompress (python `zstandard` module or the `zstd` CLI) → strip `devl` →
  devalue-unflatten → walk for `history`.

## Gotchas

- One conversation can span several `wrun_*` ids (eve may spawn a workflow run
  per delivered turn). `show <query>` lands on ONE matched run and pulls only
  that run's longest cumulative `history` — usually the whole conversation, but
  turns that landed in a sibling `wrun_*` can be missing. Only root-session
  wruns carry a replayable history; per-turn/subagent wruns don't. If a
  transcript looks truncated, `list` the runs and `show` the neighbours.
- A `[tool←]` line can show `null` when the result object is projected out of the
  part; cross-check the assistant's next message, which presents the tool output.
- Needs `zstd` decompression available: the python `zstandard` module
  (`pip install --user zstandard`) or the `zstd` CLI (`brew install zstd`).

## Native alternatives (prefer when they apply)

This decoder exists because eve ships no way to review a past run offline,
server-less, or by description — no CLI `sessions`/`logs`/`inspect`, no session
listing, no description→id index. When those constraints don't bind, a native
path is cleaner and format-proof:

- **eve stream replay** — with a server up (`pnpm dev` / `eve dev`), hit
  `GET /eve/v1/session/<wrun_id>/stream?startIndex=0` for clean decoded NDJSON
  (messages, reasoning, tool inputs+outputs; no auth locally). The sessionId IS
  the `wrun_` id (see the `x-eve-session-id` response header). Only root-session
  wruns stream — per-turn/subagent wruns block forever — and a parked session
  never EOFs, so stop reading at `session.waiting`/`completed`/`failed`. Prefer
  this when you already know the root sessionId and can boot a server.
- **Vercel Agent Runs** — DEPLOYED runs only: dashboard Observability → Agent
  Runs, or the Vercel MCP `list_agent_runs` / `get_agent_run` /
  `get_agent_run_trace` tools (zero-decode traces with token usage). Unavailable
  until the agent is deployed with channel auth; local `eve dev` runs never
  upload.
- **Live debugging** — for a run happening NOW, eve's TUI renders it live:
  `npx eve dev --tools full --reasoning full --logs all`.

Use this skill for runs that already happened, offline, when all you have is a
description.
