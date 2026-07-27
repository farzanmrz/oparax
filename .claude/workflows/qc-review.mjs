export const meta = {
  name: 'qc-review',
  description: 'QC over a frozen diff: a Claude finder floor (always on) plus three conditional cross-model FIND lanes with distinct charters, then a dedup pass and a batched cross-family VERIFY pass (ONE verifier per model family, each ruling on the whole deduped list in a single response; a family\'s verdict on a finding it raised is discounted). Returns verified findings for the session to adjudicate and apply.',
  whenToUse: "feature-qc's review pass — one workflow call replaces the serial /simplify then /code-review passes, with cross-model diversity spent on the two DIVERGENT tasks (finding, verifying) and single ownership kept on the convergent ones (dedup, apply — the session does those).",
  phases: [
    { title: 'Find', detail: '5 angles (reuse+simplification, altitude+efficiency, conventions, cross-file-contracts, adversarial) x 4 families (claude/codex/grok/agy) + Claude-only repo-wide dead-code, +line-by-line per family on large diffs — every angle effort-pinned, all concurrent' },
    { title: 'Dedup', detail: 'merge near-duplicates across lanes, drop plan-vetoed (inherit — the single-call judgment stage)' },
    { title: 'Verify', detail: '4 agents flat — one verifier per family (claude sonnet · codex medium · grok-4.5 medium · gemini-3.1-pro), each handed the ENTIRE deduped list and returning a verdict per finding; per finding the raising family\'s own verdict is discounted, majority of the remaining verdicts confirms; Claude is the infra-failure floor' },
  ],
}

// args (from the feature-qc skill):
//   { range: string,          // git diff range — origin/beta...ft/N
//     generated?: string,     // one line naming generated/vendored paths to skip
//     vetoes?: string,        // plan-frozen decisions that are vetoes, not findings
//     criteria?: string,      // the plan's "Stack & design acceptance criteria" — conventions-finder verifies the diff against them
//     large?: boolean,        // large-diff signal — the session measures the diff and sets this; gates the
//                             // conditional line-by-line angle only. There is no `effort` arg — every
//                             // angle's model/tier is now a fixed pin (see Model/effort pins below),
//                             // not a caller-supplied risk signal. A bug-hunting angle's depth
//                             // shouldn't depend on whether the caller correctly classified the whole
//                             // slice as risky; it's pinned to its ceiling unconditionally instead.
//     repo?: string }         // absolute repo checkout path — this workflow script has no process.cwd()/git-root
//                             // access of its own, so a caller on a different checkout must pass this; falls back
//                             // to the one operator path below so existing callers keep working unchanged
//
// Returns { findings: [...], findersRun, externalLanesRun, verifiersRun }. Each finding carries
// file/line/severity/summary/scenario, raisedBy (families that found it), confirmed (verify quorum),
// and votes (the verify evidence, each tagged selfRaised so a discounted vote stays visible). The
// session adjudicates (plan-frozen vetoes win, "real but not this slice" gets surfaced and dropped),
// then applies — this workflow only reports.

// ARGS RECOVERY — a stringified args payload reaches the script as a STRING, not an object.
// This has now happened on THREE ft/69 runs: each passed {large:true, effort:'high'} plus a
// multi-KB vetoes/criteria block, and each silently ran at medium/small with NO vetoes, because
// `args.large` on a string is `undefined` — which `!!` turns into a perfectly valid-looking
// `false`. Nothing threw. The run reported success. Only a log line distinguished "a shallow
// review was requested" from "the request was dropped".
//
// Earlier passes added the probe below and left it there, on the reasoning that the root cause
// "lives in the caller's payload, not here". That is true and it is also why this recurred: the
// caller is a model emitting a large nested object, which is exactly the payload shape that gets
// stringified. Detecting a failure the script can trivially repair is not worth a wasted review,
// so it is repaired here — and still reported, so the caller-side cause stays visible.
//
// Deliberately narrow: only a `string` is re-parsed, so a correctly-arriving object takes the
// identical path it always did, and an unparseable string still degrades to defaults rather than
// throwing mid-review.
const rawArgsType = typeof args
let resolvedArgs = args
let argsRecovered = false
if (rawArgsType === 'string') {
  try {
    const parsed = JSON.parse(args)
    // `!Array.isArray` matters: an array passes `typeof === 'object'`, so a stringified array
    // would otherwise be reported as RECOVERED while every field still fell back to its default
    // — a log line claiming success over a silent degradation, which is the whole failure class
    // this block exists to end.
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      resolvedArgs = parsed
      argsRecovered = true
    }
  } catch {
    resolvedArgs = null
  }
}
const a = resolvedArgs && typeof resolvedArgs === 'object' ? resolvedArgs : null

