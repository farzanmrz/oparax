---
name: feature-docs
description: >-
  QC step 3 of 4, hop-anywhere: sync the instruction files after a fix round AND
  take the mandatory subtractive pass that keeps them from growing without
  bound. Use standalone (/feature-docs) after /feature-fix, or let /feature-qc
  chain it. Harness-neutral.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# Docs — sync the slice, then pay the tax

This step has **two duties**. The first is scoped to the diff. The second is not,
and it is the one that matters.

Why: AGENTS.md went 1,898 B → 40,816 B over its life, on 84 growing commits
against 25 shrinking ones — 2.1 bytes added per byte removed. Doc-sync was the
only remover and it was diff-scoped, so it could only delete what *this slice*
falsified. Bloat from thirty slices ago was invisible to it by construction. Its
entire recorded output was "no change needed", "1 edit", "1 edit".

Dispatch ONE agent (Claude Code: `model: sonnet`, `effort: high`; Codex:
`cx_fixer`) with both duties in the same brief.

## Duty 1 — sync what this slice falsified

Input: the branch diff plus the staleness findings in the latest
`## QC round <R> — findings` comment.

- Subtract any AGENTS.md / `.claude/rules/*.md` / skill line the diff falsified
  or made code-recoverable.
- Add ONLY a non-recoverable keeper: a new guard, a retired pattern with its
  reason, a new trust boundary.
- Single-source every fact. If it lives in the code map, it does not also live
  in a rule.

Default outcome here is genuinely no change. That is fine — duty 2 is not
optional just because duty 1 was empty.

## Duty 2 — the subtractive pass (MANDATORY, not diff-scoped)

Run the census first:

```bash
bash .claude/skills/feature/scripts/doc-census.sh
```

Then read AGENTS.md **whole** and cut **≥3% of its bytes**, or state in the
comment exactly why nothing qualified. "Nothing qualified" is a claim the owner
can check, so it must name what was considered.

Cut candidates, in priority order — all mechanical, none needing judgment:

1. **A paragraph over 120 words.** Split it or cut it. The census lists every one
   with its file and word count.
2. **A justification attached to a procedure step.** *Justify a decision, not a
   step* — a decision gets re-litigated so it needs the fact that settled it; a
   procedure step never gets argued with, so its incident narrative is pure
   per-load cost. Move the narrative to the commit message; keep the step.
3. **A fact stated in two files.** Keep the one whose readers need it; the other
   gets a pointer or nothing.
4. **Anything `ls`, `package.json`, or the generated types already say.**
5. **Archaeology.** A deleted thing described at length. If it is gone, say so in
   a clause or say nothing.

**Never cut to hit the number.** A settled decision's justifying fact, a trust
boundary, a live guard, or an owner hard rule stays even if the file misses 3%.
Under-cutting and saying so is correct; deleting a constraint is not.

## Mirror check (deterministic, every round)

```bash
diff <(ls .claude/skills/) <(ls .agents/skills/ | grep -v "^x-\|^lean-log")
```

Any `.claude/skills` entry missing from `.agents/skills` is a finding — add the
symlink this round. A missing link silently strips that skill from every
non-Claude harness.

## Record

Commit any change (`qc: doc sync round <R>`), then post
`## QC round <R> — docs` on the issue with **the byte line first**:

```
AGENTS.md 32205 -> 31180 B (-3.2%) | corpus 162756 -> 161500 B
```

Then one line per edit, and — if the cut was under 3% — the named reason. The
byte line is what makes the ratchet visible per slice instead of after 40 KB.
Post this marker even when nothing changed; resume detection and both ships'
guards read it.

Standalone: STOP and name the next hop (`/feature-verify`, either app). Under
`/feature-qc`: continue into feature-verify.
