---
name: ft
description: >-
  The feature flow's map and resume router. Use when the user wants to know
  where a slice stands or resume it (/ft), or asks how the flow fits
  together. The phase skills do the work: /ft-plan, /ft-spec (Codex),
  /ft-gate, /ft-build (Codex), /ft-qc (Codex), /ft-judge, /ft-fix (Codex),
  /ft-ship. Bug fixes take the bf flow, not this one.
argument-hint: "[issue#]"
allowed-tools: Bash(git *) Bash(gh *)
model: inherit
disable-model-invocation: true
---

# The flow: who does what, and where a slice stands

One slice = one issue, one `ft/<N>` branch, one squash commit on `beta`.
The design rule behind every boundary: **stages split where the required
participant changes.** Fable judges (gate, judge); Codex authors and labors
(spec, build, qc, fix); the owner gates product and walks the result.

| Phase | Skill | App, dial | Product |
|---|---|---|---|
| 1 Plan | `/ft-plan` | Claude, Opus 4.8 | stub issue: journeys, decisions, dossier |
| 2 Spec | `/ft-spec N` | Codex, sol high | `.feature/spec-<N>.md` + grok critique |
| 3 Gate | `/ft-gate N` | Claude, Fable if UNSURE flags else Opus | approved decisions on issue, `ft/N` cut |
| 4 Build | `/ft-build N` | Codex, sol high | implemented + self-verified branch |
| 5 QC | `/ft-qc` | Codex, sol high | `.feature/qc-r<R>-findings.md` |
| 6 Judge | `/ft-judge N` | Claude, Fable high | adjudication + gap hunt + fix briefs |
| 7 Fix | `/ft-fix N` | Codex, sol high | fixes + `## QC round <R>: done` marker |
| 8 Walkthrough | owner | localhost:3000 | patch rounds via `/ft-fix`, or go |
| 9 Ship | `/ft-ship N` | either | squash to beta, promote; OWNER closes the issue after checking production |

Every handoff is a copyable command in the previous phase's exit message;
models are recommendations in those handoffs, never enforced by guards. A
skill the owner invokes runs immediately on the current session, whatever
its model or history: a mismatch earns one advisory line, never a refusal
or a stall. This binds every ft and bf phase skill.

## Resume detection (on /ft)

```bash
git branch -a | grep ft/
```

```bash
gh api repos/{owner}/{repo}/issues/<N>/comments --paginate \
  --jq '.[] | select(.body|startswith("## QC round")) | (.body|split("\n")[0])'
```

| State | Next |
|---|---|
| stub only, no branch | `/ft-spec N` (Codex) |
| `.feature/spec-<N>.md` exists, no branch | `/ft-gate N` (Claude) |
| branch cut, no build commits | `/ft-build N` (Codex) |
| build commits, no `.feature/qc-r*-findings.md` and no done marker | `/ft-qc` (Codex) |
| findings file, no briefs file | `/ft-judge N` (Claude) |
| briefs file, no done marker for that round | `/ft-fix N` (Codex) |
| done marker present | owner walkthrough, then `/ft-ship N` |
| shipped, issue open | owner production check, then close |

State the detected position in one line and hand off; never re-run a
completed phase. Old slices may carry legacy markers (`findings`,
`browsed`, `fixes`, `verified`): treat a legacy `verified` as today's
`done`.

## Hard rules (bind every phase)

* **Surfaces are evidence-bound:** stubs and specs name only surfaces walkable in the running app today (`localhost:3000`); a planned surface needs an explicit future tag + issue #. Product prose in `@AGENTS.md` is direction, never evidence a surface exists.
* **Branching:** never per-task branches or PRs. App code never lands directly on `beta`/`main`; the one carve-out is owner-directed micro-edits to instruction files and docs. `main` moves only through beta-to-main promotion.
* **Scope:** agent-noticed extras stay off the branch; owner-reported findings are never scope creep and land before ship.
* **No planning docs in the repo:** the issue + squash commit message are the record; scratch lives in self-gitignored `.feature/`, swept at finalize.
* **STOP and present options:** dependency major upgrades, framework migrations, schema/data migrations.
* **Cleanup discipline:** `public/` and other static assets are externally referenced by default (portals, email templates); in-repo grep is never evidence of unuse.
* **Labels route the work:** `feature` here; `bug` takes the bf flow; `cleanup` runs this flow minus design stages; `meta`/`docs` are direct-on-beta carve-outs. Table in `AGENTS.md`.
