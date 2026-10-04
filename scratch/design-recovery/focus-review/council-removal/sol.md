RESULT: FINDINGS

Verified at HEAD `2170c23` through commit inspection, tracked-file searches using `rg -n -i` over `git ls-files`, and local guidance inspection. The removal is incomplete. Risks below are inferred from verified instructions, not observed agent behavior.

1. **High: two active tracked passages still prescribe the old design process.**

| Location | Surviving quote | Classification and smallest fix |
|---|---|---|
| [docs/roadmap.md:122](/Users/farzanm4/Desktop/repos/oparax/docs/roadmap.md:122) | “The look is stock shadcn Mira now, Claude Design per page later at his word.” | Active guidance. Remove this sentence. |
| [docs/references/decisions.md:168](/Users/farzanm4/Desktop/repos/oparax/docs/references/decisions.md:168) | “the look is stock shadcn Mira now, with Claude Design per page later at his word” | Still inside a **LOCKED** entry. Remove or explicitly supersede that clause, preserving the unrelated build decisions. |
| [state-history-2026-09-30.md:19](/Users/farzanm4/Desktop/repos/oparax/docs/references/state-history-2026-09-30.md:19), lines 30 and 33 | “Claude Design sync is manual when requested”; “restyle per page in Claude Design later”; “stock Mira now and Claude Design later” | Historical evidence. Keep: line 3 explicitly makes this archive non-operative. |
| [.claude/skills/feature/SKILL.md:87](/Users/farzanm4/Desktop/repos/oparax/.claude/skills/feature/SKILL.md:87) | “within the accepted reference and design contract” | Ambiguous guidance after the contract was emptied. Replace “design contract” with the current owner rulings and accepted rendered reference. |

The October restart at `decisions.md:216` overrides older theming rulings, but leaving an older passage labelled **LOCKED** creates avoidable ambiguity.

Product and evidence matches should stay under the approved plan: `app/layout.tsx:15` still loads `Hanken_Grotesk`; line 64 sets `defaultTheme="dark"`; `components/monitor/item-card.tsx:7` contains a shadow recipe; `app/opengraph-image.tsx:13` names Nunito Sans and Source Sans 3. These describe current implementation. `docs/source-table-seed.json:1104` mentions “Claude Design” in newsletter content, which is source evidence rather than agent guidance.

2. **High: ignored feature contracts can restore the removed theme.**

Verified surviving instructions include:

- `.feature/amend-151-1.md:87`: the complete old token table, including `#090f1d`, `#141e31` and `--radius … 0.625rem`.
- Line 88: “Fonts: `Hanken_Grotesk`”.
- Line 198: acceptance requires “cool blue-gray surfaces” and “Hanken Grotesk everywhere”.
- `.feature/plan-151-owner.md:63`, `.feature/issue-body.md:64` and `.feature/amend-151-1-owner.md:7`: “The product gets the look you approved on September 29”.

These are stronger steering material than historical notes because they present implementation and acceptance requirements. Before another build, amend or QC, explicitly retire their visual contracts through the existing amendment process. Preserve the originals and their hashes; do not silently rewrite sealed plans.

**Unknown:** the current GitHub issue 151 body. Its local mirror is stale, but I did not access an account-connected service. If the live body matches, append an explicit supersession notice pointing to the restart rulings.

3. **High: do the deferred process reconciliation before the next visual stage.**

This is a recommendation, not authorization to change the flow. The conflict remains verified:

- `feature/SKILL.md:41` says “no browser, screenshot or visual-probe step is mandatory”.
- Lines 69 and 105 make the six-section text document the approval artifact.
- The UI bundle at line 87 and reviewer mappings at line 172 and `qc/SKILL.md:117` omit `reference-led-design`.
- Feature’s lens card at lines 162 onward and QC’s at line 115 contain no visual assessment lens.
- `amend/SKILL.md:64` and line 69 reference a “UI checkpoint” that does not exist in the current feature skill.

The smallest pass is conditional on new or rejected visual work: require rendered directions beside the board during existing plan approval; carry verbatim feedback, criteria and accepted-image paths into slices and planning briefs; include the new skill in applicable loading and reviewer instructions; pass board images and QC screenshots to reviewers; add “does it land against these references?” to the existing review. Replace the dead checkpoint reference. Preserve existing approval stages, runtime limits and rosters.

4. **Medium: global defaults still steer appearance, although they are not old Oparax palette rules.**

The inspected global SKILL.md files match this lane’s snapshots.

| Global source under `~/.agents/skills` | Verified wording | Smallest fix |
|---|---|---|
| `frontend-design/SKILL.md:59` | “Spend your boldness in one place.” | Make this conditional on owner criteria. Line 45 already says the brief wins, so claiming this skill has no precedence protection would be inaccurate. |
| `react-bits-pro/SKILL.md:641` | “One accent colour… repeated at most once.” | Restrict Job B appearance defaults to unbriefed work; owner references govern a redesign. |
| `design-review/checklist.md:28` | “Restrained palette; accent color used sparingly” | Judge against accepted owner criteria instead of imposing a color budget. |
| `shadcn/SKILL.md:33` | “Never override component colors or typography.” | Distinguish preserving primitive behavior from approved visual adaptation. |
| `beautiful-shadows/SKILL.md:14` | “Use these exact Tailwind classes.” | Treat recipes as optional material chosen against the accepted render. |

Prefer an explicit Oparax precedence rule over deleting useful vendor guidance globally. The council manifest registers `reference-led-design`, but `council/scripts/review_guidance.py:231` generates an index without aesthetic precedence. Add that precedence to the generated index.

Claude’s `frontend-design` is a separate matching copy, so changing only the canonical file would leave it stale. Codex’s corresponding file resolves to the canonical skill.

5. **Medium to low: evidence routing and completion claims need qualification.**

Verified: no tracked literal references to the deleted design files survived my search. No product paths changed in this commit. `DESIGN.md` still exists, keeping build guards and ship sweep references valid. This is static evidence, not runtime proof.

Two evidence references became hollow: `decisions.md:19` and line 20 cite `DESIGN.md` for container wrapping and the home-link rule, but the stub contains neither. Cite the archived version.

Ignored scratch instructions also remain misleading. `scratch/design-recovery/README.md:15` says “The original navy, white and blue palette is restored”; `pro-exploration/agent-brief.md:7` directs agents to the deleted handoff. Mark these entry points superseded while preserving their evidence.

The new decisions cite three locally existing, untracked verdict files. Fresh clones cannot read them. Preserve the current verbatim evidence in a tracked home without reinstating old theme mandates.

Claude project memory is absent and `~/.codex/memories` is empty. Other memory services, retained conversation context and uninspected global guidance remain unknown.

“Everything related to design theming” is not literally removed: product theming was deliberately retained. Even within the approved narrower scope of removing operative old guidance, the two active tracked passages and stale feature contracts remain.