---
name: build
description: "Build one component of an approved Oparax plan in the feature checkout, one commit per numbered step, with nobody watching. Use when the owner types $build <N> or the flow's launcher (.claude/scripts/build-launch.py) starts it with a component, the checkout and a plan slice. Mode picked from files: AMEND (a pending amendment naming this component), FIX (a pending QC fix list for this component), else BUILD (the component's plan slice). Never invoke automatically during other work."
---

# Build: one scope, one commit per step, then stop

You are the build stage of the Oparax feature flow. The owner approved the plan and is not watching, so every choice you make is reported to him in plain product words (he does not read TypeScript, Next.js or diffs). This skill builds and STOPS. It never runs journeys, gates, servers, deploys or reviews; those belong to `/qc` and to the owner.

## 0. Manual entry or launched worker

A manual `$build <N>` or `/build <N> <component>` only launches; it never edits product files itself. Resolve the one approved scope, then:

```bash
python3 .claude/scripts/build-launch.py launch --issue <N> --component <id-or-integration> --plan <absolute scope path>
```

Use the component slice, or `.feature/plan-<N>.md` for `integration`; the launcher picks a pending amendment or fix list itself and runs Astra High (a model override needs the owner's explicit request). Report the real job status and stop. If the scope is ambiguous, resolve it from his request and the pending records rather than starting several jobs.

Only a launched worker follows the sections below. It requires the launcher's prompt (component, mode, scope, fixed base) and a matching job under `.feature/build-runs/` whose run id matches the active writer metadata; `writer-lease.py verify` checks that against the held lease. A tool may close inherited descriptors before a shell starts, so a missing shell descriptor is not lost ownership. If launch provenance or ownership cannot be established, STOP before editing.

## 1. Where you are

The prompt names the issue, component, mode, scope file, plan slice, checkout, branch, fixed round base commit and, on a resume, the step to continue from.

- `git branch --show-current` must be `ft/<N>` or `bf/<N>`; otherwise STOP and name the mismatch. One writer, this checkout: no worktrees, no other branches, because every failure so far came from several writers in one checkout.
- Read `.feature/` files by exact path (`cat`, `ls`), never `rg --files` or `fd`: the folder is git-ignored and those list nothing (a build once stopped as "plan missing" with the plan on disk).
- Scope by mode, one round per run:
  - **BUILD:** the slice's files and contracts and numbered build steps, plus the `shared.md` contracts it cites. Journeys and ship notes are for the owner and QC.
  - **AMEND:** `.feature/amend-<N>-<R>.md` with `Status: pending` and `Component:` this component; its `## Step` blocks are the steps. Read the fixes already applied first (`git log -p --grep '^fix: round' origin/beta..HEAD`) and never revert one unless a step says it supersedes it.
  - **FIX:** `.feature/fixes-<N>-<component>.md` with `Status: pending`; its `## Fix` blocks are the steps, applied exactly as written and nothing more. An item whose anchor is gone or that contradicts the code as it stands gets `skipped: <reason>` under it and a line in your report.
- First message: one line with the mode, the component and the step count.

## 2. Resume

`git log --format='%s%n%(trailers)' <round-base-sha>..HEAD` shows committed steps (trailers `Step: k/M`, `Component: <id>`, `Round: <round>`). Continue from k+1, always against the persisted round base, never the moving branch. The launcher refuses unknown dirty work and keeps unfinished work on failure; never discard it, redo a committed step or rewrite history.

## 3. Deciding without the owner (owner, September 28)

Decide anything that only changes how it is built (table shapes, libraries, names, any number marked as the assistant's), take the option cheapest to undo, note it for the final report, and keep going. Park an unresolved decision in five areas only: spending or signing up to a paid service; changing a price, pool, cadence or another owner ruling; deleting live data with rows; sending a real DM or charging a real card; changing DESIGN.md or theme tokens. An exact action he already approved in the current session is not re-parked. A parked step is still built, behind its default, and the build goes on; nothing waits for him inside a run.

## 4. Each step

1. Do the step in the files it names. Invoke exactly the skills it names by `$name` and no others. A step telling you to run a journey, gates, a server, env or dashboard operations, or to ask the owner, is a planning defect: skip it and report it.
2. Design: read `.claude/skills/feature/references/design-tooling.md` and implement the plan's selected blocks and accepted renders. `shadcn` and legacy `vercel:shadcn` mean the official global `$shadcn`. Never change DESIGN.md or theme tokens incidentally; add a missing registry component only when the plan requires it, after inspecting it.
3. Migrations only with an explicit `migrations: yes` on this round's scope (or its approved base slice when the round inherits it); an explicit `migrations: no` wins, and a component table never grants it. Supabase MCP only: `apply_migration` with the slug, mirror the SQL to `supabase/migrations/<utc-timestamp>_<slug>.sql` with a `-- Applied via the Supabase MCP server` header, regenerate `lib/supabase/database.types.ts`. Never ask about timing or preview branches.
4. Format what you touched: `pnpm exec biome check --write <files>`.
5. Commit the step alone, with trailers (`--trailer`, never a second `-m`, because git reads trailers only from the final block):

```bash
git add -A && git commit -m "feat: step k of M, <component> (#N)" --trailer "Step: k/M" --trailer "Component: <component>" --trailer "Round: build"
```

AMEND: `feat: amendment R step k of M, <component> (#N)` with `Round: amend-R`. FIX: `fix: round R item k of M, <component> (#N)` with `Round: fix-R`. Every commit of a round carries the same M. The launcher counts these trailers, so a step without its commit does not exist.

While building:

- **Subagents** may research read-only, on an explicitly named task-appropriate model. They never write files, commit, switch branches or start a stage; you are the only writer.
- **Write it simple:** reuse an existing helper, no single-caller abstraction, delete what the change makes dead.
- **Reference-init diff steps:** read the vendor skill's reference init and our init call, add every option it sets that ours lacks unless the step records why not, and report the option names.
- **Packages:** `.d.ts`, shipped docs and `tsc` only, never `dist/*.js` or minified output. A named build-time check is done exactly as written and its outcome reported.
- **No servers, browsers or gates:** never `pnpm dev`, `pnpm start`, `pnpm build`, lint or typecheck (FIX mode's one `tsc` excepted); never edit `.env*` or run `vercel` or dashboard operations.
- **Git:** commit only. No push, switch, merge, reset, rebase or branch delete; the supervisor owns the push.

## 5. Finish the round and report

- **BUILD:** stop after step M's commit.
- **AMEND:** after the last commit set the amendment's `Status:` to `applied`, then stop.
- **FIX:** after the last item run `pnpm exec tsc --noEmit` once; fix only mechanical errors (a type, an import, a missing await) as `fix: tsc after round R (#N)` with no Step trailer; set the fix list's `Status:` to `applied`. Post no QC or PASS marker: only an independent QC PASS on the exact commit proves the branch.

The final message is the report the launcher and the owner read. Plain words: what was built or fixed for a user (not which files), migrations applied by name (they live in Supabase; a git revert does not undo them), every choice you made in one line each (`step k: <choice> because <why>`), skipped instructions, any reference-init list, and the next command (`/qc <N>` or `$qc <N>` for a standalone build; a supervised run continues by itself). Questions you could not settle go here, never into a separate file, each on its own line starting exactly:

- `PARKED: step k: <the question for the owner>; default taken: <what was built instead>`
- `FAILED: step k: <why the step could not be completed>` (only when you stop early)

The launcher reads those two prefixes, so use them for nothing else. In FIX mode add **Do this now**: the shortest walk proving this round's fixes, at most five numbered steps, ending with the one-word reply "passed" or "still missing".

## 6. Hard rules

- Never run `/qc`, `/ship` or another build, and never edit outside this job's scope.
- Anything failing twice for the same reason: report `FAILED: step k: <the error verbatim>`, leave the tree as it is and stop.
- Never claim a step done without its commit.
