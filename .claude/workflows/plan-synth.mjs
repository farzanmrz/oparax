export const meta = {
  name: 'plan-synth',
  description: 'Ground one feature slice in the stack skills that apply to it, draft ONE plan with the session model, and harden it through an external adversarial critique round. Stage 0 selects the relevant skills from the LIVE inventory (not a fixed menu); Stage 1 fans out one repo-grounded lens per selected skill; Stage 2 consolidates a constraint set + a 2-3 candidate menu; Stage 3 picks a spine from that menu and writes the full build-ready plan (session model); Stage 4 sends the plan to three external families (Codex, Grok, Gemini via agy) for fully open, repo-grounded critique; Stage 5 adjudicates the critiques and emits the final hardened plan.',
  whenToUse: "feature-plan's step 3 — replaces the solo consider-approaches-then-draft pass with deterministic skill grounding + adversarial external critique. The session presents the returned plan at the human gate; nothing ships without approval.",
  phases: [
    { title: 'Scope', detail: 'select the relevant skills from the live inventory + gather the applicable repo guards (sonnet, medium)' },
    { title: 'Lenses', detail: 'one repo-grounded lens per selected skill, in parallel (sonnet, medium)' },
    { title: 'Consolidate', detail: 'constraint set + 2-3 candidate menu (inherit — may spend Fable)' },
    { title: 'Draft', detail: 'pick a spine and write THE full build-ready plan (inherit — may spend Fable)' },
    { title: 'Critique', detail: 'Codex + Grok + agy attack the plan, fully open — real gaps only, empty list is valid' },
    { title: 'Refine', detail: 'adjudicate the critiques and emit the final hardened plan (inherit — may spend Fable)' },
  ],
}

// args (from the feature-plan skill):
//   { ask: string,        // the confirmed ask (post thinking-gate — already stripped to its problem)
//     context?: string }  // any seed material worth carrying (issue text, prior decisions)
//
// Returns { plan, scope, lenses, draft, critiques }.
//
// MODEL POLICY (locked with Farzan — the Fable discipline):
//   - Scope + Lenses are EXTRACTION/comprehension, not generation: PINNED sonnet, effort MEDIUM
//     (depth is bought with effort, not tier). Lenses are also the highest fan-out stage in this
//     workflow (one per selected skill) — never inherit a fan-out stage, it multiplies spend N-ways.
//   - Consolidate (candidate menu), Draft (the plan itself), and Refine (critique adjudication) are
//     the GENERATIVE, single-call, ceiling-setting stages. All three INHERIT the session model +
//     tier — the only places Fable is allowed to land inside this workflow, by design.
//   - There is deliberately NO multi-model draft council. The slice-69 run measured it: all four
//     families independently chose the SAME spine from the candidate menu, cross-model drafting
//     bought detail-grafts rather than architectural diversity, and the synthesized merge itself
//     introduced internal contradictions that the critique stage then had to catch. Cross-model
//     spend belongs on DIVERGENT work (attack), not convergent work (drafting the same plan).
//   - Critique: THREE external families attack the drafted plan, each DEEP (repo-resident,
//     read-only, told to verify the plan's claims against the actual code) at its tier CEILING —
//     this is each family's only seat and the terminal gate before the human one. All three get
//     the IDENTICAL unconstrained prompt (owner call 2026-07-26 — no charters, no assigned lanes;
//     each family surfaces whatever it finds most important): Codex(gpt-5.6-sol)=high,
//     Grok(grok-4.5)=high, Gemini-3.1-pro-high via agy.
//     No Claude critic: the session model wrote the plan, so a Claude critique
//     would be self-review. KNOWN RISK on the agy lane (Farzan kept the seat 2026-07-26): in
//     SHALLOW text-only mode it returned 5/5 empty critiques with 3-5k thinking tokens
//     (2026-07-25, five charter framings, once with a demonstrably false "no contradictions"
//     justification); deep mode changes the task shape to bounded evidence-checking — the shape
//     of its productive QC Verify seat — which is the bet. If deep also returns empty repeatedly,
//     that is the new fact that reopens the seat question.
//   - Refine INHERITS like Draft — same rationale, same single-call shape. Best-effort: zero
//     surviving critiques (both CLIs failed or returned empty) skips Refine and ships the Draft
//     output unchanged.

