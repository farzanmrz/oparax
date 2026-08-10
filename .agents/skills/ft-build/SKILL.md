---
name: ft-build
description: >-
  Phase 4 of the feature flow, CODEX ONLY: execute the approved spec from
  the ft/N issue inline; the spec decided, build implements and self-checks.
  Use when the user says /ft-build, "build the plan", "implement the
  tasks", or "just build X" mid-flight on a feature branch.
argument-hint: "[issue# | what to build]"
allowed-tools: Bash(git *) Bash(gh *) Bash(node *) Bash(pnpm *)
model: inherit
---

# Build: execute the spec, prove your own work

Recommended dial: `gpt-5.6-sol` high (advisory, never a gate). Source of tasks: the `ft/<N>` issue body
(the gate-approved decisions) plus `.feature/spec-<N>.md` for the full
detail. No issue = small-build mode: the user's direct instruction is the
plan, one branch, no scope creep. Zero prose during execution; the only
permitted text is an escalation.

## 1. Preflight

```bash
pnpm install --frozen-lockfile
```

* **BLOCKER:** an unmet-peer warning on a feature-relevant package (a green build once hid a worker crash).
* **Grounding fan-out:** when the spec's named files span 3+ independent areas, ground them with parallel read-only `grounder` instances (≤6 threads); implementation stays inline and sequential.

## 2. Execute

Work the build steps yourself, in order, in this session. Per task:

1. **Skills first:** invoke the skills the spec's task names (binding).
2. **Write to spec:** resolve only implementation nuance; match surrounding idiom; Biome-clean as written (`next/image` with real dimensions, complete hook dependency arrays).
3. **Escalate instead of improvising:** if reality diverges from the spec beyond nuance, STOP and surface it in a sentence. Design never happens on the build dial.
4. **Checkpoint:** `pnpm exec tsc --noEmit` clean on the files just touched, then a checkpoint commit (restore points; the slice squash-merges at ship).

* **Standing guards:** stock shadcn + ai-elements only; no persistence until a data shape earns it; never resurrect deleted legacy patterns.
* **Exploratory DB work:** dispatch `supabase-runner` instead of thrashing in-session; migrations and type-gen are ordinary inline tasks (MCP via ToolSearch).
* **Scope:** mid-flight new scope stays off the branch.

## 3. Self-verify (part of building, not QC)

* **Boot and drive the changed paths:** start or reuse the :3000 dev server, exercise every changed route or action once; throwaway probe scripts are fine and are deleted after.
* **Screenshot the changed surfaces** at 1280x800 and 375x812 in the built-in browser and judge them yourself against root `DESIGN.md` and the spec's product decisions; fix what visibly diverges before exiting. The screenshots may be attached to the issue for the owner's passive glance.
* **Exit lint sweep, changed files only:**

```bash
files=$(git diff --name-only --diff-filter=ACMR origin/beta...HEAD \
  -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs')
[ -n "$files" ] && echo "$files" | xargs pnpm exec biome check --write --no-errors-on-unmatched
```

Fix every remaining diagnostic inline, re-run `tsc --noEmit`, commit. Never widen to `biome check .`.

## 4. Exit: STOP when built

Never push, never branch, never open PRs, never auto-invoke QC. Report a
compact build summary (tasks, files, deviations), then:

<exit-example>

Built: 6 tasks, 14 files, no deviations. When ready, run here in Codex (gpt-5.6-sol high):

```
/ft-qc
```

</exit-example>
