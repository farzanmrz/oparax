---
name: feature
description: >-
  The whole plan side of feature work, same behavior in either host
  (it loads skill bundles with the Skill tool and runs the critique
  lanes with Bash): talk through the idea with the owner, write the
  owner-facing plan with independent Fable and Astra input, load the slice's skill bundles and
  check the plan against them, agree the plan with the owner, write the
  detailed plan with independent Fable and Astra drafts, run the eight-lane critique plus the Claude Opus lane
  directly in this session plus adjudication, present the revised plan,
  and on final approval create the GitHub issue, cut the branch, and launch Codex build. Use when
  the user says /feature, "let's plan a feature", or brings a new
  capability idea to talk through. Bugs use it too, starting from the
  repro. Not for building ($build <N> in Codex, or /build <N> in Claude
  Code, comes after this skill ends).
allowed-tools: Bash(git *) Bash(gh *) Bash(bash *) Bash(python3 *) Skill Read Write Edit WebFetch WebSearch Monitor
model: claude-fable-5
disable-model-invocation: true
---

# Feature: talk, plan (owner-facing then detailed), skill bundles, critique, issue + branch

One planning session. After the owner approves the final revised plan, create the issue and branch, launch `$build <N>` through Codex CLI on Astra High, and stop (owner, September 24: Astra is the build model; no model question). Earlier scope, design and plain-plan approvals do not launch build.

## Fable and Astra participation

Read [the pair-planning protocol](references/pair-planning.md) before step 1. Use `.claude/scripts/feature-pair.py` for sealed independent drafts, tracked execution and exact-session replies. Fable and Astra (`gpt-6-astra`) are the default pair throughout planning, at high effort. Fable hosts in Claude Code; Astra hosts in Codex. Both write independently before exchanging, challenge each other's drafts, and verify one combined result. Record `pair-model: astra` and pass `--pair-model astra` on every start. An initial `Astra` token is still accepted but is no longer needed. An explicit owner request for Sol selects `gpt-6-sol` for scope, plain planning, optional design review and adjudication; detail and substantial redesign still require Astra. The application controls the host model; never label a different model as Astra.

The same planning protocol applies to `/amend`, scoped to the addition on its existing issue and branch. Its document formats and issue update stay defined in the amend skill. Both use the eight critique lanes in step 6. QC uses its own six-lane review. Build model selection is separate from the planning pair.

## Working style, every step of this command

- **When you have enough information to act, act.** Do not re-derive facts already established in this conversation, re-litigate a decision the owner has already made, or narrate options you will not pursue. A choice that is yours to make, make and record with its reason; a choice that is genuinely the owner's becomes one plain question at the next owner checkpoint.
- **Named owner stops:** Stop for the scope discussion in step 1, the design brief handoff in step 1.1 when a screen is not yet designed, plan approval in step 4, and revised-plan approval in step 7. A failed required tool or unresolved material disagreement also needs an honest stop. Otherwise complete the authorized work rather than ending with a promise.
- **Claim only what you can point to.** Every statement of progress or state rests on a tool result from this session: a file read, a command's output, a lane's state line. Anything not yet verified is said to be unverified, plainly.
- **The owner reads product language, not a terminal.** In every owner-facing message, lead with the outcome in complete plain sentences. No arrow chains, no shorthand or names invented mid-session, no vocabulary from the working thread; if it comes down to short versus clear, choose clear.

## Hard rules for the planning stage