// Args can arrive as a JSON-ENCODED STRING instead of an object (same harness failure class
// qc-review.mjs recovers from — see its shim). Deliberately narrow: only a `string` is re-parsed,
// so a correctly-arriving object takes the identical path it always did.
const rawArgsType = typeof args
let resolvedArgs = args
let argsRecovered = false
if (rawArgsType === 'string') {
  try {
    const parsed = JSON.parse(args)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      resolvedArgs = parsed
      argsRecovered = true
    }
  } catch {
    resolvedArgs = null
  }
}
const a = resolvedArgs && typeof resolvedArgs === 'object' && !Array.isArray(resolvedArgs) ? resolvedArgs : null

const ask = (a && a.ask) || ''
const context = (a && a.context) || ''

log(`args → arrived=${rawArgsType}${argsRecovered ? ' (RECOVERED via JSON.parse)' : ''} keys=${a ? Object.keys(a).join(',') : 'NONE'} · ask=${ask.length} chars`)

// The ask is the sole definition of the slice — an empty one makes every downstream stage a void
// round (measured: ~416k subagent tokens spent planning its own recovery). Fail fast instead.
if (!ask.trim()) throw new Error('plan-synth: args.ask is empty after recovery — refusing to run a void round. Pass { ask, context } as a real object (or a JSON string of one).')

const REPO = '/Users/farzanm4/Desktop/drive/repos/oparax'
const SCRIPT_DIR = `${REPO}/.claude/workflows/council`
const CRITIQUE_SCHEMA_FILE = `${REPO}/.claude/workflows/plan-critique-schema.json`
const SKILLS_SH = `${REPO}/.claude/workflows/list-plan-skills.sh`
const SCRATCH = `${REPO}/.feature/plan-council` // self-gitignoring — .feature/ is the flow's live scratch

// Injected into every stage that DESIGNS (consolidate, draft, critique, refine).
// Deliberately calibrated: simplicity is a pressure with a hard floor, not a goal that can eat
// correctness — the floor clause exists because an uncalibrated "prefer simpler" lens over-scopes
// into simplifying away requirements.
const SIMPLICITY_RULE = `\n\nDESIGN PRESSURE — simplicity, with a floor: prefer the simplest architecture and most direct code that satisfies EVERY stated requirement and constraint. Complexity must pay rent — each abstraction, indirection, table, dependency, or clever pattern needs a named requirement it serves; if none, drop it. But simplicity is a tiebreaker among CORRECT designs, never a license: never drop a requirement, weaken a security or correctness guarantee, or violate a hard guard in its name. When a simpler and a more elaborate design both satisfy everything stated, pick the simpler one and note what was given up.`

// external-family production tiers (locked with Farzan 2026-07-26 — not re-litigated per-run).
// HIGH, deliberately: critique is each family's ONLY seat in this workflow and the terminal
// quality gate before the human one — the tier ceiling belongs here. (grok: high is its real
// ceiling — xhigh/max error, see plan-grok.sh. agy's slug fuses model+effort.)
const TIERS = { codex: 'high', grok: 'high', agy: 'gemini-3.1-pro-high' }
// codex is the one family whose model is a separate flag from its effort, so it must be named.
// Plan critique is the highest-judgment external call in the flow — it gets the flagship, not
// whatever ~/.codex/config.toml happens to default to.
const CODEX_DRAFT_MODEL = 'gpt-5.6-sol'

// ── Schemas ──────────────────────────────────────────────────────────────────
const SELECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    skills: {
      type: 'array',
      items: { type: 'string' },
      description: 'The skill IDs (exactly as printed by list-plan-skills.sh) whose remit this slice genuinely touches. No cap below the full inventory; when a skill is genuinely borderline, INCLUDE it (a spurious lens returns "nothing relevant" cheaply; a missed lens silently drops a constraint — the expensive failure).',
    },
    touchedPaths: {
      type: 'array',
      items: { type: 'string' },
      description: 'The repo files/globs this slice will create or modify (inferred — there is no diff yet).',
    },
    digest: {
      type: 'string',
      description: 'A tight repo picture for the downstream lenses AND the external draft council: what already exists in the touched areas, and the DISTILLED hard guards that apply — pulled from AGENTS.md and from every .claude/rules/*.md whose `paths:` glob matches touchedPaths. This is how the guards reach every family deterministically when there is no diff to auto-inject them, and it is the ONLY ground truth the external families get (they do not explore the filesystem) — so be thorough, not terse.',
    },
    rationale: { type: 'string', description: 'one line per selected skill naming the file/area that drove it' },
  },
  required: ['skills', 'touchedPaths', 'digest', 'rationale'],
}

