# NOTES — Low-Priority Bugs & Feature Ideas

## Dashboard

- **Workflow detail page (404)** — Clicking a workflow card on the dashboard goes to `/dashboard/workflows/[id]` which returns 404. Needs a detail/expand page showing workflow config, run history, and draft review. (Issue #11)
- **Workflow list as table** — Dashboard currently shows workflows as stacked cards. Should be a proper table with columns (name, status, frequency, handles, last run) for better scanability at scale.

## Skills

- Simplify all editing skills to make wrap-up edit all files and keep git stuff separate from it

## Grok / xAI Experimentation

- **xAI sub-agent** — Create a Claude Code custom agent (`.claude/agents/`) specialized for
  writing xAI Grok code in OpenAI JS SDK format. The agent would have access to the xAI docs
  MCP server and know how to translate Python OpenAI SDK examples to JS. Useful once the
  x_search testing phase is complete and we're building more complex patterns.

- **Streaming implementation** — When real-time output is needed (e.g., showing Grok's
  response appearing word by word in the UI), we'll need `client.responses.create({ stream: true })`.
  This is a separate feature from the standard `async/await` pattern we're using now.
  The `async function main()` wrapper in current scripts is NOT the same as streaming —
  it's just how any API call works in Node.js. Streaming will be its own implementation step.

- **tool_choice observability** — Investigate whether `tool_choice` parameter affects
  server-side tools (x_search, web_search) or only client-side function calling tools.
  Also explore `server_side_tool_usage_details` in the response for deeper observability
  into which x_search internal strategies (keyword, semantic, user, thread) Grok is picking.
  This matters for understanding and optimizing retrieval quality.

- **x_search date filtering limitation** — `from_date`/`to_date` on the `x_search` tool
  are NOT reliably propagated to all sub-tools. `x_keyword_search` ignores them entirely
  (uses `mode: "Latest"` instead); only `x_semantic_search` picks up `from_date`. System
  prompt instructions help but don't fully enforce it. Needs further investigation — may
  require model-level filtering of results after retrieval.
