export const meta = {
  name: 'plan-council',
  description: 'Multi-family planning council for ONE feature slice, at a SELECTABLE config (args.config = D|S|T|P). Grounding has TWO modes on the axis that matters for the ablation: DEEP (default) — every member (Claude subagents AND each CLI: codex, grok, agy) explores the REAL repo tree at args.repoDir at its OWN native depth (its own tools + subagents), which is the SAME tree Claude subagents inherit as cwd, so there is ONE shared ft/68 tree and no branch-split; SIMPLE — a single deterministic bash digest of that tree is fed to every member and filesystem reads are forbidden (the "something simpler" comparison arm). Flow: ground → scope (skills) → lenses (one per skill) → consolidate (constraint set + kebab candidates) → draft council (every candidate × every family, at native depth) → judge (synthesis council OR, in topology=adversarial, a lean Claude adversarial-critic pass) → unify. Config knobs: grounding depth, external-family tiers, Claude creative tier, candidate count, judge topology. READ-ONLY: produces a plan for review; writes nothing to the repo. Also emits instruction-file update recommendations (AGENTS.md / docs/decisions.md / .claude/rules).',
  whenToUse: 'The production planning council, and the unit the D/S/T/P full-matrix bake-off runs four times. Pass args.config to pick the depth/tier/topology profile.',
  phases: [
    { title: 'Ground', detail: 'deep: each member explores ft/68 · simple: one shared digest' },
    { title: 'Scope', detail: 'select skills + distill area map (sonnet-low)' },
    { title: 'Lenses', detail: 'one skill lens per selected skill (sonnet-low)' },
    { title: 'Consolidate', detail: 'constraint set + kebab candidates (creative)' },
    { title: 'DraftCouncil', detail: 'each candidate × every family, parallel, at native depth' },
    { title: 'JudgeCouncil', detail: 'synthesis council OR adversarial Claude critics (topology)' },
    { title: 'Unify', detail: 'final plan + instruction-file updates (creative)' },
  ],
}

// ---------- config profiles (the full-matrix levers) ----------
// D = deep exploration + full synthesis topology + reference tiers  — the coverage CEILING
// S = SIMPLE shared-digest (no exploration) + full topology + reference tiers — the "something simpler" comparator
// T = deep + full topology + LEAN tiers    — isolates the TIER lever (vs D)
// P = deep + LEAN adversarial topology + reference tiers — isolates the TOPOLOGY lever (vs D)
// candidates defaults to 1 (not 2): the gated descent scores ONE candidate per family per config —
// candidate DIVERSITY is a separate concern from LEVER measurement (depth/tier/topology), and args-based
// overrides to nested workflow() calls proved unreliable in practice, so the lean default lives here,
// at the source of truth, instead of depending on a cross-workflow override landing.
const CONFIGS = {
  D: { depth: 'deep',   tiers: { codex: 'high',   grok: 'high',   agy: 'gemini-3.1-pro-high' },  claudeCreative: undefined, candidates: 1, topology: 'synthesis'  },
  S: { depth: 'simple', tiers: { codex: 'high',   grok: 'high',   agy: 'gemini-3.1-pro-high' },  claudeCreative: undefined, candidates: 1, topology: 'synthesis'  },
  T: { depth: 'deep',   tiers: { codex: 'medium', grok: 'medium', agy: 'gemini-3.6-flash-high' }, claudeCreative: 'sonnet',  candidates: 1, topology: 'synthesis'  },
  P: { depth: 'deep',   tiers: { codex: 'high',   grok: 'high',   agy: 'gemini-3.1-pro-high' },  claudeCreative: undefined, candidates: 1, topology: 'adversarial' },
}
const CONFIG_KEY = (args && args.config) || 'D'
const cfg = CONFIGS[CONFIG_KEY] || CONFIGS.D

// ---------- overrides (smoke forces cheap tiers / claude-only families) ----------
// REPO defaults to the SESSION repo (ft/68) — the SAME tree the Claude subagents inherit as cwd,
// so deep mode reads ONE shared tree (no worktree, no branch-split).
const REPO = (args && args.repoDir) || '/Users/farzanm4/Desktop/drive/repos/oparax'
const DEPTH = (args && args.depth) || cfg.depth   // 'deep' | 'simple'

