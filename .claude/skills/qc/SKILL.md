---
name: qc
description: >-
  The review side of feature work, same behavior in either host: on a
  branch that build ($build in Codex, or /build in Claude Code) has
  already built and committed, this session itself
  checks plan coverage and runs the gates, launches six review lanes
  in the background (three Codex, two agy, grok), does its own holistic review of
  the real diff while they run, then folds every set of findings into one fix list written to
  .feature/fixes-<N>.md for build's fix mode, tells the owner what is queued, and launches the
  Codex fix build itself without waiting: Sol High by default, Astra or Terra when the /qc
  invocation names one. No Workflow tool, no subagents. Use when the user says /qc <N>
  (optionally /qc <N> astra or /qc <N> terra). Not for building or fixing; both are $build in
  Codex or /build in Claude Code.
argument-hint: "[issue #] [sol|astra|terra]"
allowed-tools: Bash(git *) Bash(gh *) Bash(bash *) Bash(python3 *) Monitor Write Read Edit Grep Glob
model: inherit
disable-model-invocation: true
---

# QC: review what build built, hand the fix list back to build

One session, start to finish. Every step below runs on its own; the owner types nothing between `/qc <N>` and the final message. This skill never builds, never applies findings, never runs journeys; when fixes exist it writes them, tells the owner what is queued, launches the Codex fix build in the same breath (no approval stop; owner decision 2026-09-06) and stops; with no fixes it names `/ship <N>`. The fix build runs on Sol High unless the `/qc` invocation itself named Astra or Terra (`/qc 132 astra`); the owner chooses the model when they trigger QC, never in a question afterwards.

## Working style, every step of this command

- **This run is autonomous.** The owner is not answering questions mid-run, so never end a turn to ask one; the only mid-run stops are the STOP conditions written into the steps below (wrong branch, unapplied fixes, a missing or half-built step, a non-mechanical red gate), each of which ends the run with a plain blocker. Before ending any turn, reread your last paragraph: if it is a plan, an analysis, or a promise about work not yet done ("I'll..."), do that work now with tool calls. End only on a STOP or after the step-9 launch (or the no-fixes closing message).
- **Claim only what you can point to.** Every statement in the final message rests on a tool result from this run: the diff you read, a gate's output, a lane's state line. If tests or gates failed, say so with what they printed; if something was skipped or is unverified, say that; what is done and verified is stated plainly without hedging.
- **The fix list stays minimal.** A fix item corrects exactly what its finding names: no surrounding cleanup, no refactors, no abstractions or defenses for scenarios that cannot happen. The simplest change that resolves the finding is the fix.
- **The owner reads product language, not a terminal.** The step-8 message leads with the outcome in complete plain sentences; no arrow chains, no shorthand or names invented mid-run, no vocabulary from the working thread. Short versus clear, choose clear.

## 1. Confirm the branch

```bash
git branch --show-current
```

Expect `ft/<N>` (or `bf/<N>`). If not, `git fetch origin ft/<N> && git switch ft/<N>`. STOP if the branch does not exist. Then:

```bash
git status --short && git log --oneline origin/beta..HEAD
```

If there are no commits ahead of beta touching app code, STOP and tell the owner to run `$build <N>` in Codex (or `/build <N>` in Claude Code) first. If the only uncommitted paths are under `.claude/` or `.codex/` (tool configuration written mid-flow), commit them on this branch now and push: `git add -A -- .claude .codex && git commit -m "meta: commit tool configuration under .claude and .codex (#<N>)" && git push -u origin ft/<N>` (owner decision 2026-09-06; the build launcher applies the same rule, so these files never block a launch). Any other uncommitted change: say so and STOP; the tree should be exactly what build committed.

## 2. Read the issue, put the contract on disk

```bash
mkdir -p .feature/lanes
gh issue view <N> --json body -q .body > .feature/lanes/qc-issue-body.md
```

