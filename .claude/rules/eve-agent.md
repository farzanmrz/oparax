---
paths:
  - agent/**
  - next.config.ts
  - package.json
---

# The eve agent

- Skills: `vercel:eve` FIRST; `vercel:ai-sdk` for model code in a tool's `execute()`; `vercel:ai-gateway` for provider/model routing; `vercel:workflow` only when dropping below eve to WDK.
- Never downgrade the AI SDK below `ai ^7` — an earlier v6 pin broke the worker boot. eve is pinned exact (`0.19.0`); upgrade deliberately, verifying by boot check (the package ships no changelog).
- **`pnpm build` never boots eve's worker — a dead worker builds green.** Boot-check any eve/dependency change: `pnpm dev`, Next "Ready", no `[env-runner]`/`[nitro]` failures.
- Agent internals, facts, and the channel-auth plan: `.claude/references/agent.md`.
