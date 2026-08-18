export const meta = {
  name: 'ft-build-pipeline',
  description: 'Args-driven: implements args.spec on the current branch (a codex bridge lane, writable sandbox), runs a post-build pass (session-inherited: simplify the diff, run the gates, fix mechanical red until green, commit), runs the same 4-lane critique used pre-implementation but pointed at the branch\'s real git diff instead of a spec, adjudicates the findings into fix briefs (session-inherited, fresh context), applies the briefs (another codex bridge lane), then reverifies (gates + brief-presence, schema-shaped) for one round before stopping and surfacing whatever is still broken. Reverify is deliberately narrower than a full qc pass.',
  phases: [
    { title: 'build', detail: 'codex bridge lane implements args.spec on the current branch, writable sandbox' },
    { title: 'post-build', detail: 'session-inherited: simplify the diff, run the gates, fix mechanical red until green, commit' },
    { title: 'qc', detail: '4 parallel lanes (codex 10-lens, grok, claude, agy) review the branch\'s real git diff' },
    { title: 'qc-adjudicate', detail: 'session-inherited, fresh context, turns findings into fix briefs' },
    { title: 'fix', detail: 'codex bridge lane applies the fix briefs exactly, writable sandbox' },
    { title: 'reverify', detail: 'tsc + brief-presence, one round' },
  ],
}

const REPO = '/Users/farzanm4/Desktop/repos/oparax'
const MAX_FIX_ROUNDS = 1

// This pipeline runs on an already-cut ft/<N> branch, already checked out.
// args.spec is the detailed technical spec the /feature session wrote and
// the owner never read (pulled from the issue's collapsed <details> block
// by the /build skill before this workflow is triggered) -- it names the
// exact files, contracts, and acceptance journeys build must satisfy. This
// workflow does not author the spec and does not touch the issue itself;
// it only builds, proves, and fixes on the branch.
const issueNumber = args && args.issueNumber
const spec = args && args.spec
if (!issueNumber || !spec) {
  throw new Error('ft-build-pipeline requires args.issueNumber (the ft/<N> branch this runs on) and args.spec (the detailed technical spec pulled from the issue\'s collapsed details block) -- both are read from the issue by the /build skill before this workflow is triggered. This workflow does not author the spec and has no defaults tied to any past issue.')
}

// The detailed plan (args.spec) now opens with a line naming the skill
// bundles the /feature planning lens picked for this slice, shaped
// "Skills: <bundles> (<flat skill names>)". Pull the flat names out so
// every QC lane knows which skills a finding can be checked against.
const SKILLS_MATCH = /^Skills:\s*.*?\(([^)]*)\)/m.exec(spec || '')
const skills = SKILLS_MATCH ? SKILLS_MATCH[1].split(',').map(s => s.trim()).filter(Boolean) : []
// Skill names travel as BARE canonical names (the Skills: line in the detailed plan).
// Each harness invokes them under its own prefix, so map per lane instead of hoping.
const VERCEL_SKILLS = new Set(['nextjs', 'vercel-functions', 'routing-middleware', 'react-best-practices', 'shadcn', 'ai-sdk', 'ai-gateway', 'chat-sdk'])
const SUPABASE_SKILLS = new Set(['supabase', 'supabase-postgres-best-practices'])
const SLACK_SKILLS = new Set(['block-kit', 'slack-api', 'slack-messaging', 'create-slack-app'])
const codexSkill = s => VERCEL_SKILLS.has(s) ? 'vercel:' + s : SUPABASE_SKILLS.has(s) ? 'supabase:' + s : s
const claudeSkill = s => VERCEL_SKILLS.has(s) ? 'vercel:' + s : SLACK_SKILLS.has(s) ? 'slack:' + s : s === 'use-railway' ? 'railway:' + s : s
const CODEX_ONLY = s => s !== 'ui-ux-pro-max' // a Claude project skill; Codex reads DESIGN.md instead
const consultLine = names => names.length ? 'Consult these skills where a finding rests on a rule they cover, and cite the rule: ' + names.join(', ') + '.' : ''
const SKILLS_LINE_CODEX = consultLine(skills.filter(CODEX_ONLY).map(codexSkill))
const SKILLS_LINE_CLAUDE = consultLine(skills.map(claudeSkill))
const SKILLS_LINE_GROK = consultLine(skills)
const SKILLS_LINE_AGY = SKILLS_LINE_GROK.replace('Consult these skills', 'These are rules to consider, not skills you can invoke')