// The real Slice-5 planning ask (grounded gap map of docs/decisions.md vs actual ft/68 code).
// PLAN-ONLY simulation; excludes already-built D16 + email-inbound; excludes external/out-of-scope (D6/D13, tuning halves of D11/D9).
const ask = (args && args.ask) || `Plan Oparax Slice 5 — "the full-live product": the single feature that turns every greyed scaffold on branch ft/68 into a real, live control and lights up the drafting loop end-to-end in production. Ground every step in the ACTUAL code on this branch.

The spine is making voice extraction real — replace lib/voice/create-desk-extraction.ts's local-file loadCorpus with a live X-timeline fetch, and (mandatory, SAME diff, per the re-arming L11 spend guard) ship a per-owner extraction spend cap and/or D14 handle-verification. In parallel, deploy the finished ingest/ worker to Railway with real secrets, stream rules, and an L1 cap re-probe so live X deliveries actually reach /api/ingest and populate the already-wired Feed. Then make each greyed capability real: per-desk delivery + a new Channels section backed by a deny-all slack_accounts table and getSlackLinkState(), a real Slack app with an interactions endpoint for approve/post buttons, and persisted notification preferences; per-source and master auto-post backed by real columns and an auto-post pipeline branch; a voice_rules table with add/edit/delete + suggestions replacing the opaque markdown guide; in-app draft editing that writes a new revision on the existing parent_draft_id chain; the create-form AI assistant re-plumbing the orphaned /api/chat agent onto the fuzzy beat/instruction fields; the live Websites source (web-search/scrape ingestion); clustering (additive stories table + a grouping pass feeding the clustering-ready FeedStory.sourcePosts list); and multi-platform drafting (a platform dimension on the council + the draft card's platform pills). Also complete the L8 Activity surface (stream liveness, cap alarms, per-run cost/model history) that today exists only as a spend rollup inside Setup.

Binding cross-cutting invariants every plan step must obey: L7 usage_events stamping, L9 instrumentation rules, and L12's one-model_calls-row-with-reasoning-trace — so any step that makes a model call must name where its trace is stored. Already built and wired, DO NOT re-plan: D16 dedup/post-outcome (draft_claims + unmatched_deliveries), and email-inbound reply handling. Explicitly OUT of scope (build only plumbing, not the tuning halves): billing/payments (D6), X Enterprise tier (D13), the embedding gate (D11) and draft-everything policy (D9) tuning.

This is a PLAN-ONLY simulation — produce the plan for review; do NOT write files or make changes.`

const CLAUDE_MODEL_OVERRIDE = (args && args.claudeModel) || null   // smoke → 'haiku'
const tiers = (args && args.tierOverride) || cfg.tiers
const MAX_CANDIDATES = (args && args.maxCandidates) || cfg.candidates
const TOPOLOGY = (args && args.topology) || cfg.topology

const SCRIPT_DIR = '/Users/farzanm4/Desktop/drive/repos/oparax/.claude/workflows/council'
const SCHEMA = '/Users/farzanm4/Desktop/drive/repos/oparax/.claude/workflows/plan-codex-schema.json'
const SKILLS_SH = '/Users/farzanm4/Desktop/drive/repos/oparax/.claude/workflows/list-plan-skills.sh'
const SCRATCH = `/private/tmp/claude-501/-Users-farzanm4-Desktop-drive-repos-oparax/ba5fab37-6a80-4d93-85e7-5f6c1c7edc76/scratchpad/council-${CONFIG_KEY}`

// extraction = grounding/structuring stages, always cheap
const extractOpts = { model: CLAUDE_MODEL_OVERRIDE || 'sonnet', effort: 'low', agentType: 'general-purpose' }
// creative = judgment stages: inherit session model (opus) unless the config leans them down
const creativeModel = CLAUDE_MODEL_OVERRIDE || cfg.claudeCreative
const creativeOpts = { agentType: 'general-purpose', ...(creativeModel ? { model: creativeModel } : {}) }

const slug = (s) => String(s).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 24) || 'x'

const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    chosenApproach: { type: 'string' },
    plan: { type: 'string' },
    keyConstraints: { type: 'array', items: { type: 'string' } },
    risksOrDisagreements: { type: 'array', items: { type: 'string' } },
    instructionUpdates: { type: 'array', items: { type: 'string' } },
  },
  required: ['chosenApproach', 'plan', 'keyConstraints', 'risksOrDisagreements', 'instructionUpdates'],
}

