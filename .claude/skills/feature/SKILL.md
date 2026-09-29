---
name: feature
description: >-
  The whole plan side of feature work, same behavior in either host
  (it loads skill bundles with the Skill tool and runs the critique
  lanes with Bash): talk the whole product through with the owner, write the
  owner-facing plan with independent Fable and Astra input, load the skill
  bundles and check the plan against them, agree the plan with the owner,
  write the detailed plan as a component table plus one slice per component
  with independent Fable and Astra drafts, run the eight-lane critique plus
  the Claude Opus lane directly in this session plus adjudication, and on
  approval create the GitHub issue, cut the branch, write the plan files
  and launch /run-plan <N>, which records the approved plan's hash. Use when the user
  says /feature, "let's plan a feature", or brings a new capability idea to
  talk through. Bugs use it too, starting from the repro. Not for building
  (/run-plan <N> comes after this skill ends).
allowed-tools: Bash(git *) Bash(gh *) Bash(bash *) Bash(python3 *) Skill Read Write Edit WebFetch WebSearch Monitor
model: fable
disable-model-invocation: true
---

# Feature: talk, plan (plain, then by component), skill bundles, critique, issue + branch + /run-plan

One planning session for the whole product (owner, September 28: planning is over; onboarding, the per-handle page and its feed with grouping, the landing page and its guards, payment, the bot's alerts on X, watched X accounts and the optional GitHub and Product Hunt digests are built from one feature; issues #143 to #147 are closed and this feature gets a new issue). The plan comes out cut into components that `/run-plan <N>` builds in parallel worktrees, reviews per component and merges into `ft/<N>`. After the owner's approval, create the issue and `ft/<N>`, write the plan files and launch `/run-plan <N>`, which records the approved plan's hash in `.feature/run-<N>.json` and refuses a plan changed after that; then stop. Earlier scope and plain-plan approvals launch nothing. A small feature or a bug fix is the same flow with a one-row component table.

## Fable and Astra participation

Read [the pair-planning protocol](references/pair-planning.md) before step 1. Use `.claude/scripts/feature-pair.py` for sealed independent drafts, tracked execution and exact-session replies. Fable and Astra (`gpt-6-astra`) are the pair throughout planning, at high effort; Fable hosts in Claude Code, Astra hosts in Codex. Both write independently before exchanging, challenge each other's drafts, and verify one combined result. Record `pair-model: astra` and pass `--pair-model astra` on every start. An explicit owner request for Sol selects `gpt-6-sol` for scope, plain planning and adjudication; detail and substantial redesign still require Astra. The application controls the host model; never label a different model as Astra.

The same protocol applies to `/amend`, scoped to an addition on its existing issue and branch; its formats stay in the amend skill. Build model selection is separate from the planning pair: every build `/run-plan` launches runs on Astra High (owner, September 24).

## Working style, every step of this command

- **When you have enough information to act, act.** Do not re-derive facts already established in this conversation, re-litigate a decision the owner has already made, or narrate options you will not pursue. A choice that is yours to make, make and record with its reason; a choice that is genuinely the owner's becomes one plain question at the next owner stop.
- **Named owner stops, and only these:** the scope talk in step 1 (he answers everything the plan needs there), plan approval in step 4, and revised-plan approval in step 7 only when the critique changed the plan materially (step 7 defines "materially"); otherwise the step 4 approval stands and the session continues into steps 8 and 9 in the same turn. After approval the flow runs without him: no turn ends for a design, a model choice, a migration window or a build pause. A failed required tool or an unresolved material disagreement between the pair is an honest stop. Otherwise complete the authorized work rather than ending with a promise.
- **Claim only what you can point to.** Every statement of progress or state rests on a tool result from this session: a file read, a command's output, a lane's state line. Anything not yet verified is said to be unverified, plainly.
- **The owner reads product language, not a terminal.** In every owner-facing message, lead with the outcome in complete plain sentences. No arrow chains, no shorthand or names invented mid-session, no vocabulary from the working thread; if it comes down to short versus clear, choose clear.

## Hard rules for the planning stage

- **The tree must be fresh before anything reads it.** Before the talk-through, run `git fetch origin beta` and compare `beta` to `origin/beta`. Behind with no local-only commits: fast-forward silently. Diverged (local commits AND remote commits): rebase the local commits onto `origin/beta` when they touch only meta paths (`.claude/`, `AGENTS.md`, docs), and otherwise STOP and tell the owner plainly before planning anything. Never plan, ground, or critique against a stale tree: on 2026-08-23 a ten-lane critique reviewed a beta missing the just-shipped #127 squash and several lanes attacked code already fixed upstream. The fetch costs a second; the stale round cost the whole re-verification pass.
- **Research without running the product:** Do not start or attach to the product app. During discussion the host may research public references with its normal tools; no browser, screenshot or visual-probe step is mandatory. Describe honestly what each model actually inspected. This narrow exception does not expand critique, adjudication, build or QC. The owner's direct instruction still overrides the product runtime restriction as AGENTS.md states.
- **Reading has a ceiling.** The repo's own source is read freely; that is what the plan is grounded in. A third-party package under `node_modules` is read only for its public contract: the option names, signatures and types in its `.d.ts` files and its shipped README or docs, to confirm that a name the plan cites exists and what shape it takes. Never read a package's built or minified output (`dist/*.js`, `*.min.js`, `*.cjs`, `*.mjs`), never trace how a package behaves at runtime, never chase one identifier from one grep into the next. If confirming a single fact takes more than three tool calls, stop: it is not a planning fact, it is a build-time check (next rule).
- **A runtime question is a plan step, not a research project.** When the brief describes a runtime symptom, or asks to "validate", "verify", "confirm" or "determine why" something happens when the app runs, do not settle it here. Write it into the owning slice as a named check the build performs first (what to look at, the candidate causes, what the build does in each case) and, where it is user-visible, as an acceptance journey the owner walks. The plan carries the check, the build proves it, QC confirms it.
- **Owner-stated facts are given.** Anything the owner lists as already established (a setting, an observed status, a decision) is not re-verified here; it is quoted into the plan as a premise. The owner's description of the gap IS the gap. Verify the code, not the owner.
- **The plan pre-answers the build's pauses.** The build skill stops for five things: spending, a ruling of his, deleting live data, real DMs or charges, and DESIGN.md. A plan that leaves any of them open stops the run with nobody watching, so: every number, price, pool, cadence and cap is in the plan (in `shared.md`) with its owner attribution and date, or marked `(assistant's default)`; every cost comes from `docs/references/cogs.md` and is never restated from memory, and every paid call names its cap; any deletion of live rows, any message to a real X account and any real charge is named with its decision (test mode, a test handle, the owner's own account); DESIGN.md and the theme tokens in `app/globals.css` are not changed by the plan, and a change it would need is proposed to the owner at step 4 as a decision line, never left for the build. No build step may say "ask the owner".

## 0. Starting from an existing issue

When the command names an issue (`/feature 140`, `/feature #140`, or "feature issue 140"), that issue's body is the brief. Before anything else run `gh issue view <N> --json number,title,body`. The brief was written by an assistant, not typed by the owner, and an audit on September 19 found assistant designs in these briefs presented as his decisions. So only a line that carries an owner attribution with a date, such as "(owner, September 19)", is the owner's word: take those as given and preserve them as his original words for the pair protocol. Everything else, including what sits under "What is built" and "Decided", is the assistant's design: carry it into step 1 as a proposal, tell the owner in plain words which parts are his and which are not, and let him confirm, change or drop each before it enters the plan. Read the documents it names under "Read first" with the same rule: in `docs/roadmap.md` too, only attributed lines are his. At step 8 create nothing new: run `bash .claude/scripts/start.sh --issue <N> .feature/issue-body.md`, which replaces the brief with the approved plain plan on that same issue and cuts `ft/<N>`.

