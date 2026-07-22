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

# The QC battery — autonomous

Over the whole branch diff, in order (skip nothing silently — report each step):

1. **Convergence:** all commits on the feature branch; no stray flow worktrees under
   `.claude/worktrees/`; no stray branches.
2. **Review fan-out** — one `Workflow({ scriptPath: ".claude/workflows/qc-review.mjs",
   args })` call runs ALL finders against the frozen branch diff in a single parallel
   barrier: the two `cleanup-finder` angles (reuse+simplification, altitude+efficiency)
   + `conventions-finder` on sonnet; the `bug-finder` adversarial + cross-file angles
   on opus, plus a line-by-line angle (sonnet) that runs only on large diffs (models
   pinned in the workflow, not prose). Address it by **`scriptPath`, never `name`** —
   `Workflow({ name })` resolves only built-in/registered workflows and does NOT scan
   the repo's `.claude/workflows/`, so `{ name: "qc-review" }` silently 404s and
   degrades to the unbounded `/code-review` path; the path form runs the repo workflow
   directly. Measure the diff first (`git diff --shortstat <range>`) and pass `args`:
   `{ range: "origin/dev...ft/<N>", generated: "<globs>", vetoes: "<plan-frozen
   decisions>", criteria: "<the ft issue's 'Stack & design acceptance criteria'
   section>", large: <bool>, effort: "medium" }` — `criteria` is what `conventions-finder`
   verifies the built diff against; set `large: true` on a big diff
   (roughly >8 files or >200 changed lines) to add the line-by-line bug angle (it
   returns zero on small diffs), and `effort: "high"` when the slice adds a
   table/migration, a new trust boundary (auth, server action, agent tool surface),
   or touches posting/money paths. It returns a consolidated `findings` list.
3. **Adjudicate + apply (this session).** The workflow only reports — the session
   decides. Plan-frozen decisions in the ft issue are vetoes, not findings; drop
   them. Apply the survivors. A finding that is real but not-this-slice (a bigger
   refactor, a scale concern that can't bite yet) → surface it to the user and drop
   it; the flow doesn't track deferrals. The applied fix diff stays
   gated by the tsc + lint pass (step 4) and boot smoke (step 5) — no separate
   delta-verify pass. Large/risky diff → offer the user `/code-review ultra` before
   proceeding.
4. **`feature-lint`** (scoped to the feature's changed files — LAST because the review
   pass mutates code). Formatting is NOT part of this step: the `PostToolUse` hook
   already formatted every write, including the fixes applied in step 3. What's left
   is the residual Biome won't auto-fix (no-fix + `--unsafe` rules) → risk-tiered
   fixer agents, gating on a clean `pnpm build` — the authority on compile correctness.
5. **Boot smoke** — builds can't see boot failures: background `pnpm dev`, wait for
   readiness, assert Next.js reports "Ready" and NO failure signatures (ERROR,
   "failed", unmet peer, unhandled rejection). Collect WARNINGs for triage; kill the
   process. Startup output only.
6. **Doc sync — subtractive first** (the revise-agents-md philosophy at slice scope;
   ships in the same diff). Default outcome is **no change** — say so plainly rather
   than invent additions. A fact earns a doc line only if it is durable,
   action-affecting, and NOT recoverable from the code a fresh session reads; adding
   is guilty until proven load-bearing. In order:
   - **Subtract** what the slice made stale — any AGENTS.md / `.claude/rules/` / skill
     line the diff falsified or made code-recoverable → delete it.
   - **Add** only a genuine non-recoverable keeper (a new guard, a retired pattern, a
     new trust boundary): AGENTS.md if always-on, the area's `.claude/rules/<area>.md`
     if scoped — create a new nested rule file for a brand-new path-area.
   - **Skills:** if the slice changed what a skill's body documents (a command, a
     wiring contract), fix that skill; deeper skill bloat → surface it for
     `/meta-dev:improve-skill`, never inline-rewrite it here.
   Single-source every fact (one home; cross-reference, never restate).

Hard rules: the review fan-out is one barrier of ≤6 finders (5 on a small diff, 6
on a large one) with no delta-verify — well under the ≤10-agents-per-fan-out cap;
the `qc-review` workflow (invoked by `scriptPath`, see step 2) owns finder
parallelism and model pins. Never fall back to `/code-review` for the fan-out — its per-candidate verify
phase is unbounded and defeats the cap the workflow exists to enforce. If any step reveals a dependency
MAJOR upgrade, framework migration, or schema/data migration is required — STOP and
present options; never fix those autonomously. End by stating: builds ✓ boots ✓
findings fixed ✓ (or what remains).
