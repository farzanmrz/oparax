---
paths:
  - agent/**
  - next.config.ts
  - package.json
---

# The eve agent

Skills: `vercel:eve` FIRST for any agent work; `vercel:ai-sdk` for model code inside a tool's `execute()`; `vercel:ai-gateway` for provider/model routing; `vercel:workflow` only if dropping below eve to WDK directly. Installed-version docs (source of truth): `node_modules/eve/docs/` — start at its README.

- `agent/` is compiled by eve; filenames are eve conventions: `agent.ts` (model config — DeepSeek via gateway), `instructions.md` (chat-orchestrator sysprompt, an eve-native file, not documentation), `tools/grok_twitter_search.ts` (Grok xSearch scan; sysprompt inline; config is only allowed/excluded handles — ≤10, schema-enforced — plus day-granularity from/to dates).
- eve is pinned exact (`0.19.0`); every eve release peers `ai ^7` — never downgrade the AI SDK (a v6 pin broke the worker boot). Upgrades are deliberate (verify by boot check — the package ships no changelog).
- **`pnpm build` never boots eve's runtime worker — a dead worker builds green.** Any eve/dependency change needs a `pnpm dev` boot check: Next "Ready" + no `[env-runner]`/`[nitro]` failures.
- Build/debug frontend-free: `npx eve dev` (interactive TUI) or the `/eve/v1/*` HTTP API. The browser chat (`app/dashboard/agents/`) is just one channel onto the same agent.
- Deployed `/eve/v1/*` 401s browsers until `agent/channels/eve.ts` exists — the chat works on localhost only. That file is a Supabase-session AuthFn: nitro-side reassembly of chunked `sb-*` cookies + JWT verify — NOT drop-in `@supabase/ssr` (that stack assumes Next request plumbing). The topology itself runs on Vercel: deployed build + public `/eve/v1/health` verified green on `dev` (2026-07-04). Building it is the natural next eve slice.
- No persistence: scan results flow back into the conversation.
- Non-eve files in `agent/` are ignored by the compiler; verify with a boot check when adding one.
- `withEve()` splits the Vercel deploy into two services (web + eve) at build time; any service config added later (via `vercel.ts` or the dashboard) must list BOTH or the build fails.
- xSearch handle cap: the `@ai-sdk/xai` runtime schema enforces ≤10 allowed/excluded handles (xAI docs claim 20); currently inline in the tool's zod schema — recheck on SDK bumps.
