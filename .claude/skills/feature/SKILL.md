---
name: feature
description: >-
  The whole plan side of feature work, CLAUDE CODE ONLY (it loads skill
  bundles with the Skill tool and runs the critique lanes with Bash):
  talk through the idea with the owner, write the owner-facing plan,
  load the slice's skill bundles in this session and check the plan
  against them, agree the plan with the owner, write the detailed plan
  for build, run a four-lane holistic cross-model critique directly in
  this session plus adjudication, present the revised plan, and on
  approval create the GitHub issue and cut the branch. Use when
  the user says /feature, "let's plan a feature", or brings a new
  capability idea to talk through. Bugs use it too, starting from the
  repro. Not for building ($build <N> in Codex comes after this skill
  ends).
allowed-tools: Bash(git *) Bash(gh *) Bash(bash *) Skill
model: inherit
---

# Feature: talk, plan (owner-facing then detailed), skill bundles, critique, issue + branch

One session, start to finish. Nothing here auto-dispatches the next stage of the overall flow: this skill ends by naming `$build <N>` for the owner to run themselves in Codex.

## Working style, every step of this command

- **When you have enough information to act, act.** Do not re-derive facts already established in this conversation, re-litigate a decision the owner has already made, or narrate options you will not pursue. A choice that is yours to make, make and record with its reason; a choice that is genuinely the owner's becomes one plain question at the next owner checkpoint.
- **End a turn only at this command's named stops** (the slice agreement in step 1, the plan approval in step 4, the revised-plan approval in step 7). Anywhere else, before ending a turn, reread your last paragraph: if it is a plan, a question you could answer yourself, or a promise about work not yet done ("I'll..."), do that work now with tool calls instead of ending on it.
- **Claim only what you can point to.** Every statement of progress or state rests on a tool result from this session: a file read, a command's output, a lane's state line. Anything not yet verified is said to be unverified, plainly.
- **The owner reads product language, not a terminal.** In every owner-facing message, lead with the outcome in complete plain sentences. No arrow chains, no shorthand or names invented mid-session, no vocabulary from the working thread; if it comes down to short versus clear, choose clear.

## Hard rules for the planning stage

- **The slice must be the one the priorities name.** Before the talk-through, read `~/Desktop/repos/admin/PRIORITIES.md` (private, outside this repo). If the brief is not the bucket-2 slice named there, and no exit condition in that file has fired, stop before step 1 and say: "This is not the current slice; PRIORITIES.md names <slice>. Which exit condition fired?" Do not plan, do not open an issue. The owner's explicit word in the chat that an exit condition fired, or that this is a bug fix on live behavior, lifts this.
- **Planning never runs the app.** Never start or attach to a dev server, never run `pnpm dev` or the poller, never open a browser or use any browser, preview, or computer-use tool, never execute code in a page. Only the owner runs the app. This binds the command while it runs; if the owner asks in their own words in the chat to run the app or open a browser, that wins immediately (AGENTS.md).
- **Reading has a ceiling.** The repo's own source is read freely; that is what the plan is grounded in. A third-party package under `node_modules` is read only for its public contract: the option names, signatures, and types in its `.d.ts` files and its shipped README or docs, to confirm that a name the plan cites exists and what shape it takes. Never read a package's built or minified output (`dist/*.js`, `*.min.js`, `*.cjs`, `*.mjs`), never trace how a package behaves at runtime, never chase one identifier from one grep into the next. If confirming a single fact takes more than three tool calls, stop: it is not a planning fact, it is a build-time check (next rule).
- **A runtime question is a plan step, not a research project.** When the brief describes a runtime symptom (something "reports disabled", "does not appear", "fires twice"), or asks to "validate", "verify", "confirm", or "determine why" something happens when the app runs, do not settle it here. Write it into the detailed plan as a named check the build performs first (what to look at, the candidate causes, what the build does in each case) and, where it is user-visible, as an acceptance journey the owner walks. Wording in the owner's brief asking for validation does not override this: the plan carries the check, the build proves it, QC confirms it.
- **Owner-stated facts are given.** Anything the brief lists as already established (a dashboard setting, an observed status, a decision) is not re-verified here; it is quoted into the plan as a premise. The owner's description of the gap IS the gap: do not re-diagnose what they already diagnosed; take it as the starting point and plan the fix. Verify the code, not the owner.

