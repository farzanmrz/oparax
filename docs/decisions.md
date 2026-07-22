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

The LOCKED sections below are the spec; this is the sequence they ship in. **A feature flow
triggered as "the next slice" builds the first slice marked NEXT — one slice, not the
whole list.** When a slice ships, mark it DONE and promote the following one to NEXT.

| # | Slice | Status | Spec | Done when |
| --- | --- | --- | --- | --- |
| 1 | **Schema + voice extraction** — the five tables (incl. the clustering extension point) and the Fable extraction path (`lib/voice/` is already ported: measured-facts + deploy-strip) | **DONE** (#66) — guide extracted, stored, RLS-readable | L4, L2, L11, L12 | A real voice guide for Reshad, extracted from his real corpus, stored and readable |
| 2 | **Drafting council + notification + metering** — the two-family council and judge, Slack + email delivery, `usage_events` stamped from birth | **NEXT** | L3, L5, L7, L12 | A hand-seeded source post produces a Slack message carrying a draft in Reshad's voice — **this is the demo** |
| 3 | **Ingestion worker** — the always-on Railway forwarder: stream connection, shared rules, reconnect-with-backoff, liveness alarm, delivery metering | after 2 | L1 | Live posts replace the hand-seeded one end to end |
| 4 | **UI** — site chrome, desk sections, feed, council expansion | **BLOCKED** on the Claude-design wireframe → v0 lock | L8 | The reporter reviews and posts from the app instead of from Slack |

Rules for whoever picks this up: the spec is already settled — **plan from these sections,
do not re-derive, re-price, or re-ask.** The REJECTED list exists so alternatives are not
reconsidered without a new fact.

**Cross-cutting invariants bind every slice, whatever it is about — a plan that touches
model calls or spend must satisfy them explicitly, not inherit them by luck:**
**L7** (every touch point stamps `usage_events`), **L9** (the instrumentation house rules),
and **L12** (every model call records its output *and* its reasoning trace, one
`model_calls` row each, single model or five). If a slice makes a model call and its plan
does not say where the trace is stored, **the plan is wrong** — that exact omission shipped
once in slice 1. Slice 3 is deliberately not first: it is the riskiest
component (a long-lived socket with no backfill safety net on the free tier), so the
pipeline is proven before the socket is debugged.

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
  | `openai/gpt-5-nano` | 0 chars **under default config** | **UNVERIFIED — its own visibility parameter was never tested.** Do not read as incapable |

- Every call also writes `usage.reasoningWithheldByProvider`, so a null trace stays
  distinguishable from a missed capture — the ambiguity that hid the original gap.
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

### L10. The lab stays

`.voice-lab/` (gitignored) is kept: it holds the 10 extraction guides, the 200 neutralized
stimuli with known ground truth, and the scoring harness — the **~$20 offline regression
suite** that D7/D8's model auditions run against. Live-data judging answers "who wins in
production"; the lab answers "did the new model regress against known ground truth" — both
are needed and the lab costs $0 to keep.

---

## DEFERRED — wanted, sequenced, each with its wake-up trigger

| # | What | Lands as | Trigger / why not now |
| --- | --- | --- | --- |
| D1 | Multi-source ingestion (Reshad's websites via web search; more socials) | desk **Sources** section (the greyed websites field is its seed) | After the X-only slice proves the loop; scope honesty over scope creep |
| D2 | **Clustering** (posts → stories) | additive schema migration (L4) + feed unit becomes a story | After single-post drafting is trusted; the one deferred item touching the object model |
| D3 | Multi-platform drafting (per-platform drafts; select-many-draft-one) | draft card becomes a pill-row per platform | Needs platform accounts + per-platform contracts; item-level, no IA change |
| D4 | Rich feed rendering (react-tweet embeds, article cards) | presentation inside the feed item | Cosmetic; after function |
| D5 | Channels surface (notify prefs, availability, the reply back-and-forth history) | desk **Channels** section | Slice ships its seed (Slack+email config); history UI follows the inbound-reply build |
| D6 | Payments/billing | site-level account | No paying users yet; metering (L7) is already collecting what billing will need |
| D7 | Extraction council build + audition bench | after the slice ships | Zero effect on ingestion latency; test vs the lab for ~$20 before touching production guides |
| D8 | Drafting third seat (`glm-4.7-flashx`) and the cheap-tier bake-off (`gpt-5-nano`/`glm` vs `v4-flash`) | config-list flip / lab run | Third seat: cache telemetry confirms room. Bake-off: monthly drafting spend crosses ~$50 (≈40 reporters) |
| D9 | Draft-everything vs draft-on-selection | pipeline policy | First real week of stream volume decides; binds if volume approaches the 134/day floor |
| D10 | AI chat as the create-form assistant | inside the form, on the fuzzy fields (beat description) | The chat exists and is plumbed to the old flow; re-plumb after the form ships. One front door |
| D11 | Embedding gate (pgvector, shadow-tuned thresholds) | pipeline v2 | Needs live drafts to tune against |
| D12 | Reddit via Bright Data · handle verification at onboarding · per-desk spend caps | various | Post-slice hardening |
| D13 | X Enterprise tier | account migration | Only if webhooks or backfill_minutes become necessary; custom contract, unpublished pricing |
| D14 | **Earning the `experiments` join row** — a `reporter_handle` grants guide access only once verified (linked X account, or an approved list) | a migration + whatever verification mechanism is chosen | The only *real* fix to L11, and a design problem in its own right. Wakes when guide free-riding stops being negligible, or when extraction gains a user-triggered path (L11's guard) — whichever comes first |

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
