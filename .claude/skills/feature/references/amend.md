# Amend mode: add or change scope on an in-flight issue

Use when the owner wants to amend the current feature. Same issue, same branch, same planning roles, hard rules and critique as the feature skill; only the requested addition is open for design. The approved plan, earlier amendments and applied fixes are settled context. This mode never builds or runs QC.

## 1. Confirm the issue and read what is settled

`git branch --show-current` gives `ft/<N>` or `bf/<N>`; a number in the request must match it, otherwise STOP and name both (never switch a checkout another writer may own). Text in the request is his opening description; do not make him repeat it.

Read, never edit: `.feature/plan-<N>-owner.md`, `.feature/plan-<N>.md`, `.feature/plan-<N>/shared.md`, every affected slice and the slices of callers whose seams change, earlier `.feature/amend-<N>-*.md`, and the fixes already applied on the branch (`git log --oneline --grep '^fix: round' origin/beta..HEAD`). R is 1 plus the number of `## Amendment ` headings in the issue body.

## 2. Talk it through as a delta

As feature step 1, scoped to the addition: cut it to one slice if it is a tangle, pick bundles for the delta only, and for a change of look run the same renders-first `reference-led-design` loop and show him renders with the verdict. The first message has three short parts, because a long first message on August 18 was unreadable and the short retry worked:

1. **What you asked for**, in one or two plain sentences.
2. **What I found that changes it**, at most three lines of "what it means for you, what I will do", or "nothing".
3. **The question**: yes or no on the slice and bundles. END YOUR TURN only if those are not already settled.

## 3. Plain amendment, then a hard stop

Load the delta's bundles as feature step 3, then write `.feature/amend-<N>-<R>-owner.md` once, in plain words, exactly:

```
## Amendment <R>: <short title>

**What will change**
<what users get, what stays hidden, what stops; any earlier behavior or fix this reverses, as "used to X, will now Y">

**What needs your call**
<"Nothing, just approve." or one line per real choice: "A or B; I'd do A because ...">
```

Print it whole with `cat` after one line ("Everything else in #<N> stays as approved and built. This is the amendment:") and END YOUR TURN. Nothing below starts before his yes to this file; his opening brief is not that yes. Pushback is edited in by hunk and the file printed again.

## 4. Detailed amendment and critique

Fable and Astra each draft the detailed amendment independently and reconcile one, per the planning protocol. Write `.feature/amend-<N>-<R>.md` once, one header per line, because the launcher and QC read these headers:

```
# Amendment <R> for issue <N>

Round: <R>

Status: pending

Component: <owning component id, or integration when it crosses components>

migrations: <yes only for an approved schema change in this round, otherwise no>

Skills: <bare skill names, as the plan's Skills line>

## Step 1
<one build step in the slice format: named files, contracts field by field, the change in prose; a step that reverses an applied fix says "supersedes round <r> fix <k>" first>

## Acceptance journeys
<only new or changed journeys, with the step-to-evidence mapping>
```

Never edit `.feature/plan-<N>.md`; the amendment is read after it. Run the critique exactly as feature step 6, with the brief naming `.feature/amend-<N>-<R>.md` as the thing to attack, `.feature/amend-<N>-<R>-owner.md` as final, and the plan files, affected slices and earlier amendments as settled context, each by absolute path. Accepted findings land in a `## Step`; one needing his judgment becomes a "What needs your call" line.

Present as feature step 7, except show only the plain amendment, after one line saying whether anything he would notice changed. If "What needs your call" gained a line, END YOUR TURN for his answer.

## 5. Put it on the issue

```bash
gh issue view <N> --json body --jq .body > .feature/issue-body.md
{ printf '\n\n'; cat .feature/amend-<N>-<R>-owner.md; } >> .feature/issue-body.md
bash .claude/scripts/start.sh --issue <N> .feature/issue-body.md
{ printf '\n\n'; cat .feature/amend-<N>-<R>-owner.md; } >> .feature/plan-<N>-owner.md
```

`start.sh --issue` adopts the branch in place and replaces the body; the `## Amendment` sections are the history. Do not rename or edit the detailed amendment afterwards: the launcher picks it first (amendment, then fix list, then plan) for its `Component:` and flips `Status:` to `applied`.

## 6. End

One line: the amendment number and what it adds in his words, and the next command, `/build <N> <component>` in Claude Code or `$build <N>` in Codex (the launcher refuses while another writer holds the checkout).
