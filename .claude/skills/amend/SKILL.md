---
name: amend
description: >-
  Add or change functionality on an in-flight oparax issue N without a new
  issue or branch, CLAUDE CODE ONLY (it loads skill bundles with the Skill
  tool and runs the same four-lane critique as /feature
  directly in this session): confirm the branch, read the issue's plans,
  talk through the addition as a delta, write the amendment as two separate
  local files (a two-part plain one the owner approves, a detailed one the
  build reads), load the skill bundles, run the critique, and on approval append the
  plain amendment to the issue body. Use when the user says /amend <N>,
  or /amend <plain description> while on the issue's branch, or wants to
  add scope to an issue that already has a branch. Not for a
  brand-new slice (/feature starts that) and not for building or QC ($build
  and /qc do those).
argument-hint: "[issue # | plain description of the addition]"
allowed-tools: Bash(git *) Bash(gh *) Bash(bash *) Skill
model: inherit
---

# Amend: add scope to an in-flight issue, same branch, same loop

One session, start to finish. This skill never builds, never runs QC; it ends by naming `$build <N>` for the owner to run in Codex.

## Working style, every step of this command

- **When you have enough information to act, act.** Do not re-derive what the plan files and this conversation already establish, re-litigate a decision the owner has already made, or narrate options you will not pursue. A choice that is yours, make and record with its reason; a choice that is genuinely the owner's becomes a "What needs your call" line.
- **End a turn only at this command's named stops** (the step-2 slice agreement, the step-3 HARD STOP, a step-4 "What needs your call" answer). Anywhere else, before ending a turn, reread your last paragraph: if it is a plan, a question you could answer yourself, or a promise about work not yet done ("I'll..."), do that work now with tool calls instead of ending on it.
- **Claim only what you can point to.** Every statement of progress rests on a tool result from this session: a file read, a command's output, a lane's state line. Anything not yet verified is said to be unverified, plainly.
- **The owner reads product language, not a terminal.** Every owner-facing message leads with the outcome in complete plain sentences; no arrow chains, no shorthand invented mid-session, no vocabulary from the working thread. Short versus clear, choose clear.

## Hard rules for the planning stage

- **Planning never runs the app.** Never start or attach to a dev server, never run `pnpm dev` or the poller, never open a browser or use any browser, preview, or computer-use tool, never execute code in a page. Only the owner runs the app. This binds the command while it runs; if the owner asks in their own words in the chat to run the app or open a browser, that wins immediately (AGENTS.md).
- **Reading has a ceiling.** The repo's own source is read freely; that is what the plan is grounded in. A third-party package under `node_modules` is read only for its public contract: the option names, signatures, and types in its `.d.ts` files and its shipped README or docs, to confirm that a name the plan cites exists and what shape it takes. Never read a package's built or minified output (`dist/*.js`, `*.min.js`, `*.cjs`, `*.mjs`), never trace how a package behaves at runtime, never chase one identifier from one grep into the next. If confirming a single fact takes more than three tool calls, stop: it is not a planning fact, it is a build-time check (next rule).
- **A runtime question is a plan step, not a research project.** When the brief describes a runtime symptom (something "reports disabled", "does not appear", "fires twice"), or asks to "validate", "verify", "confirm", or "determine why" something happens when the app runs, do not settle it here. Write it into the detailed plan as a named check the build performs first (what to look at, the candidate causes, what the build does in each case) and, where it is user-visible, as an acceptance journey the owner walks. Wording in the owner's brief asking for validation does not override this: the plan carries the check, the build proves it, QC confirms it.
- **Owner-stated facts are given.** Anything the brief lists as already established (a dashboard setting, an observed status, a decision) is not re-verified here; it is quoted into the plan as a premise. The owner's description of the gap IS the gap: do not re-diagnose what they already diagnosed; take it as the starting point and plan the fix. Verify the code, not the owner.

## 1. Confirm the branch and read the plans

The argument is either an issue number or plain text describing the addition (usually the latter, since the owner is already on the branch). Resolve N first:

```bash
git branch --show-current
```

