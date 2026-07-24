export const meta = {
  name: 'qc-review',
  description: 'QC over a frozen diff: a Claude finder floor (always on) plus three conditional cross-model FIND lanes with distinct charters, then a dedup pass and a batched cross-family VERIFY pass (ONE verifier per model family, each ruling on the whole deduped list in a single response; a family\'s verdict on a finding it raised is discounted). Returns verified findings for the session to adjudicate and apply.',
  whenToUse: "feature-qc's review pass — one workflow call replaces the serial /simplify then /code-review passes, with cross-model diversity spent on the two DIVERGENT tasks (finding, verifying) and single ownership kept on the convergent ones (dedup, apply — the session does those).",
  phases: [
    { title: 'Find', detail: 'Claude floor (2 cleanup + conventions on sonnet, 2 bug angles on opus, +line-by-line on large diffs) + 3 external lanes (codex/grok/agy, conditional on large|risk) — all concurrent' },
    { title: 'Dedup', detail: 'merge near-duplicates across lanes, drop plan-vetoed (sonnet)' },
    { title: 'Verify', detail: '4 agents flat — one verifier per family (claude sonnet · codex medium · grok-4.5 medium · gemini-3.1-pro), each handed the ENTIRE deduped list and returning a verdict per finding; per finding the raising family\'s own verdict is discounted, majority of the remaining verdicts confirms; Claude is the infra-failure floor' },
  ],
}

// args (from the feature-qc skill):
//   { range: string,          // git diff range — origin/dev...ft/N (tracked) OR state.baseSha..HEAD (mode:current)
//     generated?: string,     // one line naming generated/vendored paths to skip
//     vetoes?: string,        // plan-frozen decisions that are vetoes, not findings
//     criteria?: string,      // the plan's "Stack & design acceptance criteria" — conventions-finder verifies the diff against them
//     large?: boolean,        // large-diff signal — the session measures the diff and sets this
//     effort?: 'medium'|'high' } // bug-angle depth AND the risk-path signal for the external FIND lanes; defaults to medium
//
// Returns { findings: [...], findersRun, externalLanesRun, verifiersRun }. Each finding carries
// file/line/severity/summary/scenario, raisedBy (families that found it), confirmed (verify quorum),
// and votes (the verify evidence, each tagged selfRaised so a discounted vote stays visible). The
// session adjudicates (plan-frozen vetoes win, "real but not this slice" gets surfaced and dropped),
// then applies — this workflow only reports.

const range = (args && args.range) || 'origin/dev...HEAD'
const generated = (args && args.generated) || 'none named — use judgment on obviously generated/vendored files'
const vetoes = (args && args.vetoes) || 'none supplied'
const criteria = (args && args.criteria) || 'none supplied — if the plan/issue has a "Stack & design acceptance criteria" section, treat its lines as the criteria'
const effort = (args && args.effort) === 'high' ? 'high' : 'medium'
const large = !!(args && args.large) // caller-supplied; gates the line-by-line bug angle AND (with effort==='high') the external lanes
const RISK = large || effort === 'high' // gate: turns the external FIND lanes on (verify is a flat 4-family fan-out, ungated)

const REPO = '/Users/farzanm4/Desktop/drive/repos/oparax'
const SCRIPT_DIR = `${REPO}/.claude/workflows/council`
const FINDINGS_SCHEMA_FILE = `${REPO}/.claude/workflows/qc-findings-schema.json`
const VERDICT_SCHEMA_FILE = `${REPO}/.claude/workflows/verify-schema.json`
const SCRATCH = `${REPO}/.feature/qc-council` // self-gitignoring — .feature/ is the flow's live scratch

