# Oparax Push Architecture — Plain-English Reference

*Written 2026-07-20, from three days of live-measured research. Every cost number in here was measured on our own accounts or taken from a live pricing catalog — nothing is guessed.*

---

## 0. The one-paragraph version

Today Oparax **asks** X for news on a schedule (12 times a day, via Grok). The new architecture has X **tell us** the moment a source posts (X's Filtered Stream, ~7 seconds), has news websites checked every few minutes for free (RSS), routes the flood of incoming posts cheaply (embeddings), and only uses expensive AI models for the two things only they can do: **deciding what's a story** (clustering) and **writing in the reporter's voice** (drafting). Cost goes from ~$23/month to ~$40–55/month per desk; latency goes from *up to an hour* to *seconds*.

---

## 1. The vocabulary — every confusing term, defined once

Read this section first; everything later uses these words.

| Term | What it actually means |
| --- | --- |
| **Cron** | A clock that fires on a schedule. Vercel Cron calls our `/api/cron/tick` route every minute; our code decides what's due. Nothing more magical than an alarm clock. |
| **Polling (pull)** | *We* repeatedly ask a source "anything new?" — on a timer. We pay/work per **ask**, even when the answer is "no". |
| **Push** | The source tells *us* the moment something happens. We pay/work per **event**. Only the platform that owns the data can offer push. |
| **Webhook** | A URL on our server that someone else POSTs data to. **Two very different uses exist and this caused most of our confusion:** ① a **doorbell** — "something happened, here it is" (X's Filtered Stream webhook works like this); ② a **delivery receipt** — "the job *you* ordered is done, here are the results" (Bright Data's webhook works like this — it never fires unless we started a job first). |
| **Sync vs async** | Sync = one request, wait, answer comes back in the same call (like a phone call). Async = submit a job, get a ticket (`snapshot_id`), pick up results later (like dry cleaning). Bright Data discovery jobs are async-only. |
| **Filtered Stream** | X's real-time firehose, filtered by rules like `from:FabrizioRomano OR from:fcbarcelona`. Posts matching a rule are delivered ~6–7 seconds after being posted, tagged with which rule matched (= which desk they belong to). |
| **RSS feed** | A free public file every serious news site publishes, listing its latest articles (headline, link, timestamp). **Not a Bright Data product** — we fetch it ourselves, ~free. |
| **Embedding** | Turning text into a list of numbers so that "texts about the same thing" end up numerically close. Comparing two embeddings (cosine similarity) is instant and costs ~nothing. This is what Moss was doing in beat-radar; in production we use **pgvector**, which is built into Supabase we already own. |
| **Constrained decoding / structured output** | A newer model feature where the model is *physically unable* to produce JSON that breaks the schema. Our current 88% scan-failure rate ("No object generated") is exactly the failure class this eliminates. |
| **Zone (Bright Data)** | A per-product billing container in their dashboard. Our four (`cli_*`, `sdk_*`) are just duplicates auto-created by two tools. Harmless clutter. |
| **Credit (Bright Data)** | 1 credit = 1 record or request ≈ $0.0015. We get 5,000 free per month, renewing on the 1st, drained before our $102 balance. |
| **Metering** | Counting usage and cost at the moment each event happens (a post ingested, a model call made). History you can't reconstruct later — built from day one. |
| **Entitlement** | What a user's tier allows (source slots, event quota, real-time vs hourly). Enforced through one code chokepoint, driven by a `tier` column. |
| **Source slot** | The pricing unit: one handle-or-site assigned to one desk. 20 handles + 5 sites on one desk = 25 slots; putting the same handle on a second desk consumes a second slot (because it doubles downstream processing). |

---

## 2. Why today's setup feels slow (and what faster polling would cost)

Your understanding is correct: today, DeepSeek hands Grok a search job with your 20 handles pinned, Grok searches X and returns fresh posts. It works. But it's **pull** — the desk only learns about a post at the next scheduled ask:

- Scans fire **hourly, max 12 per day, only inside the desk's window** (Barça Watch: 08:00–19:00 Madrid).
- A source posting at 9:07 surfaces at the 10:00 scan. A source posting at midnight surfaces the next morning.
- **Each scan costs ~$0.065 whether or not anything new happened** — we pay per look, not per event.

That last point is why "just poll faster" doesn't work — cost scales linearly with looking:

| Grok polling cadence | Cost/month | Worst-case delay |
| --- | --- | --- |
| Hourly ×12 (today) | **~$23** | ~60 min (overnight: hours) |
| Every 15 min, 12h window | ~$94 | ~15 min |
| Every 5 min, 12h window | ~$281 | ~5 min |
| Every 5 min, 24/7 | ~$562 | ~5 min |
| **X Filtered Stream (push)** | **~$15–60** | **~7 seconds** |

> **The law this table teaches:** in a pull system, latency and cost are the same dial — halve the delay, double the bill, forever. In a push system they decouple: latency is fixed (~7s) and cost tracks how newsy the beat is. That's the whole economic argument for migrating.

One more thing about today: **88% of recent scheduled scans are failing** (53 of the last 60, including all 25 of Barça Watch's since July 18) at DeepSeek's "turn the results into clean JSON" step. So the practical experience right now is worse than "hourly" — it's "hourly, and usually nothing arrives." This is fixable this week (see §9, step 1), separately from any migration.

---

## 3. Why Bright Data couldn't replace Grok for X

We tested this hard, live, on our own account. Bright Data's X scraper is a **periodically-crawled archive**, not a live feed — and how stale it is varies *per profile*, silently:

- Asked for Fabrizio Romano's most recent posts (28.4M followers, posts 20+×/day): newest post returned was **7 days old** — across 347 records, zero errors reported, reproduced 4 times through both of their API doors.
- fcbarcelona in the same runs: posts **4 minutes old**. Same API, same day.
- Date-windowed requests for recent days returned "no posts found for this period" *while reporting success*.

For breaking news, silent staleness is disqualifying. **Bright Data stays in the picture for what it's genuinely good at:** live single-page fetches (Web Unlocker — for blocked news sites), Reddit (flawless in our testing, with a real "past hour" filter), and one-time handle verification at desk setup ($0.03/desk — it's what caught that our test list was watching a Swedish namesake instead of `@David_Ornstein`).

---

## 4. The new pipeline — follow one post through it

**Scenario: Fabrizio posts "HERE WE GO!" at 14:02:00.**

1. **14:02:07 — X delivers it to us.** Our standing Filtered Stream rule matches. **Design decision (revised): one rule per *user*, not per desk** — all of a user's watched handles in a single `from:h1 OR from:h2 …` rule tagged `user:<id>`. X POSTs the post to our webhook route on Vercel, one post per delivery, tagged with the user. *Cost: $0.005 — billed once per unique post per 24h across our whole account, no matter how many rules or users match it.* Why per-user rules: our plan has 1,000 rules total; per-desk rules would let one enthusiastic user burn dozens of global slots, while per-user rules make desks cost nothing and give us ~1,000 *customers* of headroom.
2. **14:02:08 — we ingest it and route it to desks ourselves.** The route verifies X's signature, drops duplicates (X warns they happen — we dedup by post id), then fans the post out to whichever of that user's desks watch this handle (we know every desk's handle list — desk routing is our code, not X's). One event row per receiving desk in Supabase, plus a `usage_events` metering row (§10) stamped with the $0.005.
3. **14:02:08 — the gate routes it** *(v2 — the first version ships without this layer, see below)*:
   - Free checks first: is it a repost? too short? → discard or hold.
   - Embed the text (~free) and compare against the **centroids** of currently-active stories (a centroid = the average embedding of a story's posts — the story's "location" in meaning-space).
   - **Very similar to an active story** → attach it to that story instantly. No AI model called. This is where the 60–70% of posts that are just echoes (fan accounts amplifying the same scoop) get handled for free, in milliseconds.
   - **No match, or in the uncertain middle band** → put it in the **novel buffer**. *The safety rule that answers your correctness fear: anything uncertain always escalates to the AI model. The cheap layer only ever handles the confident cases, and an hourly audit (step 5) double-checks even those.*
4. **14:03–14:05 — clustering fires on the novel buffer.** When enough novel items accumulate (or a few minutes pass), **one** model call runs over just the novel material: form new stories, extend existing ones, discard junk. Model: **Gemini 3.5 Flash** — it scored *highest of every model we evaluated* on structured knowledge-work output (GDPval 1656, above Sonnet 5's 1618), at half Sonnet's price, with schema-guaranteed JSON. A "HERE WE GO" from Fabrizio becomes a new story with a headline and significance tag.
5. **Hourly — the audit pass.** A cheap model (**GPT-5.6 Luna**, ~$1.50/month) reviews what the gate auto-attached and ejects mistakes. This is the insurance policy on the "naive ML" layer.
6. **14:05 — drafting.** For the new story: fetch the reporter's 3 most relevant past posts (embedding search — this was Moss's job; now pgvector), and **Claude Sonnet 5** writes a ≤280-char post in their voice. Claude keeps this one job because voice/style is the Claude family's strongest suit and the output is so small (~100 tokens) that its premium price is irrelevant. Code now enforces the 280 limit and strips preambles (the demo trusted the prompt; we don't).
7. **14:05+ — the desk shows the story + draft.** Reporter reviews → posts → X charges $0.015 (would be $0.20 if the draft contained a URL; ours don't).

**Scenario B: a tracked news site publishes an article.** No push exists for the open web, so: our existing per-minute cron polls each site's **RSS feed** every 5–15 minutes (free — it's the site's own public file; conditional requests mean "nothing new" responses are near-zero bandwidth). New article links get diffed against what we've seen and enter the same buffer at step 3. Sites without feeds, or that block us, go through Bright Data Unlocker at $0.0015/fetch. **At onboarding, the setup agent finds each named site's feed automatically** — that one-time routing (feed? sitemap? Unlocker?) is most of the website cost model.

**What the cron becomes:** it stops being the scanner and becomes the site poller + hourly audit scheduler + safety sweeper (including X's 24-hour replay endpoint if our webhook was ever down).

---

## 5. Which model does what, and why

Beat-radar ran *everything* on Sonnet at low reasoning. The research says: split the jobs.

| Job | Model | Monthly cost | Why this one |
| --- | --- | --- | --- |
| Clustering (form/extend stories) | **Gemini 3.5 Flash** @ medium | $4–6 (gated) / $10–15 (v1) | Best structured-output score of all candidates; half Sonnet's price; schema-guaranteed |
| Gate audit + any bulk classification | **GPT-5.6 Luna** @ low | ~$1.50 | OpenAI's purpose-built cheap classification tier ($1/$6); zero-malformed-JSON track record. **Never use it for clustering** — it has a long-context recall cliff (41% MRCR) |
| Voice drafting | **Claude Sonnet 5** — now the *ceiling*, not the pick (see §11) | ~$1.50 | Claude owns style mimicry (GPT-5.6 ranked *last* on the one style-similarity eval). Note: intro pricing ($2/$10) ends Aug 31 → $3/$15. **Superseded in part:** "tiny outputs make cost irrelevant" was wrong — the voice guide makes drafting a ~26:1 input-heavy call, so *input* price dominates and the cheap tier is worth chasing (§11) |
| Onboarding chat | DeepSeek v4-flash (unchanged for now) | pennies | Its weakness (schema output under pressure) leaves the pipeline entirely in this design |

All of these are live on our Vercel AI Gateway today (verified against the live catalog) — swapping any of them is a config string, not architecture. The Gateway adds zero markup.

**On caching:** less helpful than you'd hope *right now* — providers only cache prompt prefixes above 1,024–4,096 tokens, and our per-call prompts are a few hundred. It becomes relevant in v2 when accumulated story-state grows into a large repeated prefix; we design prompt order for it then. (Also: Anthropic caching through the Gateway is **off unless opted in** — one line, `gateway.caching: 'auto'`.)

---

## 6. What it costs (per desk, per month)

| Line | Quiet beat (~100 posts/day) | Normal (~200) | Hot (~400) | How it bills |
| --- | --- | --- | --- | --- |
| X Filtered Stream | $15 | $30 | $60 | Per post delivered. $0 on silent days |
| Website monitoring | $0–4 | $0–8 | $0–13 | Per **poll** (not per update) — the only clock-shaped cost; RSS makes most of it free |
| Embedding gate (v2) | ~$0.05 | ~$0.05 | ~$0.10 | Per token embedded — effectively free |
| Clustering (v1 pure-LLM / v2 gated) | $6–9 / $2–3 | $10–15 / $4–6 | $20–28 / $8–12 | Per token; only novel material reaches the model in v2 |
| Audit (v2) | ~$1 | ~$1.50 | ~$2.50 | Hourly batches |
| Drafting | ~$1 | ~$1.50 | ~$3 | Per story |
| Posting | ~$0.50 | ~$0.50 | ~$2 | $0.015/post (URL-free drafts) |
| **Total v1 / v2** | **~$23–30 / ~$19–24** | **~$43–55 / ~$38–46** | **~$85–106 / ~$76–90** | vs today: ~$23, hourly, 88% failing |

Three things about the *shape* of these numbers:

1. **Almost everything bills per event, not per hour.** A quiet news week costs almost nothing. A hot transfer-deadline week costs the most — exactly when the product is earning its keep.
2. **Shared sources get cheaper with scale.** X dedups billing per post per 24h across our whole account — when ten Barça reporters all watch Fabrizio, we ingest and pay for his post **once**. Margins improve as customers overlap on a beat.
3. **Capacity is comfortable for a long time:** the 2M post-reads/month plan cap supports ~100–300 active users' beats; with per-user rules (§4), 1,000 stream rules ≈ ~1,000 customers — and desks are free, so users can organize sources however they like.

---

## 7. How this maps to what exists

**Survives from today's Oparax:** the whole desk model and Supabase schema (extended with `events` + `stories` tables), the onboarding chat and save gate (now also creates the desk's stream rule + finds RSS feeds), X posting and the Drafts tab, the cron (demoted per §4), the `{headline, body, sources}` output contract everything downstream depends on.

**Retires (eventually):** the Grok scan path (kept behind a fallback flag first), the frozen search template and its DoS cap, the scan-protocol prompt contortions, the forced-tool two-pass loop — i.e., the entire "make an LLM safely drive another LLM's search" machinery. The push design has no query language to get wrong.

**From beat-radar, we keep the shape and fix the gaps:** its pipeline (fetch → filter → cluster → draft with clean small digests) is exactly this architecture's skeleton; its scan layer (pull, polled) is what we're replacing; Moss's three jobs (novelty recall, voice exemplars, memory search) all become pgvector on the Supabase we already own — no new vendor, no per-session billing; and the guardrails it lacked (validated story ids, enforced 280 chars, no fail-open) become code.

---

## 8. Honest risks, ranked

1. **The webhook tier question (the gate to everything).** X's docs contradict themselves on whether Filtered Stream *webhook delivery* needs the Enterprise tier. A 5-minute probe (`POST /2/webhooks` on our app) settles it. If it's gated: fall back to the persistent stream connection + a ~$5/mo always-on worker that forwards events to Vercel. Annoying, not fatal.
2. **The live 88% structuring failure** — today's fire, not a migration risk. One constrained-decoding model swap.
3. **Single-beat embedding difficulty (v2 only).** On a Barça desk *everything* is "about Barça," so the gate must separate at story level, not topic level. That's why v1 ships pure-LLM (the correctness baseline), and the gate is tuned in **shadow mode** — replayed against logged real events, measured against the LLM's decisions, before it ever touches production.
4. **Sonnet intro pricing ends Aug 31** (+50% on drafting — a ~$1/month line, so noted rather than feared).
5. **Websites can never be push.** Freshness there is bounded by poll cadence, forever. Minutes, not seconds — fine for news sites, worth saying honestly to users.
6. **Docs drift is systemic at every vendor we touched** (Bright Data documented a dead endpoint; X contradicts itself on tiers). House rule now: **probe before build** — error responses are free.

---

## 9. The order we do things

1. **Fix the structuring failure now** (swap the scan's structuring step to a constrained-decoding model). Biggest single lever on the reporter's experience this week, zero migration required.
2. **Migrate the X dev console** to the company account (new app under farzan@oparax.ai, new client keys in Vercel env, everyone relinks X once — currently just you).
3. **Run the webhook tier probe** on the new app. Five minutes; decides the ingestion design.
4. **Build the first slice — the Experiment surface** (scoped 2026-07-20, detailed below): X-only, no clustering, per-post multi-model drafting, full metering. Put it in front of Reshad. *His reaction to "the draft appeared 10 seconds after the tweet" is the go/no-go.*
5. **Migrate the real desk** to stream-fed acquisition; Grok becomes the fallback flag.
6. **v2: the embedding gate** — pgvector, shadow-tuned thresholds, Luna audit.
7. **Later:** Reddit via Bright Data, handle verification at onboarding, per-desk spend caps.

### The first slice, concretely: the "Experiment" surface (decided 2026-07-20)

The MVP that replicates Reshad's literal ask — *"as soon as my sources post, draft it in my voice and tell me"* — with everything else consciously deferred:

**Surface:** a new sidebar section, **Experiment**, separate from the existing agents: a listing page (mirroring the agents listing), a create form, and a details page per experiment. The create form has exactly five fields: beat description, tracked X handles, the reporter's own X handle (for voice), plus **news websites and draft instructions rendered greyed-out/disabled** — visible scope honesty, deferred function.

**What save triggers, in order:**
1. **Voice corpus** — a Bright Data X-posts scrape of the reporter's *own* handle (a large sample, ~100 posts ≈ $0.15 one-time). Staleness is irrelevant for style sampling, so this is squarely inside what Bright Data is good at.
2. **The stream** — register/update the per-user Filtered Stream rule for the tracked handles, webhook delivery to our receiver route.
3. **24h backfill** — one X recent-search pull (`from:` the tracked handles, last 24h) so the experiment shows the full flow immediately instead of waiting for the next post. This is the pull adapter's first appearance (§ "Scan Now" logic), reused as birth-backfill.
4. **Per-post drafting, multi-model** — every incoming tracked post gets drafted in the reporter's voice by **several models side by side** (Claude Sonnet 5, Gemini, GPT-5.6 tier, DeepSeek v4-flash) so the reporter — and we — can compare voice quality on identical inputs. This is the §5 model bake-off run on real data instead of benchmarks; the winner becomes the default.
5. **Notification** — email (or similar channel) to the reporter when new drafts land.
6. **Metering from the first commit** — the `usage_events` ledger (§10.2) stamps every touch point: stream deliveries, backfill reads, the voice scrape, every model call per draft, notifications.

**Explicitly deferred out of this slice:** clustering/stories, the embedding gate, news-site polling, draft instructions, pricing/entitlements, and auto-*posting* (the slice reaches auto-*drafting*; posting stays behind the existing confirm flow and the trust ladder).

**Prerequisite gate inside the slice:** the `POST /2/webhooks` tier probe (§8 risk #1). If webhook delivery turns out Enterprise-gated, the fallback is the persistent stream connection + a small always-on forwarder.

---

## 10. Metering, entitlements, and pricing

### 10.1 The law: meter from birth, gate early, bill late

"Adding payments" is three layers with very different retrofit costs, and only the last one is Stripe:

| Layer | What it is | When to build | Why |
| --- | --- | --- | --- |
| **Metering** | Recording usage + cost at the instant each event happens | **Day one, in the spike** | History you never recorded cannot be reconstructed; bolting counters on later touches every code path |
| **Entitlements** | Tier limits enforced in code via one chokepoint | Early — the seam multiplies if cut late | Gating touches every feature path |
| **Billing (Stripe)** | Checkout, subscriptions, invoices | Later — it's an isolated plug | Its whole job is "payment event → set `user.tier`". First customers get a manual payment link and a conversation |

### 10.2 The metering ledger — every point where cost or usage is born

**Design:** one append-only `usage_events` table. Every row: `ts · user_id · desk_id (nullable) · kind · units · unit_cost_est · cost_est · provider_ref · meta`. Rollup views per desk/user/day feed the dashboard, the entitlement caps, and pricing analytics. Two rules: *never block the pipeline on a metering failure* (log-and-continue, reconcile later), and *all rate constants live in one versioned module* (prices change — e.g. Sonnet's +50% on Aug 31 — and old rows must keep the rate that was true when stamped).

The complete inventory of metering points — nothing bills or happens outside this list:

| # | `kind` | Fires when | Units recorded | Cost stamped | Attribution |
| --- | --- | --- | --- | --- | --- |
| 1 | `x.post_ingested` | Webhook delivery accepted | 1 post (+ dedup flag) | **$0.005** on first sighting in a 24h window; **$0** on re-sights/duplicates | User (from rule tag); receiving desks fan-out listed in `meta` |
| 2 | `x.replay` | 24h replay job after webhook outage | 1 job; replayed posts then meter as #1 | $0 for the job itself | Account |
| 3 | `x.rule_op` | Stream rule create/update/delete (onboarding, tier change, pause) | 1 op | $0 (but rate-limited 100/15min — usage matters even when cost doesn't) | User |
| 4 | `site.rss_poll` | Every feed fetch | 1 poll (+ bytes, 304-not-modified flag) | ~$0 (compute only) | Desk + site |
| 5 | `site.unlocker_fetch` | Bright Data Unlocker fetch of a blocked site | 1 fetch | **$0.0015** | Desk + site |
| 6 | `bd.record` | Future Bright Data dataset records (Reddit etc.) | Records delivered | **$0.0015/record**; errored inputs $0 (measured) | Desk; `provider_ref` = snapshot id |
| 7 | `embed.call` | Every embedding batch (gate + voice retrieval) | Tokens | Provider rate (~$0.02/M) | Desk |
| 8 | `llm.cluster` | Every clustering call | Input / output / cached tokens | **Exact** — AI Gateway returns real usage + cost per call | Desk |
| 9 | `llm.audit` | Hourly audit batch (account-wide) | Tokens | Exact | Account, prorated to desks by attachments reviewed |
| 10 | `llm.draft` | Every draft generation | Tokens | Exact | Desk + draft row (extends today's `cost_deepseek` column pattern) |
| 11 | `llm.onboarding` | Every chat-onboarding turn | Tokens | Exact | User — *this closes backlog #62's known gap (onboarding costs currently reconstructed from untrusted client transcripts)* |
| 12 | `grok.scan` | Fallback pull scans (while Grok remains the fallback flag) | 1 scan | Exact (`cost_in_usd_ticks/1e10` — today's `cost_grok` pattern) | Desk + run row |
| 13 | `x.post_created` | Publishing a draft to X | 1 post (+ has-URL flag) | **$0.015**, or **$0.20 if the post contains a URL** | Desk + draft row |
| 14 | `infra.*` | Vercel compute / Supabase | — | Tracked coarse and monthly, not per-event (negligible at this scale) | Account |

**Reconciliation (the honesty check):** a daily job compares our stamped estimates against each provider's billed truth — X's usage endpoint, Bright Data's `POST /costs/export/json`, the AI Gateway's usage reporting — and records the drift. Alert if any provider diverges >5%. Estimates catch problems in hours; reconciliation catches estimate bugs in a day.

### 10.3 Entitlements — one chokepoint, and what a tier change must switch off

- One `tier` column per user; one limits table per tier: **source slots**, monthly event quota (soft cap), real-time vs hourly delivery, desks **unlimited** on every tier.
- One `checkEntitlement(user, action)` module, consulted at exactly five places: desk save (slot count), stream-rule reconcile, webhook accept (quota check), poller scheduling, and draft/post actions.
- **The propagation rule that must never be skipped:** any tier change, cap hit, or lapse → reconcile the user's X rule (pause = *remove* it), pause their site pollers, mark desks paused. Because X bills *us* per delivered post, a lapsed user with a live rule is negative margin — billing state must reach the rule layer, not just the UI.
- Soft-cap behavior is always **pause + notify**, never a surprise bill. Reporters don't tolerate variable invoices.

### 10.4 Pricing: source slots, desks free

**Decided direction:** tiers cap **source slots** (sum of handle/site assignments across all desks — duplicates consume slots); desks are unlimited pure organization. This works because the measured costs track *sources*, not desks: ingestion bills per unique post account-wide, polling scales per site, and the per-user-rule design (§4) makes desks infrastructurally free. The one desk-shaped cost (smaller clustering batches, the audit pass) is noise or batchable.

**Unit economics** (v2 pipeline, Reshad-shaped ~6,000 posts/month — the LLM lines are in here explicitly):

| Component | Per ingested post | Share |
| --- | --- | --- |
| X stream read | $0.0050 | ~65–75% |
| Clustering (Flash, novel residue only) | ~$0.0008–0.0010 | ~12% |
| Drafting (Sonnet) + audit (Luna) | ~$0.0005 | ~7% |
| Embedding | ~$0.0002 | ~3% |
| Site-polling share | ~$0.0005 | ~7% |
| **All-in** | **~$0.007–0.008** (v1 pure-Sonnet: ~$0.010) | — |

**The formula** (carried over from the COGS notes, new unit): `included events = price × margin_share ÷ cost_per_event`. At 70% gross margin and ~1¢/event, $149/month funds ~10,000 events — a Reshad-shaped beat with headroom.

**Illustrative ladder** (method > numbers; boundaries get set empirically from the metering data after a few weeks of real desks):

| Tier | Price | Source slots | Included events/mo | Notes |
| --- | --- | --- | --- | --- |
| Hourly (trial rung) | free / cheap | ~10 | n/a — pull engine | The old Grok pipeline becomes the trial: *"updated every hour — upgrade to hear it the second it breaks"* |
| Starter | ~$49 | ~13 | ~3,000 | Quiet/niche beats |
| Pro | ~$149 | ~30 | ~10,000 | Reshad-shaped beats |
| Newsroom | custom | pooled | pooled | Teams; shared-source economics shine here |

**Margin tailwinds to remember:** shared handles bill once across the whole account (ten Barça customers ingest Fabrizio's post for one $0.005 — margins improve with beat density; don't pass through as discounts early), and the free 5,000 Bright Data credits/month cover the Unlocker tier of site monitoring for early users. **First price:** a conversation with Reshad after the spike wows him — Stripe is for the tenth customer.

---

## 11. The Voice Lab — how a reporter's voice is learned and reused (decided 2026-07-20/21)

§5 assigns "voice drafting" to a model. That row was a *price* decision made before we
had any evidence about voice. The Voice Lab (`.voice-lab/`, gitignored working data) is
the ablation that replaces it with measurement. Everything below is **fixed** — settled by
a run, not by argument — unless the line says otherwise.

### 11.1 The two-model split

Voice is **not** one model's job. It is two, with completely different economics:

| Stage | Runs | Cost shape | Therefore |
| --- | --- | --- | --- |
| **Extraction** — read a reporter's posts, write a voice guide | **once per reporter**, at onboarding | one-time, amortised over every future draft | buy the best model available; effort is nearly free here |
| **Drafting** — turn one news brief into one post, guide as system prompt | **once per post, forever** | recurring, and the dominant lifetime cost | push as cheap as quality allows |

The guide is the seam between them. Everything the expensive model learns is written down
once, in text, and then re-read by a cheap model on every draft. That is the whole design.

### 11.2 Extraction — fixed

- **Model: Claude Fable 5.** Chosen on perfect verbatim-quote fidelity across three
  reporters plus the highest count of unique catches (observations no other model made).
  Sonnet and Opus were both tested and both lost.
- **Reasoning: `thinking: { type: "adaptive" }` + `outputConfig: { effort: "high" }`.**
  Current Anthropic models **reject** the older `{ type: "enabled", budgetTokens }` shape.
  Adaptive is preferred over a fixed budget — the model decides depth per reporter.
- **No web search.** Sonnet with search enabled spiralled to 19 searches, 1.08M input
  tokens and $2.24 for an *empty* guide. The handle is supplied in the prompt instead, with
  an explicit "use it exactly, never invent a placeholder" instruction.
- **Prompt:** `.voice-lab/prompt-fable.txt` (≈15.9K chars), harvested from a
  three-model dimension matrix — each model's unique catches became a named dimension in a
  single union prompt, so one model now finds what three found separately.
- **Corpus: 100 posts per reporter**, split **80 train / 20 held-out** (the 20 most recent).
  The holdout exists so the drafting evaluation can never be scored against a post the
  extractor already read. Contamination control, not sample size.
- **Measured cost: $0.855 per reporter** (10/10 reporters, $8.55 total, 80-post corpora).
  A one-time onboarding cost, roughly six times the Bright Data scrape that feeds it.
- **Guide format: markdown with XML-tagged examples.** The guide IS a system prompt, so it
  is written as one — headed markdown sections for the model to navigate, `<post>` tags
  around each example (one example per tag, never several in one block), and **no post ids**.
  Code fences and blockquotes were both tried and both lost: fences imply "code", multi-example
  blockquotes blur where one post ends.

### 11.3 The deploy strip — instrumentation is not deliverable

The guide carries a `## Dimension Coverage` section so the *lab* can verify the extractor
examined every dimension. The drafting model gains nothing from it and pays for it on every
single draft. `.voice-lab/deploy-guide.py` strips it at deploy time:

**235,091 → 197,144 chars across 10 guides — 16.1% off every draft, forever, at zero risk.**
Mean guide 23,509 → 19,714 chars (≈5,900 → ≈4,900 input tokens per draft).

The general rule this establishes: **anything in the guide that exists to verify the
extractor must be stripped before the guide becomes a prompt.**

### 11.4 The drafting contract — fixed

The guide alone is not a prompt. `.voice-lab/draft-contract.txt` (≈5K chars) is appended
below every guide and carries the rules the guide cannot: output hygiene (no preamble, no
wrapping quotes, no alternatives, no markdown, never emit the `<post>` tags), and the
content rules. The content rules exist because of failures we actually observed:

- **Never invent structure the brief cannot fill** — models produced fabricated
  `Timestamps:` chapter lists to satisfy a format the guide showed them.
- **Never point at media that does not exist** — dangling colons introducing an attachment
  the brief never mentioned.
- **The carry-over trap** (its own section, with a worked example): when a brief *resembles*
  a guide example, models carry a handle or a credit across from that example. The output
  looks flawless and misattributes real information to a real person. The rule is stated
  absolutely: *every name, handle, number, quote and time in the post must appear in the
  BRIEF* — the guide supplies voice and structure only, never facts.

### 11.5 The evaluation method — fixed

- **Stimuli are real posts, neutralised.** Each held-out post is rewritten by
  `openai/gpt-5.6-terra` into a flat wire brief — emoji, caps, slang, opinion and line
  breaks stripped, third-party quotes preserved verbatim. That yields 200 genuine
  input→output pairs with a known ground truth (the reporter's actual post). 200/200 built
  for $0.34, with a leakage tripwire on every one.
- **Terra is deliberately excluded from the drafting panel** — the model that wrote the
  briefs may not be judged on them.
- **Scoring is deterministic first, human second.** A code check traces every handle,
  figure and timecode in a draft back to the brief before any model or person judges style.
- **Sonnet 5 is the ceiling, not the floor.** Candidates are only upgraded to a newer tier
  if the upgrade is still cheaper than Sonnet 5. No new model families are introduced
  mid-ablation — families are upgraded in place (GPT, Gemini, GLM, Qwen, DeepSeek, MiniMax).

### 11.6 The self-check loop — under test

Two variants per model on identical stimuli: **A** = draft and stop; **B** = draft →
deterministic code check → if and only if violations are found, one repair call naming each
violation. The question is whether cheap models plus a repair loop reach expensive-model
reliability at a fraction of the price. Result pending; the winner becomes §5's drafting row.

### 11.7 Instrumentation rules learned the hard way

Four wrong conclusions this lab reached before the code was fixed. These are now house rules:

1. **`inferenceCost` from the Gateway is a string.** `.toFixed()` on it throws, and the
   throw happens *after* the work succeeded — twice we reported a job as failed when it had
   completed perfectly. Always `Number()` it.
2. **Anthropic thinking tokens are not where the AI SDK puts everyone else's.** They live at
   `providerMetadata.anthropic.usage.output_tokens_details.thinking_tokens`, not
   `usage.outputTokenDetails.reasoningTokens`. Reading the wrong field produced a confident,
   published, wrong claim that these models "weren't reasoning".
3. **Normalise before comparing text.** HTML entities and literal `\n` escapes made a
   verbatim quote look fabricated — one model scored 53% when it had actually scored 91%.
4. **Long jobs must checkpoint and resume.** Four separate runs died mid-flight; the root
   cause was OOM (exit 137) from high concurrency holding ~20K-char prompts. Every lab
   script now writes after each batch and skips completed cells on restart.

The generalisation: **a failure report is a claim about our instrumentation as much as about
the model.** Verify the reader before believing the reading.

---

## Appendix: the evidence these claims stand on

- **Bright Data X staleness:** Fabrizio's newest post 7d12h old across 347 records/0 errors, reproduced 4× through both API endpoints; fcbarcelona 4 min fresh in the same runs (snapshots `sd_mrts2v1x…`, `sd_mrts8nd2…`, `sd_mrtppb4…`).
- **Bright Data pricing, measured:** $1.50/1k records across X/Reddit/SERP; 1 credit = 1 record; errors unbilled; 5,000 free credits/month renewing.
- **Production failures:** 53/60 recent runs failed with `No object generated`, incl. 25/25 on Barça Watch since Jul 18.
- **Watch-set volume:** ≥134 posts/day measured (a floor — fan handles were search-capped); 7 of 20 handles ≈ 0 posts; `DavidOrnstein` is a namesake — the reporter is `@David_Ornstein`.
- **Reshad's cadence:** 8 posts/7 days, all on one match day; 87% URL-free.
- **X platform:** Filtered Stream on pay-per-use, $0.005/read with 24h dedup, 2M reads/month, 1,000 rules, ~6–7s P99; webhook delivery documented per-post with rule tags; Enterprise-gating contradiction open.
- **Model prices (Gateway live catalog, 2026-07-20):** Luna $1/$6 · Flash $1.50/$9 · Sonnet 5 $2/$10→$3/$15 · Terra $2.50/$15 · DeepSeek $0.14/$0.28.
- **Research spend:** ≈$1.20 of Bright Data free credits + ≈$0.28 xAI.
- **Voice Lab corpus:** 10 reporters across 5 verticals (football, NBA, NFL, politics, crypto),
  two per vertical, 100 posts each via Bright Data `gd_lwxkxvnf1cynvib9co` — 787 training
  posts + 200 held-out after the 80/20 split. Politics/crypto handles came from the real
  outreach records, so the panel is not football-shaped.
- **Extraction measured:** Fable 5 @ adaptive/high, 10/10 reporters, **$8.55 total /
  $0.855 per reporter**; guides 20.4K–30.4K chars raw, 16.7K–25.9K after the deploy strip.
- **Stimuli:** 200/200 neutralised briefs for $0.34; mean brief 166 chars vs 227-char real
  post; 2/200 leakage flags, both inside deliberately-preserved third-party quotes.
- **Cache economics (Gateway catalog, 2026-07-20):** Anthropic charges 1.25× to write cache
  and 0.1× to read, so caching the guide pays back above ~1.3 drafts per cache window;
  OpenAI, Google, DeepSeek and GLM charge nothing to write. With bursty reporter traffic we
  cannot guarantee that rate, which is a further argument for a cheap base model over a
  cached expensive one.