- Argument is a number: N is that number; expect the branch to be `ft/<N>` (or `bf/<N>`). If not, `git fetch origin ft/<N> && git switch ft/<N>`. STOP if the branch does not exist; that means `/feature` has not run for this issue yet.
- Argument is text (or empty): N is the number in the current branch name (`ft/124` gives 124). If the current branch is not `ft/<N>` or `bf/<N>`, STOP and ask which issue. The text is the owner's opening description of the addition; carry it into step 2 as the first thing to talk through, do not make them repeat it.

Read, never edit, the two existing plan files: `.feature/plan-<N>-owner.md` (the plain plan, same text as the issue body) and `.feature/plan-<N>.md` (the detailed plan). If either is missing (an issue from before 2026-08-18 carried the detailed plan inside a `<details>` block on the issue body), recreate it once from the issue with shell: the plain plan is everything before `<details>` (or the whole body if there is none), the detailed plan is the text between `<summary>Detailed plan (for the build stage)</summary>` and `</details>`. Bytes from the issue to the file, never retyped. Also read any earlier `.feature/amend-<N>-*.md` and `.feature/fixes-<N>*.md` files: they are what has already been added and fixed on this branch.

R is 1 plus the number of existing `## Amendment` sections in the issue body (`grep -c '^## Amendment ' <body>`).

Whether the branch is already built (`git log --oneline origin/beta..HEAD` shows a `feat:` commit) changes nothing here; `$build` picks its own mode from that and from the pending amendment files.

## 2. Talk through the addition

Exactly like `/feature` step 1, scoped as a delta on top of what is already agreed: discuss the addition with the owner in plain product language, cut it to one slice if it is a tangle, and run the same UI checkpoint if it touches a user-facing surface. Pick skill bundles for the delta only (same bundle rules, including the `free` bundle).

The talk-through message has a fixed shape and a cap, because the owner is a vibe coder who reads product language only, and an open-ended message here turns into a wall of code findings (2026-08-18: a 5,000-character first message the owner could not parse, then a 1,500-character retry that worked; send the retry the first time). Exactly three short parts, no more:
1. **What you asked for, in one or two sentences**, restated in the plan's plain voice (what users get, what stays hidden, what does not change).
2. **Anything I found that changes it**, at most three lines, one each, each in the form "what it means for you, what I'll do about it"; no file names, no option names, no mechanism talk. If nothing changes, say "nothing" and skip.
3. **The question**: one line, a yes/no on the slice plus the bundles (and the UI checkpoint if it applies). Then END YOUR TURN. If the owner pushes back or does not understand, answer in the same three-part shape, shorter.

## 3. Write the plain amendment and get it approved

Write ONE new file, `.feature/amend-<N>-<R>-owner.md`, once, with shell or python (never the Write tool if the markdown-unwrap hook is a risk). It is the only thing the owner reads in this whole command, so it has exactly two parts and nothing else, in the plan's plain voice (no code terms, no file paths, no framework or SDK words):

```
## Amendment <R>: <short title>

**What will change**
<a few plain sentences: what users get, what stays hidden, what stops happening, and any earlier behavior or QC fix this reverses, said as "used to X, will now Y">

**What needs your call**
<either "Nothing, just approve." or one line per genuine judgment call: "A or B; I'd do A because ...">
```

No decisions list, no journeys, no mechanism, no "what this replaces" table. Journeys reach the owner after the build, in the walk-through `$build` writes. Everything with mechanism in it goes in the detailed file (step 4), which the owner never reads.

