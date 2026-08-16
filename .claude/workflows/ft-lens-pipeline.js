export const meta = {
  name: 'ft-lens-pipeline',
  description: 'Args-driven: one Sonnet agent per skill bundle picked for a feature slice (args.bundles), run in parallel, each forced to invoke its bundle\'s skills via the Skill tool and ground its answer in the slice\'s real code before returning slice-specific constraints, gotchas, acceptance criteria, and conflicts to watch. Feeds the /feature planner between the draft plan and the owner sign-off -- it is a planning lens, not a critique and not the plan itself: no design decisions, no code.',
  phases: [
    { title: 'lenses', detail: 'one Sonnet agent per selected skill bundle, parallel, each forced to invoke its skills and return slice-specific constraints' },
  ],
}

const REPO = '/Users/farzanm4/Desktop/repos/oparax'

// Fixed bundle table. web and data apply to almost every slice; the rest are
// picked with the owner at the end of step 1 of /feature. Keys here are the
// only valid args.bundles values -- validated below, never guessed at.
const BUNDLES = {
  web: { skills: ['vercel:nextjs', 'vercel:vercel-functions', 'vercel:routing-middleware'] },
  ui: { skills: ['vercel:react-best-practices', 'vercel:shadcn', 'ui-ux-pro-max'], note: 'also read root DESIGN.md, the binding visual contract' },
  data: { skills: ['supabase', 'supabase-postgres-best-practices'] },
  ai: { skills: ['vercel:ai-sdk', 'vercel:ai-gateway'] },
  slack: { skills: ['vercel:chat-sdk', 'slack:block-kit', 'slack:slack-api', 'slack:slack-messaging'] },
  workers: { skills: ['railway:use-railway'], note: 'only when poller/ or ingest/ is touched' },
}

const featureTitle = args && args.featureTitle
const plan = args && args.plan
const bundles = args && args.bundles

if (!featureTitle || !plan || !Array.isArray(bundles) || bundles.length === 0) {
  throw new Error('ft-lens-pipeline requires args.featureTitle (the slice name), args.plan (the DRAFT owner-facing plan from /feature step 2), and args.bundles (a non-empty array of bundle keys picked with the owner at the end of step 1). Valid bundle keys are: ' + Object.keys(BUNDLES).join(', ') + '.')
}

const invalidBundles = bundles.filter(b => !Object.prototype.hasOwnProperty.call(BUNDLES, b))
if (invalidBundles.length > 0) {
  throw new Error('ft-lens-pipeline received invalid bundle key(s): ' + invalidBundles.join(', ') + '. Valid keys are: ' + Object.keys(BUNDLES).join(', ') + '.')
}

const LENS_SCHEMA = {
  type: 'object',
  properties: {
    bundle: { type: 'string' },
    constraints: { type: 'array', items: { type: 'string' }, description: 'constraints the invoked skills impose on this slice' },
    gotchas: { type: 'array', items: { type: 'string' }, description: 'gotchas or footguns the skills warn about that apply here' },
    acceptanceCriteria: { type: 'array', items: { type: 'string' }, description: 'acceptance criteria the skills imply for this slice' },
    conflictsToWatch: { type: 'array', items: { type: 'string' }, description: 'conflicts to watch, with other bundles or with the existing codebase' },
    skillsInvoked: { type: 'array', items: { type: 'string' }, description: 'the exact skill names actually invoked via the Skill tool' },
  },
  required: ['bundle', 'constraints', 'gotchas', 'acceptanceCriteria', 'conflictsToWatch', 'skillsInvoked'],
}

phase('lenses')
log('Dispatching ' + bundles.length + ' lens(es) in parallel: ' + bundles.join(', '))

function lensPrompt(key) {
  const bundle = BUNDLES[key]
  const skillsCsv = bundle.skills.join(', ')
  const noteLine = bundle.note ? `\n\nNote: ${bundle.note}` : ''

  return `You are the ${key} planning lens for ONE feature slice of oparax (an AI news desk app for reporters -- Next.js on Vercel, Supabase for data/auth, isolated Railway workers for source polling/ingest). You are feeding a planner, not writing the plan yourself: no design decisions, no code, no snippets.

FIRST, invoke each of these skills via the Skill tool, by their exact name -- actually call the Skill tool for each one, do not skip this or answer from memory: ${skillsCsv}.${noteLine}

THEN read the draft plan below, and read the repo files this slice will plausibly touch -- you have Read/Grep/Glob/Bash access to the real repo at ${REPO}. Ground everything you return in this slice's actual code and the skills you just invoked, not in generic framework knowledge.

DRAFT PLAN for "${featureTitle}":
${plan}

Return, grounded in the slice's real code, every field specific to this slice, never generic skill boilerplate:
- bundle: exactly "${key}"
- constraints: the constraints the invoked skills impose on this slice
- gotchas: gotchas or footguns the skills warn about that apply here
- acceptanceCriteria: acceptance criteria the skills imply for this slice
- conflictsToWatch: conflicts to watch, with other picked bundles or with the existing codebase
- skillsInvoked: the exact skill names you actually invoked via the Skill tool

This is a lens feeding a planner, not the plan itself: no design decisions, no code.`
}

const results = await parallel(
  bundles.map(key => async () => {
    try {
      return await agent(lensPrompt(key), { model: 'sonnet', label: 'lens:' + key, phase: 'lenses', schema: LENS_SCHEMA })
    } catch (err) {
      log('Lens ' + key + ' failed: ' + (err && err.message ? err.message : String(err)))
      return null
    }
  })
)

const lenses = results.filter(r => r !== null)
const deadLenses = bundles.filter((key, i) => results[i] === null)

log(lenses.length + ' lens(es) returned, ' + deadLenses.length + ' dead: ' + (deadLenses.join(', ') || 'none'))

return {
  featureTitle,
  bundles,
  lenses,
  deadLenses,
}
