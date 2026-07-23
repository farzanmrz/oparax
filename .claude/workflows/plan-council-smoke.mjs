export const meta = {
  name: 'plan-council-smoke',
  description: 'PLUMBING SMOKE TEST (cheap models) of the full multi-family planning topology: Claude scope/lenses/consolidate → a flesh council where all four model families (Claude + Codex + Grok + agy) flesh every candidate in parallel via the committed CLI wrappers → a judgment council (four families synthesize across all fleshes) → a Claude unifier. Proves the WIRING executes end-to-end (CLI shell-bridges, concurrent fan-out, per-family schema parsing, best-effort fallback). Does NOT prove timing with real models — cheap tiers finish in seconds and mask the bash-cap risk that the real-model run must still verify.',
  whenToUse: 'Run once to confirm the council execution flow works before wiring the real-model version. Read-only; produces a throwaway plan for a toy ask.',
  phases: [
    { title: 'Scope', detail: 'select skills (haiku)' },
    { title: 'Lenses', detail: 'skill briefs (haiku)' },
    { title: 'Consolidate', detail: 'name 2 candidates (haiku)' },
    { title: 'FleshCouncil', detail: 'each candidate fleshed by all 4 families in parallel' },
    { title: 'JudgeCouncil', detail: 'four families synthesize across all fleshes' },
    { title: 'Unify', detail: 'Claude unifier → final plan (haiku)' },
  ],
}

// Toy ask by default — this test is about the topology executing, not plan quality.
const ask = (args && args.ask) || 'Add a GET /hello route to the app (app/hello/route.ts) that returns a JSON greeting, wired minimally with no new dependencies.'
const SCHEMA = '.claude/workflows/plan-codex-schema.json'
const CDIR = '.feature/council'

// ---- shared plan schema (same shape every family fills) ----
const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    chosenApproach: { type: 'string' },
    plan: { type: 'string' },
    keyConstraints: { type: 'array', items: { type: 'string' } },
    risksOrDisagreements: { type: 'array', items: { type: 'string' } },
  },
  required: ['chosenApproach', 'plan', 'keyConstraints', 'risksOrDisagreements'],
}

function parsePlan(raw) {
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  if (t.startsWith('FAILED')) return null
  try { const s = t.indexOf('{'), e = t.lastIndexOf('}'); if (s < 0 || e <= s) return null; return JSON.parse(t.slice(s, e + 1)) } catch { return null }
}

// External-CLI worker: a thin haiku shell-bridge that writes the prompt, runs the wrapper, returns the JSON.
// tier: codex/grok effort or agy model slug (all cheapest for the smoke test).
async function cliWorker(family, tier, promptText, label, phase) {
  const raw = await agent(
    `You are a shell bridge to the ${family} planning CLI — do EXACTLY these steps, nothing else, plan nothing yourself:
1. Using the Write tool, create the file "${CDIR}/${label}.in.txt" with EXACTLY this content:
<<<PROMPT
${promptText}
PROMPT
2. Run this one command:
   bash .claude/workflows/council/plan-${family}.sh "${CDIR}/${label}.in.txt" "${SCHEMA}" "${tier}" "${CDIR}/${label}.out.json"
3. If it exits non-zero, or "${CDIR}/${label}.out.json" is missing or empty, return exactly: FAILED
4. Otherwise return the RAW verbatim contents of "${CDIR}/${label}.out.json" and nothing else (no fences, no commentary).`,
    { label, phase, model: 'haiku', agentType: 'general-purpose' },
  )
  return parsePlan(raw)
}

// Claude worker: native flesh/judge, cheap tier.
async function claudeWorker(promptText, label, phase, schema) {
  return agent(promptText, { label, phase, model: 'haiku', agentType: 'general-purpose', schema })
}

const FAMILIES = [
  { key: 'claude', kind: 'claude' },
  { key: 'codex', kind: 'cli', tier: 'low' },
  { key: 'grok', kind: 'cli', tier: 'low' },
  { key: 'agy', kind: 'cli', tier: 'gemini-3.6-flash-high' },
]

// ---- Stage 0: Scope ----
phase('Scope')
const scope = await agent(
  `Toy smoke test. Run \`bash .claude/workflows/list-plan-skills.sh\` and pick 2 skill IDs most relevant to this ask, and give a one-line repo digest.
Ask: ${ask}`,
  {
    label: 'scope', phase: 'Scope', model: 'haiku', agentType: 'general-purpose',
    schema: { type: 'object', additionalProperties: false, properties: { skills: { type: 'array', items: { type: 'string' } }, digest: { type: 'string' } }, required: ['skills', 'digest'] },
  },
)
const skills = (scope && scope.skills || []).slice(0, 2)
const digest = (scope && scope.digest) || ''
log(`scope → skills: ${skills.join(', ') || '(none)'}`)

