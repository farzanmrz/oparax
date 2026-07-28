# The direction council — operational contract (single source)

Referenced by `feature-plan` (Claude Code orchestrating) and `cx-feature-plan` (Codex
orchestrating). One board PER MODEL FAMILY, all against the SAME brief. Roster by
harness: Claude Code → this session designs the claude board; codex, grok, agy via the
council bridge. Codex → this session designs the codex board natively; grok + agy via
the bridge (there is no Claude CLI lane).

## Boards are real renders — kit-native, fresh every round

- **A board is a REAL RENDER of the repo's components, never a lookalike** (owner
  decision 2026-07-27; static HTML mocks retired). The owner judges what
  implementation will actually produce, or the pick is worthless.
- **Kit-native ideation, not wireframe-then-map** (owner decision 2026-07-27, from the
  observed failure: four lanes sketched freehand, then snapped the sketch onto the
  nearest component, all converging on the same default look). The brief must order
  each lane to READ the component inventory FIRST — every vendored
  `components/ai-elements/*` and `components/ui/*` file the surface could plausibly
  use, including affordances beyond the obvious (per-step icons, chips/badges, substep
  children, headers) — and design FROM what the kit affords. Sketch-first-then-map is
  named in the brief as the forbidden failure mode.
- **Not-yet-vendored registry components are in bounds**: a lane may build on a shadcn
  or ai-elements registry component the repo hasn't vendored yet — it NAMES the
  component; the winning board's additions get vendored through the registry as part
  of the slice's build (lanes never install anything themselves).
- **Every council round is a fresh commission.** A re-run after owner feedback briefs
  the lanes on what was rejected and why — it never says "rebuild your previous
  board"; carrying an old shape forward is the lane's choice to defend, not the brief's
  instruction.
- Owner-stated interaction patterns in the brief are BINDING constraints on every
  lane's creativity, not suggestions.

## Scope of a design pass: pages × viewports

- A pass designs one or more PAGES. **Every page is designed for BOTH mobile (375px)
  and web** — mobile is primary (the product's real users arrive on phones; the owner
  designs on a wide monitor, which is exactly the bias this rule corrects).
- A page's observable STATES all render stacked on that page's board, labeled — states
  never hide behind navigation.

## Delivery + the review harness

- Each lane delivers one self-contained `"use client"` module PER PAGE at
  `app/dev/directions/boards/<family>/<page>.tsx`, default-exporting
  `({ viewport }: { viewport: "mobile" | "web" })` and rendering every state for that
  viewport. Fixture props only — no fetching, no timers; local state for real
  interactions is encouraged. Vendored files imported, never edited; bespoke DOM only
  where the kit genuinely can't express the idea, each such element a proposed named
  pattern; file starts with a `// kit mapping` comment block.
- Lanes that can write the working tree write their files; read-only lanes return TSX
  in their JSON envelope and the session writes it.
- The SESSION builds the harness shell at `app/dev/directions/page.tsx`: three
  switchers — **model family · page · viewport** — rendering the selected lane module.
  A single-page pass shows a one-option page switcher. The harness is presentation
  only; it never edits lane modules.
- The session gets everything to compile (`tsc` + Biome) — mechanical fixes only,
  never design edits; a board needing design surgery goes back to its lane or is
  reported failed.

## Serving + the pick

- The session serves the harness itself — always: kill whatever holds port 3000
  (`lsof -ti:3000 | xargs kill` — standing owner authorization), start `pnpm dev` as a
  background shell, wait for :3000, confirm the harness URL returns 200, present the
  owner ONE clickable URL — `http://localhost:3000/dev/directions` — and STOP for the
  pick.
- **The 200-check is the LAST tool action before the stop (owner rule 2026-07-27).**
  Once `pnpm dev` is up and the URL returned 200, the session dispatches NO agents and
  touches NO browser tools — no render-verification pass, no click-through, no
  screenshot run, in this harness or any other (Claude Code and Codex alike). tsc +
  Biome green plus the 200 is the whole pre-present verification; the OWNER is the only
  reviewer of the boards. A runtime defect the owner hits is feedback for the re-brief,
  not something to pre-empt.
- The session critiques all boards against the brief (design-critic charter) — from the
  board SOURCE it already read/wrote, never from driving a browser — and presents
  critiques WITH the URL. On a heavy slice, optionally one adversarial cross-critique
  round between external lanes first.
- The owner picks a winner or names a hybrid; grafting the best parts of runners-up is
  normal. **After design approval: kill the :3000 dev server specifically** (by port,
  nothing else).
- Everything under `app/dev/directions/` is plan-phase scratch, WORKING TREE ONLY —
  never committed by the plan phase. The winning composition is frozen into the plan
  as per-state near-code AND seeds the slice's state-gallery/fixture BUILD task (which
  also vendors any registry components the winner names); losing modules are deleted.
