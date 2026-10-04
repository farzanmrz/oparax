RESULT: FINDINGS

Tracked instructions still tell a design agent to keep the old look, and the files the new rulings point at still lock that look. Commit `2170c23` did remove the dedicated theme files. It did not make "no old theming guidance" true.

## 1. Tracked files at HEAD

Verified with `git ls-files` searches for the old palette, font, Claude Design, Mira-as-look, and visual-contract wording. No tracked hit remains for `design-toolkit-proof`, `claude-design-handoff`, or `design-system/`. Hanken, Nunito, Source Sans, and JetBrains survive only as runtime font code.

Guidance that should go:

- `docs/references/decisions.md:168` is still LOCKED and unmarked: "the look is stock shadcn Mira now, with Claude Design per page later at his word."
- `docs/roadmap.md:122` repeats that sentence. `AGENTS.md` tells every host to read the roadmap before planning. `docs/roadmap.md:135` adds: "rebuilt on stock shadcn Mira on September 24 (see `DESIGN.md`), so issue 1 starts in the new look."
- `app/globals.css:7`: "Semantic tokens implement DESIGN.md's September 29 palette reference." The tokens are the current product theme and should stay. This sentence is still a palette contract, and the stub no longer contains that palette.
- `DESIGN.md:3` says the old guidance "is recoverable only from git history (`867c023`)." `docs/references/state.md:13` says "do not rebuild it from git history." An agent can treat the stub as permission to restore the old file.

Archive that still contains the old look, but whose header says it is not current:

- `docs/references/state-history-2026-09-30.md:3` claims "Design-theming passages were removed." Lines 19, 30, and 33 still say Claude Design sync, "stock shadcn Mira," "DESIGN.md caps content at 1356 px," and "stock Mira now and Claude Design later." The same header says not to execute those claims. Risk is lower than the LOCKED lines above. The removal sentence is false.

Should stay:

- `AGENTS.md:28` names Mira as the control library. That is a toolkit rule, and it can be misread as the look.
- `docs/references/repo.md:110` and `components.json` record `radix-mira` as the installed primitive style.
- `docs/references/repo.md:113` is taste-free: the runtime font and tokens live in `app/layout.tsx` and `app/globals.css`.
- `app/layout.tsx` (Hanken Grotesk), `app/opengraph-image.tsx` (Nunito Sans and Source Sans 3 for the share image), `assets/fonts/`, and the token block in `app/globals.css` are the running product. The plan left them until feature 151.
- The Futurepedia seed text that mentions Claude Design is source content, not a design rule.
- `docs/references/decisions.md:161` is the approval guard and should stay. Its evidence label "AGENTS.md visual contract" now points at a phrase the file no longer uses.

## 2. What the commit broke

No dangling path to the three deleted documents showed up in the tracked search. `DESIGN.md` remains, so the ship sweep list and the `[ -e ]` guards still resolve. `.agents/skills/feature` and `qc` are short stubs that defer to `.claude/skills/`, and those stubs do not repeat the old palette.

The real break is contradiction. `decisions.md:216` says earlier palette, font, theme, and direction rulings no longer bind. Lines 168 and roadmap line 122 still state the September 28 look as current. Later rulings outrank history only if the reader applies that rule. These lines are not marked superseded.

## 3. Outside the repo

These would steer the next design agent:

- `.feature/plan-151-owner.md:63`, `.feature/amend-151-1-owner.md:7`, and `.feature/issue-body.md:64` still say the product gets "the look you approved on September 29": cool blue-gray, blue accent, Hanken Grotesk. `.feature/amend-151-1.md:87-88` and `:198` specify the hex tokens and Hanken migration. The feature skill treats that plain plan as final. Smallest fix: one dated supersession note at the top of those files, and the same note on the look paragraph of issue 151. Do not delete the plans.
- The live GitHub issue 151 body is unknown. `gh issue view 151` returned HTTP 401.
- `scratch/design-recovery/focus-review/LOCKED-PLAN.md:1-8` still says read it before any design step, then locks "Open Sans; dark default; navy/blue ... no green, red, plum, pink or lavender" as fixed inputs. `decisions.md:214` sends agents to that folder. `OPEN-ITEMS.md` records later product decisions and does not strike line 8. Smallest fix: mark that palette block superseded by the October 1 to 2 rulings, and keep the later owner additions.
- Other scratch briefs (`build-brief.md`, `grok.md`, `taste-ds.md`, `RUN-STATE.md`) still state the same lock. They are not on the host's read path unless someone opens them. Do not delete the folder. It also holds the new board and verdicts.
- Global `frontend-design`, `shadcn`, `react-bits-pro`, `beautiful-shadows`, and `design-review` do not contain the Oparax navy, Hanken, or "no green/red" rules. `frontend-design` still says keep everything "quiet and disciplined," which can fight "life in the colors." `reference-led-design` already says those generic warnings yield. No manifest edit is required. `~/.agents/skills/council/references/reviewer-skills.json` only points at those skills.
- A standing Claude or Codex memory file that binds the old palette was not found. Matches under `~/.claude/projects/.../tool-results/` are captured tool output, not a start-up rule. Whether a live Basic Memory note still says it is unknown.

## 4. The process conflict

Do this as its own pass before the next design `/feature` or build, and get a yes first. It changes a locked September 29 process rule ("no automatic ... design-review calls," `decisions.md:191` and `docs/references/repo.md:116`).

`reference-led-design` step 7 says to show pages rather than a memo. Its coexistence section also says the skill adds no mandatory stop and changes no review roster, so the feature flow still wins. Today that flow is:

- `.claude/skills/feature/SKILL.md:41`: no browser, screenshot, or visual probe is mandatory.
- Lines 59 to 78: each screen is one prose line, then a text plan is approved before any render.
- Line 87: `design-review` is a QC skill, not a planning skill.
- Lines 162 to 170: the critique lenses have no "does this land" check.
- `.claude/skills/qc/SKILL.md:95` reviews an accepted preview for layout and contrast. The lens card near line 115 has no life check.
- `planning-protocol.md:3` and `:7` lock the plain plan before a render exists.

The pass should be narrow. For a change of look, the owner approves dark and light pages against the board before the plain plan locks appearance. Critique and QC gain one visual question: could this be mistaken for a render he rejected? Non-visual features keep the text plan.

## 5. What remains, by risk

1. The 151 plain plans will be treated as the approved look on the next amend or QC.
2. `LOCKED-PLAN.md` re-locks navy and "no green/red," and the new decisions file points at it.
3. `decisions.md:168` and `roadmap.md:122` still prescribe Mira now and Claude Design later.
4. The `globals.css` comment and the `DESIGN.md` history pointer tell an editor to recover the September 29 palette.
5. `state-history` still carries the old look under a header that claims those passages were removed.
6. Scratch briefs repeat the old lock. Global skills and the council manifest do not.
7. The running theme, share-image fonts, and Mira primitives are product code. They will keep teaching the old look until feature 151 replaces them. That wait matches the removal plan.

Unknown: the live issue 151 body, and any memory store this search did not open.