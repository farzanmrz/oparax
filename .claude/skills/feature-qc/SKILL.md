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

0. **Resolve the diff boundary.** Read branch state:
   `node .claude/skills/feature-handoff/scripts/state.mjs show --branch "$(git branch
   --show-current)"`. If `.mode === "current"`, the range is **`<state.baseSha>..HEAD`**
   — never `origin/dev...HEAD` and never a later `dev` SHA; `baseSha` is written once at
   `init` and is immutable afterward, so it is the correct, stable boundary for a
   direct-dev run. If `.mode === "tracked"` (or no state exists — a standalone run),
   the range stays `origin/dev...ft/<N>` as before. Convergence next: all commits on
   the feature branch; no stray flow worktrees under `.claude/worktrees/`; no stray
   branches.
1. **Review fan-out** — one `Workflow({ scriptPath: ".claude/workflows/qc-review.mjs",
   args })` call runs the whole find→dedup→verify pipeline against the frozen diff.
   Address it by **`scriptPath`, never `name`** — `Workflow({ name })` resolves only
   built-in/registered workflows and does NOT scan the repo's `.claude/workflows/`, so
   `{ name: "qc-review" }` silently 404s and degrades to the unbounded `/code-review`
   path; the path form runs the repo workflow directly.

   **Find** (models pinned in the workflow, not prose) — the Claude floor always runs:
   two `cleanup-finder` angles (reuse+simplification, altitude+efficiency) +
   `conventions-finder` on sonnet; `bug-finder` adversarial + cross-file angles on
   opus; a line-by-line angle (sonnet) on large diffs only. Three **external lanes**
   join when the diff is large or risk-touching, each a **distinct charter** (never
   the generic "review this diff"): Codex/gpt-5.6-sol (medium) — correctness +
   contract + removed-behavior; Grok-4.5 (medium) — adversarial / trust-boundary;
   Gemini-3.1-pro via `agy` (high) — over-engineering / wrong-layer / duplication.
   This is cross-model diversity spent where it pays: finding is a DIVERGENT task
   (more independent eyes catch more), so every family runs concurrently, blind to
   the others' output.

   **Dedup** (sonnet, single pass) merges near-duplicates across lanes and drops
   plan-frozen vetoes — a CONVERGENT task (consolidating a list is not a hypothesis
   to diversify), so one owner, not a second opinion.

   **Verify** is cross-family again — DIVERGENT for the same reason as find, and
   the second place external usage earns its keep: every surviving finding is
   checked by a family that did **not** raise it (an external lane's finding gets a
   different-prior check; a Claude-floor finding gets an external check too, catching
   Claude wrongly dismissing something real). High-severity or risk-path findings get
   a 3-family panel (2-of-3 must confirm); everything else gets one cross-family
   verifier. Claude-Opus is the fallback floor if a panel's CLIs all fail. This is
   also why `qc-review` never returns an unverified external finding — an external
   lane's recall is spent on FINDING, not on deciding what's true.

   Measure the diff first (`git diff --shortstat <range>` — the range from step 0) and
   pass `args`: `{ range, generated: "<globs>", vetoes: "<plan-frozen decisions>",
   criteria: "<the ft issue's 'Stack & design acceptance criteria' section>",
   large: <bool>, effort: "medium" }` — `criteria` is what `conventions-finder`
   verifies the built diff against; set `large: true` on a big diff (roughly >8 files
   or >200 changed lines) to add the line-by-line bug angle AND the external lanes,
   and `effort: "high"` when the slice adds a table/migration, a new trust boundary
   (auth, server action, agent tool surface), or touches posting/money paths — this
   also gates the external lanes on and widens verify to a 3-family panel. It
   returns `findings`, each already tagged `raisedBy` (which families independently
   found it) and `confirmed` (the verify quorum) — the workflow only reports, the
   session still decides.
2. **Adjudicate + apply (this session).** Plan-frozen decisions in the ft issue are
   vetoes, not findings; drop them even if `confirmed`. A finding that is real but
   not-this-slice (a bigger refactor, a scale concern that can't bite yet) → surface
   it to the user and drop it; the flow doesn't track deferrals. Apply the survivors —
   **convergent, single owner**: `sonnet` for an ordinary fix, `opus` for a risk-path
   fix (auth, money, posting, schema/migration, new trust boundary) — never fan a fix
   out across families; three model families editing the same file concurrently
   produces conflicting diffs to reconcile, not more correctness. The applied fix
   diff stays gated by the tsc + lint pass (step 3) and boot smoke (step 4) — no
   separate delta-verify pass. Large/risky diff → offer the user `/code-review ultra`
   before proceeding.
3. **`feature-lint`** (scoped to the feature's changed files — LAST because the review
   pass mutates code). Formatting is NOT part of this step: the `PostToolUse` hook
   already formatted every write, including the fixes applied in step 2. What's left
   is the residual Biome won't auto-fix (no-fix + `--unsafe` rules) → risk-tiered
   fixer agents, gating on a clean `pnpm build` — the authority on compile correctness.
4. **Boot smoke** — builds can't see boot failures: background `pnpm dev`, wait for
   readiness, assert Next.js reports "Ready" and NO failure signatures (ERROR,
   "failed", unmet peer, unhandled rejection). This is pattern-matching over startup
   text, not judgment — `haiku` (or no model at all, plain grep) reads the log; never
   spend a heavier model here. Collect WARNINGs for triage; kill the process. Startup
   output only.
5. **Doc sync — subtractive first** (the revise-agents-md philosophy at slice scope;
   ships in the same diff). **Convergent, single owner — `sonnet-high`**: different
   model lanes must never make competing edits to the same instruction file, so this
   is deliberately not cross-model. Fed by the `conventions-finder` lane's staleness
   findings from step 1 (it already reports "instruction-file lines the diff has made
   wrong or incomplete" as part of Find) — that is the evidence; this step is where it
   gets applied. Default outcome is **no change** — say so plainly rather than invent
   additions. A fact earns a doc line only if it is durable, action-affecting, and NOT
   recoverable from the code a fresh session reads; adding is guilty until proven
   load-bearing. In order:
   - **Subtract** what the slice made stale — any AGENTS.md / `.claude/rules/` / skill
     line the diff falsified or made code-recoverable → delete it.
   - **Add** only a genuine non-recoverable keeper (a new guard, a retired pattern, a
     new trust boundary): AGENTS.md if always-on, the area's `.claude/rules/<area>.md`
     if scoped — create a new nested rule file for a brand-new path-area.
   - **Skills:** if the slice changed what a skill's body documents (a command, a
     wiring contract), fix that skill; deeper skill bloat → surface it for
     `/meta-dev:improve-skill`, never inline-rewrite it here.
   Single-source every fact (one home; cross-reference, never restate).

Hard rules: the Claude find floor is one barrier of ≤6 finders (5 on a small diff, 6
on a large one); the external lanes add ≤3 more, and verify's fan-out scales with the
finding count (a family-per-finding, panel on high-severity/risk) rather than a fixed
count — that is intentional coverage, not an oversight, and the workflow's own
concurrency queue (cap 16 in flight) throttles it, not a hard per-run agent limit. The
`qc-review` workflow (invoked by `scriptPath`, see step 1) owns finder/verifier
parallelism and every model pin — nothing here is prose-decided. Never fall back to
`/code-review` for the fan-out — its per-candidate verify phase is unbounded and
defeats the structure this workflow exists to enforce. If any step reveals a
dependency MAJOR upgrade, framework migration, or schema/data migration is required —
STOP and present options; never fix those autonomously. End by stating: builds ✓
boots ✓ findings fixed ✓ (or what remains).