## 1. Talk it through

Discuss the idea with the owner in plain product language, on whatever model this session is already running. Every message in this step is short and product-shaped: what the owner asked for restated in one or two sentences, at most three one-line points that change it (each as "what it means for you, what we'd do"; no file names, no option names, no mechanism talk), and one yes/no question; then end the turn. If the owner does not understand, answer in the same shape, shorter, never longer. If the idea is a tangle of several things, the first job is cutting it into separate slices and agreeing with the owner on exactly ONE slice for this round, the rest wait for their own round later. Do not move on until one slice is clear.

**UI checkpoint:** if the slice has any user-facing surface (a screen, a panel, a Slack message layout, an email), explicitly ASK the owner, as its own question: "Do you want to provide the design for this (v0 export, Block Kit JSON, a screenshot), or should it be derived from the app's existing design system?" Never assume either answer. The owner's choice is recorded as a line in "The decisions" once the plan is drafted ("look provided by owner" or "look derived from the existing design system"), and if they choose to provide one, wait for the artifact before moving on. This also decides whether the `ui` bundle below applies.

At the end of this step, pick the skill bundles this slice touches from the table in step 3: web, ui, data, ai, slack, workers (web and data apply to almost every slice; web carries the PostHog instrumentation skills for analytics, error tracking, and feature flags, ai carries PostHog LLM analytics). There is also ONE `free` bundle for a skill this slice needs that should not be loaded globally (an env-hygiene task wanting `vercel:env-vars`, say): name the exact skill names for it, checked against `ListSkills` so nothing is invented, at most a handful. Say the bundles (and the free skills, if any) to the owner in one line; the owner may veto or add. Do not move to writing the plan until one slice and its bundles are agreed.

## 2. Draft the plan (plain language)

Write "the plan" for that one slice in exactly this five-section format (no code terms, no file paths, no framework language anywhere in it), marked DRAFT:

- **What happens:** plain words, step by step, what a user experiences.
- **What happens when it fails:** plain words, what the user sees.
- **The decisions:** a short list, one line each, plain words, each line three clauses: what we do, what that means for you, why. A decision without its consequence is not finished.
- **Open questions:** anything genuinely unresolved that needs the owner's own call, each carrying its tradeoff and answerable without asking what any word means.
- **Out of scope:** what is explicitly not being built this round.

Do not ask the owner to approve it yet; that happens in step 4, after the skill bundles have had a chance to sharpen it.

## 3. Load the skill bundles and check the draft against them

This happens in this session, with the Skill tool: no subagent, no workflow, no fan-out (measured 2026-08-18: a Sonnet lens fan-out cost 3.5 minutes of wall and returned mostly what this session had already read; the only new input was the skill text itself, which belongs in this context). The bundle table below is the source of truth for what gets loaded:

| Bundle | Skills to invoke, exactly these names | Also |
| --- | --- | --- |
| web | `vercel:nextjs`, `vercel:vercel-functions`, `vercel:routing-middleware`, `posthog:instrument-integration`, `posthog:instrument-product-analytics`, `posthog:instrument-error-tracking`, `posthog:instrument-feature-flags` | |
| ui | `vercel:react-best-practices`, `vercel:shadcn`, `ui-ux-pro-max` | read root `DESIGN.md` first, the binding visual contract |
| data | `supabase`, `supabase-postgres-best-practices` | |
| ai | `vercel:ai-sdk`, `vercel:ai-gateway`, `posthog:instrument-llm-analytics` | |
| slack | `vercel:chat-sdk`, `slack:block-kit`, `slack:slack-api`, `slack:slack-messaging` | |
| workers | `railway:use-railway` | only when `poller/` or `ingest/` is touched |
| free | the exact names agreed in step 1 | |

Procedure, deterministic, no judgment about which skills "seem relevant":

