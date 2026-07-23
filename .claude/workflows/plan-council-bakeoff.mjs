export const meta = {
  name: 'plan-council-bakeoff',
  description: 'Gated-descent bake-off over the planning council, grounded on the SESSION repo (ft/68) with NO worktree. Runs a CHOSEN SUBSET of configs (args.configs, default all four) SEQUENTIALLY so per-config wall-clock is uncontaminated, then a blind coverage panel + per-family depth-utility tally over whatever ran. Configs: D = deep exploration + full synthesis topology + reference tiers (each CLI explores ft/68 at native depth — the coverage CEILING); S = SIMPLE shared-digest (no exploration) + full topology + reference tiers (the "something simpler" comparator — does per-tool depth beat one good digest?); T = deep + full topology + LEAN tiers (isolates the TIER lever vs D); P = deep + LEAN adversarial topology + reference tiers (isolates the TOPOLOGY lever vs D). Targeted use: run configs:["D","S"] first (the depth question), read it, then fire T/P as informed follow-ons. Panel: union coverage checklist → per-plan present/partial/absent matrix → cross-model blind ranking (Claude + Codex + Grok). Utility: each family\'s OWN raw draft scored vs the checklist for whichever of D/S ran, so depth\'s marginal value reads per tool. Read-only; writes nothing to the repo.',
  whenToUse: 'Run configs:["D","S"] for the depth question (does per-tool depth beat a simple digest, per tool); add T/P for the tier/topology speed levers. maxCandidates:1 keeps each config targeted.',
  phases: [
    { title: 'Configs', detail: 'run the chosen subset (D/S/T/P) sequentially' },
    { title: 'Checklist', detail: 'union coverage checklist over the blind plans' },
    { title: 'Panel', detail: 'per-plan coverage matrix + cross-model blind ranking' },
    { title: 'Utility', detail: 'per-family draft coverage, deep (D) vs simple (S)' },
  ],
}

const REPO = (args && args.repoDir) || '/Users/farzanm4/Desktop/drive/repos/oparax'
const PLAN_COUNCIL = '/Users/farzanm4/Desktop/drive/repos/oparax/.claude/workflows/plan-council.mjs'  // nested workflow addressed by path, not registry name
const SCRIPT_DIR = '/Users/farzanm4/Desktop/drive/repos/oparax/.claude/workflows/council'
const RANK_SCHEMA = `${SCRIPT_DIR}/rank-schema.json`
const SCRATCH = '/private/tmp/claude-501/-Users-farzanm4-Desktop-drive-repos-oparax/ba5fab37-6a80-4d93-85e7-5f6c1c7edc76/scratchpad/bakeoff'
const ASK_CTX = 'Oparax Slice 5 — "the full-live product": make voice extraction live (real X-timeline fetch + the re-arming L11 spend guard), deploy the ingest/ worker to Railway, and turn every greyed scaffold on branch ft/68 into a real live control (per-desk delivery + Channels, auto-post, voice_rules, in-app draft editing, create-form AI assistant, websites source, clustering, multi-platform drafting, the Activity surface), obeying L7/L9/L12 instrumentation.'

// Which configs to run this descent (default all four). Targeted first step: ["D","S"].
const ALL_CONFIGS = ['D', 'S', 'T', 'P']
const ORDER = (args && Array.isArray(args.configs) && args.configs.length) ? args.configs.filter((c) => ALL_CONFIGS.includes(c)) : ALL_CONFIGS

// Smoke overrides flow through to BOTH the child councils and this panel.
const SMOKE = !!(args && args.smoke)
const claudeModel = (args && args.claudeModel) || null       // smoke → 'haiku'
const panelOpts = { agentType: 'general-purpose', ...(claudeModel ? { model: claudeModel } : {}) }
const childCommon = {
  repoDir: REPO,
  ...(args && args.ask ? { ask: args.ask } : {}),
  ...(claudeModel ? { claudeModel } : {}),
  ...(args && Array.isArray(args.families) ? { families: args.families } : {}),   // smoke → ['claude']
  ...(args && args.maxCandidates ? { maxCandidates: args.maxCandidates } : {}),
}
const childArgs = (config) => ({ ...childCommon, config })

// ---- Stage 1: run the chosen configs SEQUENTIALLY (clean per-config timing) ----
// deep configs (D/T/P) ground each member on ft/68 directly; S computes its own digest. No shared digest stage.
phase('Configs')
const runs = {}
for (const ck of ORDER) {
  const r = await workflow({ scriptPath: PLAN_COUNCIL }, childArgs(ck))
  runs[ck] = r
  if (!r || !r.finalPlan) log(`config ${ck} produced NO final plan — panel will treat it as empty`)
  else log(`config ${ck} plan → ${String(r.finalPlan).length} chars; draft ${r.execution?.draftReturned}/${r.execution?.draftTotal}; depth=${r.execution?.depth}; topology=${r.execution?.topology}`)
}