// FIND-lane tiers (recall is what's being bought there — leave them rich).
const TIERS = { codex: 'medium', grok: 'medium', agy: 'gemini-3.1-pro-high' }
// VERIFY tiers — deliberately lighter than FIND: verification is a bounded read-the-code check, not
// a search. codex = the flagship (run.sh/plan-codex.sh pass no -m, so codex's own default model
// gpt-5.6-sol is used) at MEDIUM reasoning effort; grok = grok-4.5 (hardcoded in plan-grok.sh) at
// medium; agy = gemini-3.1-pro at its LOWEST rung — the agy CLI exposes only `-high` and `-low` for
// 3.1 Pro (no `-medium`; `--model gemini-3.1-pro --effort medium` is rejected outright), so `-low` is
// the nearest step down from the FIND lane's `-high`.
const VERIFY_TIERS = { codex: 'medium', grok: 'medium', agy: 'gemini-3.1-pro-low' }
const VERIFY_CLAUDE_MODEL = 'sonnet' // de-pinned from opus — batched verification is a reading task
const ALL_FAMILIES = ['claude', 'codex', 'grok', 'agy']

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          file: { type: 'string', description: 'repo-relative path' },
          line: { type: 'number', description: '1-indexed anchor line' },
          severity: { type: 'string', description: 'high | medium | low' },
          summary: { type: 'string', description: 'one-sentence statement of the finding' },
          scenario: { type: 'string', description: 'concrete failing input/state → wrong outcome (bugs), or the concrete cleanup/rule breach' },
          verdict: { type: 'string', description: 'CONFIRMED | PLAUSIBLE for bug angles; empty for cleanup/conventions' },
        },
        required: ['file', 'summary', 'scenario'],
      },
    },
  },
  required: ['findings'],
}

// One verifier per family rules on the WHOLE deduped list, so the response is a LIST of verdicts
// keyed to the finding ids it was handed — not a single verdict. Keep this in lockstep with
// verify-schema.json (the copy the external CLIs validate against).
const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdicts: {
      type: 'array',
      description: 'exactly one entry per finding you were given — same ids, no omissions, no extras',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', description: 'the finding id you were given (F1, F2, …) — copy it verbatim' },
          verdict: { type: 'string', enum: ['CONFIRMED', 'REFUTED'] },
          reasoning: { type: 'string', description: 'one or two sentences citing the actual code (file:line) that justify this verdict' },
        },
        required: ['id', 'verdict', 'reasoning'],
      },
    },
  },
  required: ['verdicts'],
}

