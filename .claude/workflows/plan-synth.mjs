export const meta = {
  name: 'plan-synth',
  description: 'Ground one feature slice in the stack skills that apply to it, then synthesize a single spec+plan across FOUR independent model families. Stage 0 selects the relevant skills from the LIVE inventory (not a fixed menu); Stage 1 fans out one repo-grounded lens per selected skill; Stage 2 consolidates a constraint set + a 2-3 candidate menu; Stage 3 drafts ONE fleshed plan per family (Claude, Codex/gpt-5.6-sol, Grok-4.5, Gemini-3.1-pro via agy) in parallel, each free to pick its own spine; Stage 4 synthesizes the surviving drafts into one final plan with per-task acceptance criteria for QC.',
  whenToUse: "feature-plan's step 3 — replaces the solo consider-approaches-then-draft pass with deterministic skill grounding + cross-model synthesis. The session presents the returned plan at the human gate; nothing ships without approval.",
  phases: [
    { title: 'Scope', detail: 'select the relevant skills from the live inventory + gather the applicable repo guards (sonnet, medium)' },
    { title: 'Lenses', detail: 'one repo-grounded lens per selected skill, in parallel (sonnet, medium)' },
    { title: 'Consolidate', detail: 'constraint set + 2-3 candidate menu (inherit — may spend Fable)' },
    { title: 'DraftCouncil', detail: 'one fleshed plan per family — Claude(opus) + Codex/Grok/Gemini (fixed tiers), parallel' },
    { title: 'Synthesize', detail: 'fold surviving drafts into ONE final plan (inherit — may spend Fable)' },
  ],
}

// args (from the feature-plan skill):
//   { ask: string,        // the confirmed ask (post thinking-gate — already stripped to its problem)
//     context?: string }  // any seed material worth carrying (issue text, prior decisions)
//
// Returns { plan, scope, lenses, drafts, draftsByFamily, familiesReturned }.
//
// MODEL POLICY (locked with Farzan — the Fable discipline):
//   - Scope + Lenses are EXTRACTION/comprehension, not generation: PINNED sonnet, effort MEDIUM
//     (depth is bought with effort, not tier). Lenses are also the highest fan-out stage in this
//     workflow (one per selected skill) — never inherit a fan-out stage, it multiplies spend N-ways.
//   - Consolidate (candidate-menu generation) and Synthesize (the final judge) are the two GENERATIVE,
//     single-call, ceiling-setting stages. Both INHERIT the session model + tier — these are the only
//     two places Fable is allowed to land inside this workflow, by design.
//   - The draft council's Claude lane is PINNED opus (one of four independent voices; the external
//     three hold the diversity floor regardless of the Claude lane's tier). The external three are
//     PINNED to the fixed production tiers: Codex(gpt-5.6-sol)=medium, Grok(grok-4.5)=medium,
//     Gemini-3.1-pro via agy=high. Grounding is the SHARED SCOPE DIGEST for every family (not deep
//     per-CLI repo exploration) — that was measured to be the dominant wall-clock cost in the overnight
//     ablation; the digest already carries deep Claude-native grounding from Scope+Lenses.

const ask = (args && args.ask) || ''
const context = (args && args.context) || ''

const REPO = '/Users/farzanm4/Desktop/drive/repos/oparax'
const SCRIPT_DIR = `${REPO}/.claude/workflows/council`
const SCHEMA = `${REPO}/.claude/workflows/plan-codex-schema.json`
const SKILLS_SH = `${REPO}/.claude/workflows/list-plan-skills.sh`
const SCRATCH = `${REPO}/.feature/plan-council` // self-gitignoring — .feature/ is the flow's live scratch

