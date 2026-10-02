---
name: amend
description: >-
  Add or change functionality on an in-flight oparax issue N without a new
  issue or branch, same behavior in either host (it loads skill bundles
  with the Skill tool, uses independent Fable and Astra detailed drafts after plain approval,
  and runs the same critique as /feature (eight CLI review lanes)
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
allowed-tools: Bash(git *) Bash(gh *) Bash(bash *) Bash(python3 *) Skill Read Write Edit WebFetch WebSearch Monitor
model: inherit
disable-model-invocation: true
---

# Amend: add scope to an in-flight issue, same branch, same loop

One session, start to finish. This skill never builds, never runs QC; it ends by naming `$build <N>` for the owner to run, in Codex or as `/build <N>` in Claude Code.

## Same planning handoff as feature

Read [the shared planning protocol](../feature/references/planning-protocol.md). The planning host, Fable in Claude Code or the actual current model when `$amend` is explicitly invoked in Codex, discusses the addition and writes the plain amendment without automatic early peer calls. After plain approval, Fable and Astra High (`gpt-6-astra`) independently draft the technical amendment, compare and reconcile it. The fixed critique then runs, and Fable and Astra jointly adjudicate its findings. A host on another model coordinates exact-model read-only calls as the protocol says. Existing approved plans, earlier amendments and applied fixes are settled context; only the requested addition is open for design. Keep the amendment formats and existing issue/branch defined below. The manual build handoff remains step 6.

## Working style, every step of this command

- **When you have enough information to act, act.** Do not re-derive what the plan files and this conversation already establish, re-litigate a decision the owner has already made, or narrate options you will not pursue. A choice that is yours, make and record with its reason; a choice that is genuinely the owner's becomes a "What needs your call" line.
- **End a turn only at this command's named stops** (the step-2 slice agreement, the step-3 HARD STOP, a step-4 "What needs your call" answer). Anywhere else, before ending a turn, reread your last paragraph: if it is a plan, a question you could answer yourself, or a promise about work not yet done ("I'll..."), do that work now with tool calls instead of ending on it.
- **Claim only what you can point to.** Every statement of progress rests on a tool result from this session: a file read, a command's output, a lane's state line. Anything not yet verified is said to be unverified, plainly.
- **The owner reads product language, not a terminal.** Every owner-facing message leads with the outcome in complete plain sentences; no arrow chains, no shorthand invented mid-session, no vocabulary from the working thread. Short versus clear, choose clear.

## Hard rules for the planning stage

- **Research without running the product:** Follow feature's planning-stage research rules; use the same catalog selection and accepted-reference workflow as feature step 1.1 and its references/design-tooling.md. During discussion and design review, the planning host may research public references and standalone design previews in the background. Never start or attach to the product app. The owner's direct request still overrides the product runtime restriction as AGENTS.md states.
- **Reading has a ceiling.** The repo's own source is read freely; that is what the plan is grounded in. A third-party package under `node_modules` is read only for its public contract: the option names, signatures, and types in its `.d.ts` files and its shipped README or docs, to confirm that a name the plan cites exists and what shape it takes. Never read a package's built or minified output (`dist/*.js`, `*.min.js`, `*.cjs`, `*.mjs`), never trace how a package behaves at runtime, never chase one identifier from one grep into the next. If confirming a single fact takes more than three tool calls, stop: it is not a planning fact, it is a build-time check (next rule).
- **A runtime question is a plan step, not a research project.** When the brief describes a runtime symptom (something "reports disabled", "does not appear", "fires twice"), or asks to "validate", "verify", "confirm", or "determine why" something happens when the app runs, do not settle it here. Name the source or public-contract check the build can actually perform, with candidate causes and the resulting code decision. Put rendered/runtime behavior in the owner acceptance journey or permitted QC screenshot check. Asking for validation in a stage brief does not authorize an app run; a direct in-chat runtime instruction still has the immediate host override. Record static evidence limits rather than claiming the runtime symptom was proved.
- **Owner-stated facts are given.** Anything the brief lists as already established (a dashboard setting, an observed status, a decision) is not re-verified here; it is quoted into the plan as a premise. The owner's description of the gap IS the gap: do not re-diagnose what they already diagnosed; take it as the starting point and plan the fix. Verify the code, not the owner.

## 1. Confirm the branch and read the plans

The argument is either an issue number or plain text describing the addition (usually the latter, since the owner is already on the branch). Resolve N first:

```bash
git branch --show-current
```

- Argument is a number: N is that number; expect the branch to be `ft/<N>` (or `bf/<N>`). If not, STOP and name the expected and actual branches. Do not switch a checkout that may belong to an active writer. The host must route the amendment to the existing canonical checkout.
- Argument is text (or empty): N is the number in the current branch name (`ft/124` gives 124). If the current branch is not `ft/<N>` or `bf/<N>`, STOP and ask which issue. The text is the owner's opening description of the addition; carry it into step 2 as the first thing to talk through, do not make them repeat it.

Read, never edit, the two existing plan files: `.feature/plan-<N>-owner.md` (the plain plan, same text as the issue body) and `.feature/plan-<N>.md` (the detailed plan). If either is missing (an issue from before 2026-08-18 carried the detailed plan inside a `<details>` block on the issue body), recreate it once from the issue with shell: the plain plan is everything before `<details>` (or the whole body if there is none), the detailed plan is the text between `<summary>Detailed plan (for the build stage)</summary>` and `</details>`. Bytes from the issue to the file, never retyped. Also read `.feature/plan-<N>/shared.md` and every affected component slice; include adjacent callers and their slices where the amendment changes a shared seam. The table is a map, not the complete implementation contract. Read earlier `.feature/amend-<N>-*.md`, the canonical `.feature/fixes-<N>-<mode>.md` lists and applied `.feature/lanes/<N>/<mode>/round-<R>/fixes.md` archives with their exact round verdicts: these record what has already been added and fixed on this branch.

R is 1 plus the number of existing `## Amendment` sections in the issue body (`grep -c '^## Amendment ' <body>`).

Whether the branch is already built (`git log --oneline origin/beta..HEAD` shows a `feat:` commit) changes nothing here; `$build` picks its own mode from that and from the pending amendment files.

## 2. Talk through the addition

Exactly like `/feature` step 1, scoped as a delta on top of what is already agreed: discuss the addition with the owner in plain product language, cut it to one slice if it is a tangle, and run the same UI checkpoint if it touches a user-facing surface. Pick skill bundles for the delta only (same bundle rules, including the `free` bundle).

The talk-through message has a fixed shape and a cap, because the owner is a vibe coder who reads product language only, and an open-ended message here turns into a wall of code findings (2026-08-18: a 5,000-character first message the owner could not parse, then a 1,500-character retry that worked; send the retry the first time). Exactly three short parts, no more:
1. **What you asked for, in one or two sentences**, restated in the plan's plain voice (what users get, what stays hidden, what does not change).
2. **Anything I found that changes it**, at most three lines, one each, each in the form "what it means for you, what I'll do about it"; no file names, no option names, no mechanism talk. If nothing changes, say "nothing" and skip.
3. **The question**: one line, a yes/no on the slice plus the bundles (and the UI checkpoint if it applies). Then END YOUR TURN if scope or bundles need agreement. If they are already explicitly settled in this conversation, continue to the concrete plain amendment without a duplicate scope confirmation. If the owner pushes back or does not understand, answer in the same three-part shape, shorter.

## 3. Write the plain amendment and get it approved

First draft privately and load the bundles below. The planning host writes the resulting two-part amendment to ONE new file, `.feature/amend-<N>-<R>-owner.md`, once, with shell or python (never the Write tool if the markdown-unwrap hook is a risk). It is the only thing the owner reads in this whole command, so it has exactly two parts and nothing else, in the plan's plain voice (no code terms, no file paths, no framework or SDK words):

```
## Amendment <R>: <short title>

**What will change**
<a few plain sentences: what users get, what stays hidden, what stops happening, and any earlier behavior or QC fix this reverses, said as "used to X, will now Y">

**What needs your call**
<either "Nothing, just approve." or one line per genuine judgment call: "A or B; I'd do A because ...">
```

No decisions list, no journeys, no mechanism, no "what this replaces" table. Journeys reach the owner after the build, in the walk-through `$build` writes. Everything with mechanism in it goes in the detailed file (step 4), which the owner never reads.

Load the skill bundles picked for the delta exactly as `/feature` step 3 (same table, same Skill-tool invocations, same one line per bundle), reading the private plain amendment as the draft; fold what applies into it (a point that needs the owner's judgment becomes a "What needs your call" line; everything else waits for the detailed file). Never show the owner raw skill text.

**HARD STOP: the owner approves the plain amendment before anything else happens.** Print `.feature/amend-<N>-<R>-owner.md` with shell (`cat`), whole, as the entire message apart from one opening line ("Everything else in #<N> stays as approved and built. This is the amendment:"). Then END YOUR TURN and wait for the owner to say yes in this conversation. Nothing in steps 4 to 6 (the detailed file, the critique lanes, the issue update) starts before that yes. The owner's opening brief, however complete or directive it reads, is NOT approval: they approve this file, not their own prompt. Step 2 requires an exchange only for scope or bundles that are not already settled. Earlier explicit authorization persists, but it does not replace approval of this concrete plain amendment. Running from an opening brief directly to critique without plain-plan approval was the failure on 2026-08-18. If the owner pushes back, edit the file by hunk and print it again, whole; the file is the plan.

## 4. Write the detailed amendment and critique it

After owner approval, Fable and Astra independently draft the complete detailed amendment from the approved addition and settled base context, following the shared protocol. Compare their work and reconcile one amendment against the owner amendment, existing plan, earlier amendments, fixes, skill rules and repo source. Write the reconciled result to ONE new file, `.feature/amend-<N>-<R>.md`, once, in exactly this shape (the blank lines between the header lines are REQUIRED, the markdown-unwrap hook joins adjacent lines otherwise; write it with a shell heredoc or python; `$build`'s AMEND mode and `/qc` parse it). Never edit `.feature/plan-<N>.md`; the amendment is its own document, read after the plan. If the amendment touches how a third-party SDK is initialized, one of its steps is the reference-init diff exactly as `/feature` step 5.2 (two inputs, one list, no third read).

```
# Amendment <R> for issue <N>

Round: <R>

Status: pending

Component: <owning component id, or integration for a cross-component amendment>

migrations: <yes only for approved schema changes in this round, otherwise no>

Skills: <bare skill names this amendment's steps rest on, same form as the plan's Skills line>

## Step 1
<one build step, same shape as a detailed-plan build step: named files, contracts field by field, the code change in prose; a step that reverses an applied QC fix says "supersedes round <r> fix <k>" in its first line; a runtime question the brief raised is a named check here: what to look at, the candidate causes, what to do in each case>

## Step 2
...

## Acceptance journeys
<only the journeys this amendment adds or changes, in the plan's part-3 style; include a proof mapping from each implementation step to later build/typecheck evidence and an owner journey. The builder does not execute journeys; QC checks their required capabilities in source.>
```

Then run the critique exactly as `/feature` step 6: the same lanes and shared `.feature/lanes/critique.brief`, through the fixed shared runner and its bounded per-lane collection, with each lane's findings extracted and Fable and Astra independently dispositioning the full corpus before a joint decision and edits by hunk. The critique inherits feature's research boundary: local read-only inspection and official public documentation search or fetch are allowed, while product runtime, builds, tests, browser launch, writes, external-service actions, connectors, account-connected MCP tools and subagents remain forbidden. The brief differs here: the files under review are `.feature/amend-<N>-<R>.md` (the detailed amendment, the thing to attack) and `.feature/amend-<N>-<R>-owner.md` (the plain amendment, whose decisions are final); `.feature/plan-<N>.md`, `.feature/plan-<N>/shared.md`, every affected slice and adjacent caller slice, earlier approved amendments and applied canonical/round fix records are settled context; supply each exact path in the brief. Attack this amendment and how it wires into those real contracts, without reopening settled user behavior. Accepted findings land as, or inside, a `## Step` in the detailed file; a finding that needs the owner's judgment becomes a "What needs your call" line in the plain file.

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

Do NOT rename, archive, or edit `.feature/amend-<N>-<R>.md` after approval. Its `Component:` header selects the owning build scope (use `integration` for a cross-component addition). The launcher chooses one round in AMEND, FIX, BUILD order, and AMEND applies only the pending amendment naming that scope. It uses the same canonical `ft/<N>` or `bf/<N>` checkout and writer lease, then flips `Status:` to `applied`. An active supervisor owns continuation; never start a competing writer. This amendment does not edit the frozen base plan or create a branch.

## 6. End: name the next command

Close with one line (amendment number, what it adds in the owner's words) and tell the owner the next command is `$build <N>` in Codex or `/build <N>` in Claude Code, on this repo. Never build, never run QC yourself.

<exit-example>

Amendment 1 on issue #123 is in place: the plan now also drafts a weekly digest. When you're ready: `$build 123` in Codex, or `/build 123` in Claude Code.

</exit-example>