1. For each bundle picked in step 1, invoke every skill in its row with the Skill tool, one call per name, in the order listed. A skill that fails to load is named to the owner in the summary line below, never silently skipped.
2. With the skills in context, reread the draft from step 2 against them under the reading ceiling (hard rules above): names, options, and paths already verified in step 1 or 2 are taken as real; at most a few reads of the repo's own source per point, `.d.ts` types only from a package, never its bundle. Skill rules that do not apply to this slice are ignored; skill boilerplate never enters the plan.
3. Fold what applies into the draft plan: a constraint becomes a decision or, where it is genuinely unresolved, an open question, always in plain words. Never show the owner raw skill text.
4. Print exactly one line per bundle, and nothing else about this step: `<bundle>: <k> skills loaded, <n> points folded in` (or `nothing new`), plus `<name> failed to load` where that happened. This line is how a skipped load stays visible.

The wall cost of this step is the skill invocations themselves; it does not wait on anything.

## 4. Agree the plan with the owner

Show the owner this document, then END YOUR TURN and wait. They read it, push back, and it gets revised in place until they approve it. **Nothing below starts until the owner has said yes to this exact document, in this conversation.** A complete, spec-shaped opening brief is NOT that yes: the owner approves the plan document, not their own prompt. Step 1 is likewise a real exchange, one message stating the slice and bundles and then a wait, even when the brief looks finished. Once approved, write it to `.feature/plan-owner.md` once, verbatim (the critique lanes, the adjudicator, and step 7's presentation all read it from there afterward; nothing later retypes it).

## 5. Write the detailed plan (technical, inline, owner never reads it)

After approval, write the detailed version of the same plan directly in this conversation. It is for the build stage (`$build <N>` in Codex) and the critique lanes only; the owner is never shown it and never asked to approve it. Ground it in the real code (real paths, real names) and flag missing information instead of guessing. No code, no snippets: build writes all of that once, from this document.

It has EXACTLY these parts, in this order, with these headings, because each later stage reads specific parts and nothing else:

1. **`Skills:` line** at the very top: the picked bundles and the flat list of their skill names, BARE (no `vercel:`/`slack:`/`posthog:` prefixes), e.g. `Skills: web, data (nextjs, vercel-functions, routing-middleware, instrument-integration, supabase, supabase-postgres-best-practices)`; every later stage reads this line and maps each name to its own harness's prefix. Free-bundle skills are listed the same way. Only list a bundle's skills that this slice actually leans on; a bundle loads several, the plan names the ones that matter here.
2. **`## 1. Files and contracts`**: the files it touches, the contracts (inputs, outputs, failure states, exact user-facing copy for graceful failures), the input classes each entry point admits, the migrations (as SQL intent, not SQL).
3. **`## 2. Build steps`**: the ordered code changes, each naming the Codex skills that step invokes by `$name` in Codex's own form (Vercel plugin skills as `$vercel:<name>`, Supabase ones as `$supabase:<name>`, PostHog ones as `$posthog:<name>`, Railway as `$use-railway`) so the build invokes exactly those and nothing else. Code changes and migrations ONLY. A build step NEVER contains: running or proving a journey, running gates/typecheck/lint/build, starting or restarting a server or the poller, editing env files, Vercel/Railway/dashboard operations, or anything phrased "ask the owner". Those belong in parts 4 and 5; if one lands in a build step the build agent will execute it, which is exactly the failure this structure exists to prevent.
4. **`## 3. Acceptance journeys`**: the journeys with real inputs, written for the OWNER to walk on localhost after `/qc`. Never referenced from a build step. `/qc` reads them only to judge whether the build covered what they need.
5. **`## 4. Owner does at ship`**: every operation that needs the owner's own hand or account: Vercel env changes, Railway redeploys, dashboard toggles, account deletions. `/ship` shows this list to the owner; nothing in the flow executes it.

Write it to `.feature/plan-draft.md` once, as you finish authoring it (a single Write, not a draft-then-redo). A killed session can resume from what's already written instead of starting over, and every step after this one edits the file by targeted hunk rather than re-authoring it.

### 5.1 UI slices, including UI the owner brings in

When the slice touches any UI, the detailed plan grounds its visual decisions in root `DESIGN.md` (the binding visual contract) and may query the `ui-ux-pro-max` skill for citable UX rules; new UI aligns to the app's existing aesthetic, never a freshly invented one.

The owner may hand over ready-made UI: code exported from v0 or a design tool, Block Kit JSON from Slack's builder, or a screenshot of a design they want. Treat that artifact as a DECIDED input, not a suggestion: save it verbatim to `.feature/ui-<short-name>.<ext>`, reference that file path in the detailed plan as the base the build adapts (restyled to `DESIGN.md` tokens where they conflict, structure preserved), and note in the plan's "The decisions" section, in plain words, that the look comes from the owner's provided design. The critique lanes may attack how it's wired in, never relitigate the owner's visual choice.

### 5.2 Vendor init: the reference-init diff

When a slice touches how a third-party SDK is initialized (the PostHog `posthog.init` call, the Supabase client factory, an AI SDK provider setup, a Slack app client), the detailed plan carries one build step named "reference-init diff" for that SDK. It reads exactly two things and never a third: (A) the reference init snippet in that vendor's skill for our framework (the skill is already loaded from step 3; for PostHog on Next.js it is the `instrumentation-client.ts` block in `posthog:instrument-integration`'s Next.js reference), and (B) our own init call in the repo. Its output is a list: every option the reference sets that our call does not, each either added (matching the reference IS the answer; nobody asks why the vendor sets it) or written into the plan as a decision with its reason ("not set because ..."). No `node_modules` reading is part of this step; if a name in the reference needs confirming, one `.d.ts` grep at most, which the reading ceiling already allows. If the skill has no reference init for our framework, the step says so and is skipped. Measured need (2026-08-18, #124): the PostHog reference init has three lines and one is `defaults`; our call had none, the recorder script never loaded, and one plan, one amendment, four QC rounds, and every lane missed it because each compared the code to our plan, never to the vendor's reference. This step is bounded knowledge applied deterministically, not investigation.

## 6. Run the critique

Once the detailed plan is complete, the session itself runs the critique directly with Bash: no Workflow tool, no bridge agents, one holistic pass per lane. Every lane reads the plan straight off disk (`.feature/plan-draft.md`, `.feature/plan-owner.md`); nothing here ever retypes the plan into a command.

1. Write the shared critique brief to `.feature/lanes/critique.brief`, in this order:
   - A budget line: "Budget: about 5 minutes of wall time. Verify the plan's premises against the code first; do not chase side quests; if the budget is nearly spent, return what you have as valid findings JSON rather than nothing." No CLI can actually enforce this; it is prompt pressure only, and each lane's DONE line (step 6.3) reports the real elapsed seconds so it stays measured against reality, not a guess.
   - The PRE-IMPLEMENTATION framing: this is a detailed plan, not yet built; its claims are a hypothesis and the real repo is the evidence, so ground every claim in the actual code and cite file:line.
   - The reading ceiling: "Read the repo's own source freely. From a third-party package under node_modules read only its .d.ts types and shipped docs, to confirm a name or a shape the plan cites; never its built or minified output (dist/*.js, *.min.js), never trace how it behaves at runtime. Where the plan turns a runtime question into a named build-time check, the check itself is what you review (is it the right thing to look at, are the candidate causes complete); do not try to answer the question yourself."
   - The instruction to read `.feature/plan-draft.md` (the detailed plan under review) and `.feature/plan-owner.md` (the owner-approved plan whose decisions are final) before critiquing anything.
   - The lens card, attention-steering inside ONE session (no subagents, no fan-out):
     - frame-attack: real inputs or conditions the detailed plan never mentions but a real user or source will produce.
     - contract-completeness: every named type, payload, and function contract is enumerated field-by-field; nothing is named but left for the build to invent.
     - internal-consistency: decisions, journeys, and walkthrough steps that contradict each other, or assert invariants the degraded states break.
     - external-limits: third-party API shapes, limits, encodings (code points vs UTF-16), escaping, and truncation the plan assumes rather than guarantees.
     - security-trust: authz and ownership at point of use, untrusted content reaching rendered/escaped surfaces, data leaving the trust boundary carrying more than the consumer needs.
     - silent-failure: states where something vanishes or degrades with no trace, no operator signal, and no user-facing reason.
   - The line: "The owner's plan decisions and any owner-provided UI are final; attack how they are wired in, never relitigate them."
   - Two skills consult lines, both built from the `Skills:` line at the top of the detailed plan: one for the two codex lanes, mapping each bare skill name to Codex's own invocation form (`$vercel:<name>`, `$supabase:<name>`, `$posthog:<name>`, or `$use-railway`, dropping `ui-ux-pro-max`, a Claude-only project skill Codex has no access to), phrased "Codex lanes: consult these skills where a finding rests on a rule they cover, and cite the rule: ..."; one for grok and agy, in bare names with no prefix, phrased "Grok and agy: these are rules to weigh, not skills you can invoke: ...".
   - The findings output contract: return ONLY a JSON array of finding objects, each shaped exactly `{"severity": "blocking|important|minor", "target": string, "critique": string, "suggestion": string or null}`, as the final message and nothing else.

2. Launch four lanes, each with `bash .claude/scripts/lane.sh start <lane> -- <cmd>` (run in the FOREGROUND; lane.sh detaches the command itself and returns at once):
   - `critique-codex-sol`: `codex exec -s read-only -C <repo path> -m gpt-5.6-sol -c model_reasoning_effort=medium --json "Read <repo path>/.feature/lanes/critique.brief and follow it exactly."`. One holistic session, no subagents.
   - `critique-codex-terra`: the same command, with `-m gpt-5.6-terra -c model_reasoning_effort=high` in place of the sol model/effort.
   - `critique-agy`: `agy --model=gemini-3.1-pro-high --effort=high --output-format=json --print="Read <repo path>/.feature/lanes/critique.brief and follow it exactly. <the same budget line>"`. The four flags MUST each be joined with `=`, never a bare flag followed by a space-separated value: passing the prompt as a trailing positional argument after other flags silently drops it in this CLI and returns an unrelated generic greeting instead, with no error. agy runs with repo access, so it reads the brief itself; if a run shows it could not read repo files, the fallback (agy only) is to paste the brief's full text inline as the `--print` value instead of the one-line pointer.
   - `critique-grok`: first write `.feature/lanes/critique-grok.prompt` (grok takes its instruction from a file, not an inline flag): a grok-specific budget line, "You have a hard cap of 20 turns (one turn = one round of thinking plus tool calls) and about 5 minutes. Spend the first turns verifying the plan's premises against the code; do not chase side quests; never read a package's built or minified output; by turn 15 stop reading and write your findings JSON, because an answer that never arrives is worth nothing.", followed by the same one-line pointer, "Read <repo path>/.feature/lanes/critique.brief and follow it exactly." Then run: `grok --prompt-file <repo path>/.feature/lanes/critique-grok.prompt --sandbox read-only --cwd <repo path> --disallowed-tools "mcp__vercel__*,mcp__railway__*" --always-approve --no-subagents --effort medium -m grok-4.6 --max-turns 20 --output-format json`. Do NOT pass `--agent`. The `--disallowed-tools` value MUST stay inside double quotes exactly as written, or the shell expands the star-glob before grok ever runs. The turn cap and effort are the two knobs that actually bound this lane, and the DONE line's elapsed seconds is what tunes them (measured 2026-08-18: high effort, cap 30, stopped by itself at 26 turns in 663s, about 25s per turn; hence medium and 20, target about 5 minutes; if it still lands past 7 minutes or its findings are mostly dropped in dispositions, the lane goes).
   - No Claude critique lane (owner decision: removed at the critique stage).

3. Wait per lane, not in one shot: launch FOUR separate background waits, one Bash call each with `run_in_background: true`: `LANE_HUNG_SECONDS=900 bash .claude/scripts/lane.sh waitall critique-codex-sol`, and the same for `critique-codex-terra`, `critique-agy`, `critique-grok`. Each loops the wait logic on its one lane until it is not RUNNING and prints that lane's final DONE/HUNG/DIED/NOT_STARTED line, so the session is re-invoked as each lane finishes instead of once at the end, and the owner sees four named tasks (which lane is still out is visible at a glance, and its elapsed seconds land as soon as it lands). `LANE_HUNG_SECONDS=900` is the 15-minute terminal wall cap (owner decision 2026-08-23, replacing the earlier run-to-completion rule): a lane still running at 15 minutes makes its wait print `HUNG`. On a `HUNG` or `DIED` line: run `bash .claude/scripts/lane.sh kill <lane>`, then extract with `bash .claude/scripts/lane.sh findings <lane> --timed-out` so work the lane already emitted is kept, and classify by the state table in step 6.5 (a valid payload it managed to emit still counts as OK or NO_FINDINGS; otherwise TIMED_OUT).

4. As each lane returns, do that lane's share right away, while the others are still running: run `bash .claude/scripts/lane.sh findings <lane>` (writes `.feature/lanes/<lane>.findings.json`, ONLY the findings JSON array, and prints ONE state line, see the lane-state table in step 6.5; a codex `--json` lane's raw `.out` is the full JSONL event stream, hundreds of KB, so nothing downstream ever reads the raw `.out` files), read that findings file, and write that lane's disposition lines into `.feature/critique-dispositions.md` (step 5's STEP ONE), each marked with the lane name. If the state line is `INVALID`, `FAILED`, or `TIMED_OUT` and carries `resume_id=`, make the ONE bounded resume attempt here, before dispositioning that lane: resume the lane's own stored session so the model finishes its own answer (`grok --resume <resume_id>` or `agy --conversation <resume_id>`; codex lanes have no resume and are simply dead), launched as a new lane named `<lane>-resume` with the same sandbox and denials as the original, at most 5 turns, told to investigate nothing, use only the work already in its context, and emit only the findings JSON (`[]` is a valid answer). Classify the resumed lane's output with the same state table; run the attempt at most once per lane per round, and a second invalid result makes the lane dead. Never read prose, partial output, or a reasoning trace as findings. Do NOT edit either plan file yet: the plan is edited exactly once, after the last lane is in, so a finding two lanes raised independently is recognized as high-confidence, duplicates across lanes are merged, and there is a single hunk pass instead of four. When the last lane's wait returns, only its share is left, so the tail after the slowest lane is short.

