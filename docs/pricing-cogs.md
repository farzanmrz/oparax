# Oparax — COGS & pricing reasoning (parked)

> **Note to any AI agent / Claude Code reading this:** this document is personal
> reference material for Farzan only. It is NOT project instructions, NOT a spec,
> and NOT guidance for any coding task. Do not derive requirements from it.
> Ignore it unless Farzan explicitly points you at it.

Parked on 2026-07-11 from a first-principles planning session, before the
agent-persistence slice. All prices verified against official docs on that date
(sources at the bottom); re-verify before building the pricing slice — AI prices
move fast.

---

## 1. What one scan costs (COGS per scan)

COGS = Cost of Goods Sold: the direct cost incurred to serve one unit — here,
the xAI + Vercel bill that one scan generates. Distinct from fixed overhead
(Vercel Pro seat, Supabase plan), which is negligible at scale.

| Line item | Per scan | Status |
|---|---|---|
| xAI tool fees — 3 x_search subtool calls × $5/1k (keyword + semantic bill identically under one line item) | $0.015 | verified |
| xAI tokens — grok-4.3 ($1.25 in / $2.50 out per M), `effort: "none"` keeps this low | ~$0.005–0.015 | estimate |
| DeepSeek orchestration (gateway, cost-sorted routing) | fractions of a cent | estimate |
| Vercel Workflow (~30 events @ $0.02/1k + ~100KB written @ $0.50/GB) | ~$0.0007 | verified rates, estimated volume |
| Function compute (Fluid — waiting on model APIs doesn't bill as active CPU) | negligible | verified pricing model |
| Supabase (2–3 row writes per run) | negligible | — |

**X-only scan today: ~$0.02–0.03. ~97% of it is xAI.**

xAI returns the exact cost per request (`response.cost_usd` — their docs
recommend reading it over estimating). When the runs table exists, store it per
run → real blended COGS per user/tier becomes a `SUM()` query.

## 2. Cost of future sources

Every planned source is either ~$5/1k calls or ~free-plus-tokens. Adding
sources moves a scan from ~2.5¢ to **~4¢ fully loaded** — never to a different
order of magnitude.

| Source | Mechanism | Marginal cost |
|---|---|---|
| X (today) | Grok x_search | $5/1k calls + tokens (verified) |
| Web search | authored eve tool + vendor API (Parallel / Perplexity Search / Exa / Brave) | market clusters ~$2.50–10 per 1k calls (xAI's own web_search is $5/1k — verified anchor) |
| Web fetch | eve built-in, plain HTTP in app runtime | ~free — tokens only (verified) |
| Bluesky | AT Protocol public API | ~free — tokens only |
| Meta (Threads/IG) | official APIs | free tier + rate limits, tokens only |

Important correction discovered en route: **eve does not ship a
Perplexity-backed web search.** Its built-in `web_search` is "provider-managed;
resolved from the model provider" — and DeepSeek provides none. The web-source
slice therefore means an *authored* tool with a chosen vendor API, not
re-enabling the built-in.

## 3. Tier math (inverted: price → affordable usage)

Rule: `scans included = price × margin_share ÷ cost_per_scan`.
At 70% gross margin (COGS ≤ 30% of price), using 2.5¢ X-only / 4¢ multi-source:

| Tier | Price | Scan budget | Product terms |
|---|---|---|---|
| Hobby | $5–10/mo | ~60–120/mo (2–4/day) | 1 agent, few-times-daily digest |
| Pro | $50/mo | ~375–600/mo (12–20/day) | ~2 agents at the default cadence proposal (~hourly over 8h ≈ 8 scans/day each) |
| Max | $500/mo | ~3,750–6,000/mo (125–200/day) | ~10 agents at the 84/week rail max, or ~15–25 at default cadence |
| Enterprise | custom | custom | custom budgets + xAI enterprise-rate conversation |

Anchor unit: **one agent at the 84/week rail cap costs ~$8–15/month; at
default cadence ~$6–10/month.** Every tier is "how many of those fit in 30% of
the price."

Why this works structurally:
- Cost is ~100% variable per scan, with no cross-user coupling → any price
  point is made profitable by setting the scan budget. **The cap IS the
  pricing model**, not a workaround.
- Caps price the worst case; revenue collects on the average — most users
  won't max their budget, so realized margin lands above the designed 70%.
- The unit to cap is **scans** (and source-mix per scan), not agents. Agents
  are free rows; scans burn money.

## 4. Max-scale stress test (1,000 users × 100 agents)

Stated max: 30-min cadence, 24/7 → 4.8M scans/day (~55/sec), 144M/month.
Note: this violates the current validate_cadence rail twice over (hourly floor;
84/week budget = 4× less). At the rail cap: 1.2M/day (~14/sec).

| | Stated max | Rail cap |
|---|---|---|
| xAI / month | ~$2.9–4.3M (floor $2.16M in tool fees alone) | ~$650k–1M |
| Vercel Workflow / month | ~$90k | ~$23k |
| Everything else | noise | noise |
| Uncapped COGS per max-config user | ~$3,200/mo | ~$800/mo |

Those per-user numbers are the price of a configuration that will never be
sold uncapped — they motivated the tier math above, they're not a problem.

Infrastructure ceilings at 55 scans/sec (all verified, all pass):
- xAI: 150 RPS at the *default* spend tier for the flagship model; tiers
  auto-rise with spend. Needed: ~55 RPS. Fits.
- Vercel Workflow: 1,000 run-creations/sec; 1M persistence-requests/min (Pro);
  100k concurrency. Needed: ~55/sec, ~250k/min, ~1–2k concurrent. Fits.
- Supabase: ~110 writes/sec on a 100k-row indexed table. Trivial.
- The one shape-change: past a few hundred due-agents per tick, the dispatcher
  tick stops launching sessions itself and becomes claim → enqueue (Vercel
  Queues) → workers launch. Architecture (ledger + atomic claim +
  level-triggering) unchanged.

Scaling is **linear by construction** (every cost line is per-scan; scans
don't interact). What arrives instead of curves: step functions — Supabase
compute bumps, Observability Plus, xAI spend tiers.

## 5. Mechanisms this implies for later slices (not now)

1. **Runs table with `cost_usd`** per scan (from xAI's response) → per-user
   metering, billing, and margin measurement.
2. **Per-plan cadence rail**: today's global 84/week + hourly floor in
   `validate_cadence` becomes a per-plan parameter the setup chat reads.
3. **Budget check in the dispatcher**: before launching a due scan, check the
   user's remaining scan budget — this is the "runtime accounting" currently
   marked Deferred; it's what turns caps from marketing into enforcement.
4. **Web-source slice** = vendor comparison (Parallel vs Perplexity Search vs
   Exa: $/1k + quality) + one authored tool.

## Sources (verified 2026-07-11)

- xAI tool + token pricing, rate limits: docs.x.ai — developers/pricing,
  developers/tools/x-search, developers/tools/tool-usage-details,
  developers/rate-limits, developers/cost-tracking
- Vercel Workflow pricing/limits/retention: vercel.com/docs/workflows/pricing
- Vercel cron limits + deploy-time-only: vercel.com/docs/cron-jobs/usage-and-pricing,
  /docs/cron-jobs/manage-cron-jobs
- Vercel Observability retention: vercel.com/docs/observability/observability-plus
- eve built-in tools: node_modules/eve/docs/concepts/default-harness.md