// Same 10 codex lenses as the pre-implementation critique pipeline, applied
// here to a real diff instead of a draft spec -- general-purpose, not tied
// to any specific issue. .codex/agents/critique-<key>.toml is the source of
// truth for each dimension; model + effort dialed to gpt-5.6-sol high there.
//
// 14 more critique-*.toml files sit on disk unused (config-drift-env,
// content-platform-mismatch, cost-runaway-loop, cross-file-caller-drift,
// idempotency-dedup, lease-expiry-stale-lock, ledger-billing,
// migration-schema, observability-blind-spot, pipeline-ai-grounding,
// pricing-metering-accuracy, retry-backoff-poison, ui-state-reconciliation,
// ux-affordance-a11y) -- an inert bench, swap one in per-slice when a
// dimension actually applies (e.g. ledger-billing for a billing change).
const CODEX_LENSES = [
  { key: 'concurrency-claims', focus: 'claim/lease races, non-atomic check-then-write, concurrent multi-desk claims' },
  { key: 'rls-untrusted-ssrf', focus: 'deny-all table read directly from the browser, untrusted input reaching a prompt or fetch unescaped' },
  { key: 'async-resource-lifecycle', focus: 'timeouts/sockets/budgets not actually threaded through, unread response bodies' },
  { key: 'silent-vanishing', focus: 'things that disappear with no trace, no reason surfaced to the user' },
  { key: 'scope-convention-doc', focus: 'a governing doc the change makes wrong, unrelated files bundled in, stale comments' },
  { key: 'frame-attack', focus: 'real inputs or conditions the diff never handles but a real user or source will produce' },
  { key: 'general', focus: 'no checklist -- read the whole diff cold and judge it as a system, is it the right implementation at all' },
  { key: 'cross-tenant-data-linkage', focus: 'server code trusts an internal pointer implied ownership without re-checking owner_id at point of use' },
  { key: 'third-party-contract-drift', focus: 'code assumes an external API/library shape or limit its docs do not actually guarantee' },
  { key: 'data-export-privacy-leak', focus: 'a response, log line, or error capture carrying more data than the consumer needs' },
]
const CODEX_LENS_NAMES_CSV = CODEX_LENSES.map(l => l.key).join(', ')

// Minimal shared lens card for the single-session bridge lanes (grok, agy)
// plus the pinned critique-claude lane. One session each, NO sub-fan-out.
const MINIMAL_LENSES = [
  { key: 'frame-attack', focus: 'real inputs or conditions the diff does not handle but a real user or source will produce; a missing input class outranks any in-frame bug' },
  { key: 'contract-completeness', focus: 'every contract the spec named is actually implemented as specified; nothing silently narrowed or left half-built' },
  { key: 'internal-consistency', focus: 'code paths that contradict each other or the spec\'s own decisions, invariants the degraded states break' },
  { key: 'external-limits', focus: 'third-party API shapes, limits, encodings (code points vs UTF-16), escaping, and truncation the code assumes rather than guarantees' },
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

const FIX_BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string', description: 'the exact file path the fix lands in' },
    line: { type: 'string', description: 'the exact line or line range the fix anchors to' },
    fixShape: { type: 'string', description: 'the approach in one or two lines -- never a full patch' },
    ownerSummary: { type: 'string', description: 'one plain-language line, no code terms, for the owner-facing report' },
  },
  required: ['file', 'line', 'fixShape', 'ownerSummary'],
}

const QC_ADJUDICATE_SCHEMA = {
  type: 'object',
  properties: {
    fixBriefs: { type: 'array', items: FIX_BRIEF_SCHEMA, description: 'every accepted finding, turned into a fix brief. Nothing decision-shaped belongs here -- fold anything genuinely needing the owner into openQuestionsForOwner instead.' },
    dropped: { type: 'array', items: { type: 'string' }, description: 'findings considered and rejected, one line each with why' },
    openQuestionsForOwner: { type: 'array', items: { type: 'string' }, description: 'anything decision-shaped, phrased as a plain question with the tradeoff in one sentence' },
    deadLanes: { type: 'array', items: { type: 'string' }, description: 'any of critique-codex/critique-grok/critique-claude/critique-agy that returned nothing usable -- reported as failed, never silently dropped' },
  },
  required: ['fixBriefs', 'dropped', 'openQuestionsForOwner', 'deadLanes'],
}

