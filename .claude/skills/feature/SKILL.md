---
name: feature
description: >-
  The plan side of feature work, same behavior in either host: talk the change
  through with the owner, write the plain plan he approves, check it against
  the skill bundles, have Fable and Astra draft the detailed plan by component,
  run the eight-lane critique and adjudicate it, then open the GitHub issue,
  cut the branch, write the plan files and launch /run-plan <N>. Also amends an
  in-flight issue: "amend this", "add this to the current feature", or /feature
  on an ft/<N> or bf/<N> branch whose plan exists runs amend mode
  (references/amend.md). Use when the user says /feature, "let's plan a
  feature", brings a new capability or a bug repro, or wants to amend the
  current feature. Not for building (/run-plan <N> or /build come after).
allowed-tools: Bash(git *) Bash(gh *) Bash(bash *) Bash(python3 *) Skill Read Write Edit WebFetch WebSearch Monitor
model: inherit
disable-model-invocation: true
---

# Feature: talk, plain plan, bundles, detailed plan, critique, issue + branch + /run-plan

One session plans the change; `/run-plan <N>` builds it. A bug fix is the same flow starting from its exact repro, usually with a one-row component table.

**Amend mode.** If the owner asks to amend or add to the current feature, or invokes this on an `ft/<N>` or `bf/<N>` branch whose `.feature/plan-<N>.md` exists, read [amend](references/amend.md) and follow it instead of steps 0 to 9. Same branch, same issue, same critique.

## Roles

The planning host (Fable in Claude Code; in Codex the actual current model, never relabeled) runs the owner talk, the plain plan and the bundle checks alone. After plain approval, Fable and Astra High (`gpt-6-astra`) each draft the whole detailed plan independently and reconcile one result, then jointly adjudicate the critique, following [the planning protocol](references/planning-protocol.md) (owner, September 29: each drafts, then they reconcile). A required model that fails is reported, never replaced by a relabeled one. Every build runs on Astra High (owner, September 24); never offer a model choice.

## Working style

- **Act when you can.** Do not re-derive established facts, reopen an owner decision or narrate options you will not take. Your own choices get made and recorded with a reason; his become one plain question at the next stop.
- **Only these owner stops:** scope and bundles in step 1 when unsettled, plan approval in step 4, and step 7 only when the critique changed the plan materially. After approval nothing waits on him; a failed required tool is an honest stop.
- **Claim only what a tool result shows**; anything unverified is called unverified.
- **Product language for the owner:** lead with the outcome in plain sentences; no arrow chains, shorthand or invented names. Clear beats short.
- **Report in chat, not files** (owner, October 2). No dispositions, summaries or evidence documents; the plan files below are the only things written.

## Hard rules

