export const meta = {
  name: 'ft-critique-pipeline',
  description: 'Args-driven: 4-lane critique (critique-codex-10, critique-grok, critique-claude, critique-agy) over a finished spec passed in via args.spec, then one adjudicate pass that hands back a REVISED VERSION of args.plan (same plain-language sections the owner already reviewed, updated in place) plus a short whatChanged list -- never a raw findings report, never jargon, the owner never reads args.spec directly. Both plan and spec are written inline in the /ft-plan conversation (session-inherited model) before this workflow is ever triggered -- no spec-authoring phase here. An optional args.skills (flat list of skill names, may be empty) steers every lane to consult and cite the skills recorded on the plan\'s Skills: line where a finding rests on a rule one of them covers. critique-claude and adjudicate both run on the SAME session-inherited model/effort as the plan session (no pinning); adjudicate is still its own fresh workflow agent call so it reads the lanes with a clean, unbiased context instead of the planning conversation\'s accumulated history.',
  phases: [
    { title: 'critique', detail: '4 parallel critique lanes attack the spec passed in via args.spec, returned raw' },
    { title: 'adjudicate', detail: 'one fresh-context, session-inherited pass revises args.plan in place (same format the owner already reviewed) and lists what changed' },
  ],
}

const REPO = '/Users/farzanm4/Desktop/repos/oparax'

// Two documents, not one. args.plan is the plain-language document the
// owner actually discusses and reviews (what happens, what happens on
// failure, the decisions, open questions, out of scope) -- written and
// agreed on FIRST, in the /ft-plan conversation, on whatever model the
// owner was using for that back-and-forth. args.spec is the detailed
// technical document (same decisions, expanded with exact files, contracts,
// edge cases, build steps) the owner flips to a stronger model to generate
// only once the plan is settled -- the owner never reads this one directly.
// Neither is authored by this workflow; both already exist by the time
// this workflow is triggered.
const PLAN_FORMAT = `- What happens: plain words, step by step, what a user experiences.
- What happens when it fails: plain words, what the user sees.
- The decisions: a short list, one line each, plain words, no code terms.
- Open questions: anything genuinely unresolved that needs the owner's own call.
- Out of scope: what is explicitly not being built this round.`

const featureTitle = args && args.featureTitle
const plan = args && args.plan
const spec = args && args.spec
if (!featureTitle || !plan || !spec) {
  throw new Error('ft-critique-pipeline requires args.featureTitle (the slice name -- no GitHub issue exists yet at this point in the flow, it is created AFTER adjudication), args.plan (the plain-language document the owner reviewed), and args.spec (the detailed technical document) -- plan and spec are both written inline during the /feature conversation with the owner. This workflow runs critique and adjudicate only; it does not author either document, and it has no defaults tied to any past feature.')
}

// args.skills is optional: the flat list of skill names recorded on the
// Skills: line at the top of the detailed plan (feature/SKILL.md step 5) --
// may be empty when no bundle applied. Each lane gets one sentence steering
// it to consult these skills where a finding rests on a rule they cover.
// codex invokes skills as $name and Claude invokes them via the Skill tool,
// so both get the names as given; grok is a bare CLI with no skill-
// invocation concept, so it gets the same names with any vercel:/slack:
// bundle prefix stripped; agy cannot invoke skills at all, so its line is
// framed as rules to weigh rather than tools to call.
const skills = (args && args.skills) || []
// Skill names travel as BARE canonical names (the Skills: line in the detailed plan).
// Each harness invokes them under its own prefix, so map per lane instead of hoping.
const VERCEL_SKILLS = new Set(['nextjs', 'vercel-functions', 'routing-middleware', 'react-best-practices', 'shadcn', 'ai-sdk', 'ai-gateway', 'chat-sdk'])
const SUPABASE_SKILLS = new Set(['supabase', 'supabase-postgres-best-practices'])
const SLACK_SKILLS = new Set(['block-kit', 'slack-api', 'slack-messaging', 'create-slack-app'])
const codexSkill = s => VERCEL_SKILLS.has(s) ? 'vercel:' + s : SUPABASE_SKILLS.has(s) ? 'supabase:' + s : s
const claudeSkill = s => VERCEL_SKILLS.has(s) ? 'vercel:' + s : SLACK_SKILLS.has(s) ? 'slack:' + s : s === 'use-railway' ? 'railway:' + s : s
const CODEX_ONLY = s => s !== 'ui-ux-pro-max' // a Claude project skill; Codex reads DESIGN.md instead
const consultLine = names => names.length ? 'Consult these skills where a finding rests on a rule they cover, and cite the rule: ' + names.join(', ') + '.' : ''
const SKILLS_LINE = consultLine(skills.filter(CODEX_ONLY).map(codexSkill))
const CLAUDE_SKILLS_LINE = consultLine(skills.map(claudeSkill))
const GROK_SKILLS_LINE = consultLine(skills)
const AGY_SKILLS_LINE = GROK_SKILLS_LINE.replace('Consult these skills', 'These are rules to weigh, not skills you can invoke')

