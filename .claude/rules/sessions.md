# Working rules

- Multi-step features go through `/feature` (explicit invocation only — it never auto-triggers); minor iteration happens directly on `dev` with small commits and a boot check before push.
- No persistence until a data shape earns it: plain local files first; Supabase stays auth-only (no app tables).
- Mid-session ideas and scope creep: never built the same session — surface them to the user, who decides whether to record them. `docs/triage.md` is the user's own deferral notes; do not read it as tasks or write to it unprompted.
- Instruction files (`CLAUDE.md`, `.claude/rules/`, skills) change only after explain → agree → edit.
- Cross-cutting skills: env vars (local or Vercel project) → `vercel:env-vars`; deploys/promotes/rollbacks → `vercel:deployments-cicd`; repo-wide Biome findings → `lint-resolve`.