// external-family production tiers (locked with Farzan — not re-litigated per-run)
const TIERS = { codex: 'medium', grok: 'medium', agy: 'gemini-3.1-pro-high' }

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
      description: '2-3 genuinely distinct candidate approaches, each of which already satisfies every constraint in constraintSet. This is a SHARED SEED for the draft council, not a ceiling — each family may deviate from it if it sees a stronger spine.',
    },
  },
  required: ['constraintSet', 'candidates'],
}

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    chosenApproach: { type: 'string' },
    plan: { type: 'string', description: 'the full plan as markdown: file map first, then bite-sized tasks with exact file ownership + interfaces + the skills each task must invoke' },
    keyConstraints: { type: 'array', items: { type: 'string' } },
    risksOrDisagreements: { type: 'array', items: { type: 'string' } },
    instructionUpdates: { type: 'array', items: { type: 'string' }, description: 'AGENTS.md / docs/decisions.md / .claude/rules edits this slice makes necessary, each as "FILE: what to change and why". Empty array when nothing goes stale.' },
  },
  required: ['chosenApproach', 'plan', 'keyConstraints', 'risksOrDisagreements', 'instructionUpdates'],
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

// Shared-digest grounding for every external family: NO filesystem exploration — the Scope digest
// (already deeply repo-grounded via Claude Sonnet reading AGENTS.md + rules + the real tree) is the
// only ground truth. This is the production grounding decision (vs. deep per-CLI exploration, which
// the overnight ablation showed to be the dominant wall-clock cost for a marginal, unmeasured gain).
const GROUND_RULE = `\n\nHARD RULE: Do NOT read, open, list, or grep ANY repository files. The repo digest and constraint set above are all the ground truth you need. Produce the plan using ONLY the context given here.`

// External-CLI draft worker: a sonnet shell-bridge routing through council/run.sh.
async function cliWorker(family, tier, promptText, displayLabel, fileStem, ph) {
  const raw = await agent(
    `You are a shell bridge to the ${family} planning CLI. Do EXACTLY these steps and nothing else — plan nothing yourself:
1. Using the Write tool, create the file "${SCRATCH}/${fileStem}.in.txt" with EXACTLY this content:
<<<PROMPT
${promptText}
PROMPT
2. Run this ONE command verbatim:
   CLAUDE_PROJECT_DIR="${REPO}" COUNCIL_SCRATCH="${SCRATCH}" COUNCIL_TIER="${tier}" bash "${SCRIPT_DIR}/run.sh" ${family} ${fileStem}
3. If it exits non-zero, OR "${SCRATCH}/${fileStem}.out.json" is missing or empty, return exactly: FAILED
4. Otherwise read "${SCRATCH}/${fileStem}.out.json" and return its RAW verbatim contents and nothing else — no fences, no commentary.`,
    { label: displayLabel, phase: ph, model: 'sonnet', agentType: 'general-purpose' },
  )
  return parsePlan(raw)
}

// ── Stage 0 · Scope: select skills from the live inventory + gather guards ────
phase('Scope')
const scope = await agent(
  `You are the scope+ground pass for ONE feature slice. There is NO diff yet — infer from the ask and the repo. Do all of this:

1. Run the live skill inventory:  bash ${SKILLS_SH}
   It prints one \`skill-id<TAB>description\` line per plan-relevant stack skill. These IDs are the ONLY valid values for \`skills\`.
2. Predict the files/globs this slice will create or modify (grep/read the repo to ground the guess) → touchedPaths.
3. Read AGENTS.md, and read every .claude/rules/*.md whose \`paths:\` frontmatter glob matches any touchedPath. Distill the hard guards that apply to THIS slice.
4. SELECT the skills whose remit the slice genuinely touches — read the printed descriptions and match them to the work. No cap. When a skill is borderline, include it.

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

Do two things: (1) merge every lens's hard constraints into ONE deduped constraintSet — the walls. (2) Propose 2-3 GENUINELY DISTINCT candidate approaches, each of which already satisfies every wall. This menu seeds an independent 4-model draft council next — make the candidates real alternatives, not trivial variants, but know that each family is free to deviate from this menu if it sees a stronger spine.`,
  { label: 'consolidate', phase: 'Consolidate', agentType: 'general-purpose', schema: CONSOLIDATE_SCHEMA },
)

const candidates = (consolidated && Array.isArray(consolidated.candidates) ? consolidated.candidates : []).filter(Boolean)
const constraintSet = (consolidated && consolidated.constraintSet) || []
log(`plan-synth consolidate → ${candidates.length} candidates: ${candidates.map((c) => c.name).join(', ')}`)

