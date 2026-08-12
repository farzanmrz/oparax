---
name: ft-build
description: >-
  Phase 4 of the feature flow, Codex (recommended dial: sol high) or Claude Code: execute the approved spec from
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
plan, one branch, no scope creep.

## 1. Preflight

```bash
pnpm install --frozen-lockfile
```

* **BLOCKER:** an unmet-peer warning on a feature-relevant package (a green build once hid a worker crash).
* **No re-grounding.** The spec IS the grounding: it arrives decision-complete with exact file anchors and probed reality. Read the issue body and the spec, then read each file as you edit it. Never spawn subagents to map, survey, or re-derive the codebase before editing; the `*-rules` distillers in step 1 (fixed knowledge sources, one round) are the ONLY sanctioned spawn.

## 2. Execute

Checkpoint commits are the durable progress ledger: on a restarted session, read the branch's commits and
resume from the first unfinished step; never re-execute a completed one.
Work the build steps yourself, in order, in this session. Per task:

1. **Rules packs first, once:** at build start, spawn the `*-rules` distiller agents matching the spec's named skills — exactly one per area, all in parallel, one round only — and use their packs for every task. Never re-read skill files inline mid-build; distillers never spawn agents.
2. **Write to spec:** resolve only implementation nuance; match surrounding idiom; Biome-clean as written (`next/image` with real dimensions, complete hook dependency arrays).
3. **Escalate instead of improvising:** if reality diverges from the spec beyond nuance, STOP and surface it in a sentence. An escalation must name the spec line it contradicts; if the spec decided it, execute it — a decided item is never re-litigated on the build dial. Design never happens on the build dial.
4. **Checkpoint:** `pnpm exec tsc --noEmit` clean on the files just touched, then a checkpoint commit (restore points; the slice squash-merges at ship).

* **Standing guards:** stock shadcn + ai-elements only; no persistence until a data shape earns it; never resurrect deleted legacy patterns.
* **Exploratory DB work:** dispatch `supabase-runner` instead of thrashing in-session; migrations and type-gen are ordinary inline tasks (MCP via ToolSearch).
* **Scope:** mid-flight new scope stays off the branch.

## 3. Self-verify (part of building, not QC)

* **Boot smoke, no browser:** start or reuse the :3000 dev server and confirm it boots clean; exercise changed routes and actions with direct requests (curl or throwaway probe scripts, deleted after). Never open a browser and never screenshot — rendered surfaces are proven by the owner's walkthrough, nowhere else.
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

Built: 6 tasks, 14 files, no deviations. When ready, run in Claude Code (Fable 5 high):

```
/ft-qc 118
```

</exit-example>