// The 10 highest-yield codex lenses, kept from an original set of 24 based
// on adjudicated contribution measured on an earlier test run (7 sole-source
// findings all traced to this territory) -- a general-purpose set, not tied
// to any specific issue. Their .codex/agents/critique-<key>.toml files are
// the source of truth for each dimension; model + effort dialed to
// gpt-5.6-terra high there. The other 14 critique-*.toml files stay on disk
// as an inert bench (see ft-build-pipeline.js for the full list) -- swap one
// in when a slice's dimension actually applies.
const CODEX_LENSES = [
  { key: 'concurrency-claims', focus: 'claim/lease races, non-atomic check-then-write, concurrent multi-desk claims' },
  { key: 'rls-untrusted-ssrf', focus: 'deny-all table read directly from the browser, untrusted input reaching a prompt or fetch unescaped' },
  { key: 'async-resource-lifecycle', focus: 'timeouts/sockets/budgets not actually threaded through, unread response bodies' },
  { key: 'silent-vanishing', focus: 'things that disappear with no trace, no reason surfaced to the user' },
  { key: 'scope-convention-doc', focus: 'a governing doc the change makes wrong, unrelated files bundled in, stale comments' },
  { key: 'frame-attack', focus: 'real inputs or conditions the plan never mentions but a real user or source will produce' },
  { key: 'general', focus: 'no checklist -- read the whole thing cold and judge it as a system, is it the right design at all' },
  { key: 'cross-tenant-data-linkage', focus: 'server code trusts an internal pointer implied ownership without re-checking owner_id at point of use' },
  { key: 'third-party-contract-drift', focus: 'code assumes an external API/library shape or limit its docs do not actually guarantee' },
  { key: 'data-export-privacy-leak', focus: 'a response, log line, or error capture carrying more data than the consumer needs' },
]

const CODEX_LENS_NAMES_CSV = CODEX_LENSES.map(l => l.key).join(', ')

// The minimal shared lens card for the two single-session bridge lanes (grok,
// agy) plus the pinned critique-claude lane. One session each, NO sub-fan-out
// anywhere: the lenses steer attention inside a single pass, they are not
// per-agent assignments.
const MINIMAL_LENSES = [
  { key: 'frame-attack', focus: 'real inputs or conditions the spec never mentions but a real user or source will produce; a missing input class outranks any in-frame bug' },
  { key: 'contract-completeness', focus: 'every named type, payload, and function contract is actually enumerated field-by-field; nothing is named but left for the build to invent' },
  { key: 'internal-consistency', focus: 'decisions, journeys, and walkthrough steps that contradict each other or assert invariants the degraded states break' },
  { key: 'external-limits', focus: 'third-party API shapes, limits, encodings (code points vs UTF-16), escaping, and truncation the spec assumes rather than guarantees' },
  { key: 'security-trust', focus: 'authz and ownership at point of use, untrusted content reaching rendered/escaped surfaces, data leaving the trust boundary carrying more than the consumer needs' },
  { key: 'silent-failure', focus: 'states where something vanishes or degrades with no trace, no operator signal, and no user-facing reason' },
]

const MINIMAL_LENSES_TEXT = MINIMAL_LENSES.map(l => '- ' + l.key + ': ' + l.focus).join('\n')

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    severity: { type: 'string', description: 'blocking | important | minor' },
    target: { type: 'string' },
    critique: { type: 'string' },
    suggestion: { type: ['string', 'null'] },
  },
  required: ['severity', 'target', 'critique', 'suggestion'],
}

