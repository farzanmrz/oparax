# Removal plan: old design theming guidance (for the owner's yes)

Status: PLAN ONLY. Nothing has been edited, deleted or committed. Written read-only on top of `AUDIT.md` and its five area files, re-checked against the repo at `ft/151` HEAD `867c023` (plus the uncommitted AGENTS.md line).

Owner's order (verbatim, relayed by the host): "absolutely annihilate and remove everything related to design theming, all of it, anywhere in the entire repository, and commit that, because we are literally setting our design system up right now."

What "theming" covers here: palette and colors, color rules, fonts and type rules, theme and light/dark rules, radius and shadow rules, logo color rules, vendor styling rules, visual-direction rulings, design exploration history, design review steps that encode the old taste, and Claude Design handoff notes. Scope is TRACKED files only (`git ls-files`); `scratch/`, `.feature/` and global skills are listed at the end as not touched.

## 0. The one design choice in this plan: keep a DESIGN.md stub

Fourteen tracked places point at `DESIGN.md`, including two product-code comments this plan must not touch (`app/globals.css:7`, `app/opengraph-image.tsx:12`) and the approval guards in the build, feature and ship skills. Deleting the file outright would leave those dangling. Recommendation: empty DESIGN.md down to a short pointer stub (text in section 1, row 1). The guards then still mean "the design system needs the owner's yes", and the new design system can fill the same file later. Alternative if he wants the file gone: delete it and re-point the 14 references (listed in section 3).

## 1. Files and passages to remove

Actions: DELETE FILE, DELETE SECTION (lines), DELETE SENTENCE, REPLACE WITH POINTER. Line numbers are current HEAD (AGENTS.md includes the uncommitted line). Proposed pointer wording uses "the global `reference-led-design` skill" and "the owner's dated design rulings in `docs/references/decisions.md`" (see flag 6 on why decisions.md and not LOCKED-PLAN).

### 1a. Whole files

| # | File | Lines | Short quote | Action | Inbound links and how they are handled |
|---|---|---|---|---|---|
| 1 | `DESIGN.md` | 1-82 (all) | "Restrained navy/blue around direction 1..." (L23); palette hex table L32-41; "Explore within this navy/blue family" (L43); "Hanken Grotesk" (L9, L24); "restrained shadows" (L25, L67) | REPLACE WITH POINTER (stub, 3 lines): `# Oparax Design System` / "Being set up from scratch (owner, October 2, 2026). Earlier palette, font, theme, depth and direction guidance was removed; it is recoverable only from git history (`867c023`). For visual work follow the global `reference-led-design` skill and the owner's dated design rulings in `docs/references/decisions.md`. Changes to this file and to the theme tokens in `app/globals.css` still need the owner's explicit approval in his current session." | Stub keeps all 14 inbound references valid (section 3). Also lost with the old text, not theming but design-system rules: 44px/24px touch targets, 90% width up to 1800px, header/footer frame, footer links, AA list, "stock Mira, never hand-edited". Stock-primitive rule survives in engineering.md:11; frame and width survive in LOCKED-PLAN L10. Owner may ask to keep these few lines in the stub. |
| 2 | `design-system/` (9 files: README.md 8, tokens.css 84, previews/preview.css 43, colors/type/buttons/inputs/dialog/frame.html 77) | 212 total | "Historical September 24 export... Zinc and the prior Nunito Sans, Source Sans 3 and JetBrains Mono" (README:3); `--primary: oklch(0.555 0.15 245)` (tokens.css) | DELETE FOLDER | Not imported by any product code (checked). Referenced by state.md:27, repo.md:46, repo.md:114, setup.md:70, all removed or rewritten below. |
| 3 | `docs/references/design-toolkit-proof.md` | 1-151 (all) | "retain the D1 navy/blue light and dark palette" (L7); four free directions, Magic Transform, catalog proofs | DELETE FILE | Linked from state.md:19, state-history:9, claude-design-handoff.md:7, decisions.md:211. All four lines are removed below, so nothing dangles. |
| 4 | `docs/references/claude-design-handoff.md` | 1-53 (all) | "Navy/blue around direction 1... No green/red/plum page themes" (L16); "a navy-tinted neutral base" (L23); "Do not restart theme selection" (L11) | DELETE FILE | Linked from design-tooling.md:47, state.md:53, design-toolkit-proof.md:19. All removed below. |