- **The tree must be fresh before anything reads it.** Before the talk-through, run `git fetch origin beta` and compare `beta` to `origin/beta`. Behind with no local-only commits: fast-forward silently. Diverged (local commits AND remote commits): rebase the local commits onto `origin/beta` when they touch only meta paths (`.claude/`, `AGENTS.md`, docs), and otherwise STOP and tell the owner plainly before planning anything. Never plan, ground, or critique against a stale tree: on 2026-08-23 a ten-lane critique reviewed a beta missing the just-shipped #127 squash, several lanes correctly attacked code that was already fixed upstream, and the divergence was only caught mid-adjudication. The fetch costs a second; the stale round cost the whole re-verification pass.
- **Research without running the product:** Do not start or attach to the product app or poller. During discussion and design work, the host may research public references or standalone design previews using its normal tools. Inspiration research has no mandatory browser, screenshot or visual-probe step. Review of a generated design does require passing its actual images to the peer. It passes original inputs, detailed observations and any useful artifacts to the peer, which forms its own assessment. Describe honestly what each model actually inspected. Follow [design exploration](references/design-exploration.md) when a visual proposal is needed. This narrow exception does not expand critique, adjudication, build or QC. The owner's direct instruction still overrides the product runtime restriction as AGENTS.md states.
- **Reading has a ceiling.** The repo's own source is read freely; that is what the plan is grounded in. A third-party package under `node_modules` is read only for its public contract: the option names, signatures, and types in its `.d.ts` files and its shipped README or docs, to confirm that a name the plan cites exists and what shape it takes. Never read a package's built or minified output (`dist/*.js`, `*.min.js`, `*.cjs`, `*.mjs`), never trace how a package behaves at runtime, never chase one identifier from one grep into the next. If confirming a single fact takes more than three tool calls, stop: it is not a planning fact, it is a build-time check (next rule).
- **A runtime question is a plan step, not a research project.** When the brief describes a runtime symptom (something "reports disabled", "does not appear", "fires twice"), or asks to "validate", "verify", "confirm", or "determine why" something happens when the app runs, do not settle it here. Write it into the detailed plan as a named check the build performs first (what to look at, the candidate causes, what the build does in each case) and, where it is user-visible, as an acceptance journey the owner walks. Wording in the owner's brief asking for validation does not override this: the plan carries the check, the build proves it, QC confirms it.
- **Owner-stated facts are given.** Anything the brief lists as already established (a dashboard setting, an observed status, a decision) is not re-verified here; it is quoted into the plan as a premise. The owner's description of the gap IS the gap: do not re-diagnose what they already diagnosed; take it as the starting point and plan the fix. Verify the code, not the owner.

## 0. Starting from an existing issue

When the command names an issue (`/feature 140`, `/feature #140`, or "feature issue 140"), that issue's body is the brief for the slice. Before anything else run `gh issue view <N> --json number,title,body`. The brief was written by an assistant from the planning sessions, not typed by the owner, and an audit on September 19 found assistant designs in these briefs presented as his decisions. So only a line that carries an owner attribution with a date, such as "(owner, September 19)", is the owner's word: take those as given and preserve them as his original words for the pair protocol. Everything else in the brief, including what sits under "What is built" and "Decided", is the assistant's design: carry it into the step 1 discussion as a proposal, tell the owner in plain words which parts are his and which are not, and let him confirm, change or drop each before it enters the plan. Bring what the brief lists as open to the same discussion. Read the documents it names under "Read first" before proposing scope, with the same rule: in `docs/roadmap.md` too, only attributed lines are his. The owner should not have to restate anything he has already said. At step 8 create nothing new: run `bash .claude/scripts/start.sh --issue <N> .feature/issue-body.md`, which replaces the brief with the approved plain plan on that same issue and cuts `ft/<N>`. The brief is consumed by design; `docs/roadmap.md` and `docs/onboarding-algorithm.md` remain the permanent record.

## 1. Talk it through

First preserve the owner's original messages and references, including uncertainty and later corrections, as the protocol requires. Both models independently investigate relevant evidence and interpret the intended outcome before proposing a scope or creative direction. References can express taste, mood, interaction or an aspiration; they are not automatically a request to copy a layout or approved design. Do not turn an uninvestigated assumption into an exclusion. Exchange the independent assessments, then discuss the recommendation and real open choices with the owner in concise product language. Briefly say what the peer contributed or challenged. Ask only useful questions, not a fixed yes/no template. Help the owner discover what they want when they cannot yet specify it. Agree one coherent slice without arbitrarily shrinking the request before understanding it.

**UI direction (owner, September 23):** screens are designed in Claude Design on the web, by the owner, from a design brief this step writes; the flow no longer generates designs. Establish which of three cases applies: the owner supplied a Claude Design export (the normal case for a slice with a new screen), the slice changes only small UI inside the existing look (no brief needed), or the screen has not been designed yet. In the third case write the design brief in step 1.1, then END YOUR TURN so the owner can design; planning resumes when the export arrives. Record the design source in the plan's decisions.