// ---- Stage 1: Lenses ----
phase('Lenses')
const lenses = (await parallel(skills.map((s) => () =>
  agent(`You are the ${s} lens for this ask. Invoke the \`${s}\` skill, then give 2 hard constraints + 2 acceptance criteria.
Ask: ${ask}\nDigest: ${digest}`, {
    label: `lens:${s}`, phase: 'Lenses', model: 'haiku', agentType: 'general-purpose',
    schema: { type: 'object', additionalProperties: false, properties: { constraints: { type: 'array', items: { type: 'string' } }, acceptance: { type: 'array', items: { type: 'string' } } }, required: ['constraints', 'acceptance'] },
  }).then((out) => ({ skill: s, out })),
))).filter(Boolean).filter((r) => r.out)
log(`lenses → ${lenses.length} returned`)

// ---- Stage 2a: Consolidate → 2 candidates ----
phase('Consolidate')
const consolidated = await agent(
  `Consolidate these lens constraints and propose exactly 2 distinct candidate approaches for the ask.
Ask: ${ask}\nLenses: ${JSON.stringify(lenses)}`,
  {
    label: 'consolidate', phase: 'Consolidate', model: 'haiku', agentType: 'general-purpose',
    schema: { type: 'object', additionalProperties: false, properties: { constraints: { type: 'array', items: { type: 'string' } }, candidates: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, sketch: { type: 'string' } }, required: ['name', 'sketch'] } } }, required: ['constraints', 'candidates'] },
  },
)
const candidates = (consolidated && consolidated.candidates || []).slice(0, 2)
const constraints = (consolidated && consolidated.constraints) || []
log(`consolidate → ${candidates.length} candidates`)

// ---- Stage 2b: Flesh council — every candidate × every family, all in parallel ----
phase('FleshCouncil')
const fleshPrompt = (cand) => `Flesh this candidate approach into a short buildable plan for the ask, and fill the schema (chosenApproach, plan, keyConstraints, risksOrDisagreements).
Ask: ${ask}
Candidate: ${cand.name} — ${cand.sketch}
Constraints: ${JSON.stringify(constraints)}
Trust these constraints; do not explore the repo.`
const fleshJobs = []
for (const cand of candidates) {
  for (const fam of FAMILIES) {
    const label = `flesh:${fam.key}:${(cand.name || 'c').slice(0, 10)}`
    if (fam.kind === 'claude') fleshJobs.push(() => claudeWorker(fleshPrompt(cand), label, 'FleshCouncil', PLAN_SCHEMA).then((o) => ({ fam: fam.key, cand: cand.name, out: o })))
    else fleshJobs.push(() => cliWorker(fam.key, fam.tier, fleshPrompt(cand), label, 'FleshCouncil').then((o) => ({ fam: fam.key, cand: cand.name, out: o })))
  }
}
const fleshes = (await parallel(fleshJobs)).filter(Boolean).filter((r) => r.out)
log(`flesh council → ${fleshes.length}/${fleshJobs.length} workers returned (by family: ${JSON.stringify(fleshes.reduce((a, r) => (a[r.fam] = (a[r.fam] || 0) + 1, a), {}))})`)

// ---- Stage 3: Judgment council — each family synthesizes across ALL fleshes ----
phase('JudgeCouncil')
const judgePrompt = `You have ${fleshes.length} fleshed candidate plans from multiple model families for the same ask. Synthesize them into ONE best plan (pick the strongest approach, graft compatible wins, verify grafts don't conflict). Fill the schema.
Ask: ${ask}
Fleshes: ${JSON.stringify(fleshes.map((f) => ({ fam: f.fam, cand: f.cand, plan: f.out })))}`
const judgeJobs = FAMILIES.map((fam) => {
  const label = `judge:${fam.key}`
  if (fam.kind === 'claude') return () => claudeWorker(judgePrompt, label, 'JudgeCouncil', PLAN_SCHEMA).then((o) => ({ fam: fam.key, out: o }))
  return () => cliWorker(fam.key, fam.tier, judgePrompt, label, 'JudgeCouncil').then((o) => ({ fam: fam.key, out: o }))
})
const judgments = (await parallel(judgeJobs)).filter(Boolean).filter((r) => r.out)
log(`judge council → ${judgments.length}/${judgeJobs.length} families judged`)

// ---- Stage 4: Unify ----
phase('Unify')
const finalPlan = await agent(
  `You have ${judgments.length} synthesized plans, one per model family, for the same ask. Unify them into the single final plan: take the best-reasoned spine, graft superior compatible ideas, record any load-bearing disagreement. Emit ONLY the final plan as markdown.
Ask: ${ask}
Family judgments: ${JSON.stringify(judgments)}`,
  { label: 'unify', phase: 'Unify', model: 'haiku', agentType: 'general-purpose' },
)

log(`plan-council-smoke: done — flesh ${fleshes.length}/${fleshJobs.length}, judges ${judgments.length}/${judgeJobs.length}`)
return {
  finalPlan,
  execution: {
    skills, candidates: candidates.map((c) => c.name),
    fleshReturned: fleshes.length, fleshTotal: fleshJobs.length,
    fleshByFamily: fleshes.reduce((a, r) => (a[r.fam] = (a[r.fam] || 0) + 1, a), {}),
    judgesReturned: judgments.length, judgesTotal: judgeJobs.length,
    judgeFamilies: judgments.map((j) => j.fam),
  },
}
