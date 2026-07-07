# agent/ — the eve agent

Skill: `vercel:eve` FIRST; `vercel:ai-sdk` for model code in a tool's `execute()`; `vercel:ai-gateway` for provider/model routing.

eve compiles this directory; the filenames are eve conventions.

- `agent/agent.ts` — model config (DeepSeek via the AI Gateway).
- `agent/instructions.md` — the chat-orchestrator sysprompt (an eve-native file, not documentation).
- `agent/tools/grok_twitter_search.ts` — the Grok xSearch scan; sysprompt inline. Inputs: beat instructions, handles (≤10, `@ai-sdk/xai` cap), and `fromDate`/`toDate` (ISO `YYYY-MM-DD`) — dates are passed by DeepSeek now, not computed in the tool. Returns its full grok result (text, sources, providerMetadata, usage) for debugging (ft/44).
- Default-tool scoping via `disableTool()` sentinels: `bash`/`read_file`/`write_file`/`glob`/`grep` (shell/FS — security), `web_search` (deferred + ~$5/1k), `todo` (task list — unneeded) are OFF. Enabled defaults: `web_fetch` (user URLs) and `ask_question`. eve has no central disable list — per-file sentinels are the only mechanism, and an enabled default has **no** file (files only disable/override). `load_skill`/`connection_search` aren't present at all (register only if you declare eve skills/connections).
- **The built-in `agent` (subagent) tool can't be disabled and stays ON.** `disableTool()` only validates against the framework-tool registry (`ask_question, bash, glob, grep, load_skill, read_file, todo, web_fetch, web_search, write_file`); `agent` is registered on the separate subagent-lowering path, so `agent/tools/agent.ts` → `disableTool()` throws `"agent" is not a framework tool` at **worker-boot graph resolution**. That crashes the deployed eve worker while `pnpm build` / `eve build` / `eve info` all stay green — it surfaces only when a **session is created**, not at server "Ready" (this is exactly what broke the ft/44 deploy). `maxSubagentDepth` can't zero it either (schema minimum is 1). Leaving it on is safe: a subagent is a copy of this agent sharing its sandbox + tools, so it inherits the already-disabled shell/FS surface and can do nothing the parent can't, and `instructions.md` steers the model away from it. **Boot-check lesson: to validate a tool-scoping change, create a session (`POST /eve/v1/session`) — a plain server-Ready check does not exercise graph resolution.**
- `ask_question` (enabled, unused so far) — nice enhancement for later: the model asks a structured, parked question with options (frequency, premium-vs-standard X, confirmations) as a tappable choice instead of free text. To use it: instruct the model in the sysprompt AND render the input-request part in `app/agents/new/agent-chat.tsx` as a widget (not wired yet — today it would show as a raw tool call, so the model just asks in prose).

- Build/debug frontend-free: `npx eve dev` (TUI) or the `/eve/v1/*` HTTP API. The browser chat (`app/agents/new/`) is just one channel onto the same agent.
- No persistence — scan results flow back into the conversation.
- Non-eve files in `agent/` are ignored by the compiler; boot-check when adding one.
- Installed-version docs (source of truth): `node_modules/eve/docs/` — start at its README.

## Deployed chat — the next eve slice

- The deployed browser chat needs `agent/channels/eve.ts` (doesn't exist yet, so `/eve/v1/*` 401s browsers — the chat is localhost-only).
- It's a Supabase-session AuthFn: nitro-side reassembly of chunked `sb-*` cookies + JWT verify — NOT drop-in `@supabase/ssr` (that stack assumes Next request plumbing).
- The topology already runs on Vercel: deployed build + public `/eve/v1/health` green on `dev` (2026-07-04); only this authed path is missing.
- `withEve()` splits the Vercel deploy into two services (web + eve) at build time; any service config added later must list BOTH or the build fails.

## Web search (deferred)

Not wired this slice. When web scanning is needed:

- eve's built-in `web_search` DOES work with `deepseek/deepseek-v4-flash`: because the model is a plain gateway string, eve routes `web_search` to **Parallel AI's search, executed server-side by the Vercel AI Gateway** (model-agnostic). DeepSeek's *own* native web search is not reachable through the gateway (it lives only on DeepSeek's Anthropic endpoint, off the gateway path); going direct to get it would sacrifice the gateway's BYOK cost-routing + easy model-switching, so don't.
- Footgun: keep `agent/agent.ts`'s model a **plain gateway string** — a source-backed model reference makes eve's resolver return `null` for the `deepseek` prefix and silently drop `web_search`.
- To pin/control the backend (domain or recency filters), override `agent/tools/web_search.ts` with a `defineTool` wrapping `gateway.tools.parallelSearch()` / `perplexitySearch()` / `exaSearch()` — swaps the search backend while keeping the gateway for the model.

Cost (deferred pricing concern): Parallel web search and xAI `x_search` both bill ~**$5 / 1,000 successful calls** to your accounts (Vercel Gateway / xAI), **application-wide across all users' searches** — not per-user. Total spend scales with total service-wide searches, so cap searches per-user/per-agent in the pricing slice.