const FINDINGS_ARRAY_SCHEMA = {
  type: 'object',
  properties: { findings: { type: 'array', items: FINDING_SCHEMA } },
  required: ['findings'],
}

const ADJUDICATE_SCHEMA = {
  type: 'object',
  properties: {
    revisedPlan: { type: 'string', description: 'the FULL plan document, in the exact same 5-section plain-language format the owner already reviewed (What happens / What happens when it fails / The decisions / Open questions / Out of scope) -- this is the original plan text, edited in place wherever an accepted critique finding actually changes something. Where nothing changed, copy the original section verbatim. Never a findings report, never a lane-by-lane breakdown, never code-level language.' },
    whatChanged: { type: 'array', items: { type: 'string' }, description: 'short plain one-liners, each starting with Added / Changed / Removed, one per actual edit made to the plan -- this is the only place the fact that a review happened is visible as such' },
    openQuestionsForOwner: { type: 'array', items: { type: 'string' }, description: 'anything decision-shaped that needs the owner\'s own call, phrased as a plain question with the tradeoff stated in one sentence, not a technical fork -- also folded into the revisedPlan\'s own Open questions section' },
    deadLanes: { type: 'array', items: { type: 'string' }, description: 'any of critique-codex/critique-grok/critique-claude/critique-agy that returned nothing usable -- report as failed, never silently drop' },
  },
  required: ['revisedPlan', 'whatChanged', 'openQuestionsForOwner', 'deadLanes'],
}


// LANE PROTOCOL: how every external-CLI dispatcher runs its command. Written
// once, spliced into each dispatcher prompt. Two-phase because a single Bash
// call in this harness is capped at 10 minutes and, worse, a dispatcher that
// returned "timeout" had its still-running CLI killed (2026-08-17: both the
// codex and grok critique lanes died that way after 5 minutes of real work).
// There is NO wall budget by owner decision: lanes run to completion, and
// their elapsed time is reported so model/effort get tuned from measured
// runs, never pre-capped. .claude/scripts/lane.sh holds the mechanics.
const LANE_PROTOCOL = (laneName, failedMarker) => `LANE PROTOCOL (mandatory, exactly these steps, nothing else in between -- no ps, no peeking at partial output, no sleeping on your own):
A. Using Bash with run_in_background: true and NO timeout, run: bash ${REPO}/.claude/scripts/lane.sh start ${laneName} -- <the exact CLI command and its arguments>. lane.sh captures stdout/stderr itself; do NOT add your own redirects.
B. Then, in the FOREGROUND, run: bash ${REPO}/.claude/scripts/lane.sh wait ${laneName} with timeout: 600000. It prints ONE line: "DONE ...", "RUNNING ...", or "HUNG ...". If RUNNING, run that same wait command again, as many times as it takes -- there is no budget, the lane runs to completion, and you never return while it says RUNNING. If HUNG (over the 60-minute hung-process valve), run: bash ${REPO}/.claude/scripts/lane.sh kill ${laneName}, then continue to step C.
C. Run: bash ${REPO}/.claude/scripts/lane.sh result ${laneName} ${failedMarker}. Your final answer is: the DONE/HUNG line from step B on its own first line, then everything that result printed, verbatim. If it printed the ${failedMarker} marker (non-zero exit, hung, or empty output), return that verbatim too -- it carries stderr and whatever partial output exists, and the adjudicator treats the marker as a dead lane.`

phase('critique')
log('Spec received via args (' + spec.length + ' chars), dispatching 4 critique lanes')