5. Adjudicate in this session, objectively. This session wrote the plan, so the pull to defend it is real; the guard is not a second agent (which would have to re-read everything this session already holds) but a written record: every finding gets a disposition line before anything is edited, and that file is what the owner can ask to see. Do it in this order:
   - Read each lane's extracted findings file ONLY: `.feature/lanes/<lane>.findings.json` for each lane launched in step 6.2. Never open a raw `.out`. What a lane's state line means (`lane.sh findings` prints exactly one of these, and it, not the file's contents, is what classifies the lane):

     | State | What happened | What this session does |
     | --- | --- | --- |
     | `OK count=N` | the review came back with N findings | disposition all N |
     | `NO_FINDINGS count=0` | the review came back and found nothing wrong: HEALTHY, the lane worked | record "no findings" for that lane, report its elapsed seconds normally, and NEVER call it dead or say the pass did not come back |
     | `INVALID` | the lane finished but produced no usable findings payload | if the line carries `resume_id=`, make ONE bounded resume attempt (step 6.4); otherwise the lane is dead |
     | `FAILED exit=N` | the lane's process died | same: one resume attempt if `resume_id=` is present, otherwise dead |
     | `TIMED_OUT` | killed at the wall cap with nothing valid emitted | one resume attempt if `resume_id=` is present, otherwise dead |

     Never invent findings for a dead lane, and never read a lane's prose, partial output, or reasoning trace as findings: a review that did not finish its own answer has no findings, and the only legitimate recovery is the resume in step 6.4, which makes the model finish it.
   - STEP ONE, before touching either plan file: write `.feature/critique-dispositions.md` (built up lane by lane in step 4 as each returned; once the last lane is in, do one pass over the whole file to merge cross-lane duplicates and mark findings raised independently by two lanes as high-confidence), one line per finding, `accept` or `drop` plus a one-line reason. A finding is dropped only for a reason that would convince a stranger (it misreads the code, cite where; it relitigates an owner decision; it duplicates an accepted one), never because the plan already "handles it in spirit". Dispositioning obeys the reading ceiling: spot-read the repo code a finding cites when it is contentious or the citation looks fabricated, but a finding about how a third-party package behaves at runtime is never settled by reading that package's bundle; if its types and docs do not settle it, accept it as a named build-time check (the candidate causes, what the build does in each case) and move on. This is an internal audit file; the owner is not shown it by default. Dispose first, edit second, deliberately: one big rewrite pass in a single output quietly squeezes out findings, and sorting them first does not.
   - STEP TWO: apply every accepted finding to the plan files with the Edit tool, as targeted hunks. NEVER Write either file whole and never retype the plan into the conversation; the plan was generated once in step 5, this step only edits it.
     - `.feature/plan-draft.md`: every accepted finding that names a file or a contract lands as, or inside, a build step naming that file, so the build cannot miss it; nothing accepted may survive only as a footnote.
     - `.feature/plan-owner.md`: same five sections, same three-clause rule on "The decisions". Edit only what actually changes; leave everything else untouched.
   - Keep, for step 7: `whatChanged` (one line per edit, each starting Added/Changed/Removed, stating the consequence for the owner and the reason, plain words, no lane names, no finding counts, no drop counts, nothing that reveals the review mechanics), `openQuestionsForOwner` (each answerable by a non-programmer, tradeoff in one sentence), and each lane's state (a `NO_FINDINGS` lane is a working lane, not a dead one).

## 7. Present the result

Show the owner, in this order, and nothing else:

1. Read `.feature/plan-owner.md` fresh off disk and paste it whole, verbatim, as the very first thing in the message, before any remark about the run. This is the only re-emission of the plan anywhere in this skill.
2. The **`whatChanged`** list, as Added/Changed/Removed one-liners, each with its reason.
3. Any **`openQuestionsForOwner`**, each phrased as a plain question with the tradeoff in one sentence.
4. One closing line: each lane's elapsed seconds (from the DONE lines in step 6.3) and any dead lane named plainly. A lane that returned `NO_FINDINGS` is reported like any other lane that worked ("nothing found"), never as a lane that did not come back. Nothing else about lanes, counts, findings, or drops belongs in this message.

If the owner asks what was dropped, read `.feature/critique-dispositions.md` and answer in plain words; never volunteer it unasked.

The owner may push back on the revised plan; iterate with them directly, editing `.feature/plan-owner.md` and `.feature/plan-draft.md` by hand for small wording changes (no need to re-run the critique) until they approve it.

## 8. On approval: issue, plan files, branch

Once the owner says yes to the revised plan:

1. The issue body is the plain plan and nothing else, copied with shell, not retyped:

   ```bash
   cp .feature/plan-owner.md .feature/issue-body.md
   ```

   The detailed plan never goes on the issue. It lives only in the local `.feature/plan-<N>.md` (renamed below), where `$build`, `/qc`, and the critique lanes read it; every stage runs on this one machine, so local is enough, and the issue stays something the owner can read top to bottom. (Owner decision 2026-08-18. Known cost: if `.feature/` is lost mid-flight, the detailed plan must be regenerated from the plain plan on the issue.)

2. Create the issue and cut the branch in one step (this also handles an already-existing branch/issue adoption-aware, so it's safe to re-run if interrupted):

   ```bash
   bash .claude/scripts/start.sh "<feature title>" .feature/issue-body.md
   ```

   The script prints the new issue number on stdout; everything else goes to stderr. It lands the working tree on `ft/<N>` from `beta`.

3. Add the `feature` label (the start script does not set labels):

   ```bash
   gh issue edit <N> --add-label feature
   ```

4. Rename the working files so they're tied to the real issue number:

   ```bash
   mv .feature/plan-draft.md .feature/plan-<N>.md
   mv .feature/plan-owner.md .feature/plan-<N>-owner.md
   ```

## 9. End: name the next command

Do not dispatch, build, or run anything else. Close with a short summary (issue number, branch, one line on what changed in the critique round) and tell the owner the next command is `$build <N>`, run in Codex on this repo.

<exit-example>

Issue #123 created, `ft/123` cut. The critique round tightened the retry cap and added an owner decision about batching. When you're ready, in Codex:

```
$build 123
```

</exit-example>