const range = (a && a.range) || 'origin/beta...HEAD'
const generated = (a && a.generated) || 'none named — use judgment on obviously generated/vendored files'
const vetoes = (a && a.vetoes) || 'none supplied'
const criteria = (a && a.criteria) || 'none supplied — if the plan/issue has a "Stack & design acceptance criteria" section, treat its lines as the criteria'
const large = !!(a && a.large)
// `large` gates only the exhaustive line-by-line scans (one per family). Every other angle's
// model/tier is a fixed pin now — see Model/effort pins below — so `large` is the only remaining
// caller-supplied signal this workflow reads.

// ARGS ARRIVAL PROBE — print what actually landed AND what was resolved from it, before anything
// downstream reads either. A recovered run must stay distinguishable from a clean one: the fix
// above makes the review correct, not the caller.
log(`args → arrived=${rawArgsType}${argsRecovered ? ' (RECOVERED via JSON.parse)' : ''} keys=${a ? Object.keys(a).join(',') : 'NONE'} · resolved large=${large} range=${range}`)
if (argsRecovered) {
  log('⚠️  args arrived JSON-ENCODED and were re-parsed — the review is running at full fidelity, but fix the caller: pass args as a real JSON object.')
} else if (rawArgsType === 'string') {
  log('⚠️  args arrived as an UNPARSEABLE string — every field fell back to its default. Pass args as a real JSON object.')
} else if (args && rawArgsType !== 'object') {
  log(`⚠️  args arrived as ${rawArgsType} — every field fell back to its default. Pass args as a real JSON object.`)
}

const REPO = (a && a.repo) || '/Users/farzanm4/Desktop/drive/repos/oparax'
const SCRIPT_DIR = `${REPO}/.claude/workflows/council`
const FINDINGS_SCHEMA_FILE = `${REPO}/.claude/workflows/qc-findings-schema.json`
const VERDICT_SCHEMA_FILE = `${REPO}/.claude/workflows/verify-schema.json`
const SCRATCH = `${REPO}/.feature/qc-council` // self-gitignoring — .feature/ is the flow's live scratch

// ── Model/effort pins ────────────────────────────────────────────────────────────────────────
// Every Find angle carries a FIXED model+effort pin — never a caller-supplied risk signal.
// Current scheme (owner experiment, 2026-07-26): with the fan-out mirrored 5-angles-wide across
// four families, WIDTH replaces DEPTH — every unconditional angle runs at the mid tier (sonnet/
// terra/grok-4.5 @ medium), betting that cross-family redundancy catches what any one family's
// mid-tier pass misses. Only the large-diff-conditional line-by-line scans run at high (they are
// each family's single exhaustive pass, with no redundancy to lean on). agy is the one exception:
// every angle fixed to gemini-3.1-pro-high (its only reasoning rung — no -medium slug exists).
// This DEPRIORTIZES the previous opus/sol-ceiling bug-tier pins on purpose, as a measured test;
// if confirmed-bug recall drops across the next few slices, restore opus@high / sol@high /
// grok@high on cross-file-contracts + adversarial — that was the prior, safer scheme.
//
//   claude — sonnet@medium everywhere; sonnet@high on line-by-line only.
//   codex  — model and tier are SEPARATE flags (COUNCIL_MODEL + COUNCIL_TIER; see council/run.sh).
//            terra@medium everywhere; terra@high on line-by-line. Luna and sol carry no Find angle.
//   grok   — single model (grok-4.5, hardcoded in plan-grok.sh): medium everywhere, high on
//            line-by-line (xhigh/max error on the grok CLI — never pass them).
//   agy    — gemini-3.1-pro-high everywhere, per explicit instruction: "it will produce results
//            or it will produce nothing, which is fine regardless."
const CODEX_MODELS = { terra: 'gpt-5.6-terra' }
const AGY_PRO = 'gemini-3.1-pro-high' // no -medium rung exists; fixed here regardless, per instruction above