const REVERIFY_SCHEMA = {
  type: 'object',
  properties: {
    gates: { type: 'string', enum: ['GREEN', 'RED'] },
    briefs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ownerSummary: { type: 'string', description: 'the fix brief\'s own ownerSummary line, used to identify which brief this is' },
          status: { type: 'string', enum: ['CONFIRMED', 'MISSING'] },
          reason: { type: 'string' },
        },
        required: ['ownerSummary', 'status', 'reason'],
      },
    },
    allClean: { type: 'boolean' },
    remaining: { type: 'string', description: 'plain sentence of what is still broken, empty if clean' },
  },
  required: ['gates', 'briefs', 'allClean', 'remaining'],
}

// ---------------------------------------------------------------------------
// Phase: build
// ---------------------------------------------------------------------------

// LANE PROTOCOL: how every external-CLI dispatcher (build, qc-codex, qc-grok,
// qc-agy, fix) runs its command. Two-phase because a single Bash call in this
// harness is capped at 10 minutes and a dispatcher that returned "timeout" had
// its still-running CLI killed (2026-08-17: the /feature codex and grok lanes
// died that way after 5 minutes of real work; this file carried the same 5 min
// / 8 min / 3 min caps). There is NO wall budget by owner decision: lanes run to
// completion and report elapsed time, so model/effort get tuned from measured
// runs, never pre-capped. .claude/scripts/lane.sh holds the mechanics.
const LANE_PROTOCOL = (laneName, failedMarker) => `LANE PROTOCOL (mandatory, exactly these steps, nothing else in between -- no ps, no peeking at partial output, no sleeping on your own):
A. Using Bash with run_in_background: true and NO timeout, run: bash ${REPO}/.claude/scripts/lane.sh start ${laneName} -- <the exact CLI command and its arguments>. lane.sh captures stdout/stderr itself; do NOT add your own redirects.
B. Then, in the FOREGROUND, run: bash ${REPO}/.claude/scripts/lane.sh wait ${laneName} with timeout: 600000. It prints ONE line: "DONE ...", "RUNNING ...", or "HUNG ...". If RUNNING, run that same wait command again, as many times as it takes -- there is no budget, the lane runs to completion, and you never return while it says RUNNING. If HUNG (over the 60-minute hung-process valve), run: bash ${REPO}/.claude/scripts/lane.sh kill ${laneName}, then continue to step C.
C. Run: bash ${REPO}/.claude/scripts/lane.sh result ${laneName} ${failedMarker} > /dev/null; echo "rc=$?" (only the exit code is needed here -- do NOT print or read the output into your context; it can be tens of KB and re-typing it is pure wall time). Your final answer is EXACTLY these lines and nothing else: line 1, the DONE/HUNG line from step B; line 2, LANE_RESULT_FILE=/tmp/oparax-lanes/${laneName}.out ; line 3, LANE_ERR_FILE=/tmp/oparax-lanes/${laneName}.err ; and, ONLY if the rc printed was non-zero, line 4, the marker ${failedMarker} followed by the last 40 lines of the .err file (use tail -40) so the failure is legible. The consumer of this lane reads the result file itself.`

phase('build')
log('Spec received via args (' + spec.length + ' chars), dispatching the build lane')