function parsePlan(raw) {
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  if (t.startsWith('FAILED')) return null
  try { const s = t.indexOf('{'), e = t.lastIndexOf('}'); if (s < 0 || e <= s) return null; return JSON.parse(t.slice(s, e + 1)) } catch { return null }
}

// ---------- the grounding rule appended to every draft/synthesis/critic prompt ----------
// SIMPLE mode: forbid all repo reads — the digest + constraint set are the only ground truth (the old discipline).
// DEEP mode: the OPPOSITE — actively invite each member to explore the real ft/68 tree at its own depth
// (its own tools + subagents). This is the per-tool-utility signal the ablation exists to measure.
const NO_SURVEY_TEXT = `\n\nHARD RULE: Do NOT read, open, list, or grep ANY repository files. You have all the ground truth you need above. Produce the plan using ONLY the context and constraints given here.`
const DEEP_EXPLORE_TEXT = `\n\nGROUNDING: The repository is at your working directory (${REPO}, branch ft/68). Explore it as deeply as you need — read the real files, search, and delegate to your own explorer/planner subagents if your tooling supports it — so every claim is grounded in the ACTUAL code on this branch, not assumptions. The constraint set above is a starting frame, not a limit; verify it and go beyond it.`
const GROUND_RULE = DEPTH === 'simple' ? NO_SURVEY_TEXT : DEEP_EXPLORE_TEXT

// External-CLI worker: a SONNET shell-bridge that routes through run.sh (short bash display).
// COUNCIL_DEPTH is threaded so each wrapper flips its own exploration flags (grok --max-turns/subagents,
// agy explore-suffix); codex is agentic already and keys off the prompt's GROUND_RULE alone.
async function cliWorker(family, tier, promptText, displayLabel, fileStem, ph) {
  const raw = await agent(
    `You are a shell bridge to the ${family} planning CLI. Do EXACTLY these steps and nothing else — plan nothing yourself:
1. Using the Write tool, create the file "${SCRATCH}/${fileStem}.in.txt" with EXACTLY this content:
<<<PROMPT
${promptText}
PROMPT
2. Run this ONE command verbatim:
   CLAUDE_PROJECT_DIR="${REPO}" COUNCIL_SCRATCH="${SCRATCH}" COUNCIL_TIER="${tier}" COUNCIL_DEPTH="${DEPTH}" bash "${SCRIPT_DIR}/run.sh" ${family} ${fileStem}
3. If it exits non-zero, OR "${SCRATCH}/${fileStem}.out.json" is missing or empty, return exactly: FAILED
4. Otherwise read "${SCRATCH}/${fileStem}.out.json" and return its RAW verbatim contents and nothing else — no fences, no commentary.`,
    { label: displayLabel, phase: ph, model: 'sonnet', agentType: 'general-purpose' },
  )
  return parsePlan(raw)
}

// families: default all four; smoke can pass args.families=['claude'] for a cheap claude-only wiring run.
const ALL_FAMILIES = [{ key: 'claude', kind: 'claude' }, { key: 'codex', kind: 'cli' }, { key: 'grok', kind: 'cli' }, { key: 'agy', kind: 'cli' }]
const FAMILIES = (args && Array.isArray(args.families) && args.families.length)
  ? ALL_FAMILIES.filter((f) => args.families.includes(f.key))
  : ALL_FAMILIES

log(`plan-council config=${CONFIG_KEY} · depth=${DEPTH} · tiers=${JSON.stringify(tiers)} · candidates=${MAX_CANDIDATES} · topology=${TOPOLOGY} · claudeCreative=${creativeModel || 'inherit(opus)'} · families=${FAMILIES.map((f) => f.key).join(',')}`)

