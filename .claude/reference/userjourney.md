# Project Handoff

## Recent work

- **Streaming scan** — API route streams Grok response via SSE; frontend reads stream incrementally and shows raw text during loading, full ScanResult with tweet embeds after completion
- **Tweet embeds** — Created `scan-result.tsx` using react-tweet; parses Grok `[[N]](url)` citations, renders X posts as compact embeds in flex-wrap rows
- **Wider layout** — Page widened to `max-w-6xl`; name+frequency in 2-col grid; compact tweet CSS (350px, hidden actions)
- **Date fix** — Fixed `from_date`/`to_date` format to `YYYY-MM-DD` constants (inline expressions were silently dropped by SDK)
- **API route** — `POST /api/scan` with auth guard, input validation, streaming SSE response from Grok x_search

## What's next

Switch Grok scan to structured output (JSON schema with headline+tweet arrays) — eliminates regex parsing, handles null results cleanly, and enables relevance filtering at the schema level. Also refine `sysprompt_scan` to be more generalizable beyond football use case.
