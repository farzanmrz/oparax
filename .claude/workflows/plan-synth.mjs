export const meta = {
  name: 'plan-synth',
  description: 'Ground one feature slice in the stack skills that apply to it, then synthesize a single spec+plan. Stage 1 fans out one skill-grounded brief per relevant angle (fired only when the slice touches that area); Stage 2 reconciles the briefs into one coherent plan with per-task acceptance criteria for QC to verify.',
  whenToUse: "feature-plan's step 3 — replaces the solo consider-approaches-then-draft pass with deterministic skill grounding. The session presents the returned plan at the human gate; nothing ships without approval.",
  phases: [
    { title: 'Scope', detail: 'predict which stack areas the slice touches → fire only those angles' },
    { title: 'Briefs', detail: 'one skill-grounded brief per fired angle, in parallel' },
    { title: 'Synthesis', detail: 'reconcile briefs → one spec+plan + acceptance criteria (opus)' },
  ],
}

// args (from the feature-plan skill):
//   { ask: string,        // the confirmed ask (post thinking-gate — already stripped to its problem)
//     context?: string }  // any seed material worth carrying (issue text, prior decisions)
//
// Returns { plan: string (markdown, ready to paste at the gate), scope, briefs }.

const ask = (args && args.ask) || ''
const context = (args && args.context) || ''

const SCOPE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    areas: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ui: { type: 'boolean', description: 'renders or changes any UI surface' },
        react: { type: 'boolean', description: 'non-trivial component/state/interactivity (not a pure copy or style tweak)' },
        newSurface: { type: 'boolean', description: 'introduces a NEW page or component surface (not an edit to an existing one)' },
        route: { type: 'boolean', description: 'adds/changes a route, data fetching, or a Server/Client boundary' },
        agentLayer: { type: 'boolean', description: 'touches the agent/chat/model layer (lib/agent, app/api/chat, lib/sysprompts, tools/streaming)' },
        schema: { type: 'boolean', description: 'a table/migration, RLS, or auth flow' },
      },
      required: ['ui', 'react', 'newSurface', 'route', 'agentLayer', 'schema'],
    },
    rationale: { type: 'string', description: 'one line per true flag saying which file/area drove it' },
  },
  required: ['areas', 'rationale'],
}

const BRIEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    angle: { type: 'string' },
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
  required: ['angle', 'constraints', 'recommendedApproach', 'acceptanceCriteria', 'conflictsToWatch'],
}

// Each angle fires only when its `when(areas)` predicate holds — so a copy-edit never
// launches supabase/ai-sdk, and a migration never launches the UI lenses. repo-fit is
// the always-on floor (the repo-specific guards no external skill knows). Brief agents
// invoke their skill(s) at runtime, so the workflow never goes stale as skills evolve.
const ANGLES = [
  {
    key: 'nextjs', when: (a) => a.route, model: 'sonnet', skills: ['vercel:nextjs'],
    focus: 'App Router architecture — Server vs Client Component boundaries, Server Actions vs route handlers, where data fetching lives, rendering + caching strategy. These decisions dictate the task breakdown, so decide them now.',
  },
  {
    key: 'react', when: (a) => a.react, model: 'sonnet', skills: ['vercel:react-best-practices'],
    focus: 'component composition, state placement/lifting, effect discipline, and re-render shape for the interactive parts of this slice.',
  },
  {
    key: 'web-design', when: (a) => a.ui, model: 'sonnet', skills: ['web-design-guidelines'],
    focus: 'the Web Interface Guidelines — accessibility, focus management, semantics, interaction/loading/empty states, contrast. Turn them into concrete acceptance criteria for every UI surface the slice touches.',
  },
  {
    key: 'frontend-design', when: (a) => a.newSurface, model: 'sonnet', skills: ['frontend-design'],
    focus: "aesthetic direction for the NEW surface — typography, layout, visual hierarchy. Propose distinctive direction, but stay inside the app's existing design language (stock shadcn + vendored ai-elements + the bespoke sidebar/auth-shell/logo); flag anything that would deviate so synthesis can reconcile it against consistency.",
  },
  {
    key: 'ai-sdk', when: (a) => a.agentLayer, model: 'sonnet', skills: ['vercel:ai-sdk', 'vercel:ai-gateway'],
    focus: 'the AI SDK agent/streaming/tool-loop contract and the AI-Gateway model routing for the agent layer this slice changes.',
  },
  {
    key: 'supabase', when: (a) => a.schema, model: 'sonnet', skills: ['supabase:supabase', 'supabase:supabase-postgres-best-practices'],
    focus: 'RLS + owner-scoping, the auth-flow contracts, and the schema shape + migration approach — plus the repo\'s "no persistence until a data shape earns it" guard.',
  },
  {
    key: 'repo-fit', when: () => true, model: 'sonnet', skills: [],
    focus: 'the repo-specific constraints no external skill knows. Read AGENTS.md and the .claude/rules/ files for the areas this slice touches, and surface every hard guard, behavior contract, and drift-guard the slice must respect.',
  },
]

