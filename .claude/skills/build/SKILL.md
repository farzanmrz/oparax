---
name: build
description: >-
  The whole build-and-prove side of feature work, CLAUDE CODE ONLY (it
  dispatches the build workflow through the Workflow tool, which only
  exists in Claude Code): read the issue's approved plan and spec, build
  the slice, run the deterministic gates, prove the acceptance journeys,
  run cross-model QC against the real diff, fix what QC and the journeys
  turned up, reverify, then hand the branch to the owner for a localhost
  walkthrough. Replaces the old ft-build, ft-fix, and ft-qc skills. Use
  when the user says /build <N> on a branch cut by /feature.
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *) Workflow
model: inherit
---

# Build: read the spec, build it, prove it, fix it, hand it back

One session, start to finish, dispatched through the Workflow tool. This skill does not ship anything and does not close the issue; it ends by telling the owner to walk localhost and then run `/ship <N>`.

## 1. Confirm the branch

```bash
git branch --show-current
```

Expect `ft/<N>`. If the working tree is on something else, fetch and switch:

```bash
git fetch origin "ft/<N>"
git switch "ft/<N>"
```

STOP if the branch does not exist yet; that means `/feature` has not been run for this issue. Never create it here.

## 2. Read the issue

```bash
gh issue view <N> --json title,body
```

The body is the revised owner-facing plan (from `/feature`), followed by the detailed plan inside a collapsed `<details>` block. Pull the detailed plan text out from between `<summary>Detailed plan (for the build stage)</summary>` and the closing `</details>` tag; that's what the workflow calls `spec`. Keep the plan text too, only for your own understanding, the owner already approved it and doesn't need to see it again here.

## 3. Dispatch the build workflow

Run it through the Workflow tool:

- `scriptPath`: `.claude/workflows/ft-build-pipeline.js`
- `args`: `{ issueNumber: <N>, spec }`

This one call does all of: implement the detailed plan on this branch, run one post-build pass (simplify the diff, run the build/typecheck gates, fix mechanical red until green), run 4 parallel cross-model reviews of the actual diff, turn the accepted findings into fix briefs, apply the fixes, and run one reverify pass (gates + brief presence). Each stage is capped, build 8 min, QC lanes 5 min, fix 3 min; a capped-out build is surfaced, not retried. It takes a long time, likely tens of minutes; let it run to completion.

## 4. Present the result plainly

Translate the workflow's result into plain product language for the owner, no code terms, no raw tool dumps:

- **Build too big:** if `buildTimedOut` is true, say plainly the slice did not finish inside the build cap and needs splitting; nothing else ran.
- **What got built:** a short summary of the slice, from `buildSummary` (say what changed, not which files).
- **Gate result:** GREEN or RED, in one line, from `postBuildResult`.
- **Fixes applied:** the `ownerSummary` line from each entry in `fixBriefs`, never the file/line/fixShape detail.
- **Anything still unresolved:** if `allClean` is false, state plainly what `unresolvedNote` and the reverify round's `remaining` say is still broken, in plain words. This is the one case where the owner needs to know something is not done.
- **Open questions:** anything in `openQuestionsForOwner`, same as the `/feature` presentation style, plain question plus the tradeoff in one sentence.
- **Dead lanes:** if `deadLanes` is non-empty, mention plainly that one or more review passes did not come back, rather than silently omitting it.

Never show the raw `qcLanes` output or per-lane findings; that detail is already folded into the fix briefs and the unresolved note.

## 5. Post the round marker

`/ship` gates on a `## QC round <R>: done` comment existing on the issue. Find the next round number, then post one:

```bash
gh api repos/{owner}/{repo}/issues/<N>/comments --paginate \
  --jq '.[] | select(.body|startswith("## QC round")) | (.body|split("\n")[0])'
```

`R` is one past however many `## QC round` markers already exist (start at 1 if none). Post exactly one comment, `## QC round <R>: done`, with: fix counts (fixed/dropped), the gates result, one line per fix (owner summary only, no file/line), and anything owed to the owner in plain words. No other markers exist.

## 6. End: owner walks localhost, then ship

Do not run gates again, do not dispatch anything else, and do not touch the issue. Close with the plain summary above, then tell the owner to start their own local server (their `serve` command) and walk through the plan's journeys themselves. Once they're satisfied:

<exit-example>

Built and proved. Gates GREEN, one fix round applied 4 small corrections (listed above). Start your local server and try it out. When you're happy with it:

```
/ship 123
```

</exit-example>

If something is still unresolved after the workflow's fix rounds, say so instead of the exit example above, and describe in plain words what the owner would notice if they tried the broken part right now.
