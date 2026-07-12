---
name: feature-qc
description: >-
  Phase 3 of the feature flow, standalone: the full QC battery over the current
  feature branch. Use when the user says /feature-qc, "run QC", "quality pass",
  or wants the branch proven buildable+bootable mid-flight. For just one pass, use
  /simplify, /code-review, or /feature-lint directly instead.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# /feature-qc — the QC battery (autonomous)

Over the whole branch diff, in order (skip nothing silently — report each step):

1. **Convergence:** all commits on the feature branch; no stray flow worktrees under
   `.claude/worktrees/`; no stray branches.
2. **`/simplify`** — cleanup-only pass; apply fixes.
3. **`/code-review`** — bug hunt over the branch diff; fix real findings. Bounded:
   ≤10 agents total (fold verification into finders, cap angles). Large/risky diff →
   offer the user `/code-review ultra`.
4. **`feature-lint`** (scoped to the feature's changed files — LAST of the three
   because simplify and review both mutate code; lint formats the final shape) — biome format + safe
   fixes + residual fixer agents, gating on a clean `pnpm build` — the authority on
   compile correctness.
5. **Boot smoke** — builds can't see boot failures: background `pnpm dev`, wait for
   readiness, assert every mounted service reports ready (Next.js "Ready" AND eve's
   dev-server line) and NO failure signatures (ERROR, "failed", "worker init
   failed", unmet peer, unhandled rejection). Collect WARNINGs for triage; kill the
   process. Startup output only.
6. **Docs:** update AGENTS.md / touched `.claude/rules/` files if the diff changed
   what they document (ships in the same diff).

Hard rules: ≤10 agents total per fan-out. If any step reveals a dependency MAJOR
upgrade, framework migration, or schema/data migration is required — STOP and
present options; never fix those autonomously. End by stating: builds ✓ boots ✓
findings fixed ✓ (or what remains).
