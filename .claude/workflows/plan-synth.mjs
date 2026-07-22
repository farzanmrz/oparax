export const meta = {
  name: 'plan-synth',
  description: 'Ground one feature slice in the stack skills that apply to it, then synthesize a single spec+plan across two independent model families. Stage 0 selects the relevant skills from the LIVE inventory (not a fixed menu); Stage 1 fans out one repo-grounded lens per selected skill; a Claude track (consolidate → flesh → judge) and a Codex track author a plan each in parallel; a final reconcile merges them into one plan with per-task acceptance criteria for QC.',
  whenToUse: "feature-plan's step 3 — replaces the solo consider-approaches-then-draft pass with deterministic skill grounding + cross-model synthesis. The session presents the returned plan at the human gate; nothing ships without approval.",
  phases: [
    { title: 'Scope', detail: 'select the relevant skills from the live inventory + gather the applicable repo guards' },
    { title: 'Lenses', detail: 'one repo-grounded lens per selected skill, in parallel (named after the skill)' },
    { title: 'Approaches', detail: 'consolidate constraints → name candidates (inherit) → flesh each (sonnet)' },
    { title: 'Plans', detail: 'Claude judge (inherit) + an independent Codex plan, in parallel' },
    { title: 'Reconcile', detail: 'merge the two plans into one + acceptance criteria (inherit)' },
  ],
}

// args (from the feature-plan skill):
//   { ask: string,        // the confirmed ask (post thinking-gate — already stripped to its problem)
//     context?: string }  // any seed material worth carrying (issue text, prior decisions)
//
// Returns { plan, scope, lenses, claudePlan, codexPlan, codexUsed }.
//
// MODEL POLICY (locked with Farzan):
//   - The cheap, parallel, grounded-EXTRACTION stages are PINNED to sonnet, so a fable-budget
//     session still gets a competent, cheap foundation (scope, lenses, approach-fleshing, the
//     codex shell-wrapper).
//   - The two CREATIVE/DECISION agents — 2a candidate-generation and the final judge/reconcile —
//     INHERIT the session model + tier (omit `model` AND `effort`). Spend your smart model where
//     judgment happens; couple it to your budget so a fable day scales the whole creative spine
//     down together instead of a jagged mismatch.

const ask = (args && args.ask) || ''
const context = (args && args.context) || ''

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
      description: 'A tight repo picture for the downstream lenses: what already exists in the touched areas, and the DISTILLED hard guards that apply — pulled from AGENTS.md and from every .claude/rules/*.md whose `paths:` glob matches touchedPaths. This is how the guards reach planning deterministically when there is no diff to auto-inject them.',
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
          name: { type: 'string' },
          sketch: { type: 'string', description: 'how this approach would build the slice, in a few sentences' },
        },
        required: ['name', 'sketch'],
      },
      description: '2-3 genuinely distinct candidate approaches, each of which already satisfies every constraint in constraintSet',
    },
  },
  required: ['constraintSet', 'candidates'],
}

const APPROACH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    fleshed: { type: 'string', description: 'the full write-up of this approach: file map, bite-sized tasks with exact file ownership + interfaces, and the skills each task must invoke' },
    violations: { type: 'array', items: { type: 'string' }, description: 'any constraint from the set this approach cannot satisfy (empty is the goal)' },
    risks: { type: 'array', items: { type: 'string' }, description: 'the real risks/weak points of THIS approach, honestly stated' },
  },
  required: ['name', 'fleshed', 'violations', 'risks'],
}

// ── Stage 0 · Scope: select skills from the live inventory + gather guards ────
phase('Scope')
const scope = await agent(
  `You are the scope+ground pass for ONE feature slice. There is NO diff yet — infer from the ask and the repo. Do all of this:

1. Run the live skill inventory:  bash .claude/workflows/list-plan-skills.sh
   It prints one \`skill-id<TAB>description\` line per plan-relevant stack skill. These IDs are the ONLY valid values for \`skills\`.
2. Predict the files/globs this slice will create or modify (grep/read the repo to ground the guess) → touchedPaths.
3. Read AGENTS.md, and read every .claude/rules/*.md whose \`paths:\` frontmatter glob matches any touchedPath. Distill the hard guards that apply to THIS slice.
4. SELECT the skills whose remit the slice genuinely touches — read the printed descriptions and match them to the work. No cap. When a skill is borderline, include it.

Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}

Return: the selected skill IDs (verbatim from the inventory), touchedPaths, a tight \`digest\` (what already exists in the touched areas + the distilled guards from step 3), and one rationale line per selected skill.`,
  { label: 'scope', phase: 'Scope', model: 'sonnet', agentType: 'general-purpose', schema: SELECT_SCHEMA },
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
      schema: LENS_SCHEMA,
    }).then((out) => ({ skill: skillId, out })),
  ),
)
const lenses = lensResults.filter(Boolean).filter((r) => r.out).map((r) => r.out)
log(`plan-synth: ${lenses.length}/${selected.length} lenses returned`)

