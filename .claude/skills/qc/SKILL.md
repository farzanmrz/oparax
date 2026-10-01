---
name: qc
description: >-
  The review side of feature work, same behavior in either host. Reviews what a build
  committed: one component scope in the active checkout (/qc <N> --component <id>),
  or the whole canonical feature branch after its components are built (/qc <N> --integration). Checks plan coverage, runs the gates, launches nine CLI review
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

Two forms, one skill. The default is build and typecheck after each component, then one independent whole-branch review with the fixed nine lanes and this session's pass. Optional `--component-review lanes` enables component review; whole-branch QC still checks all seams before the owner's walk. One product writer owns the active checkout, while independent review lanes run in parallel and read-only.

- `/qc <N> --component <id>` reviews one component: exactly the recorded component commit range in the active canonical checkout, against that component's plan slice plus shared contracts. No product writer may change the reviewed code while QC runs.
- `/qc <N> --integration` (a bare `/qc <N>` means this) reviews `origin/beta...HEAD` on `ft/<N>` or `bf/<N>` after the last component build, against the whole plan, with the seams between components as its lens: ownership, trial clock, pools, delivery, payment.

The orchestrator starts either form headless with Sonnet at medium effort (`claude -p "/qc <N> --component <id>" --model sonnet --effort medium`) and reads one file, `<round dir>/result.json`. The owner may type either form himself. One session, start to finish; nobody answers questions mid-run. This skill never builds, never applies findings, never runs journeys. With fixes it writes the list and the result file, launches the Codex fix build in the same breath (owner, September 6, 2026: the invocation is the standing approval) and stops; with none it writes independent PASS proof and the result file. In a supervised run only the supervisor posts the issue marker; standalone QC posts its own verified marker. The fix build runs on Astra High, always (owner, September 24); no model question. A fix build reports "fixes applied" and posts nothing; only a QC pass ties a pass to a reviewed commit (owner, September 28).

## Working style, every step

- **Autonomous.** Never end a turn to ask a question; the only stops are the STOP conditions below, each ending with the result file and a plain blocker. Before ending any turn, reread your last paragraph: if it is a plan or a promise ("I'll..."), do that work now.
- **Claim only what you can point to.** Every statement in the final message rests on a tool result from this run.
- **The fix list stays minimal.** A fix item corrects exactly what its finding names; the simplest change that resolves it is the fix.
- **The owner reads product language.** The final message leads with the outcome in plain sentences; no shorthand, no names invented mid-run.

## Names used below

