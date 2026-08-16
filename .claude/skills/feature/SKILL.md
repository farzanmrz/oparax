---
name: feature
description: >-
  The whole plan side of feature work, CLAUDE CODE ONLY (it dispatches the
  lens and critique workflows through the Workflow tool, which only exists
  in Claude Code): talk through the idea with the owner, write the
  owner-facing plan, run the skill lenses, agree the plan with the owner,
  write the detailed plan for build, run it through a 4-lane cross-model
  critique plus adjudication, present the revised plan, and on approval
  create the GitHub issue and cut the branch. Replaces the old ft-plan,
  ft-spec, and ft-adj skills. Use when the user says /feature, "let's plan
  a feature", or brings a new capability idea to talk through. Bugs use it
  too, starting from the repro. Not for building (/build <N> comes after
  this skill ends).
allowed-tools: Bash(git *) Bash(gh *) Workflow
model: inherit
---

# Feature: talk, plan (owner-facing then detailed), lenses, critique, issue + branch

One session, start to finish. Nothing here auto-dispatches the next stage of the overall flow: this skill ends by naming `/build <N>` for the owner to run themselves, wherever they choose.

## 1. Talk it through

Discuss the idea with the owner in plain product language, on whatever model this session is already running. If the idea is a tangle of several things, the first job is cutting it into separate slices and agreeing with the owner on exactly ONE slice for this round, the rest wait for their own round later. Do not move on until one slice is clear.

**UI checkpoint:** if the slice has any user-facing surface (a screen, a panel, a Slack message layout, an email), explicitly ASK the owner, as its own question: "Do you want to provide the design for this (v0 export, Block Kit JSON, a screenshot), or should it be derived from the app's existing design system?" Never assume either answer. The owner's choice is recorded as a line in "The decisions" once the plan is drafted ("look provided by owner" or "look derived from the existing design system"), and if they choose to provide one, wait for the artifact before moving on. This also decides whether the `ui` bundle below applies.

At the end of this step, pick the skill bundles this slice touches from: web, ui, data, ai, slack, workers (web and data apply to almost every slice). Say them to the owner in one line; the owner may veto or add. Do not move to writing the plan until one slice and its bundles are agreed.

## 2. Draft the plan (plain language)

Write "the plan" for that one slice in exactly this five-section format (no code terms, no file paths, no framework language anywhere in it), marked DRAFT:

- **What happens:** plain words, step by step, what a user experiences.
- **What happens when it fails:** plain words, what the user sees.
- **The decisions:** a short list, one line each, plain words.
- **Open questions:** anything genuinely unresolved that needs the owner's own call.
- **Out of scope:** what is explicitly not being built this round.

Do not ask the owner to approve it yet; that happens in step 4, after the skill lenses have had a chance to sharpen it.

## 3. Run the skill lenses

Run the lens pipeline through the Workflow tool:

- `scriptPath`: `.claude/workflows/ft-lens-pipeline.js`
- `args`: `{ featureTitle, plan: <the draft from step 2>, bundles: [<the bundles picked in step 1>] }`

This dispatches one Sonnet agent per picked bundle, in parallel, each forced to invoke its bundle's skills and ground its answer in this slice's real code. It takes a few minutes; say so plainly to the owner and let it finish rather than improvising a substitute.

Fold the lens briefs into the draft plan: a constraint becomes a decision or, where it's genuinely unresolved, an open question, always in plain words. Never show the owner the raw lens briefs. If `deadLenses` is non-empty, say so plainly ("one lens didn't come back") rather than silently dropping it.

## 4. Agree the plan with the owner

Show the owner this document. They read it, push back, and it gets revised in place until they approve it. **Nothing below starts until the owner has said yes to this exact document.**

## 5. Write the detailed plan (technical, inline, owner never reads it)

After approval, write the detailed version of the same plan directly in this conversation, freely, whatever it needs: the files it touches, the contracts (inputs, outputs, failure states, exact user-facing copy for graceful failures), the input classes each entry point admits, the acceptance journeys with real inputs, and the ordered build steps, each naming the Codex skills that step invokes by `$name`, in Codex's own form (Vercel plugin skills as `$vercel:<name>`, Supabase ones as `$supabase:<name>`, Slack ones bare, e.g. `$vercel:nextjs`, `$supabase:supabase`, `$block-kit`) so the build lane invokes exactly those and nothing else. Ground it in the real code (real paths, real names) and flag missing information instead of guessing. No code, no snippets: build writes all of that once, from this document. It is for the build stage and the critique lanes only; the owner is never shown it and never asked to approve it.

