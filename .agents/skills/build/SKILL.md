---
name: build
description: "Build (or fix) an oparax feature slice on its ft/<N> branch from the issue's detailed plan. Use only when the owner explicitly types $build <N> in Codex. Two modes, picked automatically: BUILD mode implements the detailed plan's build steps and commits once; FIX mode applies the fix list the Claude Code /qc round left in .feature/fixes-<N>.md, runs tsc, commits, posts the QC round marker, and ends with a plain walk-through of what the owner checks before /ship. Never invoke automatically during other work."
---

# Build: one Codex session, one branch, one commit, then stop

You are the build stage of the oparax feature flow. The owner typed `$build <N>` and is watching this session; they are a technical AI engineer who does not read TypeScript or Next.js, so every message to them is plain product language. This skill builds (or fixes) and STOPS. It never runs journeys, gates, servers, deploys, or reviews; those belong to `/qc` in Claude Code and to the owner.

## 1. Confirm the branch and read the local plan

```bash
git branch --show-current
```

Expect `ft/<N>` (or `bf/<N>` for a bug). If the tree is on something else, `git fetch origin ft/<N> && git switch ft/<N>`. If the branch does not exist, STOP: `/feature` has not been run for this issue; never create the branch here.

The detailed plan is the local file `.feature/plan-<N>.md` (git-ignored, on this machine; the issue body carries only the owner's plain plan, by owner decision 2026-08-18). Check for it and every other `.feature/` file by exact path (`ls .feature/plan-<N>.md`, `cat`), NEVER with `rg --files`, `fd`, or any listing that respects ignore rules: the whole `.feature/` directory is gitignored, those tools silently list nothing there, and on 2026-08-23 a build stopped as "plan missing" while the plan sat on disk, invisible to `rg --files` and to its `--hidden` retry (only `--no-ignore` overrides ignore rules, and nothing should need to). It has a `Skills:` line and four numbered parts: `## 1. Files and contracts`, `## 2. Build steps`, `## 3. Acceptance journeys`, `## 4. Owner does at ship`. If the file is missing, look once for a legacy copy on the issue (`gh issue view <N> --json body`, the text between `<summary>Detailed plan (for the build stage)</summary>` and `</details>`) and write it to `.feature/plan-<N>.md` with shell; if there is none there either, STOP and tell the owner to run `/feature` (or `/amend`) again to regenerate it.

Amendments are separate local files, `.feature/amend-<N>-<R>.md`, one per round R, each with `Round:`, `Status:` (`pending` or `applied`), a `Skills:` line, `## Step` blocks, and an `## Acceptance journeys` part. They are read after the plan, in round order, and never merged into it.

## 2. Pick the mode and say it

- **AMEND mode** if the branch already has a `feat:` commit ahead of `origin/beta` and any `.feature/amend-<N>-<R>.md` has `Status: pending`. Checked first: an amendment can sit on a branch that also has a pending fix list, and the amendment goes first.
- **FIX mode** if `.feature/fixes-<N>.md` exists and its `Status:` line says `pending`.
- **BUILD mode** otherwise (no `feat:` commit yet; pending amendment files, if any, are built right after the plan in this same mode), guarded: if the branch already has a commit whose message starts `feat:` ahead of `origin/beta`, and there is no pending amend or fix file, STOP and tell the owner the branch is already built (`/amend <N>` in Claude Code to add scope, `/qc <N>` to review it) instead of running BUILD mode again; re-running it on a built branch would re-apply migrations and can undo QC fixes.

Your first message to the owner is one line naming the mode and why ("BUILD mode: no pending fix list for #<N>", "AMEND mode: 1 pending amendment step from round 2", or "FIX mode: 4 pending fixes from QC round 1"). If that is wrong they stop you here.

## 3. BUILD mode

Read ONLY parts 1 and 2 of the detailed plan (Files and contracts, Build steps), then the `## Step` blocks of every `.feature/amend-<N>-<R>.md` whose `Status:` is `pending`, in round order; those steps are built after the plan's, in the same commit, and each such file's `Status:` is flipped to `applied` at the end. Parts 3 and 4 are for the owner and for `/qc`; if a build step nonetheless tells you to run a journey, run gates/typecheck/lint/build, start or restart a server or the poller, edit env files, touch Vercel/Railway/dashboards, or ask the owner something, SKIP that instruction and note it in your final message. Those instructions leaking into a build step is a planning defect, not an order.

Rules while building:

- **Stay inside the plan.** Implement the numbered build steps in order, in the named files. If reality diverges from the plan beyond nuance (a named file or function is not where the plan says, a contract cannot be met as written, a tool it names does not exist), STOP at that step, leave the tree as it is, and tell the owner plainly which step and why. Never improvise around a blocker, never substitute a different approach.
- **Skills:** per step, invoke exactly the skills that step names by `$name` (`$vercel:nextjs`, `$supabase:supabase`, `$posthog:instrument-integration`, `$use-railway`, ...) and no others.
- **Migrations go through the Supabase MCP only.** There is no Supabase CLI on this machine; do not look for one, do not run `supabase ...`. Call `apply_migration` with the SLUG ONLY as the name (the version is stamped remotely), then mirror the exact SQL into `supabase/migrations/<utc-timestamp>_<slug>.sql` with a `-- Applied via the Supabase MCP server` header comment, and regenerate `lib/supabase/database.types.ts` with `generate_typescript_types` when the schema changed. Applying to the one shared project during build is the standing convention; never ask about migration timing or preview branches.
- **Write it simple:** reuse an existing helper over adding one, no abstraction with a single caller, delete code the change makes dead.
- **Reference-init diff steps** (a plan or amendment step so named): read exactly the vendor skill's reference init snippet for our framework and our own init call, list every option the reference sets that ours does not, add each one unless the step records a decision not to, and put that list (option names only) in the closing message. Nothing else is read for this step; it is a comparison, not an investigation.
- **Third-party packages: types and docs, never the bundle.** Rely on a package's `.d.ts` types and shipped docs under `node_modules` and on `tsc` to tell you whether a name or option exists; never read or trace a package's built or minified output (`dist/*.js`, `*.min.js`). When a plan step names a build-time check about how a package behaves (candidate causes, what to do in each case), perform exactly that check as the step describes, pick the branch the evidence supports, and record which one and why in the completion message; never widen it into an investigation.
- **No servers, no long-lived processes, while this skill runs.** Never run `pnpm dev`, `pnpm start`, the poller, or anything that does not exit on its own. Never open a browser or use any browser/computer-use tool (no in-app browser, no screenshots); journeys are the owner's, after /qc. This binds the build itself. Once the closing message is sent, or whenever the owner asks in their own words in this chat to start the app, open a browser, or cold-test something, the owner's instruction wins immediately (AGENTS.md says so): do it, in this session, without asking them to change a rule or open a new task.
- **No gates.** Do not run `pnpm build`, `tsc`, lint, or typecheck; `/qc` runs them once, right after you.
- **No env or deploy operations.** Never edit `.env*` files, never run `vercel`, `railway`, or dashboard operations.
- **Git:** no branch switching, no reset, no stash, no push. One commit at the end (below).

When every build step is done:

```bash
git add -A && git commit -m "feat: <one line, issue #<N>>"
```

Then STOP. Final message to the owner, plain words: what was built (what changed for a user, not which files), any migrations applied (name them; they live in Supabase and are not undone by a git revert), any build-step instruction you skipped as out of scope, the reference-init diff list if a step carried one, and the next command:

```
/qc <N>
```

in Claude Code.

## 4. AMEND mode

Read every `.feature/amend-<N>-<R>.md` whose `Status:` is `pending`, in round order. Each holds `Round: <R>`, `Status: pending`, a `Skills:` line, one `## Step` block per build step (same shape as a detailed-plan build step: named files, contracts, code changes), and an `## Acceptance journeys` part (for the owner's walk-through below, not for you to run). Apply only these steps, in order, in the named files, the same rules as BUILD mode (skills, Supabase MCP, no servers, no env/deploy, no branch operations). Never re-apply the plan or an `applied` amendment.

Before touching anything, read `.feature/fixes-<N>-round*.md` if present (every earlier round's applied QC fixes) so you know what is already there. Never revert an applied fix. The one exception: a step in this amendment that explicitly says it supersedes a fix (e.g. "supersedes round 1 fix 2") wins over that fix; every other applied fix stays exactly as it is.

When every step is done:

```bash
git add -A && git commit -m "feat: amendment <R> (#<N>)"
```

Edit each applied `.feature/amend-<N>-<R>.md` so `Status:` reads `applied`. STOP. Final message to the owner, plain words, same shape as BUILD mode's: what was added (what changed for a user, not which files), any migrations applied, any step you skipped as out of scope, and the next command:

```
/qc <N>
```

in Claude Code. No walk-through here: `/qc` comes first, and FIX mode's closing message (section 5) carries the gated walk-through (do this now, then the rest, at ship).

## 5. FIX mode

Read `.feature/fixes-<N>.md`. It holds `Round: <R>`, `Status: pending`, and one `## Fix` block per item. Any `.feature/fixes-<N>-round*.md` files next to it are earlier rounds, already applied; never edit, delete, or re-apply them (the next `/qc` reads them so it does not re-argue those corrections) with `file`, `line`, `fix` (the approach in one or two lines), and `owner` (the plain one-liner). The list is the whole scope: apply each item exactly as written, in the named file at the named anchor, and nothing beyond it. If an item cannot be applied as written (the anchor is gone, the fix contradicts the code as it now stands), skip it and record why; do not invent an alternative.

The same rules as BUILD mode apply (skills, Supabase MCP, no servers, no env/deploy, no branch operations), with two differences:

1. After the list, run `pnpm exec tsc --noEmit` once. Fix only what it reports if it is mechanical (a type, an import, a missing await); if it is not mechanical, stop and say so.
2. Commit and mark the round done:

```bash
git add -A && git commit -m "fix: qc round <R> corrections (#<N>)"
```

Edit `.feature/fixes-<N>.md` so `Status:` reads `applied` and each skipped item carries a `skipped:` line with the reason. Then post the round marker (`/ship` gates on it):

```bash
gh issue comment <N> --body "## QC round <R>: done
<one line per applied item, the owner text only>
<one line per skipped item: 'Not applied: <owner text> (<reason>)'>"
```

STOP. Final message to the owner, in this order:

1. Which fixes were applied, which were skipped and why, tsc result in one word.
2. **What to check before shipping**, in three blocks, in this order, and never as one flat dump of every journey (measured 2026-08-18: a fix round about PostHog privacy re-listed poller and cost journeys from round 1 and the owner did not know what to do):
   - **Do this now:** the single shortest walk that proves what THIS round changed (this round's fixes; if the branch has never been walked, the plan's first journey), five numbered steps at most, plain words (where to go, what to click or type, exactly what they should see), ending with the one-word reply to give ("passed" or "still missing"). One block, nothing else in it.
   - **Then, only if that passed:** the remaining acceptance journeys this round touched, from part 3 of the detailed plan and the amendment's journeys, each as its own short numbered walk. Journeys this round did not touch and that were already walked in an earlier round are NOT repeated; name them in one line ("poller batching and cost checks: unchanged since round 2, already walked"). No file names, no code, no query names; where a journey needs a dashboard or a log view outside the app, say which one and what to look for.
   - **At ship:** part 4 (Owner does at ship) as its own short checklist. This is the whole reason the owner walks the branch; never replace it with "walk the plan's journeys" and never front-load journeys this round did not change.
3. The next command:

```
$ship <N>
```

here in Codex (or `/ship <N>` in Claude Code, same skill), after they have walked those checks. If they want another review round first, `/qc <N>` again.

## Hard rules

- The owner triggers every stage; you never run `/qc`, `/ship`, or another `$build`.
- Anything failing twice for the same reason: report it verbatim and stop; do not thrash.
- Never claim COMPLETE with a step half-built or a file untouched; say exactly what is done and what is not.
