---
name: lint-resolve
description: >-
  Resolve residual Biome lint findings on a feature branch's changed files —
  auto format + safe-fix, then fix what's left (no-autofix / unsafe-fix rules like
  next/noImgElement and react/useExhaustiveDependencies) in isolated parallel
  sub-agents, and gate on a clean `pnpm build`. Invoked by the feature skill's Phase 4
  QC tail; also runnable standalone on a branch. NOT for a one-off lint of a single
  file — run `pnpm lint:fix` directly for that.
argument-hint: "[base ref, default dev]"
allowed-tools: Bash(git *) Bash(pnpm *)
---

# Lint resolve — clear the residual, safely

`biome check --write` already auto-handles formatting, import order, and every lint rule
with a **safe** fix in one pass. What's left is the residual: rules with **no fix** (most
`next` rules, e.g. `noImgElement`) or an **unsafe** fix (`react/useExhaustiveDependencies`).
Those need a human-style edit. This skill clears that residual on the feature's changed
files **without bloating the main conversation** — it fans the fixes out to isolated
sub-agents and returns only a compact report.

**Correctness is priority one.** The only automated safety net here is `pnpm build`
(TypeScript + Next compile) — there is no test runner and browser checks are out. A fix
that compiles can still change behavior. That single fact drives the design: fixes are
**risk-tiered**, and the dangerous tier is escalated to a stronger model **and flagged for
review** rather than shipped silently.

## Sequence

1. **Scope to the feature diff.** Base defaults to `dev` (or `$ARGUMENTS`). Exclude
   deletions so Biome isn't handed missing paths:
   ```bash
   base="${ARGUMENTS:-dev}"
   files=$(git diff --name-only --diff-filter=ACMR "$base...HEAD" \
     -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs')
   ```
   Empty → nothing to do; stop.

2. **Auto-pass — format + safe fixes** over those files only:
   ```bash
   echo "$files" | xargs pnpm exec biome check --write --no-errors-on-unmatched
   ```

3. **Extract the residual as JSON** (write to the session scratch dir, not the repo):
   ```bash
   echo "$files" | xargs pnpm exec biome lint --reporter=json --no-errors-on-unmatched > <scratch>/residual.json
   ```
   Parse it into `{ file → [findings] }`. Each finding carries a rule id (e.g.
   `lint/correctness/useExhaustiveDependencies`), a location, and a message.

4. **Risk-tier every finding by what its fix can break** — tier by *category*, not a
   frozen rule list, so new rules slot in by principle:
   - **High — behavior-changing.** The fix alters runtime semantics: effect/callback
     timing, re-render behavior, control flow. Anchor case
     `react/useExhaustiveDependencies` (editing a hook's dependency array changes when it
     fires — or loops). **`pnpm build` cannot catch a regression here.**
   - **Low/medium — mechanical or layout.** Adding an a11y attribute, a list `key`, or
     swapping `<img>`→`next/image` (needs real `width`/`height`; can shift layout, but the
     failure is visible/compile-checked, not silent).

5. **Inline vs. fan-out.** If the residual is tiny (≈≤3 findings across ≤2 files), just
   fix it inline — dispatch overhead isn't worth it. Otherwise **partition by file** (each
   file is owned by exactly one sub-agent — never two agents in the same file) and dispatch
   in parallel:
   - **Low/medium tier → `lint-fixer-fast`** (sonnet, medium effort), many in parallel.
   - **High tier → `lint-fixer-careful`** (opus, high effort) — applies the fix **and
     flags it** for review.
   Give each sub-agent only its file(s) and that file's findings. The agent definitions
   already carry the rules (no `--unsafe`, stay in-assignment, don't build); don't restate
   them — just pass the work.

6. **Normalize + gate.** After the sub-agents converge:
   ```bash
   echo "$files" | xargs pnpm exec biome check --write --no-errors-on-unmatched   # format their edits
   pnpm build                                                                       # the only authority
   ```
   A clean `pnpm build` is the completion gate. If it fails, the error names the file —
   fix and re-run build.

7. **Report.** Return a compact summary: findings resolved per file, anything still
   unresolved, and a prominent **⚠ Review these** section collecting every high-tier
   behavior-changing fix the careful lane flagged. Surface that section to the user — those
   are the changes `pnpm build` can't vouch for.

## Notes
- Scope is **changed files only** — never fix pre-existing findings in untouched code.
  That's scope creep; note them for `docs/triage.md` instead.
- This is the single place Biome and `pnpm build` run in the feature workflow.