function parseJson(raw) {
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

// Every finder — Claude and external alike — reads the SAME frozen diff for real; unlike planning's
// draft council, QC lanes MUST ground in the actual code (that is the entire point of correctness/
// contract/adversarial review). External lanes run inside REPO via council/run.sh, so they have real
// git + filesystem access.
const commonTail = `
Diff scope: run \`git diff ${range}\` yourself and review ONLY that diff; read the full enclosing function of any touched line, and the actual shipped sources in node_modules for any cross-boundary contract (version-pinned behavior beats memory).
Skip generated/vendored files: ${generated}.
Plan-frozen decisions — these are VETOES, do NOT report them as findings: ${vetoes}.
Report findings only (file, line, severity, one-sentence summary, concrete scenario). An empty list is a valid, expected result. Never edit a file.`

// External-CLI shell bridge, parameterized by output schema + success key (COUNCIL_SCHEMA /
// COUNCIL_CHECK_KEY — see council/run.sh) so the same dispatcher serves plan drafts, QC findings,
// and QC verify verdicts without three copies of the per-family wrapper scripts.
async function cliBridge(family, tier, promptText, displayLabel, fileStem, ph, schemaFile, checkKey) {
  const raw = await agent(
    `You are a shell bridge to the ${family} CLI. Do EXACTLY these steps and nothing else — review nothing yourself:
1. Using the Write tool, create the file "${SCRATCH}/${fileStem}.in.txt" with EXACTLY this content:
<<<PROMPT
${promptText}
PROMPT
2. Run this ONE command verbatim:
   CLAUDE_PROJECT_DIR="${REPO}" COUNCIL_SCRATCH="${SCRATCH}" COUNCIL_TIER="${tier}" COUNCIL_SCHEMA="${schemaFile}" COUNCIL_CHECK_KEY="${checkKey}" bash "${SCRIPT_DIR}/run.sh" ${family} ${fileStem}
3. If it exits non-zero, OR "${SCRATCH}/${fileStem}.out.json" is missing or empty, return exactly: FAILED
4. Otherwise read "${SCRATCH}/${fileStem}.out.json" and return its RAW verbatim contents and nothing else — no fences, no commentary.`,
    { label: displayLabel, phase: ph, model: 'sonnet', agentType: 'general-purpose' },
  )
  return parseJson(raw)
}

// ── Stage 1 · Find — Claude floor (always) + 3 external lanes (conditional) ──
phase('Find')

const FINDERS = [
  {
    class: 'cleanup', angle: 'reuse+simplification', family: 'claude', agentType: 'cleanup-finder', model: 'sonnet',
    prompt: `Your angles: REUSE + SIMPLIFICATION (they converge — cover both in one pass). REUSE: logic the repo (or its dependencies) already provides that the diff reimplements — a helper, hook, util, or type that already exists, a hand-rolled version of something stock. SIMPLIFICATION: unnecessary abstraction or indirection, behavior-preserving shortening, dead branches, redundant state, over-general code for a single call site. Report only concrete opportunities, never stylistic preference; every simplification must preserve behavior exactly.${commonTail}`,
  },
  {
    class: 'cleanup', angle: 'altitude+efficiency', family: 'claude', agentType: 'cleanup-finder', model: 'sonnet',
    prompt: `Your angles: ALTITUDE (senior lens) + EFFICIENCY (secondary). ALTITUDE: is each piece of logic at the right layer (not leaking a concern up or down), and does comment density + accuracy match the surrounding codebase idiom (no over- or under-commenting, no stale/aspirational comments the diff introduced)? EFFICIENCY: flag only obviously wasteful hot-path work.${commonTail}`,
  },
  {
    class: 'conventions', angle: 'conventions+docs+criteria', family: 'claude', agentType: 'conventions-finder', model: 'sonnet',
    prompt: `Check the diff against the governing instruction files (AGENTS.md, .claude/rules/*) AND the plan's frozen acceptance criteria. Three directions: (1) rule violations — quote the exact rule line and the exact diff line that breaks it; (2) staleness the diff introduces — instruction-file lines the diff has made wrong or incomplete (this is also the input to the doc-sync stage that runs after QC — be specific about which line is stale and why); (3) unmet acceptance criteria — for each of the plan's stack & design criteria below, report any the built diff fails to satisfy (name the criterion + the file/line that misses it).
Plan-frozen acceptance criteria to verify: ${criteria}${commonTail}`,
  },
  // Bug angles: adversarial + cross-file always on opus; line-by-line only on large
  // diffs (zero yield on small ones) and de-pinned to sonnet.
  ...(large
    ? [{
        class: 'bug', angle: 'line-by-line', family: 'claude', agentType: 'bug-finder', model: 'sonnet',
        prompt: `Your ONE angle: LINE-BY-LINE SCAN of the new/changed code — every line scrutinized for defects (edge cases, off-by-one, null/undefined, type assumptions, encoding, ordering). Self-verify each candidate against the code (a quick repro where feasible) before reporting; drop only what you can REFUTE. Effort: ${effort}.${commonTail}`,
      }]
    : []),
  {
    class: 'bug', angle: 'cross-file-contracts', family: 'claude', agentType: 'bug-finder', model: 'opus',
    prompt: `Your ONE angle: CROSS-FILE CONTRACT TRACING — trace every contract the changed code participates in end to end (caller↔callee, framework registration, dependency API shape, env availability), reading the actual node_modules sources. Report contracts that are violated or fragile. Effort: ${effort}.${commonTail}`,
  },
  {
    class: 'bug', angle: 'adversarial', family: 'claude', agentType: 'bug-finder', model: 'opus',
    prompt: `Your ONE angle: ADVERSARIAL — think like an attacker or a worst-case input against any trust boundary, state machine, or parser the diff touches. Classify each candidate CONFIRMED/PLAUSIBLE and give the concrete attack/failure scenario; refute cleanly where a guard makes it impossible. Effort: ${effort}.${commonTail}`,
  },
]

const claudeResults = await parallel(
  FINDERS.map((f) => () =>
    agent(f.prompt, { label: `${f.class}:${f.angle}`, phase: 'Find', agentType: f.agentType, model: f.model, schema: FINDINGS_SCHEMA })
      .then((out) => ({ finder: f, out })),
  ),
)

// External lanes — distinct charters, never the generic "review this diff". Conditional: a large
// diff or a risk-touching one (effort:'high', set by the caller for auth/money/schema/trust-boundary
// slices) earns the extra cross-model recall; a small safe diff gets the Claude floor only.
const EXTERNAL_LANES = RISK
  ? [
      {
        family: 'codex', tier: TIERS.codex, class: 'bug', angle: 'correctness+contracts',
        prompt: `You are the CORRECTNESS + CONTRACT + REMOVED-BEHAVIOR reviewer for this diff — an independent model family, not a rerun of another reviewer. Trace every contract the changed code participates in against the ACTUAL dependency sources (read node_modules, don't guess versions), find concrete correctness bugs, and flag any behavior the diff silently removed or narrowed. Effort: ${effort}.${commonTail}`,
      },
      {
        family: 'grok', tier: TIERS.grok, class: 'bug', angle: 'adversarial-trust-boundary',
        prompt: `You are the ADVERSARIAL / TRUST-BOUNDARY reviewer for this diff — bring your OWN threat model, don't reproduce another reviewer's. Attack every trust boundary, state machine, and parser the diff touches; think about the worst-case input, not the happy path. Effort: ${effort}.${commonTail}`,
      },
      {
        family: 'agy', tier: TIERS.agy, class: 'cleanup', angle: 'over-engineering',
        prompt: `You are the SIMPLIFICATION / OVER-ENGINEERING reviewer for this diff. Find code that is over-engineered, placed at the wrong layer, duplicates an existing primitive, or uses a complicated architecture when a simpler BEHAVIOR-PRESERVING one exists. This is a judgment call, not a style pass — only report a change you are confident is materially clearer and does not lose behavior.${commonTail}`,
      },
    ]
  : []

const externalResults = EXTERNAL_LANES.length
  ? (await parallel(EXTERNAL_LANES.map((lane) => () =>
      cliBridge(lane.family, lane.tier, lane.prompt, `${lane.family}:${lane.angle}`, `find-${lane.family}`, 'Find', FINDINGS_SCHEMA_FILE, 'findings')
        .then((out) => ({ lane, out })),
    ))).filter(Boolean).filter((r) => r.out)
  : []

log(`find → claude floor ${claudeResults.filter((r) => r && r.out).length}/${FINDERS.length}, external lanes ${externalResults.length}/${EXTERNAL_LANES.length}${RISK ? '' : ' (skipped — small, non-risk diff)'}`)

const rawFindings = []
for (const r of claudeResults) {
  if (!r || !r.out || !Array.isArray(r.out.findings)) continue
  for (const finding of r.out.findings) rawFindings.push({ class: r.finder.class, angle: r.finder.angle, family: 'claude', model: r.finder.model, ...finding })
}
for (const r of externalResults) {
  if (!r || !r.out || !Array.isArray(r.out.findings)) continue
  for (const finding of r.out.findings) rawFindings.push({ class: r.lane.class, angle: r.lane.angle, family: r.lane.family, model: r.lane.tier, ...finding })
}
log(`find → ${rawFindings.length} raw findings before dedup`)

// ── Stage 2 · Dedup — convergent, single owner (Sonnet). No diversity benefit: merging a list is
// not a hypothesis to diversify, a second family just re-sorts the same set. ─────────────────────
phase('Dedup')
let dedupedFindings = []
if (rawFindings.length) {
  const DEDUP_SCHEMA = {
    type: 'object', additionalProperties: false,
    properties: {
      findings: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            file: { type: 'string' }, line: { type: 'number' }, severity: { type: 'string' },
            class: { type: 'string' }, summary: { type: 'string' }, scenario: { type: 'string' },
            raisedBy: { type: 'array', items: { type: 'string' }, description: 'the DEDUPED union of families that raised this finding, e.g. ["claude","codex"]' },
          },
          required: ['file', 'summary', 'scenario', 'raisedBy'],
        },
      },
    },
    required: ['findings'],
  }
  const dedup = await agent(
    `Merge these raw findings from ${FINDERS.length + EXTERNAL_LANES.length} finders across ${new Set(rawFindings.map((f) => f.family)).size} model families into ONE deduped list.
Merge near-duplicates: same file, overlapping/adjacent line, and semantically the same issue → ONE entry, keeping the clearest summary/scenario and the HIGHEST severity among the duplicates, with raisedBy = the union of every family that (independently) raised it.
Drop anything that is a plan-frozen decision, not a real finding: ${vetoes}
Drop anything that is speculative or contradicted by another finding without any family independently confirming it.
Raw findings (JSON, each tagged with its family): ${JSON.stringify(rawFindings)}`,
    { label: 'dedup', phase: 'Dedup', model: 'sonnet', agentType: 'general-purpose', schema: DEDUP_SCHEMA },
  )
  dedupedFindings = (dedup && Array.isArray(dedup.findings)) ? dedup.findings : []
}
log(`dedup → ${dedupedFindings.length} findings after merge`)

