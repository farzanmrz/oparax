export const meta = {
  name: 'qc-review',
  description: 'Fan out every feature-QC finder (cleanup + bugs + conventions) in one parallel pass over a frozen diff, models pinned, and return consolidated findings for the session to adjudicate.',
  whenToUse: "feature-qc's review pass — replaces the serial /simplify then /code-review passes with a single barrier so all finders run at once. The session applies fixes afterward.",
  phases: [
    { title: 'Review', detail: '2 cleanup + conventions on sonnet, adversarial + cross-file bugs on opus, line-by-line (sonnet) only on large diffs — all concurrent' },
  ],
}

// args (from the feature-qc skill):
//   { range: string,          // git diff range, e.g. "origin/dev...ft/50"
//     generated?: string,     // one line naming generated/vendored paths to skip
//     vetoes?: string,        // plan-frozen decisions that are vetoes, not findings
//     criteria?: string,      // the plan's "Stack & design acceptance criteria" — conventions-finder verifies the diff against them
//     large?: boolean,        // large-diff signal — the session measures the diff and sets this
//                             //   (the workflow sandbox can't shell out); adds the line-by-line bug angle
//     effort?: 'medium'|'high' } // bug-angle depth; defaults to medium
//
// Returns { findings: [...] } — each finding tagged with its class + angle + the
// model that raised it, most-severe-first within each finder. The session
// adjudicates (plan-frozen vetoes win), then applies.

const range = (args && args.range) || 'origin/dev...HEAD'
const generated = (args && args.generated) || 'none named — use judgment on obviously generated/vendored files'
const vetoes = (args && args.vetoes) || 'none supplied'
const criteria = (args && args.criteria) || 'none supplied — if the plan/issue has a "Stack & design acceptance criteria" section, treat its lines as the criteria'
const effort = (args && args.effort) === 'high' ? 'high' : 'medium'
const large = !!(args && args.large) // caller-supplied; gates the line-by-line bug angle (zero yield on small diffs)

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

// Every finder runs itself against the same frozen range. Prompts are the
// "dispatch prompt" the agent-file bodies expect: scope + ONE angle + vetoes.
const commonTail = `
Diff scope: run \`git diff ${range}\` yourself and review ONLY that diff; read the full enclosing function of any touched line, and the actual shipped sources in node_modules for any cross-boundary contract (version-pinned behavior beats memory).
Skip generated/vendored files: ${generated}.
Plan-frozen decisions — these are VETOES, do NOT report them as findings: ${vetoes}.
Report findings only (file, line, severity, one-sentence summary, concrete scenario, and for bug angles a CONFIRMED/PLAUSIBLE verdict). An empty list is a valid, expected result. Never edit a file.`

const FINDERS = [
  {
    class: 'cleanup', angle: 'reuse+simplification', agentType: 'cleanup-finder', model: 'sonnet',
    prompt: `Your angles: REUSE + SIMPLIFICATION (they converge — cover both in one pass). REUSE: logic the repo (or its dependencies) already provides that the diff reimplements — a helper, hook, util, or type that already exists, a hand-rolled version of something stock. SIMPLIFICATION: unnecessary abstraction or indirection, behavior-preserving shortening, dead branches, redundant state, over-general code for a single call site. Report only concrete opportunities, never stylistic preference; every simplification must preserve behavior exactly.${commonTail}`,
  },
  {
    class: 'cleanup', angle: 'altitude+efficiency', agentType: 'cleanup-finder', model: 'sonnet',
    prompt: `Your angles: ALTITUDE (senior lens) + EFFICIENCY (secondary). ALTITUDE: is each piece of logic at the right layer (not leaking a concern up or down), and does comment density + accuracy match the surrounding codebase idiom (no over- or under-commenting, no stale/aspirational comments the diff introduced)? EFFICIENCY: flag only obviously wasteful hot-path work.${commonTail}`,
  },
  {
    class: 'conventions', angle: 'conventions+docs+criteria', agentType: 'conventions-finder', model: 'sonnet',
    prompt: `Check the diff against the governing instruction files (AGENTS.md, .claude/rules/*) AND the plan's frozen acceptance criteria. Three directions: (1) rule violations — quote the exact rule line and the exact diff line that breaks it; (2) staleness the diff introduces — instruction-file lines the diff has made wrong or incomplete; (3) unmet acceptance criteria — for each of the plan's stack & design criteria below, report any the built diff fails to satisfy (name the criterion + the file/line that misses it).
Plan-frozen acceptance criteria to verify: ${criteria}${commonTail}`,
  },
  // Bug angles: adversarial + cross-file always on opus; line-by-line only on large
  // diffs (zero yield on small ones) and de-pinned to sonnet.
  ...(large
    ? [{
        class: 'bug', angle: 'line-by-line', agentType: 'bug-finder', model: 'sonnet',
        prompt: `Your ONE angle: LINE-BY-LINE SCAN of the new/changed code — every line scrutinized for defects (edge cases, off-by-one, null/undefined, type assumptions, encoding, ordering). Self-verify each candidate against the code (a quick repro where feasible) before reporting; drop only what you can REFUTE. Effort: ${effort}.${commonTail}`,
      }]
    : []),
  {
    class: 'bug', angle: 'cross-file-contracts', agentType: 'bug-finder', model: 'opus',
    prompt: `Your ONE angle: CROSS-FILE CONTRACT TRACING — trace every contract the changed code participates in end to end (caller↔callee, framework registration, dependency API shape, env availability), reading the actual node_modules sources. Report contracts that are violated or fragile. Effort: ${effort}.${commonTail}`,
  },
  {
    class: 'bug', angle: 'adversarial', agentType: 'bug-finder', model: 'opus',
    prompt: `Your ONE angle: ADVERSARIAL — think like an attacker or a worst-case input against any trust boundary, state machine, or parser the diff touches. Classify each candidate CONFIRMED/PLAUSIBLE and give the concrete attack/failure scenario; refute cleanly where a guard makes it impossible. Effort: ${effort}.${commonTail}`,
  },
]

phase('Review')

const results = await parallel(
  FINDERS.map((f) => () =>
    agent(f.prompt, {
      label: `${f.class}:${f.angle}`,
      phase: 'Review',
      agentType: f.agentType,
      model: f.model,
      schema: FINDINGS_SCHEMA,
    }).then((out) => ({ finder: f, out })),
  ),
)

const findings = []
for (const r of results) {
  if (!r || !r.out || !Array.isArray(r.out.findings)) continue
  for (const finding of r.out.findings) {
    findings.push({
      class: r.finder.class,
      angle: r.finder.angle,
      model: r.finder.model,
      ...finding,
    })
  }
}

log(`qc-review: ${findings.length} findings across ${FINDERS.length} finders`)

return { findings, findersRun: FINDERS.length }
