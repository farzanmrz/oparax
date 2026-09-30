---
name: qc
description: >-
  The review side of feature work, same behavior in either host. Reviews what a build
  committed: one component of a larger build in its own worktree (/qc <N> --component <id>,
  several at once in separate sessions), or the whole feature branch after the last component
  merged (/qc <N> --integration). Checks plan coverage, runs the gates, launches eleven CLI review
  lanes, reviews the diff itself, folds every finding into one fix
  list, writes the result file the orchestrator reads, and launches the Codex fix build on
  Astra High without waiting. Not for building or fixing; both are $build in Codex or /build
  in Claude Code.
argument-hint: "<issue #> --component <id> | --integration"
allowed-tools: Bash(git *) Bash(gh *) Bash(bash *) Bash(python3 *) Bash(find *) Bash(cp *) Bash(mkdir *) Monitor Agent Write Read Edit Grep Glob
model: inherit
disable-model-invocation: true
---

# QC: review one component or the whole feature, hand the fix list back to build

Two forms, one skill (owner, September 28: QC runs separately for each component, in parallel where components are independent, then once on the whole feature, then his single walk on localhost).

- `/qc <N> --component <id>` reviews one component: exactly the commits the run file names, in that component's worktree, against that component's plan slice plus the plan's shared contracts. Other components' sessions may be running at the same time; nothing here touches their files.
- `/qc <N> --integration` (a bare `/qc <N>` means this) reviews `origin/beta...HEAD` on `ft/<N>` after the last merge, against the whole plan, with the seams between components as its lens: ownership, trial clock, pools, delivery, payment.

The orchestrator starts either form headless with Sonnet 5.5 at medium effort (`claude -p "/qc <N> --component <id>" --model claude-sonnet-5-5 --effort medium`) and reads one file, `<round dir>/result.json`. The owner may type either form himself. One session, start to finish; nobody answers questions mid-run. This skill never builds, never applies findings, never runs journeys. With fixes it writes the list and the result file, launches the Codex fix build in the same breath (owner, September 6, 2026: the invocation is the standing approval) and stops; with none it posts the marker and writes the result file. The fix build runs on Astra High, always (owner, September 24); no model question. A fix build reports "fixes applied" and posts nothing; only a QC pass ties a pass to a reviewed commit (owner, September 28).

## Working style, every step

- **Autonomous.** Never end a turn to ask a question; the only stops are the STOP conditions below, each ending with the result file and a plain blocker. Before ending any turn, reread your last paragraph: if it is a plan or a promise ("I'll..."), do that work now.
- **Claim only what you can point to.** Every statement in the final message rests on a tool result from this run.
- **The fix list stays minimal.** A fix item corrects exactly what its finding names; the simplest change that resolves it is the fix.
- **The owner reads product language.** The final message leads with the outcome in plain sentences; no shorthand, no names invented mid-run.

## Names used below

- `<mode>`: the component id, or `integration`. The session runs in the main checkout, where `.feature/run-<N>.json` lives; every `.feature/` path below is there.
- `<checkout>`: the component's `worktree` from the run file, or the main checkout for integration. Every git command on the reviewed code is `git -C <checkout> ...`; the gates run inside it.
- `<range>`: component `<base_commit>...<head_commit>` from the run file; integration `origin/beta...HEAD`.
- `<R>`: this round, one past the highest `round-*` under `.feature/lanes/<N>/<mode>/` (1 if none). `<round dir>` is `.feature/lanes/<N>/<mode>/round-<R>/`; the brief, lane records, findings, dispositions, screenshots and the result file live there, and the fix list at `.feature/fixes-<N>-<mode>.md (the launcher's fix-mode path, `<mode>` being the component id or `integration`; overwrite it each round with `Status: pending`, and keep a copy at `<round dir>/fixes.md`)`. Two sessions never share a round dir.

Resolve `shadcn` (and legacy `vercel:shadcn`) to the official global skill at `~/.agents/skills/shadcn`; do not copy the Vercel plugin's shadcn skill into review lanes.

## 1. Confirm what is under review

Component: read the component `{id, title, plan_section, depends_on, worktree, branch, base_commit, head_commit, status, qc}` from `.feature/run-<N>.json`; STOP if the run file or the id is missing. `git -C <worktree> branch --show-current` must equal `branch` and `git -C <worktree> rev-parse HEAD` must equal `head_commit`; STOP naming what differs.