// ── Stage 3 · Verify — divergent, cross-family, BATCHED. ONE verifier per model family, total: each
// family's single agent is handed the ENTIRE deduped list and returns a verdict per finding in one
// structured response. Four agents, not one per finding × family (that fan-out cost ~half the run's
// budget on #69 and refuted nothing).
//
// The cross-family principle is preserved PER FINDING inside the batch: every verifier is told who
// raised each finding, and in aggregation a family's verdict on a finding it raised itself is
// discounted — so a finding is still judged by families that did not raise it. Claude is the
// infra-failure floor: if every lane (its own included) comes back empty, it is retried alone so no
// finding goes unverified. ────────────────────────────────────────────────────────────────────────
phase('Verify')

// A finding all four families already raised independently keeps the trusted shortcut — there is no
// family left to give a non-self read, so verifying it is definitionally circular. It stays OUT of
// the batch payload rather than being handed to verifiers that all raised it.
const slots = dedupedFindings.map((finding, i) => {
  const raised = new Set(finding.raisedBy && finding.raisedBy.length ? finding.raisedBy : ['claude'])
  return { id: `F${i + 1}`, finding, raised, trusted: ALL_FAMILIES.every((fam) => raised.has(fam)) }
})
const verifyQueue = slots.filter((s) => !s.trusted)

