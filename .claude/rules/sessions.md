# Working rules

- Don't change instruction files (`CLAUDE.md`, `.claude/rules/`, skills) unilaterally. But when the user explicitly asks for a change, that IS the agreement — make it and explain the what/why in your reply; don't pause for a separate go-ahead.
- Cross-cutting skill routing:
  - env vars (local or Vercel project) → `vercel:env-vars`
  - deploys / promotes / rollbacks → `vercel:deployments-cicd`
  - repo-wide Biome findings → `lint-resolve`