Record the picked bundles and the flat list of their skill names, BARE (no `vercel:`/`slack:` prefixes), in a line at the top of the detailed plan: `Skills: web, data (nextjs, vercel-functions, routing-middleware, supabase, supabase-postgres-best-practices)`; every later stage reads this line and maps each name to its own harness's prefix.

Save it to `.feature/plan-draft.md` as you go, so a killed session can resume from what's already written instead of starting over.

### 5.1 UI slices, including UI the owner brings in

When the slice touches any UI, the detailed plan grounds its visual decisions in root `DESIGN.md` (the binding visual contract) and may query the `ui-ux-pro-max` skill for citable UX rules; new UI aligns to the app's existing aesthetic, never a freshly invented one.

The owner may hand over ready-made UI: code exported from v0 or a design tool, Block Kit JSON from Slack's builder, or a screenshot of a design they want. Treat that artifact as a DECIDED input, not a suggestion: save it verbatim to `.feature/ui-<short-name>.<ext>`, reference that file path in the detailed plan as the base the build adapts (restyled to `DESIGN.md` tokens where they conflict, structure preserved), and note in the plan's "The decisions" section, in plain words, that the look comes from the owner's provided design. The critique lanes may attack how it's wired in, never relitigate the owner's visual choice.

## 6. Dispatch the critique workflow

Once the detailed plan is complete, run the critique pipeline through the Workflow tool:

- `scriptPath`: `.claude/workflows/ft-critique-pipeline.js`
- `args`: `{ featureTitle, plan, spec, skills }`. `featureTitle` is a short plain name for the slice (there is no GitHub issue yet at this point; it gets created in step 8), `plan` is the exact approved owner-facing plan from step 4, `spec` is the exact detailed plan from step 5 (the workflow keeps the old argument name; it is the same document), `skills` is the flat list of skill names recorded on the `Skills:` line in step 5.

This runs 4 parallel critique lanes over the detailed plan, then one adjudication pass that hands back a revised version of the plan plus what changed. It takes several minutes; let it run to completion, do not improvise a substitute.

## 7. Present the result

Show the owner, in this order, and nothing else:

1. The **revised plan**, same five-section plain-language format as step 2 (this is `revisedPlan` from the workflow result).
2. The **`whatChanged`** list, as short one-liners.
3. Any **`openQuestionsForOwner`**, each phrased as a plain question with the tradeoff in one sentence.

Never show per-lane findings, raw critique output, or which lane said what; that detail already got folded into the revision. If `deadLanes` is non-empty, mention it plainly ("one review pass didn't come back") rather than silently dropping it.

The owner may push back on the revised plan; iterate with them directly (no need to re-run the workflow for small wording changes) until they approve it.

## 8. On approval: issue, plan file, branch

Once the owner says yes to the revised plan:

1. Compose the issue body: the revised owner-facing plan verbatim, followed by the detailed plan wrapped in a collapsed block so the build stage can read it without it cluttering the issue view:

   ```
   <details>
   <summary>Detailed plan (for the build stage)</summary>

   <the full detailed plan text>

   </details>
   ```

2. Create the issue and cut the branch in one step (this also handles an already-existing branch/issue adoption-aware, so it's safe to re-run if interrupted):

   ```bash
   bash .claude/scripts/start.sh "<feature title>" <(printf '%s' "$BODY")
   ```

   The script prints the new issue number on stdout; everything else goes to stderr. It lands the working tree on `ft/<N>` from `beta`.

3. Add the `feature` label (the start script does not set labels):

   ```bash
   gh issue edit <N> --add-label feature
   ```

4. Rename the working file so it's tied to the real issue number:

   ```bash
   mv .feature/plan-draft.md .feature/plan-<N>.md
   ```

## 9. End: name the next command

Do not dispatch, build, or run anything else. Close with a short summary (issue number, branch, one line on what changed in the critique round) and tell the owner the next command is `/build <N>`, run wherever they choose.

<exit-example>

Issue #123 created, `ft/123` cut. The critique round tightened the retry cap and added an owner decision about batching. When you're ready:

```
/build 123
```

</exit-example>