// ---- Stage -1: Ground ----
// deep: nothing shared — each member grounds itself on ft/68. simple: one digest fed to all.
phase('Ground')
let groundDigest = ''
if (DEPTH === 'simple') {
  groundDigest = (args && args.groundDigest) || ''
  if (!groundDigest) {
    groundDigest = await agent(
      `You are a deterministic grounding bridge. Do EXACTLY this, nothing else:
1. Run this ONE command:  bash "${SCRIPT_DIR}/ground-digest.sh" "${REPO}"
2. Return its stdout VERBATIM and nothing else (no fences, no commentary). If it errors, return exactly: FAILED`,
      { label: 'sonnet:ground', phase: 'Ground', model: 'sonnet', effort: 'low', agentType: 'general-purpose' },
    )
    if (!groundDigest || groundDigest.trim().startsWith('FAILED')) { log('GROUND FAILED — aborting'); return { error: 'ground-digest failed', config: CONFIG_KEY } }
  }
  log(`ground(simple) → ${groundDigest.length} chars, single-source digest of ${REPO}`)
} else {
  log(`ground(deep) → no shared digest; every member explores ${REPO} (ft/68) at native depth`)
}

// ---- Stage 0: Scope (sonnet-low) ----
phase('Scope')
const scopeGround = DEPTH === 'simple'
  ? `Your ground truth is the REPO DIGEST below — do NOT read the filesystem; everything you need is in the digest.\n\nREPO DIGEST (authoritative ground truth):\n${groundDigest}`
  : `Ground truth is the ACTUAL repository at ${REPO} (branch ft/68). EXPLORE it — read files, grep, list — to learn what already exists in the areas this slice touches and the hard guards it must respect. Do not rely on assumptions; open the real code.`
const scope = await agent(
  `Scope pass for ONE feature slice.
1. Run: bash ${SKILLS_SH}  — it prints "skill-id<TAB>description" lines. Those IDs are the ONLY valid skill values.
2. SELECT every skill whose remit this slice genuinely touches (no cap; borderline → include).
3. Distill a tight digest of what already exists in the touched areas + the hard guards this slice must respect (cite real files/tables when you can).
Ask: ${ask}

${scopeGround}`,
  { label: 'sonnet:scope', phase: 'Scope', ...extractOpts, schema: { type: 'object', additionalProperties: false, properties: { skills: { type: 'array', items: { type: 'string' } }, digest: { type: 'string' } }, required: ['skills', 'digest'] } },
)
const skills = (scope && scope.skills || []).filter(Boolean)
const digest = (scope && scope.digest) || ''
log(`scope → ${skills.length} skills: ${skills.join(', ')}`)

// ---- Stage 1: Lenses (one sonnet-low agent per selected skill; label = the skill id itself) ----
phase('Lenses')
const lensGround = DEPTH === 'simple'
  ? `use the scope digest below as ground truth (do NOT read the filesystem).`
  : `use the scope digest below as a map, and explore ${REPO} (ft/68) further where you need the real code.`
const lenses = (await parallel(skills.map((s) => () =>
  agent(`You are the \`${s}\` planning lens. FIRST invoke the \`${s}\` skill for its methodology, then apply it to this slice — ${lensGround}
Ask: ${ask}
Scope digest: ${digest}
Return hard constraints (each with the failure it prevents), your one recommended approach, and concrete acceptance criteria.`, {
    label: s, phase: 'Lenses', ...extractOpts,
    schema: { type: 'object', additionalProperties: false, properties: { constraints: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { rule: { type: 'string' }, why: { type: 'string' } }, required: ['rule', 'why'] } }, recommendedApproach: { type: 'string' }, acceptanceCriteria: { type: 'array', items: { type: 'string' } } }, required: ['constraints', 'recommendedApproach', 'acceptanceCriteria'] },
  }).then((out) => ({ skill: s, out })),
))).filter(Boolean).filter((r) => r.out)
log(`lenses → ${lenses.length}/${skills.length} returned`)

// ---- Stage 2a: Consolidate → constraint set + kebab candidates (creative tier) ----
phase('Consolidate')
const consolidated = await agent(
  `Consolidation step. Merge these lens briefs into ONE deduped constraint set, and propose up to ${MAX_CANDIDATES} GENUINELY DISTINCT candidate approaches (each satisfying every constraint).
Each candidate "name" MUST be a short kebab-case slug, ≤3 words (e.g. "feed-first", "section-tabs", "server-action-first") — it becomes a display label.
Ask: ${ask}
Scope digest: ${digest}
Lens briefs: ${JSON.stringify(lenses)}`,
  { label: 'sonnet:consolidate', phase: 'Consolidate', ...creativeOpts, schema: { type: 'object', additionalProperties: false, properties: { constraintSet: { type: 'array', items: { type: 'string' } }, candidates: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, sketch: { type: 'string' } }, required: ['name', 'sketch'] } } }, required: ['constraintSet', 'candidates'] } },
)
const candidates = (consolidated && consolidated.candidates || []).slice(0, MAX_CANDIDATES)
const constraintSet = (consolidated && consolidated.constraintSet) || []
log(`consolidate → ${candidates.length} candidates: ${candidates.map((c) => c.name).join(', ')}`)

