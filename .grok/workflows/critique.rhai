// oparax cross-model council — Grok critique lane (deterministic lens panel).
// Launched by the .grok/agents/oparax-critic ORCHESTRATOR via the workflow tool.
// args: #{ mode ("plan"|"diff"|"bug"), brief (string), verify_k (int) }
// Returns #{ findings: [ rich-finding ] }; the orchestrator projects to the stage schema.
let meta = #{
    name: "critique",
    description: "oparax council Grok critique lane: a parallel lens panel over a plan or diff, optional adversarial verify, returns schema-shaped findings."
};
let mode = args.mode;
let brief = args.brief;
let vk = args.verify_k;

// Rich superset finding: covers BOTH the plan schema (critique/suggestion/target)
// and the QC schema (file/line/scenario/summary). The orchestrator selects per stage.
let FSCHEMA = #{
  "type": "object",
  "properties": #{
    "severity":   #{ "type": "string" },
    "file":       #{ "type": "string" },
    "line":       #{ "type": "integer" },
    "summary":    #{ "type": "string" },
    "scenario":   #{ "type": "string" },
    "critique":   #{ "type": "string" },
    "suggestion": #{ "type": "string" },
    "target":     #{ "type": "string" }
  },
  "required": ["severity","file","line","summary","scenario","critique","suggestion","target"]
};