At the end of this step, pick the skill bundles this slice touches from the table in step 3: web, ui, data, ai, slack (web and data apply to almost every slice; web carries the PostHog instrumentation skills for analytics, error tracking, and feature flags, ai carries PostHog LLM analytics). There is also ONE `free` bundle for a skill this slice needs that should not be loaded globally (an env-hygiene task wanting `vercel:env-vars`, say): name the exact skill names for it, checked against `ListSkills` so nothing is invented, at most a handful. Say the bundles (and the free skills, if any) to the owner in one line; the owner may veto or add. Do not move to writing the plan until one slice and its bundles are agreed.

### 1.1 The design brief for Claude Design

Written with the ui bundle loaded, in plain product language, and saved to `.feature/design-brief-<N>.md`. It carries: what the screen has to do (its states, its content, the one worked example carried through); the decisions the ui skills make at planning time (which shadcn blocks and which ai-elements pieces, where depth goes per `beautiful-shadows`, the contrast and touch-size rules from `accessibility`, whether anything moves per `emil-design-eng`); and the pointer to the synced design system in Claude Design so the design starts in the product's look. The owner designs in Claude Design and brings back the export; `references/design-exploration.md` (the retired generation path) is not used.

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
| ui | `vercel:react-best-practices`, `vercel:shadcn`, `frontend-design`, `web-design-guidelines`, `accessibility`, `beautiful-shadows`, `ai-elements` | read root `DESIGN.md` first, the binding visual contract; every ui skill has three jobs, it shapes the plan, guides the build and checks the result (owner, September 23); `frontend-design` for aesthetic direction and gaps no design covers, `web-design-guidelines` and `accessibility` for the review checklists, `beautiful-shadows` for depth, `ai-elements` whenever the surface shows an AI run or its steps; `emil-design-eng` through the free row when a surface has motion; `design-review` is QC's screenshot reviewer, not a planning skill |
| data | `supabase`, `supabase-postgres-best-practices` | |
| ai | `vercel:ai-sdk`, `vercel:ai-gateway`, `posthog:instrument-llm-analytics` | |
| slack | `vercel:chat-sdk`, `slack:block-kit`, `slack:slack-api`, `slack:slack-messaging` | |
| free | the exact names agreed in step 1 | |

Procedure, deterministic, no judgment about which skills "seem relevant":

1. For each bundle picked in step 1, invoke every skill in its row with the Skill tool, one call per name, in the order listed. A skill that fails to load is named to the owner in the summary line below, never silently skipped.
2. With the skills in context, reread the draft from step 2 against them under the reading ceiling (hard rules above): names, options, and paths already verified in step 1 or 2 are taken as real; at most a few reads of the repo's own source per point, `.d.ts` types only from a package, never its bundle. Skill rules that do not apply to this slice are ignored; skill boilerplate never enters the plan.
3. Fold what applies into the draft plan: a constraint becomes a decision or, where it is genuinely unresolved, an open question, always in plain words. Never show the owner raw skill text.
4. Print exactly one line per bundle, and nothing else about this step: `<bundle>: <k> skills loaded, <n> points folded in` (or `nothing new`), plus `<name> failed to load` where that happened. This line is how a skipped load stays visible.

After the bundle checks, complete the independent plain-plan round and exchange in the pair protocol. Both get the same applicable guidance. Bring their combined five-section plan to step 4; do not show the owner two competing documents.

## 4. Agree the plan with the owner

