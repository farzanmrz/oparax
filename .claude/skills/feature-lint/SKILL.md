---
name: feature-lint
description: >-
  Resolve residual Biome lint findings on a feature branch's changed files — the
  rules `biome check --write` can't safely auto-fix. Invoked by /feature-qc as its
  final pass; also runnable standalone on a branch (/feature-lint). NOT for
  formatting — the PostToolUse hook already does that on every write.
argument-hint: "[base ref, default beta]"
allowed-tools: Bash(git *) Bash(pnpm *)
# sonnet, not inherit: this skill's own work is mechanical (run lint, group the findings
# by file, apply, re-run). Under `inherit` it ran that pass on whatever the calling
# session was set to — opus orchestrating a file-grouping loop.
model: sonnet
---

# Lint resolve — clear the residual, safely

The safe pass is already done. The `PostToolUse(Edit|Write)` hook
(`.claude/hooks/biome-write.sh`) runs `biome check --write` on every file the moment it's
written — formatting, import order, and every lint rule with a **safe** fix — so code is
never unformatted for longer than one tool call, in this session or any sub-agent's.

What reaches this skill is only the residual: rules with **no fix** (most `next` rules,
e.g. `noImgElement`) or an **unsafe** fix (`react/useExhaustiveDependencies`) — the ones
`--write` deliberately won't touch without `--unsafe`. Those need a human-style edit. This
This skill clears them on the feature's changed files and returns a compact report.

## Correctness is the constraint

**Correctness is priority one.** The only automated safety net here is `pnpm build`
(TypeScript + Next compile) — there is no test runner and browser checks are out. A fix
that compiles can still change behavior. That single fact drives the design: fixes are
**risk-tiered**, and the dangerous tier is escalated to a higher-effort pass **and flagged
for review** rather than shipped silently.

## Sequence

1. **Scope to the feature diff.** Base defaults to `origin/beta` (or `$ARGUMENTS`) —
   local `beta` is never checked out or fast-forwarded by this flow (see `start.sh`),
   so it can sit arbitrarily stale; only `origin/beta` is guaranteed current. Exclude
   deletions so Biome isn't handed missing paths:
   ```bash
   base="${ARGUMENTS:-origin/beta}"
   files=$(git diff --name-only --diff-filter=ACMR "$base...HEAD" \
     -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs')
   ```
   Empty → nothing to do; stop.

2. **Extract the residual as JSON** (write to the session scratch dir, not the repo):
   ```bash
   echo "$files" | xargs pnpm exec biome lint --reporter=json --no-errors-on-unmatched > <scratch>/residual.json
   ```
   Parse it into `{ file → [findings] }`. Each finding carries a rule id (e.g.
   `lint/correctness/useExhaustiveDependencies`), a location, and a message.

3. **Risk-tier every finding by what its fix can break** — tier by *category*, not a
   frozen rule list, so new rules slot in by principle:
   - **High — behavior-changing.** The fix alters runtime semantics: effect/callback
     timing, re-render behavior, control flow. Anchor case
     `react/useExhaustiveDependencies` (editing a hook's dependency array changes when it
     fires — or loops). **`pnpm build` cannot catch a regression here.**
   - **Low/medium — mechanical or layout.** Adding an a11y attribute, a list `key`, or
     swapping `<img>`→`next/image` (needs real `width`/`height`; can shift layout, but the
     failure is visible/compile-checked, not silent).

4. **Fix them yourself, in this session.** A dedicated fixer agent was deleted
   2026-07-30: across six recorded runs of this skill it was dispatched **zero
   times**, because the residual is always small enough for step 4's inline
   path. Its rules live here instead, where they are actually read:

   - Apply the mechanical tier directly, to every finding residual.json reported —
     all of them, across all files, not just the first file's. a11y attributes,
     list `key`s, `<img>` → `next/image` with real `width`/`height`.
   - Apply the behavior-changing tier too, but **flag each one with a sentence
     of reasoning** for the ⚠ Review section — `pnpm build` cannot vouch for it.
   - Never pass `--unsafe`. Never touch a file outside the changed set. Do not
     run builds mid-fix; the gate is step 5.

   If a round ever produces a genuinely large residual across many files,
   dispatch `fixer` per file group — one file has exactly one owner, never two.

5. **Gate.** Once the residual is clear:
   ```bash
   pnpm build   # the only authority
   ```
   Edits are already formatted — the write hook fired on each one. A clean `pnpm build` is the completion gate. If it fails, the
   error names the file — fix and re-run build.

6. **Report.** Return a compact summary: findings resolved per file, anything still
   unresolved, and a prominent **⚠ Review these** section collecting every high-tier
   behavior-changing fix the careful lane flagged. Surface that section to the user — those
   are the changes `pnpm build` can't vouch for.

## Notes
- Scope is **every changed file, and only changed files** — cover all of them, and never fix pre-existing findings in untouched code.
  That's scope creep; surface them to the user instead of fixing them here.
- The safe pass is **not** this skill's job — the `PostToolUse` hook owns it, continuously.
  Never re-run `biome check --write` in bulk here; that would put formatting churn back
  into the QC diff, which is exactly what moving it to the hook removed.
- This is the single place `pnpm build` runs in the feature workflow.