// ---- Stage 2b: Draft council — each candidate × each family, all parallel ----
phase('DraftCouncil')
const draftPrompt = (cand) => `Draft this candidate into a buildable plan for the ask, and fill the schema (chosenApproach; plan as markdown with a file map + bite-sized tasks; keyConstraints; risksOrDisagreements; instructionUpdates — the AGENTS.md / docs/decisions.md / .claude/rules edits this slice makes necessary, each as "FILE: what to change and why", NOT the feature-flow skills).
Ask: ${ask}
Candidate: ${cand.name} — ${cand.sketch}
Constraint set (starting frame): ${JSON.stringify(constraintSet)}${GROUND_RULE}`
const draftJobs = []
for (const cand of candidates) for (const fam of FAMILIES) {
  const display = `${fam.key}:${slug(cand.name)}`
  const stem = `draft-${fam.key}-${slug(cand.name)}`
  if (fam.kind === 'claude') draftJobs.push(() => agent(draftPrompt(cand), { label: display, phase: 'DraftCouncil', ...creativeOpts, schema: PLAN_SCHEMA }).then((o) => ({ fam: fam.key, cand: cand.name, out: o })))
  else draftJobs.push(() => cliWorker(fam.key, tiers[fam.key], draftPrompt(cand), display, stem, 'DraftCouncil').then((o) => ({ fam: fam.key, cand: cand.name, out: o })))
}
const drafts = (await parallel(draftJobs)).filter(Boolean).filter((r) => r.out)
const draftByFamily = drafts.reduce((a, r) => (a[r.fam] = (a[r.fam] || 0) + 1, a), {})
const draftTimings = drafts.filter((f) => f.out && f.out.elapsed_s != null).map((f) => ({ fam: f.fam, cand: f.cand, elapsed_s: f.out.elapsed_s, tier: f.out.tier }))
log(`draft council → ${drafts.length}/${draftJobs.length} (${JSON.stringify(draftByFamily)})`)

// ---- Stage 3: Judge — synthesis council (D/S/T) OR adversarial Claude critics (P) ----
phase('JudgeCouncil')
const draftsForJudge = drafts.map((f) => ({ fam: f.fam, cand: f.cand, plan: f.out }))
let judgments = []       // synthesis mode: one synthesized plan per family
let critiques = []       // adversarial mode: coverage/correctness critiques over the draft pool
let judgeTimings = []

