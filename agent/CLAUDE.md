# agent/ — the eve agent (eve compiles this directory; filenames are eve conventions)

Skills: `vercel:eve` FIRST for any work here; `vercel:ai-sdk` for model code inside a tool's `execute()`; `vercel:ai-gateway` for provider/model routing. Source of truth for the installed version: `node_modules/eve/docs/` (start at its README).

- `agent.ts` — agent + model config (DeepSeek via gateway)
- `instructions.md` — the chat-orchestrator sysprompt (an eve-native file, not documentation)
- `tools/grok_twitter_search.ts` — Grok xSearch scan; its sysprompt is inline in the tool; xSearch config is only allowed/excluded handles (≤10 — the `@ai-sdk/xai` schema enforces 10) + day-granularity from/to dates; the sysprompt is the only lever on the server-side subtools

Facts:

- Build/debug frontend-free: `npx eve dev` (interactive TUI) or the `/eve/v1/*` HTTP API. The browser chat (`app/dashboard/agents/`) is just one channel onto the same agent.
- Deployed `/eve/v1/*` 401s browsers until `agent/channels/eve.ts` (a Supabase-session AuthFn) exists — the chat works on localhost only for now.
- No persistence: scan results flow back into the conversation.
- eve is pinned exact (`0.18.1`); upgrades are deliberate (0.19 tracked in `docs/triage.md`).
- This `CLAUDE.md` is not an eve-reserved filename, so eve's compiler ignores it — re-verify with a `pnpm dev` boot check whenever new non-eve files are added here.