Integration: `git branch --show-current` must be `ft/<N>` (or `bf/<N>`); if not, `git fetch origin ft/<N> && git switch ft/<N>`; STOP if it does not exist. When a run file exists, every component's `head_commit` must be an ancestor of HEAD (`git merge-base --is-ancestor <head_commit> HEAD`); STOP naming the first that is not. A component that is not built or merged yet is never a failure of another component; it only means integration time has not come.

Both: `git -C <checkout> status --short && git -C <checkout> log --oneline <range>`. No commits in the range touching app code: STOP, the build has not happened. Uncommitted paths only under `.claude/` or `.codex/`: commit and push them from `<checkout>` as `meta: commit tool configuration under .claude and .codex (#<N>)` (owner decision 2026-09-06). Any other uncommitted change: STOP. Then `mkdir -p <round dir>`.

## 2. Put the contract on disk

```bash
gh issue view <N> --json body -q .body > <round dir>/issue-body.md
```

Build `<round dir>/qc-plan.md` with shell, bytes from file to file, never retyped: for a component, the file at `plan_section` followed by the plan's shared-contracts section of `.feature/plan-<N>.md`; for integration, all of `.feature/plan-<N>.md`. Then append every `.feature/amend-<N>-<R>.md` in round order under `# AMENDMENTS (each approved by the owner after the plan; where an amendment step contradicts the plan or an earlier fix it names, the amendment wins)`. A pending amendment (`Status: pending`) means STOP: the owner runs `$build <N>` first. If the plan is missing, recreate it once from a legacy `<details>` block on the issue body if there is one; otherwise STOP.

## 3. Earlier rounds are memory