The whole-product feature starts with no issue. Its reading material is `docs/references/state.md` (first), `docs/references/decisions.md`, `docs/roadmap.md`, `docs/references/cogs.md`, `docs/downstream-algorithm.md`, the onboarding code in `lib/onboarding/` (its specification) and the closed briefs of #143 to #147, all under the same attribution rule.

## 1. Talk it through

First preserve the owner's original messages and references, including uncertainty and later corrections, as the protocol requires. Both models independently investigate the evidence and interpret the intended outcome before proposing a scope. Exchange the independent assessments, then discuss the recommendation and the real open choices with the owner in concise product language. Briefly say what the peer contributed or challenged. Ask only useful questions, not a fixed template. Help the owner discover what he wants when he cannot yet specify it.

This is where he answers everything the plan needs. Before the first message, gather every open ruling from `docs/references/state.md` ("Rulings still needed") and the OPEN lines in `docs/references/decisions.md`, plus every number, price, pool, cadence and cap the plan will carry, and bring them as one batched list of plain questions, each with its tradeoff and the assistant's default if he does not rule. What he rules gets his name and the date in the plan; what he leaves gets the default, marked `(assistant's default)`. Do not ask him twice, and do not relay a model debate.

**Screens (tooling update, September 28):** Read [design tooling](references/design-tooling.md). Search configured catalogs for suitable real blocks and record the selected source and adaptation for each screen. Reuse the accepted visual reference; Claude Design is optional. The setup is not approval of a new appearance: respect DESIGN.md until a rendered direction and any departures are approved in the normal plan discussion. Do not force another design stop for a screen using an already accepted direction.

### 1.1 Screens, one line each

The plan lists every screen with one line of what it shows and what a person can do there, in the plain plan's "What happens" and in the slice that owns the screen. The ui bundle's planning decisions for each screen (which shadcn primitives, where depth goes per `beautiful-shadows`, the contrast and touch-size rules from `accessibility`, whether anything moves per `emil-design-eng`, `ai-elements` where a screen shows an AI run) are written into that slice in step 5.1 so the build does not guess them.

At the end of this step, pick the skill bundles from the table in step 3 (web, ui, data, ai, payments, slack; web and data apply to almost everything; web carries the PostHog skills for analytics, error tracking and feature flags; ai carries PostHog LLM analytics), per component as the components emerge, plus at most a handful of exact `free` skill names checked against `ListSkills`. Say the picks to the owner in one line; he may veto or add. Do not move to writing the plan until the scope and the bundles are agreed.

## 2. Draft the plan (plain language)

Write "the plan" in exactly this six-section format (no code terms, no file paths, no framework language anywhere in it), marked DRAFT:

- **What happens:** plain words, step by step, what a user experiences, every screen in one line.
- **What happens when it fails:** plain words, what the user sees.
- **The decisions:** a short list, one line each, plain words, each line three clauses: what we do, what that means for you, why. A decision without its consequence is not finished. Every number carries its attribution or `(assistant's default)`.
- **Open questions:** anything genuinely unresolved that needs the owner's own call, each carrying its tradeoff and answerable without asking what any word means.
- **Out of scope:** what is explicitly not being built this round.
- **Components, in the order they build:** one line per component, plain words: what it adds for a person and what it waits on. No code terms. The same lines head the component table in step 5.

Do not ask the owner to approve it yet; that happens in step 4, after the skill bundles have had a chance to sharpen it.

## 3. Load the skill bundles and check the draft against them

This happens in this session, with the Skill tool: no subagent, no workflow, no fan-out (measured 2026-08-18: a Sonnet lens fan-out cost 3.5 minutes of wall and returned mostly what this session had already read). The bundle table is the source of truth for what gets loaded:

| Bundle | Skills to invoke, exactly these names | Also |
| --- | --- | --- |
| web | `vercel:nextjs`, `vercel:vercel-functions`, `vercel:routing-middleware`, `posthog:instrument-integration`, `posthog:instrument-product-analytics`, `posthog:instrument-error-tracking`, `posthog:instrument-feature-flags` | |
| ui | `vercel:react-best-practices`, `shadcn`, `frontend-design`, `web-design-guidelines`, `accessibility`, `beautiful-shadows`, `ai-elements` | read root `DESIGN.md` first, the binding visual contract; every ui skill has three jobs, it shapes the plan, guides the build and checks the result (owner, September 23); `frontend-design` for composition using the accepted reference and catalog blocks, `web-design-guidelines` and `accessibility` for the review checklists, `beautiful-shadows` for depth, `ai-elements` whenever a surface shows an AI run or its steps; `emil-design-eng` through the free row when a surface has motion; `design-review` is QC's screenshot reviewer, not a planning skill |
| data | `supabase`, `supabase-postgres-best-practices` | |
| ai | `vercel:ai-sdk`, `vercel:ai-gateway`, `posthog:instrument-llm-analytics` | |
| payments | `stripe:stripe-best-practices`, `stripe:stripe-docs` | owner approved, September 24; the Stripe plugin's other skills were left out because they do not fit one product with a monthly and a yearly price; the Stripe connector reaches only the Oparax sandbox (`livemode: false`); Codex invokes these as `$stripe:<name>` |
| slack | `vercel:chat-sdk`, `slack:block-kit`, `slack:slack-api`, `slack:slack-messaging` | |
| free | the exact names agreed in step 1 | |

Procedure, deterministic, no judgment about which skills "seem relevant":

1. For each bundle picked in step 1, invoke every skill in its row with the Skill tool, one call per name, in the order listed. A skill that fails to load is named to the owner in the summary line below, never silently skipped.
2. With the skills in context, reread the draft from step 2 against them under the reading ceiling: names, options and paths already verified are taken as real; at most a few reads of the repo's own source per point, `.d.ts` types only from a package, never its bundle. Skill rules that do not apply are ignored; skill boilerplate never enters the plan.
3. Fold what applies into the draft plan: a constraint becomes a decision or, where it is genuinely unresolved, an open question, always in plain words. Never show the owner raw skill text.
4. Print exactly one line per bundle, and nothing else about this step: `<bundle>: <k> skills loaded, <n> points folded in` (or `nothing new`), plus `<name> failed to load` where that happened.

After the bundle checks, complete the independent plain-plan round and exchange in the pair protocol. Bring the combined six-section plan to step 4; do not show the owner two competing documents.

## 4. Agree the plan with the owner

Show the owner this document, then END YOUR TURN and wait. He reads it, pushes back, and it gets revised in place until he approves it. **Nothing below starts until the owner has said yes to this exact document, in this conversation.** A complete, spec-shaped opening brief is NOT that yes: the owner approves the plan document, not his own prompt. Step 1 is likewise a real exchange, one message stating the scope and bundles and then a wait, even when the brief looks finished. Once approved, write it to `.feature/plan-owner.md` once, verbatim (the critique lanes, the adjudicator and step 7 read it from there afterward; nothing later retypes it). This approval is the one that carries through to `/run-plan` unless step 7 finds a material change.

## 5. Write the detailed plan, by component (technical, owner never reads it)

After approval, run the pair protocol's detail round: each partner independently writes the whole detailed plan (the component table, `shared.md` and every slice) before seeing the other's; the exchange settles the cut first, then the seams, then the slices (the protocol describes what they exchange). Ground it in the real code (real paths, real names) and flag missing information instead of guessing. No code, no snippets: the builds write all of that once, from these files. Write the combined result once (a single Write per file), and every later step edits by targeted hunk.

### The cut

1. **The data model first and alone.** Every table, column, index, RLS policy, RPC, the migration files and the regenerated `lib/supabase/database.types.ts` are one component, `migrations: yes`, `depends_on: none`. No other component writes SQL or touches `supabase/migrations/` or the generated types. It is the only row allowed to say `migrations: yes`.
2. **Cut by dependency and file ownership.** A component is one thing a person or the owner can prove works on its own (it has its own acceptance journeys) and owns the files only it creates or edits. Two components that would write the same file are one component, or the file goes to the one that builds first and the other depends on it. A component depends on another only when it reads that component's tables, calls its functions or renders inside its page; "nicer to have first" is not a dependency.
3. **Parallel where files do not overlap.** Components with satisfied dependencies and disjoint files run at once; never serialize them "to be safe". Order the table by dependency (the data model first), then by what unblocks the most.
4. **Integration seams live in `shared.md`.** Wherever component B calls into A (a function, a route, a table, a copy string, an event name), `shared.md` names the seam with its exact signature or shape, and both slices cite it. A seam only one slice knows about is a defect the critique attacks.
5. **A component's numbered steps are its own.** A step never edits another component's file, and "wire X into Y" is a step of the component that owns Y. A file every component needs (the root layout, the global stylesheet, a shared content module) has one owner, usually the earliest component that needs it; a later change there is that owner's step, recorded as a seam.

### The plan files

Before the issue exists the files are `.feature/plan-draft.md`, `.feature/plan-draft/shared.md` and `.feature/plan-draft/<id>.md`; step 8 renames them to `.feature/plan-<N>.md`, `.feature/plan-<N>/shared.md` and `.feature/plan-<N>/<id>.md` and substitutes `<N>`. Inside the files, refer to the post-rename names with the `<N>` placeholder (on 2026-09-05 a plan that cited a pre-rename filename stopped the build at its first step).

**`.feature/plan-<N>.md`**, the plan, in this order and nothing else:

1. **`Skills:` line** at the very top: the picked bundles and the flat union of their bare names (no `vercel:`/`slack:`/`posthog:`/`stripe:` prefixes), then, after a semicolon, one segment per component, `<id>: <bare names that component's steps name>`. Example: `Skills: web, ui, data, ai (nextjs, shadcn, supabase, supabase-postgres-best-practices, ai-sdk); data-model: supabase, supabase-postgres-best-practices; onboarding: nextjs, ai-sdk, shadcn`. Every later stage reads this line and maps each name to its own harness's prefix; `shadcn` is always the global official skill (`$shadcn` in Codex), never `vercel:shadcn`; QC resolves each name to one skill folder by exact path, so a name that resolves to nothing is a planning defect, caught here with `ListSkills`, never in QC. Only list the skills a component actually leans on.
2. **`## Components`**: the component table, rows in build order:

   `| id | title | depends_on | migrations | files owned | acceptance journeys |`

   `id`: lowercase letters, digits and hyphens; it is the slice's file name and the worktree name `/run-plan` uses. `title`: the same plain line as the sixth section of the plain plan. `depends_on`: comma-separated ids or `none`. `migrations`: `yes` or `no`, exactly one `yes`. `files owned`: the paths, relative to the repo root, only this component creates or edits; a folder covers everything under it; no path appears in two rows. `acceptance journeys`: the journey ids (`J1`, `J2`, ...) from that slice's part 3, unique across the plan.
3. **`## Premises`**: the owner-stated facts quoted as given, the design source line, and the list of the plan files.

**`.feature/plan-<N>/shared.md`**, the shared contracts every slice cites instead of restating (a number that appears in two places is a defect): the table shapes (every table with its columns and types, as the data model builds them), the cost ledger (every paid call, its unit price from cogs.md, its cap, who pays), the clock and pool rules (cadences, polling windows, pool sizes, rate limits), the ids (route paths, table and column names, event names, env variable names), the copy (every shared user-facing string and every failure string), and the integration seams (one entry per seam: the owning component, the callers, the exact signature or shape). Every number carries its owner attribution and date or `(assistant's default)`.

**`.feature/plan-<N>/<id>.md`**, one per component, EXACTLY these parts, in this order, with these headings, because each later stage reads specific parts and nothing else:

1. **`Skills:` line** at the top: this component's segment from the plan's line, bare names. The data model's slice adds `migrations: yes` on its own line right under it: the launcher reads that exact line (`build-launch.py`, a line starting with `migrations: yes`), not the table, and a flag written inside a sentence left the first #149 build parked without applying its migrations (September 28).
2. **`## 1. Files and contracts`**: the files it owns (matching its table row), the contracts (inputs, outputs, failure states, exact user-facing copy for graceful failures), the input classes each entry point admits, the seams it cites from `shared.md`; for the data model, the migrations as SQL intent, not SQL.
3. **`## 2. Build steps`**: the ordered code changes, each naming the Codex skills that step invokes by `$name` in Codex's own form (`$vercel:<name>`, `$supabase:<name>`, `$posthog:<name>`, `$stripe:<name>`, `$<name>` for the global skills), so the build invokes exactly those and nothing else. Code changes and migrations ONLY, in this component's files only. A build step NEVER contains: running or proving a journey, running gates/typecheck/lint/build, starting a server, editing env files, Vercel or dashboard operations, or anything phrased "ask the owner". Those belong in parts 3 and 4; if one lands in a build step the build agent will execute it.
4. **`## 3. Acceptance journeys`**: the journeys with real inputs, ids `J<n>` unique across the plan, written for the OWNER to walk on localhost after `/run-plan` reports. Never referenced from a build step. QC reads them only to judge whether the build covered what they need.
5. **`## 4. Owner does at ship`**: every operation that needs the owner's own hand or account: Vercel env changes, dashboard toggles, account deletions. `/ship` shows the union of these lists to the owner; nothing in the flow executes them. `none` when empty.

### 5.1 Screens and their design sources

Each screen records the exact template/block source, access requirement, accepted visual reference and adaptations as defined in [design tooling](references/design-tooling.md). The slice carries those choices so the builder retrieves real source instead of approximating a demo. Any change to DESIGN.md or theme tokens is proposed at step 4 and cites the owner's answer. Existing product behavior is preserved. An owner-supplied Claude Design export can provide the reference but is not required.

### 5.2 Vendor init: the reference-init diff

When a component touches how a third-party SDK is initialized (the PostHog `posthog.init` call, the Supabase client factory, an AI SDK provider setup, a Stripe client), its slice carries one build step named "reference-init diff" for that SDK. It reads exactly two things and never a third: (A) the reference init snippet in that vendor's skill for our framework (already loaded from step 3; for PostHog on Next.js it is the `instrumentation-client.ts` block in `posthog:instrument-integration`'s Next.js reference), and (B) our own init call in the repo. Its output is a list: every option the reference sets that our call does not, each either added (matching the reference IS the answer) or written into the slice as a decision with its reason ("not set because ..."). No `node_modules` reading is part of this step; one `.d.ts` grep at most. If the skill has no reference init for our framework, the step says so and is skipped. Measured need (2026-08-18, #124): the PostHog reference init has three lines, our call had none, the recorder script never loaded, and every lane missed it because each compared the code to our plan, never to the vendor's reference.

## 6. Run the critique

Once the detailed plan is complete, the session itself runs the critique with the fixed shared review runner: no Workflow tool, no bridge agents, one holistic pass per lane. Every lane reads the plan straight off disk; nothing here ever retypes the plan into a command. The global `/council critique` command remains explicit-owner-invoked only; this named stage calls the runner directly under its existing authorization.

1. Write the shared critique brief to `.feature/lanes/critique.brief`, in this order:
   - A budget line: "Budget: about 10 minutes of wall time. Verify the plan's premises against the code first; do not chase side quests; if the budget is nearly spent, return what you have as valid findings JSON rather than nothing." Prompt pressure only; the runner reports actual elapsed seconds. (Owner decision 2026-08-23: every lane runs at HIGH effort with this one 10-minute clock budget.)
   - The PRE-IMPLEMENTATION framing: this is a detailed plan, not yet built; its claims are a hypothesis and the real repo is the evidence, so ground every claim in the actual code and cite file:line.
   - The reading ceiling: "Read the repo's own source freely. From a third-party package under node_modules read only its .d.ts types and shipped docs, to confirm a name or a shape the plan cites; never its built or minified output (dist/*.js, *.min.js), never trace how it behaves at runtime. Where the plan turns a runtime question into a named build-time check, the check itself is what you review; do not try to answer the question yourself."
   - The instruction to read, before critiquing anything: `.feature/plan-draft.md` (the component table), `.feature/plan-draft/shared.md`, every `.feature/plan-draft/<id>.md` in table order (the slices are the plan; the table is its map), and `.feature/plan-owner.md` (the owner-approved plan whose decisions are final).
   - The skill files. Before writing the brief, copy every skill the plan's `Skills:` line names into `.feature/lanes/skills/<name>/` (the whole skill folder, resolved from `~/.agents/skills`, `~/.claude/skills`, the project's `.claude/skills`, the plugin cache under `~/.claude/plugins/cache`, or Codex's plugin cache under `~/.codex/plugins/cache`, where the Stripe skills live), so every reviewer, whatever its harness, reads the same rules the builders follow (owner, September 23). The brief says: "Read every SKILL.md under .feature/lanes/skills/ before judging; where a finding rests on a rule from one of them, cite the rule." Reviewers get no connectors or MCPs.
   - The lens card, attention-steering inside ONE session (no subagents, no fan-out):
     - frame-attack: real inputs or conditions the plan never mentions but a real user or source will produce.
     - contract-completeness: every named type, payload, function contract and seam in `shared.md` is enumerated field-by-field on both sides; nothing is named but left for a build to invent.
     - internal-consistency: decisions, journeys and steps that contradict each other; a seam that `shared.md` and a slice describe differently; a file owned by two components; a step that edits another component's file; a number restated instead of cited.
     - external-limits: third-party API shapes, limits, encodings (code points vs UTF-16), escaping and truncation the plan assumes rather than guarantees.
     - principles: anything that breaks a rule in AGENTS.md "Engineering principles"; cite the rule by name.
     - security-trust: authz and ownership at point of use, untrusted content reaching rendered surfaces, data leaving the trust boundary carrying more than the consumer needs.
     - silent-failure: states where something vanishes or degrades with no trace, no operator signal and no user-facing reason.
     - pauses: any number, cap, price, cadence or deletion the plan leaves for the build to decide or to ask about; cite the hard rule "The plan pre-answers the build's pauses".
   - The line: "The owner's plan decisions are final; attack how they are wired in, never relitigate them."
   - Two skills consult lines, both built from the plan's `Skills:` line: one for the Codex lanes (Sol and Astra), mapping each bare name to Codex's form (`$vercel:<name>`, `$supabase:<name>`, `$posthog:<name>`, `$stripe:<name>`, and `$<name>` for the global skills `shadcn`, `frontend-design`, `web-design-guidelines`, `accessibility`, `beautiful-shadows`, `emil-design-eng`, `design-review` and `ai-elements`), phrased "Codex lanes: consult these skills where a finding rests on a rule they cover, and cite the rule: ..."; one for grok, agy and the Cursor lanes, bare names, phrased "Grok, agy and Cursor lanes: these are rules to weigh, not skills you can invoke: ...".
   - The findings output contract: return ONLY a JSON array of finding objects, each shaped exactly `{"severity": "blocking|important|minor", "target": string, "critique": string, "suggestion": string or null, "evidence": string}`, as the final message and nothing else. `target` names the file (`shared.md`, `<id>.md`, the table) and the part. `evidence` is the investigation behind the finding: the exact file:line trail the lane verified, and for anything about execution, who runs it, when, in which request or process, and what data is in scope. A `suggestion` states inside `evidence` whether it was verified against the code or is an unverified idea. (Added 2026-08-23: a lane's compressed suggestion was adopted at adjudication while another lane's discarded detail held the fact that killed it.)

2. Follow [the shared fixed review-lane procedure](references/review-lanes.md) with the `critique` profile and `.feature/lanes/critique.brief`. It starts exactly eight fixed high-effort lanes plus the Claude Opus lane, collects each with bounded waits, extracts only its findings JSON, and permits at most one bounded resume where the runner reports a real resume ID. As each lane becomes terminal, write its disposition lines into `.feature/critique-dispositions.md`, marked with the lane name. Do not edit any plan file yet: the plan is edited exactly once, after the last lane is in.

3. Fable and the selected partner jointly adjudicate with the independent adjudication round and exchange in the pair protocol. The host's accumulated dispositions are its private first answer, not final decisions; the peer gets the entire findings corpus and the same plan files, but not those dispositions, until exchange. Every finding gets a disposition before anything is edited, and the written record is what the owner can ask to see. Rules:
   - Read `<run-dir>/<lane>.findings.json` only after the original or its one resume reports `OK` or `NO_FINDINGS`. Never open raw output. The runner's terminal status classifies the lane:

     | State | What happened | What this session does |
     | --- | --- | --- |
     | `OK` | usable findings JSON | disposition all findings |
     | `NO_FINDINGS` | the review came back and found nothing wrong | record "no findings"; never call it dead |
     | `INVALID`, `EMPTY_RESULT`, `FAILED`, or `TIMED_OUT` | no usable findings payload | one resume only when the terminal result has a real `resume_id`; otherwise the lane is dead |

     Never invent findings for a dead lane, and never read a lane's prose, partial output or reasoning trace as findings.
   - STEP ONE, before touching any plan file: complete `.feature/critique-dispositions.md` (once the last lane is in, one pass over the whole file to merge cross-lane duplicates and mark findings raised independently by two lanes as high-confidence), one line per finding, `accept` or `drop` plus a one-line reason. A finding is dropped only for a reason that would convince a stranger (it misreads the code, cite where; it relitigates an owner decision; it duplicates an accepted one), never because the plan "handles it in spirit". A finding about how a third-party package behaves at runtime is never settled by reading that package's bundle; if its types and docs do not settle it, accept it as a named build-time check in the owning slice.
   - STEP ONE-B, composed decisions are held to the finding standard. Whenever the disposition pass COMPOSES a mechanism (merges two lanes' suggestions, resolves a conflict between lanes, or invents a policy no lane stated), settle it in this order before any edit: (1) cross-reference the ENTIRE findings corpus, every lane's `evidence` on the topic; (2) if the corpus does not settle its impact, trace it in the repo directly, bounded by the reading ceiling, cited file:line in the dispositions record; (3) only when both fail does it become a plain open question in `.feature/plan-owner.md`. A composed decision NEVER demotes into a build-time check. (Added 2026-08-23: an adjudication-composed cost policy shipped unexamined and bounced the build; the killing fact was in another lane's finding the whole time.)
   - STEP ONE-C, the outside eye. If STEP ONE-B composed any mechanism, then before STEP TWO, dispatch ONE fresh subagent on this session's own model with exactly: the dispositions file, the intended plan edits as text, and repo read access, instructed to attack only the composed decisions and return the same findings JSON contract. Disposition its findings like a lane's before editing. Rounds where adjudication only wired accepted findings into named files skip this entirely.
   - STEP TWO: apply every accepted finding with the Edit tool, as targeted hunks, to `.feature/plan-draft.md`, `.feature/plan-draft/shared.md`, the slices and `.feature/plan-owner.md`. NEVER Write a plan file whole and never retype the plan into the conversation. An accepted finding that names a file or a contract lands as, or inside, a build step of the slice that owns that file, so the build cannot miss it; a finding about a seam lands in `shared.md` and in both slices; a finding that re-cuts a component updates the table, the slices and the plain plan's sixth section together. `.feature/plan-owner.md` keeps its six sections and the three-clause rule; edit only what actually changes.
   - Keep, for step 7: `whatChanged` (one line per edit, each starting Added/Changed/Removed, stating the consequence for the owner and the reason, plain words, no lane names, no finding counts, nothing that reveals the review mechanics), `openQuestionsForOwner` (each answerable by a non-programmer, tradeoff in one sentence), and each lane's state.

## 7. Present the result

The critique changed the plan **materially** when any of these holds: a line under "The decisions" or "Components, in the order they build" in the plain plan was added, removed or changed in meaning; a component was added, removed, merged or re-cut; a number carrying his attribution changed; `openQuestionsForOwner` is not empty. Wording, a build step added inside an existing decision, a contract detail, a seam, a file correction or a new build-time check is not material.

**If material**, show the owner, in this order, and nothing else, then END YOUR TURN:

1. Read `.feature/plan-owner.md` fresh off disk and paste it whole, verbatim, as the very first thing in the message. This is the only re-emission of the plan anywhere in this skill.
2. The **`whatChanged`** list, as Added/Changed/Removed one-liners, each with its reason.
3. Any **`openQuestionsForOwner`**, each phrased as a plain question with the tradeoff in one sentence.
4. The handoff line: "Approve this plan to create the issue and start the run, or tell me to leave the run for you to launch." The builds run on Astra High; never offer a model choice (owner, September 24).
5. One closing line: each lane's elapsed seconds from the runner and any dead lane named plainly. A `NO_FINDINGS` lane is reported as "nothing found", never as a lane that did not come back.

The owner may push back; iterate with him directly, editing the plan files by hand for small wording changes (no re-run of the critique) until he approves.

**If not material**, say so in one plain sentence ("The critique changed nothing you decided; your approval from step 4 stands, so I am creating the issue and starting the run."), show the `whatChanged` list and the closing lane line, and continue into steps 8 and 9 in the same turn without waiting.

If the owner asks what was dropped, read `.feature/critique-dispositions.md` and answer in plain words; never volunteer it unasked.

## 8. On approval: issue, branch, plan files

1. The issue body is the plain plan and nothing else, copied with shell, not retyped:

   ```bash
   cp .feature/plan-owner.md .feature/issue-body.md
   ```

   The detailed plan never goes on the issue; it lives only in the local `.feature/` files where `/run-plan`, its builds, QC and the lanes read it (owner decision 2026-08-18; if `.feature/` is lost mid-flight the detailed plan is regenerated from the plain plan on the issue).

2. Create the issue and cut the branch in one step (adoption-aware, safe to re-run if interrupted; the script prints the new issue number on stdout and lands the tree on `ft/<N>` from `beta`):

   ```bash
   bash .claude/scripts/start.sh "<feature title>" .feature/issue-body.md
   ```

3. Rename the working files to the real issue number, substitute the placeholder inside them, and check that no pre-rename name survives:

   ```bash
   mv .feature/plan-draft.md .feature/plan-<N>.md
   mv .feature/plan-draft .feature/plan-<N>
   mv .feature/plan-owner.md .feature/plan-<N>-owner.md
   sed -i '' 's/plan-<N>/plan-'<N>'/g' .feature/plan-<N>.md .feature/plan-<N>/*.md
   rg -n "plan-owner\.md|plan-draft" .feature/plan-<N>.md .feature/plan-<N>/*.md && echo "STALE REFERENCE: fix before handoff"
   ```

   From here on no plan file is edited: the launch in step 9 records the hash of `.feature/plan-<N>.md` in `.feature/run-<N>.json` as the approved plan (the run's own record; nothing in this skill writes that file), and the run refuses a plan that changed after it. A correction after launch is an amendment, not an edit.

## 9. Launch `/run-plan <N>`, then stop

Follow [the run handoff](references/build-handoff.md). Verify that `start.sh` left the checkout on `ft/<N>` (or `bf/<N>`), that `.feature/plan-<N>.md`, `.feature/plan-<N>/shared.md` and one slice per table row exist by exact path, that `.feature/plan-<N>-owner.md` matches the issue body, and that the tree is clean apart from tool configuration under `.claude/` or `.codex/`, which is committed and pushed on the branch as a `meta:` commit first. If the owner asked to launch manually or later, name `/run-plan <N>` and stop.

Otherwise launch once, report the real launch status, and STOP. No polling and no further planning work while the run goes; the run notifies the owner itself when it finishes. Nothing here launches QC or ship.

<exit-example>

Issue #150 created on `ft/150`. The plan has seven components; the run has started and builds them in order, with the data model first. It will notify you when it finishes, and its summary will be in `.feature/run-150-summary.md`.

</exit-example>