const critiqueCodexPrompt = `You are a bridge dispatcher. Your ONLY job: run ONE real shell command against the real codex CLI, instructing it to fan out all 10 named critique agents below in parallel over the SPEC, then return the raw concatenated result verbatim. Do not critique anything yourself, do not synthesize, do not deduplicate, do not drop any finding.

The 10 agent names (each is critique-<name> defined in .codex/agents/, already has its own dimension baked into its profile -- you do not restate dimensions): ${CODEX_LENS_NAMES_CSV}

Steps:
1. Using Write, save the SPEC text below to a file under /tmp.
2. Follow the LANE PROTOCOL below with this CLI command: codex exec -s read-only -C ${REPO} -m gpt-5.6-sol -c model_reasoning_effort=medium --json "<instruction>", where <instruction> tells codex to: read the spec at your file path; treat this as a PRE-IMPLEMENTATION plan review (there is no diff yet, only the spec claims and the current repo state); spawn every one of the 10 named subagents in parallel via its subagent tool, each with agent_type set to exactly critique-<name> for each of these names: ${CODEX_LENS_NAMES_CSV}; when agent_type is set, it must NOT use fork_turns "all" (that combination is rejected) -- use fork_turns none or omit fork_turns entirely; give every spawned agent the same spec content, the PRE-IMPLEMENTATION framing${SKILLS_LINE ? `, and this line verbatim: "${SKILLS_LINE}" (skills are invoked as $name exactly as written)` : ''} as its task message; wait for all 10 to return; then output ONE JSON array that is the flat concatenation of every single agent raw findings array, with no merging, deduping, or summarizing -- just every element from every agent concatenated into one array, printed as the final message and nothing else.
3. Return per the LANE PROTOCOL.

${LANE_PROTOCOL('critique-codex', 'CODEX_FIXED_LANE_FAILED')}

SPEC:
${spec}`

const critiqueGrokPrompt = `You are a bridge dispatcher. Your ONLY job: run ONE real shell command against the real grok CLI on the SPEC below, wait for it to finish, then return its raw stdout verbatim. Do not critique anything yourself, do not summarize, do not paraphrase.

This is a SINGLE-SESSION holistic pass: grok must NOT spawn any subagents (the command below disables them; a fan-out has no cost or time knob, one session has model + effort), and the lens card in the prompt steers its attention inside that one session -- it is not a fan-out plan. No turn cap is passed: grok uses its own default (owner decision 2026-08-17: no caps, measure instead).

Steps:
1. Using Write, create a prompt file under /tmp with this exact content, substituting the SPEC where marked:

"You are a critic in oparax's cross-model review council, reviewing a PRE-IMPLEMENTATION SPEC (not yet built) for oparax ${featureTitle}. You have read-only access to the real repo -- ground every claim in the actual code, the spec is a hypothesis and the code is the evidence, cite real file:line where relevant. This is ONE holistic pass: do not spawn subagents. Work through the whole spec considering AT LEAST these lens dimensions, plus anything else you judge applicable:
${MINIMAL_LENSES_TEXT}
${GROK_SKILLS_LINE ? '\n' + GROK_SKILLS_LINE + '\n' : ''}
Return ONLY a JSON array of finding objects, one per finding, each shaped exactly {"severity": "blocking|important|minor", "target": string, "critique": string, "suggestion": string or null}. No preamble, no commentary, no markdown fencing -- just the raw JSON array.

SPEC:
(the spec text)"

2. Follow the LANE PROTOCOL below with this CLI command, quoting exactly as written (the star-glob argument MUST be inside double quotes or the shell rejects the line before grok runs): grok --prompt-file <your file> --sandbox read-only --cwd ${REPO} --disallowed-tools "mcp__vercel__*,mcp__railway__*" --always-approve --no-subagents --effort medium -m grok-4.6 --output-format json. Do NOT pass --agent. Do NOT pass --max-turns. Do NOT add redirects.
3. Return per the LANE PROTOCOL.

${LANE_PROTOCOL('critique-grok', 'GROK_LANE_FAILED')}

SPEC to substitute above:
${spec}`