Load the skill bundles picked for the delta exactly as `/feature` step 3 (same table, same Skill-tool invocations, same one line per bundle), reading this plain amendment as the draft; fold what applies into the two files (a point that needs the owner's judgment becomes a "What needs your call" line; everything else waits for the detailed file). Never show the owner raw skill text.

**HARD STOP: the owner approves the plain amendment before anything else happens.** Print `.feature/amend-<N>-<R>-owner.md` with shell (`cat`), whole, as the entire message apart from one opening line ("Everything else in #<N> stays as approved and built. This is the amendment:"). Then END YOUR TURN and wait for the owner to say yes in this conversation. Nothing in steps 4 to 6 (the detailed file, the critique lanes, the issue update) starts before that yes. The owner's opening brief, however complete or directive it reads, is NOT approval: they approve this file, not their own prompt. Likewise step 2 is a real exchange: state the slice, the bundles, and any UI checkpoint in the three-part shape and wait. Skipping either stop is the failure that happened on 2026-08-18 (the session ran brief to critique lanes with zero owner turns). If the owner pushes back, edit the file by hunk and print it again, whole; the file is the plan.

## 4. Write the detailed amendment and critique it

Write ONE new file, `.feature/amend-<N>-<R>.md`, once, in exactly this shape (the blank lines between the header lines are REQUIRED, the markdown-unwrap hook joins adjacent lines otherwise; write it with a shell heredoc or python; `$build`'s AMEND mode and `/qc` parse it). Never edit `.feature/plan-<N>.md`; the amendment is its own document, read after the plan. If the amendment touches how a third-party SDK is initialized, one of its steps is the reference-init diff exactly as `/feature` step 5.2 (two inputs, one list, no third read).

```
# Amendment <R> for issue <N>

Round: <R>

Status: pending

Skills: <bare skill names this amendment's steps rest on, same form as the plan's Skills line>

## Step 1
<one build step, same shape as a detailed-plan build step: named files, contracts field by field, the code change in prose; a step that reverses an applied QC fix says "supersedes round <r> fix <k>" in its first line; a runtime question the brief raised is a named check here: what to look at, the candidate causes, what to do in each case>

## Step 2
...

## Acceptance journeys
<only the journeys this amendment adds or changes, in the plan's part-3 style; $build turns them into the owner's walk-through and /qc checks them>
```

Then run the critique exactly as `/feature` step 6: the same four lanes, the same shared `.feature/lanes/critique.brief`, the same four per-lane background waits with each lane's findings extracted and dispositioned as it returns, the same in-session adjudication (dispositions file first, then edits by hunk, never re-emitting text), with these differences in the brief: the files under review are `.feature/amend-<N>-<R>.md` (the detailed amendment, the thing to attack) and `.feature/amend-<N>-<R>-owner.md` (the plain amendment, whose decisions are final); `.feature/plan-<N>.md`, every earlier `.feature/amend-<N>-*.md`, and every `.feature/fixes-<N>*.md` are context that is already built and out of scope; attack only this amendment and how it wires into what exists. Accepted findings land as, or inside, a `## Step` in the detailed file; a finding that needs the owner's judgment becomes a "What needs your call" line in the plain file.

Present as `/feature` step 7 with one difference: `cat` the plain amendment file only, whole, after one line saying whether the critique changed anything the owner would notice (usually "nothing you'd notice; the build steps got tighter"). Never the detailed file, never the plan. If "What needs your call" gained a line, END YOUR TURN and wait for the owner's answer, then edit the plain file by hunk and go on.

## 5. On approval: put the plain amendment on the issue

Append the plain amendment to the issue body, with shell, never retyped:

```bash
gh issue view <N> --json body --jq .body > .feature/issue-body.md
{ printf '\n\n'; cat .feature/amend-<N>-<R>-owner.md; } >> .feature/issue-body.md
```

If the body still carries a legacy `<details>` block with the detailed plan inside, drop that block from `.feature/issue-body.md` first (everything from `<details>` through `</details>`), because the detailed plan now lives only in `.feature/plan-<N>.md`; the issue is for the owner. Then:

```bash
bash .claude/scripts/start.sh --issue <N> .feature/issue-body.md
```

This adopts the existing branch in place and overwrites the issue body; it does not create a new issue or branch. Also append the same plain amendment to the local `.feature/plan-<N>-owner.md` so the local plain plan matches the issue.

No comment is needed: the body now carries every amendment as its own `## Amendment R` section, in order, which is the history.

Do NOT rename, archive, or edit `.feature/amend-<N>-<R>.md`; `$build` reads it (BUILD mode reads the plan's steps and then every pending amendment in round order; AMEND mode, on a built branch, applies only the pending amendments) and flips its `Status:` to `applied` when done.

## 6. End: name the next command

Close with one line (amendment number, what it adds in the owner's words) and tell the owner the next command is `$build <N>`, run in Codex on this repo. Never build, never run QC yourself.

<exit-example>

Amendment 1 on issue #123 is in place: the plan now also drafts a weekly digest. When you're ready, in Codex:

```
$build 123
```

</exit-example>