// 13 themed lenses. Each focus is a checklist distilled from ~116 real failure
// modes mined from past oparax Claude Code + Codex sessions (quota-efficient:
// one themed agent per theme, not one agent per scar).
let lenses = [
  #{ key: "concurrency-claims",       focus: "claim/lease races: a claim RPC whose WHERE re-reads a row a concurrent winner already committed; PostgREST .or() claim filters naming the wrong column; setInterval/polling loops with no in-flight guard so a slow tick overlaps; non-atomic check-then-write caps (a pre-read cap where two concurrent adds both pass and both bill); a missing second-concurrent-run guard for the same desk; concurrent multi-desk claim under a shared deadline; tool-call handlers mutating shared state without a promise-chain mutex (the AI SDK runs a step's tool calls concurrently); per-entity-per-period gates that read-then-write instead of an atomic UNIQUE claim" },
  #{ key: "ledger-billing",           focus: "billing and accounting integrity: a metered model call billed on a branch (early-return, catch, abort) that never writes the model_calls/usage_events row; a retry that re-bills a stage already ledgered; model_calls and usage_events written as two non-atomic statements; ledger-first discipline (write the ledger before the paid step); unbounded retry loops firing a paid resolve per source with no give-up; a hardcoded lang=null forcing every delivery through the billable translator" },
  #{ key: "idempotency-dedup",        focus: "replay and duplicate safety: dedup/identity keys built from a mutable field (publishedAt, lastmod) or a raw query string so an edit or typo redelivers; a delivery path that is a plain insert instead of the idempotent upsert on (owner_id, ref_id); a webhook handler that does not thread the Svix message id as an idempotencyKey; a new stage bypassing the existing duplicate-delivery / paused-desk / already-completed-claim routing; state marked seen/done/committed before the operation that can fail actually succeeds" },
  #{ key: "migration-schema",         focus: "schema change vs live data: a NOT NULL column with no DEFAULT breaking live ingest inserts; a new column or gating behavior with no backfill so existing rows keep the old behavior forever; a field added to database.types.ts with no SQL migration actually adding it; source_posts FK violations when a config is deleted or not yet committed; a NOT NULL owner/foreign column that silently hides unmatched rows; worker-vs-migration deploy ordering left unstated" },
  #{ key: "rls-untrusted-ssrf",       focus: "auth boundary and untrusted input: a deny-all RLS table (source_posts, voice_extraction_runs, source_configs) read directly from the browser instead of through an ownership-proving server action; a hostname/SSRF check applied to one untrusted channel (sitemap) but not a sibling (RSS), or a tautological check deriving the expected host from the candidate URL itself; untrusted article/robots/nav text interpolated into a model prompt without escapeXmlAttribute framing; a client-side cap or validation not mirrored in the server action" },
  #{ key: "async-resource-lifecycle", focus: "timeouts, sockets, budgets: an AbortSignal/timeout built but never threaded into the nested fetch or redirect chain it must bound; remaining-time computed from a sub-phase start instead of the request start; a response body never read or cancelled on a non-2xx / non-HTML / redirect-refused branch, pinning the socket until the deadline; an output token ceiling raised without a proportional timeout (a 64k-token call that cannot finish in 300s); a shared token ceiling truncating a different stage that needs more; a header-only Content-Length check an oversized streamed body slips past" },
  #{ key: "cross-file-caller-drift",  focus: "change ripples across files: duplicated validation/matching logic (onboarding vs the poller, discovery vs listing) left out of sync on hostname source, redirect-following, or headers; a new required schema field with no default breaking other callers; a function that validates/normalizes an input but stores the raw pre-normalized value; an incomplete rename leaving the old term on a fallback branch; a status poll omitting a field the UI re-renders from; two surfaces computing the same bounded quantity by different methods (UTF-16 length vs a weighted counter); dead code or unused imports left after callers were replaced; a comment claiming a stronger guarantee than the code enforces" },
  #{ key: "pipeline-ai-grounding",    focus: "content correctness and grounding: a synthesized claim asserted as fact with no attribution/certainty (the Rodri nationality hallucination); a judge/QC carryover stage that is dead code and never runs; a fail-open catch returning pass:true on truncation so a gate bills but never rejects; a resolver scoping the whole site instead of the beat section, or accepting a guessed/unvalidated URL; an extraction fallback (blunt tag-strip) whose degraded text synthesis then treats as truth; boilerplate/thresholds measured on one extraction path but applied to another; a Qwen structured-output prompt missing the literal word json; a fused draft stage dropping original-language nuance; a cheap on-beat filter blind to the voice guide" },
  #{ key: "silent-vanishing",         focus: "things that disappear with no trace: an oversized source vanishing from the feed instead of landing in Skipped with a reason; sitemap subdomain entries dropped by a bounded scan; a robots.txt sitemap fallback that discovers but never retrieves, so a source looks resolved yet never delivers; a Skipped/excluded_posts surface masking distinct failure reasons (off-beat vs oversized vs extraction-failure) behind one card; a malformed/empty points payload rendering a blank story instead of fallback copy; a winning draft losing its per-point citation provenance; a reasoningWithheld flag that can never fire because the field is always populated" },
  #{ key: "ui-state-reconciliation",  focus: "screen vs truth: an optimistic update clobbered by the next poll, or an error path resolving to optimistic true and masking the failure; revalidatePath firing before the row it displays exists; feed refresh and load-more without a shared epoch guard (stale-append race, scroll jump); a prop-sync useEffect overwriting an in-progress local edit on refresh; a source-chip showing a stale add-time identity instead of what is actually watched; post-hydration layout jump or a loading skeleton whose shape does not match the settled content; a stale still-running attempt clobbering a newer attempt's row; feed hydration that validates full objects but projects only a narrow subset, dropping paired reasons" },
  #{ key: "ux-affordance-a11y",       focus: "usability and design contract: a disabled control with no discoverable alternative path (View Source living only in the 3-dot menu); an empty/paused state blanking unrelated content (pause hiding the setup card); a sheet/error state that dead-ends with no recovery; a form input that is placeholder-only with no associated label or aria-label; a mobile touch target under 44px (sub-700px); missing focus-visible or prefers-reduced-motion on new interactive/animated elements; drift from locked DESIGN.md tokens (the 1040px shell, the warm feed-card palette) or the desk: breakpoint replaced by md:; page-level horizontal overflow; mobile truncation losing both name and path; toast-only feedback for an irreversible action; an at-limit add affordance left interactive; spec-required copy thinned below the stated example count" },
  #{ key: "scope-convention-doc",     focus: "completeness and hygiene: a governing doc (AGENTS.md code map / RLS contract table, DESIGN.md, a rule file) the diff has now made wrong; an acceptance criterion the close-out claims but the code does not meet; a frozen-unchanged property touched incidentally; unrelated files/hunks bundled into the branch; changed files not Biome-clean (unused imports, import-order, formatting); hard-wrapped markdown prose in .md files; a sibling config/script (self-test, dispatcher roster, critique contract) not synced to a newly added participant; a skill/verify/README doc still describing a removed or changed pipeline; a stale comment describing deleted behavior; an env-var checklist not updated after provisioning; a diff computed off a stale local ref instead of origin/beta" },
  #{ key: "frame-attack",             focus: "ATTACK THE FRAME: name concrete real inputs, user behaviors, or environmental conditions this change never mentions but a real user or source will produce (image-only or emoji-only X deliveries, oversized or media-heavy sources, malformed HTML, missing sitemap/RSS, a paused or deleted desk mid-run, multilingual sources, duplicate re-delivery, deploy-window concurrency). For each, name the input and the wrong outcome; a missing input class outranks any in-frame bug" }
];