const buildPrompt = `You are a bridge dispatcher. Your ONLY job: run ONE real shell command against the real codex CLI, instructing it to implement the spec below on the CURRENT git branch of the real repo (already ft/${issueNumber}, already checked out -- do NOT switch, create, or delete any branch), then return a summary verbatim. Do not implement anything yourself, do not judge the result, do not skip steps because they look done already.

Steps:
1. Using Write, save the SPEC text below to a file under /tmp.
2. Follow the LANE PROTOCOL below with this CLI command: codex exec -s workspace-write -C ${REPO} -m gpt-5.6-sol -c model_reasoning_effort=low --json "<instruction>", where <instruction> tells codex to: read the spec at your file path; implement it in full on the current branch, staying inside the spec's named files and build steps (escalating instead of improvising if reality diverges from the spec beyond nuance); invoke, per build step, exactly the skills that step names by $name, and invoke no other skill; write it simple: reuse an existing helper over adding a new one, no abstraction with a single caller, delete any code the change makes dead; commit as it completes each build step (checkpoint commits, not one giant commit); a dev server is always running on localhost:3000 owned by the machine, never start, stop, or restart one, and never run pnpm dev; do NOT run tsc or pnpm build after every step -- the gates phase runs both ONCE right after this lane returns, and any red goes through the fix round like any other finding; when done, print a summary of files touched and commits made as its final message.
3. Using Bash, after the lane is DONE, run \`git log --oneline origin/beta...HEAD\` and \`git diff --stat origin/beta...HEAD\` in ${REPO} yourself.
4. Return per the LANE PROTOCOL, followed by the git log and git diff --stat output from step 3.

${LANE_PROTOCOL('build', 'CODEX_BUILD_FAILED')}

SPEC:
${spec}`

const buildSummary = await agent(buildPrompt, { model: 'haiku', label: 'build', phase: 'build' })
log('Build lane returned (' + buildSummary.length + ' chars)')

log('build lane: ' + String(buildSummary).split('\n')[0].slice(0, 160))
if (String(buildSummary).includes('CODEX_BUILD_FAILED') || String(buildSummary).startsWith('HUNG')) {
  log('Build lane failed or hung (no cap exists; a HUNG line means the 60-minute hung-process valve fired): surfacing instead of continuing.')
  return { issueNumber, buildSummary, buildFailed: true }
}

// ---------------------------------------------------------------------------
// Phase: post-build -- session-inherited (no model override): simplify the
// diff, run the gates, fix mechanical red until green, commit. Runs before
// qc so the 4 critique lanes review a diff that's already simplified and
// gate-clean. Journeys are proven by the owner on localhost after the
// pipeline, not by the pipeline -- there is no journey-evidence phase here.
// ---------------------------------------------------------------------------
phase('post-build')

const postBuildPrompt = `You have Read/Edit/Bash access to the real repo at ${REPO}, on its current branch ft/${issueNumber} (already checked out -- never switch, create, or delete any branch). Three jobs, in order:

1. Run \`git diff origin/beta...HEAD\`. ONLY inside files that diff touches, apply behavior-preserving simplifications: reuse an existing helper the diff re-implements, inline or remove an abstraction with exactly one caller, delete code the change made dead, drop defensive branches for states the contracts make impossible. Never change behavior, never touch a file outside the diff, never override a decision the spec made. If you edited anything, commit as \`simplify: <one line>\`.

2. Run \`bash .claude/scripts/qc-gates.sh\`. If it comes back RED, fix ONLY what the compiler/typechecker actually reports -- mechanical fixes: types, imports, missing awaits, whatever the gate flags. No design changes, no behavior changes. Rerun the gates until GREEN, or until you judge the red is not mechanical (then stop and say so plainly, do not keep guessing). Commit fixes as \`gates: <one line>\`.

3. Return: the final \`GATES: GREEN|RED\` line verbatim; a short list of the simplifications you made (or the literal text NOTHING_TO_SIMPLIFY if none applied); a short list of the gate fixes you made (or "none"); and if you stopped on a non-mechanical red, one plain sentence saying what is broken.

The dev server on :3000 is always on and owned by the machine; do not start or stop it. If you changed next.config.ts or .env.local, note it in your return so the owner restarts it with \`serve\`.

SPEC:
${spec}`

const postBuildResult = await agent(postBuildPrompt, { label: 'post-build', phase: 'post-build' })
log('Post-build: ' + (postBuildResult.includes('GATES: GREEN') ? 'GREEN' : 'RED (or unparseable, see raw output)'))

// ---------------------------------------------------------------------------
// Phase: qc -- same 4 lanes as the pre-implementation critique pipeline,
// pointed at the branch's real git diff (origin/beta...HEAD) instead of a
// draft spec. The diff already lives in the repo the CLIs have access to,
// so each lane pulls it itself via git rather than having a (potentially
// huge) diff duplicated across 4 prompt strings.
// ---------------------------------------------------------------------------
phase('qc')