Show the owner this document, then END YOUR TURN and wait. They read it, push back, and it gets revised in place until they approve it. **Nothing below starts until the owner has said yes to this exact document, in this conversation.** A complete, spec-shaped opening brief is NOT that yes: the owner approves the plan document, not their own prompt. Step 1 is likewise a real exchange, one message stating the slice and bundles and then a wait, even when the brief looks finished. Once approved, write it to `.feature/plan-owner.md` once, verbatim (the critique lanes, the adjudicator, and step 7's presentation all read it from there afterward; nothing later retypes it).

## 5. Write the detailed plan (technical, inline, owner never reads it)

After approval, use the Fable + Astra detail phase and write the host's independent detailed version of the same plan into a private file in the pair working directory. Run the independent detail round and exchange from the pair protocol; the peer writes its own complete plan from the same approved requirements before seeing yours. It is for the build stage (`$build <N>` in Codex, or `/build <N>` in Claude Code) and the critique lanes only; the owner is never shown it and never asked to approve it. Ground it in the real code (real paths, real names) and flag missing information instead of guessing. When it refers to the approved plain plan or to itself, use the post-rename names `.feature/plan-<N>-owner.md` and `.feature/plan-<N>.md` (step 8 renames `plan-owner.md` and `plan-draft.md` to those; on 2026-09-05 a plan that cited `.feature/plan-owner.md` stopped the build at its first step because the file no longer existed under that name); `<N>` is unknown until the issue exists, so write the placeholder and let step 8's rename step also substitute the real number. No code, no snippets: build writes all of that once, from this document.

It has EXACTLY these parts, in this order, with these headings, because each later stage reads specific parts and nothing else:

1. **`Skills:` line** at the very top: the picked bundles and the flat list of their skill names, BARE (no `vercel:`/`slack:`/`posthog:` prefixes), e.g. `Skills: web, data (nextjs, vercel-functions, routing-middleware, instrument-integration, supabase, supabase-postgres-best-practices)`; every later stage reads this line and maps each name to its own harness's prefix. Free-bundle skills are listed the same way. Only list a bundle's skills that this slice actually leans on; a bundle loads several, the plan names the ones that matter here.
2. **`## 1. Files and contracts`**: the files it touches, the contracts (inputs, outputs, failure states, exact user-facing copy for graceful failures), the input classes each entry point admits, the migrations (as SQL intent, not SQL).
3. **`## 2. Build steps`**: the ordered code changes, each naming the Codex skills that step invokes by `$name` in Codex's own form (Vercel plugin skills as `$vercel:<name>`, Supabase ones as `$supabase:<name>`, PostHog ones as `$posthog:<name>`) so the build invokes exactly those and nothing else. Code changes and migrations ONLY. A build step NEVER contains: running or proving a journey, running gates/typecheck/lint/build, starting or restarting a server or the poller, editing env files, Vercel/Railway/dashboard operations, or anything phrased "ask the owner". Those belong in parts 3 and 4; if one lands in a build step the build agent will execute it, which is exactly the failure this structure exists to prevent.
4. **`## 3. Acceptance journeys`**: the journeys with real inputs, written for the OWNER to walk on localhost after `/qc`. Never referenced from a build step. `/qc` reads them only to judge whether the build covered what they need.
5. **`## 4. Owner does at ship`**: every operation that needs the owner's own hand or account: Vercel env changes, dashboard toggles, account deletions. `/ship` shows this list to the owner; nothing in the flow executes it.

After both partners verify the combined plan, write that combined result to `.feature/plan-draft.md` once (a single Write, not a draft-then-redo). Preserve the two independent drafts in the pair working directory; downstream stages read only the combined result. A killed session can resume from what's already written instead of starting over, and every step after this one edits the file by targeted hunk rather than re-authoring it.

### 5.1 UI slices, including UI the owner brings in

When the slice touches UI, ground it in `DESIGN.md` (the preset, fonts, logo and breakpoint) and the owner's Claude Design export for the surface. The export is the visual contract; the ui skills' planning decisions (section 1.1) are written into the plan so the build does not guess them. Record that scope and any required design-contract update in the plan, without silently restyling the rest of the product.

Preserve supplied UI exports under `.feature/` and reference their exact versions in the detailed plan. Only an export the owner explicitly brought back as the design is a decided input; inspiration links, examples and drafts remain exploratory. Once approved, preserve the visual choice and record its relation to `DESIGN.md`; critique may challenge implementation, not reopen the owner's chosen look.

### 5.2 Vendor init: the reference-init diff

When a slice touches how a third-party SDK is initialized (the PostHog `posthog.init` call, the Supabase client factory, an AI SDK provider setup, a Slack app client), the detailed plan carries one build step named "reference-init diff" for that SDK. It reads exactly two things and never a third: (A) the reference init snippet in that vendor's skill for our framework (the skill is already loaded from step 3; for PostHog on Next.js it is the `instrumentation-client.ts` block in `posthog:instrument-integration`'s Next.js reference), and (B) our own init call in the repo. Its output is a list: every option the reference sets that our call does not, each either added (matching the reference IS the answer; nobody asks why the vendor sets it) or written into the plan as a decision with its reason ("not set because ..."). No `node_modules` reading is part of this step; if a name in the reference needs confirming, one `.d.ts` grep at most, which the reading ceiling already allows. If the skill has no reference init for our framework, the step says so and is skipped. Measured need (2026-08-18, #124): the PostHog reference init has three lines and one is `defaults`; our call had none, the recorder script never loaded, and one plan, one amendment, four QC rounds, and every lane missed it because each compared the code to our plan, never to the vendor's reference. This step is bounded knowledge applied deterministically, not investigation.

## 6. Run the critique

Once the detailed plan is complete, the session itself runs the critique with the fixed shared review runner: no Workflow tool, no bridge agents, one holistic pass per lane. Every lane reads the plan straight off disk (`.feature/plan-draft.md`, `.feature/plan-owner.md`); nothing here ever retypes the plan into a command. The global `/critique` and `$critique` skills remain explicit-owner-invoked only. This named stage calls the runner directly under its existing authorization.

1. Write the shared critique brief to `.feature/lanes/critique.brief`, in this order:
   - A budget line: "Budget: about 10 minutes of wall time. Verify the plan's premises against the code first; do not chase side quests; if the budget is nearly spent, return what you have as valid findings JSON rather than nothing." This is prompt pressure only; the shared runner reports actual elapsed seconds so they stay measured against reality, not a guess. (Owner decision 2026-08-23: every lane runs at HIGH effort with this one 10-minute clock budget; measured that day, prompted high lanes land at flash ~01:15, terra ~02:00, agy-pro ~04:00, sol ~05:15, grok ~06:30-08:00, all inside it.)
   - The PRE-IMPLEMENTATION framing: this is a detailed plan, not yet built; its claims are a hypothesis and the real repo is the evidence, so ground every claim in the actual code and cite file:line.
   - The reading ceiling: "Read the repo's own source freely. From a third-party package under node_modules read only its .d.ts types and shipped docs, to confirm a name or a shape the plan cites; never its built or minified output (dist/*.js, *.min.js), never trace how it behaves at runtime. Where the plan turns a runtime question into a named build-time check, the check itself is what you review (is it the right thing to look at, are the candidate causes complete); do not try to answer the question yourself."
   - The instruction to read `.feature/plan-draft.md` (the detailed plan under review) and `.feature/plan-owner.md` (the owner-approved plan whose decisions are final) before critiquing anything.
   - The skill files. Before writing the brief, copy every skill the plan's `Skills:` line names into `.feature/lanes/skills/<name>/` (the whole skill folder, resolved from `~/.agents/skills`, `~/.claude/skills`, the project's `.claude/skills`, or the plugin cache under `~/.claude/plugins/cache`), so every reviewer, whatever its harness, reads the same rules the builders followed (owner, September 23: reviewers cannot critique fairly without the builders' knowledge). The brief says: "Read every SKILL.md under .feature/lanes/skills/ before judging; where a finding rests on a rule from one of them, cite the rule." Reviewers get no connectors or MCPs: they judge the plan and the code, not live systems.
   - The lens card, attention-steering inside ONE session (no subagents, no fan-out):
     - frame-attack: real inputs or conditions the detailed plan never mentions but a real user or source will produce.
     - contract-completeness: every named type, payload, and function contract is enumerated field-by-field; nothing is named but left for the build to invent.
     - internal-consistency: decisions, journeys, and walkthrough steps that contradict each other, or assert invariants the degraded states break.
     - external-limits: third-party API shapes, limits, encodings (code points vs UTF-16), escaping, and truncation the plan assumes rather than guarantees.
     - principles: anything that breaks a rule in AGENTS.md "Engineering principles"; cite the rule by name.
     - security-trust: authz and ownership at point of use, untrusted content reaching rendered/escaped surfaces, data leaving the trust boundary carrying more than the consumer needs.
     - silent-failure: states where something vanishes or degrades with no trace, no operator signal, and no user-facing reason.
   - The line: "The owner's plan decisions and any owner-provided UI are final; attack how they are wired in, never relitigate them."
   - Two skills consult lines, both built from the `Skills:` line at the top of the detailed plan: one for the Codex lanes (Sol and Astra), mapping each bare skill name to Codex's own invocation form (`$vercel:<name>`, `$supabase:<name>`, `$posthog:<name>`, and `$<name>` for the global skills `frontend-design`, `web-design-guidelines`, `accessibility`, `beautiful-shadows`, `emil-design-eng`, `design-review` and `ai-elements`, which are installed for Codex too), phrased "Codex lanes: consult these skills where a finding rests on a rule they cover, and cite the rule: ..."; one for grok and agy, in bare names with no prefix, phrased "Grok, agy and Cursor lanes: these are rules to weigh, not skills you can invoke: ...".
   - The findings output contract: return ONLY a JSON array of finding objects, each shaped exactly `{"severity": "blocking|important|minor", "target": string, "critique": string, "suggestion": string or null, "evidence": string}`, as the final message and nothing else. `evidence` is the investigation behind the finding, not a restatement of it: the exact file:line trail the lane verified, and for anything about execution (a repair pass, a callback, a sweep), who runs it, when, in which request or process, and what data is in scope there. A `suggestion` states inside `evidence` whether it was verified against the code (with its own trail) or is an unverified idea; an unverified suggestion is still welcome, but it must say so. The lanes do the investigation once; this field is how that work reaches adjudication instead of being thrown away with the summary. (Added 2026-08-23: a lane's compressed suggestion was adopted at adjudication while another lane's discarded detail held the fact that killed it; the build bounced on the contradiction.)

2. Follow [the shared fixed review-lane procedure](references/review-lanes.md) with the `critique` profile and `.feature/lanes/critique.brief`. It starts exactly eight fixed high-effort lanes plus the Claude Opus lane, collects each with bounded waits, extracts only its findings JSON, and permits at most one bounded resume where the runner reports a real resume ID. As each lane becomes terminal, write its disposition lines into `.feature/critique-dispositions.md`, marked with the lane name. Do not edit either plan file yet: the plan is edited exactly once, after the last lane is in, so findings raised independently are recognized as high-confidence, duplicates are merged, and there is a single hunk pass.

3. For both `/feature` and `/amend`, Fable and the selected partner (Astra by default) jointly adjudicate with the independent adjudication round and exchange in the pair protocol. The host's accumulated dispositions are its private first answer, not final decisions. The peer gets the entire findings corpus and the same plans, but not those dispositions, until exchange. Settle one joint dispositions record and the intended edits before STEP TWO. For both commands, every finding gets a disposition before anything is edited, and the written record is what the owner can ask to see. Apply the following evidence and editing rules:
   - Read `<run-dir>/<lane>.findings.json` only after the original or its one resume reports `OK` or `NO_FINDINGS`. Never open raw output. The shared runner’s terminal status, not a file’s contents, classifies the lane:

     | State | What happened | What this session does |
     | --- | --- | --- |
     | `OK` | the review returned usable findings JSON | disposition all findings |
     | `NO_FINDINGS` | the review came back and found nothing wrong | record "no findings" for that lane and never call it dead |
     | `INVALID`, `EMPTY_RESULT`, `FAILED`, or `TIMED_OUT` | no usable findings payload | make the one resume permitted by the shared procedure only when the terminal result has a real `resume_id`; otherwise the lane is dead |

     Never invent findings for a dead lane, and never read a lane's prose, partial output, or reasoning trace as findings.
   - STEP ONE, before touching either plan file: complete `.feature/critique-dispositions.md` (built up lane by lane as they returned; once the last lane is in, do one pass over the whole file to merge cross-lane duplicates and mark findings raised independently by two lanes as high-confidence), one line per finding, `accept` or `drop` plus a one-line reason.
   - STEP ONE-B, composed decisions are held to the finding standard. Whenever the disposition pass COMPOSES a mechanism (merges two lanes' suggestions, resolves a conflict between lanes, or invents a policy no lane stated), that decision is settled in this order before any plan edit is written: (1) cross-reference the ENTIRE findings corpus first, every lane's `evidence` on the topic, because the fact that settles or kills the composition is often already in another lane's detail; (2) if the corpus does not settle its impact, trace it in the repo directly, bounded by the reading ceiling: who runs the mechanism, when, in which request or process, with what data in scope, cited file:line in the dispositions record exactly like a finding; (3) only when both fail does it become a plain open question in `.feature/plan-owner.md` for the owner. A composed decision NEVER demotes into a build-time check: the build builds, it does not resolve open design; build-time checks stay reserved for facts that physically require build artifacts (a just-installed package's shipped types), and even those carry a decision rule locked here in advance. (Added 2026-08-23: an adjudication-composed cost policy shipped unexamined, contradicted the plan's own retention rules, and bounced the build; the killing fact was sitting in another lane's finding the whole time.)
   - STEP ONE-C, the outside eye. If STEP ONE-B composed any mechanism, then before STEP TWO, dispatch ONE fresh subagent on this session's own model with exactly: the dispositions file, the intended plan edits as text, and repo read access, instructed to attack only the composed decisions (do their execution-context traces hold, does any cited evidence contradict them) and return the same findings JSON contract. Treat its findings like a lane's: disposition them before editing. Fresh context is what makes it outside; the author's own confidence in a composition is not evidence (measured 2026-08-23: the author would have passed the composition its own review). Rounds where adjudication only wired accepted findings into named files skip this entirely. A finding is dropped only for a reason that would convince a stranger (it misreads the code, cite where; it relitigates an owner decision; it duplicates an accepted one), never because the plan already "handles it in spirit". Dispositioning obeys the reading ceiling: spot-read the repo code a finding cites when it is contentious or the citation looks fabricated, but a finding about how a third-party package behaves at runtime is never settled by reading that package's bundle; if its types and docs do not settle it, accept it as a named build-time check (the candidate causes, what the build does in each case) and move on. This is an internal audit file; the owner is not shown it by default. Dispose first, edit second, deliberately: one big rewrite pass in a single output quietly squeezes out findings, and sorting them first does not.
   - STEP TWO: apply every accepted finding to the plan files with the Edit tool, as targeted hunks. NEVER Write either file whole and never retype the plan into the conversation; the plan was generated once in step 5, this step only edits it.
     - `.feature/plan-draft.md`: every accepted finding that names a file or a contract lands as, or inside, a build step naming that file, so the build cannot miss it; nothing accepted may survive only as a footnote.
     - `.feature/plan-owner.md`: same five sections, same three-clause rule on "The decisions". Edit only what actually changes; leave everything else untouched.
   - Keep, for step 7: `whatChanged` (one line per edit, each starting Added/Changed/Removed, stating the consequence for the owner and the reason, plain words, no lane names, no finding counts, no drop counts, nothing that reveals the review mechanics), `openQuestionsForOwner` (each answerable by a non-programmer, tradeoff in one sentence), and each lane's state (a `NO_FINDINGS` lane is a working lane, not a dead one).

## 7. Present the result

Show the owner, in this order, and nothing else:

1. Read `.feature/plan-owner.md` fresh off disk and paste it whole, verbatim, as the very first thing in the message, before any remark about the run. This is the only re-emission of the plan anywhere in this skill.
2. The **`whatChanged`** list, as Added/Changed/Removed one-liners, each with its reason.
3. Any **`openQuestionsForOwner`**, each phrased as a plain question with the tradeoff in one sentence.
4. Build handoff: "Approve this plan to create the issue and start the build, or tell me to leave the build for you to launch." The build runs on Astra High; never offer a model choice (owner, September 24). This is part of the final plan approval, not another question afterward.
5. One closing line: each lane's elapsed seconds from the shared runner and any dead lane named plainly. A lane that returned `NO_FINDINGS` is reported like any other lane that worked ("nothing found"), never as a lane that did not come back. Nothing else about lanes, counts, findings, or drops belongs in this message.

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

3. Rename the working files so they're tied to the real issue number, then substitute the number for the `<N>` placeholder inside the detailed plan and check no pre-rename filename survives:

   ```bash
   mv .feature/plan-draft.md .feature/plan-<N>.md
   mv .feature/plan-owner.md .feature/plan-<N>-owner.md
   sed -i '' 's/plan-<N>/plan-'<N>'/g' .feature/plan-<N>.md
   rg -n "plan-owner\.md|plan-draft\.md" .feature/plan-<N>.md && echo "STALE REFERENCE: fix before handoff"
   ```

## 9. Launch the approved build, then stop

Follow [the build handoff](references/build-handoff.md). Verify that `start.sh` left the checkout on `ft/<N>` or `bf/<N>` and that the final local plan files exist. The build runs on Astra High; there is no model to honor or ask (owner, September 24). If the owner asked to launch manually or later, simply name `$build <N>` and stop.

Otherwise launch once, register the background completion watcher where available, report the real launch status, and STOP. No polling or further planning work while build runs. The completion callback only relays the build result and its next command; it never launches QC or ship.

<exit-example>

Issue #123 created on `ft/123`. The approved build has started on Astra High. I'll report its result when it finishes.

</exit-example>