// ── Stages 2-3 · Two plans in parallel: Claude track ‖ Codex track ───────────
async function claudeTrack() {
  // 2a — consolidate constraints + name candidates (INHERITS session model)
  const consolidated = await agent(
    `You are the consolidation step for ONE feature slice. You have ${lenses.length} skill-grounded lens briefs.
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Repo digest: ${digest}
Lens briefs (JSON):
${JSON.stringify(lenses, null, 2)}

Do two things: (1) merge every lens's hard constraints into ONE deduped constraintSet — the walls. (2) Propose 2-3 GENUINELY DISTINCT candidate approaches, each of which already satisfies every wall. Candidate generation sets the quality ceiling — the judge cannot pick better than this menu, so make the candidates real alternatives, not trivial variants.`,
    { label: 'consolidate', phase: 'Approaches', agentType: 'general-purpose', schema: CONSOLIDATE_SCHEMA },
  )

  const candidates = (consolidated && Array.isArray(consolidated.candidates) ? consolidated.candidates : []).filter(Boolean)
  const constraintSet = (consolidated && consolidated.constraintSet) || []

  // 2b — flesh each candidate + self-check against the constraint set (PINNED sonnet, parallel)
  const fleshed = await parallel(
    candidates.map((c, i) => () =>
      agent(
        `Flesh out ONE candidate approach for this feature slice into a buildable spec, and stress-test it.
Confirmed ask: ${ask}
Candidate: ${c.name} — ${c.sketch}
Constraint set it MUST satisfy:
${JSON.stringify(constraintSet, null, 2)}
Lens briefs (for the acceptance criteria + skills per task):
${JSON.stringify(lenses, null, 2)}
Ground in the actual repo. Return the full write-up (file map first, then bite-sized tasks with exact file ownership + interfaces + the skills each task must invoke), any constraint it CANNOT satisfy (violations), and its honest risks.`,
        { label: `flesh:${c.name || i + 1}`, phase: 'Approaches', agentType: 'general-purpose', model: 'sonnet', schema: APPROACH_SCHEMA },
      ),
    ),
  )
  const fleshedOk = fleshed.filter(Boolean)

  // 3 — judge: pick the winner, graft the best of the losers, emit the plan (INHERITS)
  const claudePlan = await agent(
    `You are the plan judge for ONE feature slice. You have fully-fleshed candidate approaches (each self-checked against the constraints). Produce ONE coherent spec+plan — the record other engineers build from.
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Repo digest: ${digest}
Constraint set (the walls):
${JSON.stringify(constraintSet, null, 2)}
Fleshed candidates (JSON, with self-check violations + risks):
${JSON.stringify(fleshedOk, null, 2)}

Pick ONE by applying the four lenses — risk-first, YAGNI-minimal, vertical-slice, verification-first — preferring a candidate with zero violations. Graft superior ideas from the runners-up. Then emit ONLY the plan as markdown, with these sections:
- **Definition of done** — up top; the slice's contract.
- **Approach** — the decided one only, not a menu.
- **In scope / Deferred** — Deferred is only for a substantial related slice better built after this one; incidental "while we're here" ideas are dropped, never inflated in.
- **Build steps** — for a zero-context engineer: file map first; bite-sized tasks with exact file ownership + interfaces; per task, the SKILLS it must invoke; full code in non-obvious steps; no placeholders.
- **## Stack & design acceptance criteria** — the deduped union of the lenses' acceptanceCriteria, as a concrete checklist. feature-qc verifies the built diff against this section, so every line must be checkable.
- **Conflicts resolved** — one line per reconciled conflict and the call made (omit if none).`,
    { label: 'judge', phase: 'Plans', agentType: 'general-purpose' },
  )
  return claudePlan
}