const critiqueCodexPrompt = `You are a bridge dispatcher. Your ONLY job: run ONE real shell command against the real codex CLI, instructing it to fan out all 10 named critique agents below in parallel over the branch's real git diff, then return the raw concatenated result verbatim. Do not critique anything yourself, do not synthesize, do not deduplicate, do not drop any finding.

The 10 agent names (each is qc-<name> defined in .codex/agents/, already has its own dimension baked into its profile -- you do not restate dimensions): ${CODEX_LENS_NAMES_CSV}

Steps:
1. Follow the LANE PROTOCOL below with this CLI command: codex exec -s read-only -C ${REPO} -m gpt-5.6-sol -c model_reasoning_effort=high --json "<instruction>", where <instruction> tells codex to: run \`git diff origin/beta...HEAD\` in the repo to get the real diff for oparax issue #${issueNumber} (this is a POST-IMPLEMENTATION review -- the diff is real, already-committed code, not a plan); spawn every one of the 10 named subagents in parallel via its subagent tool, each with agent_type set to exactly qc-<name> for each of these names: ${CODEX_LENS_NAMES_CSV}; when agent_type is set, it must NOT use fork_turns "all" (that combination is rejected) -- use fork_turns none or omit fork_turns entirely; give every spawned agent the same diff and POST-IMPLEMENTATION framing as its task message${SKILLS_LINE_CODEX ? ', plus this line so each spawned agent knows which skills to consult, invoked as $name exactly as written: ' + SKILLS_LINE_CODEX : ''}; wait for all 10 to return; then output ONE JSON array that is the flat concatenation of every single agent raw findings array, with no merging, deduping, or summarizing -- just every element from every agent concatenated into one array, printed as the final message and nothing else.
2. Return per the LANE PROTOCOL.

${LANE_PROTOCOL('qc-codex', 'CODEX_FIXED_LANE_FAILED')}`

const critiqueGrokPrompt = `You are a bridge dispatcher. Your ONLY job: run ONE real shell command against the real grok CLI, wait for it to finish, then return its raw stdout verbatim. Do not critique anything yourself, do not summarize, do not paraphrase.

This is a SINGLE-SESSION holistic pass: grok must NOT spawn any subagents (the command below disables them; a fan-out has no cost or time knob, one session has model + effort), and the lens card in the prompt steers its attention inside that one session -- it is not a fan-out plan. No turn cap is passed: grok uses its own default (owner decision 2026-08-17: no caps, measure instead).

Steps:
1. Using Write, create a prompt file under /tmp with this exact content:

"You are a critic in oparax's cross-model review council, reviewing a POST-IMPLEMENTATION git diff (already built, on branch ft/${issueNumber}) for oparax issue #${issueNumber}. You have read-only access to the real repo at ${REPO} -- run \`git diff origin/beta...HEAD\` yourself to get the real diff; ground every claim in the actual code, cite real file:line where relevant. This is ONE holistic pass: do not spawn subagents. Work through the whole diff considering AT LEAST these lens dimensions, plus anything else you judge applicable:
${MINIMAL_LENSES_TEXT}
${SKILLS_LINE_GROK}

Return ONLY a JSON array of finding objects, one per finding, each shaped exactly {\\"severity\\": \\"blocking|important|minor\\", \\"target\\": string, \\"critique\\": string, \\"suggestion\\": string or null}. No preamble, no commentary, no markdown fencing -- just the raw JSON array."

2. Follow the LANE PROTOCOL below with this CLI command, quoting exactly as written (the star-glob argument MUST be inside double quotes or the shell rejects the line before grok runs): grok --prompt-file <your file> --sandbox read-only --cwd ${REPO} --disallowed-tools "mcp__vercel__*,mcp__railway__*" --always-approve --no-subagents --effort medium -m grok-4.6 --output-format json. Do NOT pass --agent. Do NOT pass --max-turns. Do NOT add redirects.
3. Return per the LANE PROTOCOL.

${LANE_PROTOCOL('qc-grok', 'GROK_LANE_FAILED')}`

