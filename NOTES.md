# NOTES — Low-Priority Bugs & Feature Ideas

## Dashboard

- **Workflow list as table** — Dashboard currently shows workflows as stacked cards. Should be a proper table with columns (name, status, frequency, handles, last run) for better scanability at scale.

## Skills

- Simplify all editing skills to make wrap-up edit all files and keep git stuff separate from it

## Grok / xAI Experimentation

- **xAI sub-agent** — Create a Claude Code custom agent (`.claude/agents/`) specialized for
  writing xAI Grok code in OpenAI JS SDK format. The agent would have access to the xAI docs
  MCP server and know how to translate Python OpenAI SDK examples to JS. Useful once the
  x_search testing phase is complete and we're building more complex patterns.

- **Streaming reasoning tokens** — Currently we stream Grok's final output text, but the
  "Scanning X accounts..." spinner shows no intermediate progress. Could stream reasoning
  tokens and tool call events to show what Grok is doing (searching, thinking, etc.)
  like grok.com does. Low priority but nice UX improvement.

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

- **Structured output for scan results** — Current approach returns free-form markdown that
  we parse with regex for `[[N]](url)` citations. Should switch to structured JSON output
  (array of headlines, each with tweet IDs). Eliminates regex fragility, handles null results
  cleanly (empty array instead of filler text), and enables relevance filtering at the schema level.

- **Prompt relevance filtering** — `sysprompt_scan` doesn't distinguish between direct news
  about a subject vs. adjacent/fan activity mentioning them. Example: "SRK fan club celebrates
  Veer-Zaara re-release" returned alongside actual SRK news. Prompt needs refinement to
  instruct Grok on relevance thresholds. Also currently Barca-specific in tone — needs
  generalizing for any topic.

- **OpenAI SDK property serialization** — Inline date expressions like
  `new Date(Date.now() - 24*60*60*1000).toISOString().split("T")[0]` passed directly in
  the tools config were silently dropped by the OpenAI SDK. Extracting to named constants
  first fixed it. Be cautious with complex expressions inside SDK request objects.
