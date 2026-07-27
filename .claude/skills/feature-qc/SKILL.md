---
name: feature-qc
description: >-
  Phase 3 of the feature flow, standalone: the full QC battery over the current
  feature branch. Use when the user says /feature-qc, "run QC", "quality pass",
  or wants the branch proven buildable+bootable+browser-clean mid-flight. For just one pass, use
  /simplify, /code-review, or /feature-lint directly instead.
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *)
model: inherit
---

# The QC battery — autonomous

Over the whole branch diff, in order (skip nothing silently — report each step):

**Silent by default; findings keep full detail.** No status narration between
steps. Write text mid-run only for a blocker, a deviation from the plan, or a
load-bearing finding — one sentence each. This does NOT apply to the findings
themselves, the adjudication reasoning, or the end-of-run report — those keep
full detail regardless. The same rule goes into every dispatch prompt this
skill sends (setup, browser-verifier, fix, lint, doc-sync agents): a dispatched
agent's between-tool-call text reaches nobody but still bills tokens.

0. **Setup — delegate it, don't spend the session model on it.** Everything in this step
   is mechanical (run a command, read the output, move on) — measured on a real run it
   cost 7 main-session turns and produced no decision. Dispatch ONE `haiku` agent to
   gather it all and return a compact block; the session only reads the result.

   The agent gathers, in order:
   - **Diff boundary.** `origin/beta...ft/<N>` — the branch is its own marker, so the
     range comes from git alone and nothing needs to be recorded at slice start.
   - **Convergence.** All commits on the feature branch; no stray flow worktrees under
     `.claude/worktrees/`; no stray branches.
   - **Diff size.** `git diff --shortstat <range>` and `git diff --stat` (to spot
     generated files) — these set step 1's `large` flag.
   - **Acceptance criteria.** The ft issue's "Stack & design acceptance criteria"
     section via `gh issue view`, returned verbatim for step 1's `criteria` arg.
   - **Dead-code sweep.** Run `pnpm deadcode` (knip; `knip.json` already excludes the
     vendored kits, the isolated `ingest/` package, and tooling dirs). For each hit,
     verify it is genuinely unreferenced (grep for dynamic/string-keyed references knip
     can miss), cross-check AGENTS.md's "Dormant by design" table (a switched-off lever
     is not dead code — flag it but say so), and collapse a dead chain (an export whose
     only reference is another unused file) into ONE finding at its root. Return the
     verified hits in the block — the session folds them into adjudication alongside the
     review findings. This lives here, not in the review fan-out: knip is deterministic
     (same output whichever model runs it), so mirroring it across families buys nothing.
   - **Dev server + boot smoke. Check for an existing server BEFORE starting one.**
     `lsof -i :3000 -sTCP:LISTEN -t`. If something is already listening, **reuse it and
     record that QC did not start it** — Next 16.2 refuses to start a second dev server
     in the same directory (`⨯ Another next dev server is already running`), so trying
     anyway just fails, and killing it at teardown would take down a server the owner
     (or a parallel session) is using. Two Claude sessions on one repo is a normal
     working mode; the flow must not assume it owns the port.

     Only if the port is free: start `pnpm dev` in the background, record the REAL
     listening PID (the shell wrapper's PID is not the node process, and killing it
     leaves the port bound), wait for readiness, and grep startup output for `✓ Ready`
     plus failure signatures (ERROR, "failed", unmet peer, unhandled rejection). That
     grep IS the boot smoke — pattern-matching over startup text, not judgment, so it
     never deserves a model of its own. Collect WARNINGs for triage.

     Either way, **leave the server running** for step 1b's journeys and step 4's
     re-sweep. Teardown in step 5 kills it **only if QC started it**.

   If the boot smoke fails, STOP and report — there is no point reviewing a branch that
   doesn't start.
