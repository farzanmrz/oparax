---
name: lint
description: >-
  Resolve residual Biome lint findings on a feature branch's changed files: the
  rules `biome check --write` can't safely auto-fix. Not a flow phase — a
  standalone utility skill re-run by ft-ship's triage loop, also directly
  runnable on any branch (/lint). NOT for formatting: the PostToolUse hook
  already does that on every write.
argument-hint: "[base ref, default beta]"
allowed-tools: Bash(git *) Bash(pnpm *)
# sonnet, not inherit: this skill's own work is mechanical (run lint, group the
# findings by file, apply, re-run); inherit ran that pass on the caller's dial.
model: sonnet
---

# Lint resolve: clear the residual, safely

* **The safe pass is already done:** the `PostToolUse(Edit|Write)` hook
  (`.claude/hooks/biome-write.sh`) runs `biome check --write` on every file the moment it's written (formatting, import order, and every lint rule with a SAFE fix), in this session and any sub-agent's.
* **What reaches this skill is only the residual:** rules with NO fix (most `next` rules, e.g. `noImgElement`) or an UNSAFE fix (`react/useExhaustiveDependencies`): the ones `--write` deliberately won't touch without `--unsafe`. Those need a human-style edit. This skill clears them on the feature's changed files and returns a compact report.
* **Correctness is priority one:** the only automated safety net here is `pnpm build` (TypeScript + Next compile): there is no test runner and browser checks are out. A fix that compiles can still change behavior, so fixes are risk-tiered and the dangerous tier is escalated and flagged for review rather than shipped silently.

## 1. Scope to the feature diff

* **Base:** defaults to `origin/beta` (or `$ARGUMENTS`). Local `beta` is never checked out or fast-forwarded by this flow (see `start.sh`), so it can sit arbitrarily stale; only `origin/beta` is guaranteed current.
* **Exclude deletions** so Biome isn't handed missing paths:

```bash
base="${ARGUMENTS:-origin/beta}"
files=$(git diff --name-only --diff-filter=ACMR "$base...HEAD" \
  -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs')
```

* **Empty:** nothing to do; stop.

## 2. Extract the residual as JSON

Write to the session scratch dir, not the repo:

```bash
echo "$files" | xargs pnpm exec biome lint --reporter=json --no-errors-on-unmatched > <scratch>/residual.json
```

Parse it into `{ file → [findings] }`. Each finding carries a rule id (e.g. `lint/correctness/useExhaustiveDependencies`), a location, and a message.

## 3. Risk-tier every finding

Tier by what its fix can break, by CATEGORY, never a frozen rule list, so new rules slot in by principle:

* **High (behavior-changing):** the fix alters runtime semantics: effect/callback timing, re-render behavior, control flow. Anchor case: `react/useExhaustiveDependencies` (editing a hook's dependency array changes when it fires, or loops). `pnpm build` CANNOT catch a regression here.
* **Low/medium (mechanical or layout):** adding an a11y attribute, a list `key`, or swapping `<img>` to `next/image` (needs real `width`/`height`; can shift layout, but the failure is visible/compile-checked, not silent).

## 4. Fix them yourself, in this session

Inline is the path: the residual is always small enough (a dedicated fixer agent was retired after zero dispatches across six recorded runs; its rules live here instead, where they are actually read).

* **Mechanical tier:** apply directly, to every finding residual.json reported: all of them, across all files, not just the first file's. a11y attributes, list `key`s, `<img>` to `next/image` with real `width`/`height`.
* **Behavior-changing tier:** apply too, but flag each one with a sentence of reasoning for the ⚠ Review section: `pnpm build` cannot vouch for it.
* **Never** pass `--unsafe`. **Never** touch a file outside the changed set. Do not run builds mid-fix; the gate is phase 5.

## 5. Gate

Once the residual is clear:

```bash
pnpm build
```

* **The only authority.** Edits are already formatted (the write hook fired on each one); a clean `pnpm build` is the completion gate.
* **On failure:** the error names the file; fix and re-run build.

## 6. Report

Return a compact summary: findings resolved per file, anything still unresolved, and a prominent **⚠ Review these** section collecting every high-tier behavior-changing fix the careful pass flagged. Surface that section to the user: those are the changes `pnpm build` can't vouch for.

## Notes

* **Scope:** every changed file, and only changed files. Cover all of them, and never fix pre-existing findings in untouched code: that's scope creep; surface them to the user instead of fixing them here.
* **The safe pass is NOT this skill's job:** the `PostToolUse` hook owns it, continuously. Never re-run `biome check --write` in bulk here: that would put formatting churn back into the QC diff, which is exactly what moving it to the hook removed.
* **This is the single place `pnpm build` runs in the feature workflow.**
