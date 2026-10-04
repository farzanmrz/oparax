RESULT: FINDINGS

Scope note: this lane has no terminal, so I could not run `git show 2170c23` or `git ls-files`. Git status is clean on `ft/151`, so I verified the end state by reading files at HEAD and running `rg`-equivalent searches over the tree (which skip git-ignored paths; I read `.feature/` and global skills directly by path). Diff stats (25 files, 580 lines) are unverified. The archive tag `archive/design-theming-2026-10-02` exists (verified in `.git/refs/tags/`).

## Q1. Old theming guidance still in tracked files at HEAD

**Verified, guidance (should go or be marked):**

1. `docs/references/decisions.md:168`, a LOCKED September 28 owner entry: "the look is stock shadcn Mira now, with Claude Design per page later at his word". AGENTS.md:13 tells agents to quote decisions.md rulings rather than re-argue, and only dated owner passages count as his decisions; this is a dated owner passage stating the old look and the retired Claude Design path, directly contradicting the new October 1 to 2 section at :212-228. The removal plan's rows 26-37 never listed line 168. This is the most dangerous survivor in the repo.
2. `docs/roadmap.md:122`: "The look is stock shadcn Mira now, Claude Design per page later at his word." The plan removed :93 and :151 but not :122, which sits in the current-process narrative an agent reads before planning.
3. `.claude/skills/feature/SKILL.md:87` (ui bundle row): "frontend-design for composition within the accepted reference and design contract". "Design contract" wording survives and now points at a stub; minor, but it is old visual-contract framing.

**Verified, product code or evidence (should stay):** `app/layout.tsx:7,15,55` (Hanken), `app/opengraph-image.tsx:13,19-26,42,58` and `assets/fonts/` (Nunito, Source Sans 3), `app/globals.css` tokens, `components.json` Mira/zinc, `repo.md:26,110` (factual description of installed primitives), `state-history-2026-09-30.md` (verbatim archive; the honesty sentence "Design-theming passages were removed on October 2, 2026" was appended at :3 as planned), `supabase/migrations/...seed_sources.sql:297` and `docs/source-table-seed.json` ("Claude Design" inside seeded third-party article text, untrusted data, correctly untouched).

**Verified, stale but harmless:** `app/globals.css:7` comment "Semantic tokens implement DESIGN.md's September 29 palette reference." The plan claimed the stub keeps this valid; the stub contains no palette reference, September 29 or otherwise, so the comment now cites content that does not exist. Same shape at `app/opengraph-image.tsx:12` ("The site's own fonts (DESIGN.md)"). Product code was deliberately untouched, but the plan's "stub keeps all 14 inbound references valid" is only true for the file name, not the cited content. `docs/references/state.md:3` still reads "Updated September 30, 2026" above the new October 2 design paragraph (audit row 21 flagged this; the plan did not fix the stamp).

## Q2. Breakage from the commit

Verified clean: no tracked reference to `design-toolkit-proof`, `claude-design-handoff`, or the `design-system/` path survives; the folder is gone; `.claude/settings.json` hooks are biome-write, feature-flow and headless-guard only (no design-sync); ship's sweep list names `DESIGN.md`, which exists as the stub; AGENTS.md routing, feature:45/59/145, build:41/54, qc:95 and amend:40 all resolve. The one real contradiction with the new decisions section is the surviving :168 entry (Q1.1). Unknown: `public/lab` is a dangling symlink (read fails, search tools error on it); I cannot tell whether it is tracked or related to this commit.

## Q3. Outside the repo, still carrying old guidance