// VERIFY tiers — verification is a bounded read-the-code check, not a search, so it stays lighter
// than FIND everywhere except agy (raised from -low to -high: it is the only tier that reasons).
const VERIFY_TIERS = { codex: 'medium', grok: 'medium', agy: 'gemini-3.1-pro-high' }
const VERIFY_CODEX_MODEL = 'gpt-5.6-sol' // now explicit — was silently config-default luna
const VERIFY_CLAUDE_MODEL = 'sonnet' // de-pinned from opus — batched verification is a reading task
const VERIFY_CLAUDE_EFFORT = 'medium' // pinned, matching codex/grok's already-fixed verify tier — was
// riding the (now-removed) caller `effort` arg; Verify's own "stays lighter than Find" rationale
// already argued for a fixed light tier, this just makes Claude's verify agent match that in code.
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
        // Deliberately NOT identical to qc-findings-schema.json (the copy the external CLIs
        // validate against). This one is consumed by the Agent tool, which permits a partial
        // `required`; OpenAI's structured-output API does not, and rejected the shared file with
        // HTTP 400 until every property was listed there. Do not "sync" the two by copying this
        // list over — that reintroduces the 400 and silently kills every codex find lane.
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
Report EVERY issue you find, including ones you are uncertain about or consider low-severity — do not filter for importance or confidence at this stage; a separate cross-family verification pass does that. Your goal here is coverage: surfacing a finding that later gets refuted is cheap, silently dropping a real one is not. Give each finding your severity estimate so the downstream pass can rank it.
Report findings only (file, line, severity, one-sentence summary, concrete scenario). An empty list is still a valid result when the diff is genuinely clean. Never edit a file.`

// External-CLI shell bridge, parameterized by output schema + success key (COUNCIL_SCHEMA /
// COUNCIL_CHECK_KEY — see council/run.sh) so the same dispatcher serves plan drafts, QC findings,
// and QC verify verdicts without three copies of the per-family wrapper scripts.
// `model` is codex-only (COUNCIL_MODEL → -m). agy encodes its model in `tier`; grok has one model.
// Omitting it reproduces the pre-matrix behaviour: codex falls back to its config.toml default.
//
// `bridgeModel` is the CLAUDE agent acting as courier — it does no reviewing whatsoever (write a
// file, run one command, return the bytes), so it has zero influence on review quality. Its only
// failure mode is mechanical: the prompt is embedded in its instruction and must be reproduced
// byte-exactly, so fidelity is a function of PROMPT SIZE, which is why the two stages differ:
//   find   (~1.2KB prompts) → haiku. Measured byte-identical on adversarial content (backticks,
//          `${...}`, nested JSON, unicode arrows) and end-to-end through run.sh.
//   verify (~18KB prompts — the whole deduped findings list) → sonnet. Three real ft/69 bridges
//          reproduced 18KB byte-exactly (sizes differed only by each family name's length).
// If a find prompt ever grows toward verify's size, move it back to sonnet.
async function cliBridge({ family, tier, model, prompt, label, stem, phase: ph, schemaFile, checkKey, bridgeModel = 'sonnet' }) {
  const modelEnv = model ? `COUNCIL_MODEL="${model}" ` : ''
  const raw = await agent(
    `You are a shell bridge to the ${family} CLI. Do EXACTLY these steps and nothing else — review nothing yourself:
1. Using the Write tool, create the file "${SCRATCH}/${stem}.in.txt" with EXACTLY this content:
<<<PROMPT
${prompt}
PROMPT
2. Run this ONE command verbatim:
   CLAUDE_PROJECT_DIR="${REPO}" COUNCIL_SCRATCH="${SCRATCH}" COUNCIL_TIER="${tier}" ${modelEnv}COUNCIL_SCHEMA="${schemaFile}" COUNCIL_CHECK_KEY="${checkKey}" bash "${SCRIPT_DIR}/run.sh" ${family} ${stem}
