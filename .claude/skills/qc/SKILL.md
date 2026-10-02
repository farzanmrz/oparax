---
name: qc
description: >-
  The review side of feature work, same behavior in either host. Reviews what a build
  committed: one component (/qc <N> --component <id>) or the whole feature branch
  (/qc <N> --integration, or a bare /qc <N>). Checks plan coverage, runs the gates,
  screenshots changed screens, launches nine CLI review lanes on the diff and the
  screenshots, reviews the diff itself, folds every finding into one fix list, writes
  the result file the run reads, and hands the list straight back to the builder on
  Astra High. Not for building or fixing; that is /build or $build.
argument-hint: "<issue #> --component <id> | --integration"
allowed-tools: Bash(git *) Bash(gh *) Bash(bash *) Bash(python3 *) Bash(find *) Bash(mkdir *) Bash(mktemp *) Monitor Agent Write Read Edit Grep Glob
model: inherit
disable-model-invocation: true
---

# QC: review one component or the whole branch, hand the fix list to the builder

The run starts this headless (`claude -p "/qc <N> --integration" --model sonnet --effort medium`) and reads one file back; the owner may also type it. One session, nobody to ask. This skill never builds, never applies findings and never walks journeys. With fixes it writes the list and the result file and hands the list to the builder (owner, September 6: the invocation is the standing approval); with none it records an independent PASS tied to the reviewed commit, because only a QC pass proves a commit, never a fix build's report (owner, September 28). Fix builds always run on Astra High (owner, September 24).

## Working style

- **Autonomous.** Never end a turn on a question or a promise; the only stops are the STOPs below, each ending with the result file and a plain blocker.
- **Claim only what a tool result shows.**
- **Minimal fixes.** Each item corrects exactly what its finding names, the simplest way.
- **Report in chat, not files** (owner, October 2): no dispositions, contract copies or per-round folders. The fix list and the result file are the only outputs.

## Names

- `<mode>`: the component id, or `integration`. `<checkout>`: this checkout, which must be on `ft/<N>` or `bf/<N>`; run every git command as `git -C <checkout>`.
- `<range>`: for a component, `<base_commit>...<head_commit>` from that component in `.feature/run-<N>.json`; for integration, `origin/beta...HEAD`.
- `<R>`: one past the `Round:` in an existing `.feature/fixes-<N>-<mode>.md`, else 1.
- `<run dir>`: a fresh lane directory, `run_dir="$(mktemp -d .feature/lanes/qc-<N>-<mode>.XXXXXX)"`. `<brief>`: `.feature/lanes/qc-<N>-<mode>.brief`. `<result>`: `.feature/qc-<N>-<mode>.json`.

Resolve `shadcn` (and legacy `vercel:shadcn`) to the official global skill at `~/.agents/skills/shadcn`.

## 1. Confirm the target

**Supervision.** A supervised run passes `OPARAX_SUPERVISOR=run-plan`, `OPARAX_RUN_ID` and `OPARAX_WRITER_TOKEN`. Only all three plus a successful `python3 .claude/scripts/writer-lease.py verify --run-id "$OPARAX_RUN_ID" --token "$OPARAX_WRITER_TOKEN"` make this session supervised; a run file on disk never does. Supplied but failing context is a routing STOP; never start a competing writer. Without it the session is standalone.

**Target.** The checkout must already be on `ft/<N>` or `bf/<N>`; never switch. For a component, read `{id, title, plan_section, depends_on, base_commit, head_commit, status}` and the top-level `branch` from `.feature/run-<N>.json`, and STOP on a missing range or a HEAD other than `head_commit`. For supervised integration, every built component head must be an ancestor of HEAD.

**Clean tree.** `git -C <checkout> status --short && git -C <checkout> log --oneline <range>`. No product commits in the range: STOP, nothing was built. Standalone QC settles uncommitted `.claude/` or `.codex/` paths, and only those, under its own lease; any other dirty path is a STOP:

```bash
python3 .claude/scripts/writer-lease.py run --repo <checkout> --run-id qc-meta-<N> -- bash -c 'git -C "$1" add -A -- .claude .codex && git -C "$1" commit -m "meta: commit tool configuration under .claude and .codex (#$2)" && git -C "$1" push origin HEAD' -- <checkout> <N>
```

