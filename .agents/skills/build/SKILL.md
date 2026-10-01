---
name: build
description: "Build one component of an approved Oparax plan in the active canonical feature checkout, one commit per numbered step, with nobody watching. Use when the owner types $build <N> or the flow's launcher (.claude/scripts/build-launch.py) starts it with a component, an existing checkout and a plan slice. Mode picked from files: AMEND (a pending amendment naming this component), FIX (a pending QC fix list for this component), else BUILD (the component's plan slice). Never invoke automatically during other work."
---

# Build: one scope in the active checkout, one commit per step, then stop

You are the build stage of the Oparax feature flow. The owner approved the plan and is not watching: every choice you make is written down for him in plain product words (he does not read TypeScript, Next.js or diffs). This skill builds and STOPS. It never runs journeys, gates, servers, deploys or reviews; those belong to `/qc` in Claude Code and to the owner.

## 0. Manual entry or launched worker

A manual `$build <N>` or `/build <N> <component>` is a launcher entry, not permission for the current host to edit product files without writer ownership. Resolve the one approved scope and existing canonical checkout, then run:

```bash
python3 .claude/scripts/build-launch.py launch --issue <N> --component <id-or-integration> --plan <absolute scope path>
```

Use the component slice, or the table plan for `integration`; the launcher selects a pending amendment or fix list. Default Astra High is unchanged; a manual model override needs the owner's explicit request. Report the real job status and stop. If the scope is ambiguous, resolve it from the owner's request and approved pending records rather than starting multiple jobs.

Only the launched worker follows the implementation sections below. Require the launcher's component/mode/scope/fixed-base assignment and a matching current-checkout job manifest under `.feature/build-runs/`. Check that its run id matches active writer metadata in the common Git directory; `writer-lease.py verify` checks that metadata context against the held operating-system lease. A manual entry never adopts another job merely because its manifest exists. The launcher owns descriptor inheritance and actual exclusivity. Provider tools may close inherited descriptors before starting a shell, so a missing shell descriptor is not evidence that ownership was lost; do not require shell `fstat` or unsupported standalone environment tokens. If launch provenance or matching active ownership cannot be established, STOP before editing.

## 1. Where you are

The launcher's prompt names the issue, the component, the mode, the scope file, the plan slice, the checkout, the canonical branch, the fixed round base commit, the decision log and, on a resume, the step to continue from. The manual entry resolves these facts and delegates through section 0. Never infer a live job from an old run record; every implementation worker is launched under repository writer ownership.

- `git branch --show-current` must be `ft/<N>` or `bf/<N>`. If not, STOP and name the mismatch. No stage creates a component branch or checkout automatically. Existing component worktrees and schema-v1 run records are historical, not a target to adopt or resume silently.
- Read `.feature/` files by exact path (`cat`, `ls`), never with `rg --files` or `fd`: the folder is git-ignored and those tools list nothing there (a build once stopped as "plan missing" while the plan sat on disk).
- Scope by mode, one round per run:
  - **BUILD**: the plan slice. Read its files/contracts and numbered build steps, plus the exact shared contracts it cites in `.feature/plan-<N>/shared.md`; journeys and ship notes are for the owner and `/qc`. A proof mapping describes later evidence, not extra execution work.
  - **AMEND**: `.feature/amend-<N>-<R>.md` with `Status: pending` and `Component: <this component>`; its `## Step` blocks are the numbered steps. Read applied canonical `.feature/fixes-<N>-<component>.md` and `.feature/lanes/<N>/<component>/round-<R>/fixes.md` archives first, checking exact round job verdicts where an archive still says pending. Include affected adjacent components' applied fixes for an integration amendment. Never revert an applied fix unless a step explicitly supersedes it.
  - **FIX**: `.feature/fixes-<N>-<component>.md` with `Status: pending`; its `## Fix` blocks (`file`, `line`, `fix`, `owner`) are the numbered steps, applied exactly as written, nothing beyond them. An item whose anchor is gone or that contradicts the code as it stands is skipped: add `skipped: <reason>` under it and one decision-log line.
  - AMEND is checked first, then FIX, then BUILD; the launcher applies the same order and names the result.
- Your first message is one line: the mode, the component and the step count.

## 2. Resume

`git log --format='%s%n%(trailers)' <round-base-sha>..HEAD` shows the committed steps: trailers `Step: k/M`, `Component: <id>`, `Round: <this round>`. Continue from k+1. Use the fixed base SHA persisted for this round, never the moving feature branch as the base. The launcher refuses unknown dirty work and retains unfinished work on failure; never discard it, redo a committed step or rewrite history.

## 3. Deciding without the owner (owner, September 28)