// ---- Blind anonymization: fixed permutation (comparator S first, ceiling D not first) filtered to what ran ----
const FULL_BLIND_ORDER = ['S', 'T', 'D', 'P']
const BLIND = FULL_BLIND_ORDER.filter((k) => ORDER.includes(k)).map((k, i) => ({ label: `Plan-${i + 1}`, key: k }))
const plansBlock = BLIND.map((b) => `==================== ${b.label} ====================\n${String(runs[b.key]?.finalPlan || '(this plan is empty)')}`).join('\n\n')

// ---- Stage 2: union coverage checklist over the blind plans ----
phase('Checklist')
const CHECKLIST_SCHEMA = { type: 'object', additionalProperties: false, properties: { items: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, item: { type: 'string' }, category: { type: 'string' } }, required: ['id', 'item', 'category'] } } }, required: ['items'] }
const checklist = await agent(
  `You are building a COVERAGE CHECKLIST for a feature plan. Below are ${BLIND.length} independent plans (Plan-1..${BLIND.length}) for the SAME slice. Extract the UNION of every SUBSTANTIVE deliverable, decision, build step, wired interface, guard, migration, and acceptance criterion that appears in ANY plan. Deduplicate aggressively (same work phrased differently = one item). Give each a short id (e.g. F1, F2…) and a category (e.g. voice, extraction, worker, delivery, channels, auto-post, voice-rules, editing, creation, sources, clustering, platform, activity, rls, instrumentation, instruction-updates). This is the master rubric every plan is scored against — be thorough; a missing rubric item means a real coverage gap goes unmeasured.
Ask context: ${ASK_CTX}

${plansBlock}`,
  { label: 'checklist', phase: 'Checklist', ...panelOpts, schema: CHECKLIST_SCHEMA },
)
const items = (checklist && checklist.items) || []
log(`coverage checklist → ${items.length} items`)
const checklistText = items.map((i) => `${i.id} [${i.category}] ${i.item}`).join('\n')

// ---- Stage 3: per-plan coverage matrix (blind) + cross-model blind ranking ----
const MATRIX_SCHEMA = { type: 'object', additionalProperties: false, properties: { scores: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, status: { type: 'string', enum: ['present', 'partial', 'absent'] } }, required: ['id', 'status'] } }, notes: { type: 'string' } }, required: ['scores', 'notes'] }

const matrixJobs = BLIND.map((b) => () =>
  agent(`Score this ONE plan against the coverage checklist. For EACH checklist id, mark: present (fully covered), partial (mentioned but underspecified), or absent (not covered). Be strict — "present" means a zero-context engineer could build it from THIS plan.
Checklist:
${checklistText}

The plan (${b.label}):
${String(runs[b.key]?.finalPlan || '(empty)')}`,
    { label: `matrix:${b.label}`, phase: 'Panel', ...panelOpts, schema: MATRIX_SCHEMA },
  ).then((out) => ({ label: b.label, out }))
)

const rankPrompt = `${BLIND.length} independent plans (Plan-1..${BLIND.length}) for the SAME feature slice are below. Context: ${ASK_CTX}
Rank them best-to-worst on OVERALL coverage + detail + correctness, name the materially-thinnest plan (or 'none'), and judge coverage parity. Base every judgment on concrete plan elements, not prose polish.

${plansBlock}`
async function cliJudge(family, tier) {
  const stem = `rank-${family}`
  const raw = await agent(
    `You are a shell bridge to the ${family} CLI acting as a blind plan judge. Do EXACTLY this, judge nothing yourself:
1. Write the file "${SCRATCH}/${stem}.in.txt" with EXACTLY this content:
<<<PROMPT
${rankPrompt}
PROMPT
2. Run: CLAUDE_PROJECT_DIR="${REPO}" bash "${SCRIPT_DIR}/ask-cli.sh" ${family} "${SCRATCH}/${stem}.in.txt" "${RANK_SCHEMA}" "${tier}" "${SCRATCH}/${stem}.out.json"
3. If it exits non-zero or the out file is missing/empty, return exactly: FAILED
4. Otherwise return the RAW verbatim contents of "${SCRATCH}/${stem}.out.json" and nothing else.`,
    { label: `${family}:rank`, phase: 'Panel', model: 'sonnet', agentType: 'general-purpose' },
  )
  if (!raw || raw.trim().startsWith('FAILED')) return null
  try { const t = raw.trim(); return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) } catch { return null }
}
const rankJobs = [
  () => agent(`${rankPrompt}\n\nReturn the ranking, thinnest plan, coverage-parity verdict, and rationale.`, { label: 'claude:rank', phase: 'Panel', ...panelOpts, schema: { type: 'object', additionalProperties: false, properties: { ranking: { type: 'array', items: { type: 'string' } }, thinnest: { type: 'string' }, coverageParity: { type: 'string' }, rationale: { type: 'string' } }, required: ['ranking', 'thinnest', 'coverageParity', 'rationale'] } }).then((out) => ({ judge: 'claude', out })),
]
if (!SMOKE) {
  rankJobs.push(() => cliJudge('codex', 'high').then((out) => ({ judge: 'codex', out })))
  rankJobs.push(() => cliJudge('grok', 'high').then((out) => ({ judge: 'grok', out })))
}

