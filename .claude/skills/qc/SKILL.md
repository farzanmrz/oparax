---
name: qc
description: >-
  The review side of feature work, same behavior in either host: on a
  branch that build ($build in Codex, or /build in Claude Code) has
  already built and committed, this session itself
  checks plan coverage and runs the gates, launches five review lanes
  in the background (two Codex, two agy, grok), does its own holistic review of
  the real diff while they run, then folds every set of findings into one fix list written to
  .feature/fixes-<N>.md for build's fix mode, and hands back to the owner.
  No Workflow tool, no subagents. Use when the user says /qc <N>. Not for
  building or fixing; both are $build in Codex or /build in Claude Code.
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(bash *) Write Read Edit Grep Glob
model: inherit
disable-model-invocation: true
---

# QC: review what build built, hand the fix list back to build

One session, start to finish. Every step below runs on its own; the owner types nothing between `/qc <N>` and the final message. This skill never builds, never applies findings, never runs journeys; it ends by naming `$build <N>` (fix mode) or `/ship <N>`.

## Working style, every step of this command

- **This run is autonomous.** The owner is not answering questions mid-run, so never end a turn to ask one; the only mid-run stops are the STOP conditions written into the steps below (wrong branch, unapplied fixes, a missing or half-built step, a non-mechanical red gate), each of which ends the run with a plain blocker. Before ending any turn, reread your last paragraph: if it is a plan, an analysis, or a promise about work not yet done ("I'll..."), do that work now with tool calls. End only on a STOP or on the step-8 final message.
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

If there are no commits ahead of beta touching app code, STOP and tell the owner to run `$build <N>` in Codex (or `/build <N>` in Claude Code) first. If there are uncommitted changes, say so and STOP; the tree should be exactly what build committed.

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

Never start a dev server, never run pnpm dev or the poller, never touch env files, never open a browser or use any browser/computer-use tool, never write to git except the one `gates:` commit above. This binds the command while it runs; if the owner asks in their own words in the chat to run the app or open a browser, that wins immediately (AGENTS.md).

## 5. Launch the five review lanes, then review in parallel

1. Write `.feature/lanes/qc.brief`, in this order:
   - A budget line: "Budget: about 10 minutes of wall time. Read the contract and the diff first, verify claims against the code, do not chase side quests; if the budget is nearly spent, return what you have as valid findings JSON rather than nothing." (Prompt pressure only; the DONE line reports the real elapsed seconds. Owner decision 2026-08-23: 10 minutes at both stages, one number everywhere. Measured basis: prompted high lanes do not stretch to fill the allowance — under this line at the plan stage flash landed ~01:15, terra ~02:00, agy-pro ~04:00, sol ~05:15; at QC under a 5-minute line terra 01:14, flash 01:40, sol 03:16, agy-pro 03:47.)
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
   - Two skills consult lines built from the plan's `Skills:` line: one for the two Codex lanes in Codex form (`$vercel:<name>`, `$supabase:<name>`, `$posthog:<name>`, `$use-railway`; drop `ui-ux-pro-max`), phrased "Codex lanes: consult these skills where a finding rests on a rule they cover, and cite the rule: ..."; one for grok and agy in bare names, phrased "Grok and agy: these are rules to weigh, not skills you can invoke: ...".
   - The findings output contract: return ONLY a JSON array of finding objects, each shaped exactly `{"severity": "blocking|important|minor", "file": string, "line": number or null, "critique": string, "suggestion": string or null, "evidence": string}`, as the final message and nothing else. `evidence` is the investigation behind the finding, not a restatement: the exact file:line trail the lane verified, and for anything about execution (a repair pass, a callback, a sweep), who runs it, when, in which request or process, and what data is in scope there. A `suggestion` states inside `evidence` whether it was verified against the code (with its own trail) or is an unverified idea.