let base = "";
base += "You are ONE lens of oparax's cross-model review council. MODE=" + mode + ". ";
base += "You have execute capability: run `git diff origin/beta...HEAD` (fallback `git diff`) to see the real change, and read files. Cite file:line from ranges you actually opened; the brief is a hypothesis, the code is the evidence. ";
base += "Attack ONLY your assigned dimension. Weigh cost: say what a user would actually see. An empty findings array is valid ONLY after you have worked the requirements. Do not fabricate; a finding must point at code or a plan claim you actually checked.\n\nBRIEF:\n" + brief + "\n\n";
base += "For EVERY finding fill all eight fields: severity (blocking|important|minor); file (the actual path from the diff); line (the EXACT changed line number you opened in git diff -- for a diff or bug review you MUST cite a real line and NEVER 0; only plan mode may use 0 for an abstract requirement); summary (one line); scenario (a concrete input/state -> the wrong output or user-visible impact); critique (the detailed explanation, quoting the file:line you actually opened); suggestion (a concrete fix); target (the requirement id or file:line).\n";

let jobs = [];
for L in lenses {
  let p = base;
  p += "YOUR DIMENSION (" + L.key + "): " + L.focus;
  jobs.push(#{ prompt: p, label: L.key, capability_mode: "execute", output_schema: FSCHEMA });
}

phase("review");
log("panel " + jobs.len().to_string() + " lenses, mode " + mode);
let reviews = parallel(jobs);

let all = [];
for r in reviews {
  if r != () && r.success && r.output != () && r.output.findings != () {
    for f in r.output.findings { all.push(f); }
  }
}
log("raw findings " + all.len().to_string());

let survivors = [];
if vk <= 0 {
  survivors = all;
} else {
  let VSCHEMA = #{ "type":"object","properties":#{ "refuted":#{"type":"boolean"}, "reason":#{"type":"string"} }, "required":["refuted","reason"] };
  let toverify = [];
  for f in all {
    if f.severity == "important" || f.severity == "blocking" { toverify.push(f); } else { survivors.push(f); }
  }
  let vjobs = [];
  for f in toverify {
    for i in 0..vk {
      let vp = "Adversarially REFUTE this council finding; default refuted=true if the evidence is weak or the cited path does not exist. Check with git diff and file reads (read-only).\nTARGET: " + f.target + "\nSUMMARY: " + f.summary + "\nCRITIQUE: " + f.critique + "\nReturn {refuted: bool, reason: string}.";
      vjobs.push(#{ prompt: vp, label: "verify", capability_mode: "read-only", output_schema: VSCHEMA });
    }
  }
  phase("verify");
  log("verify " + toverify.len().to_string() + " x " + vk.to_string());
  let verdicts = parallel(vjobs);
  let fi = 0;
  for f in toverify {
    let refutes = 0;
    for j in 0..vk {
      let v = verdicts[fi*vk + j];
      if v != () && v.success && v.output != () && v.output.refuted == true { refutes += 1; }
    }
    if refutes * 2 <= vk { survivors.push(f); }
    fi += 1;
  }
}
log("survivors " + survivors.len().to_string());

// Deterministic projection to the EXACT stage schema, so the orchestrator is a
// pure pass-through (no model reasoning = less wall time). Severity vocab differs
// per stage: plan uses blocking|important|minor, QC uses high|medium|low.
let out = [];
if mode == "plan" {
  for f in survivors {
    out.push(#{ critique: f.critique, severity: f.severity, suggestion: f.suggestion, target: f.target });
  }
  complete(#{ critiques: out });
} else {
  for f in survivors {
    let sv = "medium";
    if f.severity == "blocking" { sv = "high"; }
    else if f.severity == "minor" { sv = "low"; }
    out.push(#{ file: f.file, line: f.line, scenario: f.scenario, severity: sv, summary: f.summary });
  }
  complete(#{ findings: out });
}
