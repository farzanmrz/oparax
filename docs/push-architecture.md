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
| Voice drafting | **DeepSeek v4-flash** (decided §11.7; Sonnet 5 was the ceiling it beat on price at equal style) | ~$1.50 | Claude owns style mimicry (GPT-5.6 ranked *last* on the one style-similarity eval). Note: intro pricing ($2/$10) ends Aug 31 → $3/$15. **Superseded in part:** "tiny outputs make cost irrelevant" was wrong — the voice guide makes drafting a ~26:1 input-heavy call, so *input* price dominates and the cheap tier is worth chasing (§11) |
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

### Ingestion, settled (2026-07-21) — persistent connection, not webhooks

The §8 risk #1 contradiction is resolved, and the two things being conflated are now
separated for good:

| Mechanism | Endpoint | Tier |
| --- | --- | --- |
| **Persistent connection** (what we use) | `GET /2/tweets/search/stream` | **Pay-per-use — 1 simultaneous connection**, 1,000 rules, 1,024-char rules |
| Webhook delivery (what we don't) | `POST /2/tweets/search/webhooks/:id` | **"currently available to Enterprise developers"** |

Registering a webhook (`POST /2/webhooks`) is *not* tier-gated; **routing filtered-stream
matches to it is**. Probing the first endpoint would have returned success and taught us
nothing. **Decision: build the persistent-connection path.** Consequences:

- **No CRC handshake, no HMAC, no hourly re-validation.** That whole apparatus is
  webhook-only and is now out of scope.
- **One connection for the entire account** — a single always-on forwarder process holding
  the stream and POSTing each delivery into Vercel. Not per-user, not per-desk. This is a
  single point of failure by construction and needs reconnect-with-backoff plus a
  liveness alarm.
- The receiver route on our side is identical either way; only the feed changes. If the
  webhook tier ever opens, the forwarder is deleted and nothing else moves.

**Forwarder host (2026-07-21): Railway, replacing the earlier Fly.io lean.** Project
`oparax-ingest` exists (workspace "Oparax", account farzan@oparax.ai, production env,
id `15319bb7-…`). Verified pricing: per-second on actual resources (≈$10.15/GB-RAM/mo,
≈$20.30/vCPU/mo) — a 256MB worker holding one stream connection is ~$3/mo of usage, inside
the Hobby plan's included allowance, so **~$5/mo flat total; scales with resources, never per
user or per stream** (one process serves every customer — X caps us at 1 connection anyway).
The worker service deploys with the ingestion build task, **not before**: the exposed
`X_BEARER_TOKEN` must be rotated first.

**The rule shape is fixed** (docs forbid negating a group — negate each exclusion separately,
and always parenthesise the author group):

```
(from:h1 OR from:h2 OR …) -is:retweet -is:quote -is:reply
```

**No `lang:` filter.** Sources post in multiple languages and we want those posts. Language
handling moves into the drafting model instead: **translate the source to English, then draft
in the reporter's voice.** (Reshad monitors English and Spanish.) Offering language as a
stream filter is a later feature, not this slice.

**Capacity:** X handles are ≤15 *characters*, so a `from:` clause costs ~24 chars worst case
— roughly **40+ handles in one 1,024-char rule**, comfortably one rule per user across all
their desks. 1,000 rules ÷ 1 per user ≈ 1,000 customers of headroom.

**Probed live against our own app (2026-07-21) — the docs were wrong for us.**
`GET /2/tweets/search/stream/rules/counts` returns:

```json
{"cap_per_client_app": "5", "cap_per_project": "15", "project_rules_count": "0"}
```

**Five rules per app, fifteen per project — not the documented 1,000.** One rule per user
would cap us at five customers. **Revised design: pack all users into shared rules and route
by author in Supabase.** One rule holds ~40 handles, so five rules ≈ **~200 distinct tracked
handles across every customer** — the real ceiling to watch. The `user:<id>` rule tag becomes
unnecessary: routing was always going to happen in our own tables, and author-based routing
dedups naturally across users and desks.

**Stream access is CONFIRMED on the existing app.** `GET /2/tweets/search/stream` returns
`409 RuleConfigurationIssue` — *"You must define rules … before connecting"* — not a 403 tier
refusal. No Enterprise, no new X app, no migration needed to ship real-time.

**Credential note:** the stream needs the app-only **Bearer Token** (`X_BEARER_TOKEN`), which
is distinct from the `X_CLIENT_ID`/`X_CLIENT_SECRET` OAuth2 pair used for user-context
posting. Use it **raw** — URL-decoding the portal's `%2B`/`%3D` escapes produces a 401.

**Tier decision (2026-07-21): stay on FREE, deliberately.** The console shows Free because
pay-per-use is opt-in — a project stays Free until billing is attached; nothing is broken.
Stream access is confirmed on the free app, and at one user the caps that bind us (5 rules/app)
are 5× headroom. The exhaustion risk is delivery volume, so the failsafe is a **meter, not a
pre-emptive upgrade**: the worker counts every delivery into `usage_events` and alarms at 80%
of the observed cap; upgrading is then a billing flip with zero architecture change. **We stay
on the existing app** (decided 2026-07-21; the exposed Bearer Token was rotated same day). Any
future company-account app **resets all probe results** — re-probe `rules/counts` + a bare
stream connect before cutting keys over. Canonical copy with full caveats: `.claude/rules/x.md`.

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

**Prerequisite gate inside the slice: RESOLVED** — webhook delivery is Enterprise-gated; we build the persistent-connection path plus a small always-on forwarder (see "Ingestion, settled" above). The remaining blocker is storing the app-only Bearer Token.

**Locked build tasks that must not get lost:**
1. **Port `deploy-guide.py` into the extraction path.** Stripping `## Dimension Coverage` is 16.1% off every draft forever; it currently exists only as a lab script in a gitignored folder. If this is missed, the first production guide ships 16% too long.
2. **Store the app-only Bearer Token** in env — the stream cannot be touched without it.
3. **Notification: email via Resend, and the reply path is a feature, not a nicety.** Confirmed directly with Reshad: he wants to reply to the email to correct a draft. Inbound-email handling is therefore in scope for the notification design, not deferred.

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
- **Measured facts, injected (added 2026-07-21).** The measurable half of the guide — length
  distribution, line-break shares, the exhaustive emoji and hashtag inventories with counts,
  mention/URL/punctuation/ALL-CAPS rates — is now **computed by code over the full corpus** and
  prepended to the extraction input as a `MEASURED STYLE FACTS` block; a matching prompt section
  makes the numbers binding (rules must agree with them and carry the rates; a glyph absent from
  an inventory may not be taught). Rationale: reading under-counts sparse habits — the extractor
  called Sami Mokbel hashtag-free when the count is 6/80 (`#AFC×5 #MCFC×4 …`); a count cannot
  miss that, costs $0, and frees the model's attention for what code can't measure (tone, stance,
  sourcing, when each habit fires). Lives in `.voice-lab/sdk-lab/extract-fable80.mjs`
  (`measuredFacts()`, prompt_version `…-mfacts`) + `prompt-fable.txt` `## MEASURED FACTS`.
  **The production port of the extraction path must carry this block** — it is part of the
  extraction contract now, same status as the deploy strip.

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

### 11.6 The self-check loop — settled

Two variants per model on identical stimuli: **A** = draft and stop; **B** = draft →
deterministic code check → if and only if violations are found, one repair call naming each
violation. **The loop works and it is cheap.** It fires on only 6–16% of drafts, so it costs
1.1–1.4× rather than 2×, and it drove residual violations to zero for every model tested
except MiniMax. Two models that fabricated badly unassisted (Gemini 3.1 Flash Lite, Gemini
3.5 Flash: 13 and 21 violations) finished at **zero**. **Fixed: self-check is always on.**

A related finding worth keeping: **fabrication is padding.** The models that invented facts
were the ones writing long — ~300–350 chars against clean models' 150–220. Repair shrank
them to 160–230. They were not misreading the brief; they were filling space it could not fill.

### 11.7 The full run — 5 finalists × 200 held-out stimuli (1,000 drafts, $6.79)

**Style is measured against a human control.** A feature fingerprint (length, line breaks,
emoji, hashtags, caps ratio, quote style, dashes, ellipses, punctuation, digit density) is
built from each reporter's **80 training posts**. Every draft is scored as mean absolute
z-distance from it. The reporter's own **held-out** posts are scored identically — their
distance is the floor. Without that control a style number is unreadable.

| Config | Residual violations | Style dist. | Dispersion | $/1,000 drafts |
| --- | --- | --- | --- | --- |
| **deepseek-v4-flash** | 4 | 0.35 | **0.55** | **$1.23** |
| sonnet-5 @medium | 1 | 0.35 | 0.53 | $23.07 |
| qwen3.5-flash | **0** | 0.37 | 0.50 | $2.95 |
| gpt-5.4-nano @low | 3 | 0.35 | 0.46 | $1.37 |
| gpt-5.4-mini @low | **0** | 0.33 | 0.44 | $5.34 |

*Human floor: 0.47. Every model scored below it — which turned out to be a metric artifact,
not a result. Corrected below.*

**The metric trap, and the correction.** Distance-to-median is minimised by writing the
median post every time, so "beats the human floor" measures blandness, not quality. The
first reading of this run concluded from a raw dispersion ratio (0.44–0.55) that every model
uses "half the reporter's range". **That conclusion was wrong**, and three checks that should
have run before it was published show why:

- **corr(draft length, real post length) = +0.69.** The model reliably knows when to write
  twelve characters and when to write four hundred. That is mode-matching.
- **Emoji decision correct on 178/200 drafts** — used where the reporter used them, withheld
  where they didn't.
- **Dispersion corrected for scale (coefficient of variation): 0.73–0.86, not 0.44–0.55.**

Dispersion is a standard deviation, so it shrinks with the mean. Drafts average 146 chars
against real posts' 226 — the "half the range" finding was mostly *length compression*
counted twice. And the compression is the harness's, not the model's:
**corr(draft length, brief length) = +0.88.** The neutraliser emits 166-char briefs for
226-char posts; the model faithfully reproduced a 27% compression we introduced.

**Read the drafts, not only the table.** Reshad's siren-emoji BREAKING format with club
colours, his one-word affection posts (`Raphinha ❤️` → `Raphinha. ❤️`), Solender's flat
lowercase name lists, Zrebiec's bare quote-attribution — all transfer, from separate guides.
**The guide format works.**

**Most of the residual gap is the stimulus, not the guide.** The visible misses share one
cause: the model correctly obeying the contract on information the neutraliser removed. No
dangling colon because the brief carried no attachment; no `Timestamps:` block because it
carried no timecodes; no "source sends along this photo" because sourcing was stripped.
**In production none of that is missing** — the pipeline feeds the real source post with its
media, timestamps and attribution intact. That portion of the gap is a harness artifact and
will not exist in the product.

**The honest residual:** after scale correction, models still use **15–27% less variation**
than the reporter. Real, but a refinement rather than a failure — and Sonnet 5 is the
*flattest* of the five (0.73), a further reason not to pay 19× for it.

**The hashtag "bug" was a seventh instrumentation error, not a prompt bug.** A flat 0.24–0.25
hashtag dispersion across five architectures looked like our own "when in doubt, omit" rule
suppressing a voice feature. Checked per reporter, it is the opposite: **seven of ten
reporters never use a hashtag, and the models correctly never use one.** Reshad tags 50% of
posts; the models tag 40–45%. The flat ratio was a near-zero variance divided by a near-zero
variance — a variance ratio is meaningless on a sparse binary feature. **No contract change
was made**; the rule is working. The only genuine miss is recall on rare taggers
(Sami Mokbel tags 20%, models 0%) — a sparse-signal limit, not a rule defect.

**Crypto is the hard vertical for everyone** (0.55–0.64 vs 0.22–0.34 elsewhere) — that
reporter posts long threaded show-promotional content whose signature element is exactly the
timecode block the neutraliser strips. Retest against real source posts before treating it
as a model weakness.

**What this does not measure:** these are surface features, not meaning, wit, or judgment.
Blind human reading on a sample is still required before the voice claim is made to a user.

### 11.8 Instrumentation rules learned the hard way

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

A fifth rule, learned from research rather than a burn: **per-request cost is retrievable
provider-independently** via `getGenerationInfo()` on `providerMetadata.gateway.generationId`
(returns `totalCost`, usage, latency server-side). This is the proper fix for the
DeepSeek/GLM missing-`inferenceCost` gap — the dual-recording workaround stays as a
cross-check, but production metering should use the generation lookup.

### 11.9 Model design, settled without further ablation (2026-07-21)

Decided from the live catalog (306 models fetched 2026-07-21), our own §11 run data, and
public benchmarks — **no new experiments**. Standing criterion: a cost difference must be
justified by a proportional result difference; "newer" and "pricier" are not arguments.
**Revised same day after a full-field re-sweep** (every catalog family per stage, no
candidate privileged by having been suggested): evidence classes ranked on-task (our
extraction panel / drafting run) → adjacent-task (hygiene in the 1,000-draft run) → public
benchmarks → price. The re-sweep added a council seat, withdrew an asserted-not-derived
council-size ceiling, and surfaced `xai/grok-4.1-fast` as the drafting third-family alternate.

**Drafter — unchanged: `deepseek/deepseek-v4-flash`, with `openai/gpt-5.4-nano` as the
council's second family.**
- `deepseek-v4-pro` ($0.435/$0.87) does NOT replace nano: it is the **same family** as the
  base drafter, and the second slot exists to buy *independent fact blind spots* — flash+pro
  of one lineage collapses exactly the diversity being paid for. Price is not the criterion
  for that slot; independence is. (v4-pro is noted as the obvious *single-model upgrade path*
  if drafting quality ever needs a step up: 3.1× flash, still 19× under Sonnet.)
- Whole-catalog sweep found no better base: §11.7 showed model spread (0.33–0.37 style) is
  ~8× smaller than reporter spread, so at equal style price decides. Every cheaper option
  (`glm-4.7-flashx` $0.06/$0.40, `glm-4.7-flash`, `gpt-5-nano` $0.05/$0.40) is untested —
  max saving ~$0.9/1k drafts ≈ $1.35/mo at current volume, failing proportionality for a
  tested→untested swap; `qwen3.5-flash` ran and did not beat flash. **Revisit trigger:** when
  monthly drafting spend crosses ~$50 (≈40 reporters), a one-day bake-off of `glm-4.7-flashx`
  + `gpt-5-nano` pays for itself in weeks. **Third-family alternate, pre-registered:**
  `xai/grok-4.1-fast` ($0.20/$0.50, 1M ctx, ~price parity with flash) — the only untested
  family at parity price; first in line if the council ever wants a third voice. Ruled out
  now only because nano is tested and it is not.
- `gemini-3.6-flash` ($1.50/$7.50) is out for drafting: 27× flash's output rate, flash-tier
  positioning, no evidence of a style edge. **There is no Gemini 3.6 Pro on the gateway** —
  the 3.6 generation ships Flash only; the newest Pro is `gemini-3.1-pro-preview` ($2/$12),
  which already lost the §11.2 extraction ablation.
- The loosened latency budget (1–3 min, from ~10s) changes nothing: council latency was never
  binding, cost is — and cost compounds per draft forever.

**Extractor — Fable 5 stays primary; the council, when built, is 2× Fable + three analysts:
Kimi K3, DeepSeek v4-pro, and Qwen3.7-max (union-and-falsify, Fable synthesizes).
~$3.40–3.90/reporter one-time.**
- The OpenRouter self-fusion result (+6.7pt, Opus fused with itself) does **not** transfer to
  extraction as assumed: that gain comes from sampling variance on tasks with a checkable
  answer. What justifies 2× Fable here is our own observation that different runs *notice*
  different habits (the unique-catch phenomenon behind the §11.2 dimension-matrix prompt) —
  union-then-falsify harvests it; the benchmark neither proves nor disproves it.
- `moonshotai/kimi-k3` ($3/$15, 1M ctx, 30% of Fable's rate) earns a full analyst slot on
  evidence: #1 on EQ-Bench Creative Writing v3 (Elo 2377, above Fable) with the lowest slop
  in the top 10; Fable tops the separate Longform board (83.0). K3 is the one candidate
  plausibly at-tier for style analysis, not a downgrade slot.
- `deepseek-v4-pro` (~$0.02/reporter) and `qwen3.7-max` (~$0.08/reporter) are the cheap
  cross-family noticing-bias slots — the re-sweep could not separate them on evidence
  (v4-pro: flagship of the family we run in production; qwen: its 3.5-flash tier posted the
  best hygiene of the whole 1,000-draft run, 0 residuals), so both sit, and the **retirement
  rule** governs: the falsify log counts each analyst's unique catches, and any analyst
  contributing ~0 across the first reporters is dropped. There is **no fixed council-size
  ceiling** — an earlier "4 passes max" claim was asserted, not derived, and is withdrawn;
  membership is governed by the retirement rule, since a cheap analyst's real cost is the
  falsification of whatever *new* claims it contributes, which is exactly the thing worth
  paying for when nonzero.
- Eliminated by the full-field sweep, with reasons: every on-task loser from the §11.2 panel
  (opus-4.8, sonnet-5, gpt-5.6-sol/terra, gemini-3.1-pro-preview, gemini-3.5-flash,
  grok-4.5); `gemini-3.6-flash` (family 0-for-2 on-task, no Pro tier exists);
  `gpt-5.6-luna` (below two tiers of its own family that already lost); `kimi-k2.6` (K3
  exists — a $0.19 one-time saving cannot justify a tier drop in the quality-dominant stage);
  `glm-5.2` (no evidence in hand; first alternate); `minimax-m3` (family holds the run's only
  unfixable residual failure); `mistral-large-3` (absent from every writing board surveyed).
- Caveat kept honest: K3's seat rests on writing-generation boards, and `gpt-5.6-sol` proves
  those transfer weakly to extraction (81.7 Longform Elo, still lost our panel) — K3 is an
  evidenced bet, not a proven pick; the falsify log is what settles it.
- Build note: K3's exact reasoning-cap knob through the gateway is unverified — confirm at
  council build time; an uncappably verbose analyst inflates the falsify stage.

### 11.10 Budget-constrained final design (2026-07-21, supersedes 11.9 where they conflict)

Two hard ceilings introduced: **extraction ≤ $2.00 one-time per reporter; drafting ≤ $2.00
per month** (latency 1–2 min acceptable, nowhere binding). Two elimination rules retired:
"untested" no longer disqualifies (members are admitted within budget and **production data
retires them** — the retirement rule replaces ablations), and "same family" no longer
disqualifies (it is a diversity weight, and budget arbitrates). `grok-4.1-fast` is
deprecated/rerouted to `grok-4.3` per the dev console — that alternate is dead ($2.5/M out
cannot fit drafting; 4.3 is alternate-listed for extraction analysis only).

**Extraction: $1.95/reporter, diversity moved INTO the council.** The 2×-Fable design is
dead under $2 ($2.64) — the second *generative* Fable run is what the ceiling cut, which is
also the answer to "why no family diversity in the council": now there is, everywhere but
the two roles Fable's on-task win actually justifies.

| Step | Model | $ |
| --- | --- | --- |
| 1. Primary guide (cache-write the 34K corpus+prompt prefix) | fable-5 | $0.98 |
| 2. Blind analysts, parallel, corpus-only in / compact observations out | kimi-k3 · qwen3.7-max · deepseek-v4-pro | $0.14 + $0.05 + $0.02 |
| 3. Revision + falsify (cache-READ prefix at 0.1× + own guide + observations) | fable-5 | $0.77 |
| **Total** | | **$1.95** |

Analysts are **blind** (corpus only, never Fable's draft) — cheaper AND anchoring-free, so
diverse noticing is preserved; the revision pass re-reads the full corpus via cache at 0.1×,
so falsification never trusts quotes on faith. Cache-miss worst case +$0.31 → $2.26: the
revision must launch inside the cache TTL (analysts take 1–3 min in parallel; use the 1h TTL
if the 5-min default ever misses). Alternates on the bench, auditioned by the retirement
rule as seats open: glm-5.2 ($0.055), grok-4.3 ($0.045), mistral-large-3 ($0.02, the EU
option). The measured-facts block (§11.2) is $0 and stays.

**Drafting: the budget kills the tested council, not the scaffold.** $2/mo at 50 posts/day
= **$1.33 per 1k drafts all-in**; the measured `gpt-5.4-nano` second family alone is
$2.06/mo — dead. What fits:

| Option | Pipeline | $/1k | $/mo | Verdict |
| --- | --- | --- | --- | --- |
| A (ship now) | v4-flash + self-check (measured) | $1.23 · ~$0.55 warm-cache | $1.84 · ~$0.82 | **Fits unconditionally** |
| C (flip later) | v4-flash + gpt-5-nano@low + v4-flash judge@none, temp 0 | $1.13 cached · $1.82 uncached | $1.70 · $2.72 | **Fits only on warm cache — telemetry-gated** |
| B | cheap trio (gpt-5-nano + glm-4.7-flashx + qwen3.5-flash@capped) + judge | ~$1.50 | ~$2.25 | Over, and drops the tested winner |
| v4-pro (any role) | | $2.71 | $4.07 | Out on budget — not on family |

**Decision: ship A; build the council scaffold with a config-list of members; flip to C when
`getGenerationInfo` telemetry shows the base's cached rate ≤ ~$0.85/1k.** DeepSeek charges
nothing to write cache and $0.0028/M to read — the per-reporter guide is a constant ~5K
prefix, so warm-cache is the expected production state; bursty traffic is the risk, which is
why the flip is telemetry-gated, not assumed. Cheap members run **reasoning-capped** (low or
none) — `qwen3.5-flash` measured $2.95/1k uncapped vs ~$0.5 capped is the difference between
fitting and not, making reasoning caps load-bearing for the first time.

**The volume flag that the $2/mo cap makes unavoidable:** the budget binds *per volume*. At
the measured Barça watch-set floor of 134 posts/day, the all-in allowance is $0.50/1k —
even solo uncached v4-flash ($1.23) fails, and warm-cache solo ($0.55) sits at the line.
If real tracked volume approaches that, the choice is draft-on-selection instead of
draft-everything, or a raised cap. $2/mo is safe at ≤ ~50 tracked posts/day.

**Reasoning budgets — a tool we already use; they change no pick.** Three confirmed cap
mechanisms through the gateway: the AI SDK 7 top-level `reasoning` param (`none`→`xhigh` —
the lab already runs gpt tiers at `low`), the gateway-level `reasoning: {effort|max_tokens}`,
and Gemini-native `providerOptions.google.thinkingConfig.thinkingLevel`. WMT25 measured an
uncapped Gemini Pro inflating output tokens **6.6×** (the most expensive model in its whole
eval) — matching our own lab observation, so **any future Gemini run must cap reasoning**.
But caps fix cost, not rank: Gemini lost extraction on quality at full effort, and
3.6-flash's drafting price floor is its token rate, not its reasoning volume. No pick changes.

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