- **`.feature/amend-151-1.md` (verified, highest risk here):** lines 87-89 still carry the full executable contract: "Design contracts, from DESIGN.md and the design brief", the complete navy token table (`--primary #245dec / #6b94ff`, `--background #f6f8fc / #090f1d`, etc.), and "`Hanken_Grotesk` ... replaces Nunito Sans, Source Sans 3 and JetBrains Mono". A future amend or QC run treats these as binding build contracts and could "fix" the product back to the old theme. Smallest fix: the audit's E33 banner at the top of each `.feature/` plan file. I verified amend-151-1 only; plan-151*.md and issue-body.md are inferred from audit row 59.
- **Global skills (verified by reading the files):** `~/.agents/skills/react-bits-pro/SKILL.md:51` still says "This document is the single source of truth. Follow it literally", with the one-accent defaults; `~/.agents/skills/frontend-design/SKILL.md:47-53` still mandates the text-first hex-list-plus-ASCII plan and :59 "Spend your boldness in one place"; the design-review snapshot (a copy of the global) still has checklist.md:28 "Restrained palette; accent color used sparingly" plus the telemetry ping and Pro upload instructions at SKILL.md:14,63-77. None carries a precedence line toward reference-led-design, and feature's ui bundle loads them for every screen. Smallest fix: one line at the top of each, "the owner's verbatim words and reference-led-design outrank this file's look defaults" (audit E34-E36), and confine react-bits-pro's "single source of truth" to API and licensing. beautiful-shadows black-alpha presets and the shadcn grey-primary guidance are inference from the audit (GS-26, GS-46-50), not re-verified by me.
- **Council reviewer manifest (verified improved):** the snapshot `manifest.json` and `index.md` now include reference-led-design and describe it as "The owner's accepted design method", so lanes can find it. The vendor skills it sits beside are unchanged, so the "listed as equals" concern is only half answered.
- **GitHub issue 151 body:** unknown. I cannot read it read-only from here; inference from `.feature/issue-body.md` existing is that it carries the same September 29 text. Smallest fix: one superseded note comment, not a rewrite.
- **Claude/Codex memory:** unknown; the audit says no project memory files exist and the Basic Memory store was not searched. I did not search it either.

## Q4. The deferred process conflicts (plan section 1e)

Yes, do it now, before feature 151's design implementation starts, because that run is the first one that will hit the contradiction. Concretely, and no more:

1. Add `reference-led-design` to the three lists together: `feature/SKILL.md:87` (ui row), `:172` and `qc/SKILL.md:117` (verified absent from all three). Today the skill is reachable only through AGENTS.md:13, state.md:13, DESIGN.md and design-tooling.md:3; the bundle machinery that actually loads skills per screen never names it.
2. Reconcile `feature/SKILL.md:63` (blocks, depth and motion "written into that slice ... so the build does not guess them" before any render) and `:105` (owner approves a text document) with the skill's show-rendered-pages step. The new sentence at `:59` ("For any new look, follow the global reference-led-design skill") already points the right way; the two older passages now contradict it inside the same file.
3. `qc/SKILL.md:95` still grades against "the slice's selected template/block and accepted preview"; "accepted preview" is undefined after the removal (audit row 34). Point it at the board and rejected renders.
4. `amend/SKILL.md:67`'s "one or two sentences" cap should exempt verbatim visual feedback, per RLD's never-summarize rule.

Defer the lens-list additions (feature:162-170, qc:113-118) if scope must shrink; they matter less than the four above.

## Q5. Remaining items, ranked by risk

1. `decisions.md:168` and `roadmap.md:122` (verified): LOCKED owner-attributed statements of the old look and the Claude Design path in the two files agents are ordered to quote. Delete or mark superseded; this was a plan omission, not a deliberate keep.
2. `.feature/amend-151-1.md` and siblings (verified for one file): executable old-theme contracts; one banner each.
3. Global vendor skills claiming final authority with no precedence line (verified): react-bits-pro, frontend-design, design-review. One line each.
4. The 1e process conflicts (verified): will steer the imminent 151 design run; do Q4 now.
5. Stale pointers and stamps (verified, low): `globals.css:7`, `opengraph-image.tsx:12`, `state.md:3` date, feature:87 "design contract" wording.
6. Unknowns to close cheaply: issue 151 body, Basic Memory store, `public/lab` symlink, and the commit's diff stats, none of which I could verify in this lane.

What I could not verify: the commit diff itself, issue 151, memory stores, and the beautiful-shadows/shadcn specifics. The tracked-file removal is otherwise as thorough as the plan claimed; the gaps are one omitted decisions entry, one roadmap line, and everything outside the tracked tree.