Without them each round re-argues corrections the last one made (round 2 of #124 reversed round 1's own fixes). Read every `.feature/lanes/<N>/<mode>/round-*/fixes.md` from an earlier round; integration also reads every component's `.feature/qc-fixes-<N>-*-*.md`. One reading `Status: pending` means STOP: those fixes were never applied. Append the applied ones, oldest first, to the contract file under `# APPLIED QC FIXES (each item was accepted, applied by build, and is FINAL with the same standing as the plan; where an item deviates from the plan letter, the item wins)`. The one exception: an amendment step that names a fix it supersedes beats that fix.

## 4. Coverage and gates (this session, before any review)

Do not trust the build's summary; read the code. The diff under review, everywhere in this skill, is exactly:

```bash
git -C <checkout> diff <range> -- . ':(exclude).claude' ':(exclude).codex' ':(exclude).agents' ':(exclude).grok' ':(exclude).github' ':(exclude).feature' ':(exclude)docs' ':(exclude)pnpm-lock.yaml'
```

Meta and process paths are excluded on purpose and are never fix material.

1. **Coverage.** Run the same diff with `--stat` and in full, and read any changed file whose diff is not self-explanatory. Compare against `<round dir>/qc-plan.md`, parts `## 1. Files and contracts` and `## 2. Build steps` ONLY (for a component, its slice's parts plus the shared contracts), as amended by the appended block. Parts 3 and 4 are for the owner and for ship; never grade the diff against them. Work that belongs to another component (its plan slice, a `depends_on` entry) is out of scope: a call into code another component owns that is not built yet is not a finding here; the integration round judges the seams. If a build step is a reference-init diff, redo it yourself the same bounded way: the skill's snippet and our call, one list of option names the reference sets that ours does not, each either present in the code or covered by a recorded decision; an uncovered one is a finding. If a step of this slice is missing or half-built, STOP: name the step and what is missing, run no gates, write no fix list; the fix is a `$build <N>` after the plan or the build is corrected.
2. **Gates.** `(cd <checkout> && bash .claude/scripts/qc-gates.sh <range>)` (pnpm build + tsc; Bash timeout 600000). GREEN: continue. RED: fix ONLY what the compiler or typechecker reports, mechanically (a type, an import, a missing await; no design or behavior change, no new file), rerun until GREEN, then `git -C <checkout> add -A && git -C <checkout> commit -m "gates: <one line> (#<N>)"`. That commit moves HEAD; `reviewed_commit` in the result file is the commit actually reviewed, and the orchestrator takes it from there. A red that is not mechanical: `git -C <checkout> checkout -- .` and STOP.

Never start a dev server, never run pnpm dev, never touch env files, never open a browser, never write to git except the `gates:` commit and the step-1 `meta:` commit. The one exception is 4a. This binds the command while it runs; the owner's own words in the chat override it at once (AGENTS.md).

### 4a. The screenshot check (integration only; owner, September 23)

When the slice touches a screen, one background subagent (`general-purpose`, this session's model) takes pictures and nothing else: it starts the app in the background on a free port (never 3000), opens each page the plan's acceptance journeys name with `agent-browser` (off-screen), waits for the page to settle, screenshots it at 1280px and 390px wide in dark and in light, saves the images under `<round dir>/shots/<page>-<width>-<scheme>.png`, then stops the app. It never clicks through a journey, signs in, fills a form, or triggers a paid model call; a page that needs a build to exist is reported as "not screenshotted" with the reason. At most three minutes in total; a page not settled in 30 seconds is skipped and named. It returns the file list and the console errors it saw.

The QC session reviews the images itself with `design-review` and `accessibility` loaded, against the slice's selected template/block and accepted preview (including a Claude Design export when provided), plus DESIGN.md, following `.claude/skills/feature/references/design-tooling.md`: layout at both widths, contrast in both schemes, states the plan named that the page does not show, anything that reads as a broken build. Each finding goes into `<round dir>/qc-claude.findings.json` in the lane contract shape, `file` the page's route file, `line` null. A missing screenshot is never a finding against the product.

## 5. Launch the review lanes, then review in parallel

1. **Resolve the builders' skills by their central path** (owner, September 28: reviewers keep getting the builders' skills, Stripe's included, by exact path, not copies). For each bare name on the plan's `Skills:` line:

   ```bash
   find ~/.agents/skills ~/.claude/skills .claude/skills ~/.claude/plugins/cache ~/.codex/plugins/cache -path "*/skills/<name>/SKILL.md" 2>/dev/null
   ```

   Take the first hit in that order; when a plugin has several version folders take the newest; the Stripe skills come from `~/.codex/plugins/cache/openai-curated-remote/stripe/<version>/skills/`, resolved now. A name with no hit is reported in the brief as a gap, never invented. The folders are the skill folders (the parent of each SKILL.md).

2. Write `<round dir>/qc.brief`, every path absolute, in this order:
   - A budget line: "Budget: about 10 minutes of wall time. Read the contract and the diff first, verify claims against the code, do not chase side quests; if the budget is nearly spent, return what you have as valid findings JSON rather than nothing." (Owner decision 2026-08-23: 10 minutes at both stages.)
   - The POST-IMPLEMENTATION framing: the diff is built and committed on branch `<branch>`; your working directory is `<checkout>`; the contract it was built to is `<round dir>/qc-plan.md` (read it first, including the appended blocks); ground every claim in the actual code and cite real `file:line`; one holistic pass, no subagents, no servers, builds or tests, no writes to git. For a component: this is one component of a larger build; code another component owns is out of scope. For integration: the seams between components (ownership, trial clock, pools, delivery, payment) are the lens.
   - The reading ceiling: "Read the repo's own source freely. From a third-party package under node_modules read only its .d.ts types and shipped docs, to confirm a name or a shape the diff relies on; never its built or minified output, never trace how it behaves at runtime. Where the plan named a build-time check about a package's runtime behavior, review whether the build performed and recorded it as the plan said; do not re-run the investigation yourself."
   - The exact diff command above, and the line that meta/process paths are excluded and must never be reviewed or mentioned.
   - The finality line: "Every decision recorded in the contract (a chosen approach, an explicit 'not needed now', an accepted tradeoff, an earlier round's correction) is FINAL and owner-approved: a finding whose only content is disagreement with such a decision is not a finding. The one exception is an `[amendment R]` step that names a fix it supersedes."
   - The skill paths: "Read the SKILL.md in each of these folders before judging: <one absolute path per line>. A finding that rests on a rule from one of them names the rule AND quotes the project's own line of code or configuration where the problem occurs; without that quote the finding is dropped." Reviewers get no connectors or MCPs.
   - The lens card, attention-steering inside ONE session: frame-attack (real inputs or conditions the diff does not handle but a real user or source will produce; a missing input class outranks any in-frame bug), contract-completeness (every contract the plan named is implemented as specified; nothing silently narrowed or half-built), internal-consistency (code paths that contradict each other or the plan's decisions; invariants the degraded states break), external-limits (third-party API shapes, limits, encodings, escaping and truncation the code assumes rather than guarantees), principles (anything that breaks a rule in AGENTS.md "Engineering principles"; cite the rule by name), security-trust (authz and ownership at point of use, untrusted content reaching rendered surfaces, data leaving the trust boundary carrying more than the consumer needs), silent-failure (something vanishes or degrades with no trace, no operator signal, no user-facing reason). The lens card and any checklist name categories only, never a specific suspect (a named package, file or pattern to go looking for).
   - The line: "AGENTS.md's host-only rules (handoff notes, echoing a ruling back before applying it, browser use, running the app) bind the session that hosts this review, not you; you read code and return findings."
   - Two skills consult lines from the plan's `Skills:` line: for the two Codex lanes in Codex form (`$vercel:<name>`, `$supabase:<name>`, `$posthog:<name>`, `$stripe:<name>`, and `$<name>` for the global skills `shadcn`, `frontend-design`, `web-design-guidelines`, `accessibility`, `beautiful-shadows`, `emil-design-eng`, `design-review` and `ai-elements`), phrased "Codex lanes: consult these skills where a finding rests on a rule they cover, and cite the rule: ..."; for grok, agy and the Cursor lanes in bare names, phrased "Grok, agy and Cursor lanes: these are rules to weigh, not skills you can invoke: ...".
   - The findings output contract: return ONLY a JSON array of finding objects, each shaped exactly `{"severity": "blocking|important|minor", "file": string, "line": number or null, "critique": string, "suggestion": string or null, "evidence": string}`, as the final message and nothing else. `evidence` is the investigation behind the finding: the exact file:line trail verified, and for anything about execution, who runs it, when, in which request or process, and with what data in scope. A `suggestion` states inside `evidence` whether it was verified against the code or is an unverified idea.

3. Follow [the shared fixed review-lane procedure](../feature/references/review-lanes.md) with the `qc` profile, `--run-dir <round dir>`, `--checkout <checkout>` and one `--add-dir <folder>` per resolved skill folder. Preview first. While the runner cannot open extra folders (true today), the preview prints `ADD_DIR_UNSUPPORTED <folders>`: then copy each folder to `<round dir>/skills/<name>/` before starting, and add to the brief: "The agy, Cursor and Claude lanes read only their workspace and this brief's folder, so the same skills are copied under <round dir>/skills/; a lane that can open the central paths above reads them there, any other lane reads the copy." It starts exactly eleven fixed high-effort CLI lanes (Sol 6.1, Astra 6, Gemini Pro, Gemini Flash, Grok, Kimi K3, GLM 5.2, Muse Spark, Opus 5.5, Fable 5.1, Sonnet 5.5), collected with bounded waits, findings JSON only, at most one bounded resume per lane where the runner reports a real resume ID, each under the runner's 15-minute deadline. The same lanes run from either host (owner, September 29).

4. **Your own review, while the lanes run.** Read the diff under the same lens card, finality rule and reading ceiling, reading whatever real code in `<checkout>` the diff touches. Write your findings to `<round dir>/qc-claude.findings.json` in the lane contract shape, so every lane sits on equal footing. This is the review that most often catches "the plan asked for X and X quietly did not land"; do not skimp on it. Finish it before the first lane returns where you can.

## 6. Fold every lane into the fix list

As each wait returns, extract that lane and disposition its findings right away in `<round dir>/dispositions.md`, one section per lane. Read only `<round dir>/<lane>.findings.json` after `OK` or `NO_FINDINGS`, never raw output. The runner's terminal status classifies the lane: `OK`, disposition all findings; `NO_FINDINGS`, record "no findings" and never call it dead; `INVALID`, `EMPTY_RESULT`, `FAILED` or `TIMED_OUT`, the one resume the shared procedure permits when the result has a real `resume_id`, otherwise dead. Never invent findings for a dead lane. The fix list is written once, after the last lane is in or dead.

Adjudicate in this session, every lane and your own review on equal standing:

1. One line per finding, `accept` or `drop` plus a one-line reason. After the last lane, one pass to merge cross-lane duplicates; a finding two or more lanes raised independently is high confidence. Spot-read the cited code where a finding is contentious or a citation looks fabricated, under the reading ceiling. Drop only for a reason that would convince a stranger: it misreads the code (cite where), it relitigates a final decision, it targets an excluded path or another component's code, it rests on a skill rule without quoting the project's own line, or it duplicates an accepted item. Nothing decision-shaped goes on the fix list; it becomes an open question for the owner.
2. Turn every accepted finding into one fix item: exact `file`, `line`, `fix` (the approach in one or two lines, never a patch), `owner` (one plain line: what was wrong for a user, what the fix does). A separate build session applies the list exactly as written, so each item is self-contained. A composed `fix` approach is held to the finding standard: settle it by cross-referencing every lane's `evidence`, then by tracing its execution context in the repo; when both fail it becomes an open question instead. If any approach was composed rather than taken from verified lane evidence, dispatch ONE subagent on this session's model with the dispositions, the draft list and read access to `<checkout>` to attack only the composed approaches; disposition its findings like a lane's.

## 7. Write the fix list, or post the marker; then the result file

1. With fix items, write `.feature/fixes-<N>-<mode>.md (the launcher's fix-mode path, `<mode>` being the component id or `integration`; overwrite it each round with `Status: pending`, and keep a copy at `<round dir>/fixes.md`)` in exactly this shape (build's fix mode parses it; the blank lines between the header lines are REQUIRED; write it with a heredoc or python, not the Write tool, if in doubt):

   ```
   # Fix list for issue <N>

   Round: <R>

   Status: pending

   ## Fix 1
   - file: <file>
   - line: <line>
   - fix: <fix>
   - owner: <owner>
   ```

   Post no marker; the fix build reports "fixes applied" and the next round decides.

2. With no fix items, post the marker (`/ship` gates on the latest one; the integration pass is the one it needs):

   ```bash
   gh issue comment <N> --body "## QC round <R> (<mode>): done
   Reviewed <sha>. Gates GREEN."
   ```

3. Last of all, always (a STOP included), write `<round dir>/result.json`, the one file the orchestrator reads:

   ```json
   {"status": "PASS", "reviewed_commit": "<sha>", "fixes": null, "summary": "<one plain sentence>"}
   ```

   `status` is `PASS`, `FIXES` (then `fixes` is the fix list's path) or `STOP` (only when the build is missing a step the slice requires, or a step-1 or gate blocker; `summary` says which). `reviewed_commit` is `git -C <checkout> rev-parse HEAD` after any gates commit.

## 8. Present the result plainly

No code terms, no raw findings, no file paths, no counts. **What got built:** one or two plain lines from your own coverage read. **Gates:** GREEN in one line (mention a mechanical commit). **Fixes queued for build:** the `owner` line per item, or "none". **Open questions:** each as a plain question with its tradeoff. **One closing line:** each lane's elapsed seconds, and "the <lane> review pass did not come back" for a dead lane (never for a `NO_FINDINGS` lane); a dead lane never stops the run. If the owner asks what was dropped, read the dispositions and answer plainly; never volunteer it.

## 9. Launch the fix build, then stop

With fixes queued, do not wait (owner decision 2026-09-06). Inside a run (`.feature/run-<N>.json` exists), write the result file and STOP: the orchestrator launches the fix build and watches it. Standalone (the owner typed `/qc`), name the model in one line and launch it yourself: `python3 .claude/scripts/build-launch.py launch --issue <N> --component <id> --worktree <worktree> --plan .feature/plan-<N>/<id>.md` (integration: `--component integration` with the main checkout); the launcher picks fix mode from the pending fix list. Register the completion watcher where the host offers one. Then STOP: never apply the fixes here, never auto-launch another round or ship. If the launcher refuses, report the refusal as the blocker; the fix list stays pending for a manual `$build <N>`.

With no fixes: a component round ends here (the owner walks only after integration). An integration round carries the walk-through in the three-block shape `$build`'s fix mode uses: **Do this now** (the single shortest walk that proves what this branch changed, five numbered steps at most, ending with the one-word reply to give), **Then, only if that passed** (the remaining acceptance journeys, each a short walk), **At ship** (part 4 as a checklist). Then name `/ship <N>`.