const critiqueAgyPrompt = `You are a bridge dispatcher. Your ONLY job: run ONE real shell command against the real agy (Antigravity) CLI on the SPEC below, wait for it to finish, then return its raw stdout verbatim. Do not critique anything yourself, do not summarize, do not paraphrase.

This is a single holistic critique pass, not a multi-lens fan-out. Do NOT pass --agent and do NOT ask agy to spawn or invoke any subagent itself -- the named-persona-plus-invoke_subagent path is unreliable in the current agy version (verified separately: a named --agent persona lacks the invoke_subagent tool by default and fails with a tool-not-found error) and must not be used here. The root/default persona (no --agent flag) is the one verified to work reliably headlessly.

Steps:
1. Follow the LANE PROTOCOL below with this CLI command: agy with exactly these flags, each JOINED WITH = (NOT a bare flag followed by a separate space-delimited value -- passing the prompt as a trailing positional argument after other flags silently drops it in this CLI and returns an unrelated generic greeting instead, with no error): --model=gemini-3.1-pro-high --effort=high --output-format=json --dangerously-skip-permissions --print="<the full prompt text below, with the SPEC substituted in place of its marker>". Do NOT add redirects.

The prompt text to pass as --print's value:
"You are a critic in oparax's cross-model review council, reviewing a PRE-IMPLEMENTATION SPEC (not yet built) for oparax ${featureTitle}. You have Read/Bash access to the real repo at ${REPO} -- ground every claim in the actual code, the spec is a hypothesis and the code is the evidence, cite real file:line where relevant. This is ONE holistic pass. Work through the whole spec considering AT LEAST these lens dimensions, plus anything else you judge applicable:
${MINIMAL_LENSES_TEXT}
${AGY_SKILLS_LINE ? '\n' + AGY_SKILLS_LINE + '\n' : ''}
Weigh cost: say what a user would actually see. Return ONLY a JSON array of finding objects, one per finding, each shaped exactly {\\"severity\\": \\"blocking|important|minor\\", \\"target\\": string, \\"critique\\": string, \\"suggestion\\": string or null}. No preamble, no commentary, no markdown fencing -- just the raw JSON array.

SPEC:
(the spec text, substituted below)"

2. Return per the LANE PROTOCOL.

${LANE_PROTOCOL('critique-agy', 'AGY_LANE_FAILED')}

SPEC to substitute above:
${spec}`

const critiqueClaudePrompt = `You are a critic in oparax's cross-model review council, reviewing a PRE-IMPLEMENTATION SPEC (not yet built) for oparax ${featureTitle}. You have Read/Bash access to the real repo at ${REPO} -- ground every claim in the actual code, the spec is a hypothesis and the code is the evidence, cite real file:line where relevant. This is ONE holistic pass in a single session: do not dispatch any agents. Work through the whole spec considering AT LEAST these lens dimensions, plus anything else you judge applicable:
${MINIMAL_LENSES_TEXT}
${CLAUDE_SKILLS_LINE ? '\n' + CLAUDE_SKILLS_LINE : ''}

Also verify the spec's own load-bearing factual citations (paths, export names, migration filenames, counts) against the tree -- a fabricated citation is itself a blocking finding. Return every distinct defect as its own finding; report coverage, do not self-filter for severity.

SPEC:
${spec}`

// critique-codex and critique-grok and critique-agy: cheap haiku bridge
// dispatchers, the REAL work happens inside the external CLI they shell out
// to (gpt-5.6-sol MEDIUM x10 codex critique-* agents; grok-4.6 MEDIUM in ONE
// session, no subagents, no turn cap -- one session is the deliberate choice
// because a fan-out has no cost/time knob while a session has model + effort;
// both dialed to medium on 2026-08-17 after measuring 6-14 minute lane times
// at high; gemini-3.1-pro-high single-session, tier fused into the slug). No lane has a wall budget; each reports its elapsed time (first line
// of its raw output) so the next tuning decision is made from real numbers.
// critique-claude: NO model/effort override -- inherits the SAME
// session-inherited model/effort as the owner's /ft-plan conversation,
// same as adjudicate below. This reverses an earlier pin to sonnet high:
// the owner chose consistency-with-the-planning-session over
// runs-identically-every-time, so this lane now moves with whatever tier
// the owner picked for this round instead of staying fixed.
const [critiqueCodexRaw, critiqueGrokRaw, critiqueClaudeOut, critiqueAgyRaw] = await parallel([
  () => agent(critiqueCodexPrompt, { model: 'haiku', label: 'critique-codex', phase: 'critique' }),
  () => agent(critiqueGrokPrompt, { model: 'haiku', label: 'critique-grok', phase: 'critique' }),
  () => agent(critiqueClaudePrompt, { label: 'critique-claude', phase: 'critique', schema: FINDINGS_ARRAY_SCHEMA }),
  () => agent(critiqueAgyPrompt, { model: 'haiku', label: 'critique-agy', phase: 'critique' }),
])