const LENS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    skill: { type: 'string' },
    constraints: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          rule: { type: 'string', description: 'the hard constraint this lens imposes on the slice' },
          why: { type: 'string', description: 'why it matters here (the failure it prevents)' },
        },
        required: ['rule', 'why'],
      },
    },
    recommendedApproach: { type: 'string', description: "this lens's single recommended approach for the slice" },
    acceptanceCriteria: { type: 'array', items: { type: 'string' }, description: 'concrete, checkable criteria an implementer can be held to and QC can verify' },
    conflictsToWatch: { type: 'array', items: { type: 'string' }, description: 'points where this lens likely collides with another (for synthesis to reconcile)' },
  },
  required: ['skill', 'constraints', 'recommendedApproach', 'acceptanceCriteria', 'conflictsToWatch'],
}

const CONSOLIDATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    constraintSet: {
      type: 'array',
      items: { type: 'string' },
      description: "the deduped union of every lens's hard constraints — the walls every candidate must satisfy",
    },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', description: 'short kebab-case slug, ≤3 words' },
          sketch: { type: 'string', description: 'how this approach would build the slice, in a few sentences' },
        },
        required: ['name', 'sketch'],
      },
      description: '2-3 genuinely distinct candidate approaches, each of which already satisfies every constraint in constraintSet. This is a SEED for the design draft, not a ceiling — the drafter may deviate from it if it sees a stronger spine.',
    },
  },
  required: ['constraintSet', 'candidates'],
}

function parsePlan(raw) {
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  if (t.startsWith('FAILED')) return null
  try {
    const s = t.indexOf('{')
    const e = t.lastIndexOf('}')
    if (s < 0 || e <= s) return null
    return JSON.parse(t.slice(s, e + 1))
  } catch {
    return null
  }
}

// DEEP grounding for the external critics (Farzan 2026-07-26, superseding the shared-digest-only
// rule): every critic runs INSIDE the repo read-only and is told to verify the plan's claims
// against the actual code. The old objection — the overnight ablation measured deep per-CLI
// exploration as the dominant wall-clock cost — priced FOUR draft lanes; the redesigned flow has
// exactly three external calls total, all at the terminal quality gate, where depth is the point.
const DEEP_RULE = `\n\nGROUNDING: you are running inside the repository, read-only. Ground every critique in the ACTUAL code — read the files the plan names, verify the interfaces and behaviors it asserts, and check its claims against AGENTS.md and .claude/rules/. A critique anchored to a real file and line outranks a purely textual one; cite paths in your target field. The repo digest above is a starting map, not a substitute for reading.`

// External-CLI worker (critique lanes): a sonnet shell-bridge routing through council/run.sh.
// `model` is codex-only (COUNCIL_MODEL → -m). grok is single-model; agy encodes its model in
// `tier`. Passing it explicitly matters here: without it codex silently used whatever
// ~/.codex/config.toml happened to say, so the highest-judgment external call in the whole
// flow — authoring a full implementation plan — ran on an unchosen default.
async function cliWorker(family, tier, promptText, displayLabel, fileStem, ph, model, schemaFile, checkKey) {
  const schemaEnv = schemaFile ? `COUNCIL_SCHEMA="${schemaFile}" ${checkKey ? `COUNCIL_CHECK_KEY="${checkKey}" ` : ''}` : ''
  const raw = await agent(
    `You are a shell bridge to the ${family} planning CLI. Do EXACTLY these steps and nothing else — plan nothing yourself:
1. Using the Write tool, create the file "${SCRATCH}/${fileStem}.in.txt" with EXACTLY this content:
<<<PROMPT
${promptText}
PROMPT
2. Run this ONE command verbatim, using the Bash tool with run_in_background: true — deep repo-grounded runs may take a long time and must NEVER be killed or given a foreground timeout:
   rm -f "${SCRATCH}/${fileStem}.exit"; CLAUDE_PROJECT_DIR="${REPO}" COUNCIL_SCRATCH="${SCRATCH}" COUNCIL_TIER="${tier}" COUNCIL_DEPTH="deep" ${model ? `COUNCIL_MODEL="${model}" ` : ''}${schemaEnv}bash "${SCRIPT_DIR}/run.sh" ${family} ${fileStem}; echo $? > "${SCRATCH}/${fileStem}.exit"
3. CRITICAL — DO NOT END YOUR TURN TO WAIT. If you end your turn while the background command runs, your result is harvested immediately and the run is lost. Instead, stay in this turn and poll the filesystem: run this foreground Bash call (timeout 600000), and if it prints WAITING, run it again — repeat as many times as needed, for hours if necessary, without killing the background task:
   for i in $(seq 1 118); do [ -f "${SCRATCH}/${fileStem}.exit" ] && { echo DONE; break; }; sleep 5; done; [ -f "${SCRATCH}/${fileStem}.exit" ] || echo WAITING
4. Once DONE: if the contents of "${SCRATCH}/${fileStem}.exit" are not 0, OR "${SCRATCH}/${fileStem}.out.json" is missing or empty, return exactly: FAILED
5. Otherwise read "${SCRATCH}/${fileStem}.out.json" and return its RAW verbatim contents and nothing else — no fences, no commentary.`,
    { label: displayLabel, phase: ph, model: 'sonnet', agentType: 'general-purpose' },
  )
  return parsePlan(raw)
}