The contract is local (the issue body carries only the owner's plain plan, by owner decision 2026-08-18): copy `.feature/plan-<N>.md` to `.feature/lanes/qc-plan.md` with shell, then append every `.feature/amend-<N>-<R>.md` in round order under a heading `# AMENDMENTS (each approved by the owner after the plan; where an amendment step contradicts the plan or an earlier fix it names, the amendment wins)`. Bytes from file to file, never retyped. If `.feature/plan-<N>.md` is missing, recreate it once from a legacy `<details>` block on the issue body if there is one; otherwise STOP and say the detailed plan is gone. This file is the contract the diff was built to; both reviewers read it from disk.

## 3. Archive the previous round, append the amendments

Earlier rounds' fix lists are the branch's memory: without them each round re-argues corrections the last one made (round 2 of #124 reversed round 1's own fixes). Applied amendments are the same kind of memory.

1. If `.feature/fixes-<N>.md` exists and its `Status:` line reads `applied`, move it aside under its round number (read `Round: <R>` from the file):

   ```bash
   mv .feature/fixes-<N>.md .feature/fixes-<N>-round<R>.md
   ```

   If it exists with `Status: pending`, STOP: the last round's fixes were never applied; tell the owner to run `$build <N>` in Codex (or `/build <N>` in Claude Code) first.

2. Amendment files are never renamed: if any `.feature/amend-<N>-<R>.md` still reads `Status: pending`, STOP the same way (the owner runs `$build <N>` first); `applied` ones are already in the contract from step 2.

3. Append every archive, oldest first, to the contract file under a heading, with shell:

   ```bash
   { printf '\n\n# APPLIED QC FIXES (each item was accepted, applied by build, and is FINAL with the same standing as the plan; where an item deviates from the plan letter, the item wins)\n\n'; cat .feature/fixes-<N>-round*.md 2>/dev/null; } >> .feature/lanes/qc-plan.md
   ```

   The one exception to "the item wins": an amendment step that names an earlier fix it supersedes ("supersedes round 1 fix 2") beats that fix, because the owner approved the amendment after the fix; every other applied fix stays final.

## 4. Coverage and gates (this session, before any review)

The build was done by a separate build session; do not trust its summary, read the code. The diff under review, everywhere in this skill, is exactly:

```bash
git diff origin/beta...HEAD -- . ':(exclude).claude' ':(exclude).codex' ':(exclude).agents' ':(exclude).grok' ':(exclude).github' ':(exclude).feature' ':(exclude)docs' ':(exclude)pnpm-lock.yaml'
```

Meta and process paths are excluded on purpose and are never fix material.

1. **Coverage.** Run `git diff origin/beta...HEAD --stat` (with the same excludes) and the full diff, and read any changed file whose diff is not self-explanatory. Compare against `.feature/lanes/qc-plan.md`, parts `## 1. Files and contracts` and `## 2. Build steps` ONLY, as amended by the appended block (a contract an amendment changed is judged against the amendment, never listed as missing). Parts 3 and 4 are for the owner and for ship; never grade the diff against them. If a build step is a reference-init diff (vendor skill's reference init vs our init call), redo it yourself the same bounded way: the skill's snippet and our call, one list of option names the reference sets that ours does not, each either present in the code or covered by a recorded decision; an uncovered one is a finding. No third read. If a build step is missing or half-built, STOP here: tell the owner plainly which step and what is missing, do not run gates on a partial build, do not write a fix list, do not post a marker; the fix is a `$build <N>` in Codex (or `/build <N>` in Claude Code) after the plan or the build is corrected, or a word to you if they want the gap looked at first.
2. **Gates.** `bash .claude/scripts/qc-gates.sh` (pnpm build + tsc; use a Bash timeout of 600000; measured 10 to 12 seconds on a warm cache, up to a few minutes cold). GREEN: continue. RED: fix ONLY what the compiler or typechecker actually reports, and only mechanically (a type, an import, a missing await; no design or behavior changes, no new files), rerun until GREEN, then `git add -A && git commit -m "gates: <one line> (#<N>)"`. If the red is not mechanical (a real defect, a missing piece of the build), discard the partial attempt with `git checkout -- .` and STOP with a plain-language blocker for the owner.

Never start a dev server, never run pnpm dev or the poller, never touch env files, never open a browser or use any browser/computer-use tool, never write to git except the one `gates:` commit above and the step-1 `meta:` commit for `.claude/` and `.codex/` files. This binds the command while it runs; if the owner asks in their own words in the chat to run the app or open a browser, that wins immediately (AGENTS.md).

## 5. Launch the six review lanes, then review in parallel

1. Write `.feature/lanes/qc.brief`, in this order:
   - A budget line: "Budget: about 10 minutes of wall time. Read the contract and the diff first, verify claims against the code, do not chase side quests; if the budget is nearly spent, return what you have as valid findings JSON rather than nothing." (Prompt pressure only; the shared runner reports actual elapsed seconds. Owner decision 2026-08-23: 10 minutes at both stages, one number everywhere. Measured basis: prompted high lanes do not stretch to fill the allowance, under this line at the plan stage flash landed ~01:15, terra ~02:00, agy-pro ~04:00, sol ~05:15; at QC under a 5-minute line terra 01:14, flash 01:40, sol 03:16, agy-pro 03:47.)
   - The POST-IMPLEMENTATION framing: the diff is already built and committed on branch `ft/<N>`; the contract it was built to is `.feature/lanes/qc-plan.md` (read it first, including the appended amendments block); ground every claim in the actual code and cite real `file:line`; one holistic pass, no subagents, no servers, builds, or tests, no writes to git.
   - The reading ceiling: "Read the repo's own source freely. From a third-party package under node_modules read only its .d.ts types and shipped docs, to confirm a name or a shape the diff relies on; never its built or minified output (dist/*.js, *.min.js), never trace how it behaves at runtime. Where the plan named a build-time check about a package's runtime behavior, review whether the build performed and recorded it as the plan said; do not re-run the investigation yourself."
   - The exact diff command above, and the line that meta/process paths are excluded and must never be reviewed or mentioned even if noticed elsewhere.
   - The line: "Every decision recorded in the contract (a chosen approach, an explicit 'not needed now', an accepted tradeoff, an earlier round's correction) is FINAL and owner-approved: a finding whose only content is disagreement with such a decision is not a finding. The one exception is an `[amendment R]` step that names a fix it supersedes."
   - The lens card, attention-steering inside ONE session:
     - frame-attack: real inputs or conditions the diff does not handle but a real user or source will produce; a missing input class outranks any in-frame bug.
     - contract-completeness: every contract the plan named is actually implemented as specified; nothing silently narrowed or left half-built.
     - internal-consistency: code paths that contradict each other or the plan's own decisions; invariants the degraded states break.
     - external-limits: third-party API shapes, limits, encodings, escaping, and truncation the code assumes rather than guarantees.
     - security-trust: authz and ownership at point of use, untrusted content reaching rendered surfaces, data leaving the trust boundary carrying more than the consumer needs.
     - silent-failure: states where something vanishes or degrades with no trace, no operator signal, and no user-facing reason.
   - Two skills consult lines built from the plan's `Skills:` line: one for the three Codex lanes in Codex form (`$vercel:<name>`, `$supabase:<name>`, `$posthog:<name>`, `$use-railway`, and `$<name>` for the global skills `frontend-design`, `web-design-guidelines`, `ai-elements` and `framer-motion-animator`; drop `ui-ux-pro-max`), phrased "Codex lanes: consult these skills where a finding rests on a rule they cover, and cite the rule: ..."; one for grok and agy in bare names, phrased "Grok and agy: these are rules to weigh, not skills you can invoke: ...".
   - The findings output contract: return ONLY a JSON array of finding objects, each shaped exactly `{"severity": "blocking|important|minor", "file": string, "line": number or null, "critique": string, "suggestion": string or null, "evidence": string}`, as the final message and nothing else. `evidence` is the investigation behind the finding, not a restatement: the exact file:line trail the lane verified, and for anything about execution (a repair pass, a callback, a sweep), who runs it, when, in which request or process, and what data is in scope there. A `suggestion` states inside `evidence` whether it was verified against the code (with its own trail) or is an unverified idea.

2. Follow [the shared fixed review-lane procedure](../feature/references/review-lanes.md) with the `qc` profile and `.feature/lanes/qc.brief`. It starts exactly six fixed high-effort lanes, including preserved Terra, collects each with bounded waits, extracts only its findings JSON, and permits at most one bounded resume where the runner reports a real resume ID. Each lane invocation has the runner’s 15-minute deadline. The six external readers are Sol, Astra, Terra, Gemini Pro, Gemini Flash, and Grok. No Claude critique lane is added.

3. **Your own review, while the lanes run.** Read the diff under the same lens card and the same finality rule, in the same holistic way, reading whatever real code the diff touches, under the same reading ceiling as the brief: a package's `.d.ts` types and shipped docs under `node_modules` when a claim depends on an exact name or shape, never its built or minified output, never a runtime trace. Write your findings to `.feature/lanes/qc-claude.findings.json` in the same shape as the lane contract above, so every lane sits on equal footing and is auditable. This is the review that most often catches "the plan asked for X and X quietly did not land"; do not skimp on it because other readers are also looking. Finish it before the first lane returns where you can; once it is written, the remaining time is only waiting.

## 6. Fold every lane into the fix list

As each shared-runner wait returns, extract that lane and disposition its findings right away in `.feature/qc-dispositions.md`, one section per lane. Read only `<run-dir>/<lane>.findings.json` when extraction reports `OK` or `NO_FINDINGS`, never raw output. The runner’s terminal status, not a file’s contents, classifies the lane:

| State | What happened | What this session does |
| --- | --- | --- |
| `OK` | the review returned usable findings JSON | disposition all findings |
| `NO_FINDINGS` | the review came back and found nothing wrong | record "no findings" for that lane and never call it dead |
| `INVALID`, `EMPTY_RESULT`, `FAILED`, or `TIMED_OUT` | no usable findings payload | make the one resume permitted by the shared procedure only when the terminal result has a real `resume_id`; otherwise dead |

Never invent findings for a dead lane, and never read prose, partial output, or a reasoning trace as findings. The shared procedure provides the one legitimate recovery, including its no-fallback rule when `RESUME_UNAVAILABLE` is reported.

Do not wait for all lanes to be in before starting; the fix list is written once, after the last lane is in (or dead). The shared runner enforces a 15-minute deadline for each invocation, so one reader never stalls the round.

Adjudicate in this session, all lanes and your own review on equal standing (your own findings get no bonus for being yours):

1. Build `.feature/qc-dispositions.md` lane by lane as above, one line per finding from every findings file (yours included), `accept` or `drop` plus a one-line reason. Once the last lane is in, do one pass over the whole file to merge cross-lane duplicates; a finding two or more lanes raised independently is high confidence. Merge duplicates and cosmetic variants into one item. Spot-read the cited code where a finding is contentious or a citation looks fabricated, under the reading ceiling: repo code freely, a package's types and docs at most, never its bundle; a claim about a package's runtime behavior that types and docs cannot settle becomes a fix item phrased as the check to perform, not an investigation here. Drop only for a reason that would convince a stranger: it misreads the code (cite where), it relitigates a final decision, it targets an excluded path, or it duplicates an accepted item. Nothing decision-shaped goes on the fix list; it becomes an open question for the owner instead.
2. Turn every accepted finding into one fix item: exact `file`, `line`, `fix` (the approach in one or two lines, never a full patch), `owner` (one plain-language line: what was wrong for a user, what the fix does; no code terms). A separate build session applies the list exactly as written, so each item must be self-contained and applicable without asking anyone anything. A `fix` approach is a composed mechanism and is held to the finding standard: settle it by cross-referencing every lane's `evidence` on the topic first, then by tracing its execution context in the repo (who runs it, when, with what data in scope, cited in the dispositions), and only when both fail does it become an open question for the owner instead of a fix item. If any fix approach was composed rather than taken verbatim from verified lane evidence, dispatch ONE fresh subagent on this session's model with the dispositions, the draft fix list, and repo read access to attack only the composed approaches before the list is written; disposition its findings like a lane's.

## 7. Write the fix list or post the marker

1. Find the round number: one past the number of existing `## QC round` comments (start at 1 if none):

   ```bash
   gh api repos/{owner}/{repo}/issues/<N>/comments --paginate --jq '.[] | select(.body|startswith("## QC round")) | (.body|split("\n")[0])'
   ```

2. If there are fix items, write `.feature/fixes-<N>.md` in exactly this shape (build's fix mode parses it; the blank lines between the three header lines are REQUIRED, the markdown-unwrap hook joins adjacent lines otherwise and `Status:` stops being its own line; write the file with a shell heredoc or python rather than the Write tool if in doubt):

   ```
   # Fix list for issue <N>

   Round: <R>

   Status: pending

   ## Fix 1
   - file: <file>
   - line: <line>
   - fix: <fix>
   - owner: <owner>

   ## Fix 2
   ...
   ```

   Do NOT post the round marker; `$build <N>` in fix mode posts `## QC round <R>: done` after it applies the list and commits.

3. If there are no fix items, post the marker yourself:

   ```bash
   gh issue comment <N> --body "## QC round <R>: done
   No fixes needed. Gates GREEN."
   ```

## 8. Present the result plainly

No code terms, no raw findings, no file paths, no finding counts, no drop counts:

- **What got built:** one or two plain lines on what the branch changes for a user (from your own coverage read, not from build's summary).
- **Gates:** GREEN in one line (mention if mechanical fixes were committed).
- **Fixes queued for build:** one line per item, the `owner` line only, or "none".
- **Open questions:** each as a plain question with its tradeoff in one sentence.
- **One closing line:** each lane's elapsed seconds from the shared runner, and "the <lane> review pass did not come back" for any dead lane (a lane whose state was `INVALID`, `EMPTY_RESULT`, `FAILED`, or `TIMED_OUT` and whose one resume did not produce a valid payload). A `NO_FINDINGS` lane came back and found nothing: report it like any other working lane and never use the did-not-come-back wording for it. A dead lane never stops the run. If the owner asks what was dropped, read `.feature/qc-dispositions.md` and answer in plain words; never volunteer it.

## 9. Launch the fix build, then stop

With fixes queued, do not wait for approval (owner decision 2026-09-06: the `/qc <N>` invocation is the standing approval to apply whatever the round queues). Finish the step-8 presentation with one line naming the model about to run, then in the same turn follow [the build handoff](../feature/references/build-handoff.md) with `--source qc` and `--model <m>`, where `<m>` is `astra` or `terra` only when the `/qc` invocation's second argument named it (case-insensitively), and `sol` (Sol High) otherwise. Never inherit the feature planning model or an earlier build's override, and never ask a model question. The same `$build <N>` command picks FIX or AMEND mode using its existing rules.

Launch once, register the background completion watcher where available, tell the owner which model started, and STOP. Claude does not apply the fixes itself or poll progress. On completion, relay the actual result and the build skill's walkthrough/next command, then stop; do not auto-launch another QC round or ship. If the launcher refuses (wrong branch, another build running, uncommitted files outside `.claude/` and `.codex/`), report that refusal as the blocker in plain words and stop; the fix list stays pending for a manual `$build <N>`.

With no fixes: there is no fix round to carry the walk-through, so this message carries it, in the same three-block shape `$build`'s fix mode uses: **Do this now** (the single shortest walk that proves what this branch or this round changed, five numbered steps at most, plain words, ending with the one-word reply to give), **Then, only if that passed** (the remaining acceptance journeys this round touched, each as its own short walk; journeys already walked in an earlier round and untouched since are named in one line, not repeated), **At ship** (part 4 as a short checklist). Then `/ship <N>`. Do not launch build when there are no fixes. Never auto-dispatch ship or another QC round.