if (TOPOLOGY === 'adversarial') {
  const CRITIC_LENSES = [
    { key: 'coverage', ask: 'What does the UNION of these drafts still MISS — sections, files, edge cases, wiring, acceptance criteria the ask demands but no draft covers?' },
    { key: 'correctness', ask: 'Where are these drafts WRONG or unsafe — RLS/auth, service-role vs browser writes, contract/interface mistakes, constraint violations?' },
    { key: 'graft', ask: 'Which SPECIFIC ideas across the drafts are the strongest and MUST survive into the final plan, and which draft has the best overall spine?' },
  ]
  critiques = (await parallel(CRITIC_LENSES.map((c) => () =>
    agent(`You are an adversarial ${c.key} critic reviewing ${drafts.length} independent draft plans (from multiple model families) for the SAME slice. ${c.ask}
Ask: ${ask}
Constraint set: ${JSON.stringify(constraintSet)}
Drafts: ${JSON.stringify(draftsForJudge)}${GROUND_RULE}`, {
      label: `sonnet:critic-${c.key}`, phase: 'JudgeCouncil', ...creativeOpts,
      schema: { type: 'object', additionalProperties: false, properties: { findings: { type: 'array', items: { type: 'string' } }, bestSpine: { type: 'string' } }, required: ['findings', 'bestSpine'] },
    }).then((out) => ({ lens: c.key, out })),
  ))).filter(Boolean).filter((r) => r.out)
  log(`adversarial critics → ${critiques.length}/${CRITIC_LENSES.length} (${critiques.map((c) => c.lens).join(',')})`)
} else {
  const judgePrompt = `You have ${drafts.length} drafted candidate plans from multiple model families for the SAME slice. Synthesize ONE best plan: pick the strongest approach, graft compatible wins (verify each graft does NOT conflict with the chosen spine), and fill the schema (including instructionUpdates — the AGENTS.md / docs/decisions.md / .claude/rules edits this slice makes necessary).
Ask: ${ask}
Constraint set: ${JSON.stringify(constraintSet)}
Drafts: ${JSON.stringify(draftsForJudge)}${GROUND_RULE}`
  const judgeJobs = FAMILIES.map((fam) => {
    const display = `${fam.key}:synth`
    const stem = `judge-${fam.key}`
    if (fam.kind === 'claude') return () => agent(judgePrompt, { label: display, phase: 'JudgeCouncil', ...creativeOpts, schema: PLAN_SCHEMA }).then((o) => ({ fam: fam.key, out: o }))
    return () => cliWorker(fam.key, tiers[fam.key], judgePrompt, display, stem, 'JudgeCouncil').then((o) => ({ fam: fam.key, out: o }))
  })
  judgments = (await parallel(judgeJobs)).filter(Boolean).filter((r) => r.out)
  judgeTimings = judgments.filter((j) => j.out && j.out.elapsed_s != null).map((j) => ({ fam: j.fam, elapsed_s: j.out.elapsed_s, tier: j.out.tier }))
  log(`judge council → ${judgments.length}/${judgeJobs.length} (${judgments.map((j) => j.fam).join(',')})`)
}

// ---- Stage 4: Unify (creative tier) ----
phase('Unify')
const unifyBasis = TOPOLOGY === 'adversarial'
  ? `Draft plans (from ${drafts.length} model-family drafts):
${JSON.stringify(draftsForJudge)}

Adversarial critiques (coverage gaps / correctness / must-keep grafts):
${JSON.stringify(critiques)}`
  : `Family judgments (each family's synthesized plan):
${JSON.stringify(judgments.map((j) => ({ fam: j.fam, plan: j.out })))}`
const finalPlan = await agent(
  `Unify into the SINGLE final plan for the slice. Take the best-reasoned spine, graft superior compatible ideas (verify no conflict with the spine), and record any load-bearing disagreement. Emit ONLY the final plan as markdown with these sections:
- Definition of done
- Approach
- In scope / Deferred
- Build steps (file map first, then bite-sized tasks with exact file ownership + interfaces)
- Stack & design acceptance criteria
- Conflicts resolved
- Instruction-file updates (the concrete AGENTS.md / docs/decisions.md / .claude/rules edits this slice makes necessary — bullet each as "FILE: change". Exclude the feature-flow skills. If none, write "none".)
Ask: ${ask}
Constraint set: ${JSON.stringify(constraintSet)}
${unifyBasis}`,
  { label: 'sonnet:unify', phase: 'Unify', ...creativeOpts },
)

log(`plan-council ${CONFIG_KEY} done — depth=${DEPTH}, draft ${drafts.length}/${draftJobs.length}, judge(${TOPOLOGY}) ${TOPOLOGY === 'adversarial' ? critiques.length : judgments.length}`)
return {
  config: CONFIG_KEY,
  finalPlan,
  execution: {
    depth: DEPTH, topology: TOPOLOGY, tiers, candidates: candidates.map((c) => c.name), claudeCreative: creativeModel || 'inherit(opus)',
    repoGrounding: REPO, groundDigestChars: groundDigest.length, skills, families: FAMILIES.map((f) => f.key),
    draftReturned: drafts.length, draftTotal: draftJobs.length, draftByFamily,
    judgeMode: TOPOLOGY, judgmentsReturned: judgments.length, critiquesReturned: critiques.length,
    draftTimings, judgeTimings,
  },
  // raw material for the bake-off's per-phase + per-family analysis
  detail: { constraintSet, drafts: draftsForJudge, judgments: judgments.map((j) => ({ fam: j.fam, plan: j.out })), critiques },
}