// ── Stage 0 · Scope: select skills from the live inventory + gather guards ────
phase('Scope')
const scope = await agent(
  `You are the scope+ground pass for ONE feature slice. There is NO diff yet — infer from the ask and the repo. Do all of this:

0. THE ASK BELOW IS THE SLICE. It is the sole definition of what this slice is; nothing you observe in the repo can redefine it. The working tree may carry uncommitted edits, and the branch may already carry commits, from work that is NOT this slice — treat all of it as pre-existing context, never as the slice's subject. Do not run \`git diff\`/\`git status\` to discover what to plan. If what you find on disk seems to disagree with the ask, the ask wins and you say so in the digest.

1. Run the live skill inventory:  bash ${SKILLS_SH}
   It prints one \`skill-id<TAB>description\` line per plan-relevant stack skill. These IDs are the ONLY valid values for \`skills\`.
2. Predict the files/globs this slice will create or modify (grep/read the repo to ground the guess) → touchedPaths.
3. Read AGENTS.md, and read every .claude/rules/*.md whose \`paths:\` frontmatter glob matches any touchedPath. Distill the hard guards that apply to THIS slice.
4. SELECT the skills whose remit the slice genuinely touches — read the printed descriptions and match them to the work. No cap. When a skill is borderline, include it.
5. OBSERVABILITY IS PART OF EVERY SLICE'S REMIT, not an optional extra: the repo carries end-to-end rails (Sentry via lib/observability/ + the four root config files, the model_calls trace ledger, usage_events metering). The digest must state these rails and their conventions, and any slice adding a code path that can fail, spend, or call a model should plan its instrumentation through the EXISTING rails — select the matching sentry:* skill when the slice adds or reshapes instrumentation.

Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}

Return: the selected skill IDs (verbatim from the inventory), touchedPaths, a tight \`digest\` (what already exists in the touched areas + the distilled guards from step 3 — this digest is the ONLY ground truth three external model families will get, with no filesystem access of their own, so be thorough), and one rationale line per selected skill.`,
  { label: 'scope', phase: 'Scope', model: 'sonnet', effort: 'medium', agentType: 'general-purpose', schema: SELECT_SCHEMA },
)

const selected = (scope && Array.isArray(scope.skills) ? scope.skills : []).filter(Boolean)
const digest = (scope && scope.digest) || ''
log(`plan-synth scope → ${selected.length} lenses: ${selected.join(', ') || '(none — check scope agent)'}`)

// ── Stage 1 · Lenses: one repo-grounded agent per selected skill ─────────────
phase('Lenses')
const lensPrompt = (skillId) => `You are the \`${skillId}\` planning lens for ONE feature slice — a single expert perspective feeding a synthesizer, not the whole plan.
FIRST invoke the \`${skillId}\` skill (Skill tool) and apply its guidance to this slice.
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Repo digest (what exists + the guards that apply): ${digest}
Ground in the ACTUAL repo — read the files this slice will touch and grep for the contracts/callers involved (reading a file under a rule's path auto-surfaces that rule; use it). Never guess.
Return a brief for THIS slice only: the hard constraints your lens imposes (each with the failure it prevents), the ONE approach your lens recommends, concrete checkable acceptance criteria, and the points where your lens is likely to conflict with another. An empty conflicts list is fine.`

