RESULT: FINDINGS

Verified by direct read or grep unless noted.

**Q1. Old theming guidance still in tracked files.**
- `docs/references/decisions.md:168` (LOCKED build-process entry): "the look is stock shadcn Mira now, with Claude Design per page later at his word." Guidance that should go; it asserts a look. The plan never listed this line for deletion (it listed :165, :187-188, :198, :208, :211, :218-221, not :168).
- `docs/roadmap.md:122` and `:135` (section 13): "The look is stock shadcn Mira now, Claude Design per page later at his word" and "rebuilt on stock shadcn Mira on September 24 (see `DESIGN.md`), so issue 1 starts in the new look." Same surviving look statements; the plan targeted `:93` and `:151` only.
- `docs/references/state-history-2026-09-30.md:30, :52`: "DESIGN.md caps content at 1356 px" and "full-width frame or the 1356 px cap (DESIGN.md)". Evidence/archive, should stay; the banner at :3 marks theming removed.
- Product code correctly kept: `app/layout.tsx:7,15,55` (Hanken), `app/opengraph-image.tsx:13-58` (Nunito/Source Sans), `assets/fonts/OFL-NunitoSans.txt`, `app/globals.css:7`. The `supabase/...seed_sources.sql:297` and `docs/source-table-seed.json:1104` "Claude Design" hits are a Futurepedia newsletter description, not guidance.
- `DESIGN.md`, `state.md`, `AGENTS.md`, `design-tooling.md`, `repo.md`, `engineering.md`, `setup.md`, the new `decisions.md` October section: all clean.

**Q2. Breakage.** No dangling links to the deleted `design-system/`, `design-toolkit-proof.md` or `claude-design-handoff.md` (grep returned none in tracked files). `DESIGN.md` stub keeps its 14 inbound references valid. `.gitignore` no longer carries the `design_handoff` entry. No `.claude/scripts` or hook reads a deleted file. One real contradiction: `decisions.md:168` ("the look is stock shadcn Mira now, Claude Design per page later") vs the new October section ("earlier palette, font, theme and direction rulings no longer bind"). The older entry survives and says the opposite of the new one.

**Q3. Outside the repo, read by agents.**
- `.feature/amend-151-1.md`, `plan-151*.md`, `issue-body.md` (git-ignored) and the GitHub issue 151 body: Hanken tokens and "the look you approved on September 29" (audit row 59). These are executable build contracts an amend or QC could revert the product to. Inference: I cannot read git-ignored `.feature` or the GitHub issue from here.
- Global skills in `~/.agents/skills` (`frontend-design`, `react-bits-pro`, `design-review`, `beautiful-shadows`, `shadcn`): the audit rows 11, 12, 19, 60 to 68 found old guidance ("restrained palette", "single source of truth, follow it literally", "one accent at most once", "Spend your boldness in one place", black-alpha shadow presets). I read the snapshot copies in `review-guidance/skills/`; the live `~/.agents` copies are outside the workspace, so which wording they carry now is inference, not verified.
- The council reviewer manifest (`review-guidance/manifest.json:1473`) does include `reference-led-design`. Verified.

**Q4. The section 1e process conflicts.** Not all now. The one highest-leverage piece is audit E22: add `reference-led-design` to the three feature-flow skill lists (`feature/SKILL.md:87`, `:172`, `qc/SKILL.md:117`). Without it, a design agent loading only the ui bundle never sees the skill, and audit P0 row 15 stands. That is a one-line edit to three files and should be done now. The rest (E23 to E29: the visual lens, the text-plan-before-render trigger, the slice fields) is larger and edits the feature flow's process contracts before any new design exists in feature 151, which is the bolt-on the planning principles warn against. Defer those until feature 151 builds the new design.

**Q5. Anything else, ranked by risk.**
1. The three surviving "look is stock shadcn Mira now, Claude Design per page later" lines (`decisions.md:168`, `roadmap.md:122`, `:135`) contradict the October section and would steer a builder toward the rejected look. Fix: delete or rewrite those three sentences.
2. `.feature` and GitHub issue 151 bodies still carry Hanken tokens and "the look you approved on September 29" (audit row 59). Fix: a superseded banner.
3. Global skills still carry "restrained", "one accent at most once", "Spend your boldness in one place", black-alpha shadows (audit rows 11, 12, 19, 60 to 68). A fresh design agent loading one never reaches `reference-led-design`. Fix: a one-line precedence each.
4. `feature:87/:172` and `qc:117` omit `reference-led-design` (audit row 15). Fix: E22.
5. `state-history` archive lines :30, :52 are acceptable because the banner marks theming removed.

Unknown: the live `~/.agents/skills` wording (snapshot may differ from live), the GitHub issue 151 body, and any Claude/Codex project memory.