2. Launch five lanes, each with `bash .claude/scripts/lane.sh start <lane> -- <cmd>` (foreground; lane.sh detaches and returns at once). Same five readers as the plan critique, every lane at HIGH effort (owner decision 2026-08-23, from the nine-lane calibration on #126's first QC round: every medium-effort cell was a strict subset of its high sibling — sol-med and grok-med each re-found only a shared finding, terra-med found nothing — so mediums are permanently retired). QC wall time is pinned to the slowest lane — measured that round at high: terra 01:14, agy-flash 01:40, sol 03:16, agy-pro 03:47, grok 05:31 — so budget QC wall on grok's ~10-minute prompt allowance, worst case the 15-minute LANE_HUNG_SECONDS wall. agy's QC ban is LIFTED (owner decision 2026-08-23: the 2026-08-18 crash — a wrong-filename read that became a fatal CLI error — did NOT reproduce in the calibration re-test; both agy lanes returned clean, valid JSON). agy-pro stays a lane by owner decision even though it has not yet landed a surviving finding at either stage: it is cheap, its yield may prove issue-dependent, and if it crashes at QC again the ban stands re-confirmed:
   - `qc-codex-sol`: `codex exec -s read-only -C "$PWD" -m gpt-5.6-sol -c model_reasoning_effort=high --json "Read $PWD/.feature/lanes/qc.brief and follow it exactly."`
   - `qc-codex-terra`: the same command with `-m gpt-5.6-terra` (effort high).
   - `qc-agy-pro`: `agy --model=gemini-3.1-pro-high --effort=high --output-format=json --print-timeout=15m --print="Read $PWD/.feature/lanes/qc.brief and follow it exactly."` — every flag joined with `=`, never a bare flag followed by a space-separated value: this CLI silently drops a trailing positional prompt and returns an unrelated generic greeting with no error. agy runs with repo access, so it reads the brief itself; if a run shows it could not read repo files, the fallback (agy only) is to paste the brief's full text inline as the `--print` value instead of the one-line pointer.
   - `qc-agy-flash`: the same command with `--model=gemini-3.7-flash-high`.
   - `qc-grok`: first write `.feature/lanes/qc-grok.prompt`: "You have about 10 minutes of wall time and NO turn cap — the clock, not a turn counter, is your budget. Finish EARLY rather than thoroughly: read the contract and the diff first, do not chase side quests, never read a package's built or minified output, and the moment the findings you hold are verified, STOP reading and emit the findings JSON. An answer that never arrives is worth nothing; a short verified answer beats a long late one; an empty array [] is a valid answer." followed by "Read $PWD/.feature/lanes/qc.brief and follow it exactly." Then: `grok --prompt-file "$PWD/.feature/lanes/qc-grok.prompt" --sandbox read-only --cwd "$PWD" --disallowed-tools "mcp__vercel__*,mcp__railway__*" --always-approve --no-subagents --effort high -m grok-4.6 --output-format json`. Do NOT pass `--agent` and do NOT pass `--max-turns` (owner decision 2026-08-23, from a controlled A/B on #126: turn-count framing acted as a license to run long, not a limit — turn-capped high died at the 900s wall with nothing; clock-only high finished in 549s with the round's one unique catch. Effort is HIGH; the prompt's clock pressure is the only cap, the 900s LANE_HUNG_SECONDS wall the enforced backstop); the `--disallowed-tools` value stays inside double quotes exactly as written.

   Then arm five separate background waits, one Bash call each with `run_in_background: true`: `LANE_HUNG_SECONDS=900 bash .claude/scripts/lane.sh waitall qc-codex-sol`, then the same for `qc-codex-terra`, `qc-agy-pro`, `qc-agy-flash`, `qc-grok`. `LANE_HUNG_SECONDS=900` is the 15-minute terminal wall cap (owner decision 2026-08-23): a lane still running at 15 minutes makes its wait print `HUNG`, which the state table below turns into a kill, a `--timed-out` extraction, and at most one resume attempt. Do not wait on any of them in the foreground; the session is re-invoked as each exits. Never edit `lane.sh` while a wait runs.

3. **Your own review, while the lanes run.** Read the diff under the same lens card and the same finality rule, in the same holistic way, reading whatever real code the diff touches, under the same reading ceiling as the brief: a package's `.d.ts` types and shipped docs under `node_modules` when a claim depends on an exact name or shape, never its built or minified output, never a runtime trace. Write your findings to `.feature/lanes/qc-claude.findings.json` in the same shape as the lane contract above, so every lane sits on equal footing and is auditable. This is the review that most often catches "the plan asked for X and X quietly did not land"; do not skimp on it because other readers are also looking. Finish it before the first lane returns where you can; once it is written, the remaining time is only waiting.

## 6. Fold every lane into the fix list

As each background wait returns, run `bash .claude/scripts/lane.sh findings <lane>` for that lane (writes `.feature/lanes/<lane>.findings.json`, findings only, never the raw event stream) and disposition that lane's findings right away in `.feature/qc-dispositions.md`, one section per lane. `lane.sh findings` prints exactly one state line, and that line, not the file's contents, classifies the lane:

| State | What happened | What this session does |
| --- | --- | --- |
| `OK count=N` | the review came back with N findings | disposition all N |
| `NO_FINDINGS count=0` | the review came back and found nothing wrong: HEALTHY, the lane worked | record "no findings" for that lane, report its elapsed seconds normally, and NEVER call it dead or say the pass did not come back |
| `INVALID` | finished but produced no usable findings payload | if the line carries `resume_id=`, make ONE bounded resume attempt (below); otherwise dead |
| `FAILED exit=N` | the lane's process died (the agy CLI's fatal-tool-error bug lands here) | same: one resume attempt if `resume_id=` is present, otherwise dead |
| `TIMED_OUT` | killed at the wall cap with nothing valid emitted | one resume attempt if `resume_id=` is present, otherwise dead |

Never invent findings for a dead lane, and never read prose, partial output, or a reasoning trace as findings. The ONE legitimate recovery is resuming the lane's own stored session so the model finishes its own answer: `grok --resume <resume_id>` or `agy --conversation <resume_id>`, same sandbox and denials as the original launch, at most 5 turns, told to investigate nothing, use the work already in context, and emit only the findings JSON (`[]` is a valid answer). Run it at most once per lane per round; a second invalid result makes the lane dead. Classify the resumed output with the same table.

Do not wait for all lanes to be in before starting; the fix list is written once, after the last lane is in (or dead). A lane still running at 15 minutes is killed (`lane.sh kill <lane>`) and its findings extracted with `--timed-out` before classification, so work it already emitted is kept; a `HUNG` or `DIED` wait line is handled the same way. The run never stalls on one reader.

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
- **One closing line:** each lane's elapsed seconds from its DONE line, and "the <lane> review pass did not come back" for any dead lane (a lane whose state was `INVALID`, `FAILED`, or `TIMED_OUT` and whose resume attempt did not produce a valid payload). A `NO_FINDINGS` lane came back and found nothing: report it like any other working lane and never use the did-not-come-back wording for it. A dead lane never stops the run. If the owner asks what was dropped, read `.feature/qc-dispositions.md` and answer in plain words; never volunteer it.

## 9. End: name the next command

With fixes queued:

<exit-example>

Review done. Gates GREEN. Four fixes are queued for build (listed above): `$build 123` in Codex, or `/build 123` in Claude Code.

It will pick fix mode on its own, apply them, post the round marker, and end with the plain walk-through of what to check on your local server before `/ship 123`.

</exit-example>

With no fixes: there is no fix round to carry the walk-through, so this message carries it, in the same three-block shape `$build`'s fix mode uses: **Do this now** (the single shortest walk that proves what this branch or this round changed, five numbered steps at most, plain words, ending with the one-word reply to give), **Then, only if that passed** (the remaining acceptance journeys this round touched, each as its own short walk; journeys already walked in an earlier round and untouched since are named in one line, not repeated), **At ship** (part 4 as a short checklist). Then `/ship <N>`. Never dispatch anything else and never touch the branch further.