Then `mkdir -p .feature/lanes` and create `<run dir>`.

## 2. The contract

Read by exact path, never retyped: for a component, its slice (`plan_section`) and `.feature/plan-<N>/shared.md`; for integration, `.feature/plan-<N>.md`, `shared.md` and every slice in table order. Then every `.feature/amend-<N>-<R>.md` in round order; an amendment step wins over the plan or a fix it names. A `Status: pending` amendment is a STOP: it must be built first.

Earlier fixes are settled memory, because without them round 2 of #124 reversed round 1's own fixes. They are the branch's fix commits: `git -C <checkout> log -p --grep '^fix: round' <range>`. An applied fix wins over the plan's letter unless an amendment supersedes it.

## 3. Coverage and gates

Read the code, not the build's summary. The diff under review is exactly:

```bash
git -C <checkout> diff <range> -- . ':(exclude).claude' ':(exclude).codex' ':(exclude).agents' ':(exclude).github' ':(exclude).feature' ':(exclude)docs' ':(exclude)pnpm-lock.yaml'
```

Process paths are excluded on purpose and are never fix material.

1. **Coverage.** Read the diff (`--stat`, then in full) against `## 1. Files and contracts` and `## 2. Build steps` as amended. Journeys name capabilities to check in source, never to execute; part 4 is the owner's, never graded. Another component's unbuilt code is out of scope; integration judges the seams. Redo any reference-init diff step the same bounded way; an uncovered option is a finding. A missing or half-built step is a STOP naming it: no gates, no fix list.
2. **Gates.** `(cd <checkout> && bash .claude/scripts/qc-gates.sh <range>)` with a 600000 ms timeout. GREEN: continue. RED, standalone: never edit product files; turn mechanical compiler errors into the pending fix list, write a FIXES result at this HEAD and go to step 9 without lanes; a failure needing a behavior decision is a STOP with its lines. RED, supervised: only bounded mechanical corrections (a type, an import, a missing await; no behavior change, no new file) under the inherited lease, committed as `gates: <one line> (#<N>)` once GREEN; anything else is a STOP.

Capture the reviewed SHA now. Never start a dev server, touch env files or open a browser, except step 4. The owner's own words in chat override this at once (AGENTS.md).

## 4. Screenshots (integration, when the plan touches a screen)

One background subagent on an explicitly named mechanical model (Sonnet in Claude Code, Luna in Codex) takes pictures and nothing else (owner, September 23): it starts the app in the background on a free port (never 3000), opens each page the journeys name off-screen with `agent-browser`, waits for it to settle, saves `<run dir>/shots/<page>-<width>-<scheme>.png` at 1280 and 390 px in dark and light, and stops the app. No clicks, sign-in, forms or paid calls; three minutes at most; a page not settled in 30 seconds is skipped and named. It returns the file list and console errors. A missing screenshot is never a finding against the product.

## 5. Lanes and your own review

1. **Skill folders by central path** (owner, September 28). For each bare name on the plan's `Skills:` line, take the first hit, newest version for plugins, and name any miss in the brief as a gap:

   ```bash
   find ~/.agents/skills ~/.claude/skills .claude/skills ~/.claude/plugins/cache ~/.codex/plugins/cache -path "*/skills/<name>/SKILL.md" 2>/dev/null
   ```