const critiqueAgyPrompt = `You are a bridge dispatcher. Your ONLY job: run ONE real shell command against the real agy (Antigravity) CLI, wait for it to finish, then return its raw stdout verbatim. Do not critique anything yourself, do not summarize, do not paraphrase.

This is a single holistic critique pass, not a multi-lens fan-out. Do NOT pass --agent and do NOT ask agy to spawn or invoke any subagent itself -- the named-persona-plus-invoke_subagent path is unreliable in the current agy version and must not be used here. The root/default persona (no --agent flag) is the one verified to work reliably headlessly.

Steps:
1. Follow the LANE PROTOCOL below with this CLI command: agy with exactly these flags, each JOINED WITH = (NOT a bare flag followed by a separate space-delimited value -- passing the prompt as a trailing positional argument after other flags silently drops it in this CLI and returns an unrelated generic greeting instead, with no error): --model=gemini-3.1-pro-high --effort=high --output-format=json --dangerously-skip-permissions --print="<the full prompt text below>". Do NOT add redirects.

The prompt text to pass as --print's value:
"You are a critic in oparax's cross-model review council, reviewing a POST-IMPLEMENTATION git diff (already built, on branch ft/${issueNumber}) for oparax issue #${issueNumber}. You have Read/Bash access to the real repo at ${REPO} -- run \\"git diff origin/beta...HEAD\\" yourself to get the real diff; ground every claim in the actual code, cite real file:line where relevant. This is ONE holistic pass. Work through the whole diff considering AT LEAST these lens dimensions, plus anything else you judge applicable:
${MINIMAL_LENSES_TEXT}
${SKILLS_LINE_AGY}

Weigh cost: say what a user would actually see. Return ONLY a JSON array of finding objects, one per finding, each shaped exactly {\\"severity\\": \\"blocking|important|minor\\", \\"target\\": string, \\"critique\\": string, \\"suggestion\\": string or null}. No preamble, no commentary, no markdown fencing -- just the raw JSON array."

2. Return per the LANE PROTOCOL.

${LANE_PROTOCOL('qc-agy', 'AGY_LANE_FAILED')}`

const critiqueClaudePrompt = `You are a critic in oparax's cross-model review council, reviewing a POST-IMPLEMENTATION git diff (already built, on branch ft/${issueNumber}) for oparax issue #${issueNumber}. You have Read/Bash access to the real repo at ${REPO} -- run \`git diff origin/beta...HEAD\` yourself to get the real diff; ground every claim in the actual code, cite real file:line where relevant. This is ONE holistic pass in a single session: do not dispatch any agents. Work through the whole diff considering AT LEAST these lens dimensions, plus anything else you judge applicable:
${MINIMAL_LENSES_TEXT}
${SKILLS_LINE_CLAUDE}

Also verify the diff's implementation against the spec below where it makes a claim the spec decided differently -- a contradiction of a spec decision is itself a blocking finding. Return every distinct defect as its own finding; report coverage, do not self-filter for severity.

SPEC (for grounding what the diff was supposed to do):
${spec}`

const [critiqueCodexRaw, critiqueGrokRaw, critiqueClaudeOut, critiqueAgyRaw] = await parallel([
  () => agent(critiqueCodexPrompt, { model: 'haiku', label: 'critique-codex', phase: 'qc' }),
  () => agent(critiqueGrokPrompt, { model: 'haiku', label: 'critique-grok', phase: 'qc' }),
  () => agent(critiqueClaudePrompt, { label: 'critique-claude', phase: 'qc', schema: FINDINGS_ARRAY_SCHEMA }),
  () => agent(critiqueAgyPrompt, { model: 'haiku', label: 'critique-agy', phase: 'qc' }),
])
const firstLine = (v) => (typeof v === 'string' ? v : JSON.stringify(v ?? '')).split('\n')[0].slice(0, 160)
log('qc-codex: ' + firstLine(critiqueCodexRaw))
log('qc-grok: ' + firstLine(critiqueGrokRaw))
log('qc-agy: ' + firstLine(critiqueAgyRaw))
log('All 4 qc lanes returned, dispatching qc-adjudicate')

// ---------------------------------------------------------------------------
// Phase: qc-adjudicate
// ---------------------------------------------------------------------------
phase('qc-adjudicate')