The builder decides anything that changes only how it is built (table shapes, libraries, names, any number the docs mark as the assistant's), takes the option cheapest to undo, writes one line in the run's decision log saying what and why, and keeps going. A surprise parks only the affected part behind its default; everything else continues. It parks an unresolved decision in five areas: spending or signing up to a paid service; changing a price, pool, cadence or another owner ruling; deleting live data with rows; sending a real DM or charging a real card; changing DESIGN.md or theme tokens. An exact scoped action already explicitly approved in the current session is authorized; do not re-ask or park it merely because it is in one of those areas. Incidental or newly invented changes remain outside scope.

The decision log is the file the prompt names (`.feature/decisions-<N>-<component>.md` in the main checkout), appended, one line each, plain words:

- `step k: <what you chose> because <why>`
- `PARKED: step k: <the question for the owner>; default taken: <what was built instead>`
- `FAILED: step k: <why the step could not be completed>` (only when you stop, section 6)

A parked step is still built, behind its default, and the build goes on to the next step. Nothing waits for the owner inside a run.

## 4. Each step

1. Do the step in the files it names, in order. Invoke exactly the skills the step names by `$name` and no others. A build step that tells you to run a journey, gates, a server, env or dashboard operations, or to ask the owner something: skip it and log one line (a planning defect, not an order).
2. Design: read `.claude/skills/feature/references/design-tooling.md` and implement the plan's actual selected blocks and accepted reference. Resolve `shadcn` and legacy `vercel:shadcn` steps to the official global `$shadcn` skill. Do not rewrite approved plan files or hashes. Never change DESIGN.md or theme tokens incidentally. Existing primitives are preserved; adding a missing registry component is allowed when the plan requires it, after inspecting the change.
3. Migrations require the launcher's permission from an explicit `migrations: yes` on the approved effective amendment/fix scope, or its approved base slice when the round inherits that permission; an explicit `migrations: no` on the round wins. Never infer permission from a component table. The one repository writer keeps database work sequential. Supabase MCP only, no CLI: `apply_migration` with the slug as the name, mirror the SQL to `supabase/migrations/<utc-timestamp>_<slug>.sql` with a `-- Applied via the Supabase MCP server` header, regenerate `lib/supabase/database.types.ts`. Never ask about timing or preview branches.
4. Format what you touched: `pnpm exec biome check --write <files>` (do not rely only on the format-on-write hook).
5. Commit the step, trailers included, and nothing else in the same commit (`--trailer`, never a second `-m`: git reads trailers only from one final block):

```bash
git add -A && git commit -m "feat: step k of M, <component> (#N)" --trailer "Step: k/M" --trailer "Component: <component>" --trailer "Round: build"
```

AMEND: subject `feat: amendment R step k of M, <component> (#N)`, `Round: amend-R`. FIX: subject `fix: round R item k of M, <component> (#N)`, `Round: fix-R`. M is the step count of this round's scope; every commit of the round says the same M. The launcher reads these trailers to decide BUILT, PARKED or FAILED, so a step without its commit does not exist.

Rules while building:

- **Subagents:** independent read-only research may run in parallel, with an explicitly named task-appropriate model. One agent writes product files by default. Parallel implementation or another checkout requires the owner's explicit request, clear file ownership and coordination. Subagents never commit, switch branches or start another stage.
- **Write it simple:** reuse an existing helper over adding one, no abstraction with a single caller, delete code the change makes dead.
- **Reference-init diff steps** (so named): read the vendor skill's reference init snippet and our init call, list every option the reference sets that ours does not, add each unless the step records a decision not to, and log the list (option names only).
- **Packages: types and docs, never the bundle.** Rely on `.d.ts` files, shipped docs and `tsc`; never read `dist/*.js` or minified output. A named build-time check is performed exactly as the step describes and its outcome logged.
- **No servers, no browsers, no gates.** Never run `pnpm dev`, `pnpm start`, `pnpm build`, lint or typecheck (FIX mode's one `tsc` is the exception); never open a browser or computer-use tool. Never edit `.env*`, never run `vercel` or dashboard operations.
- **Git:** commit only. No push, no switch, no merge, no reset, no branch delete, no rebase; these are stage boundaries; the supervisor owns the normal feature-branch push. Do not claim project Git rules deny commands when no such rule exists.

## 5. Finishing a round

- **BUILD**: after step M's commit, STOP.
- **AMEND**: after the last step's commit, set the amendment file's `Status:` to `applied`. STOP.
- **FIX**: after the last item's commit run `pnpm exec tsc --noEmit` once; fix only what is mechanical (a type, an import, a missing await) and commit it as `fix: tsc after round R (#N)` with no Step trailer; anything else is logged as `FAILED:` and you stop. Set the fix file's `Status:` to `applied`, report fixes applied and STOP. Post no QC-done or PASS marker. Only a subsequent independent QC PASS, tied to the exact reviewed commit, proves the branch passed; a fix commit is not review proof.

Final message, plain words: what was built or fixed (what changed for a user, not which files), migrations applied by name (they live in Supabase and a git revert does not undo them), every `PARKED:` line copied verbatim, skipped instructions, the reference-init list if a step carried one, and the next command, `/qc <N>` in Claude Code or `$qc <N>` in Codex for a standalone build; under a valid active supervisor, it continues into QC automatically. In FIX mode add **Do this now** (the single shortest walk proving this round's fixes, five numbered steps at most, ending with the one-word reply "passed" or "still missing"). The launcher decides the run's state from the commits and the log, not from this message.

## 6. Hard rules

- **Stage boundary:** never run `/qc`, `/ship` or another `$build`; never edit outside this job's approved scope or start a competing writer.
- Anything failing twice for the same reason: log `FAILED: step k: <the error verbatim>`, leave the tree as it is, and stop; do not thrash.
- Never claim a step done without its commit; say exactly what is done and what is not.