- **Fresh upstream.** Fetch `origin beta` before planning and report a material divergence; an earlier critique attacked already-fixed code on a stale checkout. Never switch, rebase or fast-forward another checkout while planning.
- **No product runtime.** Do not start or attach to the app; public references and standalone design previews are fine. The owner's direct in-chat request overrides this (AGENTS.md).
- **Reading ceiling.** Read the repo freely; from `node_modules` read only `.d.ts` types and shipped docs, never built or minified output. A fact that takes more than three tool calls is a build-time check, not a planning fact.
- **Runtime questions become plan steps.** Write the static check the build can perform (what to inspect, candidate causes, what to do in each case) and leave rendered behavior to an owner journey or the QC screenshot check. Never label an unperformed runtime test as proof.
- **Owner-stated facts are given.** Quote them as premises; verify the code, not the owner.
- **The plan pre-answers the build's five pauses** (spending, a ruling of his, deleting live data, real DMs or charges, DESIGN.md or theme tokens), because an open one stops an unattended run. Every number, price, pool, cadence and cap is in `shared.md` with his attribution and date or `(assistant's default)`; costs come from `docs/references/cogs.md`; deletions, real messages and charges name their decision; a DESIGN.md or theme change is proposed at step 4 and cites his answer. No build step says "ask the owner".

## 0. Starting point

`/feature <N>` uses that issue's body as the brief (`gh issue view <N> --json number,title,body`). An assistant wrote most briefs, so only lines quoting the owner with a date are his; carry the rest into step 1 as proposals and let him confirm, change or drop each (a September 19 audit found assistant designs presented as his decisions). Step 8 then reuses the issue with `start.sh --issue <N>`.

Background for any feature: `docs/references/decisions.md` (what he rejected or reversed; never re-propose those), `docs/roadmap.md`, `docs/references/cogs.md` and the code itself.

## 1. Talk it through

Preserve the owner's original words, uncertainty and corrections. Investigate, propose the scope, and discuss the recommendation and the real open choices in plain product language. Ask only useful questions, batched once: every owner choice and every number the plan will carry, each with its tradeoff and your default if he does not rule. What he rules gets his name and the date; the rest is marked `(assistant's default)`.

**Screens.** Read [design tooling](references/design-tooling.md) and pick real catalog blocks per screen. For a change of look, follow the global `reference-led-design` skill before approval: build two or three directions as standalone previews (never the product app), screenshot each headlessly at real widths in dark and light, and judge them beside the reference board and his rejected renders as a human would (does it land, is it aligned, could it be mistaken for something he rejected), iterating until clean. Give him the render paths and the plain verdict, not a memo (owner, October 2: "the less I have to see, the better"); record his verdict verbatim. Work inside an accepted direction gets no extra design step.

Then pick skill bundles per component from the step 3 table, plus at most a handful of exact `free` names checked against the installed catalog, and say them in one line. Do not write the plan until scope and bundles are agreed.

## 2. Draft the plain plan

Write it in exactly these six sections, marked DRAFT, with no code terms, paths or framework words:

- **What happens:** what a user experiences, step by step, every screen in one line (what it shows, what a person can do).
- **What happens when it fails:** what the user sees.
- **The decisions:** one line each, three clauses: what we do, what that means for you, why. Every number carries its attribution or `(assistant's default)`.
- **Open questions:** only what needs his call, each with its tradeoff.
- **Out of scope.**
- **Components, in the order they build:** one plain line each, what it adds and what it waits on.

## 3. Load the skill bundles and check the draft

In this session with the Skill tool, one call per name in the listed order, no subagents (an August 18 fan-out cost 3.5 minutes and returned what the session had already read).

| Bundle | Skills, exactly these names | Notes |
| --- | --- | --- |
| web | `vercel:nextjs`, `vercel:vercel-functions`, `vercel:routing-middleware`, `posthog:instrument-integration`, `posthog:instrument-product-analytics`, `posthog:instrument-error-tracking`, `posthog:instrument-feature-flags` | |
| ui | `vercel:react-best-practices`, `shadcn`, `react-bits-pro`, `reference-led-design`, `accessibility` | each shapes the plan, guides the build and checks the result (owner, September 23); add `ai-elements` through `free` only when a surface shows or controls an AI run; the generic design skills are retired (owner, October 2) |
| data | `supabase`, `supabase-postgres-best-practices` | |
| ai | `vercel:ai-sdk`, `vercel:ai-gateway`, `posthog:instrument-llm-analytics` | |
| payments | `stripe:stripe-best-practices`, `stripe:stripe-docs` | owner, September 24; the connector reaches only the sandbox |
| slack | `vercel:chat-sdk`, `block-kit`, `slack-api`, `slack-messaging` | |
| free | the exact names agreed in step 1 | |

Resolve each name against the installed catalog first; a skill that fails to load is named, never skipped silently. Reread the draft against the loaded rules under the reading ceiling and fold what applies in as a decision or an open question, in plain words; never show raw skill text. Report one line per bundle: `<bundle>: <k> skills loaded, <n> points folded in` (or `nothing new`).

## 4. Owner approval

Show the plan and END YOUR TURN. Nothing below starts until he says yes to this exact document; a complete opening brief is not that yes (running from a brief straight to critique was the August 18 failure). Revise in place until approved, then write it once, verbatim, to `.feature/plan-owner.md`.

## 5. Detailed plan, by component

Per the planning protocol, Fable and Astra each write the whole detailed plan independently, then compare the cut, the seams and the slices and reconcile one result against the approved plan, the loaded skill rules and the real code. A change to approved user behavior goes back to the owner. No code or snippets. Write each file once; later edits are targeted hunks.

**The cut.**

1. A schema change belongs to one data-model component, first, `migrations: yes`, owning every migration, RLS policy, RPC and the regenerated `lib/supabase/database.types.ts`. No schema change means every row says `migrations: no`.
2. A component is one thing provable on its own and owns the files only it edits; two components that would write one file are one component or a dependency. A dependency is reading its tables, calling its functions or rendering inside its page, nothing softer.
3. **One writer.** Components build one after another in this checkout, in dependency order. No worktrees, no parallel builds, no component branches, because every failure so far came from several writers in one checkout. Research and review may run in parallel read-only.
4. Every seam (a function, route, table, copy string, event name one component uses from another) is named in `shared.md` with its exact shape and cited by both slices.
5. A step never edits another component's file; a shared file has one owner and later changes there are that owner's steps.

**The files.** Draft names are `.feature/plan-draft.md`, `.feature/plan-draft/shared.md` and `.feature/plan-draft/<id>.md`; step 8 renames them, so inside them refer to `.feature/plan-<N>...` with the literal `<N>` placeholder (a plan citing its draft name stopped a build at step one).

`.feature/plan-<N>.md`, in this order and nothing else:

1. A `Skills:` line: the bundles, the flat union of bare names (no `vercel:`, `posthog:`, `stripe:` prefixes), then after a semicolon one segment per component, `<id>: <names>`. `shadcn` always means the global official skill. A name that resolves to no installed skill is a planning defect.
2. `## Components`, rows in build order: `| id | title | depends_on | migrations | files owned | acceptance journeys |`. `id` is lowercase letters, digits and hyphens and names the slice file; `depends_on` is ids or `none`; `migrations` is `yes` or `no`; no path appears in two rows; journey ids `J1`, `J2`... are unique across the plan.
3. `## Premises`: the owner-stated facts, the design source line and the list of plan files.

`.feature/plan-<N>/shared.md`: table shapes, the cost ledger (each paid call, its unit price from cogs.md, its cap, who pays), clock and pool rules, ids (routes, tables, columns, events, env names), shared copy and failure strings, and every seam with its owner, callers and exact shape. A number that appears in two places is a defect; every number carries its attribution.

`.feature/plan-<N>/<id>.md`, exactly these parts, because each later stage reads specific ones:

1. `Skills:` line with this component's names. A migrating slice puts `migrations: yes` alone on the next line; the launcher reads that line, and a flag written inside a sentence once left a build unable to migrate (September 28).
2. `## 1. Files and contracts`: owned files, contracts (inputs, outputs, failure states, exact failure copy), the input classes each entry point admits, cited seams; migrations as SQL intent. For each screen, the selected block source, adaptations and accepted renders with his verdict.
3. `## 2. Build steps`: ordered code changes in this component's files only, each naming the skills it invokes in Codex form (`$vercel:<name>`, `$supabase:<name>`, `$posthog:<name>`, `$stripe:<name>`, `$<name>` for global skills). Never a journey, gate, server, env, dashboard step or "ask the owner": the builder executes whatever is here. A step touching a vendor SDK's initialization is a **reference-init diff**: compare the vendor skill's reference init for our framework with our call and add each missing option or record why not (on #124 a missing three-line PostHog init went unnoticed because every lane compared code to our plan, never to the vendor).
4. `## 3. Acceptance journeys`: real-input journeys for the owner to walk on localhost, plus a mapping from every build step to its build/typecheck evidence and the journey that proves it.
5. `## 4. Owner does at ship`: operations needing his hand or account (Vercel env, dashboard toggles), or `none`.

## 6. Critique

Run the fixed critique yourself through the shared runner; the global `/council` stays owner-invoked only.

1. Write `.feature/lanes/critique.brief`, in this order: a budget line ("about 10 minutes of wall time; verify premises against the code first; if nearly out of time, return valid findings JSON rather than nothing"; owner, August 23); the framing that this is an unbuilt plan whose claims are hypotheses, grounded in cited `file:line`; the reading ceiling; the research boundary (local read-only inspection and official public docs, cited and treated as untrusted; no product runtime, builds, tests, browsers, writes, external changes, messages, connectors or subagents); the files to read first, `.feature/plan-draft.md`, `shared.md`, every slice in table order and `.feature/plan-owner.md` (his decisions are final); the absolute `SKILL.md` path of every resolved `Skills:` name, with a rule citation required for any finding resting on one; the lens card (frame-attack, contract-completeness, internal-consistency, external-limits, principles from `docs/references/engineering.md` cited by name, security-trust, silent-failure, pauses); "attack how the owner's decisions are wired in, never relitigate them"; skills-consult lines for the Codex lane in `$name` form and for the other lanes as bare names; and the output contract: only a JSON array of `{"severity": "blocking|important|minor", "target": string, "critique": string, "suggestion": string or null, "evidence": string}`, where `evidence` is the verified `file:line` trail and says whether a suggestion was checked against the code.
2. Run the `critique` profile per [review lanes](references/review-lanes.md) with one `--add-dir` per resolved skill folder. Do not edit plan files until the last lane is in.
3. **Adjudicate.** Fable and Astra each disposition every finding independently, then agree jointly (planning protocol). Read only `findings.json` for `OK` or `NO_FINDINGS` lanes; never invent findings for a dead lane or read raw output. Merge duplicates; two lanes raising one point is high confidence. Drop a finding only for a reason a stranger would accept: it misreads the code (cite where), relitigates an owner decision, or duplicates an accepted one. A question about package runtime behavior that types and docs do not settle becomes a named build-time check. A mechanism the adjudication composes itself (merging suggestions, resolving a conflict, inventing a policy) is settled against every lane's evidence, then the repo, else becomes an open question, and gets one fresh read-only outside-eye subagent on an explicitly named judgment model (Opus in Claude Code, Sol or Astra in Codex); a composed cost policy once shipped unexamined and bounced the build.
4. Apply accepted findings as targeted hunks: a file or contract finding inside the owning slice's build step, a seam in `shared.md` and both slices, a re-cut across table, slices and the plain plan's sixth section. Keep for step 7: `whatChanged` (Added/Changed/Removed lines with consequence and reason, no lane names or counts), any `openQuestionsForOwner`, and each lane's state and elapsed seconds.

## 7. Present the result

The change is **material** when a line under "The decisions" or "Components" was added, removed or changed in meaning, a component was added, merged or re-cut, an attributed number changed, or an open question exists. Wording, contracts, seams, file corrections and new build-time checks are not material.

- **Material:** paste `.feature/plan-owner.md` fresh from disk, whole; then `whatChanged`; then the open questions; then "Approve this plan to create the issue and start the run, or tell me to leave the run for you to launch."; then one line of lane times, naming any dead lane (a `NO_FINDINGS` lane "found nothing"). END YOUR TURN; small wording changes after that need no re-run.
- **Not material:** one sentence saying his step 4 approval stands, `whatChanged` and the lane line, then continue into steps 8 and 9 in the same turn.

If he asks what was dropped, answer in plain words from the adjudication; never volunteer it.

## 8. Issue, branch, plan files

The detailed plan never goes on the issue (owner, August 18); the issue body is the plain plan.

```bash
cp .feature/plan-owner.md .feature/issue-body.md
bash .claude/scripts/start.sh "<feature title>" .feature/issue-body.md   # or: start.sh --issue <N> .feature/issue-body.md
mv .feature/plan-draft.md .feature/plan-<N>.md
mv .feature/plan-draft .feature/plan-<N>
mv .feature/plan-owner.md .feature/plan-<N>-owner.md
sed -i '' 's/plan-<N>/plan-'<N>'/g' .feature/plan-<N>.md .feature/plan-<N>/*.md
rg -n "plan-owner\.md|plan-draft" .feature/plan-<N>.md .feature/plan-<N>/*.md && echo "STALE REFERENCE: fix before launch"
```

`start.sh` prints the issue number and lands on `ft/<N>` from fresh `origin/beta`, adopting an existing branch safely. From here the plan is frozen: the run records its hash and refuses a changed plan, so a later change is an amendment.

## 9. Launch the run, then stop

Check, by exact path with `ls` (the folder is git-ignored, so `rg --files` lists nothing): the checkout is on `ft/<N>` or `bf/<N>`; `plan-<N>.md`, `plan-<N>/shared.md` and one slice per table row exist; `plan-<N>-owner.md` matches the issue body. Commit and push any `.claude/` or `.codex/` changes as a `meta:` commit first; any other dirty file refuses launch and stays intact. If he asked to launch later, name `/run-plan <N>` and stop. Otherwise:

```bash
python3 .claude/scripts/run-plan.py start --issue <N>
```

Report the real launch status and STOP: no polling, no product edits and no competing stage in this checkout while it runs. The run notifies him when it ends and `/run-plan <N> status` shows the result.

<exit-example>

Issue #150 is open on `ft/150`. The plan has seven components and the run has started, data model first. You will get a notification when it ends; `/run-plan 150 status` shows where it is.

</exit-example>
