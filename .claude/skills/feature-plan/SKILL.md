---
name: feature-plan
description: >-
  Phase 1 of the feature flow, standalone: the plan gate (the plan is the spec).
  Use when the user says /feature-plan, "plan this feature", "spec this out", or
  wants a plan gate without committing to the full flow. Not for building — that
  is /feature-build.
argument-hint: "[feature description]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# The plan ✋ — spec and plan, one gate

One document, **the plan**: it is the spec and the plan at once. Seed from
`$ARGUMENTS` or the conversation, then work the steps in order.

## 1. Preflight
- Read AGENTS.md + the `.claude/rules/` files for the areas the ask touches.
- The slice comes from the user's ask — never self-served from the `backlog`
  issue list.
- Scratch lives in `.feature/` (self-gitignoring: `mkdir -p .feature && printf
  '*\n' > .feature/.gitignore`).

## 2. Clear the thinking — before any drafting
1. Invoke `first-principles-thinking` seeded with the raw ask **first** — this
   phase's thinking gate, not optional. It strips the ask to its load-bearing
   problem and the minimal rebuild; its concluded action IS the confirmed ask.
2. Still rambling / multi-directional after that → interview one question at a
   time, each with your best-guess answer attached, until the ask is coherent.
3. Direction still genuinely unknown → `idea-refine` (save-path override
   `.feature/`).

These are conversations, not sign-offs — the ✋ gate in step 5 is this flow's only
approval gate.

## 3. Plan the slice — dual for risky slices, solo for simple ones

**Gate the second planner on risk — the dual pass is an enrichment for uncertainty, not
a default.** Run the two-independent-plans pass (Codex + you) when the slice is
architecturally consequential: a new table or migration, a new trust boundary (auth, a
server action, an external tool/agent surface, money or posting paths), a cross-cutting
refactor, or an ask you're genuinely unsure how to shape. For a well-scoped, low-risk
slice — a contained UI change, a copy edit, a localized fix inside one module — **skip
Codex and plan solo** (3a + 3b only): a full extra Codex planning round plus the
cross-critique in step 4 is pure latency when the approach is obvious. When genuinely
unsure which bucket the slice is in, run the dual pass.

When the dual pass applies, the confirmed ask is planned **twice, independently**, by
different model families — uncorrelated plans are the point. Kick off Codex the moment
the ask is confirmed so it plans while you draft yours.

- **Codex's plan:** dispatch `codex-planner` (draft mode) with the confirmed ask
  and the tier map — high-effort/opus session → `-m gpt-5.6-sol -c
  model_reasoning_effort=high`; a lighter session → medium. Codex runs the same
  feature-plan process (steps 3a–3b) via its `.agents/skills/` symlink, starting
  from the confirmed ask — it does NOT re-run the thinking gate (it can't converse
  with the user). **Name the `feature-plan` skill explicitly** in the dispatch prompt
  so Codex loads its body directly — invoke-by-name is immune to any 2% skills-list
  truncation. It returns a full plan with its own decided approach.
  - **Include the grounding-efficiency contract in the dispatch prompt** — Codex's
    default is to read one file per shell turn, and 20–30 sequential read-then-reason
    turns under high effort is what makes its plan lag Claude's by minutes (not the
    model tier, not web search). Tell it verbatim: *"You already have this repo,
    `AGENTS.md`, and your Supabase/Vercel skills — ground from those first. Batch your
    reads: many files per shell command, never one per turn. Read your Supabase/Vercel
    skill files only for a specific pattern you need, not end to end. Use web search
    only for a single fact none of the above cover. Produce the plan in one efficient
    grounding pass."* This preserves every grounding source and the effort tier — it
    only collapses the sequential-read turn explosion, the actual latency gap.
- **Your plan:** do 3a then 3b below, concurrently.

### 3a. Consider approaches — internally, present none
1. Weigh 2–3 candidate approaches through four lenses: **risk-first**,
   **YAGNI-minimal**, **vertical-slice**, **verification-first**.
2. Big/architectural slices → run the lenses as 3–4 parallel sketch-agents; smaller
   slices → weigh them inline.
3. **Decide the single best approach yourself.** The alternatives are how you
   choose, not what you present — they never enter the final plan. Sketches die here.

### 3b. Draft your plan — inline
Authored right here in the chat, inheriting the session's model; never delegated to
a subagent. Before writing, read every file the ask touches and Grep for callers and
contracts rather than guessing; never propose anything a hard guard forbids. Your
plan:

- **Definition of done**, up top — summarized however reads clearest: a short
  paragraph, a bullet list, or both. This is the slice's contract; feature-ship's
  triage measures every "fix now" against it.
- **Only the decided approach** — the plan, not a menu of options.
- **In scope / Deferred split:**
  1. Everything the user asked for together is **in scope** — multiple asks in one
     breath (a minimal UI tweak *and* a major schema change) are one slice on one
     branch, not a forced split.
  2. **Deferred** is only for work that is a substantial related slice in its own
     right, genuinely better built *after* this one lands — not a catch-all for
     incidental additions.
  3. Incidental "while we're here" ideas the plan itself surfaces (not asked for) →
     drop or note for backlog; never inflate the slice.
- **Build steps** for a zero-context engineer: file map first; bite-sized tasks with
  exact file ownership + interfaces + the `.claude/rules/` skills each implementer
  must invoke (feature-build copies them into briefs); full code in non-obvious
  steps; NO placeholders. Split tasks only where a reviewer could reject one and
  approve its neighbor.

## 4. Reconcile — cross-critique, then synthesize
*(Solo-planned slices — where step 3's risk gate skipped Codex — skip this section
entirely; take your single plan straight to the gate.)*

1. **One critique round each way** (no ping-pong): you critique Codex's plan — its
   approach, hidden assumptions, task breakdown — inline; and dispatch
   `codex-planner` (critique mode, `resume`) feeding it your plan for Codex's
   critique of yours.
2. **Read the divergence.** Same decided approach in both → high confidence,
   proceed. Different approaches → the divergence is the signal; weigh both
   critiques on their merits, not by which model spoke.
3. **You synthesize the one final plan** — keep what survives from both, graft the
   stronger call where they differ, then stop. Claude is the decider; Codex is the
   adversary, not a co-author.

Degrade gracefully: if `codex-planner` returns an error (Codex unavailable), note it
in one line and ship your solo plan — the dual pass is an enrichment, never a blocker.

## 5. GATE ✋
**Paste the full synthesized plan into chat** (never a file pointer). Revise until
the user's explicit go. On approval, pipe the approved plan — exactly as pasted —
into `.claude/skills/feature/scripts/start.sh "<feature name>"` on stdin (heredoc; no
file argument): cuts `ft/<issue#>` from clean dev, opens the issue with the plan as
body (capture the issue number — its only stdout line). The issue is now the single
source of truth.

Rules: scope freezes at this gate. Planning docs never enter the repo — the issue
body is the record.
