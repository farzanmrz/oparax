# Oparax — The Decision Record

One document, three lists. **LOCKED** — settled; plan and build from these; every entry
carries its why so no future session re-litigates it. **DEFERRED** — real, wanted, and
deliberately not now; each has a trigger for when it wakes. **REJECTED** — examined and
killed; each has the fact that killed it, so analysis-paralysis has nothing to reopen
without a *new* fact.

Supersedes `docs/push-architecture.md` (deleted 2026-07-21; full narrative and experiment
detail live in git history at that path). Update discipline: decisions move between lists
only with a named fact or an explicit owner override, recorded as such.

---

## BUILD ORDER — read this first

The LOCKED sections below are the spec (the *how*); this is the sequence they ship in.

**Slices 1–4 are BUILT** — schema + voice extraction (#66), drafting council + notification +
metering (#67), the ingestion-worker code, and the full L8 UI surface (#68). What remains is
**Slice 5 — the full-live product**, and the owner mandate (2026-07-22) is unambiguous:

> **Build EVERYTHING remaining, live, in one feature run. No slices held back, no gated features,
> no grey-scaffolds, no "coming soon." Every control the UI currently greys out becomes real; every
> deferred capability that is code-buildable ships. The DEFERRED list is PROMOTED into this slice —
> do not treat any of it as "later" unless its precondition is genuinely external: billing needs
> paying users, X Enterprise needs a contract, and embedding/draft-policy *tuning* needs live stream
> volume. For those, build the plumbing and defer only the part that literally cannot exist yet.**

| # | Slice | Status |
| --- | --- | --- |
| 1 | Schema + voice extraction | **DONE** (#66) |
| 2 | Drafting council + notification + metering | **DONE** (#67) |
| 3 | Ingestion worker (code) | **BUILT** (#68) — the Railway deploy is folded into Slice 5 |
| 4 | Full L8 UI surface | **BUILT** (#68) |
| 5 | **The full-live product — NEXT: plan and build ALL of it** | scope below |

**Slice 5 scope — the next feature run plans and builds ALL of this (the LOCKED L-specs say *how*;
the promoted D-items say *why*). Nothing here is optional or sequenced-away:**

1. **Live voice extraction** (promotes D1 + D14) — `attemptVoiceExtraction` fetches the reporter's
   real X timeline via the X API as the corpus (NOT a local `.voice-lab` file), extracts, saves. Any
   handle typed into create-desk → a real guide. Extraction is now user-triggered and can spend in
   production, so this slice owns L11's guard for real (a per-reporter/day cap and/or D14's
   verified-handle gate) — the local-corpus accident that made it safe before is gone.
2. **Multi-source ingestion** (D1) — the greyed **Websites** field goes live: track news sites via
   web search / scraping; headroom for more socials.
3. **Clustering** (D2) — posts → stories; a feed unit becomes a story (many source posts → one draft).
4. **Multi-platform drafting** (D3) — per-platform draft variants (X + LinkedIn …); the draft card's
   platform pills.
5. **Per-desk delivery + Channels** (D5) — per-desk Slack/email config (the greyed Connections edit +
   Send-test become real), the Notifications matrix persists, Slack interactive buttons via a real
   Slack app; per-desk credentials (a deny-all `slack_accounts`-style table + `getSlackLinkState()`).
6. **Auto-post** (L6) — the greyed per-source auto-post toggles + the master become real: post
   autonomously when trusted.
7. **Voice rules editing** — the greyed "+ Add a rule", per-rule Edit/Delete, and Suggestions
   accept/dismiss become real; needs a per-rule `voice_rules` table (the guide stops being one opaque
   markdown blob).
8. **Create-form AI assistant** (D10) — re-plumb the existing `/api/chat` agent into the create form
   to clarify fuzzy/garbled beats (e.g. a TTS-mangled beat) before the desk runs.
9. **In-app draft editing** — the greyed edit pencil becomes real: edit-in-place → a new version on
   the `parent_draft_id` chain.
10. **Worker deploy** — deploy `ingest/` to Railway and go live on the X filtered stream (real
    secrets, cap re-probe).
11. **Handle verification** (D14) — earn the `voice_guides` join: a `reporter_handle` grants guide
    access only once verified.

Genuinely external (build the plumbing; the *precondition* is not code): billing/payments (D6 — needs
paying users), X Enterprise (D13 — needs a contract), the embedding gate (D11) and draft-everything
policy (D9) — both need live stream volume to tune against.

Rules for whoever picks this up: the L-specs are settled — **plan from them, do not re-derive or
re-price.** The REJECTED list exists so alternatives are not reconsidered without a new fact.
**Cross-cutting invariants still bind every model call: L7** (stamp `usage_events`), **L9** (the
instrumentation house rules), **L12** (one `model_calls` row per call, output + reasoning trace) — a
plan that makes a model call and doesn't say where the trace is stored is wrong (it shipped once in
slice 1).

---

## LOCKED

### L1. Ingestion — a persistent stream connection, one forwarder, shared rules

- **Persistent connection (`GET /2/tweets/search/stream`), not webhooks.** Webhook
  *delivery* is Enterprise-only. Probing trap recorded: `POST /2/webhooks` itself is
  ungated and would have returned a false-positive success. Stream access was proven on our
  own app by a `409 RuleConfigurationIssue` ("define rules first") — a 403 would have meant
  tier refusal.
- **One always-on forwarder process for the whole platform.** X allows exactly 1 concurrent
  connection per account, so per-user/per-desk hosts are structurally pointless. The
  forwarder holds the stream and POSTs deliveries into the app; if the webhook tier ever
  opens, the forwarder is deleted and nothing else moves.
- **Host: Railway** — project `oparax-ingest` (workspace "Oparax", farzan@oparax.ai).
  Verified billing: per-second on actual resources (≈$10.15/GB-RAM/mo, ≈$20.30/vCPU/mo); a
  256MB worker is ~$3/mo of usage inside the Hobby plan's included allowance → **~$5/mo
  flat, scales with resources, never per user or stream**. Worker deploys with the
  ingestion build task.
- **Shared rules, routed by author in Supabase.** Live caps on our app: **5 rules/app, 15/
  project** — the docs said 1,000. One rule holds ~40 `from:` handles (~24 chars each), so
  ~200 tracked handles of headroom. Author-based routing dedups naturally across users.
- **Rule shape:** `(from:h1 OR from:h2 OR …) -is:retweet -is:quote -is:reply` — negate each
  exclusion separately, always parenthesise the author group.
- **No `lang:` filter.** Sources post in multiple languages and we want those posts
  (Reshad monitors English and Spanish). Language is handled at drafting:
  **translate the source, then draft in the reporter's voice.**
- **X tier: Free, deliberately, on the existing app.** The console shows Free because
  pay-per-use is opt-in — nothing is broken. At one user the caps don't bind. The real risk
  is delivery volume, so the failsafe is a **meter, not a pre-emptive upgrade**: count every
  delivery into `usage_events`, alarm at 80% of the observed cap; upgrading is a billing
  flip with zero architecture change.
- **Credentials:** the stream uses the app-only `X_BEARER_TOKEN` (rotated 2026-07-21 after
  chat exposure; in `.env.local` + Vercel as *sensitive*, Production+Preview) — used **raw**;
  URL-decoding the portal's escapes produces a 401. Distinct from the `X_CLIENT_ID/SECRET`
  OAuth2 pair used for user-context posting.
- **Standing caveat:** documented X caps are unreliable — after ANY app/account/billing
  change, re-probe `GET /2/tweets/search/stream/rules/counts` + a bare stream connect
  before trusting anything. (Canonical copy: `.claude/rules/x.md`.)

### L2. Voice extraction — Fable 5 + measured facts + the $2 council

- **Model: `anthropic/claude-fable-5`, adaptive thinking @ high effort, NO web search.**
  Won the 8-model on-task panel on verbatim-quote fidelity and unique catches. Search
  enabled made Sonnet spiral to 19 searches / $2.24 for an *empty* guide — the handle is
  supplied in-prompt instead. Measured: **$0.855/reporter** (10/10 reporters).
- **Corpus: 100 posts, split 80 train / 20 held-out** (most recent). The holdout exists so
  drafting evaluation can never score against a post the extractor read — contamination
  control, not sample size.
- **Measured facts, injected.** The guide's measurable half — length distribution,
  line-break shares, exhaustive emoji/hashtag inventories with counts, punctuation rates —
  is computed by code and prepended as a binding `MEASURED STYLE FACTS` block. Why: reading
  under-counts sparse habits — the extractor called Sami Mokbel hashtag-free when the true
  count is 6/80 (`#AFC×5 #MCFC×4 …`). A count cannot miss that and costs $0. Ported:
  `lib/voice/measured-facts.ts` (needs tsconfig `target: ES2024` — the `v`-flag emoji regex).
- **Deploy strip.** `## Dimension Coverage` exists to verify the extractor; the drafting
  model pays for it on every draft. Stripping = **16.1% off every draft forever, zero
  risk** (235,091 → 197,144 chars / 10 guides). Ported: `lib/voice/deploy-guide.ts`
  (byte-identical to the Python original on all 10 guides). Rule: store the raw guide
  (audit trail), draft from the stripped one.
- **The council (build after the slice ships): $2.00/reporter, hard cap $2.**
  Fable primary (cache-writes the 34K prefix, $0.98) → **three blind analysts in
  parallel** — `kimi-k3` capped at 6K completion tokens ($0.18), `qwen3.7-max` ($0.05),
  `deepseek-v4-pro` ($0.02) — → Fable revision + falsify (cache-READS the corpus at 0.1×,
  $0.77). Why blind: critics who read Fable's draft anchor to it; blind noticing preserves
  the diversity being paid for, and compact observation lists are cheaper than full guides.
  Why these three: K3 is the one at-tier bet (#1 EQ-Bench Creative Writing v3, Elo 2377,
  above Fable — caveat: gpt-5.6-sol proves writing boards transfer weakly to extraction, so
  this is an evidenced bet, not proof); qwen3.7-max's family posted the best hygiene of the
  1,000-draft run (0 residuals); v4-pro is the near-free cross-family noticing slot.
  Governance: **the retirement rule** — the falsify log counts each analyst's unique
  catches; ~0 contribution across the first reporters retires the seat (bench: glm-5.2,
  grok-4.3, mistral-large-3).
- **K3 probe result (2026-07-21): its reasoning is NOT cappable.** `effort: "none"` still
  emitted 119 reasoning tokens; every variant returned HTTP 200 — accepted, silently
  ignored. `max_completion_tokens` is the enforcement knob (hard ceiling over reasoning +
  content). General rule: verify a cap by reading `reasoning_tokens` back, never by
  trusting a 200.

### L3. Drafting — the two-family council + judge, $3/mo cap

- **Ships day one:** `deepseek-v4-flash` (native adaptive — the tested config; do not add a
  reasoning param) + `gpt-5-nano` @ `low`, drafts in parallel; **judge** = `v4-flash` @
  `none`, temp 0, structured JSON verdict, picks the winner, never writes. Self-check
  always on (deterministic regex → repair call only on violation; fires 6–16%, drove
  residual violations to zero for every kept model).
- **Cost:** $1.82/1k drafts worst case = **$2.73/mo at 50 posts/day** (cap $3); expected
  ~$1.71/mo warm-cache (DeepSeek cache: free to write, $0.0028/M to read; the ~5K guide is
  a constant per-reporter prefix, so warm cache is the expected state). Third family
  `glm-4.7-flashx` @ `low` (+$0.41/1k) turns on when cache telemetry confirms room.
  Latency ~10s vs a 1–2min allowance — never binding.
- **Why a cheap model at all: drafting cost is ~95% input tokens** (6K guide+brief in, ~120
  out, 1,500×/mo forever) — and the 1,000-draft run showed all five tested models ($1.23 to
  $23 per 1k) land within 0.33–0.37 style distance while reporter-to-reporter spread is
  0.22–0.64. **The reporter matters ~8× more than the model; the guide does the work.**
  Pro-tier models pay where judgment lives (extraction), not where instructions are
  followed (drafting).
- **The drafting contract** (appended below every guide): output hygiene (no preamble, no
  markdown, never emit `<post>` tags) + the observed-failure rules — never invent structure
  the brief can't fill; never point at nonexistent media; **the carry-over trap**: every
  name, handle, number, quote and time must appear in the BRIEF — the guide supplies voice
  and structure, never facts.
- **Volume flag:** the $3 cap binds per volume — safe ≤ ~50 tracked posts/day. At the
  measured 134/day watch-set floor the council fails at any cache state. Crossing that
  forces draft-on-selection or a raised cap (see D9).
- **Governance:** retirement rule — a family whose drafts never win the judge is dropped;
  `gpt-5-nano`'s estimate is confirmed or killed by first-weeks telemetry.

> **Owner override, 2026-07-22 — D8's third seat activated, cap note revised.** `glm-4.7-flashx`
> ships as the council's third drafting family (`lib/agent/draft-council-run.ts`) ahead of D8's
> "cache telemetry confirms room" trigger, on explicit owner instruction — see D8's annotation
> below for the gateway-id probe and reasoning-visibility verification. **Worst case moves from
> $2.73/mo (two families) to ~$3.3/mo** (three: $1.82 + $0.41 = $2.23/1k drafts × 1,500
> drafts/mo) — over this section's original $3 cap, accepted alongside the third-seat
> activation. The judge, self-check, and carry-over-trap contract are unchanged by the third
> seat; it only adds one more candidate for the judge to score.

### L4. Schema — five tables for the slice

Applied at build time (Supabase MCP needs re-auth). Why each shape:

| Table | Shape | Why |
| --- | --- | --- |
| `experiments` | NEW table: `owner_id`, `beat`, `tracked_handles text[]`, `reporter_handle`, `status` | Not overloaded onto `agents` — agents carry `scan_frequency`/`search_template`, which experiments have no concept of; nullable not-applicable columns are the smell |
| `voice_guides` | **unique per `reporter_handle`**: `guide_raw`, `guide_deploy`, `measured_facts`, `cost_usd`, and `provenance` jsonb = **a pointer `{ modelCallId }`, never a copy** (every call's output/reasoning/usage lives in `model_calls` — L12) | Extraction is paid once per reporter — the unique key *encodes the economics*; keying by experiment would re-pay $2 per experiment |
| `source_posts` | **global, deduped by `x_post_id`**: `author_handle`, `text`, `posted_at`, `raw jsonb` | Shared stream rules mean overlapping tracking; store once, join through drafts |
| `model_calls` | **one row per model call, every stage**: `owner_id`, `stage`, `role`, `model`, `output`, `reasoning`, `usage jsonb`, `cost_usd`, `generation_id`, `ref_kind`+`ref_id` | The universal record — see **L12**. What a model returned and what it reasoned have exactly ONE home, so a new stage inherits the guarantee instead of re-deriving it |
| `post_drafts` | **one row per council member per post** (+ a judge row): `source_post_id`, `experiment_id`, `model_call_id` → `model_calls`, `is_winner`, `judge_verdict jsonb` | The retirement rule, per-model cost, and "why did this win" each become ONE query because members are rows, not a json blob. The model's own output/reasoning/cost sit on the joined `model_calls` row, not duplicated here |
| `usage_events` | `owner_id`, `kind`, `units`, `cost_usd`, `ref_id` | The metering ledger — stamped from birth (see L7) |

**Named extension point — clustering:** the feed's unit later changes from *post* to
*story*. The migration is purely additive (`CREATE TABLE stories` + nullable `story_id` on
`source_posts` / `post_drafts`) — instant in Postgres. **Do not add the column early**: a
nullable FK to a nonexistent table is worse than the later additive migration. The UI
carries the same commitment as "feed items may be groups."

### L5. Notification — Slack primary, email second, replies are a feature

- **Slack primary** (interactive buttons + push). The newsroom-IT-approval objection was
  retracted on fact: Reshad is an independent reporter who installs apps himself
  (confirmed directly with him).
- **Email second, via Resend — and inbound reply handling is IN scope**, not a nicety:
  Reshad explicitly wants to reply to the email to correct a draft.

### L6. Auto-posting — scaffolded, greyed, one flag

The slice reaches auto-*drafting*; posting stays behind the existing confirm flow. The
scaffold exists so trust, once earned, is a flag flip — not a build project.

### L7. Metering — from the first commit

Every touch point stamps `usage_events`: stream deliveries, backfill reads, voice scrapes,
every model call, notifications. **Per-request model cost via `getGenerationInfo()` on
`providerMetadata.gateway.generationId`** — returns `totalCost` server-side for every
provider (the proper fix for DeepSeek/GLM's missing `inferenceCost`).

### L8. UI — the container and the wireframe brief

Derived by first-principles pass 2026-07-21 (the old sidebar served exactly one nav
destination — measured, not felt). **The future is held by the container, not painted on
the walls**: no reserved blank chrome; future stages arrive as sections or richer items.

- **Site level is thin**: desk switcher (dropdown: desks + "New desk") + account menu
  (Settings, Sign out). No global sidebar.
- **Landing: feed-first** — open into the last-active desk's Feed. Reshad arrives from a
  notification about a draft; a listing page is a detour. Listing survives as the switcher
  (and a simple index page, mostly as-is).
- **The desk owns the chrome** — sections: **Feed** (default) · **Voice** (guide +
  measured facts + council provenance — the trust artifact) · **Sources** (handles;
  websites greyed) · **Channels** (Slack/email config; message history later) ·
  **Activity** (spend vs cap, stream liveness, alarms, past runs with per-run cost and
  model streams).
- **Desk controls:** pause (scanning/auto-posting), delete, status.
- **Feed item anatomy:** source post → winning draft (char count, Post-to-X behind
  confirm, auto-post toggle greyed) → **council one click deep, never default** — a quiet
  chip ("2 models · $0.001") expands to both drafts, judge verdict, per-model reasoning
  (collapsible), per-model cost. Vendored ai-elements already cover this (`reasoning`,
  `chain-of-thought`, `context`, `inline-citation`).
- **Creation:** form is the spine (5 fields, websites + draft-instructions greyed). The
  creation flow's scan + draft preview results **persist into the desk** after save (the
  existing onboarding-extract path is the precedent). The existing AI chat becomes a form
  *assistant* later (D10) — one front door, not two paradigms.
- **Grey rule:** grey what is promised and specified; omit what is unspecified.
- **Structural commitment:** feed item cards must not be structurally single-post
  (clustering will group them).
- Mobile: desk chrome collapses to a sheet.
- Pipeline for locking: this brief → Claude-design wireframe → iterate → v0 lock → local
  CC plumbing (feature-plan / feature-build).

### L9. Instrumentation house rules (each one burned a real conclusion)

1. Gateway `inferenceCost` is a **string** — `Number()` it.
2. Anthropic thinking tokens live at
   `providerMetadata.anthropic.usage.output_tokens_details.thinking_tokens`, not the
   SDK-normalized field.
3. Normalise text before comparing (HTML entities / literal `\n` made a 91% model score 53%).
4. Long jobs checkpoint and resume (OOM at concurrency 32; 12 is proven safe).
5. Per-request cost via `getGenerationInfo` — provider-independent.
6. A parameter accepted with HTTP 200 is not a parameter honored — read the effect back
   (the K3 probe). Generalisation: **a failure/success report is a claim about our
   instrumentation as much as about the model.**
7. **A thinking-token count is not a thinking trace.** Fable bills thinking tokens (2,317 on
   the real extraction) while returning the block with `text: ""` — so `reasoningText` is
   empty with **zero warnings**, and code that logs only the count looks perfectly healthy
   while capturing nothing. Read the trace's *length* back, never the token count.
8. **An absent value under default configuration is not proof that no configuration produces
   it.** The empty trace above was a default (`thinking.display: "omitted"`), not a limit;
   `display: "summarized"` returns the summary. The wrong conclusion — "Fable cannot expose
   reasoning" — was reached by testing an unrelated parameter (`thinking.type.enabled`,
   correctly rejected) and generalising from one default-config observation, then recorded
   here as a measured fact. **Before writing an impossibility into this file, find the
   parameter that governs the field and test that parameter.** Rule 6's mirror image: a `200`
   isn't compliance, and an empty field isn't incapability.

### L12. Model-call recording — every call, every stage, output AND reasoning

**Every model call anywhere in the system writes exactly one `model_calls` row carrying its
`output` and its `reasoning` trace**, plus `usage` (incl. thinking tokens), `cost_usd`,
`generation_id`, and a `stage`/`role` pair. This holds regardless of stage (extraction,
drafting, judge, scan) and regardless of whether one model runs or five. **Storing a token
count without the trace is not compliance** — a count proves that thinking happened, never
what it concluded, and the trace is the audit trail of the judgment we paid for.

- **Two different claims, never to be merged again.** The **raw chain of thought is never
  returned by any Claude model** — permanent, not a setting. A **readable summary** is one
  opt-in parameter away. Conflating the two produced a false "cannot expose reasoning" entry
  in this file; see the lesson below.
- **`thinking.display` is the parameter that governs it.** It defaults to `"omitted"` on
  Fable 5, Opus 4.8/4.7 and Sonnet 5, and `"omitted"` **still returns a thinking block, with
  `text: ""`** — indistinguishable by inspection from a model that cannot expose anything, and
  emitted with zero warnings. `display: "summarized"` returns the summary. Probed on the
  gateway 2026-07-22, same prompt: `omitted` → 0 chars; `summarized` → 136 and 170 chars.
  **The extraction call sets `display: "summarized"`, and the summary is what we store.**
- **SDK shape:** effort sits *inside* the thinking object —
  `providerOptions.anthropic.thinking = { type: "adaptive", effort: "high", display: "summarized" }`.
  `output_config` is the REST shape, not the SDK's. And the top-level `reasoning` param and
  `providerOptions` are **never merged**: any reasoning key in `providerOptions` makes a
  top-level `reasoning` silently ignored in full, so effort must live in the same object.
  *Unverified:* whether `effort` measurably changes depth in either placement — a single
  sample per cell moved thinking tokens 2–7%, inside variance. Do not claim it either way.
- **Per-model exposure — status, not verdict:**

  | Model | Readable reasoning | Status |
  | --- | --- | --- |
  | `anthropic/claude-fable-5` | **yes, as a summary**, via `display: "summarized"` | verified |
  | `deepseek/deepseek-v4-flash` | yes — 459 chars, no flag needed | verified |
  | `deepseek/deepseek-v4-pro` | yes — 1,117 chars, no flag needed | verified |
  | `openai/gpt-5-nano` | **yes — 641 chars** with a top-level `reasoning: "low"`; no provider-specific visibility knob needed | **verified** (probed 2026-07-22, ft/67) |

  The gpt-5-nano probe closed the row above and is worth keeping as evidence for the rule that
  follows it: the earlier "0 chars" observation came from a call passing **no reasoning param at
  all**, and said nothing about the model. Measured across three cells, same prompt:
  top-level `reasoning: "low"` → 641 chars; `providerOptions.openai.reasoningSummary: "auto"`
  (+ `reasoningEffort: "low"`) → 1,081; `"detailed"` → 503. The portable top-level param is
  what ships — it is sufficient, and mixing it with any `providerOptions` reasoning key would
  silently discard it in full.

- Every call also writes `usage.reasoningWithheldByProvider`, so a null trace stays
  distinguishable from a missed capture — the ambiguity that hid the original gap.
- **Exemption — lab and probe scripts.** A throwaway, hand-run script whose purpose is to
  *measure the API itself* (a visibility probe, a cap probe, a bench cell) does not write
  `model_calls` rows. Its output is a finding, not an artifact: nothing downstream joins to it,
  and the audit trail it owes is the measured result recorded **in this file**, which is a
  stronger record than a row nobody reads. The obligation binds every call on a production
  path — anything a route, runner, cron, or user action can reach — with no exceptions, and a
  script that persists what a model produced (like `scripts/extract-voice-guide.ts`) is a
  production path regardless of who types the command. Delete the probe once its finding is
  recorded; a probe left in the tree is a call site waiting to be reused.
- **The lesson, and it generalises past this API: an absent value under default configuration
  is not proof that no configuration produces it.** Find the parameter that governs the field
  and test *that* before recording an impossibility. This is the K3 rule's mirror image —
  there a `200` was mistaken for compliance; here an empty field was mistaken for
  incapability, and the wrong conclusion was written into this file as a "measured fact",
  which is worse than a bug because this file exists to stop future sessions re-deriving.
- **Corollary for model choice:** auditability is a *checkable* property of a model. A swap
  that trades a trace-exposing model for a silent one is a real loss — but confirm silence
  against the model's own visibility parameter before calling it silent.

- **Rows, not blobs — L4's argument, generalised.** L4 made `post_drafts` one row per
  council member so the retirement rule, per-model cost, and "why did this win" each stay
  ONE query. Extraction takes the same shape the moment the council lands (primary + three
  analysts + falsify = five calls per reporter), so a provenance blob would have rebuilt the
  anti-pattern L4 already rejected — on the other stage.
- **One home per fact.** `post_drafts` carries only draft semantics (`source_post_id`,
  `experiment_id`, `model_call_id`, `is_winner`, `judge_verdict`); `voice_guides.provenance`
  is a **pointer** (`{ modelCallId }`), not a second copy. What a model returned lives in
  `model_calls` and nowhere else.
- **RLS:** owner-scoped select, zero write policies — service-role only, so a browser can
  neither forge nor erase the record of what a model produced.
- Why this is LOCKED rather than left to each slice: it was missed once already. Slice 1
  shipped extraction storing `thinkingTokens` and no trace, because L4 described
  `voice_guides` as carrying "council provenance jsonb" — a phrase written for the council
  era that says nothing about the single-model case, and a plan filled that silence in the
  lossy direction without flagging it. **An invariant that lives only as one table's column
  list gets re-derived, and re-missed, by the next plan.**

### L11. Voice-guide access — any signed-in user can read any guide, accepted deliberately

Found at slice-1 QC and **verified by exploit, not by reading**: `voice_guides`'s only read
policy joins through `experiments`, and `experiments_insert_own` lets any authenticated user
insert any `reporter_handle` with `owner_id = self`. So the join row is self-minted — an
attacker reads 0 rows, inserts one `experiments` row, and reads the guide. Reachable via
PostgREST with the public publishable key; no UI needed.

**Accepted, not fixed.** A guide is derived entirely from public posts: no private data, no
PII, no credential — it is an analysis anyone could reproduce from a public timeline. L4
already locks guides as shared infrastructure (unique per `reporter_handle`) *specifically*
so two customers tracking the same reporter share one guide instead of paying twice, which
makes a second reader the intended product rather than theft. The real exposure is
free-riding on accumulated extraction spend, negligible at current scale.

**Spend amplification — separately verified NOT reachable (2026-07-22).** The worse question
is whether minting an `experiments` row can *trigger* a new paid extraction. It cannot:
`extractVoiceGuide` has exactly one call site (`scripts/extract-voice-guide.ts`, run by hand
with service-role credentials); no app or lib code writes `experiments` at all; the cron
dispatcher selects only `runs` and `agents`; the only triggers on `experiments`/`voice_guides`
are `moddatetime` stamps; and `pg_net`/`pg_cron`/`http` are **not installed**, so the database
has no outbound-call capability. Minting rows creates rows and nothing else.

> **Guard — re-check this the moment extraction gains a user-triggered path.** The bound above
> holds *because* extraction is script-only. The first Server Action, route, agent tool, or
> create-desk flow that calls `extractVoiceGuide` turns a self-minted `experiments` row into
> unbounded spend by a free account. That commit must ship a spend gate (per-owner cap read off
> `usage_events`, or extraction restricted to an earned handle per D14) in the same diff.

> **Owner override, 2026-07-22 — the guard fired, no spend gate shipped this slice.**
> `createDesk`'s `after()` callback (`app/agents/new/actions.ts` → `attemptVoiceExtraction`,
> `lib/voice/create-desk-extraction.ts`) is exactly the "first Server Action... that calls
> `extractVoiceGuide`" this guard warned about, and it ships without the spend gate the guard
> demands — on explicit owner instruction, not an oversight. Safe THIS slice for a checkable
> reason, not a waived one: `loadCorpus` only ever resolves a file under the gitignored
> `.voice-lab/corpora/`, which does not exist in any deployed environment, so a self-minted
> `experiments` row can trigger no paid extraction in production today (mirrored in
> `create-desk-extraction.ts`'s own header comment). **The guard re-arms at D1** — the first
> commit that widens `loadCorpus` to a real corpus fetch owes the spend gate this override
> deferred, in the same diff.

### L10. The lab stays

`.voice-lab/` (gitignored) is kept: it holds the 10 extraction guides, the 200 neutralized
stimuli with known ground truth, and the scoring harness — the **~$20 offline regression
suite** that D7/D8's model auditions run against. Live-data judging answers "who wins in
production"; the lab answers "did the new model regress against known ground truth" — both
are needed and the lab costs $0 to keep.

---

## DEFERRED — wanted, sequenced, each with its wake-up trigger

> **PROMOTED (owner override, 2026-07-22):** the code-buildable items here (D1, D2, D3, D5, D10,
> D14, and the L6 auto-post / voice-rules / in-app-edit grey-scaffolds) are folded into **Slice 5**
> in the BUILD ORDER above and are **no longer deferred** — build them live in the next feature run.
> Only D6 (billing → needs paying users), D13 (X Enterprise → needs a contract), and the *tuning*
> halves of D9/D11 (→ need live stream volume) stay genuinely external. The wake-up triggers below
> are kept as rationale, not as gates.

| # | What | Lands as | Trigger / why not now |
| --- | --- | --- | --- |
| D1 | Multi-source ingestion (Reshad's websites via web search; more socials) | desk **Sources** section (the greyed websites field is its seed) | After the X-only slice proves the loop; scope honesty over scope creep |
| D2 | **Clustering** (posts → stories) | additive schema migration (L4) + feed unit becomes a story | After single-post drafting is trusted; the one deferred item touching the object model |
| D3 | Multi-platform drafting (per-platform drafts; select-many-draft-one) | draft card becomes a pill-row per platform | Needs platform accounts + per-platform contracts; item-level, no IA change |
| D4 | Rich feed rendering (react-tweet embeds, article cards) | presentation inside the feed item | Cosmetic; after function |
| D5 | Channels surface (notify prefs, availability, the reply back-and-forth history) **+ Slack interactive buttons** | desk **Channels** section; buttons need a Slack app + an interactions endpoint | Slice 2 shipped Slack **push only**, deviating from L5's "interactive buttons + push" for two reasons: an incoming webhook (the single-workspace credential we use) structurally **cannot carry actionable components** — buttons require a full Slack app with an interactions URL — and a button's actions (approve/post/edit) have no surface to land in until the desk UI exists. The same single webhook is also **welded to one channel in one workspace**: `SLACK_WEBHOOK_URL` (like `NOTIFY_EMAIL_TO`) is one platform-level destination, so *every* owner's draft goes to the same place and any recipient of that inbox can correct any owner's draft — fine at one reporter, structurally impossible for two. Per-desk credentials (the deny-all `slack_accounts`-style table + `getSlackLinkState()`, mirroring `x_accounts`) are what unweld it. **Wakes with whichever comes first: the L8 Channels section, the posting surface (L6's flag flip), or a second customer** — the last is a hard correctness bound, not a UI nicety. Email replies were NOT deferred with it — inbound reply handling shipped in slice 2 |
| D15 | **`lib/agent/draft-run.ts` records no `model_calls` rows** — a known L12-violating call site, left in place deliberately | either deletion, or the same ledger-first treatment `draft-pipeline.ts` got | It is the **old** desk drafting path (`agents` → `drafts` → the `[id]` DraftsTab), parallel to and untouched by slice 2's council. Retrofitting L12 onto a pipeline the UI slice replaces spends the work twice; recording the violation is what stops it being re-discovered as a surprise. **Trigger: the old desk drafting path is retired, or carried into the new UI (slice 4)** — that commit fixes or deletes it. Same applies to the whole old pipeline's use of the retired `rawEstimatedCost` cost path (`scan-run.ts`, `draft-run.ts`, `persist-run.ts`, `onboarding-extract.ts`) |
| D6 | Payments/billing | site-level account | No paying users yet; metering (L7) is already collecting what billing will need |
| D7 | Extraction council build + audition bench | after the slice ships | Zero effect on ingestion latency; test vs the lab for ~$20 before touching production guides |
| D8 | Drafting third seat (`glm-4.7-flashx`) and the cheap-tier bake-off (`gpt-5-nano`/`glm` vs `v4-flash`) | config-list flip / lab run | Third seat: cache telemetry confirms room. Bake-off: monthly drafting spend crosses ~$50 (≈40 reporters) |
| D9 | Draft-everything vs draft-on-selection | pipeline policy | First real week of stream volume decides; binds if volume approaches the 134/day floor |
| D10 | AI chat as the create-form assistant | inside the form, on the fuzzy fields (beat description) | The chat exists and is plumbed to the old flow; re-plumb after the form ships. One front door |
| D11 | Embedding gate (pgvector, shadow-tuned thresholds) | pipeline v2 | Needs live drafts to tune against |
| D12 | Reddit via Bright Data · handle verification at onboarding · per-desk spend caps | various | Post-slice hardening |
| D13 | X Enterprise tier | account migration | Only if webhooks or backfill_minutes become necessary; custom contract, unpublished pricing |
| D14 | **Earning the `experiments` join row** — a `reporter_handle` grants guide access only once verified (linked X account, or an approved list) | a migration + whatever verification mechanism is chosen | The only *real* fix to L11, and a design problem in its own right. Wakes when guide free-riding stops being negligible, or when extraction gains a user-triggered path (L11's guard) — whichever comes first |
| D16 | **Ingestion-path concurrency + metering hardening** (surfaced at slice-2 QC, both harmless at one hand-seeded post): (a) a delivery whose author matches no `experiments` row writes **no `usage_events` `stream_delivery`** (the column is `owner_id NOT NULL` and an unmatched delivery has no owner) — so L1's 80%-of-cap alarm undercounts real stream volume; (b) the `already_drafted` guard in `processDelivery` and the idempotency check in `applyCorrection` are **non-atomic select-then-insert with no unique index**, so two concurrent deliveries of the same `x_post_id` (or two of the same Svix reply) both pay a full council/revision | a migration (unique constraints on the dedup keys) + an un-owned "unmatched deliveries received" counter | **Trigger: slice 3** — the always-on forwarder can redeliver on reconnect (its whole failure model is reconnect-with-backoff), which is the first time duplicate/concurrent deliveries are real rather than hypothetical. Both are one-reporter-safe today; neither blocks the slice-2 demo |

> **Owner override, 2026-07-22 — D8's third seat activated ahead of its trigger.** The
> "cache telemetry confirms room" gate above is explicitly skipped: `zai/glm-4.7-flashx` ships
> today as the drafting council's third family (`lib/agent/draft-council-run.ts`), on owner
> instruction. Verified, not assumed: the gateway id was resolved by probe against
> `gateway.getAvailableModels()` (`glm-4.7-flashx` maps to that exact slug — docs' shorthand is
> not the literal id); GLM exposes full reasoning by default, no visibility flag needed (2,911
> chars on the demo prompt, same trace shape as `deepseek-v4-flash`); and a top-level
> `reasoning: "low"` has a measured effect (`reasoningTokens` moved 689 → 849 on an identical
> prompt), satisfying L9 rule 6's read-the-effect-back bar rather than trusting a 200. L3's cap
> note is updated alongside this (see its own annotation): worst case moves to ~$3.3/mo,
> over the original $3 cap. D8's other half — the cheap-tier bake-off (`gpt-5-nano`/`glm` vs
> `v4-flash`) — is untouched, still gated on ~$50/mo drafting spend.

---

## REJECTED — examined and killed; the fact that killed each

| # | Rejected | The killing fact |
| --- | --- | --- |
| R1 | Webhook delivery + the whole CRC/HMAC apparatus | Delivery routing is Enterprise-only ("currently available to Enterprise developers"); registering a webhook is ungated, which made the naive probe a false-positive trap |
| R2 | Vercel-native always-on ingestion (function chains, cron-held sockets, WDK, Sandbox) | maxDuration ceilings (300s/800s GA, 1800s beta); cron is documented best-effort with no retries; a suspended WDK workflow holds no socket; Sandbox ≈ $31/mo provisioned, single-region, off-label |
| R3 | Fly.io as the forwarder host | Superseded by Railway on equal-or-better flat cost (~$5/mo verified) + first-party MCP/CLI tooling already authenticated |
| R4 | OpenRouter (auto-router, Fusion, free tier) | Auto Router routes on 7-day crowd spend, picks one model; Fusion is Labs-experimental, 4–5× cost, 2–3× latency, judge emits JSON not drafts, web search on by default; free models train on inputs; not a Gateway upstream; ~5.5% credit fee |
| R5 | Per-user stream rules (`user:<id>` tagging) | Live rule caps are 5/app, 15/project — five customers and done; routing was always going to live in our tables anyway |
| R6 | `lang:` stream filter | Discards posts we want; Reshad monitors EN+ES; language is a drafting concern (translate-then-draft) |
| R7 | Bright Data for real-time X ingestion | Measured staleness: newest post 7d12h old across 347 records, reproduced 4×; kept only for corpus scrapes where staleness is irrelevant |
| R8 | `gpt-5.4-nano` as the drafting second family | Tested and good ($1.37/1k) but the duo is $3.27/mo even cached — over the $3 cap; "tested" doesn't beat unaffordable |
| R9 | `deepseek-v4-pro` anywhere in drafting | $2.71/1k = $4.07/mo alone — killed by input-token dominance, not by family; it sits in the *extraction* council where input is read once |
| R10 | Gemini, both stages | On-task 0-for-2 (3.1-pro-preview, 3.5-flash lost the extraction panel); **no 3.6 Pro exists on the gateway** (3.6 ships Flash only, $7.50/M out = 27× flash for drafting); uncapped reasoning inflated WMT25 output 6.6× — caps fix cost, not rank |
| R11 | `kimi-k2.6` (budget K3) | K3 exists at 3× the price; saving $0.19 *one-time* to drop a tier in the quality-dominant stage fails the proportionality criterion |
| R12 | MiniMax (any stage) | The only family whose residual violations never cleared in the 1,000-draft run |
| R13 | `mistral-large-3` as a core analyst | Absent from every writing board surveyed; kept on the bench only as the EU option |
| R14 | `qwen3.5-flash` as drafting base or 4th council member | Ran and lost to flash ($2.95 measured vs $1.23, style 0.37 vs 0.35); as a 4th seat even reasoning-capped it breaks the $3 cap |
| R15 | On-task panel losers as extraction primaries | opus-4.8, sonnet-5, gpt-5.6-sol/terra, grok-4.5 all tested, all lost to Fable — sol despite 81.7 Longform Elo, which is why writing boards don't override on-task results |
| R16 | `grok-4.1-fast` as drafting third family | Deprecated/rerouted to grok-4.3 per the dev console; 4.3 at $2.5/M out cannot fit the drafting budget (extraction-bench only) |
| R17 | 2× Fable self-fusion in the extraction council | Dead under the $2 cap ($2.64); and the OpenRouter +6.7pt self-fusion result doesn't transfer — it comes from sampling variance on *checkable-answer* tasks; what justifies multiple passes here is noticing variance, harvested more cheaply by blind cross-family analysts |
| R18 | A fixed council-size ceiling ("4 passes max") | Asserted, never derived — withdrawn; the retirement rule governs membership |
| R19 | "Untested" and "same-family" as elimination rules | Owner override, adopted as principle: members are admitted within budget and production data retires them; family is a diversity *weight*, budget arbitrates |
| R20 | Global sidebar + listing-first landing | The measured sidebar served one nav destination; Reshad arrives from a notification — the listing is a detour on every visit |
| R21 | Greyed placeholders for unspecified future stages | Greying communicates a promise; an unspecified stage (clustering) has no control to draw — the future is held by the container (L8), we ran the reserved-blank-space experiment once already |
| R22 | Newsroom-IT-approval objection to Slack | Retracted on fact: Reshad is independent and installs apps himself (asked directly) |
| R23 | Per-user rule = per-desk webhooks/config designs generally | Everything per-user about ingestion collapsed once the 1-connection + 5-rule realities landed; per-user state lives in Supabase, not at X |
| R24 | `x_user_search` handle verification tool | Fuzzy search drops valid accounts outranked by popular near-matches (closed #57); wrong handle simply returns nothing — verification deferred to D12 with a different mechanism |
| R25 | Closing L11 by making `voice_guides` deny-all + an explicit ownership check in application code | It asks the **same unsound question**, just in app code instead of RLS: ownership would still be established through the same self-minted `experiments` row. It moves the hole, it doesn't close it — while costing the "RLS is the gate" property. Closing this properly means *earning* the join row (D14) |

> **Owner override, 2026-07-22 — R21 partially reversed, for specified-and-coming surfaces.**
> R21 killed greying for an *unspecified* future stage (clustering had no control to draw). The
> shipped Setup tab (`app/agents/[id]/setup/page.tsx`) greys surfaces that ARE specified in the
> plan — Connections' edit/Send-test controls, the whole Notifications matrix, the websites
> field, auto-post — just not yet backed by a data shape (D5, L6). For those, the owner
> overrides R21: reserve the slot, grey the control, back nothing that has no column yet (see
> that file's own header comment for the "grey-scaffolded per the owner rule" phrasing this
> override authorizes). R21's original kill stands for genuinely unspecified stages — there is
> still no greyed control for clustering (D2), because there is still nothing named to draw.