3. If it exits non-zero, OR "${SCRATCH}/${stem}.out.json" is missing or empty, return exactly: FAILED
4. Otherwise read "${SCRATCH}/${stem}.out.json" and return its RAW verbatim contents and nothing else — no fences, no commentary.`,
    { label, phase: ph, model: bridgeModel, agentType: 'general-purpose' },
  )
  return parseJson(raw)
}

// ── Stage 1 · Find — Claude floor (always) + 3 external lanes (conditional) ──
phase('Find')

const CHARTER_REUSE_SIMPLIFICATION = `You are the REUSE + SIMPLIFICATION reviewer for this diff — an independent model family, not a rerun of another reviewer. REUSE: logic the repo (or its dependencies) already provides that the diff reimplements — a helper, hook, util, or type that already exists, a hand-rolled version of something stock. SIMPLIFICATION: unnecessary abstraction or indirection, behavior-preserving shortening, dead branches, redundant state, over-general code for a single call site. Report only concrete opportunities, never stylistic preference; every simplification must preserve behavior exactly.`
const CHARTER_ALTITUDE_EFFICIENCY = `You are the ALTITUDE + EFFICIENCY reviewer for this diff — an independent model family, not a rerun of another reviewer. ALTITUDE: is each piece of logic at the right layer (not leaking a concern up or down), and does comment density + accuracy match the surrounding codebase idiom (no over- or under-commenting, no stale/aspirational comments the diff introduced)? EFFICIENCY: flag only obviously wasteful hot-path work.`
const CHARTER_CONTRACTS = `You are the CORRECTNESS + CONTRACT + REMOVED-BEHAVIOR reviewer for this diff — an independent model family, not a rerun of another reviewer. Trace every contract the changed code participates in against the ACTUAL dependency sources (read node_modules, don't guess versions), find concrete correctness bugs, and flag any behavior the diff silently removed or narrowed.`
const CHARTER_ADVERSARIAL = `You are the ADVERSARIAL / TRUST-BOUNDARY reviewer for this diff — bring your OWN threat model, don't reproduce another reviewer's. Attack every trust boundary, state machine, and parser the diff touches; think about the worst-case input, not the happy path.`
const CHARTER_SCAN = `You are the LINE-BY-LINE reviewer for this diff — an exhaustive scan, distinct from contract tracing and adversarial review. Scrutinize every changed line for defects (edge cases, off-by-one, null/undefined, type assumptions, encoding, ordering). Self-verify each candidate against the code before reporting; drop only what you can REFUTE.`
function charterConventions() {
  return `You are the CONVENTIONS reviewer for this diff — an independent model family, not a rerun of another reviewer. Check the diff against the governing instruction files (AGENTS.md, .claude/rules/*) AND the plan's frozen acceptance criteria. Three directions: (1) rule violations — quote the exact rule line and the exact diff line that breaks it; (2) staleness the diff introduces — instruction-file lines the diff has made wrong or incomplete; (3) unmet acceptance criteria — for each of the plan's stack & design criteria below, report any the built diff fails to satisfy (name the criterion + the file/line that misses it).
Plan-frozen acceptance criteria to verify: ${criteria}`
}

// Five angles mirrored across all four families, each pinned to the model/tier that matches which
// Claude tier it corresponds to (see Model/effort pins above) — no angle rides a caller-supplied
// effort signal anymore. `dead-code` is deliberately NOT mirrored here: it's a repo-wide,
// deterministic-tool-first check (knip does the detection for zero model tokens), not a genuine
// review angle to diversify across families — running the same non-stochastic command four times
// buys nothing. It runs once, folded into feature-qc's Setup step (see feature-qc/SKILL.md).
const FINDERS = [
  { class: 'cleanup', angle: 'reuse+simplification', family: 'claude', agentType: 'cleanup-finder', model: 'sonnet', effort: 'medium', prompt: `${CHARTER_REUSE_SIMPLIFICATION}${commonTail}` },
  { class: 'cleanup', angle: 'altitude+efficiency', family: 'claude', agentType: 'cleanup-finder', model: 'sonnet', effort: 'medium', prompt: `${CHARTER_ALTITUDE_EFFICIENCY}${commonTail}` },
  { class: 'conventions', angle: 'conventions+docs+criteria', family: 'claude', agentType: 'conventions-finder', model: 'sonnet', effort: 'medium', prompt: `${charterConventions()}${commonTail}` },
  ...(large
    ? [{ class: 'bug', angle: 'line-by-line', family: 'claude', agentType: 'bug-finder', model: 'sonnet', effort: 'high', prompt: `${CHARTER_SCAN}${commonTail}` }]
    : []),
  { class: 'bug', angle: 'cross-file-contracts', family: 'claude', agentType: 'bug-finder', model: 'sonnet', effort: 'medium', prompt: `${CHARTER_CONTRACTS}${commonTail}` },
  { class: 'bug', angle: 'adversarial', family: 'claude', agentType: 'bug-finder', model: 'sonnet', effort: 'medium', prompt: `${CHARTER_ADVERSARIAL}${commonTail}` },
]

const claudeResults = await parallel(
  FINDERS.map((f) => () =>
    agent(f.prompt, { label: `${f.class}:${f.angle}`, phase: 'Find', agentType: f.agentType, model: f.model, effort: f.effort, schema: FINDINGS_SCHEMA })
      .then((out) => ({ finder: f, out })),
  ),
)

// External lanes mirror the same five angles, one narrow agent each — always-on: finding is a
// divergent task, and a barrier costs its slowest member rather than its width, so extra families
// ride in the shadow of the opus/sol bug-finders instead of adding wall time. Only the exhaustive
// line-by-line scans stay conditional on a large diff, one per family, mirroring the Claude floor.
const EXTERNAL_LANES = [
  // Codex — terra@medium on every unconditional angle (width-over-depth scheme; see pins above).
  { family: 'codex', model: CODEX_MODELS.terra, tier: 'medium', class: 'cleanup', angle: 'reuse+simplification', prompt: CHARTER_REUSE_SIMPLIFICATION },
  { family: 'codex', model: CODEX_MODELS.terra, tier: 'medium', class: 'cleanup', angle: 'altitude+efficiency', prompt: CHARTER_ALTITUDE_EFFICIENCY },
  { family: 'codex', model: CODEX_MODELS.terra, tier: 'medium', class: 'conventions', angle: 'conventions+docs+criteria', prompt: charterConventions() },
  { family: 'codex', model: CODEX_MODELS.terra, tier: 'medium', class: 'bug', angle: 'cross-file-contracts', prompt: CHARTER_CONTRACTS },
  { family: 'codex', model: CODEX_MODELS.terra, tier: 'medium', class: 'bug', angle: 'adversarial', prompt: CHARTER_ADVERSARIAL },
  // Grok — grok-4.5@medium on every unconditional angle.
  { family: 'grok', tier: 'medium', class: 'cleanup', angle: 'reuse+simplification', prompt: CHARTER_REUSE_SIMPLIFICATION },
  { family: 'grok', tier: 'medium', class: 'cleanup', angle: 'altitude+efficiency', prompt: CHARTER_ALTITUDE_EFFICIENCY },
  { family: 'grok', tier: 'medium', class: 'conventions', angle: 'conventions+docs+criteria', prompt: charterConventions() },
  { family: 'grok', tier: 'medium', class: 'bug', angle: 'cross-file-contracts', prompt: CHARTER_CONTRACTS },
  { family: 'grok', tier: 'medium', class: 'bug', angle: 'adversarial', prompt: CHARTER_ADVERSARIAL },
  // agy — every angle fixed to gemini-3.1-pro-high, no tier split (explicit instruction).
  { family: 'agy', tier: AGY_PRO, class: 'cleanup', angle: 'reuse+simplification', prompt: CHARTER_REUSE_SIMPLIFICATION },
  { family: 'agy', tier: AGY_PRO, class: 'cleanup', angle: 'altitude+efficiency', prompt: CHARTER_ALTITUDE_EFFICIENCY },
  { family: 'agy', tier: AGY_PRO, class: 'conventions', angle: 'conventions+docs+criteria', prompt: charterConventions() },
  { family: 'agy', tier: AGY_PRO, class: 'bug', angle: 'cross-file-contracts', prompt: CHARTER_CONTRACTS },
  { family: 'agy', tier: AGY_PRO, class: 'bug', angle: 'adversarial', prompt: CHARTER_ADVERSARIAL },
  // Exhaustive scans — large diffs only, one per external family, at HIGH: each family's single
  // exhaustive pass has no cross-family redundancy to lean on, so it keeps the deep tier.
  ...(large
    ? [
        { family: 'codex', model: CODEX_MODELS.terra, tier: 'high', class: 'bug', angle: 'line-by-line', prompt: CHARTER_SCAN },
        { family: 'grok', tier: 'high', class: 'bug', angle: 'line-by-line', prompt: CHARTER_SCAN },
        { family: 'agy', tier: AGY_PRO, class: 'bug', angle: 'line-by-line', prompt: CHARTER_SCAN },
      ]
    : []),
]

const externalResults = (await parallel(EXTERNAL_LANES.map((lane, i) => () =>
  cliBridge({
    family: lane.family, tier: lane.tier, model: lane.model, prompt: `${lane.prompt}${commonTail}`,
    label: `${lane.family}:${lane.angle}`, stem: `find-${lane.family}-${i}`, phase: 'Find',
    schemaFile: FINDINGS_SCHEMA_FILE, checkKey: 'findings', bridgeModel: 'haiku',
  }).then((out) => ({ lane, out })),
))).filter(Boolean).filter((r) => r.out)

const claudeOk = claudeResults.filter((r) => r && r.out).length
log(`find → claude ${claudeOk}/${FINDERS.length}, external ${externalResults.length}/${EXTERNAL_LANES.length} · large=${large}`)
// Fail LOUD on a degraded review. A prior run silently reported "external lanes 0/0 (skipped)"
// because an oversized args payload meant `large`/`effort` never arrived — an 89-file security diff
// got the Claude floor only, and nothing said so. Lanes are always-on now, so zero surviving
// external lanes means infrastructure failure, never a routing decision.
if (externalResults.length === 0) {
  log(`⚠️  ALL ${EXTERNAL_LANES.length} EXTERNAL LANES FAILED — this review is Claude-only and MUST NOT be reported as a full cross-model pass. Check .feature/qc-council/*.in.txt and re-run.`)
}

const rawFindings = []
for (const r of claudeResults) {
  if (!r || !r.out || !Array.isArray(r.out.findings)) continue
  for (const finding of r.out.findings) rawFindings.push({ class: r.finder.class, angle: r.finder.angle, family: 'claude', model: r.finder.model, ...finding })
}
for (const r of externalResults) {
  if (!r || !r.out || !Array.isArray(r.out.findings)) continue
  // codex reports its real model; agy's tier IS the model slug; grok is single-model.
  for (const finding of r.out.findings) rawFindings.push({ class: r.lane.class, angle: r.lane.angle, family: r.lane.family, model: r.lane.model || r.lane.tier, ...finding })
}
log(`find → ${rawFindings.length} raw findings before dedup`)

// ── Stage 2 · Dedup — convergent, single owner, INHERITS the session model (effort high). No
// diversity benefit: merging a list is not a hypothesis to diversify, a second family just re-sorts
// the same set. History: raised from sonnet to opus when the lanes went always-on (input tripled),
// then un-pinned entirely 2026-07-25 with Farzan — it is this workflow's single-call judgment
// stage (what survives to verification is decided here), and a judgment stage pinned a tier below
// the session model was the same logical flaw as plan-synth's opus-pinned draft lane. ───────────
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
    { label: 'dedup', phase: 'Dedup', effort: 'high', agentType: 'general-purpose', schema: DEDUP_SCHEMA },
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
    return agent(batchVerifyPrompt('claude'), { label: 'verify:claude', phase: 'Verify', model: VERIFY_CLAUDE_MODEL, effort: VERIFY_CLAUDE_EFFORT, agentType: 'general-purpose', schema: VERDICT_SCHEMA })
  }
  return cliBridge({
    family, tier: VERIFY_TIERS[family], model: family === 'codex' ? VERIFY_CODEX_MODEL : undefined,
    prompt: batchVerifyPrompt(family), label: `verify:${family}`, stem: `verify-${family}`,
    phase: 'Verify', schemaFile: VERDICT_SCHEMA_FILE, checkKey: 'verdicts',
  })
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
