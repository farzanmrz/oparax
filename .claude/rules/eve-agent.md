---
paths:
  - agent/**
  - next.config.ts
  - package.json
---

# The eve agent

Skills: `vercel:eve` FIRST for any agent work; `vercel:ai-sdk` for model code inside a tool's `execute()`; `vercel:ai-gateway` for provider/model routing; `vercel:workflow` only if dropping below eve to WDK directly. Installed-version docs (source of truth): `node_modules/eve/docs/` — start at its README.

- `agent/` is compiled by eve; filenames are eve conventions: `agent.ts` (model config — DeepSeek via gateway), `instructions.md` (chat-orchestrator sysprompt, an eve-native file, not documentation), `tools/grok_twitter_search.ts` (Grok xSearch scan; sysprompt inline; config is only allowed/excluded handles — ≤10, schema-enforced — plus day-granularity from/to dates).
- eve is pinned exact (`0.18.1`); every eve release peers `ai ^7` — never downgrade the AI SDK (a v6 pin broke the worker boot). Upgrades are deliberate (0.19 tracked in `docs/triage.md`).
- **`pnpm build` never boots eve's runtime worker — a dead worker builds green.** Any eve/dependency change needs a `pnpm dev` boot check: Next "Ready" + no `[env-runner]`/`[nitro]` failures.
- Build/debug frontend-free: `npx eve dev` (interactive TUI) or the `/eve/v1/*` HTTP API. The browser chat (`app/dashboard/agents/`) is just one channel onto the same agent.
- Deployed `/eve/v1/*` 401s browsers until `agent/channels/eve.ts` (a Supabase-session AuthFn) exists — the chat works on localhost only.
- No persistence: scan results flow back into the conversation.
- Non-eve files in `agent/` are ignored by the compiler; verify with a boot check when adding one.