const adjudicatePrompt = `You are adjudicating cross-model QC findings for oparax issue #${issueNumber}, for an owner who is NOT a programmer -- a vibe-coder who never reads code, TypeScript, or framework idiom directly. Your job: turn every finding you accept as real into a fix brief naming the exact file, line, and fix shape, with a plain-language one-liner for the owner.

You have Read/Bash access to the real repo at ${REPO} -- run \`git diff origin/beta...HEAD\` yourself and spot-check any contentious or surprising finding directly against the code before trusting it.

HOW TO READ THE EXTERNAL LANES: each of the codex/grok/agy entries below is a short POINTER, not the output itself: a DONE/HUNG line with the lane's elapsed time, then LANE_RESULT_FILE=<path> and LANE_ERR_FILE=<path>. Use Read on the LANE_RESULT_FILE path to get that lane's raw output (codex: JSONL events, the findings array is the text of the final agent message item; grok: a JSON envelope whose response/result text holds the findings array; agy: a JSON object whose response field holds the findings array). A pointer carrying a *_LANE_FAILED / CODEX_FIXED_LANE_FAILED marker, a HUNG line, or a result file that is empty or not findings-shaped means that lane is dead: record it in deadLanes. The claude lane is inline JSON, not a pointer.

Adjudication rules: a claim two or more independent lanes raised independently is high confidence; merge duplicate/cosmetic findings into one; spot-read cited code where a finding is contentious or a citation seems fabricated; if a lane's raw output is empty, an error string, or clearly failed (look for CODEX_FIXED_LANE_FAILED / GROK_LANE_FAILED / AGY_LANE_FAILED or just garbage), record it in deadLanes -- report it as failed, never silently treat it as "nothing found". Nothing decision-shaped belongs in a fix brief: fold anything genuinely needing the owner's own call into openQuestionsForOwner instead, with the tradeoff in one plain sentence. A fix brief's fixShape is one or two lines, an approach plus a file:line anchor, never a full patch.

SPEC (what the branch was supposed to build):
${spec}

RAW QC LANE OUTPUT -- qc-codex (10 fanned-out lenses, gpt-5.6-sol high):
${critiqueCodexRaw}

RAW QC LANE OUTPUT -- critique-grok (grok-4.6 medium, single session, no subagents, no turn cap):
${critiqueGrokRaw}

RAW QC LANE OUTPUT -- critique-claude (session-inherited model, single session):
${JSON.stringify(critiqueClaudeOut)}

RAW QC LANE OUTPUT -- critique-agy (gemini-3.1-pro-high, single session):
${critiqueAgyRaw}

Return fixBriefs, dropped, openQuestionsForOwner, and deadLanes exactly as schemed.`

const qcAdjudication = await agent(adjudicatePrompt, { label: 'qc-adjudicate', phase: 'qc-adjudicate', schema: QC_ADJUDICATE_SCHEMA })
log('QC adjudicated: ' + qcAdjudication.fixBriefs.length + ' fix briefs, ' + qcAdjudication.openQuestionsForOwner.length + ' open questions for the owner')

// ---------------------------------------------------------------------------
// Phases: fix / reverify, up to MAX_FIX_ROUNDS (currently 1 -- one fix
// round, one schema-shaped reverify). Reverify never reruns the full
// 4-lane qc -- it rechecks gates and brief presence only. A brief still
// not fixed after MAX_FIX_ROUNDS is surfaced, never silently dropped or
// re-attempted forever.
// ---------------------------------------------------------------------------
function fixBriefsText(briefs) {
  return briefs.map(b => `- ${b.file}:${b.line} -- ${b.fixShape}`).join('\n')
}

