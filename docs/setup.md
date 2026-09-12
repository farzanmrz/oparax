# Experiment setup handoff

Start with [setup-status.md](setup-status.md) for the current baseline and remaining work. Provider details live in:

- [setup-x.md](setup-x.md): X app, project bot, registered chat keys, credential distinctions and unverified runtime behavior.
- [setup-env.md](setup-env.md): the nine rebuilt Vercel variables, credential retirement and recovery locations.
- [setup-smtp.md](setup-smtp.md): saved email configuration and confirmed delivery.
- [exp1.md](exp1.md): the experiment's Learn, Measure and Build draft.

Issue #131 was closed as not planned. Its old feature plans and implementation branches are retired. `beta` is the working baseline; `main` remains production. Do not resume #131 or restore its assumptions through old planning artifacts.

The infrastructure cleanup does not implement the new product or replace its database schema. Run a fresh owner-triggered `/feature` in Claude Code from `beta` after reading these records. The plan must derive the replacement schema and repository deletions from the experiment, inspect the actual shared database and preserve the authentication path. Do not treat the historical code map in AGENTS.md as the target architecture.

The owner confirmed personal X Premium at $40/month is active. X Ads setup and campaigns are explicitly out of scope for this cleanup. Payments and ad launch require their own implementation and owner direction.