const lensResults = await parallel(
  selected.map((skillId) => () =>
    agent(lensPrompt(skillId), {
      label: skillId,
      phase: 'Lenses',
      agentType: 'general-purpose',
      model: 'sonnet',
      effort: 'medium',
      schema: LENS_SCHEMA,
    }).then((out) => ({ skill: skillId, out })),
  ),
)
const lenses = lensResults.filter(Boolean).filter((r) => r.out).map((r) => r.out)
log(`plan-synth: ${lenses.length}/${selected.length} lenses returned`)

// ── Stage 2 · Consolidate: constraint set + candidate menu (INHERITS session model) ──
phase('Consolidate')
const consolidated = await agent(
  `You are the consolidation step for ONE feature slice. You have ${lenses.length} skill-grounded lens briefs.
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Repo digest: ${digest}
Lens briefs (JSON):
${JSON.stringify(lenses, null, 2)}

Do two things: (1) merge every lens's hard constraints into ONE deduped constraintSet — the walls. (2) Propose 2-3 GENUINELY DISTINCT candidate approaches, each of which already satisfies every wall. This menu seeds the single design draft next — make the candidates real alternatives, not trivial variants; the drafter may deviate from this menu if it sees a stronger spine.${SIMPLICITY_RULE}`,
  { label: 'consolidate', phase: 'Consolidate', agentType: 'general-purpose', schema: CONSOLIDATE_SCHEMA },
)

const candidates = (consolidated && Array.isArray(consolidated.candidates) ? consolidated.candidates : []).filter(Boolean)
const constraintSet = (consolidated && consolidated.constraintSet) || []
log(`plan-synth consolidate → ${candidates.length} candidates: ${candidates.map((c) => c.name).join(', ')}`)

// ── Stage 3 · Draft: pick a spine, write THE full build-ready plan (INHERITS) ──
// One drafter, the session model. The multi-model draft council this replaces was measured on the
// slice-69 run: all four families independently chose the same spine, and the cross-draft merge
// introduced contradictions the critique stage then had to catch. The diversity budget moved to
// Critique, where divergence was measured to pay.
phase('Draft')
let plan = await agent(
  `Write the FINAL implementation plan for this feature slice — the record other engineers build from.
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Repo digest: ${digest}
Constraint set (the walls the plan must satisfy): ${JSON.stringify(constraintSet)}
Candidate menu (a STARTING FRAME, not a limit — pick one, blend them, or propose your own spine if you see a stronger approach; the constraint set is what's binding, not this menu): ${JSON.stringify(candidates)}

State the spine you chose and why in the Approach section, then commit to it — no menus in the output. Emit ONLY the final plan as markdown, with these sections:
- **Definition of done** — up top; the slice's contract.
- **Approach** — the decided one only, not a menu.
- **In scope / Deferred** — Deferred is only for a substantial related slice better built after this one; incidental "while we're here" ideas are dropped, never inflated in.
- **Build steps** — THE THINKING IS SPENT HERE, NOT AT BUILD TIME: the builder executes, it never designs, so a decision left open is a plan defect. For a zero-context engineer: file map first; bite-sized tasks with exact file ownership + interfaces + exact signatures/schemas/prompts where they matter; per task, the SKILLS it must invoke; full code in non-obvious steps; no placeholders, no "choose an approach", no "for example". Number steps plainly (1, 2, 3…) and state dependencies as "needs step N"; any shorthand code the plan uses must be defined in the plan itself.
- **## Stack & design acceptance criteria** — the deduped union of the lenses' acceptanceCriteria plus anything the plan itself adds, as a concrete checklist. feature-qc verifies the built diff against this section, so every line must be checkable.
- **Instruction-file updates** — the AGENTS.md / .claude/rules edits this slice makes necessary, each "FILE: change". Write "none" if truly empty.${SIMPLICITY_RULE}

NARRATION: while you work (reading files, weighing candidates), keep any status narration to one terse line per step. This does NOT apply to the plan itself — the returned document keeps full detail and rationale; only the working narration is compressed.`,
  { label: 'draft', phase: 'Draft', agentType: 'general-purpose' },
)
log(`plan-synth draft → ${plan && typeof plan === 'string' ? `${plan.length} chars` : 'MISSING — check Draft stage'}`)