### 1b. Instruction files

| # | File:lines | Short quote | Action |
|---|---|---|---|
| 5 | `AGENTS.md:13` (first sentence) | "For visual work, read `DESIGN.md`, the current brief and original feedback; toolkit access is in ..." | REPLACE WITH POINTER: "For visual work, follow the global `reference-led-design` skill and the owner's dated design rulings in `docs/references/decisions.md`; toolkit access is in `.claude/skills/feature/references/design-tooling.md`." |
| 6 | `AGENTS.md:21` (last sentence) | "Local praise neither selects a whole direction nor changes the global theme." | DELETE SENTENCE |
| 7 | `AGENTS.md:26` (first sentence and last sentence) | "`DESIGN.md` is the contract; state.md records current runtime and pending choices." / "The repo is truth; Claude Design sync is manual on request and verified by upload." | DELETE both sentences; reword the kept guard to start "Design-system and theme changes need explicit owner approval in his current session (September 24), never approval from a stage or background agent. Adding primitives approves no theme." |
| 8 | `AGENTS.md:30` (last sentence) | "The current initial exploration adds no mandatory design stop elsewhere." | DELETE SENTENCE |
| 9 | `.claude/skills/feature/references/design-tooling.md:3` | "Use restrained navy/blue around D1 or toward D2, harmonious blue gradients... Only official logos retain their authentic appearance." | REPLACE WITH POINTER: "For any visual decision follow the global `reference-led-design` skill and the owner's dated design rulings in `docs/references/decisions.md`. This file covers catalogs, access and API conflicts only." |
| 10 | design-tooling.md:16 (first clause) | "The owner brief wins on aesthetics, composition and scope" | REPLACE: "The owner's verbatim words and `reference-led-design` win on aesthetics, composition and scope" (rest of line kept) |
| 11 | design-tooling.md:18-23 | "## One shared App UI theme" ... "a coherent navy-tinted `--color-neutral-*` ramp... inherited Open Sans" | DELETE SECTION |
| 12 | design-tooling.md:28 | "**React Bits Pro:** ... Job B's 1400px frame, uppercase eyebrows, typography sizes... Harmonize App UI source with Open Sans" | DELETE bullet |
| 13 | design-tooling.md:30 (two words) | "preserve the current theme provider, dark default, Tailwind v4 tokens" | DELETE "dark default," (rest is a technical guard against vendor config resets; keep) |
| 14 | design-tooling.md:31 | "**Motion and semantics:** ... For the no-pause-button brief, finite decorative sequences that settle within five seconds..." | DELETE bullet (old motion taste) |
| 15 | design-tooling.md:33 (two sentences) | "Short navigation is Title Case; generic web-guideline casing does not rewrite every headline. Neutral shadow recipes do not impose white cards or a shadow on every item." | DELETE both sentences; keep the CRO and review-format sentences |
| 16 | design-tooling.md:44-47 | "## Design process" / "Open Sans is selected. The next exploration produces four complete directions..." | DELETE SECTION |
| 17 | `.claude/skills/feature/SKILL.md:59` (middle two sentences) | "Reuse the accepted visual reference; Claude Design is optional. The setup is not approval of a new appearance: respect DESIGN.md until a rendered direction..." | REPLACE WITH POINTER: "For any new look, follow the global `reference-led-design` skill." (first and last sentences kept) |
| 18 | feature/SKILL.md:87 (one clause in the ui row) | "read root `DESIGN.md` first, the binding visual contract;" | DELETE clause |
| 19 | feature/SKILL.md:145 (last sentence) | "An owner-supplied Claude Design export can provide the reference but is not required." | DELETE SENTENCE |
| 20 | `.claude/skills/qc/SKILL.md:95` (one clause) | "accepted preview (including a Claude Design export when provided), plus DESIGN.md, following ..." | DELETE "(including a Claude Design export when provided), plus DESIGN.md," |
| 21 | `.claude/skills/amend/SKILL.md:40` (one clause) | "; Claude Design is optional" | DELETE clause |

### 1c. Docs and records

