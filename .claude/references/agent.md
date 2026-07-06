# agent/ — the eve agent

Skill: `vercel:eve` FIRST; `vercel:ai-sdk` for model code in a tool's `execute()`; `vercel:ai-gateway` for provider/model routing.

eve compiles this directory; the filenames are eve conventions.

- `agent/agent.ts` — model config (DeepSeek via the AI Gateway).
- `agent/instructions.md` — the chat-orchestrator sysprompt (an eve-native file, not documentation).
- `agent/tools/grok_twitter_search.ts` — the Grok xSearch scan; sysprompt inline. Config is only allowed/excluded handles (≤10, enforced by the `@ai-sdk/xai` schema even though xAI docs claim 20) plus day-granularity from/to dates.

- Build/debug frontend-free: `npx eve dev` (TUI) or the `/eve/v1/*` HTTP API. The browser chat (`app/agents/new/`) is just one channel onto the same agent.
- No persistence — scan results flow back into the conversation.
- Non-eve files in `agent/` are ignored by the compiler; boot-check when adding one.
- Installed-version docs (source of truth): `node_modules/eve/docs/` — start at its README.

## Deployed chat — the next eve slice

- The deployed browser chat needs `agent/channels/eve.ts` (doesn't exist yet, so `/eve/v1/*` 401s browsers — the chat is localhost-only).
- It's a Supabase-session AuthFn: nitro-side reassembly of chunked `sb-*` cookies + JWT verify — NOT drop-in `@supabase/ssr` (that stack assumes Next request plumbing).
- The topology already runs on Vercel: deployed build + public `/eve/v1/health` green on `dev` (2026-07-04); only this authed path is missing.
- `withEve()` splits the Vercel deploy into two services (web + eve) at build time; any service config added later must list BOTH or the build fails.