function batchVerifyPrompt(family) {
  const items = verifyQueue
    .map(({ id, finding, raised }) => {
      const self = raised.has(family)
      return `[${id}] ${finding.file}${finding.line ? `:${finding.line}` : ''} — severity: ${finding.severity || 'unspecified'}
  raised by: ${[...raised].join(', ')}${self ? '  ← INCLUDING YOUR OWN FAMILY. Re-read it from scratch; your verdict on this one is discounted in the tally, so an honest REFUTE costs you nothing.' : '  ← NOT your family. Independent read — do not rubber-stamp, and do not refute merely because you would not have raised it.'}
  summary: ${finding.summary}
  scenario: ${finding.scenario}`
    })
    .join('\n\n')
  return `Cross-family verification pass. You are the SINGLE ${family} verifier for this review and you rule on EVERY finding below in one response.

Read the ACTUAL code yourself before ruling: run \`git diff ${range}\` and open the relevant file(s) at their current state on this branch. Per finding:
- CONFIRMED — you can point at the exact code that makes the scenario real.
- REFUTED — the code already guards against it, the scenario is unreachable, or the finding is simply wrong.
Each finding names the families that raised it. Judge each one independently on the code; "another family raised it" is not evidence.
Plan-frozen decisions — REFUTE automatically if a finding is actually one of these: ${vetoes}

Return EXACTLY ${verifyQueue.length} verdict object(s) — one per finding, id copied verbatim, no omissions, no extras, no new findings. Never edit a file.

FINDINGS (${verifyQueue.length}):
${items}`
}