const briefPrompt = (angle) => `You are the ${angle.key} planning lens for ONE feature slice — a single expert perspective feeding a synthesizer, not the whole plan.
${angle.skills.length ? `FIRST invoke ${angle.skills.map((s) => `the \`${s}\` skill`).join(' and ')} (Skill tool) and apply its guidance to this slice.` : ''}
Confirmed ask (already stripped to its load-bearing problem): ${ask}
${context ? `Context: ${context}` : ''}
Your lens: ${angle.focus}
Ground in the ACTUAL repo — read the files this slice will touch and grep for the contracts/callers involved; never guess.
Return a brief for THIS slice only: the hard constraints your lens imposes (each with the failure it prevents), the ONE approach your lens recommends, concrete checkable acceptance criteria an implementer can be held to, and the points where your lens is likely to conflict with another lens. An empty conflicts list is fine.`

phase('Scope')
const scope = await agent(
  `Predict which stack areas this feature slice will touch, so planning fires only the relevant skill lenses. There is NO diff yet — infer from the ask and a quick grep of the repo (which files/areas the slice will create or modify).
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Set each flag precisely — but when a flag is genuinely ambiguous, prefer true: a spurious lens just returns "nothing relevant" (cheap), while a missed lens silently drops a constraint (mid-build rework, the expensive failure). Give one rationale line per true flag naming the file/area that drove it.`,
  { label: 'scope', phase: 'Scope', model: 'sonnet', schema: SCOPE_SCHEMA },
)

const areas = (scope && scope.areas) || { ui: true, react: true, newSurface: true, route: true, agentLayer: true, schema: true }
const fired = ANGLES.filter((a) => a.when(areas))
log(`plan-synth scope → firing ${fired.length} lenses: ${fired.map((a) => a.key).join(', ')}`)

phase('Briefs')
const briefResults = await parallel(
  fired.map((a) => () =>
    agent(briefPrompt(a), {
      label: `brief:${a.key}`,
      phase: 'Briefs',
      agentType: 'general-purpose',
      model: a.model,
      schema: BRIEF_SCHEMA,
    }).then((out) => ({ key: a.key, out })),
  ),
)
const briefs = briefResults.filter(Boolean).filter((r) => r.out).map((r) => r.out)

phase('Synthesis')
const plan = await agent(
  `You are the plan synthesizer for ONE feature slice. You have ${briefs.length} expert briefs (${fired.map((a) => a.key).join(', ')}). Produce ONE coherent spec+plan — the record other engineers build from.
Confirmed ask: ${ask}
${context ? `Context: ${context}` : ''}
Briefs (JSON):
${JSON.stringify(briefs, null, 2)}

Work in order:
1. Assemble 2-3 whole-slice candidate approaches implied by the briefs' recommendedApproach fields.
2. Choose/merge ONE by applying the four lenses — risk-first, YAGNI-minimal, vertical-slice, verification-first. Decide; the alternatives never enter the plan.
3. Reconcile the briefs: where they are ADDITIVE, merge; where they CONFLICT (e.g. a bold custom component the frontend-design lens wants vs. the stock semantics the web-design lens wants), make the call and record why.

Emit ONLY the plan as markdown, with these sections:
- **Definition of done** — up top; the slice's contract.
- **Approach** — the decided one only, not a menu.
- **In scope / Deferred** — Deferred is only for a substantial related slice better built after this one; incidental "while we're here" ideas are dropped, never inflated in.
- **Build steps** — for a zero-context engineer: file map first; bite-sized tasks with exact file ownership + interfaces; per task, the SKILLS it must invoke (carry them from the briefs); full code in non-obvious steps; no placeholders.
- **## Stack & design acceptance criteria** — the deduped union of the briefs' acceptanceCriteria, as a concrete checklist. feature-qc verifies the built diff against this section, so every line must be checkable.
- **Conflicts resolved** — one line per reconciled conflict and the call made (omit if none).`,
  { label: 'synthesis', phase: 'Synthesis', agentType: 'general-purpose', model: 'opus', effort: 'high' },
)

log(`plan-synth: plan synthesized from ${briefs.length} briefs`)
return { plan, scope, briefs }
