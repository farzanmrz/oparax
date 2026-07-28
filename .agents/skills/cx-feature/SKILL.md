---
name: cx-feature
description: >-
  Codex-native end-to-end feature flow for oparax: plan → build → QC → ship,
  with Codex as the orchestrator (grok + agy ride the council CLI bridge).
  Use in the Codex app/CLI when the owner wants a full slice run here instead
  of Claude Code. For one phase, use $cx-feature-plan, $feature-build,
  $cx-feature-qc, or $cx-feature-ship directly.
---

# Idea to shipped — the Codex conductor

This is the Codex-orchestrated twin of Claude Code's `/feature` flow. Same
contract, same scripts, same gates — different harness. A run is **ONE issue ·
ONE feature branch · ONE squashed commit on `beta`.** No PRs, no CI. The owner
chooses per-slice (or per-phase) which harness runs; the two flows are
interchangeable at every phase boundary because each phase starts from durable
state only (the ft issue body, the branch, `origin/beta...ft/<N>`).

## Resume detection — run on EVERY invocation, before anything else

Locate the slice from durable markers only: the current/ft branches, then
`gh issue view N --comments`. Enter at the FIRST missing marker, in order:
no ft branch/issue → plan · no commits beyond the cut → build · no
`## QC round` comments → `$feature-find` · `— findings` without `— fixes` →
`$feature-fix` · `— fixes` without `— docs` → `$feature-docs` · `— docs`
without `— verified` → `$feature-verify` · `— verified` → triage/ship (✋).
State the detected position in one line and continue. Never re-run a
completed phase; never enter ship while the latest round lacks `— verified`.
This is what makes mid-flow hops from Claude Code land correctly here.

## The phases — each ends at an owner stop

1. **Plan** — `$cx-feature-plan`. Ends at the plan gate ✋; on approval the
   issue + `ft/<N>` are cut and the session STOPS. Recommended dial for the
   chat: `gpt-5.6-sol`, high (xhigh for a heavy slice) — set via `/model`.
2. **Build** — `$feature-build` (the shared harness-neutral executor skill) in
   a NEW chat on a cheap dial (`gpt-5.3-codex-spark`, medium). Stops when
   built with a compact summary. Never auto-continues into QC.
3. **QC** — `$cx-feature-qc` in a fresh chat on a smart dial (`gpt-5.6-sol`,
   high — the session adjudicates; everything else is pinned subagents or
   shell). Ends at the verification gate ✋.
4. **Ship** — `$cx-feature-ship`. Triage owner findings, then the ship gate ✋
   (with the standing pre-approval carve-out when the invocation itself says
   ship). Runs `ship.sh`, ordered promotion, finalize.
5. **Next slice framed** — `$feature-next` (shared skill): emits the
   paste-ready prompt for the next plan session (either harness) and updates
   the roadmap line in AGENTS.md.

Any phase may equally run in Claude Code (`/feature-plan`, `/feature-build N`,
`/feature-qc`, `/feature-ship`) — the boundaries are identical by design.

## Hard rules (bind every phase, same as Claude's flow)

- Feature work only on `ft/<issue#>`; `beta`/`main` are landing targets, never
  development branches. Never force-push protected refs.
- The plan's `## Weight` line (`light | standard | heavy`) is decided ONCE at
  the plan gate; downstream phases read it from the issue and never
  re-classify.
- Scope freezes at the plan gate for agent-self-generated ideas; owner-reported
  findings during manual verification are NEVER scope creep.
- The terminal release target (`beta` or `main`) rides in the conversation —
  when phases run in separate chats, the owner restates it at QC/ship.
- ≤6 concurrent subagent threads (the global `[agents]` cap); scripts live in
  `.claude/skills/feature/scripts/` and are shared verbatim — `start.sh`,
  `ship.sh`, `promote.sh`, `qc-login.sh`.
- Planning docs never enter the repo; scratch lives in self-gitignored
  `.feature/` and dies at ship.
- Dependency MAJOR upgrades, framework migrations, schema/data migrations →
  STOP and present options; never autonomous.
- Real database work goes through the Supabase MCP (project
  `pcgvpypzfwuchyfwdlwe`); migration files in `supabase/migrations/` are
  mirrors, and when applying via MCP pass only the slug as the migration name.