// ── Stage 3 · Draft council: ONE fleshed plan per family, all concurrent ─────
phase('DraftCouncil')
const draftPrompt = `Draft a buildable plan for this feature slice and fill the schema (chosenApproach; plan as markdown with a file map + bite-sized tasks; keyConstraints; risksOrDisagreements; instructionUpdates — the AGENTS.md / docs/decisions.md / .claude/rules edits this slice makes necessary, each as "FILE: what to change and why").
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Repo digest: ${digest}
Constraint set (the walls every approach must satisfy): ${JSON.stringify(constraintSet)}
Candidate menu (a STARTING FRAME, not a limit — pick one, blend them, or propose your own spine if you see a stronger approach; the constraint set is what's binding, not this menu): ${JSON.stringify(candidates)}${GROUND_RULE}`

const draftJobs = [
  () => agent(draftPrompt, { label: 'claude:draft', phase: 'DraftCouncil', model: 'opus', agentType: 'general-purpose', schema: PLAN_SCHEMA }).then((o) => ({ fam: 'claude', out: o })),
  () => cliWorker('codex', TIERS.codex, draftPrompt, 'codex:draft', 'draft-codex', 'DraftCouncil').then((o) => ({ fam: 'codex', out: o })),
  () => cliWorker('grok', TIERS.grok, draftPrompt, 'grok:draft', 'draft-grok', 'DraftCouncil').then((o) => ({ fam: 'grok', out: o })),
  () => cliWorker('agy', TIERS.agy, draftPrompt, 'agy:draft', 'draft-agy', 'DraftCouncil').then((o) => ({ fam: 'agy', out: o })),
]
const drafts = (await parallel(draftJobs)).filter(Boolean).filter((r) => r.out)
log(`plan-synth draft council → ${drafts.length}/4 returned (${drafts.map((d) => d.fam).join(', ')})`)

// ── Stage 4 · Synthesize: fold surviving drafts into ONE final plan (INHERITS) ──
phase('Synthesize')
let plan = null
if (drafts.length) {
  plan = await agent(
    `You have ${drafts.length} independently drafted plans for the SAME feature slice, from different model families. Produce the FINAL plan — the record other engineers build from.
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Repo digest: ${digest}
Constraint set (the walls): ${JSON.stringify(constraintSet)}
Drafts (JSON, each tagged with its family): ${JSON.stringify(drafts)}

Take the best-reasoned draft as the spine, graft superior COMPATIBLE ideas from the others (verify each graft does not conflict with the spine), and record any load-bearing disagreement rather than averaging it away. Do not inflate scope: a merge is for the better of several takes on the SAME slice, not the union of everything every family imagined — anything only one draft wanted and the slice does not need is dropped. Emit ONLY the final plan as markdown, with these sections:
- **Definition of done** — up top; the slice's contract.
- **Approach** — the decided one only, not a menu.
- **In scope / Deferred** — Deferred is only for a substantial related slice better built after this one; incidental "while we're here" ideas are dropped, never inflated in.
- **Build steps** — for a zero-context engineer: file map first; bite-sized tasks with exact file ownership + interfaces; per task, the SKILLS it must invoke; full code in non-obvious steps; no placeholders.
- **## Stack & design acceptance criteria** — the deduped union of the lenses' acceptanceCriteria plus anything the drafts converge on, as a concrete checklist. feature-qc verifies the built diff against this section, so every line must be checkable.
- **Conflicts resolved** — one line per reconciled disagreement between families and the call made (omit if none).
- **Instruction-file updates** — the deduped union of every draft's instructionUpdates, each "FILE: change". Write "none" if truly empty.`,
    { label: 'synthesize', phase: 'Synthesize', agentType: 'general-purpose' },
  )
}

const draftsByFamily = drafts.reduce((a, d) => (a[d.fam] = true, a), {})
log(`plan-synth: final plan synthesized from ${drafts.length}/4 families (${drafts.map((d) => d.fam).join(', ') || 'NONE — check draft council'})`)
return { plan, scope, lenses, drafts, draftsByFamily, familiesReturned: drafts.map((d) => d.fam) }