async function codexTrack() {
  // One flat, schema-bounded, read-only `codex exec` — an INDEPENDENT plan from a different
  // model family, fed the same skill-grounded constraints. Wrapped in a thin sonnet agent
  // (the workflow sandbox cannot shell out; a subagent can). Best-effort: on ANY failure this
  // returns null and reconcile falls back to the Claude plan. Codex can never block planning.
  const constraintsForCodex = lenses.map((l) => ({ skill: l.skill, constraints: l.constraints, acceptanceCriteria: l.acceptanceCriteria }))
  const planningPrompt = `Feature slice to plan (produce ONE implementation plan for a zero-context engineer):

ASK: ${ask}
${context ? `CONTEXT: ${context}` : ''}

REPO DIGEST (what exists + the hard guards that apply):
${digest}

SKILL-GROUNDED CONSTRAINTS (from Claude Code stack-skill lenses — treat as authoritative for this repo):
${JSON.stringify(constraintsForCodex, null, 2)}

Choose ONE approach. Ground every claim in the ACTUAL repo (read the files). Respect every constraint above. Fill the output schema: chosenApproach, plan (full markdown — definition of done, approach, in scope/deferred, build steps, acceptance criteria), keyConstraints, risksOrDisagreements.`

  const raw = await agent(
    `You are a shell bridge to the Codex CLI. Do EXACTLY these steps and nothing else — do not plan anything yourself.

STEP 1 — Confirm you are at the repo root: run \`pwd\` and \`test -f AGENTS.md && test -f .claude/workflows/plan-codex-schema.json\`. If either file is missing, return exactly CODEX_FAILED and stop.

STEP 2 — Using the Write tool, create the file \`.feature/codex-plan-prompt.txt\` with EXACTLY this content (verbatim, no edits):
<<<PROMPT
${planningPrompt}
PROMPT

STEP 3 — Run this single command (it is read-only and safe):
  codex exec --skip-git-repo-check -s read-only --output-schema .claude/workflows/plan-codex-schema.json --output-last-message .feature/codex-plan-out.json -C "$(pwd)" - < .feature/codex-plan-prompt.txt

STEP 4 — If the command's exit code is non-zero, OR \`.feature/codex-plan-out.json\` is missing or empty, return exactly: CODEX_FAILED

STEP 5 — Otherwise read \`.feature/codex-plan-out.json\` and return its RAW contents verbatim (it is a single JSON object) and NOTHING else — no commentary, no code fences.`,
    { label: 'codex-plan', phase: 'Plans', model: 'sonnet', agentType: 'general-purpose' },
  )

  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  if (t.startsWith('CODEX_FAILED')) return null
  try {
    const s = t.indexOf('{')
    const e = t.lastIndexOf('}')
    if (s < 0 || e <= s) return null
    return JSON.parse(t.slice(s, e + 1))
  } catch {
    return null
  }
}

phase('Approaches')
const [claudePlan, codexPlan] = await parallel([() => claudeTrack(), () => codexTrack()])
const codexUsed = !!(codexPlan && codexPlan.plan)
log(`plan-synth: Claude plan ${claudePlan ? 'ready' : 'MISSING'}; Codex plan ${codexUsed ? 'ready' : 'unavailable (falling back to Claude only)'}`)

// ── Stage 4 · Reconcile the two plans into one (INHERITS session model) ──────
phase('Reconcile')
let plan = claudePlan
if (codexUsed && claudePlan) {
  plan = await agent(
    `You are reconciling TWO independent plans for the SAME feature slice, authored by two different model families. Merge them into ONE final plan — the record engineers build from.
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}

PLAN A (Claude):
${claudePlan}

PLAN B (Codex) — chosen approach: ${codexPlan.chosenApproach}
${codexPlan.plan}
Codex's key constraints: ${JSON.stringify(codexPlan.keyConstraints)}
Codex's flagged risks/disagreements: ${JSON.stringify(codexPlan.risksOrDisagreements)}

Produce the FINAL plan:
- Take the better-reasoned approach as the spine; graft any superior task, guard, or acceptance criterion from the other.
- Where the two DISAGREE on something load-bearing, make the call and record it under "Conflicts resolved" with one line of why. Do not paper over a real disagreement — surfacing it is the point of the second author.
- Keep the exact section structure: Definition of done, Approach, In scope / Deferred, Build steps, ## Stack & design acceptance criteria, Conflicts resolved.
- Do not inflate scope: a merge is for the better of two takes on the SAME slice, not the union of everything both imagined. Anything only one plan wanted and the slice does not need → drop.
Emit ONLY the final plan as markdown.`,
    { label: 'reconcile', phase: 'Reconcile', agentType: 'general-purpose' },
  )
}

log(`plan-synth: final plan synthesized (${codexUsed ? 'cross-model: Claude + Codex' : 'Claude only'})`)
return { plan, scope, lenses, claudePlan, codexPlan, codexUsed }
