---
name: ts-format
description: Apply Oparax's TypeScript comment and import conventions to .ts/.tsx files. Use whenever you create a new TypeScript (.ts/.tsx) file or edit comments/imports in one, or when asked to format, clean up, fix, or standardize comments or imports in TypeScript.
paths:
  - '**/*.{ts,tsx}'
context: fork
agent: ts-formatter
---

# TypeScript Formatting

These are the comment and import conventions for every `.ts`/`.tsx` file in this repo. Apply them to the target file(s). Change **only** comments and import structure — never logic, types, runtime behavior, or the contents of strings.

To find what to format, use the scoped git commands you're allowed: `git status` for untracked/changed files and `git diff` (e.g. `git diff --name-only`) to see which `.ts`/`.tsx` files changed and what changed in them.

## Where the rules live — read the matching file first (required)

This file is only the entry point. The actual conventions — each rule with its worked `Incorrect`/`Correct` example directly beneath it — live in per-type reference files so you load only what the task needs. Before you edit, read the file that matches what you're formatting:

- A `.ts` file → read [references/ts-examples.md](references/ts-examples.md)
- A `.tsx` file (React component) → read [references/tsx-examples.md](references/tsx-examples.md)
- Both file types in the same task → read both.

The rules are the same for both; only the examples differ. `.tsx` additionally shows the React-only cases (the `'use client'` directive and component/handler docstrings), so always read [references/tsx-examples.md](references/tsx-examples.md) before touching a `.tsx` file.