| # | File:lines | Short quote | Action |
|---|---|---|---|
| 22 | `docs/references/state.md:13-19` | "restrained navy/blue around D1 or toward D2... No green/red theme exploration" (L13); typography selector URL (L15); four Pro directions sequence (L17); design-toolkit-proof link (L19) | REPLACE WITH POINTER (one paragraph under the kept heading L11): "The design system is being set up from scratch (owner, October 2, 2026). Earlier palette, font, theme and direction guidance was removed from the repo; do not rebuild it from git history. Follow the global `reference-led-design` skill and the owner's dated design rulings in decisions.md. Product runtime keeps its current theme until feature 151 implements the new design." |
| 23 | state.md:26-27 | "DESIGN.md is the contract... Claude Design synchronization is manual... `design-system/` remains the historical September 24 export" | DELETE (blank line plus paragraph) |
| 24 | state.md:43-50 | "## Readiness review, latest September 30" ... "Project routing now resolves Pro default templates against the owner brief... font mandates, theme resets" | DELETE SECTION (design-exploration readiness history; judgment call, it also carries tooling-audit history, which stays in git) |
| 25 | state.md:53-55 | "Set the shared App UI theme's four knobs once: Open Sans, navy/blue base..." / "Render four complete Pro Exploration directions" | REPLACE WITH POINTER under kept "## Next": "Set up the design system with the owner (see Current design task)." |
| 26 | `docs/references/decisions.md:19` | "**The current look stays.** SUPERSEDED and APPLIED... preset `bzq0WEyKe` (Mira, Zinc, Blue)... Nunito Sans... Source Sans 3... JetBrains Mono" | DELETE entry |
| 27 | decisions.md:20 | "**The design system rebuilt on Mira.** ... Primary is the old Oparax blue... `oklch(0.555 0.15 245)`" | DELETE entry (the stock-primitive rule survives in engineering.md:11) |
| 28 | decisions.md:21 | "**Site-wide type rules.** ... Page titles normal weight, Title Case; section headings bold" | DELETE entry |
| 29 | decisions.md:123 | "**Design moves to Claude Design**... the export is the plan's visual contract" | DELETE entry |
| 30 | decisions.md:165 (last clause) | "an approved change triggers the design-sync hook, which makes Claude re-sync Claude Design" | DELETE clause; keep the approval guard |
| 31 | decisions.md:187-188 | "**Preview foundation becomes the working design baseline**... the current preview palette, general typography" | DELETE entry plus blank line |
| 32 | decisions.md:198 | "**Remove the automatic Claude Design reminder.**" | DELETE entry |
| 33 | decisions.md:208 (heading) | "## September 30 tooling and design realignment" | RENAME to "## September 30 tooling realignment" |
| 34 | decisions.md:211 | "**Font selection and design sequence.** ... retaining D1's liked navy/blue palette" | DELETE entry |
| 35 | decisions.md:218 | "**Open Sans and restrained blue foundation.** LOCKED... No green/red page themes." | DELETE entry |
| 36 | decisions.md:219 (title and last two sentences) | "**Retained branches and Claude handoff.**" ... "then hand local Claude orchestration a complete prompt for imaginative Pro component exploration. This does not authorize another production implementation before page acceptance." | EDIT: title "**Retained branches.**", delete the handoff sentences; keep the branch ruling |
| 37 | decisions.md:220-221 | "**Only official logos retain their appearance.** ... restyled within selected Open Sans and navy/blue" | DELETE entry plus preceding blank line |
| 38 | `docs/references/state-history-2026-09-30.md:9-10` | "**Active design-toolkit proof**... read [design-toolkit-proof.md]" | DELETE paragraph plus blank line |
| 39 | state-history:29 | "**Design investigation, September 29**... the preview palette/type reference" | DELETE bullet |
| 40 | state-history:33 | "**Design tooling setup, September 28**... No new template, font, or visual direction has been approved... JetBrains Mono attribution" | DELETE bullet |
| 41 | state-history:45 (end of bullet) | "; DESIGN.md is the contract and Claude Design is synced." | DELETE clause (end the sentence after "setup.md)") |
| 42 | state-history:100 | "**Visual contract:** `DESIGN.md` is the whole design contract... preset `bzq0WEyKe`: Mira, Zinc... the three fonts" | DELETE bullet |
| 43 | state-history:150 (last sentence) | "Radius, font roles and color meanings are fixed by `DESIGN.md`." | DELETE SENTENCE |
| 44 | state-history:3 (append) | "This is a verbatim preservation..." | ADD one sentence: "Design-theming passages were removed on October 2, 2026; the full text is in git at `867c023`." (keeps the archive honest about its edit) |
| 45 | `docs/roadmap.md:11` (last two sentences) | "Current tooling work selects no font or theme; font choice remains pending. The next design sequence and evidence are in [references/state.md]..." | DELETE first sentence only; keep the state.md pointer |
| 46 | roadmap.md:93 (last sentence) | "The look is DESIGN.md (stock shadcn Mira, rebuilt September 24); the owner designs the pages in Claude Design and the export is the plan's visual contract (owner, September 23)." | DELETE SENTENCE |
| 47 | roadmap.md:151 | "- The look is DESIGN.md (stock shadcn Mira, September 24); pages are designed in Claude Design. DESIGN.md and the theme change only on his explicit approval" | DELETE bullet (the approval guard lives in AGENTS.md:26 and decisions.md:165) |
| 48 | `docs/references/repo.md:46` | "design-system/  historical September 24 export and preview cards" | DELETE line (folder deleted) |
| 49 | repo.md:111 (parenthetical) | "never hand-edited (DESIGN.md)" | REPLACE "(DESIGN.md)" with "(engineering.md)", where the rule now lives |
| 50 | repo.md:114 | "**Fonts and theme**: current `app/layout.tsx` loads Hanken Grotesk... navy/blue... The owner selected Open Sans throughout..." | REPLACE with a taste-free fact: "**Fonts and theme**: `app/layout.tsx` loads the runtime font and theme provider; tokens live in `app/globals.css`; `assets/fonts/` holds the share-image fonts and licenses." |
| 51 | `docs/references/engineering.md:12` (last sentence) | "Follow `DESIGN.md` roles and approved typography; distinguish the selected target from runtime migration status." | DELETE SENTENCE |
| 52 | `docs/setup.md:68-71` | "## Claude Design" / "Design-system project **Oparax** (id `14526a56-...`) holds a synced copy of `design-system/`... the design-sync hook" | DELETE SECTION (note: this also drops the Claude Design project id; keep one line if he wants the account recorded) |
| 53 | `.gitignore:23-24` | "# Canonical UI handoff bundle remains local..." / "design_handoff_oparax_ui/" | DELETE (Claude Design handoff ignore entry; the folder does not exist, so nothing becomes trackable). Optional. |