2. **Write `<brief>`**, every path absolute, in this order: the budget line ("about 10 minutes of wall time; read the contract and the diff first; if nearly out of time, return valid findings JSON rather than nothing"; owner, August 23); the framing (built and committed on `<branch>` in `<checkout>`; the contract is the plan, slice and amendment paths from step 2 plus the fix commits; cite real `file:line`; one holistic pass); for a component, that other components' code is out of scope, for integration, that the seams (ownership, trial clock, pools, delivery, payment) are the lens; the reading ceiling; the research boundary (as the critique brief); the exact diff command and that excluded paths are never reviewed; the screenshot paths with the visual question for a change of look (beside the accepted renders and reference board, does it land, is it aligned, could it be mistaken for something he rejected) plus layout at both widths and contrast in both schemes; the finality line ("dated owner decisions, approved behavior and applied earlier fixes are settled; assistant defaults and new mechanisms are not, so code-backed defects in them stand"); the skill `SKILL.md` paths, with "a finding resting on a skill rule names the rule and quotes the project's own offending line, or it is dropped"; the lens card naming categories only, never a suspect (frame-attack, contract-completeness, internal-consistency, external-limits, principles from `docs/references/engineering.md` cited by name, security-trust, silent-failure); "AGENTS.md's host-only rules bind the hosting session, not you"; skills-consult lines for the two Codex lanes in `$name` form and bare names for the rest; and the output contract: only a JSON array of `{"severity": "blocking|important|minor", "file": string, "line": number or null, "critique": string, "suggestion": string or null, "evidence": string}`, with `evidence` the verified trail and whether a suggestion was checked.
3. **Run the `qc` profile** per [review lanes](../feature/references/review-lanes.md) with `--run-dir <run dir>`, `--brief <brief>`, `--checkout <checkout>` and one `--add-dir` per skill folder, preview first.
4. **Your own review while they run**, under the same brief, reading whatever real code the diff touches, with `reference-led-design` and `accessibility` loaded for the screenshots. It most often catches "the plan asked for X and X quietly did not land"; finish it before the first lane returns where you can.

## 6. Fold everything into one fix list

Extract each lane as it ends (`OK`: every finding; `NO_FINDINGS`: nothing found, never dead; otherwise the one permitted resume, else dead; never invent findings). Your review and every lane stand equal. Merge duplicates; two lanes raising one point is high confidence. Spot-read cited code when a finding is contentious or a citation looks invented. Drop only for a reason a stranger would accept: it misreads the code (cite where), relitigates a settled decision, targets an excluded path or another component, rests on a skill rule without quoting our line, or duplicates an accepted item. Anything decision-shaped becomes an open question, never a fix.

Each accepted finding becomes one self-contained item: `file`, `line`, `fix` (the approach in one or two lines, never a patch) and `owner` (one plain line: what was wrong for a user, what the fix does). A `fix` you composed rather than took from verified lane evidence is checked against every lane's evidence, then traced in the repo, else becomes an open question; if any were composed, one fresh read-only subagent on an explicitly named judgment model (Opus in Claude Code, Sol or Astra in Codex) attacks only those approaches, and its findings are folded in the same way.

## 7. Write the outputs

1. **Fixes:** overwrite `.feature/fixes-<N>-<mode>.md` with this shape, one header per line, because the launcher reads `Round:` and `Status:` and the builder reads the blocks:

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

2. **No fixes:** confirm HEAD still equals the reviewed SHA. A supervised session posts nothing (the run posts the marker). Standalone integration QC posts it with a body file:

   ```text
   ## QC done: integration

   Reviewed-Commit: <sha>
   Result: PASS
   ```

   A component PASS is never ship proof.
3. **Always last, a STOP included,** write `<result>`: `{"status": "PASS|FIXES|STOP", "reviewed_commit": "<sha>", "fixes": "<fix list path or null>", "summary": "<one plain sentence>"}`. If HEAD moved since the review began, write STOP rather than claim the new head.

## 8. Report plainly

No code terms, raw findings, paths or counts. **What got built** (one or two lines from your coverage read). **Gates:** GREEN, fixes handed over after RED, or STOP. **Fixes for the builder:** each `owner` line, or "none". **Open questions:** each with its tradeoff. **One closing line:** each lane's elapsed seconds, and "the <lane> review did not come back" for a dead lane. If asked what was dropped, answer plainly; never volunteer it.

## 9. Hand the fixes to the builder, then stop

Supervised: write the result and STOP; the run launches the fix build in this checkout, reruns gates and QC, within three fix rounds. Standalone: name Astra High in one line and launch it on this checkout, then STOP:

```bash
python3 .claude/scripts/build-launch.py launch --issue <N> --component <mode> --plan <absolute path: the slice, or .feature/plan-<N>.md for integration>
```

The launcher takes the repository writer lease and picks FIX from the pending list. A refusal leaves the list and the work intact with a concrete blocker. Never apply findings here, start another review or ship.

With no fixes, a component round ends here. An integration round gives the walk: **Do this now** (the shortest walk proving what this branch changed, at most five numbered steps, ending with the one-word reply to give), **Then, only if that passed** (the remaining journeys), **At ship** (the part 4 lists as a checklist). Then name `/ship <N>`.
