export const meta = {
  name: 'qc-review',
  description: 'QC over a frozen diff: a Claude finder floor (always on) plus three conditional cross-model FIND lanes with distinct charters, then a dedup pass and a cross-family VERIFY pass (every surviving finding checked by a family that did not raise it — a panel on high-severity/risk-path diffs). Returns verified findings for the session to adjudicate and apply.',
  whenToUse: "feature-qc's review pass — one workflow call replaces the serial /simplify then /code-review passes, with cross-model diversity spent on the two DIVERGENT tasks (finding, verifying) and single ownership kept on the convergent ones (dedup, apply — the session does those).",
  phases: [
    { title: 'Find', detail: 'Claude floor (2 cleanup + conventions on sonnet, 2 bug angles on opus, +line-by-line on large diffs) + 3 external lanes (codex/grok/agy, conditional on large|risk) — all concurrent' },
    { title: 'Dedup', detail: 'merge near-duplicates across lanes, drop plan-vetoed (sonnet)' },
    { title: 'Verify', detail: 'cross-family per finding — a family that did NOT raise it checks it; panel of 3 (2-of-3) on high-severity/risk, else 1 verifier; Claude-Opus is the fallback floor' },
  ],
}

// args (from the feature-qc skill):
//   { range: string,          // git diff range — origin/dev...ft/N (tracked) OR state.baseSha..HEAD (mode:current)
//     generated?: string,     // one line naming generated/vendored paths to skip
//     vetoes?: string,        // plan-frozen decisions that are vetoes, not findings
//     criteria?: string,      // the plan's "Stack & design acceptance criteria" — conventions-finder verifies the diff against them
//     large?: boolean,        // large-diff signal — the session measures the diff and sets this
//     effort?: 'medium'|'high' } // bug-angle depth AND the risk-path signal for external lanes + verify panels; defaults to medium
//
// Returns { findings: [...], findersRun, externalLanesRun }. Each finding carries file/line/severity/
// summary/scenario, raisedBy (families that found it), confirmed (verify quorum), and votes (the
// verify evidence). The session adjudicates (plan-frozen vetoes win, "real but not this slice" gets
// surfaced and dropped), then applies — this workflow only reports.

const range = (args && args.range) || 'origin/dev...HEAD'
const generated = (args && args.generated) || 'none named — use judgment on obviously generated/vendored files'
const vetoes = (args && args.vetoes) || 'none supplied'
const criteria = (args && args.criteria) || 'none supplied — if the plan/issue has a "Stack & design acceptance criteria" section, treat its lines as the criteria'
const effort = (args && args.effort) === 'high' ? 'high' : 'medium'
const large = !!(args && args.large) // caller-supplied; gates the line-by-line bug angle AND (with effort==='high') the external lanes
const RISK = large || effort === 'high' // shared gate: external FIND lanes on, and VERIFY panels (not single) on findings this touches

const REPO = '/Users/farzanm4/Desktop/drive/repos/oparax'
const SCRIPT_DIR = `${REPO}/.claude/workflows/council`
const FINDINGS_SCHEMA_FILE = `${REPO}/.claude/workflows/qc-findings-schema.json`
const VERDICT_SCHEMA_FILE = `${REPO}/.claude/workflows/verify-schema.json`
const SCRATCH = `${REPO}/.feature/qc-council` // self-gitignoring — .feature/ is the flow's live scratch

const TIERS = { codex: 'medium', grok: 'medium', agy: 'gemini-3.1-pro-high' }
const ALL_FAMILIES = ['claude', 'codex', 'grok', 'agy']
const slug = (s) => String(s).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'x'

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

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['CONFIRMED', 'REFUTED'] },
    reasoning: { type: 'string' },
  },
  required: ['verdict', 'reasoning'],
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

// ── Stage 3 · Verify — divergent, cross-family. A family that did NOT raise the finding checks it,
// so this catches BOTH an external lane's false positive AND Claude wrongly dismissing a real one.
// Panel (up to 3, 2-of-3 quorum) on high-severity or risk-path diffs; single verifier otherwise;
// Claude-Opus is the guaranteed floor if the intended panel/verifier infra fails outright. ─────────
phase('Verify')

function verifyPrompt(finding) {
  return `Cross-family verification pass. This finding was raised independently by [${(finding.raisedBy || []).join(', ') || 'unknown'}] — you were NOT one of them; give an independent read, don't rubber-stamp.
Finding: ${finding.file}${finding.line ? `:${finding.line}` : ''} — ${finding.summary}
Scenario: ${finding.scenario}
Severity: ${finding.severity || 'unspecified'}
Read the ACTUAL code yourself: run \`git diff ${range}\` and open the relevant file(s) at their current state on this branch. CONFIRM only if you can point to the exact code that makes the scenario real; REFUTE if the code already guards against it, the scenario is unreachable, or the finding is simply wrong.
Plan-frozen decisions — REFUTE automatically if the finding is actually one of these: ${vetoes}`
}

async function castVote(family, finding, idx) {
  if (family === 'claude') {
    return agent(verifyPrompt(finding), { label: `verify:claude:${slug(finding.file)}-${idx}`, phase: 'Verify', model: 'opus', agentType: 'general-purpose', schema: VERDICT_SCHEMA })
  }
  return cliBridge(family, TIERS[family], verifyPrompt(finding), `verify:${family}:${slug(finding.file)}-${idx}`, `verify-${family}-${idx}`, 'Verify', VERDICT_SCHEMA_FILE, 'verdict')
}

async function verifyOne(finding, idx) {
  const raised = new Set(finding.raisedBy && finding.raisedBy.length ? finding.raisedBy : ['claude'])
  const pool = ALL_FAMILIES.filter((f) => !raised.has(f))
  if (!pool.length) return { ...finding, confirmed: true, votes: [], verifiedBy: [], note: 'all 4 families already independently agreed — trusted without further verify' }
  const panelSize = (finding.severity === 'high' || RISK) ? 3 : 1
  const panel = pool.slice(0, panelSize)
  let votes = (await parallel(panel.map((fam) => () => castVote(fam, finding, idx).then((v) => (v ? { family: fam, ...v } : null))))).filter(Boolean)
  if (!votes.length) {
    // total verify-infra failure for this finding — fall back to the Claude-Opus floor, never leave a
    // finding unverified.
    const floor = await castVote('claude', finding, idx)
    if (floor) votes = [{ family: 'claude', ...floor }]
  }
  const confirms = votes.filter((v) => v.verdict === 'CONFIRMED').length
  const confirmed = votes.length ? confirms >= Math.ceil(votes.length / 2) : false
  return { ...finding, confirmed, votes, verifiedBy: panel }
}

const verified = dedupedFindings.length
  ? await parallel(dedupedFindings.map((f, i) => () => verifyOne(f, i)))
  : []
const confirmedCount = verified.filter((f) => f && f.confirmed).length
log(`verify → ${confirmedCount}/${verified.length} confirmed (panel on ${verified.filter((f) => f && f.verifiedBy && f.verifiedBy.length === 3).length} high-severity/risk findings)`)

return {
  findings: verified,
  findersRun: FINDERS.length,
  externalLanesRun: EXTERNAL_LANES.length,
}