// ── Stage 4 · Critique: three external families attack the plan, fully open ──
// Cross-model diversity spent on a DIVERGENT task (finding flaws), like QC's find stage. No Claude
// critic — the session model wrote the plan, so a Claude critique would be self-review. All three
// get the IDENTICAL unconstrained prompt (owner call — no charters, no assigned lanes).
// Best-effort: a failed CLI or an empty list just contributes nothing.
phase('Critique')
let critiques = []
if (plan) {
  const critiquePrompt = `You are an independent external critic reviewing an implementation plan before it is frozen. Attack it GENUINELY — find what is actually wrong or missing, not criticism for its own sake. Work through the plan requirement by requirement before concluding; only after that full pass is an EMPTY critiques list a valid, respected result. Do not manufacture findings to seem useful, and do not restyle or second-guess taste.
Report ONLY:
(a) a stated requirement of the ask the plan fails to satisfy or omits;
(b) a violation of the constraint set or repo guards below;
(c) an internal incorrectness — tasks that contradict each other, an interface that cannot work as written, an unbuildable step;
(d) unjustified complexity — structure the requirements do not need, where a simpler correct design exists (name it);
(e) a concrete risk with its failure scenario.
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Repo digest: ${digest}
Constraint set (the walls): ${JSON.stringify(constraintSet)}
THE PLAN UNDER REVIEW:
${typeof plan === 'string' ? plan : JSON.stringify(plan)}
${SIMPLICITY_RULE}${DEEP_RULE}`

  // Fully open critique (owner call, 2026-07-26): identical unconstrained prompts — each family
  // surfaces whatever it finds most important; no assigned lanes.
  const critiqueJobs = [
    () => cliWorker('codex', TIERS.codex, critiquePrompt, 'codex:critique', 'critique-codex', 'Critique', CODEX_DRAFT_MODEL, CRITIQUE_SCHEMA_FILE, 'critiques').then((o) => ({ fam: 'codex', out: o })),
    () => cliWorker('grok', TIERS.grok, critiquePrompt, 'grok:critique', 'critique-grok', 'Critique', undefined, CRITIQUE_SCHEMA_FILE, 'critiques').then((o) => ({ fam: 'grok', out: o })),
    () => cliWorker('agy', TIERS.agy, critiquePrompt, 'agy:critique', 'critique-agy', 'Critique', undefined, CRITIQUE_SCHEMA_FILE, 'critiques').then((o) => ({ fam: 'agy', out: o })),
  ]
  critiques = (await parallel(critiqueJobs))
    .filter(Boolean)
    .filter((r) => r.out && Array.isArray(r.out.critiques))
    .flatMap((r) => r.out.critiques.map((c) => ({ fam: r.fam, ...c })))
  log(`plan-synth critique → ${critiques.length} critiques returned by the external families`)
}

// ── Stage 5 · Refine: adjudicate critiques, emit the final hardened plan (INHERITS) ──
if (critiques.length) {
  phase('Refine')
  const refined = await agent(
    `External model critics independently critiqued the plan below. Adjudicate each critique ON ITS MERITS and produce the FINAL plan.
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Repo digest: ${digest}
Constraint set (the walls): ${JSON.stringify(constraintSet)}
THE PLAN:
${typeof plan === 'string' ? plan : JSON.stringify(plan)}
CRITIQUES (JSON, each tagged with its family): ${JSON.stringify(critiques)}
${SIMPLICITY_RULE}

Adjudication rules: a critique that names a real requirement gap, guard violation, internal contradiction, or unjustified complexity gets FIXED in the plan; a critique that is wrong, taste, or scope inflation gets REJECTED. Never widen scope to appease a critic, and never weaken a requirement or guard to simplify. Preserve the plan's build-ready bar: the builder executes and never designs, so every fix you fold in must land as concrete file ownership, interfaces, and code — a fix that reopens a decision is not a fix. Emit the COMPLETE final plan as markdown with the SAME sections as the input plan (Definition of done / Approach / In scope, Deferred / Build steps / ## Stack & design acceptance criteria / Instruction-file updates), fully self-contained — it replaces the input plan outright. Append one final section "## Critique adjudication" with one line per critique: [family] accepted-or-rejected — the reason in a clause.

NARRATION: while you adjudicate, keep any status narration to one terse line per critique. This does NOT apply to the plan you emit or the adjudication section — those keep full detail; only the working narration is compressed.`,
    { label: 'refine', phase: 'Refine', agentType: 'general-purpose' },
  )
  if (refined && typeof refined === 'string' && refined.trim()) plan = refined
  log('plan-synth refine → final plan hardened against surviving critiques')
} else {
  log('plan-synth refine → skipped (no critiques survived) — Draft output ships unchanged')
}

return { plan, scope, lenses, critiques }