1. **Review fan-out** — one `Workflow({ scriptPath: ".claude/workflows/qc-review.mjs",
   args })` call runs the whole find→dedup→verify pipeline against the frozen diff.
   Address it by **`scriptPath`, never `name`** — `Workflow({ name })` resolves only
   built-in/registered workflows and does NOT scan the repo's `.claude/workflows/`, so
   `{ name: "qc-review" }` silently 404s and degrades to the unbounded `/code-review`
   path; the path form runs the repo workflow directly.

   **Find** (models AND effort pinned in the workflow, not prose) — **five narrow
   angles mirrored across all four families**, each family running the identical
   charter set, never the generic "review this diff". Finding is a DIVERGENT task,
   and a barrier costs its slowest member rather than its width, so the extra
   families ride in the shadow of the heavy bug-finders instead of adding wall time.
   The five angles: reuse+simplification, altitude+efficiency, conventions+criteria,
   cross-file-contracts, and adversarial. Pins (width-over-depth experiment, owner
   decision 2026-07-26): every unconditional angle runs at the MID tier — Claude
   sonnet@medium / Codex terra@medium / Grok 4.5@medium — betting that four-family
   redundancy catches what any one mid-tier pass misses; agy runs every angle at
   gemini-3.1-pro-high (its only reasoning rung). Only the large-diff-conditional
   **line-by-line** scans run at HIGH (sonnet@high / terra@high / grok@high / agy
   pro-high) — each family's single exhaustive pass has no redundancy to lean on.
   Every pin is unconditional — depth never depends on the caller classifying the
   slice as risky. If confirmed-bug recall drops over the next slices, the fallback
   is the prior scheme: opus@high / sol@high / grok@high on the two bug angles. The
   repo-wide dead-code sweep is NOT a Find angle — it runs once in step 0's Setup
   dispatch (knip is deterministic; four families re-running it buys nothing).

   **Browser journeys run in this same barrier** — see step 1b. Their findings enter
   the same dedup and get fixed in the same pass as the static ones.

   If the workflow logs that all external lanes failed, the review is Claude-only and
   must NOT be reported as a full cross-model pass — check
   `.feature/qc-council/*.in.txt` and re-run.

   **Dedup** (inherits the session model, effort high, single pass) merges
   near-duplicates across lanes and drops plan-frozen vetoes — a CONVERGENT task
   (consolidating a list is not a hypothesis to diversify), so one owner, not a
   second opinion. It inherits because it is the workflow's single-call judgment
   stage — what survives to verification is decided here, and a judgment stage
   pinned below the session model was the same flaw as plan-synth's once-pinned
   draft lane.

   **Verify** is cross-family again — DIVERGENT for the same reason as find, and
   the second place external usage earns its keep — but **batched: one verifier per
   model family, four agents total, regardless of how many findings survived dedup.**
   Each family's single verifier is handed the ENTIRE deduped list (every finding
   labelled with a stable id and with the families that raised it) and returns a
   verdict per finding in one structured response. Cross-family is preserved *per
   finding inside the batch*: a family's verdict on a finding it raised itself is
   discounted, so every finding is still decided by families that did **not** raise
   it, and a majority of those confirms it. A finding all four families raised keeps
   the trusted shortcut and skips the batch. Claude is the infra-failure floor — if
   every lane comes back empty it is retried alone, and a finding whose only surviving
   verdict is self-raised is scored on that and flagged with a `note`. This is also
   why `qc-review` never returns an unverified external finding — an external lane's
   recall is spent on FINDING, not on deciding what's true. The earlier per-finding ×
   per-family fan-out was deleted: on #69 it burned 30 agents to return 30 CONFIRMED
   and 0 refuted.

   Pass `args` (from step 0's gathered block): `{ range, generated: "<globs>",
   vetoes: "<plan-frozen decisions>", criteria: "<the ft issue's 'Stack & design
   acceptance criteria' section>", large: <bool> }` — `criteria` is what the
   conventions angle verifies the built diff against; set `large: true` on a big
   diff (roughly >8 files or >200 changed lines) to add the line-by-line scans.
   There is no `effort` arg anymore — every angle's depth is pinned inside the
   workflow, so slice-risk classification no longer changes review depth. It
   returns `findings`, each already tagged `raisedBy` (which families independently
   found it) and `confirmed` (the verify quorum), plus `verifiersRun` — the workflow
   only reports, the session still decides.

   **`args` must be a real JSON object, never a JSON-encoded string** — a stringified
   payload reaches the script as a string, so every field silently falls back to its
   default with no error. This has bitten a real run twice: `large` never arrived and
   an 89-file security-touching diff got a small-diff review. The workflow now prints
   an args-arrival probe as its first log line; read it and confirm the resolved
   `large` matches what you passed before trusting the results.

1b. **Browser journeys — dispatched in parallel WITH step 1's fan-out, not after it.**
   Every other pass is static (diff review, tsc, lint, build, a boot smoke that only
   greps startup text); none of them renders a page or clicks a control. On #69 that
   gap let a nested-`<form>` hydration error, a click-path ReferenceError, and layout
   violations past 36 static agents, tsc, lint, and a `✓ Ready` grep. Running these
   concurrently with the static finders means browser findings land in the SAME dedup
   and get fixed in the SAME pass — rather than surfacing after lint and forcing a
   second trip through the fix loop.

   **Tool: the `agent-browser` CLI, headless.** Three browser surfaces exist here; the
   other two — Claude's in-app browser (`mcp__Claude_Browser__*`) and the Chrome
   connector (`mcp__claude-in-chrome__*`) — are token-heavy MCP surfaces and are
   REJECTED for this stage. Do not "upgrade" it to one of them. `agent-browser` wins on
   three counts: plain Bash with compact text output (an accessibility-tree snapshot is
   ~200-400 tokens versus parsing raw HTML), headless by default (`--headed` is opt-in),
   and `--session <name>` isolates parallel runs.

   **Auth is pre-solved — no login step, ever.** A `testuser@oparax.ai` session was
   captured once via `agent-browser state save` to
   `~/.agent-browser/oparax-qc-authenticated.json`; every dispatch passes `--state <that
   path>` on its first command and lands pre-authenticated. If a route bounces to
   `/login` despite it, the saved session expired — that comes back as a finding, not a
   reason to prompt the owner for credentials. Refreshing it requires a human to log in
   once in a headed window (owner-only, never this agent's job).

   **Derive JOURNEYS from the diff, not routes.** Ask what a user can now *do* that they
   couldn't before, or do differently, and write each as an ordered walk. A journey
   usually spans several routes, and the handoffs between them are exactly where the
   manual pass found bugs — per-route checking structurally cannot see them. Dispatch
   one `browser-verifier` per journey, each with its own `--session` id, all in
   parallel, reusing step 0's already-running server.

   Three rules make that parallelism safe:
   - **State each journey's preconditions.** A UI state that only exists with certain
     data (a populated list vs an empty state, a completed vs in-flight job) is not
     reachable just by loading its URL. Either the precondition already holds, or it can
     be established cheaply and reversibly (seed a row directly — far cheaper than
     driving the UI that creates it), or it cannot be established without a spending or
     irreversible action, in which case it is reported unreachable and handed to the
     owner's manual list. Never let the sweep silently skip a state.
   - **Isolate at every layer the journeys share.** `--session` isolates the browser
     only. Agents authenticating as the same user still contend on the same rows, so a
     journey that WRITES needs its own record (seed one per mutating journey) or must
     run serially. Read-only journeys parallelize freely.
   - **Never drive flows that spend real money or are irreversible** — payments, live
     posting, sends, destructive deletes. Walk up to that control, confirm the state
     preceding it, and report the rest as unreached-by-design.

   Keep it proportionate: smoke-level, one pass per journey, not a full E2E suite.

   **Collect runtime errors from Next's own endpoint, not from the agents.** The dev
   server exposes `/_next/mcp` (on by default in 16.2 — nothing to add to
   `next.config.ts`), and a headless `agent-browser` session DOES register with it
   (verified: `get_page_metadata` reports the session's url and segment tree). So after
   the journeys return, make ONE call:

   ```bash
   curl -s -X POST http://localhost:3000/_next/mcp \
     -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"get_errors","arguments":{}}}'
   ```

   It returns `configErrors` + `sessionErrors` with **source-mapped stack traces**,
   aggregated across every live session — strictly better than an agent transcribing a
   console, and one cheap call instead of N agent contexts. This is the source of record
   for hydration errors, unhandled runtime errors, and React error overlays.

   **It does NOT replace the agents' reporting.** Next only knows what Next sees: it has
   no view of failed/non-2xx network requests, a route that 404s or renders blank, a
   control that silently does nothing, or which journey steps were unreachable. Those
   stay the agents' job — see the agent body's output contract.

   **Ordering matters: call `get_errors` BEFORE any session closes.** Session cleanup is
   lagged and its effect on retained errors is unproven, so the agents no longer close
   their own sessions. The orchestrator calls `get_errors` once every journey has
   returned, then closes each session (`agent-browser --session <name> close`). That is
   also the answer to who cleans up after a parallel fan-out: the orchestrator, because
   it is the only thing that knows when everyone has finished.
2. **Adjudicate (this session) + apply (dispatched).** Adjudication is the one stage
   that genuinely earns the session model, and measurement backs that: on a real run
   it was 82% of main-session output tokens, and the turns were things a cheap model
   would miss — catching that the workflow's own args hadn't arrived, reasoning that a
   `"use server"` export is an independently-reachable HTTP endpoint regardless of who
   imports it, and deciding to HOLD two findings rather than fix them concurrently with
   a still-running review. Keep it here.

   Plan-frozen decisions in the ft issue are vetoes, not findings; drop them even if
   `confirmed`. A finding that is real but not-this-slice (a bigger refactor, a scale
   concern that can't bite yet) → surface it to the user and drop it; the flow doesn't
   track deferrals.

   **Applying** a decided fix is not adjudication — **dispatch it**, don't spend the
   session model writing the edit. One owner per fix: an `implementer`-style agent on
   `sonnet` for an ordinary fix, `opus` for a risk-path fix (auth, money, posting,
   schema/migration, new trust boundary). Never fan one fix across families — three
   model families editing the same file concurrently produces conflicting diffs to
   reconcile, not more correctness. Where several fixes touch disjoint files, dispatch
   them in parallel; where they overlap, serialize. The applied fix diff stays gated by
   the tsc + lint pass (step 3) and the re-sweep (step 4) — no separate delta-verify
   pass. Large/risky diff → offer the user `/code-review ultra` before proceeding.
3. **`feature-lint`** (scoped to the feature's changed files — LAST because the review
   pass mutates code). Formatting is NOT part of this step: the `PostToolUse` hook
   already formatted every write, including the fixes applied in step 2. What's left
   is the residual Biome won't auto-fix (no-fix + `--unsafe` rules) → risk-tiered
   fixer agents, gating on a clean `pnpm build` — the authority on compile correctness.
   Its orchestration is mechanical (run lint, group files, dispatch, re-run) — pin it
   to `sonnet`; the skill is `model: inherit`, so on an opus session it would otherwise
   run the whole grouping pass on the expensive model for no gain.
4. **Browser re-sweep — narrow.** Step 1b already swept every journey; this pass exists
   only to catch regressions the step-2 fixes introduced, so scope it to the journeys
   whose routes those fixes actually touched (that list is only knowable now, which is
   why this can't be folded into step 1b). Same `browser-verifier` agents, same running
   server, same `--state` auth. If step 2 changed nothing, skip it and say so.
5. **Doc sync — subtractive first** (the revise-agents-md philosophy at slice scope;
   ships in the same diff). **Convergent, single owner — dispatch ONE agent pinned to
   `sonnet` at `effort: high`** (not prose that merely names a model — name the model
   AND dispatch, or the session ends up doing it at whatever model it happens to be on).
   Different model lanes must never make competing edits to the same instruction file,
   so this is deliberately not cross-model. Fed by the `conventions-finder` lane's staleness
   findings from step 1 (it already reports "instruction-file lines the diff has made
   wrong or incomplete" as part of Find) — that is the evidence; this step is where it
   gets applied. Default outcome is **no change** — say so plainly rather than invent
   additions. A fact earns a doc line only if it is durable, action-affecting, and NOT
   recoverable from the code a fresh session reads; adding is guilty until proven
   load-bearing. In order:
   - **Subtract** what the slice made stale — any AGENTS.md / `.claude/rules/` / skill
     line the diff falsified or made code-recoverable → delete it.
   - **Add** only a genuine non-recoverable keeper (a new guard, a retired pattern, a
     new trust boundary): AGENTS.md if always-on, the area's `.claude/rules/<area>.md`
     if scoped — create a new nested rule file for a brand-new path-area.
   - **Skills:** if the slice changed what a skill's body documents (a command, a
     wiring contract), fix that skill; deeper skill bloat → surface it for
     `/meta-dev:improve-skill`, never inline-rewrite it here.
   Single-source every fact (one home; cross-reference, never restate).

   **Then tear down — only what QC started.** If step 0 started the dev server, kill it
   by its REAL listening PID and confirm the port is free (`lsof -i :3000 -sTCP:LISTEN`
   returns nothing); never trust the wrapper PID, which does not stop the listener. If
   step 0 *reused* a server someone else was running, leave it alone and say so. Browser
   sessions were already closed by the orchestrator in step 1b.

Hard rules: Find is one barrier of 20 mirrored finders (5 angles × 4 families; 24 on a
large diff, adding one line-by-line scan per family), every one model-and-effort-pinned
inside the workflow; verify is a FIXED 4 agents (one per model family, each ruling on
the whole list) no matter how many findings survived dedup — never reintroduce a
per-finding verify fan-out. Browser
journeys are dispatched separately, one per journey, alongside the find barrier. The
session model is spent on ADJUDICATION ONLY — setup, fixes, lint orchestration, doc
sync, and every browser pass are dispatched to pinned agents; a step that names a model
in prose without dispatching will silently run on whatever the session happens to be.
The workflow's own concurrency
queue (cap 16 in flight) throttles the find barrier, not a hard per-run agent limit. The
`qc-review` workflow (invoked by `scriptPath`, see step 1) owns finder/verifier
parallelism and every model pin — nothing here is prose-decided. Never fall back to
`/code-review` for the fan-out — its per-candidate verify phase is unbounded and
defeats the structure this workflow exists to enforce. If any step reveals a
dependency MAJOR upgrade, framework migration, or schema/data migration is required —
STOP and present options; never fix those autonomously. End by stating: builds ✓
boots ✓ journeys walked ✓ (+ anything reported NOT REACHED, verbatim — that list is the
owner's manual-check set) findings fixed ✓ server killed ✓ (or what remains).