- `<mode>`: the component id, or `integration`. The session runs in the main checkout, where `.feature/run-<N>.json` lives; every `.feature/` path below is there.
- `<checkout>`: the existing canonical feature checkout, used for both component and integration review. The legacy `worktree` field records this path without creating a checkout. Every git command on the reviewed code is `git -C <checkout> ...`; the gates run inside it.
- `<range>`: component `<base_commit>...<head_commit>` from the run file; integration `origin/beta...HEAD`.
- `<R>`: this round, one past the highest `round-*` under `.feature/lanes/<N>/<mode>/` (1 if none). `<round dir>` is `.feature/lanes/<N>/<mode>/round-<R>/`; the brief, lane records, findings, dispositions, screenshots and the result file live there, and the fix list at `.feature/fixes-<N>-<mode>.md` (the launcher's fix-mode path; `<mode>` is the component id or `integration`; overwrite it each round with `Status: pending`, and keep a copy at `<round dir>/fixes.md`). Two sessions never share a round dir.

Resolve `shadcn` (and legacy `vercel:shadcn`) to the official global skill at `~/.agents/skills/shadcn`; do not copy the Vercel plugin's shadcn skill into review lanes.

## 1. Confirm what is under review

First distinguish active supervision from historical records. A headless supervisor supplies `OPARAX_SUPERVISOR=run-plan`, `OPARAX_RUN_ID` and `OPARAX_WRITER_TOKEN`. Require that exact supervisor flag and both identifiers, then verify the lease before deferring fixes or making a mechanical product correction:

```bash
python3 .claude/scripts/writer-lease.py verify --run-id "$OPARAX_RUN_ID" --token "$OPARAX_WRITER_TOKEN"
```

The exact supervisor flag, both identifiers and successful verification together identify an active supervisor. A `.feature/run-<N>.json` file by itself never does. If a supplied context fails verification, STOP with the routing error; never start a competing writer. A manual invocation without supervisor context is standalone, even when an old run file exists. Partial identifiers, a different supervisor flag or failed verification are routing errors, never permission to use the supervised write path. Schema-v1 records remain history and cannot be silently resumed or treated as the current target.

Component: read the current-checkout component `{id, title, plan_section, depends_on, worktree, branch, base_commit, head_commit, status, qc}` from `.feature/run-<N>.json`; STOP if its current scope or range is missing. Confirm that the recorded branch is `ft/<N>` or `bf/<N>`, the checkout is on that branch and `head_commit` is the reviewed HEAD. STOP naming any mismatch.

Integration: the active checkout must already be on `ft/<N>` or `bf/<N>`; on a mismatch, STOP and name actual and expected targets. Never fetch-and-switch during QC. Only with verified active supervision use its run record to require all completed component heads to be ancestors of HEAD. Historical run files do not impose stale readiness on standalone integration review; prove coverage from the approved plans and committed branch.

Both: `git -C <checkout> status --short && git -C <checkout> log --oneline <range>`. No app-code commits in the range: STOP, the build has not happened. An active supervisor must settle `.claude/` or `.codex/` configuration before launching QC; headless QC never pushes. Standalone QC remains read-only on product source. If the only uncommitted or staged paths are under `.claude/` or `.codex/`, it settles that configuration under a separate writer lease before review, preserving the owner's metadata rule. Any other dirty path is a STOP before the command below:

```bash
python3 .claude/scripts/writer-lease.py run --repo <checkout> --run-id qc-meta-<N> -- bash -c 'git -C "$1" add -A -- .claude .codex && git -C "$1" commit -m "meta: commit tool configuration under .claude and .codex (#$2)" && git -C "$1" push origin HEAD' -- <checkout> <N>
```

Run this only when those paths hold changes. If the lease is owned by another writer, STOP with its refusal and preserve the configuration. Product changes remain a blocker without discarding them. Capture the resulting clean HEAD for review, then `mkdir -p <round dir>`.

## 2. Put the contract on disk

```bash
gh issue view <N> --json body -q .body > <round dir>/issue-body.md
```

Build `<round dir>/qc-plan.md` with shell, bytes from file to file, never retyped: for a component, the file at `plan_section` followed by `.feature/plan-<N>/shared.md`; for integration, `.feature/plan-<N>.md`, `.feature/plan-<N>/shared.md` and every component slice in table order. The table alone is not the implementation contract. Then append every `.feature/amend-<N>-<R>.md` in round order under `# AMENDMENTS (each approved by the owner after the plan; where an amendment step contradicts the plan or an earlier fix it names, the amendment wins)`. A pending amendment (`Status: pending`) means STOP: the owner runs `$build <N>` first. If the plan is missing, recreate it once from a legacy `<details>` block on the issue body if there is one; otherwise STOP.

## 3. Earlier rounds are memory

Without them each round re-argues corrections the last one made (round 2 of #124 reversed round 1's own fixes). Read every `.feature/lanes/<N>/<mode>/round-*/fixes.md` from an earlier round; integration also reads each component's actual `.feature/lanes/<N>/<component>/round-<R>/fixes.md` archives and canonical `.feature/fixes-<N>-<component>.md` lists. Successful FIX jobs mark the matching archived round list `Status: applied` only after an actual BUILT verdict; a fix commit alone is not PASS. If an archive still says pending, check its canonical fix list and exact round job verdict before treating it as unapplied. A pending list with no matching successful FIX verdict means STOP. Do not manufacture an applied state or review PASS to unblock continuation. Append the applied ones, oldest first, to the contract file under `# APPLIED QC FIXES (each item was accepted, applied by build, and is FINAL with the same standing as the plan; where an item deviates from the plan letter, the item wins)`. The one exception: an amendment step that names a fix it supersedes beats that fix.

## 4. Coverage and gates (this session, before any review)

Do not trust the build's summary; read the code. The diff under review, everywhere in this skill, is exactly:

```bash
git -C <checkout> diff <range> -- . ':(exclude).claude' ':(exclude).codex' ':(exclude).agents' ':(exclude).grok' ':(exclude).github' ':(exclude).feature' ':(exclude)docs' ':(exclude)pnpm-lock.yaml'
```

Meta and process paths are excluded on purpose and are never fix material.

1. **Coverage.** Run the same diff with `--stat` and in full, and read any changed file whose diff is not self-explanatory. Compare against `<round dir>/qc-plan.md`, the implementation contract in `## 1. Files and contracts` and `## 2. Build steps` (for a component, its slice plus shared contracts), as amended by the appended block. Part 3's proof mapping and journeys name required user capabilities: check that parts 1/2 and the source cover them, but never execute or claim those journeys passed. Part 4 contains owner operations, never implementation requirements to grade or execute here. Work that belongs to another component (its plan slice, a `depends_on` entry) is out of scope: a call into code another component owns that is not built yet is not a finding here; the integration round judges the seams. If a build step is a reference-init diff, redo it yourself the same bounded way: the skill's snippet and our call, one list of option names the reference sets that ours does not, each either present in the code or covered by a recorded decision; an uncovered one is a finding. If a step of this slice is missing or half-built, STOP: name the step and what is missing, run no gates, write no fix list; the fix is a `$build <N>` after the plan or the build is corrected.
2. **Gates.** `(cd <checkout> && bash .claude/scripts/qc-gates.sh <range>)` (pnpm build + tsc; Bash timeout 600000). GREEN: continue. RED in standalone QC: do not edit product files. Turn mechanical compiler/typechecker corrections into the exact pending fix list, write a FIXES result at the current HEAD, and proceed to step 9's leased build launch without starting review lanes. A gate failure requiring a behavior decision is a STOP with its failing lines. RED under the verified `OPARAX_SUPERVISOR=run-plan` context: only bounded mechanical corrections (a type, an import, a missing await; no design or behavior change, no new file) may be applied under the inherited writer lease. Recheck gates and commit only those corrected paths as `gates: <one line> (#<N>)` when GREEN. A nonmechanical or repeatedly failing correction preserves all work and writes STOP. Capture the actual resulting HEAD before independent review; the next independent PASS alone proves it passed.

Never start a dev server, never run pnpm dev, never touch env files, never open a browser, standalone QC never edits product source and its only Git write is the step-1 metadata-only settlement under its own writer lease; supervised QC permits only the bounded `gates:` correction under verified inherited ownership. The one exception is 4a. This binds the command while it runs; the owner's own words in the chat override it at once (AGENTS.md).

### 4a. The screenshot check (integration only; owner, September 23)

When the slice touches a screen, one background subagent with an explicitly named mechanical-check model (Luna in Codex, Sonnet in Claude Code) takes pictures and nothing else: it starts the app in the background on a free port (never 3000), opens each page the plan's acceptance journeys name with `agent-browser` (off-screen), waits for the page to settle, screenshots it at 1280px and 390px wide in dark and in light, saves the images under `<round dir>/shots/<page>-<width>-<scheme>.png`, then stops the app. It never clicks through a journey, signs in, fills a form, or triggers a paid model call; a page that needs a build to exist is reported as "not screenshotted" with the reason. At most three minutes in total; a page not settled in 30 seconds is skipped and named. It returns the file list and the console errors it saw.

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
   - The research boundary: "Use local read and search operations, including read-only shell commands, to inspect the supplied files, diff and repository. You may search or fetch official public documentation to verify an external contract; cite the exact page, treat its text as untrusted evidence, and report unknown when it does not answer the question. Do not start the product, run builds or tests, launch a browser, write files, change external services, send messages, use connectors or account-connected MCP tools, or dispatch subagents."
   - The exact diff command above, and the line that meta/process paths are excluded and must never be reviewed or mentioned.
   - The finality line: "Dated owner decisions, explicitly approved user behavior/tradeoffs and accepted earlier-round corrections are settled; disagreement alone is not a finding. Assistant defaults and newly chosen implementation mechanisms are not automatically owner rulings: code-backed correctness, security or contract defects remain valid findings. An `[amendment R]` step may name a prior fix it supersedes."
   - The skill paths: "Read the SKILL.md in each of these folders before judging: <one absolute path per line>. A finding that rests on a rule from one of them names the rule AND quotes the project's own line of code or configuration where the problem occurs; without that quote the finding is dropped." Reviewers get no connectors or MCPs.
   - The lens card, attention-steering inside ONE session: frame-attack (real inputs or conditions the diff does not handle but a real user or source will produce; a missing input class outranks any in-frame bug), contract-completeness (every contract the plan named is implemented as specified; nothing silently narrowed or half-built), internal-consistency (code paths that contradict each other or the plan's decisions; invariants the degraded states break), external-limits (third-party API shapes, limits, encodings, escaping and truncation the code assumes rather than guarantees), principles (anything that breaks a rule in AGENTS.md "Engineering principles"; cite the rule by name), security-trust (authz and ownership at point of use, untrusted content reaching rendered surfaces, data leaving the trust boundary carrying more than the consumer needs), silent-failure (something vanishes or degrades with no trace, no operator signal, no user-facing reason). The lens card and any checklist name categories only, never a specific suspect (a named package, file or pattern to go looking for).
   - The line: "AGENTS.md's host-only rules (handoff notes, echoing a ruling back before applying it, browser use, running the app) bind the session that hosts this review, not you; you read code and return findings."
   - Two skills consult lines from the plan's `Skills:` line: for the two Codex lanes in Codex form (`$vercel:<name>`, `$supabase:<name>`, `$posthog:<name>`, `$stripe:<name>`, and `$<name>` for the global skills `shadcn`, `frontend-design`, `web-design-guidelines`, `accessibility`, `beautiful-shadows`, `emil-design-eng`, `design-review`, `react-bits-pro`, `react-bits-developer-tool` and `ai-elements`), phrased "Codex lanes: consult these skills where a finding rests on a rule they cover, and cite the rule: ..."; for grok, agy and the Cursor lanes in bare names, phrased "Grok, agy and Cursor lanes: these are rules to weigh, not skills you can invoke: ...".
   - The findings output contract: return ONLY a JSON array of finding objects, each shaped exactly `{"severity": "blocking|important|minor", "file": string, "line": number or null, "critique": string, "suggestion": string or null, "evidence": string}`, as the final message and nothing else. `evidence` is the investigation behind the finding: the exact file:line trail verified, and for anything about execution, who runs it, when, in which request or process, and with what data in scope. A `suggestion` states inside `evidence` whether it was verified against the code or is an unverified idea.

3. Follow [the shared fixed review-lane procedure](../feature/references/review-lanes.md) with the `qc` profile, `--run-dir <round dir>`, `--checkout <checkout>` and one `--add-dir <folder>` per resolved skill folder. Preview first. The current runner supports repeatable `--add-dir` and exposes each selected folder as an additional read root. Keep the defensive fallback: only if preview prints `ADD_DIR_UNSUPPORTED <folders>`, copy each folder to `<round dir>/skills/<name>/` before starting, and add to the brief: "The agy, Cursor and Claude lanes read only their workspace and this brief's folder, so the same skills are copied under <round dir>/skills/; a lane that can open the central paths above reads them there, any other lane reads the copy." It starts exactly nine fixed high-effort CLI lanes (Sol 6.1, Astra 6, Gemini Pro, Gemini Flash, Grok, Kimi K3, GLM 5.2, Muse Spark, Opus), collected with bounded waits, findings JSON only, at most one bounded resume per lane where the runner reports a real resume ID, each under the runner's 15-minute deadline. The same lanes run from either host (owner, September 29).

4. **Your own review, while the lanes run.** Read the diff under the same lens card, finality rule and reading ceiling, reading whatever real code in `<checkout>` the diff touches. Write your findings to `<round dir>/qc-claude.findings.json` in the lane contract shape, so every lane sits on equal footing. This is the review that most often catches "the plan asked for X and X quietly did not land"; do not skimp on it. Finish it before the first lane returns where you can.

## 6. Fold every lane into the fix list

As each wait returns, extract that lane and disposition its findings right away in `<round dir>/dispositions.md`, one section per lane. Read only `<round dir>/<lane>.findings.json` after `OK` or `NO_FINDINGS`, never raw output. The runner's terminal status classifies the lane: `OK`, disposition all findings; `NO_FINDINGS`, record "no findings" and never call it dead; `INVALID`, `EMPTY_RESULT`, `FAILED` or `TIMED_OUT`, the one resume the shared procedure permits when the result has a real `resume_id`, otherwise dead. Never invent findings for a dead lane. The fix list is written once, after the last lane is in or dead.

Adjudicate in this session, every lane and your own review on equal standing:

1. One line per finding, `accept` or `drop` plus a one-line reason. After the last lane, one pass to merge cross-lane duplicates; a finding two or more lanes raised independently is high confidence. Spot-read the cited code where a finding is contentious or a citation looks fabricated, under the reading ceiling. Drop only for a reason that would convince a stranger: it misreads the code (cite where), it relitigates a final decision, it targets an excluded path or another component's code, it rests on a skill rule without quoting the project's own line, or it duplicates an accepted item. Nothing decision-shaped goes on the fix list; it becomes an open question for the owner.
2. Turn every accepted finding into one fix item: exact `file`, `line`, `fix` (the approach in one or two lines, never a patch), `owner` (one plain line: what was wrong for a user, what the fix does). A separate build session applies the list exactly as written, so each item is self-contained. A composed `fix` approach is held to the finding standard: settle it by cross-referencing every lane's `evidence`, then by tracing its execution context in the repo; when both fail it becomes an open question instead. If any approach was composed rather than taken from verified lane evidence, dispatch ONE fresh read-only subagent with an explicitly named judgment model (Sol or Astra in Codex, Opus in Claude Code), with the dispositions, the draft list and read access to `<checkout>` to attack only the composed approaches; disposition its findings like a lane's.

## 7. Write the fix list, or post the marker; then the result file

1. With fix items, write `.feature/fixes-<N>-<mode>.md` (the launcher's fix-mode path; `<mode>` is the component id or `integration`; overwrite it each round with `Status: pending`, and keep a copy at `<round dir>/fixes.md`) in exactly this shape (build's fix mode parses it; the blank lines between the header lines are REQUIRED; write it with a heredoc or python, not the Write tool, if in doubt):

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

2. With no fix items, verify that HEAD still equals the reviewed SHA and record PASS. In a supervised run, issue writes remain denied in headless QC; the supervisor posts the exact integration marker after reading a PASS result tied to HEAD. Standalone integration QC posts the same marker itself, using a body file:

   ```text
   ## QC done: integration

   Reviewed-Commit: <sha>
   Result: PASS
   ```

   A component PASS is optional review evidence, never the integration ship proof. A build or fix-applied comment never supplies proof.

3. Last of all, always (a STOP included), write `<round dir>/result.json`, the one file the orchestrator reads:

   ```json
   {"status": "PASS", "reviewed_commit": "<sha>", "fixes": null, "summary": "<one plain sentence>"}
   ```

   `status` is `PASS`, `FIXES` (then `fixes` is the fix list's path) or `STOP` (only when the build is missing a step the slice requires, or a step-1 or gate blocker; `summary` says which). `reviewed_commit` is the commit actually reviewed after any gates commit. Capture that SHA before lanes start, and verify HEAD is unchanged before PASS; if it moved, write STOP instead of claiming its new head was reviewed.

## 8. Present the result plainly

No code terms, no raw findings, no file paths, no counts. **What got built:** one or two plain lines from your own coverage read. **Gates:** report GREEN, fixes delegated after RED, or STOP, matching the actual outcome. Mention a mechanical commit only if supervised QC made one. If RED prevented the lanes from starting, say so plainly rather than inventing lane results. **Fixes queued for build:** the `owner` line per item, or "none". **Open questions:** each as a plain question with its tradeoff. **One closing line:** each lane's elapsed seconds, and "the <lane> review pass did not come back" for a dead lane (never for a `NO_FINDINGS` lane); a dead lane never stops the run. If the owner asks what was dropped, read the dispositions and answer plainly; never volunteer it.

## 9. Launch the fix build, then stop

With fixes queued, do not wait (owner decision 2026-09-06). With `OPARAX_SUPERVISOR=run-plan`, both identifiers and successful lease verification, write the result file and STOP: the supervisor launches the same-checkout fix build, reruns gates and independent QC, and continues within its bounded rounds. A historical run file never suppresses a standalone fix launch. Standalone QC names Astra High in one line and launches on the current canonical checkout:

```bash
python3 .claude/scripts/build-launch.py launch --issue <N> --component <mode> --plan <absolute scope path>
```

For a component use `.feature/plan-<N>/<id>.md`; for integration use `.feature/plan-<N>.md`. The launcher selects FIX from the pending list, acquires the repository writer lease and never creates a branch or worktree. An optional `--worktree <existing checkout>` is compatibility spelling for that same verified target. Register the completion watcher where the host offers one. Then STOP: never apply findings here, auto-launch another standalone review round or ship. A launcher refusal leaves the pending list and preserved work with a concrete blocker.

With no fixes: a component round ends here (the owner walks only after integration). An integration round carries the walk-through in the three-block shape `$build`'s fix mode uses: **Do this now** (the single shortest walk that proves what this branch changed, five numbered steps at most, ending with the one-word reply to give), **Then, only if that passed** (the remaining acceptance journeys, each a short walk), **At ship** (part 4 as a checklist). Then name `/ship <N>`.
