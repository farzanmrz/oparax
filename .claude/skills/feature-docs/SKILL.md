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

# Docs: sync the slice, then pay the tax

Two duties in one step. Phase 1 is scoped to the diff; phase 2 is not, and it
is the one that matters: a diff-scoped sync can only delete what this slice
falsified, so corpus bloat compounds invisibly without the subtractive pass.

* **Doc surfaces:** AGENTS.md + the skills, never rules files.
* **Dispatch ONE agent** with both duties in the same brief (Claude Code:
  `model: sonnet`, `effort: high`; Codex: `cx_fixer`).
* **Marker format:** new QC marker comments are titled `## QC round <R>: <suffix>`
  (`findings`, `docs`). Readers match the `## QC round <R>` prefix plus the
  suffix keyword, separator-agnostic (older rounds used an em dash).

## 1. Sync what this slice falsified (diff-scoped)

Input: the branch diff plus the staleness findings in the latest findings
marker comment.

* **Subtract every falsified line:** remove each AGENTS.md / skill line the
  diff falsified or made code-recoverable; check both surfaces, not only the
  one the findings happened to mention.
* **Add ONLY a non-recoverable keeper:** a new guard, a retired pattern with
  its reason, a new trust boundary.
* **Single-source every fact:** if it lives in the code map, it does not also
  live in a skill.
* **Write for the model that will execute the file:** an instruction file is a
  system prompt, and the model guides disagree (Fable 5 wants brief steering
  over enumeration, Opus 5 wants verification scaffolding REMOVED, Sonnet 5
  needs scope stated explicitly, Codex needs paths named). The mapping and the
  per-model rules are in the global `harness-nuances` skill; read it before
  editing an agent or skill you did not write.
* **Skill edits follow the global `skill-style` skill.**
* **Default outcome is genuinely no change:** that is fine; phase 2 is not
  optional just because phase 1 was empty.

## 2. The subtractive pass (MANDATORY, not diff-scoped)

Run the census first:

```bash
bash .claude/skills/feature/scripts/doc-census.sh
```

Then read AGENTS.md whole and cut **at least 3% of its bytes**, or state in the
comment exactly why nothing qualified. "Nothing qualified" is a claim the owner
can check, so it must name what was considered.

Cut candidates, in priority order (all mechanical, none needing judgment):

1. **A paragraph over 120 words:** split it or cut it. The census lists every
   one with its file and word count.
2. **A justification attached to a procedure step:** justify a decision, not a
   step. A decision gets re-litigated so it needs the fact that settled it; a
   procedure step never gets argued with. Move the narrative to the commit
   message; keep the step.
3. **A fact stated in two files:** keep the one whose readers need it; the
   other gets a pointer or nothing.
4. **Anything `ls`, `package.json`, or the generated types already say.**
5. **Archaeology:** a deleted thing described at length. If it is gone, say so
   in a clause or say nothing.

**Never cut to hit the number.** A settled decision's justifying fact, a trust
boundary, a live guard, or an owner hard rule stays even if the file misses 3%.
Under-cutting and saying so is correct; deleting a constraint is not.

## 3. Mirror check (deterministic, every round)

```bash
diff <(ls .claude/skills/) <(ls .agents/skills/ | grep -v "^x-\|^lean-log")
```

* **Any `.claude/skills` entry missing from `.agents/skills` is a finding:**
  add the symlink this round. A missing link silently strips that skill from
  every non-Claude harness.

## 4. Record

Commit any change (`qc: doc sync round <R>`), then post the docs marker comment
on the issue with **the byte line first**:

<byte-line-example>
AGENTS.md 32205 -> 31180 B (-3.2%) | corpus 162756 -> 161500 B
</byte-line-example>

* **Then one line per edit,** and, if the cut was under 3%, the named reason.
  The byte line is what makes the ratchet visible per slice.
* **Post the marker even when nothing changed:** resume detection and both
  ships' guards read it.
* **Standalone:** STOP and name the next hop (`/feature-verify`, either app).
  Under `/feature-qc`: continue into feature-verify.