async function runFix(briefs, round) {
  const fixPrompt = `You are a bridge dispatcher. Your ONLY job: run ONE real shell command against the real codex CLI, instructing it to apply the fix briefs below on the CURRENT git branch of the real repo (already ft/${issueNumber}, already checked out -- do NOT switch, create, or delete any branch), then return a summary verbatim. Do not apply anything yourself, do not judge the result, and do not invent a value or behavior a brief did not specify -- if a brief's fix shape does not survive contact with the file, that must be reported, never improvised around.

Steps:
1. Using Write, save the FIX BRIEFS text below to a file under /tmp.
2. Follow the LANE PROTOCOL below with this CLI command: codex exec -s workspace-write -C ${REPO} -m gpt-5.6-sol -c model_reasoning_effort=low --json "<instruction>", where <instruction> tells codex to: read the fix briefs at your file path; apply each one exactly as scoped (minimal correct fix, surrounding idiom, nothing beyond the brief's stated fix shape); invoke only a skill the brief names by $name, otherwise invoke none; if a brief cannot be applied as written because the file/line has changed, report that brief instead of guessing; commit when done; a dev server is always running on localhost:3000 owned by the machine, never start, stop, or restart one, and never run pnpm dev; do NOT run tsc or pnpm build yourself -- reverify runs the gates once after this lane returns; print a summary of which briefs were applied, which could not be applied and why, and the commits made, as its final message.
3. Using Bash, after the lane is DONE, run \`git diff --stat origin/beta...HEAD\` in ${REPO} yourself.
4. Return per the LANE PROTOCOL, followed by the git diff --stat output.

${LANE_PROTOCOL('fix-round-' + round, 'CODEX_FIX_FAILED')}

FIX BRIEFS (round ${round} of ${MAX_FIX_ROUNDS}):
${fixBriefsText(briefs)}

Full detail per brief, for reference:
${JSON.stringify(briefs)}`

  return agent(fixPrompt, { model: 'haiku', label: 'fix-round-' + round, phase: 'fix' })
}

async function runReverify(briefs, round) {
  const reverifyPrompt = `You are reverifying a fix round for oparax issue #${issueNumber}. You have Read/Bash access to the real repo at ${REPO}. Two jobs only, evidence-only, but you DO judge presence/pass-fail here (this is narrower than a full review, not another critique pass):

1. Run \`pnpm exec tsc --noEmit\` in the repo (the full build was already proven GREEN by post-build; a fix touching a few lines is caught by tsc) and report GREEN if it exits 0, RED otherwise.
2. For every fix brief below, read the file at its named location and judge whether the described fix shape is actually present now (not whether it's a good fix, just whether it's there). Report each brief as CONFIRMED or MISSING with a one-line reason, keyed by the brief's own ownerSummary line.

FIX BRIEFS TO CONFIRM:
${JSON.stringify(briefs)}

SPEC (for grounding what the diff was supposed to do):
${spec}

Return gates, briefs (one entry per fix brief, keyed by its ownerSummary), allClean (true only if gates is GREEN and every brief is CONFIRMED), and remaining (one plain sentence of what's still broken, empty string if allClean) exactly as schemed.`

  return agent(reverifyPrompt, { label: 'reverify-round-' + round, phase: 'reverify', schema: REVERIFY_SCHEMA })
}

let currentBriefs = qcAdjudication.fixBriefs
const fixRounds = []
let allClean = currentBriefs.length === 0

if (allClean) {
  log('Nothing to fix: 0 briefs. Skipping fix/reverify entirely.')
}

for (let round = 1; round <= MAX_FIX_ROUNDS && !allClean; round++) {
  phase('fix')
  log('Fix round ' + round + ': applying ' + currentBriefs.length + ' briefs')
  const fixSummary = await runFix(currentBriefs, round)

  phase('reverify')
  const reverify = await runReverify(currentBriefs, round)
  log('Reverify round ' + round + ' returned: gates ' + reverify.gates + ', allClean=' + reverify.allClean)

  fixRounds.push({ round, fixSummary, reverify })

  allClean = reverify.allClean === true

  if (!allClean) {
    log('Reverify round ' + round + ' still has open items: ' + reverify.remaining)
  }
}

return {
  issueNumber,
  buildSummary,
  postBuildResult,
  qcLanes: {
    critiqueCodex: critiqueCodexRaw,
    critiqueGrok: critiqueGrokRaw,
    critiqueClaude: critiqueClaudeOut,
    critiqueAgy: critiqueAgyRaw,
  },
  fixBriefs: qcAdjudication.fixBriefs,
  dropped: qcAdjudication.dropped,
  openQuestionsForOwner: qcAdjudication.openQuestionsForOwner,
  deadLanes: qcAdjudication.deadLanes,
  fixRounds,
  allClean,
  unresolvedNote: allClean
    ? 'Everything confirmed clean: gates GREEN, every fix brief present.'
    : 'Still unresolved after ' + fixRounds.length + ' fix round(s) -- see the last reverify result in fixRounds for exactly what remains broken.',
}