const firstLine = (v) => (typeof v === 'string' ? v : JSON.stringify(v ?? '')).split('\n')[0].slice(0, 160)
log('critique-codex: ' + firstLine(critiqueCodexRaw))
log('critique-grok: ' + firstLine(critiqueGrokRaw))
log('critique-agy: ' + firstLine(critiqueAgyRaw))
log('All 4 critique lanes returned, dispatching adjudicate')

phase('adjudicate')

const adjudicatePrompt = `You are adjudicating cross-model critique findings for oparax ${featureTitle}, for an owner who is NOT a programmer -- a vibe-coder who never reads the technical spec, TypeScript, or framework idiom directly. Your ONLY deliverable is a REVISED version of the PLAN document below, in its exact original format -- you are editing that document in place, not writing a report about it.

THE PLAN (the owner already discussed and reviewed this exact document -- your job is to hand back an updated version of THIS, not a new format):
${plan}

The plan follows this format, which you must preserve exactly:
${PLAN_FORMAT}

THE DETAILED SPEC (technical, for grounding your edits only -- the owner never reads this):
${spec}

You have Read/Bash access to the real repo at ${REPO} -- spot-check any contentious or surprising critique claim directly against the code before trusting it.

Adjudication rules: a claim two or more independent lanes raised independently is high confidence; merge duplicate/cosmetic findings into one; spot-read cited code where a finding is contentious or a citation seems fabricated; if a lane's raw output is empty, an error string, or clearly failed (look for CODEX_FIXED_LANE_FAILED / GROK_LANE_FAILED / AGY_LANE_FAILED or just garbage), record it in deadLanes -- report it as failed, never silently treat it as "nothing found". For every critique finding you accept as real, edit the corresponding section of the plan directly (in plain language, never code-level) and add one line to whatChanged describing the edit. Where a finding surfaces a genuine tradeoff only the owner can decide, put it in the plan's own Open questions section AND in openQuestionsForOwner, phrased as a plain question with the tradeoff stated in one sentence. Where nothing in a section changed, copy it into revisedPlan unmodified -- never drop a section, never invent one.

RAW CRITIQUE LANE OUTPUT -- critique-codex (10 fanned-out lenses, gpt-5.6-terra high):
${critiqueCodexRaw}

RAW CRITIQUE LANE OUTPUT -- critique-grok (grok-4.6 medium, single session, no subagents, no turn cap):
${critiqueGrokRaw}

RAW CRITIQUE LANE OUTPUT -- critique-claude (session-inherited model, single session):
${JSON.stringify(critiqueClaudeOut)}

RAW CRITIQUE LANE OUTPUT -- critique-agy (gemini-3.1-pro-high, single session):
${critiqueAgyRaw}

Return revisedPlan, whatChanged, openQuestionsForOwner, and deadLanes exactly as schemed.`

// Deliberately no model/effort override: adjudicate inherits the SAME
// session model/effort the owner picked for the /ft-plan conversation --
// this is a fresh workflow agent() call though, so it gets its own clean
// context (just the plan + spec + the 4 raw lanes) instead of the planning
// session's whole accumulated conversation history, which is the actual
// point: unbiased read, same thinking tier the owner chose for this round.
const adjudication = await agent(adjudicatePrompt, { label: 'adjudicate', phase: 'adjudicate', schema: ADJUDICATE_SCHEMA })
log('Adjudicated: ' + adjudication.whatChanged.length + ' edits to the plan, ' + adjudication.openQuestionsForOwner.length + ' open questions for the owner')

return {
  featureTitle,
  plan,
  spec,
  revisedPlan: adjudication.revisedPlan,
  whatChanged: adjudication.whatChanged,
  openQuestionsForOwner: adjudication.openQuestionsForOwner,
  deadLanes: adjudication.deadLanes,
  lanes: {
    critiqueCodex: critiqueCodexRaw,
    critiqueGrok: critiqueGrokRaw,
    critiqueClaude: critiqueClaudeOut,
    critiqueAgy: critiqueAgyRaw,
  },
}
