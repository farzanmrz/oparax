# Working rules

- Multi-step features go through `/feature` (explicit invocation only — it never auto-triggers); minor iteration happens directly on `dev` with small commits and a boot check before push.
- No persistence until a data shape earns it: plain local files first; Supabase stays auth-only (no app tables).
- Mid-session ideas and scope creep: never built the same session — when the user defers one, capture it to their `docs/triage.md`. That file is the user's notebook: write to it only to record the user's own deferrals, and never read it as a task list to execute.
- Instruction files (`CLAUDE.md`, `.claude/rules/`, skills) change only after explain → agree → edit.
- Cross-cutting skills: env vars (local or Vercel project) → `vercel:env-vars`; deploys/promotes/rollbacks → `vercel:deployments-cicd`; repo-wide Biome findings → `lint-resolve`.
