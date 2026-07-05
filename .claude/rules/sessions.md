# Working rules

- Multi-step features go through `/feature` (explicit invocation only — it never auto-triggers); minor iteration happens directly on `dev` with small commits and a boot check before push.
- No persistence until a data shape earns it: plain local files first; Supabase stays auth-only (no app tables).
- Two record files, split by who authored the item — **neither is ever read as a task list**, and neither is ever the source of a slice:
  - `docs/triage.md` — the **user's** deferrals. When the user defers a mid-session idea or scope-creep, capture it here (scribing their words); never built the same session. Never write your own findings here.
  - `docs/agent-notes.md` — **your** incidental discoveries (an unrelated bug, a follow-up from reading an issue). Append one ONLY if it is genuinely actionable and would otherwise be lost, and tell the user in-session when you do. It is a review queue for the user to prune, not a plan.
- Instruction files (`CLAUDE.md`, `.claude/rules/`, skills) change only after explain → agree → edit.
- Cross-cutting skills: env vars (local or Vercel project) → `vercel:env-vars`; deploys/promotes/rollbacks → `vercel:deployments-cicd`; repo-wide Biome findings → `lint-resolve`.