async function castBallot(family) {
  if (family === 'claude') {
    return agent(batchVerifyPrompt('claude'), { label: 'verify:claude', phase: 'Verify', model: VERIFY_CLAUDE_MODEL, agentType: 'general-purpose', schema: VERDICT_SCHEMA })
  }
  return cliBridge(family, VERIFY_TIERS[family], batchVerifyPrompt(family), `verify:${family}`, `verify-${family}`, 'Verify', VERDICT_SCHEMA_FILE, 'verdicts')
}

const readBallot = (out) => (out && Array.isArray(out.verdicts) ? out.verdicts : null)

let ballots = []
if (verifyQueue.length) {
  ballots = (await parallel(
    ALL_FAMILIES.map((fam) => () => castBallot(fam).then((out) => {
      const verdicts = readBallot(out)
      return verdicts ? { family: fam, verdicts } : null
    })),
  )).filter(Boolean)
  if (!ballots.length) {
    // Total verify-infra failure — every lane, Claude's included, came back empty. Retry the Claude
    // floor alone so no finding is returned unverified.
    const verdicts = readBallot(await castBallot('claude'))
    if (verdicts) ballots = [{ family: 'claude', verdicts }]
  }
}

// family → (finding id → verdict). Ids are normalized so a verifier echoing "f3" still lands.
const ballotIndex = new Map(
  ballots.map((b) => [
    b.family,
    new Map(b.verdicts.filter((v) => v && v.id).map((v) => [String(v.id).trim().toUpperCase(), v])),
  ]),
)

const verified = slots.map(({ id, finding, raised, trusted }) => {
  if (trusted) return { ...finding, confirmed: true, votes: [], verifiedBy: [], note: 'all 4 families already independently agreed — trusted without further verify' }
  const votes = []
  for (const [family, byId] of ballotIndex) {
    const v = byId.get(id)
    if (!v || (v.verdict !== 'CONFIRMED' && v.verdict !== 'REFUTED')) continue
    votes.push({ family, verdict: v.verdict, reasoning: v.reasoning || '', selfRaised: raised.has(family) })
  }
  // Cross-family verdicts decide. A self-raised verdict is scored ONLY when no cross-family verdict
  // survived (every non-raising lane failed or skipped this id) — the floor, so nothing comes back
  // unverified just because a CLI died.
  const cross = votes.filter((v) => !v.selfRaised)
  const counted = cross.length ? cross : votes
  const confirms = counted.filter((v) => v.verdict === 'CONFIRMED').length
  const out = {
    ...finding,
    confirmed: counted.length ? confirms >= Math.ceil(counted.length / 2) : false,
    votes,
    verifiedBy: counted.map((v) => v.family),
  }
  if (!counted.length) out.note = 'no verifier returned a verdict for this finding — reported unconfirmed'
  else if (!cross.length) out.note = 'no cross-family verdict survived — scored on the raising family\'s own re-read'
  return out
})

const confirmedCount = verified.filter((f) => f && f.confirmed).length
const trustedCount = slots.filter((s) => s.trusted).length
log(
  verifyQueue.length
    ? `verify → ${confirmedCount}/${verified.length} confirmed · ${verifyQueue.length} findings batched to ${ballots.length}/${ALL_FAMILIES.length} family verifiers (one agent per family, whole list each)${trustedCount ? ` · ${trustedCount} trusted unverified (all 4 families raised them)` : ''}`
    : `verify → skipped, nothing to verify${trustedCount ? ` (${trustedCount} trusted — all 4 families raised them)` : ''}`,
)

return {
  findings: verified,
  findersRun: FINDERS.length,
  externalLanesRun: EXTERNAL_LANES.length,
  verifiersRun: verifyQueue.length ? ballots.length : 0,
}