// ---- Stage 4: per-family utility tally — each family's OWN raw draft scored vs the checklist, for whichever of D/S ran ----
const UTILITY_CONFIGS = ['D', 'S'].filter((c) => ORDER.includes(c))
const utilityJobs = []
for (const ck of UTILITY_CONFIGS) {
  const drafts = (runs[ck] && runs[ck].detail && runs[ck].detail.drafts) || []
  const byFam = {}
  for (const d of drafts) {
    const md = d.plan ? String(d.plan.plan || '') : ''
    const text = `${(d.plan && d.plan.chosenApproach) || ''}\n\n${md}`
    if (!byFam[d.fam] || md.length > byFam[d.fam].len) byFam[d.fam] = { text, len: md.length }
  }
  for (const fam of Object.keys(byFam)) {
    const t = byFam[fam].text
    utilityJobs.push(() =>
      agent(`Score this ONE model family's RAW draft plan against the coverage checklist. For EACH checklist id: present / partial / absent (strict — "present" = buildable from THIS draft alone).
Checklist:
${checklistText}

The draft (config ${ck}, family ${fam}):
${t}`,
        { label: `util:${ck}:${fam}`, phase: 'Utility', ...panelOpts, schema: MATRIX_SCHEMA },
      ).then((out) => ({ config: ck, fam, out }))
    )
  }
}

phase('Panel')
const [matrix, ranks] = await parallel([() => parallel(matrixJobs), () => parallel(rankJobs)])
phase('Utility')
const utility = await parallel(utilityJobs)

const matrixClean = matrix.filter(Boolean).filter((m) => m.out)
const ranksClean = ranks.filter(Boolean).filter((r) => r.out)
const utilityClean = utility.filter(Boolean).filter((u) => u.out)
log(`panel → matrix ${matrixClean.length}/${BLIND.length}, ranks ${ranksClean.length}/${rankJobs.length}, utility ${utilityClean.length}/${utilityJobs.length}`)

// ---- coverage tally (present=1, partial=0.5, absent=0) ----
const scoreOf = (s) => {
  const present = s.filter((x) => x.status === 'present').length
  const partial = s.filter((x) => x.status === 'partial').length
  const absent = s.filter((x) => x.status === 'absent').length
  return { present, partial, absent, coverageScore: present + 0.5 * partial, total: s.length }
}
const tally = matrixClean.map((m) => ({ label: m.label, config: (BLIND.find((b) => b.label === m.label) || {}).key, ...scoreOf(m.out.scores || []), notes: m.out.notes }))
const utilityTally = utilityClean.map((u) => ({ config: u.config, fam: u.fam, ...scoreOf(u.out.scores || []) }))

const pick = (o) => Object.fromEntries(ORDER.map((k) => [k, o(runs[k])]))
log('bake-off done')
return {
  ranConfigs: ORDER,
  deblindMap: BLIND,                       // label → config (for the analyst; judges never saw this)
  perConfig: pick((r) => ({ execution: r?.execution, planChars: String(r?.finalPlan || '').length })),
  timings: pick((r) => ({ depth: r?.execution?.depth, draft: r?.execution?.draftTimings, judge: r?.execution?.judgeTimings, topology: r?.execution?.topology })),
  coverage: { checklistSize: items.length, checklist: items, tally },
  perFamilyUtility: utilityTally,          // deep-vs-simple coverage PER family (the depth-utility table)
  blindRanking: ranksClean,
  plans: pick((r) => r?.finalPlan),
  detail: pick((r) => r?.detail),
}