### 1d. Checked and deliberately kept (not theming)

- AGENTS.md "Visual feedback" section (L15-22) except the one sentence in row 6: it is about reading dictated annotations, not the look.
- AGENTS.md:28 tool roles (shadcn and Mira controls, React Bits Pro, AI Elements), design-tooling.md roles L5-14, AI Elements and accessibility conflict bullets (L29, L32), source access and licensing (L35-43).
- Approval guards that name DESIGN.md or theme tokens: feature/SKILL.md:45, :145 (first part); `.agents/skills/build/SKILL.md:41, :54`; ship/SKILL.md:17, :23, :27 sweep list (guarded by `[ -e ]`). With the stub they stay correct.
- decisions.md:22 (text fills its container), :23 (logo links home), :124, :125, :128, :131, :185, :189, :191, :205: layout, navigation, tooling and process rulings, not theming. Row 22 is layout and can be added if he wants layout gone too.
- engineering.md:15 (committed fonts and SVG brand marks for generated images: an engineering rule for the share image) and :24 (QC screenshot exception).
- `.claude/scripts/feature-pair.py` design-review phase (process: compare images to the agreed direction; no taste encoded).
- docs/discovery/** (customer discovery evidence; the AGENTS.md archive rule names it).

### 1e. Not theming but conflicts with the new method (audit rows 13, 14, 33, 37, 38, 39): left for a separate pass

feature/SKILL.md:41, :63, :69-78, :105, :162-170; qc/SKILL.md:113-118; amend/SKILL.md:64, :67, :69; planning-protocol.md:7. These encode the old process (text plan before render, no visual lens), not palette or fonts. Recommend handling them after the new skill is wired in (audit E22 to E29), not in this commit.

## 2. Product code that implements the current theme (KEEP until the new design is implemented in feature 151)

Do not delete or edit any of these in this commit; the running product depends on them.

| File:lines | What it carries |
|---|---|
| `app/globals.css` (169 lines): L7 comment, `:root` L8-42, `.dark` L43-76, `@theme inline` L77-121, base layer L122+ | The navy/blue semantic tokens, radius, font variables. L7 comment cites DESIGN.md (stub keeps it valid). |
| `app/layout.tsx:7, :15, :55` | Hanken Grotesk via `next/font/google` |
| `app/layout.tsx:8, :44-45, :64` | `next-themes` provider, dark default, theme-color hexes `#f6f8fc` / `#090f1d` |
| `components/theme-toggle.tsx` | light/dark toggle |
| `components.json` | `radix-mira` style, `baseColor: zinc`, `menuColor`, `menuAccent`, theme registries |
| `components/ui/` (28 stock Mira primitives) | themed through tokens |
| `app/opengraph-image.tsx:12, :40-45` | share-image hex colors; comment cites DESIGN.md (stub keeps it valid) |
| `assets/fonts/` (Nunito Sans, Source Sans 3 TTFs and OFL licenses) | fonts the share image loads at runtime |
| `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `public/oparax-logo-dark.png`, `public/email-logo.png`, `components/logo.tsx`, `components/brand-icon.tsx` | logo and mark colors |
| `lib/brands/marks.ts` | official platform mark colors (`#4285F4` etc.) |
| `components/landing/ambient-waves.tsx:139` | hard-coded accent `#6b94ff` / `#245dec` |
| `components/landing/scene/source-stack.tsx:7`, `components/monitor/item-card.tsx:7` | inline shadow recipes |
| `components/monitor/sources-list.tsx:38`, `state-banner.tsx:23, :74`, `components/settings/account-picker.tsx:126` | amber status colors |
| `components/ai-elements/tool.tsx:58-62` | vendor status colors |
| `app/global-error.tsx:38, :58`, `components/legal/legal-page.tsx:17, :26`, `components/auth-shell.tsx:33` | `font-heading` / `font-mono` role usage |

## 3. Inbound links (nothing breaks)

- To DESIGN.md (stub kept): AGENTS.md:13 and :26 (rewritten), feature/SKILL.md:45, :59, :87, :145, build SKILL.md:41, :54, qc:95, ship:17, :23, :27, engineering.md:12, repo.md:111, roadmap.md:93, :151, decisions.md:19-23, :165, :187, app/globals.css:7, app/opengraph-image.tsx:12. After this plan, the surviving ones are guards, decisions.md:22-23 "Evidence: DESIGN.md" (historical evidence lines) and the two product comments.
- To design-tooling.md (file kept, trimmed): AGENTS.md:13, feature:59, :145, build:54, qc:95, amend:40.
- To deleted files: design-toolkit-proof.md and claude-design-handoff.md and design-system/ have no surviving inbound links once rows 22-25, 34, 38, 48, 50, 52 are applied. Check after editing: `rg -n 'design-toolkit-proof|claude-design-handoff|design-system/' $(git ls-files)` must return nothing outside git history.
- If he prefers deleting DESIGN.md outright: re-point every DESIGN.md mention above to "the design system" and the two product comments stay dangling until feature 151 (product code is out of scope).

## 4. Repo rules that constrain this edit

1. **AGENTS.md size (9,000 characters and bytes).** Now 8,990 / 8,990 with the uncommitted line (HEAD: 8,949). Rows 5-8 applied: 8,739 / 8,739 (measured). Without the uncommitted line: about 8,698. Under the cap either way.
2. **"Later rulings outrank history; preserve archives and discovery evidence" (AGENTS.md:13).** This plan deletes archive material (design-toolkit-proof.md, the design-system export, handoff, design passages of state-history and decisions.md). The owner's explicit order is the later ruling; preservation is met by git history. Recommend a local tag before committing, matching the existing `archive/consolidation-2026-09-30/*` tags: `git tag archive/design-theming-2026-10-02 867c023` (local only unless he says push). Discovery evidence (`docs/discovery/`) is untouched. Ignored `scratch/` copies remain.
3. **"Contract and theme changes need explicit owner approval in his current session ... never approval from a stage or background agent" (AGENTS.md:26; decisions.md:165).** Removing DESIGN.md content is a contract change. The host must get his yes on this plan in his session; this background agent's plan is not approval. The theme tokens in `app/globals.css` are not changed.
4. **Uncommitted AGENTS.md change (`git diff AGENTS.md`).** One line at L46: "Evidence uses visible, plainly named, git-ignored `scratch/` subfolders." became "Scratch work requires explicit user authorization; use visible, plainly named, git-ignored `scratch/` subfolders." It is not theming and the audit (row 44) says he should decide it before commit. Ask one yes/no: include it in this commit? If no, commit only the theming hunks: write the edited AGENTS.md, then stage via `git diff AGENTS.md` filtered to rows 5-8 and `git apply --cached` (interactive `git add -p` is not available), leaving L46 dirty.
5. **Branch.** Current branch is `ft/151`, in sync with `origin/ft/151`. AGENTS.md:36 says "Meta and docs normally target beta unless the task says otherwise", while every recent meta and docs commit (`867c023`, `62c5d53`, `f1da394`) went to `ft/151` and state.md:31 says this work targets `ft/151`. Recommend `ft/151`; confirm with him.
6. **Pointer target.** The current rulings live only in git-ignored `scratch/design-recovery/focus-review/` (LOCKED-PLAN, OPEN-ITEMS, owner-verdict), invisible to a fresh clone, and LOCKED-PLAN L8 still lists the navy palette as a fixed input above the October 1 rejection. So pointers name `docs/references/decisions.md` (tracked, and AGENTS.md already says to append dated owner decisions there). Recording the October 1 and 2 rulings there is a separate step (audit E5, E9), not part of a removal commit. Until then the pointer leads to the skill plus an empty design record, which is the honest state.
7. **Commit convention (AGENTS.md "Feature flow and Git").** Dirty `.claude/` commits as `meta:` on the current branch; docs and meta use `meta:` or `docs:` (recent history). No force-push, no branch deletion. "Pushing ends the job": he said "commit"; ask whether to push.
8. **Date.** Records say October 2, 2026 for the verdict; this machine's date reads October 1, 2026. Use whichever date he confirms in the stub and pointers.

## 5. Size of the change

| Kind | Files | Lines removed (approx.) |
|---|---|---|
| Deleted files | 11 (design-system/ 9, design-toolkit-proof.md, claude-design-handoff.md) | 416 |
| DESIGN.md emptied to stub | 1 | 82 removed, 3 added |
| Edited files | 13 (AGENTS.md, design-tooling.md, feature/qc/amend SKILL.md, state.md, decisions.md, state-history, roadmap.md, repo.md, engineering.md, setup.md, .gitignore) | about 45 whole lines removed, about 30 lines rewritten in place |
| Total | 25 files touched | about 540 lines removed, about 15 added |

## 6. Proposed commit message

```
meta: remove old design theming guidance before the new design system

The owner ordered every design theming rule removed while the design
system is set up from scratch with the reference-led-design skill.
DESIGN.md becomes a pointer stub; the September 24 design-system export,
the Claude Design handoff and the design-toolkit exploration record are
deleted; palette, font, theme, Claude Design and old direction passages
are stripped from AGENTS.md, state.md, decisions.md, roadmap.md, repo.md,
engineering.md, setup.md, state-history, design-tooling.md and the
feature, qc and amend skills. Product code is unchanged until feature 151
implements the new design. Removed text stays in git at 867c023.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## 7. Not touched by this plan (outside tracked files)

- `scratch/**` (git-ignored): many superseded design briefs and renders (audit E31), and also the new design inputs (LOCKED-PLAN, OPEN-ITEMS, board). Deleting scratch is not committable and would destroy the new inputs; ask separately if he wants old scratch folders cleared.
- `.feature/amend-151-1.md`, `plan-151*.md`, `issue-body.md` (git-ignored): Hanken tokens and "the look you approved on September 29" (audit row 59). GitHub issue 151 bodies carry the same text. Not in the repo tree; flag before the next amend or QC.
- Global skills under `~/.agents/skills` and `~/.claude/skills` (frontend-design, react-bits-pro, design-review, shadcn, beautiful-shadows and others, audit E34-E40): outside this repository.
